# ASCII Art Typography & Font Styles Reference

A comprehensive guide to ASCII art typography for logo design, covering
FIGlet fonts, hand-crafted techniques, style comparisons, and custom font
construction.

---

## 1. Classic FIGlet Font Styles

FIGlet (Frank, Ian and Glenn's Letters, 1991) generates text banners from
ordinary text. TOIlet extends it with Unicode box-drawing and color support.

### 1.1 Banner

Simple, clean block letters built from `#` characters. High-impact, maximum
readability. Each letter is 7 lines tall, roughly 8 chars wide.

```
   #    ######  
  # #   #     # 
 #   #  #     # 
#     # ######  
####### #     # 
#     # #     # 
#     # ######  
```

**Character:** Bold, authoritative, classic Unix. Every pixel is a `#`.
**Best for:** System banners, login screens, maximum compatibility.
**Width:** ~8 chars/letter. "LOGO" = 32 cols.

### 1.2 Big

Larger standard block letters using `/`, `\`, `|`, `_` line characters.
More refined than Banner, with diagonal strokes creating shaped letterforms.

```
 _      ____   _____  ____  
| |    / __ \ / ____|/ __ \ 
| |   | |  | | |  __| |  | |
| |   | |  | | | |_ | |  | |
| |___| |__| | |__| | |__| |
|______\____/ \_____|\____/ 
```

**Character:** Clean, professional, structural.
**Best for:** README headers, project logos, CLI tool banners.
**Width:** ~7 chars/letter. "LOGO" = 28 cols.

### 1.3 Block

Filled rectangular letters using `_|` characters. Letters have a distinctly
flat, industrial quality with uniform stroke weight.

```
                    
  _|_|    _|_|_|    
_|    _|  _|    _|  
_|_|_|_|  _|_|_|    
_|    _|  _|    _|  
_|    _|  _|_|_|    
```

**Character:** Modular, geometric, tech-forward.
**Best for:** Developer tools, data processing CLIs.
**Width:** ~10 chars/letter.

### 1.4 Bubble

Rounded, bubbly letterforms. Extremely compact -- each letter enclosed in
parenthetical curves, on a single effective line.

```
  _   _  
 / \ / \ 
( A | B )
 \_/ \_/ 
```

**Character:** Playful, friendly, retro.
**Best for:** Fun tools, chat bots, games.
**Width:** ~4 chars/letter. Very compact.

### 1.5 Digital

LED/7-segment display style. Minimal -- just a bordered grid.

```
+-+-+
|A|B|
+-+-+
```

**Character:** Dashboard, embedded, hardware.
**Best for:** IoT tools, monitoring dashboards, status displays.
**Width:** ~3 chars/letter. Ultra-compact.

### 1.6 Graffiti

Street art inspired, uses slashes and underscores to create an expressive,
angular style with implied spray-paint energy.

```
  ________              _____  _____.__  __  .__ 
 /  _____/___________ _/ ____\/ ____\__|/  |_|__|
/   \  __\_  __ \__  \\   __\\   __\|  \   __\  |
\    \_\  \  | \// __ \|  |   |  |  |  ||  | |  |
 \______  /__|  (____  /__|   |__|  |__||__| |__|
        \/           \/                           
```

(Example: the word "Graffiti" in the graffiti font)

**Character:** Urban, edgy, expressive.
**Best for:** Creative tools, music apps, indie projects.
**Width:** ~10 chars/letter. Wide and dramatic.

### 1.7 Isometric (1-4 variants)

3D perspective fonts using `/` and `\` to create cube-like extruded letters.
FIGlet ships 4 variants (isometric1 through isometric4) offering different
viewing angles and fill densities.

```
      ___           ___     
     /\  \         /\  \    
    /::\  \       /::\  \   
   /:/\:\  \     /:/\:\  \  
  /:/  \:\  \   /::\~\:\__\ 
 /:/__/ \:\__\ /:/\:\ \:|__|
 \:\  \ /:/  / \:\~\:\/:/  /
  \:\  /:/  /   \:\ \::/  / 
   \:\/:/  /     \:\/:/  /  
    \::/  /       \::/__/   
     \/__/         ~~       
```

**Character:** Architectural, dimensional, impressive.
**Best for:** 3D tools, game engines, creative software.
**Width:** ~12 chars/letter. Very wide, tall (10 lines).

### 1.8 Larry 3D

The most popular 3D extrusion font. Creates a strong sense of depth using
backslash fills for shadow surfaces.

```
      __       ____   
     /\ \     /\  _`\ 
     \ \ \    \ \ \L\ \
      \ \ \  __\ \  _ <'
       \ \ \L\ \\ \ \L\ \
        \ \____/ \ \____/
         \/___/   \/___/ 
```

**Character:** Dramatic, eye-catching, retro-3D.
**Best for:** Game titles, entertainment tools, splash screens.
**Width:** ~10 chars/letter, 7 lines tall.

### 1.9 Lean

Italic/slanted variant with `_/` characters creating a forward lean. Similar
to Block but with diagonal emphasis.

```
                        
      _/_/    _/_/_/    
   _/    _/  _/    _/   
  _/_/_/_/  _/_/_/      
 _/    _/  _/    _/     
_/    _/  _/_/_/        
```

**Character:** Dynamic, progressive, modern.
**Best for:** Speed-oriented tools, build systems, CI/CD.
**Width:** ~12 chars/letter.

### 1.10 Compact Options: Mini, Small, Future

**Mini** (3 lines):
```
     _  
 /\ |_) 
/--\|_) 
```

**Small** (4 lines):
```
 _    ___   ___  ___  
| |  / _ \ / __|/ _ \ 
| |_| (_) | (_ | (_) |
|____\___/ \___|\___/ 
```

**Future** (3 lines, Unicode box-drawing):
```
╻  ┏━┓┏━╸┏━┓
┃  ┃ ┃┃╺┓┃ ┃
┗━╸┗━┛┗━┛┗━┛
```

**Character:** Space-efficient, inline-friendly.
**Best for:** Subtitles, secondary text, narrow terminals, `--version` output.
**Width:** Mini ~4, Small ~5, Future ~4 chars/letter.

### 1.11 Shadow

Letters with a drop shadow effect, created by offsetting character strokes.
Uses `\`, `)`, `_` for the shadow plane.

```
    \    __ )  
   _ \   __ \  
  ___ \  |   | 
