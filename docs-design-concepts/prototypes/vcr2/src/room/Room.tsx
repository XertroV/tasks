import type { GroupProps } from '@react-three/fiber';
import { FluorescentLight } from './FluorescentLight';
import { RoomGeometry, type RoomSurfaceMaterials } from './RoomGeometry';
import { useRoomMaterialControls } from './RoomMaterialControls';

export interface RoomProps extends GroupProps {
  fogColor?: string;
  fogDensity?: number;
  ambientIntensity?: number;
  onMaterialsReady?: (materials: RoomSurfaceMaterials) => void;
}

export function Room({
  fogColor = '#1a1a0d',
  fogDensity = 0.04,
  ambientIntensity = 0.15,
  onMaterialsReady,
  ...groupProps
}: RoomProps) {
  const { wallDecay, carpetWear, fogDensity: controlFogDensity } = useRoomMaterialControls();
  const effectiveFogDensity = controlFogDensity ?? fogDensity;

  return (
    <group {...groupProps}>
      <fogExp2 attach="fog" args={[fogColor, effectiveFogDensity]} />

      <ambientLight color="#1a1a2e" intensity={ambientIntensity} />
      <FluorescentLight position={[0, 2.7, -4]} flickerEnabled />
      <FluorescentLight position={[0, 2.7, 0]} baseIntensity={1.6} flickerEnabled />

      <RoomGeometry
        wallDecay={wallDecay}
        carpetWear={carpetWear}
        onMaterialsReady={onMaterialsReady}
      />
    </group>
  );
}
