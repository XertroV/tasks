# Implementation Phases & Task Breakdown

> Part of [VCR2 Architecture Plan](./index.md)

## Overview

The project is divided into 7 phases, each building on the previous. Each phase ends with a working, demonstrable state. No phase introduces orphaned code — everything written is integrated and functional by the end of that phase.

**Total estimated effort:** ~60-80 hours across all phases.

---

## Phase 0: Project Scaffold & Tooling
**Goal:** Empty project that builds, lints, and runs.
**Estimated effort:** 2-3 hours

### Tasks

- [ ] **0.1** Create `vcr2/` directory
- [ ] **0.2** Initialize Vite + React + TypeScript project (`bun create vite vcr2 --template react-ts`)
- [ ] **0.3** Install core dependencies:
  - `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
  - `zustand`
  - `marked` (for markdown parsing)
- [ ] **0.4** Install dev dependencies:
  - `leva`
  - `@biomejs/biome`
  - `@types/three`
- [ ] **0.5** Configure Biome (`biome.json`) — formatting + linting rules
- [ ] **0.6** Configure TypeScript (`tsconfig.json`) — strict mode, path aliases
- [ ] **0.7** Configure Vite (`vite.config.ts`) — GLSL raw import support, dev port
- [ ] **0.8** Create directory structure:
  ```
  src/{room,crt,vcr,lightgun,horror,audio,content,postprocessing,debug,boot,camera,shared,stores,types}/
  ```
- [ ] **0.9** Create symlink: `ln -s ~/src/tasks/docs/src/content/docs vcr2/content/docs`
- [ ] **0.10** Create shared utilities:
  - `src/shared/constants.ts` (room dimensions, colors, timing)
  - `src/shared/colors.ts` (all color palette values)
  - `src/room/shaders/noise.glsl` (shared simplex noise — single source)
  - `src/debug/isDebug.ts` (`IS_DEBUG` flag)
  - `src/debug/logger.ts` (structured Logger class)
- [ ] **0.11** Create minimal `App.tsx` with empty R3F Canvas
- [ ] **0.12** Verify: `bun run dev` starts, blank scene renders, `bun run build` succeeds, `bun run lint` passes

### Acceptance Criteria
- Project builds with zero errors/warnings
- Dev server starts and shows a blank 3D canvas
- Biome lint passes
- Directory structure matches plan
- Symlink to docs content works

---

## Phase 1: Room Shell + CRT Hardware
**Goal:** The Backrooms room is visible with lighting. CRT TV and VCR deck are modeled (but screens are off). Entertainment center holds both.
**Estimated effort:** 8-12 hours

### Tasks

- [ ] **1.1** Implement `noise.glsl` — shared simplex noise, FBM, hash functions
- [ ] **1.2** Implement `wallpaper.frag.glsl` + `wallpaper.vert.glsl` — striped wallpaper with seams, stains, peeling, breathing vertex displacement
- [ ] **1.3** Implement `carpet.frag.glsl` — loop texture, wear patterns, traffic path
- [ ] **1.4** Implement `ceiling-tile.frag.glsl` — grid pattern, pin holes, water stains
- [ ] **1.5** Implement `Walls.tsx` — 4 wall planes (back wall has opening for hallways)
- [ ] **1.6** Implement `Floor.tsx` — carpet plane with CarpetMaterial
- [ ] **1.7** Implement `Ceiling.tsx` — ceiling plane with CeilingTileMaterial
- [ ] **1.8** Implement `FluorescentLight.tsx` — housing, tube, RectAreaLight, composite flicker (refs, not state)
- [ ] **1.9** Implement `Room.tsx` — composes Walls, Floor, Ceiling, 2x FluorescentLight
- [ ] **1.10** Implement `EntertainmentCenter.tsx` — wooden TV stand with shelves
- [ ] **1.11** Implement `CRTTelevision.tsx` — TV cabinet (wood grain), curved screen quad (dark/off), bezel, knobs, speaker grille. No screen content yet.
- [ ] **1.12** Implement `VCRDeck.tsx` — black body, tape slot, buttons (non-interactive), LED display (off)
- [ ] **1.13** Set up scene composition: Room + EntertainmentCenter + CRT + VCR
- [ ] **1.14** Configure fog (`FogExp2`), ambient light, TV glow (off for now)
- [ ] **1.15** Set up Leva controls for room parameters (wall decay, carpet wear, fog, lighting)
- [ ] **1.16** Implement basic `DebugPanel.tsx` — FPS counter, draw call count

### Acceptance Criteria
- Backrooms room renders at 60fps with visible wallpaper pattern, carpet texture, ceiling tiles
- Fluorescent lights flicker realistically (via refs, no re-render churn)
- CRT TV and VCR are visible on the entertainment center
- TV screen is dark (powered off)
- Leva controls allow real-time tuning of room parameters
- Debug panel shows FPS and draw calls
- Draw calls ≤ 25, vertices ≤ 15K

---

## Phase 2: CRT Screen + VHS Effects + Content Display
**Goal:** The CRT displays documentation text with full VHS/CRT post-processing. Content is loaded from markdown files.
**Estimated effort:** 12-16 hours

### Tasks

- [ ] **2.1** Implement `vcrStore.ts` — VCR state machine (EJECTED/LOADING/STOPPED/PLAYING/PAUSED/FF/REW), tape position, actions
- [ ] **2.2** Implement `ContentLoader.ts` — scan manifest, load/parse MDX files via `marked`, strip HTML/JSX, extract links
- [ ] **2.3** Implement `PageModel.ts` — TapePage, TapeLink, TapeModel interfaces and construction
- [ ] **2.4** Implement `contentStore.ts` — manifest loading, page cache, current page state
- [ ] **2.5** Implement `ScreenRenderer.tsx` — offscreen scene with orthographic camera, `WebGLRenderTarget` (1024x768)
- [ ] **2.6** Implement `TextLayout.tsx` — text rendering with drei `<Text>`, VT323 font, line wrapping, heading/code/link styling
- [ ] **2.7** Implement `PageView.tsx` — displays a parsed documentation page in the TextLayout system
- [ ] **2.8** Implement `MenuView.tsx` — VCR-styled main menu with section links
- [ ] **2.9** Implement `VCRDisplay.tsx` — segmented timecode display (DSEG font or canvas-rendered), mode indicator LED
- [ ] **2.10** Implement `VCRButtons.tsx` — PLAY/STOP/FF/REW/EJECT button geometry (interactive later in Phase 3)
- [ ] **2.11** Implement `vhs-effect.frag.glsl` + vertex shader — full VHS pass (tracking, head switching, chroma bleed, dropout, static, pause jitter, FF/REW artifacts, horror corruption stubs)
- [ ] **2.12** Implement `crt-effect.frag.glsl` + vertex shader — full CRT pass (barrel distortion, scanlines, phosphor mask, vignette, flicker)
- [ ] **2.13** Implement `VHSPass.ts` + `CRTPass.ts` — ShaderPass wrappers for the effect pipeline
- [ ] **2.14** Implement `EffectPipeline.tsx` — EffectComposer with VHS → CRT → Bloom chain
- [ ] **2.15** Connect CRT screen: RenderTarget texture → screen quad material, with post-processing applied
- [ ] **2.16** Implement VCR OSD in offscreen scene — mode indicator, timecode
- [ ] **2.17** Leva controls for all VHS and CRT shader uniforms
- [ ] **2.18** Verify content loading from symlinked docs

### Acceptance Criteria
- CRT screen displays actual documentation text from markdown files
- VHS effects are visible and tunable (tracking errors, scanlines, etc.)
- CRT barrel distortion and phosphor mask are visible
- VCR display shows timecode and mode
- Main menu shows all documentation sections
- 60fps maintained with full effect pipeline
- Text is legible through effects (effects enhance, not obscure)
- Content loads from symlinked `~/src/tasks/docs/` files

---

## Phase 3: Lightgun + Navigation
**Goal:** The Zapper is visible and functional. Shooting links navigates between pages with FF/REW transitions.
**Estimated effort:** 10-14 hours

### Tasks

- [ ] **3.1** Implement `ZapperModel.tsx` — procedural NES Zapper geometry (barrel, grip, trigger, cable)
- [ ] **3.2** Implement `CableGeometry` — catenary curve cable from Zapper to VCR
- [ ] **3.3** Implement `ZapperController.tsx` — weapon camera layer, position/aim tracking, recoil animation, muzzle flash
- [ ] **3.4** Implement `AimingSystem.ts` — mouse→ray, target registration, hit detection, UV-based CRT link detection
- [ ] **3.5** Implement `Crosshair.tsx` — SVG crosshair overlay with 4 color states, pulse/shake animations
- [ ] **3.6** Implement `ShootableTarget.tsx` — reusable component for anything that can be shot (links, buttons, notes)
- [ ] **3.7** Implement `navigationStore.ts` — current page, target page, transition state, history stack
- [ ] **3.8** Make CRT screen links shootable — create ShootableTargets for each link on the current page
- [ ] **3.9** Make VCR buttons shootable — PLAY/STOP/FF/REW/EJECT trigger VCR state changes
- [ ] **3.10** Implement FF/REW transition animation — 3-phase (START/SEEK/ARRIVE) driven by VHS shader uniforms
- [ ] **3.11** Implement page scroll within a page — "MORE ▼" and "TOP ▲" targets, auto-scroll in PLAY mode
- [ ] **3.12** Implement sequential navigation — PREV/NEXT targets on each page
- [ ] **3.13** Implement "MENU" target — rewinds to tape start
- [ ] **3.14** Implement keyboard navigation — Tab cycling, Enter/Space to shoot, arrow keys to scroll
- [ ] **3.15** Audio: implement procedural sounds — lightgun shot, button click, tracking beep (Web Audio API)
- [ ] **3.16** Audio: initialize AudioEngine on first user interaction
- [ ] **3.17** Hide native cursor, show crosshair
- [ ] **3.18** Leva controls for lightgun position/scale, hitbox visualization
- [ ] **3.19** Update debug panel with VCR state, navigation state, tape position

### Acceptance Criteria
- 3D Zapper visible bottom-right of screen
- Aiming at a link changes cursor to targeting state (cyan)
- Clicking fires the Zapper (sound, recoil, muzzle flash)
- Hitting a link triggers FF/REW animation and navigates to target page
- Missing plays miss feedback (orange shake, sound but no navigation)
- VCR buttons are shootable and control playback state
- Tab/Enter keyboard navigation works
- FF/REW transitions look authentic (speed lines, static, timecode advance)
- 60fps during transitions

---

## Phase 4: Camera System + "Look Behind You"
**Goal:** Camera is fixed on TV but supports the "Look Behind You" mechanic. Beyond hallways are visible.
**Estimated effort:** 6-8 hours

### Tasks

- [ ] **4.1** Implement `CameraController.tsx` — fixed look-at position, subtle breathing sway (sinusoidal)
- [ ] **4.2** Implement `BeyondHallways.tsx` — 2-3 room segments behind player with diminishing lighting, shared shader materials
- [ ] **4.3** Implement `PostItNote.tsx` — "LOOK BEHIND YOU" note on TV bezel, crumpled yellow paper, handwritten text, shootable
- [ ] **4.4** Implement `LookBehindYou.tsx` — camera rotation logic (smooth 180° lerp, ~1.5s), state management
- [ ] **4.5** Implement "LOOK AT SCREEN" floating post-it — appears when looking behind, shootable to return
- [ ] **4.6** Ensure Zapper works in both views — fires in "behind" view but has no effect
- [ ] **4.7** Audio: implement fluorescent buzz (positioned at fixtures, spatial)
- [ ] **4.8** Audio: implement VCR motor hum (positioned at VCR, spatial)
- [ ] **4.9** Audio: implement ambient room drone (sample, looping)
- [ ] **4.10** Audio: implement faint "beyond" hallway sounds (distant fluorescent buzz, spatial)
- [ ] **4.11** Leva controls for camera position, FOV, look-behind speed
- [ ] **4.12** Verify beyond hallways fog correctly — distant segments barely visible

### Acceptance Criteria
- Camera is fixed looking at TV in normal mode
- Shooting "LOOK BEHIND YOU" post-it smoothly rotates camera 180°
- Behind view shows Backrooms hallways stretching into fog
- Fluorescent lights flicker in the distance
- "LOOK AT SCREEN" post-it appears and returns camera when shot
- Zapper fires in behind view (sound + flash) but nothing happens
- Spatial audio works — VCR hum and fluorescent buzz positioned correctly
- **NOTHING appears in the hallways. Ever.**

---

## Phase 5: Boot Sequence + Polish
**Goal:** Complete boot sequence. VHS tape insert animation. Audio polish. Settings menu.
**Estimated effort:** 6-8 hours

### Tasks

- [ ] **5.1** Implement `BootSequence.tsx` — 5-phase boot (black → room → TV on → tape load → playback)
- [ ] **5.2** Implement TV power-on effect — static burst → blue "NO SIGNAL" screen
- [ ] **5.3** Implement tape loading — VCR slot animation (if feasible, otherwise display change), mechanical sounds
- [ ] **5.4** Implement tape hiss (procedural, active when tape loaded)
- [ ] **5.5** Implement static crackle (procedural, gate-controlled by tracking errors)
- [ ] **5.6** Implement "SKIP" post-it for repeat visits — uses localStorage to detect
- [ ] **5.7** Implement settings menu — horror toggle, audio volume sliders, accessibility options
- [ ] **5.8** Implement reduced-motion mode — disable shader animations, static screen, CSS fallbacks
- [ ] **5.9** Implement ARIA labels for all shootable targets
- [ ] **5.10** Implement screen-reader alternative — hidden DOM layer with accessible page content
- [ ] **5.11** Implement URL parameter support — `?horror=false`, `?page=operations/add`, `?debug=true`
- [ ] **5.12** Audio: tape screech sample for FF/REW
- [ ] **5.13** Finalize VHS shader tuning — ensure effects look authentic at default values
- [ ] **5.14** Performance audit — verify ≤50 draw calls, ≤50K vertices, ≤200MB memory
- [ ] **5.15** Cross-browser testing — Chrome, Firefox, Safari

### Acceptance Criteria
- Boot sequence plays on first visit (3-5 seconds), skippable on repeat
- All audio sounds correct — VCR motor, tape hiss, lightgun, fluorescent buzz
- Settings menu accessible
- Horror can be toggled on/off
- Reduced motion mode works
- Screen reader can navigate documentation content
- Performance within budget on 2020 midrange hardware
- No console errors in Chrome, Firefox, Safari

---

## Phase 6: Horror System
**Goal:** Full horror experience — timeline engine, entity on screen, escalation, climax, resolution.
**Estimated effort:** 12-16 hours

### Tasks

- [ ] **6.1** Implement `horrorStore.ts` — phase, intensity, entity state, effect overrides, toggle
- [ ] **6.2** Implement `TimelineEngine.ts` — event scheduling, triggering, duration tracking, repeat support, conditions, debug state
- [ ] **6.3** Implement `horror-timelines.ts` — default horror timeline with all events (DORMANT→POST)
- [ ] **6.4** Implement `corruption-effects.ts` — text corruption utilities (wrong words, zalgo text, text replacement)
- [ ] **6.5** Implement `ScreenEntity.tsx` — procedurally generated face texture, additive blending overlay on offscreen scene
- [ ] **6.6** Implement `HorrorController.tsx` — mounts when horror enabled, ticks timeline, drives shader uniforms
- [ ] **6.7** Connect horror to VHS shader — intensity-driven uniform modulation (tracking error, static, chroma bleed, horror corruption)
- [ ] **6.8** Implement horror text corruption — wrong words, text replacement, screen takeover messages
- [ ] **6.9** Implement entity flashes — brief appearances during ESCALATING phase (0.15s, 0.4s durations)
- [ ] **6.10** Implement entity manifestation — full screen presence during CLIMAX
- [ ] **6.11** Implement VCR display corruption — wrong timecodes, `HE:LP:ME:--`
- [ ] **6.12** Implement camera horror effects — subtle drift, zoom-in, shake during CLIMAX
- [ ] **6.13** Implement post-horror state — fade to black, final messages, PLAY/EJECT choice
- [ ] **6.14** Implement horror toggle behavior — smooth fade-out on disable, clean reset
- [ ] **6.15** Implement "Look Behind You" horror interactions — distant light off, detuned buzz (no visible entities)
- [ ] **6.16** Audio: whisper layers (samples, intensity-driven fade)
- [ ] **6.17** Audio: entity manifestation sound (sample)
- [ ] **6.18** Audio: ambient drone detuning (horror-driven pitch wobble)
- [ ] **6.19** Implement `TimelineVisualizer.tsx` — debug timeline bar with event markers, phase bands, controls
- [ ] **6.20** Leva controls for horror: force phase, force intensity, time scale, show entity always
- [ ] **6.21** Full playthrough testing — verify timing, pacing, and emotional arc

### Acceptance Criteria
- Horror escalates naturally over ~3.5 minutes (DORMANT → POST)
- Entity appears ONLY on the CRT screen, never in the room
- Text corruption is subtle during UNEASY, overt during CLIMAX
- VHS effects intensify convincingly with horror phase
- "Look Behind You" always shows empty hallways (even during CLIMAX)
- Horror can be toggled off at any time with smooth transition
- Post-horror state offers PLAY (restart) or EJECT (disable horror)
- Audio layers fade in/out with horror intensity
- Timeline visualizer shows all events and allows developer control
- The horror feels like a slow-burn dread, not a jumpscare

---

## Phase 7: Final Polish & Documentation
**Goal:** Production-ready release. Bug fixes, edge cases, documentation.
**Estimated effort:** 4-6 hours

### Tasks

- [ ] **7.1** Final performance optimization pass — identify and fix any bottlenecks
- [ ] **7.2** Bundle size audit — ensure no unused dependencies, proper tree-shaking
- [ ] **7.3** Verify all debug code is stripped in production build
- [ ] **7.4** Edge case testing:
  - Very fast navigation (rapid shooting)
  - Horror toggling mid-sequence
  - Browser tab backgrounding/foregrounding
  - Mobile viewport (graceful fallback or message)
  - Missing/broken content files
- [ ] **7.5** Write project README.md — setup instructions, controls, architecture overview
- [ ] **7.6** Final shader tuning — verify default values look authentic across displays
- [ ] **7.7** Production build and smoke test
- [ ] **7.8** Update this plan document with final implementation notes

### Acceptance Criteria
- Production build works on Chrome, Firefox, Safari
- 60fps on 2020 midrange hardware
- No console errors or warnings
- All documentation pages accessible
- Horror sequence plays through without glitches
- README documents setup, controls, and architecture
- Bundle size < 1MB (excluding audio samples)

---

## Phase Dependency Graph

```
Phase 0 (Scaffold)
    │
    ▼