_/    _\____/  
```

**Character:** Depth, emphasis, polished.
**Best for:** Professional CLIs, release banners.
**Width:** ~7 chars/letter, 5 lines.

### 1.12 Slant

Italic block letters using `/`, `|`, `_`. Forward-leaning with structural
clarity. One of the most popular FIGlet fonts.

```
    ___    ____ 
   /   |  / __ )
  / /| | / __  |
 / ___ |/ /_/ / 
/_/  |_/_____/  
```

**Character:** Dynamic, technical, confident.
**Best for:** Build tools, compilers, development CLIs. Extremely popular.
**Width:** ~8 chars/letter, 6 lines.

### 1.13 Speed

Motion/racing feel with horizontal streaks suggesting velocity. Typically
achieved with extended horizontal lines and trailing dashes.

```
 _______  _____   _____  _____  ____  
/ ____\ \/ / _ \ / ____||  __ \|  _ \ 
\_____ \\  / ___/| |___ | |  | | | | |
 ____) |/ /\ \__|  ___| | |__| | |_| |
|_____//_/  \___||_____|_|_____/|____/ 
```

(Approximation -- actual Speed font extends horizontal strokes)

**Character:** Fast, aggressive, competitive.
**Best for:** Performance tools, benchmarks, racing/gaming.
**Width:** ~10 chars/letter.

### 1.14 Standard (Default)

The default FIGlet font. Clean, well-proportioned letters using `|`, `/`,
`\`, `_`. The gold standard of ASCII art text.

```
 _     ___   ____  ___  
