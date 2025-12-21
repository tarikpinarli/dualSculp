import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing'; 
import Engine from './pages/Engine';   // This is your Shadow Tool
import WallArt from './pages/WallArt';
import MeshyGen from './pages/MeshyGen';
// Placeholder for the future Audio Tool
const AudioTool = () => (
  <div className="h-screen bg-black text-white flex items-center justify-center font-mono text-2xl animate-pulse">
    SYSTEM_MODULE_LOADING...
  </div>
);

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/shadow" element={<Engine />} /> {/* Changed from /engine to /shadow */}
        <Route path="/audio" element={<AudioTool />} /> 
        <Route path="/wall-art" element={<WallArt />} />
        <Route path="/meshy" element={<MeshyGen />} />
      </Routes>
    </Router>
  );
}