import { useControls } from 'leva';
import { useCallback, useEffect, useRef } from 'react';
import type { ShaderMaterial } from 'three';

export interface VHSControls {
  trackingError: number;
  headSwitchHeight: number;
  headSwitchNoise: number;
  chromaBleed: number;
  dropoutRate: number;
  staticNoise: number;
  pauseJitter: number;
  ffSpeed: number;
  rewSpeed: number;
  horrorIntensity: number;
  glitchSeed: number;
}

export const VHS_CONTROLS_DEFAULTS: VHSControls = {
  trackingError: 0,
  headSwitchHeight: 0.05,
  headSwitchNoise: 0.2,
  chromaBleed: 0.3,
  dropoutRate: 0,
  staticNoise: 0.05,
  pauseJitter: 0,
  ffSpeed: 0,
  rewSpeed: 0,
  horrorIntensity: 0,
  glitchSeed: 0,
};

export function useVHSControls(
  materialRef: React.RefObject<ShaderMaterial | null>,
  enabled = true
): VHSControls {
  const controls = useControls('VHS', {
    trackingError: { value: VHS_CONTROLS_DEFAULTS.trackingError, min: 0, max: 1, step: 0.01 },
    headSwitchHeight: {
      value: VHS_CONTROLS_DEFAULTS.headSwitchHeight,
      min: 0.01,
      max: 0.2,
      step: 0.01,
    },
    headSwitchNoise: { value: VHS_CONTROLS_DEFAULTS.headSwitchNoise, min: 0, max: 1, step: 0.01 },
    chromaBleed: { value: VHS_CONTROLS_DEFAULTS.chromaBleed, min: 0, max: 1, step: 0.01 },
    dropoutRate: { value: VHS_CONTROLS_DEFAULTS.dropoutRate, min: 0, max: 1, step: 0.01 },
    staticNoise: { value: VHS_CONTROLS_DEFAULTS.staticNoise, min: 0, max: 1, step: 0.01 },
    pauseJitter: { value: VHS_CONTROLS_DEFAULTS.pauseJitter, min: 0, max: 1, step: 0.01 },
    ffSpeed: { value: VHS_CONTROLS_DEFAULTS.ffSpeed, min: 0, max: 3, step: 0.1 },
    rewSpeed: { value: VHS_CONTROLS_DEFAULTS.rewSpeed, min: 0, max: 3, step: 0.1 },
    horrorIntensity: { value: VHS_CONTROLS_DEFAULTS.horrorIntensity, min: 0, max: 1, step: 0.01 },
    glitchSeed: { value: VHS_CONTROLS_DEFAULTS.glitchSeed, min: 0, max: 100, step: 1 },
  });

  useEffect(() => {
    if (!enabled || !materialRef.current) return;

    const material = materialRef.current;
    const uniforms = material.uniforms;

    if (uniforms.uTrackingError) uniforms.uTrackingError.value = controls.trackingError;
    if (uniforms.uHeadSwitchHeight) uniforms.uHeadSwitchHeight.value = controls.headSwitchHeight;
    if (uniforms.uHeadSwitchNoise) uniforms.uHeadSwitchNoise.value = controls.headSwitchNoise;
    if (uniforms.uChromaBleed) uniforms.uChromaBleed.value = controls.chromaBleed;
    if (uniforms.uDropoutRate) uniforms.uDropoutRate.value = controls.dropoutRate;
    if (uniforms.uStaticNoise) uniforms.uStaticNoise.value = controls.staticNoise;
    if (uniforms.uPauseJitter) uniforms.uPauseJitter.value = controls.pauseJitter;
    if (uniforms.uFFSpeed) uniforms.uFFSpeed.value = controls.ffSpeed;
    if (uniforms.uREWSpeed) uniforms.uREWSpeed.value = controls.rewSpeed;
    if (uniforms.uHorrorIntensity) uniforms.uHorrorIntensity.value = controls.horrorIntensity;
    if (uniforms.uGlitchSeed) uniforms.uGlitchSeed.value = controls.glitchSeed;
  }, [controls, materialRef, enabled]);

  return controls as VHSControls;
}

export interface CRTControls {
  curvature: number;
  scanlineIntensity: number;
  scanlineCount: number;
  phosphorIntensity: number;
  vignetteStrength: number;
  flicker: number;
  brightness: number;
}

