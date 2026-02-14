# Audio System Specification

> Part of [VCR2 Architecture Plan](./index.md)

## Overview

VCR2 uses a **hybrid audio system**: procedural synthesis via the Web Audio API for mechanical/electronic sounds, and pre-recorded samples for complex ambient audio. All audio is spatial where appropriate.

---

## Architecture

```
┌─ AudioEngine ────────────────────────────────────────┐
│                                                      │
│  ┌─ ProceduralSynth ─────────────────────────────┐  │
│  │  Web Audio API                                 │  │
│  │  - VCR motor hum (filtered noise + 60Hz)       │  │
│  │  - Tape hiss (pink noise, gain-modulated)      │  │
│  │  - Tracking beep (1kHz square, 100ms)          │  │
│  │  - Button click (noise burst, 5ms)             │  │
│  │  - Lightgun shot (noise burst + 80Hz bass)     │  │
│  │  - Fluorescent buzz (120Hz sawtooth, filtered) │  │
│  │  - Static crackle (white noise, gated)         │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ SamplePlayer ────────────────────────────────┐  │
│  │  HTMLAudioElement / AudioBuffer                │  │
│  │  - ambient-drone.mp3 (dark ambient loop)       │  │
│  │  - whisper-layer-1.mp3 (horror escalation)     │  │
│  │  - whisper-layer-2.mp3 (horror climax)         │  │
│  │  - tape-screech.mp3 (FF/REW mechanical)        │  │
│  │  - entity-sound.mp3 (entity manifestation)     │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ SpatialAudio ────────────────────────────────┐  │
│  │  THREE.AudioListener + THREE.PositionalAudio   │  │
│  │  - Fluorescent lights (positioned at fixtures) │  │
│  │  - "Beyond" hallway sounds (behind player)     │  │
│  │  - VCR motor (positioned at VCR deck)          │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ AudioStore (Zustand) ────────────────────────┐  │
│  │  - masterVolume: number (0-1)                  │  │
│  │  - sfxVolume: number (0-1)                     │  │
│  │  - ambientVolume: number (0-1)                 │  │
│  │  - muted: boolean                              │  │
│  │  - initialized: boolean                        │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Procedural Sound Designs

### 1. VCR Motor Hum
**When:** Tape is loaded and in PLAY, FF, or REW mode.

```typescript
function createVCRMotorHum(ctx: AudioContext): AudioNode {
    // Base: filtered noise (low-pass, very narrow band)
    const noise = createNoiseSource(ctx); // white noise
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 60;      // 60Hz mains hum
    bandpass.Q.value = 20;              // Very narrow

    // Harmonic: 120Hz overtone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 120;

    // Mix
    const gain1 = ctx.createGain();
    gain1.gain.value = 0.15;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.05;

    noise.connect(bandpass).connect(gain1);
    osc.connect(gain2);

    // Merge
    const merger = ctx.createGain();
    gain1.connect(merger);
    gain2.connect(merger);

    return merger;
}
```

**Modulation by VCR state:**
- PLAY: Base pitch (60Hz), normal volume
- FF: Pitch shifts up (90Hz), volume increases slightly, add high-frequency whine
- REW: Same as FF but with subtle pitch modulation (wavering)
- PAUSE: Volume drops 80%, slight irregular pulsing
- STOP: Fade out over 500ms

### 2. Tape Hiss
**When:** Tape is loaded (any state except EJECTED).

```typescript
function createTapeHiss(ctx: AudioContext): AudioNode {
    // Pink noise (more natural than white noise)
    const noise = createPinkNoise(ctx);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 8000;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;

    noise.connect(lowpass).connect(gain);
    return gain;
}
```

### 3. Tracking Beep
**When:** User adjusts tracking (or tracking error triggers).

```typescript
function playTrackingBeep(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}
```

### 4. Button Click
**When:** VCR button is shot/pressed.

```typescript
function playButtonClick(ctx: AudioContext) {
    const noise = createNoiseSource(ctx);
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 2000;
    bandpass.Q.value = 5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    noise.connect(bandpass).connect(gain).connect(ctx.destination);
    // Note: noise source auto-created and GC'd
    setTimeout(() => noise.disconnect(), 50);
}
```

### 5. Lightgun Shot
**When:** Zapper fires.

```typescript
function playLightgunShot(ctx: AudioContext) {
    // High-frequency noise burst (crack)
    const noise = createNoiseSource(ctx);
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 3000;

    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.4, ctx.currentTime);
    crackGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    // Low-frequency thump (bass)
    const bassOsc = ctx.createOscillator();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 80;

    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.3, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    noise.connect(highpass).connect(crackGain).connect(ctx.destination);
    bassOsc.connect(bassGain).connect(ctx.destination);

    bassOsc.start();
    bassOsc.stop(ctx.currentTime + 0.15);
    setTimeout(() => noise.disconnect(), 100);
}
```

### 6. Fluorescent Buzz
**When:** Always (ambient room sound).

```typescript
function createFluorescentBuzz(ctx: AudioContext): AudioNode {
    // 120Hz sawtooth (fluorescent ballast hum is 2x mains frequency)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 120;

    // Heavy low-pass to make it subtle
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 300;

    // Random volume fluctuation (5% chance per frame of brief dip)
    const gain = ctx.createGain();
    gain.gain.value = 0.04;

    osc.connect(lowpass).connect(gain);
    osc.start();

    return gain;
}
```

### 7. Static Crackle
**When:** During VHS tracking errors, horror escalation.

```typescript
function createStaticCrackle(ctx: AudioContext): AudioNode {
    const noise = createNoiseSource(ctx);

    // Gate the noise with a random pattern
    const gate = ctx.createGain();
    gate.gain.value = 0;

    noise.connect(gate);

    // Periodically open the gate for brief bursts
    // Controlled externally by setting gate.gain.value

    return gate; // Caller controls gate.gain for crackle timing
}
```

---

## Sample Audio

### Required Samples

| File | Duration | Purpose | Source |
|------|----------|---------|--------|
| `ambient-drone.mp3` | 30-60s loop | Dark ambient room tone | Royalty-free or generated |
| `whisper-layer-1.mp3` | 10-20s | Subtle whisper during UNEASY phase | Royalty-free or generated |
| `whisper-layer-2.mp3` | 10-20s | More intense whisper during ESCALATING | Royalty-free or generated |
| `tape-screech.mp3` | 2-3s | Mechanical tape sound during FF/REW | Royalty-free |
| `entity-sound.mp3` | 5-10s | Entity manifestation audio | Royalty-free or generated |

### Sample Loading

Samples are loaded at startup via `fetch` + `AudioContext.decodeAudioData`:

```typescript
class SamplePlayer {
    private buffers: Map<string, AudioBuffer> = new Map();
    private ctx: AudioContext;

