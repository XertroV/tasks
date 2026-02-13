# ASCII Art Block Letter Techniques: Comprehensive Reference

## 1. Unicode Character Reference

### 1.1 Block Elements (U+2580 - U+259F)

32 characters for filling regions with solid, partial, and shaded blocks.

#### Full and Half Blocks

| Char | Code Point | Name                | Visual Description                          |
|------|------------|---------------------|---------------------------------------------|
| `█`  | U+2588     | Full block          | Entire cell filled solid                    |
| `▀`  | U+2580     | Upper half block    | Top half filled, bottom empty               |
| `▄`  | U+2584     | Lower half block    | Bottom half filled, top empty               |
| `▌`  | U+258C     | Left half block     | Left half filled, right empty               |
| `▐`  | U+2590     | Right half block    | Right half filled, left empty               |

#### Fractional Blocks (Vertical, Bottom-Aligned)

These fill from the bottom upward in 1/8 increments:

| Char | Code Point | Fraction  |
|------|------------|-----------|
| `▁`  | U+2581     | Lower 1/8 |
| `▂`  | U+2582     | Lower 1/4 |
| `▃`  | U+2583     | Lower 3/8 |
| `▄`  | U+2584     | Lower 1/2 |
| `▅`  | U+2585     | Lower 5/8 |
| `▆`  | U+2586     | Lower 3/4 |
| `▇`  | U+2587     | Lower 7/8 |
| `█`  | U+2588     | Full      |

#### Fractional Blocks (Horizontal, Left-Aligned)

These fill from the left in 1/8 increments:

| Char | Code Point | Fraction  |
|------|------------|-----------|
| `▏`  | U+258F     | Left 1/8  |
| `▎`  | U+258E     | Left 1/4  |
| `▍`  | U+258D     | Left 3/8  |
| `▌`  | U+258C     | Left 1/2  |
| `▋`  | U+258B     | Left 5/8  |
| `▊`  | U+258A     | Left 3/4  |
| `▉`  | U+2589     | Left 7/8  |
| `█`  | U+2588     | Full      |

#### Edge Blocks

| Char | Code Point | Name             |
|------|------------|------------------|
| `▔`  | U+2594     | Upper 1/8 block  |
| `▕`  | U+2595     | Right 1/8 block  |

#### Shade Characters

| Char | Code Point | Name          | Approx. Density |
|------|------------|---------------|-----------------|
| `░`  | U+2591     | Light shade   | ~25% filled     |
| `▒`  | U+2592     | Medium shade  | ~50% filled     |
| `▓`  | U+2593     | Dark shade    | ~75% filled     |
| `█`  | U+2588     | Full block    | 100% filled     |

Density ordering for gradients: `░▒▓█` (light to dark)

#### Quadrant Blocks

These divide each character cell into a 2x2 grid (four quadrants):

| Char | Code Point | Quadrants Filled                         |
|------|------------|------------------------------------------|
| `▘`  | U+2598     | Upper-left only                          |
| `▝`  | U+259D     | Upper-right only                         |
| `▖`  | U+2596     | Lower-left only                          |
| `▗`  | U+2597     | Lower-right only                         |
| `▚`  | U+259A     | Upper-left + lower-right (diagonal)      |
| `▞`  | U+259E     | Upper-right + lower-left (anti-diagonal) |
| `▙`  | U+2599     | Upper-left + lower-left + lower-right    |
| `▛`  | U+259B     | Upper-left + upper-right + lower-left    |
| `▜`  | U+259C     | Upper-left + upper-right + lower-right   |
| `▟`  | U+259F     | Upper-right + lower-left + lower-right   |

Quadrant blocks give effective 2x2 sub-pixel resolution per character cell.

### 1.2 Box-Drawing Characters (U+2500 - U+257F)

128 characters for connecting lines at cell boundaries.

#### Single-Line Set (Light)

```
┌───┬───┐
│   │   │
├───┼───┤
│   │   │
└───┴───┘
```

| Char | Code Point | Name               |
|------|------------|--------------------|
| `─`  | U+2500     | Light horizontal   |
| `│`  | U+2502     | Light vertical     |
| `┌`  | U+250C     | Light down+right   |
| `┐`  | U+2510     | Light down+left    |
| `└`  | U+2514     | Light up+right     |
| `┘`  | U+2518     | Light up+left      |
| `├`  | U+251C     | Light vertical+right (T-junction) |
| `┤`  | U+2524     | Light vertical+left  |
| `┬`  | U+252C     | Light horizontal+down |
| `┴`  | U+2534     | Light horizontal+up  |
| `┼`  | U+253C     | Light cross          |

