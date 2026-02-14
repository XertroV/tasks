import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { ShaderMaterial } from 'three';

const SCANLINE_VERT = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SCANLINE_FRAG = `
precision highp float;

uniform float uIntensity;
uniform float uLineCount;
uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

void main() {
  if (uIntensity <= 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }

  float linePos = vUv.y * uLineCount;
  float scanline = sin(linePos * 3.14159) * 0.5 + 0.5;
  
  float noise = fract(sin(vUv.y * 1000.0 + uTime * 0.1) * 43758.5453);
  scanline = mix(scanline, scanline * (0.9 + noise * 0.1), 0.3);
  
  float mask = 1.0 - (1.0 - scanline) * uIntensity;
  
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - mask);
}
`;

export interface ScanlineOverlayProps {
  intensity?: number;
  lineCount?: number;
}

export function ScanlineOverlay({ intensity = 0.07, lineCount = 480 }: ScanlineOverlayProps) {
  const materialRef = useRef<ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      uIntensity: { value: intensity },
      uLineCount: { value: lineCount },
      uTime: { value: 0 },
      uResolution: { value: [1024, 768] },
    }),
    [intensity, lineCount]
  );

  useFrame(({ clock, size }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uResolution.value = [size.width, size.height];
    }
  });

  return (
    <mesh position={[0, 0, 0.5]} renderOrder={100}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={SCANLINE_VERT}
        fragmentShader={SCANLINE_FRAG}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
