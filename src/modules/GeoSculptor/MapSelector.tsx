import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import Map, { ScaleControl } from 'react-map-gl';
import { AlertTriangle } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAX_RADIUS_KM = 2; // Reduced slightly to encourage detailed meshes

// Helper: Distance Calc
const getDistanceKM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
      return { longitude: -74.006, latitude: 40.7128, zoom: 16 };
  });

  const [boxDimensions, setBoxDimensions] = useState({ width: 0, height: 0 });
  const [isOutOfRange, setIsOutOfRange] = useState(false);

  // Expose methods to Parent
  useImperativeHandle(ref, () => ({
      flyTo: (lat, lon) => {
          mapRef.current?.flyTo({ center: [lon, lat], zoom: 16, speed: 1.5 });
          setViewState(prev => ({ ...prev, latitude: lat, longitude: lon, zoom: 16 }));
      },
      getSelection: () => {
          if (isOutOfRange) {
              alert("Area too large! Please zoom in to capture.");
              return null; // Block the action
          }

          // FIX: Use Half-Width (Center to Edge) instead of Diagonal (Center to Corner)
          // This ensures the box edges match the 3D scene edges exactly.
          const maxDim = Math.max(boxDimensions.width, boxDimensions.height);
          const radiusKM = (maxDim / 2) / 1000;
          
          return {
              lat: viewState.latitude,
              lon: viewState.longitude,
              zoom: viewState.zoom,
              radius: radiusKM
          };
      }
  }));

  // Auto-Save
  useEffect(() => {
      const timer = setTimeout(() => {
          localStorage.setItem('geo_sculptor_last_pos', JSON.stringify(viewState));
      }, 1000);
      return () => clearTimeout(timer);
  }, [viewState]);

  // Dimension & Limit Check
  const updateDimensions = () => {
      if (!mapRef.current || !boxRef.current) return;
      const map = mapRef.current.getMap();
      const box = boxRef.current.getBoundingClientRect();
      const mapRect = map.getCanvas().getBoundingClientRect();

      const left = box.left - mapRect.left;
      const right = box.right - mapRect.left;
      const top = box.top - mapRect.top;
      const bottom = box.bottom - mapRect.top;

      const topLeft = map.unproject([left, top]);
      const topRight = map.unproject([right, top]);
      const bottomLeft = map.unproject([left, bottom]);

      const widthMeters = getDistanceKM(topLeft.lat, topLeft.lng, topRight.lat, topRight.lng) * 1000;
      const heightMeters = getDistanceKM(topLeft.lat, topLeft.lng, bottomLeft.lat, bottomLeft.lng) * 1000;

      setBoxDimensions({ width: widthMeters, height: heightMeters });

      // Check Limits using correct math
      const maxDim = Math.max(widthMeters, heightMeters);
      const currentRadiusKM = (maxDim / 2) / 1000;
      setIsOutOfRange(currentRadiusKM > MAX_RADIUS_KM);
  };

  useEffect(() => { updateDimensions(); }, [viewState]);

  // Dynamic Styles
  const borderColor = isOutOfRange ? 'border-red-500' : 'border-cyan-400';
  const bgColor = isOutOfRange ? 'bg-red-500/10' : 'bg-cyan-400/5';
  const shadowColor = isOutOfRange ? 'shadow-[0_0_100px_rgba(239,68,68,0.4)]' : 'shadow-[0_0_100px_rgba(34,211,238,0.2)]';

  return (
      <div className="relative w-full h-full bg-black overflow-hidden">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            onLoad={updateDimensions}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
            
            // --- UPDATED ZOOM LIMITS ---
            maxZoom={26} // Unlocked extreme zoom
            minZoom={4}  // Prevent zooming out to space
            // ---------------------------
            
            maxPitch={60}
            dragRotate={true}
            attributionControl={false}
            logoPosition="bottom-right"
          >
             <ScaleControl position="bottom-left" />
          </Map>

          {/* CROP BOX */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div 
                  ref={boxRef} 
                  className={`w-48 h-48 md:w-64 md:h-64 border-2 ${borderColor} ${bgColor} ${shadowColor} relative transition-colors duration-300`}
              >
                  {/* Corners */}
                  <div className={`absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 ${borderColor}`} />
                  <div className={`absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 ${borderColor}`} />
                  <div className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 ${borderColor}`} />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 ${borderColor}`} />
                  
                  {/* Center Cross */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                      <div className={`absolute top-1/2 left-0 w-full h-[1px] ${isOutOfRange ? 'bg-red-500/50' : 'bg-cyan-400/50'}`} />
                      <div className={`absolute left-1/2 top-0 h-full w-[1px] ${isOutOfRange ? 'bg-red-500/50' : 'bg-cyan-400/50'}`} />
                  </div>

                  {/* Warning Message */}
                  {isOutOfRange && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-950/90 border border-red-500/50 px-3 py-1.5 rounded-sm flex items-center gap-2 animate-bounce">
                          <AlertTriangle size={12} className="text-red-500" />
                          <span className="text-[10px] font-bold text-red-200 uppercase tracking-widest">
                              Max Limit Exceeded
                          </span>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
});

MapSelector.displayName = "MapSelector";