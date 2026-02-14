import type { GroupProps } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type MeshStandardMaterial, PlaneGeometry, type PointLight, type Texture } from 'three';

const CRT_WIDTH = 0.7;
const CRT_HEIGHT = 0.6;
const CRT_DEPTH = 0.5;

const SCREEN_WIDTH = 0.54;
const SCREEN_HEIGHT = 0.4;
const SCREEN_INSET = 0.02;

const BEZEL_THICKNESS = 0.035;
const BEZEL_DEPTH = 0.03;

export interface CRTTelevisionProps extends GroupProps {
  screenTexture?: Texture | null;
  screenMode?: 'no-signal' | 'docs';
  screenBrightness?: number;
}

function createCurvedScreenGeometry() {
  const geometry = new PlaneGeometry(SCREEN_WIDTH, SCREEN_HEIGHT, 32, 24);
  const position = geometry.attributes.position;

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index) / (SCREEN_WIDTH * 0.5);
    const y = position.getY(index) / (SCREEN_HEIGHT * 0.5);
    const curvature = (x * x + y * y) * 0.015;

    position.setZ(index, -curvature);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

export function CRTTelevision({
  screenTexture = null,
  screenMode = 'docs',
  screenBrightness = 0.5,
  ...groupProps
}: CRTTelevisionProps) {
  const curvedScreenGeometry = useMemo(createCurvedScreenGeometry, []);
  const screenMaterialRef = useRef<MeshStandardMaterial>(null);
  const screenLightRef = useRef<PointLight>(null);
  const clampedBrightness = Math.min(Math.max(screenBrightness, 0), 1);
  const screenColor = screenMode === 'no-signal' ? '#5fa8ff' : '#33ff66';
  const baseLightIntensity = 0.2 + clampedBrightness * 0.9;
  const emissiveIntensity = 0.04 + clampedBrightness * (screenTexture ? 0.5 : 0.35);

  useFrame(({ clock }) => {
    const flicker = 0.94 + Math.sin(clock.elapsedTime * 37) * 0.04;
    const light = screenLightRef.current;
    if (light) {
      light.intensity = baseLightIntensity * flicker;
    }

    const screen = screenMaterialRef.current;
    if (screen) {
      screen.emissiveIntensity = emissiveIntensity * flicker;
    }
  });

  return (
    <group {...groupProps}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CRT_WIDTH, CRT_HEIGHT, CRT_DEPTH]} />
        <meshStandardMaterial color="#3c3d40" roughness={0.62} metalness={0.1} />
      </mesh>

      <mesh
        position={[0, 0, CRT_DEPTH / 2 - SCREEN_INSET - BEZEL_DEPTH * 0.5]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[SCREEN_WIDTH + 0.08, SCREEN_HEIGHT + 0.08, BEZEL_DEPTH]} />
        <meshStandardMaterial color="#1d1f22" roughness={0.7} metalness={0.12} />
      </mesh>

      <mesh position={[0, 0, CRT_DEPTH / 2 - SCREEN_INSET]} geometry={curvedScreenGeometry}>
        <meshStandardMaterial
          ref={screenMaterialRef}
          color={screenTexture ? '#0f1111' : '#09090c'}
          emissive={screenColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.22}
          metalness={0.08}
          map={screenTexture ?? undefined}
        />
      </mesh>

      <pointLight
        ref={screenLightRef}
        color={screenColor}
        intensity={baseLightIntensity}
        distance={3.5}
        decay={2}
        position={[0, 0.02, CRT_DEPTH / 2 - 0.04]}
      />

      <mesh
        position={[0, SCREEN_HEIGHT / 2 + BEZEL_THICKNESS / 2, CRT_DEPTH / 2 - SCREEN_INSET * 0.7]}
      >
        <boxGeometry args={[SCREEN_WIDTH + 0.02, BEZEL_THICKNESS, 0.01]} />
        <meshStandardMaterial color="#101215" roughness={0.76} metalness={0.06} />
      </mesh>

      <mesh
        position={[0, -SCREEN_HEIGHT / 2 - BEZEL_THICKNESS / 2, CRT_DEPTH / 2 - SCREEN_INSET * 0.7]}
      >
        <boxGeometry args={[SCREEN_WIDTH + 0.02, BEZEL_THICKNESS, 0.01]} />
        <meshStandardMaterial color="#101215" roughness={0.76} metalness={0.06} />
      </mesh>

      <mesh
        position={[-SCREEN_WIDTH / 2 - BEZEL_THICKNESS / 2, 0, CRT_DEPTH / 2 - SCREEN_INSET * 0.7]}
      >
        <boxGeometry args={[BEZEL_THICKNESS, SCREEN_HEIGHT + 0.08, 0.01]} />
        <meshStandardMaterial color="#101215" roughness={0.76} metalness={0.06} />
      </mesh>

      <mesh
        position={[SCREEN_WIDTH / 2 + BEZEL_THICKNESS / 2, 0, CRT_DEPTH / 2 - SCREEN_INSET * 0.7]}
      >
        <boxGeometry args={[BEZEL_THICKNESS, SCREEN_HEIGHT + 0.08, 0.01]} />
        <meshStandardMaterial color="#101215" roughness={0.76} metalness={0.06} />
      </mesh>
    </group>
  );
}
