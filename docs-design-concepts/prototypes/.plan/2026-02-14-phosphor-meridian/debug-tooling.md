# Debug & Development Tooling Specification

> Part of [VCR2 Architecture Plan](./index.md)

## Overview

Debug tooling is a **first-class system**, not an afterthought. Every module exposes its internal state to a unified debug panel. Shader uniforms are Leva-controllable. The horror timeline is visualizable. All debug code is tree-shaken in production builds.

---

## Architecture

```
┌─ Debug Layer ──────────────────────────────────────────┐
│                                                        │
│  ┌─ Leva Controls ──────────────────────────────────┐  │
│  │  Real-time parameter tuning for:                  │  │
│  │  - VHS shader uniforms                            │  │
│  │  - CRT shader uniforms                            │  │
│  │  - Room/lighting parameters                       │  │
│  │  - Lightgun position/scale                        │  │
│  │  - Camera position/FOV                            │  │
│  │  - Fog density/color                              │  │
│  │  Native Leva GUI (top-right corner)               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Debug Overlay Panel ────────────────────────────┐  │
│  │  Custom DOM overlay (bottom-left corner):         │  │
│  │  - FPS / frame time                               │  │
│  │  - Draw calls / triangles / textures              │  │
│  │  - VCR state machine status                       │  │
│  │  - Navigation state                               │  │
│  │  - Horror phase / intensity                       │  │
│  │  - Audio engine status                            │  │
│  │  - Active effect list                             │  │
│  │  Toggle: backtick (`) key                         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Timeline Visualizer ────────────────────────────┐  │
│  │  Horror timeline visualization (bottom panel):    │  │
│  │  - Horizontal timeline bar                        │  │
│  │  - Event markers (past/current/future)            │  │
│  │  - Phase regions (colored bands)                  │  │
│  │  - Intensity graph overlay                        │  │
│  │  - Playback controls (skip, reset, force event)   │  │
│  │  Toggle: Shift+` key                              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Visual Debug Aids ──────────────────────────────┐  │
│  │  In-scene debug rendering:                        │  │
│  │  - Raycaster debug line (red line from camera)    │  │
│  │  - Shootable target bounding boxes (wireframe)    │  │
│  │  - Light helper visualizations                    │  │
│  │  - Camera frustum visualization                   │  │
│  │  - Grid overlay                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Debug Store (Zustand)

```typescript
interface DebugState {
    // Visibility
    showDebugPanel: boolean;
    showTimeline: boolean;
    showHitboxes: boolean;
    showRaycastLine: boolean;
    showLightHelpers: boolean;
    showGrid: boolean;

    // Performance metrics (updated every frame via ref, read by panel at lower rate)
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    textureCount: number;
    memoryUsed: number;         // MB

    // System states (mirrored for display)
    vcrState: string;
    navigationState: string;
    horrorPhase: string;
    horrorIntensity: number;
    tapePosition: number;
    currentPageId: string;
    audioInitialized: boolean;
    activeEffects: string[];

    // Actions
    toggleDebugPanel: () => void;
    toggleTimeline: () => void;
    toggleHitboxes: () => void;
    updateMetrics: (metrics: Partial<DebugMetrics>) => void;
}
```

---

## Leva Controls Organization

Leva controls are organized into collapsible folders:

```typescript
// LevaControls.tsx

// ----- VHS Effects -----
const vhsControls = useControls('VHS Effects', {
    trackingError:   { value: 0.0,  min: 0, max: 1,   step: 0.01 },
    headSwitchNoise: { value: 0.3,  min: 0, max: 1,   step: 0.01 },
    chromaBleed:     { value: 0.15, min: 0, max: 1,   step: 0.01 },
    dropoutRate:     { value: 0.02, min: 0, max: 0.2, step: 0.001 },
    staticNoise:     { value: 0.05, min: 0, max: 0.5, step: 0.01 },
    pauseJitter:     { value: 0.0,  min: 0, max: 1,   step: 0.01 },
    ffSpeed:         { value: 0.0,  min: 0, max: 1,   step: 0.01 },
    rewSpeed:        { value: 0.0,  min: 0, max: 1,   step: 0.01 },
    horrorIntensity: { value: 0.0,  min: 0, max: 1,   step: 0.01 },
});

