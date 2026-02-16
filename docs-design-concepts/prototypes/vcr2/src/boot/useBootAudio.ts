import { createFluorescentBuzz, createTapeLoadingSound, createTvStaticBurst } from '@/audio';
import { useEffect, useRef } from 'react';
import { useBootStore } from './bootStore';

export function useBootAudio() {
  const currentPhase = useBootStore((state) => state.currentPhase);
  const prevPhaseRef = useRef<string | null>(null);
  const buzzSourceRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);

  useEffect(() => {
    if (prevPhaseRef.current === currentPhase) return;

    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = currentPhase;

    if (currentPhase === 'TV_POWER_ON' && prevPhase !== 'TV_POWER_ON') {
      createTvStaticBurst();
    }

    if (currentPhase === 'TAPE_LOAD' && prevPhase !== 'TAPE_LOAD') {
      createTapeLoadingSound();
    }

    if (currentPhase === 'ROOM_FADE' && !buzzSourceRef.current) {
      buzzSourceRef.current = createFluorescentBuzz();
      if (buzzSourceRef.current) {
        buzzSourceRef.current.source.start();
      }
    }
  }, [currentPhase]);

  useEffect(() => {
    return () => {
      if (buzzSourceRef.current) {
        buzzSourceRef.current.source.stop();
        buzzSourceRef.current = null;
      }
    };
  }, []);
}
