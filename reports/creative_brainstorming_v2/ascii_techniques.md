# The Backlogs: Advanced ASCII Rendering Techniques (v2)

This document details specific, implementable Python techniques for rendering "The Backlogs" aesthetic—a mix of "The Backrooms" creepypasta (sickly yellow, infinite office) and CLI limitations.

## Core Utilities

First, a small helper for 24-bit ANSI colors to ensure we get that specific "sickly yellow" tone correct.

```python
def rgb(r, g, b, text):
    """Wraps text in 24-bit ANSI color codes."""
    return f"\033[38;2;{r};{g};{b}m{text}\033[0m"

def bg_rgb(r, g, b, text):
    """Wraps text in 24-bit ANSI background color codes."""
    return f"\033[48;2;{r};{g};{b}m{text}\033[0m"
```

---

## 1. "Wet Carpet" Texture

This technique simulates the damp, worn, mono-yellow carpet. It uses character density to represent "wear" and background color variations for "stains" or "moist patches".

```python
import random

def carpet_texture(width: int, height: int, stain_positions: list[tuple[int, int]] = []) -> list[str]:
    """
    Generates a carpet texture with wear and stains.
    
    Args:
        width: Width of the area.
        height: Height of the area.
        stain_positions: List of (x, y) tuples for stain centers.
    """
    # Base "sickly yellow" palette
    base_fg = (180, 180, 0)
    base_bg = (60, 60, 10)
    
    # "Wet/Stained" palette (darker, brownish)
    wet_fg = (140, 120, 0)
    wet_bg = (40, 30, 5)

    # Characters sorted by visual density for "wear"
    # Denser = pristine, Sparse = worn
    chars = ["▒", "▓", "░", ".", ",", ";", " "] 
    
    rows = []
    for y in range(height):
        row = ""
        for x in range(width):
            # 1. Calculate stain influence based on distance to stain centers
            is_stained = False
            for sx, sy in stain_positions:
                dist = ((x - sx)**2 + (y - sy)**2)**0.5
                if dist < 4 and random.random() > (dist / 5):
                    is_stained = True
                    break
            
            # 2. Choose character based on "wear" (random noise)
            # Stained areas look "wetter" (denser/darker)
            if is_stained:
                char = random.choice(["▓", "▒"])
                color_fg = wet_fg
                color_bg = wet_bg
            else:
                # Normal carpet has random wear patterns
                noise = random.random()
                if noise > 0.8: char = "░" # Worn spot
                elif noise > 0.6: char = "." # Threadbare
                else: char = "▒" # Normal pile
                
                color_fg = base_fg
                color_bg = base_bg

            # Apply colors
            # Optimization: combine FG and BG codes manually for efficiency
            pixel = f"\033[38;2;{color_fg[0]};{color_fg[1]};{color_fg[2]}m" \
                    f"\033[48;2;{color_bg[0]};{color_bg[1]};{color_bg[2]}m{char}\033[0m"
            row += pixel
        rows.append(row)
    return rows
```

**Example Output:**
A grid of brownish-yellow `▒` and `░` characters, with darker `▓` patches where "stains" are located.

---

## 2. VHS Tracking Artifact Effect

Simulates the magnetic tape distortion common in found footage.

