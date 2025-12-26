import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight, Github } from 'lucide-react';

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Handle scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 border-b ${
        isScrolled || isMobileMenuOpen 
          ? 'bg-zinc-950/90 backdrop-blur-md py-3 border-zinc-800' 
          : 'bg-transparent py-5 border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group z-[110]">
            <img src="/favicon.png" alt="Logo" className="w-8 h-8 group-hover:rotate-12 transition-transform" />
            <span className="text-xl font-black tracking-tighter text-white uppercase">
              Cross<span className="text-cyan-500">Cast</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              <Link to="/solutions" className="hover:text-cyan-400 transition-colors">Solutions</Link>
              <Link to="/technology" className="hover:text-cyan-400 transition-colors">Technology</Link>
              <Link to="/showcase" className="hover:text-cyan-400 transition-colors">Showcase</Link>
              <Link to="/pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link>
            </div>
            
            <div className="h-4 w-px bg-zinc-800"></div>
            <Link 
              to="/hub" 
              className="bg-white text-black px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all hover:scale-105 active:scale-95"
            >
              Start Creating
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-zinc-400 hover:text-white transition-colors z-[110] p-2"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-[90] bg-zinc-950 transition-all duration-500 md:hidden ${
        isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05),transparent)] pointer-events-none" />
        
        <div className="flex flex-col h-full pt-32 px-10 pb-10">
          <div className="flex flex-col gap-8">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-2">Navigation</h4>
            {[
              { name: 'Solutions', path: '/solutions' },
              { name: 'Technology', path: '/technology' },
              { name: 'Showcase', path: '/showcase' },
              { name: 'Pricing', path: '/pricing' },
              { name: 'Launch Hub', path: '/hub' }
            ].map((link) => (
              <Link 
                key={link.name}
                to={link.path}
                className="text-3xl font-black text-white uppercase tracking-tighter hover:text-cyan-500 flex items-center justify-between group"
              >
                {link.name}
                <ArrowUpRight className="text-zinc-800 group-hover:text-cyan-500 transition-colors" size={24} />
              </Link>
            ))}
          </div>

          <div className="mt-auto">
            <div className="h-px w-full bg-zinc-900 mb-8" />
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-mono text-zinc-600 uppercase mb-4 tracking-widest">Connect</p>
                <div className="flex gap-6">
                  <a href="#" className="text-zinc-400"><Github size={20} /></a>
                  <a href="#" className="text-zinc-400 uppercase font-black text-[14px]">TW</a>
                  <a href="#" className="text-zinc-400 uppercase font-black text-[14px]">IG</a>
                </div>
              </div>
              <Link 
                to="/hub" 
                className="bg-cyan-500 text-black px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95"
              >
                Launch App
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};