#### Double-Line Set

```
╔═══╦═══╗
║   ║   ║
╠═══╬═══╣
║   ║   ║
╚═══╩═══╝
```

| Char | Code Point | Name               |
|------|------------|--------------------|
| `═`  | U+2550     | Double horizontal  |
| `║`  | U+2551     | Double vertical    |
| `╔`  | U+2554     | Double down+right  |
| `╗`  | U+2557     | Double down+left   |
| `╚`  | U+255A     | Double up+right    |
| `╝`  | U+255D     | Double up+left     |
| `╠`  | U+2560     | Double vertical+right |
| `╣`  | U+2563     | Double vertical+left  |
| `╦`  | U+2566     | Double horizontal+down |
| `╩`  | U+2569     | Double horizontal+up  |
| `╬`  | U+256C     | Double cross       |

#### Heavy (Bold) Line Set

```
┏━━━┳━━━┓
┃   ┃   ┃
┣━━━╋━━━┫
┃   ┃   ┃
┗━━━┻━━━┛
```

| Char | Code Point | Name               |
|------|------------|--------------------|
| `━`  | U+2501     | Heavy horizontal   |
| `┃`  | U+2503     | Heavy vertical     |
| `┏`  | U+250F     | Heavy down+right   |
| `┓`  | U+2513     | Heavy down+left    |
| `┗`  | U+2517     | Heavy up+right     |
| `┛`  | U+251B     | Heavy up+left      |
| `┣`  | U+2523     | Heavy vertical+right |
| `┫`  | U+252B     | Heavy vertical+left  |
| `┳`  | U+2533     | Heavy horizontal+down |
| `┻`  | U+253B     | Heavy horizontal+up  |
| `╋`  | U+254B     | Heavy cross        |

#### Rounded Corners

| Char | Code Point | Name                       |
|------|------------|----------------------------|
| `╭`  | U+256D     | Light arc down and right   |
| `╮`  | U+256E     | Light arc down and left    |
| `╯`  | U+256F     | Light arc up and left      |
| `╰`  | U+2570     | Light arc up and right     |

#### Dashed Lines (selected)

| Char | Code Point | Name                        |
|------|------------|-----------------------------|
| `┄`  | U+2504     | Light triple-dash horizontal |
| `┅`  | U+2505     | Heavy triple-dash horizontal |
| `┆`  | U+2506     | Light triple-dash vertical   |
| `┈`  | U+2508     | Light quadruple-dash horiz.  |
| `╌`  | U+254C     | Light double-dash horizontal |
| `╍`  | U+254D     | Heavy double-dash horizontal |

---

## 2. Construction Techniques

### 2.1 Grid-Based Mapping

Every block letter is designed on a grid where each cell maps to one monospace character position. The process:

1. **Define the grid dimensions** -- e.g., 5 cols x 5 rows for a 5-line-tall letter
2. **Map each cell** to either a fill character or space
3. **Choose characters** based on cell position (edge vs. interior vs. corner)

Example grid for the letter "A" (5x5):
```
  0 1 2 3 4
0 . # # # .    . = space
1 # . . . #    # = fill character
2 # # # # #
3 # . . . #
4 # . . . #
```

### 2.2 Solid Style (Full Block █)

The simplest technique. Replace every `#` with `█` and every `.` with ` `:

- **Pros**: Maximum contrast, instantly readable, most widely supported
- **Cons**: Blocky/pixelated appearance, no interior detail
- **Best for**: Banners, headers, high-contrast displays

### 2.3 Outlined Style (Box-Drawing)

Use box-drawing characters to trace the outline of each letter:

- Map corners to `╔ ╗ ╚ ╝` (or `┌ ┐ └ ┘`)
- Map horizontal edges to `═` (or `─`)
- Map vertical edges to `║` (or `│`)
- Interior is space
- **Pros**: Elegant, lightweight, shows interior space
- **Cons**: Harder to construct (corner/junction selection), some letters difficult
- **Best for**: Professional/technical displays, logos

