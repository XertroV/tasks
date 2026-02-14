# Horror System Specification

> Part of [VCR2 Architecture Plan](./index.md)

## Overview

The horror system is an **opt-in atmospheric layer** over the documentation browser. When enabled, it orchestrates a slow-burn escalation from subtle unease to full screen corruption over time. The entity exists **only on the CRT screen** — it is a recording on the tape, watching through the display.

Horror is toggleable. When disabled, the experience is a purely atmospheric (but non-threatening) VCR documentation browser.

---

## Design Philosophy

### The Entity is a Recording
The entity doesn't exist in physical space. It exists ON the VHS tape. It was recorded there — or maybe it always was there. The CRT screen is a window into the tape, and the tape contains something that shouldn't exist.

This means:
- **No jumpscares in the room.** Nothing appears behind you. Nothing crawls out of the TV.
- **All horror is screen-mediated.** Distorted faces in the static. Messages that weren't in the documentation. Tracking errors that form shapes.
- **"Look Behind You" is always empty.** The compulsion to check, the relief of nothing, the growing suspicion that something was there a moment ago. The dread is in the anticipation.

### Slow Burn, Not Shock
Horror escalates gradually over minutes, not seconds. The user should be reading documentation, becoming absorbed, and only slowly realize something is wrong. A misplaced word. A tracking error that lingers too long. Text that seems to be addressing them directly.

---

## Horror State Machine

### States (Zustand Store)

```typescript
interface HorrorState {
    // Core state
    enabled: boolean;           // Master toggle
    phase: HorrorPhase;         // Current escalation phase
    intensity: number;          // 0-1, smoothly interpolated
    timeInPhase: number;        // Seconds spent in current phase
    totalTime: number;          // Total seconds since horror enabled

    // Trigger tracking
    triggersActivated: string[];  // List of triggered event IDs
    lastTriggerTime: number;     // Prevents trigger spam

    // Entity state
    entityVisible: boolean;      // Whether entity face is showing on screen
    entityIntensity: number;     // 0-1, entity visibility/corruption level

    // Effect overrides (for timeline engine)
    effectOverrides: Partial<VHSUniforms>;

    // Actions
    enable: () => void;
    disable: () => void;
    setPhase: (phase: HorrorPhase) => void;
    tick: (deltaTime: number) => void;
    activateTrigger: (id: string) => void;
    setEntityVisible: (visible: boolean, intensity?: number) => void;
    setEffectOverride: (key: string, value: number) => void;
    clearEffectOverrides: () => void;
}

type HorrorPhase =
    | 'DORMANT'     // 0-60s: nothing wrong, pure documentation
    | 'UNEASY'      // 60-120s: subtle wrongness, occasional glitches
    | 'ESCALATING'  // 120-180s: clear corruption, entity hints
    | 'CLIMAX'      // 180-210s: entity fully manifest on screen
    | 'POST'        // 210s+: aftermath, lingering corruption, loop option
```

### Phase Transitions

```
DORMANT ──(60s)──→ UNEASY ──(60s)──→ ESCALATING ──(60s)──→ CLIMAX ──(30s)──→ POST
                                                                                │
                                                                                ↓
                                                                        (loop or stop)
```

Phase durations are configurable via the debug panel. The times above are defaults.

**Important:** Phase transitions are NOT purely time-based. They use time as a minimum threshold but can be delayed by user activity (e.g., if the user is actively navigating docs, the system waits for a pause in activity before escalating). This prevents horror from interrupting active reading.

### Intensity Curve

```
Intensity
1.0 ┤                                              ┌──────────
    │                                          ╱────┘
0.8 ┤                                     ╱───┘
    │                                 ╱───┘
0.6 ┤                            ╱───┘
    │                       ╱───┘
0.4 ┤                  ╱───┘
    │             ╱───┘
0.2 ┤        ╱───┘
    │   ╱───┘
0.0 ├───┘
    └────┬────┬────┬────┬────┬────┬────┬────→ Time (seconds)
         0   30   60   90  120  150  180  210
         DORMANT  UNEASY    ESCALATING  CLI POST
```

