# THE BACKLOGS — Logo Concept Portfolio

> **Project:** CLI task management tool rebrand
> **Aesthetic DNA:** The Backrooms (liminal horror) x productivity tooling
> **Core Tension:** The infinite, unsettling mundanity of tasks that never end

---

## Concept 1: "The Corridor"

**Tagline:** *You are here. You have always been here.*

### Mood Board
Claustrophobic, vanishing, institutional, deep, geometric

### Detailed ASCII Sketch

```
                         ___________________________
                        /|                         |\
                       / |    =  =  =  =  =  =    | \
                      /  |_________________________|  \
                     /  /                           \  \
                    /  /                             \  \
                   /  /                               \  \
                  /  /     T H E  B A C K L O G S      \  \
                 /  /                                    \  \
                /  /                                      \  \
               /  /________________________________________\  \
              /  /==========================================\  \
             /  /                                            \  \
            /  /                                              \  \
           /  /                                                \  \
          /  /                                                  \  \
         /__/____________________________________________________\__\
         |  |____________________________________________________|  |
         |_/______________________________________________________\_|
```

Full-detail version with color annotations:

```
                         ╔═══════════════════════════╗         <- ceiling, dim white
                        ╱│  ═  ══  ═══  ═══  ══  ═  │╲        <- fluorescent tubes (flickering yellow-white)
                       ╱ │                           │ ╲
                      ╱  ╠═══════════════════════════╣  ╲      <- far wall top molding
                     ╱  ╱│                           │╲  ╲
                    ╱  ╱ │                           │ ╲  ╲    <- side walls (sickly yellow)
                   ╱  ╱  │  T H E  B A C K L O G S  │  ╲  ╲   <- text ON far wall (bright white)
                  ╱  ╱   │                           │   ╲  ╲
                 ╱  ╱    │                           │    ╲  ╲
                ╱  ╱     ╠═══════════════════════════╣     ╲  ╲ <- baseboard
               ╱  ╱     ╱ ░░░░░░░░░░░░░░░░░░░░░░░░░ ╲     ╲  ╲ <- carpet (brown/dirty)
              ╱  ╱     ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲     ╲  ╲
             ╱  ╱     ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲     ╲  ╲
            ╱  ╱     ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲     ╲  ╲
           ╱  ╱     ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲     ╲  ╲
          ╱__╱     ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲     ╲__╲
```

### Color Palette

| Element           | RGB           | ANSI 256 | Role                        |
|-------------------|---------------|----------|-----------------------------|
| Ceiling           | `#3a3a3a`     | 237      | Dark gray structure          |
| Fluorescent tubes | `#ffffcc`     | 230      | Bright, slightly warm white  |
| Fluorescent glow  | `#e8e4a0`     | 186      | Diffused yellow-white halo   |
| Wall surface      | `#c4a846`     | 178      | THE sickly Backrooms yellow  |
| Wall shadow       | `#8b7a30`     | 136      | Darker yellow in recesses    |
| Text on wall      | `#ffffff`     | 15       | Clean white, high contrast   |
| Baseboard/molding | `#5a4a28`     | 94       | Dark wood brown              |
| Carpet            | `#6b5b3a`     | 95       | Dirty brownish-tan           |
| Carpet highlight  | `#7d6b48`     | 137      | Where light hits carpet      |

### Character Set

| Element           | Characters Used                              |
|-------------------|----------------------------------------------|
| Ceiling lines     | `╔ ═ ╗ ╱ ╲`                                  |
| Wall edges        | `│ ╠ ╣ ║`                                     |
| Fluorescent tubes | `═ ══ ═══` (spaced for fixture effect)       |
| Floor/carpet      | `░` (light shade block)                       |
| Perspective lines | `╱ ╲ ╱ ╲` (box-drawing diagonals)            |
| Text              | Standard ASCII: `T H E  B A C K L O G S`     |

### Monochrome Fallback

- Replace `░` carpet with `.` or `:` for texture
- Use standard ASCII `/ \ | - _ =` for structure
- Text becomes **bold** (via ANSI bold escape) to stand out
- Fluorescent tubes rendered with `=` characters
- Overall structure remains fully readable — the perspective geometry carries the design

```
                         +---------------------------+
                        /|  =  ==  ===  ===  ==  =  |\
                       / |                           | \
                      /  +---------------------------+  \
                     /  /|                           |\  \
                    /  / |                           | \  \
                   /  /  |  T H E  B A C K L O G S  |  \  \
                  /  /   |                           |   \  \
                 /  /    |                           |    \  \
                /  /     +---------------------------+     \  \
               /  /     /............................."     \  \
              /  /     /...............................\     \  \
             /  /     /.................................\     \  \
            /  /     /...................................\     \  \
           /  /     /.....................................\     \  \
          /__/     /.......................................\     \__\
```

### Dimensions
- Width: 76 characters
- Height: 18 rows

