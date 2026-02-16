import { useRenderTargetTexture } from '@/crt';
import { useHorrorStore } from '@/horror';
import crtFrag from '@/shaders/crt-pass.frag.glsl?raw';
import crtVert from '@/shaders/crt-pass.vert.glsl?raw';
import { useNavigationStore } from '@/stores/navigationStore';
import { useVCRStore } from '@/vcr';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, EffectComposerContext } from '@react-three/postprocessing';
import { ShaderPass } from 'postprocessing';
import { useContext, useEffect, useMemo, useRef } from 'react';
import type { Texture } from 'three';
import { ShaderMaterial } from 'three';
import { VHS_DEFAULT_UNIFORMS, VHS_VERTEX_SHADER, getVHSFragmentShader } from './VHSPass';
import {
  useCRTControls,
  usePassTimingLogger,
  usePipelineControls,
  useVHSControls,
} from './useShaderControls';

function CustomShaderPass({
  uniforms,
  vertexShader,
  fragmentShader,
  insertIndex = 0,
  materialRef,
}: {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
  insertIndex?: number;
  materialRef?: React.MutableRefObject<ShaderMaterial | null>;
}) {
  const { composer } = useContext(EffectComposerContext);
  const localMaterialRef = useRef<ShaderMaterial | null>(null);
  const passRef = useRef<ShaderPass | null>(null);

  useEffect(() => {
    if (!composer) return;

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });
    localMaterialRef.current = material;
    if (materialRef) {
      materialRef.current = material;
    }

    const pass = new ShaderPass(material, 'tDiffuse');
    passRef.current = pass;

    const passes = composer.passes;
    const insertAt = Math.min(insertIndex, passes.length);
    passes.splice(insertAt, 0, pass);

    return () => {
      if (passRef.current && composer) {
        const idx = composer.passes.indexOf(passRef.current);
        if (idx > -1) {
          composer.passes.splice(idx, 1);
        }
        passRef.current.dispose();
      }
      if (localMaterialRef.current) {
        localMaterialRef.current.dispose();
      }
    };
  }, [composer, insertIndex, uniforms, vertexShader, fragmentShader, materialRef]);

  return null;
}

function VHSPassEffect({
  enabled,
  inputTexture,
}: { enabled: boolean; inputTexture: Texture | null }) {
  const { size } = useThree();
  const vhsMode = useVCRStore((state) => state.mode);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const transitionState = useNavigationStore((state) => state.transitionState);
  const transitionProgress = useNavigationStore((state) => state.transitionProgress);

  const horrorEnabled = useHorrorStore((state) => state.enabled);
  const horrorIntensity = useHorrorStore((state) => state.intensity);
  const horrorPhase = useHorrorStore((state) => state.phase);

  const isFFTransition = transitionState.startsWith('FF');
  const isREWTransition = transitionState.startsWith('REW');
  const ffSpeed = vhsMode === 'FF' || isFFTransition ? 1.0 : 0;
  const rewSpeed = vhsMode === 'REW' || isREWTransition ? 1.0 : 0;
  const transitionIntensity = isFFTransition || isREWTransition ? transitionProgress * 0.5 : 0;

  const effectiveHorrorIntensity = horrorEnabled ? horrorIntensity : 0;
  const horrorTrackingError = effectiveHorrorIntensity * 0.15;
  const horrorStaticNoise = effectiveHorrorIntensity * 0.25;
  const horrorDropoutRate = effectiveHorrorIntensity * 0.1;
  const horrorGlitchSeed = horrorPhase !== 'DORMANT' ? Math.random() * 1000 : 0;

  const uniforms = useMemo(
    () => ({
      tDiffuse: { value: inputTexture },
      uTime: { value: 0 },
      uTrackingError: {
        value: VHS_DEFAULT_UNIFORMS.uTrackingError + transitionIntensity + horrorTrackingError,
      },
      uHeadSwitchHeight: { value: VHS_DEFAULT_UNIFORMS.uHeadSwitchHeight },
      uHeadSwitchNoise: {
        value: VHS_DEFAULT_UNIFORMS.uHeadSwitchNoise + transitionIntensity * 0.5,
      },
      uChromaBleed: { value: 0.3 + transitionIntensity * 0.3 + effectiveHorrorIntensity * 0.2 },
      uDropoutRate: {
        value: VHS_DEFAULT_UNIFORMS.uDropoutRate + transitionIntensity * 0.1 + horrorDropoutRate,
      },
      uStaticNoise: { value: 0.05 + transitionIntensity * 0.2 + horrorStaticNoise },
      uPauseJitter: { value: vhsMode === 'PAUSED' ? 0.3 : 0 },
      uFFSpeed: { value: ffSpeed },
      uREWSpeed: { value: rewSpeed },
      uHorrorIntensity: { value: effectiveHorrorIntensity },
      uGlitchSeed: { value: horrorGlitchSeed },
      uResolution: { value: [size.width, size.height] },
    }),
    [
      size.width,
      size.height,
      vhsMode,
      inputTexture,
      ffSpeed,
      rewSpeed,
      transitionIntensity,
      effectiveHorrorIntensity,
      horrorTrackingError,
      horrorStaticNoise,
      horrorDropoutRate,
      horrorGlitchSeed,
    ]
  );

  useVHSControls(materialRef, import.meta.env.DEV && enabled);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    if (inputTexture && uniforms.tDiffuse.value !== inputTexture) {
      uniforms.tDiffuse.value = inputTexture;
    }
    uniforms.uFFSpeed.value = ffSpeed;
    uniforms.uREWSpeed.value = rewSpeed;
    uniforms.uTrackingError.value =
      VHS_DEFAULT_UNIFORMS.uTrackingError + transitionIntensity + horrorTrackingError;
    uniforms.uHeadSwitchNoise.value =
      VHS_DEFAULT_UNIFORMS.uHeadSwitchNoise + transitionIntensity * 0.5;
    uniforms.uChromaBleed.value = 0.3 + transitionIntensity * 0.3 + effectiveHorrorIntensity * 0.2;
    uniforms.uDropoutRate.value =
      VHS_DEFAULT_UNIFORMS.uDropoutRate + transitionIntensity * 0.1 + horrorDropoutRate;
    uniforms.uStaticNoise.value = 0.05 + transitionIntensity * 0.2 + horrorStaticNoise;
    uniforms.uHorrorIntensity.value = effectiveHorrorIntensity;

    if (horrorPhase !== 'DORMANT' && Math.random() < effectiveHorrorIntensity * 0.05) {
      uniforms.uGlitchSeed.value = Math.random() * 1000;
    }
  });

  if (!enabled) return null;

  return (
    <CustomShaderPass
      uniforms={uniforms}
      vertexShader={VHS_VERTEX_SHADER}
      fragmentShader={getVHSFragmentShader()}
      insertIndex={0}
      materialRef={materialRef}
    />
  );
}

