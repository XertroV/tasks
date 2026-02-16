import { beforeEach, describe, expect, it } from 'bun:test';
import { useNavigationStore } from '../navigationStore';

describe('NavigationStore - Edge Cases', () => {
  beforeEach(() => {
    useNavigationStore.setState({
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
    });
  });

  describe('rapid navigation', () => {
    it('should reject navigateTo when transition is in progress', () => {
      const store = useNavigationStore.getState();
      store.setTransitionState('FF_START');
      store.navigateTo('page1');

      const state = useNavigationStore.getState();
      expect(state.targetPageId).toBeNull();
      expect(state.currentPageId).toBe('index');
    });

    it('should reject goBack when transition is in progress', () => {
      const store = useNavigationStore.getState();
      store.navigateTo('page1');
      store.completeTransition();
      store.setTransitionState('REW_START');
      store.goBack();

      const state = useNavigationStore.getState();
      expect(state.historyIndex).toBe(1);
    });

    it('should reject goForward when transition is in progress', () => {
      const store = useNavigationStore.getState();
      store.navigateTo('page1');
      store.completeTransition();
      store.goBack();
      store.setTransitionState('FF_START');
      store.goForward();

      const state = useNavigationStore.getState();
      expect(state.historyIndex).toBe(0);
    });
  });

  describe('history boundaries', () => {
    it('should not go back when at history start', () => {
      const store = useNavigationStore.getState();
      store.goBack();

      const state = useNavigationStore.getState();
      expect(state.historyIndex).toBe(0);
    });

    it('should not go forward when at history end', () => {
      const store = useNavigationStore.getState();
      store.goForward();

      const state = useNavigationStore.getState();
      expect(state.historyIndex).toBe(0);
    });

    it('should correctly report canGoBack', () => {
      const store = useNavigationStore.getState();
      expect(store.canGoBack()).toBe(false);

      store.navigateTo('page1');
      store.completeTransition();
      expect(store.canGoBack()).toBe(true);
    });

    it('should correctly report canGoForward', () => {
      const store = useNavigationStore.getState();
      expect(store.canGoForward()).toBe(false);

      store.navigateTo('page1');
      store.completeTransition();
      store.goBack();
      expect(store.canGoForward()).toBe(true);
    });
  });

  describe('same page navigation', () => {
    it('should ignore navigateTo same page', () => {
      const store = useNavigationStore.getState();
      store.navigateTo('index');

      const state = useNavigationStore.getState();
      expect(state.targetPageId).toBeNull();
    });
  });

  describe('transition state management', () => {
    it('should correctly report isTransitionActive', () => {
      const store = useNavigationStore.getState();
      expect(store.isTransitionActive()).toBe(false);

      store.setTransitionState('FF_SEEK');
      expect(store.isTransitionActive()).toBe(true);

      store.setTransitionState('IDLE');
      expect(store.isTransitionActive()).toBe(false);
    });

    it('should clamp transition progress to valid range', () => {
      const store = useNavigationStore.getState();
      store.setTransitionProgress(-0.5);
      expect(useNavigationStore.getState().transitionProgress).toBe(0);

      store.setTransitionProgress(1.5);
      expect(useNavigationStore.getState().transitionProgress).toBe(1);
    });
  });

  describe('cancel transition', () => {
    it('should reset all transition state on cancel', () => {
      const store = useNavigationStore.getState();
      store.startTransition('page1', 100, 'forward');
      store.cancelTransition();

      const state = useNavigationStore.getState();
      expect(state.targetPageId).toBeNull();
      expect(state.transitionState).toBe('IDLE');
      expect(state.transitionProgress).toBe(0);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('history management', () => {
    it('should truncate forward history when navigating from middle', () => {
      const store = useNavigationStore.getState();
      store.navigateTo('page1');
      store.completeTransition();
      store.navigateTo('page2');
      store.completeTransition();
      store.goBack();
      store.navigateTo('page3');

      const state = useNavigationStore.getState();
      expect(state.history).toEqual(['index', 'page1', 'page3']);
      expect(state.historyIndex).toBe(2);
    });
  });
});