    async loadSample(name: string, url: string): Promise<void> {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);
    }

    play(name: string, options?: { loop?: boolean; volume?: number; }): AudioBufferSourceNode {
        const buffer = this.buffers.get(name);
        if (!buffer) throw new Error(`Sample "${name}" not loaded`);

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = options?.loop ?? false;

        const gain = this.ctx.createGain();
        gain.gain.value = options?.volume ?? 1.0;

        source.connect(gain).connect(this.ctx.destination);
        source.start();

        return source;
    }
}
```

---

## Spatial Audio

### Setup

```typescript
// In Scene or AudioEngine initialization
const listener = new THREE.AudioListener();
camera.add(listener);

// Fluorescent light buzz — positioned at each light fixture
const fluorescentSound = new THREE.PositionalAudio(listener);
fluorescentSound.setRefDistance(3);
fluorescentSound.setRolloffFactor(2);
fluorescentSound.setDistanceModel('inverse');
fluorescentLight.add(fluorescentSound);

// VCR motor — positioned at VCR deck
const vcrMotorSound = new THREE.PositionalAudio(listener);
vcrMotorSound.setRefDistance(2);
vcrMotorSound.setRolloffFactor(1.5);
vcrDeck.add(vcrMotorSound);
```

### "Beyond" Hallway Sounds

When looking behind:
- Faint fluorescent buzz from distant hallways (positioned at ~20m behind player)
- Very low ambient hum
- During horror: subtle, barely audible sounds that might be footsteps (or might be the fluorescent fixtures cycling). Never confirmed.

```typescript
// Positioned far behind the player
const beyondAmbient = new THREE.PositionalAudio(listener);
beyondAmbient.setRefDistance(5);
beyondAmbient.setRolloffFactor(0.5);  // Slow falloff — audible from far
beyondAmbient.position.set(0, 1.5, 20); // Far behind
```

---

## Audio Initialization

Web Audio API requires user interaction before playback. The boot sequence handles this:

```typescript
class AudioEngine {
    private ctx: AudioContext | null = null;

    async initialize(): Promise<void> {
        // Created on first user interaction (click/keypress)
        this.ctx = new AudioContext();

        // Resume if suspended (Chrome autoplay policy)
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        // Load samples
        await this.samplePlayer.loadAll();

        // Start ambient sounds
        this.startAmbient();
    }
}

// Called during boot sequence (user clicks to start)
document.addEventListener('click', () => {
    audioEngine.initialize();
}, { once: true });
```

---

## Horror Audio Integration

The horror system drives audio through the audio store:

| Horror Phase | Ambient | Whispers | VCR Motor | Static | Entity |
|-------------|---------|----------|-----------|--------|--------|
| DORMANT | Normal drone | Silent | Normal | Rare | Silent |
| UNEASY | Drone + subtle detune | Layer 1 (very quiet, 5%) | Normal | Occasional | Silent |
| ESCALATING | Drone + heavy detune | Layer 1 (20%) + Layer 2 (5%) | Slight pitch wobble | Frequent | Faint |
| CLIMAX | Drone distorted | Both layers (50%) | Erratic pitch | Constant | Full |
| POST | Fade to silence | Fade out | Stops | Fading | Fade out |

### Detuning the Ambient Drone

During horror, the ambient drone's playback rate is subtly modified:

```typescript
// In horror tick:
if (horrorState.phase !== 'DORMANT') {
    const detune = Math.sin(time * 0.3) * horrorState.intensity * 100;
    ambientSource.detune.value = detune; // Cents
}
```

This creates a slowly wavering, nauseous pitch that signals something is wrong without being obvious.

---

## Audio Store (Zustand)

```typescript
interface AudioState {
    masterVolume: number;      // 0-1
    sfxVolume: number;         // 0-1
    ambientVolume: number;     // 0-1
    muted: boolean;
    initialized: boolean;

    // Actions
    setMasterVolume: (v: number) => void;
    setSfxVolume: (v: number) => void;
    setAmbientVolume: (v: number) => void;
    toggleMute: () => void;
    initialize: () => Promise<void>;
}
```

---

## Performance Notes

- **Procedural synth** has negligible CPU cost (Web Audio runs on a separate thread)
- **Sample playback** uses AudioBuffer (decoded once, played many times)
- **Spatial audio** uses Three.js PositionalAudio which handles panning internally
- **Total audio nodes** in use at any time: ~10-15 (well within browser limits)
- **Sample files** total: <2MB (short, compressed mp3s)
