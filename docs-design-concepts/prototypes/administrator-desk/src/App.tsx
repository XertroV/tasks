import { Suspense, useEffect, useRef } from 'react'
import Scene from './components/Scene'
import DeskUI from './components/DeskUI'

// Audio Engine
const useAmbientSound = () => {
  const audioContext = useRef<AudioContext | null>(null)
  const oscillator = useRef<OscillatorNode | null>(null)
  const gainNode = useRef<GainNode | null>(null)
  
  useEffect(() => {
    // Init audio on first interaction (browser policy)
    const initAudio = () => {
        if (audioContext.current) return;
        
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        audioContext.current = ctx;
        
        // Create Brown Noise buffer (approx)
        const bufferSize = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // Auto-gain
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        
        // Lowpass filter for "hum"
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 120; // Deep hum
        
        const gain = ctx.createGain();
        gain.gain.value = 0.05;
        gainNode.current = gain;
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start();
        
        oscillator.current = noise as any; // saving buffer source
    }

    const startListener = () => initAudio();
    window.addEventListener('click', startListener, { once: true });
    window.addEventListener('keydown', startListener, { once: true });

    return () => {
        audioContext.current?.close();
        window.removeEventListener('click', startListener);
        window.removeEventListener('keydown', startListener);
    }
  }, [])

  const setPitch = (scrollPercent: number) => {
      // Deepen the hum by lowering playback rate
      if (oscillator.current && audioContext.current) {
          // Normal rate 1.0. Lower to 0.5 as we scroll down.
          const rate = 1.0 - (scrollPercent * 0.4); 
          // Use linearRampToValueAtTime for smoother transitions or setTargetAtTime
          if ((oscillator.current as any).playbackRate.cancelScheduledValues) {
            (oscillator.current as any).playbackRate.cancelScheduledValues(audioContext.current.currentTime);
          }
          (oscillator.current as any).playbackRate.setTargetAtTime(rate, audioContext.current.currentTime, 0.2);
      }
  }
  
  return { setPitch }
}

export default function App() {
  const { setPitch } = useAmbientSound()

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#1a1a1a]">
      {/* 3D Background */}
      <Suspense fallback={<div className="absolute inset-0 bg-[#C8B860]" />}>
        <Scene />
      </Suspense>

      {/* UI Overlay */}
      <DeskUI onScroll={setPitch} />
      
      {/* Vignette Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-60"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, #000000 120%)'
        }}
      />
      {/* Grain Overlay using CSS noise generator if available, or just a simple pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </main>
  )
}