### 2.4 Shade/Gradient Style

Use shade progression `░▒▓█` to create depth effects:

- **Outer edge**: `█` (darkest)
- **Inner edge**: `▓`
- **Interior**: `▒` or `░`
- **Shadow**: `░` offset right/below

Alternatively, use shading to simulate lighting:
- **Left/top edge**: `█` (lit side)
- **Right/bottom edge**: `░` (shadow side)
- **Creates 3D beveled appearance**

### 2.5 Half-Block Technique (Double Resolution)

Using `▀` (upper half) and `▄` (lower half) with `█` (full block):

- Each character cell encodes TWO vertical pixels
- A 3-row display gives 6 effective pixel rows
- Combine with color (ANSI foreground/background) for full 2x1 pixel resolution per cell
- **This is how modern terminal graphics (e.g., chafa, viu) render images**

Construction process:
1. Design letter on a grid with 2N rows (where N = display lines)
2. For each pair of rows, encode: top-pixel + bottom-pixel
   - Both on: `█`
   - Top only: `▀`
   - Bottom only: `▄`
   - Neither: ` `

### 2.6 Mixed Technique (Outline + Fill)

Combine box-drawing borders with block fill interiors:
```
┏━━━┓
┃▓▓▓┃   Border: heavy box-drawing
┃▓▓▓┃   Fill: dark shade
┗━━━┛
```

---

## 3. Sizes and Proportions

### 3.1 The Monospace Aspect Ratio Problem

In monospace fonts, a character cell is approximately **1:2 width:height** (each cell is about twice as tall as it is wide). This means:

- A visual square requires approximately **2 columns x 1 row**
- Block letters need extra width to appear proportional
- Ignoring this makes letters look tall and thin

### 3.2 Common Size Classes

| Height | Name      | Typical Width | Use Case                    |
|--------|-----------|---------------|-----------------------------|
| 3 rows | Compact   | 3-5 cols      | Inline banners, tight spaces |
| 5 rows | Standard  | 5-7 cols      | Section headers, logos       |
| 7 rows | Large     | 7-10 cols     | Display banners              |
| 10+ rows| Banner   | 10-16 cols    | Splash screens, title art    |

### 3.3 Recommended Width-to-Height Ratios

To compensate for cell aspect ratio:

- **Target visual ratio**: Letter width should be ~60-80% of letter height (for most Latin capitals)
- **Column count formula**: `cols ≈ rows × 0.6 × 2` (accounting for 1:2 cell aspect)
  - 5-row letter: ~6 columns wide
  - 7-row letter: ~8 columns wide
- **Narrow letters** (I, l, 1): 1-3 cols regardless of height
- **Wide letters** (W, M): up to 1.5x the standard width

### 3.4 Half-Block Advantage

With half-block rendering (`▀▄`), you get 2x vertical resolution:
- 3 rows of display = 6 pixel rows = surprisingly detailed
- The effective pixel aspect ratio approaches 1:1 (since each cell now holds 2 vertical pixels)
- This allows much more recognizable letterforms in less vertical space

---

## 4. Letter Spacing and Readability

### 4.1 Spacing Rules

| Style               | Minimum Gap | Recommended Gap | Notes                          |
|----------------------|-------------|-----------------|--------------------------------|
| Solid block (█)     | 1 column    | 2 columns       | Dense fill needs clear separation |
| Box-drawing outline | 0-1 column  | 1 column        | Open interiors self-separate   |
| Shade/gradient      | 1 column    | 2 columns       | Shading can blur boundaries    |
| Half-block compact  | 1 column    | 1-2 columns     | High resolution helps clarity  |

### 4.2 Word Spacing

- **Between words**: 2-3x the inter-letter gap
- For 1-col letter spacing, use 3-col word spacing
- For 2-col letter spacing, use 4-5 col word spacing

### 4.3 FIGlet Spacing Modes (Reference)

FIGlet defines three layout modes that serve as useful mental models:

1. **Full Width** -- each letter occupies its maximum designed width. Most readable, most spacious.
2. **Kerning/Fitting** -- letters slide together until they touch. Best balance of density and readability.
3. **Smushing** -- letters overlap by one column with merge rules. Compact but can reduce legibility with solid-fill styles.

### 4.4 Hardblank Technique

