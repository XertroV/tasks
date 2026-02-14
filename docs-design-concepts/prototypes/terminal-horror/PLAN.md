# Terminal Horror Prototype -- Detailed Execution Plan

**Version:** 1.0
**Created:** 2026-02-14
**Goal:** Create an AMAZING liminal Backrooms horror experience that sells the atmosphere

---

## 1. THE ROOM (Geometry & Materials)

### 1.1 Wall Dimensions & Proportions

| Dimension | Value | Rationale |
|-----------|-------|-----------|
| **Ceiling Height** | 2.74m (9ft) | Canonical Backrooms Level 0 spec |
| **Room Width** | 12m | Wide enough to feel vast, narrow enough to feel claustrophobic |
| **Room Depth** | 16m | Deeper than wide, draws eye to terminal at far end |
| **Wall Thickness** | 0.15m | Visible on door/window frames |

**Geometry:** Inverted cube (interior faces visible via `THREE.BackSide`). Single room, no doors -- the player is trapped.

### 1.2 Wallpaper Color Specification

**Primary Wallpaper Colors:**

| Token | Hex | Role |
|-------|-----|------|
| `--wallpaper-base` | `#C4B998` | Primary monochromatic beige-yellow |
| `--wallpaper-light` | `#D4C9A8` | Highlight areas (near lights) |
| `--wallpaper-shadow` | `#8A7D5C` | Shadowed areas, corners |
| `--wallpaper-stain` | `#6A5D3C` | Water damage, discoloration |

**Accent Colors (from Level One Synthesis):**

| Token | Hex | Use |
|-------|-----|-----|
| `--lz-accent` | `#D44838` | Institutional red (stamps, warnings) |
| `--lz-accent-secondary` | `#5B8FD4` | Institutional blue (protocol text) |
| `--lz-accent-amber` | `#F0B830` | LED amber (status indicators) |

### 1.3 Texture Strategy: Procedural Shader

**Decision: PROCEDURAL SHADER with tiled pattern fallback**

Why procedural:
- No texture loading overhead
- Infinite pattern without visible repetition
- Can animate "breathing" effect organically
- Easier to apply water-damage overlay dynamically

**Wallpaper Pattern Shader (GLSL):**

```glsl
// Vertex Shader
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment Shader
uniform float uTime;
uniform vec3 uBaseColor;      // #C4B998
uniform vec3 uStainColor;     // #6A5D3C
uniform float uDecay;         // 0.0 - 1.0
uniform float uFlicker;       // Light flicker intensity

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Simplex noise for organic variation
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
  // Create repeating wallpaper pattern (60cm x 60cm tiles)
  vec2 tileUv = fract(vUv * 4.0); // 4 tiles per wall
  
  // Subtle diamond pattern common in commercial wallpaper
  float pattern = smoothstep(0.48, 0.52, abs(tileUv.x - 0.5)) * 
                  smoothstep(0.48, 0.52, abs(tileUv.y - 0.5));
  
  // Add noise for organic texture
  float noise = snoise(vUv * 20.0 + uTime * 0.05) * 0.08;
  
  // Water damage stain (increases with decay)
  float stainNoise = snoise(vUv * 3.0 + vec2(0.0, uTime * 0.01));
  float stain = smoothstep(0.3 - uDecay * 0.4, 0.8, stainNoise) * uDecay * 0.5;
  
  // "Moist" effect - subtle specular variation
  float moisture = snoise(vUv * 50.0 + uTime * 0.1) * 0.5 + 0.5;
  moisture = pow(moisture, 3.0) * uDecay * 0.3;
  
  // Base color with pattern
  vec3 color = mix(uBaseColor, uBaseColor * 0.85, pattern);
  
  // Apply stain
  color = mix(color, uStainColor, stain);
  
  // Apply noise variation
  color += noise;
  
  // Lighting simulation (simplified)
  float light = dot(vNormal, normalize(vec3(0.5, 1.0, 0.5))) * 0.3 + 0.7;
  
  // Flicker effect
  light *= 1.0 - uFlicker * 0.3 * sin(uTime * 50.0);
  
  // Apply moisture sheen
  color += moisture * 0.15;
  
  // Final
  gl_FragColor = vec4(color * light, 1.0);
}
```

### 1.4 The "Moist" Feeling

**Techniques:**

1. **Subsurface Scattering (SSS):** Use `MeshPhysicalMaterial` with `transmission: 0.05` and `thickness: 0.2` to simulate damp paper
2. **Specular Noise:** High-frequency noise in the specular channel creates water droplet illusion
3. **Normal Perturbation:** Subtle normal displacement makes surface feel uneven/warped
4. **Color Bleeding:** Water damage stains spread from floor corners upward

