import { create } from 'zustand';
import * as THREE from 'three';

export const CAMERA_CONFIG = {
  defaultPosition: new THREE.Vector3(0, 1.2, -4),
  defaultTarget: new THREE.Vector3(0, 0.9, -7),
  fov: 60,
  near: 0.1,
  far: 100,
  breathing: {
    amplitude: 0.003,
    frequency: 0.25,
    rotationAmplitude: 0.0005,
    rotationFrequency: 0.15,
  },
  lookBehind: {
    targetPosition: new THREE.Vector3(0, 1.4, -4),
    targetLookAt: new THREE.Vector3(0, 1.0, 0),
    transitionDuration: 0.8,
  },
} as const;

export type CameraMode = 'normal' | 'look-behind' | 'horror-override';

export interface HorrorOverrides {
  driftIntensity: number;
  shakeIntensity: number;
  zoomIntensity: number;
  targetOffset: THREE.Vector3;
}

export interface CameraState {
  mode: CameraMode;
  isTransitioning: boolean;
  transitionProgress: number;
  horrorOverrides: HorrorOverrides | null;
}

export interface CameraActions {
  setMode: (mode: CameraMode) => void;
  setTransitioning: (transitioning: boolean, progress?: number) => void;
  applyHorrorOverride: (overrides: Partial<HorrorOverrides>) => void;
  clearHorrorOverrides: () => void;
  reset: () => void;
}

type CameraStore = CameraState & CameraActions;

const DEFAULT_HORROR_OVERRIDES: HorrorOverrides = {
  driftIntensity: 0,
  shakeIntensity: 0,
  zoomIntensity: 0,
  targetOffset: new THREE.Vector3(0, 0, 0),
};

export const useCameraStore = create<CameraStore>((set, get) => ({
  mode: 'normal',
  isTransitioning: false,
  transitionProgress: 0,
  horrorOverrides: null,

  setMode: (mode: CameraMode) => {
    const currentMode = get().mode;
    if (mode !== currentMode) {
      set({ mode, isTransitioning: true, transitionProgress: 0 });
    }
  },

  setTransitioning: (transitioning: boolean, progress = 0) => {
    set({ isTransitioning: transitioning, transitionProgress: progress });
  },

  applyHorrorOverride: (overrides: Partial<HorrorOverrides>) => {
    const current = get().horrorOverrides ?? { ...DEFAULT_HORROR_OVERRIDES };
    const newOverrides: HorrorOverrides = {
      ...current,
      ...overrides,
      targetOffset: overrides.targetOffset ?? current.targetOffset,
    };
    set({ mode: 'horror-override', horrorOverrides: newOverrides });
  },

  clearHorrorOverrides: () => {
    set({ mode: 'normal', horrorOverrides: null });
  },

  reset: () => {
    set({
      mode: 'normal',
      isTransitioning: false,
      transitionProgress: 0,
      horrorOverrides: null,
    });
  },
}));

export function getCameraTarget(mode: CameraMode): THREE.Vector3 {
  if (mode === 'look-behind') {
    return CAMERA_CONFIG.lookBehind.targetLookAt.clone();
  }
  return CAMERA_CONFIG.defaultTarget.clone();
}

export function getCameraPosition(mode: CameraMode): THREE.Vector3 {
  if (mode === 'look-behind') {
    return CAMERA_CONFIG.lookBehind.targetPosition.clone();
  }
  return CAMERA_CONFIG.defaultPosition.clone();
}
