import { useHorrorStore } from '@/horror';
import { corruptTimecode } from '@/horror/corruptedText';
import type { VCRMode } from '@/vcr/vcrStore';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { GroupProps } from '@react-three/fiber';
import { useMemo, useState } from 'react';
import { Z_ORDER } from './OffscreenBackground';

const AMBER = '#ffaa00';
const CYAN = '#00ffff';
const GREEN = '#33ff33';

export interface VcrOSDProps extends GroupProps {
  mode: VCRMode;
  timecode: string;
  trackingError?: number;
}

function formatMode(mode: VCRMode): string {
  switch (mode) {
    case 'PLAYING':
      return '▶ PLAY';
    case 'PAUSED':
      return '⏸ PAUSE';
    case 'FF':
      return '⏩ FF';
    case 'REW':
      return '⏪ REW';
    case 'STOPPED':
      return '⏹ STOP';
    case 'EJECTED':
      return '⏏ EJECT';
    case 'LOADING':
      return '⟳ LOAD';
    default:
      return '--';
  }
}

export function VcrOSD({ mode, timecode, trackingError = 0, ...groupProps }: VcrOSDProps) {
  const showTracking = trackingError > 0.1;
  const modeColor = mode === 'PLAYING' ? GREEN : mode === 'PAUSED' ? CYAN : AMBER;

  const horrorEnabled = useHorrorStore((state) => state.enabled);
  const horrorIntensity = useHorrorStore((state) => state.intensity);
  const horrorPhase = useHorrorStore((state) => state.phase);

  const [displayTimecode, setDisplayTimecode] = useState(timecode);
  const shouldCorrupt = horrorEnabled && horrorPhase !== 'DORMANT' && horrorIntensity > 0.3;

  useFrame(() => {
    if (shouldCorrupt && Math.random() < horrorIntensity * 0.1) {
      setDisplayTimecode(corruptTimecode(timecode, horrorIntensity));
    } else {
      setDisplayTimecode(timecode);
    }
  });

  const horrorColor = useMemo(() => {
    if (!shouldCorrupt) return AMBER;
    const r = 255;
    const g = Math.floor(170 - horrorIntensity * 100);
    const b = Math.floor(0 + horrorIntensity * 50);
    return `rgb(${r}, ${Math.max(0, g)}, ${b})`;
  }, [shouldCorrupt, horrorIntensity]);

  return (
    <group {...groupProps}>
      <mesh position={[0, -0.75, Z_ORDER.osd - 0.01]}>
        <planeGeometry args={[2, 0.25]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.7} />
      </mesh>

      <mesh position={[0, -0.48, Z_ORDER.osd + 0.01]}>
        <planeGeometry args={[2, 0.003]} />
        <meshBasicMaterial color={AMBER} transparent opacity={0.4} />
      </mesh>

      <Text
        position={[-0.85, -0.75, Z_ORDER.osd + 0.02]}
        color={modeColor}
        fontSize={0.045}
        anchorX="left"
        anchorY="middle"
        font="/fonts/VT323-Regular.ttf"
      >
        {formatMode(mode)}
      </Text>

      {showTracking && (
        <Text
          position={[0, -0.75, Z_ORDER.osd + 0.02]}
          color={AMBER}
          fontSize={0.04}
          anchorX="center"
          anchorY="middle"
          font="/fonts/VT323-Regular.ttf"
        >
          TRACKING
        </Text>
      )}

      <Text
        position={[0.85, -0.75, Z_ORDER.osd + 0.02]}
        color={horrorColor}
        fontSize={0.045}
        anchorX="right"
        anchorY="middle"
        font="/fonts/VT323-Regular.ttf"
      >
        {displayTimecode}
      </Text>
    </group>
  );
}
