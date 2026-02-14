import type { Uniform } from 'three';
import { ShaderMaterial } from 'three';
import fragmentShader from '@/shaders/crt-pass.frag.glsl?raw';
import vertexShader from '@/shaders/crt-pass.vert.glsl?raw';

export interface CRTUniforms {
  uCurvature: number;
  uScanlineIntensity: number;
  uScanlineCount: number;
  uPhosphorIntensity: number;
  uVignetteStrength: number;
  uFlicker: number;
  uBrightness: number;
}

export const defaultCRTUniforms: CRTUniforms = {
  uCurvature: 0.15,
  uScanlineIntensity: 0.3,
  uScanlineCount: 480,
  uPhosphorIntensity: 0.2,
  uVignetteStrength: 0.4,
  uFlicker: 0.08,
  uBrightness: 1.0,
};

export function createCRTMaterial(uniforms: Partial<CRTUniforms> = {}) {
  const merged = { ...defaultCRTUniforms, ...uniforms };

  return new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null } as Uniform,
      uCurvature: { value: merged.uCurvature },
      uScanlineIntensity: { value: merged.uScanlineIntensity },
      uScanlineCount: { value: merged.uScanlineCount },
      uPhosphorIntensity: { value: merged.uPhosphorIntensity },
      uVignetteStrength: { value: merged.uVignetteStrength },
      uFlicker: { value: merged.uFlicker },
      uBrightness: { value: merged.uBrightness },
      uResolution: { value: [1024, 768] },
      uTime: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  });
}
