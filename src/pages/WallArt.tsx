import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Play, RefreshCw, Box, Activity, Scaling, Info, ArrowLeft, Layers, Maximize2, Grid as GridIcon, Palette, Download, Ticket, CheckCircle, AlertCircle, X, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WallArtView } from '../components/WallArtView'; 
import { generateReliefGeometry, ReliefConfig, exportToSTL } from '../utils/reliefEngine';
import * as THREE from 'three';

// --- STRIPE IMPORTS ---
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PaymentForm } from '../components/PaymentForm';

// REPLACE WITH YOUR KEY
const stripePromise = loadStripe("pk_live_51SQbhxPxxqommwsY6g538an0Nbz8pskCfpH2xHV8Qk1gHzlIyim05DyxV4a870lAna8HP0McLoaDouK7O6XX0b2P0063byQlz1");

// --- 💡 TOOLTIP COMPONENT ---
const InfoTooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div ref={wrapperRef} className="relative ml-1.5 inline-flex items-center justify-center z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none cursor-pointer p-1 -m-1"
      >
        <Info 
          size={10} 
          className={`transition-colors duration-200 ${isOpen ? 'text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.8)]' : 'text-zinc-600 hover:text-zinc-300'}`} 
        />
      </button>
      
      <div className={`
          absolute bottom-full mb-2 w-48 p-3 
          bg-black/95 border border-purple-500/30 rounded-sm 
          text-[10px] normal-case font-medium text-zinc-300 leading-relaxed
          shadow-[0_0_20px_rgba(192,132,252,0.1)] backdrop-blur-xl 
          left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none
          transition-all duration-200 ease-out
          ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'}
      `}>
         {text}
         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-purple-500/30"></div>
      </div>
    </div>
  );
};

// --- COLOR PALETTES ---
const MATERIAL_COLORS = [
  { name: 'Plaster', hex: '#e4e4e7' }, 
  { name: 'Gold', hex: '#fbbf24' },    
  { name: 'Clay', hex: '#d97706' },    
  { name: 'Marble', hex: '#14b8a6' },  
  { name: 'Obsidian', hex: '#3f3f46' } 
];

const WALL_COLORS = [
  { name: 'Gallery White', hex: '#ffffff' },
  { name: 'Museum Grey', hex: '#71717a' },
  { name: 'Charcoal', hex: '#27272a' },
  { name: 'Midnight', hex: '#0f172a' },
  { name: 'Warm Beige', hex: '#f5f5dc' }
];

