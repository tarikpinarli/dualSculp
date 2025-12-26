import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { latLonToMeters, clipRoadPath, cleanAndStandardize } from './geoShared';

export const fetchRoadsGeometry = async (
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
        way["highway"](${bbox});
      );
      out geom;
    `;

    const API_URL = "https://overpass.kumi.systems/api/interpreter"; 
    
    try {
        const res = await fetch(`${API_URL}?data=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Road API Error");
        const data = await res.json();
        
        const elements = data.elements.filter((el: any) => el.type === 'way' && el.geometry);
        const roadGeometries: THREE.BufferGeometry[] = [];
        const scale = 50 / (radiusKM * 1000); 

        const getRadius = (type: string) => {
            if (['motorway', 'trunk', 'primary'].includes(type)) return 6;
            if (['secondary', 'tertiary'].includes(type)) return 4;
            if (['footway', 'pedestrian', 'path'].includes(type)) return 1.5;
            return 2.5; 
        };

        elements.forEach((el: any) => {
             const rawPoints: THREE.Vector3[] = [];
             el.geometry.forEach((node: any) => {
                 const pt = latLonToMeters(node.lat, node.lon, centerLat, centerLon);
                 rawPoints.push(new THREE.Vector3(pt.x * scale, 0.02, -pt.y * scale)); 
             });

             if (rawPoints.length < 2) return;

             const clippedPaths = clipRoadPath(rawPoints);

             clippedPaths.forEach((pathPoints) => {
                 if (pathPoints.length < 2) return;
                 const curve = new THREE.CatmullRomCurve3(pathPoints);
                 curve.curveType = 'centripetal'; 
                 const radius = getRadius(el.tags.highway || 'residential') * scale * 0.5; 
                 const tubeGeom = new THREE.TubeGeometry(curve, Math.max(pathPoints.length * 3, 4), radius, 5, false); 
                 roadGeometries.push(cleanAndStandardize(tubeGeom));
             });
        });

        if (roadGeometries.length > 0) {
            const merged = BufferGeometryUtils.mergeGeometries(roadGeometries);
            roadGeometries.forEach(g => g.dispose()); 
            return merged;
        }
        return null;

    } catch (err) {
        console.error("Road fetch error", err);
        return null;
    }
};