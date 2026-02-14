import React, { useState, useEffect, useRef } from 'react';
import { playKeystroke, playHum, stopHum } from '../utils/audio';
import { docsContent } from '../data/docs-content';

type SectionKey = keyof typeof docsContent;
const SECTIONS: SectionKey[] = ['intro', 'commands', 'internals'];

export const TerminalScreen: React.FC = () => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentContent = docsContent[SECTIONS[currentSectionIndex]].content;

  // Initialize audio and ambient hum
  useEffect(() => {
    // Start ambient hum on mount (user interaction required for actual audio)
    playHum();
    return () => {
      stopHum();
    };
  }, []);

  // Typing effect
  useEffect(() => {
    let index = 0;
    setDisplayedText(''); // Reset text when content changes
    setIsTyping(true);

    const intervalId = setInterval(() => {
      if (index < currentContent.length) {
        playKeystroke();
        const char = currentContent.charAt(index);
        setDisplayedText((prev) => prev + char);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(intervalId);
      }
      
      // Auto-scroll
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50); // Slower typing (50ms) to match audio rate and prevent overlapping

    return () => clearInterval(intervalId);
  }, [currentSectionIndex]); // Re-run when section changes

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!isTyping) {
            if (currentSectionIndex < SECTIONS.length - 1) {
                setCurrentSectionIndex((prev) => prev + 1);
            } else {
                // Loop back to start or stay at end? Let's loop for now or maybe trigger horror?
                // For now, let's just loop
                setCurrentSectionIndex(0);
            }
        } else {
            // Optional: skip typing? No, let's keep it horror-paced.
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, currentSectionIndex]);

  // Blinking cursor

  // Blinking cursor
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="w-full h-full bg-black text-[#33ff33] p-8 font-mono overflow-hidden relative border-4 border-[#1a1a1a] rounded-lg shadow-[0_0_20px_rgba(51,255,51,0.2)]">
      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20"></div>
      
      {/* Screen Glow */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] z-20 rounded-lg"></div>

      {/* Content */}
      <div ref={scrollRef} className="h-full overflow-y-auto whitespace-pre-wrap leading-relaxed text-lg tracking-wider" style={{ textShadow: '0 0 5px #33ff33' }}>
        {displayedText}
        {showCursor && <span className="inline-block w-3 h-5 bg-[#33ff33] ml-1 align-middle"></span>}
      </div>
    </div>
  );
};