// ----- CRT Display -----
const crtControls = useControls('CRT Display', {
    curvature:         { value: 0.15, min: 0,   max: 0.5,  step: 0.01 },
    scanlineIntensity: { value: 0.3,  min: 0,   max: 1,    step: 0.01 },
    scanlineCount:     { value: 900,  min: 100, max: 2000, step: 10 },
    phosphorIntensity: { value: 0.2,  min: 0,   max: 1,    step: 0.01 },
    vignetteStrength:  { value: 0.4,  min: 0,   max: 1,    step: 0.01 },
    flicker:           { value: 0.02, min: 0,   max: 0.1,  step: 0.001 },
    brightness:        { value: 1.0,  min: 0.5, max: 1.5,  step: 0.01 },
});

// ----- Room -----
const roomControls = useControls('Room', {
    wallDecay:         { value: 0.3,  min: 0, max: 1,   step: 0.01 },
    carpetWear:        { value: 0.3,  min: 0, max: 1,   step: 0.01 },
    fogDensity:        { value: 0.04, min: 0, max: 0.2, step: 0.001 },
    ambientIntensity:  { value: 0.15, min: 0, max: 1,   step: 0.01 },
    fluorescentPower:  { value: 2.0,  min: 0, max: 5,   step: 0.1 },
    showBeyondHallways: true,
    breathIntensity:   { value: 0.0,  min: 0, max: 0.1, step: 0.001 },
});

// ----- Camera -----
const cameraControls = useControls('Camera', {
    posX: { value: 0,    min: -5,  max: 5,  step: 0.1 },
    posY: { value: 1.2,  min: 0.5, max: 2.5, step: 0.1 },
    posZ: { value: -2.0, min: -5,  max: 3,  step: 0.1 },
    fov:  { value: 60,   min: 30,  max: 100, step: 1 },
    targetX: { value: 0,    min: -3, max: 3,  step: 0.1 },
    targetY: { value: 0.9,  min: 0,  max: 2,  step: 0.1 },
    targetZ: { value: -5.8, min: -7, max: 0,  step: 0.1 },
});

// ----- Lightgun -----
const lightgunControls = useControls('Lightgun', {
    showZapper:     true,
    showCrosshair:  true,
    showCable:      true,
    zapperScale:    { value: 1.0, min: 0.5, max: 2.0, step: 0.1 },
    recoilStrength: { value: 1.0, min: 0,   max: 3,   step: 0.1 },
    showHitboxes:   false,
});

// ----- Horror -----
const horrorControls = useControls('Horror', {
    enabled:          true,
    forcePhase:       { options: ['auto', 'DORMANT', 'UNEASY', 'ESCALATING', 'CLIMAX', 'POST'] },
    forceIntensity:   { value: -1, min: -1, max: 1, step: 0.01 },  // -1 = auto
    timeScale:        { value: 1.0, min: 0.1, max: 10, step: 0.1 },
    showEntityAlways: false,
});

