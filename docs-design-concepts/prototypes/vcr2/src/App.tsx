import { Canvas } from '@react-three/fiber';
import './App.css';
import { SpatialAudioSetup, initAudioOnInteraction, useTapeAudio } from '@/audio';
import {
  BootOverlay,
  BootSequence,
  SettingsPanel,
  useBootAudio,
  useBootDebugControls,
  useBootStore,
  useSettingsStore,
} from '@/boot';
import { CameraController, DebugFreecamController, useCameraStore } from '@/camera';
import { ScreenContent, ScreenRenderer, useRenderTargetTexture } from '@/crt';
import { LevaProvider, useSharedLevaStore } from '@/debug/DebugLeva';
import { createLogger } from '@/debug/logger';
import { BackroomsHallway } from '@/hallway';
import { HorrorCameraBridge, PostHorrorScreen, useHorrorStore } from '@/horror';
import { LookAtScreenPostIt, LookBehindYouPostIt, SkipBootPostIt } from '@/interaction/PostItNote';
import {
  AimingProvider,
  CrosshairRenderer,
  KeyboardNavigation,
  ZapperController,
  useZapperDebugControls,
} from '@/lightgun';
import type { ZapperControllerRef } from '@/lightgun';
import { PostProcessingPipeline } from '@/postprocessing';
import { Room } from '@/room';
import { DeviceProvider, WebGL2Fallback } from '@/utils/DeviceProvider';
import { useVCRStore } from '@/vcr';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';

const logger = createLogger('Freecam');

function ZapperWithDebugControls() {
  const zapperRef = useRef<ZapperControllerRef>(null);
  const debug = useZapperDebugControls(zapperRef, import.meta.env.DEV);
  const isBootComplete = useBootStore((state) => state.isComplete);

  if (!debug.showZapper || !isBootComplete) return null;

  return (
    <ZapperController
      ref={zapperRef}
      showCable={debug.showCable}
      scale={debug.zapperScale}
      offsetX={debug.offsetX}
      offsetY={debug.offsetY}
      offsetZ={debug.offsetZ}
      recoilStrength={debug.recoilStrength}
      muzzleFlashIntensity={debug.muzzleFlashIntensity}
    />
  );
}

const DebugMount = import.meta.env.DEV
  ? lazy(() => import('@/debug/DebugMount').then((module) => ({ default: module.DebugMount })))
  : null;

const DebugOverlay = import.meta.env.DEV
  ? lazy(() => import('@/debug/DebugMount').then((module) => ({ default: module.DebugOverlay })))
  : null;

function TapeAudio() {
  useTapeAudio();
  return null;
}

function BootAudioPlayer() {
  useBootAudio();
  return null;
}

function BootDebugPanel({ levaStore }: { levaStore?: ReturnType<typeof useSharedLevaStore> }) {
  if (import.meta.env.DEV) {
    useBootDebugControls(true, levaStore);
  }
  return null;
}

function BootVCRController() {
  const currentPhase = useBootStore((state) => state.currentPhase);
  const [crtScreenMode, setCrtScreenMode] = useState<'no-signal' | 'docs'>('no-signal');
  const screenTexture = useRenderTargetTexture();

  useEffect(() => {
    if (currentPhase === 'TV_POWER_ON') {
      useVCRStore.getState().loadTape();
    }
  }, [currentPhase]);

  useEffect(() => {
    if (currentPhase === 'PLAYBACK_BEGIN' && crtScreenMode === 'no-signal') {
      setCrtScreenMode('docs');
      useVCRStore.getState().play();
    }
  }, [currentPhase, crtScreenMode]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const state = useVCRStore.getState();
      if (state.mode === 'PLAYING' || state.mode === 'FF' || state.mode === 'REW') {
        state.tick(0.1);
      }
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <Room crtScreenMode={crtScreenMode} screenTexture={screenTexture} onMaterialsReady={() => {}} />
  );
}

