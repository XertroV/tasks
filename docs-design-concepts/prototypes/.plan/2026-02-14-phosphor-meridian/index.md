# VCR2: Haunted VCR Documentation Browser

> **Plan Directory:** `.plan/2026-02-14-phosphor-meridian/`
> **Project Directory:** `vcr2/`
> **Created:** 2026-02-14
> **Status:** PLANNING

## Executive Summary

VCR2 is a **documentation browser disguised as a haunted VHS experience**. Users navigate documentation for "The Backlogs" CLI by interacting with a CRT television and VCR deck using a first-person NES Zapper lightgun, set inside a Backrooms Level 0 room. The VHS tape IS the documentation — pages are positions on the tape, navigation means fast-forwarding or rewinding, and the VCR's physical controls are the interface.

The VCR is haunted. Something lives in the tape. It watches through the screen. The horror is **entirely screen-mediated** — the entity never appears in the physical room. This makes the CRT screen a portal: simultaneously a documentation display and a window into something that shouldn't exist.

A toggleable horror mode ensures the project functions as both a genuine (atmospheric) documentation browser AND a horror experience.

---

## Core Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Environment | Backrooms Level 0 | Brand consistency, established aesthetic |
| VHS Effects | GLSL Post-Processing Only | Performance, authenticity, single pipeline |
| Primary Purpose | Documentation + Horror equally | Both systems are first-class |
| Framework | React Three Fiber (R3F) | Component model, ecosystem, proven in vcr-horror |
| Audio | Hybrid (Procedural + Samples) | Synth for mechanical, samples for ambient |
| Lightgun | 3D First-Person Zapper | Immersion, physicality |
| Text Rendering | RenderTexture + drei Text | Proven in vcr-horror, supports fonts |
| Content Format | MDX/Markdown Files | Authorable, versionable, standard |
| Horror Engine | Zustand + Custom Timeline | Decoupled, debuggable |
| Horror Toggle | Yes, horror is opt-in layer | Accessibility, clean architecture |
| Tape Model | Linear with seek | Authentic VHS metaphor |
| Toolchain | Vite + Bun + Biome | Fast, modern, minimal |
| Room Construction | Procedural Geometry + Shaders | Dynamic effects (breathing, decay) |
| Camera | Fixed look-at + horror override + "Look Behind You" button | Controlled, dramatic |
| Room Extent | Single room, hints of beyond | Atmospheric, performant |
| Performance | Moderate (60fps, ≤50 draw calls, ≤50K verts, ≤200MB) | Headroom for rich effects |
| Beyond Rendering | Repeating 3D segments + fog | Convincing depth illusion |
| "Look Behind You" UI | Post-it note on TV bezel | Diegetic, unsettling, discoverable |
| Entity Location | Screen only (never in room) | More original, more unsettling |
| Code Organization | Feature-based modules | Maintainability at scale |
| Boot Sequence | VCR power-on (3-5 seconds) | Mood-setting, covers loading |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        App Shell                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │   R3F Canvas (3D)   │  │   DOM Overlay (2D HUD)   │  │
│  │                     │  │  - Debug panel            │  │
│  │  ┌───────────────┐  │  │  - Settings menu          │  │
│  │  │  Room Module   │  │  │  - Loading screen         │  │
│  │  │  - Walls       │  │  │  - Accessibility alt-nav  │  │
│  │  │  - Floor       │  │  └──────────────────────────┘  │
│  │  │  - Ceiling     │  │                                │
│  │  │  - Lighting    │  │  ┌──────────────────────────┐  │
│  │  │  - Beyond halls│  │  │      State Layer         │  │
│  │  └───────────────┘  │  │  ┌──────────┐             │  │
│  │                     │  │  │ VCR Store │ (Zustand)   │  │
│  │  ┌───────────────┐  │  │  ├──────────┤             │  │
│  │  │  CRT Module    │  │  │  │ Nav Store│ (Zustand)   │  │
│  │  │  - TV model    │  │  │  ├──────────┤             │  │
│  │  │  - RenderTex   │  │  │  │HorrorStore│ (Zustand)  │  │
│  │  │  - CRT shader  │  │  │  ├──────────┤             │  │
│  │  │  - Text layout │  │  │  │AudioStore│ (Zustand)   │  │
│  │  └───────────────┘  │  │  └──────────┘             │  │
│  │                     │  │                            │  │
│  │  ┌───────────────┐  │  │  ┌──────────────────────┐ │  │
│  │  │  VCR Module    │  │  │  │  Timeline Engine     │ │  │
│  │  │  - Deck model  │  │  │  │  (Horror sequencer)  │ │  │
│  │  │  - Buttons     │  │  │  └──────────────────────┘ │  │
│  │  │  - LED/display │  │  │                            │  │
│  │  │  - Post-it     │  │  │  ┌──────────────────────┐ │  │
│  │  └───────────────┘  │  │  │  Content Loader       │ │  │
│  │                     │  │  │  (Markdown → pages)    │ │  │
│  │  ┌───────────────┐  │  │  └──────────────────────┘ │  │
│  │  │ Lightgun Mod.  │  │  └──────────────────────────┘  │
│  │  │  - 3D Zapper   │  │                                │
│  │  │  - Raycaster   │  │                                │
│  │  │  - Crosshair   │  │                                │
│  │  └───────────────┘  │  │                              │
│  │                     │  │                              │
│  │  ┌───────────────┐  │                                │
│  │  │ Post-Process   │  │                                │
│  │  │  - VHS Pass    │  │                                │
│  │  │  - CRT Pass    │  │                                │
│  │  │  - Bloom       │  │                                │
│  │  └───────────────┘  │                                │
│  └─────────────────────┘                                │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │                Audio Engine                          ││
│  │  - Web Audio API (procedural synthesis)              ││
│  │  - Howler.js or raw Audio (samples)                  ││
│  │  - Spatial audio (positional sources)                ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Module Breakdown

