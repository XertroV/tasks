# ANSI Escape Sequences for Colored Terminal Output in Python

A practical reference for rendering colored ASCII art logos.

---

## 1. ANSI Escape Sequence Basics

### The Escape Character

The escape character (ASCII 27 / 0x1B) introduces all ANSI sequences. In Python strings:

```python
ESC = "\x1b"    # hex notation (preferred in Python)
ESC = "\033"    # octal notation
ESC = "\u001b"  # unicode notation
```

All three are identical at the byte level. `\x1b` is the most common in Python codebases.

### CSI (Control Sequence Introducer)

The CSI is `ESC [` — the escape character followed by an opening bracket. This prefix
starts most useful sequences:

```python
CSI = "\x1b["
```

### SGR (Select Graphic Rendition)

SGR sequences control text styling and color. Format:

```
\x1b[{param1};{param2};...m
```

- Parameters are semicolon-separated integers
- The sequence terminates with `m`
- Missing/empty parameters default to `0`

### Reset Code

```python
RESET = "\x1b[0m"   # resets ALL attributes (color, bold, etc.)
```

Always emit a reset at the end of colored output to avoid bleeding styles into
subsequent terminal output.

### Common Style Codes

| Code | Effect           | Reset Code   |
|------|------------------|--------------|
| `0`  | Reset all        | —            |
| `1`  | Bold / bright    | `22`         |
| `2`  | Dim / faint      | `22`         |
| `3`  | Italic           | `23`         |
| `4`  | Underline        | `24`         |
| `7`  | Reverse video    | `27`         |
| `9`  | Strikethrough    | `29`         |

---

## 2. 256-Color Mode (8-bit)

### Syntax

```python
# Foreground
f"\x1b[38;5;{n}m"    # n = 0..255

# Background
f"\x1b[48;5;{n}m"    # n = 0..255
```

### Color Map Layout

```
  0 -   7 : Standard colors       (maps to SGR 30-37)
  8 -  15 : Bright/bold colors    (maps to SGR 90-97)
 16 - 231 : 6x6x6 RGB color cube  (216 colors)
232 - 255 : Grayscale ramp         (24 shades, dark to light)
```

### RGB Cube Formula (colors 16-231)

```python
def rgb_to_256(r: int, g: int, b: int) -> int:
    """Convert r,g,b (each 0-5) to 256-color index."""
    return 16 + 36 * r + 6 * g + b

# Examples:
# rgb_to_256(5, 5, 0)  -> 226  (bright yellow)
# rgb_to_256(5, 4, 0)  -> 220  (golden yellow)
# rgb_to_256(5, 3, 0)  -> 214  (orange-yellow)
# rgb_to_256(5, 2, 0)  -> 208  (orange)
```

The 6 RGB steps map to these approximate intensity values (xterm convention):
```
Step 0 -> 0
Step 1 -> 95
Step 2 -> 135
Step 3 -> 175
Step 4 -> 215
Step 5 -> 255
```

So `rgb_to_256(5, 4, 0)` = color 220 = approximately RGB(255, 215, 0) — which is
"Gold" in web colors.

### Grayscale Ramp (colors 232-255)

24 shades from near-black to near-white:
```
232 = RGB(8,8,8)       (darkest)
...
243 = RGB(118,118,118) (mid-gray)
...
255 = RGB(238,238,238) (lightest)
```

Formula: `RGB value = 8 + 10 * (n - 232)` for n in 232..255.

### Useful 256-Color Numbers for Yellow/Amber/Gold

