import { create } from 'zustand';

export type BootPhase =
  | 'BLACK'
  | 'ROOM_FADE'
  | 'TV_POWER_ON'
  | 'TAPE_LOAD'
  | 'PLAYBACK_BEGIN'
  | 'READY';

export interface BootState {
  currentPhase: BootPhase;
  phaseStartTime: number;
  elapsed: number;
  isSkipped: boolean;
  isComplete: boolean;
}

export interface BootActions {
  advancePhase: () => void;
  skip: () => void;
  reset: () => void;
  updateElapsed: (elapsed: number) => void;
  setPhaseStartTime: (time: number) => void;
}

type BootStore = BootState & BootActions;

const PHASE_ORDER: BootPhase[] = [
  'BLACK',
  'ROOM_FADE',
  'TV_POWER_ON',
  'TAPE_LOAD',
  'PLAYBACK_BEGIN',
  'READY',
];

const PHASE_DURATIONS: Record<BootPhase, number> = {
  BLACK: 0.5,
  ROOM_FADE: 1.0,
  TV_POWER_ON: 1.5,
  TAPE_LOAD: 1.5,
  PLAYBACK_BEGIN: 0.5,
  READY: Number.POSITIVE_INFINITY,
};

export const useBootStore = create<BootStore>((set, get) => ({
  currentPhase: 'BLACK',
  phaseStartTime: 0,
  elapsed: 0,
  isSkipped: false,
  isComplete: false,

  advancePhase: () => {
    const state = get();
    if (state.isComplete || state.isSkipped) return;

    const currentIndex = PHASE_ORDER.indexOf(state.currentPhase);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= PHASE_ORDER.length) {
      set({ isComplete: true });
      return;
    }

    const nextPhase = PHASE_ORDER[nextIndex];
    set({
      currentPhase: nextPhase,
      phaseStartTime: performance.now() / 1000,
    });
  },

  skip: () => {
    const state = get();
    if (state.isSkipped || state.currentPhase === 'READY') return;

    set({
      currentPhase: 'READY',
      isSkipped: true,
      isComplete: true,
    });
  },

  reset: () => {
    set({
      currentPhase: 'BLACK',
      phaseStartTime: 0,
      elapsed: 0,
      isSkipped: false,
      isComplete: false,
    });
  },

  updateElapsed: (elapsed: number) => {
    set({ elapsed });
  },

  setPhaseStartTime: (time: number) => {
    set({ phaseStartTime: time });
  },
}));

export function getPhaseDuration(phase: BootPhase): number {
  return PHASE_DURATIONS[phase];
}

export function getNextPhase(current: BootPhase): BootPhase | null {
  const index = PHASE_ORDER.indexOf(current);
  if (index < 0 || index >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[index + 1];
}
