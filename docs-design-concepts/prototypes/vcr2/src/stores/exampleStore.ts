import { createLogger } from '@/debug/logger';
import { create } from 'zustand';

const logger = createLogger('ExampleStore');

/**
 * Example Zustand store demonstrating best practices
 *
 * IMPORTANT: Never use setState in useFrame!
 * Use refs for per-frame values that don't need to trigger React re-renders.
 * Use getState() for imperative access from animation loops.
 */

interface ExampleState {
  // State values that trigger re-renders when changed
  counter: number;
  isActive: boolean;

  // Actions
  increment: () => void;
  decrement: () => void;
  setActive: (active: boolean) => void;
  reset: () => void;
}

export const useExampleStore = create<ExampleState>((set, get) => ({
  counter: 0,
  isActive: false,

  increment: () => {
    const newValue = get().counter + 1;
    set({ counter: newValue });
    logger.debug('Counter incremented:', newValue);
  },

  decrement: () => {
    const newValue = get().counter - 1;
    set({ counter: newValue });
    logger.debug('Counter decremented:', newValue);
  },

  setActive: (active: boolean) => {
    set({ isActive: active });
    logger.info('Active state changed:', active);
  },

  reset: () => {
    set({ counter: 0, isActive: false });
    logger.info('Store reset');
  },
}));

// Export the store instance for imperative access (use in useFrame, not React components)
export const exampleStore = useExampleStore;

/**
 * Usage in React components (triggers re-renders):
 *   const { counter, increment } = useExampleStore();
 *
 * Usage in useFrame (no re-renders, use refs for animation values):
 *   const counter = exampleStore.getState().counter;
 *   const { increment } = exampleStore.getState();
 *
 * IMPORTANT ANTI-PATTERN - NEVER DO THIS:
 *   useFrame(() => {
 *     setCounter(someValue); // This causes React re-render every frame!
 *   });
 *
 * CORRECT PATTERN:
 *   const counterRef = useRef(0);
 *   useFrame(() => {
 *     counterRef.current = someValue; // Update ref, no re-render
 *   });
 */
