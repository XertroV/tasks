# Terminal Horror Redux -- VCR + Lightgun Plan

**Version:** 2.0  
**Created:** 2026-02-14  
**Concept:** Navigate documentation by shooting links on a haunted VHS tape with a lightgun -- The VCR is a portal, and something wants to come through.

---

## Design Philosophy

**The Vibe:** It's 1991. Wood-paneled den. CRT TV flickers. VHS tape in the deck. Orange NES Zapper in hand. The on-screen menu offers choices: PLAY, REWIND, FAST-FORWARD. But this isn't a game -- it's documentation. And something is already on the tape, waiting.

**Core Aesthetic Pillars:**

1. **VCR Authenticity** -- Every visual artifact, every sound, every interaction mimics real 1980s VHS technology
2. **Tactile Violence** -- Shooting a link isn't a click, it's a shot. Impact matters.
3. **Diegetic Horror** -- The VCR is a physical object in a real room. The entity comes through the tape.
4. **Analog Dread** -- The horror emerges from VHS imperfections, tracking errors, things recorded over

---

## PHASE 1: ROOM SHELL + LIGHTING

*Keep identical to original PLAN.md*

### 1.1 Wall Dimensions & Proportions

| Dimension | Value | Rationale |
|-----------|-------|-----------|
| **Ceiling Height** | 2.74m (9ft) | Canonical Backrooms Level 0 spec |
| **Room Width** | 12m | Wide enough to feel vast, narrow enough to feel claustrophobic |
| **Room Depth** | 16m | Deeper than wide, draws eye to VCR/TV at far end |
| **Wall Thickness** | 0.15m | Visible on door/window frames |

### 1.2 Wallpaper Color Specification

| Token | Hex | Role |
|-------|-----|------|
| `--wallpaper-base` | `#C4B998` | Primary monochromatic beige-yellow |
| `--wallpaper-light` | `#D4C9A8` | Highlight areas (near lights) |
| `--wallpaper-shadow` | `#8A7D5C` | Shadowed areas, corners |
| `--wallpaper-stain` | `#6A5D3C` | Water damage, discoloration |

### 1.3 Components

- `src/components/Room.tsx` -- Inverted cube with procedural wallpaper shader
- `src/components/Floor.tsx` -- Carpet shader with displacement
- `src/components/Ceiling.tsx` -- Simple tile texture
- `src/components/FluorescentTube.tsx` -- Light fixture model + flickering light

### 1.4 Shaders

- `src/shaders/WallpaperMaterial.ts` -- Procedural yellow wallpaper with moisture
- `src/shaders/CarpetMaterial.ts` -- Worn carpet texture

### 1.5 Lighting

| Light | Type | Purpose |
|-------|------|---------|
| **Main Fluorescent** | `RectAreaLight` | Primary room illumination |
| **Flickering Tube** | `RectAreaLight` + animated | Tension, unease |
| **TV Glow** | `PointLight` (green) | Illuminates user's face, draws focus |
| **Entity Glow** | `PointLight` (red) | Horror moment illumination |
| **Ambient** | `AmbientLight` (very low) | Prevent pure black shadows |

### 1.6 Acceptance Criteria

- Room renders at 60fps
- Wallpaper has visible pattern and subtle noise variation
- Fluorescent lights flicker realistically
- Room feels like authentic Backrooms Level 0

---

## PHASE 2: VCR MODEL + CRT SCREEN + VHS EFFECTS

### 2.1 VCR Model Specification: 1987 Funai-style

**Dimensions:**

| Part | Width | Height | Depth |
|------|-------|--------|-------|
| **VCR Body** | 42cm | 10cm | 25cm |
| **Tape Slot** | 15cm | 2cm | -- |
| **LED Display** | 8cm | 2.5cm | -- |

**Visual Characteristics:**
- Black/dark gray plastic (`#1a1a1a`)
- Visible tape slot with window
- Amber/green LED indicators
- Physical buttons: REW, PLAY, FF, STOP, EJECT
- Clock display showing timecode

### 2.2 CRT TV Model Specification

**Dimensions:**

