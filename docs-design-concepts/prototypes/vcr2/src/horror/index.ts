export {
  useHorrorStore,
  easeInOutQuad,
  interpolateIntensity,
  PHASE_DURATIONS,
  ACTIVITY_IDLE_THRESHOLD,
  calculateIntensity,
  type HorrorPhase,
  type TimelineEvent,
  type HorrorState,
  type HorrorActions,
  type VHSUniforms,
  type ActiveEvent,
} from './horrorStore';
export { TimelineEngine, useTimelineEngine, getTimelineEngine } from './TimelineEngine';
export type { TimelineEngineState, TimelineEngineConfig } from './TimelineEngine';
export { EntityOpacityController, useEntityOpacityController } from './EntityOpacityController';
export type {
  EntityState,
  EntityAnimationConfig,
  AnimationPattern,
} from './EntityOpacityController';
export { useEntityDebugControls } from './useEntityDebugControls';
export type { EntityDebugConfig } from './useEntityDebugControls';
export { useHorrorDebugControls } from './useHorrorDebugControls';
export type { HorrorDebugConfig } from './useHorrorDebugControls';
export { TimelineVisualizer } from './TimelineVisualizer';
export { HorrorCameraBridge } from './HorrorCameraBridge';
export { HorrorEntity } from './HorrorEntity';
export { HorrorController } from './HorrorController';
export type { HorrorControllerProps } from './HorrorController';
export { PostHorrorScreen, HorrorChoiceScreen } from './PostHorrorScreen';
export {
  ScreenEntity,
  CorruptedTimecodeDisplay,
  ChannelBleedOverlay,
  type EntityMessageData,
  type ScreenEntityProps,
} from './ScreenEntity';
export {
  corruptText,
  corruptTimecode,
  generateEntityMessage,
  getChannelBleed,
  generateStaticFace,
  ENTITY_FACE_ASCII,
  type CorruptedTextOptions,
} from './corruptedText';
export {
  addZalgo,
  replaceWords,
  ENTITY_MESSAGES,
  WRONG_WORDS,
  TEXT_REPLACEMENTS,
  SCREEN_TAKEOVER_MESSAGES,
  FINAL_MESSAGES,
  type ZalgoOptions,
  type ReplaceWordsOptions,
} from './corruption-effects';
export { defaultTimeline, type TimelineEventConfig } from './horror-timelines';
