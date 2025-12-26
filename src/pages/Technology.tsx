import React from 'react';
import { Header } from '../components/layout/Header';
import { Terminal, Database, GitBranch, Cpu, Activity, Zap, Box, Layers } from 'lucide-react';
import { Footer } from '../components/layout/Footer';

export default function Technology() {
  const TECH_ITEMS = [
    {
      title: "CSG Boolean Processing",
      desc: "Our core engine utilizes Constructive Solid Geometry (CSG) to calculate the volumetric intersection of two extruded 2D vectors. By solving the spatial overlap, we generate a singular manifold 3D mesh that honors both silhouette inputs simultaneously.",
      icon: Layers,
      color: "text-cyan-500",
      label: "Engine: Shadow Caster"
    },
    {
      title: "Elevation Telemetry",
      desc: "Terra-Former streams RGB-encoded DEM (Digital Elevation Model) tiles via Mapbox. Our backend decodes these pixels into floating-point height values, reconstructing Earth's topography into a high-density vertex grid for precise 3D manufacturing.",
      icon: Database,
      color: "text-purple-500",
      label: "Engine: Terra-Former"
    },
    {
      title: "Manifold Mesh Validation",
      desc: "Standard 3D models often contain 'leaky' geometry. Our export pipeline performs a topological audit, automatically capping holes and resolving self-intersections to ensure every STL is 100% water-tight for FDM and SLA slicers.",
      icon: GitBranch,
      color: "text-emerald-500",
      label: "Protocol: STL Export"
    }
  ];

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-300 selection:bg-cyan-500 selection:text-black">
      <Header />
      
      {/* Dynamic Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      <div className="relative z-10 pt-28 md:pt-40 pb-20 px-6 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-12 md:mb-24">
          <div className="flex items-center gap-2 mb-4">
             <div className="h-px w-6 md:w-8 bg-cyan-500"></div>
             <span className="text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-cyan-500">System Architecture</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-black text-white uppercase mb-6 tracking-tighter italic">
            The <span className="text-cyan-500">Stack</span>
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm max-w-xl uppercase font-bold tracking-widest leading-relaxed">
            Converting raw telemetry and pixel displacement into production-grade physical assets.
          </p>
        </div>

        {/* Tech Stack List */}
        <div className="grid grid-cols-1 gap-12 md:gap-20">
            {TECH_ITEMS.map((item, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-6 md:gap-10 group relative">
                  {/* Icon Container */}
                  <div className="shrink-0">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:bg-zinc-800/50 transition-all duration-500 relative z-10 shadow-2xl">
                        <item.icon className={`${item.color} group-hover:scale-110 transition-transform`} size={window.innerWidth < 768 ? 24 : 32} />
                    </div>
                  </div>

                  <div className="flex-1 border-l border-zinc-900 pl-6 md:pl-0 md:border-0">
                      <span className="text-[8px] md:text-[9px] font-mono font-bold text-zinc-600 uppercase tracking-[0.2em] mb-2 block">
                        {item.label}
                      </span>
                      <h3 className="text-white font-black uppercase text-xl md:text-3xl mb-4 italic tracking-tight group-hover:text-cyan-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-zinc-500 text-[11px] md:text-sm leading-relaxed max-w-2xl uppercase font-medium">
                        {item.desc}
                      </p>
                  </div>
              </div>
            ))}
        </div>

        {/* Visual Technical Component */}
        <div className="mt-24 p-8 md:p-16 bg-zinc-900/20 border border-zinc-800 rounded-[2rem] overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Box size={160} />
           </div>
           
           <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <h4 className="text-white font-black uppercase text-lg md:text-2xl italic mb-4">Topological <span className="text-cyan-500">Integrity</span></h4>
                <p className="text-zinc-500 text-[10px] md:text-xs uppercase font-bold leading-relaxed tracking-wide">
                  Every CrossCast engine operates in 32-bit floating point precision. When you export, our cloud nodes execute a 're-meshing' pass that eliminates non-manifold edges and self-intersections—the primary causes of 3D print failure.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {[
                    { label: 'Latency', val: '120ms', icon: Activity },
                    { label: 'Precision', val: '0.01mm', icon: Terminal },
                    { label: 'Compute', val: 'Parallel', icon: Cpu },
                    { label: 'Auth', val: 'SSL-256', icon: Zap }
                  ].map((stat, i) => (
                    <div key={i} className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-xl">
                      <stat.icon size={12} className="text-cyan-500 mb-2" />
                      <div className="text-[8px] font-bold text-zinc-600 uppercase mb-1 tracking-tighter">{stat.label}</div>
                      <div className="text-xs md:text-sm font-black text-white font-mono">{stat.val}</div>
                    </div>
                  ))}
              </div>
           </div>
        </div>

        {/* Accompanying image of 3D printing slicing and mesh analysis */}
        

        {/* Footer System Status */}
        <div className="mt-20 py-6 border-y border-zinc-900 flex justify-between items-center px-4">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[8px] font-mono uppercase text-zinc-500 tracking-widest">Mainframe Online</span>
           </div>
           <span className="text-[8px] font-mono uppercase text-zinc-700 tracking-widest">Version 2.0.4-LTS</span>
        </div>
      </div>
      <Footer />
    </div>
  );
}