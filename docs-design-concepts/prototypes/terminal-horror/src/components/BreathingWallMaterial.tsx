import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

const BreathingWallMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(0.2, 0.05, 0.05), // Dark blood red
    uPulseColor: new THREE.Color(0.5, 0.1, 0.1), // Lighter blood red
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform float uTime;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Calculate breathing effect based on time and position
      float breath = sin(uTime * 1.5 + position.y * 2.0 + position.x * 2.0) * 0.05;
      
      // Perturb the vertex position along the normal
      vec3 newPosition = position + normal * breath;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uPulseColor;
    varying vec2 vUv;
    varying vec3 vNormal;

    // Simplex noise function (simplified for brevity)
    // Based on Ashima Arts webgl-noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      // Create organic, fleshy texture using noise
      float noiseVal = snoise(vUv * 10.0 + uTime * 0.2);
      
      // Add a subtle vein-like structure
      float vein = smoothstep(0.4, 0.6, abs(noiseVal));
      
      // Mix base color and pulse color based on time and noise
      float pulse = (sin(uTime * 2.0) + 1.0) * 0.5;
      vec3 finalColor = mix(uColor, uPulseColor, pulse * 0.5 + noiseVal * 0.3);
      
      // Add veins
      finalColor = mix(finalColor, vec3(0.1, 0.0, 0.0), vein * 0.3);
      
      // Add subtle lighting based on normal
      float light = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
      finalColor *= light;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ BreathingWallMaterial });

export { BreathingWallMaterial };