### Implementation Notes
- **Perspective geometry** is the key challenge. The vanishing-point lines must be calculated so left/right walls converge symmetrically. Pre-compute the x-offsets per row.
- **Fluorescent tube flicker**: In animated mode (if supported), randomly dim/brighten individual `═` segments with a timer. For static mode, make 1-2 tubes slightly dimmer (use the `#8b7a30` shadow color).
- **Unicode box-drawing characters** (`╱╲`) may not render in all terminals. Detect capability and fall back to `/\`.
- The text is letter-spaced (`T H E  B A C K L O G S`) to sell the "sign mounted on distant wall" feeling.

### Why This Works
The corridor IS the backlog — you're staring down a hallway that goes on forever, and on the far wall, impossibly, is the name of the thing trapping you here. Every developer knows the feeling of staring into an infinite list of tasks. The Backrooms corridor makes that feeling architectural. The vanishing point says: *there is no end to this.*

---

## Concept 2: "The Flickering Sign"

**Tagline:** *Some lights never fully go out.*

### Mood Board
Buzzing, institutional, decaying, warm-cold, uneasy

### Detailed ASCII Sketch

Full sign with "lighting state" — uppercase = bright, lowercase = dim, `_` = dead/off segment:

```
      ╭────────────────────────────────────────────────────────╮
  ~~~~│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│~~~~
  ~~~~│░░                                                    ░░│~~~~
  ~~~~│░░  ▀▛▀ ▌ ▌ ▛▀▘  ▛▀▖ ▞▀▖ ▞▀▖ ▌ ▗ ▌   ▞▀▖ ▞▀▖ ▞▀▘  ░░│~~~~
  ~~~~│░░   ▌  ▛▀▌ ▛▀   ▛▀▖ ▛▀▌ ▌   ▛▀▄ ▌   ▌ ▌ ▌▄▖ ▚▀▖  ░░│~~~~
  ~~~~│░░   ▘  ▘ ▘ ▀▀▘  ▀▀  ▘ ▘ ▝▀▘ ▘ ▘ ▀▀▘ ▝▀  ▝▀  ▀▀   ░░│~~~~
  ~~~~│░░                                                    ░░│~~~~
  ~~~~│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│~~~~
      ╰────────────────────────────────────────────────────────╯
```

Now the same sign with FLICKER applied — some characters replaced with dimmer versions or blanked:

```
      ╭────────────────────────────────────────────────────────╮
  ~~~~│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│~~~~
  ~~~~│░░                                                    ░░│~~~~
  ~~~~│░░  ▀▛▀ ▌ ▌ ▛▀▘  ▛▀▖ ▞▀▖ ▞▀▖ ▌ ▗ ▌   ▞▀▖ ▞▀▖ ▞▀▘  ░░│~~~~
  ~~~~│░░   ▌  ▛▀▌ ▛▀   ▛▀▖ ▛▀▌ ▌   ▛▀▄ ▌   ▌ ▌ ▌▄▖ ▚▀▖  ░░│~~~~
  ~~~~│░░   ▘  ▘ ▘ ▀▀▘  ▀▀  ▘ ▘ ▝▀▘ ▘ ▘ ▀▀▘ ▝▀  ▝▀  ▀▀   ░░│~~~~
  ~~~~│░░                                                    ░░│~~~~
  ~~~~│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│~~~~
      ╰────────────────────────────────────────────────────────╯
```

Here is the version with color-annotated flicker zones. Letters in parentheses show brightness level: (B)right, (D)im, (O)ff:

```
      ╭────────────────────────────────────────────────────────╮
  ~~~~│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  <- glow halo
  ~~~~│░░                                                    ░░│
  ~~~~│░░  ▀▛▀ ▌ ▌ ▛▀▘  ▛▀▖ ▞▀▖ ▞▀▖ ▌ ▗ ▌   ▞▀▖ ▞▀▖ ▞▀▘  ░░│
  ~~~~│░░  (B) (B)(D)    (B) (D) (O) (B)      (D) (D) (B)   ░░│  <- brightness per letter
  ~~~~│░░   ▌  ▛▀▌ ▛▀   ▛▀▖ ▛▀▌ ▌   ▛▀▄ ▌   ▌ ▌ ▌▄▖ ▚▀▖  ░░│
  ~~~~│░░   ▘  ▘ ▘ ▀▀▘  ▀▀  ▘ ▘ ▝▀▘ ▘ ▘ ▀▀▘ ▝▀  ▝▀  ▀▀   ░░│
  ~~~~│░░                                                    ░░│
  ~~~~│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
      ╰────────────────────────────────────────────────────────╯
         ^                                                  ^
         glow bleeds out with ~ chars in surrounding color
