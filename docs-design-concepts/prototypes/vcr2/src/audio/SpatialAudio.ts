import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { AudioListener } from 'three';

export interface SpatialAudioConfig {
  distanceModel?: 'linear' | 'inverse' | 'exponential';
  refDistance?: number;
  rolloffFactor?: number;
  maxDistance?: number;
}

export function useAudioListener(_config: SpatialAudioConfig = {}) {
  const { camera } = useThree();
  const listenerRef = useRef<AudioListener | null>(null);

  useEffect(() => {
    if (!camera) return;

    const listener = new AudioListener();
    camera.add(listener);
    listenerRef.current = listener;

    return () => {
      camera.remove(listener);
      listenerRef.current = null;
    };
  }, [camera]);

  const getListener = () => listenerRef.current;

  return { listener: listenerRef.current, getListener };
}

export function SpatialAudioSetup({ config: _config = {} }: { config?: SpatialAudioConfig }) {
  useAudioListener(_config);

  return null;
}
