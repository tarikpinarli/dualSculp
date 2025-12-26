import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';

// Imports from siblings
import { cleanAndStandardize, latLonToMeters, ensureCCW } from './geoShared';
import { fetchRoadsGeometry } from './fetchRoads';
import { fetchWaterGeometry } from './fetchWater';
import { fetchTerrainGeometry } from './fetchTerrain'; // Exported so index.tsx can use it

// Re-export for easier imports in the app
export { fetchTerrainGeometry };

// --- MAIN CITY FETCH ---
export const fetchBuildingsGeometry = async (
    centerLat: number, 
    centerLon: number, 
    radiusKM: number = 0.2,
    setStatus?: (msg: string) => void,
    options: { enableRoads?: boolean } = {}
) => {
    if (setStatus) setStatus("Connecting...");
    
    // 1. BASEPLATE
    const baseGeom = new THREE.BoxGeometry(100, 2, 100);
    baseGeom.translate(0, -1, 0); 
    const finalBase = cleanAndStandardize(baseGeom);

    const fetchRadius = radiusKM * 1.5; 
    const latOffset = fetchRadius / 111;
    const lonOffset = fetchRadius / (111 * Math.cos(centerLat * Math.PI / 180));
    const bbox = `${centerLat - latOffset},${centerLon - lonOffset},${centerLat + latOffset},${centerLon + lonOffset}`;

    const query = `
      [out:json][timeout:25];
      (
        way["building"](${bbox});
        way["building:part"](${bbox});
        relation["building"](${bbox});
      );
      out geom;
    `;

    const API_URL = "https://overpass.kumi.systems/api/interpreter"; 
    
    if (setStatus) setStatus("Downloading Map Data...");

    let data;
    try {
        const res = await fetch(`${API_URL}?data=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("API Error");
        data = await res.json();
    } catch (err) {
        return { buildings: null, base: finalBase };
    }

    if (setStatus) setStatus("Trimming & Building...");

    // 2. THE COOKIE CUTTER
    const CLIP_BOX: any = [[[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]]];
    
    const elements = data.elements.filter((el: any) => (el.type === 'way' && el.geometry));

    if (elements.length === 0) return { buildings: null, base: finalBase };

    const buildingGeometries: THREE.BufferGeometry[] = [];
    const scale = 50 / (radiusKM * 1000); 

    // --- ORCHESTRATE OTHER LAYERS ---
    // Start fetching water and roads in parallel while we process buildings
    let mergedRoadsPromise: Promise<THREE.BufferGeometry | null> = Promise.resolve(null);
    let mergedWaterPromise: Promise<THREE.BufferGeometry | null> = fetchWaterGeometry(centerLat, centerLon, radiusKM);

    if (options.enableRoads) {
        if (setStatus) setStatus("Fetching Road Network...");
        mergedRoadsPromise = fetchRoadsGeometry(centerLat, centerLon, radiusKM);
    }
    // --------------------------------

    elements.forEach((el: any) => {
        try {
            const height = el.tags?.height ? parseFloat(el.tags.height) : (el.tags['building:levels'] ? parseFloat(el.tags['building:levels']) * 3.5 : 12);
            const minHeight = el.tags?.min_height ? parseFloat(el.tags.min_height) : (el.tags['building:min_level'] ? parseFloat(el.tags['building:min_level']) * 3.5 : 0);
            
            if (height <= minHeight) return;

            const rawPoints: [number, number][] = [];
            el.geometry.forEach((node: any) => {
                const pt = latLonToMeters(node.lat, node.lon, centerLat, centerLon);
                rawPoints.push([pt.x * scale, pt.y * scale]);
            });

            if (rawPoints.length < 3) return;

            const first = rawPoints[0];
            const last = rawPoints[rawPoints.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) rawPoints.push([first[0], first[1]]);

            const fixedRing = ensureCCW(rawPoints);
            const intersection = polygonClipping.intersection([fixedRing], CLIP_BOX);
            
            intersection.forEach((multiPoly) => {
                multiPoly.forEach((ring) => {
                    if (ring.length < 3) return;
                    
                    const shape = new THREE.Shape();
                    shape.moveTo(ring[0][0], ring[0][1]);
                    for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], ring[i][1]);
                    
                    const extrudeSettings = { steps: 1, depth: (height - minHeight) * scale, bevelEnabled: false };
                    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                    
                    if (!geom.attributes.position || geom.attributes.position.count === 0) return;

                    geom.rotateX(-Math.PI / 2); 
                    geom.translate(0, minHeight * scale, 0); 
                    
                    buildingGeometries.push(cleanAndStandardize(geom));
                });
            });
        } catch (e) {}
    });

    let finalBuildings = null;
    if (buildingGeometries.length > 0) {
        try {
            finalBuildings = BufferGeometryUtils.mergeGeometries(buildingGeometries);
            // GARBAGE COLLECTION:
            buildingGeometries.forEach(g => g.dispose()); 
        } catch (e) {
            console.error("Merge failed", e);
        }
    }

    // Await parallel tasks
    const roads = await mergedRoadsPromise;
    const water = await mergedWaterPromise;

    return { 
        buildings: finalBuildings, 
        base: finalBase,
        roads: roads,
        water: water
    };
};