import crtFrag from '@/shaders/crt-pass.frag.glsl?raw';
import crtVert from '@/shaders/crt-pass.vert.glsl?raw';
import { useVCRStore } from '@/vcr';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, EffectComposerContext } from '@react-three/postprocessing';
import { ShaderPass } from 'postprocessing';
import { useContext, useEffect, useMemo, useRef } from 'react';
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
  materialRef?: React.RefObject<ShaderMaterial | null>;
}) {
  const { composer } = useContext(EffectComposerContext);
  const localMaterialRef = useRef<ShaderMaterial | null>(null);
  const materialRefToUse = materialRef ?? localMaterialRef;
  const passRef = useRef<ShaderPass | null>(null);

  useEffect(() => {
    if (!composer) return;

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });
    materialRefToUse.current = material;

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
      if (materialRefToUse.current) {
        materialRefToUse.current.dispose();
      }
    };
  }, [composer, insertIndex, uniforms, vertexShader, fragmentShader, materialRefToUse]);

  return null;
}

function VHSPassEffect({ enabled }: { enabled: boolean }) {
  const { size } = useThree();
  const vhsMode = useVCRStore((state) => state.mode);
  const materialRef = useRef<ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uTrackingError: { value: VHS_DEFAULT_UNIFORMS.uTrackingError },
      uHeadSwitchHeight: { value: VHS_DEFAULT_UNIFORMS.uHeadSwitchHeight },
      uHeadSwitchNoise: { value: VHS_DEFAULT_UNIFORMS.uHeadSwitchNoise },
      uChromaBleed: { value: 0.3 },
      uDropoutRate: { value: VHS_DEFAULT_UNIFORMS.uDropoutRate },
      uStaticNoise: { value: 0.05 },
      uPauseJitter: { value: vhsMode === 'PAUSED' ? 0.3 : 0 },
      uFFSpeed: { value: vhsMode === 'FF' ? 1.0 : 0 },
      uREWSpeed: { value: vhsMode === 'REW' ? 1.0 : 0 },
      uHorrorIntensity: { value: VHS_DEFAULT_UNIFORMS.uHorrorIntensity },
      uGlitchSeed: { value: VHS_DEFAULT_UNIFORMS.uGlitchSeed },
      uResolution: { value: [size.width, size.height] },
    }),
    [size.width, size.height, vhsMode]
  );

  useVHSControls(materialRef, import.meta.env.DEV && enabled);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
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

  const uniforms = useMemo(
    () => ({
      tDiffuse: { value: null },
      uCurvature: { value: 0.15 },
      uScanlineIntensity: { value: 0.3 },
      uScanlineCount: { value: 480 },
      uPhosphorIntensity: { value: 0.2 },
      uPhosphorMask: { value: 0.15 },
      uVignetteStrength: { value: 0.4 },
      uFlicker: { value: 0.08 },
      uBrightness: { value: 1.0 },
      uResolution: { value: [size.width, size.height] },
      uTime: { value: 0 },
    }),
    [size.width, size.height]
  );

  useCRTControls(materialRef, import.meta.env.DEV && enabled);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
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
  const { vhsEnabled, crtEnabled, bloomEnabled, logTiming } = usePipelineControls();
  const { logTimings } = usePassTimingLogger(logTiming);

  useFrame(() => {
    if (logTiming) {
      const vhsTime = vhsEnabled ? 0.5 : 0;
      const crtTime = crtEnabled ? 0.3 : 0;
      const bloomTime = bloomEnabled ? 0.2 : 0;
      logTimings({
        vhs: vhsTime,
        crt: crtTime,
        bloom: bloomTime,
        total: vhsTime + crtTime + bloomTime,
      });
    }
  });

  return (
    <EffectComposer>
      <VHSPassEffect enabled={vhsEnabled} />
      <CRTPassEffect enabled={crtEnabled} />
      {bloomEnabled && (
        <Bloom intensity={0.2} luminanceThreshold={0.8} luminanceSmoothing={0.5} radius={0.5} />
      )}
    </EffectComposer>
  );
}
