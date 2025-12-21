import * as THREE from 'three';

export interface ReliefConfig {
  width: number;
  height: number;
  depth: number;
  threshold: number;
  detail: number; // This is the resolution
  invert: boolean;
  isFlat: boolean;
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const generateReliefGeometry = async (
  imageUrl: string,
  config: ReliefConfig
): Promise<THREE.BufferGeometry> => {
  
  const img = await loadImage(imageUrl);
  
  // 1. Grid Size
  const aspect = config.width / config.height;
  let cols = config.detail;
  let rows = Math.round(config.detail / aspect);
  
  // --- CAP TO 450 ---
  if (cols > 450) cols = 450;
  if (rows > 450) rows = 450;

  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Canvas context failed");

  ctx.drawImage(img, 0, 0, cols, rows);
  const pixels = ctx.getImageData(0, 0, cols, rows).data;

  // 2. Data Prep
  const grid: Float32Array = new Float32Array(cols * rows);
  const active: Uint8Array = new Uint8Array(cols * rows); // 1 = active, 0 = hole

  for (let i = 0; i < cols * rows; i++) {
    const idx = i * 4;
    let brightness = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
    if (config.invert) brightness = 255 - brightness;

    if (brightness < config.threshold) {
      active[i] = 0;
      grid[i] = 0;
    } else {
      active[i] = 1;
      if (config.isFlat) {
        grid[i] = config.depth;
      } else {
        const factor = (brightness - config.threshold) / (255 - config.threshold);
        grid[i] = Math.max(0.1, factor * config.depth);
      }
    }
  }

  // 3. Mesh Build
  const vertices: number[] = [];
  const indices: number[] = [];
  let vertCount = 0;

  const stepX = config.width / cols;
  const stepY = config.height / rows;

  const pushFace = (v1: number[], v2: number[], v3: number[], v4: number[]) => {
    vertices.push(...v1, ...v2, ...v3, ...v4);
    indices.push(vertCount, vertCount + 1, vertCount + 2);
    indices.push(vertCount, vertCount + 2, vertCount + 3);
    vertCount += 4;
  };

  const getZ = (x: number, y: number) => {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return 0;
    const i = y * cols + x;
    return active[i] ? grid[i] : 0;
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      
      const i = y * cols + x;
      if (!active[i]) continue;

      const zTop = grid[i];
      const zBase = 0;

      const x0 = (x * stepX) - (config.width / 2);
      const y0 = -((y * stepY) - (config.height / 2));
      const x1 = x0 + stepX;
      const y1 = y0 - stepY; 

      // Corners
      const tl = [x0, y0];
      const tr = [x1, y0];
      const br = [x1, y1];
      const bl = [x0, y1];

      // A. TOP FACE
      pushFace(
        [tl[0], tl[1], zTop], 
        [bl[0], bl[1], zTop], 
        [br[0], br[1], zTop], 
        [tr[0], tr[1], zTop]
      );

      // B. BOTTOM FACE
      pushFace(
        [tr[0], tr[1], zBase], 
        [br[0], br[1], zBase], 
        [bl[0], bl[1], zBase], 
        [tl[0], tl[1], zBase]
      );

      // C. WALLS 
      // Right
      const zRight = getZ(x + 1, y);
      if (zTop > zRight) {
        pushFace(
          [tr[0], tr[1], zTop], [br[0], br[1], zTop], 
          [br[0], br[1], zRight], [tr[0], tr[1], zRight]
        );
      }

      // Left
      const zLeft = getZ(x - 1, y);
      if (zTop > zLeft) {
        pushFace(
          [bl[0], bl[1], zTop], [tl[0], tl[1], zTop], 
          [tl[0], tl[1], zLeft], [bl[0], bl[1], zLeft]
        );
      }

      // Top (y-1)
      const zUp = getZ(x, y - 1);
      if (zTop > zUp) {
        pushFace(
          [tl[0], tl[1], zTop], [tr[0], tr[1], zTop], 
          [tr[0], tr[1], zUp], [tl[0], tl[1], zUp]
        );
      }

      // Bottom (y+1)
      const zDown = getZ(x, y + 1);
      if (zTop > zDown) {
        pushFace(
          [br[0], br[1], zTop], [bl[0], bl[1], zTop], 
          [bl[0], bl[1], zDown], [br[0], br[1], zDown]
        );
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};

export function exportToSTL(geometry: THREE.BufferGeometry): Blob {
  // 1. Ensure we have a non-indexed geometry for simple triangle iteration
  const exportGeo = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = exportGeo.attributes.position;
  
  if (!positions) {
      throw new Error("Geometry has no positions");
  }

  // 2. Setup Binary STL Header (80 bytes + 4 bytes count)
  const triangleCount = positions.count / 3;
  const headerSize = 80;
  const triangleSize = 50; // 12 bytes normal + 36 bytes vertices + 2 bytes attr
  const totalSize = headerSize + 4 + (triangleCount * triangleSize);
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  
  // Write triangle count at byte 80
  view.setUint32(80, triangleCount, true); // Little-endian
  
  let offset = 84;
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const cb = new THREE.Vector3();

  // 3. Iterate over every triangle
  for (let i = 0; i < positions.count; i += 3) {
      v1.fromBufferAttribute(positions, i);
      v2.fromBufferAttribute(positions, i + 1);
      v3.fromBufferAttribute(positions, i + 2);
      
      // Calculate Face Normal
      ab.subVectors(v2, v1);
      cb.subVectors(v3, v1);
      ab.cross(cb).normalize(); // (v2-v1) x (v3-v1)
      
      // Write Normal (3 floats)
      view.setFloat32(offset, ab.x, true); offset += 4;
      view.setFloat32(offset, ab.y, true); offset += 4;
      view.setFloat32(offset, ab.z, true); offset += 4;
      
      // Write Vertex 1
      view.setFloat32(offset, v1.x, true); offset += 4;
      view.setFloat32(offset, v1.y, true); offset += 4;
      view.setFloat32(offset, v1.z, true); offset += 4;
      
      // Write Vertex 2
      view.setFloat32(offset, v2.x, true); offset += 4;
      view.setFloat32(offset, v2.y, true); offset += 4;
      view.setFloat32(offset, v2.z, true); offset += 4;
      
      // Write Vertex 3
      view.setFloat32(offset, v3.x, true); offset += 4;
      view.setFloat32(offset, v3.y, true); offset += 4;
      view.setFloat32(offset, v3.z, true); offset += 4;
      
      // Attribute byte count (set to 0)
      view.setUint16(offset, 0, true); offset += 2;
  }
  
  return new Blob([buffer], { type: 'application/octet-stream' });
}