export default function WallArt() {
  const [image, setImage] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Dimensions
  const [heightCM, setHeightCM] = useState(25);
  const [aspectRatio, setAspectRatio] = useState(1);
  
  // Settings
  const [resolution, setResolution] = useState(300); 
  const [threshold, setThreshold] = useState(100);
  const [depth, setDepth] = useState(2.0); 
  const [isFlat, setIsFlat] = useState(true); 
  const [invert, setInvert] = useState(false);
  
  // --- COLORS (Updated Defaults) ---
  const [objectColor, setObjectColor] = useState(MATERIAL_COLORS[2].hex);
  const [wallColor, setWallColor] = useState(WALL_COLORS[2].hex);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Handle Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        const img = new Image();
        img.onload = () => {
            setAspectRatio(img.naturalWidth / img.naturalHeight);
            setImage(result);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const processGeometry = useCallback(async () => {
    if (!image) return;
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 50));

    try {
      const config: ReliefConfig = {
        width: heightCM * aspectRatio,
        height: heightCM, 
        depth, 
        threshold,
        detail: resolution, 
        invert,
        isFlat 
      };

      const geom = await generateReliefGeometry(image, config);
      setGeometry(geom);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  }, [image, heightCM, aspectRatio, depth, threshold, invert, isFlat, resolution]);

  // --- ⚡ AUTO UPDATE LOGIC ---
  useEffect(() => {
    if (!image) return;
    const timer = setTimeout(() => {
        processGeometry();
    }, 600); 
    return () => clearTimeout(timer);
  }, [processGeometry, image]);

  // Heartbeat to keep backend awake
  useEffect(() => {
    const ping = () => {
        fetch("https://shadow-sculpture-backend.onrender.com")
            .then(() => console.log("💓 Heartbeat sent"))
            .catch(e => console.error("Heartbeat failed", e));
    };
    ping();
    const intervalId = setInterval(ping, 10 * 60 * 1000); // 10 mins
    return () => clearInterval(intervalId);
  }, []);

  // --- ⚠️ SAFETY: PREVENT ACCIDENTAL REFRESH ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (geometry) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [geometry]);

  // --- PAYMENT / EXPORT LOGIC ---
  const handleExportClick = async () => {
    if (!geometry) return;
    setCouponInput("");
    setCouponMessage(null);
    setShowPaymentModal(true);
    try {
        const res = await fetch("https://shadow-sculpture-backend.onrender.com/create-payment-intent", {
            method: "POST", headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        setClientSecret(data.clientSecret);
    } catch (error) {
        alert("Server connection error.");
    }
  };

  const checkCoupon = () => {
    if (couponInput === "003611") {
        setCouponMessage({ type: 'success', text: "ACCESS GRANTED. BYPASSING PAYMENT..." });
        setTimeout(() => {
            handlePaymentSuccess();
        }, 1500);
    } else {
        setCouponMessage({ type: 'error', text: "ACCESS DENIED: INVALID CODE" });
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setClientSecret("");
    if (!geometry) return;
    
    const blob = exportToSTL(geometry);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixel-relief-model.stl`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const appearance = {
    theme: 'night' as const,
    variables: { colorPrimary: '#ffffff', colorBackground: '#000000', colorText: '#e2e8f0', colorDanger: '#ff3333' },
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-zinc-300 font-sans tracking-tight selection:bg-purple-500 selection:text-white overflow-hidden relative">
       
       {/* 🌌 ATMOSPHERE */}
       <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1.5px, transparent 1.5px)', backgroundSize: '60px 60px' }}>
       </div>
       <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse duration-[5000ms]"></div>
       <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none z-0 animate-pulse duration-[7000ms]"></div>
       <div className="absolute top-[72px] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-400/60 to-transparent z-20 shadow-[0_0_15px_rgba(192,132,252,0.6)]"></div>
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-0"></div>

       {/* HEADER */}
       <header className="relative z-10 flex items-center justify-between px-4 md:px-8 py-5 bg-black/40 backdrop-blur-sm flex-shrink-0">
         <div className="flex items-center gap-4 group cursor-default">
            {/* Back Button */}
            
            {/* Logo Section (Styled like App.tsx but Purple) */}
            <div className="flex items-center gap-3">
                <div className="relative transition-transform group-hover:scale-110 duration-500">
                    <div className="absolute inset-0 bg-purple-500/40 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <img src="/favicon.png" alt="Logo" className="relative w-11 h-11 object-contain opacity-90 invert-0" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg md:text-xl font-bold text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        Pixel Relief Engine
                    </h1>
                    <span className="text-[8px] md:text-[9px] text-purple-400/80 font-mono uppercase tracking-[0.2em]">Solid Core Mesher v2.1</span>
                </div>
            </div>
         </div>

         {/* EXPORT BUTTON */}
         <button 
             onClick={handleExportClick}
             disabled={!geometry}
             className="group relative px-4 md:px-6 py-2 bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider hover:bg-purple-50 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(192,132,252,0.5)]"
           >
             Export .STL
         </button>
       </header>

       <main className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* VIEWER AREA */}
          <section className="relative bg-black/80 order-1 md:order-2 w-full h-[45vh] md:h-auto md:flex-1 flex-shrink-0">
             <div className="absolute inset-0 pointer-events-none opacity-20" style={{backgroundImage: 'linear-gradient(rgba(192,132,252,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(192,132,252,0.1) 1px, transparent 1px)', backgroundSize: '100px 100px'}}></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>
             
             {/* THE VIEWER COMPONENT */}
             <WallArtView 
                geometry={geometry} 
                isSmooth={true} 
                isProcessing={isProcessing}
                color={objectColor}
                wallColor={wallColor}
                lightDistanceCM={100}
             />
             
             {/* Info Overlay */}
             {geometry && (
                 <div className="absolute bottom-6 right-6 pointer-events-none hidden md:block">
                     <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded-sm text-right shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                         <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Physical Dimensions</div>
                         <div className="text-sm text-white font-mono font-bold tracking-tight">
                             {(heightCM * aspectRatio).toFixed(1)} <span className="text-zinc-600 text-[9px]">cm</span> × {heightCM} <span className="text-zinc-600 text-[9px]">cm</span>
                         </div>
                     </div>
                 </div>
             )}
          </section>

          {/* SIDEBAR */}
          <aside className="
            order-2 md:order-1
            w-full md:w-80 flex-shrink-0 
            bg-black/60 backdrop-blur-xl 
            border-t md:border-t-0 
            p-6 overflow-y-auto custom-scrollbar 
            flex flex-col gap-6 relative 
            flex-1 md:flex-none
          ">
            
            {/* UPLOAD BOX: Fixed height & flex-shrink to prevent squashing */}
            <label className={`
                group relative h-72 flex-shrink-0 border transition-all duration-500 cursor-pointer flex flex-col items-center justify-center overflow-hidden
                ${image 
                  ? 'border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.2)] bg-zinc-900/40' 
                  : 'border-purple-500/30 bg-purple-950/10 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)] animate-[pulse_3000ms_ease-in-out_infinite] hover:border-purple-500/60 hover:bg-purple-900/20'
                }
            `}>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                {image ? (
                    <img src={image} className="h-full w-full object-contain p-4 opacity-80 group-hover:opacity-100 transition-opacity" /> 
                ) : (
                    <>
                       <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-50"></div>
                       <span className="text-[10px] text-zinc-500 group-hover:text-purple-200 transition-colors uppercase z-10 font-bold tracking-widest">Source Image</span>
                       <Upload size={24} className="mt-3 text-purple-500/40 group-hover:text-purple-400 transition-colors z-10" />
                    </>
                )}
            </label>

            {/* CONTROLS */}
            <div className="space-y-6 flex-shrink-0">
               
               {/* SURFACE MODE */}
               <div>
                   <span className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block flex items-center gap-2">
                       <Activity size={10} className="text-purple-400"/> Surface Topology
                   </span>
                   <div className="flex gap-2">
                      <button onClick={() => setIsFlat(true)} className={`flex-1 py-2 flex items-center justify-center gap-2 text-[9px] font-bold uppercase border rounded-sm transition-all ${isFlat ? 'bg-purple-900/30 border-purple-500 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-zinc-900/50 border-white/10 text-zinc-500 hover:border-white/30'}`}>
                         <Box size={12} /> Flat (Solid)
                      </button>
                      <button onClick={() => setIsFlat(false)} className={`flex-1 py-2 flex items-center justify-center gap-2 text-[9px] font-bold uppercase border rounded-sm transition-all ${!isFlat ? 'bg-purple-900/30 border-purple-500 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'bg-zinc-900/50 border-white/10 text-zinc-500 hover:border-white/30'}`}>
                         <Activity size={12} /> Textured
                      </button>
                   </div>
               </div>

               {/* SLIDERS */}
               <div className="space-y-6">
                    <div className="group">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-purple-300 transition-colors">
                            <span className="flex items-center gap-1"><GridIcon size={10}/> Resolution (Detail) <InfoTooltip text="Higher = Sharper details but slower. Max 450px grid." /></span>
                            <span className="font-mono text-white">{resolution} px</span>
                        </div>
                        <input type="range" min="100" max="450" step="10" value={resolution} onChange={(e) => setResolution(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-purple-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]"/>
                    </div>

                    <div className="group">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-purple-300 transition-colors">
                            <span className="flex items-center gap-1"><Layers size={10}/> Cutoff Threshold <InfoTooltip text="Pixels darker than this value are deleted. Increase to remove background noise." /></span>
                            <span className="font-mono text-white">{threshold}</span>
                        </div>
                        <input type="range" min="0" max="255" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-purple-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]"/>
                    </div>

                    <div className="group">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-purple-300 transition-colors">
                            <span className="flex items-center gap-1"><Scaling size={10}/> Extrusion Thickness <InfoTooltip text="How far the object extends from the wall (Z-Axis depth)." /></span>
                            <span className="font-mono text-white">{depth} cm</span>
                        </div>
                        <input type="range" min="0.1" max="10" step="0.1" value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-purple-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]"/>
                    </div>

                    <div className="group">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-purple-300 transition-colors">
                            <span className="flex items-center gap-1"><Maximize2 size={10}/> Physical Height <InfoTooltip text="Target height for the final object. Width scales automatically." /></span>
                            <span className="font-mono text-white">{heightCM} cm</span>
                        </div>
                        <input type="range" min="5" max="50" value={heightCM} onChange={(e) => setHeightCM(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-purple-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]"/>
                    </div>
               </div>

               <label className="flex items-center gap-3 cursor-pointer group pt-4 border-t border-white/5">
                    <div className={`w-3 h-3 border border-zinc-600 ${invert ? 'bg-purple-500 border-purple-500' : 'bg-transparent'} transition-colors shadow-[0_0_10px_rgba(168,85,247,0.4)]`}></div>
                    <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} className="hidden" />
                    <span className="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-white transition-colors flex items-center">
                      Invert Brightness Logic
                    </span>
               </label>
            </div>

            {/* --- COLORS SECTION --- */}
            <div className="space-y-4 pt-4 border-t border-white/5 flex-shrink-0">
                
                {/* Object Material */}
                <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block flex items-center gap-2">
                       <Palette size={10} className="text-purple-400"/> Object Color
                    </span>
                    <div className="flex gap-3">
                        {MATERIAL_COLORS.map(c => (
                            <button 
                                key={c.name} 
                                onClick={() => setObjectColor(c.hex)} 
                                className={`w-5 h-5 rounded-full border border-white/10 transition-transform hover:scale-125 ${objectColor === c.hex ? 'ring-2 ring-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'opacity-60 hover:opacity-100'}`} 
                                style={{background: c.hex}} 
                                title={c.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Wall Paint */}
                <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block flex items-center gap-2">
                       <Box size={10} className="text-zinc-400"/> Wall Paint
                    </span>
                    <div className="flex gap-3">
                        {WALL_COLORS.map(c => (
                            <button 
                                key={c.name} 
                                onClick={() => setWallColor(c.hex)} 
                                className={`w-5 h-5 rounded-sm border border-white/10 transition-transform hover:scale-110 ${wallColor === c.hex ? 'ring-2 ring-zinc-400 scale-105' : 'opacity-60 hover:opacity-100'}`} 
                                style={{background: c.hex}} 
                                title={c.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="h-6 flex items-center justify-end">
                     {isProcessing && (
                         <span className="text-[9px] uppercase tracking-widest text-purple-400 animate-pulse flex items-center gap-2">
                            <RefreshCw className="animate-spin" size={10}/> Rendering Mesh...
                         </span>
                     )}
                </div>

            </div>
          </aside>
       </main>

      {/* --- PAYMENT MODAL --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 transition-opacity duration-300">
            <div className="relative w-full mx-4 md:mx-0 max-w-sm max-h-[90vh] overflow-y-auto bg-black border border-white/10 shadow-[0_0_50px_rgba(192,132,252,0.15)] animate-in fade-in zoom-in-95 duration-200 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-black [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-purple-500">
                
                {/* Sticky Close Button */}
                <div className="sticky top-0 right-0 z-50 flex justify-end p-4 pointer-events-none">
                    <button 
                        onClick={() => setShowPaymentModal(false)} 
                        className="pointer-events-auto bg-black/50 backdrop-blur-md rounded-full p-1 text-zinc-500 hover:text-white transition-colors border border-white/10 hover:border-white/30"
                    >
                        <X size={16} />
                    </button>
                </div>
                
                {/* Content Container */}
                <div className="px-8 pb-8 -mt-12">
                    <div className="flex items-center gap-4 mb-6 mt-4">
                        <div className="w-10 h-10 bg-purple-950/30 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-[0_0_15px_rgba(192,132,252,0.2)] rounded-sm">
                            <Download size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Export STL</h3>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Secure Transfer</p>
                        </div>
                    </div>
                    
                    <div className="mb-6 border-l-2 border-purple-500 pl-4 py-1 bg-gradient-to-r from-purple-950/20 to-transparent flex justify-between items-center pr-2">
                        <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Transaction Fee</p>
                            <p className="text-2xl font-mono text-white tracking-tight">$0.99</p>
                        </div>
                    </div>

                    {/* COUPON SECTION */}
                    <div className="mb-6 p-3 bg-zinc-900/30 border border-white/5 rounded-sm">
                        <label className="flex items-center gap-2 text-[9px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">
                           <Ticket size={10} className="text-purple-500"/> Promo Code
                        </label>
                        <div className="flex gap-2">
                           <input 
                              type="text" 
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="000-000"
                              className="flex-1 bg-black border border-zinc-800 text-white text-xs font-mono px-3 py-2 focus:border-purple-500 focus:outline-none uppercase placeholder-zinc-800 transition-colors"
                           />
                           <button 
                             onClick={checkCoupon}
                             className="bg-zinc-800 hover:bg-purple-600 hover:text-white text-purple-500 border border-zinc-700 hover:border-purple-400 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all"
                           >
                             Apply
                           </button>
                        </div>
                        {couponMessage && (
                            <div className={`mt-2 flex items-center gap-2 text-[10px] font-mono ${couponMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {couponMessage.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                <span className="animate-pulse">{couponMessage.text}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 my-6 opacity-50">
                        <div className="h-px bg-zinc-800 flex-1"></div>
                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Encrypted Checkout</span>
                        <div className="h-px bg-zinc-800 flex-1"></div>
                    </div>

                    {/* STRIPE ELEMENT */}
                    <div className="min-h-[160px] relative">
                        {clientSecret ? (
                            <Elements options={{ clientSecret, appearance }} stripe={stripePromise}>
                                <PaymentForm onSuccess={handlePaymentSuccess} onCancel={() => setShowPaymentModal(false)} />
                            </Elements>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-600 animate-pulse">
                                <RefreshCw className="animate-spin text-purple-500/50" size={24} />
                                <div className="text-center">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-purple-500/80">Establishing Uplink...</p>
                                    <p className="text-[9px] text-zinc-700 mt-1">Handshaking with Secure Gateway</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-center items-center gap-2 text-[9px] text-zinc-700 uppercase font-mono pt-3 border-t border-white/5">
                        <Lock size={10} /> <span>TLS 1.3 Encrypted Connection</span>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}