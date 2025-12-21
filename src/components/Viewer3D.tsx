import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, SpotLight } from '@react-three/drei';
import { Layers, Monitor, RotateCcw, Lightbulb, LightbulbOff, Zap, ScanLine, ChevronDown, ChevronUp, Video, Loader2, UploadCloud, Orbit } from 'lucide-react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface Viewer3DProps {
  geometry: THREE.BufferGeometry | null;
  showGrid: boolean;
  isSmooth: boolean; 
  lightDistanceCM?: number;
  isProcessing: boolean;
  fileSize?: string | null;
  color?: string; // --- NEW: Optional Color Prop ---
}

// --- SIMULATION ROOM (Unchanged) ---
const SimulationRoom = () => {
  const wallSize = 10000;    
  const wallDistance = 1500; 
  const floorLevel = -800;  
  const wallColor = "#52525b"; 
  const floorColor = "#3f3f46"; 

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, floorLevel, 0]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={floorColor} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh receiveShadow position={[0, -200, -wallDistance]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={wallColor} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh receiveShadow rotation={[0, Math.PI / 2, 0]} position={[-wallDistance, -200, 0]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={wallColor} roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  );
};

// --- SCULPTURE MATERIAL (Updated to handle Color) ---
const ArtisticMaterial = ({ isSmooth, color }: { isSmooth: boolean, color?: string }) => {
  return (
    <meshStandardMaterial
      color={color || "#f1f5f9"} // Use custom color if provided, else default white
      flatShading={!isSmooth}     
      roughness={0.2}         
      metalness={0.4}
      side={THREE.DoubleSide} 
      shadowSide={THREE.DoubleSide} 
    />
  );
};

// --- CAMERA CONTROLLER (Unchanged) ---
const CameraController = ({ 
  viewTrigger, 
  controlsRef,
  geometry
}: { 
  viewTrigger: { type: string, t: number } | null,
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>,
  geometry: THREE.BufferGeometry | null
}) => {
  const { camera } = useThree();
  const isAnimating = useRef(false);
  const finalPosition = useRef(new THREE.Vector3(700, 400, 700));
  const finalTarget = useRef(new THREE.Vector3(0, 0, 0));
  const isFirstLoad = useRef(true);

  useEffect(() => {
     const controls = controlsRef.current;
     if (!controls) return;
     const stopAnimation = () => { isAnimating.current = false; };
     controls.addEventListener('start', stopAnimation);
     return () => controls.removeEventListener('start', stopAnimation);
  }, [controlsRef]);

  useEffect(() => {
    if (!geometry || !controlsRef.current) return;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return;
    const center = new THREE.Vector3();
    box.getCenter(center);
    finalTarget.current.copy(center);

    if (viewTrigger || isFirstLoad.current) {
        if (viewTrigger?.type === 'front') { finalPosition.current.set(0, 0, 450); } 
        else if (viewTrigger?.type === 'side') { finalPosition.current.set(450, 0, 0); } 
        else { finalPosition.current.set(500, 0, 500); }

        if (isFirstLoad.current) {
             camera.position.copy(finalPosition.current);
             controlsRef.current.target.copy(finalTarget.current);
             controlsRef.current.update();
             isFirstLoad.current = false;
             isAnimating.current = false;
        } else {
             isAnimating.current = true;
        }
    }
  }, [viewTrigger, geometry, controlsRef, camera]);

  useFrame(() => {
     if (!controlsRef.current || !isAnimating.current) return;
     const distPos = camera.position.distanceTo(finalPosition.current);
     const distTarget = controlsRef.current.target.distanceTo(finalTarget.current);
     if (distPos < 1.0 && distTarget < 1.0) {
         isAnimating.current = false;
         camera.position.copy(finalPosition.current);
         controlsRef.current.target.copy(finalTarget.current);
         controlsRef.current.update();
         return;
     }
     camera.position.lerp(finalPosition.current, 0.15);
     controlsRef.current.target.lerp(finalTarget.current, 0.15);
     controlsRef.current.update();
  });
  return null;
};

