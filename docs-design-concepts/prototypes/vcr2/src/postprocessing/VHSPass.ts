import noise from '@/shaders/noise.glsl?raw';
import vhsFrag from '@/shaders/vhs-pass.frag.glsl?raw';

export interface VHSPassUniforms {
  uTime: number;
  uTrackingError: number;
  uHeadSwitchHeight: number;
  uHeadSwitchNoise: number;
  uChromaBleed: number;
  uDropoutRate: number;
  uStaticNoise: number;
  uPauseJitter: number;
  uFFSpeed: number;
  uREWSpeed: number;
  uHorrorIntensity: number;
  uGlitchSeed: number;
}

export const VHS_DEFAULT_UNIFORMS: VHSPassUniforms = {
  uTime: 0,
  uTrackingError: 0,
  uHeadSwitchHeight: 0.1,
  uHeadSwitchNoise: 0,
  uChromaBleed: 0,
  uDropoutRate: 0,
  uStaticNoise: 0,
  uPauseJitter: 0,
  uFFSpeed: 0,
  uREWSpeed: 0,
  uHorrorIntensity: 0,
  uGlitchSeed: 0,
};

export const VHS_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function getVHSFragmentShader(): string {
  return `${noise}\n${vhsFrag.replace('#include noise.glsl', '')}`;
}
