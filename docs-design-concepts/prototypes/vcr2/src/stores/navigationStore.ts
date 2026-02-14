import { create } from 'zustand';

export type TransitionState =
  | 'IDLE'
  | 'FF_START'
  | 'FF_SEEK'
  | 'FF_ARRIVE'
  | 'REW_START'
  | 'REW_SEEK'
  | 'REW_ARRIVE';

export type NavigationDirection = 'forward' | 'backward' | 'jump';

export interface NavigationState {
  currentPageId: string | null;
  currentTapePosition: number;
  targetPageId: string | null;
  targetTapePosition: number;
  transitionState: TransitionState;
  transitionProgress: number;
  transitionDirection: NavigationDirection;
  isLoading: boolean;
  history: string[];
  historyIndex: number;
}

export interface NavigationActions {
  navigateTo: (pageId: string) => void;
  goBack: () => void;
  goForward: () => void;
  setCurrentPage: (pageId: string, tapePosition: number) => void;
  setTransitionState: (state: TransitionState) => void;
  setTransitionProgress: (progress: number) => void;
  setLoading: (loading: boolean) => void;
  startTransition: (
    targetId: string,
    targetPosition: number,
    direction: NavigationDirection
  ) => void;
  completeTransition: () => void;
  cancelTransition: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
}

type NavigationStore = NavigationState & NavigationActions;

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  currentPageId: 'index',
  currentTapePosition: 0,
  targetPageId: null,
  targetTapePosition: 0,
  transitionState: 'IDLE',
  transitionProgress: 0,
  transitionDirection: 'forward',
  isLoading: false,
  history: ['index'],
  historyIndex: 0,

  navigateTo: (pageId: string) => {
    const state = get();
    if (pageId === state.currentPageId) return;

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(pageId);

    set({
      targetPageId: pageId,
      targetTapePosition: 0,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      transitionDirection: 'forward',
    });
  },

  goBack: () => {
    const state = get();
    if (state.historyIndex <= 0) return;

    const newIndex = state.historyIndex - 1;
    const targetId = state.history[newIndex];

    if (!targetId) return;

    set({
      targetPageId: targetId,
      targetTapePosition: 0,
      historyIndex: newIndex,
      transitionDirection: 'backward',
    });
  },

  goForward: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const newIndex = state.historyIndex + 1;
    const targetId = state.history[newIndex];

    if (!targetId) return;

    set({
      targetPageId: targetId,
      targetTapePosition: 0,
      historyIndex: newIndex,
      transitionDirection: 'forward',
    });
  },

  setCurrentPage: (pageId: string, tapePosition: number) => {
    set({
      currentPageId: pageId,
      currentTapePosition: tapePosition,
      targetPageId: null,
      targetTapePosition: 0,
      transitionState: 'IDLE',
      transitionProgress: 0,
      isLoading: false,
    });
  },

  setTransitionState: (transitionState: TransitionState) => {
    set({ transitionState });
  },

  setTransitionProgress: (progress: number) => {
    set({ transitionProgress: Math.max(0, Math.min(1, progress)) });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  startTransition: (targetId: string, targetPosition: number, direction: NavigationDirection) => {
    set({
      targetPageId: targetId,
      targetTapePosition: targetPosition,
      transitionDirection: direction,
      transitionState: direction === 'forward' ? 'FF_START' : 'REW_START',
      transitionProgress: 0,
    });
  },

  completeTransition: () => {
    const state = get();
    if (!state.targetPageId) return;

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    if (newHistory[newHistory.length - 1] !== state.targetPageId) {
      newHistory.push(state.targetPageId);
    }

    set({
      currentPageId: state.targetPageId,
      currentTapePosition: state.targetTapePosition,
      targetPageId: null,
      targetTapePosition: 0,
      transitionState: 'IDLE',
      transitionProgress: 0,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isLoading: false,
    });
  },

  cancelTransition: () => {
    set({
      targetPageId: null,
      targetTapePosition: 0,
      transitionState: 'IDLE',
      transitionProgress: 0,
      isLoading: false,
    });
  },

  canGoBack: () => {
    const state = get();
    return state.historyIndex > 0;
  },

  canGoForward: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },
}));

export type { NavigationStore };
