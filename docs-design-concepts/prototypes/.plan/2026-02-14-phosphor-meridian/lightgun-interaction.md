# Lightgun & Interaction Specification

> Part of [VCR2 Architecture Plan](./index.md)

## Overview

The NES Zapper lightgun is the primary interaction device. It replaces the mouse cursor entirely. The user aims by moving the mouse and "shoots" by clicking. A 3D model of the Zapper is visible in first-person view (bottom-right, like an FPS weapon). Raycasting determines what the user is aiming at — links on the CRT screen, VCR buttons, or the post-it notes.

---

## 3D Zapper Model

### Physical Specifications (Matching Real NES Zapper)

```
Total length:  28cm
Barrel length: 18cm
Grip length:   12cm
Barrel diameter: 3cm

Colors:
- Barrel:        #E85D04 (Nintendo Orange)
- Grip:          #1A1A1A (Black)
- Trigger:       #4A4A4A (Dark Gray)
- Trigger Guard: #333333
- Barrel Tip:    #3A3A3A (Dark Gray muzzle)
- Cable:         #111111 (Black, trailing from grip to VCR)
```

### Geometry Hierarchy

```typescript
function ZapperModel() {
    return (
        <group>
            {/* Barrel — main orange cylinder */}
            <mesh position={[0, 0, -0.09]}>
                <cylinderGeometry args={[0.015, 0.018, 0.18, 12]} />
                <meshStandardMaterial color="#E85D04" roughness={0.4} metalness={0.1} />
            </mesh>

            {/* Barrel Tip — dark gray ring at muzzle end */}
            <mesh position={[0, 0, -0.18]}>
                <cylinderGeometry args={[0.019, 0.019, 0.01, 12]} />
                <meshStandardMaterial color="#3A3A3A" roughness={0.6} />
            </mesh>

            {/* Barrel Sight — small raised ridge on top */}
            <mesh position={[0, 0.018, -0.12]}>
                <boxGeometry args={[0.004, 0.006, 0.04]} />
                <meshStandardMaterial color="#E85D04" roughness={0.4} />
            </mesh>

            {/* Grip — black, angled downward */}
            <group rotation={[0.4, 0, 0]} position={[0, -0.04, 0.02]}>
                <mesh>
                    <boxGeometry args={[0.028, 0.10, 0.03]} />
                    <meshStandardMaterial color="#1A1A1A" roughness={0.7} />
                </mesh>

                {/* Grip Texture (subtle ridges) */}
                <mesh position={[0, -0.02, 0.016]}>
                    <boxGeometry args={[0.024, 0.06, 0.002]} />
                    <meshStandardMaterial color="#222222" roughness={0.9} />
                </mesh>
            </group>

            {/* Trigger Guard — curved piece around trigger */}
            <mesh position={[0, -0.02, -0.01]}>
                <torusGeometry args={[0.02, 0.003, 8, 12, Math.PI]} />
                <meshStandardMaterial color="#333333" roughness={0.6} />
            </mesh>

            {/* Trigger — small piece inside guard */}
            <mesh position={[0, -0.015, -0.01]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.008, 0.015, 0.004]} />
                <meshStandardMaterial color="#4A4A4A" roughness={0.5} />
            </mesh>

            {/* Cable — black cord trailing from grip bottom */}
            <CableGeometry
                start={[0, -0.09, 0.02]}
                end={[0.3, -0.5, 0.5]}
                thickness={0.004}
                color="#111111"
                segments={12}
            />
        </group>
    );
}
```

### Cable Geometry

The cable connects the Zapper grip to the VCR deck. It uses a catenary curve (hanging cable shape):

```typescript
function CableGeometry({
    start, end, thickness, color, segments
}: CableGeometryProps) {
    const points = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = start[0] + (end[0] - start[0]) * t;
            const z = start[2] + (end[2] - start[2]) * t;
            // Catenary sag
            const sag = Math.cosh((t - 0.5) * 3) / Math.cosh(1.5) - 1;
            const y = start[1] + (end[1] - start[1]) * t + sag * 0.15;
            pts.push(new THREE.Vector3(x, y, z));
        }
        return pts;
    }, [start, end, segments]);

    return (
        <mesh>
            <tubeGeometry args={[
                new THREE.CatmullRomCurve3(points),
                segments,
                thickness,
                6,
                false
            ]} />
            <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
    );
}
```

Note: The cable doesn't need physics simulation. A static catenary curve with subtle sway (sinusoidal offset on Y) during firing recoil is sufficient.

---

## Weapon Camera System

