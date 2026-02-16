import { useHorrorStore } from '@/horror';
import { FluorescentLight } from '@/room/FluorescentLight';
import { useFrame } from '@react-three/fiber';
import type { GroupProps } from '@react-three/fiber';
import { useRef } from 'react';
import type { PointLight } from 'three';
import { HallwaySegment } from './HallwaySegment';

const SEGMENT_CONFIGS: { position: [number, number, number]; intensity: number }[] = [
  { position: [0, 0, 4], intensity: 0.6 },
  { position: [0, 0, 12], intensity: 0.3 },
  { position: [0, 0, 20], intensity: 0.1 },
];

export interface BackroomsHallwayProps extends GroupProps {
  showLights?: boolean;
}

export function BackroomsHallway({ showLights = true, ...groupProps }: BackroomsHallwayProps) {
  const phase = useHorrorStore((state) => state.phase);
  const distantLightRef = useRef<PointLight>(null);

  const uneasePhase = phase === 'UNEASY' || phase === 'ESCALATING';
  const escalatingPhase = phase === 'CLIMAX' || phase === 'POST';

  useFrame(() => {
    if (distantLightRef.current && uneasePhase) {
      distantLightRef.current.intensity = 0.1;
    } else if (distantLightRef.current) {
      distantLightRef.current.intensity = 0.45;
    }
  });

  return (
    <group {...groupProps}>
      {SEGMENT_CONFIGS.map((config, index) => {
        const isDistant = index === SEGMENT_CONFIGS.length - 1;
        const lightOff = isDistant && uneasePhase;
        const detunedIntensity =
          isDistant && escalatingPhase ? config.intensity * 0.5 : config.intensity;

        return (
          <group key={`hallway-segment-${config.position[2]}`} position={config.position}>
            <HallwaySegment
              segmentIndex={index}
              baseIntensity={detunedIntensity}
              fogNear={2 + index * 2}
              fogFar={12 + index * 4}
            />
            {showLights && !lightOff && (
              <FluorescentLight
                position={[0, 2.65, 0]}
                baseIntensity={config.intensity * 1.5}
                flickerEnabled
              />
            )}
            {isDistant && showLights && (
              <pointLight
                ref={distantLightRef}
                position={[0, 2.5, 0]}
                color="#fff8e7"
                intensity={uneasePhase ? 0.1 : 0.45}
                distance={6}
                decay={2}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}
