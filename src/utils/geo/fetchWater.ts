import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';
import { latLonToMeters, ensureCCW, cleanAndStandardize } from './geoShared';

export const fetchWaterGeometry = async (
    centerLat: number, 
    centerLon: number, 
    radiusKM: number = 0.2
) => {
    const fetchRadius = radiusKM * 1.5; 
    const latOffset = fetchRadius / 111;
    const lonOffset = fetchRadius / (111 * Math.cos(centerLat * Math.PI / 180));
    
    const bbox = `${centerLat - latOffset},${centerLon - lonOffset},${centerLat + latOffset},${centerLon + lonOffset}`;

    const query = `
      [out:json][timeout:25];
      (
        way["natural"="water"](${bbox});
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
        const waterGeometries: THREE.BufferGeometry[] = [];
        const scale = 50 / (radiusKM * 1000); 

        // Trimming Box
        const CLIP_BOX: any = [[[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]]];

        elements.forEach((el: any) => {
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
             
             try {
                const intersection = polygonClipping.intersection([fixedRing], CLIP_BOX);

                intersection.forEach((multiPoly) => {
                    multiPoly.forEach((ring) => {
                        if (ring.length < 3) return;
                        
                        const shape = new THREE.Shape();
                        shape.moveTo(ring[0][0], ring[0][1]);
                        for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], ring[i][1]);
                        
                        const geom = new THREE.ShapeGeometry(shape);
                        
                        geom.rotateX(-Math.PI / 2); 
                        geom.translate(0, 0.01, 0); 
                        
                        waterGeometries.push(cleanAndStandardize(geom));
                    });
                });
             } catch(e) {}
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