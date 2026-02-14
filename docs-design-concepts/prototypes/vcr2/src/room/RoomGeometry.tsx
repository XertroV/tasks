import carpetFrag from '@/shaders/carpet.frag.glsl?raw';
import ceilingFrag from '@/shaders/ceiling-tile.frag.glsl?raw';
import defaultVert from '@/shaders/default.vert.glsl?raw';
import noise from '@/shaders/noise.glsl?raw';
import wallpaperFrag from '@/shaders/wallpaper.frag.glsl?raw';
import wallpaperVert from '@/shaders/wallpaper.vert.glsl?raw';
import { HALLWAY_OPENING_WIDTH, ROOM_DEPTH, ROOM_HEIGHT, ROOM_WIDTH } from '@/shared/constants';
import { useFrame } from '@react-three/fiber';
import type { GroupProps } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { ShaderMaterial } from 'three';

export interface RoomSurfaceMaterials {
  wall: ShaderMaterial | null;
  floor: ShaderMaterial | null;
  ceiling: ShaderMaterial | null;
}

export interface RoomGeometryProps extends GroupProps {
  wallDecay?: number;
  carpetWear?: number;
  onMaterialsReady?: (materials: RoomSurfaceMaterials) => void;
}

const BACK_WALL_Z = 2;
const TV_WALL_Z = BACK_WALL_Z - ROOM_DEPTH;
const ROOM_CENTER_Z = (BACK_WALL_Z + TV_WALL_Z) / 2;

const wallpaperShader = `${noise}\n${wallpaperFrag}`;
const carpetShader = `${noise}\n${carpetFrag}`;
const ceilingShader = `${noise}\n${ceilingFrag}`;

export function RoomGeometry({
  wallDecay = 0.5,
  carpetWear = 0.3,
  onMaterialsReady,
  ...groupProps
}: RoomGeometryProps) {
  const wallRef = useRef<ShaderMaterial>(null);
  const floorRef = useRef<ShaderMaterial>(null);
  const ceilingRef = useRef<ShaderMaterial>(null);

  useEffect(() => {
    onMaterialsReady?.({
      wall: wallRef.current,
      floor: floorRef.current,
      ceiling: ceilingRef.current,
    });
  }, [onMaterialsReady]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (wallRef.current?.uniforms?.uTime) {
      wallRef.current.uniforms.uTime.value = t;
    }
  });

  const backSegmentWidth = (ROOM_WIDTH - HALLWAY_OPENING_WIDTH) / 2;
  const backSegmentOffset = HALLWAY_OPENING_WIDTH / 2 + backSegmentWidth / 2;

  const wallUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDecay: { value: wallDecay },
      uBaseColor: { value: [0.77, 0.69, 0.55] },
      uStripScale: { value: 5.0 },
      uSeamWidth: { value: 0.02 },
      uStainStrength: { value: 0.6 },
      uFlicker: { value: 0.2 },
      uBreathIntensity: { value: 0.3 },
    }),
    [wallDecay]
  );

  const floorUniforms = useMemo(
    () => ({
      uWear: { value: carpetWear },
      uColor: { value: [0.42, 0.36, 0.31] },
      uLoopScale: { value: 52.0 },
      uTrackStrength: { value: 0.7 },
    }),
    [carpetWear]
  );

  const ceilingUniforms = useMemo(
    () => ({
      uTileColor: { value: [0.91, 0.91, 0.91] },
      uGridColor: { value: [0.3, 0.3, 0.3] },
      uTileScale: { value: 1.6667 },
      uGridWidth: { value: 0.06 },
      uTileAging: { value: 0.45 },
    }),
    []
  );

  return (
    <group {...groupProps}>
      <mesh position={[0, 0, ROOM_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <shaderMaterial
          ref={floorRef}
          vertexShader={defaultVert}
          fragmentShader={carpetShader}
          uniforms={floorUniforms}
        />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT, ROOM_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <shaderMaterial
          ref={ceilingRef}
          vertexShader={defaultVert}
          fragmentShader={ceilingShader}
          uniforms={ceilingUniforms}
        />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT / 2, TV_WALL_Z]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <shaderMaterial
          ref={wallRef}
          vertexShader={wallpaperVert}
          fragmentShader={wallpaperShader}
          uniforms={wallUniforms}
        />
      </mesh>

      <mesh
        position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <shaderMaterial
          vertexShader={wallpaperVert}
          fragmentShader={wallpaperShader}
          uniforms={wallUniforms}
        />
      </mesh>

      <mesh
        position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_CENTER_Z]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <shaderMaterial
          vertexShader={wallpaperVert}
          fragmentShader={wallpaperShader}
          uniforms={wallUniforms}
        />
      </mesh>

      <mesh
        position={[-backSegmentOffset, ROOM_HEIGHT / 2, BACK_WALL_Z]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[backSegmentWidth, ROOM_HEIGHT]} />
        <shaderMaterial
          vertexShader={wallpaperVert}
          fragmentShader={wallpaperShader}
          uniforms={wallUniforms}
        />
      </mesh>

      <mesh position={[backSegmentOffset, ROOM_HEIGHT / 2, BACK_WALL_Z]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[backSegmentWidth, ROOM_HEIGHT]} />
        <shaderMaterial
          vertexShader={wallpaperVert}
          fragmentShader={wallpaperShader}
          uniforms={wallUniforms}
        />
      </mesh>
    </group>
  );
}
