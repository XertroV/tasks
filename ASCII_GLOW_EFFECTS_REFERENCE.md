# ASCII Art Glow & Luminous Effects: Comprehensive Reference

A technical reference for simulating glow, neon, fluorescent, and luminous
effects in terminal-based ASCII art and logos.

---

## Table of Contents

1. [Foundational Building Blocks](#1-foundational-building-blocks)
2. [Glow / Aura Effect](#2-glow--aura-effect)
3. [Neon Sign Effect](#3-neon-sign-effect)
4. [Bloom / Light Bleed](#4-bloom--light-bleed)
5. [Flickering / Animation](#5-flickering--animation)
6. [Warm Glow / Ember Effects](#6-warm-glow--ember-effects)
7. [Directional Light Source Simulation](#7-directional-light-source-simulation)
8. [Quick Reference Tables](#8-quick-reference-tables)

---

## 1. Foundational Building Blocks

### 1.1 Shade / Block Characters (the "pixel palette")

These Unicode Block Elements form the core density gradient:

```
Character   Code Point   Approximate Fill   Role in Glow
─────────   ──────────   ────────────────   ────────────
  (space)                     0%            Darkness / void
    ░        U+2591          25%            Outermost faint haze
    ▒        U+2592          50%            Mid-glow
    ▓        U+2593          75%            Inner glow / near-core
    █        U+2588         100%            Core / brightest area
```

The density gradient `space → ░ → ▒ → ▓ → █` simulates light intensity
falloff from a luminous center outward. Reversing it (`█ → ▓ → ▒ → ░ → space`)
creates a radial fade.

**Additional useful block elements for sub-cell precision:**

```
Half blocks (2 vertical "pixels" per cell):
  ▀  U+2580  Upper half       ▄  U+2584  Lower half
  ▌  U+258C  Left half        ▐  U+2590  Right half

Eighth blocks (thin edges / outlines):
  ▔  U+2594  Upper 1/8        ▁  U+2581  Lower 1/8
  ▏  U+258F  Left 1/8         ▕  U+2595  Right 1/8

Quadrant characters (2x2 sub-cell resolution):
  ▖ ▗ ▘ ▙ ▚ ▛ ▜ ▝ ▞ ▟   (U+2596..U+259F)
```

### 1.2 ANSI Escape Codes Summary

All sequences use the CSI (Control Sequence Introducer): `\x1b[` (also `\033[`).

**Intensity modifiers (critical for glow):**

| Code      | Effect          | Glow Role                        |
|-----------|-----------------|----------------------------------|
| `\x1b[1m` | Bold / bright  | Core brightness, bloom center    |
| `\x1b[2m` | Dim / faint    | Outer glow, distant haze         |
| `\x1b[0m` | Reset all      | Return to normal                 |

**Color systems:**

```
4-bit (16 colors):
  FG: \x1b[30m..37m (normal)   \x1b[90m..97m (bright)
  BG: \x1b[40m..47m (normal)   \x1b[100m..107m (bright)

8-bit (256 colors):
  FG: \x1b[38;5;{n}m     BG: \x1b[48;5;{n}m
  n = 0-7 standard, 8-15 bright, 16-231 color cube, 232-255 grayscale

24-bit truecolor (16.7M colors):
  FG: \x1b[38;2;{r};{g};{b}m
  BG: \x1b[48;2;{r};{g};{b}m
```

**Key insight:** Many terminals render `\x1b[1;3Xm` (bold + color) identically
to `\x1b[9Xm` (bright color). Bold effectively "brightens" the foreground
color, which is exactly what we want for glow cores.

---

## 2. Glow / Aura Effect

### 2.1 Core Technique: Concentric Density Rings

The simplest glow is concentric rings of decreasing character density
radiating outward from the bright core:

```
                 ░░░░░░░░░░░░░░░░░
               ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░
             ░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░
           ░░▒▒▓▓████████████▓▓▓▒▒░░
           ░░▒▒▓▓██  GLOW  ██▓▓▒▒░░
           ░░▒▒▓▓████████████▓▓▓▒▒░░
             ░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░
               ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░
                 ░░░░░░░░░░░░░░░░░
```

**Design principle:** Each ring maps to a brightness level:
- Ring 0 (core): `█` — 100% fill, bold/bright color
- Ring 1:        `▓` — 75% fill, normal color
- Ring 2:        `▒` — 50% fill, slightly dimmed
- Ring 3:        `░` — 25% fill, dim/faint
- Ring 4:        ` ` — empty, background only (or nothing)

### 2.2 Adding Color Gradients

Pair each density ring with a decreasing color intensity. Using truecolor
for a cyan glow:

```
Layer     Char   FG Color              BG Color              ANSI Sequence
────────  ────   ────────              ────────              ─────────────
Core      █      rgb(255,255,255)      rgb(0,255,255)        \x1b[38;2;255;255;255;48;2;0;255;255m█
Ring 1    ▓      rgb(0,255,255)        rgb(0,80,80)          \x1b[38;2;0;255;255;48;2;0;80;80m▓
Ring 2    ▒      rgb(0,180,180)        rgb(0,40,40)          \x1b[38;2;0;180;180;48;2;0;40;40m▒
Ring 3    ░      rgb(0,100,100)        rgb(0,15,15)          \x1b[38;2;0;100;100;48;2;0;15;15m░
Ring 4    (sp)   —                     rgb(0,5,5)            \x1b[48;2;0;5;5m
Beyond    (sp)   —                     default               \x1b[0m
```

The background color is crucial — it fills the "gaps" in shade characters,
creating a smooth transition rather than a dithered look.

### 2.3 Using Dim/Bold for Simpler Glow (16-color fallback)

When truecolor is unavailable, use SGR intensity modifiers:

```
Ring     Char   Attributes         Sequence
───────  ────   ──────────         ────────
Core     █      bold + bright fg   \x1b[1;96m█\x1b[0m
Ring 1   ▓      normal fg          \x1b[36m▓\x1b[0m
Ring 2   ▒      dim fg             \x1b[2;36m▒\x1b[0m
Ring 3   ░      dim fg             \x1b[2;36m░\x1b[0m
```

### 2.4 Complete Glow Example: "HI" with Cyan Aura

```
    (all on dark background: \x1b[48;2;0;5;10m)

    Row 1:        ░░░░░░░░░░░░░░░░░░░░
    Row 2:      ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░
    Row 3:    ░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░
    Row 4:    ░░▒▒▓▓██  ██████  ██▓▓▒▒░░
    Row 5:    ░░▒▒▓▓██  ██████  ██▓▓▒▒░░
    Row 6:    ░░▒▒▓▓██████████  ██▓▓▒▒░░
    Row 7:    ░░▒▒▓▓██  ██████  ██▓▓▒▒░░
    Row 8:    ░░▒▒▓▓██  ██████  ██▓▓▒▒░░
    Row 9:    ░░▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒░░
    Row 10:     ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░
    Row 11:       ░░░░░░░░░░░░░░░░░░

    Color assignments:
      ██ core text = \x1b[1;97;48;2;0;220;220m  (bold white on bright cyan bg)
      ▓▓ ring 1    = \x1b[38;2;0;200;200;48;2;0;60;60m
      ▒▒ ring 2    = \x1b[38;2;0;130;130;48;2;0;30;30m
      ░░ ring 3    = \x1b[38;2;0;70;70;48;2;0;10;10m
      spaces       = \x1b[48;2;0;5;10m
```

### 2.5 Distance-Based Glow Algorithm

For programmatic generation, compute a "distance from nearest lit pixel"
for each cell, then assign shade + color:

```python
def assign_glow(distance, max_radius=4):
    """Return (char, fg_rgb, bg_rgb) for a given distance from light source."""
    if distance == 0:
        return ('█', (255, 255, 255), (0, 255, 255))  # Core
    t = distance / max_radius  # 0.0 (near) to 1.0 (far)
    t = min(t, 1.0)
    chars = ['▓', '▒', '░', ' ']
    idx = min(int(t * len(chars)), len(chars) - 1)
    intensity = 1.0 - t
    fg = (0, int(255 * intensity), int(255 * intensity))
    bg = (0, int(40 * intensity), int(40 * intensity))
    return (chars[idx], fg, bg)
```

---

## 3. Neon Sign Effect

### 3.1 Anatomy of a Neon Sign

Real neon signs have distinct visual layers:
1. **The tube** — thin, intensely bright line (the letter outlines)
2. **Inner glow** — bright halo immediately around the tube
3. **Outer glow** — diffuse ambient light fading into darkness
4. **Wall/background** — dark surface receiving spill light
5. **Mounting hardware** — optional realism detail (brackets, wires)

### 3.2 Thin-Line Tube Construction

For neon, prefer **outline** characters over filled blocks. The text itself
should be thin (1 cell wide strokes) rather than blocky:

```
Neon "N" using single-width lines:

    ██      ██        ← vertical strokes = the tube
    ███     ██
    ████    ██
    ██ ██   ██
    ██  ██  ██
    ██   ██ ██
    ██    ████
    ██     ███
    ██      ██
```

Use box-drawing characters (U+2500..U+257F) for even thinner tubes:
`│ ─ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼` and their rounded variants `╭ ╮ ╰ ╯`.

### 3.3 Color Scheme: Tube + Glow Layers

```
                NEON MAGENTA                    NEON CYAN
Layer           FG RGB          Sequence        FG RGB          Sequence
──────          ──────          ────────        ──────          ────────
Tube (core)     (255,100,255)   \x1b[1;95m     (100,255,255)   \x1b[1;96m
Inner glow      (200, 50,200)   \x1b[35m       ( 50,200,200)   \x1b[36m
Outer glow      (100, 20,100)   \x1b[2;35m     ( 20,100,100)   \x1b[2;36m
Ambient bg      ( 30,  5, 30)   bg only        (  5, 20, 20)   bg only
Dark wall       ( 10,  5, 15)   bg only        (  5, 10, 15)   bg only

Classic neon colors:
  Neon Red:     \x1b[1;91m  tube    \x1b[31m  inner    \x1b[2;31m  outer
  Neon Green:   \x1b[1;92m  tube    \x1b[32m  inner    \x1b[2;32m  outer
  Neon Blue:    \x1b[1;94m  tube    \x1b[34m  inner    \x1b[2;34m  outer
  Neon Yellow:  \x1b[1;93m  tube    \x1b[33m  inner    \x1b[2;33m  outer
```

### 3.4 Neon Sign Example: "OPEN"

```
    Background: dark wall = \x1b[48;2;15;5;20m (all cells)

                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░
              ░▒▒                             ▒▒░
              ░▒  ██▀▀█▄ █▀▀█ █▀▀▀ ██▄  █    ▒░
              ░▒  █    █ █▄▄█ █▄▄  █ ▀█ █    ▒░
              ░▒  █    █ █    █    █  ▀██    ▒░
              ░▒  ██▄▄█▀ █    █▄▄▄ █   ▀█    ▒░
              ░▒▒                             ▒▒░
              ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░
                ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

    Color assignments:
      ██/█ text chars = \x1b[1;38;2;255;80;220m   (bright magenta-pink, bold)
      ▒▒ inner glow   = \x1b[38;2;180;40;140;48;2;40;10;35m
      ░░ outer glow   = \x1b[38;2;80;15;65;48;2;20;5;18m
      spaces inside   = \x1b[48;2;25;8;22m   (slightly lit by ambient)
      spaces outside  = \x1b[48;2;15;5;20m   (dark wall)
```

### 3.5 Neon "Broken Tube" Effect

Real neon signs often have partially dead sections. Simulate by making
certain letter segments dim or dark:

```python
# For each character position in the tube:
if is_broken_segment(x, y):
    # Dead tube: very dim, no glow
    color = "\x1b[2;38;2;60;20;50m"   # barely visible
    glow = None  # suppress surrounding glow too
else:
    # Live tube: full brightness
    color = "\x1b[1;38;2;255;80;220m"
```

---

## 4. Bloom / Light Bleed

### 4.1 Concept

Bloom simulates camera over-exposure: bright areas "spill" light beyond
their physical boundaries. In terminals, this means setting **background
colors** on cells adjacent to bright content, even on otherwise "empty"
space characters.

### 4.2 Background-Only Bleed

The key insight: a space character `' '` with a colored background creates
a filled rectangle of that color. Surrounding bright text with background-
colored spaces simulates light bleeding into the environment.

```
Layer arrangement (cross-section through a glowing letter):

  Cell:    [  ][  ][  ][ ▓][ █][ █][ ▓][  ][  ][  ]
  BG:      dk  med brt brt WHT WHT brt brt med dk
  FG:      —   —   —   glo WHT WHT glo —   —   —

  dk  = \x1b[48;2;5;0;8m      (barely tinted)
  med = \x1b[48;2;20;5;25m    (noticeable tint)
  brt = \x1b[48;2;50;15;60m   (strong tint)
  glo = \x1b[38;2;180;60;200m (glow shade character fg)
  WHT = \x1b[1;97m            (bright white core text)
```

### 4.3 FG + BG Combinations for Maximum Bloom

Each cell can carry TWO color channels (foreground + background). Shade
characters let both show through simultaneously:

```
Character   What You See
─────────   ────────────
█           100% foreground, 0% background
▓           ~75% foreground, ~25% background
▒           ~50% foreground, ~50% background
░           ~25% foreground, ~75% background
(space)     0% foreground, 100% background
```

This means with truecolor, each cell blends two arbitrary RGB values at a
fixed ratio determined by the shade character. Five discrete blend steps
(0%, 25%, 50%, 75%, 100%) provide a serviceable gradient.

### 4.4 Half-Block Compositing for Double Resolution

Use `▀` (upper half, U+2580) or `▄` (lower half, U+2584) to pack two
independent colors into one cell vertically:

```
\x1b[38;2;R1;G1;B1;48;2;R2;G2;B2m▀\x1b[0m

Result: top half of cell = (R1,G1,B1), bottom half = (R2,G2,B2)
```

This doubles vertical resolution and enables smooth vertical gradients
for bloom effects:

```
Row 1: ▀ with fg=bright, bg=medium   → top=bright, bottom=medium
Row 2: ▀ with fg=medium, bg=dim      → top=medium, bottom=dim
Row 3: ▀ with fg=dim, bg=dark        → top=dim, bottom=dark
```

### 4.5 Bloom Example: Bright "X" Bleeding into Surroundings

```
    All on black background, bloom in magenta:

    Row 1:   [bg:5,0,8 ] [bg:15,3,18] [bg:30,8,35] [bg:15,3,18] [bg:5,0,8 ]
    Row 2:   [bg:15,3,18] [░ mag dim ] [▒ mag     ] [░ mag dim ] [bg:15,3,18]
    Row 3:   [bg:30,8,35] [▒ mag     ] [█ WHITE   ] [▒ mag     ] [bg:30,8,35]
    Row 4:   [bg:15,3,18] [░ mag dim ] [▒ mag     ] [░ mag dim ] [bg:15,3,18]
    Row 5:   [bg:5,0,8 ] [bg:15,3,18] [bg:30,8,35] [bg:15,3,18] [bg:5,0,8 ]

    In practice:
         ·  ░  ▒  ░  ·
         ░  ▒  ▓  ▒  ░
         ▒  ▓  █  ▓  ▒
         ░  ▒  ▓  ▒  ░
         ·  ░  ▒  ░  ·

    (where · = space with tinted bg only)
```

---

## 5. Flickering / Animation

### 5.1 Cursor Control for In-Place Updates

```
\x1b[s         Save cursor position
\x1b[u         Restore saved cursor position
\x1b[{r};{c}H Move cursor to row r, column c (1-indexed)
\x1b[{n}A     Move cursor up n lines
\x1b[{n}B     Move cursor down n lines
\x1b[{n}C     Move cursor right n columns
\x1b[{n}D     Move cursor left n columns
\x1b[?25l     Hide cursor (essential during animation)
\x1b[?25h     Show cursor (restore after animation)
\x1b[2J       Clear entire screen
\x1b[?1049h   Enter alternate screen buffer
\x1b[?1049l   Leave alternate screen buffer
```

### 5.2 Neon Flicker Animation (Python)

```python
import sys, time, random, math

# Hide cursor, enter alt screen
sys.stdout.write("\x1b[?1049h\x1b[?25l")

TEXT = "NEON"
BASE_COLOR = (255, 50, 200)  # Hot pink neon
GLOW_COLOR = (180, 30, 140)
BG_COLOR = (15, 5, 20)       # Dark wall

def render_frame(brightness, glow_brightness):
    """Render one frame of neon text with glow."""
    r = int(BASE_COLOR[0] * brightness)
    g = int(BASE_COLOR[1] * brightness)
    b = int(BASE_COLOR[2] * brightness)
    gr = int(GLOW_COLOR[0] * glow_brightness)
    gg = int(GLOW_COLOR[1] * glow_brightness)
    gb = int(GLOW_COLOR[2] * glow_brightness)
    bgr = int(BG_COLOR[0] + 20 * glow_brightness)
    bgg = int(BG_COLOR[1] + 5 * glow_brightness)
    bgb = int(BG_COLOR[2] + 15 * glow_brightness)

    bg = f"\x1b[48;2;{BG_COLOR[0]};{BG_COLOR[1]};{BG_COLOR[2]}m"
    abg = f"\x1b[48;2;{bgr};{bgg};{bgb}m"  # ambient-lit bg
    glow = f"\x1b[38;2;{gr};{gg};{gb};48;2;{bgr};{bgg};{bgb}m"
    tube = f"\x1b[1;38;2;{r};{g};{b};48;2;{bgr};{bgg};{bgb}m"

    sys.stdout.write(f"\x1b[3;10H")  # Position at row 3, col 10
    sys.stdout.write(f"{bg}                          \x1b[0m")
    sys.stdout.write(f"\x1b[4;10H")
    sys.stdout.write(f"{bg}  {glow}░▒▓{tube}█ {TEXT} █{glow}▓▒░{bg}  \x1b[0m")
    sys.stdout.write(f"\x1b[5;10H")
    sys.stdout.write(f"{bg}                          \x1b[0m")
    sys.stdout.flush()

try:
    frame = 0
    while True:
        # Sinusoidal pulse with random flicker spikes
        t = frame * 0.15
        pulse = 0.75 + 0.25 * math.sin(t)

        # Occasional flicker (5% chance of dimming)
        if random.random() < 0.05:
            pulse *= random.uniform(0.2, 0.6)

        # Glow lags slightly behind tube brightness
        glow_pulse = 0.6 + 0.4 * math.sin(t - 0.3)

        render_frame(pulse, glow_pulse * pulse)
        time.sleep(0.033)  # ~30 FPS
        frame += 1
except KeyboardInterrupt:
    pass
finally:
    # Restore terminal
    sys.stdout.write("\x1b[?25h\x1b[?1049l\x1b[0m")
    sys.stdout.flush()
```

### 5.3 Shade Character Cycling (Glow Breathing)

Animate the glow radius by cycling which shade character appears at each
distance ring per frame:

```python
# Frame-based shade assignment
SHADE_FRAMES = [
    # Expanding glow
    {1: '▓', 2: '▒', 3: '░', 4: ' '},
    {1: '█', 2: '▓', 3: '▒', 4: '░'},
    # Contracting glow
    {1: '▓', 2: '▒', 3: '░', 4: ' '},
    {1: '▒', 2: '░', 3: ' ', 4: ' '},
]

def get_shade(distance, frame):
    """Get shade character for a given distance at a given animation frame."""
    mapping = SHADE_FRAMES[frame % len(SHADE_FRAMES)]
    return mapping.get(distance, ' ')
```

### 5.4 Color Cycling (Pulsing Hue Shift)

```python
import colorsys

def hue_shift_color(base_hue, frame, speed=0.02):
    """Cycle hue around the color wheel for rainbow neon effect."""
    hue = (base_hue + frame * speed) % 1.0
    r, g, b = colorsys.hsv_to_rgb(hue, 1.0, 1.0)
    return (int(r * 255), int(g * 255), int(b * 255))

# Usage: each frame, compute new tube + glow colors
# base_hue = 0.83 for magenta, cycle slowly
```

### 5.5 Random Flicker Patterns (Realistic Neon)

Real neon signs flicker in characteristic patterns:

```python
class NeonFlicker:
    """State machine for realistic neon flicker behavior."""

    def __init__(self):
        self.state = 'on'       # 'on', 'flickering', 'off'
        self.brightness = 1.0
        self.flicker_counter = 0

    def update(self):
        if self.state == 'on':
            self.brightness = 0.85 + 0.15 * random.random()
            # 1% chance to start flickering
            if random.random() < 0.01:
                self.state = 'flickering'
                self.flicker_counter = random.randint(3, 8)

        elif self.state == 'flickering':
            # Rapid on/off
            self.brightness = random.choice([0.0, 0.3, 0.9, 1.0])
            self.flicker_counter -= 1
            if self.flicker_counter <= 0:
                self.state = 'on'

        return self.brightness
```

---

## 6. Warm Glow / Ember Effects

### 6.1 Color Progression: White-Hot to Cold Ash

Embers and warm glow follow a thermal color progression:

```
Temperature    Color Name     RGB              256-color approx
───────────    ──────────     ───              ────────────────
Hottest        White-hot      (255,255,220)    230 (cornsilk)
Very hot       Bright yellow  (255,255,100)    227
Hot            Gold/amber     (255,200,  0)    220
Warm           Orange         (255,140,  0)    214
Cooling        Red-orange     (255, 80,  0)    202
Cool           Dark red       (180, 30,  0)    160
Cold           Deep maroon    ( 80, 10,  0)    88
Ash            Near-black     ( 30,  5,  0)    52
```

### 6.2 Ember Glow: Shade + Color Mapping

Combine the thermal color progression with shade characters:

```
Core character:  █  in white-hot     \x1b[38;2;255;255;220m█
Ring 1:          ▓  in bright amber  \x1b[38;2;255;200;0m▓
Ring 2:          ▒  in orange        \x1b[38;2;255;140;0m▒
Ring 3:          ░  in dark red      \x1b[38;2;180;30;0m░
Ring 4:          ░  in deep maroon   \x1b[38;2;80;10;0m░
Beyond:          ·  in near-black    \x1b[38;2;30;5;0m·
```

Background colors follow the same progression but darker, to fill the
"gaps" in shade characters with the appropriate warmth:

```
Ring     FG                  BG                  Char
─────    ──                  ──                  ────
Core     rgb(255,255,220)    rgb(255,200,50)     █
Ring 1   rgb(255,200,0)      rgb(120,60,0)       ▓
Ring 2   rgb(255,140,0)      rgb(60,25,0)        ▒
Ring 3   rgb(180,30,0)       rgb(30,8,0)         ░
Ring 4   rgb(80,10,0)        rgb(12,3,0)         ░
Beyond   —                   rgb(5,1,0)          (space)
```

### 6.3 Example: "FIRE" in Ember Glow

```
    Background: \x1b[48;2;5;1;0m (dark warm black, whole area)

    ·  ·  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ·  ·
    ·  ░  ░  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ░  ░  ·
    ░  ░  ▒  ▒  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▒  ▒  ░  ░
    ░  ▒  ▒  ▓  █▀▀▀  █  █▀▀█  █▀▀▀  ▓  ▒  ▒  ░
    ░  ▒  ▒  ▓  █▀▀   █  ██▀▀  █▀▀   ▓  ▒  ▒  ░
    ░  ▒  ▒  ▓  █     █  █ ▀█  █▄▄▄  ▓  ▒  ▒  ░
    ░  ░  ▒  ▒  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▒  ▒  ░  ░
    ·  ░  ░  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ▒  ░  ░  ·
    ·  ·  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ·  ·

    Color key:
      █ text  = \x1b[1;38;2;255;255;220;48;2;255;200;50m     (white-hot)
      ▓ ring1 = \x1b[38;2;255;200;0;48;2;120;60;0m           (amber)
      ▒ ring2 = \x1b[38;2;255;140;0;48;2;60;25;0m            (orange)
      ░ ring3 = \x1b[38;2;180;30;0;48;2;30;8;0m              (dark red)
      · ring4 = \x1b[38;2;80;10;0;48;2;12;3;0m               (deep maroon)
      spaces  = \x1b[48;2;5;1;0m                               (near black)
```

### 6.4 Animated Embers (Particle Effect Concept)

Embers can include rising "spark" particles:

```python
import random

class Spark:
    """A single rising ember particle."""
    def __init__(self, x, y):
        self.x = x + random.uniform(-0.5, 0.5)
        self.y = y
        self.life = random.randint(5, 15)
        self.max_life = self.life
        self.char = random.choice(['*', '.', '·', '°', '•'])

    def update(self):
        self.y -= 1  # Rise upward
        self.x += random.uniform(-0.3, 0.3)  # Drift
        self.life -= 1

    def get_color(self):
        t = self.life / self.max_life  # 1.0 = fresh, 0.0 = dying
        r = int(255 * t)
        g = int(200 * t * t)  # Yellow fades faster than red
        b = 0
        return f"\x1b[38;2;{r};{g};{b}m"

    @property
    def alive(self):
        return self.life > 0
```

### 6.5 256-Color Fallback for Warm Glow

When truecolor isn't available, use the 6x6x6 color cube:

```
256-color warm gradient (approx):
  White-hot:    \x1b[38;5;230m   (cornsilk)
  Yellow:       \x1b[38;5;227m   (bright yellow)
  Gold:         \x1b[38;5;220m   (gold)
  Amber:        \x1b[38;5;214m   (orange)
  Orange:       \x1b[38;5;208m   (dark orange)
  Red-orange:   \x1b[38;5;202m   (orange-red)
  Red:          \x1b[38;5;196m   (red)
  Dark red:     \x1b[38;5;160m   (dark red)
  Maroon:       \x1b[38;5;88m    (dark red)
  Near-black:   \x1b[38;5;52m    (darkest red)
```

---

## 7. Directional Light Source Simulation

### 7.1 Concept: Surface Normal vs. Light Direction

3D-style text has faces (top, front, left, right, bottom). A directional
light source illuminates faces based on their angle relative to the light:

```
                Light source: upper-left (↘)
                ┌──────────────────────────┐
                │  Face         Brightness │
                │  ─────────   ────────── │
                │  Top          High       │
                │  Left         High       │
                │  Front        Medium     │
                │  Right        Low        │
                │  Bottom       Low        │
                └──────────────────────────┘
```

### 7.2 Character Density as Brightness

Assign shade characters to each face of 3D block text based on how
directly the light hits it:

```
Light from upper-left:

  Face facing light (top/left)    →  █ (bright, fully lit)
  Face at angle (front)           →  ▓ (medium)
  Face away from light (right)    →  ▒ (dim)
  Face opposite light (bottom)    →  ░ (shadow)
  Cast shadow                     →  ░ or ▒ in dark color
```

### 7.3 Example: 3D "A" with Upper-Left Light

```
    Light direction: ↘ (from upper-left)

          ████
         ██▓▓██
        ██▓▓▓▓██
       ██▓▓  ▓▓██
      ████████████
     ██▓▓▓▓▓▓▓▓▓▓██
    ██▓▓        ▓▓██
   ████          ████
   ▒▒░░          ▒▒░░    ← cast shadow (right+bottom offset)

    Color assignments for lit faces:
      ██ top/left faces  = \x1b[1;38;2;200;200;255m   (bright, cool-white)
      ▓▓ front face      = \x1b[38;2;140;140;180m     (medium lit)
      ▒▒ right face      = \x1b[38;2;80;80;110m       (dim, turned away)
      ░░ cast shadow     = \x1b[2;38;2;30;30;50m      (dark shadow)
```

### 7.4 Colored Light Sources

Replace white light with colored light to dramatically change the mood:

```
Light Color    Lit Face (bright)    Angled Face        Shadow
───────────    ─────────────────    ───────────        ──────
Warm sun       rgb(255,240,200)     rgb(180,160,120)   rgb(40,35,50)
Cool moon      rgb(180,200,255)     rgb(100,120,160)   rgb(20,25,40)
Neon red       rgb(255,60,60)       rgb(160,30,30)     rgb(40,10,10)
Neon green     rgb(60,255,60)       rgb(30,160,30)     rgb(10,40,10)
Fire           rgb(255,200,50)      rgb(200,100,20)    rgb(50,15,5)
```

### 7.5 Two-Tone Lighting (Key + Fill)

Professional 3D rendering uses multiple lights. Simulate with two colors:

```
Key light (warm, strong, upper-left):   rgb(255,220,180)
Fill light (cool, weak, lower-right):   rgb(100,120,180)

Face              Receives        Result Color
────              ────────        ────────────
Top-left          Key (strong)    rgb(255,220,180)  → █ bright warm
Front             Key + Fill      rgb(200,180,170)  → ▓ medium neutral
Bottom-right      Fill (weak)     rgb(100,120,180)  → ▒ dim cool
Shadow (neither)  None            rgb(20,20,30)     → ░ dark
```

### 7.6 Programmatic Directional Light

```python
import math

def compute_lit_brightness(face_normal, light_dir):
    """
    Compute brightness of a surface face given light direction.

    face_normal: (nx, ny) unit vector pointing outward from surface
    light_dir:   (lx, ly) unit vector pointing TOWARD light source

    Returns: brightness 0.0 to 1.0
    """
    # Dot product: how directly face points toward light
    dot = face_normal[0] * light_dir[0] + face_normal[1] * light_dir[1]
    # Clamp: faces pointing away get 0 (no negative light)
    brightness = max(0.0, dot)
    # Add ambient minimum so nothing is pure black
    ambient = 0.1
    return ambient + (1.0 - ambient) * brightness

# Face normals for block text
NORMALS = {
    'top':    ( 0.0, -1.0),
    'bottom': ( 0.0,  1.0),
    'left':   (-1.0,  0.0),
    'right':  ( 1.0,  0.0),
    'front':  ( 0.0,  0.0),  # Facing viewer (Z-axis, neutral)
}

# Light from upper-left
light = (-0.707, -0.707)  # normalized (1/sqrt(2))

for face, normal in NORMALS.items():
    b = compute_lit_brightness(normal, light)
    char = '█' if b > 0.7 else '▓' if b > 0.4 else '▒' if b > 0.2 else '░'
    print(f"  {face:8s}: brightness={b:.2f}  char={char}")
```

### 7.7 Specular Highlight (Glossy Effect)

For a "shiny" look, add a specular highlight — an extra-bright spot
where the light reflects most directly toward the viewer:

```python
def specular(face_normal, light_dir, view_dir, shininess=16):
    """Blinn-Phong specular highlight."""
    # Half vector between light and view
    hx = (light_dir[0] + view_dir[0])
    hy = (light_dir[1] + view_dir[1])
    mag = math.sqrt(hx*hx + hy*hy) or 1.0
    hx, hy = hx/mag, hy/mag
    dot = max(0.0, face_normal[0]*hx + face_normal[1]*hy)
    return dot ** shininess  # Sharp falloff = shiny surface

# When specular > 0.5, use bright white '█' regardless of base color
# When specular > 0.2, blend white into the lit color
```

In ASCII art, specular highlights appear as a small cluster of `█` in
bright white on an otherwise colored surface.

---

## 8. Quick Reference Tables

### 8.1 Shade Character Density

```
Char    Unicode     Fill%    Visual Weight    Typical Use
────    ───────     ─────    ─────────────    ───────────
(sp)    U+0020       0%     Void             Background, empty space
 ·      U+00B7       5%     Minimal          Faintest glow hint
 ░      U+2591      25%     Light            Outer glow, distant haze
 ▒      U+2592      50%     Medium           Mid-glow
 ▓      U+2593      75%     Heavy            Inner glow
 █      U+2588     100%     Solid            Core, fully lit surface
```

### 8.2 Glow Pattern Templates

```
1-CELL RADIUS:             2-CELL RADIUS:              3-CELL RADIUS:
    ▓█▓                      ▒▓█▓▒                     ░▒▓█▓▒░
    ▓█▓                      ▒▓█▓▒                     ░▒▓█▓▒░

1-CELL RADIAL:             2-CELL RADIAL:              3-CELL RADIAL:
     ▓▓▓                      ▒▒▒▒▒                     ░░░░░░░
     ▓█▓                      ▒▓▓▓▒                     ░▒▒▒▒▒░
     ▓▓▓                      ▒▓█▓▒                     ░▒▓▓▓▒░
                               ▒▓▓▓▒                     ░▒▓█▓▒░
                               ▒▒▒▒▒                     ░▒▓▓▓▒░
                                                          ░▒▒▒▒▒░
                                                          ░░░░░░░
```

### 8.3 ANSI Color Quick Reference for Glow Work

```
BRIGHTNESS MODIFIERS:
  \x1b[1m   Bold/Bright (glow core)
  \x1b[2m   Dim/Faint   (glow edge)
  \x1b[22m  Normal      (base)
  \x1b[0m   Reset all

16-COLOR NEON PALETTE:
  Cyan:     \x1b[1;96m (tube)  \x1b[36m (glow)  \x1b[2;36m (haze)
  Magenta:  \x1b[1;95m (tube)  \x1b[35m (glow)  \x1b[2;35m (haze)
  Red:      \x1b[1;91m (tube)  \x1b[31m (glow)  \x1b[2;31m (haze)
  Green:    \x1b[1;92m (tube)  \x1b[32m (glow)  \x1b[2;32m (haze)
  Yellow:   \x1b[1;93m (tube)  \x1b[33m (glow)  \x1b[2;33m (haze)
  Blue:     \x1b[1;94m (tube)  \x1b[34m (glow)  \x1b[2;34m (haze)

TRUECOLOR TEMPLATE:
  FG: \x1b[38;2;{r};{g};{b}m
  BG: \x1b[48;2;{r};{g};{b}m

256-COLOR GRAYSCALE RAMP (for monochrome glow):
  \x1b[38;5;232m (black) ... \x1b[38;5;255m (white)
  24 steps: 232=darkest, 243=mid, 255=brightest

CURSOR CONTROL (for animation):
  \x1b[s     Save position
  \x1b[u     Restore position
  \x1b[?25l  Hide cursor
  \x1b[?25h  Show cursor
```

### 8.4 Effect Decision Matrix

```
Effect              Min Color   Shade Chars   Animation   Complexity
──────              ─────────   ───────────   ─────────   ──────────
Simple glow aura    16-color    ░▒▓█          No          Low
Neon sign           16-color    ░▒▓█          Optional    Medium
Smooth bloom        Truecolor   ░▒▓█ + ▀▄    No          Medium
Ember/warm glow     256-color   ░▒▓█·         Optional    Medium
Flickering neon     16-color    ░▒▓█          Yes         Medium
Pulsing glow        Truecolor   ░▒▓█          Yes         Medium-High
Directional light   256-color   ░▒▓█          No          Medium
Specular highlight  Truecolor   ░▒▓█          No          High
Particle embers     Truecolor   ·*°•          Yes         High
Full neon scene     Truecolor   All           Yes         High
```

---

## Tips and Best Practices

1. **Always set background colors** — shade characters have "holes" that
   reveal the background. Without a matching BG, the effect looks broken.

2. **Use `\x1b[1m` (bold) on the core** — in most terminals this makes
   colors brighter, naturally creating a luminous center.

3. **Use `\x1b[2m` (dim) on outer glow** — the counterpart to bold; it
   reduces color intensity for realistic falloff.

4. **Test with `$COLORTERM`** — check for `truecolor` or `24bit` before
   using RGB sequences; fall back to 256-color or 16-color gracefully.

5. **Account for terminal cell aspect ratio** — cells are ~2:1 (height:width).
   Glow rings need more horizontal characters than vertical rows to appear
   circular. Roughly: horizontal extent = 2x vertical extent.

6. **Combine FG shade characters with BG color** for the smoothest gradients.
   Each cell effectively blends two colors at a ratio set by the shade char.

7. **For animation, always hide the cursor** (`\x1b[?25l`) and **use the
   alternate screen buffer** (`\x1b[?1049h`) to avoid polluting scrollback.

8. **Layer your effects**: background tint first, then shade character glow,
   then the bright core text on top. Think of it as compositing layers.
