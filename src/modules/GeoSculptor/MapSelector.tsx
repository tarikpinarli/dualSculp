import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import Map, { ScaleControl } from 'react-map-gl';
import { AlertTriangle, Crosshair } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Max Radius in Real Meters (for performance safety)
const MAX_RADIUS_REAL_M = 6000; 
const EARTH_RADIUS = 6378137;

// Project Longitude to Web Mercator X (Meters)
const projectLonToMercator = (lon: number) => {
  return EARTH_RADIUS * (lon * Math.PI / 180);
};

export interface MapSelectorRef {
    flyTo: (lat: number, lon: number) => void;
    getSelection: () => { lat: number, lon: number, zoom: number, radius: number } | null;
}

export const MapSelector = forwardRef<MapSelectorRef, {}>((props, ref) => {
  const mapRef = useRef<any>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  
  const [viewState, setViewState] = useState(() => {
      const saved = localStorage.getItem('geo_sculptor_last_pos');
      if (saved) { try { return JSON.parse(saved); } catch (e) {} }
      return { longitude: -74.006, latitude: 40.7128, zoom: 14 };
  });

  // We now track two radii:
  // 1. Real Radius: For the UI badge (Physical size)
  // 2. Mercator Radius: For the 3D Engine (Coordinate system match)
  const [realRadius, setRealRadius] = useState(0);
  const [mercatorRadius, setMercatorRadius] = useState(0);
  const [isOutOfRange, setIsOutOfRange] = useState(false);

  useImperativeHandle(ref, () => ({
      flyTo: (lat, lon) => {
          mapRef.current?.flyTo({ center: [lon, lat], zoom: 15, speed: 1.5 });
          setViewState(prev => ({ ...prev, latitude: lat, longitude: lon, zoom: 15 }));
      },
      getSelection: () => {
          if (isOutOfRange) {
              alert("Area too large! Please zoom in to capture.");
              return null;
          }
          return {
              lat: viewState.latitude,
              lon: viewState.longitude,
              zoom: Math.floor(viewState.zoom),
              // VITAL FIX: Send Mercator Radius to engine to match the map projection exactly
              radius: mercatorRadius / 1000 
          };
      }
  }));

  useEffect(() => {
      const timer = setTimeout(() => {
          localStorage.setItem('geo_sculptor_last_pos', JSON.stringify(viewState));
      }, 1000);
      return () => clearTimeout(timer);
  }, [viewState]);

  const updateSelectionStats = () => {
      if (!mapRef.current || !boxRef.current) return;
      const map = mapRef.current.getMap();
      
      const box = boxRef.current.getBoundingClientRect();
      const mapCanvas = map.getCanvas().getBoundingClientRect();

      // 1. Get center and edge in Pixels
      const cX = box.left + box.width / 2 - mapCanvas.left;
      const cY = box.top + box.height / 2 - mapCanvas.top;
      const eX = box.right - mapCanvas.left; // Right edge
      
      // 2. Unproject to Lat/Lon
      const centerLL = map.unproject([cX, cY]);
      const edgeLL = map.unproject([eX, cY]);

      // 3. Calculate Real World Distance (Haversine) -> For UI Display
      const R = 6371e3; 
      const φ1 = centerLL.lat * Math.PI/180;
      const φ2 = edgeLL.lat * Math.PI/180;
      const Δφ = (edgeLL.lat-centerLL.lat) * Math.PI/180;
      const Δλ = (edgeLL.lng-centerLL.lng) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distReal = R * c;

      // 4. Calculate Mercator Distance -> For 3D Engine Export
      // This ensures the square you see = the square you get, regardless of latitude
      const centerX = projectLonToMercator(centerLL.lng);
      const edgeX = projectLonToMercator(edgeLL.lng);
      const distMercator = Math.abs(edgeX - centerX);

      setRealRadius(distReal);
      setMercatorRadius(distMercator);
      setIsOutOfRange(distReal > MAX_RADIUS_REAL_M);
  };

  useEffect(() => { updateSelectionStats(); }, [viewState]);

  const borderColor = isOutOfRange ? 'border-red-500' : 'border-cyan-400';
  const bgColor = isOutOfRange ? 'bg-red-500/10' : 'bg-cyan-400/5';

  return (
      <div className="relative w-full h-full bg-black overflow-hidden group">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            onLoad={updateSelectionStats}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            maxZoom={22} 
            minZoom={4}
            maxPitch={0} 
            dragRotate={false} 
            attributionControl={false}
            logoPosition="bottom-right"
          >
             <ScaleControl position="bottom-left" />
          </Map>

          {/* CROP BOX */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div 
                  ref={boxRef} 
                  className={`w-48 h-48 md:w-64 md:h-64 border-2 ${borderColor} ${bgColor} relative transition-all duration-300`}
              >
                  {/* Corners */}
                  <div className={`absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 ${borderColor}`} />
                  <div className={`absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 ${borderColor}`} />
                  <div className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 ${borderColor}`} />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 ${borderColor}`} />
                  
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 opacity-50">
                      <Crosshair size={24} strokeWidth={1} />
                  </div>

                  {/* Info Badge */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      {isOutOfRange ? (
                         <span className="bg-red-900 text-red-200 px-2 py-1 text-[10px] font-bold uppercase rounded-sm border border-red-500">Too Large</span>
                      ) : (
                         <span className="bg-black/80 text-cyan-400 px-2 py-1 text-[10px] font-mono rounded-sm border border-cyan-500/30">
                            R: {(realRadius).toFixed(0)}m
                         </span>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );
});

MapSelector.displayName = "MapSelector";