| |   / _ \ / ___|/ _ \ 
| |  | | | | |  _| | | |
| |__| |_| | |_| | |_| |
|_____\___/ \____|\___/ 
```

**Character:** Balanced, readable, universal.
**Best for:** Everything. The safe default choice.
**Width:** ~6 chars/letter, 6 lines.

### 1.15 ANSI Shadow

Modern, clean font with shadow effect. Popular in modern CLI tools. Uses
Unicode block characters for smoother fills. Often seen in tools like
neofetch.

```
 █████╗ ██████╗ 
██╔══██╗██╔══██╗
███████║██████╔╝
██╔══██║██╔══██╗
██║  ██║██████╔╝
╚═╝  ╚═╝╚═════╝ 
```

**Character:** Modern, polished, high-contrast.
**Best for:** Modern CLI tools, dev dashboards, neofetch-style output.
**Width:** ~9 chars/letter, 6 lines.

### 1.16 Bloody

Horror/dripping style with jagged edges suggesting dripping blood or
corroded metal. Uses unusual character combinations.

```
 ▄▄▄▄    ██▓     ▒█████   ▒█████  ▓█████▄ ▓██   ██▓
▓█████▄ ▓██▒    ▒██▒  ██▒▒██▒  ██▒▒██▀ ██▌ ▒██  ██▒
▒██▒ ▄██▒██░    ▒██░  ██▒▒██░  ██▒░██   █▌  ▒██ ██░
▒██░█▀  ░██░    ▒██   ██░▒██   ██░░▓█▄   ▌  ░ ▐██▓░
░▓█  ▀█▓░██████▒░ ████▓▒░░ ████▓▒░░▒████▓   ░ ██▒▓░
░▒▓███▀▒░ ▒░▓  ░░ ▒░▒░▒░ ░ ▒░▒░▒░  ▒▒▓  ▒   ██▒▒▒ 
```

**Character:** Horror, intense, grungy.
**Best for:** Horror games, hacking tools, security/pentesting CLIs.
**Width:** ~10 chars/letter, 6 lines.

### 1.17 Calvin S

Clean, serif-like letterforms. Compact and elegant with good readability.

```
╔═╗╔═╗╦ ╦  ╦╦╔╗╔
║  ╠═╣║ ╚╗╔╝║║║║
╚═╝╩ ╩╩═╝╚╝ ╩╝╚╝
```

**Character:** Clean, elegant, structured.
**Best for:** Professional tools, config display headers.
**Width:** ~4 chars/letter, 3 lines. Very efficient.

### 1.18 Cyberlarge / Cybermedium / Cybersmall

Retro-tech family at three sizes. Blocky, angular, suggesting early
computer terminals and cyberpunk aesthetics.

**Cyberlarge** (~5 lines):
```
 _______ ______  
|   _   |   __ \ 
|.  |   |   __ < 
|.  _   |______/ 
|:  |   |        
|::.|:. |        
`--- ---'        
```

**Cybermedium** (~4 lines):
```
 ____ ____ 
|    |  _ \
|    |    <
|____|__\__\
```

**Cybersmall** (~3 lines):
```
 _  _  
|_||_) 
| ||_) 
```

**Character:** Retro-tech, cyberpunk, terminal nostalgic.
**Best for:** Retro computing tools, cyberpunk-themed projects, terminal emulators.

### 1.19 DOS Rebel

Chunky retro style reminiscent of DOS-era BBS art. Thick, heavy strokes
using extended characters.

```
██████╗  ██████╗ ███████╗
██╔══██╗██╔═══██╗██╔════╝
██║  ██║██║   ██║███████╗
██║  ██║██║   ██║╚════██║
██████╔╝╚██████╔╝███████║
╚═════╝  ╚═════╝ ╚══════╝
```

**Character:** Heavy, retro, BBS-era nostalgia.
**Best for:** Retro tools, BBS-inspired projects, demoscene.
**Width:** ~9 chars/letter, 6 lines.

### 1.20 Electronic

Circuit-board feel with thin, precise lines suggesting PCB traces
and electronic schematics.

```
 ▄▄▄▄▄▄▄ ▄▄▄▄▄▄  
█       █      █ 
█   ▄   █  ▄   █ 
█  █ █  █ █▄█  █ 
█  █▄█  █      █ 
█       █  ▄   █ 
█   ▄   █ █▄█  █ 
▀▄▄▄▄▄▄▄▀▄▄▄▄▄▄▀ 
```

