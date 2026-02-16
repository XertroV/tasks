import { useVCRStore } from '@/vcr/vcrStore';
import { useCallback, useEffect, useRef } from 'react';
import { useNavigationStore } from './navigationStore';

const TRANSITION_DURATION_MS = 1500;
const PAUSE_DELAY_MS = 300;
const TIMEOUT_MS = 5000;

export type TransitionPhase = 'IDLE' | 'START' | 'SEEK' | 'ARRIVE';

function getPhaseFromProgress(progress: number): TransitionPhase {
  if (progress <= 0) return 'IDLE';
  if (progress < 0.2) return 'START';
  if (progress < 0.8) return 'SEEK';
  return 'ARRIVE';
}

export interface NavigationTransitionState {
  phase: TransitionPhase;
  progress: number;
  isTransitioning: boolean;
  isFF: boolean;
  isREW: boolean;
  interpolatedTime: number;
}

export function useNavigationTransition(): NavigationTransitionState {
  const transitionState = useNavigationStore((state) => state.transitionState);
  const transitionProgress = useNavigationStore((state) => state.transitionProgress);
  const targetTapePosition = useNavigationStore((state) => state.targetTapePosition);
  const currentTapePosition = useNavigationStore((state) => state.currentTapePosition);
  const setTransitionProgress = useNavigationStore((state) => state.setTransitionProgress);
  const setTransitionState = useNavigationStore((state) => state.setTransitionState);
  const completeTransition = useNavigationStore((state) => state.completeTransition);
  const cancelTransition = useNavigationStore((state) => state.cancelTransition);

  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const playTimeoutRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);

  const isFF = transitionState.startsWith('FF');
  const isREW = transitionState.startsWith('REW');
  const isTransitioning = transitionState !== 'IDLE';

  const phase = isTransitioning ? getPhaseFromProgress(transitionProgress) : 'IDLE';

  const interpolatedTime = isTransitioning
    ? currentTapePosition + (targetTapePosition - currentTapePosition) * transitionProgress
    : currentTapePosition;

  const startTransition = useCallback(() => {
    startTimeRef.current = performance.now();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const currentState = useNavigationStore.getState();
      if (currentState.transitionState !== 'IDLE') {
        console.warn('[NavigationTransition] Timeout - cancelling stuck transition');
        cancelTransition();
        useVCRStore.getState().stop();
      }
    }, TIMEOUT_MS);
  }, [cancelTransition]);

  useEffect(() => {
    if (isTransitioning && startTimeRef.current === null) {
      startTransition();
    } else if (!isTransitioning) {
      startTimeRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isTransitioning, startTransition]);

  useEffect(() => {
    if (!isTransitioning || startTimeRef.current === null) return;

    const tick = () => {
      const elapsed = performance.now() - (startTimeRef.current ?? 0);
      const progress = Math.min(1, elapsed / TRANSITION_DURATION_MS);

      setTransitionProgress(progress);

      const newPhase = getPhaseFromProgress(progress);

      if (transitionState.startsWith('FF_START') && newPhase === 'SEEK') {
        setTransitionState('FF_SEEK');
      } else if (transitionState.startsWith('FF_SEEK') && newPhase === 'ARRIVE') {
        setTransitionState('FF_ARRIVE');
      } else if (transitionState.startsWith('REW_START') && newPhase === 'SEEK') {
        setTransitionState('REW_SEEK');
      } else if (transitionState.startsWith('REW_SEEK') && newPhase === 'ARRIVE') {
        setTransitionState('REW_ARRIVE');
      }

      if (progress >= 1) {
        const vcrStore = useVCRStore.getState();
        vcrStore.setPosition(targetTapePosition);
        vcrStore.play();

        if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = window.setTimeout(() => {
          useVCRStore.getState().pause();
        }, PAUSE_DELAY_MS);

        completeTransition();
        startTimeRef.current = null;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    const frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [
    isTransitioning,
    transitionState,
    targetTapePosition,
    setTransitionProgress,
    setTransitionState,
    completeTransition,
  ]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  return {
    phase,
    progress: transitionProgress,
    isTransitioning,
    isFF,
    isREW,
    interpolatedTime,
  };
}
