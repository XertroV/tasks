import { TimelineVisualizer } from '@/horror';
import { DebugLeva, LevaProvider } from './DebugLeva';
import { DebugMetricsProbe } from './DebugMetricsProbe';
import { DebugPanel } from './DebugPanel';
import { DebugStateBridge } from './DebugStateBridge';

export function DebugMount({
  levaStore,
}: { levaStore?: ReturnType<typeof import('leva').useCreateStore> }) {
  if (!levaStore) {
    return (
      <>
        <DebugMetricsProbe />
        <DebugStateBridge />
      </>
    );
  }

  return (
    <LevaProvider store={levaStore}>
      <DebugMetricsProbe />
      <DebugStateBridge />
    </LevaProvider>
  );
}

export function DebugOverlay({
  levaStore,
}: { levaStore?: ReturnType<typeof import('leva').useCreateStore> }) {
  return (
    <>
      <DebugLeva store={levaStore} />
      <DebugPanel />
      <TimelineVisualizer />
    </>
  );
}
