import type { GroupProps } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { MeshStandardMaterial, PointLight } from 'three';

export interface FluorescentLightProps extends GroupProps {
  length?: number;
  baseIntensity?: number;
  flickerEnabled?: boolean;
}

export function FluorescentLight({
  length = 1.2,
  baseIntensity = 1.8,
  flickerEnabled = true,
  ...groupProps
}: FluorescentLightProps) {
  const tubeRef = useRef<MeshStandardMaterial>(null);
  const lightRef = useRef<PointLight>(null);
  const dropoutUntilRef = useRef(0);

  useFrame((state) => {
    if (!flickerEnabled) {
      if (lightRef.current) {
        lightRef.current.intensity = baseIntensity;
      }
      if (tubeRef.current) {
        tubeRef.current.emissiveIntensity = 0.8;
      }
      return;
    }

    const t = state.clock.elapsedTime;
    const rapidFlicker = 0.98 + 0.02 * Math.sin(t * 120 * Math.PI);
    const slowDrift = 0.99 + 0.01 * Math.sin(t * 7.3);
    const midDrift = 0.995 + 0.005 * Math.sin(t * 23.7);

    if (Math.random() < 0.002) {
      dropoutUntilRef.current = t + 0.04;
    }

    const inDropout = t < dropoutUntilRef.current;
    const flicker = rapidFlicker * slowDrift * midDrift * (inDropout ? 0.55 : 1);
    const lightIntensity = baseIntensity * flicker;

    if (lightRef.current) {
      lightRef.current.intensity = lightIntensity;
    }

    if (tubeRef.current) {
      tubeRef.current.emissiveIntensity = 0.8 * flicker;
    }
  });

  return (
    <group {...groupProps}>
      <mesh>
        <boxGeometry args={[length, 0.05, 0.15]} />
        <meshStandardMaterial color="#8f8f8f" metalness={0.25} roughness={0.75} />
      </mesh>

      <mesh position={[0, -0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, length - 0.1, 12]} />
        <meshStandardMaterial
          ref={tubeRef}
          color="#fff8e7"
          emissive="#fff8e7"
          emissiveIntensity={0.8}
          roughness={0.4}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        color="#fff8e7"
        intensity={baseIntensity}
        distance={5}
        decay={2}
        position={[0, -0.08, 0]}
      />
    </group>
  );
}
