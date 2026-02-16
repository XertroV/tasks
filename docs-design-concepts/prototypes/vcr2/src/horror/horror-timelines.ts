import { ENTITY_MESSAGES } from './corruption-effects';
import type { HorrorState, TimelineEvent } from './horrorStore';

export interface TimelineEventConfig {
  id: string;
  time: number;
  timeVariance?: number;
  duration: number;
  phase?: HorrorState['phase'];
  condition?: (state: HorrorState) => boolean;
  action: (state: HorrorState) => void;
  cleanup?: () => void;
  repeat?: {
    interval: number;
    count?: number;
    intervalVariance?: number;
  };
  priority?: number;
}

function createTimelineEvent(config: TimelineEventConfig): TimelineEvent {
  return {
    id: config.id,
    time: config.time,
    timeVariance: config.timeVariance,
    duration: config.duration,
    condition: config.condition,
    action: config.action,
    cleanup: config.cleanup,
    repeat: config.repeat,
    priority: config.priority ?? 0,
    isComplete: false,
  };
}

const flickerIncrease: TimelineEventConfig = {
  id: 'flicker-increase',
  time: 5,
  timeVariance: 3,
  duration: 0.5,
  repeat: { interval: 15, count: 20, intervalVariance: 5 },
  action: (_state: HorrorState) => {
    console.debug('[Horror] Flicker increase triggered');
  },
};

const subtleTracking: TimelineEventConfig = {
  id: 'subtle-tracking',
  time: 15,
  timeVariance: 5,
  duration: 2,
  repeat: { interval: 30, count: 10, intervalVariance: 10 },
  action: (_state: HorrorState) => {
    console.debug('[Horror] Subtle tracking wave');
  },
};

const wrongWord: TimelineEventConfig = {
  id: 'wrong-word',
  time: 25,
  timeVariance: 10,
  duration: 3,
  condition: (state: HorrorState) => state.intensity >= 0.1,
  repeat: { interval: 45, count: 8, intervalVariance: 15 },
  action: (_state: HorrorState) => {
    console.debug('[Horror] Wrong word corruption');
  },
};

const trackingWaves: TimelineEventConfig = {
  id: 'tracking-waves',
  time: 40,
  timeVariance: 10,
  duration: 1.5,
  condition: (state: HorrorState) => state.phase !== 'DORMANT',
  repeat: { interval: 25, count: 12, intervalVariance: 8 },
  action: (_state: HorrorState) => {
    console.debug('[Horror] Tracking waves effect');
  },
};

const staticBursts: TimelineEventConfig = {
  id: 'static-bursts',
  time: 55,
  timeVariance: 8,
  duration: 0.3,
  repeat: { interval: 20, count: 15, intervalVariance: 5 },
  action: (_state: HorrorState) => {
    console.debug('[Horror] Static burst');
  },
};

const entityFlash1: TimelineEventConfig = {
  id: 'entity-flash-1',
  time: 70,
  timeVariance: 15,
  duration: 0.2,
  condition: (state: HorrorState) => state.phase === 'UNEASY' || state.phase === 'ESCALATING',
  repeat: { interval: 60, count: 3, intervalVariance: 20 },
  action: (state: HorrorState) => {
    state.entityVisible && console.debug('[Horror] Entity flash 1');
  },
};

const textCorruption: TimelineEventConfig = {
  id: 'text-corruption',
  time: 85,
  timeVariance: 10,
  duration: 4,
  condition: (state: HorrorState) => state.intensity >= 0.4,
  repeat: { interval: 35, count: 6, intervalVariance: 10 },
  action: (_state: HorrorState) => {
    console.debug('[Horror] Text corruption active');
  },
};

const entityFlash2: TimelineEventConfig = {
  id: 'entity-flash-2',
  time: 105,
  timeVariance: 10,
  duration: 0.4,
  condition: (state: HorrorState) => state.phase === 'ESCALATING' || state.phase === 'CLIMAX',
  priority: 5,
  repeat: { interval: 45, count: 4, intervalVariance: 15 },
  action: (state: HorrorState) => {
    console.debug('[Horror] Entity flash 2, intensity:', state.intensity);
  },
};

const wrongPageContent: TimelineEventConfig = {
  id: 'wrong-page-content',
  time: 120,
  timeVariance: 15,
  duration: 5,
  condition: (state: HorrorState) => state.intensity >= 0.5,
  repeat: { interval: 40, count: 4, intervalVariance: 10 },
  action: (_state: HorrorState) => {
    console.debug('[Horror] Wrong page content displayed');
  },
};

const entityManifest: TimelineEventConfig = {
  id: 'entity-manifest',
  time: 140,
  timeVariance: 10,
  duration: 3,
  condition: (state: HorrorState) => state.phase === 'ESCALATING' || state.phase === 'CLIMAX',
  priority: 10,
  action: (_state: HorrorState) => {
    console.debug('[Horror] Entity manifesting');
  },
};

const screenTextTakeover: TimelineEventConfig = {
  id: 'screen-text-takeover',
  time: 160,
  timeVariance: 5,
  duration: 4,
  condition: (state: HorrorState) => state.phase === 'CLIMAX',
  priority: 15,
  action: (_state: HorrorState) => {
    const msg =
      ENTITY_MESSAGES.screenTakeover[
        Math.floor(Math.random() * ENTITY_MESSAGES.screenTakeover.length)
      ];
    console.debug('[Horror] Screen takeover:', msg);
  },
};

const climaxPeak: TimelineEventConfig = {
  id: 'climax-peak',
  time: 185,
  timeVariance: 5,
  duration: 10,
  condition: (state: HorrorState) => state.phase === 'CLIMAX',
  priority: 20,
  action: (_state: HorrorState) => {
    console.debug('[Horror] CLIMAX PEAK');
  },
};

const fadeToBlack: TimelineEventConfig = {
  id: 'fade-to-black',
  time: 195,
  timeVariance: 3,
  duration: 5,
  condition: (state: HorrorState) => state.intensity >= 0.95,
  priority: 25,
  action: (_state: HorrorState) => {
    console.debug('[Horror] Fading to black');
  },
};

const audioWhisper: TimelineEventConfig = {
  id: 'audio-whisper',
  time: 30,
  timeVariance: 10,
  duration: 2,
  repeat: { interval: 40, count: 8, intervalVariance: 15 },
  action: (_state: HorrorState) => {
    console.debug('[Horror] Whisper audio');
  },
};

const audioStatic: TimelineEventConfig = {
  id: 'audio-static',
  time: 60,
  timeVariance: 5,
  duration: 1.5,
  condition: (state: HorrorState) => state.intensity >= 0.3,
  repeat: { interval: 30, count: 10, intervalVariance: 10 },
  action: (_state: HorrorState) => {
    console.debug('[Horror] Static audio burst');
  },
};

export const defaultTimeline: TimelineEvent[] = [
  createTimelineEvent(flickerIncrease),
  createTimelineEvent(subtleTracking),
  createTimelineEvent(wrongWord),
  createTimelineEvent(trackingWaves),
  createTimelineEvent(staticBursts),
  createTimelineEvent(entityFlash1),
  createTimelineEvent(textCorruption),
  createTimelineEvent(entityFlash2),
  createTimelineEvent(wrongPageContent),
  createTimelineEvent(entityManifest),
  createTimelineEvent(screenTextTakeover),
  createTimelineEvent(climaxPeak),
  createTimelineEvent(fadeToBlack),
  createTimelineEvent(audioWhisper),
  createTimelineEvent(audioStatic),
];

export { ENTITY_MESSAGES };
