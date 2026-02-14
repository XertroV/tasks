import {
  PAGE_DURATION_SECONDS,
  PERFORMANCE_METRICS_INTERVAL,
  TOTAL_PAGES,
} from '@/shared/constants';
import { useVCRStore } from '@/vcr';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useDebugPanelStore } from './debugPanelStore';

function formatTimecode(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = Math.floor(safeSeconds % 60);
  const frames = Math.floor((safeSeconds % 1) * 30);

  return [hours, minutes, seconds, frames]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

export function DebugStateBridge() {
  const setVCR = useDebugPanelStore((state) => state.setVCR);
  const setNavigation = useDebugPanelStore((state) => state.setNavigation);
  const setHorror = useDebugPanelStore((state) => state.setHorror);
  const vcrMode = useVCRStore((state) => state.mode);
  const vcrCurrentTime = useVCRStore((state) => state.currentTime);
  const elapsedSinceFlush = useRef(0);
  const timelineSeconds = useRef(0);

  useFrame((_, delta) => {
    elapsedSinceFlush.current += delta;
    timelineSeconds.current += delta;

    if (elapsedSinceFlush.current * 1000 < PERFORMANCE_METRICS_INTERVAL) {
      return;
    }

    const timeline = timelineSeconds.current;
    const pageIndex = Math.floor((timeline / PAGE_DURATION_SECONDS) % TOTAL_PAGES) + 1;
    const horrorIntensity = (Math.sin(timeline * 0.8) + 1) * 0.5;

    setVCR({
      mode: vcrMode,
      timecode: formatTimecode(vcrCurrentTime),
    });

    setNavigation({
      section: 'docs',
      page: `${pageIndex}/${TOTAL_PAGES}`,
    });

    setHorror({
      phase: horrorIntensity > 0.7 ? 'UNEASY' : 'DORMANT',
      intensity: horrorIntensity,
    });

    elapsedSinceFlush.current = 0;
  });

  return null;
}