| Code | Approx RGB        | Description        |
|------|-------------------|--------------------|
| 226  | (255, 255, 0)     | Bright yellow      |
| 227  | (255, 255, 95)    | Light yellow       |
| 220  | (255, 215, 0)     | Gold               |
| 214  | (255, 175, 0)     | Orange-yellow      |
| 208  | (255, 135, 0)     | Orange             |
| 202  | (255, 95, 0)      | Red-orange         |
| 178  | (215, 175, 0)     | Dark gold          |
| 172  | (215, 135, 0)     | Dark orange        |
| 136  | (175, 135, 0)     | Dark amber         |
| 130  | (175, 95, 0)      | Brown-amber        |
| 94   | (135, 95, 0)      | Dark brown         |
| 58   | (95, 95, 0)       | Olive/dark yellow  |
| 11   | (255, 255, 85)    | Bright yellow (4-bit bright) |
| 3    | (128, 128, 0)     | Standard yellow (4-bit) |

---

## 3. 24-bit / Truecolor Mode

### Syntax

```python
# Foreground
f"\x1b[38;2;{r};{g};{b}m"    # r, g, b = 0..255

# Background
f"\x1b[48;2;{r};{g};{b}m"    # r, g, b = 0..255
```

### Example

```python
# Rich golden foreground
print(f"\x1b[38;2;255;191;0mGolden text\x1b[0m")

# White text on dark amber background
print(f"\x1b[38;2;255;255;255m\x1b[48;2;180;100;0mAmber BG\x1b[0m")
```

### Terminal Support

Truecolor is supported by most modern terminals:
- **Full support**: iTerm2, Windows Terminal, GNOME Terminal (>= 3.18),
  Konsole, Alacritty, kitty, WezTerm, foot, Hyper, VS Code integrated terminal
- **Partial/no support**: older xterm versions, Linux console (tty), some
  tmux configurations (requires `set -g default-terminal "tmux-256color"`)
- **Detection**: Check `$COLORTERM` environment variable — if set to `truecolor`
  or `24bit`, the terminal supports it.

```python
import os

def supports_truecolor() -> bool:
    """Check if terminal likely supports 24-bit color."""
    colorterm = os.environ.get("COLORTERM", "")
    return colorterm in ("truecolor", "24bit")
```

### Fallback Strategy

```python
def color_fg(r: int, g: int, b: int) -> str:
    """Return foreground color sequence, with 256-color fallback."""
    if supports_truecolor():
        return f"\x1b[38;2;{r};{g};{b}m"
    else:
        # Approximate to nearest 256-color
        ri = round(r / 255 * 5)
        gi = round(g / 255 * 5)
        bi = round(b / 255 * 5)
        idx = 16 + 36 * ri + 6 * gi + bi
        return f"\x1b[38;5;{idx}m"
```

---

## 4. Gradient Techniques in Python

### Color Interpolation

```python
def lerp_color(c1: tuple[int,int,int], c2: tuple[int,int,int], t: float) -> tuple[int,int,int]:
    """Linearly interpolate between two RGB colors. t in [0.0, 1.0]."""
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )
```

### Horizontal Gradient (color changes per character)

Each character in a line gets a different color, interpolated left-to-right:

```python
RESET = "\x1b[0m"

def horizontal_gradient(text: str, c1: tuple, c2: tuple) -> str:
    """Apply a horizontal gradient across a string of text."""
    n = max(len(text) - 1, 1)
    result = []
    for i, ch in enumerate(text):
        t = i / n
        r, g, b = lerp_color(c1, c2, t)
        result.append(f"\x1b[38;2;{r};{g};{b}m{ch}")
    result.append(RESET)
    return "".join(result)

# Example: yellow to red gradient
print(horizontal_gradient("HELLO WORLD", (255, 220, 0), (200, 50, 0)))
```

### Vertical Gradient (color changes per line)

Each line of multi-line art gets a uniform color, interpolated top-to-bottom:

