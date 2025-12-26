import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import polygonClipping from 'polygon-clipping';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const EARTH_RADIUS = 6378137;

// --- 1. PROJECTION MATH (Web Mercator EPSG:3857) ---

// Converts Lat/Lon to Web Mercator Meters
export const projectToMercator = (lat: number, lon: number) => {
  const x = EARTH_RADIUS * (lon * Math.PI / 180);
  const latRad = Math.max(-85.051129, Math.min(85.051129, lat)) * Math.PI / 180;
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return { x, y };
};

const getTileBounds = (tx: number, ty: number, zoom: number) => {
  const numTiles = Math.pow(2, zoom);
  const worldSize = 2 * Math.PI * EARTH_RADIUS;
  const tileSizeMeters = worldSize / numTiles;

  const minX = (tx * tileSizeMeters) - (worldSize / 2);
  const maxY = (worldSize / 2) - (ty * tileSizeMeters); // Top Y (North)
  const minY = maxY - tileSizeMeters;                  // Bottom Y (South)
  const maxX = minX + tileSizeMeters;

  return { minX, maxX, minY, maxY, tileSizeMeters };
};

const getTileCoords = (lat: number, lon: number, zoom: number) => {
  const n = Math.pow(2, zoom);
  const x = Math.floor(n * ((lon + 180) / 360));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2);
  return { x, y };
};

// --- 2. GEOMETRY HELPERS ---

const cleanAndStandardize = (geom: THREE.BufferGeometry) => {
  if (geom.attributes.uv) geom.deleteAttribute('uv');
  if (geom.attributes.color) geom.deleteAttribute('color');
  geom.computeVertexNormals();
  return geom;
};

const ensureCCW = (ring: [number, number][]) => {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  }
  return sum > 0 ? ring.reverse() : ring;
};

// --- 3. TERRAIN FETCH (Solid Block for 3D Printing) ---

export interface HeightSampler {
  getHeight: (mercX: number, mercY: number) => number;
}

