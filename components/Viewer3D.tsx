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
}

// --- GALERİ ORTAMI ---
const GalleryRoom = () => {
  const wallSize = 6000;    
  const wallDistance = 600; 
  const floorLevel = -800;  

  const wallColor = "#afa095"; 
  const floorColor = "#334155"; 

  return (
    <group>
      {/* Zemin */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, floorLevel, 0]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={floorColor} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Arka Duvar */}
      <mesh receiveShadow position={[0, -200, -wallDistance]}>
        <planeGeometry args={[wallSize, wallSize]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} metalness={0} />
      </mesh>

      {/* Sol Duvar */}
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

// --- KAMERA KONTROLCÜSÜ (GÜNCELLENDİ: Süzülerek Gitme) ---
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
  const isFirstLoad = useRef(true);

  // Kameranın gitmesi gereken hedef noktaları
  // Varsayılan olarak Reset pozisyonuyla başlatıyoruz
  const finalPosition = useRef(new THREE.Vector3(700, 400, 700));
  const finalTarget = useRef(new THREE.Vector3(0, 0, 0));

  // 1. Hedef Belirleme (Butona basınca çalışır)
  useEffect(() => {
    if (!geometry || !controlsRef.current) return;
    
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return;
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Odak noktası her zaman objenin merkezi
    finalTarget.current.copy(center);

    if (isFirstLoad.current || viewTrigger) {
        if (viewTrigger?.type === 'front') {
          finalPosition.current.set(0, 0, 800); 
        } 
        else if (viewTrigger?.type === 'side') {
          finalPosition.current.set(800, 0, 0); 
        } 
        else {
          // Reset View (Senin beğendiğin açı)
          finalPosition.current.set(700, 400, 700); 
        }
        
        // İlk yüklemede animasyon olmasın, direkt gitsin
        if (isFirstLoad.current) {
             camera.position.copy(finalPosition.current);
             if (controlsRef.current) controlsRef.current.target.copy(finalTarget.current);
             isFirstLoad.current = false;
        }
    }
  }, [viewTrigger, geometry, controlsRef, camera]);

  // 2. Animasyon Döngüsü (Her karede %5 yaklaşır)
  useFrame(() => {
     if (!controlsRef.current) return;

     // Kamerayı hedefe doğru süzdür (0.05 hızıyla)
     camera.position.lerp(finalPosition.current, 0.05);
     controlsRef.current.target.lerp(finalTarget.current, 0.05);
     controlsRef.current.update();
  });

  return null;
};

// --- SAHNE İÇERİĞİ ---
const SceneContent = ({ geometry, isSmooth, lightsOn }: { geometry: THREE.BufferGeometry, isSmooth: boolean, lightsOn: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    // Senin beğendiğin ışık şiddeti
    const spotIntensity = 700000; 

    return (
        <>
            {lightsOn && <GalleryRoom />}
            
            <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow position={[0, 0, 0]}>
                <ArtisticMaterial isSmooth={isSmooth} />
            </mesh>

            {/* Senin beğendiğin ışık ayarları */}
            <ambientLight intensity={lightsOn ? 0.4 : 0.8} />

            <hemisphereLight 
              intensity={0.1} 
              groundColor="#1a1a1a" 
              color="#ffffff"       
            />

            {lightsOn && (
                <>
                    <SpotLight
                        position={[0, 20, 800]} 
                        angle={0.25}
                        penumbra={0.1} 
                        intensity={spotIntensity}
                        castShadow
                        shadow-mapSize={[4096, 4096]} 
                        shadow-bias={-0.00005} 
                        target-position={[0, 0, 0]}
                        color="#ffffff"
                        distance={3000}
                        decay={2}
                    />

                    <SpotLight
                        position={[800, 20, 0]} 
                        angle={0.25}
                        penumbra={0.1}
                        intensity={spotIntensity} 
                        castShadow
                        shadow-mapSize={[4096, 4096]}
                        shadow-bias={-0.00005}
                        target-position={[0, 0, 0]}
                        color="#ffd700" 
                        distance={3000}
                        decay={2}
                    />
                </>
            )}
        </>
    );
};

export const Viewer3D: React.FC<Viewer3DProps> = ({ geometry, showGrid, isSmooth }) => {
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
        <PerspectiveCamera makeDefault position={[700, 400, 700]} fov={50} near={0.1} far={6000} />
        <OrbitControls ref={controlsRef} autoRotate={false} enableDamping={true} dampingFactor={0.05} maxPolarAngle={Math.PI / 1.5} maxDistance={3000} />
        
        <CameraController viewTrigger={viewTrigger} controlsRef={controlsRef} geometry={geometry} />
        
        {geometry && <SceneContent geometry={geometry} isSmooth={isSmooth} lightsOn={lightsOn} />}
        
        <fog attach="fog" args={['#020617', 500, 5000]} /> 
      </Canvas>

      {geometry && lightsOn && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none opacity-70">
           <div className="text-[10px] text-white bg-black/60 px-3 py-2 rounded-lg border border-white/10 backdrop-blur-sm max-w-[200px]">
             <p className="font-bold text-yellow-400 mb-1">Studio View</p>
             <p>Use controls to rotate around the sculpture and observe shadow projections.</p>
           </div>
        </div>
      )}
    </div>
  );
};