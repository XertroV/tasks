import { useEffect, useState } from 'react';
import { FINAL_MESSAGES } from './corruption-effects';
import { useHorrorStore } from './horrorStore';

interface PostHorrorScreenProps {
  onComplete?: () => void;
  onRestart?: () => void;
}

export function PostHorrorScreen({ onComplete, onRestart }: PostHorrorScreenProps) {
  const phase = useHorrorStore((state) => state.phase);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (phase !== 'POST') return;

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev < FINAL_MESSAGES.length - 1) {
          return prev + 1;
        }
        clearInterval(messageInterval);
        return prev;
      });
    }, 1500);

    const choicesTimeout = setTimeout(
      () => {
        setShowChoices(true);
      },
      FINAL_MESSAGES.length * 1500 + 500
    );

    return () => {
      clearInterval(messageInterval);
      clearTimeout(choicesTimeout);
    };
  }, [phase]);

  const handlePlay = () => {
    setFadeOut(true);
    setTimeout(() => {
      onRestart?.();
    }, 1000);
  };

  const handleEject = () => {
    setFadeOut(true);
    setTimeout(() => {
      onComplete?.();
    }, 1000);
  };

  if (phase !== 'POST') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'VT323, monospace',
        color: '#ff0000',
        zIndex: 9999,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 1s ease-out',
      }}
    >
      <div
        style={{
          fontSize: '2rem',
          textAlign: 'center',
          marginBottom: '2rem',
          textShadow: '0 0 10px #ff0000, 0 0 20px #ff0000',
          animation: 'flicker 0.1s infinite',
        }}
      >
        {FINAL_MESSAGES[currentMessageIndex]}
      </div>

      {showChoices && <HorrorChoiceScreen onPlay={handlePlay} onEject={handleEject} />}

      <style>{`
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

interface HorrorChoiceScreenProps {
  onPlay: () => void;
  onEject: () => void;
}

export function HorrorChoiceScreen({ onPlay, onEject }: HorrorChoiceScreenProps) {
  const [selectedChoice, setSelectedChoice] = useState<'play' | 'eject' | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      setSelectedChoice(selectedChoice === 'play' ? 'eject' : 'play');
    }
    if (e.key === 'Enter' && selectedChoice) {
      if (selectedChoice === 'play') {
        onPlay();
      } else {
        onEject();
      }
    }
  };

  return (
    <div
      role="group"
      aria-label="Post-horror choices"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          fontSize: '1.2rem',
          color: '#888',
          marginBottom: '1rem',
        }}
      >
        CHOOSE YOUR FATE
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <button
          type="button"
          onClick={onPlay}
          onMouseEnter={() => setSelectedChoice('play')}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.5rem',
            fontFamily: 'VT323, monospace',
            backgroundColor: selectedChoice === 'play' ? '#330000' : '#110000',
            color: '#ff0000',
            border: selectedChoice === 'play' ? '2px solid #ff0000' : '2px solid #550000',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textShadow: '0 0 5px #ff0000',
          }}
        >
          PLAY AGAIN
        </button>

        <button
          type="button"
          onClick={onEject}
          onMouseEnter={() => setSelectedChoice('eject')}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.5rem',
            fontFamily: 'VT323, monospace',
            backgroundColor: selectedChoice === 'eject' ? '#330000' : '#110000',
            color: '#ff0000',
            border: selectedChoice === 'eject' ? '2px solid #ff0000' : '2px solid #550000',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textShadow: '0 0 5px #ff0000',
          }}
        >
          EJECT
        </button>
      </div>

      <div
        style={{
          fontSize: '0.8rem',
          color: '#444',
          marginTop: '0.5rem',
        }}
      >
        Use arrow keys or click to select, Enter to confirm
      </div>
    </div>
  );
}
