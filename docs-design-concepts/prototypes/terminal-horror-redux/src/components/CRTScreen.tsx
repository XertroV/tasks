import { useRef, useMemo, useLayoutEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CRTScreenProps {
  position: [number, number, number];
  crtControls?: {
    barrelDistortion: number;
    vignette: number;
    noiseIntensity: number;
    chromaticAberration: number;
    scanlines: boolean;
    paused: boolean;
  };
}

const CRT_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CRT_FRAGMENT_SHADER = `
uniform sampler2D uTexture;
uniform float uTime;
uniform float uBarrelDistortion;
uniform float uVignetteIntensity;
uniform float uFlicker;
uniform float uNoiseIntensity;
uniform float uChromaticAberration;
uniform bool uPaused;
uniform vec2 uResolution;

varying vec2 vUv;

// Simplex noise
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
  vec3 x = 2.0 * fract(p * 0.0243902439) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec2 barrelDistort(vec2 uv, float strength) {
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  float distortion = 1.0 + strength * dist * dist;
  return centered * distortion + 0.5;
}

void main() {
  vec2 uv = vUv;
  
  // Barrel distortion (CRT bulge)
  vec2 distortedUv = barrelDistort(uv, uBarrelDistortion);
  
  // Out of bounds check
  if (distortedUv.x < 0.0 || distortedUv.x > 1.0 || distortedUv.y < 0.0 || distortedUv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  
  // Chromatic aberration
  vec2 dir = normalize(distortedUv - 0.5);
  float ca = uChromaticAberration * 0.003;
  float r = texture2D(uTexture, distortedUv + dir * ca).r;
  float g = texture2D(uTexture, distortedUv).g;
  float b = texture2D(uTexture, distortedUv - dir * ca).b;
  vec3 color = vec3(r, g, b);
  
  // Scanlines
  float scanline = sin(distortedUv.y * 480.0) * 0.5 + 0.5;
  scanline = pow(scanline, 1.5);
  color *= 1.0 - scanline * 0.08;
  
  // RGB phosphor pattern (subtle)
  float phosphor = sin(distortedUv.x * 640.0 * 3.14159) * 0.5 + 0.5;
  color *= 0.95 + phosphor * 0.05;
  
  // Green phosphor tint
  color.g *= 1.15;
  color.b *= 0.9;
  
  // Vignette
  float vignette = 1.0 - length((uv - 0.5) * 1.6);
  vignette = clamp(vignette, 0.0, 1.0);
  vignette = pow(vignette, 1.2);
  color *= vignette;
  
  // Flicker
  float flicker = 1.0 - uFlicker * 0.08 * sin(uTime * 60.0);
  color *= flicker;
  
  // Static noise
  float noise = snoise(uv * 150.0 + uTime * 8.0) * uNoiseIntensity;
  color += noise * 0.08;
  
  // Head switching noise (bottom band)
  float headZone = smoothstep(0.0, 0.1, uv.y);
  float headNoise = snoise(vec2(uv.x * 80.0, uTime * 6.0)) * (1.0 - headZone);
  color += headNoise * 0.12;
  
  // Pause jitter
  if (uPaused) {
    float field = mod(floor(uTime * 30.0), 2.0);
    float jitter = sin(uTime * 30.0) * 0.003 * step(0.5, fract(uv.y * 2.0));
    color.r += jitter;
    color.b -= jitter;
  }
  
  // Edge darkening from curved glass
  float edgeDark = 1.0 - pow(length(uv - 0.5) * 1.1, 4.0) * 0.4;
  color *= edgeDark;
  
  // Slight bloom/glow
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color += color * luminance * 0.1;
  
  gl_FragColor = vec4(color, 1.0);
}
`;

export default function CRTScreen({ position, crtControls }: CRTScreenProps) {
  const screenRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  
  const [flicker, setFlicker] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  
  // Render target for screen content
  const renderTarget = useMemo(() => new THREE.WebGLRenderTarget(512, 384), []);
  
  // Content scene and camera
  const contentScene = useMemo(() => new THREE.Scene(), []);
  const contentCamera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(-2, 2, 1.5, -1.5, 0.1, 10);
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    return cam;
  }, []);
  
  // Build content scene
  useLayoutEffect(() => {
    while (contentScene.children.length > 0) {
      contentScene.remove(contentScene.children[0]);
    }
    
    // Background
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 3),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    bg.position.z = -0.1;
    contentScene.add(bg);
    
    // Title
    const title = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x33FF33, transparent: true, opacity: 0.95 })
    );
    title.position.set(0, 0.75, 0);
    contentScene.add(title);
    
    // Subtitle
    const sub = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x33FF33, transparent: true, opacity: 0.7 })
    );
    sub.position.set(0, 0.25, 0);
    contentScene.add(sub);
    
    // Menu items
    const menuY = [-0.15, -0.4, -0.65];
    menuY.forEach((y, i) => {
      const item = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 0.15),
        new THREE.MeshBasicMaterial({ 
          color: 0x33FF33, 
          transparent: true, 
          opacity: 0.4 + (i === 0 ? 0.3 : 0)
        })
      );
      item.position.set(0, y, 0);
      contentScene.add(item);
    });
    
    // Timecode
    const tc = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x33FF33, transparent: true, opacity: 0.5 })
    );
    tc.position.set(1.3, -1.2, 0);
    contentScene.add(tc);
    
  }, [contentScene]);
  
  // Update uniforms when controls change
  useLayoutEffect(() => {
    if (materialRef.current && crtControls) {
      materialRef.current.uniforms.uBarrelDistortion.value = crtControls.barrelDistortion;
      materialRef.current.uniforms.uVignetteIntensity.value = crtControls.vignette;
      materialRef.current.uniforms.uNoiseIntensity.value = crtControls.noiseIntensity;
      materialRef.current.uniforms.uChromaticAberration.value = crtControls.chromaticAberration;
      materialRef.current.uniforms.uPaused.value = crtControls.paused;
    }
  }, [crtControls]);
  
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    
    // Render content to texture
    gl.setRenderTarget(renderTarget);
    gl.clear();
    
    // Add glitch effect
    if (glitchActive) {
      const glitchPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0.4 })
      );
      glitchPlane.position.set(0, (Math.random() - 0.5) * 2, 0.1);
      contentScene.add(glitchPlane);
      gl.render(contentScene, contentCamera);
      contentScene.remove(glitchPlane);
    } else {
      gl.render(contentScene, contentCamera);
    }
    
    gl.setRenderTarget(null);
    
    // Update shader uniforms
    if (materialRef.current) {
      materialRef.current.uniforms.uTexture.value = renderTarget.texture;
      materialRef.current.uniforms.uTime.value = time;
      
      // Random flicker
      if (Math.random() > 0.997) {
        setFlicker(Math.random() * 2);
      } else {
        setFlicker(flicker * 0.92);
      }
      materialRef.current.uniforms.uFlicker.value = flicker;
    }
    
    // Random glitch
    if (Math.random() > 0.995) {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 80);
    }
  });
  
  const uniforms = useMemo(() => ({
    uTexture: { value: null },
    uTime: { value: 0 },
    uBarrelDistortion: { value: crtControls?.barrelDistortion ?? 0.12 },
    uVignetteIntensity: { value: crtControls?.vignette ?? 0.9 },
    uFlicker: { value: 0 },
    uNoiseIntensity: { value: crtControls?.noiseIntensity ?? 0.25 },
    uChromaticAberration: { value: crtControls?.chromaticAberration ?? 2.0 },
    uPaused: { value: crtControls?.paused ?? true },
    uResolution: { value: new THREE.Vector2(512, 384) },
  }), [crtControls]);
  
  return (
    <group position={position}>
      {/* TV Cabinet - wood grain */}
      <mesh castShadow>
        <boxGeometry args={[0.85, 0.75, 0.6]} />
        <meshStandardMaterial color="#3D2817" roughness={0.85} />
      </mesh>
      
      {/* Inner bezel */}
      <mesh position={[0, 0, 0.3]}>
        <boxGeometry args={[0.65, 0.55, 0.04]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
      </mesh>
      
      {/* Outer bezel frame */}
      <mesh position={[0, 0, 0.28]}>
        <boxGeometry args={[0.7, 0.6, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      
      {/* CRT Screen - curved glass */}
      <mesh ref={screenRef} position={[0, 0, 0.31]}>
        <sphereGeometry args={[1.2, 48, 36, Math.PI * 0.35, Math.PI * 0.3, Math.PI * 0.4, Math.PI * 0.25]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={CRT_VERTEX_SHADER}
          fragmentShader={CRT_FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent={false}
        />
      </mesh>
      
      {/* Screen glow */}
      <pointLight
        position={[0, 0, 0.6]}
        intensity={0.25}
        color="#33FF33"
        distance={1.5}
        decay={2}
      />
      
      {/* Control panel */}
      <mesh position={[0, -0.32, 0.3]}>
        <boxGeometry args={[0.65, 0.08, 0.02]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.8} />
      </mesh>
      
      {/* Control knobs */}
      {[-0.22, -0.08, 0.08, 0.22].map((x, i) => (
        <mesh key={i} position={[x, -0.32, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.014, 0.015, 12]} />
          <meshStandardMaterial color={i < 2 ? "#1a1a1a" : "#333333"} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      
      {/* Speaker grille */}
      <mesh position={[0.28, 0, 0.31]}>
        <boxGeometry args={[0.08, 0.4, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}