export const CRT_CONTROLS_DEFAULTS: CRTControls = {
  curvature: 0.15,
  scanlineIntensity: 0.3,
  scanlineCount: 480,
  phosphorIntensity: 0.2,
  vignetteStrength: 0.4,
  flicker: 0.08,
  brightness: 1.0,
};

export function useCRTControls(
  materialRef: React.RefObject<ShaderMaterial | null>,
  enabled = true
): CRTControls {
  const controls = useControls('CRT', {
    curvature: { value: CRT_CONTROLS_DEFAULTS.curvature, min: 0, max: 0.5, step: 0.01 },
    scanlineIntensity: {
      value: CRT_CONTROLS_DEFAULTS.scanlineIntensity,
      min: 0,
      max: 1,
      step: 0.01,
    },
    scanlineCount: { value: CRT_CONTROLS_DEFAULTS.scanlineCount, min: 100, max: 1080, step: 10 },
    phosphorIntensity: {
      value: CRT_CONTROLS_DEFAULTS.phosphorIntensity,
      min: 0,
      max: 1,
      step: 0.01,
    },
    vignetteStrength: { value: CRT_CONTROLS_DEFAULTS.vignetteStrength, min: 0, max: 2, step: 0.01 },
    flicker: { value: CRT_CONTROLS_DEFAULTS.flicker, min: 0, max: 0.5, step: 0.01 },
    brightness: { value: CRT_CONTROLS_DEFAULTS.brightness, min: 0.5, max: 1.5, step: 0.01 },
  });

  useEffect(() => {
    if (!enabled || !materialRef.current) return;

    const material = materialRef.current;
    const uniforms = material.uniforms;

    if (uniforms.uCurvature) uniforms.uCurvature.value = controls.curvature;
    if (uniforms.uScanlineIntensity) uniforms.uScanlineIntensity.value = controls.scanlineIntensity;
    if (uniforms.uScanlineCount) uniforms.uScanlineCount.value = controls.scanlineCount;
    if (uniforms.uPhosphorIntensity) uniforms.uPhosphorIntensity.value = controls.phosphorIntensity;
    if (uniforms.uVignetteStrength) uniforms.uVignetteStrength.value = controls.vignetteStrength;
    if (uniforms.uFlicker) uniforms.uFlicker.value = controls.flicker;
    if (uniforms.uBrightness) uniforms.uBrightness.value = controls.brightness;
  }, [controls, materialRef, enabled]);

  return controls as CRTControls;
}

export interface PipelineControls {
  vhsEnabled: boolean;
  crtEnabled: boolean;
  bloomEnabled: boolean;
  logTiming: boolean;
}

export const PIPELINE_CONTROLS_DEFAULTS: PipelineControls = {
  vhsEnabled: true,
  crtEnabled: true,
  bloomEnabled: true,
  logTiming: false,
};

export function usePipelineControls(): PipelineControls {
  const controls = useControls('Pipeline', {
    vhsEnabled: { value: PIPELINE_CONTROLS_DEFAULTS.vhsEnabled, label: 'VHS Pass' },
    crtEnabled: { value: PIPELINE_CONTROLS_DEFAULTS.crtEnabled, label: 'CRT Pass' },
    bloomEnabled: { value: PIPELINE_CONTROLS_DEFAULTS.bloomEnabled, label: 'Bloom' },
    logTiming: { value: PIPELINE_CONTROLS_DEFAULTS.logTiming, label: 'Log Timing' },
  });

  return controls as PipelineControls;
}

export interface PassTimings {
  vhs: number;
  crt: number;
  bloom: number;
  total: number;
}

export function usePassTimingLogger(logEnabled: boolean) {
  const timings = useRef<PassTimings>({ vhs: 0, crt: 0, bloom: 0, total: 0 });
  const lastLogTime = useRef(0);

  const logTimings = useCallback(
    (newTimings: Partial<PassTimings>) => {
      if (!logEnabled) return;

      timings.current = { ...timings.current, ...newTimings };
      const now = performance.now();

      if (now - lastLogTime.current > 1000) {
        const t = timings.current;
        console.log(
          `[Pipeline] VHS: ${t.vhs.toFixed(2)}ms | CRT: ${t.crt.toFixed(2)}ms | Bloom: ${t.bloom.toFixed(2)}ms | Total: ${t.total.toFixed(2)}ms`
        );
        lastLogTime.current = now;
      }
    },
    [logEnabled]
  );

  return { logTimings, timings: timings.current };
}
