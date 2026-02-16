import { useNavigationStore } from '@/stores/navigationStore';
import { type VCRMode, useVCRStore } from '@/vcr/vcrStore';
import { useEffect, useRef } from 'react';
import { AudioEngine } from './AudioEngine';
import {
  type AmbientDroneNodes,
  type CrackleNodes,
  type FFRewWhirNodes,
  type TapeHissNodes,
  type VcrMotorNodes,
  createAmbientDrone,
  createFFREWScreech,
  createFFWhir,
  createREWWhir,
  createStaticCrackle,
  createTapeHiss,
  createVcrMotorHum,
  modulateFFPitch,
  modulateREWPitch,
} from './ProceduralSynth';

export function useTapeAudio(): void {
  const mode = useVCRStore((state) => state.mode);
  const tapeLoaded = useVCRStore((state) => state.tapeLoaded);
  const transitionProgress = useNavigationStore((state) => state.transitionProgress);
  const transitionState = useNavigationStore((state) => state.transitionState);

  const hissRef = useRef<TapeHissNodes | null>(null);
  const crackleRef = useRef<CrackleNodes | null>(null);
  const motorRef = useRef<VcrMotorNodes | null>(null);
  const ambientRef = useRef<AmbientDroneNodes | null>(null);
  const prevModeRef = useRef<VCRMode | null>(null);
  const screechTimeoutRef = useRef<number | null>(null);
  const ffWhirRef = useRef<FFRewWhirNodes | null>(null);
  const rewWhirRef = useRef<FFRewWhirNodes | null>(null);

  const isFFTransition = transitionState.startsWith('FF');
  const isREWTransition = transitionState.startsWith('REW');

  useEffect(() => {
    const ctx = AudioEngine.getContext();
    if (!ctx) return;

    if (!ambientRef.current) {
      ambientRef.current = createAmbientDrone();
      if (ambientRef.current) {
        ambientRef.current.noiseSource.start();
        ambientRef.current.sineSource.start();
        ambientRef.current.ventilationSource.start();
      }
    }

    if (tapeLoaded && !hissRef.current) {
      hissRef.current = createTapeHiss();
      crackleRef.current = createStaticCrackle();
      motorRef.current = createVcrMotorHum();

      if (hissRef.current) {
        hissRef.current.source.start();
      }
      if (crackleRef.current) {
        crackleRef.current.source.start();
      }
      if (motorRef.current) {
        motorRef.current.source.start();
      }
    }

    if (!tapeLoaded && hissRef.current) {
      try {
        hissRef.current.source.stop();
      } catch {}
      hissRef.current = null;

      if (crackleRef.current) {
        try {
          crackleRef.current.source.stop();
        } catch {}
        crackleRef.current = null;
      }
      if (motorRef.current) {
        try {
          motorRef.current.source.stop();
        } catch {}
        motorRef.current = null;
      }
    }
  }, [tapeLoaded]);

  useEffect(() => {
    if (motorRef.current?.gain) {
      const playing = mode === 'PLAYING' || mode === 'FF' || mode === 'REW';
      motorRef.current.gain.gain.value = playing ? 0.08 : 0.02;
    }
  }, [mode]);

  useEffect(() => {
    const prevMode = prevModeRef.current;
    prevModeRef.current = mode;

    if (!prevMode) return;

    const wasFastMotion = prevMode === 'FF' || prevMode === 'REW';
    const isFastMotion = mode === 'FF' || mode === 'REW';
    const enteringFastMotion = isFastMotion && !wasFastMotion;
    const exitingFastMotion = wasFastMotion && !isFastMotion;

    if (enteringFastMotion) {
      if (screechTimeoutRef.current) {
        clearTimeout(screechTimeoutRef.current);
      }

      const screech = createFFREWScreech();
      if (screech) {
        screech.source.start();
        screech.source.onended = () => {
          screech.gain.disconnect();
        };
      }

      if (mode === 'FF' && !ffWhirRef.current) {
        ffWhirRef.current = createFFWhir();
        if (ffWhirRef.current) {
          ffWhirRef.current.noiseSource.start();
          ffWhirRef.current.oscillator.start();
        }
      } else if (mode === 'REW' && !rewWhirRef.current) {
        rewWhirRef.current = createREWWhir();
        if (rewWhirRef.current) {
          rewWhirRef.current.noiseSource.start();
          rewWhirRef.current.oscillator.start();
        }
      }

      screechTimeoutRef.current = window.setInterval(() => {
        if (useVCRStore.getState().mode === 'FF' || useVCRStore.getState().mode === 'REW') {
          const nextScreech = createFFREWScreech();
          if (nextScreech) {
            nextScreech.source.start();
            nextScreech.source.onended = () => {
              nextScreech.gain.disconnect();
            };
          }
        } else {
          if (screechTimeoutRef.current) {
            clearInterval(screechTimeoutRef.current);
            screechTimeoutRef.current = null;
          }
        }
      }, 400);
    }

    if (exitingFastMotion) {
      if (ffWhirRef.current) {
        try {
          ffWhirRef.current.noiseSource.stop();
          ffWhirRef.current.oscillator.stop();
        } catch {}
        ffWhirRef.current = null;
      }
      if (rewWhirRef.current) {
        try {
          rewWhirRef.current.noiseSource.stop();
          rewWhirRef.current.oscillator.stop();
        } catch {}
        rewWhirRef.current = null;
      }
    }

    if (!isFastMotion && screechTimeoutRef.current) {
      clearInterval(screechTimeoutRef.current);
      screechTimeoutRef.current = null;
    }
  }, [mode]);

  useEffect(() => {
    if (ffWhirRef.current) {
      modulateFFPitch(ffWhirRef.current, transitionProgress);
    }
    if (rewWhirRef.current) {
      modulateREWPitch(rewWhirRef.current, transitionProgress);
    }
  }, [transitionProgress]);

  useEffect(() => {
    if (isFFTransition && !ffWhirRef.current) {
      ffWhirRef.current = createFFWhir();
      if (ffWhirRef.current) {
        ffWhirRef.current.noiseSource.start();
        ffWhirRef.current.oscillator.start();
      }
    } else if (isREWTransition && !rewWhirRef.current) {
      rewWhirRef.current = createREWWhir();
      if (rewWhirRef.current) {
        rewWhirRef.current.noiseSource.start();
        rewWhirRef.current.oscillator.start();
      }
    }

    if (!isFFTransition && ffWhirRef.current) {
      try {
        ffWhirRef.current.noiseSource.stop();
        ffWhirRef.current.oscillator.stop();
      } catch {}
      ffWhirRef.current = null;
    }
    if (!isREWTransition && rewWhirRef.current) {
      try {
        rewWhirRef.current.noiseSource.stop();
        rewWhirRef.current.oscillator.stop();
      } catch {}
      rewWhirRef.current = null;
    }
  }, [isFFTransition, isREWTransition]);

  useEffect(() => {
    return () => {
      if (hissRef.current) {
        try {
          hissRef.current.source.stop();
        } catch {}
      }
      if (crackleRef.current) {
        try {
          crackleRef.current.source.stop();
        } catch {}
      }
      if (motorRef.current) {
        try {
          motorRef.current.source.stop();
        } catch {}
      }
      if (ambientRef.current) {
        try {
          ambientRef.current.noiseSource.stop();
          ambientRef.current.sineSource.stop();
          ambientRef.current.ventilationSource.stop();
        } catch {}
      }
      if (screechTimeoutRef.current) {
        clearInterval(screechTimeoutRef.current);
      }
      if (ffWhirRef.current) {
        try {
          ffWhirRef.current.noiseSource.stop();
          ffWhirRef.current.oscillator.stop();
        } catch {}
      }
      if (rewWhirRef.current) {
        try {
          rewWhirRef.current.noiseSource.stop();
          rewWhirRef.current.oscillator.stop();
        } catch {}
      }
    };
  }, []);
}