| Part | Width | Height | Depth |
|------|-------|--------|-------|
| **TV Cabinet** | 70cm | 60cm | 50cm |
| **CRT Bezel** | 55cm | 45cm | -- |
| **Screen Visible** | 50cm | 40cm | -- |

**Visual Characteristics:**
- Wood-grain cabinet (`#3D2817`)
- Black bezel with rounded corners
- Curved CRT glass
- Channel/volume knobs
- Green phosphor screen

### 2.3 VHS Effect Stack

**Layer Order (back to front):**

```
1. SOURCE CONTENT (documentation text)
   |
2. VERTICAL DISTORTIONS (tracking roll, pause jitter)
   |
3. HORIZONTAL DISTORTIONS (skew, line jitter)
   |
4. CHROMA PROCESSING (subsampling, bleed)
   |
5. SCANLINES (interlaced line pattern)
   |
6. HEAD SWITCHING NOISE (bottom 12% band)
   |
7. DROPOUT (random white lines)
   |
8. STATIC NOISE (grain overlay)
   |
9. VIGNETTE (edge darkening)
   |
10. UI ELEMENTS (timecode, tracking indicator)
```

### 2.4 Components

- `src/components/VCR.tsx` -- 3D VCR model with animated display
- `src/components/CRTScreen.tsx` -- CRT TV with screen content
- `src/components/VHSMonitor.tsx` -- VHS effect overlay system

### 2.5 Shaders

- `src/shaders/VHSOverlayMaterial.ts` -- Full VHS post-processing effect

### 2.6 VHS Effect Specifications

| Effect | Visual | Implementation |
|--------|--------|----------------|
| **Head Switching** | Noise band at bottom 12% | GLSL shader zone check |
| **Tracking Errors** | Vertical roll + horizontal skew | UV distortion in shader |
| **Chroma Bleed** | Red/cyan horizontal smear | Texture sampling with offset |
| **Dropout** | Random white horizontal lines | Noise-based line detection |
| **Static Noise** | Grain overlay | Animated noise texture |
| **Pause Jitter** | 1-2px vertical oscillation | Interlaced field simulation |

### 2.7 Acceptance Criteria

- VCR model looks authentic 1980s
- CRT TV has visible curvature and bezel
- VHS effects layer correctly
- Effects feel organic, not scripted
- Performance: 60fps with effects enabled

---

## PHASE 3: LIGHTGUN INTERACTION + NAVIGATION

### 3.0 Physical Setup: The Entertainment Center

**The Scene:** A wood-grain TV stand against the wall. On it sits a CRT TV with a VCR beneath. An orange NES Zapper is connected via cable to the VCR.

```
     ┌─────────────────────────────────────┐
     │                                     │
     │         ████████████████            │
     │       ██              ██            │
     │      █   CRT SCREEN    █            │  ← 27" CRT TV (wood-grain cabinet)
     │      █                 █            │
     │       ██              ██            │
     │         ████████████████            │
     │                                     │
     ├─────────────────────────────────────┤
     │  [▓▓▓▓] ┌─────────────────────┐     │
     │  VCR   │ ▶ REW PLAY FF STOP ⏏│     │  ← VCR beneath TV
     │        │    [00:00:00]       │     │
     │        └─────────────────────┘     │
     │                │                    │
     │                ║ ← Cable            │
     │                ║                    │
     │         ┌──────┴──────┐             │
     │         │  NES ZAPPER │             │  ← Orange NES Zapper (on floor/table)
     │         │    [===]    │             │
     │         └─────────────┘             │
     └─────────────────────────────────────┘
```

**Component Layout (in 3D scene):**
- TV at position `(0, 0.8, -7)` (against far wall, at seated eye height)
- VCR at position `(0, 0.4, -7)` (directly beneath TV)
- Zapper at position `(0.3, 0.45, -6.8)` (on top of VCR or beside it, with visible cable)

### 3.1 NES Zapper Specification

**The Iconic Orange Gun:**

| Dimension | Value | Notes |
|-----------|-------|-------|
| **Total Length** | 28cm | Barrel + grip |
| **Barrel Length** | 18cm | Orange body |
| **Grip Height** | 12cm | Black handle |
| **Trigger Guard** | Yes | Black plastic |
| **Barrel Tip** | Dark gray | 2cm ring |

