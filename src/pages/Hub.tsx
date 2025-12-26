import React from 'react';
import { Link } from 'react-router-dom';
import { Copy, Box, Mountain, ArrowRight, Zap, Shield, Cpu, Activity } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

const PROTOCOLS = [
  {
    id: 'shadow',
    name: 'Shadow Caster',
    version: 'v4.2',
    desc: 'The original silhouette intersection engine. Transform two distinct 2D profiles into a single 3D object.',
    specs: ['CSG Logic', 'STL Output', 'Offset Control'],
    icon: Copy,
    path: '/app/intersection',
    color: 'cyan',
    video: '/module_videos/apple_steve_shadow.mov'
  },
  {
    id: 'litho',
    name: 'Luminance',
    version: 'v2.1',
    desc: 'Advanced grayscale-to-depth conversion. Creates high-precision lithophanes that reveal photographic detail.',
    specs: ['Pixel Mapping', 'Auto-Frame', 'Sub-mm Detail'],
    icon: Box,
    path: '/wall-art',
    color: 'zinc',
    video: '/module_videos/tablo.mov'
  },
  {
    id: 'geo',
    name: 'Terra-Former',
    version: 'v1.0',
    desc: 'Satellite telemetry reconstruction. Stream elevation data to generate 3D topographic models.',
    specs: ['Mapbox API', 'Real-world Scale', 'City Data'],
    icon: Mountain,
    path: '/geo',
    color: 'cyan',
    video: '/module_videos/building_top.mov'
  }
];

export default function Hub() {
  return (
    <div className="bg-zinc-950 min-h-screen text-white selection:bg-cyan-500 selection:text-black">
      <Header />
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(34,211,238,0.15),transparent)]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div className="relative z-10 pt-28 md:pt-32 pb-20 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-10 md:mb-16">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={14} className="text-cyan-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">System Ready // Select Protocol</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
            Production <span className="text-cyan-500">Hub</span>
          </h1>
        </div>

        {/* Big Protocol List */}
        <div className="space-y-8 md:space-y-6">
          {PROTOCOLS.map((mod) => (
            <Link 
              key={mod.id} 
              to={mod.path}
              className="group relative flex flex-col lg:flex-row bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:bg-zinc-900/60 transition-all duration-500 active:scale-[0.98] md:active:scale-100"
            >
              {/* Video Preview Side - Adjusted height for mobile */}
              <div className="lg:w-1/3 h-48 sm:h-64 lg:h-auto relative overflow-hidden border-b lg:border-b-0 lg:border-r border-zinc-800">
                <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover transition-all duration-700 
                      /* Mobile State: Full color and brighter */
                      grayscale-0 opacity-80 scale-100
                      
                      /* Desktop State: Grayscale and dimmed until hover */
                      md:grayscale md:opacity-40 md:scale-105
                      
                      /* Desktop Hover State */
                      md:group-hover:grayscale-0 md:group-hover:opacity-100 md:group-hover:scale-100"
                  >
                    <source src={mod.video} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent"></div>
                <div className={`absolute bottom-4 left-4 flex items-center gap-2 text-${mod.color}-400`}>
                  <mod.icon size={18} />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{mod.version}</span>
                </div>
              </div>

              {/* Content Side */}
              <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight group-hover:text-cyan-400 transition-colors">
                      {mod.name}
                    </h2>
                    <Zap size={16} className="text-zinc-700 group-hover:text-cyan-500 transition-colors hidden sm:block" />
                  </div>
                  <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-2xl mb-6">
                    {mod.desc}
                  </p>
                  
                  {/* Specs Tags - More scrollable/wrappable on mobile */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {mod.specs.map(spec => (
                      <span key={spec} className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-[8px] md:text-[9px] font-bold uppercase tracking-tighter text-zinc-500">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status Bar - Responsive Flex */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-6 border-t border-white/5 gap-4">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                       <Shield size={10} className="text-emerald-500" />
                       <span className="text-[8px] md:text-[9px] font-bold uppercase text-zinc-600">Secure</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Cpu size={10} className="text-cyan-500" />
                       <span className="text-[8px] md:text-[9px] font-bold uppercase text-zinc-600">Optimized</span>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] group-hover:translate-x-1 md:group-hover:translate-x-2 transition-transform text-cyan-500 sm:text-white sm:group-hover:text-cyan-500">
                    <span className="sm:inline">Initialize Protocol</span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}