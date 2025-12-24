/**
 * THE CYBER SLIDER (UI Lego Block)
 * * Concept:
 * A reusable slider component with "Holographic" click-to-view tooltips.
 * It enforces consistent design across all modules.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

// Reusable Holographic Tooltip (Internal)
const InfoTooltip = ({ text, color = "cyan" }: { text: string, color?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Dynamic colors for the "Hologram" effect
  const borderColor = color === 'purple' ? 'border-purple-500' : 'border-cyan-500';
  const shadowColor = color === 'purple' ? 'shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'shadow-[0_0_15px_rgba(34,211,238,0.3)]';
  const iconColor = color === 'purple' ? 'text-purple-400' : 'text-cyan-400';

  return (
    <div ref={wrapperRef} className="relative ml-1.5 inline-flex items-center justify-center z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`focus:outline-none cursor-pointer transition-all duration-300 ${isOpen ? iconColor + ' scale-110' : 'text-zinc-600 hover:text-zinc-300'}`}
      >
        <Info size={10} />
      </button>
      
      {/* THE HOLOGRAPHIC POPUP */}
      <div className={`
          absolute bottom-full mb-3 w-48 p-3 
          bg-black/95 backdrop-blur-xl
          border ${borderColor} rounded-sm 
          ${shadowColor}
          text-[10px] normal-case font-medium text-zinc-300 leading-relaxed
          left-1/2 -translate-x-1/2 z-50 text-center
          transition-all duration-200 ease-out origin-bottom
          ${isOpen ? 'opacity-100 visible scale-100 translate-y-0' : 'opacity-0 invisible scale-95 translate-y-2'}
      `}>
         {/* Close Icon */}
         <div className="absolute top-1 right-1 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setIsOpen(false)}>
            <X size={8} />
         </div>

         {/* The Data Text */}
         {text}

         {/* The Little Triangle Arrow at the bottom */}
         <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-${color === 'purple' ? 'purple-500' : 'cyan-500'}`}></div>
      </div>
    </div>
  );
};

interface SliderProps {
  label: string;
  // 👇 FIXED: Explicitly tell TS that this icon accepts a 'size' prop
  icon: React.ElementType<{ size?: number | string; className?: string }>; 
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  tooltip?: string;
  unit?: string;
  color?: string; 
}

export const CyberSlider = ({ label, icon: Icon, value, onChange, min, max, step=1, tooltip, unit, color="cyan" }: SliderProps) => {
  return (
    <div className="group">
      <div className={`flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-${color}-400 transition-colors`}>
          <span className="flex items-center gap-1">
            <Icon size={10}/> {label} {tooltip && <InfoTooltip text={tooltip} color={color} />}
          </span>
          <span className="font-mono text-white">{value} {unit}</span>
      </div>
      <input 
        type="range" 
        min={min} max={max} step={step} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))} 
        className={`w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-${color}-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
      />
    </div>
  );
};