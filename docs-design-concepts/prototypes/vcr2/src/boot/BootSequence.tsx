import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { getPhaseDuration, useBootStore } from './bootStore';

export interface BootSequenceProps {
  onComplete?: () => void;
  autoStart?: boolean;
}

export function BootSequence({ onComplete, autoStart = true }: BootSequenceProps) {
  const currentPhase = useBootStore((state) => state.currentPhase);
  const phaseStartTime = useBootStore((state) => state.phaseStartTime);
  const isComplete = useBootStore((state) => state.isComplete);
  const advancePhase = useBootStore((state) => state.advancePhase);
  const setPhaseStartTime = useBootStore((state) => state.setPhaseStartTime);
  const startedRef = useRef(false);

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      setPhaseStartTime(performance.now() / 1000);
    }
  }, [autoStart, setPhaseStartTime]);

  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  useFrame(() => {
    if (isComplete) return;

    const now = performance.now() / 1000;
    const phaseElapsed = now - phaseStartTime;
    const phaseDuration = getPhaseDuration(currentPhase);

    if (phaseElapsed >= phaseDuration) {
      advancePhase();
    }
  });

  return null;
}

export function useBootPhase(): string {
  return useBootStore((state) => state.currentPhase);
}

export function useBootProgress(): number {
  const currentPhase = useBootStore((state) => state.currentPhase);
  const phaseStartTime = useBootStore((state) => state.phaseStartTime);
  const isComplete = useBootStore((state) => state.isComplete);

  if (isComplete || currentPhase === 'READY') return 1;

  const now = performance.now() / 1000;
  const elapsed = now - phaseStartTime;
  const duration = getPhaseDuration(currentPhase);

  return Math.min(elapsed / duration, 1);
}
