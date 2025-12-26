import React, { useState, useEffect, useRef } from 'react';
import { 
    RotateCcw, Building2, Globe, Loader2, Search, MapPin, ScanLine, 
    Waypoints, Square, AlertTriangle, Mountain
} from 'lucide-react';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

import { ModuleLayout } from '../../components/layout/ModuleLayout';
import { PaymentModal } from '../../components/PaymentModal';
import { usePayment } from '../../hooks/usePayment';
import { GeoView } from './GeoView';
import { MapSelector, MapSelectorRef } from './MapSelector';
import { 
    fetchTerrainGeometry, 
    fetchBuildingsGeometry, 
    fetchRoadsGeometry
} from '../../utils/geoEngine';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// --- SIDEBAR SEARCH COMPONENT ---
const SidebarSearch = ({ onSelect }: { onSelect: (lat: number, lon: number) => void }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    
    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 3) return;
            setIsLoading(true);
            try {
                const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality&limit=5`;
                const res = await fetch(endpoint);
                const data = await res.json();
                setResults(data.features || []);
                setIsOpen(true);
            } catch (e) { 
                console.error(e); 
            } finally { 
                setIsLoading(false); 
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="relative w-full z-50">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isLoading ? <Loader2 size={12} className="text-cyan-400 animate-spin" /> : <Search size={12} className="text-zinc-500" />}
                </div>
                <input 
                    type="text" 
                    className="block w-full pl-8 pr-3 py-2 text-[10px] font-mono bg-black/40 border border-zinc-700 text-zinc-200 rounded-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-zinc-600 uppercase tracking-wide transition-all"
                    placeholder="Search Location..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-sm shadow-xl max-h-48 overflow-y-auto z-50">
                    {results.map((place) => (
                        <button 
                            key={place.id} 
                            onClick={() => { onSelect(place.center[1], place.center[0]); setIsOpen(false); }} 
                            className="w-full text-left px-3 py-2 text-[10px] text-zinc-400 hover:bg-cyan-900/30 hover:text-cyan-200 border-b border-white/5 last:border-0 flex items-center gap-2 transition-colors"
                        >
                            <MapPin size={10} /> <span className="truncate">{place.place_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN MODULE ---
export default function GeoSculptorModule() {
  const { showModal, clientSecret, startCheckout, closeModal } = usePayment('geo-sculptor-basic');
  const mapRef = useRef<MapSelectorRef>(null);

  // --- STATE ---
  const [mode, setMode] = useState<'SELECT' | 'VIEW'>('SELECT');
  
  // 3D Geometry State
  const [modelData, setModelData] = useState<{ 
      buildings: THREE.BufferGeometry | null, 
      base: THREE.BufferGeometry, 
      roads?: THREE.BufferGeometry | null
  } | null>(null);
  
  // UI State
  const [status, setStatus] = useState<string>(""); 
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lon: number, zoom: number, radius: number} | null>(null);
  
  // Generation Settings
  const [showBuildings, setShowBuildings] = useState(true); 
  const [showRoads, setShowRoads] = useState(false); 
  const [projectOnTerrain, setProjectOnTerrain] = useState(true); 
  const [isBaseEnabled, setIsBaseEnabled] = useState(true); 

  // --- ACTIONS ---

  const handleReset = () => {
      setMode('SELECT');
      setModelData(null);
      setCoords(null);
      setError(null);
  };

  const triggerCapture = () => {
      if (mapRef.current) {
          const selection = mapRef.current.getSelection();
          if (selection) {
              setCoords(selection);
              setMode('VIEW');
              // Trigger generation immediately upon capture
              generateModel(selection);
          }
      }
  };

  /**
   * Main Generator Logic
   * 1. Fetches Terrain (Crucial: provides HeightSampler)
   * 2. Uses Sampler to fetch Buildings (sets them on ground)
   * 3. Uses Sampler to fetch Roads (drapes them on ground)
   */
  const generateModel = async (
      c: {lat:number, lon:number, radius: number}
  ) => {
      if (isProcessing) return; // Prevent double clicks
      setIsProcessing(true);
      setError(null);
      
      // Clear previous model to show loading state
      setModelData(null); 
      
      try {
          // STEP 1: Terrain & Sampler
          setStatus("Generating Topography...");
          const terrainData = await fetchTerrainGeometry(c.lat, c.lon, c.radius, 13);
          
          let buildings = null;
          let roads = null;

          // STEP 2: Buildings
          if (showBuildings) {
              setStatus("Constructing Buildings...");
              buildings = await fetchBuildingsGeometry(
                  c.lat, 
                  c.lon, 
                  c.radius, 
                  projectOnTerrain, 
                  terrainData.sampler, // Pass sampler to fix "buried" buildings
                  setStatus
              );
          }

          // STEP 3: Roads
          if (showRoads) {
              setStatus("Tracing Highway Network...");
              roads = await fetchRoadsGeometry(
                  c.lat, 
                  c.lon, 
                  c.radius,
                  terrainData.sampler // Pass sampler to fix "roads under terrain"
              );
          }

          setModelData({
              base: terrainData.geometry,
              buildings: buildings,
              roads: roads
          });

      } catch(e: any) {
          console.error(e);
          setError("Failed to generate model. The area might be too complex or the server is busy.");
          setModelData(null);
      } finally {
          setIsProcessing(false);
          setStatus("");
      }
  };

  // Auto-regenerate when toggles change (only if we have active coordinates)
  useEffect(() => {
     if (mode === 'VIEW' && coords && !error) {
         const timer = setTimeout(() => {
             generateModel(coords);
         }, 800); // 800ms debounce
         return () => clearTimeout(timer);
     }
  }, [showBuildings, showRoads, projectOnTerrain]); 

  // --- EXPORT TO STL ---
  const handleDownload = () => {
    if (!modelData) return;
    
    const group = new THREE.Group();
    
    // Combine visible meshes for export
    if (isBaseEnabled && modelData.base) {
        const mesh = new THREE.Mesh(modelData.base);
        group.add(mesh);
    }
    if (modelData.buildings) {
        const mesh = new THREE.Mesh(modelData.buildings);
        group.add(mesh);
    }
    if (modelData.roads) {
        const mesh = new THREE.Mesh(modelData.roads);
        group.add(mesh);
    }
    
    const exporter = new STLExporter();
    const result = exporter.parse(group);
    const blob = new Blob([result], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `geo_sculptor_${Date.now()}.stl`; 
    link.click();
    
    closeModal();
  };

  return (
    <>
      <ModuleLayout
        title="Terra-Former"
        subtitle="Topographic Generator"
        color="cyan"
        canExport={!!modelData && mode === 'VIEW' && !isProcessing && !error}
        onExport={startCheckout}
        sidebar={
          <div className="space-y-6">
            
            {/* RESET BUTTON */}
            {mode === 'VIEW' && (
                <button 
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-sm text-xs font-bold uppercase tracking-wider transition-all mb-4"
                >
                    <RotateCcw size={14} /> Select New Area
                </button>
            )}

            <div className="h-px bg-zinc-800 my-4"></div>

            {/* ERROR MESSAGE */}
            {error && (
                <div className="p-3 bg-red-950/30 border border-red-500/50 rounded-sm animate-pulse">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-red-200 uppercase">Generation Error</span>
                            <span className="text-[9px] text-red-300/70">{error}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTROLS (View Mode Only) */}
            {mode === 'VIEW' && !error && (
                <div className="space-y-4">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <Globe size={10} className="text-cyan-500"/> Layer Controls
                    </label>

                    {/* Show Base/Terrain */}
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div className={`w-4 h-4 border flex items-center justify-center rounded-sm transition-colors ${isBaseEnabled ? 'bg-cyan-600 border-cyan-500' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}>
                             {isBaseEnabled && <Square size={10} className="text-white fill-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={isBaseEnabled} onChange={(e) => setIsBaseEnabled(e.target.checked)} />
                        <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors">Terrain Base</span>
                    </label>

                    {/* Show Buildings */}
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div className={`w-4 h-4 border flex items-center justify-center rounded-sm transition-colors ${showBuildings ? 'bg-cyan-600 border-cyan-500' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}>
                             {showBuildings && <Building2 size={10} className="text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={showBuildings} onChange={(e) => setShowBuildings(e.target.checked)} />
                        <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors">Generate Buildings</span>
                    </label>

                    {/* Sub-Option: Project on Terrain (Only if buildings active) */}
                    <div className={`ml-7 transition-all duration-300 ease-in-out ${showBuildings ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                         <label className="flex items-center gap-2 cursor-pointer group select-none">
                            <div className={`w-3 h-3 border flex items-center justify-center rounded-sm ${projectOnTerrain ? 'bg-zinc-700 border-zinc-500' : 'bg-transparent border-zinc-800'}`}>
                                {projectOnTerrain && <Mountain size={8} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={projectOnTerrain} onChange={(e) => setProjectOnTerrain(e.target.checked)} />
                            <span className="text-[9px] text-zinc-500 group-hover:text-zinc-300">Drape on Terrain</span>
                         </label>
                    </div>

                    {/* Show Roads */}
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div className={`w-4 h-4 border flex items-center justify-center rounded-sm transition-colors ${showRoads ? 'bg-cyan-600 border-cyan-500' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}>
                             {showRoads && <Waypoints size={10} className="text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={showRoads} onChange={(e) => setShowRoads(e.target.checked)} />
                        <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors">Trace Roads</span>
                    </label>
                </div>
            )}

            {/* SEARCH & CAPTURE (Select Mode) */}
            {mode === 'SELECT' && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <Search size={10} className="text-cyan-500"/> Search Target
                    </label>
                    
                    <SidebarSearch onSelect={(lat, lon) => mapRef.current?.flyTo(lat, lon)} />
                    
                    <button 
                        onClick={triggerCapture}
                        className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-sm text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-all active:scale-95 hover:scale-[1.02]"
                    >
                        <ScanLine size={16} /> Capture Area
                    </button>
                    
                    <p className="text-[9px] text-zinc-500 text-center px-4 leading-relaxed">
                        Data is projected using Web Mercator (EPSG:3857) to ensure perfect alignment between buildings and terrain features.
                    </p>
                </div>
            )}

            {/* STATUS DISPLAY */}
            {isProcessing && (
                <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-sm mt-8 flex flex-col items-center justify-center animate-pulse">
                    <Loader2 size={24} className="text-cyan-400 animate-spin mb-2" />
                    <span className="text-[10px] font-mono uppercase text-cyan-200 tracking-widest">{status}</span>
                </div>
            )}
          </div>
        }
      >
        {mode === 'SELECT' ? (
            <MapSelector ref={mapRef} />
        ) : (
            <GeoView 
                modelData={modelData}
                color="#e4e4e7"
                isProcessing={isProcessing}
                isBaseEnabled={isBaseEnabled} 
            />
        )}
      </ModuleLayout>

      {/* PAYMENT MODAL */}
      {showModal && (
        <PaymentModal 
            clientSecret={clientSecret} 
            onClose={closeModal} 
            onSuccess={handleDownload} 
            color="cyan" 
            price="$1.99" 
        />
      )}
    </>
  );
}