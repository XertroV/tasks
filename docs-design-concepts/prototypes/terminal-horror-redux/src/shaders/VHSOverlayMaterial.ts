import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

const VHSOverlayMaterial = shaderMaterial(
  {
    uTime: 0,
    uPaused: 0,
    uFastForward: 0,
    uRewind: 0,
    uTrackingIntensity: 0.3,
    uNoiseIntensity: 0.15,
    uResolution: new THREE.Vector2(1920, 1080),
    tDiffuse: null,
  },
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform float uTime;
    uniform float uPaused;
    uniform float uFastForward;
    uniform float uRewind;
    uniform float uTrackingIntensity;
    uniform float uNoiseIntensity;
    uniform vec2 uResolution;
    uniform sampler2D tDiffuse;
    
    varying vec2 vUv;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }
    
    float headSwitching(vec2 uv, float time) {
      float zone = step(0.88, uv.y);
      float n = noise(vec2(uv.x * 100.0, time * 200.0 + uv.y * 50.0));
      return zone * n * 0.8;
    }
    
    vec2 trackingDistort(vec2 uv, float time, float intensity) {
      float roll = sin(time * 15.0) * intensity * 0.015;
      uv.y += roll;
      
      float skew = sin(uv.y * 40.0 + time * 8.0) * intensity * 0.008;
      uv.x += skew;
      
      float jitter = noise(vec2(uv.y * 300.0, time * 80.0)) * intensity * 0.003;
      uv.x += jitter - 0.0015;
      
      return uv;
    }
    
    float dropout(vec2 uv, float time) {
      float lineY = fract(sin(floor(time * 8.0) * 127.1) * 43758.5453);
      float onLine = 1.0 - smoothstep(0.0, 0.004, abs(uv.y - lineY));
      float active = step(0.85, hash(vec2(floor(time * 15.0), 0.0)));
      return onLine * active;
    }
    
    void main() {
      vec2 uv = vUv;
      
      uv = trackingDistort(uv, uTime, uTrackingIntensity);
      
      if (uPaused > 0.5) {
        float field = step(0.5, fract(uTime * 30.0));
        float jitter = field * 0.002;
        jitter += (hash(vec2(floor(uTime * 60.0), 0.0)) - 0.5) * 0.001;
        uv.y = mod(uv.y + jitter, 1.0);
      }
      
      float speed = uFastForward - uRewind;
      if (abs(speed) > 0.01) {
        uv.y = mod(uv.y - uTime * speed * 0.5, 1.0);
        float tear = step(0.95, hash(vec2(floor(uv.y * 30.0), floor(uTime * 50.0))));
        uv.x += tear * (hash(vec2(uTime, uv.y)) - 0.5) * 0.08;
      }
      
      vec3 color = texture2D(tDiffuse, uv).rgb;
      
      float hs = headSwitching(vUv, uTime);
      color = mix(color, vec3(hash(vUv * 100.0 + uTime)), hs * 0.7);
      
      color = mix(color, vec3(1.0), dropout(vUv, uTime));
      
      float n = noise(vUv * 300.0 + uTime * 100.0);
      color += (n - 0.5) * uNoiseIntensity * 0.15;
      
      float scanline = sin(vUv.y * uResolution.y * 3.14159) * 0.04;
      color -= scanline;
      
      float vignette = 1.0 - length(vUv - 0.5) * 0.5;
      color *= vignette;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ VHSOverlayMaterial });

export { VHSOverlayMaterial };
