import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// --- 1. GEOMETRY HELPERS ---

const cleanAndStandardize = (geom: THREE.BufferGeometry) => {
    let cleanGeom = geom.toNonIndexed(); 
    if (cleanGeom.attributes.uv) cleanGeom.deleteAttribute('uv');
    if (cleanGeom.attributes.color) cleanGeom.deleteAttribute('color');
    cleanGeom.computeVertexNormals();
    return cleanGeom;
};

// CRITICAL FIX: Forces polygon points to be Counter-Clockwise.
// If they are Clockwise, polygon-clipping treats them as "Holes" and deletes them.
const ensureCCW = (ring: [number, number][]) => {
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        sum += (ring[i+1][0] - ring[i][0]) * (ring[i+1][1] + ring[i][1]);
    }
    // If sum > 0, it is Clockwise (in this coordinate system). Reverse it.
    if (sum > 0) {
        return ring.reverse();
    }
    return ring;
};

// --- UTILS ---
const latLonToMeters = (lat: number, lon: number, centerLat: number, centerLon: number) => {
  const R = 6378137; 
  const dLat = (lat - centerLat) * Math.PI / 180;
  const dLon = (lon - centerLon) * Math.PI / 180;
  const x = dLon * Math.cos(centerLat * Math.PI / 180) * R;
  const y = dLat * R;
  return { x, y };
};

const getTileCoords = (lat: number, lon: number, zoom: number) => {
  const n = Math.pow(2, zoom);
  const x = Math.floor(n * ((lon + 180) / 360));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2);
  return { x, y };
};

// --- TERRAIN FETCH ---
export const fetchTerrainGeometry = async (lat: number, lon: number, zoom: number = 12, exaggeration: number = 1) => {
  const { x, y } = getTileCoords(lat, lon, zoom);
  const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${x}/${y}.pngraw?access_token=${MAPBOX_TOKEN}`;
  
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = url;

  return new Promise<{ buildings: THREE.BufferGeometry, base: THREE.BufferGeometry }>((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("No Canvas");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;

      const geometry = new THREE.PlaneGeometry(100, 100, 255, 255);
      const positions = geometry.attributes.position;
      
      let minHeight = Infinity;
      const rawHeights: number[] = [];

      for (let i = 0; i < positions.count; i++) {
        const idx = i * 4;
        if (idx >= data.length) { rawHeights.push(0); continue; }
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        const h = -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
        rawHeights.push(h);
        if (h < minHeight) minHeight = h;
      }

      for (let i = 0; i < positions.count; i++) {
        const relativeH = rawHeights[i] - minHeight;
        positions.setZ(i, (relativeH * 0.05) * exaggeration);
      }
      geometry.rotateX(-Math.PI / 2);

      const baseGeom = new THREE.BoxGeometry(100, 2, 100);
      baseGeom.translate(0, -1, 0);

      resolve({
          buildings: cleanAndStandardize(geometry), 
          base: cleanAndStandardize(baseGeom)
      });
    };
    img.onerror = () => reject("Terrain Load Failed");
  });
};

// --- CITY FETCH (WITH TRIMMER) ---
export const fetchBuildingsGeometry = async (
    centerLat: number, 
    centerLon: number, 
    radiusKM: number = 0.2,
    setStatus?: (msg: string) => void
) => {
    if (setStatus) setStatus("Connecting...");
    
    // 1. BASEPLATE (Always Create First)
    const baseGeom = new THREE.BoxGeometry(100, 2, 100);
    baseGeom.translate(0, -1, 0); 
    const finalBase = cleanAndStandardize(baseGeom);

    // Fetch 1.5x larger area so we have overlap to trim
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
    // The visual scene is 100x100 (-50 to +50).
    const CLIP_BOX: any = [[[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]]];
    
    const elements = data.elements.filter((el: any) => (el.type === 'way' && el.geometry));

    if (elements.length === 0) return { buildings: null, base: finalBase };

    const buildingGeometries: THREE.BufferGeometry[] = [];
    const scale = 50 / (radiusKM * 1000); 

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

            // Close Loop
            const first = rawPoints[0];
            const last = rawPoints[rawPoints.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) rawPoints.push([first[0], first[1]]);

            // --- THE FIX: FORCE CCW ORDER ---
            const fixedRing = ensureCCW(rawPoints);

            // TRIM IT!
            const intersection = polygonClipping.intersection([fixedRing], CLIP_BOX);
            
            intersection.forEach((multiPoly) => {
                multiPoly.forEach((ring) => {
                    if (ring.length < 3) return;
                    
                    const shape = new THREE.Shape();
                    shape.moveTo(ring[0][0], ring[0][1]);
                    for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], ring[i][1]);
                    
                    // Simple Extrusion (No Bevels = Stability)
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
        } catch (e) {
            console.error("Merge failed", e);
        }
    }

    return { 
        buildings: finalBuildings, 
        base: finalBase 
    };
};