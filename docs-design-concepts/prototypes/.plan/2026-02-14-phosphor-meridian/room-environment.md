# Room & Environment Specification

> Part of [VCR2 Architecture Plan](./index.md)

## Overview

The room is a Backrooms Level 0 environment: fluorescent-lit, yellow wallpaper, brown carpet, acoustic ceiling tiles. The room contains the CRT television and VCR deck on an entertainment center. Behind the player, hallways stretch into darkness, visible when using "Look Behind You."

---

## Room Geometry

### Primary Room

The room where the TV lives. The player sits/stands facing one wall.

```
Dimensions:
- Width:  6.0m (narrower than terminal-horror-redux's 12m — more claustrophobic)
- Depth:  8.0m (from player to TV wall)
- Height: 2.74m (9ft — standard drop ceiling)

Player position: (0, 1.2, -2)  (center, seated eye height, 2m from back wall)
TV wall:         z = -6.0
Back wall:       z = 2.0  (behind player — opens to hallways)
Side walls:      x = ±3.0
Floor:           y = 0.0
Ceiling:         y = 2.74
```

### Wall Construction

Each wall is a plane with a custom shader material. Walls face inward.

```typescript
// Walls.tsx
function Walls() {
    const timeRef = useRef(0);

    useFrame((_, delta) => {
        timeRef.current += delta;
        // Update all wall material uniforms via refs
    });

    return (
        <group>
            {/* TV Wall (facing player) */}
            <mesh position={[0, 1.37, -6]} rotation={[0, 0, 0]}>
                <planeGeometry args={[6, 2.74]} />
                <wallpaperMaterial ref={tvWallRef} />
            </mesh>

            {/* Left Wall */}
            <mesh position={[-3, 1.37, -2]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[8, 2.74]} />
                <wallpaperMaterial ref={leftWallRef} />
            </mesh>

            {/* Right Wall */}
            <mesh position={[3, 1.37, -2]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[8, 2.74]} />
                <wallpaperMaterial ref={rightWallRef} />
            </mesh>

            {/* Back Wall — has opening to hallways */}
            {/* Two wall segments with a gap in the middle */}
            <mesh position={[-2, 1.37, 2]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[2, 2.74]} />
                <wallpaperMaterial ref={backLeftRef} />
            </mesh>
            <mesh position={[2, 1.37, 2]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[2, 2.74]} />
                <wallpaperMaterial ref={backRightRef} />
            </mesh>
            {/* 2m-wide opening in center of back wall for hallway view */}
        </group>
    );
}
```

---

## Shader Materials

### Wallpaper Material

Improved from terminal-horror-redux's WallpaperMaterial. Adds:
- More authentic striped wallpaper pattern (not just tiled grid)
- Seam lines where wallpaper strips meet (every ~0.5m horizontally)
- Peeling effect near moisture/stains
- Horror-driven breathing (vertex displacement when horror escalates)

```glsl
// wallpaper.frag.glsl — Key improvements over terminal-horror-redux

uniform float uTime;
uniform float uDecay;          // 0-1: overall deterioration
uniform float uFlicker;        // Fluorescent light flicker
uniform float uBreathIntensity; // Horror: wall breathing strength
uniform vec4 uBaseColor;       // #C4B998
uniform vec4 uLightColor;      // #D4C9A8
uniform vec4 uShadowColor;     // #8A7D5C
uniform vec4 uStainColor;      // #6A5D3C

// Import shared noise
// #include <noise.glsl>

void main() {
    vec2 uv = vUv;

    // Vertical stripe pattern (wallpaper strips)
    float stripeWidth = 0.08; // ~0.5m strips on a 6m wall
    float stripe = smoothstep(0.48, 0.5, fract(uv.x / stripeWidth));
    stripe = max(stripe, smoothstep(0.52, 0.5, fract(uv.x / stripeWidth)));

    // Subtle embossed pattern within stripes
    float pattern = sin(uv.y * 200.0) * 0.02;

    // Base color with stripe variation
    vec3 color = mix(uBaseColor.rgb, uLightColor.rgb, stripe * 0.3 + pattern);

    // Seam darkening at strip edges
    float seam = 1.0 - smoothstep(0.0, 0.01, abs(fract(uv.x / stripeWidth) - 0.5) * 2.0 - 0.98);
    color = mix(color, uShadowColor.rgb, seam * 0.5);

    // Water stains (noise-driven, concentrated at top and bottom)
    float stainNoise = snoise(uv * 3.0 + vec2(0.0, uTime * 0.001)) * 0.5 + 0.5;
    float stainMask = smoothstep(0.6, 0.8, stainNoise);
    float heightBias = max(
        smoothstep(0.3, 0.0, uv.y),   // Bottom moisture
        smoothstep(0.7, 1.0, uv.y)    // Top moisture
    );
    color = mix(color, uStainColor.rgb, stainMask * heightBias * uDecay);

    // Peeling near stains (lighter patches where wallpaper lifts)
    float peelNoise = snoise(uv * 8.0) * 0.5 + 0.5;
    float peelMask = step(0.85, peelNoise) * stainMask;
    color = mix(color, uLightColor.rgb * 1.1, peelMask * uDecay);

    // Fluorescent lighting (directional from above)
    float lighting = 0.7 + 0.3 * (1.0 - uv.y); // Brighter at top
    lighting *= (1.0 - uFlicker * sin(uTime * 60.0) * 0.1);
    color *= lighting;

    gl_FragColor = vec4(color, 1.0);
}
```