```python
def vertical_gradient(lines: list[str], c1: tuple, c2: tuple) -> str:
    """Apply a vertical gradient across lines of text."""
    n = max(len(lines) - 1, 1)
    result = []
    for i, line in enumerate(lines):
        t = i / n
        r, g, b = lerp_color(c1, c2, t)
        result.append(f"\x1b[38;2;{r};{g};{b}m{line}{RESET}")
    return "\n".join(result)

# Example: bright yellow at top -> dark amber at bottom
logo_lines = [
    "  ████████  ",
    " ██      ██ ",
    " ██  ██  ██ ",
    " ██      ██ ",
    "  ████████  ",
]
print(vertical_gradient(logo_lines, (255, 230, 50), (180, 80, 0)))
```

### Diagonal Gradient

Combine horizontal and vertical position to create a diagonal sweep:

```python
def diagonal_gradient(
    lines: list[str],
    c1: tuple, c2: tuple,
    direction: float = 1.0,  # 1.0 = top-left to bottom-right
) -> str:
    """Apply a diagonal gradient across 2D text art."""
    height = len(lines)
    width = max(len(line) for line in lines) if lines else 1
    max_dist = height + width - 2 or 1
    result = []
    for y, line in enumerate(lines):
        row = []
        for x, ch in enumerate(line):
            # Normalize diagonal distance
            t = (x + y * direction) / max_dist
            t = max(0.0, min(1.0, t))  # clamp
            r, g, b = lerp_color(c1, c2, t)
            row.append(f"\x1b[38;2;{r};{g};{b}m{ch}")
        row.append(RESET)
        result.append("".join(row))
    return "\n".join(result)
```

### Multi-Stop Gradient

For richer color progressions, interpolate through a list of color stops:

```python
def multi_gradient(text: str, colors: list[tuple]) -> str:
    """Apply a multi-color gradient across a string."""
    n = len(text)
    if n <= 1:
        r, g, b = colors[0]
        return f"\x1b[38;2;{r};{g};{b}m{text}{RESET}"

    num_segments = len(colors) - 1
    result = []
    for i, ch in enumerate(text):
        # Map character position to color segment
        pos = i / (n - 1) * num_segments
        seg = int(pos)
        seg = min(seg, num_segments - 1)
        t = pos - seg
        r, g, b = lerp_color(colors[seg], colors[seg + 1], t)
        result.append(f"\x1b[38;2;{r};{g};{b}m{ch}")
    result.append(RESET)
    return "".join(result)

# Example: warm white -> golden -> orange -> dark amber
print(multi_gradient(
    "═══════════════════════════",
    [(255, 248, 220), (255, 200, 50), (230, 140, 0), (140, 70, 0)]
))
```

---

## 5. Yellow/Amber/Warm Color Palettes

### Specific RGB Values

| Name             | RGB             | Hex       | 256-color approx | Notes                      |
|------------------|-----------------|-----------|-------------------|----------------------------|
| Bright Yellow    | (255, 255, 0)   | `#FFFF00` | 226               | Pure bright yellow         |
| Golden Yellow    | (255, 215, 0)   | `#FFD700` | 220               | Classic "gold" web color   |
| Warm Yellow      | (255, 200, 50)  | `#FFC832` | 220               | Slightly warm yellow       |
| Amber            | (255, 191, 0)   | `#FFBF00` | 214               | Standard amber             |
| Dark Amber       | (210, 140, 0)   | `#D28C00` | 172               | Deep amber                 |
| Orange           | (255, 140, 0)   | `#FF8C00` | 208               | DarkOrange web color       |
| Burnt Orange     | (204, 85, 0)    | `#CC5500` | 166               | Deep burnt orange          |
| Warm White       | (255, 248, 220) | `#FFF8DC` | 230               | Cornsilk / warm highlight  |
| Cream            | (255, 235, 180) | `#FFEBB4` | 229               | Soft warm cream            |
| Light Gold       | (255, 225, 120) | `#FFE178` | 221               | Pale gold, good for glow   |
| Dark Brown       | (100, 50, 0)    | `#643200` | 94                | Shadow/outline color       |
| Deep Brown       | (60, 30, 0)     | `#3C1E00` | 52                | Darkest shadow             |

