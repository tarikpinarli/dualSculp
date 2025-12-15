import * as THREE from 'three';

// --- YARDIMCI: 3D Noise ---
function noise(x: number, y: number, z: number) {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1;
}

// --- YARDIMCI: Laplacian Smoothing ---
function applySmoothing(geometry: THREE.BufferGeometry, iterations: number = 2) {
  const positionAttribute = geometry.attributes.position;
  const positions = positionAttribute.array as Float32Array;
  const indexAttribute = geometry.index;
  
  if (!indexAttribute) return;

  const indices = indexAttribute.array;
  const vertexCount = positions.length / 3;

  const neighbors = new Array(vertexCount).fill(0).map(() => [] as number[]);
  
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    
    if (!neighbors[a].includes(b)) neighbors[a].push(b);
    if (!neighbors[a].includes(c)) neighbors[a].push(c);
    if (!neighbors[b].includes(a)) neighbors[b].push(a);
    if (!neighbors[b].includes(c)) neighbors[b].push(c);
    if (!neighbors[c].includes(a)) neighbors[c].push(a);
    if (!neighbors[c].includes(b)) neighbors[c].push(b);
  }

  const newPositions = new Float32Array(positions);
  const lambda = 0.8; // Smoothing gücü (0.5 -> 0.8 yaptık)

  for (let k = 0; k < iterations; k++) {
    for (let i = 0; i < vertexCount; i++) {
      const myNeighbors = neighbors[i];
      if (myNeighbors.length === 0) continue;

      let avgX = 0, avgY = 0, avgZ = 0;
      for (const n of myNeighbors) {
        avgX += positions[n * 3];
        avgY += positions[n * 3 + 1];
        avgZ += positions[n * 3 + 2];
      }
      avgX /= myNeighbors.length;
      avgY /= myNeighbors.length;
      avgZ /= myNeighbors.length;

      const cx = positions[i * 3];
      const cy = positions[i * 3 + 1];
      const cz = positions[i * 3 + 2];

      newPositions[i * 3]     = cx + (avgX - cx) * lambda;
      newPositions[i * 3 + 1] = cy + (avgY - cy) * lambda;
      newPositions[i * 3 + 2] = cz + (avgZ - cz) * lambda;
    }
    positions.set(newPositions);
  }
  positionAttribute.needsUpdate = true;
}

// --- YARDIMCI: Resim Yükleyici ---
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// --- YARDIMCI: İçerik Sınırlarını Bul (Crop) ---
function getContentBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      if (avg < 200) { // Koyu renkli pikselleri "içerik" say
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return { x: 0, y: 0, w: width, h: height, isEmpty: true };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, isEmpty: false };
}

// --- ANA FONKSİYON: Senkronize Resim İşleme (YENİ) ---
// İki resmi aynı anda alır, boylarını eşitler ve ortalar.
export async function getAlignedImageData(srcA: string | null, srcB: string | null, size: number): Promise<[Uint8ClampedArray | null, Uint8ClampedArray | null]> {
    
    // 1. Resimleri Yükle
    const imgA = srcA ? await loadImage(srcA) : null;
    const imgB = srcB ? await loadImage(srcB) : null;

    // Helper: Resmi canvas'a çiz ve sınırlarını al
    const analyzeImage = (img: HTMLImageElement) => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = 'white';
        ctx.fillRect(0,0,c.width, c.height);
        ctx.drawImage(img, 0, 0);
        return { ctx, bounds: getContentBounds(ctx, c.width, c.height), canvas: c };
    };

    const infoA = imgA ? analyzeImage(imgA) : null;
    const infoB = imgB ? analyzeImage(imgB) : null;

    // 2. Oranları Hesapla
    // Amacımız: İki resmin de "İçerik Yüksekliği" (bounds.h) final karede AYNI piksel sayısına denk gelmeli.
    
    // Varsayılan olarak kutunun %90'ını yükseklik olarak hedefle
    let targetHeight = size * 0.9;
    
    // A ve B'nin en/boy oranları (Aspect Ratio)
    const arA = infoA && !infoA.bounds.isEmpty ? infoA.bounds.w / infoA.bounds.h : 1;
    const arB = infoB && !infoB.bounds.isEmpty ? infoB.bounds.w / infoB.bounds.h : 1;

    // Eğer bu yükseklikte çizersek genişlikler ne olur?
    let targetWidthA = targetHeight * arA;
    let targetWidthB = targetHeight * arB;

    // 3. Sığdırma Kontrolü
    // Eğer herhangi bir genişlik kutuyu taşıyorsa (gridSize), yüksekliği düşür.
    if (targetWidthA > size) {
        const scale = size / targetWidthA;
        targetHeight *= scale;
        targetWidthA *= scale;
        targetWidthB *= scale;
    }
    if (targetWidthB > size) {
        const scale = size / targetWidthB;
        targetHeight *= scale;
        targetWidthA *= scale;
        targetWidthB *= scale;
    }

    // 4. Çizim Fonksiyonu
    const drawToGrid = (info: any, targetW: number, targetH: number) => {
        if (!info) return null;
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = size;
        finalCanvas.height = size;
        const ctx = finalCanvas.getContext('2d')!;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        if (!info.bounds.isEmpty) {
            // Tam ortaya çiz
            const x = (size - targetW) / 2;
            const y = (size - targetH) / 2;

            ctx.drawImage(
                info.canvas,
                info.bounds.x, info.bounds.y, info.bounds.w, info.bounds.h, // Kaynak (Crop)
                x, y, targetW, targetH // Hedef (Resize & Center)
            );
        }
        return ctx.getImageData(0, 0, size, size).data;
    };

    const dataA = drawToGrid(infoA, targetWidthA, targetHeight);
    const dataB = drawToGrid(infoB, targetWidthB, targetHeight);

    return [dataA, dataB];
}

