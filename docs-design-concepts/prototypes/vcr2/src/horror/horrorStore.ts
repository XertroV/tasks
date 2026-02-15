import { create } from 'zustand';

export type HorrorPhase = 'DORMANT' | 'QUIET' | 'UNEASE' | 'TENSION' | 'DREAD' | 'TERROR';

export interface TimelineEvent {
  id: string;
  type: 'flicker' | 'audio_cue' | 'visual_glitch' | 'camera_drift' | 'content_change';
  triggerTime: number;
  duration: number;
  intensity: number;
  isComplete: boolean;
}

export interface HorrorState {
  phase: HorrorPhase;
  intensity: number;
  targetIntensity: number;
  isActive: boolean;
  elapsed: number;
  lastActivity: number;
  activeEvents: TimelineEvent[];
}

export interface HorrorActions {
  setPhase: (phase: HorrorPhase) => void;
  setIntensity: (intensity: number) => void;
  setTargetIntensity: (intensity: number) => void;
  setActive: (active: boolean) => void;
  updateElapsed: (delta: number) => void;
  recordActivity: () => void;
  addEvent: (event: TimelineEvent) => void;
  removeEvent: (id: string) => void;
  clearEvents: () => void;
  reset: () => void;
}

type HorrorStore = HorrorState & HorrorActions;

const PHASE_THRESHOLDS: Record<HorrorPhase, { min: number; max: number }> = {
  DORMANT: { min: 0, max: 0 },
  QUIET: { min: 0.01, max: 0.2 },
  UNEASE: { min: 0.21, max: 0.4 },
  TENSION: { min: 0.41, max: 0.6 },
  DREAD: { min: 0.61, max: 0.8 },
  TERROR: { min: 0.81, max: 1.0 },
};

function determinePhase(intensity: number): HorrorPhase {
  for (const [phase, threshold] of Object.entries(PHASE_THRESHOLDS) as [
    HorrorPhase,
    { min: number; max: number },
  ][]) {
    if (intensity >= threshold.min && intensity <= threshold.max) {
      return phase;
    }
  }
  return 'DORMANT';
}

export const useHorrorStore = create<HorrorStore>((set, get) => ({
  phase: 'DORMANT',
  intensity: 0,
  targetIntensity: 0,
  isActive: false,
  elapsed: 0,
  lastActivity: 0,
  activeEvents: [],

  setPhase: (phase: HorrorPhase) => set({ phase }),

  setIntensity: (intensity: number) => {
    const clamped = Math.max(0, Math.min(1, intensity));
    const phase = determinePhase(clamped);
    set({ intensity: clamped, phase });
  },

  setTargetIntensity: (targetIntensity: number) => {
    const clamped = Math.max(0, Math.min(1, targetIntensity));
    set({ targetIntensity: clamped });
  },

  setActive: (active: boolean) => set({ isActive: active }),

  updateElapsed: (delta: number) => {
    const state = get();
    set({ elapsed: state.elapsed + delta });
  },

  recordActivity: () => {
    set({ lastActivity: performance.now() / 1000 });
  },

  addEvent: (event: TimelineEvent) => {
    const state = get();
    set({ activeEvents: [...state.activeEvents, event] });
  },

  removeEvent: (id: string) => {
    const state = get();
    set({ activeEvents: state.activeEvents.filter((e) => e.id !== id) });
  },

  clearEvents: () => set({ activeEvents: [] }),

  reset: () =>
    set({
      phase: 'DORMANT',
      intensity: 0,
      targetIntensity: 0,
      isActive: false,
      elapsed: 0,
      lastActivity: 0,
      activeEvents: [],
    }),
}));

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function interpolateIntensity(
  current: number,
  target: number,
  speed: number,
  delta: number
): number {
  const diff = target - current;
  const change = diff * speed * delta;
  return current + change;
}