```

What it looks like with flicker applied (the "C" in BACK and "O" in LOG are nearly dead):

```
      ╭────────────────────────────────────────────────────────╮
  ~~~~│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│~~~~
  ~~~~│░░                                                    ░░│~~~~
  ~~~~│░░  ▀▛▀ ▌ ▌ ▛▀▘  ▛▀▖ ▞▀▖ ░░▖ ▌ ▗ ▌   ░░▖ ▞▀▖ ▞▀▘  ░░│~~~~
  ~~~~│░░   ▌  ▛▀▌ ▛▀   ▛▀▖ ▛▀▌ ░   ▛▀▄ ▌   ░ ▌ ▌▄▖ ▚▀▖  ░░│~~~~
  ~~~~│░░   ▘  ▘ ▘ ▀▀▘  ▀▀  ▘ ▘ ░░▘ ▘ ▘ ▀▀▘ ░░  ▝▀  ▀▀   ░░│~~~~
  ~~~~│░░                                                    ░░│~~~~
  ~~~~│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│~~~~
      ╰────────────────────────────────────────────────────────╯
```

### Color Palette

| Element               | RGB           | ANSI 256 | Role                              |
|-----------------------|---------------|----------|-----------------------------------|
| Sign frame            | `#4a4a4a`     | 239      | Metal border                      |
| Sign panel background | `#1a1a18`     | 234      | Dark backlit panel (off)          |
| Letter — bright       | `#ffffdd`     | 230      | Fully powered fluorescent letter  |
| Letter — medium       | `#c8c070`     | 186      | Slightly dimmed letter            |
| Letter — dim          | `#706830`     | 136      | Dying tube, barely visible        |
| Letter — dead         | `#2a2820`     | 236      | Tube off, just faint outline      |
| Glow — bright         | `#ffff99`     | 228      | Halo around bright letters        |
| Glow — medium         | `#8a8440`     | 143      | Reduced halo                      |
| Glow fill (░)         | `#3a3820`     | 58       | Internal sign illumination        |
| Surround glow (~)     | `#2a2818`     | 236      | Light bleeding onto ceiling/wall  |

### Character Set

| Element              | Characters                                 |
|----------------------|--------------------------------------------|
| Frame                | `╭ ─ ╮ │ ╰ ╯`  (rounded box-drawing)       |
| Letter shapes        | Block element characters: `▀▛▜▌▐▖▗▘▝▞▟▙▚▄▛▀▖▗` |
| Glow fill            | `░` (light shade)                           |
| Surround glow        | `~` (tilde, representing light bleed)       |
| Dead segments        | `░` in very dark color (ghost outline)      |

### Monochrome Fallback

- Frame uses standard ASCII: `+`, `-`, `|`
- Letters rendered with standard block chars, still legible
- "Dim" letters rendered with `.` or `:` replacing solid segments
- "Dead" letters rendered as blank space (just gone)
- Glow `░` replaced with spaces; `~` removed
- The flickering is conveyed through structural absence — missing letter segments tell the story

```
      +------------------------------------------------------------+
      |                                                            |
      |    ### #  # ###  ###  ###  ::: # # #   ::: ###  ###       |
      |     #  #### ##   ###  ###  :   ### #   : # ::#  # #       |
      |     #  #  # ###  ##   # #  ::: # # ### ::   ::  ##        |
      |                                                            |
      +------------------------------------------------------------+
```

### Dimensions
- Width: 66 characters
- Height: 10 rows

### Implementation Notes
- **Letter rendering**: Use a custom 3-row pixel font built from Unicode block elements (`▀▛▜▌▐▖▗▘▝`). Each letter is 3-4 columns wide. Pre-define each glyph as a 3xN grid.
- **Flicker system**: Assign each letter a brightness value (0.0 to 1.0). Map brightness to color tiers. For animation, use a sine wave with per-letter phase offset to create rolling flicker. For static rendering, hardcode a "snapshot" — e.g., positions 6 and 10 (the "C" and first "O") are dim/dead.
- **Glow bleed**: The `~` characters flanking the sign are colored to match the nearest bright letter's glow color, fading with distance.
- **The `░` fill** inside the sign panel creates the backlit illumination effect even where there are no letters.

### Why This Works
Every office has that one fluorescent sign that's half-dead and buzzing. It's deeply liminal — you associate it with late nights, empty hallways, the time between "everyone left" and "you should leave too." For a CLI tool you run at 2am trying to figure out what to work on next, a flickering sign that reads THE BACKLOGS is perfect. The dying letters suggest entropy, things breaking down, the backlog consuming itself. And yet — the sign is still on. There's still work to do.

---

## Concept 3: "The Infinite Stack"

**Tagline:** *Every task you close opens two more rooms.*

### Mood Board
Recursive, sinking, entropic, layered, vertigo

### Detailed ASCII Sketch

```
  ████████╗██╗  ██╗███████╗    ██████╗  █████╗  ██████╗██╗  ██╗██╗      ██████╗  ██████╗ ███████╗
  ╚══██╔══╝██║  ██║██╔════╝    ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██║     ██╔═══██╗██╔════╝ ██╔════╝
     ██║   ███████║█████╗      ██████╔╝███████║██║     █████╔╝ ██║     ██║   ██║██║  ███╗███████╗
     ██║   ██╔══██║██╔══╝      ██╔══██╗██╔══██║██║     ██╔═██╗ ██║     ██║   ██║██║   ██║╚════██║
     ██║   ██║  ██║███████╗    ██████╔╝██║  ██║╚██████╗██║  ██╗███████╗╚██████╔╝╚██████╔╝███████║
     ╚═╝   ╚═╝  ╚═╝╚══════╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝╚══════╝
```

