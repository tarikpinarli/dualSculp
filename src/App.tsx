import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// --- MARKETING PAGES ---
import Landing from './pages/Landing';
import Solutions from './pages/Solutions';
import Technology from './pages/Technology';
import Pricing from './pages/Pricing';
import Hub from './pages/Hub';
import Showcase from './pages/Showcase';

// --- TOOL MODULES ---
import GeoSculptorModule from './modules/GeoSculptor';
import WallArtModule from './modules/WallArt';
import IntersectionModule from './modules/Intersection';

// --- NEW REPLICATOR MODULE ---
import Replicator from './modules/Replicator';
import MobileSensor from './modules/Replicator/MobileSensor';

// --- UTILS ---
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// --- BACKEND WARM-UP ---
const BACKEND_URL = "https://shadow-sculpture-backend.onrender.com";

function App() {
  useEffect(() => {
    const warmUp = async () => {
      try {
        await fetch(`${BACKEND_URL}/ping`, { mode: 'no-cors' });
      } catch (e) {
        console.log("📡 Server wake-up signal sent.");
      }
    };
    warmUp();
  }, []);

  return (
    <Router>
      <ScrollToTop />
      
      <div className="min-h-screen bg-zinc-950">
        <Routes>
          {/* MARKETING PAGES */}
          <Route path="/" element={<Landing />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/technology" element={<Technology />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/showcase" element={<Showcase />} />

          {/* TOOL MODULES */}
          <Route path="/geo" element={<GeoSculptorModule />} />
          <Route path="/wall-art" element={<WallArtModule />} />
          <Route path="/app/intersection" element={<IntersectionModule />} />
          <Route path="/hub" element={<Hub />} />

          {/* REPLICATOR ENGINE (New) */}
          <Route path="/replicator" element={<Replicator />} />
          <Route path="/sensor/:id" element={<MobileSensor />} />

          {/* 404 CATCH-ALL */}
          <Route 
            path="*" 
            element={
              <div className="h-screen flex flex-col items-center justify-center text-white font-mono bg-zinc-950">
                <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">404 // Protocol Error</h1>
                <p className="text-zinc-500 mb-8 uppercase text-[10px] tracking-widest">The requested coordinates do not exist.</p>
                <a href="/" className="px-6 py-2 border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black transition-all text-[10px] font-bold uppercase tracking-widest">
                  Return to Base
                </a>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;