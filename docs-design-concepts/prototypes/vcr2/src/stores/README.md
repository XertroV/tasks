/**
 * Store Patterns and Best Practices
 * 
 * This file documents the patterns to follow when creating Zustand stores
 * for the VCR2 project.
 */

/**
 * Pattern 1: Store Structure
 * 
 * Each store should:
 * - Have a clear, single responsibility
 * - Export both the hook (useXStore) and the store instance (xStore)
 * - Use TypeScript interfaces for state shape
 * - Group related state and actions together
 */

/**
 * Pattern 2: State Access
 * 
 * In React components (causes re-render):
 *   const { value, action } = useMyStore();
 * 
 * In animation loops (no re-render):
 *   const { value, action } = myStore.getState();
 * 
 * For per-frame values that don't need persistence:
 *   const valueRef = useRef(0);
 *   useFrame(() => { valueRef.current = calculateValue(); });
 */

/**
 * Pattern 3: Selectors
 * 
 * Use granular selectors to prevent unnecessary re-renders:
 *   // Good - only re-renders when counter changes
 *   const counter = useMyStore(state => state.counter);
 *   
 *   // Bad - re-renders when ANY store property changes
 *   const { counter } = useMyStore();
 * 
 * For multiple values, use separate selectors:
 *   const counter = useMyStore(state => state.counter);
 *   const isActive = useMyStore(state => state.isActive);
 */

/**
 * Pattern 4: Actions
 * 
 * Actions should:
 * - Be pure functions when possible
 * - Use get() to read current state before updating
 * - Log important state changes via Logger
 * - Handle errors gracefully
 */

/**
 * Pattern 5: Async Actions
 * 
 * For async operations:
 *   fetchData: async () => {
 *     set({ isLoading: true });
 *     try {
 *       const data = await api.fetch();
 *       set({ data, isLoading: false });
 *     } catch (error) {
 *       set({ error, isLoading: false });
 *       logger.error('Failed to fetch:', error);
 *     }
 *   }
 */

/**
 * Pattern 6: Computed Values
 * 
 * For derived state, use selectors outside the store:
 *   const doubleCounter = useMyStore(state => state.counter * 2);
 * 
 * Or create a custom hook:
 *   function useDoubleCounter() {
 *     return useMyStore(state => state.counter * 2);
 *   }
 */

export {};
