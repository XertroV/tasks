import { button, useControls } from 'leva';
import { useCallback, useRef } from 'react';
import type { TimelineEngine } from './TimelineEngine';
import { type HorrorPhase, useHorrorStore } from './horrorStore';

export interface HorrorDebugConfig {
  enabled: boolean;
  forceIntensity: number;
  timeScale: number;
  showEntityAlways: boolean;
}

const PHASE_ORDER: HorrorPhase[] = ['DORMANT', 'UNEASY', 'ESCALATING', 'CLIMAX', 'POST'];

const PHASE_INTENSITY_MAP: Record<HorrorPhase, number> = {
  DORMANT: 0,
  UNEASY: 0.2,
  ESCALATING: 0.5,
  CLIMAX: 0.8,
  POST: 1.0,
};

export function useHorrorDebugControls(
  engineRef?: React.RefObject<TimelineEngine | null>,
  store?: ReturnType<typeof import('leva').useCreateStore>
): HorrorDebugConfig {
  const setPhase = useHorrorStore((state) => state.setPhase);
  const reset = useHorrorStore.getState().reset;

  const configRef = useRef<HorrorDebugConfig>({
    enabled: true,
    timeScale: 1,
    forceIntensity: -1,
    showEntityAlways: false,
  });

  const forcePhase = useCallback(
    (phase: HorrorPhase) => {
      const intensity = PHASE_INTENSITY_MAP[phase];
      setPhase(phase);
      useHorrorStore.getState().tick(0.001);
      console.debug('[HorrorDebug] Force phase:', phase, 'intensity:', intensity);
    },
    [setPhase]
  );

  const phaseButtons = PHASE_ORDER.reduce(
    (acc, phase) => Object.assign(acc, { [`→ ${phase}`]: button(() => forcePhase(phase)) }),
    {} as Record<string, ReturnType<typeof button>>
  );

  const config = useControls(
    'Horror',
    {
      enabled: { value: true, label: 'Enabled' },
      forceIntensity: {
        value: -1,
        min: -1,
        max: 1,
        step: 0.1,
        label: 'Force Intensity',
      },
      timeScale: {
        value: 1,
        min: 0.1,
        max: 10,
        step: 0.1,
        label: 'Time Scale',
      },
      showEntityAlways: { value: false, label: 'Show Entity Always' },
    },
    { store }
  );

  useControls('Horror Phases', phaseButtons, { store });

  useControls(
    'Horror Actions',
    {
      Reset: button(() => {
        reset();
        if (engineRef?.current) {
          engineRef.current.reset();
        }
      }),
      Pause: button(() => {
        if (engineRef?.current) {
          engineRef.current.pause();
        }
      }),
      Resume: button(() => {
        if (engineRef?.current) {
          engineRef.current.resume();
        }
      }),
    },
    { store }
  );

  configRef.current = {
    enabled: config.enabled as boolean,
    forceIntensity: config.forceIntensity as number,
    timeScale: config.timeScale as number,
    showEntityAlways: config.showEntityAlways as boolean,
  };

  return configRef.current;
}