**GLSL Implementation:**

```glsl
// In fragment shader, add after base color calculation:
float moisture = snoise(vUv * 50.0 + uTime * 0.1) * 0.5 + 0.5;
moisture = pow(moisture, 3.0) * uDecay * 0.3;
color += moisture * 0.15; // Wet sheen

// Darker areas near floor (damp rising)
float floorDamp = smoothstep(0.0, 0.3, vUv.y) * 0.1;
color -= floorDamp * (1.0 - uDecay * 0.5);
```

### 1.5 Lighting Fixtures

**Fluorescent Tube Specification:**

| Property | Value |
|----------|-------|
| **Type** | Rectangular area light (simulated tube) |
| **Length** | 1.2m (4ft tube) |
| **Width** | 0.038m (T12 tube diameter) |
| **Color Temp** | 4100K (cool white, aged) |
| **Lumens** | 2800lm (dimmed to 1800lm for age) |
| **CRI** | 62 (poor color rendering = sickly look) |

**Placement:**

```
Ceiling layout (top-down view):

    [WALL] ============================================ [WALL]
           |                                        |
           |   [TUBE-1]         [TUBE-2]            |
           |                                        |
           |                                        |
           |                                        |
           |                                        |
    [WALL] ============================================ [WALL]

TUBE-1: position (3, 8.5, 3)   - above terminal area
TUBE-2: position (-3, 8.5, -3) - opposite corner, flickering
```

**3D Model:**

```tsx
function FluorescentTube({ position, flickering = false }: { position: [number, number, number], flickering?: boolean }) {
  const [intensity, setIntensity] = useState(1);
  
  useFrame(({ clock }) => {
    if (flickering) {
      const t = clock.elapsedTime;
      // Realistic fluorescent flicker pattern
      const flicker = 
        Math.sin(t * 120) * 0.1 +
        Math.sin(t * 47) * 0.05 +
        (Math.random() > 0.995 ? -0.8 : 0);
      setIntensity(0.7 + flicker);
    }
  });
  
  return (
    <group position={position}>
      {/* Fixture housing */}
      <mesh>
        <boxGeometry args={[1.2, 0.05, 0.1]} />
        <meshStandardMaterial color="#E8E4D8" roughness={0.8} />
      </mesh>
      
      {/* Tube (emissive) */}
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.019, 0.019, 1.1, 16]} rotation={[0, 0, Math.PI/2]} />
        <meshStandardMaterial 
          color="#E8E4D8" 
          emissive="#E8E4D8" 
          emissiveIntensity={intensity * 0.5}
        />
      </mesh>
      
      {/* Area light for illumination */}
      <rectAreaLight
        width={1.2}
        height={0.1}
        intensity={intensity * 3}
        color="#E8E4D8"
        position={[0, -0.05, 0]}
        rotation={[-Math.PI/2, 0, 0]}
      />
    </group>
  );
}
```

---

## 2. THE LIGHTING (Atmosphere)

### 2.1 Light Types

| Light | Type | Purpose |
|-------|------|---------|
| **Main Fluorescent** | `RectAreaLight` | Primary room illumination |
| **Flickering Tube** | `RectAreaLight` + animated intensity | Tension, unease |
| **Terminal Glow** | `PointLight` (green) | Illuminates user's face, draws focus |
| **Entity Glow** | `PointLight` (red) | Horror moment illumination |
| **Ambient** | `AmbientLight` (very low) | Prevent pure black shadows |

### 2.2 Color Temperature

| Light | Kelvin | Hex | Effect |
|-------|--------|-----|--------|
| Main fluorescent | 4100K | `#E8E4D8` | Aged, yellowing |
| Flickering tube | 3800K | `#D8D4C8` | Sickly, dying |
| Terminal screen | 6500K | `#33FF33` | Phosphor green glow |
| Entity core | -- | `#FF0000` | Warning, danger |
| Ambient fill | 5000K | `#1A1A2E` | Cool blue-black |

**The "sickly yellow-green" formula:**

```glsl
vec3 sicklyFluorescent = vec3(0.91, 0.89, 0.85); // #E8E4D8
// Add subtle green tint for aging phosphor
sicklyFluorescent.g += 0.02; // Slight green shift
```

### 2.3 Flicker Behavior

**Pattern: PSEUDO-RANDOM with weighted probability**

