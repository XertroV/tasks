import { AudioEngine, createWhisper, playEntitySound } from '@/audio';
import { type HorrorPhase, useHorrorStore } from '@/horror';
import { useEffect, useRef } from 'react';

const WHISPER_PHASES: HorrorPhase[] = ['UNEASY', 'ESCALATING', 'CLIMAX', 'POST'];

export function useHorrorAudio(): void {
  const phase = useHorrorStore((state) => state.phase);
  const intensity = useHorrorStore((state) => state.intensity);
  const entityVisible = useHorrorStore((state) => state.entityVisible);
  const enabled = useHorrorStore((state) => state.enabled);

  const whisperRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const prevEntityVisible = useRef(entityVisible);

  useEffect(() => {
    if (!enabled) {
      if (whisperRef.current) {
        whisperRef.current.source.stop();
        whisperRef.current = null;
      }
      return;
    }

    const shouldWhisper = WHISPER_PHASES.includes(phase);

    if (shouldWhisper && !whisperRef.current) {
      whisperRef.current = createWhisper(intensity);
      if (whisperRef.current) {
        whisperRef.current.source.start();
      }
    } else if (!shouldWhisper && whisperRef.current) {
      whisperRef.current.source.stop();
      whisperRef.current = null;
    } else if (shouldWhisper && whisperRef.current) {
      const volume = Math.max(0.02, Math.min(0.15, intensity * 0.15));
      const ctx = AudioEngine.getContext();
      if (ctx) {
        whisperRef.current.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
      }
    }
  }, [phase, intensity, enabled]);

  useEffect(() => {
    if (entityVisible && !prevEntityVisible.current && enabled) {
      playEntitySound();
    }
    prevEntityVisible.current = entityVisible;
  }, [entityVisible, enabled]);

  useEffect(() => {
    return () => {
      if (whisperRef.current) {
        whisperRef.current.source.stop();
        whisperRef.current = null;
      }
    };
  }, []);
}