**Character:** Technical, precise, engineering.
**Best for:** EDA tools, hardware projects, embedded systems.

### 1.21 Pagga (Bonus -- block element style)

Uses Unicode block elements (`░▀▄█`) for filled, chunky pixel art letters.

```
░█░░░█▀█░█▀▀░█▀█
░█░░░█░█░█░█░█░█
░▀▀▀░▀▀▀░▀▀▀░▀▀▀
```

**Character:** Pixel-art, retro gaming, 8-bit.
**Best for:** Game tools, pixel art editors, retro-themed CLIs.
**Width:** ~4 chars/letter, 3 lines.

### 1.22 Script

Flowing, calligraphic letterforms attempting cursive in ASCII.

```
  ___,  , __ 
 /   | /|/  \
|    |  | __/
|    |  |   \
 \__/\_/|(__/
```

**Character:** Elegant, formal, decorative.
**Best for:** Invitations, artistic tools, personal projects.

---

## 2. Hand-Crafted Style Categories

These styles don't rely on FIGlet and are typically designed by hand for
specific projects.

### 2.1 Outline Only

Letters made with just edges using box-drawing or `/\|_` characters.
The interior of each letter is empty.

**Using box-drawing characters:**
```
╔═╗  ╔╗ 
╠═╣  ╠╩╗
╩ ╩  ╚═╝
```

**Using ASCII only:**
```
    /\      ____  
   /  \    |  _ \ 
  / /\ \   | |_) |
 / ____ \  |  _ < 
/_/    \_\ |_| \_\
```

**Using thin strokes:**
```
 ___    ___  
/   \  | _ ) 
| - |  | _ \ 
|_|_|  |___/ 
```

**Characteristics:** Clean, lightweight, low visual noise.
**Technique:** Use only border characters, leave interiors as spaces.
**Best for:** Minimalist tools, terminals with limited rendering.

### 2.2 Stencil

Letters with deliberate gaps/breaks, as if painted through a physical
stencil. The breaks prevent enclosed areas from falling out.

```
 /\     |_) 
/--\ .  |_) .
         
(Note the dots represent stencil breaks)
```

**More elaborate stencil example:**
```
 ____  _____  ____  _  _  ____  __  __   
/ ___||_   _|| ___|| \| |/ ___||  ||  |  
\___ \  | |  | _|  |    || |   |  ||  |_ 
|____/  |_|  |___| |_|\_| \___||__||____|
        ^gaps in closed forms like O, B, D
```

**Characteristics:** Military, industrial, utility.
**Technique:** Break any enclosed counter (inside of O, B, D, P, etc.)
with a gap. The break is typically at the top or right side.
**Best for:** Military tools, industrial applications, stencil-themed brands.

### 2.3 Pixel / Bitmap

Minimal blocky pixel art using `#`, `*`, `█`, or similar characters.
Each "pixel" is one character cell.

**5x5 pixel font:**
```
 ##  ###
#  # #  #
#### ###
#  # #  #
#  # ###
```

**3x5 ultra-minimal:**
```
## ###
# ##  #
## ###
# ##  #
# ####
```

**Using block characters for smoother pixels:**
```
▓▓░ ▓▓▓░
▓░▓ ▓░░▓
▓▓▓ ▓▓▓░
▓░▓ ▓░░▓
▓░▓ ▓▓▓░
```

**Characteristics:** Retro, 8-bit, nostalgic, game-like.
**Technique:** Design on a fixed grid (3x5, 4x6, 5x7). Each cell is on/off.
Best drawn on graph paper first.
**Best for:** Retro games, pixel art tools, chiptune players.

### 2.4 Serif vs Sans-Serif

Serifs in ASCII are small horizontal strokes added to the tops and
bottoms of vertical strokes.

**Sans-serif (no serifs):**
```
 _    ___ 
| |  | _ )
| |_ | _ \
|___||___/
```

