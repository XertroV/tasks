import { IS_DEBUG } from '@/debug/isDebug';
import { CARPET_BASE, CEILING_BASE, WALLPAPER_BASE } from '@/shared/constants';

/**
 * Leva controls for room materials
 * Only available in development mode (IS_DEBUG)
 */
export function useRoomMaterialControls() {
  if (IS_DEBUG) {
    return {
      wallDecay: 0.5,
      carpetWear: 0.3,
      fogDensity: 0.04,
    };
  }

  return {
    wallDecay: 0.5,
    carpetWear: 0.3,
    fogDensity: 0.04,
  };
}

// Export base colors for materials
export { WALLPAPER_BASE, CARPET_BASE, CEILING_BASE };
