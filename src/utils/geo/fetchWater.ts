import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';
import { latLonToMeters, cleanAndStandardize } from './geoShared';

// --- HELPER 1: Generate Water Shapes ---
// If 'invert' is false, it puts water on the RIGHT of the line.
// If 'invert' is true, it puts water on the LEFT.
const generateShapes = (
    coastSegments: [number, number][][], 
    lakes: [number, number][][], 
    mapBox: any, 
    invert: boolean
) => {
    const DIST = 2000; // Extrude huge distance to ensure it covers the map edge
    const rawPolys: any[] = [];

    // 1. Add known closed lakes (these are always correct)
    lakes.forEach(lake => rawPolys.push([lake]));

    // 2. Process Coastlines
    coastSegments.forEach(line => {
        for(let i=0; i<line.length-1; i++) {
            const p1 = line[i];
            const p2 = line[i+1];
            
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const len = Math.sqrt(dx*dx + dy*dy);
            if(len === 0) continue;

            // Calculate Normal Vector
            let nx, ny;
            if (!invert) {
                // Standard OSM: Water on Right ((dy, -dx))
                nx = (dy / len) * DIST;
                ny = (-dx / len) * DIST;
            } else {
                // Inverted: Water on Left ((-dy, dx))
                nx = (-dy / len) * DIST;
                ny = (dx / len) * DIST;
            }

            // Create massive quad extending out
            // [Start, FarStart, FarEnd, End, Start]
            const quad: [number, number][] = [
                p1,
                [p1[0] + nx, p1[1] + ny],
                [p2[0] + nx, p2[1] + ny],
                p2,
                p1
            ];
            rawPolys.push([quad]);
        }
    });

    try {
        if (rawPolys.length === 0) return [];
        // Union all pieces into one flat sheet
        const merged = polygonClipping.union([], ...rawPolys);
        // Clip to Map Box
        return polygonClipping.intersection(merged, mapBox);
    } catch (e) {
        return [];
    }
};

// --- HELPER 2: Check if Center (0,0) is underwater ---
const isCenterUnderwater = (poly: any[]) => {
    const x = 0, y = 0;
    for(const multi of poly) {
        for(const ring of multi) {
            let inside = false;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                const xi = ring[i][0], yi = ring[i][1];
                const xj = ring[j][0], yj = ring[j][1];
                
                const intersect = ((yi > y) !== (yj > y)) && 
                                  (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            if(inside) return true;
        }
    }
    return false;
};

export const fetchWaterGeometry = async (
    centerLat: number, 
    centerLon: number, 
    radiusKM: number = 0.2
) => {
    const safeRadius = Math.max(radiusKM, 0.1);
    const fetchRadius = safeRadius * 1.5; 
    const latOffset = fetchRadius / 111;
    const lonOffset = fetchRadius / (111 * Math.cos(centerLat * Math.PI / 180));
    
    const bbox = `${centerLat - latOffset},${centerLon - lonOffset},${centerLat + latOffset},${centerLon + lonOffset}`;

    // Simple, robust query
    const query = `
      [out:json][timeout:25];
      (
        way["natural"="water"](${bbox});
        way["natural"="coastline"](${bbox});
        way["natural"="bay"](${bbox});
        way["water"](${bbox});
        way["waterway"="riverbank"](${bbox});
        way["waterway"="dock"](${bbox});
        relation["natural"="water"](${bbox});
      );
      out geom;
    `;

    const API_URL = "https://overpass.kumi.systems/api/interpreter"; 
    
    try {
        const res = await fetch(`${API_URL}?data=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Water API Error");
        const data = await res.json();
        
        const elements = data.elements.filter((el: any) => el.type === 'way' && el.geometry);
        const scale = 50 / (safeRadius * 1000); 

        // Map Boundaries (The Box)
        const LIMIT = 50;
        const MAP_BOX: any = [[[-LIMIT, -LIMIT], [LIMIT, -LIMIT], [LIMIT, LIMIT], [-LIMIT, LIMIT], [-LIMIT, -LIMIT]]];

        const coastSegments: [number, number][][] = [];
        const lakes: [number, number][][] = [];

        // 1. Sort Data
        elements.forEach((el: any) => {
             const polyPoints: [number, number][] = []; 
             el.geometry.forEach((node: any) => {
                 const pt = latLonToMeters(node.lat, node.lon, centerLat, centerLon);
                 if (!isNaN(pt.x) && !isNaN(pt.y)) {
                    polyPoints.push([pt.x * scale, pt.y * scale]);
                 }
             });

             if (polyPoints.length < 2) return;

             const first = polyPoints[0];
             const last = polyPoints[polyPoints.length - 1];
             // Check if it loops back on itself
             const isClosed = (Math.abs(first[0] - last[0]) < 0.1 && Math.abs(first[1] - last[1]) < 0.1);

             if (isClosed || el.tags.natural === 'water' || el.tags.waterway === 'dock') {
                 lakes.push(polyPoints); // It's a lake
             } else {
                 coastSegments.push(polyPoints); // It's a coastline
             }
        });

        // 2. GENERATE & CALIBRATE
        // Attempt 1: Standard Direction (Water on Right)
        let finalPolys = generateShapes(coastSegments, lakes, MAP_BOX, false);

        // Safety Check: If the center of the map (where you clicked) is underwater, 
        // we definitely guessed the direction wrong. FLIP IT.
        if (coastSegments.length > 0 && isCenterUnderwater(finalPolys)) {
            // console.log("🌊 Calibration: Center flooded. Flipping water direction.");
            finalPolys = generateShapes(coastSegments, lakes, MAP_BOX, true);
        }

        // 3. Convert to 3D Geometry
        const waterGeometries: THREE.BufferGeometry[] = [];
        
        finalPolys.forEach((multiPoly: any) => {
            multiPoly.forEach((ring: any) => {
                if (ring.length < 3) return;
                
                const shape = new THREE.Shape();
                shape.moveTo(ring[0][0], ring[0][1]);
                for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], ring[i][1]);
                
                const geom = new THREE.ShapeGeometry(shape);
                geom.rotateX(-Math.PI / 2); 
                geom.translate(0, 0.002, 0); // Flat paint style
                
                const clean = cleanAndStandardize(geom);
                if (clean) waterGeometries.push(clean);
            });
        });

        if (waterGeometries.length > 0) {
            const merged = BufferGeometryUtils.mergeGeometries(waterGeometries);
            waterGeometries.forEach(g => g.dispose()); 
            return merged;
        }
        return null;

    } catch (err) {
        console.error("Water fetch error", err);
        return null;
    }
};