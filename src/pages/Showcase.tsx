import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera, useGLTF, useProgress, Html } from '@react-three/drei';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ExternalLink, Ruler, Mountain, Copy, X, BoxSelect } from 'lucide-react';

// --- DATA CONFIGURATION ---
const SHOWCASE_DATA = [
  {
    moduleName: "Terra-Former",
    engineId: "geo",
    icon: Mountain,
    projects: [
      {
        title: "The Manhattan Relief",
        stat: "1.2M Vertices",
        desc: "High-density topographic print of Lower Manhattan. Built from satellite telemetry.",
        image: "/showcase_page_images/newyork.png",
        modelUrl: "/models/nyc.glb", // Pointing to your new GLB
        tags: ["PLA", "0.4mm Nozzle"]
      },
    ]
  },
  {
    moduleName: "Shadow Caster",
    engineId: "shadow",
    icon: Copy,
    projects: [
      {
        title: "Binary Silhouette v1",
        stat: "Zero-Error Mesh",
        desc: "An optical illusion sculpture projecting two distinct shapes.",
        image: "/showcase_page_images/dual.png", 
        modelUrl: "/models/dual.glb", // Update this one once converted
        tags: ["Resin", "SLA"]
      }
    ]
  }
];

// Technical Loader Component
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 w-64">
        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
          <div 
            className="bg-cyan-500 h-full transition-all duration-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]" 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 animate-pulse text-center">
          Streaming Geometry {Math.round(progress)}%
        </span>
      </div>
    </Html>
  );
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  // We clone the scene to avoid reference issues if the same model is opened twice
  return (
    <primitive 
      object={scene.clone()} 
      castShadow 
      receiveShadow 
    />
  );
}

export default function Showcase() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  return (
    <div className="bg-zinc-950 min-h-screen text-white selection:bg-cyan-500 selection:text-black">
      <Header />
      
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="mb-20 border-l-2 border-cyan-500 pl-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Physical <span className="text-cyan-500">Outputs</span>
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-4">
            Select a project to inspect the underlying production geometry.
          </p>
        </div>

        <div className="space-y-32">
          {SHOWCASE_DATA.map((section) => (
            <section key={section.engineId}>
              <div className="flex items-center gap-4 mb-10">
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-cyan-500">
                  <section.icon size={20} />
                </div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-zinc-400 italic">
                  Engine // <span className="text-white">{section.moduleName}</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.projects.map((proj, i) => (
                  <div 
                    key={i} 
                    onClick={() => proj.modelUrl && setSelectedModel(proj.modelUrl)}
                    className="group cursor-pointer flex flex-col bg-zinc-900/20 border border-zinc-800 rounded-[2rem] overflow-hidden hover:border-cyan-500/50 transition-all duration-500"
                  >
                    <div className="aspect-[4/3] overflow-hidden relative">
                      <img src={proj.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" alt={proj.title} />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-cyan-500 text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <BoxSelect size={14} /> Inspect 3D Mesh
                        </div>
                      </div>
                    </div>
                    <div className="p-8 flex flex-col flex-1">
                      <h3 className="text-xl font-black uppercase italic mb-3 group-hover:text-cyan-400 transition-colors">{proj.title}</h3>
                      <p className="text-zinc-500 text-[11px] font-bold uppercase leading-relaxed mb-6">{proj.desc}</p>
                      
                      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-zinc-500">
                           <Ruler size={14}/> 
                           <span className="text-[9px] font-bold uppercase tracking-widest">{proj.stat}</span>
                         </div>
                         <ExternalLink size={16} className="text-zinc-700 group-hover:text-cyan-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* 3D INSPECTION MODAL */}
      {selectedModel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
          <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-xl" onClick={() => setSelectedModel(null)}></div>
          
          <div className="relative w-full h-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 relative z-10">
              <div className="flex items-center gap-3 font-black uppercase italic text-sm tracking-tighter">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                Geometric Inspection Mode
              </div>
              <button onClick={() => setSelectedModel(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 bg-black relative">
              <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                <Suspense fallback={<Loader />}>
                  <Stage environment="city" intensity={0.5} adjustCamera={true}>
                    <Model url={selectedModel} />
                  </Stage>
                </Suspense>
                <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
              </Canvas>
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 pointer-events-none text-center">
                Drag to Rotate // Scroll to Zoom
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}