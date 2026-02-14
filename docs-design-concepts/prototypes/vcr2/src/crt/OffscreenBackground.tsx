import type { GroupProps } from '@react-three/fiber';

const CRT_BLACK = '#0a0a0a';

export const ZONES = {
  title: { yMin: 0.8, yMax: 1.0, z: 0.15 },
  content: { yMin: -0.5, yMax: 0.8, z: 0.1 },
  osd: { yMin: -1.0, yMax: -0.5, z: 0.2 },
} as const;

export const Z_ORDER = {
  background: 0,
  content: 0.1,
  osd: 0.2,
  scanline: 0.5,
} as const;

export interface OffscreenBackgroundProps extends GroupProps {}

export function OffscreenBackground({ ...groupProps }: OffscreenBackgroundProps) {
  return (
    <group {...groupProps}>
      <mesh position={[0, 0, Z_ORDER.background]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial color={CRT_BLACK} />
      </mesh>
    </group>
  );
}

export function ZoneGroup({
  zone,
  children,
  ...groupProps
}: { zone: keyof typeof ZONES } & GroupProps) {
  const zoneConfig = ZONES[zone];

  return (
    <group position={[0, 0, zoneConfig.z]} {...groupProps}>
      {children}
    </group>
  );
}