### 1. Room Module (`src/room/`)
**Responsibility:** The Backrooms Level 0 environment.

- **Geometry:** Procedural planes for walls, floor, ceiling with custom shader materials
- **Materials:** WallpaperMaterial (yellow, stained), CarpetMaterial (brown, worn), CeilingTileMaterial (grid pattern)
- **Lighting:** Fluorescent tubes (flickering RectAreaLight), ambient (very dim), TV glow (green PointLight), fog
- **Beyond:** 2-3 repeating room segments behind the player, fading into exponential fog. Visible when "Look Behind You" is active
- **Dynamic Effects:** Breathing walls (vertex displacement during horror), moisture spreading, flicker intensity changes

**Key files:** `Room.tsx`, `Floor.tsx`, `Ceiling.tsx`, `Walls.tsx`, `FluorescentLight.tsx`, `BeyondHallways.tsx`, `wallpaper.glsl`, `carpet.glsl`, `ceiling-tile.glsl`

See: [room-environment.md](./room-environment.md)

### 2. CRT Module (`src/crt/`)
**Responsibility:** The CRT television and its screen content.

- **TV Model:** 1980s wood-grain cabinet CRT (70x60x50cm), curved glass screen, channel/volume knobs, speaker grille
- **Screen Rendering:** Offscreen scene rendered to `WebGLRenderTarget`, fed through CRT shader, displayed on screen quad
- **Text Layout:** drei `<Text>` components in the offscreen scene, VT323 font, green phosphor palette
- **Content Display:** VCR-OS interface showing documentation text, navigation menu, status indicators
- **Post-it Note:** "LOOK BEHIND YOU" note on TV bezel, shootable target

**Key files:** `CRTTelevision.tsx`, `ScreenRenderer.tsx`, `TextLayout.tsx`, `PageView.tsx`, `MenuView.tsx`, `PostItNote.tsx`, `crt-screen.glsl`

See: [vhs-crt-shaders.md](./vhs-crt-shaders.md)

### 3. VCR Module (`src/vcr/`)
**Responsibility:** The VCR deck, its physical interface, and tape state machine.