**Color Breakdown:**

| Part | Color | Hex |
|------|-------|-----|
| **Barrel body** | Nintendo Orange | `#E85D04` |
| **Grip/handle** | Matte Black | `#1A1A1A` |
| **Trigger** | Dark Gray | `#4A4A4A` |
| **Barrel tip ring** | Dark Gray | `#3A3A3A` |
| **Cable** | Black | `#111111` |

**3D Model Components:**
```
Zapper (group)
├── Barrel (cylinder + mesh)
│   ├── Main body (orange, tapered)
│   ├── Tip ring (dark gray)
│   └── Sight notch (top of barrel)
├── Grip (box, rotated)
│   ├── Handle (black)
│   ├── Trigger guard (black curve)
│   └── Trigger (gray, slightly pulled)
└── Cable (tube/curve)
    ├── Exits from grip base
    ├── Coils loosely on surface
    └── Plugs into VCR front panel
```

**First-Person View:**
The zapper is visible in the bottom-right corner of the screen (like a FPS weapon). The player sees:
- Orange barrel pointing toward screen center
- Black grip in peripheral vision
- Cable trailing off to the VCR

### 3.2 Lightgun Cursor Design

**Visual:** NES Zapper-style crosshair with CRT phosphor glow

**States:**

| State | Color | Animation |
|-------|-------|-----------|
| **Idle** | `#33FF33` green | Subtle pulse |
| **Targeting** | `#00FFFF` cyan | Scale pulse 1.0 → 1.1 |
| **Firing** | `#FFFF00` yellow | Scale burst 1.3 → 1.0 |
| **Miss** | `#FF6600` orange | Horizontal shake |

### 3.2 Shootable Target Design

**VCR Menu Aesthetic:**
- Blocky, pixelated text (VT323 font)
- Cyan/white on semi-transparent blue/black
- Chunky borders with beveled edges
- Scanline overlay

**Target States:**

| State | Visual |
|-------|--------|
| **Idle** | Cyan border, dim background |
| **Targeting** | Yellow border, bright background, glow |
| **Hit** | Orange flash, scale burst, particles |

### 3.3 Navigation Model

| Input | Action |
|-------|--------|
| **Mouse move** | Aim lightgun cursor |
| **Click** | Fire at target |
| **Tab** | Cycle to next target (keyboard) |
| **Enter/Space** | Fire at current target (keyboard) |
| **Escape** | Cancel / Return to idle |

### 3.4 Fast-Forward / Rewind Transitions

**Duration:** 1.2 seconds total

**Timeline:**
```
|--0.0s--|--0.3s--|--0.6s--|--0.9s--|--1.2s--|
|        |        |        |        |        |
| START  | ACCEL  | FRAME  | DECEL  | END    |
```

**Visual Elements:**
- Speed lines (horizontal motion blur)
- Frame skipping flashes
- Timecode overlay rapidly advancing
- Scanline tearing
- Static bursts

### 3.5 Components

- `src/components/Lightgun.tsx` -- 3D NES Zapper model (visible in first-person) + cursor controller
  - Orange barrel (`#E85D04`), black grip (`#1A1A1A`)
  - Cable geometry connecting to VCR
  - Trigger animation on click
  - Muzzle flash particle effect on fire
- `src/components/EntertainmentCenter.tsx` -- TV stand + TV + VCR assembly
  - Wood-grain cabinet
  - CRT TV model on top
  - VCR model beneath
  - Proper cable routing from Zapper to VCR

### 3.6 Acceptance Criteria

- Cursor tracks smoothly
- Target states work correctly
- Hit/miss feedback is impactful
- FF/REW transitions feel VHS-authentic
- Keyboard navigation works

---

## PHASE 4: HORROR + ENTITY

### 4.1 Horror Concept: The Tape is Haunted

**Core Idea:** The VHS tape contains footage of something. When you navigate documentation, you're scrubbing through recorded content. The entity exists ON the tape, and can appear at any moment.

**Horror Triggers:**

