import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import * as path from 'path';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    proxy: {
      // 1. WebSocket Proxy
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // 2. File Download Proxy (The Fix)
      '/files': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-map-gl': path.resolve(__dirname, './node_modules/react-map-gl/dist/mapbox.js'),
    },
  },
  optimizeDeps: {
    include: ['react-map-gl', 'mapbox-gl', 'three', 'three-stdlib'], // Added three libs here for safety
  }
});