**Serif (with serifs via horizontal extensions):**
```
  _       ___  
 | |     | _ ) 
 | |     | _ \ 
_| |_   _|___/ 
|_____|  |_____|
```

**Technique to add serifs:**
- Add `_` below baseline at the bottom of vertical strokes
- Add small horizontal bars `_` at the top of strokes
- Widen the feet of letters with extra `_` or `=` characters
- Compare: sans `|` vs serif `_|_`

**Prominent serif examples:**
```
Sans:  |    Serif:  _|_
       |            |
       |           _|_

Sans:  _    Serif:  ___
      |_|          |   |
      | |          |___|
```

### 2.5 Script / Cursive

Flowing connected letterforms. This is the hardest ASCII typography
style -- true cursive requires letters to connect.

**Simple script-like:**
```
  __    _  
 /  |  / ) 
( _ | / _ \
 \_)|_\___/
```

**Connected cursive attempt (word "Hello"):**
```
 _   _        __   __          
| | | |  ___ |  | |  |  ___   
| |_| | / _ \| |  | |  / _ \  
|  _  ||  __/| |_ | |_| (_) | 
|_| |_| \___||___||___|\___/  
         ^--- connecting strokes
```

**Techniques for cursive:**
- Use `_` as connecting baseline between letters
- Use `~` for wavy connections: `~Hello~`
- Lean letters rightward (like Slant font) and add connecting strokes
- Accept that true cursive in monospace is an approximation at best

### 2.6 Monoline

Single-character-width strokes. Every line in the letter is exactly
1 character wide. This is actually the default for most FIGlet fonts.

**Strict monoline:**
```
/\  |_)
/--\|_)
```

**vs. multi-weight (thick strokes):**
```
 ####  #####
#    # #    #
###### #####
#    # #    #
#    # #####
```

**Technique:** Only use characters that represent single lines:
`/ \ | _ - ( )`. Never double up characters for thickness.
**Best for:** Minimalist logos, elegant tools, narrow terminals.

### 2.7 Dotted / Braille

Using Unicode braille patterns (U+2800..U+28FF) for smooth, high-resolution
letterforms. Each character cell becomes a 2x4 pixel grid, giving 2x
horizontal and 4x vertical resolution compared to regular characters.

**Braille pattern letterforms:**
```
 ⣎⣱ ⣏⡱
 ⠇⠸ ⠧⠜
```

**Higher-resolution braille text (word "Hi"):**
```
⡇⡇⢰⠁
⠧⠇⠸⠁
```

**Smooth curves example (circle):**
```
⠀⣠⣴⣶⣶⣦⣄⠀
⣰⣿⣿⣿⣿⣿⣿⣆
⣿⣿⣿⣿⣿⣿⣿⣿
⠹⣿⣿⣿⣿⣿⣿⠏
⠀⠙⠻⢿⡿⠟⠋⠀
```

**Key braille characters:**
- `⠀` (U+2800) = blank (no dots)
- `⣿` (U+28FF) = all 8 dots filled
- `⡇` = left column filled
- `⢸` = right column filled
- `⠉` = top row filled
- `⣀` = bottom row filled

**Technique:** Each braille character encodes an 8-dot cell:
```
Dot positions:    Bit values:
  1 4              0x01  0x08
  2 5              0x02  0x10
  3 6              0x04  0x20
  7 8              0x40  0x80
```
Codepoint = 0x2800 + sum of bit values for raised dots.

**Best for:** High-resolution terminal graphics, smooth logos, modern CLI art.
**Caveat:** Requires Unicode support and a font with braille glyphs.

---

## 3. Style Comparison for Logo Use

### 3.1 Width Requirements by Style