Intensity is lerped smoothly (not stepped) using a configurable easing curve.

---

## Timeline Engine

### Purpose
A custom event sequencer that drives horror escalation. It's essentially a declarative timeline of "at time T, do X" events with support for randomization, conditions, and chaining.

### Architecture

```typescript
interface TimelineEvent {
    id: string;                           // Unique identifier
    time: number;                         // Trigger time (seconds from horror start)
    timeVariance?: number;                // ±random offset (seconds)
    duration?: number;                    // How long the event lasts (0 = instant)
    condition?: (state: HorrorState) => boolean;  // Optional gate
    action: (state: HorrorState) => void;        // What to do
    cleanup?: () => void;                 // Called when event duration ends
    repeat?: {                            // For recurring events
        interval: number;                 // Seconds between repeats
        count?: number;                   // Max repeats (infinite if omitted)
        intervalVariance?: number;        // ±random interval offset
    };
    priority?: number;                    // Higher priority events can interrupt lower ones
}

class TimelineEngine {
    private events: TimelineEvent[];
    private activeEvents: Map<string, ActiveEvent>;
    private elapsedTime: number;
    private paused: boolean;

    constructor(events: TimelineEvent[]) { ... }

    tick(deltaTime: number): void {
        if (this.paused) return;
        this.elapsedTime += deltaTime;

        // Check for new events to trigger
        for (const event of this.events) {
            if (this.shouldTrigger(event)) {
                this.trigger(event);
            }
        }

        // Update active events (check durations)
        for (const [id, active] of this.activeEvents) {
            if (active.elapsed >= active.duration) {
                this.cleanup(id);
            }
        }
    }

    pause(): void { this.paused = true; }
    resume(): void { this.paused = false; }
    reset(): void { this.elapsedTime = 0; this.activeEvents.clear(); }
    seek(time: number): void { ... }

    // Debug
    getState(): TimelineDebugState { ... }
}
```

### Default Horror Timeline

