import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';
import { latLonToMeters, ensureCCW, cleanAndStandardize, clipRoadPath } from './geoShared';
import polygonSplitter from 'polygon-splitter';
import isSea from 'is-sea';

export const fetchWaterGeometry = async (
    centerLat: number, 
    centerLon: number, 
    radiusKM: number = 0.2
) => {
    // 1. Safe Radius
    const safeRadius = Math.max(radiusKM, 0.1);
    const fetchRadius = safeRadius * 1.5; 
    const latOffset = fetchRadius / 111;
    const lonOffset = fetchRadius / (111 * Math.cos(centerLat * Math.PI / 180));
    
    const bbox = `${centerLat - latOffset},${centerLon - lonOffset},${centerLat + latOffset},${centerLon + lonOffset}`;

    // 2. Updated Query: Include more relations
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
        relation["natural"="coastline"](${bbox});
        relation["natural"="bay"](${bbox});
        relation["water"](${bbox});
        relation["waterway"="riverbank"](${bbox});
        relation["waterway"="dock"](${bbox});
      );
      out geom;
    `;

    const API_URL = "https://overpass.kumi.systems/api/interpreter"; 
    
    try {
        const res = await fetch(`${API_URL}?data=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Water API Error");
        const data = await res.json();
        
        const ways = data.elements.filter((el: any) => el.type === 'way' && el.geometry);
        const relations = data.elements.filter((el: any) => el.type === 'relation');
        
        const waterGeometries: THREE.BufferGeometry[] = [];
        const scale = 50 / (safeRadius * 1000); 

        // Trimming Box with explicit types
        const CLIP_BOX_RING = [[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]] as const;
        const CLIP_BOX: polygonClipping.Polygon = [CLIP_BOX_RING as unknown as polygonClipping.Ring];

        // Helper to reverse meters to lat/lon (assuming latLonToMeters uses approximate flat projection)
        const metersToLatLon = (x_meters: number, y_meters: number, centerLat: number, centerLon: number) => {
            const rad = centerLat * Math.PI / 180;
            const metersPerDegLat = 111000;
            const metersPerDegLon = metersPerDegLat * Math.cos(rad);
            const lat = centerLat + y_meters / metersPerDegLat;
            const lon = centerLon + x_meters / metersPerDegLon;
            return { lat, lon };
        };

        // Helper to compute polygon centroid using shoelace formula
        const getCentroid = (ring: readonly [number, number][]) => {
            let x = 0, y = 0, area = 0;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                const xi = ring[i][0], yi = ring[i][1];
                const xj = ring[j][0], yj = ring[j][1];
                const f = xi * yj - xj * yi;
                x += (xi + xj) * f;
                y += (yi + yj) * f;
                area += f;
            }
            area /= 2;
            return [x / (6 * area), y / (6 * area)];
        };

        // Collect inland multipolys from ways and relations
        const inlandMultiPolys: polygonClipping.MultiPolygon[] = [];

        // Process simple ways for inland water
        ways.forEach((el: any) => {
            if (el.tags.natural === 'coastline') return; // Handle coastlines separately

            const polyPoints: [number, number][] = [];
            el.geometry.forEach((node: any) => {
                const pt = latLonToMeters(node.lat, node.lon, centerLat, centerLon);
                if (!isNaN(pt.x) && !isNaN(pt.y)) {
                    polyPoints.push([pt.x * scale, pt.y * scale]);
                }
            });
            if (polyPoints.length < 3) return;

            const first = polyPoints[0];
            const last = polyPoints[polyPoints.length - 1];
            const isClosed = Math.abs(first[0] - last[0]) < 0.1 && Math.abs(first[1] - last[1]) < 0.1;

            if (isClosed || el.tags.natural === 'water' || el.tags.waterway === 'dock' || el.tags.natural === 'bay' || el.tags.water) {
                const fixedRing = ensureCCW(polyPoints);
                inlandMultiPolys.push([[fixedRing as unknown as polygonClipping.Ring]]);
            }
        });

        // Process relations for inland water
        const buildRings = (members: any[]) => {
            const rings: any[] = [];
            const used = new Set();
            for (let startIdx = 0; startIdx < members.length; startIdx++) {
                if (used.has(startIdx)) continue;
                const ring: any[] = [];
                let current = members[startIdx];
                used.add(startIdx);
                ring.push(...current.geometry);
                let currentEnd = ring[ring.length - 1];
                let found = true;
                while (found) {
                    found = false;
                    for (let i = 0; i < members.length; i++) {
                        if (used.has(i)) continue;
                        const w = members[i];
                        const wStart = w.geometry[0];
                        const wEnd = w.geometry[w.geometry.length - 1];
                        if (Math.abs(currentEnd.lat - wStart.lat) < 1e-8 && Math.abs(currentEnd.lon - wStart.lon) < 1e-8) {
                            ring.push(...w.geometry.slice(1));
                            currentEnd = wEnd;
                            used.add(i);
                            found = true;
                            break;
                        } else if (Math.abs(currentEnd.lat - wEnd.lat) < 1e-8 && Math.abs(currentEnd.lon - wEnd.lon) < 1e-8) {
                            ring.push(...w.geometry.slice(0, -1).reverse());
                            currentEnd = wStart;
                            used.add(i);
                            found = true;
                            break;
                        }
                    }
                }
                const first = ring[0];
                const last = ring[ring.length - 1];
                if (Math.abs(first.lat - last.lat) < 1e-8 && Math.abs(first.lon - last.lon) < 1e-8) {
                    rings.push(ring);
                }
            }
            return rings;
        };

        relations.forEach((rel: any) => {
            if (! (rel.tags.natural === 'water' || rel.tags.natural === 'bay' || rel.tags.water || rel.tags.waterway === 'riverbank' || rel.tags.waterway === 'dock')) return;

            const outerMembers = rel.members.filter((m: any) => m.role === 'outer' && m.geometry);
            const innerMembers = rel.members.filter((m: any) => m.role === 'inner' && m.geometry);

            const outerRings = buildRings(outerMembers);
            const innerRings = buildRings(innerMembers);

            outerRings.forEach((outer: any) => {
                const polyPoints: [number, number][] = outer.map((node: any) => {
                    const pt = latLonToMeters(node.lat, node.lon, centerLat, centerLon);
                    return [pt.x * scale, pt.y * scale] as [number, number];
                });
                const fixedOuter = ensureCCW(polyPoints);
                const multiInner = innerRings.map((inner: any) => {
                    const ip: [number, number][] = inner.map((node: any) => {
                        const pt = latLonToMeters(node.lat, node.lon, centerLat, centerLon);
                        return [pt.x * scale, pt.y * scale] as [number, number];
                    });
                    return ensureCCW(ip).reverse() as unknown as polygonClipping.Ring; // CW for holes
                });
                inlandMultiPolys.push([[fixedOuter as unknown as polygonClipping.Ring], ...multiInner]);
            });
        });

        // Clip and add inland water geometries
        inlandMultiPolys.forEach((multi: polygonClipping.MultiPolygon) => {
            try {
                const intersection = polygonClipping.intersection(multi, CLIP_BOX as unknown as polygonClipping.Polygon);
                intersection.forEach((interMulti: polygonClipping.Polygon) => {
                    if (interMulti.length === 0) return;
                    const shape = new THREE.Shape();
                    const outer = interMulti[0];
                    shape.moveTo(outer[0][0], outer[0][1]);
                    for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i][0], outer[i][1]);
                    for (let h = 1; h < interMulti.length; h++) {
                        const hole = new THREE.Path();
                        const ring = interMulti[h];
                        hole.moveTo(ring[0][0], ring[0][1]);
                        for (let i = 1; i < ring.length; i++) hole.lineTo(ring[i][0], ring[i][1]);
                        shape.holes.push(hole);
                    }
                    const geom = new THREE.ShapeGeometry(shape);
                    geom.rotateX(-Math.PI / 2);
                    geom.translate(0, 0.01, 0);
                    const clean = cleanAndStandardize(geom);
                    if (clean) waterGeometries.push(clean);
                });
            } catch (e) {}
        });

        // Process coastlines
        const coastlineLines: [number, number][][] = [];
        const coastlinePolys: polygonClipping.Ring[] = [];
        ways.forEach((el: any) => {
            if (el.tags.natural !== 'coastline') return;
            const polyPoints: [number, number][] = [];
            el.geometry.forEach((node: any) => {
                const pt = latLonToMeters(node.lat, node.lon, centerLat, centerLon);
                if (!isNaN(pt.x) && !isNaN(pt.y)) {
                    polyPoints.push([pt.x * scale, pt.y * scale] as [number, number]);
                }
            });
            if (polyPoints.length < 2) return;
            const first = polyPoints[0];
            const last = polyPoints[polyPoints.length - 1];
            const isClosed = Math.abs(first[0] - last[0]) < 0.1 && Math.abs(first[1] - last[1]) < 0.1;
            if (isClosed) {
                coastlinePolys.push(ensureCCW(polyPoints) as unknown as polygonClipping.Ring);
            } else {
                coastlineLines.push(polyPoints);
            }
        });

        // Handle entire area as sea if no coastlines
        if (coastlineLines.length === 0 && coastlinePolys.length === 0) {
            if (isSea(centerLat, centerLon)) {
                const shape = new THREE.Shape();
                shape.moveTo(CLIP_BOX_RING[0][0], CLIP_BOX_RING[0][1]);
                for (let i = 1; i < CLIP_BOX_RING.length; i++) shape.lineTo(CLIP_BOX_RING[i][0], CLIP_BOX_RING[i][1]);
                const geom = new THREE.ShapeGeometry(shape);
                geom.rotateX(-Math.PI / 2);
                geom.translate(0, 0.01, 0);
                const clean = cleanAndStandardize(geom);
                if (clean) waterGeometries.push(clean);
            }
        } else if (coastlineLines.length > 0) {
            // Split clip box with open coastlines
            let currentPolys: polygonClipping.Ring[] = [CLIP_BOX_RING as unknown as polygonClipping.Ring];
            coastlineLines.forEach((line: [number, number][]) => {
                const newPolys: polygonClipping.Ring[] = [];
                currentPolys.forEach((polyRing) => {
                    try {
                        // @ts-ignore polygon-splitter types may not align perfectly
                        const geoPoly = { type: 'Polygon', coordinates: [polyRing] };
                        // @ts-ignore
                        const geoLine = { type: 'LineString', coordinates: line };
                        // @ts-ignore
                        const split = polygonSplitter(geoPoly, geoLine);
                        // @ts-ignore
                        split.forEach((s: any) => newPolys.push(s.coordinates[0] as polygonClipping.Ring));
                    } catch (e) {
                        newPolys.push(polyRing);
                    }
                });
                currentPolys = newPolys;
            });

            // Classify split regions as sea (water)
            let seaMulti: polygonClipping.MultiPolygon = [];
            currentPolys.forEach((ring) => {
                if (ring.length < 3) return;
                const cent = getCentroid(ring);
                const x_meters = cent[0] / scale;
                const y_meters = cent[1] / scale;
                const { lat, lon } = metersToLatLon(x_meters, y_meters, centerLat, centerLon);
                if (isSea(lat, lon)) {
                    seaMulti.push([[ensureCCW(ring as unknown as [number, number][]) as unknown as polygonClipping.Ring]]);
                }
            });

            // Subtract islands (closed coastlines) from sea
            coastlinePolys.forEach((islandRing) => {
                const islandPoly: polygonClipping.MultiPolygon = [[[islandRing]]];
                seaMulti = polygonClipping.difference(seaMulti, islandPoly);
            });

            // Add sea geometries
            seaMulti.forEach((multi) => {
                if (multi.length === 0) return;
                const shape = new THREE.Shape();
                const outer = multi[0];
                shape.moveTo(outer[0][0], outer[0][1]);
                for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i][0], outer[i][1]);
                for (let h = 1; h < multi.length; h++) {
                    const hole = new THREE.Path();
                    const ring = multi[h];
                    hole.moveTo(ring[0][0], ring[0][1]);
                    for (let i = 1; i < ring.length; i++) hole.lineTo(ring[i][0], ring[i][1]);
                    shape.holes.push(hole);
                }
                const geom = new THREE.ShapeGeometry(shape);
                geom.rotateX(-Math.PI / 2);
                geom.translate(0, 0.01, 0);
                const clean = cleanAndStandardize(geom);
                if (clean) waterGeometries.push(clean);
            });
        }

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