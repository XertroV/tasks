import { TimelineVisualizer } from '@/horror';
import { DebugLeva } from './DebugLeva';
import { DebugMetricsProbe } from './DebugMetricsProbe';
import { DebugPanel } from './DebugPanel';
import { DebugStateBridge } from './DebugStateBridge';

export function DebugMount() {
  return (
    <>
      <DebugMetricsProbe />
      <DebugStateBridge />
    </>
  );
}

export function DebugOverlay() {
  return (
    <>
      <DebugLeva />
      <DebugPanel />
      <TimelineVisualizer />
    </>
  );
}
