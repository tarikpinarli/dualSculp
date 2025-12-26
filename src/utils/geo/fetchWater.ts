import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';

import { latLonToMeters, cleanAndStandardize, ensureCCW } from './geoShared';

export const fetchWaterGeometry = async (
  centerLat: number,
  centerLon: number,
  radiusKM: number = 0.2
): Promise<THREE.BufferGeometry | null> => {

  const fetchRadius = radiusKM * 1.5;
  const latOffset = fetchRadius / 111;
  const lonOffset = fetchRadius / (111 * Math.cos(centerLat * Math.PI / 180));

  const bbox = `${centerLat - latOffset},${centerLon - lonOffset},${centerLat + latOffset},${centerLon + lonOffset}`;

  const query = `
    [out:json][timeout:25];
    (
      way["natural"="water"](${bbox});
      way["waterway"="riverbank"](${bbox});
      relation["natural"="water"](${bbox});
    );
    out geom;
  `;

  const API_URL = "https://overpass.kumi.systems/api/interpreter";

  try {
    const res = await fetch(`${API_URL}?data=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Water API error");
    const data = await res.json();

    const elements = data.elements.filter(
      (el: any) => el.type === 'way' && el.geometry?.length >= 4
    );

    if (elements.length === 0) return null;

    const scale = 50 / (radiusKM * 1000);
    const CLIP_BOX: any = [[
      [-50, -50],
      [ 50, -50],
      [ 50,  50],
      [-50,  50],
      [-50, -50]
    ]];

    const geometries: THREE.BufferGeometry[] = [];

    for (const el of elements) {
      const ring: [number, number][] = [];

      for (const node of el.geometry) {
        const pt = latLonToMeters(node.lat, node.lon, centerLat, centerLon);
        ring.push([pt.x * scale, pt.y * scale]);
      }

      // Ensure closed ring
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([...first]);
      }

      if (ring.length < 4) continue;

      const fixed = ensureCCW(ring);
      const clipped = polygonClipping.intersection([fixed], CLIP_BOX);

      for (const poly of clipped) {
        for (const r of poly) {
          if (r.length < 4) continue;

          const shape = new THREE.Shape();
          shape.moveTo(r[0][0], r[0][1]);
          for (let i = 1; i < r.length; i++) {
            shape.lineTo(r[i][0], r[i][1]);
          }

          const geom = new THREE.ShapeGeometry(shape);
          geom.rotateX(-Math.PI / 2);
          geom.translate(0, 0.01, 0); // float above base

          geometries.push(cleanAndStandardize(geom));
        }
      }
    }

    if (geometries.length === 0) return null;

    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    return merged;

  } catch (err) {
    console.error("Water fetch failed", err);
    return null;
  }
};