```typescript
function useFlickerPattern(baseIntensity: number) {
  const [intensity, setIntensity] = useState(baseIntensity);
  
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    
    // Layered flicker: slow drift + fast micro-flickers + occasional drops
    const slowDrift = Math.sin(t * 0.3) * 0.05;
    const fastFlicker = Math.sin(t * 47) * 0.03;
    
    // Occasional dramatic drops (0.5% chance per frame)
    const dramaticDrop = Math.random() > 0.995 ? -0.6 : 0;
    
    // Even rarer complete blackout (0.1% chance)
    const blackout = Math.random() > 0.999 ? -0.9 : 0;
    
    setIntensity(baseIntensity + slowDrift + fastFlicker + dramaticDrop + blackout);
  });
  
  return intensity;
}
```

### 2.4 Shadows

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Type** | `PCFSoftShadowMap` | Soft, diffused shadows |
| **Shadow map size** | 1024x1024 | Balance quality/performance |
| **Shadow bias** | -0.0001 | Prevent shadow acne |
| **Shadow radius** | 4 | Soft edge blur |

**Volumetric Lighting:** NOT recommended for performance. Instead, use **fog** to simulate light scattering:

```tsx
<fog attach="fog" args={['#0A0A0A', 5, 20]} />
```

### 2.5 The "Buzz" -- Making Lights Feel Alive

**Audio + Visual Synchronization:**

1. **Sub-60Hz hum:** Audio oscillator at 50-60Hz matches mains frequency
2. **Micro-flicker sync:** Light intensity wobbles at same rate as audio amplitude
3. **PWM noise:** Higher frequency component (120Hz) for electronic ballast simulation

**Implementation:**

```typescript
// Audio oscillator tied to light flicker
function useBuzzingLight() {
  const audioCtx = useAudioContext();
  const [intensity, setIntensity] = useState(1);
  const oscRef = useRef<OscillatorNode | null>(null);
  
  useLayoutEffect(() => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.value = 60; // Mains hum
    
    gain.gain.value = 0.02; // Very quiet
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    
    oscRef.current = osc;
    
    return () => osc.stop();
  }, [audioCtx]);
  
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Light wobbles with audio
    const wobble = Math.sin(t * 60 * Math.PI * 2) * 0.02;
    setIntensity(0.85 + wobble);
  });
  
  return intensity;
}
```

---

## 3. THE TERMINAL (The Focal Point)

### 3.1 Model Specification: 1987 IBM PC 5150 Style

**Dimensions:**

| Part | Width | Height | Depth |
|------|-------|--------|-------|
| **Monitor (CRT)** | 42cm | 38cm | 45cm |
| **Monitor bezel** | 5cm (top/sides), 7cm (bottom) | -- | -- |
| **Screen visible** | 32cm | 24cm | -- |
| **Keyboard (optional)** | 50cm | 3cm | 15cm |

**Visual Characteristics:**
- Beige/cream plastic (`#D4C4A8`)
- Slight yellowing from age
- Visible ventilation slots on sides
- Thick glass CRT face (convex curvature)
- Red/green LED indicators below screen

### 3.2 Screen Rendering in 3D Space

**Decision: HTML TRANSFORM (current approach) enhanced with post-processing**

**Why HTML:**
- Easier to render formatted documentation
- Keyboard navigation built-in
- Scroll behavior is native
- Can layer CSS effects (scanlines, glow)

**Enhancement needed:**

1. **CRT curvature simulation** -- CSS `filter: url(#crt-warp)` with SVG displacement map
2. **Proper z-ordering** -- Current `occlude="blending"` works well
3. **Reflection layer** -- Semi-transparent glass layer over HTML

**Improved Screen Component:**

```tsx
function TerminalScreen() {
  return (
    <Html 
      transform 
      occlude="blending"
      position={[0, 0.5, 1.28]} 
      scale={0.4}
      style={{ 
        width: '800px', 
        height: '600px',
        pointerEvents: 'none',
      }}
    >
      {/* CRT glass curvature effect */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="crt-warp">
            <feDisplacementMap 
              in="SourceGraphic" 
              scale="8"
              xChannelSelector="R" 
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      
      <div className="crt-screen" style={{ filter: 'url(#crt-warp)' }}>
        <div className="scanlines" />
        <div className="glow" />
        <div className="content">
          {/* Terminal content here */}
        </div>
      </div>
    </Html>
  );
}
```

### 3.3 CRT Effects Specification

**Layer Stack (back to front):**

