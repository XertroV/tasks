#!/usr/bin/env python3
"""
The Backlogs: ASCII Logo Generator
===================================
Renders "The Backrooms" inspired ASCII art logos.

Usage:
    python backlog/logo.py --concept <name> [--no-color] [--vhs] [--seed N]

Concepts:
    stack     - The Infinite Stack: recursive descent into void
    room      - Level 0: a miniature Backrooms room containing the logo
    glitch    - The Glitch: clean-to-corrupted left-to-right dissolution
    sign      - The Flickering Sign: dying fluorescent backlit panel
    liminal   - Maximum Liminal: block font + hum line + ambient glow
    corridor  - The Corridor: one-point-perspective hallway
"""

import random
import math
import re
import sys
import click

# ═══════════════════════════════════════════════════════════════════════════════
# CORE UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════

RESET = "\x1b[0m"


def _fg(r, g, b):
    return f"\x1b[38;2;{r};{g};{b}m"


def _bg(r, g, b):
    return f"\x1b[48;2;{r};{g};{b}m"


def _fg_bg(fr, fg_, fb, br, bg_, bb):
    return f"\x1b[38;2;{fr};{fg_};{fb}m\x1b[48;2;{br};{bg_};{bb}m"


def _clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))


def _lerp(a, b, t):
    return a + (b - a) * t


def _lerp_color(c1, c2, t):
    return tuple(_clamp(_lerp(c1[i], c2[i], t)) for i in range(3))


def _strip_ansi(text):
    return re.sub(r"\x1b\[[0-9;]*m", "", text)


def _colorize(text, fg_color):
    """Wrap text in foreground color."""
    return f"{_fg(*fg_color)}{text}{RESET}"


def _colorize_bg(text, fg_color, bg_color):
    """Wrap text in fg+bg color."""
    return f"{_fg_bg(*fg_color, *bg_color)}{text}{RESET}"


# ═══════════════════════════════════════════════════════════════════════════════
# PIXEL FONT (4-pixel-row, packed into 2 terminal rows via half-blocks)
# ═══════════════════════════════════════════════════════════════════════════════
# Each glyph is defined as 4 rows of pixel bitmaps (5 wide), then packed into
# 2 terminal rows using ▀ ▄ █ and space. This gives much better legibility
# than the old 2-row direct approach — each letter is clearly distinct.

# Pixel bitmaps: 5 wide, 4 tall. '#' = on, ' ' = off.
_PIXEL_FONT = {
    "T": ["#####", " ##  ", " ##  ", " ##  "],
    "H": ["##  #", "#####", "##  #", "##  #"],
    "E": ["#####", "#### ", "##   ", "#####"],
    "B": ["#### ", "#####", "##  #", "#### "],
    "A": [" ### ", "##  #", "#####", "##  #"],
    "C": [" ####", "##   ", "##   ", " ####"],
    "K": ["#  ##", "#### ", "#### ", "#  ##"],
    "L": ["##   ", "##   ", "##   ", "#####"],
    "O": [" ### ", "##  #", "##  #", " ### "],
    "G": [" ####", "##   ", "## ##", " ####"],
    "S": [" ####", "###  ", "  ###", "#### "],
    " ": ["     ", "     ", "     ", "     "],
    "D": ["#### ", "#   #", "#   #", "#### "],
    "R": ["#### ", "#####", "#### ", "#  ##"],
    "N": ["#   #", "##  #", "# ###", "#   #"],
    "I": [" ### ", " ### ", " ### ", " ### "],
    "F": ["#####", "#### ", "#    ", "#    "],
    "P": ["#### ", "#####", "#### ", "#    "],
    "W": ["#   #", "#   #", "# # #", " # # "],
    "Y": ["#   #", " ### ", " ### ", " ### "],
    "U": ["#   #", "#   #", "#   #", " ### "],
    "M": ["#   #", "## ##", "# # #", "#   #"],
    "V": ["#   #", "#   #", " # # ", "  #  "],
    "X": ["#   #", " ### ", " ### ", "#   #"],
    "Z": ["#####", "  ## ", " ##  ", "#####"],
}


def _pack_pixel_rows(p0, p1, p2, p3):
    """Pack 4 pixel rows into 2 terminal rows using half-block characters."""
    w = len(p0)
    r0 = ""
    r1 = ""
    for i in range(w):
        top, bot = p0[i] == "#", p1[i] == "#"
        if top and bot:
            r0 += "█"
        elif top:
            r0 += "▀"
        elif bot:
            r0 += "▄"
        else:
            r0 += " "
        top, bot = p2[i] == "#", p3[i] == "#"
        if top and bot:
            r1 += "█"
        elif top:
            r1 += "▀"
        elif bot:
            r1 += "▄"
        else:
            r1 += " "
    return r0, r1


# Pre-pack all glyphs into 2-row form
FONT = {}
for _ch, _px in _PIXEL_FONT.items():
    FONT[_ch] = list(_pack_pixel_rows(*_px))


def render_text(text, letter_gap=1):
    """Render text using the pixel font. Returns (row0, row1) strings."""
    row0_parts = []
    row1_parts = []
    gap = " " * letter_gap
    for ch in text.upper():
        glyph = FONT.get(ch, ["?????", "?????"])
        row0_parts.append(glyph[0])
        row1_parts.append(glyph[1])
    return gap.join(row0_parts), gap.join(row1_parts)


def render_text_width(text, letter_gap=1):
    """Get the rendered width of text in the pixel font."""
    r0, _ = render_text(text, letter_gap)
    return len(r0)


# ═══════════════════════════════════════════════════════════════════════════════
# COLOR PALETTES
# ═══════════════════════════════════════════════════════════════════════════════

