import { useControls, button } from 'leva';
import type { ZapperControllerRef } from './ZapperController';

export interface ZapperDebugConfig {
  showZapper: boolean;
  showCable: boolean;
  zapperScale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  recoilStrength: number;
  muzzleFlashIntensity: number;
}

export function useZapperDebugControls(
  zapperRef: React.RefObject<ZapperControllerRef | null>,
  _enabled = true
): ZapperDebugConfig {
  const config = useControls('Lightgun', {
    showZapper: { value: true },
    showCable: { value: true },
    zapperScale: { value: 1, min: 0.5, max: 2, step: 0.1 },
    offsetX: { value: 0.25, min: -1, max: 1, step: 0.01 },
    offsetY: { value: -0.15, min: -1, max: 1, step: 0.01 },
    offsetZ: { value: -0.3, min: -1, max: 0, step: 0.01 },
    recoilStrength: { value: 1, min: 0, max: 3, step: 0.1 },
    muzzleFlashIntensity: { value: 1, min: 0, max: 3, step: 0.1 },
  });

  useControls('Lightgun Actions', {
    'Test Fire': button(() => {
      if (zapperRef.current) {
        zapperRef.current.triggerRecoil();
        zapperRef.current.triggerMuzzleFlash();
      }
    }),
  });

  return {
    showZapper: config.showZapper as boolean,
    showCable: config.showCable as boolean,
    zapperScale: config.zapperScale as number,
    offsetX: config.offsetX as number,
    offsetY: config.offsetY as number,
    offsetZ: config.offsetZ as number,
    recoilStrength: config.recoilStrength as number,
    muzzleFlashIntensity: config.muzzleFlashIntensity as number,
  };
}
