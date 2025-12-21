import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber'; // Added useFrame
import { 
  OrbitControls, 
  Environment
} from '@react-three/drei';
import { 
  Box, 
  Video, 
  RotateCw,
  Monitor,
  UploadCloud,
  Zap,
  ScanLine,
  ChevronUp,
  ChevronDown,
  Layers,
  RotateCcw,
  Orbit
} from 'lucide-react';

// --- Types ---
interface Viewer3DProps {
  geometry: THREE.BufferGeometry | null;
  isSmooth: boolean;
  lightDistanceCM?: number;
  isProcessing: boolean;
  color: string;      
  wallColor: string; 
}

// --- UI Components (Cyberpunk Style) ---
const HudButton = ({ onClick, icon: Icon, text, subtext, active = false, warning = false }: any) => (
  <button 
      onClick={onClick} 
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

// --- 🎥 SMOOTH CAMERA CONTROLLER ---
const CameraController = ({ 
  viewMode, 
  setViewMode 
}: { 
  viewMode: string; 
  setViewMode: (v: string) => void;
}) => {
  const { camera, controls } = useThree();
  const isAnimating = useRef(false);
  
  // Target vectors
  const targetPos = useRef(new THREE.Vector3(0, 0, 70));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));

  // 1. Listen for User Interaction to interrupt animation
  useEffect(() => {
    if (!controls) return;
    const orb = controls as any;
    
    const stopAnim = () => {
        isAnimating.current = false;
        // If user moves camera manually, set mode to idle
        if (viewMode !== 'idle') setViewMode('idle');
    };

    orb.addEventListener('start', stopAnim);
    return () => orb.removeEventListener('start', stopAnim);
  }, [controls, viewMode, setViewMode]);

  // 2. Set Targets when viewMode changes
  useEffect(() => {
    if (viewMode === 'idle') return;

    // Reset target to center
    targetLook.current.set(0, 0, 0);

    // Set destination based on mode
    switch (viewMode) {
      case 'front':
        targetPos.current.set(0, 0, 70); 
        break;
      case 'side':
        targetPos.current.set(70, 0, 10);
        break;
      case 'iso':
        targetPos.current.set(40, 20, 60);
        break;
      default:
        break;
    }
    
    isAnimating.current = true;
  }, [viewMode]);

  // 3. Animation Loop (The Smooth Logic)
  useFrame((state, delta) => {
      if (!isAnimating.current || !controls) return;
      
      const orb = controls as any;
      const step = 4 * delta; // Speed factor adjusted for delta time

      // Lerp Position
      camera.position.lerp(targetPos.current, step);
      
      // Lerp Controls Target (LookAt)
      orb.target.lerp(targetLook.current, step);
      orb.update();

      // Stop condition: Close enough to target
      if (camera.position.distanceTo(targetPos.current) < 0.5) {
          isAnimating.current = false;
          // Snap to exact finish to save performance
          camera.position.copy(targetPos.current);
          orb.target.copy(targetLook.current);
          orb.update();
      }
  });

  return null;
};

// --- Main Scene Content ---
const SceneContent = ({ 
  geometry, 
  color,
  wallColor,
  isSmooth, 
  lightDistanceCM = 100, 
  autoRotate 
}: Viewer3DProps & { autoRotate: boolean }) => {
  const wallZ = -10;
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (meshRef.current && geometry) {
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      if (bbox) {
        const minZ = bbox.min.z;
        meshRef.current.position.z = (wallZ + 0.1) - minZ;
      }
    }
  }, [geometry]);

  return (
    <>
      <OrbitControls 
        makeDefault 
        autoRotate={autoRotate}
        autoRotateSpeed={2}
        minDistance={10}
        maxDistance={200}
        enableDamping={true} // Adds inertia to manual movement
        dampingFactor={0.05}
      />

      <ambientLight intensity={0.3} />
      <Environment preset="city" />
      
      <directionalLight
        position={[40, 50, 60]} 
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={0.1}
        shadow-camera-far={200}
        shadow-bias={-0.001}
      />

      <spotLight
        position={[0, 60, 40]}
        angle={0.5}
        penumbra={0.7}
        intensity={1.2}
        castShadow
        shadow-bias={-0.0001}
      />

      {geometry && (
        <mesh 
          ref={meshRef}
          geometry={geometry} 
          castShadow 
          receiveShadow 
          position={[0, 0, 0]}
        >
          <meshStandardMaterial 
            color={color} 
            flatShading={!isSmooth}
            roughness={0.5}
            metalness={0.2}
            side={THREE.DoubleSide}
            envMapIntensity={0.6}
          />
        </mesh>
      )}

      {/* Back Wall */}
      <mesh position={[0, 0, wallZ]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial 
          color={wallColor}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
    </>
  );
};

