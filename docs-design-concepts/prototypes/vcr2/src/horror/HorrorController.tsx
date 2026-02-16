import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { TimelineEngine, type TimelineEngineConfig } from './TimelineEngine';
import { defaultTimeline } from './horror-timelines';
import { useHorrorStore } from './horrorStore';

export interface HorrorControllerProps {
  autoStart?: boolean;
  customTimeline?: typeof defaultTimeline;
  onPhaseChange?: (phase: string) => void;
  onEventTrigger?: (eventId: string) => void;
}

export function HorrorController({
  autoStart = true,
  customTimeline,
  onPhaseChange,
  onEventTrigger,
}: HorrorControllerProps) {
  const engineRef = useRef<TimelineEngine | null>(null);
  const lastPhaseRef = useRef<string>('');
  const enabled = useHorrorStore((state) => state.enabled);
  const disabling = useHorrorStore((state) => state.disabling);

  useEffect(() => {
    if (!enabled || disabling) return;

    const timeline = customTimeline ?? defaultTimeline;
    const config: TimelineEngineConfig = {
      defaultEvents: [...timeline],
      onEventTrigger: (event) => {
        onEventTrigger?.(event.id);
      },
    };

    engineRef.current = new TimelineEngine(config);

    if (autoStart) {
      engineRef.current.start();
    }

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [enabled, disabling, autoStart, customTimeline, onEventTrigger]);

  useFrame((_, delta) => {
    if (!enabled || disabling) return;

    const store = useHorrorStore.getState();
    store.tick(delta);

    const currentPhase = store.phase;
    if (currentPhase !== lastPhaseRef.current) {
      lastPhaseRef.current = currentPhase;
      onPhaseChange?.(currentPhase);
    }
  });

  return null;
}

export default HorrorController;