That's too wide. Here's the version scaled to fit, using a more compact block-letter font, with the stacking/decay effect:

```
  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄▀ █   █▀█ █▀▀ █▀
   █  █▀█ ██▄   █▀▄ █▀█ █▄▄ █ █ █▄▄ █▄█ █▄█ ▄█
  ─────────────────────────────────────────────────
   ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄▀ █   █▀█ █▀▀ █▀
    █  █▀█ ██▄   █▀▄ █▀█ █▄▄ █ █ █▄▄ █▄█ █▄█ ▄█
  ─────────────────────────────────────────────────
    ▀█▀ █ █ ██▄   █▀▄ ▄▀█ █▀▀ █▄░ █   █▀█ ░▀▀ █▀
     █  █░█ ██▄   █▀░ █▀█ █▄░ █ █ █▄▄ █▄░ █▄█ ▄█
  ─────────────────────────────────────────────────
     ▀█░ █ ░ ░█▄   █▀░ ░▀█ █░▀ █▄░ ░   ░▀█ ░▀░ █░
      ░  █░█ ░█▄   █░▄ █░█ ░▄▄ ░ █ █▄░ █▄░ ░▄█ ░█
  ─────────────────────────────────────────────────
      ░░░ ░ ░ ░░░   ░░░ ░░░ ░░░ ░░░ ░   ░░░ ░░░ ░░
       ░  ░░░ ░░░   ░░░ ░░░ ░░░ ░ ░ ░░░ ░░░ ░░░ ░░
  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
                         ░ ░   ░   ░ ░
                           ░       ░
                             ░   ░
                               ░
```

### Color Palette

| Element          | RGB           | ANSI 256 | Role                             |
|------------------|---------------|----------|----------------------------------|
| Layer 1 text     | `#ffff88`     | 228      | Bright fluorescent yellow        |
| Layer 1 divider  | `#c4a846`     | 178      | Yellow-tinted horizontal rule    |
| Layer 2 text     | `#ccbb55`     | 179      | Slightly faded yellow            |
| Layer 3 text     | `#998833`     | 136      | Brownish-yellow, decaying        |
| Layer 3 corrupt  | `#706020`     | 94       | Corrupted segments               |
| Layer 4 text     | `#554418`     | 58       | Dark brown, barely visible       |
| Layer 5 text     | `#332a10`     | 236      | Nearly invisible, sinking        |
| Void trails      | `#1a1408`     | 233      | The last traces before void      |
| Divider lines    | `#554418`     | 58       | Getting darker with each layer   |
| Background       | (terminal bg) | —        | Dark background assumed          |

### Character Set

| Element           | Characters                                    |
|-------------------|-----------------------------------------------|
| Block letters     | `▀ █ ▄ ▀▄▘▝▖▗` (2-row pixel font)            |
| Dividers          | `─` (box-drawing horizontal)                  |
| Corruption        | `░` replacing solid `█` blocks                |
| Void trail        | `░` then `.` then nothing                     |
| Bottom fade       | `▁` (lower one-eighth block for floor)         |

### Monochrome Fallback

- Layer 1: normal brightness text with `#` for fills
- Layer 2: same but slightly indented
- Layer 3: replace some chars with `.`
- Layer 4: mostly `.` and spaces
- Layer 5: almost entirely spaces with a few `:` marks
- Dividers: simple `-` characters
- The degradation is structural (missing characters), not color-dependent

```
  #█# █ █ █##   █#█ ##█ █## █#█ █   █#█ █## █#
   █  █#█ ██#   █## █#█ █## █ █ █## █#█ █## #█
  -------------------------------------------------
   #.# . . .##   .#. ##. .## .#. .   .#. .## .#
    .  .#. ..#   .## .#. .## . . .#. .#. .## #.
  -------------------------------------------------
    ... . . ...   ... ... ... ... .   ... ... ..
     .  ... ...   ... ... ... . . ... ... ... ..
  -------------------------------------------------
                         . .   .   . .
                               .
```

### Dimensions
- Width: 53 characters (compact font) or up to 80 (with spacing)
- Height: 19-23 rows

### Implementation Notes
- **2-row pixel font**: Define each letter as a 2-row grid of block elements. Standard approach — many terminal banner tools use this. Keep glyphs 3-4 chars wide.
- **Corruption algorithm**: For each successive layer, iterate through characters and replace with `░` at increasing probability: Layer 2 = 5%, Layer 3 = 25%, Layer 4 = 60%, Layer 5 = 90%. Use a seeded PRNG so the pattern is deterministic.
- **Indentation shift**: Each layer is indented 1 character to the right, creating a subtle "sinking" parallax.
- **Color interpolation**: Linearly interpolate between Layer 1 color and void color across the 5 layers. Can use per-character color for smooth gradients.
- **Bottom "drip" trails**: After the last layer, draw a few `░` characters trailing downward in a column pattern, converging to a single point — the vanishing point of the infinite stack.

