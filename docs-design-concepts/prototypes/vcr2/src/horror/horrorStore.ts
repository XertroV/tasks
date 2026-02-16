import { create } from 'zustand';

export type HorrorPhase = 'DORMANT' | 'UNEASY' | 'ESCALATING' | 'CLIMAX' | 'POST';

export interface VHSUniforms {
  noiseIntensity?: number;
  scanlineIntensity?: number;
  chromaAberration?: number;
  trackingWaveIntensity?: number;
  flickerIntensity?: number;
  colorTemperature?: number;
}

export interface TimelineEvent {
  id: string;
  time: number;
  timeVariance?: number;
  duration: number;
  condition?: (state: HorrorState) => boolean;
  action: (state: HorrorState) => void;
  cleanup?: () => void;
  repeat?: {
    interval: number;
    count?: number;
    intervalVariance?: number;
  };
  priority?: number;
  isComplete?: boolean;
}

export interface ActiveEvent {
  event: TimelineEvent;
  startTime: number;
  elapsed: number;
  duration: number;
  repeatCount: number;
}

export interface HorrorState {
  enabled: boolean;
  phase: HorrorPhase;
  intensity: number;
  timeInPhase: number;
  totalTime: number;
  triggersActivated: Set<string>;
  lastTriggerTime: number;
  lastActivityTime: number;
  entityVisible: boolean;
  entityIntensity: number;
  effectOverrides: Partial<VHSUniforms>;
  disabling: boolean;
  activeEvents: TimelineEvent[];
}

export interface HorrorActions {
  enable: () => void;
  disable: () => void;
  setPhase: (phase: HorrorPhase) => void;
  tick: (delta: number) => void;
  activateTrigger: (triggerId: string) => void;
  setEntityVisible: (visible: boolean) => void;
  setEntityIntensity: (intensity: number) => void;
  setEffectOverride: (overrides: Partial<VHSUniforms>) => void;
  clearEffectOverrides: () => void;
  reportActivity: () => void;
  addEvent: (event: TimelineEvent) => void;
  removeEvent: (id: string) => void;
  clearEvents: () => void;
  reset: () => void;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
}

type HorrorStore = HorrorState & HorrorActions;

const PHASE_DURATIONS: Record<HorrorPhase, number> = {
  DORMANT: 60,
  UNEASY: 60,
  ESCALATING: 60,
  CLIMAX: 30,
  POST: Number.POSITIVE_INFINITY,
};

const ACTIVITY_IDLE_THRESHOLD = 4;

function calculateIntensity(totalTime: number): number {
  const t = Math.min(totalTime, 210);
  if (t <= 0) return 0;
  if (t >= 195) return 1.0;

  const points = [
    { time: 0, intensity: 0 },
    { time: 60, intensity: 0.2 },
    { time: 120, intensity: 0.5 },
    { time: 180, intensity: 0.8 },
    { time: 195, intensity: 1.0 },
  ];

  for (let i = 0; i < points.length - 1; i++) {
    if (t >= points[i].time && t <= points[i + 1].time) {
      const range = points[i + 1].time - points[i].time;
      const progress = (t - points[i].time) / range;
      const intensityRange = points[i + 1].intensity - points[i].intensity;
      return points[i].intensity + intensityRange * easeInOutQuad(progress);
    }
  }

  return 1.0;
}

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

function determinePhaseFromTotalTime(totalTime: number): HorrorPhase {
  if (totalTime < 60) return 'DORMANT';
  if (totalTime < 120) return 'UNEASY';
  if (totalTime < 180) return 'ESCALATING';
  if (totalTime < 210) return 'CLIMAX';
  return 'POST';
}

function calculateTimeInPhase(totalTime: number, phase: HorrorPhase): number {
  const phaseStartTimes: Record<HorrorPhase, number> = {
    DORMANT: 0,
    UNEASY: 60,
    ESCALATING: 120,
    CLIMAX: 180,
    POST: 210,
  };
  return totalTime - phaseStartTimes[phase];
}

export const useHorrorStore = create<HorrorStore>((set, get) => ({
  enabled: true,
  phase: 'DORMANT',
  intensity: 0,
  timeInPhase: 0,
  totalTime: 0,
  triggersActivated: new Set<string>(),
  lastTriggerTime: 0,
  lastActivityTime: 0,
  entityVisible: false,
  entityIntensity: 0,
  effectOverrides: {},
  disabling: false,
  activeEvents: [],

  enable: () => {
    set({
      enabled: true,
      phase: 'DORMANT',
      intensity: 0,
      timeInPhase: 0,
      totalTime: 0,
      triggersActivated: new Set<string>(),
      lastTriggerTime: 0,
      lastActivityTime: performance.now() / 1000,
      entityVisible: false,
      entityIntensity: 0,
      effectOverrides: {},
      disabling: false,
    });
  },

  disable: () => {
    set({
      enabled: false,
      phase: 'DORMANT',
      intensity: 0,
      timeInPhase: 0,
      totalTime: 0,
      triggersActivated: new Set<string>(),
      entityVisible: false,
      entityIntensity: 0,
      effectOverrides: {},
      disabling: false,
      activeEvents: [],
    });
  },

  setPhase: (phase: HorrorPhase) => set({ phase, timeInPhase: 0 }),

  tick: (delta: number) => {
    const state = get();
    if (!state.enabled || state.disabling) return;

    const newTotalTime = state.totalTime + delta;
    const newIntensity = calculateIntensity(newTotalTime);
    const newPhase = determinePhaseFromTotalTime(newTotalTime);
    const newTimeInPhase = calculateTimeInPhase(newTotalTime, newPhase);

    set({
      totalTime: newTotalTime,
      timeInPhase: newTimeInPhase,
      intensity: newIntensity,
      phase: newPhase,
    });
  },

  activateTrigger: (triggerId: string) => {
    const state = get();
    if (state.triggersActivated.has(triggerId)) return;

    const newTriggers = new Set(state.triggersActivated);
    newTriggers.add(triggerId);
    set({
      triggersActivated: newTriggers,
      lastTriggerTime: state.totalTime,
    });
  },

  setEntityVisible: (visible: boolean) => set({ entityVisible: visible }),

  setEntityIntensity: (intensity: number) => {
    const clamped = Math.max(0, Math.min(1, intensity));
    set({ entityIntensity: clamped });
  },

  setEffectOverride: (overrides: Partial<VHSUniforms>) => {
    const state = get();
    set({ effectOverrides: { ...state.effectOverrides, ...overrides } });
  },

  clearEffectOverrides: () => set({ effectOverrides: {} }),

  reportActivity: () => {
    set({ lastActivityTime: performance.now() / 1000 });
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

  reset: () => {
    set({
      enabled: true,
      phase: 'DORMANT',
      intensity: 0,
      timeInPhase: 0,
      totalTime: 0,
      triggersActivated: new Set<string>(),
      lastTriggerTime: 0,
      lastActivityTime: performance.now() / 1000,
      entityVisible: false,
      entityIntensity: 0,
      effectOverrides: {},
      disabling: false,
      activeEvents: [],
    });
  },

  setEnabled: (enabled: boolean) => {
    if (!enabled) {
      set({ disabling: true });
      setTimeout(() => {
        get().disable();
      }, 1000);
    } else {
      get().enable();
    }
  },

  toggleEnabled: () => {
    const { enabled } = get();
    get().setEnabled(!enabled);
  },
}));

export { PHASE_DURATIONS, ACTIVITY_IDLE_THRESHOLD, calculateIntensity };
