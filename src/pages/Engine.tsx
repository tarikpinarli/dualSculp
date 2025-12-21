import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, Play, RefreshCw, Ruler, Grid as GridIcon, Zap, X, Lock, Cpu, Layers, Activity, Sliders, Info, Ticket, CheckCircle, AlertCircle } from 'lucide-react';
import { Viewer3D } from '../components/Viewer3D';
import { createMask, getAlignedImageData, generateVoxelGeometry, exportToSTL } from '../utils/voxelEngine';
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
          className={`transition-colors duration-200 ${isOpen ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'text-zinc-600 hover:text-zinc-300'}`} 
        />
      </button>
      
      <div className={`
          absolute bottom-full mb-2 w-48 p-3 
          bg-black/95 border border-cyan-500/30 rounded-sm 
          text-[10px] normal-case font-medium text-zinc-300 leading-relaxed
          shadow-[0_0_20px_rgba(34,211,238,0.1)] backdrop-blur-xl 
          left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none
          transition-all duration-200 ease-out
          ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'}
      `}>
         {text}
         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-cyan-500/30"></div>
      </div>
    </div>
  );
};

export default function App() {
  const [imgA, setImgA] = useState<string | null>(null);
  const [imgB, setImgB] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null); 
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Parameters
  const [artisticMode, setArtisticMode] = useState(false);
  const [smoothingIterations, setSmoothingIterations] = useState(3);
  const [threshold, setThreshold] = useState(128);
  const [physicalHeight, setPhysicalHeight] = useState(10); 
  const [gridSize, setGridSize] = useState(100); 
  const [lightDistance, setLightDistance] = useState(100); 

  // Wake up server
  useEffect(() => {
    const wakeUpServer = async () => {
      try { 
          await fetch("https://shadow-sculpture-backend.onrender.com"); 
          console.log("💓 Heartbeat sent to backend");
      } catch (e) {
          console.error("Heartbeat failed", e);
      }
    };
    wakeUpServer();
    // Keep alive every 5 minutes
    const interval = setInterval(wakeUpServer, 5 * 60 * 1000);
    return () => clearInterval(interval);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setImg: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => setImg(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processGeometry = useCallback(async () => {
    if (!imgA && !imgB) return;
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 100));
    try {
      const [dataA, dataB] = await getAlignedImageData(imgA, imgB, gridSize);
      const maskA = dataA ? createMask(dataA, gridSize, threshold) : null;
      const maskB = dataB ? createMask(dataB, gridSize, threshold) : null;
      const geom = generateVoxelGeometry(maskA, maskB, artisticMode, smoothingIterations, physicalHeight, gridSize, lightDistance);
      
      setGeometry(geom);

      if (geom) {
          const triangleCount = geom.attributes.position.count / 3;
          const bytes = 84 + (triangleCount * 50);
          const megabytes = (bytes / (1024 * 1024)).toFixed(2);
          setFileSize(`${megabytes} MB`);
      }

    } catch (e) {
      console.error("Error:", e);
    } finally {
      setIsProcessing(false);
    }
  }, [imgA, imgB, artisticMode, smoothingIterations, threshold, physicalHeight, gridSize, lightDistance]); 

  useEffect(() => {
    const timer = setTimeout(() => { if(imgA || imgB) processGeometry(); }, 800);
    return () => clearTimeout(timer);
  }, [imgA, imgB, artisticMode, smoothingIterations, threshold, physicalHeight, gridSize, lightDistance, processGeometry]);

  // --- UPDATED EXPORT HANDLER ---
  const handleExportClick = async () => {
    if (!geometry) return;
    
    // 1. Reset state to show loading
    setClientSecret(""); 
    setCouponInput("");
    setCouponMessage(null);
    setShowPaymentModal(true);
    
    try {
        console.log("🔌 Connecting to backend...");
        const res = await fetch("https://shadow-sculpture-backend.onrender.com/create-payment-intent", {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
        });
        
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Server Error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        console.log("✅ Client Secret Received");
        setClientSecret(data.clientSecret);
    } catch (error: any) {
        console.error("❌ Payment Connection Failed:", error);
        alert(`Connection Error: ${error.message}. Please check console.`);
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
    link.download = `crosscast-model.stl`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const appearance = {
    theme: 'night' as const,
    variables: { colorPrimary: '#ffffff', colorBackground: '#000000', colorText: '#e2e8f0', colorDanger: '#ff3333' },
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-zinc-300 font-sans tracking-tight selection:bg-cyan-500 selection:text-black overflow-hidden relative">
      
      {/* 🌌 ATMOSPHERE */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1.5px, transparent 1.5px)', backgroundSize: '60px 60px' }}>
      </div>
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse duration-[5000ms]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none z-0 animate-pulse duration-[7000ms]"></div>
      <div className="absolute top-[72px] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent z-20 shadow-[0_0_15px_rgba(34,211,238,0.6)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-0"></div>

      {/* HEADER: Adjusted padding for mobile */}
      <header className="relative z-10 flex items-center justify-between px-4 md:px-8 py-5 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3 md:gap-4 group cursor-default">
          <div className="relative transition-transform group-hover:scale-110 duration-500">
             <div className="absolute inset-0 bg-cyan-500/40 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <img src="/favicon.png" alt="Logo" className="relative w-8 h-8 md:w-11 md:h-11 object-contain opacity-90 invert-0" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">3D Shadow Caster</h1>
            <span className="text-[8px] md:text-[9px] text-cyan-400/80 font-mono uppercase tracking-[0.2em]">Intersection Modeling Engine v1.0</span>
          </div>
        </div>
        <button 
             onClick={handleExportClick}
             disabled={!geometry}
             className="group relative px-4 md:px-6 py-2 bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider hover:bg-cyan-50 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
           >
             Export .STL
        </button>
      </header>

      {/* MAIN: Flex column on mobile, Row on Desktop */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* VIEWER AREA: Order 1 on mobile (top), Order 2 on desktop (right) */}
        <section className="relative bg-black/80 order-1 md:order-2 w-full h-[45vh] md:h-auto md:flex-1 flex-shrink-0">
           <div className="absolute inset-0 pointer-events-none opacity-20" style={{backgroundImage: 'linear-gradient(rgba(34,211,238,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.1) 1px, transparent 1px)', backgroundSize: '100px 100px'}}></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
           <Viewer3D geometry={geometry} showGrid={true} isSmooth={smoothingIterations > 0} lightDistanceCM={lightDistance} isProcessing={isProcessing} />
        </section>

        {/* SIDEBAR: Order 2 on mobile (bottom), Order 1 on desktop (left) */}
        <aside className="
            order-2 md:order-1
            w-full md:w-80 flex-shrink-0 
            bg-black/60 backdrop-blur-xl 
            border-t md:border-t-0 md:border-r border-white/10 
            p-6 overflow-y-auto custom-scrollbar 
            flex flex-col gap-8 relative 
            flex-1 md:flex-none
        ">
          <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent opacity-50 hidden md:block"></div>

          {/* UPLOAD SECTION */}
          <div>
             <h2 className="text-[10px] text-zinc-400 font-mono uppercase mb-4 flex items-center gap-2">
               <Layers size={10} className="text-cyan-400"/> Input Silhouettes
             </h2>
             
             <div className="grid grid-cols-2 gap-3">
                {/* INPUT A */}
                <label className={`
                    group relative h-24 md:h-28 border transition-all duration-500 cursor-pointer flex flex-col items-center justify-center overflow-hidden
                    ${imgA 
                      ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] bg-zinc-900/40' 
                      : 'border-cyan-500/30 bg-cyan-950/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)] animate-[pulse_3000ms_ease-in-out_infinite] hover:border-cyan-500/60 hover:bg-cyan-900/20'
                    }
                `}>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setImgA)} className="hidden" />
                    {imgA ? (
                        <img src={imgA} className="h-full w-full object-contain p-2 opacity-80 group-hover:opacity-100 transition-opacity" /> 
                    ) : (
                        <>
                           <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-50"></div>
                           <span className="text-[10px] text-zinc-500 group-hover:text-cyan-200 transition-colors uppercase z-10 font-bold tracking-widest">Front View</span>
                           <Upload size={16} className="mt-2 text-cyan-500/40 group-hover:text-cyan-400 transition-colors z-10" />
                        </>
                    )}
                </label>

                {/* INPUT B */}
                <label className={`
                    group relative h-24 md:h-28 border transition-all duration-500 cursor-pointer flex flex-col items-center justify-center overflow-hidden
                    ${imgB 
                      ? 'border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.2)] bg-zinc-900/40' 
                      : 'border-purple-500/30 bg-purple-950/10 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)] animate-[pulse_3000ms_ease-in-out_infinite] hover:border-purple-500/60 hover:bg-purple-900/20'
                    }
                `}>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setImgB)} className="hidden" />
                    {imgB ? (
                        <img src={imgB} className="h-full w-full object-contain p-2 opacity-80 group-hover:opacity-100 transition-opacity" /> 
                    ) : (
                        <>
                           <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-50"></div>
                           <span className="text-[10px] text-zinc-500 group-hover:text-purple-200 transition-colors uppercase z-10 font-bold tracking-widest">Side View</span>
                           <Upload size={16} className="mt-2 text-purple-500/40 group-hover:text-purple-400 transition-colors z-10" />
                        </>
                    )}
                </label>
             </div>
          </div>

          {/* CONTROLS SECTION */}
          <div className="space-y-6 pb-6">
               <h2 className="text-[10px] text-zinc-400 font-mono uppercase flex items-center gap-2">
                 <Cpu size={10} className="text-cyan-400" /> Parameter Config
               </h2>
               
               {/* SLIDERS SECTION */}
               <div className="space-y-6">
                 <div className="group">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-cyan-300 transition-colors">
                        <span className="flex items-center gap-1"><Zap size={10}/> Light Distance <InfoTooltip text="Distance from your light source to the sculpture. Affects shadow distortion." /></span>
                        <span className="font-mono text-white">{lightDistance} cm</span>
                    </div>
                    <input type="range" min="30" max="160" step="5" value={lightDistance} onChange={(e) => setLightDistance(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-cyan-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]"/>
                 </div>
                 <div className="group">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-cyan-300 transition-colors">
                        <span className="flex items-center gap-1"><GridIcon size={10}/> Resolution <InfoTooltip text="Voxel grid density. Higher values = sharper details but slower processing." /></span>
                        <span className="font-mono text-white">{gridSize} px</span>
                    </div>
                    <input type="range" min="50" max="250" step="10" value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-cyan-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]"/>
                 </div>
                 <div className="group">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-cyan-300 transition-colors">
                        <span className="flex items-center gap-1"><Ruler size={10}/> Height <InfoTooltip text="Target physical height for 3D printing. Adjusts the model scale." /></span>
                        <span className="font-mono text-white">{physicalHeight} cm</span>
                    </div>
                    <input type="range" min="5" max="40" step="1" value={physicalHeight} onChange={(e) => setPhysicalHeight(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-cyan-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]"/>
                 </div>
                 <div className="group">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-cyan-300 transition-colors">
                        <span className="flex items-center gap-1"><Sliders size={10}/> Threshold <InfoTooltip text="Image contrast cutoff. Increase if background noise appears in the model." /></span>
                        <span className="font-mono text-white">{threshold}</span>
                    </div>
                    <input type="range" min="0" max="255" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-cyan-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]"/>
                 </div>
                 <div className="group">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2 group-hover:text-cyan-300 transition-colors">
                        <span className="flex items-center gap-1"><Activity size={10}/> Smoothness <InfoTooltip text="Number of smoothing passes. Removes 'staircase' artifacts from voxels." /></span>
                        <span className="font-mono text-white">{smoothingIterations}x</span>
                    </div>
                    <input type="range" min="0" max="8" step="1" value={smoothingIterations} onChange={(e) => setSmoothingIterations(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-cyan-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]"/>
                 </div>
               </div>
                
               <label className="flex items-center gap-3 cursor-pointer group pt-4 border-t border-white/5">
                    <div className={`w-3 h-3 border border-zinc-600 ${artisticMode ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent'} transition-colors shadow-[0_0_10px_rgba(34,211,238,0.4)]`}></div>
                    <input type="checkbox" checked={artisticMode} onChange={(e) => setArtisticMode(e.target.checked)} className="hidden" />
                    <span className="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-white transition-colors flex items-center">
                      Artistic Debris Mode <InfoTooltip text="Allows floating parts. Good for abstract art, but harder to 3D print." />
                    </span>
               </label>

               <button onClick={processGeometry} disabled={isProcessing} className="w-full py-3 mt-4 border border-white/10 hover:border-cyan-500/50 bg-white/5 hover:bg-cyan-500/10 text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_0px_rgba(0,0,0,0)] hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />}
                {isProcessing ? "PROCESSING" : "GENERATE MESH"}
               </button>
          </div>
        </aside>

      </main>

      {/* --- PAYMENT MODAL: ADDED WIDTH CONSTRAINTS FOR MOBILE --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 transition-opacity duration-300">
            <div className="relative w-full mx-4 md:mx-0 max-w-sm max-h-[90vh] overflow-y-auto bg-black border border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.15)] animate-in fade-in zoom-in-95 duration-200 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-black [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-cyan-500">
                
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
                        <div className="w-10 h-10 bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)] rounded-sm">
                            <Download size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Export STL</h3>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Secure Transfer</p>
                        </div>
                    </div>
                    
                    <div className="mb-6 border-l-2 border-cyan-500 pl-4 py-1 bg-gradient-to-r from-cyan-950/20 to-transparent flex justify-between items-center pr-2">
                        <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Transaction Fee</p>
                            <p className="text-2xl font-mono text-white tracking-tight">$0.99</p>
                        </div>
                    </div>

                    {/* COUPON SECTION */}
                    <div className="mb-6 p-3 bg-zinc-900/30 border border-white/5 rounded-sm">
                        <label className="flex items-center gap-2 text-[9px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">
                           <Ticket size={10} className="text-cyan-500"/> Promo Code
                        </label>
                        <div className="flex gap-2">
                           <input 
                              type="text" 
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="000-000"
                              className="flex-1 bg-black border border-zinc-800 text-white text-xs font-mono px-3 py-2 focus:border-cyan-500 focus:outline-none uppercase placeholder-zinc-800 transition-colors"
                           />
                           <button 
                             onClick={checkCoupon}
                             className="bg-zinc-800 hover:bg-cyan-600 hover:text-white text-cyan-500 border border-zinc-700 hover:border-cyan-400 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all"
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
                                <RefreshCw className="animate-spin text-cyan-500/50" size={24} />
                                <div className="text-center">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/80">Establishing Uplink...</p>
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