1. **Base layer:** Black background with green phosphor text
2. **Phosphor glow:** CSS `text-shadow: 0 0 10px #33FF33`
3. **Scanlines:** 2px horizontal lines at 30% opacity
4. **Chromatic aberration:** Red/cyan offset on edges
5. **Screen curvature:** SVG displacement filter
6. **Vignette:** Radial gradient darkening at edges
7. **Reflection:** Subtle highlight from room lights

**CSS Implementation:**

```css
.crt-screen {
  position: relative;
  background: #000;
  border-radius: 20px; /* CRT rounded corners */
  overflow: hidden;
}

.crt-screen::before {
  /* Scanlines */
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.3) 2px,
    rgba(0, 0, 0, 0.3) 4px
  );
  pointer-events: none;
  z-index: 10;
}

.crt-screen::after {
  /* Vignette + glass reflection */
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%),
    linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 20;
}

.crt-text {
  color: #33FF33;
  font-family: 'IBM Plex Mono', 'Share Tech Mono', monospace;
  font-size: 16px;
  text-shadow: 
    0 0 5px #33FF33,
    0 0 10px #33FF33,
    0 0 20px rgba(51, 255, 51, 0.5);
}

/* Chromatic aberration on edges */
.crt-text::selection {
  background: rgba(51, 255, 51, 0.3);
  text-shadow: 
    -1px 0 #FF0000,
    1px 0 #00FFFF;
}
```

### 3.4 User Interaction

**Navigation Model:**

| Input | Action |
|-------|--------|
| `Space` / `Enter` | Next section (or skip typing animation) |
| `Escape` | Pause/resume (optional) |
| Mouse scroll | Scroll content (if longer than screen) |
| Click terminal | Focus (enable keyboard) |

**Current implementation:** Already functional in `TerminalScreen.tsx`. Enhance with:
- Visual feedback on keypress (screen flash)
- Audio feedback synced to typing
- Occasional "glitch" on keypress (text corruption for 1 frame)

---

## 4. THE FLOOR (The Carpet)

### 4.1 Color Specification

**The Iconic Brown-Beige Mono-Carpet:**

| Token | Hex | Role |
|-------|-----|------|
| `--carpet-base` | `#8B7355` | Primary brown-beige |
| `--carpet-light` | `#9B8365` | Highlight threads |
| `--carpet-dark` | `#5B4335` | Shadow/groove color |
| `--carpet-stain` | `#4B3325` | Wear marks, spills |

### 4.2 Texture: Worn, Matted, Endless

**Shader Strategy: Procedural berber-style loop pile**

**GLSL Implementation:**

```glsl
uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uDarkColor;

varying vec2 vUv;

void main() {
  // Create loop-pile texture (small repeating dots)
  vec2 tileUv = fract(vUv * 100.0); // 100 loops per meter
  float loop = smoothstep(0.3, 0.5, length(tileUv - 0.5));
  
  // Add wear pattern (more visible near terminal, less at edges)
  float distFromCenter = length(vUv - 0.5);
  float wear = smoothstep(0.0, 0.5, distFromCenter) * 0.2;
  
  // Random matting (carpet crushed in areas)
  float matting = snoise(vUv * 10.0) * 0.15;
  
  // Combine
  vec3 color = mix(uBaseColor, uDarkColor, loop * 0.3 + matting + wear);
  
  // Very subtle color variation
  color += snoise(vUv * 50.0) * 0.03;
  
  gl_FragColor = vec4(color, 1.0);
}
```

**3D Geometry Enhancement:**

For extra realism, displace the floor mesh slightly:

```tsx
function CarpetFloor() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(12, 16, 100, 100);
    const positions = geo.attributes.position.array;
    
    for (let i = 0; i < positions.length; i += 3) {
      // Random height displacement for "lumpy" carpet feel
      positions[i + 2] += Math.random() * 0.02;
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);
  
  return (
    <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
      <primitive object={geometry} />
      <carpetMaterial />
    </mesh>
  );
}
```

---

## 5. THE HORROR (The Turn-Around Moment)

### 5.1 Timing: RANDOM within window

**Current:** Fixed 20 seconds
**Enhanced:** 18-28 second window, random exact moment

```typescript
const SCARE_WINDOW_MIN = 18000; // 18 seconds
const SCARE_WINDOW_MAX = 28000; // 28 seconds
const scareTime = SCARE_WINDOW_MIN + Math.random() * (SCARE_WINDOW_MAX - SCARE_WINDOW_MIN);
```

**Escalation before the turn:**

