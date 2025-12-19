import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Plus, Play, ShieldAlert, ExternalLink, Image as ImageIcon, Trash2, ArrowRight, AlertCircle, Upload, X, Cast, Menu } from 'lucide-react';

/**
 * SHOWFLOW SAAS (BETA 1.5)
 * * FEATURES:
 * - Robust Google Cast / AirMedia Guide
 * - Removed Crop Tool
 * - Unlocked Standby Image
 */

const App = () => {
  const [isProjector, setIsProjector] = useState(window.location.hash === '#projector');
  
  // State
  const [sources, setSources] = useState([]);
  const [previewSourceId, setPreviewSourceId] = useState(null); 
  const [programSourceId, setProgramSourceId] = useState(null); 
  const [standbyImage, setStandbyImage] = useState(null); 
  
  const [projectorWindow, setProjectorWindow] = useState(null);
  const [projectorStatus, setProjectorStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Cast Guide State
  const [showCastGuide, setShowCastGuide] = useState(false);

  const previewRef = useRef(null);
  const programRef = useRef(null);

  // --- INIT & PROJECTOR ROUTING ---
  useEffect(() => {
    const handleHashChange = () => setIsProjector(window.location.hash === '#projector');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- GOOGLE CAST HANDLER ---
  const handleCast = () => {
    // Since we cannot programmatically force the browser's "Cast Tab" menu to open
    // (security restriction), we open a helpful guide pointing the user to it.
    setShowCastGuide(true);
  };

  // --- SOURCE MANAGEMENT ---
  const addSource = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen capture requires HTTPS.");
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "never" },
        audio: true
      });

      const newSource = {
        id: crypto.randomUUID(),
        name: stream.getVideoTracks()[0].label || `Source ${sources.length + 1}`,
        stream: stream,
      };

      setSources(prev => [...prev, newSource]);
      
      if (sources.length === 0) setPreviewSourceId(newSource.id);

      stream.getVideoTracks()[0].onended = () => removeSource(newSource.id);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setErrorMessage(err.message || "Error adding source.");
      }
    }
  };

  const removeSource = (id) => {
    setSources(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (previewSourceId === id) setPreviewSourceId(null);
      if (programSourceId === id) cutToBlack();
      return filtered;
    });
  };

  // --- PREVIEW LOGIC ---
  useEffect(() => {
    const source = sources.find(s => s.id === previewSourceId);
    if (previewRef.current) {
      previewRef.current.srcObject = source ? source.stream : null;
    }
  }, [previewSourceId, sources]);

  // --- PROGRAM / GO LOGIC ---
  const handleTake = () => {
    if (!previewSourceId) return;
    
    setProgramSourceId(previewSourceId);
    const source = sources.find(s => s.id === previewSourceId);
    
    if (programRef.current) programRef.current.srcObject = source ? source.stream : null;

    if (projectorWindow && !projectorWindow.closed) {
      const remoteVideo = projectorWindow.document.getElementById('projector-video');
      const remoteImg = projectorWindow.document.getElementById('fallback-img');
      
      if (remoteVideo) {
        remoteVideo.srcObject = source ? source.stream : null;
        remoteVideo.classList.remove('hidden');
        if (remoteImg) remoteImg.style.display = 'none'; 
      }
    }
  };

  const cutToBlack = () => {
    setProgramSourceId(null);
    if (programRef.current) programRef.current.srcObject = null;

    if (projectorWindow && !projectorWindow.closed) {
      const remoteVideo = projectorWindow.document.getElementById('projector-video');
      const remoteImg = projectorWindow.document.getElementById('fallback-img');

      if (remoteVideo) {
        remoteVideo.classList.add('hidden');
        remoteVideo.srcObject = null;
      }
      if (remoteImg) remoteImg.style.display = 'block';
    }
  };

  // --- STANDBY IMAGE LOGIC ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target.result;
        setStandbyImage(data);
        if (projectorWindow && !projectorWindow.closed) {
          const remoteImg = projectorWindow.document.getElementById('fallback-img');
          if (remoteImg) remoteImg.src = data;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- WINDOW MANAGEMENT ---
  const openProjector = () => {
    const win = window.open(window.location.href + '#projector', 'ShowFlowProjector', 'width=1280,height=720');
    if (win) {
      setProjectorWindow(win);
      setProjectorStatus('connected');
      
      win.onload = () => {
        if (standbyImage) {
           const remoteImg = win.document.getElementById('fallback-img');
           if (remoteImg) remoteImg.src = standbyImage;
        }
      };

      const timer = setInterval(() => {
        if (win.closed) {
          setProjectorStatus('disconnected');
          clearInterval(timer);
        }
      }, 1000);
    } else {
      setProjectorStatus('blocked');
    }
  };

  // ---------------------------------------------------------
  // RENDER: PROJECTOR VIEW
  // ---------------------------------------------------------
  if (isProjector) {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">
        {/* Layer 0: Fallback Image */}
        <img 
            id="fallback-img" 
            className="absolute inset-0 w-full h-full object-cover z-0" 
            alt=""
        />
        
        {/* Layer 0.5: Placeholder Icon (only if no image) */}
        <div className="absolute inset-0 flex items-center justify-center -z-10">
             <Monitor size={120} className="text-zinc-900" />
        </div>

        {/* Layer 1: Live Video */}
        <video 
          id="projector-video" 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-contain z-10 hidden"
        />

        {/* Layer 2: Free Tier Watermark */}
        <div className="absolute bottom-8 right-8 z-50 pointer-events-none opacity-40 select-none">
          <p className="text-white text-2xl font-black tracking-tighter drop-shadow-lg">
            SHOWFLOW <span className="text-sm font-normal tracking-normal opacity-70">FREE</span>
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: DASHBOARD
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 font-sans flex flex-col relative">
      
      {/* --- CAST GUIDE MODAL --- */}
      {showCastGuide && (
        <div className="fixed inset-0 z-[100] flex items-start justify-end p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCastGuide(false)}></div>
            
            {/* Modal */}
            <div className="relative bg-zinc-900 border border-zinc-700 text-zinc-100 p-6 rounded-2xl shadow-2xl max-w-sm mt-16 mr-2 animate-in fade-in slide-in-from-top-4">
                {/* Arrow pointing to browser menu */}
                <div className="absolute -top-3 right-8 w-6 h-6 bg-zinc-900 border-t border-l border-zinc-700 rotate-45 transform"></div>
                
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Cast size={18} className="text-blue-500" /> 
                        Cast to TV / AirMedia
                    </h3>
                    <button onClick={() => setShowCastGuide(false)} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                    ShowFlow uses your browser's native mirroring engine to ensure the lowest latency.
                </p>

                <div className="space-y-4 mb-6">
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-700">1</div>
                        <div>
                            <p className="text-sm font-bold text-zinc-200">Open Browser Menu</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Click the <Menu size={12} className="inline mx-1" /> or <strong>Three Dots</strong> icon in the top-right corner of Chrome/Edge.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-700">2</div>
                        <div>
                            <p className="text-sm font-bold text-zinc-200">Select "Cast..."</p>
                            <p className="text-xs text-zinc-500 mt-0.5">It may be under <strong>"Save and Share"</strong> in newer versions.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-700">3</div>
                        <div>
                            <p className="text-sm font-bold text-zinc-200">Choose Device</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Select your Chromecast, AirMedia, or Smart TV from the list.</p>
                        </div>
                    </div>
                </div>

                <button onClick={() => setShowCastGuide(false)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-colors text-sm">
                    Done
                </button>
            </div>
        </div>
      )}

      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="w-full px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-8 h-8 rounded shrink-0 object-contain bg-zinc-800"
              onError={(e) => {
                e.target.onerror = null; 
                e.target.style.display = 'none'; 
                e.target.nextSibling.style.display = 'flex'; 
              }}
            />
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black italic shrink-0" style={{display: 'none'}}>SF</div>
            
            <h1 className="text-lg font-bold tracking-tight hidden sm:block">ShowFlow <span className="text-zinc-500 font-medium text-sm">Free</span></h1>
          </div>
          <div className="flex items-center gap-4">
            
            {/* GOOGLE CAST BUTTON */}
            <button 
              onClick={handleCast}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all border ${
                  showCastGuide 
                  ? 'bg-zinc-800 text-white border-zinc-600' 
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              }`}
              title="Cast to AirMedia / Chromecast"
            >
              <Cast size={16} />
              <span className="hidden sm:inline">Cast</span>
            </button>

            {projectorStatus === 'blocked' && (
              <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-md text-xs font-bold border border-amber-500/20">
                <ShieldAlert size={14} /> <span className="hidden sm:inline">POPUP BLOCKED</span>
              </div>
            )}
            <button 
              onClick={openProjector}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                projectorStatus === 'connected' 
                ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
              }`}
            >
              <span className="hidden sm:inline">{projectorStatus === 'connected' ? 'Projector Active' : 'Output Window'}</span>
              <span className="sm:hidden">Projector</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-red-950 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-start gap-3 shadow-2xl max-w-md">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-bold">Error</p>
              <p className="text-xs opacity-80 mt-1">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-300 hover:text-white">&times;</button>
          </div>
        </div>
      )}

      {/* Main Content: Forced 2-Column Grid */}
      <main className="flex-1 p-4 lg:p-6 overflow-hidden">
        <div className="grid grid-cols-2 gap-4 lg:gap-8 h-full min-h-[400px]">
          
          {/* LEFT COLUMN: PREVIEW & SOURCES */}
          <div className="flex flex-col gap-4 h-full min-w-0">
            
            {/* 1. Preview Monitor */}
            <div className="flex-1 bg-zinc-900 border-2 border-[#34A853] rounded-2xl overflow-hidden relative flex flex-col min-h-0">
               <div className="absolute top-4 left-4 z-20 bg-green-600/90 text-white text-xs font-black px-3 py-1 rounded shadow-lg">
                  PREVIEW
               </div>
               <div className="flex-1 relative bg-black min-h-0">
                 <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                 {!previewSourceId && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700">
                        <Monitor size={48} />
                        <span className="text-sm font-bold mt-2">Select a Source Below</span>
                    </div>
                 )}
               </div>
               
               {/* Controls Bar */}
               <div className="h-16 shrink-0 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between px-6">
                  <div className="flex items-center gap-4">
                     <span className="text-xs font-bold text-zinc-500 whitespace-nowrap">{sources.length} Available</span>
                  </div>

                  <button 
                    onClick={handleTake}
                    disabled={!previewSourceId}
                    className={`flex items-center gap-2 px-6 lg:px-8 py-2 rounded-lg text-sm font-black tracking-wide uppercase transition-all whitespace-nowrap ${
                        previewSourceId 
                        ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 hover:scale-105'
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    GO <ArrowRight size={16} />
                  </button>
               </div>
            </div>

            {/* 2. Source Carousel (Gallery) */}
            <div className="h-28 lg:h-32 shrink-0 bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 flex gap-3 overflow-x-auto custom-scrollbar">
                {sources.map(source => (
                  <div 
                    key={source.id}
                    onClick={() => setPreviewSourceId(source.id)}
                    className={`flex-shrink-0 w-32 lg:w-44 bg-zinc-900 rounded-lg overflow-hidden border-2 cursor-pointer relative group ${
                        previewSourceId === source.id ? 'border-green-500' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="h-full w-full relative">
                        <VideoPreview stream={source.stream} />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1.5 backdrop-blur-sm">
                            <p className="text-[10px] font-bold truncate text-white">{source.name}</p>
                        </div>
                        {programSourceId === source.id && (
                             <div className="absolute top-1 right-1 bg-red-600 w-2 h-2 rounded-full animate-pulse shadow-md" />
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); removeSource(source.id); }}
                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-600 text-zinc-400 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
                            title="Remove Source"
                        >
                            <X size={14} />
                        </button>
                    </div>
                  </div>
                ))}
                
                {/* Add Source Placeholder in Gallery */}
                <button 
                    onClick={addSource}
                    className="flex-shrink-0 w-20 lg:w-24 bg-zinc-900/50 hover:bg-zinc-800 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-1 text-zinc-600 hover:text-zinc-400 transition-all"
                >
                    <Plus size={20} />
                    <span className="text-[10px] font-bold">Source</span>
                </button>
            </div>

            {/* 3. Standby Image Section */}
            <div className="shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 flex items-center justify-center relative shrink-0">
                        {standbyImage ? (
                            <img src={standbyImage} className="w-full h-full object-cover" alt="Standby" />
                        ) : (
                            <ImageIcon size={20} className="text-zinc-600" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-200 whitespace-nowrap">Standby Image</h3>
                        <p className="text-xs text-zinc-500 hidden sm:block">Shown when "PANIC" is active</p>
                    </div>
                </div>
                <div className="relative w-full lg:w-auto">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="w-full lg:w-auto flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-zinc-700 transition-colors">
                        <Upload size={12} /> Upload
                    </button>
                </div>
            </div>

          </div>

          {/* RIGHT COLUMN: LIVE PROGRAM */}
          <div className="flex flex-col gap-4 h-full min-w-0">
            <div className="flex-1 bg-black border-2 border-[#B90000] rounded-2xl overflow-hidden relative shadow-2xl flex flex-col min-h-0">
                <div className="absolute top-4 left-4 z-20 bg-red-600/90 text-white text-xs font-black px-3 py-1 rounded shadow-lg">
                    LIVE
                </div>
                <div className="flex-1 relative overflow-hidden min-h-0">
                    <video ref={programRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                    {!programSourceId && standbyImage && (
                        <img src={standbyImage} className="absolute inset-0 w-full h-full object-cover" alt="Program Standby" />
                    )}
                    {!programSourceId && !standbyImage && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/50">
                            <Monitor size={64} className="text-zinc-700" />
                            <p className="text-zinc-500 text-sm font-bold mt-2 uppercase tracking-widest text-center px-4">Signal Offline</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Panic & Output Status */}
            <div className="h-32 shrink-0 grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 lg:p-6 flex flex-col justify-center relative group min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest truncate">Output Status</h3>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${projectorStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-700'}`} />
                    </div>
                    <p className="text-sm font-bold truncate">
                        {projectorStatus === 'connected' ? 'Display Connected' : 'No Projector'}
                    </p>
                </div>

                <button 
                    onClick={cutToBlack}
                    className="flex flex-col items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 border-2 border-red-900/30 hover:border-red-600 transition-all group"
                >
                    <div className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-all mb-2">
                        <Play size={18} className="rotate-90" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-tighter text-red-100">PANIC</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 uppercase font-bold text-center">Cut to Standby</span>
                </button>
            </div>
          </div>

        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>
    </div>
  );
};

const VideoPreview = ({ stream }) => {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  return <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />;
};

export default App;