For letters with large open areas (C, L, T, 7), insert non-collapsible spaces inside the letter form to prevent adjacent letters from visually invading the space during kerning. FIGlet uses `$` as a hardblank; in custom implementations, simply ensure the gap is preserved.

---

## 5. Character Combination Strategies for Visual Impact

### 5.1 Highest Impact Combinations

| Combination | Effect | Best For |
|------------|--------|----------|
| `█` + `░` (solid + light shade) | Maximum contrast with texture | Banners with depth |
| `█` + `▀▄` (full + half blocks) | Smooth edges on solid forms | Refined logos |
| `╔═╗║╚╝` (double-line box) | Clean geometric elegance | Professional/technical |
| `█▓▒░` (full gradient) | 3D appearance, richness | Decorative headers |
| `┏━┓┃┗┛` (heavy box) + `█` interior | Bold outlined fill | Title screens |
| `▀▄▌▐` (half-blocks only) | Double-resolution compact art | Compact/modern logos |

### 5.2 Drop Shadow Technique

```
██████░
██  ██░
██████░
██  ██░
██  ██░
░░░░░░░
```
Place `░` one position right and one position below the solid form.

### 5.3 Gradient/Bevel Technique

```
█████
█▓▓▓░
█▓▓▓░
█▓▓▓░
░░░░░
```
Use `█` on top/left edges, `░` on bottom/right edges, `▓` for face fill.

---

## 6. Concrete Letter Examples

All examples below are designed for monospace terminal rendering. Each letter is followed by a blank column for visual separation in the examples.

### Style 1: Solid Full-Block (5 lines tall)

Characters used: `█` (U+2588) and ` ` (space)

#### Letter A (6 cols wide)
```
 ████
██  ██
██████
██  ██
██  ██
```

#### Letter B (6 cols wide)
```
█████
██  ██
█████
██  ██
█████
```

#### Letter T (6 cols wide)
```
██████
  ██
  ██
  ██
  ██
```

#### Full word "ABT" with 2-col spacing:
```
 ████   █████   ██████
██  ██  ██  ██    ██
██████  █████     ██
██  ██  ██  ██    ██
██  ██  █████     ██
```

### Style 2: Double-Line Box-Drawing Outline (5 lines tall)

Characters used: `╔ ╗ ╚ ╝ ═ ║ ╠ ╣ ╦ ╩` (double-line set)

#### Letter A (6 cols wide)
```
╔════╗
║    ║
╠════╣
║    ║
╚    ╚
```

#### Letter B (6 cols wide)
```
╔════╗
║    ║
╠════╣
║    ║
╚════╝
```

#### Letter T (6 cols wide)
```
╦════╦
   ║
   ║
   ║
   ╩
```

Note: Box-drawing letters are tricky because not every letterform maps
cleanly to connected lines. Some creative liberties are necessary.

**Alternative clean approach using mixed box chars:**

#### Letter A (alt)
```
╔═══╗
║   ║
╠═══╣
║   ║
╨   ╨
```

#### Letter B (alt)
```
╔═══╗
║   ║
╠═══╣
║   ║
╚═══╝
```

#### Letter T (alt)
```
═══╤═══
   │
   │
   │
   ╧
```

### Style 3: Shade/Gradient (5 lines tall)

Characters used: `█` `▓` `▒` `░` in density layers

#### Letter A (7 cols wide, gradient from left=dark to right=light)
```
 █▓▒▒▓█
█▓    ▓█
█▓▒▒▒▓█
█▓    ▓█
█▓    ▓█
```

#### Letter A (alt: 3D bevel with shadow)
```
 ████░
██  █░
█████░
██  █░
██  █░
░░░░░░
```

#### Letter B (7 cols wide, gradient border)
```
█▓▒▒▒▓
█▓   ▓█
█▓▒▒▓█
█▓   ▓█
█▓▒▒▒▓
```

#### Letter B (alt: dense-to-light interior fill)
```
█████
█▓▓▓█
█████
█▒▒▒█
█████
```

#### Letter T (7 cols wide, gradient border)
```
█▓▒▒▒▓█
   █▓
   █▓
   █▓
   █▓
```

#### Letter T (alt: full gradient fill)
```
███████
░░▓█▓░░
  ▓█▓
  ▓█▓
  ▓█▓
```

### Style 4: Half-Block Minimal (3 lines tall)