Phase 1 (Room + CRT Hardware)
    │
    ▼
Phase 2 (Screen + VHS + Content)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 3 (Lightgun)   Phase 4 (Camera + Look Behind)
    │                  │
    └──────┬───────────┘
           ▼
    Phase 5 (Boot + Polish)
           │
           ▼
    Phase 6 (Horror)
           │
           ▼
    Phase 7 (Final Polish)
```

Phases 3 and 4 can be developed **in parallel** after Phase 2 is complete. All other phases are sequential.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| VHS shader too heavy for 60fps | High | Profile early (Phase 2), reduce resolution, merge passes if needed |
| RenderTexture text quality poor | Medium | Test multiple resolutions, try Canvas2D fallback if MSDF quality insufficient |
| Raycasting through RenderTexture finicky | Medium | UV-mapping approach (Approach B) is simpler; proxy mesh fallback available |
| Horror timing feels wrong | Medium | Timeline visualizer enables rapid iteration; all durations configurable |
| Audio context initialization fails | Low | Graceful degradation — project works without audio |
| MDX parsing strips important content | Medium | Test with all 48 doc pages early; expand parser if needed |
| Cable physics look bad | Low | Static catenary is fine — no physics needed |
| Leva tree-shaking incomplete | Low | Verify with production bundle analysis; conditional dynamic import as fallback |
| Beyond hallways too expensive | Low | Reduce to 2 segments or use cubemap fallback if needed |

---

## Definition of Done (per Phase)

Every phase must meet these criteria before moving to the next:

1. **Builds:** `bun run build` succeeds with zero errors
2. **Lints:** `bun run lint` passes with zero errors
3. **Runs:** Dev server starts and feature is usable
4. **Performance:** 60fps maintained on development machine
5. **No orphans:** Every file is imported, every shader is used, every store is consumed
6. **Debug:** New systems expose state to debug panel
7. **Logged:** Module-specific logger used for important state transitions
