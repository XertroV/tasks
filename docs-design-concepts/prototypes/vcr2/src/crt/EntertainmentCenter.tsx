import type { GroupProps } from '@react-three/fiber';

const STAND_WIDTH = 1.2;
const STAND_HEIGHT = 0.65;
const STAND_DEPTH = 0.45;

const STAND_WALL_GAP = 0.05;
const TV_WALL_Z = -6;
const STAND_CENTER_Z = TV_WALL_Z + STAND_DEPTH / 2 + STAND_WALL_GAP;

export interface EntertainmentCenterProps extends GroupProps {}

export function EntertainmentCenter({ ...groupProps }: EntertainmentCenterProps) {
  return (
    <group position={[0, STAND_HEIGHT / 2, STAND_CENTER_Z]} {...groupProps}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[STAND_WIDTH, STAND_HEIGHT, STAND_DEPTH]} />
        <meshStandardMaterial color="#5b3a25" roughness={0.72} metalness={0.06} />
      </mesh>

      <mesh position={[0, 0.02, 0.04]}>
        <boxGeometry args={[STAND_WIDTH - 0.08, STAND_HEIGHT - 0.12, STAND_DEPTH - 0.12]} />
        <meshStandardMaterial color="#2f1e13" roughness={0.88} metalness={0} />
      </mesh>
    </group>
  );
}
