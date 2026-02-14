import { useEffect, useState } from 'react';
import { useDebugPanelStore } from './debugPanelStore';

export function DebugPanel() {
  const [visible, setVisible] = useState(true);
  const performance = useDebugPanelStore((state) => state.performance);
  const vcr = useDebugPanelStore((state) => state.vcr);
  const navigation = useDebugPanelStore((state) => state.navigation);
  const horror = useDebugPanelStore((state) => state.horror);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Backquote') {
        return;
      }

      event.preventDefault();
      setVisible((currentVisible) => !currentVisible);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <aside className="debug-panel" aria-live="polite">
      <h2 className="debug-panel__title">DEBUG</h2>

      <section className="debug-panel__section">
        <h3>Performance</h3>
        <p>FPS: {performance.fps.toFixed(1)}</p>
        <p>Frame: {performance.frameTimeMs.toFixed(2)}ms</p>
        <p>Draw Calls: {performance.drawCalls}</p>
        <p>Triangles: {performance.triangles}</p>
        <p>Heap: {performance.memoryUsedMB.toFixed(1)}MB</p>
      </section>

      <section className="debug-panel__section">
        <h3>VCR</h3>
        <p>Mode: {vcr.mode}</p>
        <p>Timecode: {vcr.timecode}</p>
      </section>

      <section className="debug-panel__section">
        <h3>Navigation</h3>
        <p>Section: {navigation.section}</p>
        <p>Page: {navigation.page}</p>
      </section>

      <section className="debug-panel__section">
        <h3>Horror</h3>
        <p>Phase: {horror.phase}</p>
        <p>Intensity: {horror.intensity.toFixed(2)}</p>
      </section>

      <p className="debug-panel__hint">Press ` to toggle</p>
    </aside>
  );
}
