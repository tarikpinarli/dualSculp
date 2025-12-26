import * as THREE from 'three';

// --- GEOMETRY CLEANER ---
export const cleanAndStandardize = (geom: THREE.BufferGeometry) => {
    let cleanGeom = geom.index ? geom.toNonIndexed() : geom;
    if (cleanGeom.attributes.uv) cleanGeom.deleteAttribute('uv');
    if (cleanGeom.attributes.color) cleanGeom.deleteAttribute('color');
    cleanGeom.computeVertexNormals();
    return cleanGeom;
};

// --- COORDINATE MATH ---
export const latLonToMeters = (lat: number, lon: number, centerLat: number, centerLon: number) => {
  const R = 6378137; 
  const dLat = (lat - centerLat) * Math.PI / 180;
  const dLon = (lon - centerLon) * Math.PI / 180;
  const x = dLon * Math.cos(centerLat * Math.PI / 180) * R;
  const y = dLat * R;
  return { x, y };
};

export const getTileCoords = (lat: number, lon: number, zoom: number) => {
  const n = Math.pow(2, zoom);
  const x = Math.floor(n * ((lon + 180) / 360));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2);
  return { x, y };
};

// --- POLYGON UTILS ---
export const ensureCCW = (ring: [number, number][]) => {
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        sum += (ring[i+1][0] - ring[i][0]) * (ring[i+1][1] + ring[i][1]);
    }
    if (sum > 0) return ring.reverse();
    return ring;
};

// --- CLIPPING UTILS (For Roads) ---
const BOX_LIMIT = 50; 

const isInside = (p: THREE.Vector3) => {
    return Math.abs(p.x) <= BOX_LIMIT && Math.abs(p.z) <= BOX_LIMIT;
};

const intersectBox = (A: THREE.Vector3, B: THREE.Vector3): THREE.Vector3 | null => {
    const limits = [-BOX_LIMIT, BOX_LIMIT];
    let tMin = 0, tMax = 1;
    const dx = B.x - A.x;
    const dz = B.z - A.z;
    const p = [-dx, dx, -dz, dz];
    const q = [A.x - (-BOX_LIMIT), BOX_LIMIT - A.x, A.z - (-BOX_LIMIT), BOX_LIMIT - A.z];

    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return null; 
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

export const clipRoadPath = (points: THREE.Vector3[]): THREE.Vector3[][] => {
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