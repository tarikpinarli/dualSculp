import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Instagram, ArrowUpRight } from 'lucide-react';

export const Footer = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 pt-16 md:pt-20 pb-10 px-6 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent shadow-[0_0_50px_rgba(6,182,212,0.2)]"></div>

      <div className="max-w-7xl mx-auto">
        {/* Main Grid: Changed to text-center on mobile for better balance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 mb-16 text-center md:text-left">
          
          {/* Brand Column */}
          <div className="md:col-span-1 flex flex-col items-center md:items-start">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <img src="/favicon.png" alt="Logo" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" />
              <span className="text-lg font-black tracking-tighter text-white uppercase">
                Cross<span className="text-cyan-500">Cast</span>
              </span>
            </Link>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6 max-w-xs">
              Bridging the gap between digital pixels and physical matter. High-precision generative design for the modern maker.
            </p>
            <div className="flex gap-6 md:gap-4">
              {/* Increased gap for easier touch on mobile */}
              <a href="#" className="text-zinc-600 hover:text-cyan-500 transition-colors p-1"><Twitter size={18} /></a>
              <a href="#" className="text-zinc-600 hover:text-cyan-500 transition-colors p-1"><Github size={18} /></a>
              <a href="#" className="text-zinc-600 hover:text-cyan-500 transition-colors p-1"><Instagram size={18} /></a>
            </div>
          </div>

          {/* Engines Column */}
          <div className="hidden sm:block">
            <h4 className="text-white text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Production Engines</h4>
            <ul className="space-y-4 text-xs font-medium text-zinc-500">
              <li><Link to="/app/intersection" className="hover:text-cyan-400 transition-colors flex items-center justify-center md:justify-start gap-1 py-1">Shadow Caster <ArrowUpRight size={10}/></Link></li>
              <li><Link to="/wall-art" className="hover:text-cyan-400 transition-colors flex items-center justify-center md:justify-start gap-1 py-1">Luminance <ArrowUpRight size={10}/></Link></li>
              <li><Link to="/geo" className="hover:text-cyan-400 transition-colors flex items-center justify-center md:justify-start gap-1 py-1">Terra-Former <ArrowUpRight size={10}/></Link></li>
            </ul>
          </div>

          {/* Platform Column */}
          <div>
            <h4 className="text-white text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Platform</h4>
            <ul className="space-y-4 text-xs font-medium text-zinc-500">
              <li><Link to="/solutions" className="hover:text-cyan-400 transition-colors block py-1">Solutions</Link></li>
              <li><Link to="/technology" className="hover:text-cyan-400 transition-colors block py-1">Technology</Link></li>
              <li><Link to="/showcase" className="hover:text-cyan-400 transition-colors block py-1">Showcase</Link></li>
              <li><Link to="/pricing" className="hover:text-cyan-400 transition-colors block py-1">Pricing</Link></li>
              <li><Link to="/hub" className="hover:text-cyan-400 transition-colors block py-1">Launch Hub</Link></li>
            </ul>
          </div>

          {/* Support/System Column */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="text-white text-[10px] font-bold uppercase tracking-[0.2em] mb-6">System Status</h4>
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl w-full max-w-[240px]">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-500 tracking-wider">All Systems Nominal</span>
              </div>
              <p className="text-[10px] text-zinc-600 leading-tight text-center md:text-left">
                Mesh compute clusters active. API nodes online.
              </p>
            </div>
            <button 
              onClick={scrollToTop}
              className="mt-8 md:mt-6 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors py-2"
            >
              Back to Surface ↑
            </button>
          </div>
        </div>

        {/* Bottom Bar: Stacked on mobile, row on desktop */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-zinc-900 gap-6">
          <p className="text-[9px] md:text-[10px] text-zinc-600 font-mono uppercase tracking-[0.1em] text-center">
            © 2025 CROSSCAST SYSTEMS // DESIGNED FOR MAKERS
          </p>
          <div className="flex gap-6 md:gap-8 text-[9px] md:text-[10px] text-zinc-600 font-mono uppercase">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};