| Time Before Turn | Effect |
|------------------|--------|
| -10s | Lights begin subtle flicker |
| -7s | Ambient hum intensifies |
| -5s | Wall breathing becomes visible |
| -3s | Terminal text begins to glitch |
| -2s | Audio cue: wet breathing sound |
| -1s | Camera begins slow turn |
| 0s | Entity revealed |

### 5.2 The Entity: Detailed Description

**Visual Design: "The Admin" -- Biological-Tech Hybrid**

When the player turns around, they see:

**THE CORE (Center, 0.8m diameter):**
- Sphere of tangled cables (CAT6, power cords, fiber optics)
- Woven into a heart-like shape
- Pulses with sickly red LED glow (`#FF0000` with `#550000` emissive)
- Wireframe exterior with solid interior organs
- Emits low-frequency red point light (casts red shadows)

**THE TENDRILS (30-40 cables):**
- Radiating from center in Fibonacci sphere distribution
- Various thicknesses (1-3cm diameter)
- Colors: `#111111` (black), `#1A1A1A` (dark gray), `#330000` (dried blood red)
- Slight animation: twitching, reaching
- Some cables end in RJ45 connectors, others in bone-like spikes

**THE EYES (5-7 points):**
- Small white spheres (2-3cm)
- Scattered asymmetrically around core
- Blink asynchronously
- Do not move -- they watch, but do not track

**THE AURA:**
- Heat shimmer effect (air distortion shader)
- 2m radius around entity
- Subtle smoke/fog particles

**MOVEMENT:**
- Slow hover (0.1m vertical oscillation, 0.5s period)
- Gentle rotation (0.1 radians/second)
- Cables writhe independently (procedural noise animation)

**Current Implementation Enhancement:**

```tsx
function TheEntity() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    if (coreRef.current) {
      // Heartbeat pulse (fast-slow-fast)
      const heartbeat = Math.sin(t * 3) * 0.5 + 0.5;
      const pulse = 0.9 + heartbeat * 0.2;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
    
    if (groupRef.current) {
      // Hovering
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;
      // Rotation
      groupRef.current.rotation.y = t * 0.1;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Core with internal light */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial 
          color="#FF0000"
          emissive="#550000"
          emissiveIntensity={3}
          roughness={0.3}
          metalness={0.7}
          wireframe
        />
        <pointLight intensity={2} color="#FF0000" distance={6} decay={2} />
      </mesh>
      
      {/* Heat shimmer effect (post-processing) */}
      <HeatShimmer radius={2} />
      
      {/* Cable tendrils (current implementation is good) */}
      <CableTangle count={35} />
      
      {/* Eyes */}
      <EntityEyes count={6} />
    </group>
  );
}
```

### 5.3 Audio Cue: The Reveal Sound

**Sound Design:**

| Layer | Description | Timing |
|-------|-------------|--------|
| **Sub-bass drop** | 30Hz sine wave, exponential decay over 2s | On reveal |
| **Wet squelch** | Layered filtered noise, organic texture | 0.1s after |
| **Breathing** | Deep, slow inhale/exhale cycle (3s) | Loops |
| **High whisper** | Almost inaudible, panned to rear speakers | Continuous |
| **Electrical buzz** | 60Hz hum with harmonic distortion | Continuous |

**Implementation:**

```typescript
function playRevealSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  // Sub-bass drop
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(50, now);
  bass.frequency.exponentialRampToValueAtTime(20, now + 2);
  bassGain.gain.setValueAtTime(0.6, now);
  bassGain.gain.exponentialRampToValueAtTime(0.01, now + 2);
  bass.connect(bassGain);
  bassGain.connect(ctx.destination);
  bass.start(now);
  bass.stop(now + 2);
  
  // Layer in wet texture (filtered noise)
  // ... (noise buffer creation)
  
  // Start entity breathing loop
  startEntityBreathing();
}
```

### 5.4 Aftermath

**What happens after the reveal:**

1. **Player cannot turn back** -- Camera is locked facing entity
2. **Entity remains** -- It hovers, watching
3. **Terminal text continues** -- But now displays corrupted text
4. **Audio continues** -- Breathing, buzzing, occasional whispers
5. **Gradual fade to black** -- 10 seconds after reveal, fade begins
6. **Final message** -- Single line of corrupted text appears
7. **Loop option** -- Press any key to restart

**Post-Reveal Terminal Text:**

```
THE TASKS ARE ENDLESS
THE BACKLOG IS HUNGRY
YOU HAVE BEEN ASSIGNED
CONSUME
CONSUME
C̶̛Ơ̶N̶̛S̶̛Ư̶M̶̛E̶̛
```