### Suggested "Glowing Amber" Palette (12 colors)

Purpose-built for warm, glowing ASCII art with depth:

```python
AMBER_PALETTE = {
    # Highlights / glow
    "warm_white":   (255, 248, 220),  # brightest highlights
    "light_gold":   (255, 225, 120),  # inner glow
    "bright_yellow":(255, 235, 50),   # hot center glow

    # Primary tones
    "gold":         (255, 200, 0),    # main bright color
    "amber":        (255, 170, 0),    # core amber
    "dark_amber":   (210, 130, 0),    # shaded amber

    # Warm shadows
    "orange":       (230, 110, 0),    # warm mid-shadow
    "burnt_orange": (180, 75, 0),     # deep shadow
    "brown":        (130, 55, 0),     # dark edge

    # Deep shadows
    "dark_brown":   (80, 35, 0),      # outline / deepest shadow
    "near_black":   (40, 18, 0),      # almost-black warm

    # Accent
    "hot_core":     (255, 255, 150),  # whitish-yellow peak
}
```

### 256-Color Warm Palette (for fallback)

When truecolor is unavailable, these 256-color codes approximate the same range:

```python
AMBER_256 = {
    "warm_white":    230,  # approx (255, 255, 215)
    "light_gold":    221,  # approx (255, 215, 95)
    "bright_yellow": 226,  # approx (255, 255, 0)
    "gold":          220,  # approx (255, 215, 0)
    "amber":         214,  # approx (255, 175, 0)
    "dark_amber":    172,  # approx (215, 135, 0)
    "orange":        208,  # approx (255, 135, 0)
    "burnt_orange":  166,  # approx (215, 95, 0)
    "brown":         130,  # approx (175, 95, 0)
    "dark_brown":     94,  # approx (135, 95, 0)
    "near_black":     52,  # approx (95, 0, 0) — limited fit
}
```

---

## 6. Python Helper Patterns

### Basic Colorize Function

```python
RESET = "\x1b[0m"

def fg(r: int, g: int, b: int) -> str:
    """Return ANSI foreground color escape sequence."""
    return f"\x1b[38;2;{r};{g};{b}m"

def bg(r: int, g: int, b: int) -> str:
    """Return ANSI background color escape sequence."""
    return f"\x1b[48;2;{r};{g};{b}m"

def colorize(text: str, fgcolor: tuple = None, bgcolor: tuple = None) -> str:
    """Wrap text with foreground and/or background ANSI color codes."""
    prefix = ""
    if fgcolor:
        prefix += fg(*fgcolor)
    if bgcolor:
        prefix += bg(*bgcolor)
    return f"{prefix}{text}{RESET}" if prefix else text
```

### Using f-strings with ANSI Codes

```python
# Direct inline usage
r, g, b = 255, 200, 0
text = "GOLDEN"
print(f"\x1b[38;2;{r};{g};{b}m{text}\x1b[0m")

# With pre-built escape strings
GOLD = "\x1b[38;2;255;200;0m"
AMBER = "\x1b[38;2;255;170;0m"
BOLD = "\x1b[1m"
RESET = "\x1b[0m"
print(f"{BOLD}{GOLD}Hello {AMBER}World{RESET}")

# 256-color via f-string
n = 220
print(f"\x1b[38;5;{n}mColor {n}\x1b[0m")
```

### Building Colored ASCII Art Line by Line

```python
def render_colored_logo(art_lines: list[str], palette_map: dict[str, tuple]) -> str:
    """
    Render ASCII art with per-character coloring.

    art_lines: list of strings (the ASCII art)
    palette_map: maps characters to RGB tuples, e.g.:
        {'#': (255, 200, 0), '.': (100, 50, 0), ' ': None}
    """
    RESET = "\x1b[0m"
    result = []
    for line in art_lines:
        row = []
        for ch in line:
            color = palette_map.get(ch)
            if color is not None:
                r, g, b = color
                row.append(f"\x1b[38;2;{r};{g};{b}m{ch}")
            else:
                row.append(ch)
        row.append(RESET)
        result.append("".join(row))
    return "\n".join(result)

# Example usage:
art = [
    "  ####  ",
    " #....# ",
    " #....# ",
    "  ####  ",
]
colors = {
    '#': (255, 200, 0),   # gold border
    '.': (255, 140, 0),   # orange fill
    ' ': None,            # no color (transparent)
}
print(render_colored_logo(art, colors))
```