| Trigger | Effect |
|---------|--------|
| **Tape gets "stuck"** | VCR makes mechanical sounds, image distorts, entity glimpsed in static |
| **Something recorded over** | Sections of documentation are corrupted, replaced with something else |
| **Tracking drift** | Entity visible in tracking noise band |
| **Pause malfunction** | Freeze-frame reveals entity in the background |
| **Fast-forward glimpse** | Single frame of entity during speed transition |

### 4.2 The Entity: "The Recording"

**Visual Design:** When the player turns around, they see the entity emerging FROM the VCR/TV:

**THE CORE:**
- Sphere of tangled VHS tape ribbon
- Pulsing with sickly red LED glow
- Tape spooling outward, becoming tendrils

**THE TENDRILS:**
- Magnetic tape strips (brown/black)
- Some with visible recorded images
- Reach toward the viewer

**THE FACE:**
- Periodically visible in the CRT screen
- Frozen, distorted
- Blinking tracking bars across features

**THE AUDIO:**
- Warped VHS audio (wow/flutter)
- Whispering from the speakers
- Mechanical tape sounds

### 4.3 Horror Sequence

**Timing:** 18-28 second window, random

**Escalation:**

| Time Before Turn | Effect |
|------------------|--------|
| -10s | Lights begin subtle flicker |
| -7s | VHS tracking errors increase |
| -5s | Wall breathing becomes visible |
| -3s | Screen text begins to glitch |
| -2s | Audio cue: warped tape sound |
| -1s | Camera begins slow turn |
| 0s | Entity revealed |

### 4.4 Post-Reveal

**What happens after the turn:**

1. Camera locked facing entity
2. Entity hovers, watching
3. Screen displays corrupted text
4. Audio continues (warped tape, breathing)
5. Gradual fade to black (10 seconds)
6. Final corrupted message
7. Loop option

**Post-Reveal Text:**
```
THE TAPE IS ENDLESS
THE RECORDING NEVER STOPS
YOU HAVE BEEN ARCHIVED
PLAY
PLAY
P̶L̵A̷Y̶
```

### 4.5 Acceptance Criteria

- Horror triggers feel organic
- Entity is genuinely unsettling
- Audio enhances without being cheesy
- Post-reveal maintains tension
- User testing shows genuine reaction

---

## PHASE 5: POLISH + ATMOSPHERE

### 5.1 Audio System

**Procedural Audio (all synthesized, no files):**

| Sound | Synthesis | Parameters |
|-------|-----------|------------|
| **VCR motor hum** | Filtered noise + 60Hz | Lowpass 200Hz |
| **Tape hiss** | Pink noise | Subtle, constant |
| **Tracking beep** | Square oscillator | 1000Hz, 100ms |
| **Lightgun shot** | Noise burst + bass thud | 80Hz + filtered noise |
| **Entity whisper** | Layered noise + comb filter | Panned randomly |

### 5.2 Accessibility

| Feature | Implementation |
|---------|---------------|
| **Keyboard navigation** | Tab cycling, Enter to fire |
| **Screen reader** | ARIA labels on targets |
| **Reduced motion** | Disable animations |
| **High contrast** | Alternate color scheme |
| **Alternative mode** | Traditional click navigation |

### 5.3 Performance

| Metric | Target |
|--------|--------|
| **Frame rate** | 60fps on 2020 midrange |
| **Draw calls** | < 20 |
| **Vertices** | < 10,000 |
| **Memory** | < 100MB |

### 5.4 Acceptance Criteria

- Runs at consistent 60fps
- All shaders compile without warnings
- Respects `prefers-reduced-motion`
- Works on Chrome, Firefox, Safari
- No console errors

---

## FILE STRUCTURE

