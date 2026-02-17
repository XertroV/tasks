import { button, useControls } from 'leva';
import { useBootStore } from './bootStore';

export interface BootDebugConfig {
  showDebugPhase: boolean;
}

export function useBootDebugControls(
  _enabled = true,
  store?: ReturnType<typeof import('leva').useCreateStore>
): BootDebugConfig {
  const currentPhase = useBootStore((state) => state.currentPhase);
  const elapsed = useBootStore((state) => state.elapsed);
  const isComplete = useBootStore((state) => state.isComplete);
  const isSkipped = useBootStore((state) => state.isSkipped);
  const skip = useBootStore((state) => state.skip);
  const reset = useBootStore((state) => state.reset);
  const advancePhase = useBootStore((state) => state.advancePhase);

  useControls(
    'Boot',
    {
      phase: { value: currentPhase, editable: false },
      elapsed: { value: elapsed.toFixed(2), editable: false },
      isComplete: { value: isComplete, editable: false },
      isSkipped: { value: isSkipped, editable: false },
    },
    { store }
  );

  useControls(
    'Boot Actions',
    {
      'Skip Boot': button(() => {
        skip();
      }),
      'Reset Boot': button(() => {
        reset();
      }),
      'Advance Phase': button(() => {
        advancePhase();
      }),
    },
    { store }
  );

  return {
    showDebugPhase: true,
  };
}
