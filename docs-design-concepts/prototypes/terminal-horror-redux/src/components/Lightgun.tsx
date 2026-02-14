import { useState, useEffect } from 'react';

export default function Lightgun() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<'idle' | 'targeting' | 'firing' | 'miss'>('idle');
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (element?.closest('.shootable, [data-shootable]')) {
        setMode('targeting');
      } else if (mode !== 'firing' && mode !== 'miss') {
        setMode('idle');
      }
    };
    
    const handleClick = (e: MouseEvent) => {
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const hit = !!element?.closest('.shootable, [data-shootable]');
      
      setMode(hit ? 'firing' : 'miss');
      
      setTimeout(() => {
        setMode('idle');
      }, hit ? 100 : 300);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
    };
  }, [mode]);
  
  const cursorColor = {
    idle: '#33FF33',
    targeting: '#00FFFF',
    firing: '#FFFF00',
    miss: '#FF6600',
  }[mode];
  
  return (
    <svg
      className="fixed pointer-events-none z-50"
      style={{
        left: position.x - 32,
        top: position.y - 32,
        filter: `drop-shadow(0 0 10px ${cursorColor})`,
        transform: mode === 'firing' ? 'scale(1.3)' : mode === 'miss' ? 'translateX(-3px)' : 'scale(1)',
        transition: 'transform 0.1s ease-out',
      }}
      width="64"
      height="64"
      viewBox="0 0 64 64"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke={cursorColor}
        strokeWidth="1.5"
        strokeDasharray="4 6"
        className={mode === 'targeting' ? 'animate-pulse' : ''}
      />
      
      <g stroke={cursorColor} strokeWidth="2">
        <line x1="32" y1="4" x2="32" y2="20" />
        <line x1="32" y1="44" x2="32" y2="60" />
        <line x1="4" y1="32" x2="20" y2="32" />
        <line x1="44" y1="32" x2="60" y2="32" />
      </g>
      
      <circle cx="32" cy="32" r="3" fill={cursorColor} />
      
      <g stroke={cursorColor} strokeWidth="1.5" fill="none">
        <path d="M 8 16 L 8 8 L 16 8" />
        <path d="M 48 8 L 56 8 L 56 16" />
        <path d="M 8 48 L 8 56 L 16 56" />
        <path d="M 48 56 L 56 56 L 56 48" />
      </g>
    </svg>
  );
}
