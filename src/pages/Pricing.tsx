import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Check, Cpu, Globe, Layers, ArrowRight, Camera, Scissors, ShieldCheck, Box } from 'lucide-react';
import { Footer } from '../components/layout/Footer';

const MODULE_DATA = [
  {
    id: 'shadow',
    name: 'Shadow Caster',
    price: '0.99',
    icon: Scissors,
    desc: 'Dual-silhouette intersection engine using Constructive Solid Geometry (CSG) to merge two profiles.',
    specs: [
      'Manifold STL Export',
      'Boolean Volume Intersect',
      'Automatic Mesh Capping',
      'Optimized for FDM Printing'
    ]
  },
  {
    id: 'litho',
    name: 'Luminance',
    price: '0.99',
    icon: Camera,
    desc: 'High-precision grayscale displacement mapping. Translates pixel luminance into physical Z-height.',
    specs: [
      'Sub-millimeter Surface Detail',
      'Custom Edge Framing',
      'Light-Reactive Topography',
      'Optimized for SLA/Resin'
    ]
  },
  {
    id: 'geo',
    name: 'Terra-Former',
    price: '1.99',
    icon: Globe,
    desc: 'Real-world topographic reconstruction using global satellite elevation data (GIS).',
    specs: [
      'Mapbox GIS Telemetry',
      'Urban Block Extrusion',
      '1:1 Scale Accuracy',
      'Watertight Terrain Mesh'
    ]
  }
];

export default function Pricing() {
  return (
    <div className="bg-zinc-950 min-h-screen text-white selection:bg-cyan-500 selection:text-black">
      <Header />
      
      <div className="relative z-10 pt-28 md:pt-40 pb-20 px-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16 md:mb-24">
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter mb-6 italic">
            Compute <span className="text-cyan-500">Credits</span>
          </h1>
          <p className="text-zinc-500 text-[10px] md:text-xs max-w-2xl mx-auto leading-relaxed uppercase font-bold tracking-[0.3em]">
            Free to design. Pay only for manufacturing-ready exports. <br />
            Credits cover the server-side processing required to generate complex geometry.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {MODULE_DATA.map((mod) => (
            <div 
              key={mod.id}
              className="flex flex-col p-8 rounded-3xl bg-zinc-900/20 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 group"
            >
              <div className="mb-8">
                <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:border-cyan-500/50 transition-colors">
                  <mod.icon className="text-cyan-500" size={20} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">
                  {mod.name} Engine
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black italic tracking-tighter">${mod.price}</span>
                  <span className="text-zinc-600 font-bold uppercase text-[10px]">/ export</span>
                </div>
              </div>

              <p className="text-zinc-400 text-[11px] leading-relaxed uppercase font-medium mb-8 h-12">
                {mod.desc}
              </p>

              <div className="space-y-4 mb-10 flex-1 border-t border-zinc-800/50 pt-6">
                {mod.specs.map((spec) => (
                  <div key={spec} className="flex items-start gap-3">
                    <Check size={14} className="text-cyan-500 mt-0.5" />
                    <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-tight">{spec}</span>
                  </div>
                ))}
              </div>

              <Link 
                to="/hub"
                className="w-full py-4 bg-zinc-800 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] italic hover:bg-cyan-500 hover:text-black transition-all flex items-center justify-center gap-2"
              >
                Launch Protocol <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        {/* Manufacturing Standards - The Real Value */}
        <div className="mt-20 border-t border-zinc-900 pt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="text-2xl md:text-4xl font-black uppercase italic mb-6 leading-tight text-white">
                Engineered for <br /><span className="text-cyan-500">Zero-Waste</span> Printing
              </h2>
              <p className="text-zinc-500 text-xs leading-relaxed mb-6 uppercase font-bold tracking-tight">
                A "leaky" mesh leads to failed prints and wasted material. Every CrossCast export undergoes a cloud-based topological audit to ensure it is 100% water-tight.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800 flex items-center gap-3">
                  <ShieldCheck className="text-cyan-500 shrink-0" size={20} />
                  <span className="text-[9px] font-black uppercase text-zinc-300">Manifold Guaranteed</span>
                </div>
                <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800 flex items-center gap-3">
                  <Box className="text-cyan-500 shrink-0" size={20} />
                  <span className="text-[9px] font-black uppercase text-zinc-300">Standard STL/Binary</span>
                </div>
              </div>
            </div>

            <div className="relative p-8 bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-mono text-emerald-500 uppercase font-bold tracking-widest">Topology: Passed</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-cyan-500/50"></div>
                    </div>
                    <div className="h-1.5 w-3/4 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-cyan-500/50"></div>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-tight italic pt-4">
                    "The mesh is checked for non-manifold edges, self-intersections, and inverted normals before you download."
                  </p>
                </div>
            </div>
          </div>
          
        </div>

        {/* Support Banner */}
        <div className="py-8 bg-zinc-900/20 border-y border-zinc-900 flex flex-col md:flex-row items-center justify-between px-10 gap-6">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">
              Node Location: Render-EU-01 // SSL Secured
            </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
              <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-[0.3em]">
                Instant STL Delivery
              </p>
            </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}