import { useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from './settingsStore';
import './SettingsPanel.css';

export function SettingsPanel() {
  const {
    isOpen,
    setOpen,
    horrorEnabled,
    setHorrorEnabled,
    masterVolume,
    setMasterVolume,
    reducedMotion,
    setReducedMotion,
  } = useSettingsStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(!isOpen);
      }
    },
    [isOpen, setOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleBackdropKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        setOpen(false);
      }
    },
    [setOpen]
  );

  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();

    if (e.key === 'Tab' && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'input[type="checkbox"], input[type="range"], button, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  const handleHorrorToggle = useCallback(() => {
    setHorrorEnabled(!horrorEnabled);
  }, [horrorEnabled, setHorrorEnabled]);

  const handleReducedMotionToggle = useCallback(() => {
    setReducedMotion(!reducedMotion);
  }, [reducedMotion, setReducedMotion]);

  if (!isOpen) return null;

  return (
    <div
      className="settings-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="settings-panel"
        onClick={handlePanelClick}
        onKeyDown={handlePanelKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <h2 id="settings-title" className="settings-title">
          SETTINGS
        </h2>
        <div className="settings-divider" aria-hidden="true" />
        <div className="settings-content" role="group" aria-label="Settings options">
          <label className="settings-row">
            <span className="settings-label" id="horror-label">
              HORROR MODE
            </span>
            <div className="settings-toggle">
              <input
                ref={firstFocusableRef}
                type="checkbox"
                checked={horrorEnabled}
                onChange={handleHorrorToggle}
                aria-labelledby="horror-label"
                aria-describedby="horror-desc"
              />
              <span id="horror-desc" className="sr-only">
                Toggle horror mode on or off
              </span>
              <span className="toggle-label" aria-hidden="true">
                {horrorEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </label>
          <label className="settings-row">
            <span className="settings-label" id="volume-label">
              MASTER VOLUME
            </span>
            <div className="settings-slider-container">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(masterVolume * 100)}
                onChange={(e) => setMasterVolume(Number.parseInt(e.target.value, 10) / 100)}
                className="settings-slider"
                aria-labelledby="volume-label"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(masterVolume * 100)}
                aria-valuetext={`${Math.round(masterVolume * 100)}%`}
              />
              <span className="slider-value" aria-hidden="true">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
          </label>
          <label className="settings-row">
            <span className="settings-label" id="motion-label">
              REDUCED MOTION
            </span>
            <div className="settings-toggle">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={handleReducedMotionToggle}
                aria-labelledby="motion-label"
                aria-describedby="motion-desc"
              />
              <span id="motion-desc" className="sr-only">
                Reduce motion effects for accessibility
              </span>
              <span className="toggle-label" aria-hidden="true">
                {reducedMotion ? 'ON' : 'OFF'}
              </span>
            </div>
          </label>
        </div>
        <div className="settings-divider" aria-hidden="true" />
        <div className="settings-hint" aria-live="polite">
          PRESS ESC TO CLOSE
        </div>
      </div>
    </div>
  );
}