| Style          | Chars/Letter | "MYAPP" Width | Best Terminal |
|----------------|-------------|---------------|---------------|
| Digital        | ~3          | ~15 cols      | 40-col        |
| Bubble         | ~4          | ~20 cols      | 40-col        |
| Mini           | ~4          | ~20 cols      | 40-col        |
| Future         | ~4          | ~20 cols      | 40-col        |
| Pagga          | ~4          | ~20 cols      | 40-col        |
| Calvin S       | ~4          | ~20 cols      | 40-col        |
| Small          | ~5          | ~25 cols      | 40-col        |
| Standard       | ~6          | ~30 cols      | 40-80 col     |
| Shadow         | ~7          | ~35 cols      | 40-80 col     |
| Slant          | ~8          | ~40 cols      | 80-col        |
| Big            | ~7          | ~35 cols      | 80-col        |
| Banner         | ~8          | ~40 cols      | 80-col        |
| Block          | ~10         | ~50 cols      | 80-col        |
| ANSI Shadow    | ~9          | ~45 cols      | 80-col        |
| Larry 3D       | ~10         | ~50 cols      | 80-120 col    |
| Lean           | ~12         | ~60 cols      | 80-120 col    |
| Isometric      | ~12         | ~60 cols      | 120-col       |
| Bloody         | ~10         | ~50 cols      | 80-120 col    |

**Rule of thumb:** Divide your terminal width by the chars/letter to find
the maximum word length that will fit on one line.

### 3.2 Readability Ranking

Most readable to least:

1. **Standard** -- balanced proportions, familiar shapes
2. **Big** -- like Standard but larger, clear at a distance
3. **Small** -- excellent readability for its compact size
4. **Banner** -- simple `#` blocks, unambiguous but dense
5. **Slant** -- dynamic but clear
6. **ANSI Shadow** -- modern, high-contrast
7. **Future** -- clean lines, compact
8. **Block** -- `_|` takes getting used to
9. **Pagga** -- pixel art style requires a beat to parse
10. **Shadow** -- offset can confuse at first glance
11. **Larry 3D** -- decorative, slower to read
12. **Lean** -- the diagonal can confuse similar letters
13. **Isometric** -- beautiful but slow to read
14. **Bloody** -- deliberately hard to read (thematic)
15. **Script** -- cursive is always hardest in monospace

### 3.3 Mood/Tone by Style

| Mood           | Recommended Styles                          |
|----------------|---------------------------------------------|
| **Professional** | Standard, Big, Small, Shadow, Calvin S     |
| **Modern/Clean** | ANSI Shadow, Future, Block                 |
| **Playful**      | Bubble, Pagga, Mini, Script                |
| **Aggressive**   | Bloody, Banner, DOS Rebel                  |
| **Retro**        | Banner, Cyberlarge, Pagga, Digital         |
| **Futuristic**   | Future, Electronic, Block, Lean            |
| **Elegant**      | Script, Shadow, Slant, Larry 3D            |
| **Technical**    | Slant, Standard, Digital, Electronic       |
| **Hacker/Edgy**  | Bloody, Graffiti, Lean, DOS Rebel          |
| **Minimal**      | Mini, Small, Future, Calvin S, Digital     |
| **Impressive**   | Isometric, Larry 3D, ANSI Shadow, Bloody   |

### 3.4 Combining Styles: Title + Subtitle

Pair a large decorative title font with a compact subtitle font:

```
    ___    ____  ____ 
   /   |  / __ \/ __ \
  / /| | / /_/ / /_/ /
 / ___ |/ ____/ ____/ 
/_/  |_/_/   /_/      
         a package manager
```

**Effective pairings:**

| Title Font     | Subtitle Font | Effect                    |
|----------------|---------------|---------------------------|
| Standard       | Small         | Professional, balanced    |
| Slant          | Mini          | Dynamic, compact          |
| ANSI Shadow    | Future        | Modern, cohesive          |
| Larry 3D       | Small         | Dramatic title, clear sub |
| Banner         | (plain text)  | Classic Unix style        |
| Big            | Calvin S      | Authoritative             |
| Pagga          | Future        | Retro-modern fusion       |

**Alignment tip:** Center or left-align the subtitle under the title.
Add 1 blank line between title and subtitle. Indent subtitle to align
with the visual left edge of the title (not column 0).

---

## 4. Custom Font Construction Tips

### 4.1 Designing a Consistent Custom Alphabet

**Step 1: Choose your character palette**

Pick a limited set of building-block characters and stick with them:

