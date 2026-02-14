import { IS_DEBUG } from '@/debug/isDebug';
import { PERFORMANCE_METRICS_INTERVAL } from '@/shared/constants';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useDebugPanelStore } from './debugPanelStore';

interface BrowserPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
  };
}

export function usePerformanceMetrics() {
  const setPerformance = useDebugPanelStore((state) => state.setPerformance);
  const elapsedSinceFlush = useRef(0);
  const frameCount = useRef(0);
  const frameTimeTotal = useRef(0);

  useFrame(({ gl }, delta) => {
    if (!IS_DEBUG) {
      return;
    }

    elapsedSinceFlush.current += delta;
    frameCount.current += 1;
    frameTimeTotal.current += delta * 1000;

    if (elapsedSinceFlush.current * 1000 < PERFORMANCE_METRICS_INTERVAL) {
      return;
    }

    const frames = frameCount.current;
    const elapsed = elapsedSinceFlush.current;
    const memory = (window.performance as BrowserPerformance).memory;

    setPerformance({
      fps: frames / elapsed,
      frameTimeMs: frameTimeTotal.current / frames,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      memoryUsedMB: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0,
    });

    gl.info.reset();

    elapsedSinceFlush.current = 0;
    frameCount.current = 0;
    frameTimeTotal.current = 0;
  });
}
