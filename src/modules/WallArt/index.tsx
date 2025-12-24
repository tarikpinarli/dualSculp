import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Box, Activity, Scaling, Layers, Maximize2, Grid as GridIcon } from 'lucide-react';
import { WallArtView } from './WallArtView'; 
import { generateReliefGeometry, ReliefConfig, exportToSTL } from '../../utils/reliefEngine';
import * as THREE from 'three';

// --- NEW SYSTEM IMPORTS ---
import { ModuleLayout } from '../../components/layout/ModuleLayout';
import { CyberSlider } from '../../components/ui/CyberSlider';
import { PaymentModal } from '../../components/PaymentModal';
import { usePayment } from '../../hooks/usePayment';

// Constants
const MATERIAL_COLORS = [
  { name: 'Plaster', hex: '#e4e4e7' }, { name: 'Gold', hex: '#fbbf24' },    
  { name: 'Clay', hex: '#d97706' }, { name: 'Marble', hex: '#14b8a6' }, { name: 'Obsidian', hex: '#3f3f46' } 
];
const WALL_COLORS = [
  { name: 'Gallery White', hex: '#ffffff' }, { name: 'Museum Grey', hex: '#71717a' },
  { name: 'Charcoal', hex: '#27272a' }, { name: 'Midnight', hex: '#0f172a' }, { name: 'Warm Beige', hex: '#f5f5dc' }
];

export default function WallArtModule() {
  // 1. Logic Hook (Replaces 50 lines of fetch/stripe code)
  const { showModal, clientSecret, startCheckout, closeModal } = usePayment('wall-art-basic');

  // 2. Core State
  const [image, setImage] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 3. Parameters
  const [heightCM, setHeightCM] = useState(25);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [resolution, setResolution] = useState(300); 
  const [threshold, setThreshold] = useState(100);
  const [depth, setDepth] = useState(2.0); 
  const [isFlat, setIsFlat] = useState(true); 
  const [invert, setInvert] = useState(false);
  const [objectColor, setObjectColor] = useState(MATERIAL_COLORS[2].hex);
  const [wallColor, setWallColor] = useState(WALL_COLORS[2].hex);

  // --- Logic (Unchanged) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        const img = new Image();
        img.onload = () => { setAspectRatio(img.naturalWidth / img.naturalHeight); setImage(result); };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const processGeometry = useCallback(async () => {
    if (!image) return;
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 50));
    try {
      const config: ReliefConfig = { width: heightCM * aspectRatio, height: heightCM, depth, threshold, detail: resolution, invert, isFlat };
      const geom = await generateReliefGeometry(image, config);
      setGeometry(geom);
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  }, [image, heightCM, aspectRatio, depth, threshold, invert, isFlat, resolution]);

  useEffect(() => {
    if (!image) return;
    const timer = setTimeout(processGeometry, 600); 
    return () => clearTimeout(timer);
  }, [processGeometry, image]);

  const handleDownload = () => {
    if (!geometry) return;
    const blob = exportToSTL(geometry);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `pixel-relief.stl`; link.click();
    URL.revokeObjectURL(url);
    closeModal();
  };

  // --- THE VIEW ---
  return (
    <>
      <ModuleLayout
        title="Pixel Relief Engine"
        subtitle="Solid Core Mesher v2.1"
        color="purple"
        canExport={!!geometry}
        onExport={startCheckout} // Hook handles the API call!
        sidebar={
          <div className="space-y-6">
            {/* Upload */}
            <label className={`group relative h-48 border transition-all duration-500 cursor-pointer flex flex-col items-center justify-center overflow-hidden ${image ? 'border-purple-400 bg-zinc-900/40' : 'border-purple-500/30 bg-purple-950/10 hover:bg-purple-900/20'}`}>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                {image ? <img src={image} className="h-full w-full object-contain p-4 opacity-80" /> : <Upload className="text-purple-500/50" />}
            </label>

            {/* Mode Switch */}
            <div className="flex gap-2">
                <button onClick={() => setIsFlat(true)} className={`flex-1 py-2 text-[9px] font-bold uppercase border rounded-sm ${isFlat ? 'bg-purple-900/30 border-purple-500 text-purple-200' : 'bg-zinc-900/50 border-white/10 text-zinc-500'}`}><Box size={12} className="inline mr-2"/>Solid</button>
                <button onClick={() => setIsFlat(false)} className={`flex-1 py-2 text-[9px] font-bold uppercase border rounded-sm ${!isFlat ? 'bg-purple-900/30 border-purple-500 text-purple-200' : 'bg-zinc-900/50 border-white/10 text-zinc-500'}`}><Activity size={12} className="inline mr-2"/>Textured</button>
            </div>

            {/* Sliders with Tooltips */}
            <CyberSlider 
              label="Resolution" 
              icon={GridIcon} 
              value={resolution} 
              onChange={setResolution} 
              min={100} max={450} step={10} unit="px" 
              color="purple" 
              tooltip="Grid density. Higher values (300+) create sharper details but take longer to process."
            />

            <CyberSlider 
              label="Threshold" 
              icon={Layers} 
              value={threshold} 
              onChange={setThreshold} 
              min={0} max={255} 
              color="purple"
              tooltip="Cutoff point. Pixels darker than this value are removed. Increase to clean up background noise."
            />

            <CyberSlider 
              label="Depth" 
              icon={Scaling} 
              value={depth} 
              onChange={setDepth} 
              min={0.1} max={10} step={0.1} unit="cm" 
              color="purple"
              tooltip="Extrusion thickness. How far the art 'pops out' from the base plane."
            />

            <CyberSlider 
              label="Height" 
              icon={Maximize2} 
              value={heightCM} 
              onChange={setHeightCM} 
              min={5} max={50} unit="cm" 
              color="purple"
              tooltip="Target physical height for 3D printing. Width scales automatically to maintain aspect ratio."
            />

            {/* Invert Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group border-t border-white/5 pt-4">
                <div className={`w-3 h-3 border border-zinc-600 ${invert ? 'bg-purple-500 border-purple-500' : 'bg-transparent'}`}></div>
                <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} className="hidden" />
                <span className="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-white">Invert Logic</span>
            </label>

            {/* Colors */}
            <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex gap-2 justify-between">
                    {MATERIAL_COLORS.map(c => <button key={c.name} onClick={() => setObjectColor(c.hex)} className="w-5 h-5 rounded-full border border-white/10" style={{background: c.hex}} />)}
                </div>
            </div>
          </div>
        }
      >
        <WallArtView geometry={geometry} isSmooth={true} isProcessing={isProcessing} color={objectColor} wallColor={wallColor} lightDistanceCM={100} />
      </ModuleLayout>

      {/* Modal - Controlled by Hook */}
      {showModal && (
        <PaymentModal 
          clientSecret={clientSecret} 
          onClose={closeModal} 
          onSuccess={handleDownload} 
          color="purple"
          price="$1.99"
        />
      )}
    </>
  );
}