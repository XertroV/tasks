import { Canvas } from '@react-three/fiber';
import './App.css';
import { Room } from '@/room';
import type { RoomSurfaceMaterials } from '@/room/RoomGeometry';
import { useVCRStore } from '@/vcr';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';

const DebugMount = import.meta.env.DEV
  ? lazy(() => import('@/debug/DebugMount').then((module) => ({ default: module.DebugMount })))
  : null;

const DebugOverlay = import.meta.env.DEV
  ? lazy(() => import('@/debug/DebugMount').then((module) => ({ default: module.DebugOverlay })))
  : null;

function App() {
  const materialRefs = useRef<RoomSurfaceMaterials | null>(null);
  const [crtScreenMode, setCrtScreenMode] = useState<'no-signal' | 'docs'>('no-signal');

  useEffect(() => {
    const loadId = window.setTimeout(() => {
      useVCRStore.getState().loadTape();
    }, 300);

    const timeoutId = window.setTimeout(() => {
      setCrtScreenMode('docs');
      useVCRStore.getState().play();
    }, 2500);

    const intervalId = window.setInterval(() => {
      const state = useVCRStore.getState();
      if (state.mode === 'PLAYING' || state.mode === 'FF' || state.mode === 'REW') {
        state.tick(0.1);
      }
    }, 100);

    return () => {
      window.clearTimeout(loadId);
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="app">
      <Canvas camera={{ position: [0, 1.2, -2], fov: 60 }}>
        <Room
          crtScreenMode={crtScreenMode}
          onMaterialsReady={(materials) => {
            materialRefs.current = materials;
          }}
        />
        {DebugMount ? (
          <Suspense fallback={null}>
            <DebugMount />
          </Suspense>
        ) : null}
      </Canvas>
      {DebugOverlay ? (
        <Suspense fallback={null}>
          <DebugOverlay />
        </Suspense>
      ) : null}
    </div>
  );
}

export default App;