| Palette Name | Characters                | Feel           |
|-------------|---------------------------|----------------|
| Pure ASCII   | `/ \ | _ - ( ) < >`      | Universal      |
| Extended     | `/ \ | _ ═ ║ ╔ ╗ ╚ ╝`   | Structured     |
| Block        | `█ ▀ ▄ ▌ ▐ ░ ▒ ▓`       | Heavy, filled  |
| Box-line     | `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼` | Clean, precise |
| Rounded      | `╭ ╮ ╯ ╰ │ ─`           | Soft, modern   |
| Braille      | `⠀` through `⣿`          | High-res       |

**Step 2: Define your grid**

Choose a fixed cell size for each character (width x height):

| Grid   | Use Case                     | Example         |
|--------|------------------------------|-----------------|
| 3x3    | Ultra-compact, icon-like     | `Mini`-level    |
| 4x5    | Good readability, compact    | `Small`-level   |
| 5x6    | Standard balance             | `Standard`-like |
| 6x7    | Comfortable, detailed        | `Big`-like      |
| 8x8    | Full detail, wide            | `Banner`-like   |
| 10x10+ | Decorative, display          | `Larry 3D`-like |

**Step 3: Design the key reference characters first**

Start with these 8 characters to establish the style:

```
H  -- establishes vertical strokes and crossbar
O  -- establishes curves/corners  
A  -- establishes diagonals and apex
E  -- establishes horizontal strokes
I  -- establishes minimum width
W  -- establishes maximum width
g  -- establishes descenders (if lowercase)
1  -- establishes numeral style
```

Everything else derives from these. Once H, O, A, E work together,
the rest of the alphabet follows naturally.

### 4.2 Maintaining Baseline, Cap Height, x-Height

In a 6-line font (like Standard), the anatomy is:

```
Line 1:  ___        <- Ascender line (top of tall letters)
Line 2: |   |       <- Cap height (top of uppercase)
Line 3: |___|       <- x-height (top of lowercase, crossbar zone)
Line 4: |   |       <- mid zone
Line 5: |___|       <- Baseline (bottom of most letters)
Line 6:   |         <- Descender line (bottom of g, p, q, y)
```

**Rules:**
- All uppercase letters should touch lines 1-5 (or 2-5)
- All lowercase should occupy lines 3-5 (with ascenders to 1, descenders to 6)
- Numbers typically align with uppercase
- Consistent baseline is the MOST important alignment

**Common mistake:** Letting different letters float at different vertical
positions. Always anchor to the baseline.

### 4.3 Letter Spacing and Kerning

**Default spacing:** 1 column of space between letters.

```
GOOD:  |_| |_|     (1-col gap)
BAD:   |_||_|      (0-col gap, letters merge)
BAD:   |_|   |_|   (3-col gap, too loose)
```

**Kerning pairs:** Some letter pairs need tighter or looser spacing:

| Pair | Adjustment | Reason                              |
|------|-----------|--------------------------------------|
| AV   | Tighten   | Diagonals create natural whitespace  |
| AT   | Tighten   | T's crossbar covers A's right side   |
| LT   | Tighten   | L's baseline + T's top = big gap     |
| WA   | Tighten   | Same as AV                           |
| OO   | Default   | Curves nestle naturally              |
| II   | Widen     | Two thin letters look cramped        |
| rn   | Widen     | Can be mistaken for "m"              |

**FIGlet kerning modes:**
- **Full-width:** Fixed spacing, no adjustment (-W flag)
- **Fitted:** Remove excess whitespace (-k flag)
- **Smushed:** Letters overlap/share characters (default) -- e.g., `_|_|` 
  where the middle `|` is shared

**Smushing rules (FIGlet spec):**
1. Equal character smushing: `| + |` = `|`
2. Underscore smushing: `_ + /` = `/`
3. Hierarchy smushing: `| + /` = `/` (slashes win over pipes)
4. Opposite pair smushing: `[ + ]` = `|`
5. Big X smushing: `\ + /` = `X` or `Y` or `V`
6. Hardblank smushing: `$ + $` = `$` (special spacing char)

### 4.4 Creating a Cohesive Set from Key Characters

