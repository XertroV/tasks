#!/usr/bin/env python3
"""
The Backlogs: ASCII Logo Generator
----------------------------------
Renders "The Backrooms" inspired ASCII art logos.
"""

import random
import math
import sys
import shutil
import click

# --- Core Utilities ---


def rgb(r, g, b, text):
    """Wraps text in 24-bit ANSI color codes."""
    return f"\033[38;2;{r};{g};{b}m{text}\033[0m"


def bg_rgb(r, g, b, text):
    """Wraps text in 24-bit ANSI background color codes."""
    return f"\033[48;2;{r};{g};{b}m{text}\033[0m"


def strip_ansi(text):
    import re

    ansi_escape = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
    return ansi_escape.sub("", text)


# --- Textures & Effects ---


def get_carpet_char(x, y, noise_seed: float = 0.0):
    """Returns a carpet character based on noise."""
    val = (math.sin(x * 0.5 + noise_seed) + math.cos(y * 0.5 + noise_seed)) / 2
    if val > 0.6:
        return "▒"
    if val > 0.3:
        return "░"
    return "."


def apply_vhs_tracking(lines: list[str], intensity: float = 0.3) -> list[str]:
    """Applies VHS tracking artifacts."""
    output = []
    tracking_active = False
    lines_remaining = 0
    shift = 0

    for line in lines:
        # Randomly start a tracking band
        if not tracking_active and random.random() < (intensity * 0.05):
            tracking_active = True
            lines_remaining = random.randint(2, 6)
            shift = random.randint(-4, 4)

        if tracking_active:
            # Horizontal shift
            clean_line = strip_ansi(line)  # Simplified for prototype
            if shift > 0:
                new_line = (" " * shift) + clean_line[:-shift]
            elif shift < 0:
                new_line = clean_line[-shift:] + (" " * -shift)
            else:
                new_line = clean_line

            # Chromatic aberration (cyan/magenta tinting on edges)
            if random.random() > 0.6:
                # Magenta start
                new_line = f"\033[35m{new_line[:3]}\033[0m" + new_line[3:]

            output.append(new_line)
            lines_remaining -= 1
            if lines_remaining <= 0:
                tracking_active = False
        else:
            output.append(line)
    return output


# --- Renderers ---


def render_infinite_stack(width=80):
    """
    Concept 3: The Infinite Stack
    "Recursive Oblivion" - Tasks all the way down.
    """
    text = "THE BACKLOGS"

    # Palette: Bright Yellow -> Brown -> Void
    palette = [
        (255, 220, 0),  # Bright Warning
        (200, 170, 0),  # Mustard
        (150, 100, 0),  # Brown
        (100, 50, 0),  # Dark Brown
        (50, 20, 0),  # Void Edge
        (20, 5, 0),  # Deep Void
    ]

    # Character degradation
    chars_noise = [
        text,  # Level 0
        text,  # Level 1
        text.lower(),  # Level 2
        "t h e   b a c k . . .",  # Level 3
        ". . .   . . . . . . .",  # Level 4
        "                     ",  # Level 5
    ]

    lines = []

    # Calculate padding for centering
    pad = (width - len(text)) // 2
    if pad < 0:
        pad = 0
    left_pad = " " * pad

    for i in range(6):
        color = palette[min(i, len(palette) - 1)]
        content = chars_noise[min(i, len(chars_noise) - 1)]

        # Add slight horizontal drift/indent for "sinking" feel
        indent = " " * (i * 2)

        # Render line
        line_str = left_pad + indent + rgb(*color, content)
        lines.append(line_str)

    return lines


def render_corridor(width=80, height=20):
    """
    Concept 1: The Corridor
    Perspective view.
    """
    cx = width // 2
    cy = height // 2

    rows = []

    for y in range(height):
        row = ""
        for x in range(width):
            dx = x - cx
            dy = y - cy
            if dy == 0:
                dy = 0.001

            # Simple raycasting depth
            depth = abs(cy / dy)

            is_floor = y > cy

            # Wall check (slope)
            slope = abs(dx / dy)
            is_wall = slope > 1.8  # Wider corridor

            char = " "
            r, g, b = 0, 0, 0

            if is_wall:
                # Wallpaper: Vertical stripes
                # Scale stripe frequency by depth to fake perspective
                stripe_freq = depth * 0.5
                if int(depth * 2) % 2 == 0:
                    char = "║"
                    r, g, b = 200, 190, 100  # Darker yellow
                else:
                    char = " "
                    r, g, b = 240, 230, 140  # Pale yellow

            elif is_floor:
                # Carpet
                char = get_carpet_char(x, y, noise_seed=depth)
                r, g, b = 160, 140, 100  # Damp beige

            else:
                # Ceiling / Lights
                # Light fixtures at intervals
                if int(depth) % 4 == 0 and abs(dx) < (width / (depth + 1) / 2):
                    char = "█"
                    r, g, b = 255, 255, 220  # Fluorescent white
                else:
                    char = "."
                    r, g, b = 50, 50, 20  # Dark ceiling

            # Distance fog/darkness
            dist_from_center = (dx**2 + dy**2) ** 0.5
            fog = max(0.0, 1.0 - (dist_from_center / (width / 1.5)))

            r = int(r * fog)
            g = int(g * fog)
            b = int(b * fog)

            row += rgb(r, g, b, char)

        rows.append(row)

    return rows


def render_flickering_sign(width=80):
    """
    Concept 2: The Flickering Sign
    """
    # Box drawing
    box_width = 40
    box_pad = (width - box_width) // 2
    if box_pad < 0:
        box_pad = 0
    space = " " * box_pad

    # Colors
    frame_color = (100, 100, 100)
    lit_color = (0, 255, 255)  # Cyan
    dim_color = (0, 50, 50)

    # Text
    line1 = " T H E   B A C K L O G S "
    # Flickering logic: "BACK" is lit, "LOGS" is dim

    def colorize_flicker(text):
        res = ""
        for i, char in enumerate(text):
            # Flicker "LOGS" (last part of string)
            if i > 12 and random.random() < 0.4:
                res += rgb(*dim_color, char)
            else:
                res += rgb(*lit_color, char)
        return res

    top = space + rgb(*frame_color, "╔" + "═" * (len(line1)) + "╗")
    mid = (
        space
        + rgb(*frame_color, "║")
        + colorize_flicker(line1)
        + rgb(*frame_color, "║")
    )
    bot = space + rgb(*frame_color, "╚" + "═" * (len(line1)) + "╝")

    return [top, mid, bot]


# --- CLI ---


@click.command()
@click.option(
    "--concept",
    type=click.Choice(["stack", "corridor", "sign"]),
    default="stack",
    help="Logo concept to render",
)
@click.option("--width", default=80, help="Terminal width")
@click.option("--vhs/--no-vhs", default=False, help="Apply VHS tracking effects")
@click.option("--color/--no-color", default=True, help="Enable or disable color output")
def main(concept, width, vhs, color):
    """Renders the logo."""

    lines = []
    if concept == "stack":
        lines = render_infinite_stack(width)
    elif concept == "corridor":
        lines = render_corridor(width)
    elif concept == "sign":
        lines = render_flickering_sign(width)
    else:
        lines = ["Invalid concept"]

    if vhs:
        lines = apply_vhs_tracking(lines)

    for line in lines:
        if not color:
            line = strip_ansi(line)
        print(line)


if __name__ == "__main__":
    main()
