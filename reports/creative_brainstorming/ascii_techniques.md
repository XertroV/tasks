# ASCII Alchemy: Advanced Rendering Techniques for "The Backlogs"

A collection of implementable Python techniques for rendering a logo inspired
by The Backrooms aesthetic — sickly fluorescent light, moist carpet, VHS
found-footage corruption, and the creeping wrongness of infinite empty
office corridors.

All code uses ANSI truecolor (24-bit) escape sequences and is designed to
be copy-pasted into a `logo.py` script.

---

## Table of Contents

1. [Shared Utilities](#1-shared-utilities)
2. [Wet Carpet Texture](#2-wet-carpet-texture)
3. [VHS Tracking Artifact Effect](#3-vhs-tracking-artifact-effect)
4. [Fluorescent Light Bar Rendering](#4-fluorescent-light-bar-rendering)
5. [Zalgo Corruption Scale](#5-zalgo-corruption-scale)
6. [Glow/Bloom Shader](#6-glowbloom-shader)
7. [Perspective Corridor Renderer](#7-perspective-corridor-renderer)
8. [Combining Techniques](#8-combining-techniques)

---

## 1. Shared Utilities

These helper functions are used across multiple techniques.

```python
import random
import math
import unicodedata

RESET = "\x1b[0m"

def fg(r: int, g: int, b: int) -> str:
    """ANSI truecolor foreground."""
    return f"\x1b[38;2;{r};{g};{b}m"

def bg(r: int, g: int, b: int) -> str:
    """ANSI truecolor background."""
    return f"\x1b[48;2;{r};{g};{b}m"

def fg_bg(fr: int, fg_: int, fb: int, br: int, bg_: int, bb: int) -> str:
    """Combined foreground + background ANSI sequence."""
    return f"\x1b[38;2;{fr};{fg_};{fb};48;2;{br};{bg_};{bb}m"

def lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation."""
    return a + (b - a) * t

def lerp_color(c1: tuple, c2: tuple, t: float) -> tuple:
    """Interpolate two RGB tuples."""
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )

def clamp(val, lo=0, hi=255):
    return max(lo, min(hi, val))

# The Backrooms color palette
BACKROOMS = {
    "fluorescent_white":  (255, 252, 230),   # warm white from ceiling tubes
    "sickly_yellow":      (230, 210, 120),   # the dominant "off" yellow
    "wallpaper_yellow":   (200, 185, 95),    # aged wallpaper
    "carpet_tan":         (160, 140, 90),    # carpet base color
    "carpet_dark":        (110, 95, 55),     # carpet shadow / worn areas
    "stain_brown":        (85, 65, 30),      # moisture stains
    "stain_dark":         (55, 40, 15),      # deep stains
    "ceiling_white":      (210, 205, 185),   # slightly yellowed ceiling tiles
    "void_dark":          (25, 22, 12),      # deep shadow
    "light_buzz_green":   (200, 230, 180),   # fluorescent green tint
}
```

---

## 2. Wet Carpet Texture

### Theory

The Backrooms carpet is thin commercial-grade carpet tile — the kind in
1990s office buildings. It has a low pile, subtle pattern, and crucially,
areas of moisture damage. We simulate this with:

1. **Character density** — different Unicode characters have different
   visual weights that simulate pile texture
2. **Color variation** — subtle shifts in hue simulate wear patterns
3. **Stain zones** — darker, browner patches where moisture has set in

### Character Selection

Carpet texture works best with characters that have irregular, organic fill
patterns. Here's the carpet character palette ranked by density:

```
Lightest to heaviest carpet feel:
  ·  ∙  :  ░  ⡀  ⠂  ⠒  ▪  ⡂  ▒  ⡪  ⣢  ⣶  ▓  ⣿

Best "carpet fiber" characters (Braille — irregular, organic):
  ⠁ ⠂ ⠄ ⡀ ⡂ ⡌ ⡪ ⢕ ⣖ ⣶ ⣾ ⣿

Best "carpet weave" characters (traditional):
  ░ ▒ ▓ · : ; = + *
```

The Braille characters are ideal because their dot patterns look like
individual carpet fibers under magnification, creating an organic, textile
feel that block characters cannot achieve.

### Implementation

```python
import random
import math

# Carpet fiber characters grouped by visual density (0.0 = bare, 1.0 = thick)
CARPET_CHARS = [
    (0.0, ' '),
    (0.1, '·'),
    (0.15, '⠁'),
    (0.2, '⠂'),
    (0.25, '⠒'),
    (0.3, '░'),
    (0.35, '⡀'),
    (0.4, '⡂'),
    (0.5, '⡌'),
    (0.55, '▒'),
    (0.6, '⡪'),
    (0.7, '⢕'),
    (0.75, '⣖'),
    (0.8, '▓'),
    (0.85, '⣶'),
    (0.9, '⣾'),
    (1.0, '⣿'),
]

def _pick_carpet_char(density: float) -> str:
    """Pick a carpet character matching the target density (0.0–1.0).

    Adds slight randomness to avoid uniform tiling.
    """
    # Jitter the density slightly for organic feel
    d = density + random.uniform(-0.08, 0.08)
    d = max(0.0, min(1.0, d))
    # Find closest match
    best_char = ' '
    best_dist = float('inf')
    for char_density, char in CARPET_CHARS:
        dist = abs(char_density - d)
        if dist < best_dist:
            best_dist = dist
            best_char = char
    return best_char


def _carpet_base_color(x: int, y: int, seed: int = 42) -> tuple:
    """Generate base carpet color with subtle Perlin-like variation.

    Uses layered sine waves as a cheap noise substitute.
    """
    base = BACKROOMS["carpet_tan"]
    # Multi-frequency "noise" via overlapping sine waves
    noise = (
        math.sin(x * 0.3 + y * 0.7 + seed) * 0.3 +
        math.sin(x * 0.7 - y * 0.4 + seed * 1.3) * 0.2 +
        math.sin(x * 1.1 + y * 1.3 + seed * 0.7) * 0.1
    )
    # Apply noise as brightness variation (±15%)
    factor = 1.0 + noise * 0.15
    return (
        clamp(int(base[0] * factor)),
        clamp(int(base[1] * factor)),
        clamp(int(base[2] * factor)),
    )


def _stain_influence(x: int, y: int, stain_positions: list) -> float:
    """Calculate stain darkness at (x, y) from nearby stain centers.

    Returns 0.0 (no stain) to 1.0 (deep stain center).
    Each stain is (cx, cy, radius, intensity).
    """
    max_influence = 0.0
    for cx, cy, radius, intensity in stain_positions:
        # Distance with aspect ratio correction (chars are ~2:1)
        dx = (x - cx) * 0.5  # horizontal chars are wider
        dy = y - cy
        dist = math.sqrt(dx * dx + dy * dy)
        if dist < radius:
            # Soft falloff
            t = 1.0 - (dist / radius)
            influence = t * t * intensity  # quadratic falloff
            # Add irregular edge via noise
            edge_noise = math.sin(x * 2.3 + y * 1.7) * 0.15
            influence = max(0.0, influence + edge_noise)
            max_influence = max(max_influence, influence)
    return min(1.0, max_influence)


def carpet_texture(
    width: int,
    height: int,
    stain_positions: list | None = None,
    base_density: float = 0.55,
    seed: int = 42,
) -> list[str]:
    """Generate wet carpet texture as ANSI-colored strings.

    Args:
        width: Number of character columns.
        height: Number of character rows.
        stain_positions: List of (cx, cy, radius, intensity) tuples.
            cx, cy: center position
            radius: stain radius in character units
            intensity: 0.0–1.0 darkness
        base_density: Base carpet pile density (0.0–1.0).
        seed: Random seed for reproducibility.

    Returns:
        List of ANSI-escaped strings, one per row.
    """
    if stain_positions is None:
        stain_positions = []

    random.seed(seed)
    lines = []

    for y in range(height):
        row_parts = []
        for x in range(width):
            # --- Determine carpet density ---
            # Slight wear patterns from foot traffic (center is more worn)
            cx_norm = abs(x - width / 2) / (width / 2)
            cy_norm = y / height
            # Traffic wear: center of carpet is more worn
            traffic_wear = 1.0 - 0.3 * math.exp(-4.0 * cx_norm * cx_norm)
            density = base_density * traffic_wear
            # Add local variation
            density += math.sin(x * 0.8 + y * 1.2) * 0.1

            # --- Determine color ---
            base_color = _carpet_base_color(x, y, seed)

            # Apply stain influence
            stain = _stain_influence(x, y, stain_positions)
            if stain > 0.0:
                # Blend toward stain color
                stain_color = BACKROOMS["stain_brown"]
                deep_stain = BACKROOMS["stain_dark"]
                if stain > 0.6:
                    target = lerp_color(stain_color, deep_stain, (stain - 0.6) / 0.4)
                else:
                    target = lerp_color(base_color, stain_color, stain / 0.6)
                color = target
                # Stains reduce pile density (matted fibers)
                density *= (1.0 - stain * 0.4)
            else:
                color = base_color

            # --- Pick character and colorize ---
            char = _pick_carpet_char(density)
            # Foreground: carpet fiber color (slightly lighter than bg)
            fg_color = (
                clamp(color[0] + 15),
                clamp(color[1] + 12),
                clamp(color[2] + 8),
            )
            # Background: carpet backing / shadow color
            bg_color = (
                clamp(color[0] - 20),
                clamp(color[1] - 18),
                clamp(color[2] - 12),
            )

            row_parts.append(
                f"{fg_bg(fg_color[0], fg_color[1], fg_color[2], bg_color[0], bg_color[1], bg_color[2])}{char}"
            )
        row_parts.append(RESET)
        lines.append("".join(row_parts))

    return lines
```

### Example Usage & Output

```python
# Generate a 60x12 carpet patch with two moisture stains
stains = [
    (15, 5, 8, 0.9),   # Large stain at (15, 5), radius 8, intense
    (42, 8, 5, 0.6),   # Smaller stain at (42, 8), radius 5, moderate
]
carpet = carpet_texture(60, 12, stain_positions=stains)
for line in carpet:
    print(line)
```

**What it looks like** (approximation without ANSI):
```
⡌⡪⡂⡌⢕░⡪⡌⡂⡌⡪⢕⡪⡌⡂⡌⡪⡂⡌⢕░⡪⡌⡂⡌⡪⢕⡪⡌⡂⡌⡪⡂⡌⢕░⡪⡌⡂⡌⡪⢕⡪⡌⡂⡌
⡪⢕⡌⡪⡂⡌⢕⡪⡌⡂⡌⡪⡂⡌⢕░⡪⡌⡂⡌⡪⡂⡌⢕░⡪⡌⡂⡌⡪⡂⡌⢕░⡪⡌⡂⡌⡪⡂⡌⢕░⡪⡌⡂⡌
⡂⡌⡪⡂░⡪⡌⡂⡌▒⡪⢕⡌·⠂⠒⡀⡂⡌⡪⢕⡌⡪⡂⡌⡪⢕⡪⡌⡂⡌⡪⡂⡌⢕░⡪⡌⡂⡌⡪⢕⡪⡌⡂⡌⡪
⡌⢕⡂⡌⡪⡂⡌·⠒⠂·⠁ · ⠁·⠂⡀⡂⡌⡪⢕⡪⡌⡂⡌⡪⡂⡌⢕░⡪⡌⡂⡌⡪⡂⡌⢕░⡪⡌⡂⡌⡪⡂
               ^^^ stain zone: darker, matted characters
```

With ANSI colors, the carpet is tan/beige with brownish-dark stain patches
that have matted, sparser character density — exactly like water damage on
cheap commercial carpet.

### Combination Notes

- Layer the corridor renderer (Section 7) on top of carpet for the floor
- Use `_stain_influence()` to also drive Zalgo corruption on text overlaid
  on carpet — stained areas corrupt nearby text
- The fluorescent light bars (Section 4) should brighten carpet color in
  their glow zones

---

## 3. VHS Tracking Artifact Effect

### Theory

VHS tracking artifacts are caused by misalignment of the tape head with
the recorded signal. Visually they produce:

1. **Horizontal displacement** — bands of the image shift left or right
2. **Color fringing** — RGB channels separate at displacement boundaries
3. **Static noise** — random characters replace the signal
4. **Brightness banding** — some scanlines are brighter or darker

### Implementation

```python
import random
import re

# Characters that look like VHS static/noise
VHS_NOISE_CHARS = "▓▒░▚▞▙▛█▜▟⣿⡿⣷⣯⣟╳╱╲░▒"
# Characters for mild interference
VHS_MILD_NOISE = "░▒·~-=≈"

def _strip_ansi(s: str) -> str:
    """Remove ANSI escape sequences from a string."""
    return re.sub(r'\x1b\[[0-9;]*m', '', s)

def _visible_len(s: str) -> int:
    """Length of string excluding ANSI escape sequences."""
    return len(_strip_ansi(s))

def _insert_ansi_at(s: str, pos: int, insertion: str) -> str:
    """Insert an ANSI sequence at a visible-character position."""
    visible_idx = 0
    real_idx = 0
    in_escape = False
    for real_idx, ch in enumerate(s):
        if ch == '\x1b':
            in_escape = True
            continue
        if in_escape:
            if ch == 'm':
                in_escape = False
            continue
        if visible_idx == pos:
            return s[:real_idx] + insertion + s[real_idx:]
        visible_idx += 1
    return s + insertion


def apply_vhs_tracking(
    lines: list[str],
    intensity: float = 0.3,
    seed: int | None = None,
) -> list[str]:
    """Apply VHS tracking artifact effect to lines of (optionally ANSI-colored) text.

    Args:
        lines: Input lines, may contain ANSI color codes.
        intensity: 0.0 (pristine) to 1.0 (unwatchable). 0.3 is a good default.
        seed: Random seed for reproducibility; None for true random.

    Returns:
        New list of corrupted lines.

    Effect breakdown by intensity:
        0.0–0.2: Occasional slight horizontal jitter
        0.2–0.4: Noticeable displacement bands, some static
        0.4–0.6: Heavy displacement, color fringing, noise bands
        0.6–0.8: Large portions displaced, heavy noise
        0.8–1.0: Nearly destroyed signal
    """
    if seed is not None:
        random.seed(seed)

    result = []
    num_lines = len(lines)

    # Determine tracking band (a region of heavy distortion)
    # VHS tracking typically affects a horizontal band that drifts vertically
    band_center = random.randint(0, num_lines - 1)
    band_width = max(2, int(num_lines * 0.15 * intensity))

    for i, line in enumerate(lines):
        # Distance from tracking band center
        band_dist = abs(i - band_center)
        in_band = band_dist <= band_width
        band_factor = max(0.0, 1.0 - band_dist / max(band_width, 1))

        corrupted = line
        vis_len = _visible_len(line)

        # --- 1. Horizontal Displacement ---
        # Lines near the tracking band get shifted
        if in_band and random.random() < intensity * 1.5:
            shift = int(random.gauss(0, 3 * intensity * band_factor))
            shift = max(-15, min(15, shift))
            plain = _strip_ansi(line)
            if shift > 0:
                # Shift right: pad left, content moves right
                padding = random.choice(VHS_MILD_NOISE) * shift
                corrupted_plain = padding + plain[:vis_len - shift]
            elif shift < 0:
                # Shift left: content moves left, pad right
                s = abs(shift)
                padding = random.choice(VHS_MILD_NOISE) * s
                corrupted_plain = plain[s:] + padding
            else:
                corrupted_plain = plain

            # Reapply a simple color to the displaced line
            # (displacement breaks original ANSI codes — this is intentional;
            #  real VHS distortion also breaks chroma)
            corrupted = corrupted_plain

        # --- 2. Color Fringing at Displacement Boundaries ---
        if in_band and band_factor > 0.3:
            # Add rainbow fringe at the boundary
            fringe_colors = [
                fg(255, 50, 50),    # Red channel bleed
                fg(50, 255, 50),    # Green channel bleed
                fg(80, 80, 255),    # Blue channel bleed
            ]
            # Insert 1-3 fringe characters at a random position
            pos = random.randint(0, max(0, _visible_len(corrupted) - 3))
            fringe_char = random.choice("▌▐│|")
            num_fringe = random.randint(1, min(3, int(4 * intensity)))
            fringe_str = ""
            for f_idx in range(num_fringe):
                c = fringe_colors[f_idx % len(fringe_colors)]
                fringe_str += f"{c}{fringe_char}"
            fringe_str += RESET
            corrupted = _insert_ansi_at(corrupted, pos, fringe_str)

        # --- 3. Static/Noise Injection ---
        if random.random() < intensity * 0.6:
            # Replace random characters with noise
            chars = list(_strip_ansi(corrupted))
            noise_count = int(len(chars) * intensity * band_factor * 0.4)
            for _ in range(noise_count):
                pos = random.randint(0, len(chars) - 1)
                noise_char = random.choice(VHS_NOISE_CHARS)
                chars[pos] = noise_char
            # Reassemble with noise coloring
            parts = []
            for ch in chars:
                if ch in VHS_NOISE_CHARS:
                    # Noise gets a random grayish/static color
                    gray = random.randint(60, 200)
                    parts.append(f"{fg(gray, gray, gray + random.randint(-20, 20))}{ch}")
                else:
                    parts.append(ch)
            parts.append(RESET)
            corrupted = "".join(parts)

        # --- 4. Brightness Banding ---
        # Some scanlines are brighter (like the VHS head switching point)
        if in_band and random.random() < 0.4 * intensity:
            # Make this scanline brighter by prepending bold
            corrupted = "\x1b[1m" + corrupted

        # --- 5. Complete scanline dropout (high intensity only) ---
        if intensity > 0.5 and in_band and random.random() < (intensity - 0.5) * 0.3:
            # Replace entire line with static
            noise_line = "".join(
                f"{fg(random.randint(40, 180), random.randint(40, 180), random.randint(40, 180))}{random.choice(VHS_NOISE_CHARS)}"
                for _ in range(vis_len)
            )
            corrupted = noise_line + RESET

        result.append(corrupted)

    return result
```

### Example Usage

```python
# Apply to logo text
logo = [
    "  ████████╗██╗  ██╗███████╗                     ",
    "  ╚══██╔══╝██║  ██║██╔════╝                     ",
    "     ██║   ███████║█████╗                        ",
    "     ██║   ██╔══██║██╔══╝                        ",
    "     ██║   ██║  ██║███████╗                      ",
    "     ╚═╝   ╚═╝  ╚═╝╚══════╝                     ",
    "  ██████╗  █████╗  ██████╗██╗  ██╗██╗      ██████╗  ██████╗ ███████╗",
    "  ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██║     ██╔═══██╗██╔════╝ ██╔════╝",
    "  ██████╔╝███████║██║     █████╔╝ ██║     ██║   ██║██║  ███╗███████╗",
    "  ██╔══██╗██╔══██║██║     ██╔═██╗ ██║     ██║   ██║██║   ██║╚════██║",
    "  ██████╔╝██║  ██║╚██████╗██║  ██╗███████╗╚██████╔╝╚██████╔╝███████║",
    "  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝",
]

# Mild VHS effect — creepy but readable
mild = apply_vhs_tracking(logo, intensity=0.2, seed=42)

# Heavy VHS effect — found-footage horror
heavy = apply_vhs_tracking(logo, intensity=0.6, seed=42)

for line in mild:
    print(line)
```

**Approximate visual (mild, 0.2 intensity):**
```
  ████████╗██╗  ██╗███████╗
  ╚══██╔══╝██║  ██║██╔════╝
     ██║   ███████║█████╗
     ██║   ██╔══██║██╔══╝
     ██║  ≈██║  ██║███████╗          <-- slight jitter
     ╚═╝   ╚═╝  ╚═╝╚══════╝
  ██████╗  █████╗  ██████╗██╗  ██╗██╗      ██████╗  ██████╗ ███████╗
 ░██╔══██╗██╔══██╗██╔═▒══╝██║ ██╔╝██║     ██╔═══██╗██╔════╝ ██╔════╝
  ██████╔╝██▚████║██║     █████╔╝ ██║     ██║   ██║██║  ███╗███████╗
  ██╔══██╗██╔══██║██║     ██╔═██╗ ██║     ██║   ██║██║   ██║╚════██║
~=██████╔╝██║  ██║╚██████╗██║  ██╗███▓██╗╚██████╔╝╚██████╔╝███████║  <-- displacement + noise
  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝
```

With color, the fringing characters would appear as red/green/blue vertical
bars at the displacement boundaries — exactly like real VHS tracking errors.

### Combination Notes

- Apply VHS after all other rendering (it's a post-process)
- Layer with Zalgo corruption (Section 5) for maximum found-footage dread
- The tracking band position can be animated (increment `band_center` per frame)
  to simulate the band drifting up the screen — classic VHS tracking roll

---

## 4. Fluorescent Light Bar Rendering

### Theory

Fluorescent tubes in The Backrooms are the primary light source. They're
long horizontal tubes with these visual characteristics:

1. **The tube** — a bright white/yellow-green core, typically 1 char tall
2. **End caps** — slightly dimmer brackets at tube ends
3. **Glow halo** — light cast on the surrounding ceiling
4. **Color temperature** — slightly greenish-warm, not pure white
5. **Flicker modes** — working, buzzing, dying, dead

### Implementation

```python
import random
import math

def render_fluorescent_bar(
    width: int,
    tube_y: int = 1,
    total_height: int = 5,
    state: str = "working",  # "working", "buzzing", "dying", "dead"
    frame: int = 0,
) -> list[str]:
    """Render a horizontal fluorescent light tube with ceiling glow.

    Args:
        width: Total width in characters.
        tube_y: Row index of the tube itself (0-indexed from top).
        total_height: Total height of the rendered area.
        state: Light state — "working", "buzzing", "dying", or "dead".
        frame: Animation frame counter (for flicker effects).

    Returns:
        List of ANSI-colored strings, one per row.
    """
    # --- Determine brightness based on state ---
    if state == "dead":
        brightness = 0.0
    elif state == "dying":
        # Irregular flicker pattern — mostly off with occasional bright flashes
        patterns = [0.0, 0.0, 0.0, 0.8, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 1.0, 0.3, 0.0]
        brightness = patterns[frame % len(patterns)]
        # Add random complete dropout
        if random.random() < 0.3:
            brightness = 0.0
    elif state == "buzzing":
        # Rapid high-frequency flutter — mostly on but with dips
        base = 0.85 + 0.15 * math.sin(frame * 0.8)
        if random.random() < 0.08:
            base *= random.uniform(0.3, 0.7)
        brightness = base
    else:  # working
        # Gentle, barely perceptible pulse
        brightness = 0.92 + 0.08 * math.sin(frame * 0.1)

    # --- Color: warm fluorescent = white with green/yellow tint ---
    # The tube itself
    tube_color_fg = (
        clamp(int(255 * brightness)),
        clamp(int(252 * brightness)),
        clamp(int(230 * brightness)),
    )
    tube_color_bg = (
        clamp(int(200 * brightness)),
        clamp(int(210 * brightness)),
        clamp(int(180 * brightness)),
    )

    # Glow color (cast on ceiling) — more yellow, dimmer
    glow_intensity = brightness * 0.5
    glow_color = (
        clamp(int(220 * glow_intensity)),
        clamp(int(210 * glow_intensity)),
        clamp(int(140 * glow_intensity)),
    )

    # Faint glow (outer halo)
    faint_intensity = brightness * 0.2
    faint_color = (
        clamp(int(180 * faint_intensity)),
        clamp(int(170 * faint_intensity)),
        clamp(int(100 * faint_intensity)),
    )

    # Ceiling base color (slightly yellowed tiles, unlit)
    ceiling_base = (42, 40, 32)

    # --- Build the tube line ---
    tube_margin = 4  # empty space before/after tube
    tube_length = width - tube_margin * 2

    rows = []
    for y in range(total_height):
        parts = []
        dist_from_tube = abs(y - tube_y)

        for x in range(width):
            in_tube_range = tube_margin <= x < tube_margin + tube_length
            dist_from_tube_x = 0
            if x < tube_margin:
                dist_from_tube_x = tube_margin - x
            elif x >= tube_margin + tube_length:
                dist_from_tube_x = x - (tube_margin + tube_length) + 1
            total_dist = math.sqrt(dist_from_tube ** 2 + (dist_from_tube_x * 0.5) ** 2)

            if y == tube_y and in_tube_range:
                # --- The tube itself ---
                if brightness == 0.0:
                    # Dead tube: dim gray cylinder
                    parts.append(f"{fg_bg(80, 80, 75, 50, 50, 45)}━")
                else:
                    # Lit tube: bright core
                    # Vary color slightly along length for realism
                    x_factor = math.sin((x - tube_margin) * 0.15 + frame * 0.05)
                    warm_shift = int(x_factor * 10 * brightness)
                    tc_fg = (
                        clamp(tube_color_fg[0] + warm_shift),
                        clamp(tube_color_fg[1]),
                        clamp(tube_color_fg[2] - warm_shift),
                    )
                    tc_bg = tube_color_bg
                    parts.append(f"{fg_bg(tc_fg[0], tc_fg[1], tc_fg[2], tc_bg[0], tc_bg[1], tc_bg[2])}━")

            elif y == tube_y and (x == tube_margin - 1 or x == tube_margin + tube_length):
                # --- End caps ---
                cap_brightness = brightness * 0.6
                cap_color = (
                    clamp(int(180 * cap_brightness)),
                    clamp(int(175 * cap_brightness)),
                    clamp(int(160 * cap_brightness)),
                )
                cap_bg = (
                    clamp(ceiling_base[0] + int(40 * brightness)),
                    clamp(ceiling_base[1] + int(38 * brightness)),
                    clamp(ceiling_base[2] + int(25 * brightness)),
                )
                bracket = "╸" if x == tube_margin - 1 else "╺"
                parts.append(f"{fg_bg(cap_color[0], cap_color[1], cap_color[2], cap_bg[0], cap_bg[1], cap_bg[2])}{bracket}")

            elif total_dist < 1.5 and brightness > 0:
                # --- Inner glow (adjacent to tube) ---
                glow_chars = "░▒"
                gc = glow_chars[0] if total_dist > 1.0 else glow_chars[1]
                bg_color = (
                    clamp(ceiling_base[0] + int(glow_color[0])),
                    clamp(ceiling_base[1] + int(glow_color[1])),
                    clamp(ceiling_base[2] + int(glow_color[2])),
                )
                parts.append(f"{fg_bg(glow_color[0], glow_color[1], glow_color[2], bg_color[0], bg_color[1], bg_color[2])}{gc}")

            elif total_dist < 3.0 and brightness > 0:
                # --- Outer glow ---
                t = (total_dist - 1.5) / 1.5
                glow_fade = lerp_color(faint_color, (0, 0, 0), t)
                bg_color = (
                    clamp(ceiling_base[0] + glow_fade[0]),
                    clamp(ceiling_base[1] + glow_fade[1]),
                    clamp(ceiling_base[2] + glow_fade[2]),
                )
                parts.append(f"{bg(bg_color[0], bg_color[1], bg_color[2])} ")

            else:
                # --- Dark ceiling ---
                parts.append(f"{bg(ceiling_base[0], ceiling_base[1], ceiling_base[2])} ")

        parts.append(RESET)
        rows.append("".join(parts))

    return rows


def render_light_grid(
    width: int,
    height: int,
    tube_spacing: int = 8,
    tube_width_frac: float = 0.6,
    states: list[str] | None = None,
    frame: int = 0,
) -> list[str]:
    """Render a grid of fluorescent lights (as seen from below on a ceiling).

    Args:
        width: Total width in characters.
        height: Total height in characters.
        tube_spacing: Vertical spacing between tube rows.
        tube_width_frac: Fraction of width covered by each tube.
        states: List of states for each tube row ("working", "buzzing", "dying", "dead").
        frame: Animation frame counter.

    Returns:
        List of ANSI-colored strings.
    """
    ceiling_base = (42, 40, 32)
    # Initialize blank ceiling
    result_lines = [f"{bg(ceiling_base[0], ceiling_base[1], ceiling_base[2])}{' ' * width}{RESET}" for _ in range(height)]

    # Place tubes
    tube_y_positions = list(range(2, height - 1, tube_spacing))
    if states is None:
        # Default: mostly working, some buzzing, maybe one dying
        states = []
        for idx in range(len(tube_y_positions)):
            r = random.random()
            if r < 0.6:
                states.append("working")
            elif r < 0.85:
                states.append("buzzing")
            elif r < 0.95:
                states.append("dying")
            else:
                states.append("dead")

    for idx, ty in enumerate(tube_y_positions):
        state = states[idx % len(states)]
        tube_area_height = min(5, tube_spacing)
        start_y = max(0, ty - tube_area_height // 2)

        tube_rows = render_fluorescent_bar(
            width=width,
            tube_y=tube_area_height // 2,
            total_height=tube_area_height,
            state=state,
            frame=frame + idx * 7,  # offset frames so lights don't sync
        )

        for local_y, row in enumerate(tube_rows):
            global_y = start_y + local_y
            if 0 <= global_y < height:
                result_lines[global_y] = row

    return result_lines
```

### Example Usage

```python
# Single tube in various states
for state in ["working", "buzzing", "dying", "dead"]:
    print(f"\n--- {state.upper()} ---")
    rows = render_fluorescent_bar(50, tube_y=2, total_height=5, state=state, frame=5)
    for row in rows:
        print(row)

# Ceiling grid
print("\n--- CEILING GRID ---")
grid = render_light_grid(60, 20, tube_spacing=6, states=["working", "buzzing", "dying", "working"])
for row in grid:
    print(row)
```

**Approximate visual (working tube, without color):**
```
              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
           ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
   ╸━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╺
           ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

With ANSI colors: the `━` tube is brilliant white-yellow, the `▒` inner
glow is warm yellow on a slightly lit ceiling background, and the `░` outer
halo fades to the dull brownish-yellow of aged ceiling tiles.

### Combination Notes

- The light grid is designed to be composited above the corridor (Section 7)
  as the ceiling layer
- Light state drives the Zalgo corruption level for text beneath it:
  `dying` light = Level 2-3 corruption, `dead` = Level 3-4
- Fluorescent glow should brighten carpet and wall colors in its radius

---

## 5. Zalgo Corruption Scale

### Theory

Zalgo text uses Unicode combining characters (diacritical marks) stacked
above, through, and below base characters. The Backrooms context uses this
as a manifestation of spatial/reality corruption — text becomes corrupted
as you go deeper into the Backrooms.

### Combining Character Pools

```
ABOVE combining marks (U+0300–U+036F and others):
  ̃  ̄  ̅  ̆  ̇  ̈  ̉  ̊  ̋  ̌  ̍  ̎  ̏  ̐  ̑  ̒  ̓  ̔  ̕  ̖  ̗  ̘  ̙  ̚  ̛  ̜  ̝  ̞  ̟  ̠

BELOW combining marks:
  ̡  ̢  ̣  ̤  ̥  ̦  ̧  ̨  ̩  ̪  ̫  ̬  ̭  ̮  ̯  ̰  ̱  ̲  ̳

MIDDLE/OVERLAY combining marks:
  ̴  ̵  ̶  ̷  ̸
  ⃝  ⃞  ⃟  ⃠  ⃡  ⃢  ⃣
```

### Implementation

```python
import random
import unicodedata

# Combining characters organized by position
ZALGO_UP = [
    '\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305',
    '\u0306', '\u0307', '\u0308', '\u0309', '\u030a', '\u030b',
    '\u030c', '\u030d', '\u030e', '\u030f', '\u0310', '\u0311',
    '\u0312', '\u0313', '\u0314', '\u0315', '\u031a', '\u033d',
    '\u033e', '\u033f', '\u0340', '\u0341', '\u0342', '\u0343',
    '\u0344', '\u0346', '\u034a', '\u034b', '\u034c', '\u0350',
    '\u0351', '\u0352', '\u0357', '\u0358', '\u035b', '\u035d',
    '\u035e', '\u0360', '\u0361',
]

ZALGO_DOWN = [
    '\u0316', '\u0317', '\u0318', '\u0319', '\u031c', '\u031d',
    '\u031e', '\u031f', '\u0320', '\u0321', '\u0322', '\u0323',
    '\u0324', '\u0325', '\u0326', '\u0327', '\u0328', '\u0329',
    '\u032a', '\u032b', '\u032c', '\u032d', '\u032e', '\u032f',
    '\u0330', '\u0331', '\u0332', '\u0333', '\u0339', '\u033a',
    '\u033b', '\u033c', '\u0345', '\u0347', '\u0348', '\u0349',
    '\u034d', '\u034e', '\u0353', '\u0354', '\u0355', '\u0356',
    '\u0359', '\u035a', '\u035c', '\u035f', '\u0362',
]

ZALGO_MID = [
    '\u0334', '\u0335', '\u0336', '\u0337', '\u0338',
]

# Letter substitutions that look similar but wrong (homoglyphs)
HOMOGLYPH_MAP = {
    'a': 'ä', 'e': 'ë', 'i': 'ï', 'o': 'ö', 'u': 'ü',
    'A': 'Ä', 'E': 'Ë', 'I': 'Ï', 'O': 'Ö', 'U': 'Ü',
    'n': 'ñ', 'c': 'ç', 's': 'ş', 'y': 'ÿ', 'z': 'ž',
    'B': 'Ɓ', 'D': 'Ɗ', 'G': 'Ɠ', 'H': 'Ħ', 'K': 'Ƙ',
    'L': 'Ŀ', 'N': 'Ñ', 'R': 'Ʀ', 'T': 'Ŧ', 'W': 'Ŵ',
}

# Corruption level specification:
# (max_up, max_down, max_mid, homoglyph_chance, skip_chance, char_corrupt_probability)
ZALGO_LEVELS = {
    0: (0, 0, 0, 0.0, 0.0, 0.0),      # Clean
    1: (1, 1, 0, 0.05, 0.0, 0.15),     # Subtle
    2: (2, 2, 1, 0.10, 0.02, 0.35),    # Moderate
    3: (4, 4, 1, 0.15, 0.05, 0.55),    # Heavy
    4: (8, 8, 2, 0.20, 0.10, 0.80),    # Catastrophic
}


def zalgo_corrupt(
    text: str,
    level: int,
    seed: int | None = None,
    per_char_levels: dict[int, int] | None = None,
) -> str:
    """Apply Zalgo corruption to text at the specified level (0–4).

    Args:
        text: Input text (can include ANSI escape sequences — they'll be preserved).
        level: Corruption level 0 (clean) through 4 (catastrophic).
        seed: Random seed for reproducibility.
        per_char_levels: Optional dict mapping character index to a specific
            corruption level, allowing spatially-varying corruption within
            a single string (e.g., more corruption near a stain).

    Returns:
        Corrupted string with combining characters.
    """
    if seed is not None:
        random.seed(seed)

    level = max(0, min(4, level))
    max_up, max_down, max_mid, homo_chance, skip_chance, char_prob = ZALGO_LEVELS[level]

    result = []
    char_idx = 0  # visible character index
    in_escape = False
    escape_buf = []

    for ch in text:
        # Preserve ANSI escape sequences
        if ch == '\x1b':
            in_escape = True
            escape_buf = [ch]
            continue
        if in_escape:
            escape_buf.append(ch)
            if ch == 'm':
                result.append("".join(escape_buf))
                in_escape = False
                escape_buf = []
            continue

        # Determine this character's corruption level
        if per_char_levels and char_idx in per_char_levels:
            c_level = per_char_levels[char_idx]
            c_max_up, c_max_down, c_max_mid, c_homo, c_skip, c_prob = ZALGO_LEVELS[c_level]
        else:
            c_max_up, c_max_down, c_max_mid = max_up, max_down, max_mid
            c_homo, c_skip, c_prob = homo_chance, skip_chance, char_prob

        # Skip character entirely (replaced with nothing)
        if random.random() < c_skip:
            char_idx += 1
            continue

        # Don't corrupt spaces or non-printable
        if ch == ' ' or not ch.isprintable():
            result.append(ch)
            char_idx += 1
            continue

        # Homoglyph substitution
        if random.random() < c_homo and ch in HOMOGLYPH_MAP:
            ch = HOMOGLYPH_MAP[ch]

        # Should we corrupt this specific character?
        if random.random() < c_prob:
            # Add combining marks
            corrupted = ch
            num_up = random.randint(0, c_max_up)
            num_down = random.randint(0, c_max_down)
            num_mid = random.randint(0, c_max_mid)

            for _ in range(num_up):
                corrupted += random.choice(ZALGO_UP)
            for _ in range(num_mid):
                corrupted += random.choice(ZALGO_MID)
            for _ in range(num_down):
                corrupted += random.choice(ZALGO_DOWN)

            result.append(corrupted)
        else:
            result.append(ch)

        char_idx += 1

    return "".join(result)


def zalgo_gradient(text: str, start_level: int = 0, end_level: int = 4, seed: int = 42) -> str:
    """Apply a gradient of Zalgo corruption across a string.

    Useful for text that starts clean and becomes increasingly corrupted,
    as if reality breaks down along the text.
    """
    n = len([c for c in text if c not in ('\x1b',) and not (ord(c) >= 0x30 and False)])
    visible_count = sum(1 for c in text if c.isprintable() and c != '\x1b')

    per_char = {}
    for i in range(visible_count):
        t = i / max(visible_count - 1, 1)
        level = int(lerp(start_level, end_level, t) + 0.5)
        per_char[i] = max(0, min(4, level))

    return zalgo_corrupt(text, level=end_level, seed=seed, per_char_levels=per_char)
```

### Example Output by Level

```python
text = "THE BACKLOGS"

for level in range(5):
    print(f"Level {level}: {zalgo_corrupt(text, level, seed=42)}")
```

**Approximate output:**
```
Level 0: THE BACKLOGS
Level 1: THË BÄCKLOGS̈
Level 2: T̃HË̤ B̊ÄC̣K̇L̴O̥G̈S̊
Level 3: T̃̈̍H̡̊̋Ë̤̩̌ B̰̊̍Ä̧̛C̣̪̈K̗̇̚L̴̡̫O̥̟̊G̭̈̚S̠̊̚
Level 4: T̨̡̃̈̍̊̋̍̐̚H̢̡̊̋̈̉̌̐̑̒̓̔Ȩ̨̤̩̈̌̍̎̏̐̑̒ B̰̱̲̊̍̏̐̑̒̓̔̕Ạ̧̨̛̤̥̦̈C̣̤̥̪̈̉̊̋̌K̗̘̙̇̈̉̊̋̌̍̎̏̚L̴̵̶̡̢̫̬O̧̥̦̟̠̊̋̌̍̎̏̐G̭̮̯̰̈̉̊̋̌̍̎̏̚S̡̢̠̊̋̌̍̎̏̐̚
```

### Combination Notes

- `per_char_levels` enables spatial corruption: characters near a dying
  light get higher corruption than those under working lights
- `zalgo_gradient` is perfect for "THE BACKLOGS" text that starts
  clean at "THE" and becomes corrupted by "LOGS"
- Zalgo works on the raw characters in ASCII art — apply it to individual
  cells in a 2D grid, not just linear text
- Combine with VHS for maximum dread: Zalgo corrupts the characters,
  VHS displaces the scanlines

---

## 6. Glow/Bloom Shader

### Theory

Glow simulates light bleeding from bright characters into surrounding
dark space. In The Backrooms, the primary glow source is the sickly
yellow fluorescent light. Characters that are "bright" (like `█` in the
logo text) cast light onto neighboring cells.

The key insight: we use `░▒▓` characters with appropriate foreground
and background colors to create smooth falloff. The background color
fills the "gaps" in shade characters, blending two colors per cell.

### Implementation

```python
import math

# Brightness values for common characters (0.0 = dark, 1.0 = bright)
CHAR_BRIGHTNESS = {
    ' ': 0.0, '.': 0.05, '·': 0.05, '∙': 0.08,
    '░': 0.25, '▒': 0.5, '▓': 0.75, '█': 1.0,
    '━': 0.9, '═': 0.9, '║': 0.8, '│': 0.3,
    '╔': 0.7, '╗': 0.7, '╚': 0.7, '╝': 0.7,
    '╠': 0.7, '╣': 0.7, '╦': 0.7, '╩': 0.7,
    '╬': 0.7, '┃': 0.3, '─': 0.3,
}

# Default brightness for unlisted characters
DEFAULT_BRIGHTNESS = 0.6

# Glow shade characters ordered by intensity (dim to bright)
GLOW_CHARS = [' ', '░', '▒', '▓', '█']


def _get_brightness(ch: str) -> float:
    """Get the visual brightness of a character."""
    if ch in CHAR_BRIGHTNESS:
        return CHAR_BRIGHTNESS[ch]
    # Unicode block elements and braille are generally bright
    cp = ord(ch) if ch else 0
    if 0x2580 <= cp <= 0x259F:  # block elements
        return 0.7
    if 0x2800 <= cp <= 0x28FF:  # braille
        return 0.4
    if ch.isalnum():
        return DEFAULT_BRIGHTNESS
    return 0.2


def apply_glow(
    grid: list[list[str]],
    glow_color: tuple = (230, 210, 120),
    bg_color: tuple = (25, 22, 12),
    radius: int = 3,
    intensity: float = 1.0,
    brightness_threshold: float = 0.5,
) -> list[list[tuple[str, tuple, tuple]]]:
    """Apply a glow/bloom effect to a 2D character grid.

    For each bright cell, neighboring dark cells receive a glow halo using
    shade characters and interpolated colors.

    Args:
        grid: 2D list of characters (list of rows, each row a list of single chars).
        glow_color: RGB tuple for the glow color (default: sickly yellow).
        bg_color: RGB tuple for the dark background.
        radius: Maximum glow radius in cells.
        intensity: Glow strength multiplier (0.0–2.0).
        brightness_threshold: Minimum character brightness to emit glow.

    Returns:
        2D list of (char, fg_rgb, bg_rgb) tuples.
        If a cell emits light, its original character is preserved with
        the glow color. If a cell receives glow, it gets a shade character
        with interpolated colors.
    """
    if not grid or not grid[0]:
        return []

    height = len(grid)
    width = len(grid[0])

    # Step 1: Build brightness map
    bright_map = [[_get_brightness(grid[y][x]) for x in range(width)] for y in range(height)]

    # Step 2: Build glow accumulation map (how much glow each cell receives)
    glow_map = [[0.0] * width for _ in range(height)]

    for y in range(height):
        for x in range(width):
            if bright_map[y][x] >= brightness_threshold:
                emit_strength = bright_map[y][x] * intensity
                # Cast glow to neighbors
                for dy in range(-radius, radius + 1):
                    for dx in range(-radius * 2, radius * 2 + 1):
                        # Aspect ratio correction: characters are ~2:1 tall:wide
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < height and 0 <= nx < width:
                            # Distance with aspect ratio
                            dist = math.sqrt((dy * 1.0) ** 2 + (dx * 0.5) ** 2)
                            if dist <= radius and dist > 0:
                                # Inverse-square-ish falloff (but gentler)
                                falloff = max(0.0, 1.0 - dist / radius)
                                falloff = falloff ** 1.5  # Slightly steeper than linear
                                glow_map[ny][nx] = max(
                                    glow_map[ny][nx],
                                    emit_strength * falloff,
                                )

    # Step 3: Compose output
    result = []
    for y in range(height):
        row = []
        for x in range(width):
            original_char = grid[y][x]
            original_bright = bright_map[y][x]
            glow_amount = glow_map[y][x]

            if original_bright >= brightness_threshold:
                # This cell is a light source — keep its character, color it bright
                source_fg = (
                    clamp(int(glow_color[0] * original_bright * 1.2)),
                    clamp(int(glow_color[1] * original_bright * 1.2)),
                    clamp(int(glow_color[2] * original_bright * 1.2)),
                )
                source_bg = lerp_color(bg_color, glow_color, original_bright * 0.5)
                row.append((original_char, source_fg, source_bg))

            elif glow_amount > 0.05:
                # This cell receives glow — replace with shade character
                # Pick shade character based on glow intensity
                shade_idx = min(
                    len(GLOW_CHARS) - 1,
                    int(glow_amount * len(GLOW_CHARS)),
                )
                shade_char = GLOW_CHARS[shade_idx]

                # Blend colors
                glow_fg = lerp_color(bg_color, glow_color, glow_amount * 0.8)
                glow_bg = lerp_color(bg_color, glow_color, glow_amount * 0.3)

                row.append((shade_char, glow_fg, glow_bg))

            else:
                # Dark cell — background only
                row.append((original_char, bg_color, bg_color))

        result.append(row)

    return result


def render_glowed_grid(grid: list[list[tuple[str, tuple, tuple]]]) -> list[str]:
    """Convert a glow-processed grid to ANSI-colored strings.

    Args:
        grid: Output from apply_glow() — 2D list of (char, fg_rgb, bg_rgb) tuples.

    Returns:
        List of ANSI-escaped strings for printing.
    """
    lines = []
    for row in grid:
        parts = []
        for char, fg_color, bg_color in row:
            parts.append(
                f"{fg_bg(fg_color[0], fg_color[1], fg_color[2], bg_color[0], bg_color[1], bg_color[2])}{char}"
            )
        parts.append(RESET)
        lines.append("".join(parts))
    return lines
```

### Example Usage

```python
# Create a simple logo grid
logo_text = [
    "                                    ",
    "  ████████ ██  ██ ███████           ",
    "     ██    ██  ██ ██                ",
    "     ██    ██████ █████             ",
    "     ██    ██  ██ ██                ",
    "     ██    ██  ██ ███████           ",
    "                                    ",
    "  ██████   █████   ██████ ██  ██    ",
    "  ██  ██  ██  ██  ██     ██ ██     ",
    "  ██████  ███████ ██     █████     ",
    "  ██  ██  ██  ██  ██     ██ ██     ",
    "  ██████  ██  ██  ██████ ██  ██    ",
    "                                    ",
]

# Convert to 2D grid
grid = [list(line.ljust(40)) for line in logo_text]

# Apply glow
glowed = apply_glow(
    grid,
    glow_color=(230, 210, 120),  # sickly yellow
    bg_color=(25, 22, 12),        # void dark
    radius=3,
    intensity=1.0,
)

# Render
lines = render_glowed_grid(glowed)
for line in lines:
    print(line)
```

**Approximate visual (without ANSI):**
```
        ░░░░░░░░░░░░░░░░░░░░░░░░░░
      ░░▒▓████████▓██▓▓██▓███████▓▒░░
      ░▒▓  ██  ▓▒██▒▓██▒██▓▒    ▓▒░
      ░▒▓  ██  ▓▒██████▒█████▓  ▓▒░
      ░▒▓  ██  ▓▒██▒▓██▒██▓▒    ▓▒░
      ░░▒▓████████▓██▓▓██▓███████▓▒░░
        ░░░░░░░░░░░░░░░░░░░░░░░░░░
```

The glow uses `░▒▓` characters transitioning from dark background to the
sickly yellow of the logo, creating a convincing light-bleed effect.

### Multi-Color Glow

```python
def apply_multi_glow(
    grid: list[list[str]],
    color_map: dict[str, tuple],
    bg_color: tuple = (25, 22, 12),
    radius: int = 3,
) -> list[list[tuple[str, tuple, tuple]]]:
    """Apply glow with different colors for different source characters.

    Args:
        grid: 2D character grid.
        color_map: Maps characters to their glow RGB color.
            Example: {'█': (230, 210, 120), '━': (200, 230, 180)}
        bg_color: Background color.
        radius: Glow radius.

    Returns:
        2D grid of (char, fg_rgb, bg_rgb) tuples.
    """
    # For each cell, accumulate glow from multiple colored sources
    # Uses additive blending (like real light)
    height = len(grid)
    width = len(grid[0]) if grid else 0

    # Glow accumulator: (r, g, b) per cell
    glow_r = [[0.0] * width for _ in range(height)]
    glow_g = [[0.0] * width for _ in range(height)]
    glow_b = [[0.0] * width for _ in range(height)]

    for y in range(height):
        for x in range(width):
            ch = grid[y][x]
            if ch in color_map:
                color = color_map[ch]
                for dy in range(-radius, radius + 1):
                    for dx in range(-radius * 2, radius * 2 + 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < height and 0 <= nx < width:
                            dist = math.sqrt((dy * 1.0) ** 2 + (dx * 0.5) ** 2)
                            if 0 < dist <= radius:
                                falloff = max(0.0, 1.0 - dist / radius) ** 1.5
                                glow_r[ny][nx] += color[0] / 255.0 * falloff
                                glow_g[ny][nx] += color[1] / 255.0 * falloff
                                glow_b[ny][nx] += color[2] / 255.0 * falloff

    result = []
    for y in range(height):
        row = []
        for x in range(width):
            ch = grid[y][x]
            gr = min(1.0, glow_r[y][x])
            gg = min(1.0, glow_g[y][x])
            gb = min(1.0, glow_b[y][x])
            glow_total = (gr + gg + gb) / 3.0

            if ch in color_map:
                c = color_map[ch]
                row.append((ch, c, lerp_color(bg_color, c, 0.5)))
            elif glow_total > 0.05:
                shade_idx = min(4, int(glow_total * 5))
                shade = GLOW_CHARS[shade_idx]
                glow_fg = (clamp(int(gr * 255)), clamp(int(gg * 255)), clamp(int(gb * 255)))
                glow_bg = (
                    clamp(int(bg_color[0] + gr * 80)),
                    clamp(int(bg_color[1] + gg * 80)),
                    clamp(int(bg_color[2] + gb * 80)),
                )
                row.append((shade, glow_fg, glow_bg))
            else:
                row.append((ch, bg_color, bg_color))

        result.append(row)
    return result
```

### Combination Notes

- The glow shader is the primary compositing tool — apply it last
  (after placing logo text on the grid, but before VHS corruption)
- Multiple glow colors enable warm yellow from fluorescent lights
  and a separate cooler glow from the logo text
- Performance: for large grids, optimize by only scanning cells that
  are bright sources rather than checking all cells

---

## 7. Perspective Corridor Renderer

### Theory

The iconic Backrooms image is a one-point-perspective corridor:
a vanishing point in the center, walls converging, ceiling with
fluorescent grid, floor with carpet texture. We render this by
mapping 3D perspective onto a 2D character grid.

### Implementation

```python
import math
import random

def render_corridor(
    width: int = 80,
    height: int = 30,
    vanishing_x: float = 0.5,   # 0.0=left, 1.0=right
    vanishing_y: float = 0.45,  # 0.0=top, 1.0=bottom
    depth: float = 0.8,         # How far the corridor extends (0.0–1.0)
    seed: int = 42,
) -> list[str]:
    """Render a one-point-perspective Backrooms corridor.

    Args:
        width: Output width in characters.
        height: Output height in characters.
        vanishing_x: Horizontal position of vanishing point (0.0–1.0).
        vanishing_y: Vertical position of vanishing point (0.0–1.0).
        depth: Corridor depth — how small the back wall is (0.0–1.0).
        seed: Random seed.

    Returns:
        List of ANSI-colored strings.
    """
    random.seed(seed)

    # Vanishing point in pixel coordinates
    vx = int(width * vanishing_x)
    vy = int(height * vanishing_y)

    # Back wall dimensions (smaller = deeper corridor)
    back_w = max(4, int(width * (1.0 - depth) * 0.3))
    back_h = max(2, int(height * (1.0 - depth) * 0.3))

    # Back wall boundaries
    back_left = vx - back_w // 2
    back_right = vx + back_w // 2
    back_top = vy - back_h // 2
    back_bottom = vy + back_h // 2

    # Colors
    wall_light = (200, 185, 95)    # wallpaper yellow (lit)
    wall_dark = (100, 90, 45)      # wallpaper yellow (shadow)
    ceiling_color = (210, 205, 185) # ceiling tile
    ceiling_dark = (42, 40, 32)     # dark ceiling
    carpet_color = (160, 140, 90)   # carpet
    carpet_shadow = (80, 65, 35)    # dark carpet
    back_wall = (180, 170, 110)     # lit back wall
    void_color = (25, 22, 12)       # deep shadow
    light_color = (255, 252, 230)   # fluorescent tube

    # Wallpaper pattern characters (vertical stripes)
    wall_chars = ['│', '┃', '│', ' ']

    lines = []

    for y in range(height):
        parts = []
        for x in range(width):
            # Determine what surface this pixel belongs to by checking
            # which perspective trapezoid it falls in

            # Parametric position relative to vanishing point
            # t = 0 at screen edge, t = 1 at vanishing point
            dx = x - vx
            dy = y - vy

            # Are we in the back wall rectangle?
            in_back = (back_left <= x <= back_right and back_top <= y <= back_bottom)

            if in_back:
                # Back wall
                # Light pattern on back wall (where fluorescents illuminate)
                light_stripe = abs(x - vx) < back_w // 4
                if light_stripe:
                    c = lerp_color(back_wall, light_color, 0.3)
                else:
                    c = back_wall
                parts.append(f"{fg_bg(c[0], c[1], c[2], c[0]-20, c[1]-20, c[2]-15)}▓")
                continue

            # Determine if we're in ceiling, floor, left wall, or right wall
            # by checking which edge of the back wall rectangle we're closest to
            # when tracing from vanishing point outward

            # Compute the perspective t-value (how far from center to edge)
            # For each edge, compute where a ray from VP through (x,y) exits the frame

            # Simplified approach: use angles
            if abs(dx) < 1 and abs(dy) < 1:
                # At vanishing point
                parts.append(f"{bg(void_color[0], void_color[1], void_color[2])} ")
                continue

            angle = math.atan2(dy, dx)  # angle from VP to this pixel

            # Determine which face the pixel is on based on angle
            # The transition angles depend on the back wall corners
            corner_angles = {
                'tl': math.atan2(back_top - vy, back_left - vx),
                'tr': math.atan2(back_top - vy, back_right - vx),
                'bl': math.atan2(back_bottom - vy, back_left - vx),
                'br': math.atan2(back_bottom - vy, back_right - vx),
            }

            # Classify pixel by face
            # Ceiling: above back wall top edge
            # Floor: below back wall bottom edge
            # Left wall: left of back wall left edge
            # Right wall: right of back wall right edge

            is_above = y < back_top + (x - back_left) * (back_top - back_top) / max(1, back_right - back_left)
            is_below = y > back_bottom

            # Compute depth factor for this pixel
            # (how close to vanishing point vs screen edge)
            if dx != 0:
                # How far along the ray from VP to screen edge
                if dx > 0:
                    t_x = (x - vx) / max(1, width - 1 - vx)
                else:
                    t_x = (vx - x) / max(1, vx)
            else:
                t_x = 0

            if dy != 0:
                if dy > 0:
                    t_y = (y - vy) / max(1, height - 1 - vy)
                else:
                    t_y = (vy - y) / max(1, vy)
            else:
                t_y = 0

            depth_t = max(t_x, t_y)  # 0 at VP, 1 at screen edge
            depth_t = max(0.0, min(1.0, depth_t))

            # Determine surface
            if y < vy:
                if x < back_left + (vx - back_left) * (1 - (vy - y) / max(1, vy)):
                    surface = "left_wall"
                elif x > back_right + (vx - back_right) * (1 - (vy - y) / max(1, vy)):
                    surface = "right_wall"
                else:
                    surface = "ceiling"
            elif y > vy:
                if x < back_left + (vx - back_left) * (1 - (y - vy) / max(1, height - 1 - vy)):
                    surface = "left_wall"
                elif x > back_right + (vx - back_right) * (1 - (y - vy) / max(1, height - 1 - vy)):
                    surface = "right_wall"
                else:
                    surface = "floor"
            else:
                # On horizon line
                if x < back_left:
                    surface = "left_wall"
                elif x > back_right:
                    surface = "right_wall"
                else:
                    surface = "back_wall"

            # --- Render each surface ---

            if surface == "ceiling":
                # Ceiling tiles with occasional fluorescent tube
                # Fluorescent tubes run horizontally at regular depth intervals
                tube_interval = 0.2  # every 20% of depth
                nearest_tube = round(depth_t / tube_interval) * tube_interval
                tube_dist = abs(depth_t - nearest_tube)
                tube_dist_pixels = tube_dist * height * 0.3

                if tube_dist_pixels < 0.5 and depth_t > 0.05:
                    # On a fluorescent tube
                    flicker = 0.9 + 0.1 * math.sin(x * 0.3 + seed)
                    lc = (
                        clamp(int(light_color[0] * flicker)),
                        clamp(int(light_color[1] * flicker)),
                        clamp(int(light_color[2] * flicker)),
                    )
                    parts.append(f"{fg_bg(lc[0], lc[1], lc[2], lc[0]-30, lc[1]-30, lc[2]-30)}━")
                elif tube_dist_pixels < 1.5 and depth_t > 0.05:
                    # Near a tube — glow
                    glow = max(0.0, 1.0 - tube_dist_pixels / 1.5) * 0.4
                    gc = lerp_color(ceiling_dark, light_color, glow)
                    parts.append(f"{bg(gc[0], gc[1], gc[2])} ")
                else:
                    # Plain ceiling tile
                    c = lerp_color(ceiling_color, ceiling_dark, depth_t * 0.7)
                    # Add tile grid lines
                    tile_x = int(x * (1 + depth_t * 2)) % 8
                    tile_y = int(y * (1 + depth_t * 3)) % 4
                    if tile_x == 0 or tile_y == 0:
                        c = lerp_color(c, ceiling_dark, 0.3)
                        parts.append(f"{fg_bg(c[0]-10, c[1]-10, c[2]-10, c[0], c[1], c[2])}┼")
                    else:
                        parts.append(f"{bg(c[0], c[1], c[2])} ")

            elif surface == "floor":
                # Carpet texture
                # Depth-dependent color (farther = darker)
                c = lerp_color(carpet_color, carpet_shadow, depth_t * 0.8)
                # Add carpet fiber texture
                noise = math.sin(x * 1.7 + y * 2.3 + seed) * 0.15
                c = (
                    clamp(int(c[0] * (1 + noise))),
                    clamp(int(c[1] * (1 + noise))),
                    clamp(int(c[2] * (1 + noise))),
                )
                # Occasional stain
                stain_check = math.sin(x * 0.3 + y * 0.5 + seed * 1.7)
                if stain_check > 0.85:
                    c = lerp_color(c, (85, 65, 30), 0.5)

                fiber_chars = ['⡌', '⡪', '⢕', '⡂', '░', '▒']
                fiber = fiber_chars[int(abs(noise * 30)) % len(fiber_chars)]
                fc = (clamp(c[0] + 15), clamp(c[1] + 12), clamp(c[2] + 8))
                parts.append(f"{fg_bg(fc[0], fc[1], fc[2], c[0], c[1], c[2])}{fiber}")

            elif surface == "left_wall" or surface == "right_wall":
                # Wallpaper with vertical stripe pattern
                # Deeper = darker
                base = lerp_color(wall_light, wall_dark, depth_t * 0.7)
                # Vertical wallpaper stripes
                stripe_phase = int(x * (1 + depth_t * 3)) % 4
                if stripe_phase < 2:
                    c = base
                    char = '│'
                else:
                    c = lerp_color(base, wall_dark, 0.2)
                    char = ' '

                # Subtle wallpaper noise
                wp_noise = math.sin(x * 3.1 + y * 0.7 + seed * 2.1) * 0.08
                c = (
                    clamp(int(c[0] * (1 + wp_noise))),
                    clamp(int(c[1] * (1 + wp_noise))),
                    clamp(int(c[2] * (1 + wp_noise))),
                )
                fc = (clamp(c[0] - 20), clamp(c[1] - 18), clamp(c[2] - 12))
                parts.append(f"{fg_bg(fc[0], fc[1], fc[2], c[0], c[1], c[2])}{char}")

            else:
                # Fallback
                parts.append(f"{bg(void_color[0], void_color[1], void_color[2])} ")

        parts.append(RESET)
        lines.append("".join(parts))

    return lines
```

### Example Usage

```python
# Standard Backrooms corridor
corridor = render_corridor(
    width=80,
    height=25,
    vanishing_x=0.5,
    vanishing_y=0.45,
    depth=0.8,
)
for line in corridor:
    print(line)
```

**Approximate visual (without ANSI color, 40-wide simplified):**
```
┼   ┼   ┼   ━━━━━━━━━━━━━━━━   ┼   ┼
   ┼   ┼  ━━━━━━━━━━━━━━━━━━━━  ┼   ┼
┼   ┼   ━━━━━━━━━━━━━━━━━━━━━━━━  ┼
│ │ │ │ ┼  ━━━━━━━━━━━━━━━━  ┼ │ │ │
│ │ │ │┼ ┼                 ┼ ┼│ │ │ │
│ │ │ │┼ ┼                 ┼ ┼│ │ │ │
│ │ │ │┼ ┼  ▓▓▓▓▓▓▓▓▓▓▓  ┼ ┼│ │ │ │
│ │ │ │┼ ┼  ▓ back wall▓  ┼ ┼│ │ │ │
│ │ │ │┼ ┼  ▓▓▓▓▓▓▓▓▓▓▓  ┼ ┼│ │ │ │
│ │ │ │┼ ┼                 ┼ ┼│ │ │ │
│ │ │ │ ┼                   ┼ │ │ │ │
│ │ │ ⡌⡪⢕⡂░▒⡌⡪⢕⡂░▒⡌⡪⢕⡂░▒ │ │ │
│ │  ⡪⢕⡂░▒⡌⡪⢕⡂░▒⡌⡪⢕⡂░▒⡌⡪  │ │
│  ⢕⡂░▒⡌⡪⢕⡂░▒⡌⡪⢕⡂░▒⡌⡪⢕⡂░▒  │
 ⡂░▒⡌⡪⢕⡂░▒⡌⡪⢕⡂░▒⡌⡪⢕⡂░▒⡌⡪⢕⡂
```

With ANSI colors this renders as a proper corridor: yellowed ceiling tiles
with bright fluorescent tubes at the top, vertical-striped yellowed
wallpaper on the sides converging to a vanishing point, and mottled
carpet with braille-character fiber texture on the floor.

### Combination Notes

- Overlay logo text at the vanishing point or just above center for
  maximum visual impact
- Use `apply_glow()` on the fluorescent tube positions to add light bleed
  onto the ceiling
- The corridor makes an excellent background — render it first, then
  composite the logo text on top
- Animate by slowly shifting `vanishing_x` and `vanishing_y` with
  `math.sin(frame * 0.01)` for an unsettling drift effect

---

## 8. Combining Techniques

### Full Pipeline: Logo with Backrooms Environment

Here's how all six techniques compose into a single rendered frame:

```python
def render_backrooms_logo(
    width: int = 80,
    height: int = 30,
    vhs_intensity: float = 0.15,
    zalgo_level: int = 1,
    frame: int = 0,
) -> list[str]:
    """Render the complete Backrooms-themed logo.

    Pipeline:
    1. Render perspective corridor (background)
    2. Composite fluorescent light grid (ceiling)
    3. Place logo text at center
    4. Apply glow/bloom shader to logo text
    5. Apply Zalgo corruption (spatially varying)
    6. Apply VHS tracking artifacts (post-process)
    """

    # Step 1: Background corridor
    corridor = render_corridor(
        width=width,
        height=height,
        vanishing_x=0.5 + 0.02 * math.sin(frame * 0.03),  # subtle drift
        vanishing_y=0.45,
        depth=0.75,
        seed=42,
    )

    # Step 2: Logo text (pre-defined)
    logo_lines = [
        "████████╗██╗  ██╗███████╗",
        "╚══██╔══╝██║  ██║██╔════╝",
        "   ██║   ███████║█████╗  ",
        "   ██║   ██╔══██║██╔══╝  ",
        "   ██║   ██║  ██║███████╗",
        "   ╚═╝   ╚═╝  ╚═╝╚══════╝",
        " ██████╗  █████╗  ██████╗██╗  ██╗██╗      ██████╗  ██████╗ ███████╗",
        " ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██║     ██╔═══██╗██╔════╝ ██╔════╝",
        " ██████╔╝███████║██║     █████╔╝ ██║     ██║   ██║██║  ███╗███████╗",
        " ██╔══██╗██╔══██║██║     ██╔═██╗ ██║     ██║   ██║██║   ██║╚════██║",
        " ██████╔╝██║  ██║╚██████╗██║  ██╗███████╗╚██████╔╝╚██████╔╝███████║",
        " ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝",
    ]

    # Step 3: Composite logo onto corridor at center
    logo_start_y = (height - len(logo_lines)) // 2
    logo_max_w = max(len(l) for l in logo_lines)
    logo_start_x = (width - logo_max_w) // 2

    # Convert corridor to 2D grid for glow processing
    # (strip ANSI for character grid, preserve ANSI separately)
    import re
    grid = []
    for y in range(height):
        row = list(re.sub(r'\x1b\[[0-9;]*m', '', corridor[y]).ljust(width)[:width])
        grid.append(row)

    # Place logo characters
    for ly, logo_line in enumerate(logo_lines):
        y = logo_start_y + ly
        if 0 <= y < height:
            for lx, ch in enumerate(logo_line):
                x = logo_start_x + lx
                if 0 <= x < width and ch != ' ':
                    grid[y][x] = ch

    # Step 4: Apply glow shader
    glowed = apply_glow(
        grid,
        glow_color=(230, 210, 120),
        bg_color=(25, 22, 12),
        radius=2,
        intensity=0.8,
    )
    rendered = render_glowed_grid(glowed)

    # Step 5: Apply Zalgo corruption (more corruption near edges)
    corrupted = []
    for i, line in enumerate(rendered):
        # Corruption increases toward edges of the logo
        dist_from_center = abs(i - height // 2) / (height // 2)
        level = min(4, int(zalgo_level + dist_from_center * 2))
        corrupted.append(zalgo_corrupt(line, level=level, seed=frame + i))

    # Step 6: Apply VHS tracking (final post-process)
    final = apply_vhs_tracking(corrupted, intensity=vhs_intensity, seed=frame)

    return final


# Render a single frame
if __name__ == "__main__":
    result = render_backrooms_logo(width=80, height=30, frame=0)
    for line in result:
        print(line)
```

### Animation Loop

```python
import sys
import time

def animate_logo(duration: float = 10.0, fps: float = 15.0):
    """Animate the Backrooms logo for a specified duration."""
    sys.stdout.write("\x1b[?1049h")  # Alt screen buffer
    sys.stdout.write("\x1b[?25l")    # Hide cursor

    try:
        frame = 0
        frame_time = 1.0 / fps
        start = time.time()

        while time.time() - start < duration:
            # Render frame
            lines = render_backrooms_logo(
                width=80,
                height=25,
                vhs_intensity=0.1 + 0.05 * math.sin(frame * 0.1),
                zalgo_level=1,
                frame=frame,
            )

            # Draw
            sys.stdout.write("\x1b[H")  # Home cursor
            for line in lines:
                sys.stdout.write(line + "\n")
            sys.stdout.flush()

            # Timing
            elapsed = time.time() - start
            next_frame = (frame + 1) * frame_time
            sleep_time = next_frame - (time.time() - start)
            if sleep_time > 0:
                time.sleep(sleep_time)
            frame += 1

    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write("\x1b[?25h")    # Show cursor
        sys.stdout.write("\x1b[?1049l")  # Exit alt screen
        sys.stdout.write(RESET)
        sys.stdout.flush()
```

### Technique Interaction Matrix

```
                  Carpet  VHS    Light  Zalgo  Glow   Corridor
Carpet (2)         —      Yes    Yes    Yes    Yes    Layer
VHS (3)            Yes     —     No     Yes    After  After
Light (4)          Yes    No      —     Drive  Source Layer
Zalgo (5)          Near   Yes    Driven  —     Before Before
Glow (6)           No     Before Source Before  —     After
Corridor (7)       Layer  After  Layer  Before After   —

Legend:
  Yes/No:  Can these two be combined?
  Layer:   One is a layer within the other
  Before:  Apply this technique before the column header technique
  After:   Apply this technique after the column header technique
  Drive:   Column header drives the row technique's parameters
  Driven:  Row technique is driven by column header's parameters
  Source:  Column header provides input data for the row technique
  Near:    Row technique activates when near column header's features
```

### Recommended Application Order

```
1. render_corridor()         — base scene geometry
2. carpet_texture()          — floor detail within corridor
3. render_light_grid()       — ceiling detail within corridor
4. [place logo text]         — overlay logo characters
5. apply_glow()              — bloom from logo + lights
6. zalgo_corrupt()           — reality degradation
7. apply_vhs_tracking()      — final post-processing
```

---

## Appendix: Quick Character Reference for The Backrooms

### Carpet Fiber Characters (by density)
```
Sparse → Dense:
  · ⠁ ⠂ ⡀ ⠒ ░ ⡂ ⡌ ▒ ⡪ ⢕ ⣖ ▓ ⣶ ⣾ ⣿
```

### Fluorescent Light Characters
```
Tube:     ━ ═ ─ ╌ ╍ ┄ ┅ (dying: ┄ ┅ ╌)
End caps: ╸ ╺ ╴ ╶ ┤ ├
Glow:     ░ ▒ (surrounding ceiling)
```

### Wallpaper Stripe Characters
```
Stripes:  │ ┃ ║ ┆ ┊ ╎
Pattern:  ╏ ┇ ┋
```

### Corruption Characters (VHS noise)
```
Static:   ▓ ▒ ░ ▚ ▞ ▙ ▛ █ ▜ ▟ ⣿ ⡿ ⣷ ⣯ ⣟ ╳ ╱ ╲
Fringe:   ▌ ▐ │ |
```

### The Backrooms ANSI Palette
```python
# Core palette (copy-paste ready)
SICKLY_YELLOW     = "\x1b[38;2;230;210;120m"
FLUORESCENT_WHITE = "\x1b[1;38;2;255;252;230m"
WALLPAPER_YELLOW  = "\x1b[38;2;200;185;95m"
CARPET_TAN        = "\x1b[38;2;160;140;90m"
STAIN_BROWN       = "\x1b[38;2;85;65;30m"
VOID_DARK         = "\x1b[38;2;25;22;12m"
CEILING_TILE      = "\x1b[38;2;210;205;185m"
BUZZ_GREEN        = "\x1b[38;2;200;230;180m"

# Background versions
BG_VOID           = "\x1b[48;2;25;22;12m"
BG_CARPET         = "\x1b[48;2;130;115;70m"
BG_CEILING        = "\x1b[48;2;42;40;32m"
BG_WALL           = "\x1b[48;2;160;145;75m"

RESET             = "\x1b[0m"
BOLD              = "\x1b[1m"
DIM               = "\x1b[2m"
```
