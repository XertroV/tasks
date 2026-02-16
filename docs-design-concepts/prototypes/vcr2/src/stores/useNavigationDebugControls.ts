import { useVCRStore } from '@/vcr/vcrStore';
import { button, useControls } from 'leva';
import { type TransitionState, useNavigationStore } from './navigationStore';

export interface NavigationDebugControls {
  currentPageId: string;
  targetPageId: string | null;
  transitionState: TransitionState;
  transitionProgress: number;
  showHitboxes: boolean;
}

export function useNavigationDebugControls(enabled = true): NavigationDebugControls {
  const currentPageId = useNavigationStore((state) => state.currentPageId);
  const targetPageId = useNavigationStore((state) => state.targetPageId);
  const transitionState = useNavigationStore((state) => state.transitionState);
  const transitionProgress = useNavigationStore((state) => state.transitionProgress);
  const startTransition = useNavigationStore((state) => state.startTransition);
  const cancelTransition = useNavigationStore((state) => state.cancelTransition);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const vcrMode = useVCRStore((state) => state.mode);

  const controls = useControls(
    'Navigation',
    {
      'Current Page': { value: currentPageId ?? 'none', editable: false },
      'Target Page': { value: targetPageId ?? 'none', editable: false },
      'Transition State': { value: transitionState, editable: false },
      'Transition Progress': { value: transitionProgress, min: 0, max: 1, step: 0.01 },
      'VCR Mode': { value: vcrMode, editable: false },
      'Show Hitboxes': { value: false },
      'Trigger FF Transition': button(() => {
        if (transitionState === 'IDLE') {
          startTransition('test-page', 100, 'forward');
          useVCRStore.getState().fastForward();
        }
      }),
      'Trigger REW Transition': button(() => {
        if (transitionState === 'IDLE') {
          startTransition('test-page', 50, 'backward');
          useVCRStore.getState().rewind();
        }
      }),
      'Cancel Transition': button(() => {
        cancelTransition();
        useVCRStore.getState().stop();
      }),
      'Navigate to Index': button(() => {
        navigateTo('index');
      }),
      'Navigate to Menu': button(() => {
        navigateTo('menu');
      }),
    },
    { collapsed: true }
  );

  if (!enabled) {
    return {
      currentPageId: '',
      targetPageId: null,
      transitionState: 'IDLE',
      transitionProgress: 0,
      showHitboxes: false,
    };
  }

  return {
    currentPageId: controls['Current Page'] as string,
    targetPageId: controls['Target Page'] === 'none' ? null : (controls['Target Page'] as string),
    transitionState: controls['Transition State'] as TransitionState,
    transitionProgress: controls['Transition Progress'] as number,
    showHitboxes: controls['Show Hitboxes'] as boolean,
  };
}