### Combining Foreground + Background

```python
def fg_bg(text: str, fg_rgb: tuple, bg_rgb: tuple) -> str:
    """Apply both foreground and background colors."""
    return (
        f"\x1b[38;2;{fg_rgb[0]};{fg_rgb[1]};{fg_rgb[2]}m"
        f"\x1b[48;2;{bg_rgb[0]};{bg_rgb[1]};{bg_rgb[2]}m"
        f"{text}\x1b[0m"
    )

# Half-block pixel art: use background for top pixel, foreground for bottom pixel
# Unicode U+2584 "Lower half block" (▄)
# The FOREGROUND color fills the BOTTOM half, BACKGROUND fills the TOP half.
def pixel_row(top_pixels: list[tuple], bot_pixels: list[tuple]) -> str:
    """Render two rows of pixel colors as one terminal row using half-blocks."""
    parts = []
    for top, bot in zip(top_pixels, bot_pixels):
        parts.append(
            f"\x1b[38;2;{bot[0]};{bot[1]};{bot[2]}m"
            f"\x1b[48;2;{top[0]};{top[1]};{top[2]}m"
            "\u2584"  # ▄ lower half block
        )
    parts.append("\x1b[0m")
    return "".join(parts)
```

### Complete Example: Glowing Amber Logo

```python
#!/usr/bin/env python3
"""Render an ASCII art logo with a warm amber vertical gradient."""

RESET = "\x1b[0m"

def lerp(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))

def render_logo():
    logo = [
        "  ██████╗  █████╗  ██████╗██╗  ██╗",
        "  ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝",
        "  ██████╔╝███████║██║     █████╔╝ ",
        "  ██╔══██╗██╔══██║██║     ██╔═██╗ ",
        "  ██████╔╝██║  ██║╚██████╗██║  ██╗",
        "  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝",
    ]

    top_color    = (255, 255, 150)   # hot white-yellow
    mid_color    = (255, 200, 0)     # gold
    bottom_color = (180, 80, 0)      # dark amber

    n = len(logo)
    for i, line in enumerate(logo):
        t = i / max(n - 1, 1)
        if t < 0.5:
            color = lerp(top_color, mid_color, t * 2)
        else:
            color = lerp(mid_color, bottom_color, (t - 0.5) * 2)

        r, g, b = color
        print(f"\x1b[1m\x1b[38;2;{r};{g};{b}m{line}{RESET}")

if __name__ == "__main__":
    render_logo()
```

---

## Quick Reference Card

```
ESCAPE CHAR:     \x1b  (or \033 or \u001b)
CSI PREFIX:      \x1b[
RESET:           \x1b[0m
BOLD:            \x1b[1m

FOREGROUND (256): \x1b[38;5;{n}m       n = 0-255
BACKGROUND (256): \x1b[48;5;{n}m

FOREGROUND (RGB): \x1b[38;2;{r};{g};{b}m
BACKGROUND (RGB): \x1b[48;2;{r};{g};{b}m

COMBINE: \x1b[1;38;2;255;200;0m  = bold + gold foreground

256-COLOR CUBE:   index = 16 + 36*r + 6*g + b  (r,g,b = 0-5)
256-COLOR GRAY:   index = 232..255  (24 steps, dark to light)

KEY WARM COLORS (256-mode):
  226=yellow  220=gold  214=amber  208=orange
  172=dark_amber  130=brown  94=dark_brown
```
