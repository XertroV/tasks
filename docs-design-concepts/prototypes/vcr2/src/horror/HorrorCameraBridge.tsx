import { useHorrorAudio } from '@/audio';
import { useCameraStore } from '@/camera';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { type HorrorPhase, useHorrorStore } from './horrorStore';

const PHASE_EFFECT_MAP: Record<HorrorPhase, { drift: number; shake: number; zoom: number }> = {
  DORMANT: { drift: 0, shake: 0, zoom: 0 },
  UNEASY: { drift: 0.005, shake: 0.002, zoom: 0 },
  ESCALATING: { drift: 0.01, shake: 0.005, zoom: 0.02 },
  CLIMAX: { drift: 0.03, shake: 0.02, zoom: 0.05 },
  POST: { drift: 0.05, shake: 0.04, zoom: 0.1 },
};

export function HorrorCameraBridge() {
  useHorrorAudio();
  const phase = useHorrorStore((state) => state.phase);
  const intensity = useHorrorStore((state) => state.intensity);
  const prevPhaseRef = useRef<HorrorPhase>(phase);

  useEffect(() => {
    if (phase === prevPhaseRef.current) return;
    prevPhaseRef.current = phase;

    const effects = PHASE_EFFECT_MAP[phase];
    const scaledIntensity = intensity;

    useCameraStore.getState().applyHorrorOverride({
      driftIntensity: effects.drift * scaledIntensity,
      shakeIntensity: effects.shake * scaledIntensity,
      zoomIntensity: effects.zoom * scaledIntensity,
      targetOffset: new Vector3(
        (Math.random() - 0.5) * effects.drift * scaledIntensity * 2,
        (Math.random() - 0.5) * effects.drift * scaledIntensity,
        0
      ),
    });

    if (phase === 'DORMANT') {
      useCameraStore.getState().clearHorrorOverrides();
    }
  }, [phase, intensity]);

  return null;
}