If you only need a few characters (e.g., for a specific project name),
you can build a mini font:

**Method: The "need-only" approach**

1. Write out the unique letters in your project name
2. Design each letter individually at your chosen grid size
3. Test them together, adjust kerning
4. Verify visual consistency

**Example: Designing "FLUX" in a custom style**

Step 1 -- sketch individual letters:
```
F:       L:       U:       X:
╭──      │        │   │    ╲   ╱
├──      │        │   │     ╳  
│        ╰──      ╰───╯    ╱ ╲ 
```

Step 2 -- combine and test:
```
╭──  │      │   │  ╲   ╱
├──  │      │   │   ╳  
│    ╰──    ╰───╯  ╱ ╲ 
```

Step 3 -- adjust spacing and refine:
```
╭──╴ │     │   │  ╲ ╱
├──  │     │   │   ╳
│    ╰───  ╰───╯  ╱ ╲
```

**Consistency checklist:**
- [ ] All verticals use the same character (`│` or `|`, not mixed)
- [ ] All horizontals use the same character (`─` or `-` or `_`)
- [ ] All corners use the same style (`╭╮╯╰` or `┌┐└┘` or `/\`)
- [ ] Letter heights are uniform
- [ ] Stroke weight is consistent (all thin or all thick, not mixed)
- [ ] Visual density is even (no letter looks obviously heavier/lighter)
- [ ] Spacing between letters is consistent

---

## 5. Quick Reference: Character Building Blocks

### 5.1 Pure ASCII (7-bit safe)

```
Verticals:    | ! : 
Horizontals:  _ - = ~
Diagonals:    / \
Corners:      (top-left) /  (top-right) \  (bot-left) \  (bot-right) /
Fills:        # @ * X O 0
Light fills:  . : ; , '
```

### 5.2 Unicode Box Drawing

```
Light:   ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼
Heavy:   ━ ┃ ┏ ┓ ┗ ┛ ┣ ┫ ┳ ┻ ╋
Double:  ═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬
Rounded: ╭ ╮ ╯ ╰
Dashed:  ┄ ┅ ┆ ┇ ┈ ┉ ┊ ┋
Half:    ╴ ╵ ╶ ╷ (light)  ╸ ╹ ╺ ╻ (heavy)
Diagonal: ╱ ╲ ╳
```

### 5.3 Block Elements

```
Full:    █
Halves:  ▀ (upper) ▄ (lower) ▌ (left) ▐ (right)
Eighths: ▁ ▂ ▃ ▅ ▆ ▇ (lower) ▉ ▊ ▋ ▍ ▎ ▏ (left)
Shades:  ░ (light) ▒ (medium) ▓ (dark)
Quadrant: ▖ ▗ ▘ ▙ ▚ ▛ ▜ ▝ ▞ ▟
```

### 5.4 Density Scale (lightest to heaviest)

```
 .  :  -  +  *  #  @  █
 
Useful for shading, gradients, or choosing fill weight:
░▒▓█  or  .:;+#@
```

---

## 6. Practical Recipe: Creating a Project Logo

1. **Choose your word.** Keep it short (4-8 chars ideal).
2. **Choose your mood** from Section 3.3.
3. **Check your terminal width** and pick a font from Section 3.1 that fits.
4. **Generate with FIGlet/TOIlet** as a starting point:
   ```
   figlet -f slant "MyApp"
   toilet -f future "MyApp"
   ```
5. **Customize:** Edit the output by hand -- adjust spacing, fix specific
   letters, add decorative elements.
6. **Add a border** (optional):
   ```
   ╔══════════════════════════╗
   ║   _____         _____   ║
   ║  / ____|       / ____|  ║
   ║ | (___   ___  | (___    ║
   ║  \___ \ / _ \  \___ \   ║
   ║  ____) | (_) | ____) |  ║
   ║ |_____/ \___/ |_____/   ║
   ╚══════════════════════════╝
   ```
7. **Add subtitle** in a compact font.
8. **Test** at your target terminal width. Resize to check wrapping.
9. **Embed** as a raw string in your source code, or load from a text file.
