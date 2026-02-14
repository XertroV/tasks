import { useMemo, useRef, useEffect } from 'react';
import type { GroupProps } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import type { ShaderMaterial } from 'three';
import { ShaderMaterial as ThreeShaderMaterial } from 'three';
import carpetFrag from '@/shaders/carpet.frag.glsl?raw';
import ceilingFrag from '@/shaders/ceiling-tile.frag.glsl?raw';
import defaultVert from '@/shaders/default.vert.glsl?raw';
import noise from '@/shaders/noise.glsl?raw';
import wallpaperFrag from '@/shaders/wallpaper.frag.glsl?raw';
import wallpaperVert from '@/shaders/wallpaper.vert.glsl?raw';

const SEGMENT_LENGTH = 4;
const SEGMENT_WIDTH = 2.5;
const SEGMENT_HEIGHT = 2.7;

const wallpaperShader = `${noise}\n${wallpaperFrag}`;
const carpetShader = `${noise}\n${carpetFrag}`;
const ceilingShader = `${noise}\n${ceilingFrag}`;

export interface HallwaySegmentProps extends GroupProps {
  segmentIndex: number;
  baseIntensity?: number;
}

export function HallwaySegment({
  segmentIndex,
  baseIntensity = 1.0,
  ...groupProps
}: HallwaySegmentProps) {
  const wallRef = useRef<ShaderMaterial>(null);
  const floorRef = useRef<ShaderMaterial>(null);
  const ceilingRef = useRef<ShaderMaterial>(null);

  const wallMaterial = useMemo(
    () =>
      new ThreeShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uDecay: { value: 0.6 + segmentIndex * 0.1 },
          uFlicker: { value: 0.1 * baseIntensity },
          uTear: { value: 0.2 + segmentIndex * 0.1 },
          uColorA: { value: '#4a5a6a' },
          uColorB: { value: '#3a4a5a' },
          uIntensity: { value: baseIntensity },
        },
        vertexShader: wallpaperVert,
        fragmentShader: wallpaperShader,
      }),
    [segmentIndex, baseIntensity]
  );

  const floorMaterial = useMemo(
    () =>
      new ThreeShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWear: { value: 0.4 + segmentIndex * 0.15 },
          uStain: { value: 0.3 + segmentIndex * 0.1 },
          uColorA: { value: '#2a3040' },
          uColorB: { value: '#1a2030' },
          uIntensity: { value: baseIntensity },
        },
        vertexShader: defaultVert,
        fragmentShader: carpetShader,
      }),
    [segmentIndex, baseIntensity]
  );

  const ceilingMaterial = useMemo(
    () =>
      new ThreeShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uFlicker: { value: 0.15 * baseIntensity },
          uStain: { value: 0.2 + segmentIndex * 0.1 },
          uColor: { value: '#d0d5da' },
          uIntensity: { value: baseIntensity },
        },
        vertexShader: defaultVert,
        fragmentShader: ceilingShader,
      }),
    [segmentIndex, baseIntensity]
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (wallRef.current?.uniforms?.uTime) {
      wallRef.current.uniforms.uTime.value = t;
    }
    if (floorRef.current?.uniforms?.uTime) {
      floorRef.current.uniforms.uTime.value = t;
    }
    if (ceilingRef.current?.uniforms?.uTime) {
      ceilingRef.current.uniforms.uTime.value = t;
    }
  });

  useEffect(() => {
    return () => {
      wallMaterial.dispose();
      floorMaterial.dispose();
      ceilingMaterial.dispose();
    };
  }, [wallMaterial, floorMaterial, ceilingMaterial]);

  return (
    <group {...groupProps}>
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SEGMENT_WIDTH, SEGMENT_LENGTH]} />
        <shaderMaterial ref={floorRef} {...floorMaterial} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, SEGMENT_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SEGMENT_WIDTH, SEGMENT_LENGTH]} />
        <shaderMaterial ref={ceilingRef} {...ceilingMaterial} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-SEGMENT_WIDTH / 2, SEGMENT_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[SEGMENT_LENGTH, SEGMENT_HEIGHT]} />
        <shaderMaterial ref={wallRef} {...wallMaterial} />
      </mesh>

      {/* Right wall */}
      <mesh position={[SEGMENT_WIDTH / 2, SEGMENT_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[SEGMENT_LENGTH, SEGMENT_HEIGHT]} />
        <shaderMaterial ref={wallRef} {...wallMaterial} />
      </mesh>

      {/* Back wall (end cap) */}
      <mesh position={[0, SEGMENT_HEIGHT / 2, -SEGMENT_LENGTH / 2]}>
        <planeGeometry args={[SEGMENT_WIDTH, SEGMENT_HEIGHT]} />
        <shaderMaterial {...wallMaterial} />
      </mesh>
    </group>
  );
}
