/**
 * IS_DEBUG flag - true in development, false in production
 * Vite replaces import.meta.env.DEV with false in production builds,
 * enabling tree-shaking of debug code
 */
export const IS_DEBUG = import.meta.env.DEV;