```typescript
// horror-timelines.ts

export const defaultTimeline: TimelineEvent[] = [
    // === DORMANT PHASE (0-60s) ===
    // Nothing happens. Pure documentation browsing.

    // === UNEASY PHASE (60-120s) ===
    {
        id: 'flicker-increase',
        time: 60,
        timeVariance: 10,
        action: (s) => s.setEffectOverride('flicker', 0.04),
        // Fluorescent lights flicker slightly more
    },
    {
        id: 'subtle-tracking',
        time: 75,
        timeVariance: 15,
        duration: 2.0,
        action: (s) => s.setEffectOverride('trackingError', 0.03),
        cleanup: () => horrorStore.getState().clearEffectOverrides(),
        repeat: { interval: 20, intervalVariance: 10, count: 3 },
        // Occasional brief tracking glitches
    },
    {
        id: 'wrong-word',
        time: 90,
        timeVariance: 15,
        duration: 3.0,
        action: (s) => {
            // Replace a random word in the current page with something wrong
            // e.g., "installation" → "WATCHING"
            // Reverts after duration
        },
        // A single word in the documentation is wrong
    },

    // === ESCALATING PHASE (120-180s) ===
    {
        id: 'tracking-waves',
        time: 120,
        action: (s) => s.setEffectOverride('trackingError', 0.08),
        // Persistent tracking error, slowly worsening
    },
    {
        id: 'static-bursts',
        time: 130,
        timeVariance: 10,
        duration: 0.5,
        action: (s) => s.setEffectOverride('staticNoise', 0.3),
        cleanup: () => horrorStore.getState().setEffectOverride('staticNoise', 0.1),
        repeat: { interval: 15, intervalVariance: 8, count: 5 },
        // Bursts of static, each stronger than the last
    },
    {
        id: 'entity-flash-1',
        time: 140,
        timeVariance: 10,
        duration: 0.15,
        action: (s) => s.setEntityVisible(true, 0.3),
        cleanup: () => horrorStore.getState().setEntityVisible(false),
        // First entity sighting: blink-and-you-miss-it face in static
    },
    {
        id: 'text-corruption',
        time: 150,
        timeVariance: 10,
        action: (s) => {
            // Several words on screen become corrupted/zalgo
            // "getting started" → "g̸e̷t̶t̴i̸n̷g̶ ̸c̷l̷o̷s̸e̶r̸"
        },
        // Documentation text starts corrupting
    },
    {
        id: 'entity-flash-2',
        time: 160,
        timeVariance: 10,
        duration: 0.4,
        action: (s) => s.setEntityVisible(true, 0.5),
        cleanup: () => horrorStore.getState().setEntityVisible(false),
        // Second sighting: longer, clearer
    },
    {
        id: 'wrong-page-content',
        time: 170,
        timeVariance: 5,
        duration: 5.0,
        action: (s) => {
            // The page content briefly changes entirely to something wrong:
            // "THE TAPE REMEMBERS / THE TAPE RECORDS / YOU HAVE BEEN HERE BEFORE"
            // Then reverts with a burst of static
        },
    },

    // === CLIMAX PHASE (180-210s) ===
    {
        id: 'entity-manifest',
        time: 180,
        duration: 20.0,
        action: (s) => {
            s.setPhase('CLIMAX');
            s.setEntityVisible(true, 0.8);
            s.setEffectOverride('trackingError', 0.3);
            s.setEffectOverride('chromaBleed', 0.4);
            s.setEffectOverride('staticNoise', 0.2);
            // Entity face dominates screen
            // Documentation text is replaced with entity messages
            // Camera may zoom in slightly on screen
        },
        cleanup: () => {
            horrorStore.getState().setPhase('POST');
        },
    },
    {
        id: 'screen-text-takeover',
        time: 185,
        action: (s) => {
            // Screen shows only entity text:
            // "I HAVE ALWAYS BEEN ON THIS TAPE"
            // "YOU PUT ME HERE WHEN YOU PRESSED PLAY"
            // "THE RECORDING IS YOU"
            // "P̶L̵A̷Y̶"
        },
    },
    {
        id: 'climax-peak',
        time: 195,
        duration: 5.0,
        action: (s) => {
            s.setEntityVisible(true, 1.0);
            s.setEffectOverride('horrorIntensity', 1.0);
            // Maximum corruption
            // Entity face fills screen
            // All text is zalgo/corrupted
        },
    },

    // === POST PHASE (210s+) ===
    {
        id: 'fade-to-black',
        time: 210,
        duration: 5.0,
        action: (s) => {
            // Gradual fade to black
            // Final message appears:
            // "THE TAPE IS ENDLESS"
            // "THE RECORDING NEVER STOPS"
            // "YOU HAVE BEEN ARCHIVED"
            // ""
            // "[PLAY]  [EJECT]"
            // Shooting PLAY restarts the horror cycle
            // Shooting EJECT disables horror and returns to normal docs
        },
    },
];
```

---

## Entity Design: "The Recording"

### Visual Manifestation (Screen Only)

The entity appears as distorted imagery ON the CRT screen. It never appears in the 3D room.

#### Forms it Takes

1. **Static Face** — A human face visible in the VHS static. Appears briefly during tracking errors. Distorted, horizontally stretched, with scan lines cutting through it. Eyes are the most recognizable feature.

2. **Corrupted Text** — Documentation text that has been replaced with entity messages. Appears in the same font (VT323) and color (phosphor green) so at first it looks like normal content. Examples:
   - Normal: "Run `backlog init` to create a new project"
   - Corrupted: "Run `backlog init` to create ǫ̷̛ n̴̰ e̵̻ w̴̝ ̸̱ r̵̦ e̸̱ c̴̡ o̴̜ r̵̦ d̸̪ i̶̧ n̶̰ g̷̱"
   - Full takeover: "THE TAPE REMEMBERS YOU"

3. **Tracking Error Shapes** — During tracking errors, the distorted horizontal bands occasionally align to form shapes: an eye, a hand, a face. This is achieved by modulating the tracking error shader to follow a pattern rather than being random.

