import { useEffect, useRef, useState } from 'react';
import { getPhaseDuration, useBootStore } from './bootStore';

export function BootOverlay() {
  const currentPhase = useBootStore((state) => state.currentPhase);
  const phaseStartTime = useBootStore((state) => state.phaseStartTime);
  const isComplete = useBootStore((state) => state.isComplete);
  const [opacity, setOpacity] = useState(1);
  const [visible, setVisible] = useState(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      if (!visible || isComplete) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        return;
      }

      if (currentPhase === 'ROOM_FADE') {
        const now = performance.now() / 1000;
        const elapsed = now - phaseStartTime;
        const duration = getPhaseDuration('ROOM_FADE');
        const progress = Math.min(elapsed / duration, 1);
        setOpacity(1 - progress);

        if (progress >= 1) {
          setVisible(false);
          return;
        }
      } else if (currentPhase === 'READY') {
        setVisible(false);
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    if (visible && !isComplete) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentPhase, phaseStartTime, visible, isComplete]);

  useEffect(() => {
    if (isComplete) {
      setVisible(false);
    }
  }, [isComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
        opacity: opacity,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