```glsl
// wallpaper.vert.glsl — With breathing displacement

uniform float uTime;
uniform float uBreathIntensity;

varying vec2 vUv;

void main() {
    vUv = uv;

    vec3 pos = position;

    // Horror breathing: sinusoidal displacement along normal
    if (uBreathIntensity > 0.001) {
        float breath = sin(uTime * 1.5 + position.y * 2.0) * uBreathIntensity * 0.03;
        pos += normal * breath;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

### Carpet Material

Improved from terminal-horror-redux:

```glsl
// carpet.frag.glsl

uniform float uTime;
uniform float uWear;           // 0-1: traffic wear
uniform vec4 uBaseColor;       // #8B7355
uniform vec4 uDarkColor;       // #5B4335

void main() {
    vec2 uv = vUv;

    // Loop carpet texture (small-scale repeating pattern)
    float loopScale = 80.0;
    vec2 loopUv = fract(uv * loopScale);
    float loop = sin(loopUv.x * 6.28) * sin(loopUv.y * 6.28) * 0.5 + 0.5;

    // Base color with loop variation
    vec3 color = mix(uDarkColor.rgb, uBaseColor.rgb, loop * 0.4 + 0.3);

    // Large-scale stain/wear patterns
    float wearNoise = snoise(uv * 4.0) * 0.5 + 0.5;
    float matting = snoise(uv * 12.0) * 0.5 + 0.5;

    // Wear concentrated in center (traffic path to TV)
    float trafficPath = 1.0 - smoothstep(0.0, 0.4, abs(uv.x - 0.5));
    color = mix(color, uDarkColor.rgb * 0.8, wearNoise * trafficPath * uWear);
    color = mix(color, color * 0.9, matting * 0.2);

    // Fine carpet fiber detail
    float fiber = snoise(uv * 200.0) * 0.05;
    color += fiber;

    gl_FragColor = vec4(color, 1.0);
}
```

### Ceiling Tile Material

New material (terminal-horror-redux had a plain white plane):

```glsl
// ceiling-tile.frag.glsl

uniform float uTime;
uniform float uFlicker;

void main() {
    vec2 uv = vUv;

    // Tile grid (2x2 foot tiles = ~0.6m)
    float tileScale = 1.0 / 0.6;
    vec2 tileUv = fract(uv * tileScale * vec2(6.0, 8.0)); // Scale to room size

    // Grid lines (dark gaps between tiles)
    float gridX = smoothstep(0.0, 0.02, tileUv.x) * smoothstep(1.0, 0.98, tileUv.x);
    float gridY = smoothstep(0.0, 0.02, tileUv.y) * smoothstep(1.0, 0.98, tileUv.y);
    float grid = gridX * gridY;

    // Tile base color (off-white, slightly yellow from age)
    vec3 tileColor = vec3(0.92, 0.90, 0.85);

    // Subtle variation per tile
    vec2 tileId = floor(uv * tileScale * vec2(6.0, 8.0));
    float tileVariation = hash2(tileId) * 0.05;
    tileColor -= tileVariation;

    // Pin holes (tiny dark dots in a grid pattern within each tile)
    float pinScale = 20.0;
    vec2 pinUv = fract(tileUv * pinScale);
    float pin = smoothstep(0.08, 0.05, length(pinUv - 0.5));
    tileColor -= pin * 0.15;

    // Water stain on a few tiles (random selection)
    float stainChance = hash2(tileId + 100.0);
    if (stainChance > 0.85) {
        float stain = snoise(tileUv * 3.0) * 0.5 + 0.5;
        tileColor = mix(tileColor, vec3(0.75, 0.70, 0.60), stain * 0.3);
    }

    // Apply grid
    vec3 color = mix(vec3(0.2), tileColor, grid);

    // Fluorescent lighting (brightest directly under fixtures)
    color *= (0.8 + 0.2 * uFlicker);

    gl_FragColor = vec4(color, 1.0);
}
```

---

## Lighting

### Fluorescent Fixtures

Two fluorescent tube fixtures mounted on the ceiling:

```typescript
// Fixture positions
const fixtures = [
    { position: [0, 2.7, -4], length: 1.2 },   // Over TV area
    { position: [0, 2.7, 0], length: 1.2 },     // Over player area
];
```

Each fixture consists of:
- **Housing:** Gray metal box (1.2m × 0.15m × 0.05m)
- **Tube:** Emissive cylinder inside housing (warm white `#FFF8E7`)
- **RectAreaLight:** Width matches tube length, positioned just below housing
- **Flicker:** Composite sine wave + random dropout