Characters used: `▀` (U+2580), `▄` (U+2584), `█` (U+2588), `▐` (U+2590), `▌` (U+258C)

This style uses the half-block technique where each display row encodes
2 pixel rows. 3 display rows = 6 effective pixel rows.

**Design method**: Design on a 6-row bitmap, then encode pairs:
- Row pair [top=1, bottom=1] → `█`
- Row pair [top=1, bottom=0] → `▀`
- Row pair [top=0, bottom=1] → `▄`
- Row pair [top=0, bottom=0] → ` `

#### Letter A (5 cols wide)

Bitmap (6 rows):
```
row 0:  .##..
row 1:  #..#.
row 2:  #..#.
row 3:  ####.
row 4:  #..#.
row 5:  #..#.
```
Encoding:
- rows 0+1: `.##..` + `#..#.` → `▄██▀ ` ... let me be precise:

```
col 0: top=0,bot=1 → ▄    col 1: top=1,bot=0 → ▀
col 2: top=1,bot=0 → ▀    col 3: top=0,bot=1 → ▄
```

Rendered:
```
 ▄▀▀▄
 █▄▄█
 █  █
```

#### Letter B (5 cols wide)

Bitmap (6 rows):
```
row 0:  ###.
row 1:  #..#
row 2:  ###.
row 3:  #..#
row 4:  #..#
row 5:  ###.
```
Rendered:
```
██▀▄
█▄▄▀
██▀▀
```

Hmm, let me be more precise with the half-block encoding:

#### Letter A (precise, 5 cols)

6-row pixel grid (1=filled, 0=empty):
```
row0: 0 1 1 1 0
row1: 1 0 0 0 1
row2: 1 1 1 1 1
row3: 1 0 0 0 1
row4: 1 0 0 0 1
row5: 0 0 0 0 0
```

Display row 0 (pixel rows 0,1):
- col0: 0,1 → ▄
- col1: 1,0 → ▀
- col2: 1,0 → ▀
- col3: 1,0 → ▀
- col4: 0,1 → ▄

Display row 1 (pixel rows 2,3):
- col0: 1,1 → █
- col1: 1,0 → ▀
- col2: 1,0 → ▀
- col3: 1,0 → ▀
- col4: 1,1 → █

Display row 2 (pixel rows 4,5):
- col0: 1,0 → ▀
- col1: 0,0 → (space)
- col2: 0,0 → (space)
- col3: 0,0 → (space)
- col4: 1,0 → ▀

```
▄▀▀▀▄
█▀▀▀█
▀   ▀
```

#### Letter B (precise, 5 cols)

6-row pixel grid:
```
row0: 1 1 1 1 0
row1: 1 0 0 0 1
row2: 1 1 1 1 0
row3: 1 0 0 0 1
row4: 1 1 1 1 0
row5: 0 0 0 0 0
```

Display row 0 (rows 0,1):
- col0: 1,1 → █
- col1: 1,0 → ▀
- col2: 1,0 → ▀
- col3: 1,0 → ▀
- col4: 0,1 → ▄

Display row 1 (rows 2,3):
- col0: 1,1 → █
- col1: 1,0 → ▀
- col2: 1,0 → ▀
- col3: 1,0 → ▀
- col4: 0,1 → ▄

Display row 2 (rows 4,5):
- col0: 1,0 → ▀
- col1: 1,0 → ▀
- col2: 1,0 → ▀
- col3: 1,0 → ▀
- col4: 0,0 → (space)

```
█▀▀▀▄
█▀▀▀▄
▀▀▀▀
```

#### Letter T (precise, 5 cols)

6-row pixel grid:
```
row0: 1 1 1 1 1
row1: 0 0 1 0 0
row2: 0 0 1 0 0
row3: 0 0 1 0 0
row4: 0 0 1 0 0
row5: 0 0 0 0 0
```

Display row 0 (rows 0,1):
- col0: 1,0 → ▀
- col1: 1,0 → ▀
- col2: 1,1 → █
- col3: 1,0 → ▀
- col4: 1,0 → ▀

Display row 1 (rows 2,3):
- col0: 0,0 → (space)
- col1: 0,0 → (space)
- col2: 1,1 → █
- col3: 0,0 → (space)
- col4: 0,0 → (space)

