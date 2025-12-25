import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, Center } from '@react-three/drei';
import { 
  Video, 
  UploadCloud,
  ChevronUp,
  ChevronDown,
  Layers,
  Orbit,
  ScanLine,
  ArrowUpFromLine,
  Globe
} from 'lucide-react';

// --- Types ---
// UPDATE: Added 'roads' to the interface so TypeScript knows it exists
interface GeoViewProps {
  modelData: { 
      buildings: THREE.BufferGeometry | null, 
      base: THREE.BufferGeometry,
      roads?: THREE.BufferGeometry | null,
      water?: THREE.BufferGeometry | null
  } | null;
  color: string;
  isProcessing: boolean;
}

// --- UI Components ---
const HudButton = ({ onClick, icon: Icon, text, subtext, active = false, warning = false }: any) => (
  <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }} 
      className={`group relative flex items-center justify-between w-full px-3 py-2 border-l-2 transition-all duration-200 overflow-hidden ${
          active 
          ? 'bg-cyan-950/40 border-cyan-400 text-cyan-100' 
          : warning
              ? 'bg-yellow-950/20 border-yellow-500/50 text-yellow-100 hover:bg-yellow-900/30'
              : 'bg-black/40 border-zinc-700 text-zinc-400 hover:bg-zinc-900/60 hover:border-cyan-500/50 hover:text-cyan-200'
      }`}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none"></div>
    <div className="flex items-center gap-3">
      <Icon size={14} className={warning ? "text-yellow-400" : "group-hover:text-cyan-400"} />
      <div className="flex flex-col items-start">
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{text}</span>
          {subtext && <span className="text-[8px] font-mono text-zinc-500 group-hover:text-cyan-400/70">{subtext}</span>}
      </div>
    </div>
    <div className={`w-1 h-1 rounded-full ${active ? 'bg-cyan-400 box-shadow-cyan' : warning ? 'bg-yellow-400' : 'bg-zinc-800 group-hover:bg-cyan-500'}`}></div>
  </button>
);

