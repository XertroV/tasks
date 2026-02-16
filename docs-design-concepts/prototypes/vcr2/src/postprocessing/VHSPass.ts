import noise from '@/shaders/noise.glsl?raw';
import vhsFrag from '@/shaders/vhs-pass.frag.glsl?raw';
import vhsVert from '@/shaders/vhs-pass.vert.glsl?raw';

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

export const VHS_DEFAULTS_RATIONALE = {
  uTrackingError:
    'Set to 0 at baseline; increased dynamically during FF/REW transitions and horror phases. Non-zero baseline causes constant wavy distortion.',
  uHeadSwitchHeight:
    '0.1 represents the visible head switch line position (10% from top). Standard VHS head switch occurs near the bottom of the visible frame.',
  uHeadSwitchNoise:
    '0 at baseline; increased during FF/REW to simulate tracking instability during fast tape motion.',
  uChromaBleed:
    '0 at baseline for clean image; PostProcessingPipeline adds 0.3 base + dynamic modulation for authentic VHS color bleeding.',
  uDropoutRate:
    '0 at baseline; increased during FF/REW transitions and horror phases. Real VHS dropouts are brief white/black horizontal streaks.',
  uStaticNoise:
    '0 at baseline; PostProcessingPipeline applies 0.05 base static + dynamic increases for authentic tape noise.',
  uPauseJitter:
    'Only applied when VCR mode is PAUSED (value 0.3). Simulates the characteristic jitter of paused VHS frames.',
  uFFSpeed:
    '0 when not fast-forwarding; set to 1.0 during FF mode or FF navigation transitions for speed lines effect.',
  uREWSpeed:
    '0 when not rewinding; set to 1.0 during REW mode or REW navigation transitions for speed lines effect.',
  uHorrorIntensity:
    '0 at baseline; scaled 0-1 based on horror phase to progressively corrupt the image during horror events.',
  uGlitchSeed:
    'Randomized during non-DORMANT horror phases to create occasional intense glitch frames.',
};

export const VHS_VERTEX_SHADER = vhsVert;

export function getVHSFragmentShader(): string {
  return `${noise}\n${vhsFrag.replace('#include noise.glsl', '')}`;
}
