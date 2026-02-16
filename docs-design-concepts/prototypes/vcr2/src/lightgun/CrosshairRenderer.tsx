import { createPortal } from 'react-dom';
import { useAimingContext } from './AimingProvider';
import { Crosshair } from './Crosshair';

export function CrosshairRenderer() {
  const { cursorState } = useAimingContext();
  return createPortal(<Crosshair cursorState={cursorState} />, document.body);
}