// --- 🎥 DETERMINISTIC CAMERA CONTROLLER (NO BUZZING) ---
const CameraController = ({ 
  viewMode, 
  setViewMode 
}: { 
  viewMode: string; 
  setViewMode: (v: string) => void;
}) => {
  const { camera, controls } = useThree();
  
  // Animation State
  const isAnimating = useRef(false);
  const startTime = useRef(0);
  const DURATION = 1.2; // Seconds for transition

  // Vectors to interpolate between
  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endPos = useRef(new THREE.Vector3());
  const endTarget = useRef(new THREE.Vector3());

  // Easing function: Cubic Ease In/Out (Buttery Smooth)
  const easeInOutCubic = (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // 1. Trigger Animation
  useEffect(() => {
    if (viewMode === 'idle' || !controls) return;
    const orb = controls as any;

    // A. Capture Starting State
    startPos.current.copy(camera.position);
    startTarget.current.copy(orb.target);

    // B. Define Ending State based on current Target Center
    const center = orb.target.clone();
    endTarget.current.copy(center); // Keep looking at the same spot

    switch (viewMode) {
      case 'top':
        endPos.current.set(center.x, center.y + 500, center.z + 1); // +1 z to prevent gimbal lock
        break;
      case 'angle':
        endPos.current.set(center.x + 300, center.y + 300, center.z + 300); 
        break;
      case 'low':
        endPos.current.set(center.x, center.y + 20, center.z + 400); 
        break;
      default:
        isAnimating.current = false;
        return;
    }

    // C. Disable Controls & Start Timer
    orb.enabled = false;
    isAnimating.current = true;
    startTime.current = performance.now();

  }, [viewMode, controls, camera]);

  // 2. Animation Loop
  useFrame(() => {
    if (!isAnimating.current || !controls) return;
    const orb = controls as any;

    // Calculate Progress (0.0 to 1.0)
    const now = performance.now();
    const elapsed = (now - startTime.current) / 1000; // Convert to seconds
    let t = Math.min(1, elapsed / DURATION); // Clamp to max 1
    
    // Apply Easing
    const smoothedT = easeInOutCubic(t);

    // Interpolate Position
    camera.position.lerpVectors(startPos.current, endPos.current, smoothedT);
    
    // Interpolate Target (LookAt)
    orb.target.lerpVectors(startTarget.current, endTarget.current, smoothedT);
    
    // Force Update
    camera.lookAt(orb.target);
    camera.updateProjectionMatrix();

    // Check if finished
    if (t >= 1) {
      isAnimating.current = false;
      
      // Snap to final values to be mathematically perfect
      camera.position.copy(endPos.current);
      orb.target.copy(endTarget.current);
      
      // Re-enable controls
      orb.enabled = true;
      orb.update();
      
      setViewMode('idle');
    }
  });

  return null;
};

// --- Scene Content ---
const SceneContent = ({ 
  modelData, 
  color, 
  autoRotate 
}: { modelData: any, color: string, autoRotate: boolean }) => {
  const VIBE_CYAN = "#06b6d4"; 
  const VIBE_DARK_BASE = "#27272a"; 
  const VIBE_ROAD = "#18181b"; // Dark Asphalt
  const VIBE_WATER = "#0e7490";

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

      {/* AUTO-CENTERING WRAPPER */}
      <Bounds fit clip observe margin={1.2}>
        <Center>
            <group>
                {/* BASE */}
                {modelData?.base && (
                    <mesh geometry={modelData.base}>
                    <meshStandardMaterial 
                        color={VIBE_DARK_BASE} 
                        roughness={0.6} 
                        metalness={0.4} 
                        side={THREE.DoubleSide} 
                    />
                    </mesh>
                )}

                {/* UPDATE: ROADS (Rendered in Dark Asphalt) */}
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
                {/* WATER (NEW) */}
                {modelData?.water && (
                    <mesh geometry={modelData.water}>
                        <meshStandardMaterial 
                            color={VIBE_WATER} 
                            roughness={0.1} // shiny
                            metalness={0.8} // reflective
                            emissive={VIBE_WATER}
                            emissiveIntensity={0.2}
                            side={THREE.DoubleSide} 
                        />
                    </mesh>
                )}

                {/* BUILDINGS / TERRAIN */}
                {modelData?.buildings && (
                    <mesh geometry={modelData.buildings}>
                    <meshStandardMaterial 
                        color={color || VIBE_CYAN} 
                        emissive={color || VIBE_CYAN}
                        emissiveIntensity={0.3} 
                        roughness={0.2} 
                        metalness={0.1} 
                        flatShading={true} 
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

// --- Main Component ---
export const GeoView = ({ modelData, color, isProcessing }: GeoViewProps) => {
  const [viewMode, setViewMode] = useState<string>('idle');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  const handleViewChange = (mode: string) => {
    // Reset auto-rotate
    setAutoRotate(false);
    
    // Trigger change (Force a re-render/effect trigger even if clicking same button)
    setViewMode('idle');
    setTimeout(() => {
        setViewMode(mode);
    }, 10);
  };

  return (
    <div className="w-full h-full bg-zinc-950 rounded-sm overflow-hidden shadow-2xl border border-white/10 relative group flex flex-col">
      
      {/* 1. Empty / Processing Overlay State */}
      {(!modelData || isProcessing) && (
        <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center z-10 pointer-events-none bg-black/80 backdrop-blur-md">
          {isProcessing ? (
             <>
               <div className="w-16 h-16 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_30px_rgba(34,211,238,0.2)]"></div>
               <div className="flex flex-col items-center mt-4">
                   <p className="text-xs font-mono tracking-[0.3em] uppercase text-cyan-400 animate-pulse">Scanning Terrain...</p>
                   <p className="text-[9px] text-cyan-500/50 uppercase mt-1">Fetching Topography</p>
               </div>
             </>
          ) : (
             <>
               <div className="relative">
                  <div className="absolute inset-0 bg-zinc-500/20 blur-xl rounded-full"></div>
                  <UploadCloud size={48} strokeWidth={1} className="text-zinc-600 relative z-10" />
               </div>
               <div className="flex flex-col items-center gap-1 mt-2">
                   <p className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-500">System Standby</p>
                   <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Select Area to Initialize</p>
               </div>
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
                      <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-[0.2em]">GEO_SAT_CAM</span>
                      <span className="text-[7px] text-zinc-500 uppercase tracking-widest">v4.0 LINKED</span>
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
                  <HudButton onClick={() => handleViewChange('top')} icon={ArrowUpFromLine} text="Satellite" subtext="AXIS: Y-POS" />
                  <HudButton onClick={() => handleViewChange('angle')} icon={Globe} text="Isometric" subtext="ANGLED VIEW" />
                  <HudButton onClick={() => handleViewChange('low')} icon={Layers} text="Horizon" subtext="LOW ALTITUDE" />
                  <div className="h-px bg-zinc-800/50 my-1 mx-2" />
                  <HudButton 
                      onClick={() => setAutoRotate(!autoRotate)} 
                      icon={Orbit} 
                      text="Drone Orbit" 
                      subtext={autoRotate ? "ROTATION: ACTIVE" : "AUTO-PAN"} 
                      active={autoRotate}
                  />
              </div>
          </div>
        </div>
      )}

      {/* 3. Bottom Info Panel */}
      {modelData && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none opacity-80">
           <div className="flex flex-col gap-1 text-[9px] font-mono text-cyan-400/80 uppercase tracking-wider">
             <div className="pl-3 flex items-center gap-1 text-zinc-500">
               <ScanLine size={10} />
               <span>Topographic Data Visualized</span>
             </div>
           </div>
        </div>
      )}

      {/* 4. Canvas */}
      <Canvas dpr={[1, 1.5]} className="w-full h-full">
          <CameraController viewMode={viewMode} setViewMode={setViewMode} />
          {modelData && <SceneContent modelData={modelData} color={color} autoRotate={autoRotate} />}
      </Canvas>
    </div>
  );
};