```typescript
function FluorescentLight({ position, length }: FluorescentLightProps) {
    const intensityRef = useRef(1.0);
    const lightRef = useRef<THREE.RectAreaLight>(null);

    useFrame((_, delta) => {
        // Composite flicker (NOT using setState)
        const t = performance.now() * 0.001;
        let intensity = 1.0;
        intensity *= 0.95 + 0.05 * Math.sin(t * 120 * Math.PI); // 60Hz flicker
        intensity *= 0.98 + 0.02 * Math.sin(t * 7.3);           // Slow variation
        intensity *= 0.99 + 0.01 * Math.sin(t * 23.7);          // Medium variation

        // Random dropout (0.5% chance per frame)
        if (Math.random() < 0.005) {
            intensity *= 0.2; // Brief dim
        }

        intensityRef.current = intensity;
        if (lightRef.current) {
            lightRef.current.intensity = intensity * 2.0;
        }
    });

    return (
        <group position={position}>
            {/* Housing */}
            <mesh>
                <boxGeometry args={[length, 0.05, 0.15]} />
                <meshStandardMaterial color="#888888" metalness={0.3} roughness={0.7} />
            </mesh>
            {/* Tube */}
            <mesh position={[0, -0.03, 0]}>
                <cylinderGeometry args={[0.015, 0.015, length - 0.1, 8]} />
                <meshStandardMaterial
                    color="#FFF8E7"
                    emissive="#FFF8E7"
                    emissiveIntensity={1.0}
                />
            </mesh>
            {/* Light */}
            <rectAreaLight
                ref={lightRef}
                color="#FFF8E7"
                intensity={2.0}
                width={length}
                height={0.1}
                position={[0, -0.05, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
            />
        </group>
    );
}
```

### Ambient Light

Very dim ambient to prevent total blackness in shadows:

```typescript
<ambientLight color="#1A1A2E" intensity={0.15} />
```

### TV Glow

Green point light emanating from the CRT screen:

```typescript
<pointLight
    color="#33FF33"
    intensity={0.5}
    distance={4}
    decay={2}
    position={[0, 0.9, -5.8]} // Just in front of screen
/>
```

### Fog

Exponential fog for Backrooms atmosphere:

```typescript
<fog attach="fog" args={['#1a1a0d', 0.03]} />
// Or FogExp2 for more gradual falloff:
scene.fog = new THREE.FogExp2(0x1a1a0d, 0.04);
```

---

## Entertainment Center

The TV and VCR sit on an entertainment center (wooden TV stand):

```
Dimensions:
- Width:  1.2m
- Height: 0.6m (TV at comfortable viewing height)
- Depth:  0.5m

Position: (0, 0, -5.8) — against the TV wall

Structure:
- Top shelf: TV sits here
- Middle shelf: VCR sits here (slightly recessed)
- Bottom: open (or could have VHS tapes)
- Material: Dark wood (#3D2817), slightly worn
```

```typescript
function EntertainmentCenter() {
    return (
        <group position={[0, 0, -5.8]}>
            {/* Top surface */}
            <mesh position={[0, 0.6, 0]}>
                <boxGeometry args={[1.2, 0.03, 0.5]} />
                <meshStandardMaterial color="#3D2817" roughness={0.8} />
            </mesh>
            {/* Middle shelf */}
            <mesh position={[0, 0.35, 0]}>
                <boxGeometry args={[1.1, 0.02, 0.45]} />
                <meshStandardMaterial color="#3D2817" roughness={0.8} />
            </mesh>
            {/* Side panels */}
            <mesh position={[-0.59, 0.3, 0]}>
                <boxGeometry args={[0.02, 0.6, 0.5]} />
                <meshStandardMaterial color="#3D2817" roughness={0.8} />
            </mesh>
            <mesh position={[0.59, 0.3, 0]}>
                <boxGeometry args={[0.02, 0.6, 0.5]} />
                <meshStandardMaterial color="#3D2817" roughness={0.8} />
            </mesh>
            {/* Back panel */}
            <mesh position={[0, 0.3, -0.24]}>
                <boxGeometry args={[1.2, 0.6, 0.02]} />
                <meshStandardMaterial color="#2A1F0F" roughness={0.9} />
            </mesh>

            {/* VHS tapes on bottom shelf (decoration) */}
            {/* 3-5 VHS tape boxes leaning against each other */}
            <VHSTapeStack position={[-0.3, 0.1, 0.1]} />
        </group>
    );
}
```

