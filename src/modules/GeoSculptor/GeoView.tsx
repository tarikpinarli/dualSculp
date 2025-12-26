import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, Center } from '@react-three/drei';
import { 
  Video, UploadCloud, ChevronUp, ChevronDown, Layers, Orbit, ArrowUpFromLine, Globe
} from 'lucide-react';

// --- Types ---
interface GeoViewProps {
  modelData: { 
      buildings: THREE.BufferGeometry | null, 
      base: THREE.BufferGeometry,
      roads?: THREE.BufferGeometry | null
  } | null;
  color: string;
  isProcessing: boolean;
  isBaseEnabled: boolean;
}

// --- UI Components ---
const HudButton = ({ onClick, icon: Icon, text, subtext, active = false }: any) => (
  <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      className={`group relative flex items-center justify-between w-full px-3 py-2 border-l-2 transition-all duration-200 overflow-hidden ${
          active 
          ? 'bg-cyan-950/40 border-cyan-400 text-cyan-100' 
          : 'bg-black/40 border-zinc-700 text-zinc-400 hover:bg-zinc-900/60 hover:border-cyan-500/50 hover:text-cyan-200'
      }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={14} className="group-hover:text-cyan-400" />
      <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{text}</span>
          {subtext && <span className="text-[8px] font-mono text-zinc-500 group-hover:text-cyan-400/70">{subtext}</span>}
      </div>
    </div>
    <div className={`w-1 h-1 rounded-full ${active ? 'bg-cyan-400 box-shadow-cyan' : 'bg-zinc-800 group-hover:bg-cyan-500'}`}></div>
  </button>
);

// --- SCENE CONTENT ---
const SceneContent = ({ 
  modelData, 
  color, 
  autoRotate,
  isBaseEnabled 
}: { modelData: any, color: string, autoRotate: boolean, isBaseEnabled: boolean }) => {
  
  const VIBE_CYAN = "#ffffff";      
  const VIBE_DARK_BASE = "#27272a"; 
  const VIBE_ROAD = "#555555";      

  return (
    <>
      <OrbitControls 
        makeDefault 
        autoRotate={autoRotate}
        autoRotateSpeed={1.0}
        minDistance={10}
        maxDistance={50000}
        enableDamping={true}
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2} 
      />

      <ambientLight intensity={0.6} />
      <directionalLight position={[-50, 40, 50]} intensity={1.5} />
      <directionalLight position={[50, 20, -50]} intensity={1} color={VIBE_CYAN} />
      <Environment preset="city" />

      <Bounds fit clip observe margin={1.2}>
        <Center>
            <group>
                {/* BASE */}
                {isBaseEnabled && modelData?.base && (
                    <mesh geometry={modelData.base}>
                    <meshStandardMaterial 
                        color={VIBE_DARK_BASE} 
                        roughness={0.8} 
                        metalness={0.2} 
                        side={THREE.DoubleSide} 
                    />
                    </mesh>
                )}

                {/* ROADS */}
                {modelData?.roads && (
                    <mesh geometry={modelData.roads}>
                        <meshStandardMaterial 
                            color={VIBE_ROAD}
                            roughness={0.9} 
                            metalness={0.1}
                            side={THREE.DoubleSide} 
                        />
                    </mesh>
                )}

                {/* BUILDINGS & TERRAIN */}
                {modelData?.buildings && (
                    <mesh geometry={modelData.buildings}>
                    <meshStandardMaterial 
                        color={color || VIBE_CYAN} 
                        emissive={color || VIBE_CYAN}
                        emissiveIntensity={0.1} 
                        roughness={0.5} 
                        metalness={0.1} 
                        flatShading={false} 
                        side={THREE.DoubleSide} 
                    />
                    </mesh>
                )}
            </group>
        </Center>
      </Bounds>
    </>
  );
};

// --- MAIN COMPONENT ---
export const GeoView = ({ modelData, color, isProcessing, isBaseEnabled }: GeoViewProps) => {
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  return (
        <div 
        className="w-full h-full rounded-sm overflow-hidden shadow-2xl border border-white/10 relative group flex flex-col"
        style={{ backgroundColor: "#18181b" }} 
        >      
      {/* 1. Empty / Processing Overlay State */}
      {(!modelData || isProcessing) && (
        <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center z-10 pointer-events-none bg-black/80 backdrop-blur-md">
          {isProcessing ? (
             <>
               <div className="w-16 h-16 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_30px_rgba(34,211,238,0.2)]"></div>
               <div className="flex flex-col items-center mt-4">
                   <p className="text-xs font-mono tracking-[0.3em] uppercase text-cyan-400 animate-pulse">Processing Geometry</p>
               </div>
             </>
          ) : (
             <>
               <div className="relative">
                  <div className="absolute inset-0 bg-zinc-500/20 blur-xl rounded-full"></div>
                  <UploadCloud size={48} strokeWidth={1} className="text-zinc-600 relative z-10" />
               </div>
               <p className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-500 mt-2">System Standby</p>
             </>
          )}
        </div>
      )}

      {/* 2. HUD Controls */}
      {modelData && (
        <div className={`absolute top-4 right-4 z-20 flex flex-col items-end transition-all duration-300 pointer-events-auto ${controlsOpen ? 'w-48' : 'w-auto'}`}>
          <button 
              onClick={() => setControlsOpen(!controlsOpen)}
              className={`
                  flex items-center py-1.5 px-2 mb-1 hover:bg-white/5 rounded transition-colors group cursor-pointer border border-transparent hover:border-white/5
                  ${controlsOpen ? 'w-full justify-between' : 'w-fit justify-center gap-2 self-end'}
              `}
          >
              {controlsOpen ? (
                  <div className="flex flex-col items-start">
                      <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-[0.2em]">GEO_VIEWER</span>
                  </div>
              ) : (
                  <Video size={14} className="text-cyan-500/50 group-hover:text-cyan-400" />
              )}
              
              <div className="flex items-center gap-2">
                    {controlsOpen && <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse"></div>}
                    {controlsOpen ? <ChevronUp size={12} className="text-zinc-600 group-hover:text-white"/> : <ChevronDown size={12} className="text-zinc-600 group-hover:text-white"/>}
              </div>
          </button>

          <div className={`
              w-full overflow-hidden transition-all duration-300 ease-in-out bg-black/20 backdrop-blur-sm border-white/5 shadow-lg
              ${controlsOpen ? 'max-h-80 opacity-100 border p-1' : 'max-h-0 opacity-0 border-0 p-0'}
          `}>
              <div className="flex flex-col gap-1">
                  <HudButton 
                      onClick={() => setAutoRotate(!autoRotate)} 
                      icon={Orbit} 
                      text="Orbit" 
                      subtext={autoRotate ? "ACTIVE" : "IDLE"} 
                      active={autoRotate}
                  />
              </div>
          </div>
        </div>
      )}

      {/* 3. Canvas */}
      <Canvas 
          dpr={[1, 1.5]} 
          className="w-full h-full"
          camera={{ position: [200, 200, 200], fov: 45 }}
      >
          {modelData && (
             <SceneContent 
                modelData={modelData} 
                color={color} 
                autoRotate={autoRotate} 
                isBaseEnabled={isBaseEnabled} 
             />
          )}
      </Canvas>
    </div>
  );
};