4. **VCR Display Corruption** — The VCR timecode display shows wrong information:
   - Normal: `01:23:45:12`
   - Corrupted: `66:66:66:66` or `HE:LP:ME:--` or backwards-running timecode

5. **Channel Bleed** — Brief flashes of "another channel" bleeding through: a dark room, a figure standing still, static-filled darkness. These are pre-rendered textures that flash for 1-3 frames.

### Implementation

The entity is rendered in the **offscreen scene** (the RenderTarget that feeds the CRT screen). It's a combination of:

- **Texture overlays:** Pre-made textures (face, shapes) composited into the offscreen scene at controlled opacity
- **Text replacement:** Swapping text content in the TextLayout component
- **Shader-driven:** Some effects (tracking error shapes) are pure shader math, driven by horror uniforms

```typescript
// ScreenEntity.tsx — Conceptual structure
function ScreenEntity() {
    const { entityVisible, entityIntensity, phase } = useHorrorStore();

    if (!entityVisible) return null;

    return (
        <group>
            {/* Semi-transparent face overlay */}
            <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[screenWidth, screenHeight]} />
                <meshBasicMaterial
                    map={entityFaceTexture}
                    transparent
                    opacity={entityIntensity * 0.6}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Corrupted text fragments floating over content */}
            {phase === 'CLIMAX' && (
                <Text
                    font="/fonts/VT323-Regular.ttf"
                    color="#FF0000"
                    anchorX="center"
                    anchorY="middle"
                >
                    {getEntityMessage(phase)}
                </Text>
            )}
        </group>
    );
}
```

### Entity Face Texture

Rather than loading an image (which breaks the procedural aesthetic), the entity face is **generated procedurally on a canvas at startup**:

```typescript
function generateEntityFace(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 256);

    // Simple face using basic shapes — uncanny, not detailed
    // Two white oval eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.ellipse(90, 110, 20, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(166, 110, 20, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(90, 115, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(166, 115, 8, 0, Math.PI * 2);
    ctx.fill();

    // Mouth — slightly open, dark
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(128, 180, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add horizontal scan lines over the face
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    for (let y = 0; y < 256; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
    }

    // Add noise
    const imageData = ctx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 30;
        imageData.data[i] += noise;
        imageData.data[i + 1] += noise;
        imageData.data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}
```

This creates a deliberately crude, uncanny face — like something recorded over on a VHS tape. Not photorealistic, not cartoon. Just... wrong.

---

## Entity Messages

Stored as data, not hardcoded in components:

```typescript
// horror-timelines.ts (message data section)

export const entityMessages = {
    wrongWords: [
        'WATCHING', 'RECORDING', 'REMEMBERED', 'ARCHIVED',
        'REWOUND', 'PLAYED', 'ERASED', 'COPIED',
    ],

    textReplacements: [
        { pattern: /getting started/gi, replacement: 'g̸e̷t̶t̴i̸n̷g̶ ̸c̷l̷o̷s̸e̶r̸' },
        { pattern: /install/gi, replacement: 'ịṇṣẹṛṭ' },
        { pattern: /run/gi, replacement: 'ṛ̷ụ̷ṇ̷' },
        { pattern: /help/gi, replacement: 'H̸̱̊E̶̤̎L̵̰̈P̴̧̂' },
    ],

    screenTakeover: [
        'I HAVE ALWAYS BEEN ON THIS TAPE',
        'YOU PUT ME HERE WHEN YOU PRESSED PLAY',
        'THE RECORDING IS YOU',
        'EVERY REWIND BRINGS ME CLOSER',
        'THE TRACKING ERROR IS MY FACE',
    ],

    finalMessages: [
        'THE TAPE IS ENDLESS',
        'THE RECORDING NEVER STOPS',
        'YOU HAVE BEEN ARCHIVED',
        '',
        'P̶L̵A̷Y̶',
    ],
};
```

---

## Horror Toggle Architecture

### When Horror is Disabled

