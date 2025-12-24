import React, { Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Bounds, Center } from '@react-three/drei';
import { UploadCloud, Loader2 } from 'lucide-react';

interface GeoViewProps {
  modelData: { buildings: THREE.BufferGeometry | null, base: THREE.BufferGeometry } | null;
  color: string;
  isProcessing: boolean;
}

const SceneContent = ({ modelData, color }: { modelData: any, color: string }) => {
  const VIBE_CYAN = "#06b6d4"; 
  const VIBE_DARK_BASE = "#27272a"; 

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[-50, 40, 50]} intensity={2} castShadow />
      <directionalLight position={[50, 20, -50]} intensity={1} color={VIBE_CYAN} />
      <Environment preset="city" />

      {/* AUTO-CENTERING WRAPPER */}
      <Bounds fit clip observe margin={1.2}>
        <Center>
            <group>
                {/* BASE */}
                {modelData?.base && (
                    <mesh receiveShadow castShadow geometry={modelData.base}>
                    <meshStandardMaterial 
                        color={VIBE_DARK_BASE} 
                        roughness={0.6} 
                        metalness={0.4} 
                        side={THREE.DoubleSide} 
                    />
                    </mesh>
                )}

                {/* BUILDINGS / TERRAIN */}
                {modelData?.buildings && (
                    <mesh castShadow receiveShadow geometry={modelData.buildings}>
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

      <ContactShadows position={[0, -0.1, 0]} opacity={0.6} scale={150} blur={2} far={4} color="#000000" />
    </>
  );
};

export const GeoView = ({ modelData, color, isProcessing }: GeoViewProps) => {
  return (
    <div className="w-full h-full bg-zinc-950 rounded-sm overflow-hidden shadow-2xl border border-white/10 relative group flex flex-col">
      
      {(!modelData || isProcessing) && (
        <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center z-10 pointer-events-none bg-black/80 backdrop-blur-md">
          {isProcessing ? (
             <>
               <Loader2 size={32} className="text-cyan-400 animate-spin" />
               <p className="text-xs font-mono tracking-[0.3em] uppercase text-cyan-400 animate-pulse mt-2">Generating...</p>
             </>
          ) : (
             <div className="flex flex-col items-center gap-2 opacity-40">
                <UploadCloud size={40} className="text-zinc-500" />
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Ready</p>
             </div>
          )}
        </div>
      )}

      <Canvas shadows dpr={[1, 1.5]} className="w-full h-full">
        <Suspense fallback={null}>
            <OrbitControls makeDefault minDistance={10} maxDistance={500} />
            
            {/* ONLY RENDER IF DATA EXISTS */}
            {modelData && <SceneContent modelData={modelData} color={color} />}
            
        </Suspense>
      </Canvas>
    </div>
  );
};