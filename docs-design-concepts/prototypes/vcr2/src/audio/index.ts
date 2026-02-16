export { AudioEngine, useAudioStore, initAudioOnInteraction } from './AudioEngine';
export {
  ProceduralSynth,
  playLightgunShot,
  playButtonClick,
  playVcrTransport,
  playMenuClick,
  createWhisper,
  playEntitySound,
  createTapeHiss,
  createStaticCrackle,
  createFFREWScreech,
  createVcrMotorHum,
  createAmbientDrone,
  createFFWhir,
  createREWWhir,
  modulateFFPitch,
  modulateREWPitch,
  createFluorescentBuzz,
  createTvStaticBurst,
  createTapeLoadingSound,
} from './ProceduralSynth';
export type {
  TapeHissNodes,
  CrackleNodes,
  ScreechNodes,
  VcrMotorNodes,
  AmbientDroneNodes,
  FFRewWhirNodes,
} from './ProceduralSynth';
export { useAudioDebugControls } from './useAudioDebugControls';
export { useAudioListener, SpatialAudioSetup } from './SpatialAudio';
export type { SpatialAudioConfig } from './SpatialAudio';
export { useHorrorAudio } from './useHorrorAudio';
export { useTapeAudio } from './useTapeAudio';
