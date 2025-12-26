import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// --- 1. GEOMETRY HELPERS ---

const cleanAndStandardize = (geom: THREE.BufferGeometry) => {
    let cleanGeom = geom.index ? geom.toNonIndexed() : geom;
    if (cleanGeom.attributes.uv) cleanGeom.deleteAttribute('uv');
    if (cleanGeom.attributes.color) cleanGeom.deleteAttribute('color');
    cleanGeom.computeVertexNormals();
    return cleanGeom;
};

// Forces polygon points to be Counter-Clockwise.
const ensureCCW = (ring: [number, number][]) => {
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        sum += (ring[i+1][0] - ring[i][0]) * (ring[i+1][1] + ring[i][1]);
    }
    if (sum > 0) return ring.reverse();
    return ring;
};

// --- 2. CLIPPING UTILS ---
const BOX_LIMIT = 50; 

const isInside = (p: THREE.Vector3) => {
    return Math.abs(p.x) <= BOX_LIMIT && Math.abs(p.z) <= BOX_LIMIT;
};

// Finds intersection of segment AB with the box boundary
const intersectBox = (A: THREE.Vector3, B: THREE.Vector3): THREE.Vector3 | null => {
    const limits = [-BOX_LIMIT, BOX_LIMIT];
    let tMin = 0, tMax = 1;
    const dx = B.x - A.x;
    const dz = B.z - A.z;
    const p = [-dx, dx, -dz, dz];
    const q = [A.x - (-BOX_LIMIT), BOX_LIMIT - A.x, A.z - (-BOX_LIMIT), BOX_LIMIT - A.z];

    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return null; // Parallel and outside
        } else {
            const t = q[i] / p[i];
            if (p[i] < 0) {
                if (t > tMax) return null;
                if (t > tMin) tMin = t;
            } else {
                if (t < tMin) return null;
                if (t < tMax) tMax = t;
            }
        }
    }

    if (tMin > tMax) return null;
    
    return new THREE.Vector3(A.x + tMin * dx, A.y, A.z + tMin * dz);
};

const clipRoadPath = (points: THREE.Vector3[]): THREE.Vector3[][] => {
    const segments: THREE.Vector3[][] = [];
    let currentSegment: THREE.Vector3[] = [];

    for (let i = 0; i < points.length - 1; i++) {
        const A = points[i];
        const B = points[i+1];
        const A_in = isInside(A);
        const B_in = isInside(B);

        if (A_in && B_in) {
            if (currentSegment.length === 0) currentSegment.push(A);
            currentSegment.push(B);
        } else if (A_in && !B_in) {
            const I = intersectBox(A, B);
            if (currentSegment.length === 0) currentSegment.push(A);
            if (I) currentSegment.push(I);
            segments.push(currentSegment);
            currentSegment = [];
        } else if (!A_in && B_in) {
            const I = intersectBox(A, B);
            if (I) {
                currentSegment.push(I);
                currentSegment.push(B);
            }
        }
    }
    
    if (currentSegment.length > 1) segments.push(currentSegment);
    return segments;
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

// --- ROAD FETCH ---
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
            // GARBAGE COLLECTION:
            roadGeometries.forEach(g => g.dispose()); 
            return merged;
        }
        return null;

    } catch (err) {
        console.error("Road fetch error", err);
        return null;
    }
};

// --- WATER FETCH (FIXED) ---
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
                 
                 // --- FIX HERE: Use Positive Y (pt.y) ---
                 // We are creating a 2D shape. When we later rotateX(-90), 
                 // this +Y (North) will correctly point to -Z (North).
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
                        
                        geom.rotateX(-Math.PI / 2); // Rotates +Y to -Z
                        geom.translate(0, 0.01, 0); // Sit slightly above base
                        
                        waterGeometries.push(cleanAndStandardize(geom));
                    });
                });
             } catch(e) {}
        });

        if (waterGeometries.length > 0) {
            const merged = BufferGeometryUtils.mergeGeometries(waterGeometries);
            // GARBAGE COLLECTION:
            waterGeometries.forEach(g => g.dispose()); 
            return merged;
        }
        return null;

    } catch (err) {
        console.error("Water fetch error", err);
        return null;
    }
};

// --- CITY FETCH ---
export const fetchBuildingsGeometry = async (
    centerLat: number, 
    centerLon: number, 
    radiusKM: number = 0.2,
    setStatus?: (msg: string) => void
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

    return { 
        buildings: finalBuildings, 
        base: finalBase 
    };
};