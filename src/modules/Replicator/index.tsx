import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { io, Socket } from 'socket.io-client';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { QrHandshake } from './components/QrHandshake';
import { ModelViewer } from './components/ModelViewer';
import { Cpu, ScanLine, Smartphone, Layers, Box, Loader2, Download } from 'lucide-react';

// --- CONFIGURATION ---

// 1. BASE_URL: Used for fetching the 3D file (STL)
// If on Vercel (PROD), use your Render URL. If Local (DEV), use empty string (to use Vite Proxy).
const BASE_URL = import.meta.env.PROD 
    ? "https://replicator-backend.onrender.com"
    : ""; 

// 2. SOCKET_URL: Used for the real-time connection
// If on Vercel (PROD), use your Render URL. If Local (DEV), use "/" (Vite Proxy).
const SOCKET_URL = import.meta.env.PROD 
    ? "https://replicator-backend.onrender.com"
    : "/";

export default function Replicator() {
  const [sessionId, setSessionId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [frames, setFrames] = useState<string[]>([]);
  
  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  // Socket Reference
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 1. Generate Session ID
    const newSession = uuidv4().slice(0, 8).toUpperCase();
    setSessionId(newSession);

    // 2. Connect to Backend
    console.log("Connecting to:", SOCKET_URL);
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("Desktop connected to socket switchboard");
      socket.emit('join_session', { sessionId: newSession, type: 'host' });
    });

    // 3. Listen for Events
    socket.on('session_status', (data) => {
      if (data.status === 'connected') setIsConnected(true);
    });

    socket.on('frame_received', (data) => {
        setFrames(prev => [...prev, data.image]);
    });

    socket.on('processing_status', (data) => {
        setIsProcessing(true);
        setStatusMessage(data.step);
    });

    socket.on('model_ready', (data) => {
        setIsProcessing(false);
        setStatusMessage("Mesh Compilation Complete.");
        setModelReady(true);
        setModelUrl(data.url); // Save the filename
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleGenerate = () => {
      if (socketRef.current) {
          socketRef.current.emit('process_3d', { sessionId });
      }
  };

  return (
    <div className="bg-zinc-950 min-h-screen text-white selection:bg-cyan-500 selection:text-black">
      <Header />
      
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-[80vh] flex flex-col">
        {/* Module Header */}
        <div className="mb-12 border-l-2 border-cyan-500 pl-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            The <span className="text-cyan-500">Replicator</span>
          </h1>
          <p className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-4">
            Optical-to-Mesh Photogrammetry Engine v1.0
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT COLUMN: Controls */}
          <div className="space-y-8">
             <div className="flex gap-4 items-start group">
                <div className={`p-3 rounded-lg border transition-colors ${isConnected ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-zinc-900 border-zinc-800 text-cyan-500'}`}>
                    <Smartphone size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase italic text-white mb-2">1. Establish Uplink</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase leading-relaxed max-w-sm">
                        {isConnected ? "Device Paired Successfully." : "Connect your mobile device."}
                    </p>
                </div>
             </div>

             <div className={`flex gap-4 items-start transition-opacity ${isConnected ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`p-3 rounded-lg border transition-colors ${frames.length > 0 ? 'bg-cyan-500/10 border-cyan-500 text-cyan-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                    <ScanLine size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase italic text-white mb-2">2. Orbit Subject</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase leading-relaxed max-w-sm">
                        Capture 360° coverage. <br/>
                        <span className="text-cyan-500">Dataset: {frames.length} Images</span>
                    </p>
                </div>
             </div>

             {/* GENERATE BUTTON */}
             <div className={`transition-all duration-500 ${frames.length >= 3 ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-[-10px] pointer-events-none'}`}>
                 <button 
                    onClick={handleGenerate}
                    disabled={isProcessing || modelReady}
                    className={`group flex gap-4 items-center px-6 py-4 rounded-xl transition-all shadow-xl w-full max-w-sm
                        ${modelReady 
                            ? 'bg-emerald-500 text-black hover:scale-105' 
                            : 'bg-white text-black hover:bg-cyan-500 hover:scale-105'
                        }`}
                 >
                    <div className="p-2 bg-black text-white rounded-lg">
                        {isProcessing ? <Loader2 className="animate-spin" size={24}/> : (modelReady ? <Download size={24}/> : <Box size={24} />)}
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-black uppercase italic leading-none">
                            {isProcessing ? "Processing..." : (modelReady ? "Download Mesh" : "3. Compile Mesh")}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-1 group-hover:text-black/70">
                            {statusMessage || "Ready to Process"}
                        </p>
                    </div>
                 </button>
             </div>
          </div>

          {/* RIGHT COLUMN: Viewport */}
          <div className="flex justify-center">
            {!isConnected ? (
                // State 1: Disconnected
                <div className="w-full max-w-md">
                    <QrHandshake sessionId={sessionId} />
                </div>
            ) : (
                // State 2: Connected
                <div className="w-full h-96 bg-zinc-900/30 border border-cyan-500/50 rounded-[3rem] relative overflow-hidden flex items-center justify-center group">
                    
                    {modelReady && modelUrl ? (
                        // SUB-STATE: 3D VIEWER (Success)
                        <div className="w-full h-full relative animate-in fade-in zoom-in duration-1000">
                             {/* THE MAGIC LINE: Connects Frontend to Backend File Storage */}
                             <ModelViewer url={`${BASE_URL}/files/${sessionId}/${modelUrl}`} />
                             
                             <div className="absolute top-6 left-6 pointer-events-none">
                                <div className="bg-emerald-500/10 backdrop-blur border border-emerald-500 text-emerald-500 font-mono text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                                    <Box size={12} />
                                    <span>Live Render</span>
                                </div>
                             </div>
                        </div>
                    ) : (
                        frames.length > 0 ? (
                            // SUB-STATE: IMAGE STACK (Scanning)
                            <div className="relative w-full h-full p-2">
                                <img 
                                    src={frames[frames.length - 1]} 
                                    alt="Latest Scan" 
                                    className={`w-full h-full object-cover rounded-[2.5rem] shadow-2xl transition-all duration-700 ${isProcessing ? 'blur-sm scale-95 opacity-50' : ''}`} 
                                />
                                {isProcessing && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                                        <span className="bg-black/80 text-cyan-500 font-mono text-xs px-4 py-2 rounded-full border border-cyan-500/30">
                                            {statusMessage}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // SUB-STATE: WAITING (Ready)
                            <div className="text-center relative z-10 animate-pulse">
                                <Cpu size={64} className="text-cyan-500 mx-auto mb-6" />
                                <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter">
                                    Uplink <span className="text-cyan-500">Active</span>
                                </h2>
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">
                                    Ready for Optical Stream
                                </p>
                            </div>
                        )
                    )}
                    
                    {!frames.length && !modelReady && (
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
                    )}
                </div>
            )}
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}