---

## Beyond Hallways

### Concept

Behind the player, through a 2m-wide opening in the back wall, the Backrooms continue. This is purely atmospheric — the player can look but never go there.

### Construction

2-3 room segments cloned from simplified versions of the main room:

```typescript
function BeyondHallways() {
    return (
        <group position={[0, 0, 2]}> {/* Starts at back wall */}
            {/* Segment 1: Immediately behind */}
            <HallwaySegment position={[0, 0, 4]} lightIntensity={0.6} />
            {/* Segment 2: Further back */}
            <HallwaySegment position={[0, 0, 12]} lightIntensity={0.3} />
            {/* Segment 3: Barely visible */}
            <HallwaySegment position={[0, 0, 20]} lightIntensity={0.1} />
        </group>
    );
}

function HallwaySegment({ position, lightIntensity }: HallwaySegmentProps) {
    return (
        <group position={position}>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[6, 8]} />
                <carpetMaterial />
            </mesh>
            {/* Ceiling */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.74, 0]}>
                <planeGeometry args={[6, 8]} />
                <ceilingTileMaterial />
            </mesh>
            {/* Walls (left, right, back) */}
            <mesh position={[-3, 1.37, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[8, 2.74]} />
                <wallpaperMaterial />
            </mesh>
            <mesh position={[3, 1.37, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[8, 2.74]} />
                <wallpaperMaterial />
            </mesh>
            {/* Fluorescent light (dimmer) */}
            <FluorescentLight
                position={[0, 2.7, 0]}
                length={1.2}
                baseIntensity={lightIntensity}
            />
        </group>
    );
}
```

### Fog Interaction

The exponential fog naturally fades the hallway segments:
- Segment 1 (~4m away): Clearly visible but slightly hazy
- Segment 2 (~12m away): Dim, details obscured
- Segment 3 (~20m away): Barely visible, just light sources and vague shapes

This creates the illusion of infinite space without infinite geometry.

### Performance

- 3 hallway segments × ~6 meshes each = ~18 extra meshes
- All use the same shader materials (instanced effectively by Three.js)
- Total additional vertices: ~5K
- Well within the 50K vertex budget

---

## Horror Room Effects

When horror is enabled and escalating:

### Fluorescent Flicker Changes
- UNEASY: Flicker frequency increases slightly
- ESCALATING: One light occasionally goes fully dark for 0.5-1s
- CLIMAX: Lights strobe erratically

### Wall Breathing
- UNEASY: Not active
- ESCALATING: Very subtle vertex displacement (barely perceptible, 0.5mm)
- CLIMAX: More pronounced (2-3mm). Walls visibly pulse with a slow rhythm.

### Temperature Shift
- Subtle color grading shift applied via post-processing
- DORMANT: Warm fluorescent yellow
- ESCALATING: Slight shift toward sickly green
- CLIMAX: Pronounced green/red tint

### "Beyond" Hallway Changes
- UNEASY: One distant light might be off (was it always off?)
- ESCALATING: Distant fluorescent hum sounds slightly detuned
- CLIMAX: No visible changes (the emptiness IS the horror)
- **Rule: Nothing physically appears in the hallways. Ever.**

---

## Debug Controls (Leva)

```typescript
useControls('Room', {
    roomWidth: { value: 6.0, min: 3, max: 20 },
    roomDepth: { value: 8.0, min: 4, max: 20 },
    roomHeight: { value: 2.74, min: 2, max: 4 },
    wallDecay: { value: 0.3, min: 0, max: 1, step: 0.01 },
    carpetWear: { value: 0.3, min: 0, max: 1, step: 0.01 },
    fogDensity: { value: 0.04, min: 0, max: 0.2, step: 0.001 },
    ambientIntensity: { value: 0.15, min: 0, max: 1, step: 0.01 },
    showBeyondHallways: true,
});
```
