import React from 'react';
import { Link } from 'react-router-dom';
import { Copy, Box, Mountain, ArrowRight, ShieldCheck, Cpu, Activity, Zap, Layers } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

const MODULES = [
  { 
    id: 'shadow', 
    name: 'Shadow Caster', 
    desc: 'Bespoke CSG intersection logic. Calculate the volumetric overlap of dual silhouettes to generate 3D projection lamps.', 
    icon: Copy, 
    path: '/app/intersection', 
    status: 'OPERATIONAL', 
    color: 'cyan', 
    videoOverlay: '/module_videos/apple_steve_shadow.mov' 
  },
  { 
    id: 'litho', 
    name: 'Luminance', 
    desc: 'Advanced sub-millimeter displacement mapping. Transform high-bit-rate images into light-reactive physical relief art.', 
    icon: Box, 
    path: '/wall-art', 
    status: 'OPERATIONAL', 
    color: 'zinc', 
    videoOverlay: '/module_videos/tablo.mov' 
  },
  { 
    id: 'geo', 
    name: 'Terra-Former', 
    desc: 'Streaming GIS telemetry reconstruction. Convert Mapbox elevation datasets into high-fidelity topographic models.', 
    icon: Mountain, 
    path: '/geo', 
    status: 'OPERATIONAL', 
    color: 'cyan', 
    videoOverlay: '/module_videos/building_top.mov' 
  }
];

const ManifestoSection = () => (
    <section className="py-16 md:py-32 px-6 relative border-y border-white/5 bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:auto-rows-[280px]">
          
          {/* Main Card: Value Proposition */}
          <div className="md:col-span-2 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-end min-h-[320px] md:min-h-0 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Layers size={180} />
            </div>
            <ShieldCheck className="text-cyan-500 mb-6" size={40} />
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase leading-[0.9] tracking-tighter italic">
              Computational <br /><span className="text-cyan-500">Foundry.</span>
            </h2>
            <p className="text-zinc-500 text-sm md:text-base mt-4 max-w-sm uppercase font-bold tracking-tight">
              We bypass the CAD learning curve. Our engines convert raw data into manifold, slice-ready geometry in real-time.
            </p>
          </div>

          {/* Speed Card: The "Flex" */}
          <div className="bg-cyan-500 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center py-12 md:py-0 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-black animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">Compute Latency</span>
            </div>
            <span className="text-6xl md:text-7xl font-black text-black italic tracking-tighter">0.2s</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/60 mt-2 italic">Standardized Mesh Generation</span>
          </div>

          {/* Capability Card */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 flex flex-col justify-between">
            <Cpu className="text-cyan-500" size={32} />
            <div>
                <h4 className="text-white font-black uppercase text-sm tracking-widest italic">Parallel Ops</h4>
                <p className="text-zinc-500 text-[11px] mt-2 uppercase font-bold leading-tight">
                    Optimized for high-poly Boolean operations and satellite stream decoding.
                </p>
            </div>
          </div>

          {/* Technology Guarantee */}
          <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-800/50 rounded-[2.5rem] p-8 flex flex-col sm:flex-row items-center gap-8 group">
            <div className="w-full sm:w-1/2">
                <div className="flex items-center gap-2 mb-4 text-emerald-500">
                    <Activity size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Topology Verified</span>
                </div>
                <h4 className="text-white font-black uppercase text-xl mb-2 italic">Manifold Guarantee</h4>
                <p className="text-zinc-500 text-[11px] uppercase font-bold leading-relaxed">
                    Every export is strictly water-tight. Guaranteed to pass topology checks in OrcaSlicer, PrusaSlicer, and Cura. No failed prints.
                </p>
            </div>
            <div className="hidden md:block flex-1 h-32 bg-zinc-900/50 rounded-2xl border border-white/5 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
);

export default function Landing() {
  return (
    <div className="bg-zinc-950 text-zinc-200 font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      <Header />
      
      {/* Dynamic Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div>
        <div className="absolute top-0 left-0 w-full h-screen bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950"></div>
      </div>

      <div className="relative z-10">
          {/* Hero Section */}
          <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center pt-20 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full"></div>
                <div className="relative p-5 md:p-7 rounded-full bg-zinc-900 border border-zinc-800 shadow-2xl">
                    <img src="/favicon.png" alt="Logo" className="w-14 h-14 md:w-20 md:h-20" />
                </div>
            </div>

            <h1 className="text-[16vw] md:text-[12vw] font-black tracking-tighter text-white uppercase leading-[0.8] mb-10">
              Cross<span className="text-cyan-500 italic">Cast</span>
            </h1>

            <div className="max-w-3xl">
              <p className="text-zinc-500 text-xs md:text-sm font-black uppercase tracking-[0.4em] mb-4">
                Generative Manufacturing Protocol v2.0
              </p>
              <h2 className="text-2xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-tight mb-12">
                Stop printing trinkets.<br />
                Manufacture <span className="text-cyan-500 underline decoration-zinc-800 underline-offset-8">Physical Value.</span>
              </h2>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/hub" className="bg-white text-black px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-cyan-500 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    Initialize Hub
                  </Link>
                  <a href="#modules" className="text-zinc-500 px-10 py-4 text-xs font-black uppercase tracking-[0.2em] border border-zinc-800 rounded-full hover:bg-zinc-900 transition-all">
                    View Modules
                  </a>
              </div>
            </div>

            {/* Scroll Decor */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-700">
                <div className="w-px h-12 bg-gradient-to-b from-cyan-500 to-transparent"></div>
            </div>
          </section>

          <ManifestoSection />

          {/* Modules Section */}
          <section id="modules" className="py-24 md:py-40 px-6 bg-zinc-950">
            <div className="max-w-7xl mx-auto">
                <div className="mb-20">
                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter mb-4">Production <span className="text-cyan-500">Engines.</span></h2>
                    <p className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-widest max-w-xl">
                        Select a specialized computational module to transform digital intent into physical matter.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {MODULES.map((mod) => (
                        <Link 
                          key={mod.id} 
                          to={mod.path} 
                          className="group relative flex flex-col rounded-[2rem] overflow-hidden h-[450px] bg-zinc-900/30 border border-zinc-800/50 hover:border-cyan-500 transition-all active:scale-[0.98] md:active:scale-100"
                        >
                            <div className="relative h-[55%] w-full bg-zinc-950 overflow-hidden border-b border-white/5">
                                <video autoPlay loop muted playsInline className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-40 group-hover:opacity-100 scale-110 group-hover:scale-100">
                                  <source src={mod.videoOverlay} type="video/mp4" />
                                </video>
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-60"></div>
                            </div>
                            <div className="p-8 h-[45%] flex flex-col justify-between group-hover:bg-cyan-500/5 transition-colors">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter group-hover:text-cyan-400">
                                            {mod.name}
                                        </h3>
                                        <mod.icon size={20} className="text-zinc-700 group-hover:text-cyan-500 transition-colors"/>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 font-bold uppercase leading-relaxed line-clamp-2">{mod.desc}</p>
                                </div>
                                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                                            {mod.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white group-hover:translate-x-2 transition-transform tracking-widest">
                                      Launch <ArrowRight size={14} className="text-cyan-500" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
          </section>
      </div>
      <Footer />
    </div>
  );
}