import carpetFrag from '@/shaders/carpet.frag.glsl?raw';
import defaultVert from '@/shaders/default.vert.glsl?raw';
import noise from '@/shaders/noise.glsl?raw';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import type { ShaderMaterial } from 'three';

// Carpet material uniforms interface
export interface CarpetMaterialUniforms {
  uWear: number;
  uColor: [number, number, number];
  uLoopScale: number;
  uTrackStrength: number;
}

const carpetShader = `${noise}\n${carpetFrag}`;

// Create shader material
const CarpetMaterialImpl = shaderMaterial(
  {
    uWear: 0.3,
    uColor: [0.42, 0.36, 0.31], // #6B5B4F
    uLoopScale: 65,
    uTrackStrength: 0.55,
  },
  defaultVert,
  carpetShader
);

extend({ CarpetMaterial: CarpetMaterialImpl });

// Type augmentation for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      carpetMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<ShaderMaterial>,
        ShaderMaterial
      > &
        CarpetMaterialUniforms;
    }
  }
}

export { CarpetMaterialImpl as CarpetMaterial };
