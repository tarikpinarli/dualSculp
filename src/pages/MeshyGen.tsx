import React, { useState, useEffect, useRef } from 'react';
import { Upload, Play, RefreshCw, Box, Activity, Layers, ArrowLeft, Info, Cpu, Sparkles, Download, CheckCircle, AlertCircle, X, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Gltf, Stage } from '@react-three/drei';

// --- STRIPE IMPORTS ---
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PaymentForm } from '../components/PaymentForm';

// 👇 REPLACE WITH YOUR PUBLIC KEY
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
      <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none cursor-pointer p-1 -m-1">
        <Info size={10} className={`transition-colors duration-200 ${isOpen ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'text-zinc-600 hover:text-zinc-300'}`} />
      </button>
      <div className={`absolute bottom-full mb-2 w-48 p-3 bg-black/95 border border-cyan-500/30 rounded-sm text-[10px] normal-case font-medium text-zinc-300 leading-relaxed shadow-[0_0_20px_rgba(34,211,238,0.1)] backdrop-blur-xl left-1/2 -translate-x-1/2 z-50 text-center pointer-events-none transition-all duration-200 ease-out ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'}`}>
         {text}
         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-cyan-500/30"></div>
      </div>
    </div>
  );
};

export default function MeshyGen() {
  const [image, setImage] = useState<string | null>(null);
  const [enablePBR, setEnablePBR] = useState(true);
  const [topology, setTopology] = useState<'quad' | 'triangle'>('triangle');
  const [polycount, setPolycount] = useState(30000);
  const [symmetry, setSymmetry] = useState('auto');

  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null); 

  // --- POLLING LOGIC ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (taskId && (status === 'PENDING' || status === 'IN_PROGRESS')) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`https://shadow-sculpture-backend.onrender.com/api/meshy/status/${taskId}`);
          if (!res.ok) throw new Error(`Polling Error: ${res.status}`);
          const data = await res.json();

          if (data.status) setStatus(data.status);
          if (data.progress) setProgress(data.progress);

          if (data.status === 'SUCCEEDED') {
            setModelUrl(data.model_urls.glb);
            clearInterval(intervalId);
          } else if (data.status === 'FAILED') {
            setErrorMsg(data.task_error?.message || "Generation Failed");
            clearInterval(intervalId);
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 2000);
    }
    return () => clearInterval(intervalId);
  }, [taskId, status]);

  // --- FILE UPLOAD ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
          setImage(evt.target?.result as string);
          setTaskId(null);
          setStatus('IDLE');
          setModelUrl(null);
          setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- STEP 1: OPEN PAYMENT (With Availability Check) ---
  const handleForgeClick = async () => {
    if (!image) return;
    setClientSecret("");
    
    try {
        // Request Payment Setup (This checks backend inventory first!)
        const res = await fetch("https://shadow-sculpture-backend.onrender.com/create-payment-intent", {
            method: "POST", headers: { "Content-Type": "application/json" },
        });
        
        const data = await res.json();

        // 🛑 HANDLE SOLD OUT SCENARIO
        if (res.status === 503 || data.code === "SOLD_OUT") {
            alert("⚠️ SERVER CAPACITY REACHED\n\nDue to high demand, our GPU cluster is currently full.\n\nPlease try again later. No charge has been made.");
            return;
        }

        if (data.clientSecret) {
            setClientSecret(data.clientSecret);
            setPaymentIntentId(data.clientSecret.split('_secret')[0]);
            setShowPaymentModal(true);
        }
    } catch (error) {
        alert("Unable to connect to server.");
    }
  };

  // --- STEP 2: START GENERATION (After Payment) ---
  const onPaymentSuccess = () => {
    setShowPaymentModal(false);
    startGeneration();
  };

  const startGeneration = async () => {
    setStatus('PENDING');
    setProgress(0);
    setErrorMsg(null);
    setModelUrl(null);

    try {
      console.log("🚀 Calling Meshy API...");
      
      const res = await fetch("https://shadow-sculpture-backend.onrender.com/api/meshy/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: image,
          enable_pbr: enablePBR,
          topology: topology,
          target_polycount: polycount,
          symmetry_mode: symmetry,
          ai_model: "meshy-4",
          paymentIntentId: paymentIntentId 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Server Error");
      }

      if (data.result) {
        setTaskId(data.result);
      } else {
        throw new Error("No Task ID returned");
      }

    } catch (e: any) {
      console.error("❌ Generation Error:", e);
      const isRefunded = e.message.includes("refunded");
      setErrorMsg(isRefunded 
        ? "⚠️ GPU Error: Generation failed, but your funds were instantly refunded." 
        : e.message
      );
      setStatus('FAILED');
    }
  };

  const appearance = {
    theme: 'night' as const,
    variables: { colorPrimary: '#22d3ee', colorBackground: '#000000', colorText: '#e2e8f0', colorDanger: '#ff3333' },
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-zinc-300 font-sans tracking-tight selection:bg-cyan-500 selection:text-black overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1.5px, transparent 1.5px)', backgroundSize: '60px 60px' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse duration-[8000ms]"></div>
      
      <header className="relative z-10 flex items-center justify-between px-4 md:px-8 py-5 bg-black/40 backdrop-blur-sm flex-shrink-0 border-b border-white/5">
         <div className="flex items-center gap-4 group cursor-default">
            <Link to="/" className="text-zinc-500 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
            <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
                    <Sparkles className="text-cyan-400" size={20}/> 
                    Generative 3D Latent Space
                </h1>
                <span className="text-[8px] md:text-[9px] text-cyan-400/80 font-mono uppercase tracking-[0.2em]">Meshy AI Neural Core</span>
            </div>
         </div>
         {modelUrl && (
             <a href={modelUrl} download className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-cyan-400 transition-colors rounded-sm flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                 <Download size={14}/> Save GLB
             </a>
         )}
      </header>

      <main className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
         <section className="relative bg-black/80 order-1 md:order-2 w-full h-[50vh] md:h-auto md:flex-1 flex-shrink-0">
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{backgroundImage: 'linear-gradient(rgba(34,211,238,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
            <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }} className="w-full h-full" dpr={[1, 2]}>
                <Environment preset="city" />
                <OrbitControls makeDefault autoRotate={status === 'SUCCEEDED'} autoRotateSpeed={1} minPolarAngle={0} maxPolarAngle={Math.PI / 1.8} />
                <Stage intensity={0.5} environment="city" adjustCamera={1.2}>
                    {modelUrl ? (
                        <Gltf src={modelUrl} castShadow receiveShadow />
                    ) : (
                        <mesh rotation={[0.5, 0.5, 0]}>
                            <boxGeometry args={[1.5, 1.5, 1.5]} />
                            <meshStandardMaterial wireframe color="#333" />
                        </mesh>
                    )}
                </Stage>
            </Canvas>

            {(status === 'PENDING' || status === 'IN_PROGRESS') && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-zinc-800 border-t-cyan-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-cyan-500">
                                {progress}%
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-lg animate-pulse">Neural Refining</h3>
                            <p className="text-zinc-500 text-xs font-mono mt-2 uppercase tracking-wide">
                                {progress < 50 ? "Analyzing Topology..." : "Baking Textures..."}
                            </p>
                        </div>
                    </div>
                </div>
            )}
         </section>

         <aside className="order-2 md:order-1 w-full md:w-80 flex-shrink-0 bg-black/60 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/10 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 relative">
            <div>
                <span className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block flex items-center gap-2">
                    <Layers size={10} className="text-cyan-400"/> Input Data
                </span>
                <label className={`
                    group relative h-40 border transition-all duration-500 cursor-pointer flex flex-col items-center justify-center overflow-hidden
                    ${image 
                      ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] bg-zinc-900/40' 
                      : 'border-cyan-500/30 bg-cyan-950/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)] animate-[pulse_4s_ease-in-out_infinite] hover:border-cyan-500/60 hover:bg-cyan-900/20'
                    }
                `}>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    {image ? (
                        <img src={image} className="h-full w-full object-contain p-2 opacity-80 group-hover:opacity-100 transition-opacity" alt="Upload" />
                    ) : (
                        <>
                           <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-50"></div>
                           <Upload size={24} className="mb-2 text-cyan-500/40 group-hover:text-cyan-400 transition-colors z-10" />
                           <span className="text-[10px] text-zinc-500 uppercase tracking-widest z-10 font-bold group-hover:text-cyan-200">Upload Reference</span>
                        </>
                    )}
                </label>
            </div>

            <div className="space-y-6">
                <h2 className="text-[10px] text-zinc-400 font-mono uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                    <Cpu size={10} className="text-cyan-400" /> Generation Config
                </h2>
                <div>
                   <span className="text-[10px] font-bold uppercase text-zinc-500 mb-2 block">Topology Structure</span>
                   <div className="flex gap-2">
                      <button onClick={() => setTopology('triangle')} className={`flex-1 py-2 text-[9px] font-bold uppercase border rounded-sm transition-all ${topology === 'triangle' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-zinc-900/50 border-white/10 text-zinc-500 hover:bg-zinc-800'}`}>Triangle</button>
                      <button onClick={() => setTopology('quad')} className={`flex-1 py-2 text-[9px] font-bold uppercase border rounded-sm transition-all ${topology === 'quad' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-zinc-900/50 border-white/10 text-zinc-500 hover:bg-zinc-800'}`}>Quad</button>
                   </div>
                </div>

                <div className="group">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-2">
                        <span className="flex items-center gap-1">Target Polycount <InfoTooltip text="Higher = More detail, heavier file." /></span>
                        <span className="font-mono text-white">{polycount.toLocaleString()}</span>
                    </div>
                    <input type="range" min="1000" max="100000" step="1000" value={polycount} onChange={(e) => setPolycount(Number(e.target.value))} className="w-full h-[2px] bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-cyan-400 shadow-[0_0_10px_rgba(255,255,255,0.1)]"/>
                </div>

                <label className="flex items-center justify-between cursor-pointer group p-3 border border-white/5 hover:border-cyan-500/30 rounded-sm bg-zinc-900/30 transition-colors">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 group-hover:text-white flex items-center gap-2 transition-colors">
                        PBR Textures <InfoTooltip text="Generates Roughness, Metallic, and Normal maps." />
                    </span>
                    <div className={`w-3 h-3 border border-zinc-600 ${enablePBR ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'bg-transparent'} transition-colors`}></div>
                    <input type="checkbox" checked={enablePBR} onChange={(e) => setEnablePBR(e.target.checked)} className="hidden" />
                </label>
            </div>

            <div className="mt-auto pt-6 border-t border-white/5">
                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 text-red-300 text-[10px] font-mono flex gap-2 items-center rounded-sm">
                        <AlertCircle size={12} className="flex-shrink-0" /> 
                        <span className="break-words leading-tight">{errorMsg}</span>
                    </div>
                )}
                
                <button 
                    onClick={handleForgeClick} 
                    disabled={!image || status === 'PENDING' || status === 'IN_PROGRESS'}
                    className="w-full py-4 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {status === 'PENDING' || status === 'IN_PROGRESS' ? (
                        <RefreshCw className="animate-spin" size={16} />
                    ) : (
                        <Play size={16} fill="currentColor" />
                    )}
                    {status === 'PENDING' || status === 'IN_PROGRESS' ? "PROCESSING..." : "FORGE MODEL ($1.99)"}
                </button>
            </div>
         </aside>
      </main>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 transition-opacity duration-300">
            <div className="relative w-full mx-4 md:mx-0 max-w-sm max-h-[90vh] overflow-y-auto bg-black border border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.15)] animate-in fade-in zoom-in-95 duration-200 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-black [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-cyan-500">
                
                <div className="sticky top-0 right-0 z-50 flex justify-end p-4 pointer-events-none">
                    <button onClick={() => setShowPaymentModal(false)} className="pointer-events-auto bg-black/50 backdrop-blur-md rounded-full p-1 text-zinc-500 hover:text-white transition-colors border border-white/10 hover:border-white/30"><X size={16} /></button>
                </div>
                
                <div className="px-8 pb-8 -mt-12">
                    <div className="flex items-center gap-4 mb-6 mt-4">
                        <div className="w-10 h-10 bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)] rounded-sm">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Start Forge</h3>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Generative Process</p>
                        </div>
                    </div>
                    
                    <div className="mb-6 border-l-2 border-cyan-500 pl-4 py-1 bg-gradient-to-r from-cyan-950/20 to-transparent flex justify-between items-center pr-2">
                        <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-0.5">Estimated Cost</p>
                            <p className="text-2xl font-mono text-white tracking-tight">$1.99</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-zinc-500 uppercase">GPU Credits</p>
                            <p className="text-xs text-cyan-400 font-bold">~25 CR</p>
                        </div>
                    </div>

                    <div className="min-h-[160px] relative">
                        {clientSecret ? (
                            <Elements options={{ clientSecret, appearance }} stripe={stripePromise}>
                                <PaymentForm onSuccess={onPaymentSuccess} onCancel={() => setShowPaymentModal(false)} />
                            </Elements>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-600 animate-pulse">
                                <RefreshCw className="animate-spin text-cyan-500/50" size={24} />
                                <div className="text-center">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-500/80">Checking GPU Availability...</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-center items-center gap-2 text-[9px] text-zinc-700 uppercase font-mono pt-3 border-t border-white/5">
                        <Lock size={10} /> <span>Auto-Refund on Generation Failure</span>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}