import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, SpotLight } from '@react-three/drei';
import { Layers, Monitor, RotateCcw, Lightbulb, LightbulbOff } from 'lucide-react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface Viewer3DProps {
  geometry: THREE.BufferGeometry | null;
  showGrid: boolean;
  isSmooth: boolean; 
  lightDistanceCM?: number;
}

// --- GALERİ ORTAMI ---
const GalleryRoom = () => {
  const wallSize = 10000;    
  const wallDistance = 1500; 
  const floorLevel = -800;  

  const wallColor = "#afa095"; 
  const floorColor = "#334155"; 

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, floorLevel, 0]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={floorColor} roughness={0.8} metalness={0.1} />
      </mesh>

      <mesh receiveShadow position={[0, -200, -wallDistance]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} metalness={0} />
      </mesh>

      <mesh receiveShadow rotation={[0, Math.PI / 2, 0]} position={[-wallDistance, -200, 0]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
};

// --- HEYKEL MATERYALİ ---
const ArtisticMaterial = ({ isSmooth }: { isSmooth: boolean }) => {
  return (
    <meshStandardMaterial
      color="#ffffff"         
      flatShading={false}     
      roughness={0.4}         
      metalness={0.1}
      side={THREE.DoubleSide} 
      shadowSide={THREE.DoubleSide} 
    />
  );
};