The Zapper is rendered on a **separate camera layer** to prevent clipping with world geometry (the gun is very close to the camera):

```typescript
function ZapperController() {
    const weaponCameraRef = useRef<THREE.PerspectiveCamera>(null);
    const zapperGroupRef = useRef<THREE.Group>(null);

    // Weapon sits at a fixed offset from camera
    const weaponOffset = useMemo(() => ({
        position: new THREE.Vector3(0.25, -0.15, -0.3), // Bottom-right
        rotation: new THREE.Euler(0, 0, 0),
    }), []);

    useFrame(({ camera, mouse }) => {
        if (!zapperGroupRef.current) return;

        // Position weapon relative to main camera
        const pos = camera.localToWorld(weaponOffset.position.clone());
        zapperGroupRef.current.position.copy(pos);
        zapperGroupRef.current.quaternion.copy(camera.quaternion);

        // Subtle aim sway based on mouse movement
        const swayX = mouse.x * 0.02;
        const swayY = mouse.y * 0.01;
        zapperGroupRef.current.rotation.y += swayX;
        zapperGroupRef.current.rotation.x += swayY;

        // Apply recoil animation (if firing)
        applyRecoil(zapperGroupRef.current);
    });

    return (
        <group ref={zapperGroupRef} layers={1}>
            <ZapperModel />
        </group>
    );
}
```

### Layer Setup

```typescript
// In Scene setup:
// Layer 0: World (room, TV, VCR, etc.)
// Layer 1: Weapon (Zapper only)

// Main camera sees both layers
camera.layers.enable(0);
camera.layers.enable(1);

// Weapon camera renders layer 1 on top with no depth clearing
// This prevents the gun from clipping into nearby surfaces
```

Implementation note: In R3F, this may be handled via `@react-three/drei`'s `<View>` or a custom render loop that renders the weapon group last with depth buffer cleared. The exact approach should be determined during implementation.

---

## Aiming System

### Mouse → World Ray

The aiming system converts mouse position to a world-space ray for hit detection:

```typescript
class AimingSystem {
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private targets: Map<THREE.Object3D, TargetCallbacks> = new Map();
    private currentTarget: THREE.Object3D | null = null;

    updateMouse(event: MouseEvent, domElement: HTMLElement) {
        this.mouse.x = (event.clientX / domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / domElement.clientHeight) * 2 + 1;
    }

    update(camera: THREE.Camera) {
        this.raycaster.setFromCamera(this.mouse, camera);

        // Test against all registered targets
        const meshes = Array.from(this.targets.keys());
        const intersects = this.raycaster.intersectObjects(meshes, false);

        const newTarget = intersects.length > 0 ? intersects[0].object : null;

        // Handle target transitions
        if (newTarget !== this.currentTarget) {
            if (this.currentTarget) {
                this.targets.get(this.currentTarget)?.onUntarget?.();
            }
            if (newTarget && this.targets.has(newTarget)) {
                this.targets.get(newTarget)?.onTarget?.();
            }
            this.currentTarget = newTarget;
        }
    }

    shoot(): ShootResult {
        if (this.currentTarget && this.targets.has(this.currentTarget)) {
            this.targets.get(this.currentTarget)?.onShoot?.();
            return { hit: true, target: this.currentTarget };
        }
        return { hit: false, target: null };
    }

    registerTarget(mesh: THREE.Object3D, callbacks: TargetCallbacks) {
        this.targets.set(mesh, callbacks);
    }

    unregisterTarget(mesh: THREE.Object3D) {
        this.targets.delete(mesh);
        if (this.currentTarget === mesh) {
            this.currentTarget = null;
        }
    }
}

interface TargetCallbacks {
    onTarget?: () => void;
    onUntarget?: () => void;
    onShoot?: () => void;
}

interface ShootResult {
    hit: boolean;
    target: THREE.Object3D | null;
}
```

### Important: CRT Screen Raycasting

Links displayed on the CRT screen are rendered inside a `RenderTarget` (offscreen scene). The raycaster can't directly hit objects in the offscreen scene. Two approaches:

**Approach A: Proxy Meshes (Recommended)**
Place invisible proxy meshes in the main scene at the positions where links appear on the CRT screen. These proxies map screen-space link positions to world-space raycaster targets.

```typescript
// When a page is displayed, compute world-space positions for each link
function computeLinkWorldPositions(
    links: ParsedLine[],
    screenMesh: THREE.Mesh, // The CRT screen quad in world space
    screenUVs: { width: number; height: number },
): THREE.Vector3[] {
    // Map each link's position in screen-space (UV) to world-space
    // by projecting onto the screen mesh's surface
}
```

