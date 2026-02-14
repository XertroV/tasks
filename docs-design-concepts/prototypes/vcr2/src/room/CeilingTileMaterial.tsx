import ceilingTileFrag from '@/shaders/ceiling-tile.frag.glsl?raw';
import defaultVert from '@/shaders/default.vert.glsl?raw';
import noise from '@/shaders/noise.glsl?raw';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import type { ShaderMaterial } from 'three';

// Ceiling tile material uniforms interface
export interface CeilingTileMaterialUniforms {
  uTileColor: [number, number, number];
  uGridColor: [number, number, number];
  uTileScale: number;
  uGridWidth: number;
  uTileAging: number;
}

const ceilingTileShader = `${noise}\n${ceilingTileFrag}`;

// Create shader material
const CeilingTileMaterialImpl = shaderMaterial(
  {
    uTileColor: [0.91, 0.91, 0.91], // #E8E8E8
    uGridColor: [0.3, 0.3, 0.3], // Dark gray
    uTileScale: 7,
    uGridWidth: 0.06,
    uTileAging: 0.25,
  },
  defaultVert,
  ceilingTileShader
);

extend({ CeilingTileMaterial: CeilingTileMaterialImpl });

// Type augmentation for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ceilingTileMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<ShaderMaterial>,
        ShaderMaterial
      > &
        CeilingTileMaterialUniforms;
    }
  }
}

export { CeilingTileMaterialImpl as CeilingTileMaterial };