export const fetchTerrainGeometry = async (
  lat: number, 
  lon: number, 
  radiusKM: number,
  zoom: number = 13
) => {
  const { x, y } = getTileCoords(lat, lon, zoom);
  const center = projectToMercator(lat, lon); 
  const bounds = getTileBounds(x, y, zoom);

  const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${x}/${y}.pngraw?access_token=${MAPBOX_TOKEN}`;
  
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = url;

  return new Promise<{ 
    geometry: THREE.BufferGeometry, 
    base: THREE.BufferGeometry, 
    sampler: HeightSampler 
  }>((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("No Canvas");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;

      // Grid Config - Corrected to exactly 2x radius (1 unit radius each side)
      const sizeMeters = radiusKM * 1000 * 2;
      const segments = 128;
      const gridSize = segments + 1;
      const halfSize = sizeMeters / 2;
      
      const topVertices: number[] = [];
      const bottomVertices: number[] = [];
      const indices: number[] = [];
      let minH = Infinity;

      // 1. Generate Top Surface Vertices
      for (let i = 0; i < gridSize; i++) {
        const z = -halfSize + (i / segments) * sizeMeters; 
        for (let j = 0; j < gridSize; j++) {
            const x = -halfSize + (j / segments) * sizeMeters; 

            // Calculate World Mercator Coords
            const mx = center.x + x;
            const my = center.y - z; 

            // Map to UV
            const u = (mx - bounds.minX) / bounds.tileSizeMeters;
            const v = (my - bounds.minY) / bounds.tileSizeMeters;
            const safeU = Math.max(0, Math.min(1, u));
            const safeV = Math.max(0, Math.min(1, v));

            // Image Lookup
            const imgX = Math.floor(safeU * (img.width - 1));
            const imgY = Math.floor((1 - safeV) * (img.height - 1));

            const idx = (imgY * img.width + imgX) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            const h = -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);

            topVertices.push(x, h, z);
            if (h < minH) minH = h;
        }
      }

      // 2. Normalize Heights (Lowest point = 0)
      for (let i = 1; i < topVertices.length; i += 3) {
          topVertices[i] -= minH;
      }

      // 3. Generate Bottom Vertices (Flat Base)
      const BASE_THICKNESS = 20; // Meters thick below lowest point
      const bottomY = -BASE_THICKNESS;

      for (let i = 0; i < topVertices.length; i += 3) {
        // x, bottomY, z
        bottomVertices.push(topVertices[i], bottomY, topVertices[i+2]);
      }

      // 4. Generate Indices (Topology)
      const vertexCount = gridSize * gridSize;

      // Helper to add a quad (CCW)
      const addQuad = (a: number, b: number, c: number, d: number) => {
        indices.push(a, b, d);
        indices.push(b, c, d);
      };

      // A. Top Surface & Bottom Surface
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
          const a = i * gridSize + j;
          const b = i * gridSize + (j + 1);
          const c = (i + 1) * gridSize + (j + 1);
          const d = (i + 1) * gridSize + j;

          // Top (Standard winding)
          addQuad(a, b, c, d);

          // Bottom (Reversed winding to face down)
          // Offset by vertexCount to reach bottom vertices
          const A = a + vertexCount, B = b + vertexCount, C = c + vertexCount, D = d + vertexCount;
          addQuad(A, D, C, B); 
        }
      }

      // B. Sides (Stitching Top to Bottom)
      // North Edge (i=0)
      for (let j = 0; j < segments; j++) {
        const top1 = j, top2 = j + 1;
        const bot1 = top1 + vertexCount, bot2 = top2 + vertexCount;
        addQuad(top1, bot1, bot2, top2); // Face North (Back)
      }

      // South Edge (i=segments)
      const lastRowStart = segments * gridSize;
      for (let j = 0; j < segments; j++) {
        const top1 = lastRowStart + j, top2 = lastRowStart + j + 1;
        const bot1 = top1 + vertexCount, bot2 = top2 + vertexCount;
        addQuad(top1, top2, bot2, bot1); // Face South (Front)
      }

      // West Edge (j=0)
      for (let i = 0; i < segments; i++) {
        const top1 = i * gridSize, top2 = (i + 1) * gridSize;
        const bot1 = top1 + vertexCount, bot2 = top2 + vertexCount;
        addQuad(top1, top2, bot2, bot1); // Face West (Left)
      }

      // East Edge (j=segments)
      for (let i = 0; i < segments; i++) {
        const top1 = i * gridSize + segments, top2 = (i + 1) * gridSize + segments;
        const bot1 = top1 + vertexCount, bot2 = top2 + vertexCount;
        addQuad(top1, bot1, bot2, top2); // Face East (Right)
      }

      // 5. Final Geometry Construction
      const geometry = new THREE.BufferGeometry();
      const allVertices = [...topVertices, ...bottomVertices];
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      // --- Sampler ---
      const sampler: HeightSampler = {
        getHeight: (mercX: number, mercY: number) => {
            const u = (mercX - bounds.minX) / bounds.tileSizeMeters;
            const v = (mercY - bounds.minY) / bounds.tileSizeMeters;
            if (u < 0 || u > 1 || v < 0 || v > 1) return 0;

            const imgX = Math.floor(u * (img.width - 1));
            const imgY = Math.floor((1 - v) * (img.height - 1));
            const idx = (imgY * img.width + imgX) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            const h = -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
            
            return h - minH; 
        }
      };

      resolve({
         geometry, 
         base: new THREE.BufferGeometry(), // Empty, geometry is now the solid block
         sampler
      });
    };
    img.onerror = () => reject("Terrain Load Failed");
  });
};

// --- 4. ROADS (Smooth Draping) ---

export const fetchRoadsGeometry = async (
  centerLat: number, 
  centerLon: number, 
  radiusKM: number = 1,
  sampler?: HeightSampler
) => {
  const center = projectToMercator(centerLat, centerLon);
  const fetchRadius = radiusKM * 1.5; 
  const latOffset = fetchRadius / 111;
  const lonOffset = fetchRadius / (111 * Math.cos(centerLat * Math.PI / 180));
  
  const bbox = `${centerLat - latOffset},${centerLon - lonOffset},${centerLat + latOffset},${centerLon + lonOffset}`;
  const query = `[out:json][timeout:25];(way["highway"](${bbox}););out geom;`;

  try {
    const res = await fetch(`https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();
    const elements = data.elements.filter((el: any) => el.type === 'way' && el.geometry);
    
    const roadGeoms: THREE.BufferGeometry[] = [];
    const LIMIT = radiusKM * 1000;

    elements.forEach((el: any) => {
       // 1. Collect raw path points (Flat, Y=0 initially)
       const rawPoints: THREE.Vector3[] = [];
       
       el.geometry.forEach((node: any) => {
           const merc = projectToMercator(node.lat, node.lon);
           const x = merc.x - center.x;
           const z = -(merc.y - center.y); 
           
           // Rough bounds check
           if (Math.abs(x) < LIMIT + 100 && Math.abs(z) < LIMIT + 100) {
             rawPoints.push(new THREE.Vector3(x, 0, z));
           }
       });

       if (rawPoints.length < 2) return;

       // 2. Create a temporary curve to interpolate the X/Z path
       const tempCurve = new THREE.CatmullRomCurve3(rawPoints);
       const len = tempCurve.getLength();
       // Resample every 5 meters for smooth terrain following
       const divisions = Math.max(5, Math.floor(len / 5)); 
       
       const densePoints = tempCurve.getPoints(divisions);

       // 3. Drape the dense points over the terrain
       const finalPoints: THREE.Vector3[] = [];
       
       densePoints.forEach((p) => {
         // Check limits exactly
         if (Math.abs(p.x) > LIMIT || Math.abs(p.z) > LIMIT) return;

         let y = 1.5; // Base offset (raised to prevent z-fighting)
         if (sampler) {
             // Convert back to world Mercator to sample height
             const mercX = center.x + p.x;
             const mercY = center.y - p.z; // Invert Z back to Y
             
             // Get height and add offset
             y = sampler.getHeight(mercX, mercY) + 1.5; 
         }
         finalPoints.push(new THREE.Vector3(p.x, y, p.z));
       });

       if (finalPoints.length < 2) return;

       // 4. Create the final smooth geometry
       const finalCurve = new THREE.CatmullRomCurve3(finalPoints);
       finalCurve.tension = 0.5; // Smooth tension
       
       const tube = new THREE.TubeGeometry(finalCurve, finalPoints.length, 2, 6, false);
       roadGeoms.push(cleanAndStandardize(tube));
    });

    if (roadGeoms.length === 0) return null;
    return BufferGeometryUtils.mergeGeometries(roadGeoms);
  } catch (err) {
    return null;
  }
};