### Why This Works
This is the most thematically resonant concept. A backlog is literally a stack — items pile up, the ones at the bottom get older, more corrupted, more forgotten. The Backrooms are infinite repetition of the same space, degrading as you go deeper. This logo fuses both: the text IS the stack, repeating and decaying downward into void. The message is clear: your tasks extend infinitely downward, getting less defined the deeper you go, and at the bottom there is nothing. Anyone who's ever scrolled to the bottom of a Jira backlog knows this feeling intimately.

---

## Concept 4: "Level 0"

**Tagline:** *You've noclipped into your own backlog.*

### Mood Board
Enclosed, fluorescent, wrong, contained, institutional

### Detailed ASCII Sketch

```
  ┌──────┬───────┬───────┬───────┬───────┬───────┬──────┐
  │======│=======│=======│=======│=======│=======│======│   <- ceiling tiles w/ lights
  ├──────┼───────┼───────┼───────┼───────┼───────┼──────┤
  │      │       │       │       │       │       │      │
  ├──────┼───────┼───────┼───────┼───────┼───────┼──────┤
  │======│=======│=======│=======│=======│=======│======│
  ╞══════╧═══════╧═══════╧═══════╧═══════╧═══════╧══════╡
  ║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║   <- wallpaper
  ║▓▓▓                                              ▓▓▓║
  ║▓▓▓      ▀█▀ █ █ █▀▀                             ▓▓▓║
  ║▓▓▓       █  █▀█ ██▄                             ▓▓▓╢░░░
  ║▓▓▓                                              ▓▓▓╢░░░  <- doorway
  ║▓▓▓      █▀▄ ▄▀█ █▀▀ █▄▀ █   █▀█ █▀▀ █▀        ▓▓▓╢░░░     to darkness
  ║▓▓▓      █▀▄ █▀█ █▄▄ █ █ █▄▄ █▄█ █▄█ ▄█        ▓▓▓╢░░░
  ║▓▓▓                                              ▓▓▓╢░░░
  ║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║
  ╞══════════════════════════════════════════════════════╡
  ║░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░║   <- carpet
  ║░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░.░║
  ╚══════════════════════════════════════════════════════╝
```

Note the **asymmetry**: the doorway on the right side is placed too high (the wall segment below it is shorter), creating that "something is wrong" feeling from the brief.

### Color Palette

| Element              | RGB           | ANSI 256 | Role                              |
|----------------------|---------------|----------|-----------------------------------|
| Ceiling grid         | `#4a4a4a`     | 239      | Drop ceiling T-bar grid           |
| Fluorescent panel    | `#ffffcc`     | 230      | Light panels in ceiling           |
| Ceiling tile         | `#2a2a2a`     | 236      | Dark ceiling tile between lights  |
| Wall border          | `#6b5b3a`     | 95       | Structural wall edges             |
| Wallpaper fill       | `#c4a846`     | 178      | THE yellow wallpaper              |
| Wallpaper pattern ▓  | `#b09838`     | 142      | Slightly darker texture pattern   |
| Text                 | `#ffffff`     | 15       | White text floating in room       |
| Doorway              | `#0a0a08`     | 232      | Pure darkness beyond doorway      |
| Doorway edge ░       | `#1a1a18`     | 233      | Threshold shadow                  |
| Carpet               | `#6b5b3a`     | 95       | Brownish carpet                   |
| Carpet pattern       | `#5a4a28`     | 94       | Carpet texture variation          |
| Baseboard            | `#3a3020`     | 58       | Dark baseboard line               |

### Character Set

| Element             | Characters                               |
|---------------------|------------------------------------------|
| Ceiling grid        | `┌ ─ ┬ ┐ │ ├ ┼ ┤ └ ┴ ┘` (box-drawing)  |
| Fluorescent panels  | `=` (equals, representing light bars)     |
| Wall frame          | `║ ╞ ═ ╡ ╚ ╝ ╢` (double box-drawing)    |
| Wallpaper texture   | `▓` (dark shade block)                    |
| Text                | Block element pixel font (2-row)          |
| Doorway             | `░` (suggesting dark threshold)           |
| Carpet              | `░` and `.` alternating                   |

### Monochrome Fallback

- Ceiling grid uses `+`, `-`, `|`
- Fluorescent panels use `=`
- Wall frame uses `#` and `=`
- Wallpaper uses `:` or `%` for texture
- Doorway uses spaces (just an opening in the wall)
- Carpet uses `.` pattern
- Text in **bold** ANSI