```python
import random

def apply_vhs_tracking(lines: list[str], intensity: float = 0.3) -> list[str]:
    """
    Applies VHS tracking artifacts: horizontal shifting and color banding.
    
    Args:
        lines: The ASCII art lines to process.
        intensity: 0.0 to 1.0, chance of a tracking error occurring.
    """
    height = len(lines)
    output = []
    
    # Tracking usually affects a band of lines, not just one random one
    tracking_y = -1
    remaining_jitter_lines = 0

    for i, line in enumerate(lines):
        # Start a new tracking glitch?
        if remaining_jitter_lines == 0 and random.random() < (intensity * 0.1):
            remaining_jitter_lines = random.randint(3, 8)
            tracking_shift = random.randint(-5, 5) # Horizontal shift amount
        
        if remaining_jitter_lines > 0:
            shift = random.randint(-2, 2) + tracking_shift if 'tracking_shift' in locals() else random.randint(-2, 2)
            
            # 1. Horizontal Displacement
            if shift > 0:
                new_line = (" " * shift) + line[:-shift]
            elif shift < 0:
                new_line = line[-shift:] + (" " * -shift)
            else:
                new_line = line
                
            # 2. Color Banding / Chromatic Aberration (simulated)
            # We wrap the shifted part in a magenta or cyan tint
            # This is a simplified "glitch" color wrapper
            if random.random() > 0.5:
                # Add a cyan tint to the start
                new_line = f"\033[36m{new_line[:5]}\033[0m" + new_line[5:]
            
            # 3. Static Injection
            # Randomly replace chars with "noise"
            line_chars = list(new_line)
            for j in range(len(line_chars)):
                if random.random() < 0.05:
                    line_chars[j] = random.choice(["#", "%", "&", "@", "!", "?"])
            new_line = "".join(line_chars)
            
            output.append(new_line)
            remaining_jitter_lines -= 1
        else:
            output.append(line)
            
    return output
```

---

## 3. Fluorescent Light Bar Rendering

Creates the buzzing, humming lights.

```python
import random
import time

def render_light_bar(width: int, flickering: bool = False) -> str:
    """
    Renders a single horizontal fluorescent tube with glow.
    """
    # Colors
    white_hot = (255, 255, 240)
    yellow_glow = (220, 220, 100)
    dim_edge = (100, 100, 30)
    off_color = (30, 30, 30)

    # If flickering, occasionally return a "dead" state
    if flickering and random.random() < 0.1:
        return rgb(*off_color, "░" * width)
    
    # Construct the bar
    # Center is brightest (█), edges are dimmer (▓ -> ▒)
    
    # Determine center segment length
    center_len = max(2, width - 4)
    side_len = (width - center_len) // 2
    
    left = rgb(*dim_edge, "▒") + rgb(*yellow_glow, "▓" * (side_len - 1))
    center = rgb(*white_hot, "█" * center_len)
    right = rgb(*yellow_glow, "▓" * (side_len - 1)) + rgb(*dim_edge, "▒")
    
    bar = left + center + right
    
    # If just flickering slightly (dimming), overlay a shadow
    if flickering and random.random() < 0.3:
        # Return a dimmer version
        return rgb(*dim_edge, "▓" * width)
        
    return bar
```

---

## 4. Zalgo Corruption Scale

Adds "creepiness" to text by appending Unicode combining diacritics.

```python
import random

def zalgo_corrupt(text: str, level: int) -> str:
    """
    Corrupts text with Zalgo characters (combining diacritics).
    
    Args:
        text: Input string.
        level: 0 (clean) to 4 (catastrophic).
    """
    if level == 0: return text
    
    # Zalgo chars range: 0x0300 - 0x036F
    zalgo_chars = [chr(i) for i in range(0x0300, 0x0370)]
    
    # Configuration for levels [up_marks, down_marks, mid_marks]
    intensity = {
        1: (1, 0, 0),     # Subtle: occasional mark
        2: (2, 1, 0),     # Moderate: some stacking
        3: (4, 3, 2),     # Heavy: noticeable height
        4: (10, 10, 5)    # Catastrophic: unreadable
    }
    
    counts = intensity.get(level, (0,0,0))
    total_marks = sum(counts)
    
    result = ""
    for char in text:
        result += char
        # Determine if we apply corruption to this character
        # Higher levels = higher probability
        prob = level * 0.25 
        
        if random.random() < prob:
            # Add random combining chars
            for _ in range(random.randint(1, total_marks)):
                result += random.choice(zalgo_chars)
                
    return result
```

---

## 5. Glow/Bloom Shader for ASCII Art

Adds a glow effect around bright characters in a 2D grid.

