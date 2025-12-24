import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Mic, Box, ArrowRight, Lock, Activity, Copy, ChevronDown, Mountain } from 'lucide-react';

// --- DATA ---
const MODULES = [
  {
    id: 'shadow',
    name: 'Shadow Caster',
    desc: 'Turn two silhouettes into one magical object. Create custom projection lamps in under 60 seconds.',
    icon: Copy, 
    path: '/app/intersection',
    status: 'ONLINE',
    color: 'cyan',
    videoOverlay: '/module_videos/apple_steve_shadow.mov'
  },
  {
    id: 'meshy',
    name: 'Neural Latent',
    desc: 'Generative AI 3D modeling. Upload a single 2D image and let our neural core hallucinate a 3D mesh in seconds.',
    icon: Activity, 
    path: '/meshy',
    status: 'ONLINE', 
    color: 'purple',
    videoOverlay: null 
  },
  {
    id: 'litho',
    name: 'Luminance',
    desc: 'Convert any photo into a high-precision lithophane. No complex settings—just upload, preview, and print.',
    icon: Box,
    path: '/wall-art',
    status: 'ONLINE',
    color: 'zinc',
    videoOverlay: '/module_videos/tablo.mov'
  },
  // 👇 NEW MODULE ADDED HERE
  {
    id: 'geo',
    name: 'Terra-Former',
    desc: 'Topographic generator. Stream real-world satellite telemetry to create solid, printable terrain of any location on Earth.',
    icon: Mountain,
    path: '/geo',
    status: 'ONLINE',
    color: 'cyan',
    videoOverlay: null // Placeholder for now
  }
];

export default function Landing() {
  return (
    <div className="bg-zinc-950 text-zinc-200 font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      
      {/* --- BACKGROUND: FIXED VIEWPORT --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Infinite Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Dynamic Spotlight */}
        <div className="fabsolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,rgba(34,211,238,0.05),transparent)] animate-pulse"></div>
        {/* Vignette */}
        <div className="absolute inset-0 bg-radial-vignette opacity-40"></div>
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="relative z-10">
      
          {/* --- HERO SECTION (Full Screen Height) --- */}
          <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
            
            {/* Logo Area */}
            <div className="mb-8 p-6 rounded-full bg-zinc-900/50 border border-zinc-800 shadow-2xl backdrop-blur-sm">
                <img 
                  src="/favicon.png" 
                  alt="CrossCast Logo" 
                  className="w-24 h-24 object-contain" 
                />
            </div>

            {/* Typography */}
            <div className="flex items-center gap-3 mb-4">
                 <div className="h-px w-8 bg-zinc-700"></div>
                 <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500">
                    No CAD Skills Required
                 </span>
                 <div className="h-px w-8 bg-zinc-700"></div>
            </div>

            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase text-center mb-8 drop-shadow-2xl">
              Cross<span className="text-cyan-500">Cast</span>
            </h1>
            
            <p className="max-w-xl text-center text-zinc-400 text-sm md:text-lg leading-relaxed font-light">
              <strong className="text-zinc-100 block mb-2 text-xl">Stop printing trinkets. Start manufacturing meaning.</strong>
              The generative design suite for modern makers. Create high-value, personalized products in seconds—ready to slice and print.
            </p>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 flex flex-col items-center gap-2 animate-bounce opacity-50">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">Select Protocol</span>
                <ChevronDown className="text-cyan-500" />
            </div>
          </section>


          {/* --- MODULES SECTION --- */}
          <section className="min-h-screen py-24 px-6 bg-gradient-to-b from-transparent to-zinc-950/80">
            <div className="max-w-6xl mx-auto">
                
                {/* Section Header */}
                <div className="mb-16 md:pl-4 border-l-4 border-cyan-500/30">
                    <h2 className="text-3xl font-bold text-white uppercase tracking-tight mb-2">
                        Production Modules
                    </h2>
                    <p className="text-zinc-400 max-w-2xl text-sm md:text-base">
                        Select a specialized engine below to begin your workflow.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {MODULES.map((mod) => (
                    <Link 
                        key={mod.id} 
                        to={mod.path}
                        className={`
                        group relative flex flex-col rounded-xl overflow-hidden h-[420px] transition-all duration-300
                        /* Clean Card Styling */
                        bg-zinc-900/90 backdrop-blur-sm border border-zinc-800
                        hover:border-zinc-600 hover:shadow-2xl hover:-translate-y-1
                        focus:outline-none focus:ring-2 focus:ring-${mod.color}-500 focus:ring-offset-2 focus:ring-offset-zinc-950
                        ${mod.status === 'OFFLINE' ? 'opacity-60 grayscale cursor-not-allowed pointer-events-none' : ''}
                        `}
                    >
                        
                        {/* Video Preview */}
                        <div className="relative h-[55%] w-full bg-zinc-950 border-b border-zinc-800 group-hover:border-zinc-700 transition-colors">
                            {mod.videoOverlay ? (
                                <video 
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline 
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                >
                                    <source src={mod.videoOverlay} type="video/mp4" />
                                </video>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-700 font-mono text-xs uppercase tracking-widest">
                                    <Activity size={24} className="mb-2 opacity-50" />
                                    No Signal
                                </div>
                            )}
                            
                            {/* Live Dot */}
                            {mod.status === 'ONLINE' && (
                            <div className="absolute top-3 right-3 z-20">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]"></div>
                            </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex flex-col justify-between h-[45%] p-6 bg-transparent group-hover:bg-zinc-800/50 transition-colors">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`text-${mod.color}-400`}>
                                        <mod.icon size={20} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                                        {mod.name}
                                    </h3>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                                    {mod.desc}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 group-hover:border-zinc-700">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                    mod.status === 'ONLINE' 
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                }`}>
                                    {mod.status}
                                </span>
                                
                                <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                                    mod.status !== 'OFFLINE' ? 'text-white' : 'text-zinc-600'
                                }`}>
                                    {mod.status === 'ONLINE' || mod.status === 'DEV_BUILD' ? (
                                        <>Launch Tool <ArrowRight size={14} className="text-cyan-500" /></>
                                    ) : (
                                        <><Lock size={12} /> Locked</>
                                    )}
                                </div>
                            </div>
                        </div>

                    </Link>
                    ))}
                </div>
            </div>
          </section>


          {/* FOOTER */}
          <footer className="border-t border-zinc-900 py-12 text-center bg-zinc-950 relative">
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                CrossCast Systems © 2025 • Designed for Makers
            </p>
          </footer>
      </div>

    </div>
  );
}