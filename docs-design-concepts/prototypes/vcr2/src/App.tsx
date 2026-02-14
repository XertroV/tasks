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
    const vcr = useVCRStore.getState();
    vcr.setDisplayOff();

    const loadingId = window.setTimeout(() => {
      useVCRStore.getState().setStatusText('LOADING');
    }, 600);

    const timeoutId = window.setTimeout(() => {
      setCrtScreenMode('docs');
      useVCRStore.getState().setTimecodeSeconds(0);
    }, 1800);

    const start = performance.now();
    const intervalId = window.setInterval(() => {
      const elapsedSeconds = (performance.now() - start) / 1000;
      useVCRStore.getState().setTimecodeSeconds(elapsedSeconds);
    }, 100);

    return () => {
      window.clearTimeout(loadingId);
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
