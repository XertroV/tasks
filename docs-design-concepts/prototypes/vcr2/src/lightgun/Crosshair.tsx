import { useEffect, useRef } from 'react';
import type { CursorState } from './AimingSystem';

export interface CrosshairProps {
  cursorState: CursorState;
  hidden?: boolean;
}

const COLORS: Record<CursorState, string> = {
  idle: '#33FF33',
  targeting: '#00FFFF',
  firing: '#FFFF00',
  miss: '#FFAA00',
};

export function Crosshair({ cursorState, hidden = false }: CrosshairProps) {
  const crosshairRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.cursor = 'none';
    }

    return () => {
      if (canvas) {
        canvas.style.cursor = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!crosshairRef.current) return;

    crosshairRef.current.style.animation = '';

    if (cursorState === 'targeting') {
      crosshairRef.current.style.animation = 'pulse 0.5s ease-in-out infinite';
    } else if (cursorState === 'firing') {
      crosshairRef.current.style.animation = 'flash 0.1s ease-out';
    } else if (cursorState === 'miss') {
      crosshairRef.current.style.animation = 'shake 0.2s ease-out';
    }
  }, [cursorState]);

  if (hidden) return null;

  const color = COLORS[cursorState];

  return (
    <div
      ref={crosshairRef}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="Crosshair">
        <title>Crosshair</title>
        <line x1="16" y1="4" x2="16" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line
          x1="16"
          y1="20"
          x2="16"
          y2="28"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line x1="4" y1="16" x2="12" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line
          x1="20"
          y1="16"
          x2="28"
          y2="16"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="2" fill={color} />
      </svg>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
          }
          @keyframes flash {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes shake {
            0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
            25% { transform: translate(-50%, -50%) rotate(-5deg); }
            75% { transform: translate(-50%, -50%) rotate(5deg); }
          }
        `}
      </style>
    </div>
  );
}