Display row 2 (rows 4,5):
- col0: 0,0 → (space)
- col1: 0,0 → (space)
- col2: 1,0 → ▀
- col3: 0,0 → (space)
- col4: 0,0 → (space)

```
▀▀█▀▀
  █
  ▀
```

#### Full word "ABT" in half-block style:
```
▄▀▀▀▄ █▀▀▀▄ ▀▀█▀▀
█▀▀▀█ █▀▀▀▄   █
▀   ▀ ▀▀▀▀    ▀
```

---

## 7. Advanced Techniques

### 7.1 FIGlet Font Architecture

FIGlet (Frank, Ian, and Glenn's letters) constructs large text by composing
sub-characters stored in `.flf` font files:

- Each FIGcharacter is stored as a multi-line block, all the same height
- A **hardblank** character (typically `$`) renders as a space but prevents
  smushing -- critical for maintaining open areas in C, L, T shapes
- **Smushing rules** control how adjacent characters merge:
  - Equal character: identical sub-chars merge into one
  - Underscore: `_` yields to `|`, `/`, `\`, brackets, braces
  - Hierarchy: `|` < `/\` < `[]` < `{}` < `()` < `<>`
  - Opposite pair: `[]` or `][` becomes `|`

### 7.2 Drop Shadow Construction

Apply a `░` shadow offset by +1 column and +1 row from the main form:

```
██████
██  ██
██████░
██  ██░
██  ██░
 ░░░░░░
```

For deeper shadow, offset by 2:

```
██████
██  ██
██████░░
██  ██░░
██  ██░░
  ░░░░░░
  ░░░░░░
```

### 7.3 3D Bevel/Emboss Effect

Use different shade levels for top/left vs bottom/right edges:

```
█████▒    █ = top/left edges (lit)
█▓▓▓▒▒   ▓ = face fill
█▓▓▓▒▒   ▒ = bottom/right edges (shadow)
▒▒▒▒▒▒
```

### 7.4 Color Enhancement (ANSI Escape Codes)

Half-block art becomes dramatically more powerful with ANSI colors:
- Foreground color controls the filled-half color
- Background color controls the empty-half color
- This gives full 2-color-per-cell capability
- With `▀` or `▄`, each cell can show two different colors vertically

### 7.5 Quadrant Blocks for Smooth Diagonals

The quadrant characters allow pseudo-diagonal lines:

```
▗▄▖         Smooth curve using quadrant blocks
▐ ▌         (requires font support for quadrants)
▝▀▘
```

---

## 8. Design Decision Matrix

| Factor | Solid (█) | Box-Drawing (╔═╗) | Gradient (░▒▓█) | Half-Block (▀▄) |
|--------|-----------|-------------------|-----------------|-----------------|
| Readability | Excellent | Good | Good | Good |
| Visual weight | Heavy | Light | Medium | Medium |
| Construction complexity | Low | High | Medium | Medium |
| Min. height | 3 rows | 5 rows | 5 rows | 2 rows |
| Font compatibility | Universal | High | High | High |
| Color benefit | Low | Low | Medium | Very High |
| Best for | Bold banners | Elegant frames | 3D/textured | Compact/modern |

---

## 9. Quick Reference: Essential Characters for Block Art

### Minimum Viable Set (8 characters)
```
█  Full block      (U+2588)  -- primary fill
▀  Upper half       (U+2580)  -- top edges / half-block art
▄  Lower half       (U+2584)  -- bottom edges / half-block art
░  Light shade      (U+2591)  -- backgrounds / shadows
▓  Dark shade       (U+2593)  -- medium fill / bevels
═  Double horizontal (U+2550) -- horizontal lines
║  Double vertical   (U+2551) -- vertical lines
   Space             (U+0020) -- empty cells
```

### Extended Set (adds box corners and more)
```
╔  Double down+right (U+2554)
╗  Double down+left  (U+2557)
╚  Double up+right   (U+255A)
╝  Double up+left    (U+255D)
╠  Double vert+right (U+2560)
╣  Double vert+left  (U+2563)
╦  Double horiz+down (U+2566)
╩  Double horiz+up   (U+2569)
▌  Left half block   (U+258C)
▐  Right half block  (U+2590)
▒  Medium shade      (U+2592)
━  Heavy horizontal  (U+2501)
┃  Heavy vertical    (U+2503)
```
