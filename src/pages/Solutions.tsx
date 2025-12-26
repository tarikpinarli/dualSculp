import React from 'react';
import { Link } from 'react-router-dom'; // Added Link for routing
import { Header } from '../components/layout/Header';
import { Zap, ShoppingBag, Palette, Gift, ArrowRight, Layers, Map, Camera } from 'lucide-react';
import { Footer } from '../components/layout/Footer';

const SOLUTION_CARDS = [
  { 
    title: "Bespoke Sculpting", 
    desc: "Utilize our dual-silhouette intersection engine to create custom projection lamps. Perfect for unique gifts that project two distinct memories from a single object.", 
    icon: Gift,
    tag: "SHADOW CASTER",
    path: "/app/intersection" // Added path
  },
  { 
    title: "Precision GIS Models", 
    desc: "Stream real-world topography via satellite telemetry. Generate 3D maps for urban planning, educational geography, or high-end office decor.", 
    icon: Map,
    tag: "TERRA-FORMER",
    path: "/geo" // Added path
  },
  { 
    title: "Tactile Photography", 
    desc: "Convert standard JPG/PNG assets into sub-millimeter depth maps. Create lithophanes and relief art that react dynamically to physical light sources.", 
    icon: Camera,
    tag: "LUMINANCE",
    path: "/wall-art" // Added path
  }
];

export default function Solutions() {
  return (
    <div className="bg-zinc-950 min-h-screen text-white selection:bg-cyan-500 selection:text-black">
      <Header />
      
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.08),transparent)]"></div>
      </div>

      <div className="relative z-10 pt-28 md:pt-40 pb-20 px-6 max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="border-l-2 md:border-l-4 border-cyan-500 pl-5 md:pl-8 mb-12 md:mb-20">
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-none italic">
              Production <br className="sm:hidden" />
              <span className="text-cyan-500">Geometry</span> <br className="hidden md:block" /> Solutions
            </h1>
            <p className="text-zinc-500 mt-6 max-w-2xl text-xs md:text-sm uppercase font-bold tracking-widest leading-relaxed">
              From raw telemetry and pixel data to manifold STL assets. CrossCast provides the computational bridge for high-value additive manufacturing.
            </p>
        </div>

        {/* Solutions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {SOLUTION_CARDS.map((item, i) => (
            <Link // Changed div to Link for better SEO and UX
              key={i} 
              to={item.path}
              className="group bg-zinc-900/20 border border-zinc-800/50 p-6 md:p-8 rounded-2xl hover:bg-zinc-900/60 hover:border-cyan-500/30 transition-all duration-500 active:scale-[0.98] md:active:scale-100 flex flex-col"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
                  <item.icon className="text-cyan-500" size={20} />
                </div>
                <span className="text-[8px] font-mono font-bold text-zinc-600 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 tracking-tighter">
                  {item.tag}
                </span>
              </div>
              
              <h3 className="text-lg font-black uppercase mb-3 tracking-tight italic">{item.title}</h3>
              <p className="text-zinc-500 text-[11px] leading-relaxed mb-8 flex-grow uppercase font-medium">
                {item.desc}
              </p>
              
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500 group-hover:gap-4 transition-all">
                Initialize Engine <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>

        {/* Technical Validation Section */}
        <div className="mt-16 md:mt-32 grid grid-cols-1 md:grid-cols-2 gap-12 items-center border-t border-zinc-900 pt-16 md:pt-24">
            <div>
                <h2 className="text-2xl md:text-4xl font-black uppercase italic mb-6">Manifold by <span className="text-cyan-500">Design</span></h2>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                    Unlike traditional 3D software that creates "leaky" meshes, CrossCast engines use strictly manifold Boolean logic. Every export is 100% slice-ready.
                </p>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-1 bg-cyan-500 rounded-full"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Water-tight geometry guaranteed</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-1 bg-cyan-500 rounded-full"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Optimized for FDM, SLA, and SLS</span>
                    </div>
                </div>
            </div>
            
            <div className="relative aspect-square md:aspect-video bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden flex items-center justify-center group">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                <Layers className="text-zinc-800 group-hover:text-cyan-500/20 transition-colors duration-700" size={120} />
                <div className="absolute bottom-6 left-6 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Mesh Validator Online</span>
                </div>
            </div>
        </div>

        {/* CTA Section */}
        <Link 
          to="/hub" // Connect to Hub
          className="mt-16 md:mt-32 p-10 md:p-20 bg-cyan-500 rounded-[2.5rem] flex flex-col items-center text-center group active:scale-[0.99] transition-transform block"
        >
            <h2 className="text-3xl md:text-6xl font-black uppercase text-black italic tracking-tighter leading-none mb-6">
                Ready to <br className="md:hidden" /> Manufacture?
            </h2>
            <p className="text-black/70 max-w-xl text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] leading-relaxed mb-10">
                Join thousands of makers bypassing the CAD learning curve. Create your first production-ready model in seconds.
            </p>
            <div className="bg-black text-white px-10 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] group-hover:bg-zinc-900 transition-all flex items-center gap-3 shadow-2xl">
              Get Started <ArrowRight size={16} />
            </div>
        </Link>
      </div>
      <Footer />
    </div>
  );
}