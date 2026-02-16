import carpetFrag from '@/shaders/carpet.frag.glsl?raw';
import ceilingFrag from '@/shaders/ceiling-tile.frag.glsl?raw';
import defaultVert from '@/shaders/default.vert.glsl?raw';
import noise from '@/shaders/noise.glsl?raw';
import wallpaperFrag from '@/shaders/wallpaper.frag.glsl?raw';
import wallpaperVert from '@/shaders/wallpaper.vert.glsl?raw';
import type { GroupProps } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { ShaderMaterial as ThreeShaderMaterial } from 'three';

const SEGMENT_LENGTH = 4;
const SEGMENT_WIDTH = 2.5;
const SEGMENT_HEIGHT = 2.7;

const wallpaperShader = `${noise}\n${wallpaperFrag}`;
const carpetShader = `${noise}\n${carpetFrag}`;
const ceilingShader = `${noise}\n${ceilingFrag}`;

let sharedWallMaterial: ThreeShaderMaterial | null = null;
let sharedFloorMaterial: ThreeShaderMaterial | null = null;
let sharedCeilingMaterial: ThreeShaderMaterial | null = null;
let materialRefCount = 0;

function getSharedMaterials(baseIntensity: number, segmentIndex: number) {
  if (!sharedWallMaterial) {
    sharedWallMaterial = new ThreeShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDecay: { value: 0.6 },
        uFlicker: { value: 0.1 * baseIntensity },
        uTear: { value: 0.2 },
        uColorA: { value: '#4a5a6a' },
        uColorB: { value: '#3a4a5a' },
        uIntensity: { value: baseIntensity },
      },
      vertexShader: wallpaperVert,
      fragmentShader: wallpaperShader,
    });
  }
  if (!sharedFloorMaterial) {
    sharedFloorMaterial = new ThreeShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWear: { value: 0.4 },
        uStain: { value: 0.3 },
        uColorA: { value: '#2a3040' },
        uColorB: { value: '#1a2030' },
        uIntensity: { value: baseIntensity },
      },
      vertexShader: defaultVert,
      fragmentShader: carpetShader,
    });
  }
  if (!sharedCeilingMaterial) {
    sharedCeilingMaterial = new ThreeShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFlicker: { value: 0.15 * baseIntensity },
        uStain: { value: 0.2 },
        uColor: { value: '#d0d5da' },
        uIntensity: { value: baseIntensity },
      },
      vertexShader: defaultVert,
      fragmentShader: ceilingShader,
    });
  }

  sharedWallMaterial.uniforms.uDecay.value = 0.6 + segmentIndex * 0.1;
  sharedWallMaterial.uniforms.uTear.value = 0.2 + segmentIndex * 0.1;
  sharedWallMaterial.uniforms.uIntensity.value = baseIntensity;
  sharedFloorMaterial.uniforms.uWear.value = 0.4 + segmentIndex * 0.15;
  sharedFloorMaterial.uniforms.uStain.value = 0.3 + segmentIndex * 0.1;
  sharedFloorMaterial.uniforms.uIntensity.value = baseIntensity;
  sharedCeilingMaterial.uniforms.uStain.value = 0.2 + segmentIndex * 0.1;
  sharedCeilingMaterial.uniforms.uIntensity.value = baseIntensity;

  materialRefCount++;
  return {
    wall: sharedWallMaterial,
    floor: sharedFloorMaterial,
    ceiling: sharedCeilingMaterial,
  };
}

export interface HallwaySegmentProps extends GroupProps {
  segmentIndex: number;
  baseIntensity?: number;
  fogNear?: number;
  fogFar?: number;
}

export function HallwaySegment({
  segmentIndex,
  baseIntensity = 1.0,
  fogNear = 1,
  fogFar = 15,
  ...groupProps
}: HallwaySegmentProps) {
  const materials = useMemo(
    () => getSharedMaterials(baseIntensity, segmentIndex),
    [baseIntensity, segmentIndex]
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (materials.wall.uniforms?.uTime) {
      materials.wall.uniforms.uTime.value = t;
    }
    if (materials.floor.uniforms?.uTime) {
      materials.floor.uniforms.uTime.value = t;
    }
    if (materials.ceiling.uniforms?.uTime) {
      materials.ceiling.uniforms.uTime.value = t;
    }
  });

  useEffect(() => {
    return () => {
      materialRefCount--;
      if (materialRefCount === 0) {
        sharedWallMaterial?.dispose();
        sharedFloorMaterial?.dispose();
        sharedCeilingMaterial?.dispose();
        sharedWallMaterial = null;
        sharedFloorMaterial = null;
        sharedCeilingMaterial = null;
      }
    };
  }, []);

  return (
    <group {...groupProps}>
      <fog attach="fog" args={['#1a1a1a', fogNear, fogFar]} />
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SEGMENT_WIDTH, SEGMENT_LENGTH]} />
        <shaderMaterial {...materials.floor} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, SEGMENT_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SEGMENT_WIDTH, SEGMENT_LENGTH]} />
        <shaderMaterial {...materials.ceiling} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-SEGMENT_WIDTH / 2, SEGMENT_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[SEGMENT_LENGTH, SEGMENT_HEIGHT]} />
        <shaderMaterial {...materials.wall} />
      </mesh>

      {/* Right wall */}
      <mesh position={[SEGMENT_WIDTH / 2, SEGMENT_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[SEGMENT_LENGTH, SEGMENT_HEIGHT]} />
        <shaderMaterial {...materials.wall} />
      </mesh>

      {/* Back wall (end cap) */}
      <mesh position={[0, SEGMENT_HEIGHT / 2, -SEGMENT_LENGTH / 2]}>
        <planeGeometry args={[SEGMENT_WIDTH, SEGMENT_HEIGHT]} />
        <shaderMaterial {...materials.wall} />
      </mesh>
    </group>
  );
}
