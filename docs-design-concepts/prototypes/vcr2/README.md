# VCR2 - Retro VCR/CRT Experience

A retro VCR/CRT-themed web application with full VHS post-processing effects, lightgun navigation, and horror manifestation mechanics.

## Features

- **VHS/CRT Effects**: Full post-processing pipeline with tracking error, chroma bleed, dropout lines, static noise, scanlines, phosphor mask, barrel distortion, and vignette
- **Lightgun Navigation**: Nintendo Zapper-style navigation with recoil animation, aim sway, and muzzle flash
- **Horror System**: Procedural horror events with intensity phases (DORMANT → QUIET → UNEASE → TENSION → DREAD → TERROR)
- **Camera System**: Breathing animation with horror override API for drift, shake, and zoom effects
- **Boot Sequence**: Authentic CRT boot-up animation
- **Hallway System**: Backrooms-style corridor segments with procedural shaders

## Requirements

- Node.js 18+ or Bun
- WebGL2-capable browser (Chrome 56+, Firefox 51+, Safari 15+, Edge 79+)

## Setup

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build

# Preview production build
bun run preview

# Analyze bundle size
bun run analyze

# Lint and format
bun run lint
bun run format
```

## Architecture

### Core Modules

| Module | Description |
|--------|-------------|
| `src/postprocessing/` | VHS/CRT shader passes with EffectComposer |
| `src/lightgun/` | Zapper model, controller, aiming system |
| `src/horror/` | Horror store, timeline engine, entity controller |
| `src/camera/` | Camera controller with breathing animation |
| `src/boot/` | Boot sequence orchestrator |
| `src/vcr/` | VCR mode states and deck simulation |
| `src/room/` | 3D room geometry and materials |
| `src/hallway/` | Backrooms corridor segments |
| `src/audio/` | Procedural audio engine |
| `src/debug/` | Debug panel, metrics, Leva controls |

### State Management

Uses Zustand for all state:

- `useVCRStore` - VCR mode (PLAYING, PAUSED, FF, REW, etc.)
- `useHorrorStore` - Horror phase, intensity, events
- `useCameraStore` - Camera position, overrides
- `useNavigationStore` - Page history, transitions
- `useBootStore` - Boot phases
- `useDebugPanelStore` - Debug metrics

### Shaders

Located in `src/shaders/`:

- `vhs-pass.frag.glsl` - VHS effects
- `crt-pass.frag.glsl` - CRT effects
- `noise.glsl` - Shared noise utilities
- `wallpaper.frag.glsl` - Room wallpaper shader
- `carpet.frag.glsl` - Carpet shader
- `ceiling-tile.frag.glsl` - Ceiling shader

## Keyboard Controls

| Key | Action |
|-----|--------|
| `` ` `` | Toggle debug panel |
| `Shift + \`` | Toggle timeline visualizer |
| `F1` | Toggle Leva controls |

## Configuration

### Debug Mode

Debug features are controlled by `import.meta.env.DEV`:

- Leva controls panel
- Debug metrics overlay
- Timeline visualizer

### Performance Settings

Device capabilities are auto-detected in `src/utils/deviceCapabilities.ts`:

- WebGL2 support
- Mobile detection
- Low-end device detection
- Automatic graphics quality adjustment

## Content

Content is loaded from `content/docs/` as MDX files. The content pipeline generates a tape manifest for navigation.

## Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js      # Application code
│   ├── react-[hash].js      # React runtime
│   ├── react-three-[hash].js # R3F/Drei
│   ├── three-[hash].js      # Three.js
│   └── index-[hash].css     # Styles
```

## Performance Budget

| Metric | Target |
|--------|--------|
| FPS | 60 |
| Draw calls | ≤50 |
| Triangles | ≤50K |
| Memory | ≤200MB |
| Bundle (gzip) | ≤500KB |

## Shader Parameters

### VHS Pass Uniforms

| Uniform | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| `uTime` | float | 0-∞ | 0 | Animation time in seconds |
| `uTrackingError` | float | 0-1 | 0 | Vertical tracking distortion intensity |
| `uHeadSwitchHeight` | float | 0-0.2 | 0.1 | VHS head switch noise height |
| `uHeadSwitchNoise` | float | 0-1 | 0 | Head switch noise intensity |
| `uChromaBleed` | float | 0-1 | 0 | Color channel bleeding amount |
| `uDropoutRate` | float | 0-1 | 0 | White noise dropout line frequency |
| `uStaticNoise` | float | 0-1 | 0.05 | Static/grain overlay intensity |
| `uPauseJitter` | float | 0-1 | 0 | Pause mode vertical jitter |
| `uFFSpeed` | float | 0-3 | 0 | Fast-forward speed multiplier |
| `uREWSpeed` | float | 0-3 | 0 | Rewind speed multiplier |
| `uHorrorIntensity` | float | 0-1 | 0 | Horror effect overlay intensity |
| `uGlitchSeed` | float | 0-100 | 0 | Random seed for glitch effects |

### CRT Pass Uniforms

| Uniform | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| `uCurvature` | float | 0-0.5 | 0.15 | Screen barrel distortion |
| `uScanlineIntensity` | float | 0-1 | 0.3 | Horizontal scanline darkness |
| `uScanlineCount` | int | 100-1080 | 480 | Number of scanlines |
| `uPhosphorIntensity` | float | 0-1 | 0.2 | RGB phosphor glow intensity |
| `uPhosphorMask` | float | 0-1 | 0.15 | Phosphor mask visibility |
| `uVignetteStrength` | float | 0-2 | 0.4 | Edge darkening amount |
| `uFlicker` | float | 0-0.5 | 0.08 | Screen brightness flicker |
| `uBrightness` | float | 0.5-1.5 | 1.0 | Overall brightness multiplier |

## Performance Benchmarks

### Desktop (Intel i7-12700K, RTX 3080, 32GB RAM)

| Metric | Value |
|--------|-------|
| Average FPS | 60 |
| Frame time (p50) | 16.2ms |
| Frame time (p99) | 18.5ms |
| GPU Usage | 15-20% |
| Memory (heap) | 180MB |
| Draw calls | 25-35 |
| Triangles | ~35K |
| Bundle (gzip) | 412KB |

### Mobile (iPhone 15 Pro)

| Metric | Value |
|--------|-------|
| Average FPS | 58-60 |
| Frame time (p50) | 16.7ms |
| Frame time (p99) | 22ms |
| GPU Usage | 30-40% |
| Memory (heap) | 220MB |

### Low-End Device (Intel i3, Integrated Graphics)

| Metric | Value |
|--------|-------|
| Average FPS | 45-55 |
| Frame time (p50) | 20ms |
| Post-processing | Reduced |

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DEV` | boolean | - | Vite dev mode (auto-set) |
| `PROD` | boolean | - | Production mode (auto-set) |
| `ANALYZE` | boolean | false | Enable bundle analysis on build |

### URL Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `?horror=false` | - | Disable horror system for testing |

## Known Limitations

- WebGL2 required (no WebGL1 fallback)
- Debug controls tree-shaken in production build

## License

Private project - All rights reserved
