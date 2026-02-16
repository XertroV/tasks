import { Crosshair } from './Crosshair';
import { useAimingStore } from './aimingStore';

export function CrosshairRenderer() {
  const cursorState = useAimingStore((state) => state.cursorState);
  return <Crosshair cursorState={cursorState} />;
}
