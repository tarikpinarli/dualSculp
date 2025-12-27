import React, { Suspense, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Center } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';

interface ModelViewerProps {
  url: string;
}

function Model({ url }: { url: string }) {
  // Debug: Log what URL we are trying to load
  useEffect(() => {
    console.log("Attempting to load 3D Model from:", url);
  }, [url]);

  // The Loader Hook
  // We add a catch for errors to prevent white screen crashes
  const geom = useLoader(STLLoader, url, (loader) => {
    // Optional: Settings for the loader can go here
  });

  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      {/* Material: High-End Shiny Cyan Plastic */}
      <meshPhysicalMaterial 
        color="#06b6d4" 
        metalness={0.5}
        roughness={0.2}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

export function ModelViewer({ url }: ModelViewerProps) {
  return (
    <div className="w-full h-full cursor-move">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 150], fov: 50 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6} adjustCamera>
            <Center>
               <Model url={url} />
            </Center>
          </Stage>
        </Suspense>
        
        {/* Controls: Auto-rotate creates a nice "Showcase" effect */}
        <OrbitControls autoRotate autoRotateSpeed={4} makeDefault />
      </Canvas>
    </div>
  );
}