// --- KAMERA KONTROLCÜSÜ (Özgür Gezinti + Yumuşak Reset) ---
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

  // 1. Mouse ile müdahale edilirse animasyonu durdur
  useEffect(() => {
     const controls = controlsRef.current;
     if (!controls) return;
     const stopAnimation = () => { isAnimating.current = false; };
     controls.addEventListener('start', stopAnimation);
     return () => controls.removeEventListener('start', stopAnimation);
  }, [controlsRef]);

  // 2. Hedef belirleme
  useEffect(() => {
    if (!geometry || !controlsRef.current) return;
    
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return;
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    finalTarget.current.copy(center);

    if (viewTrigger || isFirstLoad.current) {
        if (viewTrigger?.type === 'front') {
          finalPosition.current.set(0, 0, 450); 
        } 
        else if (viewTrigger?.type === 'side') {
          finalPosition.current.set(450, 0, 0); 
        } 
        else {
          // Reset View
          finalPosition.current.set(500, 0, 500); 
        }

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

  // 3. Animasyon Loop
  useFrame(() => {
     if (!controlsRef.current || !isAnimating.current) return;
     const distPos = camera.position.distanceTo(finalPosition.current);
     const distTarget = controlsRef.current.target.distanceTo(finalTarget.current);

     if (distPos < 0.1 && distTarget < 0.1) {
         isAnimating.current = false;
         camera.position.copy(finalPosition.current);
         controlsRef.current.target.copy(finalTarget.current);
         controlsRef.current.update();
         return;
     }

     camera.position.lerp(finalPosition.current, 0.1);
     controlsRef.current.target.lerp(finalTarget.current, 0.1);
     controlsRef.current.update();
  });

  return null;
};

// --- SAHNE İÇERİĞİ ---
const SceneContent = ({ geometry, isSmooth, lightsOn, lightDistCM }: { geometry: THREE.BufferGeometry, isSmooth: boolean, lightsOn: boolean, lightDistCM: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    // --- NEW: Calculate the center height of the object ---
    const centerHeight = React.useMemo(() => {
        if (!geometry) return 0;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (!box) return 0;
        
        // Calculate the middle Y point
        return (box.max.y + box.min.y) / 2;
    }, [geometry]);
    // -----------------------------------------------------

    const baseIntensity = 1700000;
    const intensityMultiplier = Math.max(1, lightDistCM / 40); 
    const spotIntensity = baseIntensity * intensityMultiplier;

    const unitScale = 20; 
    const lightDist = lightDistCM * unitScale;
    const effectiveRange = lightDist + 6000; 

    return (
        <>
            {lightsOn && <GalleryRoom />}
            
            <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow position={[0, 0, 0]}>
                <ArtisticMaterial isSmooth={isSmooth} />
            </mesh>

            <ambientLight intensity={lightsOn ? 0.3 : 0.8} />

            <hemisphereLight 
              intensity={lightsOn ? 0.3 : 0.4} 
              groundColor="#1a1a1a" 
              color="#ffffff"       
            />

            {lightsOn && (
                <>
                    {/* ÖN IŞIK */}
                    <SpotLight
                        // UPDATED: Y position uses centerHeight
                        position={[0, centerHeight, lightDist]} 
                        angle={0.4} 
                        penumbra={0.1} 
                        intensity={spotIntensity}
                        castShadow
                        distance={effectiveRange} 
                        shadow-camera-far={effectiveRange} 
                        shadow-mapSize={[4096, 4096]} 
                        shadow-bias={-0.00005} 
                        // UPDATED: Target looks at centerHeight
                        target-position={[0, centerHeight, 0]}
                        color="#ffffff"
                        decay={2}
                    />

                    {/* YAN IŞIK */}
                    <SpotLight
                        // UPDATED: Y position uses centerHeight
                        position={[lightDist, centerHeight, 0]} 
                        angle={0.4}
                        penumbra={0.1}
                        intensity={spotIntensity} 
                        castShadow
                        distance={effectiveRange} 
                        shadow-camera-far={effectiveRange} 
                        shadow-mapSize={[4096, 4096]}
                        shadow-bias={-0.00005}
                        // UPDATED: Target looks at centerHeight
                        target-position={[0, centerHeight, 0]}
                        color="#ffd700" 
                        decay={2}
                    />
                </>
            )}
        </>
    );
};

export const Viewer3D: React.FC<Viewer3DProps> = ({ geometry, showGrid, isSmooth, lightDistanceCM = 100 }) => {
  const [viewTrigger, setViewTrigger] = useState<{ type: string, t: number } | null>(null);
  const [lightsOn, setLightsOn] = useState(true); 
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const handleViewChange = (type: string) => {
    setViewTrigger({ type, t: Date.now() });
  };

  const handleReset = () => {
    setViewTrigger({ type: 'iso', t: Date.now() });
  };

  return (
    <div className="w-full h-full bg-slate-950 rounded-lg overflow-hidden shadow-2xl shadow-black/50 border border-slate-800 relative group">
      
      {!geometry && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 z-10 pointer-events-none">
          <p className="text-sm font-light tracking-widest uppercase animate-pulse">Waiting for Sculpture...</p>
        </div>
      )}
      
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 transition-opacity duration-300">
        
        <button 
            onClick={() => setLightsOn(!lightsOn)} 
            className={`flex items-center gap-2 px-3 py-1.5 backdrop-blur text-xs font-medium rounded-md border transition-colors shadow-lg ${
                lightsOn ? 'bg-yellow-500/20 text-yellow-200 border-yellow-500/50 hover:bg-yellow-500/30' : 'bg-slate-800/90 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
        >
          {lightsOn ? <Lightbulb size={14} /> : <LightbulbOff size={14} />} 
          {lightsOn ? "Projection Mode ON" : "Ambient Mode"}
        </button>

        <div className="h-px bg-slate-700/50 my-1" />

        <button onClick={() => handleViewChange('front')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 hover:bg-indigo-600 backdrop-blur text-xs font-medium text-slate-200 rounded-md border border-slate-700 transition-colors shadow-lg">
          <Monitor size={14} /> Front Cam
        </button>
        <button onClick={() => handleViewChange('side')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 hover:bg-indigo-600 backdrop-blur text-xs font-medium text-slate-200 rounded-md border border-slate-700 transition-colors shadow-lg">
          <Layers size={14} /> Side Cam
        </button>
        <button onClick={handleReset} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 backdrop-blur text-xs font-medium text-slate-400 hover:text-white rounded-md border border-slate-700 transition-colors shadow-lg">
          <RotateCcw size={14} /> Reset View
        </button>
      </div>

      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[800, 500, 800]} fov={50} near={0.1} far={15000} />
        <OrbitControls ref={controlsRef} autoRotate={false} enableDamping={true} dampingFactor={0.05} maxPolarAngle={Math.PI / 1.5} maxDistance={8000} />
        
        <CameraController viewTrigger={viewTrigger} controlsRef={controlsRef} geometry={geometry} />
        
        {geometry && <SceneContent geometry={geometry} isSmooth={isSmooth} lightsOn={lightsOn} lightDistCM={lightDistanceCM} />}
        
        <fog attach="fog" args={['#020617', 2000, 10000]} /> 
      </Canvas>

      {geometry && lightsOn && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none opacity-70">
           <div className="text-[10px] text-white bg-black/60 px-3 py-2 rounded-lg border border-white/10 backdrop-blur-sm max-w-[200px]">
             <p className="font-bold text-yellow-400 mb-1">Light Distance: {lightDistanceCM}cm</p>
             <p>Simulation and geometry adjusted for physical light source distance.</p>
           </div>
        </div>
      )}
    </div>
  );
};