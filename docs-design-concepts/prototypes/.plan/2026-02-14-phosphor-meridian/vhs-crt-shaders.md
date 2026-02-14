# VHS & CRT Shader Specification

> Part of [VCR2 Architecture Plan](./index.md)

## Overview

VCR2 uses a **single unified GLSL post-processing pipeline** for all screen effects. There are no CSS-based visual effects (learning from terminal-horror-redux's mistake of three competing VHS systems).

The pipeline processes the entire rendered frame:

```
Scene Render → VHS Pass → CRT Pass → Bloom Pass → Output
```

The horror system modulates VHS Pass uniforms to increase visual corruption as horror intensity rises.

---

## Pipeline Architecture

### EffectComposer Setup

```typescript
// EffectPipeline.tsx — conceptual structure
<EffectComposer>
  <VHSPass
    trackingError={vcrStore.trackingError}
    isPaused={vcrStore.state === 'PAUSED'}
    isFF={vcrStore.state === 'FF'}
    isREW={vcrStore.state === 'REW'}
    horrorIntensity={horrorStore.intensity}
    time={clock.elapsedTime}
  />
  <CRTPass
    curvature={0.15}
    scanlineIntensity={0.3}
    vignetteStrength={0.4}
  />
  <Bloom
    intensity={0.3}
    luminanceThreshold={0.8}
    luminanceSmoothing={0.1}
  />
</EffectComposer>
```

Note: We may need to implement VHSPass and CRTPass as custom `@react-three/postprocessing` Effect subclasses or as raw ShaderPass instances depending on compatibility. The key requirement is that they share a single render pipeline and don't create additional render targets unnecessarily.

---

## Pass 1: VHS Effect

### Purpose
Simulates the analog degradation of VHS tape playback: tracking errors, head switching noise, chroma bleed, dropouts, static, and mode-specific artifacts (pause jitter, FF/REW tearing).

### Uniforms

| Uniform | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| `uTime` | float | 0-∞ | clock | Elapsed time for animation |
| `uTrackingError` | float | 0-1 | 0.0 | Tracking misalignment severity |
| `uHeadSwitchHeight` | float | 0-0.2 | 0.12 | Height of head switching band (from bottom) |
| `uHeadSwitchNoise` | float | 0-1 | 0.3 | Head switching noise intensity |
| `uChromaBleed` | float | 0-1 | 0.15 | Color channel horizontal offset |
| `uDropoutRate` | float | 0-1 | 0.02 | Probability of dropout lines per frame |
| `uStaticNoise` | float | 0-1 | 0.05 | Background noise intensity |
| `uPauseJitter` | float | 0-1 | 0.0 | Vertical jitter (active when paused) |
| `uFFSpeed` | float | 0-1 | 0.0 | Fast-forward effect intensity |
| `uREWSpeed` | float | 0-1 | 0.0 | Rewind effect intensity |
| `uHorrorIntensity` | float | 0-1 | 0.0 | Horror corruption multiplier |
| `uGlitchSeed` | float | 0-1 | random | Per-frame random seed for glitch events |

### Fragment Shader Specification

```glsl
// vhs-effect.frag.glsl — Full specification

uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uTrackingError;
uniform float uHeadSwitchHeight;
uniform float uHeadSwitchNoise;
uniform float uChromaBleed;
uniform float uDropoutRate;
uniform float uStaticNoise;
uniform float uPauseJitter;
uniform float uFFSpeed;
uniform float uREWSpeed;
uniform float uHorrorIntensity;
uniform float uGlitchSeed;
uniform vec2 uResolution;

varying vec2 vUv;

// ----- Shared Noise (import from noise.glsl) -----
// Use the shared simplex noise implementation.
// See src/room/shaders/noise.glsl

// ----- Hash function for pseudo-random -----
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// ----- Effect 1: Tracking Distortion -----
// Simulates vertical tracking misalignment.
// The entire image shifts horizontally with a wave pattern.
// Severity controlled by uTrackingError.
vec2 trackingDistort(vec2 uv) {
    float wave = sin(uv.y * 20.0 + uTime * 3.0) * 0.5 + 0.5;
    float jitter = hash(floor(uv.y * 50.0 + uTime * 10.0)) * 2.0 - 1.0;
    float offset = (wave * 0.6 + jitter * 0.4) * uTrackingError * 0.02;
    return vec2(uv.x + offset, uv.y);
}

// ----- Effect 2: Head Switching Noise -----
// Bottom ~12% of frame shows noisy band where the VCR head switches.
// This is the most recognizable VHS artifact.
vec3 headSwitching(vec2 uv, vec3 color) {
    float band = smoothstep(1.0 - uHeadSwitchHeight, 1.0 - uHeadSwitchHeight + 0.02, uv.y);
    float noise = hash2(vec2(uv.x * 100.0, uTime * 50.0)) * band;
    float shift = noise * uHeadSwitchNoise * 0.05;
    vec3 shifted = texture2D(tDiffuse, vec2(uv.x + shift, uv.y)).rgb;
    return mix(color, shifted, band * uHeadSwitchNoise);
}

// ----- Effect 3: Chroma Bleed -----
// Horizontal offset between color channels.
// VHS has poor chroma bandwidth — colors bleed rightward.
vec3 chromaBleed(vec2 uv) {
    float offset = uChromaBleed * 0.003;
    float r = texture2D(tDiffuse, vec2(uv.x + offset, uv.y)).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, vec2(uv.x - offset * 0.5, uv.y)).b;
    return vec3(r, g, b);
}

// ----- Effect 4: Dropout Lines -----
// Random horizontal white lines where the tape coating is damaged.
// Appear as bright flashes across part of a scanline.
vec3 dropout(vec2 uv, vec3 color) {
    float lineY = floor(uv.y * uResolution.y);
    float lineHash = hash(lineY + uTime * 100.0 + uGlitchSeed * 1000.0);

    if (lineHash > (1.0 - uDropoutRate)) {
        float startX = hash(lineY * 7.0 + uTime) * 0.5;
        float endX = startX + hash(lineY * 13.0 + uTime) * 0.3 + 0.1;
        if (uv.x > startX && uv.x < endX) {
            return vec3(1.0); // white dropout
        }
    }
    return color;
}

// ----- Effect 5: Static Noise -----
// Background noise present in all VHS playback.
// Always additive (screen-blend) — noise brightens, never darkens.
vec3 staticNoise(vec2 uv, vec3 color) {
    float noise = hash2(uv * uResolution + uTime * 100.0);
    // Screen blend: result = 1 - (1 - base) * (1 - blend)
    // Simplified for small amounts: just add
    return color + vec3(noise * uStaticNoise);
}

// ----- Effect 6: Pause Jitter -----
// When paused, the image jitters vertically — the classic VCR PAUSE look.
// Occasional horizontal offset too.
vec2 pauseJitter(vec2 uv) {
    float vertJitter = (hash(floor(uTime * 30.0)) * 2.0 - 1.0) * uPauseJitter * 0.005;
    float horizJitter = (hash(floor(uTime * 15.0) + 100.0) * 2.0 - 1.0) * uPauseJitter * 0.002;
    return uv + vec2(horizJitter, vertJitter);
}

// ----- Effect 7: FF/REW Artifacts -----
// During fast-forward: vertical scroll with speed lines, horizontal tears.
// During rewind: same but reversed direction.
vec2 ffRewArtifacts(vec2 uv) {
    float speed = max(uFFSpeed, uREWSpeed);
    float direction = uFFSpeed > 0.0 ? 1.0 : -1.0;

    // Vertical scroll
    float scroll = uTime * speed * direction * 2.0;
    uv.y = fract(uv.y + scroll);

    // Horizontal tear lines
    float tearLine = hash(floor(uv.y * 20.0 + uTime * 50.0));
    if (tearLine > 0.9 && speed > 0.3) {
        uv.x += (hash(uv.y + uTime) * 2.0 - 1.0) * speed * 0.1;
    }

    return uv;
}

// ----- Horror Corruption -----
// Applied on top of normal VHS effects. Multiplies their intensity.
// Also adds unique corruption: color inversion bands, RGB channel swaps.
vec3 horrorCorruption(vec2 uv, vec3 color) {
    if (uHorrorIntensity < 0.01) return color;

    // Random inversion bands
    float bandY = sin(uv.y * 10.0 + uTime * 2.0) * 0.5 + 0.5;
    float invertChance = hash(floor(uv.y * 30.0 + uTime * 5.0));
    if (invertChance > (1.0 - uHorrorIntensity * 0.3)) {
        color = vec3(1.0) - color;
    }

    // Red tint creep
    color.r += uHorrorIntensity * 0.1 * sin(uTime * 0.5);

    // Channel swap glitch
    float swapChance = hash(floor(uTime * 10.0) + uGlitchSeed);
    if (swapChance > (1.0 - uHorrorIntensity * 0.2)) {
        color = color.brg; // swap channels
    }

    return color;
}

// ----- Main -----
void main() {
    vec2 uv = vUv;

    // Apply positional effects (modify UV)
    uv = pauseJitter(uv);
    uv = trackingDistort(uv);
    uv = ffRewArtifacts(uv);

    // Sample with chroma bleed
    vec3 color = chromaBleed(uv);

    // Apply per-pixel effects
    color = headSwitching(uv, color);
    color = dropout(uv, color);
    color = staticNoise(uv, color);
    color = horrorCorruption(uv, color);

    gl_FragColor = vec4(color, 1.0);
}
```

### Vertex Shader

```glsl
// vhs-effect.vert.glsl — Standard fullscreen quad
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

---

## Pass 2: CRT Effect

### Purpose
Simulates the physical properties of a CRT display: barrel distortion from curved glass, scanline raster pattern, RGB phosphor subpixels, vignette from electron beam falloff, and screen flicker from refresh rate.

### Uniforms

| Uniform | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| `uTime` | float | 0-∞ | clock | Elapsed time |
| `uCurvature` | float | 0-0.5 | 0.15 | Barrel distortion strength |
| `uScanlineIntensity` | float | 0-1 | 0.3 | Scanline darkness |
| `uScanlineCount` | float | 100-2000 | 900.0 | Number of scanlines |
| `uPhosphorIntensity` | float | 0-1 | 0.2 | RGB subpixel visibility |
| `uVignetteStrength` | float | 0-1 | 0.4 | Edge darkening |
| `uFlicker` | float | 0-0.1 | 0.02 | Brightness oscillation |
| `uBrightness` | float | 0.5-1.5 | 1.0 | Overall brightness |
| `uResolution` | vec2 | - | viewport | Screen resolution |

### Fragment Shader Specification

```glsl
// crt-effect.frag.glsl

uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uCurvature;
uniform float uScanlineIntensity;
uniform float uScanlineCount;
uniform float uPhosphorIntensity;
uniform float uVignetteStrength;
uniform float uFlicker;
uniform float uBrightness;
uniform vec2 uResolution;

varying vec2 vUv;

// ----- Barrel Distortion -----
// Simulates CRT glass curvature. UVs are warped outward from center.
vec2 barrelDistortion(vec2 uv) {
    vec2 centered = uv * 2.0 - 1.0;
    float r2 = dot(centered, centered);
    centered *= 1.0 + uCurvature * r2;
    return centered * 0.5 + 0.5;
}

// ----- Scanlines -----
// Horizontal dark lines from the CRT raster scan.
float scanline(vec2 uv) {
    float line = sin(uv.y * uScanlineCount * 3.14159) * 0.5 + 0.5;
    return 1.0 - (1.0 - line) * uScanlineIntensity;
}

// ----- RGB Phosphor Subpixels -----
// Each CRT pixel is three colored phosphor dots (R, G, B).
// At close range, you can see the individual dots.
vec3 phosphorMask(vec2 uv) {
    vec2 pixel = uv * uResolution;
    int col = int(mod(pixel.x, 3.0));
    vec3 mask = vec3(0.0);
    if (col == 0) mask = vec3(1.0, 0.0, 0.0);
    else if (col == 1) mask = vec3(0.0, 1.0, 0.0);
    else mask = vec3(0.0, 0.0, 1.0);
    return mix(vec3(1.0), mask, uPhosphorIntensity);
}

// ----- Vignette -----
// Edges of CRT are darker due to electron beam angle.
float vignette(vec2 uv) {
    vec2 centered = uv * 2.0 - 1.0;
    float dist = length(centered);
    return 1.0 - smoothstep(0.5, 1.4, dist) * uVignetteStrength;
}

// ----- Flicker -----
// CRT refresh creates subtle brightness oscillation.
float flicker() {
    return 1.0 - uFlicker * sin(uTime * 120.0 * 3.14159) * 0.5;
}

// ----- Main -----
void main() {
    vec2 uv = barrelDistortion(vUv);

    // Discard pixels outside the curved screen area
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec3 color = texture2D(tDiffuse, uv).rgb;

    // Apply CRT effects
    color *= scanline(uv);
    color *= phosphorMask(uv);
    color *= vignette(uv);
    color *= flicker();
    color *= uBrightness;

    gl_FragColor = vec4(color, 1.0);
}
```

---

## CRT Screen Content Rendering

The CRT screen content is rendered to a `WebGLRenderTarget` using an offscreen scene. This offscreen scene contains the documentation text, VCR UI elements (timecode, status), and any horror entity manifestations.

### Offscreen Scene Structure

```
Offscreen Scene (orthographic camera)
├── Background Plane (CRT Black #0A0A0A)
├── Content Area
│   ├── Title Text (phosphor green, larger)
│   ├── Body Text (phosphor green, monospace)
│   └── Link Targets (cyan, shootable)
├── VCR OSD (On-Screen Display)
│   ├── Mode Indicator (PLAY ▶ / PAUSE ⏸ / FF ⏩ / REW ⏪)
│   ├── Timecode (HH:MM:SS:FF)
│   ├── Tracking Indicator (when tracking is bad)
│   └── Channel Label
├── Horror Overlay (conditional)
│   ├── Entity Face (distorted, semi-transparent)
│   ├── Corrupted Text Fragments
│   └── Static Bursts
└── Scanline Mask (subtle, additional to post-process scanlines)
```

### Text Rendering Details

- **Font:** VT323 (Google Fonts), loaded via `@react-three/drei` Text component
- **Character size:** ~0.04 units (tunable via Leva)
- **Line height:** 1.4x character size
- **Max lines visible:** ~20 lines of documentation text
- **Text color:** Phosphor green `#33FF33` with emissive glow
- **Link color:** Cyan `#00FFFF` with stronger emissive
- **Rendering:** MSDF (multi-channel signed distance field) for crisp edges at any resolution

### RenderTarget Configuration

```typescript
const renderTarget = new THREE.WebGLRenderTarget(1024, 768, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter, // Not NearestFilter — we WANT slight blur for CRT feel
    format: THREE.RGBAFormat,
    stencilBuffer: false,
    depthBuffer: false, // 2D content, no depth needed
});
```

---

## Shader Architecture

### Shared GLSL Utilities

All shared GLSL code lives in `src/room/shaders/noise.glsl` and is imported via Vite's `?raw` import:

```typescript
import noiseGlsl from '../room/shaders/noise.glsl?raw';

const fragmentShader = `
${noiseGlsl}

// ... shader-specific code
`;
```

**No more duplicated noise functions.** The `noise.glsl` file contains:
- `snoise(vec2)` — 2D simplex noise
- `snoise(vec3)` — 3D simplex noise
- `fbm(vec2, int)` — fractal Brownian motion
- `hash(float)` — pseudo-random hash
- `hash2(vec2)` — 2D pseudo-random hash

### Custom Effect Integration

If `@react-three/postprocessing` doesn't support custom passes well, we fall back to raw Three.js `EffectComposer` + `ShaderPass`:

```typescript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';

// Manual setup in a useEffect/useFrame
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(VHSShaderMaterial));
composer.addPass(new ShaderPass(CRTShaderMaterial));
// Bloom via UnrealBloomPass
```

This is the fallback path. The preferred path is `@react-three/postprocessing` with custom Effect subclasses.

---

## Horror-Driven Shader Modulation

The horror system drives VHS shader uniforms through the horror store:

| Horror Phase | uTrackingError | uStaticNoise | uDropoutRate | uChromaBleed | uHorrorIntensity |
|-------------|----------------|--------------|--------------|--------------|------------------|
| DORMANT | 0.0 | 0.05 | 0.02 | 0.15 | 0.0 |
| UNEASY | 0.05 | 0.08 | 0.04 | 0.20 | 0.1 |
| ESCALATING | 0.15 | 0.15 | 0.08 | 0.30 | 0.4 |
| CLIMAX | 0.40 | 0.30 | 0.15 | 0.50 | 0.8 |
| POST | 0.60 | 0.50 | 0.25 | 0.60 | 1.0 |

These values are smoothly lerped between phases, never jumping instantly (except for intentional glitch moments).

---

## Performance Considerations

- **Texture reads:** The VHS pass does multiple texture reads (chroma bleed samples 3 positions). Total texture reads per pixel: ~5. Acceptable for modern GPUs.
- **Branching:** Dropout and horror corruption use conditional branches. These are coherent (entire scanlines hit or miss), so GPU branch prediction handles them well.
- **Resolution:** Post-processing operates on the full viewport. For performance, the render target resolution can be reduced (e.g., 0.75x) and upscaled — this actually adds to the VHS look.
- **Combined passes:** If performance is tight, VHS and CRT passes can be merged into a single shader. Currently separated for clarity and tunability.

---

## Leva Debug Controls

All shader uniforms are exposed via Leva for real-time tuning:

```typescript
const vhsControls = useControls('VHS Effects', {
    trackingError: { value: 0.0, min: 0, max: 1, step: 0.01 },
    headSwitchNoise: { value: 0.3, min: 0, max: 1, step: 0.01 },
    chromaBleed: { value: 0.15, min: 0, max: 1, step: 0.01 },
    dropoutRate: { value: 0.02, min: 0, max: 0.2, step: 0.001 },
    staticNoise: { value: 0.05, min: 0, max: 0.5, step: 0.01 },
    pauseJitter: { value: 0.0, min: 0, max: 1, step: 0.01 },
    ffSpeed: { value: 0.0, min: 0, max: 1, step: 0.01 },
    rewSpeed: { value: 0.0, min: 0, max: 1, step: 0.01 },
    horrorIntensity: { value: 0.0, min: 0, max: 1, step: 0.01 },
});

const crtControls = useControls('CRT Display', {
    curvature: { value: 0.15, min: 0, max: 0.5, step: 0.01 },
    scanlineIntensity: { value: 0.3, min: 0, max: 1, step: 0.01 },
    scanlineCount: { value: 900, min: 100, max: 2000, step: 10 },
    phosphorIntensity: { value: 0.2, min: 0, max: 1, step: 0.01 },
    vignetteStrength: { value: 0.4, min: 0, max: 1, step: 0.01 },
    flicker: { value: 0.02, min: 0, max: 0.1, step: 0.001 },
    brightness: { value: 1.0, min: 0.5, max: 1.5, step: 0.01 },
});
```
