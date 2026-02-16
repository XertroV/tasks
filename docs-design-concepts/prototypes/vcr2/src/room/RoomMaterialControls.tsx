import { CARPET_BASE, CEILING_BASE, WALLPAPER_BASE } from '@/shared/constants';
import { useControls } from 'leva';

const DEFAULT_VALUES = {
  wallDecay: 0.5,
  carpetWear: 0.3,
  wallBaseColor: '#d4c082',
  carpetBaseColor: '#5e4a34',
  ambientColor: '#2a220f',
  ambientIntensity: 0.09,
  lightColor: '#ffe1a8',
  keyLightIntensity: 1.45,
  fillLightIntensity: 1.3,
  fogColor: '#151109',
  fogDensity: 0.04,
};

export function useRoomMaterialControls() {
  const controls = useControls(
    'Room Materials',
    {
      wallDecay: { value: DEFAULT_VALUES.wallDecay, min: 0, max: 1, step: 0.01 },
      carpetWear: { value: DEFAULT_VALUES.carpetWear, min: 0, max: 1, step: 0.01 },
      wallBaseColor: { value: DEFAULT_VALUES.wallBaseColor },
      carpetBaseColor: { value: DEFAULT_VALUES.carpetBaseColor },
      ambientColor: { value: DEFAULT_VALUES.ambientColor },
      ambientIntensity: { value: DEFAULT_VALUES.ambientIntensity, min: 0, max: 0.5, step: 0.01 },
      lightColor: { value: DEFAULT_VALUES.lightColor },
      keyLightIntensity: { value: DEFAULT_VALUES.keyLightIntensity, min: 0.2, max: 3, step: 0.05 },
      fillLightIntensity: {
        value: DEFAULT_VALUES.fillLightIntensity,
        min: 0.2,
        max: 3,
        step: 0.05,
      },
      fogColor: { value: DEFAULT_VALUES.fogColor },
      fogDensity: { value: DEFAULT_VALUES.fogDensity, min: 0, max: 0.1, step: 0.001 },
    },
    { collapsed: false }
  );

  return {
    wallDecay: (controls.wallDecay as number) ?? DEFAULT_VALUES.wallDecay,
    carpetWear: (controls.carpetWear as number) ?? DEFAULT_VALUES.carpetWear,
    wallBaseColor: (controls.wallBaseColor as string) ?? DEFAULT_VALUES.wallBaseColor,
    carpetBaseColor: (controls.carpetBaseColor as string) ?? DEFAULT_VALUES.carpetBaseColor,
    ambientColor: (controls.ambientColor as string) ?? DEFAULT_VALUES.ambientColor,
    ambientIntensity: (controls.ambientIntensity as number) ?? DEFAULT_VALUES.ambientIntensity,
    lightColor: (controls.lightColor as string) ?? DEFAULT_VALUES.lightColor,
    keyLightIntensity: (controls.keyLightIntensity as number) ?? DEFAULT_VALUES.keyLightIntensity,
    fillLightIntensity:
      (controls.fillLightIntensity as number) ?? DEFAULT_VALUES.fillLightIntensity,
    fogColor: (controls.fogColor as string) ?? DEFAULT_VALUES.fogColor,
    fogDensity: (controls.fogDensity as number) ?? DEFAULT_VALUES.fogDensity,
  };
}

export { WALLPAPER_BASE, CARPET_BASE, CEILING_BASE };
