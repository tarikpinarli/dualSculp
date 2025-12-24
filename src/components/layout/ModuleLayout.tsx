/**
 * THE MODULE CONTAINER (The Skeleton)
 * * Concept:
 * Think of this as the "chassis" of a car. It provides the frame, 
 * the dashboard (Header), and the seats (Sidebar + Viewer).
 * * * Why we need it:
 * Instead of copying the header, background, and grid layout into 
 * every new tool we build, we just wrap the tool in this component.
 * It ensures every page feels like part of the same "CrossCast" system.
 */

import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ModuleLayoutProps {
  title: string;
  subtitle: string;
  color: string; // 'cyan' | 'purple'
  onExport: () => void;
  canExport: boolean;
  sidebar: ReactNode;
  children: ReactNode; // This is the Viewer
}

export const ModuleLayout = ({ title, subtitle, color, onExport, canExport, sidebar, children }: ModuleLayoutProps) => {
  
  // Dynamic color classes
  const buttonHover = color === 'purple' ? 'hover:shadow-[0_0_30px_rgba(192,132,252,0.5)]' : 'hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]';
  const scrollbarHover = color === 'purple' ? 'bg-purple-800' : 'bg-cyan-700';
  const glowColor = color === 'purple' ? 'bg-purple-500/40' : 'bg-cyan-500/40';
  const subtitleColor = color === 'purple' ? 'text-purple-400/80' : 'text-cyan-400/80';

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-zinc-300 font-sans tracking-tight overflow-hidden relative">
       
       {/* Background Ambience */}
       <div className={`absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] ${color === 'purple' ? 'bg-purple-900/20' : 'bg-cyan-900/20'} rounded-full blur-[120px] pointer-events-none z-0`}></div>

       {/* Header */}
       <header className="relative z-30 flex items-center justify-between px-4 md:px-8 py-4 bg-black/40 backdrop-blur-sm border-b border-white/5 flex-shrink-0">
         
         <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="relative transition-transform group-hover:scale-110 duration-500">
                <div className={`absolute inset-0 ${glowColor} blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                <img src="/favicon.png" alt="Logo" className="relative w-11 h-11 object-contain opacity-90 invert-0" />
            </div>
            <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {title}
                </h1>
                <span className={`text-[8px] md:text-[9px] ${subtitleColor} font-mono uppercase tracking-[0.2em]`}>
                    {subtitle}
                </span>
            </div>
         </Link>

         <button 
             onClick={onExport}
             disabled={!canExport}
             className={`px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-sm ${buttonHover}`}
           >
             Export .STL
         </button>
       </header>

       {/* Main Grid */}
       <main className="relative z-10 flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
          
          {/* Viewer Area */}
          {/* FIXES: 
              1. 'sticky top-0': keeps it fixed while you scroll settings.
              2. 'z-20': ensures it stays ON TOP of the scrolling settings.
              3. 'h-[35vh]': Reduced height on mobile (was 50vh) for that "strip" look.
          */}
          <section className="sticky top-0 z-20 w-full h-[35vh] md:h-auto md:relative md:flex-1 bg-black/90 md:bg-black/80 order-1 md:order-2 flex-shrink-0 shadow-2xl md:shadow-none border-b border-white/10 md:border-b-0">
             {children}
          </section>

          {/* Sidebar */}
          <aside className={`
            order-2 md:order-1 
            w-full md:w-80 flex-shrink-0 
            bg-black/60 backdrop-blur-xl 
            border-t md:border-t-0 md:border-r border-white/10 
            p-6 
            h-auto md:h-full 
            md:overflow-y-auto custom-scrollbar
            [&::-webkit-scrollbar]:w-1.5 
            [&::-webkit-scrollbar-track]:bg-black 
            [&::-webkit-scrollbar-thumb]:bg-zinc-800 
            [&::-webkit-scrollbar-thumb]:rounded-full 
            [&::-webkit-scrollbar-thumb:hover]:${scrollbarHover}
          `}>
            {sidebar}
          </aside>
       </main>
    </div>
  );
};