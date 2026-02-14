import { button, useControls } from 'leva';
import { useEffect } from 'react';
import { useVCRStore } from './vcrStore';
import type { VCRMode } from './vcrStore';

export function useVCRDebugControls(_enabled = true) {
  const mode = useVCRStore((state) => state.mode);
  const currentTime = useVCRStore((state) => state.currentTime);
  const displayText = useVCRStore((state) => state.displayText);
  const tapeLoaded = useVCRStore((state) => state.tapeLoaded);
  const setPosition = useVCRStore((state) => state.setPosition);

  const play = useVCRStore((state) => state.play);
  const pause = useVCRStore((state) => state.pause);
  const stop = useVCRStore((state) => state.stop);
  const fastForward = useVCRStore((state) => state.fastForward);
  const rewind = useVCRStore((state) => state.rewind);
  const eject = useVCRStore((state) => state.eject);
  const loadTape = useVCRStore((state) => state.loadTape);

  const controls = useControls('VCR', {
    mode: {
      value: mode,
      options: ['EJECTED', 'LOADING', 'STOPPED', 'PLAYING', 'PAUSED', 'FF', 'REW'] as VCRMode[],
      label: 'Mode',
    },
    currentTime: { value: currentTime, min: 0, max: 7200, step: 0.1, label: 'Position (s)' },
    displayText: { value: displayText, editable: false, label: 'Display' },
    tapeLoaded: { value: tapeLoaded, editable: false, label: 'Tape Loaded' },
  });

  useControls('VCR Actions', {
    '▶ Play': button(play),
    '⏸ Pause': button(pause),
    '⏹ Stop': button(stop),
    '⏩ FF': button(fastForward),
    '⏪ REW': button(rewind),
    '⏏ Eject': button(eject),
    '⟳ Load': button(loadTape),
  });

  useEffect(() => {
    if (controls.currentTime !== currentTime) {
      setPosition(controls.currentTime as number);
    }
  }, [controls.currentTime, setPosition, currentTime]);

  return { controls };
}

export interface VCRDisplayState {
  text: string;
  icon: string;
  timecode: string;
  mode: VCRMode;
}

export function getDisplayState(state: {
  mode: VCRMode;
  currentTime: number;
  displayText: string;
}): VCRDisplayState {
  const icons: Record<VCRMode, string> = {
    EJECTED: '⏏',
    LOADING: '⟳',
    STOPPED: '⏹',
    PLAYING: '▶',
    PAUSED: '⏸',
    FF: '⏩',
    REW: '⏪',
  };

  const timecode =
    state.mode === 'EJECTED' || state.mode === 'LOADING' ? '--:--:--:--' : state.displayText;

  return {
    text: state.displayText,
    icon: icons[state.mode],
    timecode,
    mode: state.mode,
  };
}

export function VCRDebugPanel() {
  useVCRDebugControls(import.meta.env.DEV);
  return null;
}