```typescript
// In HorrorController.tsx
function HorrorController() {
    const { enabled } = useHorrorStore();

    // If disabled, render nothing and don't tick the timeline
    if (!enabled) return null;

    return <HorrorEngine />;
}
```

When `enabled: false`:
1. `HorrorController` renders `null` — no entity components mount
2. Timeline engine is not created/ticked
3. All horror-related VHS uniforms stay at default (0)
4. No text corruption occurs
5. VCR display shows normal timecodes
6. The experience is a pure atmospheric documentation browser

### Toggle Mechanism

Horror is controlled via:
- **Settings menu:** Checkbox "Enable atmospheric horror effects"
- **URL parameter:** `?horror=false` disables horror (for embedding/sharing)
- **Keyboard shortcut:** `H` toggles horror (development convenience)
- **Default:** Horror is ON (but user can disable at any time)

When toggling OFF mid-sequence:
1. All horror effects fade out over 1 second (not instant cut)
2. Any corrupted text reverts to normal
3. Entity fades from screen
4. VHS uniforms smoothly return to defaults
5. Timeline resets

When toggling ON:
1. Timer resets to 0 (DORMANT phase)
2. Horror begins fresh escalation

---

## Interaction with "Look Behind You"

The "Look Behind You" mechanic interacts with horror in a specific way:

### Horror Disabled
- Looking behind shows the Backrooms hallways stretching into fog
- Fluorescent lights flicker naturally
- Empty, atmospheric, slightly unsettling but not threatening

### Horror Enabled (any phase)
- **Same empty hallways.** Nothing is ever there.
- During ESCALATING phase: one of the distant fluorescent lights MIGHT flicker off and not come back on (or was it always off?)
- During CLIMAX phase: the fluorescent hum from behind might sound subtly wrong (slightly detuned frequency) but there's nothing visible
- The entity is on the SCREEN. When you look behind you, you're looking away from the screen. The horror is that you know it's still there, on the screen, behind you now.

### Design Rule
**NOTHING visible ever appears in the hallways.** The moment something physical appears, the "Look Behind You" mechanic loses its power. The dread of emptiness is more effective than any monster.

---

## Debug Panel: Horror Section

```
┌─ Horror System ─────────────────────────┐
│ Enabled:     [✓]                        │
│ Phase:       ESCALATING                 │
│ Intensity:   ████████░░ 0.42            │
│ Time:        142.3s (in phase: 22.3s)   │
│ Entity:      Hidden (last: 4.1s ago)    │
│                                         │
│ Timeline Events:                        │
│  ✓ flicker-increase    @ 60s            │
│  ✓ subtle-tracking     @ 75s  (x2/3)   │
│  ✓ wrong-word          @ 92s            │
│  ✓ tracking-waves      @ 120s           │
│  ► static-bursts       @ 133s (x1/5)   │
│  ○ entity-flash-1      @ ~145s          │
│  ○ text-corruption     @ ~155s          │
│  ○ entity-flash-2      @ ~165s          │
│  ○ wrong-page-content  @ ~172s          │
│  ○ entity-manifest     @ 180s           │
│  ○ ...                                  │
│                                         │
│ [Skip to Phase ▼] [Reset] [Force Event] │
└─────────────────────────────────────────┘
```

This panel allows developers to:
- Jump to any horror phase instantly
- Manually trigger any timeline event
- See upcoming events and their estimated trigger times
- Monitor entity visibility state
- Reset the horror sequence

---

## Performance Impact

The horror system is lightweight:
- **Timeline Engine:** Simple array iteration + time comparison. Negligible CPU.
- **State Updates:** Zustand store updates only on phase changes and event triggers (not every frame). Effect overrides update shader uniforms via refs, not state.
- **Entity Rendering:** Only adds geometry to the offscreen scene when visible. A single textured plane + text. No additional draw calls on the main scene.
- **Shader Modulation:** Horror just changes uniform values — the shader runs the same code regardless of horror state. The branch for `uHorrorIntensity < 0.01` early-exits the corruption function when horror is off.
