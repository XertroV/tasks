import { useEffect } from 'react';
import { useAimingContext } from './AimingProvider';

export interface KeyboardNavigationProps {
  enabled?: boolean;
}

export function KeyboardNavigation({ enabled = true }: KeyboardNavigationProps) {
  const { shoot } = useAimingContext();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        shoot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, shoot]);

  return null;
}
