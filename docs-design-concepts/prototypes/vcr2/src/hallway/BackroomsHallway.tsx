import type { GroupProps } from '@react-three/fiber';
import { HallwaySegment } from './HallwaySegment';
import { FluorescentLight } from '@/room/FluorescentLight';

const SEGMENT_CONFIGS: { position: [number, number, number]; intensity: number }[] = [
  { position: [0, 0, 4], intensity: 0.6 },
  { position: [0, 0, 12], intensity: 0.3 },
  { position: [0, 0, 20], intensity: 0.1 },
];

export interface BackroomsHallwayProps extends GroupProps {
  showLights?: boolean;
}

export function BackroomsHallway({ showLights = true, ...groupProps }: BackroomsHallwayProps) {
  return (
    <group {...groupProps}>
      {SEGMENT_CONFIGS.map((config, index) => (
        <group key={`hallway-segment-${config.position[2]}`} position={config.position}>
          <HallwaySegment segmentIndex={index} baseIntensity={config.intensity} />
          {showLights && (
            <FluorescentLight
              position={[0, 2.65, 0]}
              baseIntensity={config.intensity * 1.5}
              flickerEnabled
            />
          )}
        </group>
      ))}
    </group>
  );
}
