import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

const BreathingWallMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#C4B998'),
    uPulseColor: new THREE.Color('#6A5D3C'),
    uDecay: 0,
  },
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uDecay;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      float breath = sin(uTime * 1.5 + position.y * 2.0 + position.x * 2.0) * 0.05 * uDecay;
      vec3 newPosition = position + normal * breath;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uPulseColor;
    uniform float uDecay;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      float pulse = sin(uTime * 2.0 + vPosition.x * 3.0 + vPosition.y * 3.0) * 0.5 + 0.5;
      vec3 color = mix(uColor, uPulseColor, pulse * uDecay * 0.3);
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ BreathingWallMaterial });

export { BreathingWallMaterial };