```
  +------+-------+-------+-------+-------+-------+------+
  |======|=======|=======|=======|=======|=======|======|
  +------+-------+-------+-------+-------+-------+------+
  |      |       |       |       |       |       |      |
  +------+-------+-------+-------+-------+-------+------+
  |======|=======|=======|=======|=======|=======|======|
  #======================================================#
  #%%%%                                              %%%%#
  #%%%%   **THE**                                    %%%%#
  #%%%%                                              %%%%+
  #%%%%   **BACKLOGS**                               %%%%+
  #%%%%                                              %%%%+
  #%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%  +
  #======================================================#
  #......................................................#
  #.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:.:#
  #======================================================#
```

### Dimensions
- Width: 60 characters
- Height: 19 rows

### Implementation Notes
- **The asymmetric doorway** is the critical design detail. The doorway `╢░░░` break in the right wall must be positioned off-center (vertically) — e.g., rows 11-15 of a 19-row design, leaving more wall above than below. This creates the "wrongness."
- **Ceiling tile grid**: Alternate rows of fluorescent `=` panels and dark `│` spacers. The grid doesn't need to be perfectly even — slight irregularity adds to the liminal feel.
- **Text placement**: "THE" and "BACKLOGS" on separate lines, left-aligned within the room, slightly off-center. NOT centered — as if someone hung a sign and didn't measure.
- **Wallpaper band**: The `▓` characters create a solid yellow mass for the wallpaper. The wall interior (where text appears) is darker/empty — this is the "room" part of the room.
- **Doorway rendering**: A break in the right wall border, filled with near-black `░` characters. It's an invitation: there's more. There's always more.

### Why This Works
This turns the logo into a literal room — and in that room is your backlog. The ceiling tiles, the yellow wallpaper, the carpet — it's the Backrooms. But the text floating in the middle is a task list, a status board, a project name. The doorway says there are more rooms, more backlogs, more work. The slight wrongness (the asymmetry, the off-center text) creates that uncanny feeling: you know this place, you've been in this meeting room, but something is off. That's what a backlog feels like at 11pm.

---

## Concept 5: "The Glitch"

**Tagline:** *Y̷o̵u̶ ̴c̷a̴n̵'̷t̴ ̴c̶l̵o̷s̴e̵ ̴w̵h̷a̷t̶ ̸w̶a̸s̴ ̷n̸e̵v̴e̴r̶ ̶o̷p̵e̸n̸e̶d̵.*

### Mood Board
Corrupting, VHS, disintegrating, liminal-digital, entropic

### Detailed ASCII Sketch

Clean left, progressively glitching right:

```
                                                                    ░▒▓█
  ████████████████████████████████████████████████████████████████▓▓▒░
  ██                                                            ▓▓▒░░
  ██  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄▀ █   █▀█ █▀▀▀ █▀        ▒▒░ ░
  ██   █  █▀█ ██▄   █▀▄ █▀█ █▄▄ █ █ █▄▄ █▄█ █▄▄█ ▄█       ░▒░
  ██                                                     ▒▓░ ░░
  ████████████████████████████████████████████████████▓▓▒▒░░░
                                                  ▓▓▒░░
```

Now with per-character glitch detail and displacement:

```
  ═══════════════════════════════════════════════════▓▓▒▒░░
  ║                                                 ▓▒░  ░░
  ║  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄▀ █   █▀█ █▀▀ █▀░░
  ║   █  █▀█ ██▄   █▀▄ █▀█ █▄▄ █ █ █▄▄ █▄█ █▄█ ▄░▄█
  ║                              ▌       ▄         ░░░
  ║  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ ░▀▀ █▄▀ █   █▀░ ░▀▀ ░▀
  ║   █  █▀█ ██▄   █▀▄ █▀█ ░▄▄ █ █ █▄▄ █▄░ ░▄█ ▄░
  ║                                                  ░░
  ═══════════════════════════════════════════════▓▓▒▒░░░
                                             ▓▒▒░░
```

Fully realized version with glitch zones marked:

```
  ╔══════════════════════════════════════════════════════════╗
  ║                                                     ▒░  ║
  ║  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄▀ █    █▀█  █▀▀  █▀ ░░  ║
  ║   █  █▀█ ██▄   █▀▄ █▀█ █▄▄ █ █ █▄▄ █▄█░ █▄█░ ▄█░     ║
  ║                                 ▀          ▒         ░  ║
  ║  ·····································▒▒▒▒▒▒▒░░░░░░░░░  ║
  ║                                 ░         ▄       ░     ║
  ╚═══════════════════════════════════════════════▓▓▒▒░░░░░══╝
  │  zone: CLEAN   │  zone: DRIFT  │ zone: CORRUPT │VOID│
  │  col 1-25      │  col 26-40    │ col 41-55     │56+ │
```

Detailed breakdown with all visual elements:

```
  ╔══════════════════════════════════════════════════════════════╗
  ║░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▒▒▒░░ ░░ ░ ║
  ║                                                             ║
  ║  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄▀ █    █▀█  █▀▀  █▀         ║
  ║   █  █▀█ ██▄   █▀▄ █▀█ █▄▄ █ █ █▄▄  █▄█  █▄█  ▄█         ║
  ║  ─────────────────────────────────▄──────░──▒▀▀──░░──       ║
  ║  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄▀ █░   █▀░  ░▀░  ░░         ║
  ║   █  █▀█ ██▄   █▀▄ █▀█ █▄▄ █ █ ░▄▄  ░▄█  ░░█  ░░         ║
  ║                                                             ║
  ║░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▓▓▓▓▓▒▒░░ ░░ ░  ░  ║
  ╚══════════════════════════════════════════════════════════════╝
```

Wait — the above is getting confused. Let me do a single, clean, definitive version:

```
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▓▓▒░ ░
  █══════════════════════════════════════════════════════════▓▓▒░░ ░
  █                                                       ▓▒░ ░
  █  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄▀ █   █▀█ █▀▀ █▀    ░▒░ ░
  █   █  █▀█ ██▄   █▀▄ █▀█ █▄▄ █ █ █▄▄ █▄█ █▄█ ▄█   ░░ ░
  █                                                  ▒░ ░
  █══════════════════════════════════════════════▓▓▒▒░░ ░
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▓▓▒▒░░░ ░
```

The key visual elements:
1. A solid frame on the LEFT that degrades rightward
2. The text is fully legible but the CONTAINER dissolves
3. Scattered displaced character fragments in the glitch zone
4. `█▓▒░ ` gradient (full block -> dark shade -> medium shade -> light shade -> space) used throughout for the dissolution effect
5. A VHS "tracking line" (the `═══` bar) also degrades

Enhanced version with ghost echo and tracking lines:

```
  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▓▒░ ░
  █═══════════════════════════════════════════════════▓▒░   ░
  █                                                ▓░  ░
  █  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄▀ █   █▀█ █▀▀ █▀
  █   █  █▀█ ██▄   █▀▄ █▀█ █▄▄ █ █ █▄▄ █▄█ █▄█ ▄█
  █═══════════════════════╤══════════════════╤═══▓▒░   ░
  █                       │    ▀█▀           │ ░  ░
  █  ▀█▀ █ █ █▀▀   █▀▄ ▄▀█ █▀▀ █▄░ █   ░▀█ ░▀░ ░▀
  █   █  █▀█ ██▄   █▀▄ █▀█ █▄▄ ░ █ █▄░ ░▄█ ░░█ ░░
  █═════════════════════════════════════▓▓▒▒░░ ░  ░
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▓▓▒░░░ ░
```

### Color Palette

| Element               | RGB           | ANSI 256 | Role                           |
|-----------------------|---------------|----------|--------------------------------|
| Clean text            | `#ffff88`     | 228      | Bright Backrooms yellow        |
| Clean frame           | `#c4a846`     | 178      | Solid yellow border            |
| Drift text            | `#ccbb55`     | 179      | Slightly off-color text        |
| Drift displacement    | `#ff4444`     | 196      | Red chromatic aberration       |
| Drift displacement 2  | `#4488ff`     | 69       | Blue chromatic aberration      |
| Corrupt text          | `#706830`     | 136      | Fading, dying text             |
| Glitch artifacts      | `#ff0000`     | 196      | Random bright red pixels       |
| VHS tracking line     | `#ffffff`     | 15       | Bright white horizontal noise  |
| Gradient: █           | `#c4a846`     | 178      | Full block (yellow)            |
| Gradient: ▓           | `#8b7a30`     | 136      | Dark shade                     |
| Gradient: ▒           | `#554418`     | 58       | Medium shade                   |
| Gradient: ░           | `#332a10`     | 236      | Light shade (near void)        |
| Ghost echo            | `#2a2818`     | 235      | Faint duplicate of text        |

### Character Set

| Element               | Characters                                |
|-----------------------|-------------------------------------------|
| Block letters         | 2-row pixel font: `▀ █ ▄ ▌ ▐ ▖ ▗ ▘ ▝`   |
| Frame (clean)         | `█ ▄ ▀ ═`                                 |
| Dissolution gradient  | `█ ▓ ▒ ░` (the classic terminal gradient) |
| Tracking lines        | `═ ─ ╤` (horizontal disruptions)          |
| Chromatic aberration   | Displaced copies of chars in red/blue      |
| VHS noise             | Random `▄▀▌▐` in bright white              |
| Ghost echo displaced  | Same text shifted 1 row, very dim          |

### Monochrome Fallback

- The `█▓▒░` gradient works beautifully in monochrome — it's density-based, not color-based
- Chromatic aberration effect is replaced by simple character displacement (shift right by 1-2 cols)
- Ghost echo uses dim/faint ANSI attribute (`\e[2m`)
- Tracking lines remain as `═` or `=`
- Clean zone uses **bold**, corrupt zone uses normal weight, fading zone uses **dim**

