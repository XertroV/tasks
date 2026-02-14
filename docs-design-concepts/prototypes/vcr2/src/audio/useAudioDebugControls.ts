import { useControls, button } from 'leva';
import {
  useAudioStore,
  playLightgunShot,
  playButtonClick,
  playVcrTransport,
  playMenuClick,
} from './index';

export function useAudioDebugControls(_enabled = true) {
  const initialized = useAudioStore((state) => state.initialized);
  const masterVolume = useAudioStore((state) => state.masterVolume);
  const sfxVolume = useAudioStore((state) => state.sfxVolume);
  const ambientVolume = useAudioStore((state) => state.ambientVolume);
  const muted = useAudioStore((state) => state.muted);

  const initialize = useAudioStore((state) => state.initialize);
  const setMasterVolume = useAudioStore((state) => state.setMasterVolume);
  const setSfxVolume = useAudioStore((state) => state.setSfxVolume);
  const setAmbientVolume = useAudioStore((state) => state.setAmbientVolume);
  const toggleMute = useAudioStore((state) => state.toggleMute);

  const controls = useControls('Audio', {
    initialized: { value: initialized, editable: false },
    masterVolume: { value: masterVolume, min: 0, max: 1, step: 0.01 },
    sfxVolume: { value: sfxVolume, min: 0, max: 1, step: 0.01 },
    ambientVolume: { value: ambientVolume, min: 0, max: 1, step: 0.01 },
    muted: { value: muted },
  });

  useControls('Audio Actions', {
    Initialize: button(() => initialize()),
    'Toggle Mute': button(() => toggleMute()),
    'Test Shot': button(() => playLightgunShot()),
    'Test Click': button(() => playButtonClick()),
    'Test VCR': button(() => playVcrTransport()),
    'Test Menu': button(() => playMenuClick()),
  });

  return {
    masterVolume: controls.masterVolume as number,
    sfxVolume: controls.sfxVolume as number,
    ambientVolume: controls.ambientVolume as number,
    muted: controls.muted as boolean,
    initialized,
    setMasterVolume,
    setSfxVolume,
    setAmbientVolume,
    toggleMute,
  };
}