PALETTE = {
    # Core Backrooms yellows
    "fluorescent_white": (255, 252, 230),
    "hot_yellow": (255, 230, 130),
    "core_yellow": (235, 195, 65),
    "sick_yellow": (200, 175, 50),
    "wallpaper": (196, 168, 70),
    "amber_shadow": (150, 110, 20),
    "deep_shadow": (80, 55, 5),
    # Ambient / Background
    "near_ambient": (40, 30, 3),
    "mid_ambient": (20, 14, 1),
    "far_ambient": (10, 7, 0),
    "void": (3, 2, 0),
    # Textures
    "carpet_tan": (160, 140, 90),
    "carpet_dark": (110, 95, 55),
    "stain_brown": (85, 65, 30),
    # Accents
    "frame_gray": (74, 74, 74),
    "mold_green": (20, 30, 10),
    "false_comfort": (255, 220, 120),
}


# ═══════════════════════════════════════════════════════════════════════════════
# EFFECTS
# ═══════════════════════════════════════════════════════════════════════════════


def frozen_flicker(width, seed=42):
    """Generate a frozen-in-time flicker brightness map (per-column).
    Returns list of floats 0.55..1.0 representing brightness multipliers."""
    rng = random.Random(seed)
    flicker = []
    for _ in range(width):
        base = 0.92
        noise = rng.gauss(0, 0.08)
        if rng.random() < 0.15:
            noise -= rng.uniform(0.12, 0.25)
        flicker.append(max(0.55, min(1.0, base + noise)))
    return flicker


def apply_flicker_to_line(line, flicker_map, base_color):
    """Apply per-column brightness flicker to a plain text line."""
    result = []
    for i, ch in enumerate(line):
        if i < len(flicker_map):
            b = flicker_map[i]
        else:
            b = 0.9
        c = (
            _clamp(base_color[0] * b),
            _clamp(base_color[1] * b),
            _clamp(base_color[2] * b),
        )
        result.append(f"{_fg(*c)}{ch}")
    result.append(RESET)
    return "".join(result)


def apply_vhs_tracking(lines, intensity=0.3, seed=42):
    """Apply VHS tracking artifacts as post-process."""
    rng = random.Random(seed)
    output = []
    band_center = rng.randint(0, max(0, len(lines) - 1))
    band_width = max(2, int(len(lines) * 0.15 * intensity))

    for i, line in enumerate(lines):
        band_dist = abs(i - band_center)
        in_band = band_dist <= band_width
        band_factor = max(0.0, 1.0 - band_dist / max(band_width, 1))

        corrupted = line
        if in_band and rng.random() < intensity * 1.5:
            plain = _strip_ansi(line)
            shift = int(rng.gauss(0, 3 * intensity * band_factor))
            shift = max(-8, min(8, shift))
            if shift > 0:
                corrupted = (" " * shift) + plain[: len(plain) - shift]
            elif shift < 0:
                s = abs(shift)
                corrupted = plain[s:] + (" " * s)
            else:
                corrupted = plain
            # Chromatic aberration tinting
            if rng.random() > 0.5:
                corrupted = f"\x1b[35m{corrupted[:4]}\x1b[0m" + corrupted[4:]

        # Noise injection
        if in_band and rng.random() < intensity * 0.4:
            chars = list(_strip_ansi(corrupted))
            noise_count = max(1, int(len(chars) * intensity * band_factor * 0.3))
            noise_set = "▓▒░▚▞▙▛█▜▟"
            for _ in range(noise_count):
                pos = rng.randint(0, max(0, len(chars) - 1))
                chars[pos] = rng.choice(noise_set)
            corrupted = "".join(chars)

        output.append(corrupted)
    return output


# ═══════════════════════════════════════════════════════════════════════════════
# CONCEPT: THE INFINITE STACK
# ═══════════════════════════════════════════════════════════════════════════════