```
  ####################################################%%+.  .
  #==================================================%+.   .
  #                                                %+. .
  #  T█T █ █ █EE   █E█ A█A █EE █B█ █   █O█ █EE █S
  #   █  █A█ ██B   █E█ █A█ █BB █ █ █BB █B█ █B█ BS
  #================================================%+. .
  #                                                 +.
  #  T.T . . .EE   ..4 A.A ..E ..  .   ... ... ..
  #   .  ..  ..    ... ..  .   . . ... ... ... ..
  #==========================================%%+..  .
  ####################################%%++...  .
```

### Dimensions
- Width: 62-72 characters
- Height: 11-13 rows

### Implementation Notes
- **The `█▓▒░` gradient** is the star technique. For each row, calculate a "reality health" value from 1.0 (left edge) to 0.0 (right edge). Map this to the block character set. The frame character at each position is `█` if health > 0.75, `▓` if > 0.5, `▒` if > 0.25, `░` if > 0, space if 0.
- **Chromatic aberration**: In the "drift" zone, render the text THREE times at slight offsets — once in red (shifted left 1 col), once in blue (shifted right 1 col), once in yellow (original position). The overlapping creates the VHS color-split effect.
- **Ghost echo**: Render a second copy of the text shifted down 1-2 rows and right 1-3 cols, in a very dim color. This creates the "VHS tracking" duplicate.
- **VHS tracking line**: A horizontal bar of `═` that cuts across rows 5-6, with random bright-white noise pixels scattered along it.
- **The text itself stays readable** — the glitch affects the FRAME and BACKGROUND, with only the rightmost 2-3 letters of "BACKLOGS" getting corrupted. The word is still legible.
- **Per-character randomization**: Use a seeded PRNG for deterministic "random" displacement. The seed should be fixed so the logo looks the same every time.

### Why This Works
The glitch is the moment of noclipping — that instant where you fall through the floor of reality and into the Backrooms. This logo captures that TRANSITION. The left side is your normal world (clean, organized, productive). The right side is where you're going (corrupted, infinite, wrong). And the text — THE BACKLOGS — spans both worlds. It says: your backlog started as something manageable, but it's glitching out, spiraling, breaking. The VHS aesthetic adds a layer of "found footage" — this isn't a logo, it's evidence. Someone recorded this before they disappeared into their backlog forever.

---

## Comparative Analysis

| Aspect              | Corridor | Flickering Sign | Infinite Stack | Level 0 | The Glitch |
|----------------------|----------|-----------------|----------------|---------|------------|
| Immediate Impact     | ★★★★☆    | ★★★★★           | ★★★★☆          | ★★★☆☆   | ★★★★★      |
| Backrooms Reference  | ★★★★★    | ★★★★☆           | ★★★★☆          | ★★★★★   | ★★★☆☆      |
| Backlog Reference    | ★★☆☆☆    | ★★★☆☆           | ★★★★★          | ★★★☆☆   | ★★★★☆      |
| Monochrome Quality   | ★★★☆☆    | ★★★☆☆           | ★★★★★          | ★★★★☆   | ★★★★★      |
| Text Legibility      | ★★★★★    | ★★★★☆           | ★★★★★          | ★★★★★   | ★★★★☆      |
| Implementation Ease  | ★★☆☆☆    | ★★★☆☆           | ★★★★☆          | ★★★☆☆   | ★★★☆☆      |
| Terminal Compat.     | ★★☆☆☆    | ★★★★☆           | ★★★★★          | ★★★☆☆   | ★★★★☆      |
| Uniqueness           | ★★★☆☆    | ★★★★☆           | ★★★★★          | ★★★★☆   | ★★★★☆      |
| Emotional Response   | ★★★★☆    | ★★★★★           | ★★★★★          | ★★★★☆   | ★★★★☆      |

---

## Final Recommendation

**Primary pick: Concept 3 — "The Infinite Stack"**

This is the strongest concept because the metaphor is *structural*, not decorative. The backlog and the Backrooms aren't just visually mashed up — they're revealed to be the SAME THING. Infinite repetition sinking into void. Tasks degrading as they age. The design also has the strongest monochrome fallback (corruption is character-absence, not color-dependent), the best terminal compatibility (2-row pixel font is widely supported), and the most distinctive silhouette. No other CLI tool has a logo that eats itself.

**Secondary pick: Concept 2 — "The Flickering Sign"**

If the Infinite Stack feels too complex, the Flickering Sign is a killer alternative. It's compact (10 rows), immediately readable, deeply atmospheric, and the flickering effect can be tuned from subtle (1 dim letter) to dramatic (half the sign dead). It also has the best "recognition at a glance" factor — it's a sign. Everyone knows what a sign looks like.

**Recommended hybrid**: Take Concept 3's stacking/decay as the main logo, and use Concept 2's flickering sign as a compact "badge" variant for inline use (e.g., `--help` headers, version strings).

---

*Document prepared for The Backlogs creative review.*
*All concepts are implementation-ready pending final direction selection.*