function useKeyboardShortcuts() {
  const cameraMode = useCameraStore((state) => state.mode);
  const setCameraMode = useCameraStore((state) => state.setMode);
  const toggleSettings = useSettingsStore((state) => state.toggleOpen);
  const isSettingsOpen = useSettingsStore((state) => state.isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          if (!isSettingsOpen) {
            const newMode = cameraMode === 'normal' ? 'look-behind' : 'normal';
            setCameraMode(newMode);
          }
          break;
        case 'h':
          if (!isSettingsOpen) {
            useHorrorStore.getState().toggleEnabled();
          }
          break;
        case 's':
          if (!isSettingsOpen) {
            toggleSettings();
          }
          break;
        case 'c':
          if (!isSettingsOpen) {
            const newMode = cameraMode === 'freecam' ? 'normal' : 'freecam';
            setCameraMode(newMode);
          }
          break;
        case 'escape':
          if (isSettingsOpen) {
            toggleSettings();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraMode, setCameraMode, toggleSettings, isSettingsOpen]);
}

function PostHorrorFlowHandler() {
  const handleRestart = () => {
    useHorrorStore.getState().enable();
  };

  const handleComplete = () => {
    useHorrorStore.getState().disable();
  };

  return <PostHorrorScreen onRestart={handleRestart} onComplete={handleComplete} />;
}

function FreecamHint() {
  return (
    <div className="freecam-hint">
      <div>FREECAM ACTIVE</div>
      <div>Click to lock mouse | WASD move | Shift boost | Space/E up | Ctrl/Q down | C exit</div>
    </div>
  );
}

function CanvasContent({
  children,
  levaStore,
}: { children: React.ReactNode; levaStore?: ReturnType<typeof useSharedLevaStore> }) {
  if (!levaStore) return <>{children}</>;
  return <LevaProvider store={levaStore}>{children as React.ReactElement}</LevaProvider>;
}

function App() {
  const syncWithSystemPreferences = useSettingsStore((state) => state.syncWithSystemPreferences);
  const levaStore = import.meta.env.DEV ? useSharedLevaStore() : undefined;

  useEffect(() => {
    initAudioOnInteraction();
  }, []);

  useEffect(() => {
    syncWithSystemPreferences();
  }, [syncWithSystemPreferences]);

  useKeyboardShortcuts();

  const cameraMode = useCameraStore((state) => state.mode);
  const previousModeRef = useRef(cameraMode);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    if (previousMode !== 'freecam' && cameraMode === 'freecam') {
      logger.debug('Enabling debug freecam');
    }
    if (previousMode === 'freecam' && cameraMode !== 'freecam') {
      logger.debug('Disabling debug freecam');
    }
    previousModeRef.current = cameraMode;
  }, [cameraMode]);

  return (
    <DeviceProvider>
      <WebGL2Fallback />
      <div className="app">
        <BootOverlay />
        <PostHorrorFlowHandler />
        <TapeAudio />
        <BootAudioPlayer />
        <BootDebugPanel levaStore={levaStore} />
        <Canvas camera={{ position: [0, 1.2, -2], fov: 60 }}>
          <CanvasContent levaStore={levaStore}>
            <ScreenRenderer>
              <BootSequence />
              <AimingProvider>
                <SpatialAudioSetup />
                <KeyboardNavigation />
                <BootVCRController />
                <LookBehindYouPostIt position={[-0.5, 1.1, -6.3]} rotation={[0, 0, 0.1]} />
                <LookAtScreenPostIt position={[0, 1.4, -3]} rotation={[0, Math.PI, 0]} />
                <SkipBootPostIt position={[0.5, 1.1, -3]} rotation={[0, Math.PI, -0.1]} />
                {cameraMode !== 'look-behind' && <BackroomsHallway />}
                <CameraController />
                <DebugFreecamController />
                <HorrorCameraBridge />
                <PostProcessingPipeline />
                <ZapperWithDebugControls />
              </AimingProvider>
              <ScreenContent />
              {DebugMount ? (
                <Suspense fallback={null}>
                  <DebugMount levaStore={levaStore} />
                </Suspense>
              ) : null}
            </ScreenRenderer>
          </CanvasContent>
        </Canvas>
        {DebugOverlay ? (
          <Suspense fallback={null}>
            <DebugOverlay levaStore={levaStore} />
          </Suspense>
        ) : null}
        <CrosshairRenderer />
        {cameraMode === 'freecam' ? <FreecamHint /> : null}
        <SettingsPanel />
      </div>
    </DeviceProvider>
  );
}

export default App;