// --- 5. BUILDINGS (Detailed: Parts, Holes, Min-Heights) ---

export const fetchBuildingsGeometry = async (
  centerLat: number, 
  centerLon: number, 
  radiusKM: number = 1,
  projectOnTerrain: boolean = false,
  sampler?: HeightSampler,
  setStatus?: (msg: string) => void
) => {
  if (setStatus) setStatus("Downloading Buildings...");
  
  const center = projectToMercator(centerLat, centerLon);
  const fetchRadius = radiusKM * 1.5;
  const latOffset = fetchRadius / 111;
  const lonOffset = fetchRadius / (111 * Math.cos(centerLat * Math.PI / 180));
  const bbox = `${centerLat - latOffset},${centerLon - lonOffset},${centerLat + latOffset},${centerLon + lonOffset}`;

  // UPDATED QUERY: Fetch 'building:part' for details and relations
  const query = `
    [out:json][timeout:25];
    (
      way["building"](${bbox});
      relation["building"](${bbox});
      way["building:part"](${bbox});
      relation["building:part"](${bbox});
    );
    out geom;
  `;

  try {
    const res = await fetch(`https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    if (setStatus) setStatus("Processing Geometry...");

    const elements = data.elements.filter((el: any) => 
        (el.type === 'way' || el.type === 'relation') && 
        el.geometry && 
        el.tags?.location !== 'underground' // Skip subways
    );

    const buildingGeoms: THREE.BufferGeometry[] = [];
    const LIMIT = radiusKM * 1000;
    const CLIP_BOX: any = [[[-LIMIT, -LIMIT], [LIMIT, -LIMIT], [LIMIT, LIMIT], [-LIMIT, LIMIT], [-LIMIT, -LIMIT]]];

    elements.forEach((el: any) => {
        // 1. Calculate Top Height
        let height = 10;
        if (el.tags.height) {
            height = parseFloat(el.tags.height);
        } else if (el.tags['building:levels']) {
            height = parseFloat(el.tags['building:levels']) * 3.5;
        }

        // 2. Calculate Base Height (Min Height)
        let minHeight = 0;
        if (el.tags.min_height) {
            minHeight = parseFloat(el.tags.min_height);
        } else if (el.tags['building:min_level']) {
            minHeight = parseFloat(el.tags['building:min_level']) * 3.5;
        }

        // Validate heights
        if (isNaN(height)) height = 10;
        if (isNaN(minHeight)) minHeight = 0;
        const actualHeight = height - minHeight;
        if (actualHeight <= 0) return; // Skip invalid geometry

        // 3. Process Geometry Points
        const ring: [number, number][] = [];
        let wx = 0, wy = 0, count = 0;

        // Handle Relation or Way geometry
        // Note: For relations, Overpass 'out geom' returns simplified member geometry. 
        // We treat the outer ring of relations as the shape for simplicity in this visualizer.
        const nodes = el.geometry || (el.members && el.members[0] && el.members[0].geometry);
        if (!nodes) return;

        nodes.forEach((node: any) => {
            if (!node.lat || !node.lon) return;
            const merc = projectToMercator(node.lat, node.lon);
            wx += merc.x; wy += merc.y; count++; 
            ring.push([merc.x - center.x, merc.y - center.y]);
        });

        if (count > 0) { wx /= count; wy /= count; }
        if (ring.length === 0) return;

        // Close the ring if open
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);

        const fixedRing = ensureCCW(ring);
        
        try {
            // Clip against the world box
            const clipped = polygonClipping.intersection([fixedRing], CLIP_BOX);
            
            // Iterate over MultiPolygons
            clipped.forEach((polygon) => {
                // Polygon Structure: [ExteriorRing, HoleRing1, HoleRing2...]
                if (polygon.length === 0) return;

                const shape = new THREE.Shape();
                
                // A. Exterior Ring (Index 0)
                const exterior = polygon[0];
                if (exterior.length < 3) return;
                shape.moveTo(exterior[0][0], exterior[0][1]);
                for (let i = 1; i < exterior.length; i++) {
                    shape.lineTo(exterior[i][0], exterior[i][1]);
                }

                // B. Holes (Indices 1+)
                for (let k = 1; k < polygon.length; k++) {
                    const holeRing = polygon[k];
                    if (holeRing.length < 3) continue;
                    const holePath = new THREE.Path();
                    holePath.moveTo(holeRing[0][0], holeRing[0][1]);
                    for (let i = 1; i < holeRing.length; i++) {
                        holePath.lineTo(holeRing[i][0], holeRing[i][1]);
                    }
                    shape.holes.push(holePath);
                }

                // C. Extrusion
                const extrudeSettings = { 
                    steps: 1, 
                    depth: actualHeight, 
                    bevelEnabled: false 
                };
                
                const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

                // Rotate to sit on ground (X-90)
                geom.rotateX(-Math.PI / 2); 
                
                // Calculate Terrain Offset
                let terrainOffset = 0;
                if (projectOnTerrain && sampler) {
                    terrainOffset = sampler.getHeight(wx, wy);
                }

                // Apply Min-Height (e.g. for bridges) + Terrain Height
                geom.translate(0, minHeight + terrainOffset, 0);

                buildingGeoms.push(cleanAndStandardize(geom));
            });
        } catch (e) {
            // console.warn("Building Error", e);
        }
    });

    if (buildingGeoms.length === 0) return null;
    return BufferGeometryUtils.mergeGeometries(buildingGeoms);

  } catch (err) {
    console.error("Fetch Buildings Error:", err);
    return null;
  }
};