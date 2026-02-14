import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

const WallpaperMaterial = shaderMaterial(
  {
    uTime: 0,
    uDecay: 0.3,
    uFlicker: 0,
    uBaseColor: new THREE.Color('#C4B998'),
    uLightColor: new THREE.Color('#D4C9A8'),
    uShadowColor: new THREE.Color('#8A7D5C'),
    uStainColor: new THREE.Color('#6A5D3C'),
  },
  `varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  `uniform float uTime;
    uniform vec3 uBaseColor;
    uniform vec3 uLightColor;
    uniform vec3 uShadowColor;
    uniform vec3 uStainColor;
    uniform float uDecay;
    uniform float uFlicker;

    varying vec2 vUv;
    varying vec3 vNormal;
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
      vec2 tileUv = fract(vUv * 4.0);
      
      float pattern = smoothstep(0.46, 0.50, abs(tileUv.x - 0.5)) * 
                      smoothstep(0.46, 0.50, abs(tileUv.y - 0.5));
      
      float noise = snoise(vUv * 20.0 + uTime * 0.05) * 0.06;
      
      float stainNoise = snoise(vUv * 3.0 + vec2(0.0, uTime * 0.01));
      float stain = smoothstep(0.3 - uDecay * 0.4, 0.8, stainNoise) * uDecay * 0.5;
      
      float moisture = snoise(vUv * 50.0 + uTime * 0.1) * 0.5 + 0.5;
      moisture = pow(moisture, 3.0) * uDecay * 0.3;
      
      float floorDamp = smoothstep(0.0, 0.2, vUv.y) * 0.08;
      
      vec3 baseMix = mix(uBaseColor, uLightColor, pattern * 0.3);
      vec3 color = mix(baseMix, uShadowColor, pattern * 0.15);
      
      color = mix(color, uStainColor, stain);
      color += noise;
      color -= floorDamp * (1.0 - uDecay * 0.5);
      
      float light = dot(vNormal, normalize(vec3(0.5, 1.0, 0.5))) * 0.25 + 0.75;
      
      float flickerEffect = 1.0 - uFlicker * 0.25 * sin(uTime * 50.0);
      light *= flickerEffect;
      
      color += moisture * 0.12;

      gl_FragColor = vec4(color * light, 1.0);
    }`
);

extend({ WallpaperMaterial });

export { WallpaperMaterial };
