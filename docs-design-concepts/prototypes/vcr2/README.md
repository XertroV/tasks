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

## Known Limitations

- Leva debug controls are included in the bundle (needs refactor for full removal)
- WebGL2 required (no WebGL1 fallback)
- Touch controls not fully implemented for mobile

## License

Private project - All rights reserved
