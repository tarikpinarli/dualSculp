import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Download, Settings, Box, Play, RefreshCw, Ruler, Activity, Grid as GridIcon, Zap } from 'lucide-react';
import { Viewer3D } from './components/Viewer3D';
import { createMask, getAlignedImageData, generateVoxelGeometry, exportToSTL } from './utils/voxelEngine';
import * as THREE from 'three';

export default function App() {
  const [imgA, setImgA] = useState<string | null>(null);
  const [imgB, setImgB] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Parametreler
  const [artisticMode, setArtisticMode] = useState(false);
  const [smoothingIterations, setSmoothingIterations] = useState(3);
  const [threshold, setThreshold] = useState(128);
  const [physicalHeight, setPhysicalHeight] = useState(10); 
  const [gridSize, setGridSize] = useState(200);
  
  // YENİ: Varsayılan 100cm (30-160 aralığında ideal orta nokta)
  const [lightDistance, setLightDistance] = useState(100); 

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setImg: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setImg(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processGeometry = useCallback(async () => {
    if (!imgA && !imgB) return;
    setIsProcessing(true);
    
    await new Promise(r => setTimeout(r, 100));

    try {
      const [dataA, dataB] = await getAlignedImageData(imgA, imgB, gridSize);

      const maskA = dataA ? createMask(dataA, gridSize, threshold) : null;
      const maskB = dataB ? createMask(dataB, gridSize, threshold) : null;

      const geom = generateVoxelGeometry(maskA, maskB, artisticMode, smoothingIterations, physicalHeight, gridSize, lightDistance);
      
      setGeometry(geom);
    } catch (e) {
      console.error("Geometry processing error:", e);
    } finally {
      setIsProcessing(false);
    }
  }, [imgA, imgB, artisticMode, smoothingIterations, threshold, physicalHeight, gridSize, lightDistance]); 

  useEffect(() => {
    const timer = setTimeout(() => {
        if(imgA || imgB) processGeometry();
    }, 800);
    return () => clearTimeout(timer);
  }, [imgA, imgB, artisticMode, smoothingIterations, threshold, physicalHeight, gridSize, lightDistance, processGeometry]);

  const handleExport = () => {
    if (!geometry) return;
    const blob = exportToSTL(geometry);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shadow-sculpture-${physicalHeight}cm-dist${lightDistance}cm.stl`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Box className="w-8 h-8 text-indigo-500" />
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              ShadowSculpt
            </h1>
            <p className="text-xs text-slate-500">Perspective-Corrected Shadow Art</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={handleExport}
             disabled={!geometry}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
           >
             <Download size={16} /> Export STL
           </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-96 flex-shrink-0 bg-slate-900 border-r border-slate-800 p-6 overflow-y-auto custom-scrollbar">
          
          <div className="mb-6 pb-4 border-b border-slate-800">
             <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
               <Upload size={16} className="text-indigo-400"/> Source Images
             </h2>
             <p className="text-xs text-slate-500 mt-1">Upload silhouettes for front and side views.</p>
          </div>

          <div className="space-y-8">
            {/* INPUT A */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Front Silhouette (Z-Axis)
              </label>
               <div className="relative group">
                 <input 
                   type="file" 
                   accept="image/*" 
                   onChange={(e) => handleFileUpload(e, setImgA)}
                   className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700 cursor-pointer"
                 />
               </div>
              <div className="w-full h-32 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative">
                {imgA ? (
                  <img src={imgA} alt="Front" className="h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-600">No Image Selected</span>
                )}
                {imgA && <button onClick={() => setImgA(null)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white/70 hover:text-white">&times;</button>}
              </div>
            </div>

            {/* INPUT B */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Side Silhouette (X-Axis)
              </label>
               <input 
                 type="file" 
                 accept="image/*" 
                 onChange={(e) => handleFileUpload(e, setImgB)}
                 className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700 cursor-pointer"
               />
               <div className="w-full h-32 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative">
                {imgB ? (
                  <img src={imgB} alt="Side" className="h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-600">No Image Selected</span>
                )}
                {imgB && <button onClick={() => setImgB(null)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white/70 hover:text-white">&times;</button>}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-5">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                    <Settings size={14} /> Algorithm Settings
                  </h3>
               </div>
               
               {/* LIGHT DISTANCE SLIDER (YENİ ARALIK: 30-160) */}
               <div className="space-y-1 bg-indigo-900/20 p-3 rounded-md border border-indigo-500/30">
                 <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span className="flex items-center gap-1 font-semibold text-indigo-300"><Zap size={12}/> Light Distance</span>
                    <span className="text-indigo-400 font-bold font-mono">{lightDistance} cm</span>
                 </div>
                 <input 
                    type="range" min="30" max="160" step="5" value={lightDistance} 
                    onChange={(e) => setLightDistance(Number(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                 />
                 <p className="text-[10px] text-indigo-400/60 mt-1">
                    Distance from sculpture to flashlight.
                 </p>
               </div>

               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-slate-500">
                    <span>Threshold</span>
                    <span>{threshold}</span>
                 </div>
                 <input 
                    type="range" min="0" max="255" value={threshold} 
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                 />
               </div>

               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><GridIcon size={12}/> Resolution</span>
                    <span className={`font-mono font-bold ${gridSize > 300 ? 'text-red-400' : 'text-indigo-400'}`}>
                      {gridSize}px
                    </span>
                 </div>
                 <input 
                    type="range" 
                    min="100" 
                    max="600" 
                    step="10"
                    value={gridSize} 
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                 />
               </div>

               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Activity size={12}/> Smoothness</span>
                    <span className="text-indigo-400 font-mono">{smoothingIterations}x</span>
                 </div>
                 <input 
                    type="range" 
                    min="0" 
                    max="8" 
                    step="1"
                    value={smoothingIterations} 
                    onChange={(e) => setSmoothingIterations(Number(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                 />
               </div>

               <div className="space-y-1 bg-slate-800/50 p-3 rounded-md border border-slate-800">
                 <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1"><Ruler size={12}/> Target Height</span>
                    <span className="text-indigo-400 font-bold font-mono">{physicalHeight} cm</span>
                 </div>
                 <input 
                    type="range" min="5" max="40" step="1" value={physicalHeight} 
                    onChange={(e) => setPhysicalHeight(Number(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                 />
               </div>

               <div className="flex items-center gap-3">
                  <input 
                  type="checkbox" id="artistic" checked={artisticMode} 
                  onChange={(e) => setArtisticMode(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" 
                  />
                  <label htmlFor="artistic" className="text-sm text-slate-300 select-none cursor-pointer">
                  Artistic "Debris" Mode
                  </label>
               </div>
            </div>
            
             <button 
               onClick={processGeometry} 
               disabled={isProcessing}
               className="w-full py-3 mt-4 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"
             >
               {isProcessing ? <RefreshCw className="animate-spin" /> : <Play size={16} fill="currentColor" />}
               {isProcessing ? "Processing..." : "Regenerate Mesh"}
             </button>

          </div>
        </aside>

        <section className="flex-1 p-6 flex flex-col gap-4 bg-slate-950 relative">
           <Viewer3D geometry={geometry} showGrid={true} isSmooth={smoothingIterations > 0} lightDistanceCM={lightDistance} />
        </section>
      </main>
    </div>
  );
}