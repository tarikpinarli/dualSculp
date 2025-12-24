import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Search, Map as MapIcon, Crosshair } from 'lucide-react';

// Use the token from your .env
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapSelectorProps {
  onConfirm: (coords: { lat: number, lon: number, zoom: number, radius: number }) => void;
}

export const MapSelector = ({ onConfirm }: MapSelectorProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12', 
      center: [-74.006, 40.7128], // NYC
      zoom: 16, // Start zoomed in so buildings are visible
      attributionControl: false,
      pitchWithRotate: false, // Keep it top-down for accuracy
      dragRotate: false       // Disable rotation to ensure N is up
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setIsSearching(true);

    try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}`);
        const data = await res.json();
        
        if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].center;
            map.current?.flyTo({ center: [lon, lat], zoom: 16, speed: 1.5 });
        }
    } catch (err) {
        console.error("Search failed", err);
    } finally {
        setIsSearching(false);
    }
  };

  const handleCapture = () => {
    if (!map.current) return;
    
    // 1. Get Center
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();

    // 2. CALIBRATION LOGIC
    // The visual box is 256px wide (w-64 in Tailwind).
    // The radius is half of that: 128px.
    const canvas = map.current.getCanvas();
    const width = canvas.width;
    const height = canvas.height;
    
    // Calculate the center pixel
    const centerPoint = map.current.project(center);
    
    // Calculate a point exactly 128 CSS pixels to the right
    // Note: Mapbox handles DPI scaling, so we rely on project/unproject which handles it.
    // The box is strictly 256 CSS pixels.
    const edgePointX = centerPoint.x + 128; 
    
    // Convert back to Lat/Lon
    const edgeLngLat = map.current.unproject([edgePointX, centerPoint.y]);

    // 3. Calculate Distance in Kilometers (Haversine Formula not needed for short dist, simple trig is fine)
    // Actually, let's use a robust measure.
    const R = 6371; // km
    const dLat = (edgeLngLat.lat - center.lat) * Math.PI / 180;
    const dLon = (edgeLngLat.lng - center.lng) * Math.PI / 180;
    const lat1 = center.lat * Math.PI / 180;
    const lat2 = edgeLngLat.lat * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const radiusKM = R * c;

    // Safety Clamp: Don't let radius get massive (server crash) or tiny (math error)
    // Max 1km radius (2km wide), Min 0.05km (50m)
    const safeRadius = Math.min(Math.max(radiusKM, 0.05), 1.0);

    console.log("Calculated Radius:", safeRadius, "km");

    onConfirm({ 
        lat: center.lat, 
        lon: center.lng, 
        zoom: Math.floor(zoom),
        radius: safeRadius
    });
  };

  return (
    <div className="relative w-full h-full bg-zinc-900 rounded-sm overflow-hidden border border-zinc-800 flex flex-col">
      
      {/* Search */}
      <div className="absolute top-4 left-4 z-10 w-64 md:w-80">
        <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={14} className="text-cyan-500" />
            </div>
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search location..."
                className="w-full bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs py-3 pl-10 pr-4 rounded-sm focus:outline-none focus:border-cyan-500/50 transition-colors uppercase tracking-wider font-mono shadow-xl"
            />
            <button type="submit" className="hidden"></button>
        </form>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="flex-1 w-full h-full grayscale-[20%] contrast-125" />

      {/* TARGET RETICLE - 256px x 256px (w-64 h-64) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
         <div className="w-64 h-64 border-2 border-cyan-500/50 rounded-sm relative shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-cyan-500/5 backdrop-brightness-110">
            {/* Fancy Corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 -mt-0.5 -ml-0.5"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 -mt-0.5 -mr-0.5"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 -mb-0.5 -ml-0.5"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 -mb-0.5 -mr-0.5"></div>
            
            <div className="absolute inset-0 flex items-center justify-center opacity-50">
                <Crosshair size={20} className="text-cyan-400" />
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400 bg-black/50 px-2 py-0.5 rounded whitespace-nowrap">
                TARGET ZONE
            </div>
         </div>
      </div>

      {/* Capture Button */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <button 
            onClick={handleCapture}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-black px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:scale-105"
        >
            <MapIcon size={16} />
            SCAN TERRAIN
        </button>
      </div>
    </div>
  );
};