---

## 6. TECHNICAL IMPLEMENTATION

### 6.1 R3F Components Needed

| Component | File | Description |
|-----------|------|-------------|
| `Scene` | `Scene.tsx` | Main canvas wrapper, camera, fog |
| `Room` | `Room.tsx` | Inverted cube with wallpaper shader |
| `Floor` | `Floor.tsx` | Displaced plane with carpet shader |
| `Ceiling` | `Ceiling.tsx` | Simple plane with tile texture |
| `FluorescentTube` | `FluorescentTube.tsx` | Light fixture model + light source |
| `TerminalModel` | `TerminalModel.tsx` | CRT monitor geometry |
| `TerminalScreen` | `TerminalScreen.tsx` | HTML overlay for docs |
| `TheEntity` | `TheEntity.tsx` | Horror entity (already exists) |
| `Cable` | `Cable.tsx` | Individual cable geometry (already exists) |
| `CameraController` | `CameraController.tsx` | Slerp-based camera turn |
| `HorrorEvent` | `HorrorEvent.tsx` | Orchestrates the scare sequence |
| `PostProcessing` | `PostProcessing.tsx` | Bloom, noise, chromatic aberration |
| `AudioManager` | `AudioManager.tsx` | Web Audio API wrapper |

### 6.2 Shader Materials Needed

| Shader | File | Purpose | Key Uniforms |
|--------|------|---------|--------------|
| `WallpaperMaterial` | `shaders/Wallpaper.glsl` | Procedural yellow wallpaper | `uTime`, `uDecay`, `uFlicker` |
| `CarpetMaterial` | `shaders/Carpet.glsl` | Worn carpet texture | `uTime`, `uWear` |
| `BreathingWallMaterial` | `shaders/BreathingWall.glsl` | Organic horror walls (existing) | `uTime`, `uColor`, `uPulseColor` |
| `HeatShimmerMaterial` | `shaders/HeatShimmer.glsl` | Entity aura effect | `uTime`, `uRadius` |
| `CRTMaterial` | `shaders/CRT.glsl` | Post-process CRT effect | `uResolution`, `uCurvature` |

**BreathingWallMaterial (existing, enhanced):**

```glsl
// Enhanced version for horror climax
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uPulseColor;
uniform float uDecay; // NEW: controls breathing intensity

void main() {
  // Vertex displacement
  float breath = sin(uTime * 1.5 + position.y * 2.0 + position.x * 2.0) * 0.05 * uDecay;
  vec3 newPosition = position + normal * breath;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
```

### 6.3 Audio Files/Synthesis

**Procedural Audio (no external files):**

| Sound | Synthesis Method | Parameters |
|-------|------------------|------------|
| Keystroke | Square oscillator + noise burst | 600Hz, 40ms |
| Ambient hum | Sawtooth oscillator + lowpass | 50Hz, 120Hz cutoff |
| Fluorescent buzz | Filtered noise + 60Hz sine | Bandpass 50-70Hz |
| Reveal bass | Sine oscillator | 50Hz -> 20Hz, 2s decay |
| Wet squelch | Filtered white noise + envelope | Randomized |
| Breathing | Noise + LFO amplitude modulation | 0.3Hz cycle |
| Whispers | Layered noise + comb filter | Panned randomly |

**Audio Architecture:**

```
[Oscillators/Noise] -> [Gain Envelopes] -> [Filters] -> [Master Gain] -> [Destination]
                                                                    |
                                                            [Analyser] (for visual sync)
```

### 6.4 Performance Considerations

**Target: 60fps on 2020 midrange hardware**

| Optimization | Implementation |
|--------------|----------------|
| **Draw calls** | Merge static geometry (room) into single mesh |
| **Shaders** | Use `#ifdef` for feature toggles, compile once |
| **Particles** | None (use shader noise instead) |
| **Shadows** | Single shadow-casting light, 1024px map |
| **Post-processing** | Minimal: bloom only, no depth-based effects |
| **Audio** | Pre-allocate all nodes, no runtime creation |
| **HTML overlay** | Single Html element, no nested transforms |
| **State updates** | Throttle to 30fps for non-critical updates |

**Performance Budget:**

| Category | Budget | Notes |
|----------|--------|-------|
| Vertices | < 10,000 | Room + entity + terminal |
| Draw calls | < 20 | Aggressive batching |
| Shader complexity | < 50 ALU per fragment | No nested loops |
| Memory | < 100MB | No large textures |
| JS execution | < 8ms per frame | Main thread budget |

