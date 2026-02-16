import { CRTTelevision, EntertainmentCenter } from '@/crt';
import { VCRDeck } from '@/vcr';
import type { GroupProps } from '@react-three/fiber';
import type { Texture } from 'three';
import { FluorescentLight } from './FluorescentLight';
import { RoomGeometry, type RoomSurfaceMaterials } from './RoomGeometry';
import { useRoomMaterialControls } from './RoomMaterialControls';

export interface RoomProps extends GroupProps {
  fogColor?: string;
  fogDensity?: number;
  ambientIntensity?: number;
  crtScreenMode?: 'no-signal' | 'docs';
  screenTexture?: Texture | null;
  onMaterialsReady?: (materials: RoomSurfaceMaterials) => void;
}

export function Room({
  fogColor = '#151109',
  fogDensity = 0.04,
  ambientIntensity = 0.09,
  crtScreenMode = 'docs',
  screenTexture = null,
  onMaterialsReady,
  ...groupProps
}: RoomProps) {
  const {
    wallDecay,
    carpetWear,
    wallBaseColor,
    carpetBaseColor,
    ambientColor,
    ambientIntensity: controlAmbientIntensity,
    lightColor,
    keyLightIntensity,
    fillLightIntensity,
    fogColor: controlFogColor,
    fogDensity: controlFogDensity,
  } = useRoomMaterialControls();
  const effectiveFogColor = controlFogColor ?? fogColor;
  const effectiveFogDensity = controlFogDensity ?? fogDensity;
  const effectiveAmbientIntensity = controlAmbientIntensity ?? ambientIntensity;

  return (
    <group {...groupProps}>
      <fogExp2 attach="fog" args={[effectiveFogColor, effectiveFogDensity]} />

      <ambientLight color={ambientColor} intensity={effectiveAmbientIntensity} />
      <FluorescentLight
        position={[0, 2.7, -4]}
        baseIntensity={keyLightIntensity}
        lightColor={lightColor}
        flickerEnabled
      />
      <FluorescentLight
        position={[0, 2.7, 0]}
        baseIntensity={fillLightIntensity}
        lightColor={lightColor}
        flickerEnabled
      />

      <RoomGeometry
        wallDecay={wallDecay}
        carpetWear={carpetWear}
        wallBaseColor={wallBaseColor}
        carpetBaseColor={carpetBaseColor}
        onMaterialsReady={onMaterialsReady}
      />

      <EntertainmentCenter />
      <CRTTelevision
        position={[0, 0.95, -5.55]}
        screenMode={crtScreenMode}
        screenTexture={screenTexture}
      />
      <VCRDeck position={[0, 0.7, -5.35]} />
    </group>
  );
}