// --- SCENE CONTENT (Updated) ---
const SceneContent = ({ geometry, isSmooth, lightsOn, lightDistCM, color }: { geometry: THREE.BufferGeometry, isSmooth: boolean, lightsOn: boolean, lightDistCM: number, color?: string }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const centerHeight = React.useMemo(() => {
        if (!geometry) return 0;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (!box) return 0;
        return (box.max.y + box.min.y) / 2;
    }, [geometry]);

    const baseIntensity = 3500000; 
    const intensityMultiplier = Math.max(1, lightDistCM / 40); 
    const spotIntensity = baseIntensity * intensityMultiplier;
    const unitScale = 20; 
    const lightDist = lightDistCM * unitScale;
    const effectiveRange = lightDist + 8000; 

    return (
        <>
            {lightsOn && <SimulationRoom />}
            <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow position={[0, 0, 0]}>
                <ArtisticMaterial isSmooth={isSmooth} color={color} />
            </mesh>
            <ambientLight intensity={lightsOn ? 0.4 : 0.8} />
            <hemisphereLight intensity={lightsOn ? 0.2 : 0.4} groundColor="#111111" color="#ffffff" />
            {lightsOn && (
                <>
                    <SpotLight position={[0, centerHeight, lightDist]} angle={0.5} penumbra={0.1} intensity={spotIntensity} castShadow distance={effectiveRange} shadow-camera-far={effectiveRange} shadow-mapSize={[4096, 4096]} shadow-bias={-0.00005} target-position={[0, centerHeight, 0]} color="#ffffff" decay={2} />
                    <SpotLight position={[lightDist, centerHeight, 0]} angle={0.5} penumbra={0.1} intensity={spotIntensity} castShadow distance={effectiveRange} shadow-camera-far={effectiveRange} shadow-mapSize={[4096, 4096]} shadow-bias={-0.00005} target-position={[0, centerHeight, 0]} color="#fcd34d" decay={2} />
                </>
            )}
        </>
    );
};

export const Viewer3D: React.FC<Viewer3DProps> = ({ geometry, showGrid, isSmooth, lightDistanceCM = 100, isProcessing, color }) => {
  const [viewTrigger, setViewTrigger] = useState<{ type: string, t: number } | null>(null);
  const [lightsOn, setLightsOn] = useState(true); 
  const [controlsOpen, setControlsOpen] = useState(true); 
  const [autoRotate, setAutoRotate] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const handleViewChange = (type: string) => {
    setAutoRotate(false);
    setViewTrigger({ type, t: Date.now() });
  };
  const handleReset = () => {
    setAutoRotate(false);
    setViewTrigger({ type: 'iso', t: Date.now() });
  };

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleInteraction = () => {
       // @ts-ignore
       const currentState = controls.state;
       const isZooming = currentState === 1 || currentState === 5; 

       if (!isZooming) {
         setAutoRotate(false);
       }
    };

    controls.addEventListener('start', handleInteraction);
    return () => controls.removeEventListener('start', handleInteraction);
  }, []); 

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

  return (
    <div className="w-full h-full bg-black rounded-sm overflow-hidden shadow-2xl border border-white/10 relative group">
      
      {/* --- OVERLAY STATE --- */}
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
      
      {/* --- HUD CONTROLS --- */}
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
                <HudButton 
                    onClick={() => setLightsOn(!lightsOn)} 
                    icon={lightsOn ? Lightbulb : LightbulbOff} 
                    text={lightsOn ? "Projection" : "Ambient"} 
                    subtext={lightsOn ? "STATUS: ACTIVE" : "STATUS: STANDBY"}
                    warning={true}
                />
                <div className="h-px bg-zinc-800/50 my-1 mx-2" />
                <HudButton onClick={() => handleViewChange('front')} icon={Monitor} text="Front Cam" subtext="AXIS: Z-POS" />
                <HudButton onClick={() => handleViewChange('side')} icon={Layers} text="Side Cam" subtext="AXIS: X-POS" />
                <HudButton onClick={handleReset} icon={RotateCcw} text="Reset View" subtext="ISOMETRIC" />
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

      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[800, 500, 800]} fov={50} near={0.1} far={15000} />
        <OrbitControls 
            makeDefault 
            ref={controlsRef} 
            autoRotate={autoRotate}
            autoRotateSpeed={2.0} 
            enableDamping={true} 
            dampingFactor={0.05} 
            maxPolarAngle={Math.PI / 1.5} 
            maxDistance={8000} 
        />
        <CameraController viewTrigger={viewTrigger} controlsRef={controlsRef} geometry={geometry} />
        
        {geometry && (
            <SceneContent 
                geometry={geometry} 
                isSmooth={isSmooth} 
                lightsOn={lightsOn} 
                lightDistCM={lightDistanceCM} 
                color={color} // --- PASSING COLOR ---
            />
        )}
        
        <fog attach="fog" args={['#000000', 4000, 15000]} /> 
      </Canvas>

      {geometry && lightsOn && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none opacity-80">
           <div className="flex flex-col gap-1 text-[9px] font-mono text-cyan-400/80 uppercase tracking-wider">
             <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-2 border-l-2 border-cyan-500 rounded-r-sm shadow-[0_0_20px_rgba(0,0,0,0.5)]">
               <Zap size={10} className="text-yellow-400" />
               <span>Light Distance: <span className="text-white font-bold">{lightDistanceCM}cm</span></span>
             </div>
             <div className="pl-3 flex items-center gap-1 text-zinc-500">
               <ScanLine size={10} />
               <span>Shadow Projection Active</span>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};