// --- Main Component ---

export const WallArtView: React.FC<Viewer3DProps> = (props) => {
  const { isProcessing, geometry, lightDistanceCM = 100 } = props;
  const [viewMode, setViewMode] = useState<string>('idle');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  // When clicking buttons, turn off auto-rotate to allow smooth camera transition
  const handleViewChange = (mode: string) => {
    setAutoRotate(false);
    setViewMode(mode);
  };

  return (
    <div className="w-full h-full bg-black rounded-sm overflow-hidden shadow-2xl border border-white/10 relative group flex flex-col">
      
      {/* 1. Empty / Processing Overlay State */}
      {!geometry && (
        <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center z-10 pointer-events-none bg-black/40 backdrop-blur-sm">
          {isProcessing ? (
             <>
               <div className="w-16 h-16 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_30px_rgba(34,211,238,0.2)]"></div>
               <div className="flex flex-col items-center">
                   <p className="text-xs font-mono tracking-[0.3em] uppercase text-cyan-400 animate-pulse">Computing Matrix...</p>
                   <p className="text-[9px] text-cyan-500/50 uppercase mt-1">Voxelizing Intersections</p>
               </div>
             </>
          ) : (
             <>
               <div className="relative">
                  <div className="absolute inset-0 bg-zinc-500/20 blur-xl rounded-full"></div>
                  <UploadCloud size={48} strokeWidth={1} className="text-zinc-600 relative z-10" />
               </div>
               <div className="flex flex-col items-center gap-1">
                   <p className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-500">System Standby</p>
                   <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Upload Silhouettes to Initialize</p>
               </div>
             </>
          )}
        </div>
      )}

      {/* 2. HUD Controls (Only visible if geometry exists) */}
      {geometry && (
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
                      <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-[0.2em]">CAM_CTRL_SYS</span>
                      <span className="text-[7px] text-zinc-500 uppercase tracking-widest">v2.4 ONLINE</span>
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
                  <HudButton onClick={() => handleViewChange('front')} icon={Monitor} text="Front Cam" subtext="AXIS: Z-POS" />
                  <HudButton onClick={() => handleViewChange('side')} icon={Layers} text="Side Cam" subtext="AXIS: X-POS" />
                  <HudButton onClick={() => handleViewChange('iso')} icon={RotateCcw} text="Isometric" subtext="RESET VIEW" />
                  <div className="h-px bg-zinc-800/50 my-1 mx-2" />
                  <HudButton 
                      onClick={() => setAutoRotate(!autoRotate)} 
                      icon={Orbit} 
                      text="Cinematic Orbit" 
                      subtext={autoRotate ? "ROTATION: ACTIVE" : "AUTO-PAN"} 
                      active={autoRotate}
                  />
              </div>
          </div>
        </div>
      )}

      {/* 3. Bottom Info Panel (Only visible if geometry exists) */}
      {geometry && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none opacity-80">
           <div className="flex flex-col gap-1 text-[9px] font-mono text-cyan-400/80 uppercase tracking-wider">
             <div className="pl-3 flex items-center gap-1 text-zinc-500">
               <ScanLine size={10} />
               <span>Shadow Projection Active</span>
             </div>
           </div>
        </div>
      )}

      {/* 4. Canvas (Only renders when we have geometry) */}
      {geometry ? (
        <Canvas
          shadows
          camera={{ position: [0, 0, 65], fov: 45, near: 0.1, far: 1000 }}
          className="w-full h-full"
          dpr={[1, 2]}
          gl={{
            preserveDrawingBuffer: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            shadowMapType: THREE.PCFSoftShadowMap
          }}
        >
          <SceneContent {...props} autoRotate={autoRotate} />
          <CameraController viewMode={viewMode} setViewMode={setViewMode} />
        </Canvas>
      ) : null}
    </div>
  );
};