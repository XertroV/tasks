import { useState, useEffect } from 'react';

interface VHSMonitorProps {
  children?: React.ReactNode;
  paused?: boolean;
  fastForward?: boolean;
  rewind?: boolean;
}

export default function VHSMonitor({ 
  children, 
  paused = false, 
  fastForward = false, 
  rewind = false 
}: VHSMonitorProps) {
  const [glitchActive, setGlitchActive] = useState(false);
  const [timecode, setTimecode] = useState('00:00:00');
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.92) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 100 + Math.random() * 200);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (fastForward || rewind) {
      let frame = 0;
      const interval = setInterval(() => {
        frame += fastForward ? 1 : -1;
        const absFrame = Math.abs(frame) % 3600;
        const mins = Math.floor(absFrame / 60);
        const secs = absFrame % 60;
        const frames = Math.floor(Math.random() * 30);
        setTimecode(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [fastForward, rewind]);
  
  const modeClass = fastForward ? 'fast-forward' : rewind ? 'rewind' : paused ? 'vhs-pause' : '';
  
  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <div className={`absolute inset-0 ${modeClass} ${glitchActive ? 'glitch' : ''}`}>
        <div className="scanlines" />
        <div className="head-switching" />
        <div className="vignette" />
        
        <div className="noise-overlay" style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.08,
          mixBlendMode: 'overlay',
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
        
        {(fastForward || rewind) && (
          <div className="absolute bottom-8 right-8 bg-black/70 px-4 py-2 border-2 border-vcr-cyan">
            <span className="vhs-text text-3xl font-vcr">
              {timecode}
            </span>
          </div>
        )}
        
        {paused && (
          <div className="absolute top-8 right-8 bg-black/70 px-3 py-1 border border-vhs-amber">
            <span className="text-vhs-amber font-vcr text-xl">PAUSE</span>
          </div>
        )}
      </div>
      
      {children}
    </div>
  );
}