**Approach B: UV Mapping**
When the raycaster hits the CRT screen mesh, read the UV coordinates of the hit point, then check if those UVs correspond to a link's bounding box in the offscreen scene.

```typescript
// On screen hit:
const hit = intersects[0];
const uv = hit.uv; // UV of the hit point on the screen quad
// Check which link (if any) occupies this UV region
const link = findLinkAtUV(uv, currentPage.links, screenLayout);
```

Approach B is simpler and doesn't require keeping proxy meshes in sync with screen content. **Use Approach B.**

---

## Crosshair

A minimal crosshair rendered as a 2D overlay (DOM, not 3D) for precise aiming:

```typescript
function Crosshair() {
    const { cursorState } = useAimingStore();

    const colors = {
        idle: '#33FF33',
        targeting: '#00FFFF',
        firing: '#FFFF00',
        miss: '#FF8800',
    };

    const color = colors[cursorState];

    return (
        <div
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 1000,
            }}
        >
            <svg width="24" height="24" viewBox="-12 -12 24 24">
                {/* Center dot */}
                <circle r="2" fill={color} />
                {/* Crosshair lines */}
                <line x1="-8" y1="0" x2="-4" y2="0" stroke={color} strokeWidth="1.5" />
                <line x1="4" y1="0" x2="8" y2="0" stroke={color} strokeWidth="1.5" />
                <line x1="0" y1="-8" x2="0" y2="-4" stroke={color} strokeWidth="1.5" />
                <line x1="0" y1="4" x2="0" y2="8" stroke={color} strokeWidth="1.5" />
            </svg>
        </div>
    );
}
```

The native cursor is hidden when the lightgun is active:

```css
.lightgun-active {
    cursor: none;
}
```

---

## Cursor States

| State | Color | Visual | Trigger |
|-------|-------|--------|---------|
| **Idle** | `#33FF33` (green) | Static crosshair, subtle glow | Default — aiming at nothing interactive |
| **Targeting** | `#00FFFF` (cyan) | Crosshair pulses (scale 1.0→1.2, 500ms loop) | Aiming at a shootable target |
| **Firing** | `#FFFF00` (yellow) | Brief burst (scale 1.5→1.0, 100ms) | Click/fire |
| **Miss** | `#FF8800` (orange) | Horizontal shake (±4px, 200ms) | Shot fired, hit nothing shootable |

State transitions:

```
IDLE ──(aim at target)──→ TARGETING ──(click)──→ FIRING ──(100ms)──→ IDLE/TARGETING
  │                           │                                            
  └──────(click)──────→ FIRING ──(100ms)──→ MISS ──(200ms)──→ IDLE
```

---

## Shooting Mechanics

### Fire Event Flow

```
1. User clicks (mousedown)
2. AimingSystem.shoot() called
3. IF hit a shootable target:
   a. Cursor → FIRING state (100ms)
   b. Play lightgun shot sound (ProceduralSynth)
   c. Zapper recoil animation (kick-back + return, 200ms)
   d. Muzzle flash (point light burst at barrel tip, 50ms)
   e. Target.onShoot() callback fires
   f. Screen flash effect (brief white flash on CRT, 100ms)
   g. Cursor returns to TARGETING (if still over target) or IDLE
4. IF missed (no target hit):
   a. Cursor → FIRING → MISS state
   b. Play lightgun shot sound
   c. Zapper recoil animation
   d. Muzzle flash
   e. NO screen flash, NO navigation
   f. Cursor returns to IDLE after 200ms
```

### Recoil Animation

```typescript
function applyRecoil(group: THREE.Group) {
    // Called every frame from useFrame
    // Uses refs for recoil state (no React state)

    if (recoilRef.current > 0) {
        // Kick back
        const t = recoilRef.current;
        const kickBack = Math.sin(t * Math.PI) * 0.02;  // Z offset
        const kickUp = Math.sin(t * Math.PI) * 0.01;    // Y offset (barrel rises)

        group.position.z += kickBack;
        group.position.y += kickUp;

        // Decay
        recoilRef.current -= 0.05; // ~200ms at 60fps
        if (recoilRef.current < 0) recoilRef.current = 0;
    }
}

// Triggered on shoot:
function triggerRecoil() {
    recoilRef.current = 1.0;
}
```

### Muzzle Flash