```
terminal-horror-redux/
├── src/
│   ├── components/
│   │   ├── Scene.tsx           # Main scene wrapper
│   │   ├── Room.tsx            # Wallpaper cube
│   │   ├── Floor.tsx           # Carpet plane
│   │   ├── Ceiling.tsx         # Tile plane
│   │   ├── FluorescentTube.tsx # Light fixture
│   │   ├── VCR.tsx             # 3D VCR model
│   │   ├── CRTScreen.tsx       # CRT TV + screen content
│   │   ├── Lightgun.tsx        # Cursor controller
│   │   ├── VHSMonitor.tsx      # VHS effect overlay
│   │   └── TheEntity.tsx       # Horror entity
│   ├── shaders/
│   │   ├── WallpaperMaterial.ts    # Procedural wallpaper
│   │   ├── CarpetMaterial.ts       # Carpet texture
│   │   ├── BreathingWallMaterial.tsx # Horror wall effect
│   │   └── VHSOverlayMaterial.ts   # VHS post-processing
│   ├── utils/
│   │   └── audio.ts            # Web Audio wrapper
│   ├── data/
│   │   └── docs-content.ts     # Documentation content
│   ├── assets/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── PLAN.md
```

---

## COLOR PALETTE

```
VHS/CRT PALETTE:
├── #33FF33  ████████  VHS green (phosphor)
├── #FFAA00  ████████  VHS amber (LED)
├── #00FFFF  ████████  VCR cyan (text)
├── #00BFFF  ████████  VCR blue (border)
└── #000000  ████████  CRT black

BACKROOMS PALETTE:
├── #C4B998  ████████  Wallpaper base
├── #D4C9A8  ████████  Wallpaper highlight
├── #8A7D5C  ████████  Wallpaper shadow
├── #6A5D3C  ████████  Water stain
├── #8B7355  ████████  Carpet brown
└── #5B4335  ████████  Carpet dark

HORROR PALETTE:
├── #FF0000  ████████  Entity core
├── #550000  ████████  Emissive red
├── #111111  ████████  Tape/VHS black
└── #FFFFFF  ████████  Entity eyes

LIGHTGUN PALETTE:
├── #33FF33  ████████  Idle green
├── #00FFFF  ████████  Targeting cyan
├── #FFFF00  ████████  Firing yellow
└── #FF6600  ████████  Miss orange
```

---

## KEY DIFFERENCES FROM TERMINAL-HORROR

| Aspect | Terminal Horror | Terminal Horror Redux |
|--------|----------------|----------------------|
| **Primary Interface** | CRT Terminal | VCR + CRT TV |
| **Interaction Method** | Keyboard typing | Lightgun shooting |
| **Navigation** | Scrolling text | FF/REW tape transitions |
| **Visual Effects** | CRT scanlines | Full VHS artifact stack |
| **Entity Concept** | Cable monster | Tape/Recording entity |
| **Horror Trigger** | Random timer | Tape-based triggers |
| **Audio Design** | PC speaker sounds | VCR mechanical sounds |

---

## HOW TO RUN

```bash
cd /home/xertrov/src/tasks/docs-design-concepts/prototypes/terminal-horror-redux

# Install dependencies
bun install

# Development server
bun run dev

# Production build
bun run build
bun run preview
```

---

## IMPLEMENTATION STATUS

### Phase 1: Room Shell + Lighting
- [x] Room.tsx with wallpaper shader
- [x] Floor.tsx with carpet shader
- [x] Ceiling.tsx
- [x] FluorescentTube.tsx

### Phase 2: VCR + CRT + VHS Effects
- [x] VCR.tsx 3D model
- [x] CRTScreen.tsx
- [x] VHSMonitor.tsx effect overlay
- [x] VHSOverlayMaterial.ts shader
- [ ] Full VHS effect implementation
- [ ] Audio synthesis

### Phase 3: Lightgun + Navigation
- [x] Lightgun.tsx cursor controller
- [ ] Shootable target components
- [ ] FF/REW transition animations
- [ ] Hit/miss particle effects

### Phase 4: Horror + Entity
- [x] TheEntity.tsx base model
- [ ] Horror sequence orchestration
- [ ] Tape-based triggers
- [ ] Post-reveal state

### Phase 5: Polish
- [ ] Audio system
- [ ] Accessibility features
- [ ] Performance optimization
- [ ] Cross-browser testing

---

*End of Terminal Horror Redux Plan. This document synthesizes the original Terminal Horror room design with VCR + Lightgun concepts for a unique documentation horror experience.*