def render_stack(width=90, seed=42):
    """The Infinite Stack: text repeats and decays into void.
    Proper 2-row pixel font with probabilistic corruption per layer."""
    rng = random.Random(seed)
    text = "THE BACKLOGS"
    row0, row1 = render_text(text)
    text_w = len(row0)

    palette = [
        (255, 230, 80),  # Layer 0: bright fluorescent
        (220, 185, 55),  # Layer 1: aged
        (180, 140, 35),  # Layer 2: fading
        (130, 90, 15),  # Layer 3: brown
        (80, 50, 5),  # Layer 4: dark
        (40, 22, 0),  # Layer 5: void
    ]

    lines = []
    # Hum line
    hum_w = text_w + 4
    pad = max(0, (width - hum_w) // 2)
    hum = " " * pad
    hum_chars = []
    for j in range(hum_w):
        if rng.random() < 0.7:
            hum_chars.append(_colorize("━", PALETTE["fluorescent_white"]))
        else:
            hum_chars.append(_colorize("─", (200, 190, 140)))
    lines.append(hum + "".join(hum_chars))
    lines.append("")

    for layer in range(6):
        color = palette[layer]
        indent = layer * 2
        base_pad = max(0, (width - text_w) // 2) + indent

        r0_corrupted = list(row0)
        r1_corrupted = list(row1)

        # Corruption probability increases with layer
        corrupt_prob = [0.0, 0.03, 0.15, 0.40, 0.70, 0.95][layer]
        for arr in [r0_corrupted, r1_corrupted]:
            for k in range(len(arr)):
                if rng.random() < corrupt_prob:
                    if corrupt_prob > 0.6:
                        arr[k] = rng.choice(" ░·")
                    else:
                        arr[k] = rng.choice("░▒·")

        r0_str = "".join(r0_corrupted)
        r1_str = "".join(r1_corrupted)

        flicker = frozen_flicker(text_w, seed=seed + layer)
        lines.append(" " * base_pad + apply_flicker_to_line(r0_str, flicker, color))
        lines.append(" " * base_pad + apply_flicker_to_line(r1_str, flicker, color))

        # Divider between layers (fading)
        if layer < 5:
            div_color = _lerp_color(palette[layer], palette[min(layer + 1, 5)], 0.5)
            div_line = " " * base_pad + _colorize("─" * text_w, div_color)
            lines.append(div_line)

    # Drip trails converging to center
    trail_color = (25, 15, 0)
    center = width // 2
    for d in range(3):
        trail_chars = [" "] * width
        spread = max(1, 6 - d * 2)
        for _ in range(spread):
            pos = center + rng.randint(-spread, spread)
            if 0 <= pos < width:
                trail_chars[pos] = rng.choice("░·")
        lines.append(_colorize("".join(trail_chars), trail_color))

    return lines


# ═══════════════════════════════════════════════════════════════════════════════
# CONCEPT: THE INFINITE STACK v2 (all-out)
# ═══════════════════════════════════════════════════════════════════════════════


def render_stack2(width=90, seed=42, dbg_frame=False):
    """The Infinite Stack v2: enhanced decay, richer hum, organic drips.

    Text repeats downward, each layer decaying more aggressively with:
    - Phase dissolution (█▓▒░ density gradient per-char)
    - Dimensional row displacement (bottom row shifts per layer)
    - Per-letter corruption (entire glyphs can fail, not just single chars)
    - Richer fluorescent hum line with dead segments and flicker
    - Organic drip trails that follow column gravity
    """
    rng = random.Random(seed)
    text = "THE BACKLOGS"
    row0, row1 = render_text(text)
    text_w = len(row0)

    # --- Palette: 7 layers for smoother gradient ---
    palette = [
        (255, 235, 90),  # Layer 0: hot fluorescent
        (240, 210, 65),  # Layer 1: warm
        (210, 175, 45),  # Layer 2: aged
        (170, 130, 30),  # Layer 3: fading
        (120, 80, 12),  # Layer 4: brown
        (70, 42, 3),  # Layer 5: near-void
        (35, 18, 0),  # Layer 6: void
    ]

    n_layers = len(palette)

    # The logo has a natural width: text + max indent from deepest layer.
    # `width` only controls centering padding — never clamps content.
    max_indent = (n_layers - 1) * 2
    natural_w = text_w + max_indent
    base_left = max(0, (width - natural_w) // 2)
    lines = []

    # ── Hum line: fluorescent tube with dead segments and flicker ──
    hum_w = natural_w + 4
    hum_pad = max(0, (width - hum_w) // 2)
    hum_rng = random.Random(seed + 99)
    hum_chars = []

    # Create tube segments (some lit, some dead, some flickering)
    seg_len = hum_rng.randint(4, 8)
    seg_state = "lit"  # lit, dim, dead, flicker
    seg_count = 0
    for j in range(hum_w):
        seg_count += 1
        if seg_count >= seg_len:
            seg_count = 0
            seg_len = hum_rng.randint(3, 10)
            r = hum_rng.random()
            if r < 0.55:
                seg_state = "lit"
            elif r < 0.75:
                seg_state = "dim"
            elif r < 0.88:
                seg_state = "flicker"
            else:
                seg_state = "dead"

        if seg_state == "lit":
            ch = "━" if hum_rng.random() < 0.85 else "═"
            c = _lerp_color((220, 215, 180), (255, 252, 230), hum_rng.random())
            hum_chars.append(_colorize(ch, c))
        elif seg_state == "dim":
            ch = "─" if hum_rng.random() < 0.7 else "╌"
            c = _lerp_color((140, 130, 90), (180, 170, 120), hum_rng.random())
            hum_chars.append(_colorize(ch, c))
        elif seg_state == "flicker":
            # Alternating bright/dim within the segment
            if hum_rng.random() < 0.5:
                hum_chars.append(_colorize("━", (255, 250, 200)))
            else:
                hum_chars.append(_colorize("╌", (100, 90, 55)))
        else:  # dead
            ch = hum_rng.choice("╌ ╌·")
            hum_chars.append(_colorize(ch, (50, 40, 20)))

    lines.append(" " * hum_pad + "".join(hum_chars))
    lines.append("")

    # ── Text layers with progressive decay ──
    dissolution = "█▓▒░·"

    # Track drip columns: some columns "leak" from layer to layer
    drip_cols = set()
    for _ in range(rng.randint(3, 6)):
        drip_cols.add(rng.randint(0, text_w - 1))

    for layer in range(n_layers):
        color = palette[layer]
        # Indent: smaller steps, capped to prevent overflow
        indent = layer * 2
        base_pad = base_left + indent

        # Corruption parameters scale with layer
        # First 2 layers are clean; effects ramp from layer 2 onward
        t = max(0.0, (layer - 1.5) / max(1, n_layers - 2))  # ~0 for layers 0-1
        t = min(1.0, t)

        # Phase dissolution: chars dissolve based on layer depth (only at deeper layers)
        def dissolve_char(ch, col_idx, total_cols, layer_t):
            """Replace char with dissolution gradient based on position and layer."""
            if layer_t < 0.05:
                return ch  # Clean layer
            col_frac = col_idx / max(1, total_cols - 1)
            # Dissolution driven primarily by layer depth, with mild center bias
            # (edges stay slightly more intact to preserve visual width)
            edge_dist = min(col_idx, total_cols - 1 - col_idx)
            edge_protection = max(0.0, 1.0 - edge_dist / 6.0) * 0.3
            threshold = layer_t * 0.8 + col_frac * layer_t * 0.2 - edge_protection
            noise = rng.gauss(0, 0.1)
            if (threshold + noise) < 0.25:
                return ch
            if ch == " ":
                return " "
            # Map to dissolution gradient
            d_idx = _clamp(
                int((threshold + noise) * (len(dissolution) - 1)),
                0,
                len(dissolution) - 1,
            )
            return dissolution[d_idx]

        # Build corrupted rows
        r0_chars = list(row0)
        r1_chars = list(row1)

        # Per-letter failure: whole glyphs can die at deeper layers (only layer 3+)
        letters = list(text)
        letter_alive = []
        for i, ch in enumerate(letters):
            if ch == " ":
                letter_alive.append(True)
            elif layer >= 3 and rng.random() < t * 0.4:
                letter_alive.append(False)  # Letter died
            else:
                letter_alive.append(True)

        # Map letter alive status to character columns
        col_alive = []
        for i, ch in enumerate(letters):
            glyph = FONT.get(ch.upper(), ["?????", "?????"])
            glyph_w = len(glyph[0])
            for _ in range(glyph_w):
                col_alive.append(letter_alive[i])
            if i < len(letters) - 1:
                col_alive.append(True)  # gap

        # Apply dissolution and corruption
        for arr in [r0_chars, r1_chars]:
            for k in range(len(arr)):
                col_frac = k / max(1, len(arr) - 1)

                # Dead letter -> void chars
                if k < len(col_alive) and not col_alive[k]:
                    arr[k] = rng.choice(" ·░ ")
                    continue

                # Drip column corruption (layer 3+)
                if k in drip_cols and layer >= 3:
                    if rng.random() < t * 0.6:
                        arr[k] = rng.choice("░▒│┃╎")
                        continue

                # Phase dissolution
                arr[k] = dissolve_char(arr[k], k, len(arr), t)

                # Extra random noise at deep layers (layer 3+)
                if layer >= 3 and rng.random() < t * 0.2:
                    arr[k] = rng.choice("·░ ")

        r0_str = "".join(r0_chars)
        r1_str = "".join(r1_chars)

        # Ghost frame marker for debugging layout
        frame_mark = _colorize("│", (60, 50, 25)) if dbg_frame else ""

        # Apply flicker coloring
        flicker = frozen_flicker(text_w, seed=seed + layer * 7)
        lines.append(
            " " * base_pad + apply_flicker_to_line(r0_str, flicker, color) + frame_mark
        )

        # Row 1: dimensional displacement at deeper layers
        displacement = 0
        if layer >= 4:
            displacement = rng.choice([0, 0, 1, 1, -1])
        r1_pad = max(0, base_pad + displacement)
        lines.append(
            " " * r1_pad + apply_flicker_to_line(r1_str, flicker, color) + frame_mark
        )

        # Divider between layers
        if layer < n_layers - 1:
            div_color = _lerp_color(
                palette[layer], palette[min(layer + 1, n_layers - 1)], 0.5
            )
            div_w = text_w

            # Divider degrades too: gaps appear at deeper layers
            div_chars = []
            for j in range(div_w):
                if rng.random() < t * 0.5:
                    div_chars.append(" ")
                elif rng.random() < t * 0.3:
                    div_chars.append(_colorize(rng.choice("╌·"), div_color))
                else:
                    div_chars.append(_colorize("─", div_color))
            lines.append(" " * base_pad + "".join(div_chars) + frame_mark)

    # ── Organic drip trails ──
    # Drips fall from the bottom of the text, pooling toward center
    trail_w = natural_w + 4
    trail_pad = max(0, (width - trail_w) // 2)
    center = trail_w // 2

    # Seed drip sources from the last layer's active columns
    drip_sources = []
    for _ in range(rng.randint(5, 9)):
        drip_sources.append(rng.randint(center - text_w // 3, center + text_w // 3))
    # Add the tracked drip columns offset to trail space
    text_offset_in_trail = (trail_w - text_w) // 2
    for dc in drip_cols:
        drip_sources.append(dc + text_offset_in_trail)

    drip_positions = list(drip_sources)  # Current x positions
    void_color = (25, 14, 0)

    for d in range(5):
        trail_chars = [" "] * trail_w
        depth_t = d / 4.0

        for i in range(len(drip_positions)):
            # Drips drift toward center and slow down
            drift = (
                1
                if drip_positions[i] < center
                else (-1 if drip_positions[i] > center else 0)
            )
            if rng.random() < 0.4:
                drip_positions[i] += drift
            # Random jitter
            drip_positions[i] += rng.choice([-1, 0, 0, 0, 1])
            drip_positions[i] = max(0, min(trail_w - 1, drip_positions[i]))

            pos = drip_positions[i]
            if trail_chars[pos] == " ":
                # Chars get fainter with depth
                if depth_t < 0.3:
                    trail_chars[pos] = rng.choice("░▒░·")
                elif depth_t < 0.6:
                    trail_chars[pos] = rng.choice("░··")
                else:
                    trail_chars[pos] = rng.choice("·· ")

        c = _lerp_color(void_color, (8, 4, 0), depth_t)
        trail_line = " " * trail_pad + _colorize("".join(trail_chars), c)
        if dbg_frame:
            # Pad to align marker with the last layer's right edge
            visible_len = len(_strip_ansi(trail_line))
            last_layer_end = base_left + max_indent + text_w
            if visible_len < last_layer_end:
                trail_line += " " * (last_layer_end - visible_len)
            trail_line += _colorize("│", (60, 50, 25))
        lines.append(trail_line)

    return lines


# ═══════════════════════════════════════════════════════════════════════════════
# CONCEPT: LEVEL 0 ROOM
# ═══════════════════════════════════════════════════════════════════════════════


def render_room(width=80, seed=42):
    """Level 0: the logo IS a Backrooms room.
    Ceiling tiles, yellow wallpaper, carpet, asymmetric doorway."""
    rng = random.Random(seed)
    text = "THE BACKLOGS"
    row0, row1 = render_text(text)
    text_w = len(row0)

    inner_w = max(text_w + 8, 56)
    total_w = inner_w + 2  # +2 for borders
    pad = max(0, (width - total_w) // 2)
    sp = " " * pad

    wall_fg = PALETTE["wallpaper"]
    wall_bg = (45, 38, 12)
    frame_fg = (107, 91, 58)
    ceiling_fg = (74, 74, 74)
    light_fg = PALETTE["fluorescent_white"]
    carpet_fg = PALETTE["carpet_tan"]
    carpet_bg = (90, 78, 48)
    door_fg = (10, 10, 8)
    text_fg = PALETTE["hot_yellow"]

    lines = []

    # === Ceiling grid (2 rows of tiles with light panels) ===
    def ceiling_row(with_lights=True):
        segs = []
        tile_w = 7
        n_tiles = inner_w // tile_w
        for t in range(n_tiles):
            if with_lights:
                segs.append(_colorize("═" * (tile_w - 1), light_fg))
            else:
                segs.append(_colorize(" " * (tile_w - 1), (42, 40, 32)))
            if t < n_tiles - 1:
                segs.append(_colorize("│", ceiling_fg))
        row_inner = "".join(segs)
        # Trim/pad to inner_w
        row_plain = _strip_ansi(row_inner)
        if len(row_plain) < inner_w:
            row_inner += _colorize(" " * (inner_w - len(row_plain)), (42, 40, 32))
        return row_inner

    # Top frame
    lines.append(sp + _colorize("┌" + "─" * inner_w + "┐", ceiling_fg))
    lines.append(
        sp + _colorize("│", ceiling_fg) + ceiling_row(True) + _colorize("│", ceiling_fg)
    )
    lines.append(sp + _colorize("├" + "─" * inner_w + "┤", ceiling_fg))
    lines.append(
        sp
        + _colorize("│", ceiling_fg)
        + ceiling_row(False)
        + _colorize("│", ceiling_fg)
    )
    lines.append(sp + _colorize("├" + "─" * inner_w + "┤", ceiling_fg))
    lines.append(
        sp + _colorize("│", ceiling_fg) + ceiling_row(True) + _colorize("│", ceiling_fg)
    )

    # === Transition to wall ===
    wall_top = "═" * inner_w
    lines.append(
        sp
        + _colorize("╞", frame_fg)
        + _colorize(wall_top, frame_fg)
        + _colorize("╡", frame_fg)
    )

    # === Wallpaper rows ===
    def wallpaper_row():
        """Generate a wallpaper texture row."""
        chars = []
        for i in range(inner_w):
            if i % 4 == 0:
                chars.append("▓")
            elif i % 4 == 2:
                chars.append("▓")
            else:
                chars.append("▓")
        return "".join(chars)

    # Wallpaper + text area
    wp = wallpaper_row()
    wall_border = "▓▓▓"

    # Wall row with left=wallpaper, middle=empty, right=wallpaper
    text_area_w = inner_w - 6  # 3 wallpaper chars each side
    text_pad_left = (text_area_w - text_w) // 3  # Off-center (left-biased)

    # Empty wall rows above text
    def wall_row(content="", content_w=0, has_door=False):
        left = _colorize_bg(wall_border, wall_fg, wall_bg)
        space_w = text_area_w - content_w
        if content:
            inner = (
                " " * text_pad_left + content + " " * max(0, space_w - text_pad_left)
            )
        else:
            inner = " " * text_area_w
        right_wall = wall_border
        if has_door:
            right = _colorize_bg("╢", frame_fg, wall_bg) + _colorize("░░░", door_fg)
        else:
            right = _colorize_bg(right_wall, wall_fg, wall_bg)
        return (
            sp
            + _colorize("║", frame_fg)
            + left
            + inner
            + right
            + _colorize("║" if not has_door else "", frame_fg)
        )

    lines.append(wall_row(_colorize_bg(wp, wall_fg, wall_bg), inner_w - 6))
    lines.append(wall_row())

    # "THE" row
    r0_colored = apply_flicker_to_line(row0, frozen_flicker(text_w, seed), text_fg)
    r1_colored = apply_flicker_to_line(row1, frozen_flicker(text_w, seed + 1), text_fg)

    lines.append(wall_row(r0_colored, text_w))
    lines.append(wall_row(r1_colored, text_w, has_door=True))
    lines.append(wall_row(has_door=True))

    # More wallpaper
    lines.append(
        wall_row(_colorize_bg(wp, wall_fg, wall_bg), inner_w - 6, has_door=True)
    )

    # === Baseboard ===
    lines.append(
        sp
        + _colorize("╞", frame_fg)
        + _colorize("═" * inner_w, frame_fg)
        + _colorize("╡", frame_fg)
    )

    # === Carpet (2 rows) ===
    def carpet_row(y):
        chars = []
        for x in range(inner_w):
            val = math.sin(x * 0.5 + y * 0.7) + math.cos(x * 0.3 - y * 0.4)
            if val > 0.8:
                chars.append(_colorize_bg("▒", carpet_fg, carpet_bg))
            elif val > 0.2:
                chars.append(_colorize_bg("░", carpet_fg, carpet_bg))
            else:
                chars.append(_colorize_bg(".", carpet_fg, carpet_bg))
        return "".join(chars)

    lines.append(
        sp + _colorize("║", frame_fg) + carpet_row(0) + _colorize("║", frame_fg)
    )
    lines.append(
        sp + _colorize("║", frame_fg) + carpet_row(1) + _colorize("║", frame_fg)
    )

    # === Bottom frame (with unclosed gap!) ===
    bottom = "═" * (inner_w - 8) + "┄ ┄ ┄" + "═" * 1
    lines.append(
        sp
        + _colorize("╚", frame_fg)
        + _colorize(bottom, frame_fg)
        + _colorize("╝", frame_fg)
    )

    return lines


# ═══════════════════════════════════════════════════════════════════════════════
# CONCEPT: THE GLITCH
# ═══════════════════════════════════════════════════════════════════════════════


def render_glitch(width=80, seed=42):
    """The Glitch: text starts clean on the left, dissolves rightward.
    Uses the █▓▒░ density gradient for frame dissolution and
    chromatic aberration for text corruption."""
    rng = random.Random(seed)
    text = "THE BACKLOGS"
    row0, row1 = render_text(text)
    text_w = len(row0)

    # Frame dimensions
    frame_w = text_w + 8
    pad = max(0, (width - frame_w - 10) // 2)  # Extra space for dissolution
    sp = " " * pad

    frame_fg = PALETTE["wallpaper"]
    text_fg = PALETTE["hot_yellow"]
    void_fg = PALETTE["void"]
    dissolution_chars = "█▓▒░ "

    lines = []

    def health_at(x, total_w):
        """Reality health: 1.0 at left, 0.0 at far right."""
        return max(0.0, 1.0 - (x / total_w) ** 1.5)

    def dissolve_frame_char(base_char, x, total_w):
        """Replace frame char based on position's reality health."""
        h = health_at(x, total_w)
        if h > 0.8:
            return base_char
        idx = _clamp(
            int((1.0 - h) * (len(dissolution_chars) - 1)), 0, len(dissolution_chars) - 1
        )
        return dissolution_chars[idx]

    def colorize_with_health(char, x, total_w, base_color):
        """Color a character, fading as reality health decreases."""
        h = health_at(x, total_w)
        c = _lerp_color(void_fg, base_color, h)
        # Chromatic aberration in the glitch zone
        if h < 0.5 and rng.random() < (1.0 - h) * 0.3:
            # Red/blue displacement artifacts
            if rng.random() < 0.5:
                c = (_clamp(c[0] + 80), _clamp(c[1] - 30), _clamp(c[2] - 30))
            else:
                c = (_clamp(c[0] - 30), _clamp(c[1] - 30), _clamp(c[2] + 80))
        return _colorize(char, c)

    # Top frame
    top_chars = []
    for x in range(frame_w + 8):
        if x == 0:
            ch = dissolve_frame_char("▄", x, frame_w + 8)
        else:
            ch = dissolve_frame_char("▄", x, frame_w + 8)
        top_chars.append(colorize_with_health(ch, x, frame_w + 8, frame_fg))
    lines.append(sp + "".join(top_chars))

    # Separator
    sep_chars = []
    for x in range(frame_w + 8):
        if x == 0:
            ch = dissolve_frame_char("█", x, frame_w + 8)
        else:
            ch = dissolve_frame_char("═", x, frame_w + 8)
        sep_chars.append(colorize_with_health(ch, x, frame_w + 8, frame_fg))
    lines.append(sp + "".join(sep_chars))

    # Empty row
    empty_chars = []
    for x in range(frame_w + 8):
        if x == 0:
            ch = dissolve_frame_char("█", x, frame_w + 8)
        else:
            ch = " "
        empty_chars.append(colorize_with_health(ch, x, frame_w + 8, frame_fg))
    lines.append(sp + "".join(empty_chars))

    # Text rows (row0, row1)
    for text_row in [row0, row1]:
        row_chars = []
        text_offset = 3  # Left padding inside frame
        for x in range(frame_w + 8):
            if x == 0:
                ch = dissolve_frame_char("█", x, frame_w + 8)
                row_chars.append(colorize_with_health(ch, x, frame_w + 8, frame_fg))
            elif text_offset <= x < text_offset + text_w:
                ti = x - text_offset
                ch = text_row[ti] if ti < len(text_row) else " "
                h = health_at(x, frame_w + 8)
                # Corrupt text in glitch zone
                if h < 0.4 and rng.random() < (1.0 - h) * 0.6:
                    ch = rng.choice("░▒▓·")
                row_chars.append(colorize_with_health(ch, x, frame_w + 8, text_fg))
            else:
                ch = " "
                h = health_at(x, frame_w + 8)
                if h < 0.3 and rng.random() < 0.15:
                    ch = rng.choice("░·")
                row_chars.append(colorize_with_health(ch, x, frame_w + 8, frame_fg))
        lines.append(sp + "".join(row_chars))

    # Empty row
    lines.append(sp + "".join(empty_chars))

    # Bottom separator + frame
    lines.append(sp + "".join(sep_chars))

    # Ghost echo (displaced duplicate, very dim)
    ghost_color = (35, 25, 5)
    ghost_offset = 2
    ghost_text = " " * ghost_offset + row0
    ghost_line = sp + "  " + _colorize(ghost_text[:frame_w], ghost_color)
    lines.append(ghost_line)

    return lines


# ═══════════════════════════════════════════════════════════════════════════════
# CONCEPT: THE FLICKERING SIGN
# ═══════════════════════════════════════════════════════════════════════════════


def render_sign(width=80, seed=42):
    """The Flickering Sign: a backlit institutional panel.
    Uses pixel font with per-letter brightness variation and glow halo."""
    rng = random.Random(seed)
    text = "THE BACKLOGS"
    row0, row1 = render_text(text)
    text_w = len(row0)

    # Sign dimensions
    sign_inner_w = text_w + 6
    sign_pad = max(0, (width - sign_inner_w - 2) // 2)
    sp = " " * sign_pad

    frame_fg = (74, 74, 74)
    panel_bg = (26, 26, 24)
    glow_fill_fg = (58, 56, 32)

    # Per-letter brightness (some flickering/dead)
    letters = list(text)
    brightness = []
    for i, ch in enumerate(letters):
        if ch == " ":
            brightness.append(0.0)
        elif rng.random() < 0.15:
            brightness.append(rng.uniform(0.05, 0.25))  # Nearly dead
        elif rng.random() < 0.25:
            brightness.append(rng.uniform(0.4, 0.7))  # Dim
        else:
            brightness.append(rng.uniform(0.85, 1.0))  # Lit

    # Map letter brightness to pixel font columns
    col_brightness = []
    col_idx = 0
    for i, ch in enumerate(letters):
        glyph = FONT.get(ch.upper(), ["?????", "?????"])
        glyph_w = len(glyph[0])
        for _ in range(glyph_w):
            col_brightness.append(brightness[i])
        if i < len(letters) - 1:
            col_brightness.append(brightness[i])  # gap column

    # Color tiers
    color_bright = (255, 255, 221)
    color_medium = (200, 192, 112)
    color_dim = (112, 104, 48)
    color_dead = (42, 40, 32)

    def letter_color(b):
        if b > 0.8:
            return color_bright
        if b > 0.5:
            return _lerp_color(color_dim, color_medium, (b - 0.5) / 0.3)
        if b > 0.1:
            return _lerp_color(color_dead, color_dim, (b - 0.1) / 0.4)
        return color_dead

    lines = []

    # Glow halo above
    glow_chars = []
    for x in range(sign_inner_w + 2):
        xi = x - 3
        if 0 <= xi < len(col_brightness):
            b = col_brightness[xi]
            if b > 0.5:
                glow_chars.append(
                    _colorize("~", _lerp_color((20, 18, 8), (80, 76, 40), b))
                )
            else:
                glow_chars.append(" ")
        else:
            glow_chars.append(" ")
    lines.append(sp + "".join(glow_chars))

    # Top frame
    lines.append(sp + _colorize("╭" + "─" * sign_inner_w + "╮", frame_fg))

    # Glow fill row
    glow_row = _colorize_bg("░" * sign_inner_w, glow_fill_fg, panel_bg)
    lines.append(sp + _colorize("│", frame_fg) + glow_row + _colorize("│", frame_fg))

    # Text row 0
    text_pad_left = 3
    text_r0_chars = []
    for x in range(sign_inner_w):
        xi = x - text_pad_left
        if 0 <= xi < text_w:
            ch = row0[xi]
            if xi < len(col_brightness):
                c = letter_color(col_brightness[xi])
            else:
                c = color_dead
            text_r0_chars.append(_colorize_bg(ch, c, panel_bg))
        else:
            text_r0_chars.append(_colorize_bg(" ", panel_bg, panel_bg))
    lines.append(
        sp
        + _colorize("│", frame_fg)
        + "".join(text_r0_chars)
        + _colorize("│", frame_fg)
    )

    # Text row 1
    text_r1_chars = []
    for x in range(sign_inner_w):
        xi = x - text_pad_left
        if 0 <= xi < text_w:
            ch = row1[xi]
            if xi < len(col_brightness):
                c = letter_color(col_brightness[xi])
            else:
                c = color_dead
            text_r1_chars.append(_colorize_bg(ch, c, panel_bg))
        else:
            text_r1_chars.append(_colorize_bg(" ", panel_bg, panel_bg))
    lines.append(
        sp
        + _colorize("│", frame_fg)
        + "".join(text_r1_chars)
        + _colorize("│", frame_fg)
    )

    # Glow fill row
    lines.append(sp + _colorize("│", frame_fg) + glow_row + _colorize("│", frame_fg))

    # Bottom frame
    lines.append(sp + _colorize("╰" + "─" * sign_inner_w + "╯", frame_fg))

    # Glow halo below
    lines.append(sp + "".join(glow_chars))

    return lines


# ═══════════════════════════════════════════════════════════════════════════════
# CONCEPT: MAXIMUM LIMINAL
# ═══════════════════════════════════════════════════════════════════════════════


def render_liminal(width=80, seed=42):
    """Maximum Liminal: large block font with hum line, ambient background,
    frozen flicker, row displacement, unclosed frame, and phase gradient.
    This is the 'kitchen sink' composition from the aesthetic physics brief."""
    rng = random.Random(seed)
    text = "THE BACKLOGS"
    row0, row1 = render_text(text)
    text_w = len(row0)

    frame_inner_w = text_w + 6
    total_w = frame_inner_w + 2
    pad = max(0, (width - total_w) // 2)
    sp = " " * pad

    text_fg = PALETTE["core_yellow"]
    frame_fg = PALETTE["wallpaper"]
    ambient = PALETTE["near_ambient"]

    flicker = frozen_flicker(text_w, seed)
    lines = []

    # --- Ambient dark row ---
    lines.append("")

    # --- Hum line (fluorescent tube representation) ---
    hum_parts = []
    for j in range(total_w):
        if rng.random() < 0.6:
            hum_parts.append(_colorize("━", PALETTE["fluorescent_white"]))
        elif rng.random() < 0.5:
            hum_parts.append(_colorize("─", (200, 190, 140)))
        else:
            hum_parts.append(_colorize("╌", (140, 130, 90)))
    lines.append(sp + "".join(hum_parts))

    # --- Ambient row ---
    lines.append("")

    # --- Top frame ---
    lines.append(sp + _colorize("╔" + "═" * frame_inner_w + "╗", frame_fg))

    # --- Empty row ---
    lines.append(
        sp + _colorize("║", frame_fg) + " " * frame_inner_w + _colorize("║", frame_fg)
    )

    # --- Text row 0 ---
    text_pad_l = 3
    text_pad_r = frame_inner_w - text_w - text_pad_l

    # Apply phase gradient: rightmost 20% of text fades
    def phase_char(ch, col, total):
        """Replace char with lighter density if in phase-out zone."""
        phase_start = int(total * 0.75)
        if col < phase_start:
            return ch
        t = (col - phase_start) / max(1, total - phase_start)
        choices = "█▓▒░·"
        idx = min(len(choices) - 1, int(t * len(choices)))
        if ch in "█▓▒░▀▄▌▐▘▝▖▗▚▞▙▛▜▟":
            return choices[idx]
        return ch

    r0_phased = "".join(phase_char(ch, i, text_w) for i, ch in enumerate(row0))
    r1_phased = "".join(phase_char(ch, i, text_w) for i, ch in enumerate(row1))

    r0_colored = apply_flicker_to_line(r0_phased, flicker, text_fg)
    r1_colored = apply_flicker_to_line(r1_phased, flicker, text_fg)

    lines.append(
        sp
        + _colorize("║", frame_fg)
        + " " * text_pad_l
        + r0_colored
        + " " * text_pad_r
        + _colorize("║", frame_fg)
    )

    # --- Text row 1 (displaced by 1 char for dimensional slippage!) ---
    displaced_color = (
        _clamp(text_fg[0]),
        _clamp(text_fg[1] - 10),
        _clamp(text_fg[2] + 20),
    )
    r1_displaced = apply_flicker_to_line(r1_phased, flicker, displaced_color)
    lines.append(
        sp
        + _colorize("║", frame_fg)
        + " " * (text_pad_l + 1)
        + r1_displaced
        + " " * max(0, text_pad_r - 1)  # +1 shift!
        + _colorize("║", frame_fg)
    )

    # --- Leak characters outside frame! ---
    leak_line = " " * (pad + total_w + 1) + _colorize("░", (102, 80, 0))
    lines.append(
        sp
        + _colorize("║", frame_fg)
        + " " * frame_inner_w
        + _colorize("║", frame_fg)
        + _colorize(" ░", (102, 80, 0))
    )

    # --- Bottom frame (UNCLOSED — gap becomes dashed) ---
    bottom_solid = "═" * (frame_inner_w - 10)
    bottom_gap = "┄ ┄ ┄ "
    bottom_rest = "═" * max(0, frame_inner_w - len(bottom_solid) - len(bottom_gap))
    lines.append(
        sp
        + _colorize("╚", frame_fg)
        + _colorize(bottom_solid, frame_fg)
        + _colorize(bottom_gap, (100, 90, 50))
        + _colorize(bottom_rest, frame_fg)
        + _colorize("╝", frame_fg)
    )

    # --- More leak below ---
    lines.append(" " * (pad + total_w - 2) + _colorize("▒░", (51, 40, 0)))

    # --- Corrupted subtitle ---
    sub = "  a task management system for limina1 spaces"
    sub_pad = max(0, (width - len(sub)) // 2)
    lines.append(" " * sub_pad + _colorize(sub, (80, 70, 35)))

    # --- Ambient fade ---
    lines.append("")

    return lines


# ═══════════════════════════════════════════════════════════════════════════════
# CONCEPT: THE CORRIDOR (improved)
# ═══════════════════════════════════════════════════════════════════════════════


def render_corridor(width=80, height=20, seed=42):
    """The Corridor: one-point perspective Backrooms hallway.
    Improved with better wall texture and text overlay."""
    rng = random.Random(seed)
    cx = width // 2
    cy = height // 2

    # Pre-compute the text to overlay
    text = "THE BACKLOGS"
    text_y = cy  # On the far wall at center

    rows = []
    for y in range(height):
        row_chars = []
        for x in range(width):
            dx = x - cx
            dy = y - cy
            if dy == 0:
                dy = 0.001

            depth = abs(cy / dy)
            is_floor = y > cy
            slope = abs(dx / dy)
            is_wall = slope > 1.5

            char = " "
            r, g, b = 0, 0, 0

            if is_wall:
                # Wallpaper with vertical stripe pattern
                d_int = int(depth * 3)
                if d_int % 3 == 0:
                    char = "║"
                    r, g, b = 196, 168, 70
                elif d_int % 3 == 1:
                    char = "│"
                    r, g, b = 180, 155, 60
                else:
                    char = " "
                    r, g, b = 160, 140, 50

            elif is_floor:
                val = math.sin(x * 0.5 + depth * 0.7) + math.cos(y * 0.3 - depth * 0.4)
                if val > 0.5:
                    char = "▒"
                elif val > -0.2:
                    char = "░"
                else:
                    char = "·"
                r, g, b = 130, 115, 72

            else:
                # Ceiling with light fixtures
                if int(depth) % 5 == 0 and abs(dx) < max(1, width / (depth + 1) / 2.5):
                    char = "━"
                    r, g, b = 255, 252, 230
                else:
                    if int(depth * 2) % 4 == 0:
                        char = "┼"
                        r, g, b = 55, 53, 40
                    else:
                        char = " "
                        r, g, b = 42, 40, 32

            # Distance fog
            dist = math.sqrt(dx * dx + dy * dy)
            fog = max(0.0, 1.0 - (dist / (width / 1.3)))
            r = _clamp(r * fog)
            g = _clamp(g * fog)
            b = _clamp(b * fog)

            row_chars.append(f"{_fg(r, g, b)}{char}")

        rows.append("".join(row_chars) + RESET)

    # Overlay text on the far wall (center)
    text_line = " ".join(text)
    tx_start = cx - len(text_line) // 2
    if 0 <= text_y < height:
        overlay_row = list(rows[text_y])
        # This is complex with ANSI; for prototype, just append a note
        # We'll insert it as a bright line
        bright_text = _colorize(text_line, (255, 255, 240))
        # Replace the center of that row
        pre = " " * tx_start
        post = " " * max(0, width - tx_start - len(text_line))
        rows[text_y] = (
            "".join(
                f"{_fg(255, 255, 240)}{ch}"
                if tx_start <= i < tx_start + len(text_line)
                else f"{_fg(42, 40, 32)} "
                for i, ch in enumerate(pre + text_line + post)
            )
            + RESET
        )

    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════


@click.command()
@click.option(
    "--concept",
    type=click.Choice(
        ["stack", "stack2", "room", "glitch", "sign", "liminal", "corridor"]
    ),
    default="stack2",
    help="Logo concept to render",
)
@click.option("--width", default=80, help="Terminal width")
@click.option("--vhs/--no-vhs", default=False, help="Apply VHS tracking effects")
@click.option("--color/--no-color", default=True, help="Enable/disable color output")
@click.option("--seed", default=3, type=int, help="Random seed for reproducibility")
@click.option(
    "--dbg-frame", is_flag=True, default=False, help="Show ghost frame markers"
)
def main(concept, width, vhs, color, seed, dbg_frame):
    """The Backlogs: ASCII Logo Generator

    Renders "The Backrooms" inspired ASCII art logos.
    """
    random.seed(seed)

    if concept == "stack":
        lines = render_stack(width, seed)
    elif concept == "stack2":
        lines = render_stack2(width, seed, dbg_frame=dbg_frame)
    elif concept == "room":
        lines = render_room(width, seed)
    elif concept == "glitch":
        lines = render_glitch(width, seed)
    elif concept == "sign":
        lines = render_sign(width, seed)
    elif concept == "liminal":
        lines = render_liminal(width, seed)
    elif concept == "corridor":
        lines = render_corridor(width, seed=seed)
    else:
        lines = ["Unknown concept"]

    if vhs:
        lines = apply_vhs_tracking(lines, seed=seed)

    for line in lines:
        if not color:
            line = _strip_ansi(line)
        print(line)


if __name__ == "__main__":
    main()