- **Deck Model:** 1987 Funai-style VCR (42x10x25cm), black body, amber/green LEDs, physical buttons (REW/PLAY/FF/STOP/EJECT), tape slot, timecode display
- **State Machine:** EJECTED → LOADING → STOPPED → PLAYING → PAUSED, plus FF/REW modes
- **Tape Model:** Linear tape with numbered positions. Each documentation page = a tape segment. Timecode reflects position.
- **Button Interaction:** Physical VCR buttons are shootable with the Zapper (PLAY, STOP, FF, REW, EJECT)
- **LED Display:** Segmented timecode display (HH:MM:SS:FF), mode indicator LEDs

**Key files:** `VCRDeck.tsx`, `VCRButtons.tsx`, `VCRDisplay.tsx`, `TapeModel.ts`, `vcrStore.ts`

See: [content-navigation.md](./content-navigation.md)

### 4. Lightgun Module (`src/lightgun/`)
**Responsibility:** The NES Zapper, aiming, shooting, and hit detection.

- **3D Zapper Model:** Procedural geometry (barrel, grip, trigger, cable), Nintendo orange (#E85D04), visible bottom-right in first-person
- **Weapon Camera:** Separate camera layer for the gun (prevents clipping with world geometry)
- **Raycasting:** Mouse position → world ray → hit detection against shootable targets
- **Crosshair:** Subtle center dot + optional crosshair for precise aiming
- **States:** Idle (green glow), Targeting (cyan pulse), Firing (yellow burst + recoil), Miss (orange shake)
- **Effects:** Muzzle flash, screen flash on hit, recoil animation, cable physics (subtle sway)

**Key files:** `ZapperModel.tsx`, `ZapperController.tsx`, `AimingSystem.ts`, `ShootableTarget.tsx`, `Crosshair.tsx`

See: [lightgun-interaction.md](./lightgun-interaction.md)

### 5. Horror Module (`src/horror/`)
**Responsibility:** Horror state machine, timeline engine, entity, and screen-based scares.

- **Horror Store:** Zustand store tracking: phase (DORMANT/UNEASY/ESCALATING/CLIMAX/POST), intensity (0-1), active effects, trigger history
- **Timeline Engine:** Custom sequencer that drives horror escalation. Configurable timelines with keyframed events: "at 60s, increase flicker by 20%", "at 90s, show face on screen for 0.5s"
- **Entity:** Exists ONLY on the CRT screen. Manifests as: distorted face frames, corrupted text, tracking errors that reveal hidden messages, VHS artifacts that form shapes
- **Screen Corruption:** Shader uniforms driven by horror intensity — tracking errors increase, chroma bleeds worsen, static intensifies, dropout frequency rises
- **Horror Toggle:** `horrorEnabled` flag. When false, timeline engine is paused, all horror uniforms locked to 0, entity never spawns

**Key files:** `horrorStore.ts`, `TimelineEngine.ts`, `HorrorController.tsx`, `ScreenEntity.tsx`, `horror-timelines.ts`, `corruption-effects.ts`

See: [horror-system.md](./horror-system.md)

### 6. Audio Module (`src/audio/`)
**Responsibility:** All sound in the project.

- **Procedural (Web Audio API):** VCR motor hum, tape hiss, tracking beep, button click, lightgun shot, fluorescent buzz, static crackle
- **Samples:** Horror ambient drone, whisper layers, tape screech, entity sound, room ambience
- **Spatial:** Fluorescent lights buzz from their positions, sounds from the "beyond" hallways
- **VCR Audio:** Motor speed modulates with tape state (FF = high pitch, REW = reversed), mechanical button clicks
- **Horror Audio:** Intensity-driven — as horror escalates, ambient sound warps, new layers fade in

**Key files:** `AudioEngine.ts`, `ProceduralSynth.ts`, `SamplePlayer.ts`, `SpatialAudio.ts`, `audioStore.ts`, `sounds/` (sample files)

See: [audio-system.md](./audio-system.md)

### 7. Content Module (`src/content/`)
**Responsibility:** Documentation content loading and page model.

- **Content Source:** MDX files are **symlinked** from the main docs project, not duplicated:
  ```bash
  ln -s ~/src/tasks/docs/src/content/docs vcr2/content/docs
  ```
  This ensures the VCR2 project always displays the latest documentation content without manual synchronization. The symlink target contains ~48 MDX files across 7 sections (getting-started, operations, workflows, agent-usage, schema-and-data, parity, faq).
- **Markdown Loading:** `.mdx` files in `content/docs/` parsed at build time via Vite plugin or at runtime via `marked`
- **Page Model:** Each page has: `id`, `title`, `body` (parsed HTML/text), `tapePosition` (numeric), `links` (to other pages)
- **Tape Mapping:** Pages ordered by `tapePosition`. The tape's total length = number of pages. Seeking between pages = the tape model
- **Frontmatter:** YAML frontmatter in each .mdx file: `title`, `order`, `section`, `tapeLabel`

**Key files:** `ContentLoader.ts`, `PageModel.ts`, `contentStore.ts`, `content/docs/*.mdx` (symlink)

See: [content-navigation.md](./content-navigation.md)

### 8. Post-Processing Pipeline (`src/postprocessing/`)
**Responsibility:** The unified GLSL effect pipeline.

- **VHS Pass:** Tracking distortion, head switching (bottom 12%), chroma bleed, dropout lines, static noise, pause jitter, FF/REW artifacts
- **CRT Pass:** Barrel distortion, scanlines, RGB phosphor subpixels, vignette, screen curvature, edge darkening, flicker
- **Bloom Pass:** Subtle glow on emissive elements (LEDs, screen, fluorescent lights)
- **Horror Pass:** Additional corruption overlays driven by horror intensity uniforms
- **Pipeline:** Source → VHS Pass → CRT Pass → Bloom → Output. Horror modulates VHS Pass uniforms.

**Key files:** `EffectPipeline.tsx`, `VHSPass.ts`, `CRTPass.ts`, `vhs-effect.glsl`, `crt-effect.glsl`

See: [vhs-crt-shaders.md](./vhs-crt-shaders.md)

### 9. Debug Module (`src/debug/`)
**Responsibility:** Development and tuning tools.

- **Leva Controls:** Shader parameters, lighting, fog, camera, effect intensities
- **Custom Debug Panel:** Horror state display, VCR state, tape position, FPS, draw calls, memory, active effects list
- **Hotkey:** Toggle debug panel with backtick (`` ` ``) key
- **Horror Timeline Visualizer:** Visual timeline showing upcoming events, current phase, intensity graph
- **Production:** All debug code tree-shaken in production builds

**Key files:** `DebugPanel.tsx`, `DebugOverlay.tsx`, `LevaControls.tsx`, `TimelineVisualizer.tsx`, `useDebugStore.ts`

See: [debug-tooling.md](./debug-tooling.md)

---

## Camera System

### Normal Mode: Fixed Look-At
- Camera position: `(0, 1.2, -4)` (seated viewer height, ~3m from TV)
- Camera target: CRT screen center `(0, 0.9, -7)` (TV on entertainment center)
- Mouse movement controls the **lightgun aim** (raycaster direction), NOT the camera
- Slight breathing motion (sinusoidal micro-sway) for organic feel

### "Look Behind You" Mode
- Triggered by shooting the post-it note on the TV bezel
- Camera smoothly rotates 180° (lerp over ~1.5 seconds) to face the hallways behind
- Reveals: 2-3 repeating Backrooms room segments, fluorescent lights flickering, deep exponential fog
- The Zapper is visible and functional but firing has no effect (plays sound, muzzle flash, but nothing happens)
- A floating post-it note appears: "LOOK AT SCREEN" — shooting it rotates camera back
- **Nothing ever appears behind you.** The dread is the point.

### Horror Override
- During the horror climax, the camera may:
  - Drift slightly (subtle, involuntary movement)
  - Zoom in on the CRT screen (forced focus on the entity)
  - Shake/vibrate at key moments
  - NEVER forced to look behind (the entity is on-screen only)

---

## Boot Sequence

1. **Black screen** (0-0.5s): Darkness. Fluorescent light buzz fades in.
2. **Room fades in** (0.5-1.5s): Dim room visible. TV is OFF (dark CRT). VCR deck visible with no tape.
3. **TV powers on** (1.5-2.5s): Static burst → blue "NO SIGNAL" screen. CRT hum begins.
4. **Tape auto-loads** (2.5-4.0s): Mechanical clunk sound. VCR display shows "LOADING". Tape slot animates.
5. **Playback begins** (4.0-5.0s): Display switches to "PLAY" and timecode starts. First documentation page "plays in" — text appears line by line with slight VHS tracking wobble.
6. **Ready** (5.0s+): VCR shows PAUSE. User has the Zapper. Cursor is active. Documentation is readable.

On repeat visits, a "SKIP" post-it note appears that jumps to step 6 instantly.

---

## Color Palette

### VHS/CRT Colors
| Name | Hex | Use |
|------|-----|-----|
| Phosphor Green | `#33FF33` | Screen text, primary UI |
| Amber | `#FFAA00` | VCR display, warnings |
| Cyan | `#00FFFF` | Links, targeting state |
| Blue Screen | `#0000AA` | "NO SIGNAL" screen |
| CRT Black | `#0A0A0A` | Screen background (not pure black — CRTs never are) |

### Backrooms Colors
| Name | Hex | Use |
|------|-----|-----|
| Wallpaper Base | `#C4B998` | Wall base color |
| Wallpaper Light | `#D4C9A8` | Wall highlights |
| Wallpaper Shadow | `#8A7D5C` | Wall depth |
| Wallpaper Stain | `#6A5D3C` | Water damage |
| Carpet Base | `#8B7355` | Floor base |
| Carpet Dark | `#5B4335` | Floor shadows/wear |
| Fluorescent White | `#FFF8E7` | Light color |

### Horror Colors
| Name | Hex | Use |
|------|-----|-----|
| Entity Red | `#FF0000` | Entity glow, corruption |
| Emissive Red | `#550000` | Subtle horror tint |
| Tape Black | `#111111` | Entity tendrils |
| Static White | `#FFFFFF` | Noise, dropout |

### Lightgun Colors
| Name | Hex | Use |
|------|-----|-----|
| Idle | `#33FF33` | Default cursor |
| Targeting | `#00FFFF` | Over shootable element |
| Firing | `#FFFF00` | During shot |
| Miss | `#FF8800` | Shot missed target |
| Zapper Orange | `#E85D04` | Gun barrel color |

---

## File Structure

```
vcr2/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── biome.json
├── public/
│   └── fonts/
│       └── VT323-Regular.ttf
├── content/
│   └── docs/              # symlink → ~/src/tasks/docs/src/content/docs
│       ├── index.mdx
│       ├── getting-started/
│       │   ├── install.mdx
│       │   └── quickstart.mdx
│       ├── operations/    # 39 command reference pages
│       │   ├── add.mdx ... work.mdx
│       │   └── index.mdx
│       ├── workflows/
│       ├── agent-usage/
│       ├── schema-and-data/
│       ├── parity/
│       └── faq/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   ├── three-elements.d.ts
│   │   └── global.d.ts
│   ├── stores/
│   │   ├── vcrStore.ts
│   │   ├── navigationStore.ts
│   │   ├── horrorStore.ts
│   │   ├── audioStore.ts
│   │   └── debugStore.ts
│   ├── room/
│   │   ├── Room.tsx
│   │   ├── Walls.tsx
│   │   ├── Floor.tsx
│   │   ├── Ceiling.tsx
│   │   ├── FluorescentLight.tsx
│   │   ├── BeyondHallways.tsx
│   │   ├── EntertainmentCenter.tsx
│   │   └── shaders/
│   │       ├── wallpaper.vert.glsl
│   │       ├── wallpaper.frag.glsl
│   │       ├── carpet.vert.glsl
│   │       ├── carpet.frag.glsl
│   │       ├── ceiling-tile.frag.glsl
│   │       └── noise.glsl          (shared simplex noise — no more duplication)
│   ├── crt/
│   │   ├── CRTTelevision.tsx
│   │   ├── ScreenRenderer.tsx
│   │   ├── TextLayout.tsx
│   │   ├── PageView.tsx
│   │   ├── MenuView.tsx
│   │   └── PostItNote.tsx
│   ├── vcr/
│   │   ├── VCRDeck.tsx
│   │   ├── VCRButtons.tsx
│   │   ├── VCRDisplay.tsx
│   │   └── TapeModel.ts
│   ├── lightgun/
│   │   ├── ZapperModel.tsx
│   │   ├── ZapperController.tsx
│   │   ├── AimingSystem.ts
│   │   ├── ShootableTarget.tsx
│   │   └── Crosshair.tsx
│   ├── horror/
│   │   ├── HorrorController.tsx
│   │   ├── TimelineEngine.ts
│   │   ├── ScreenEntity.tsx
│   │   ├── horror-timelines.ts
│   │   └── corruption-effects.ts
│   ├── audio/
│   │   ├── AudioEngine.ts
│   │   ├── ProceduralSynth.ts
│   │   ├── SamplePlayer.ts
│   │   └── SpatialAudio.ts
│   ├── content/
│   │   ├── ContentLoader.ts
│   │   └── PageModel.ts
│   ├── postprocessing/
│   │   ├── EffectPipeline.tsx
│   │   ├── VHSPass.ts
│   │   ├── CRTPass.ts
│   │   └── shaders/
│   │       ├── vhs-effect.frag.glsl
│   │       ├── vhs-effect.vert.glsl
│   │       ├── crt-effect.frag.glsl
│   │       └── crt-effect.vert.glsl
│   ├── debug/
│   │   ├── DebugPanel.tsx
│   │   ├── DebugOverlay.tsx
│   │   ├── LevaControls.tsx
│   │   └── TimelineVisualizer.tsx
│   ├── boot/
│   │   └── BootSequence.tsx
│   ├── camera/
│   │   ├── CameraController.tsx
│   │   └── LookBehindYou.tsx
│   └── shared/
│       ├── constants.ts
│       ├── colors.ts
│       └── hooks/
│           ├── useAnimationFrame.ts
│           └── useLerpedValue.ts
└── sounds/
    ├── ambient-drone.mp3
    ├── whisper-layer-1.mp3
    ├── whisper-layer-2.mp3
    ├── tape-screech.mp3
    └── entity-sound.mp3
```

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Bun | latest | Package management, scripts |
| Bundler | Vite | ^6.x | Dev server, HMR, production builds |
| UI Framework | React | ^18.3 | Component model, state management |
| 3D Engine | Three.js | ^0.170+ | WebGL rendering |
| 3D React | @react-three/fiber | ^8.x | React bindings for Three.js |
| 3D Helpers | @react-three/drei | ^9.x | Text, RenderTexture, helpers |
| Post-Processing | @react-three/postprocessing | ^2.x | Effect pipeline |
| State | Zustand | ^5.x | Global state management |
| Dev Controls | Leva | ^0.10+ | Real-time parameter tuning |
| Markdown | marked | ^15.x | Markdown parsing |
| Lint/Format | Biome | ^1.x | Linting + formatting (replaces ESLint+Prettier) |
| Fonts | VT323 | Google Fonts | Primary CRT font |
| Fonts (alt) | DSEG | npm | Segment display for VCR timecode |

### Dependencies NOT Used
- **No CSS framework** (Tailwind removed — minimal DOM styling needed)
- **No animation library** (all animation via useFrame/refs)
- **No XState** (custom timeline engine is simpler for this use case)
- **No Howler.js** (Web Audio API directly + raw HTMLAudioElement for samples)

---

## Key Architectural Principles

### 1. Refs Over State in Animation Loops
The terminal-horror-redux bug: calling `setState` inside `useFrame` causes React re-renders every frame. **All animation-loop values MUST use refs**, not state. State is only for values that need to trigger React re-renders (page content, VCR mode, horror phase).

### 2. Single VHS Pipeline
The terminal-horror-redux mistake: three competing VHS systems (CSS overlay, inline CRT shader, orphaned VHSOverlayMaterial). VCR2 has **one** post-processing pipeline with clear responsibilities. No CSS-based visual effects.

### 3. Shared GLSL Utilities
The terminal-horror-redux had the same simplex noise function copy-pasted across 3 files. VCR2 extracts shared GLSL code into `noise.glsl` and uses Vite's `?raw` import for inclusion.

### 4. Horror as an Opt-In Layer
Horror system is cleanly separable. When `horrorEnabled: false`:
- Timeline engine is paused
- All horror-related shader uniforms are locked to 0
- Entity components don't mount
- Audio horror layers don't play
- The experience is a pure VCR documentation browser

### 5. Debug-First Development
Every system exposes its state to the debug panel. Shader uniforms are Leva-controllable. Horror timelines are visualizable. VCR state is inspectable. This is not an afterthought — it's built into every module from day one.

### 6. No Orphaned Code
Every file must be imported somewhere. Every shader must be used. Every data file must be consumed. Dead code is deleted, not commented out.

---

## Lessons from Prior Art

### From `terminal-horror-redux` (What to Keep)
- ✅ Procedural shader materials (wallpaper, carpet) — good foundation, improve them
- ✅ CRT barrel distortion + chromatic aberration approach
- ✅ Phase-based development plan
- ✅ Detailed color palette specification
- ✅ Leva dev controls pattern

### From `terminal-horror-redux` (What to Fix)
- ❌ Orphaned code (VHSOverlayMaterial, BreathingWallMaterial, docs-content.ts, audio.ts stubs)
- ❌ Competing VHS systems (3 different approaches, none complete)
- ❌ setState in useFrame (causes re-renders every frame)
- ❌ Duplicated GLSL noise functions
- ❌ No state management (no Zustand, no way to coordinate systems)
- ❌ Entity always visible (no horror orchestration)
- ❌ No actual text on screen (colored rectangles as placeholders)
- ❌ Tailwind dependency for a project with almost no DOM

### From `vcr-horror` (What to Keep)
- ✅ Zustand VCR state machine — clean, working pattern
- ✅ RenderTexture for screen content — proven approach
- ✅ Raycasting for lightgun aim — works
- ✅ Curved screen geometry (parabolic Z-bulge)

### From `vcr-horror` (What to Fix)
- ❌ Minimal room (dark box, no atmosphere)
- ❌ No VHS artifact effects
- ❌ Unused CRTShader.ts (orphaned, inline shader used instead)
- ❌ Very basic Zapper model

### From `reference-the-backrooms-threejs` (What to Borrow)
- ✅ VHS post-processing GLSL shader — best reference for our VHS pass
- ✅ Camera bob/breathing system — sinusoidal micro-sway
- ✅ Audio distance attenuation pattern
- ✅ Procedural texture generation concepts (canvas-based fallback)
- ✅ DRACO compression for any GLB assets

### From `reference-backroom2` (What to Borrow)
- ✅ Spatial audio patterns (PositionalAudio)
- ✅ Fog configuration (FogExp2 for Backrooms feel)
- ✅ Light flicker patterns

---

## Supporting Documents

| Document | Description |
|----------|-------------|
| [vhs-crt-shaders.md](./vhs-crt-shaders.md) | Full GLSL shader specifications for VHS and CRT effects |
| [horror-system.md](./horror-system.md) | Horror state machine, timeline engine, entity design, screen corruption |
| [content-navigation.md](./content-navigation.md) | Tape model, content loading, page navigation, FF/REW transitions |
| [audio-system.md](./audio-system.md) | Procedural synthesis, sample management, spatial audio |
| [room-environment.md](./room-environment.md) | Room geometry, materials, lighting, beyond hallways |
| [lightgun-interaction.md](./lightgun-interaction.md) | Zapper model, aiming, shooting, hit detection, targets |
| [debug-tooling.md](./debug-tooling.md) | Debug panel, Leva controls, timeline visualizer |
| [phases.md](./phases.md) | Implementation phases, task breakdown, acceptance criteria |
