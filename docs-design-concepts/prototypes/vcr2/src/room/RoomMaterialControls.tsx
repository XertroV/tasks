import { CARPET_BASE, CEILING_BASE, WALLPAPER_BASE } from '@/shared/constants';
import { useControls } from 'leva';

const DEFAULT_VALUES = {
  wallDecay: 0.5,
  carpetWear: 0.3,
  fogDensity: 0.04,
};

export function useRoomMaterialControls() {
  const { wallDecay, carpetWear, fogDensity } = useControls(
    'Room Materials',
    {
      wallDecay: { value: DEFAULT_VALUES.wallDecay, min: 0, max: 1, step: 0.01 },
      carpetWear: { value: DEFAULT_VALUES.carpetWear, min: 0, max: 1, step: 0.01 },
      fogDensity: { value: DEFAULT_VALUES.fogDensity, min: 0, max: 0.1, step: 0.001 },
    },
    { collapsed: false }
  );

  return {
    wallDecay,
    carpetWear,
    fogDensity,
  };
}

export { WALLPAPER_BASE, CARPET_BASE, CEILING_BASE };
