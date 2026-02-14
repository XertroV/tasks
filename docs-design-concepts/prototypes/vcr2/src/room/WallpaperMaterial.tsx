import noise from '@/shaders/noise.glsl?raw';
import wallpaperFrag from '@/shaders/wallpaper.frag.glsl?raw';
import wallpaperVert from '@/shaders/wallpaper.vert.glsl?raw';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import type { ShaderMaterial } from 'three';

// Wallpaper material uniforms interface
export interface WallpaperMaterialUniforms {
  uTime: number;
  uDecay: number;
  uBaseColor: [number, number, number];
  uStripScale: number;
  uSeamWidth: number;
  uStainStrength: number;
  uFlicker: number;
  uBreathIntensity: number;
}

const wallpaperShader = `${noise}\n${wallpaperFrag}`;

// Create shader material using drei's shaderMaterial
const WallpaperMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uDecay: 0.5,
    uBaseColor: [0.77, 0.69, 0.55], // #C4B18C
    uStripScale: 8,
    uSeamWidth: 0.075,
    uStainStrength: 0.45,
    uFlicker: 0.25,
    uBreathIntensity: 0.4,
  },
  wallpaperVert,
  // Fragment shader
  wallpaperShader
);

extend({ WallpaperMaterial: WallpaperMaterialImpl });

// Type augmentation for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      wallpaperMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<ShaderMaterial>,
        ShaderMaterial
      > &
        WallpaperMaterialUniforms;
    }
  }
}

export { WallpaperMaterialImpl as WallpaperMaterial };
