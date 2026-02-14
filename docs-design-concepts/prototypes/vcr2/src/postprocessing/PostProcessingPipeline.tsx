import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, EffectComposerContext } from '@react-three/postprocessing';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { ShaderMaterial } from 'three';
import { ShaderPass } from 'postprocessing';
import { getVHSFragmentShader, VHS_DEFAULT_UNIFORMS, VHS_VERTEX_SHADER } from './VHSPass';
import { useVCRStore } from '@/vcr';
import crtFrag from '@/shaders/crt-pass.frag.glsl?raw';
import crtVert from '@/shaders/crt-pass.vert.glsl?raw';

function CustomShaderPass({
  uniforms,
  vertexShader,
  fragmentShader,
  insertIndex = 0,
}: {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
  insertIndex?: number;
}) {
  const { composer } = useContext(EffectComposerContext);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const passRef = useRef<ShaderPass | null>(null);

  useEffect(() => {
    if (!composer) return;

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });
    materialRef.current = material;

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
      if (materialRef.current) {
        materialRef.current.dispose();
      }
    };
  }, [composer, insertIndex, uniforms, vertexShader, fragmentShader]);

  return null;
}

function VHSPassEffect() {
  const { size } = useThree();
  const vhsMode = useVCRStore((state) => state.mode);

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

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <CustomShaderPass
      uniforms={uniforms}
      vertexShader={VHS_VERTEX_SHADER}
      fragmentShader={getVHSFragmentShader()}
      insertIndex={0}
    />
  );
}

function CRTPassEffect() {
  const { size } = useThree();

  const uniforms = useMemo(
    () => ({
      tDiffuse: { value: null },
      uCurvature: { value: 0.15 },
      uScanlineIntensity: { value: 0.3 },
      uScanlineCount: { value: 480 },
      uPhosphorIntensity: { value: 0.2 },
      uVignetteStrength: { value: 0.4 },
      uFlicker: { value: 0.08 },
      uBrightness: { value: 1.0 },
      uResolution: { value: [size.width, size.height] },
      uTime: { value: 0 },
    }),
    [size.width, size.height]
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <CustomShaderPass
      uniforms={uniforms}
      vertexShader={crtVert}
      fragmentShader={crtFrag}
      insertIndex={1}
    />
  );
}

export function PostProcessingPipeline() {
  return (
    <EffectComposer>
      <VHSPassEffect />
      <CRTPassEffect />
      <Bloom intensity={0.2} luminanceThreshold={0.8} luminanceSmoothing={0.5} radius={0.5} />
    </EffectComposer>
  );
}