// ----- Audio -----
const audioControls = useControls('Audio', {
    masterVolume:  { value: 1.0, min: 0, max: 1, step: 0.01 },
    sfxVolume:     { value: 1.0, min: 0, max: 1, step: 0.01 },
    ambientVolume: { value: 1.0, min: 0, max: 1, step: 0.01 },
    muted:         false,
});
```

---

## Debug Overlay Panel

A React component rendered as a DOM overlay (not in the 3D scene):

```typescript
function DebugPanel() {
    const debugState = useDebugStore();
    const vcrState = useVCRStore((s) => s.state);
    const horrorState = useHorrorStore();
    const navState = useNavigationStore();

    if (!debugState.showDebugPanel) return null;

    return (
        <div className="debug-panel">
            <section className="debug-section">
                <h3>Performance</h3>
                <div className="debug-row">
                    <span>FPS:</span>
                    <span className={debugState.fps < 55 ? 'warn' : ''}>
                        {debugState.fps.toFixed(0)}
                    </span>
                </div>
                <div className="debug-row">
                    <span>Frame:</span>
                    <span>{debugState.frameTime.toFixed(1)}ms</span>
                </div>
                <div className="debug-row">
                    <span>Draw Calls:</span>
                    <span className={debugState.drawCalls > 50 ? 'warn' : ''}>
                        {debugState.drawCalls}
                    </span>
                </div>
                <div className="debug-row">
                    <span>Triangles:</span>
                    <span>{debugState.triangles.toLocaleString()}</span>
                </div>
                <div className="debug-row">
                    <span>Memory:</span>
                    <span>{debugState.memoryUsed.toFixed(0)}MB</span>
                </div>
            </section>

            <section className="debug-section">
                <h3>VCR</h3>
                <div className="debug-row">
                    <span>State:</span>
                    <span className="debug-state">{vcrState}</span>
                </div>
                <div className="debug-row">
                    <span>Tape Position:</span>
                    <span>{formatTimecode(navState.currentTapePosition)}</span>
                </div>
                <div className="debug-row">
                    <span>Page:</span>
                    <span>{navState.currentPageId}</span>
                </div>
                <div className="debug-row">
                    <span>Transition:</span>
                    <span>{navState.transitionState}</span>
                </div>
            </section>

            <section className="debug-section">
                <h3>Horror</h3>
                <div className="debug-row">
                    <span>Enabled:</span>
                    <span>{horrorState.enabled ? 'YES' : 'NO'}</span>
                </div>
                <div className="debug-row">
                    <span>Phase:</span>
                    <span className={`horror-phase-${horrorState.phase.toLowerCase()}`}>
                        {horrorState.phase}
                    </span>
                </div>
                <div className="debug-row">
                    <span>Intensity:</span>
                    <ProgressBar value={horrorState.intensity} />
                </div>
                <div className="debug-row">
                    <span>Time:</span>
                    <span>{horrorState.totalTime.toFixed(1)}s</span>
                </div>
                <div className="debug-row">
                    <span>Entity:</span>
                    <span>{horrorState.entityVisible ? 'VISIBLE' : 'hidden'}</span>
                </div>
            </section>

            <section className="debug-section">
                <h3>Active Effects</h3>
                <ul className="debug-effects-list">
                    {debugState.activeEffects.map((effect) => (
                        <li key={effect}>{effect}</li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
```

### Styling

```css
.debug-panel {
    position: fixed;
    bottom: 10px;
    left: 10px;
    width: 280px;
    max-height: 80vh;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.85);
    color: #33FF33;
    font-family: 'VT323', monospace;
    font-size: 14px;
    padding: 12px;
    border: 1px solid #33FF33;
    border-radius: 4px;
    z-index: 10000;
    pointer-events: auto;
}

.debug-section {
    margin-bottom: 12px;
    border-bottom: 1px solid #1a5c1a;
    padding-bottom: 8px;
}

.debug-section h3 {
    color: #00FFFF;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
}

.debug-row {
    display: flex;
    justify-content: space-between;
    padding: 1px 0;
}

.debug-row .warn {
    color: #FF8800;
}

.debug-state {
    background: #1a3a1a;
    padding: 0 4px;
    border-radius: 2px;
}

.horror-phase-dormant    { color: #33FF33; }
.horror-phase-uneasy     { color: #FFAA00; }
.horror-phase-escalating { color: #FF8800; }
.horror-phase-climax     { color: #FF0000; }
.horror-phase-post       { color: #880000; }
```

---

## Performance Metrics Collection

Metrics are read from the Three.js renderer info object:

```typescript
// In a useFrame callback (runs every frame but updates store at lower rate)
let metricsAccumulator = 0;
const METRICS_UPDATE_INTERVAL = 0.25; // 4 times per second

useFrame(({ gl, clock }, delta) => {
    metricsAccumulator += delta;

    if (metricsAccumulator >= METRICS_UPDATE_INTERVAL) {
        metricsAccumulator = 0;

        const info = gl.info;
        debugStore.getState().updateMetrics({
            fps: 1 / delta,
            frameTime: delta * 1000,
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            textureCount: info.memory.textures,
            memoryUsed: performance.memory
                ? performance.memory.usedJSHeapSize / 1048576
                : 0,
        });

        // Reset Three.js render info for next interval
        info.reset();
    }
});
```

---

## Timeline Visualizer

A horizontal timeline bar showing the horror sequence:

```typescript
function TimelineVisualizer() {
    const { showTimeline } = useDebugStore();
    const horrorState = useHorrorStore();
    const timeline = useTimelineEngine();

    if (!showTimeline) return null;

    const totalDuration = 240; // Total horror timeline in seconds
    const timeProgress = horrorState.totalTime / totalDuration;

    return (
        <div className="timeline-visualizer">
            {/* Phase bands */}
            <div className="timeline-phases">
                <div className="phase dormant"   style={{ width: '25%' }}>DORMANT</div>
                <div className="phase uneasy"    style={{ width: '25%' }}>UNEASY</div>
                <div className="phase escalating" style={{ width: '25%' }}>ESCALATING</div>
                <div className="phase climax"    style={{ width: '12.5%' }}>CLIMAX</div>
                <div className="phase post"      style={{ width: '12.5%' }}>POST</div>
            </div>

            {/* Event markers */}
            <div className="timeline-events">
                {timeline.events.map((event) => {
                    const position = (event.time / totalDuration) * 100;
                    const status = timeline.getEventStatus(event.id);
                    return (
                        <div
                            key={event.id}
                            className={`event-marker ${status}`}
                            style={{ left: `${position}%` }}
                            title={`${event.id} @ ${event.time}s`}
                            onClick={() => timeline.forceEvent(event.id)}
                        />
                    );
                })}
            </div>

            {/* Playhead */}
            <div
                className="timeline-playhead"
                style={{ left: `${timeProgress * 100}%` }}
            />

            {/* Intensity graph */}
            <div className="timeline-intensity">
                <canvas ref={intensityCanvasRef} width={800} height={40} />
            </div>

            {/* Controls */}
            <div className="timeline-controls">
                <button onClick={() => horrorStore.getState().setPhase('DORMANT')}>
                    Reset
                </button>
                <button onClick={() => horrorStore.getState().setPhase('UNEASY')}>
                    → Uneasy
                </button>
                <button onClick={() => horrorStore.getState().setPhase('ESCALATING')}>
                    → Escalating
                </button>
                <button onClick={() => horrorStore.getState().setPhase('CLIMAX')}>
                    → Climax
                </button>
                <button onClick={() => horrorStore.getState().setPhase('POST')}>
                    → Post
                </button>
                <label>
                    Speed:
                    <input
                        type="range"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={horrorControls.timeScale}
                        onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                    />
                    {horrorControls.timeScale}x
                </label>
            </div>
        </div>
    );
}
```

### Timeline Visualizer Styling

```css
.timeline-visualizer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 120px;
    background: rgba(0, 0, 0, 0.9);
    border-top: 1px solid #33FF33;
    font-family: 'VT323', monospace;
    color: #33FF33;
    z-index: 10001;
    padding: 8px 16px;
}

.timeline-phases {
    display: flex;
    height: 20px;
    margin-bottom: 4px;
}

.timeline-phases .phase {
    text-align: center;
    font-size: 10px;
    line-height: 20px;
    border-right: 1px solid #333;
}

.phase.dormant    { background: rgba(51, 255, 51, 0.1); }
.phase.uneasy     { background: rgba(255, 170, 0, 0.1); }
.phase.escalating { background: rgba(255, 136, 0, 0.15); }
.phase.climax     { background: rgba(255, 0, 0, 0.2); }
.phase.post       { background: rgba(136, 0, 0, 0.15); }

.timeline-events {
    position: relative;
    height: 20px;
    border: 1px solid #1a5c1a;
    margin-bottom: 4px;
}

.event-marker {
    position: absolute;
    width: 6px;
    height: 16px;
    top: 2px;
    transform: translateX(-50%);
    cursor: pointer;
}

.event-marker.completed { background: #33FF33; }
.event-marker.active    { background: #FFFF00; animation: pulse 0.5s infinite; }
.event-marker.pending   { background: #444; }

.timeline-playhead {
    position: absolute;
    width: 2px;
    height: 60px;
    background: #FF0000;
    top: 28px;
    z-index: 1;
}

.timeline-controls {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 4px;
}

.timeline-controls button {
    background: #1a3a1a;
    color: #33FF33;
    border: 1px solid #33FF33;
    padding: 2px 8px;
    cursor: pointer;
    font-family: 'VT323', monospace;
    font-size: 12px;
}

.timeline-controls button:hover {
    background: #33FF33;
    color: #000;
}
```

---

## Hotkey Map

| Key | Action | Context |
|-----|--------|---------|
| `` ` `` (backtick) | Toggle debug panel | Global |
| `Shift+`` ` `` | Toggle timeline visualizer | Global |
| `F1` | Toggle Leva controls | Global |
| `F2` | Toggle hitbox visualization | Global |
| `F3` | Toggle raycaster debug line | Global |
| `F4` | Toggle light helpers | Global |
| `F5` | Toggle wireframe mode | Global |
| `Ctrl+Shift+P` | Log performance snapshot to console | Global |

---

## Production Build Tree-Shaking

All debug code is gated behind an environment variable:

```typescript
// src/debug/isDebug.ts
export const IS_DEBUG = import.meta.env.DEV;
// Vite replaces import.meta.env.DEV with false in production builds,
// allowing tree-shaking to remove all debug code.
```

Usage pattern:

```typescript
import { IS_DEBUG } from '../debug/isDebug';

function Scene() {
    return (
        <>
            <Room />
            <CRTTelevision />
            <VCRDeck />
            {IS_DEBUG && <DebugPanel />}
            {IS_DEBUG && <TimelineVisualizer />}
            {IS_DEBUG && <LevaControls />}
        </>
    );
}
```

This ensures:
- Zero debug code in production bundles
- No debug DOM elements rendered
- No Leva dependency loaded
- No performance metric collection
- No debug store updates

### Leva as Dev Dependency

```json
{
    "devDependencies": {
        "leva": "^0.10.0"
    }
}
```

Leva is only a devDependency. In production, the dynamic import fails silently or the `IS_DEBUG` gate prevents it from being imported at all.

---

## Console Logging

Structured logging for development:

```typescript
// src/debug/logger.ts

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof LOG_LEVELS[number];

const LOG_COLORS: Record<LogLevel, string> = {
    debug: '#888',
    info: '#33FF33',
    warn: '#FFAA00',
    error: '#FF0000',
};

class Logger {
    private module: string;

    constructor(module: string) {
        this.module = module;
    }

    debug(...args: unknown[]) {
        if (!IS_DEBUG) return;
        console.log(
            `%c[${this.module}]`,
            `color: ${LOG_COLORS.debug}; font-weight: bold`,
            ...args,
        );
    }

    info(...args: unknown[]) {
        if (!IS_DEBUG) return;
        console.log(
            `%c[${this.module}]`,
            `color: ${LOG_COLORS.info}; font-weight: bold`,
            ...args,
        );
    }

    warn(...args: unknown[]) {
        console.warn(
            `%c[${this.module}]`,
            `color: ${LOG_COLORS.warn}; font-weight: bold`,
            ...args,
        );
    }

    error(...args: unknown[]) {
        console.error(
            `%c[${this.module}]`,
            `color: ${LOG_COLORS.error}; font-weight: bold`,
            ...args,
        );
    }
}

// Usage:
// const log = new Logger('Horror');
// log.info('Phase transition:', 'UNEASY → ESCALATING');
// log.debug('Entity flash triggered at', time);
// log.warn('Audio context suspended — awaiting user interaction');
// log.error('Failed to load page:', pageId, error);

export function createLogger(module: string): Logger {
    return new Logger(module);
}
```

### Module-Specific Loggers

Each module creates its own logger:

```typescript
// In horror/HorrorController.tsx
const log = createLogger('Horror');

// In vcr/vcrStore.ts
const log = createLogger('VCR');

// In audio/AudioEngine.ts
const log = createLogger('Audio');

// In content/ContentLoader.ts
const log = createLogger('Content');
```

This produces console output like:

```
[Horror] Phase transition: DORMANT → UNEASY
[VCR] State: PLAY → FF (target: 00:12:30:00)
[Audio] Initialized Web Audio context
[Content] Loaded page: getting-started/install (142 lines)
[Horror] Entity flash triggered at 141.3s (duration: 0.15s)
```
