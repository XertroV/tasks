import { IS_DEBUG } from '@/debug/isDebug';
import { CARPET_BASE, CEILING_BASE, WALLPAPER_BASE } from '@/shared/constants';
import { useControls } from 'leva';

/**
 * Leva controls for room materials
 * Only available in development mode (IS_DEBUG)
 */
export function useRoomMaterialControls() {
  if (!IS_DEBUG) {
    return {
      wallDecay: 0.5,
      carpetWear: 0.3,
      fogDensity: 0.04,
    };
  }

  const controls = useControls('Room Materials', {
    wallDecay: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Wall Decay',
    },
    carpetWear: {
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Carpet Wear',
    },
    fogDensity: {
      value: 0.04,
      min: 0,
      max: 0.1,
      step: 0.001,
      label: 'Fog Density',
    },
  });

  return controls;
}

// Export base colors for materials
export { WALLPAPER_BASE, CARPET_BASE, CEILING_BASE };
