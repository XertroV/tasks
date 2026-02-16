import type { GroupProps } from '@react-three/fiber';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { AudioListener, MeshStandardMaterial, PointLight, PositionalAudio } from 'three';
import { PositionalAudio as ThreePositionalAudio } from 'three';

export interface FluorescentLightProps extends GroupProps {
  length?: number;
  baseIntensity?: number;
  lightColor?: string;
  flickerEnabled?: boolean;
  audioEnabled?: boolean;
}

function createFluorescentBuzz(listener: AudioListener): PositionalAudio | null {
  const ctx = listener.context;
  if (!ctx) return null;

  const duration = 2;
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const phase120 = (t * 120 * 2) % 2;
    const sawtooth = phase120 < 1 ? phase120 * 2 - 1 : (phase120 - 1) * 2 - 1;
    const noise = (Math.random() - 0.5) * 0.3;
    data[i] = (sawtooth * 0.4 + noise) * 0.15;
  }

  const source = new ThreePositionalAudio(listener);
  source.setBuffer(buffer);
  source.setLoop(true);
  source.setVolume(0.3);
  source.setRefDistance(1);
  source.setRolloffFactor(2);
  source.setMaxDistance(8);

  return source;
}

export function FluorescentLight({
  length = 1.2,
  baseIntensity = 1.8,
  lightColor = '#ffe1a8',
  flickerEnabled = true,
  audioEnabled = true,
  ...groupProps
}: FluorescentLightProps) {
  const tubeRef = useRef<MeshStandardMaterial>(null);
  const lightRef = useRef<PointLight>(null);
  const audioRef = useRef<PositionalAudio | null>(null);
  const dropoutUntilRef = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    if (!audioEnabled || !camera) return;

    const listener = camera.children.find((c) => c.type === 'AudioListener') as
      | AudioListener
      | undefined;
    if (!listener) return;

    const audio = createFluorescentBuzz(listener);
    if (audio) {
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.stop();
        audioRef.current.disconnect();
        audioRef.current = null;
      }
    };
  }, [audioEnabled, camera]);

  useEffect(() => {
    if (audioRef.current?.buffer) {
      try {
        audioRef.current.play();
      } catch {}
    }
  }, []);

  useFrame((state) => {
    if (!flickerEnabled) {
      if (lightRef.current) {
        lightRef.current.intensity = baseIntensity;
      }
      if (tubeRef.current) {
        tubeRef.current.emissiveIntensity = 0.68;
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
      tubeRef.current.emissiveIntensity = 0.68 * flicker;
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
          color={lightColor}
          emissive={lightColor}
          emissiveIntensity={0.68}
          roughness={0.4}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        color={lightColor}
        intensity={baseIntensity}
        distance={5}
        decay={2}
        position={[0, -0.08, 0]}
      />

      {audioRef.current && <primitive object={audioRef.current} />}
    </group>
  );
}
