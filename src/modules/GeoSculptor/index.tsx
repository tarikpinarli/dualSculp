import React, { useState, useEffect } from 'react';
import { Mountain, RotateCcw, Building2, Globe, Loader2 } from 'lucide-react';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

import { ModuleLayout } from '../../components/layout/ModuleLayout';
import { CyberSlider } from '../../components/ui/CyberSlider';
import { PaymentModal } from '../../components/PaymentModal';
import { usePayment } from '../../hooks/usePayment';
import { GeoView } from './GeoView';
import { MapSelector } from './MapSelector';
import { fetchTerrainGeometry, fetchBuildingsGeometry } from '../../utils/geoEngine';

export default function GeoSculptorModule() {
  const { showModal, clientSecret, startCheckout, closeModal } = usePayment('geo-sculptor-basic');

  // --- STATE ---
  const [mode, setMode] = useState<'SELECT' | 'VIEW'>('SELECT');
  
  // UPDATED: State now holds an object with separated parts, not just one geometry
  const [modelData, setModelData] = useState<{ buildings: THREE.BufferGeometry | null, base: THREE.BufferGeometry } | null>(null);
  
  // Status & Processing
  const [status, setStatus] = useState<string>(""); 
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Coords includes RADIUS (calculated from map zoom)
  const [coords, setCoords] = useState<{lat: number, lon: number, zoom: number, radius: number} | null>(null);
  
  // Parameters
  const [isCityMode, setIsCityMode] = useState(true); 
  const [exaggeration, setExaggeration] = useState(1.0); 

  // --- LOGIC ---

  // 1. Capture Event from MapSelector
  const handleMapConfirm = async (selectedCoords: { lat: number, lon: number, zoom: number, radius: number }) => {
      setCoords(selectedCoords);
      setMode('VIEW');
      generateModel(selectedCoords, isCityMode, exaggeration);
  };

  // 2. Generation Logic
  const generateModel = async (
      c: {lat:number, lon:number, radius: number}, 
      cityMode: boolean, 
      exagg: number
  ) => {
      setIsProcessing(true);
      setModelData(null); // Clear previous model
      setStatus("Initializing...");

      try {
          let result;
          if (cityMode) {
             // CITY MODE: Returns { buildings, base }
             result = await fetchBuildingsGeometry(c.lat, c.lon, c.radius, setStatus);
          } else {
             // TERRAIN MODE: Returns { buildings: terrainMesh, base: baseMesh }
             setStatus("Fetching Terrain Map...");
             result = await fetchTerrainGeometry(c.lat, c.lon, 12, exagg);
          }
          setModelData(result);
      } catch(e: any) {
          console.error(e);
          alert(`Error: ${e.message}`);
          setMode('SELECT'); // Return to map if it fails
      } finally {
          setIsProcessing(false);
          setStatus("");
      }
  };

  // 3. Re-generate on Slider Change
  useEffect(() => {
     if (mode === 'VIEW' && coords) {
         const timer = setTimeout(() => generateModel(coords, isCityMode, exaggeration), 500);
         return () => clearTimeout(timer);
     }
  }, [exaggeration, isCityMode]); 

  // 4. Export Logic (UPDATED)
  // We need to merge the base and the buildings into one file for the user
  const handleDownload = () => {
    if (!modelData) return;
    
    // Create a temporary group to hold both parts
    const group = new THREE.Group();
    
    // Add Base
    if (modelData.base) {
        group.add(new THREE.Mesh(modelData.base));
    }
    
    // Add Buildings (if they exist)
    if (modelData.buildings) {
        group.add(new THREE.Mesh(modelData.buildings));
    }

    const exporter = new STLExporter();
    const result = exporter.parse(group); // Export the whole group
    const blob = new Blob([result], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `geo_export.stl`; link.click();
    closeModal();
  };

  return (
    <>
      <ModuleLayout
        title="Terra-Former"
        subtitle="Topographic Generator"
        color="cyan"
        canExport={!!modelData && mode === 'VIEW'}
        onExport={startCheckout}
        sidebar={
          <div className="space-y-6">
            
            {/* BACK BUTTON */}
            {mode === 'VIEW' && (
                <button 
                    onClick={() => setMode('SELECT')}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-sm text-xs font-bold uppercase tracking-wider transition-all mb-4"
                >
                    <RotateCcw size={14} /> Select New Area
                </button>
            )}

            <div className="h-px bg-zinc-800 my-4"></div>

            {/* MODE TOGGLE */}
            <div className={`space-y-2 ${mode === 'SELECT' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Globe size={10} className="text-cyan-500"/> Render Mode
                </label>
                <div className="flex gap-2">
                    <button onClick={() => setIsCityMode(false)} className={`flex-1 py-3 text-[9px] font-bold uppercase border rounded-sm ${!isCityMode ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                        <Mountain size={16} className="mx-auto mb-1" /> Terrain
                    </button>
                    <button onClick={() => setIsCityMode(true)} className={`flex-1 py-3 text-[9px] font-bold uppercase border rounded-sm ${isCityMode ? 'bg-cyan-950/40 border-cyan-500 text-cyan-100' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                        <Building2 size={16} className="mx-auto mb-1" /> City Block
                    </button>
                </div>
            </div>

            {/* SLIDERS */}
            <div className={`mt-6 ${mode === 'SELECT' ? 'opacity-50 pointer-events-none' : ''}`}>
                <CyberSlider 
                  label="Vertical Scale" 
                  icon={isCityMode ? Building2 : Mountain} 
                  value={exaggeration} 
                  onChange={setExaggeration} 
                  min={0.5} max={3} step={0.1} unit="x" color="cyan"
                  tooltip="Adjusts vertical height."
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
            <MapSelector onConfirm={handleMapConfirm} />
        ) : (
            <GeoView 
                modelData={modelData}
                color="#22d3ee"
                isProcessing={isProcessing}
            />
        )}
      </ModuleLayout>

      {showModal && (
        <PaymentModal clientSecret={clientSecret} onClose={closeModal} onSuccess={handleDownload} color="cyan" price="$2.50" />
      )}
    </>
  );
}