// --- MASKE OLUŞTURUCU ---
export function createMask(data: Uint8ClampedArray, size: number, threshold: number = 100): boolean[][] {
  const mask: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      mask[x][y] = brightness < threshold; 
    }
  }
  return mask;
}

// --- VOXEL GEOMETRİ ---
export function generateVoxelGeometry(
  maskA: boolean[][] | null, 
  maskB: boolean[][] | null, 
  artisticMode: boolean, 
  smoothingIterations: number = 0,
  targetHeightCM: number = 10,
  gridSize: number
): THREE.BufferGeometry {
  const size = gridSize;
  const voxels: boolean[][][] = Array(size).fill(0).map(() => Array(size).fill(0).map(() => Array(size).fill(false)));

  for (let y = 0; y < size; y++) {
    const imgY = size - 1 - y; 
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        // Maske yoksa o eksende kısıtlama yok demektir (true kabul et)
        let solidA = !maskA || maskA[x][imgY];
        let solidB = !maskB || maskB[z][imgY];
        let isSolid = solidA && solidB;

        if (isSolid && artisticMode) {
          const scale = 0.08; 
          const n = Math.abs(Math.sin(x * 12.9898 * scale + y * 78.233 * scale + z * 37.719 * scale) * 43758.5453) % 1;
          if (n < 0.4) isSolid = false; 
        }
        voxels[x][y][z] = isSolid;
      }
    }
  }

  // --- Mesh Oluşturma (Greedy Meshing yerine basit Voxel Meshing) ---
  const vertices: number[] = [];
  const indices: number[] = [];
  const vertexMap = new Map<string, number>();

  const getOrAddVertex = (vx: number, vy: number, vz: number): number => {
    // Vertex paylaşımı (smooth shading için kritik)
    const key = `${Math.round(vx*100)},${Math.round(vy*100)},${Math.round(vz*100)}`;
    if (vertexMap.has(key)) return vertexMap.get(key)!;
    const idx = vertices.length / 3;
    vertices.push(vx, vy, vz);
    vertexMap.set(key, idx);
    return idx;
  };

  const addQuad = (v1: number[], v2: number[], v3: number[], v4: number[]) => {
    const i1 = getOrAddVertex(v1[0], v1[1], v1[2]);
    const i2 = getOrAddVertex(v2[0], v2[1], v2[2]);
    const i3 = getOrAddVertex(v3[0], v3[1], v3[2]);
    const i4 = getOrAddVertex(v4[0], v4[1], v4[2]);
    indices.push(i1, i2, i3);
    indices.push(i1, i3, i4);
  };

  const d = 0.5; 
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        if (!voxels[x][y][z]) continue;
        const cx = x, cy = y, cz = z;
        if (x === size - 1 || !voxels[x + 1][y][z]) addQuad([cx+d, cy-d, cz+d], [cx+d, cy-d, cz-d], [cx+d, cy+d, cz-d], [cx+d, cy+d, cz+d]);
        if (x === 0 || !voxels[x - 1][y][z]) addQuad([cx-d, cy-d, cz-d], [cx-d, cy-d, cz+d], [cx-d, cy+d, cz+d], [cx-d, cy+d, cz-d]);
        if (y === size - 1 || !voxels[x][y + 1][z]) addQuad([cx-d, cy+d, cz+d], [cx+d, cy+d, cz+d], [cx+d, cy+d, cz-d], [cx-d, cy+d, cz-d]);
        if (y === 0 || !voxels[x][y - 1][z]) addQuad([cx-d, cy-d, cz-d], [cx+d, cy-d, cz-d], [cx+d, cy-d, cz+d], [cx-d, cy-d, cz+d]);
        if (z === size - 1 || !voxels[x][y][z + 1]) addQuad([cx-d, cy-d, cz+d], [cx+d, cy-d, cz+d], [cx+d, cy+d, cz+d], [cx-d, cy+d, cz+d]);
        if (z === 0 || !voxels[x][y][z - 1]) addQuad([cx+d, cy-d, cz-d], [cx-d, cy-d, cz-d], [cx-d, cy+d, cz-d], [cx-d, cy+d, cz-d]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  
  // Smoothing
  if (smoothingIterations > 0 && vertices.length > 0) {
    applySmoothing(geometry, smoothingIterations);
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  // Merkezleme ve Ölçekleme
  const centerOffset = new THREE.Vector3();
  geometry.boundingBox?.getCenter(centerOffset);
  geometry.translate(-centerOffset.x, -centerOffset.y, -centerOffset.z);
  
  // Fiziksel Boyuta Ölçekleme (cm -> birim)
  geometry.computeBoundingBox(); // Güncel box
  const box = geometry.boundingBox;
  if (box) {
    const currentHeightUnits = box.max.y - box.min.y;
    // Eğer obje çok küçükse veya boşsa hata vermemesi için kontrol
    if (currentHeightUnits > 0.1) {
        const targetHeightMM = targetHeightCM * 10; 
        const scaleFactor = targetHeightMM / currentHeightUnits;
        geometry.scale(scaleFactor, scaleFactor, scaleFactor);
    }
  }

  return geometry;
}

export function exportToSTL(geometry: THREE.BufferGeometry): Blob {
  // STL Export mantığı aynı kalacak
  const positions = geometry.attributes.position.array;
  const index = geometry.index ? geometry.index.array : null;
  const normals = geometry.attributes.normal.array;
  const triangles = index ? index.length / 3 : positions.length / 9;
  
  const bufferLength = 80 + 4 + triangles * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);
  view.setUint32(80, triangles, true);

  let offset = 84;
  for (let i = 0; i < triangles; i++) {
    let idx1, idx2, idx3;
    if (index) {
      idx1 = index[i * 3]; idx2 = index[i * 3 + 1]; idx3 = index[i * 3 + 2];
    } else {
      idx1 = i * 3; idx2 = i * 3 + 1; idx3 = i * 3 + 2;
    }
    // Normal ve Vertex verilerini yaz...
    view.setFloat32(offset, normals[idx1 * 3], true);
    view.setFloat32(offset + 4, normals[idx1 * 3 + 1], true);
    view.setFloat32(offset + 8, normals[idx1 * 3 + 2], true);
    view.setFloat32(offset + 12, positions[idx1 * 3], true);
    view.setFloat32(offset + 16, positions[idx1 * 3 + 1], true);
    view.setFloat32(offset + 20, positions[idx1 * 3 + 2], true);
    view.setFloat32(offset + 24, positions[idx2 * 3], true);
    view.setFloat32(offset + 28, positions[idx2 * 3 + 1], true);
    view.setFloat32(offset + 32, positions[idx2 * 3 + 2], true);
    view.setFloat32(offset + 36, positions[idx3 * 3], true);
    view.setFloat32(offset + 40, positions[idx3 * 3 + 1], true);
    view.setFloat32(offset + 44, positions[idx3 * 3 + 2], true);
    view.setUint16(offset + 48, 0, true);
    offset += 50;
  }
  return new Blob([view], { type: 'application/octet-stream' });
}