```python
def apply_glow(grid: list[list[str]], glow_color=(255, 200, 0), radius=2) -> list[str]:
    """
    Applies a glow effect to a 2D grid of characters.
    Returns list of strings with ANSI colors applied.
    """
    height = len(grid)
    width = len(grid[0]) if height > 0 else 0
    
    # Output grid to store formatted characters
    output_grid = [[" " for _ in range(width)] for _ in range(height)]
    
    # Light map to accumulate light intensity (0.0 to 1.0)
    light_map = [[0.0 for _ in range(width)] for _ in range(height)]
    
    # 1. Identify light sources and spread light
    bright_chars = ["█", "#", "@", "0", "O"] # Characters that emit light
    
    for y in range(height):
        for x in range(width):
            char = grid[y][x]
            if char in bright_chars:
                # It's a source!
                light_map[y][x] = 1.0
                
                # Spread light (simple box blur approach for demo)
                for dy in range(-radius, radius + 1):
                    for dx in range(-radius, radius + 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < height and 0 <= nx < width:
                            dist = (dx**2 + dy**2)**0.5
                            if dist == 0: continue
                            
                            # Falloff
                            intensity = max(0, 1.0 - (dist / (radius + 1)))
                            light_map[ny][nx] = max(light_map[ny][nx], intensity)

    # 2. Render final grid
    for y in range(height):
        row_str = ""
        for x in range(width):
            original_char = grid[y][x]
            intensity = light_map[y][x]
            
            if intensity > 0.1:
                # Calculate color based on intensity
                r = int(glow_color[0] * intensity)
                g = int(glow_color[1] * intensity)
                b = int(glow_color[2] * intensity)
                
                if original_char == " ":
                    # Empty space gets a "glow texture"
                    if intensity > 0.7: glow_char = "░"
                    elif intensity > 0.4: glow_char = "."
                    else: glow_char = " "
                    
                    row_str += f"\033[38;2;{r};{g};{b}m{glow_char}\033[0m"
                else:
                    # Existing char gets tinted
                    row_str += f"\033[38;2;{r};{g};{b}m{original_char}\033[0m"
            else:
                row_str += original_char
        output_grid[y] = row_str
        
    return output_grid
```

---

## 6. Perspective Corridor Renderer

Generates the infinite hallway geometry.

```python
import math

def render_corridor(width=60, height=20) -> list[str]:
    """
    Renders a simple one-point perspective corridor.
    """
    cx = width // 2
    cy = height // 2
    
    buffer = [[" " for _ in range(width)] for _ in range(height)]
    
    for y in range(height):
        for x in range(width):
            # Calculate distance/depth from center
            # Simple "fake 3D" math
            dx = x - cx
            dy = y - cy
            
            # Avoid division by zero
            if dy == 0: dy = 0.001
            
            # Floor vs Ceiling
            is_floor = y > cy
            
            # Depth calculation (approximate)
            # Further away = closer to center (dy is small)
            depth = abs(cy / dy) 
            
            # Wall calculation
            # If the slope (dx/dy) is steep enough, it's a wall
            slope = abs(dx / dy)
            is_wall = slope > 1.5 # Aspect ratio correction factor
            
            pixel = " "
            
            if is_wall:
                # Wall Texture
                # Perspective corrected checkerboard
                # wall_x represents distance along the wall
                wall_x = depth
                if int(wall_x * 2) % 2 == 0:
                    pixel = "║" # Wallpaper stripe
                else:
                    pixel = " "
                
                # Tint walls darker yellow
                pixel = f"\033[38;2;150;150;50m{pixel}\033[0m"
                
            elif is_floor:
                # Floor Texture (Carpet)
                if int(depth * 2) % 2 == 0:
                    pixel = "░"
                else:
                    pixel = "▒"
                
                # Darker/Muddy floor
                pixel = f"\033[38;2;100;90;20m{pixel}\033[0m"
                
            else:
                # Ceiling Texture (Lights)
                # Check for "Light Fixture" positions
                # Lights appear at regular depth intervals
                if int(depth) % 4 == 0 and abs(dx) < (width / (depth+1)):
                    pixel = "█"
                    pixel = f"\033[38;2;255;255;200m{pixel}\033[0m" # Bright light
                else:
                    pixel = "." # Ceiling tile
                    pixel = f"\033[38;2;80;80;30m{pixel}\033[0m" # Dim ceiling

            buffer[y][x] = pixel
            
    return ["".join(row) for row in buffer]
```
