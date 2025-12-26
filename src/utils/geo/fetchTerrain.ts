import * as THREE from 'three';
import { getTileCoords, cleanAndStandardize } from './geoShared';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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