import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

export const CRTShaderMaterial = shaderMaterial(
    {
        uTime: 0,
        uColor: new THREE.Color(0.2, 1.0, 0.2),
        uResolution: new THREE.Vector2(0, 0),
        uCurvature: 3.0, // Curvature intensity
        uScanlineIntensity: 0.25,
        uVignette: 1.2,
        uNoise: 0.15,
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    // Fragment Shader
    `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec2 uResolution;
    uniform float uCurvature;
    uniform float uScanlineIntensity;
    uniform float uVignette;
    uniform float uNoise;

    varying vec2 vUv;

    // Distortion function for CRT curvature
    vec2 curve(vec2 uv) {
      uv = (uv - 0.5) * 2.0;
      uv *= 1.1; 
      uv.x *= 1.0 + pow((abs(uv.y) / 5.0), 2.0);
      uv.y *= 1.0 + pow((abs(uv.x) / 4.0), 2.0);
      uv = (uv / 2.0) + 0.5;
      uv = uv * 0.92 + 0.04;
      return uv;
    }

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
        vec2 uv = curve(vUv);
        
        // Discard pixels outside curb
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            discard;
        }

        // Base color (placeholder for texture)
        vec3 color = uColor;

        // Scanlines
        // Create a sine wave pattern based on screen coordinates
        float scanline = sin(uv.y * uResolution.y * 3.14159 * 2.0); 
        // Scale it to be 0..1 range with intensity
        scanline = 0.5 + 0.5 * scanline;
        // Apply intensity
        color *= 1.0 - (uScanlineIntensity * (1.0 - scanline));

        // Noise
        float noiseVal = random(uv * uTime);
        color += noiseVal * uNoise;

        // Vignette
        float vig = (0.0 + 1.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y));
        vig = pow(vig, 0.3); // Curve the falloff
        color *= vig * uVignette;

        // Flicker
        color *= 1.0 - 0.05 * sin(uTime * 50.0);

        gl_FragColor = vec4(color, 1.0);
    }
  `
)

extend({ CRTShaderMaterial })

// Add type definition for JSX
declare global {
    namespace JSX {
        interface IntrinsicElements {
            cRTShaderMaterial: any
        }
    }
}
