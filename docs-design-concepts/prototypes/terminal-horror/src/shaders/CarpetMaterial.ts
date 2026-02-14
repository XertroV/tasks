import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

const CarpetMaterial = shaderMaterial(
  {
    uTime: 0,
    uWear: 0.3,
    uBaseColor: new THREE.Color('#8B7355'),
    uHighlightColor: new THREE.Color('#9B8365'),
    uDarkColor: new THREE.Color('#5B4335'),
    uStainColor: new THREE.Color('#4B3325'),
  },
  `varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  `uniform float uTime;
    uniform float uWear;
    uniform vec3 uBaseColor;
    uniform vec3 uHighlightColor;
    uniform vec3 uDarkColor;
    uniform vec3 uStainColor;

    varying vec2 vUv;
    varying vec3 vPosition;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 tileUv = fract(vUv * 80.0);
      float loop = 1.0 - smoothstep(0.35, 0.5, length(tileUv - 0.5));
      
      float distFromCenter = length(vUv - 0.5);
      float wear = smoothstep(0.2, 0.6, distFromCenter) * uWear * 0.25;
      
      float matting = snoise(vUv * 8.0 + uTime * 0.02) * 0.12;
      matting += snoise(vUv * 3.0) * 0.08;
      
      float stainNoise = snoise(vUv * 2.0 + vec2(1.5, 0.5));
      float stain = smoothstep(0.3, 0.7, stainNoise) * uWear * 0.2;
      
      vec3 color = mix(uBaseColor, uHighlightColor, loop * 0.35);
      color = mix(color, uDarkColor, (1.0 - loop) * 0.25 + matting + wear);
      color = mix(color, uStainColor, stain);
      
      color += snoise(vUv * 40.0) * 0.025;
      color += snoise(vUv * 100.0) * 0.015;
      
      float light = 0.85 + snoise(vUv * 15.0) * 0.1;

      gl_FragColor = vec4(color * light, 1.0);
    }`
);

extend({ CarpetMaterial });

export { CarpetMaterial };
