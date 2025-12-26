import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// --- MARKETING PAGES ---
import Landing from './pages/Landing';
import Solutions from './pages/Solutions';
import Technology from './pages/Technology';
import Pricing from './pages/Pricing';
import Hub from './pages/Hub';
import Showcase from './pages/Showcase';

// --- TOOL MODULES (Using your specified names/paths) ---
import GeoSculptorModule from './modules/GeoSculptor';
import WallArtModule from './modules/WallArt';
import IntersectionModule from './modules/Intersection';

// --- UTILS ---
// Helper to force scroll to top on page change
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
        // Wakes up Render while user browses the landing page
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
          {/* MARKETING PAGES 
              Note: The <Header /> is inside these individual files 
              so it doesn't overlap your 3D tools.
          */}
          <Route path="/" element={<Landing />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/technology" element={<Technology />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/showcase" element={<Showcase />} />

          {/* TOOL MODULES 
              These will now be full-screen without the marketing header.
          */}
          <Route path="/geo" element={<GeoSculptorModule />} />
          <Route path="/wall-art" element={<WallArtModule />} />
          <Route path="/app/intersection" element={<IntersectionModule />} />
          <Route path="/hub" element={<Hub />} />

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