**React Profiling:**

```typescript
// Wrap expensive updates in useMemo/useCallback
const entityGeometry = useMemo(() => generateEntityCables(), []);

// Throttle non-critical updates
useFrame(({ clock }) => {
  if (Math.floor(clock.elapsedTime * 30) % 2 === 0) {
    // Update at 30fps instead of 60fps
    updateNonCriticalState();
  }
});
```

---

## 7. MOOD BOARD REFERENCES

### 7.1 Image References

**Backrooms Level 0:**
- [Kane Pixels' Backrooms series](https://www.youtube.com/watch?v=H4dGpz6cnH) -- Lighting reference, color palette
- [r/backrooms](https://reddit.com/r/backrooms) -- Community interpretations of wallpaper, carpet

**Poolrooms (for aquatic light reference):**
- [Jared Pike's Poolrooms](https://www.instagram.com/jaredpike_art/) -- Caustic lighting, tile patterns

**CRT Monitors:**
- [IBM 5150 Reference Photos](https://commons.wikimedia.org/wiki/Category:IBM_5150) -- Bezel proportions, screen curvature
- [CRT Shader Examples](https://www.shadertoy.com/results?query=crt) -- Effect techniques

**Server Room Horror:**
- [Event Horizon](https://www.imdb.com/title/tt0119081/) -- Industrial horror aesthetic
- [Alien (1979)](https://www.imdb.com/title/tt0078748/) -- Biomechanical entity design

### 7.2 Color Palette

```
PRIMARY PALETTE (Backrooms Wallpaper):
├── #C4B998  ████████  Base beige-yellow
├── #D4C9A8  ████████  Highlight
├── #8A7D5C  ████████  Shadow
└── #6A5D3C  ████████  Water stain

FLOOR PALETTE (Mono-Carpet):
├── #8B7355  ████████  Base brown-beige
├── #9B8365  ████████  Highlight thread
├── #5B4335  ████████  Groove/shadow
└── #4B3325  ████████  Wear/stain

TERMINAL PALETTE (CRT Phosphor):
├── #33FF33  ████████  Primary green text
├── #22CC22  ████████  Dimmed green
├── #000000  ████████  Screen black
└── #0A1A0A  ████████  Screen glow

HORROR PALETTE (Entity):
├── #FF0000  ████████  Core glow
├── #550000  ████████  Emissive red
├── #111111  ████████  Cable black
├── #330000  ████████  Dried blood
└── #FFFFFF  ████████  Eyes

LIGHTING PALETTE:
├── #E8E4D8  ████████  Fluorescent (4100K)
├── #D8D4C8  ████████  Aged fluorescent
└── #1A1A2E  ████████  Ambient (dark blue)
```

### 7.3 Font Recommendations

**Terminal Screen:**

| Font | Use | Why |
|------|-----|-----|
| **IBM Plex Mono** | Primary terminal font | Authentic IBM aesthetic, excellent readability |
| **Share Tech Mono** | Alternative | More "hacker" feel, wider characters |
| **VT323** | Retro option | Authentic 80s terminal look |

**CSS Stack:**

```css
:root {
  --font-terminal: 'IBM Plex Mono', 'Share Tech Mono', 'Courier New', monospace;
}

.terminal-text {
  font-family: var(--font-terminal);
  font-size: 16px;
  line-height: 1.4;
  letter-spacing: 0.05em;
}
```

**Loading:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
```

---

## 8. IMPLEMENTATION PHASES

### Phase 1: Room Shell + Lighting (2-3 days)

**Deliverables:**
- [ ] `Room.tsx` -- Inverted cube with procedural wallpaper shader
- [ ] `Floor.tsx` -- Carpet shader with displacement
- [ ] `Ceiling.tsx` -- Simple tile texture
- [ ] `FluorescentTube.tsx` -- Light fixture model + flickering light
- [ ] `Scene.tsx` -- Camera setup, fog, ambient lighting

**Acceptance Criteria:**
- Room renders at 60fps
- Wallpaper has visible pattern and subtle noise variation
- Fluorescent lights flicker realistically
- Room feels like authentic Backrooms Level 0

**Testing:**
```bash
bun run dev
# Verify 60fps in browser dev tools
# Screenshot compare to mood board references
```

---

### Phase 2: Terminal Model + Screen (2-3 days)

**Deliverables:**
- [ ] `TerminalModel.tsx` -- Enhanced CRT geometry with proper proportions
- [ ] `TerminalScreen.tsx` -- CRT effect layer stack (scanlines, glow, vignette)
- [ ] CSS for phosphor text effect
- [ ] Audio integration for keystroke sounds
- [ ] Post-processing bloom for screen glow

**Acceptance Criteria:**
- Terminal looks like 1987 IBM PC style
- Screen has visible scanlines and CRT curvature
- Text glows with phosphor effect
- Keystroke audio synced to typing animation
- Screen illuminates the floor in front of terminal

**Testing:**
```bash
bun run dev
# Test keyboard navigation
# Verify audio plays on keystroke
# Check CRT effect layers render correctly
```

---

### Phase 3: Horror Event + Entity (2-3 days)

**Deliverables:**
- [ ] `HorrorEvent.tsx` -- Timing logic, escalation sequence
- [ ] `TheEntity.tsx` -- Enhanced entity model with heat shimmer
- [ ] `CameraController.tsx` -- Smooth slerp turn
- [ ] Audio: reveal sound, breathing loop, whispers
- [ ] Wall breathing effect trigger
- [ ] Post-reveal state (locked camera, corrupted text)

**Acceptance Criteria:**
- Scare triggers randomly within 18-28 second window
- Pre-scare escalation is visible (lights flicker, walls breathe)
- Camera turn is smooth and involuntary
- Entity is genuinely unsettling (test with users)
- Audio enhances horror without being cheesy
- Post-reveal maintains tension

**Testing:**
```bash
bun run dev
# Let prototype run multiple times to verify random timing
# Test on at least 3 people for genuine reaction
# Verify all audio layers play correctly
```

---

### Phase 4: Polish + Atmosphere (1-2 days)

**Deliverables:**
- [ ] Final color calibration to match mood board
- [ ] Performance optimization pass (verify 60fps on midrange hardware)
- [ ] Accessibility: `prefers-reduced-motion` support
- [ ] Mobile warning (desktop-only experience)
- [ ] Restart functionality after horror event
- [ ] Final audio mixing and balance
- [ ] Edge case handling (tab away, resize, etc.)

**Acceptance Criteria:**
- Runs at consistent 60fps
- All shaders compile without warnings
- Respects `prefers-reduced-motion`
- Works on Chrome, Firefox, Safari
- No console errors

**Testing:**
```bash
bun run dev
bun run build && bun run preview
# Test production build
# Performance profiling in DevTools
# Cross-browser testing
```

---

## APPENDIX: File Structure After Implementation

```
terminal-horror/
├── src/
│   ├── components/
│   │   ├── Scene.tsx           # Main scene wrapper
│   │   ├── Room.tsx            # Wallpaper cube
│   │   ├── Floor.tsx           # Carpet plane
│   │   ├── Ceiling.tsx         # Tile plane
│   │   ├── FluorescentTube.tsx # Light fixture
│   │   ├── TerminalModel.tsx   # CRT geometry
│   │   ├── TerminalScreen.tsx  # HTML overlay
│   │   ├── TheEntity.tsx       # Horror entity
│   │   ├── Cable.tsx           # Cable geometry
│   │   ├── CameraController.tsx # Camera movement
│   │   ├── HorrorEvent.tsx     # Scare orchestrator
│   │   └── PostProcessing.tsx  # Effects stack
│   ├── shaders/
│   │   ├── Wallpaper.glsl      # Procedural wallpaper
│   │   ├── Carpet.glsl         # Carpet texture
│   │   ├── BreathingWall.glsl  # Horror wall effect
│   │   └── HeatShimmer.glsl    # Entity aura
│   ├── utils/
│   │   ├── audio.ts            # Web Audio wrapper
│   │   └── random.ts           # Seeded random
│   ├── data/
│   │   ├── docs-content.ts     # Terminal text
│   │   └── audio-cues.ts       # Audio manifest
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── (no audio files - all procedural)
├── index.html
├── package.json
└── README.md
```

---

## APPENDIX: Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Performance issues on low-end hardware | Add quality presets, reduce shader complexity |
| Horror too intense | Add warning screen at start |
| Audio context blocked | Require click to start, show "click to begin" |
| Motion sickness from camera turn | Smooth easing, respect reduced-motion |
| Entity not scary enough | User test with 5+ people, iterate on design |
| Cheesy/b-movie horror | Avoid jump scares, focus on dread and atmosphere |

---

*End of Execution Plan. This document serves as the blueprint for implementing the Terminal Horror prototype. Each phase can be assigned to a separate agent or developer.*
