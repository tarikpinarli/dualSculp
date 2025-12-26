import React, { useState, useEffect, useRef } from 'react';
import { 
    Mountain, 
    RotateCcw, 
    Building2, 
    Globe, 
    Loader2, 
    Search, 
    MapPin, 
    ScanLine, 
    Waypoints, 
    Waves,
    Square 
} from 'lucide-react';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

import { ModuleLayout } from '../../components/layout/ModuleLayout';
import { CyberSlider } from '../../components/ui/CyberSlider';
import { PaymentModal } from '../../components/PaymentModal';
import { usePayment } from '../../hooks/usePayment';
import { GeoView } from './GeoView';
import { MapSelector, MapSelectorRef } from './MapSelector';

// --- NEW IMPORTS (Split Structure) ---
import { fetchBuildingsGeometry } from '../../utils/geo/geoEngine';
import { fetchTerrainGeometry } from '../../utils/geo/fetchTerrain';
import { fetchRoadsGeometry } from '../../utils/geo/fetchRoads';
import { fetchWaterGeometry } from '../../utils/geo/fetchWater';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// --- SIDEBAR SEARCH COMPONENT (FIXED) ---
const SidebarSearch = ({ onSelect }: { onSelect: (lat: number, lon: number) => void }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    
    // Refs to handle click-outside and selection logic
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isSelectionRef = useRef(false);

    // 1. Handle Click Outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 2. Search Effect
    useEffect(() => {
        // If we just selected an item from the list, DO NOT run a new search
        if (isSelectionRef.current) {
            isSelectionRef.current = false;
            return;
        }

        const timer = setTimeout(async () => {
            if (query.length < 3) { 
                setResults([]); 
                setIsOpen(false);
                return; 
            }
            
            setIsLoading(true);
            try {
                const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood,poi&limit=5`;
                const res = await fetch(endpoint);
                const data = await res.json();
                
                if (data.features && data.features.length > 0) {
                    setResults(data.features);
                    setIsOpen(true);
                } else {
                    setResults([]);
                    setIsOpen(false);
                }
            } catch (e) { 
                console.error(e); 
            } finally { 
                setIsLoading(false); 
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (feature: any) => {
        const [lon, lat] = feature.center;
        
        // Mark this update as a selection so the useEffect doesn't trigger a re-search
        isSelectionRef.current = true;
        
        setQuery(feature.text);
        setResults([]); // Clear results immediately
        setIsOpen(false); // Close dropdown immediately
        onSelect(lat, lon);
    };

    return (
        <div ref={wrapperRef} className="relative w-full z-50">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isLoading ? <Loader2 size={12} className="text-cyan-400 animate-spin" /> : <Search size={12} className="text-zinc-500" />}
                </div>
                <input 
                    type="text" 
                    className="block w-full pl-8 pr-3 py-2 text-[10px] font-mono bg-black/40 border border-zinc-700 text-zinc-200 rounded-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-zinc-600 uppercase tracking-wide transition-all"
                    placeholder="Search Location..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if(e.target.value.length >= 3) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                />
            </div>
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-sm shadow-xl max-h-48 overflow-y-auto z-50">
                    {results.map((place) => (
                        <button key={place.id} onClick={() => handleSelect(place)} className="w-full text-left px-3 py-2 text-[10px] text-zinc-400 hover:bg-cyan-900/30 hover:text-cyan-200 border-b border-white/5 last:border-0 flex items-center gap-2 transition-colors">
                            <MapPin size={10} /> <span className="truncate">{place.place_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function GeoSculptorModule() {
  const { showModal, clientSecret, startCheckout, closeModal } = usePayment('geo-sculptor-basic');
  const mapRef = useRef<MapSelectorRef>(null);

  // --- STATE ---
  const [mode, setMode] = useState<'SELECT' | 'VIEW'>('SELECT');
  
  // Model Data
  const [modelData, setModelData] = useState<{ 
      buildings: THREE.BufferGeometry | null, 
      base: THREE.BufferGeometry, 
      roads?: THREE.BufferGeometry | null,
      water?: THREE.BufferGeometry | null 
  } | null>(null);
  
  const [status, setStatus] = useState<string>(""); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lon: number, zoom: number, radius: number} | null>(null);
  
  // Params
  const [isCityMode, setIsCityMode] = useState(true); 
  const [isRoadsEnabled, setIsRoadsEnabled] = useState(false); 
  const [isWaterEnabled, setIsWaterEnabled] = useState(false); 
  const [isBaseEnabled, setIsBaseEnabled] = useState(true); 
  const [exaggeration, setExaggeration] = useState(1.0); 

  // --- ACTIONS ---

  // 1. RESET Logic
  const handleReset = () => {
      setMode('SELECT');
      setModelData(null);
      setCoords(null);
      // Reset toggles to default
      setIsRoadsEnabled(false);
      setIsWaterEnabled(false);
      setIsBaseEnabled(true); 
  };

  const triggerCapture = () => {
      if (mapRef.current) {
          const selection = mapRef.current.getSelection();
          if (selection) {
              handleMapConfirm(selection);
          }
      }
  };

  const handleMapConfirm = async (selectedCoords: { lat: number, lon: number, zoom: number, radius: number }) => {
      setCoords(selectedCoords);
      setModelData(null); 
      setMode('VIEW');
      generateModel(selectedCoords, isCityMode, isRoadsEnabled, isWaterEnabled, exaggeration, true);
  };

  // Main Generator Logic
  const generateModel = async (
      c: {lat:number, lon:number, radius: number}, 
      cityMode: boolean,
      roadsEnabled: boolean,
      waterEnabled: boolean,
      exagg: number,
      forceFresh: boolean = false
  ) => {
      setIsProcessing(true);
      if (forceFresh) setModelData(null); 
      setStatus("Processing Data...");

      try {
          let currentBuildings = (forceFresh) ? null : (modelData?.buildings || null);
          let currentBase = (forceFresh) ? null : (modelData?.base || null);
          let currentRoads = (forceFresh) ? null : (modelData?.roads || null);
          let currentWater = (forceFresh) ? null : (modelData?.water || null);

          const needsFreshGeo = !currentBase || (cityMode && !currentBuildings && !forceFresh) || (!cityMode && !currentBase && !forceFresh) || forceFresh;

          if (needsFreshGeo) {
              if (cityMode) {
                 const res = await fetchBuildingsGeometry(c.lat, c.lon, c.radius, setStatus);
                 currentBuildings = res.buildings;
                 currentBase = res.base;
              } else {
                 setStatus("Fetching Digital Elevation Model...");
                 const res = await fetchTerrainGeometry(c.lat, c.lon, 12, exagg);
                 currentBuildings = res.buildings; 
                 currentBase = res.base;
              }
          }

          if (roadsEnabled && cityMode) {
              if (!currentRoads || forceFresh) {
                 setStatus("Tracing Highway Network...");
                 const roadGeom = await fetchRoadsGeometry(c.lat, c.lon, c.radius);
                 currentRoads = roadGeom;
              }
          } else {
              currentRoads = null; 
          }

          if (waterEnabled && cityMode) {
              if (!currentWater || forceFresh) {
                 setStatus("Mapping Water Bodies...");
                 const waterGeom = await fetchWaterGeometry(c.lat, c.lon, c.radius);
                 currentWater = waterGeom;
              }
          } else {
              currentWater = null;
          }

          setModelData({
              buildings: currentBuildings,
              base: currentBase!,
              roads: currentRoads,
              water: currentWater
          });

      } catch(e: any) {
          console.error(e);
          alert(`Error: ${e.message}`);
          handleReset();
      } finally {
          setIsProcessing(false);
          setStatus("");
      }
  };

  // Re-generate on Param Change
  useEffect(() => {
     if (mode === 'VIEW' && coords) {
         const timer = setTimeout(() => generateModel(coords, isCityMode, isRoadsEnabled, isWaterEnabled, exaggeration, false), 500);
         return () => clearTimeout(timer);
     }
  }, [exaggeration, isCityMode, isRoadsEnabled, isWaterEnabled]); 

  // --- 2. EXPORT LOGIC ---
  const handleDownload = () => {
    if (!modelData) return;
    
    const group = new THREE.Group();
    
    if (isBaseEnabled && modelData.base) group.add(new THREE.Mesh(modelData.base));
    if (modelData.buildings) group.add(new THREE.Mesh(modelData.buildings));
    if (modelData.roads) group.add(new THREE.Mesh(modelData.roads));
    if (modelData.water) group.add(new THREE.Mesh(modelData.water));

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
        canExport={!!modelData && mode === 'VIEW' && !isProcessing}
        onExport={startCheckout}
        sidebar={
          <div className="space-y-6">
            
            {mode === 'VIEW' && (
                <button 
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-sm text-xs font-bold uppercase tracking-wider transition-all mb-4"
                >
                    <RotateCcw size={14} /> Select New Area
                </button>
            )}

            <div className="h-px bg-zinc-800 my-4"></div>

            {/* RENDER MODE */}
            <div className={`space-y-2 ${mode === 'SELECT' ? '' : 'opacity-50 pointer-events-none'}`}>
                <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Globe size={10} className="text-cyan-500"/> Render Mode
                </label>
                <div className="flex gap-2">
                    <button onClick={() => setIsCityMode(false)} className={`flex-1 py-3 text-[9px] font-bold uppercase border rounded-sm transition-all ${!isCityMode ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                        <Mountain size={16} className="mx-auto mb-1" /> Terrain
                    </button>
                    <button onClick={() => setIsCityMode(true)} className={`flex-1 py-3 text-[9px] font-bold uppercase border rounded-sm transition-all ${isCityMode ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                        <Building2 size={16} className="mx-auto mb-1" /> City Block
                    </button>
                </div>
            </div>

            {/* LAYERS (City Mode Only) */}
            {mode === 'VIEW' && isCityMode && (
                <div className="pt-4 border-t border-zinc-800 space-y-3">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Details</label>
                    
                    {/* BASE TOGGLE */}
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div className={`w-4 h-4 border flex items-center justify-center rounded-sm transition-colors ${isBaseEnabled ? 'bg-cyan-600 border-cyan-500' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}>
                             {isBaseEnabled && <Square size={10} className="text-white fill-white" />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isBaseEnabled} 
                            onChange={(e) => setIsBaseEnabled(e.target.checked)} 
                        />
                        <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors flex items-center gap-2">
                            <Square size={12} /> Base Plate
                        </span>
                    </label>

                    {/* Road Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div className={`w-4 h-4 border flex items-center justify-center rounded-sm transition-colors ${isRoadsEnabled ? 'bg-cyan-600 border-cyan-500' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}>
                             {isRoadsEnabled && <ScanLine size={10} className="text-white" />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isRoadsEnabled} 
                            onChange={(e) => setIsRoadsEnabled(e.target.checked)} 
                        />
                        <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors flex items-center gap-2">
                            <Waypoints size={12} /> Show Roads
                        </span>
                    </label>

                    {/* Water Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                        <div className={`w-4 h-4 border flex items-center justify-center rounded-sm transition-colors ${isWaterEnabled ? 'bg-cyan-600 border-cyan-500' : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'}`}>
                             {isWaterEnabled && <Waves size={10} className="text-white" />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isWaterEnabled} 
                            onChange={(e) => setIsWaterEnabled(e.target.checked)} 
                        />
                        <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors flex items-center gap-2">
                            <Waves size={12} /> Show Water
                        </span>
                    </label>
                </div>
            )}

            {/* SEARCH & CAPTURE */}
            {mode === 'SELECT' && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <Search size={10} className="text-cyan-500"/> Search Target
                    </label>
                    {/* UPDATED SEARCH COMPONENT */}
                    <SidebarSearch onSelect={(lat, lon) => mapRef.current?.flyTo(lat, lon)} />
                    
                    <button 
                        onClick={triggerCapture}
                        className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-sm text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-all active:scale-95 hover:scale-[1.02]"
                    >
                        <ScanLine size={16} /> Capture Area
                    </button>
                </div>
            )}

            {/* SLIDERS (View Mode) */}
            <div className={`mt-6 ${mode === 'SELECT' ? 'hidden' : 'block'}`}>
                <CyberSlider 
                  label="Vertical Scale" 
                  icon={isCityMode ? Building2 : Mountain} 
                  value={exaggeration} 
                  onChange={setExaggeration} 
                  min={0.5} max={3} step={0.1} unit="x" color="cyan"
                  tooltip="Exaggerate terrain height for better 3D printing results."
                />
            </div>

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