function CRTPassEffect({ enabled }: { enabled: boolean }) {
  const { size } = useThree();
  const materialRef = useRef<ShaderMaterial | null>(null);

  const horrorEnabled = useHorrorStore((state) => state.enabled);
  const horrorIntensity = useHorrorStore((state) => state.intensity);
  const horrorPhase = useHorrorStore((state) => state.phase);

  const temperatureShift = horrorEnabled && horrorPhase !== 'DORMANT' ? horrorIntensity * 0.3 : 0;
  const desaturation = horrorEnabled && horrorPhase !== 'DORMANT' ? horrorIntensity * 0.25 : 0;

  const uniforms = useMemo(
    () => ({
      tDiffuse: { value: null },
      uCurvature: { value: 0.15 },
      uScanlineIntensity: { value: 0.3 },
      uScanlineCount: { value: 480 },
      uPhosphorIntensity: { value: 0.2 },
      uPhosphorMask: { value: 0.15 },
      uVignetteStrength: { value: 0.4 + horrorIntensity * 0.15 },
      uFlicker: { value: 0.08 + horrorIntensity * 0.05 },
      uBrightness: { value: 1.0 - horrorIntensity * 0.1 },
      uResolution: { value: [size.width, size.height] },
      uTime: { value: 0 },
      uTemperatureShift: { value: temperatureShift },
      uDesaturation: { value: desaturation },
    }),
    [size.width, size.height, horrorIntensity, temperatureShift, desaturation]
  );

  useCRTControls(materialRef, import.meta.env.DEV && enabled);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uTemperatureShift.value = temperatureShift;
    uniforms.uDesaturation.value = desaturation;
    uniforms.uVignetteStrength.value = 0.4 + horrorIntensity * 0.15;
    uniforms.uFlicker.value = 0.08 + horrorIntensity * 0.05;
    uniforms.uBrightness.value = 1.0 - horrorIntensity * 0.1;
  });

  if (!enabled) return null;

  return (
    <CustomShaderPass
      uniforms={uniforms}
      vertexShader={crtVert}
      fragmentShader={crtFrag}
      insertIndex={1}
      materialRef={materialRef}
    />
  );
}

export function PostProcessingPipeline() {
  const { vhsEnabled, crtEnabled, bloomEnabled, logTiming, comparisonMode } = usePipelineControls();
  const { logTimings } = usePassTimingLogger(logTiming);
  const renderTargetTexture = useRenderTargetTexture();
  const frameStartRef = useRef(0);
  const passTimingsRef = useRef({ vhs: 0, crt: 0, bloom: 0 });

  useFrame(() => {
    frameStartRef.current = performance.now();
  }, -10);

  useFrame(() => {
    if (logTiming) {
      passTimingsRef.current.vhs = performance.now() - frameStartRef.current;
    }
  }, 1);

  useFrame(() => {
    if (logTiming) {
      passTimingsRef.current.crt =
        performance.now() - frameStartRef.current - passTimingsRef.current.vhs;
    }
  }, 2);

  useFrame(() => {
    if (logTiming) {
      const totalTime = performance.now() - frameStartRef.current;
      passTimingsRef.current.bloom =
        totalTime - passTimingsRef.current.vhs - passTimingsRef.current.crt;
      logTimings({
        vhs: vhsEnabled ? passTimingsRef.current.vhs : 0,
        crt: crtEnabled ? passTimingsRef.current.crt : 0,
        bloom: bloomEnabled ? passTimingsRef.current.bloom : 0,
        total: totalTime,
      });
    }
  }, 10);

  const showOriginal = comparisonMode === 'toggle';
  const isSplit = comparisonMode === 'split';

  if (showOriginal) {
    return null;
  }

  return (
    <EffectComposer>
      <VHSPassEffect enabled={vhsEnabled && !isSplit} inputTexture={renderTargetTexture} />
      <CRTPassEffect enabled={crtEnabled && !isSplit} />
      <Bloom
        intensity={bloomEnabled && !isSplit ? 0.2 : 0}
        luminanceThreshold={0.8}
        luminanceSmoothing={0.5}
        radius={bloomEnabled && !isSplit ? 0.5 : 0}
      />
    </EffectComposer>
  );
}
