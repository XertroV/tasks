import { create } from 'zustand';

export type VCRMode = 'EJECTED' | 'LOADING' | 'STOPPED' | 'PLAYING' | 'PAUSED' | 'FF' | 'REW';

interface VCRState {
  mode: VCRMode;
  tapeLoaded: boolean;
  currentTime: number;
  targetTime: number | null;
  displayText: string;
  isTransitioning: boolean;
  transitionProgress: number;
}

interface VCRActions {
  setMode: (mode: VCRMode) => void;
  eject: () => void;
  loadTape: () => void;
  setTargetPosition: (time: number) => void;
  setPosition: (time: number) => void;
  setTransitionProgress: (progress: number) => void;
  tick: (delta: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  fastForward: () => void;
  rewind: () => void;
}

type VCRStore = VCRState & VCRActions;

const VALID_TRANSITIONS: Record<VCRMode, VCRMode[]> = {
  EJECTED: ['LOADING'],
  LOADING: ['STOPPED', 'EJECTED'],
  STOPPED: ['PLAYING', 'FF', 'REW', 'EJECTED'],
  PLAYING: ['PAUSED', 'STOPPED', 'FF', 'REW'],
  PAUSED: ['PLAYING', 'STOPPED', 'FF', 'REW'],
  FF: ['STOPPED', 'PAUSED', 'PLAYING'],
  REW: ['STOPPED', 'PAUSED', 'PLAYING'],
};

const DISPLAY_TEXT: Record<VCRMode, string> = {
  EJECTED: '--:--:--',
  LOADING: 'LOADING',
  STOPPED: 'STOP',
  PLAYING: 'PLAY',
  PAUSED: 'PAUSE',
  FF: 'FF',
  REW: 'REW',
};

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const f = Math.floor((safe % 1) * 30);

  return [h, m, s, f].map((v) => v.toString().padStart(2, '0')).join(':');
}

function computeDisplayText(state: VCRState): string {
  if (state.mode === 'EJECTED' || state.mode === 'LOADING') {
    return DISPLAY_TEXT[state.mode];
  }

  if (state.isTransitioning && state.targetTime !== null) {
    const interpolated =
      state.currentTime + (state.targetTime - state.currentTime) * (state.transitionProgress ?? 0);
    return formatTimecode(interpolated);
  }

  return formatTimecode(state.currentTime);
}

function isValidTransition(from: VCRMode, to: VCRMode): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export const useVCRStore = create<VCRStore>((set, get) => ({
  mode: 'EJECTED',
  tapeLoaded: false,
  currentTime: 0,
  targetTime: null,
  displayText: '--:--:--',
  isTransitioning: false,
  transitionProgress: 0,

  setMode: (newMode) => {
    const current = get();

    if (!isValidTransition(current.mode, newMode)) {
      console.warn(`[VCR] Invalid transition: ${current.mode} -> ${newMode}`);
      return;
    }

    set({
      mode: newMode,
      displayText: computeDisplayText({ ...current, mode: newMode }),
    });
  },

  eject: () => {
    const current = get();

    if (!isValidTransition(current.mode, 'EJECTED')) {
      console.warn(`[VCR] Cannot eject from ${current.mode}`);
      return;
    }

    set({
      mode: 'EJECTED',
      tapeLoaded: false,
      currentTime: 0,
      targetTime: null,
      displayText: '--:--:--',
      isTransitioning: false,
      transitionProgress: 0,
    });
  },

  loadTape: () => {
    const current = get();

    if (current.mode !== 'EJECTED') {
      console.warn(`[VCR] Can only load tape when EJECTED, current: ${current.mode}`);
      return;
    }

    set({
      mode: 'LOADING',
      tapeLoaded: true,
      displayText: 'LOADING',
    });

    setTimeout(() => {
      const state = get();
      if (state.mode === 'LOADING') {
        set({
          mode: 'STOPPED',
          currentTime: 0,
          displayText: 'STOP',
        });
      }
    }, 1500);
  },

  setTargetPosition: (time) => {
    set({
      targetTime: Math.max(0, time),
      isTransitioning: true,
      transitionProgress: 0,
      displayText: formatTimecode(Math.max(0, time)),
    });
  },

  setPosition: (time) => {
    const current = get();
    const newTime = Math.max(0, time);
    set({
      currentTime: newTime,
      displayText: computeDisplayText({ ...current, currentTime: newTime }),
    });
  },

  setTransitionProgress: (progress) => {
    const current = get();
    const clampedProgress = Math.max(0, Math.min(1, progress));
    set({
      transitionProgress: clampedProgress,
      displayText: computeDisplayText({ ...current, transitionProgress: clampedProgress }),
    });
  },

  tick: (delta) => {
    const state = get();
    let newTime = state.currentTime;

    switch (state.mode) {
      case 'PLAYING':
        newTime = state.currentTime + delta;
        break;
      case 'FF':
        newTime = state.currentTime + delta * 4;
        break;
      case 'REW':
        newTime = Math.max(0, state.currentTime - delta * 4);
        break;
      default:
        return;
    }

    set({
      currentTime: newTime,
      displayText: computeDisplayText({ ...state, currentTime: newTime }),
    });
  },

  play: () => {
    const current = get();
    if (isValidTransition(current.mode, 'PLAYING')) {
      set({
        mode: 'PLAYING',
        isTransitioning: false,
        transitionProgress: 0,
        displayText: computeDisplayText({ ...current, mode: 'PLAYING' }),
      });
    }
  },

  pause: () => {
    const current = get();
    if (isValidTransition(current.mode, 'PAUSED')) {
      set({
        mode: 'PAUSED',
        isTransitioning: false,
        transitionProgress: 0,
        displayText: 'PAUSE',
      });
    }
  },

  stop: () => {
    const current = get();
    if (isValidTransition(current.mode, 'STOPPED')) {
      set({
        mode: 'STOPPED',
        isTransitioning: false,
        transitionProgress: 0,
        displayText: 'STOP',
      });
    }
  },

  fastForward: () => {
    const current = get();
    if (isValidTransition(current.mode, 'FF')) {
      set({
        mode: 'FF',
        displayText: 'FF',
      });
    }
  },

  rewind: () => {
    const current = get();
    if (isValidTransition(current.mode, 'REW')) {
      set({
        mode: 'REW',
        displayText: 'REW',
      });
    }
  },
}));

export type { VCRState, VCRActions };