```typescript
function MuzzleFlash() {
    const lightRef = useRef<THREE.PointLight>(null);
    const flashRef = useRef(0);

    useFrame(() => {
        if (flashRef.current > 0) {
            if (lightRef.current) {
                lightRef.current.intensity = flashRef.current * 3.0;
            }
            flashRef.current -= 0.15; // ~50ms decay
            if (flashRef.current < 0) flashRef.current = 0;
        }
    });

    return (
        <pointLight
            ref={lightRef}
            color="#FFFF00"
            intensity={0}
            distance={1}
            decay={2}
            position={[0, 0, -0.19]} // At barrel tip
        />
    );
}

// Triggered on shoot:
function triggerMuzzleFlash() {
    flashRef.current = 1.0;
}
```

---

## Shootable Targets

### Types of Shootable Things

| Target | Location | Action |
|--------|----------|--------|
| **Documentation links** | CRT screen | Navigate to linked page (FF/REW) |
| **Menu items** | CRT screen | Navigate to section |
| **"PREV" / "NEXT"** | CRT screen | Sequential navigation |
| **"MENU"** | CRT screen | Return to main menu (rewind to start) |
| **"MORE ▼" / "TOP ▲"** | CRT screen | Scroll within page |
| **VCR PLAY button** | VCR deck (3D) | Set VCR to PLAY |
| **VCR STOP button** | VCR deck (3D) | Set VCR to STOP |
| **VCR FF button** | VCR deck (3D) | Fast-forward (advance to next page) |
| **VCR REW button** | VCR deck (3D) | Rewind (go to previous page) |
| **VCR EJECT button** | VCR deck (3D) | Eject tape (return to title screen) |
| **"LOOK BEHIND YOU" post-it** | TV bezel (3D) | Rotate camera 180° |
| **"LOOK AT SCREEN" post-it** | Floating (3D) | Rotate camera back to TV |
| **"PLAY" (post-horror)** | CRT screen | Restart horror cycle |
| **"EJECT" (post-horror)** | CRT screen | Disable horror, return to docs |
| **"SKIP" (boot sequence)** | Post-it note | Skip boot sequence on repeat visits |

### Visual Feedback on Targeting

When the crosshair is over a shootable target:
- **CRT screen targets:** Text highlights (green → white), prefix arrow appears (`► link text`)
- **VCR buttons:** Button appears to depress slightly (translateZ), subtle glow
- **Post-it notes:** Paper appears to lift slightly, shadow increases

---

## Keyboard Navigation (Accessibility)

For users who can't or don't want to use the lightgun:

| Key | Action |
|-----|--------|
| `Tab` | Cycle focus to next shootable target |
| `Shift+Tab` | Cycle focus to previous target |
| `Enter` / `Space` | "Shoot" the focused target |
| `←` / `→` | Previous / Next page (sequential) |
| `↑` / `↓` | Scroll within page |
| `Escape` | Return to menu |
| `B` | Toggle "Look Behind You" |
| `M` | Go to menu (rewind) |

When Tab focus is active:
- The focused target gets the TARGETING visual state (cyan highlight)
- The crosshair moves to the focused target's position
- All shooting effects still play (sound, recoil, flash)

---

## Pointer Lock Consideration

The project does NOT use Pointer Lock (unlike FPS games). Reasons:
- The mouse controls a visible crosshair, not camera rotation
- Users need to be able to move the cursor to the browser's UI (tabs, address bar)
- Pointer Lock is disorienting for a documentation browser
- The native cursor is simply hidden via CSS, replaced by the crosshair overlay

If "Look Behind You" were to allow free-look, Pointer Lock could be considered for that mode only. But since it's a fixed-angle view, it's not needed.

---

## Performance

- **Raycasting:** 1 raycast per frame against ~20-30 registered targets. Negligible cost.
- **Zapper model:** ~200 vertices (simple geometric primitives). Negligible.
- **Cable:** ~150 vertices (tube geometry). Negligible.
- **Crosshair:** DOM element, no 3D cost.
- **Recoil/flash:** Ref-based animations, no React re-renders.

---

## Debug Controls

```typescript
useControls('Lightgun', {
    showZapper: true,
    showCrosshair: true,
    showCable: true,
    zapperScale: { value: 1.0, min: 0.5, max: 2.0 },
    zapperOffsetX: { value: 0.25, min: -0.5, max: 0.5, step: 0.01 },
    zapperOffsetY: { value: -0.15, min: -0.5, max: 0.5, step: 0.01 },
    zapperOffsetZ: { value: -0.3, min: -0.5, max: 0.1, step: 0.01 },
    recoilStrength: { value: 1.0, min: 0, max: 3 },
    muzzleFlashIntensity: { value: 3.0, min: 0, max: 10 },
    showHitboxes: false, // Show raycaster debug lines + target bounding boxes
});
```
