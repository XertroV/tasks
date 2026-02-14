# Level One -- Enhanced Design Synthesis

**Synthesized:** 2026-02-14
**Builds on:** Level Zero synthesis (Grid Collapse + Threshold Protocol + Poolrooms)
**Incorporates:** Departure Board (E14), Shift Log (E15), Analog Tape Log (#3), Somnography Lab (D14), Condemned Property (D15)
**Purpose:** Production-ready design specification for "The Backlogs" documentation site. Dark-primary. Interactive. Way over the top.

---

## 1. Concept Name

**"Sublevel Zero"**

---

## 2. Vibe Statement

A dark, tiled institutional corridor maintained by a bureaucracy that files every procedure in triplicate -- the fluorescent tubes flicker, the split-flap directory clatters into position, the thermal printer spits out status updates nobody collects, and the deeper you read, the more the grout cracks, the water seeps through, and the classification stamps start disagreeing with each other.

---

## 3. Conceptual Foundation

Sublevel Zero inherits the three-pillar structure from Level Zero and folds in the strongest ideas from the freeform concepts:

### Pillar 1: The Decay Mechanic (from Grid Collapse #11)

The documentation begins as a pristine, rigorous system and progressively corrupts at deeper navigation levels. A single CSS custom property (`--page-decay: 0..1`) drives all visual degradation: tile grout darkening, heading skew, caustic light intensity, classification text mutation, scan line opacity. This is the **structural narrative** -- deeper docs = less stable reality. Level One inherits this unchanged from Level Zero; it remains the conceptual backbone.

### Pillar 2: The Institutional Voice (from Threshold Protocol #4 + Memo from Nowhere #12)

Every page is a procedural document filed by "Liminal Systems Inc." The Protocol Header, classification stamps, redaction bars, and formal section numbering create a worldbuilding layer. Level One inherits this from Level Zero but **darkens it** -- the institutional voice now lives in a dark-primary environment, shifting from "government report on a desk" to "procedural display terminal in a sub-basement monitoring room." Staatliches stamp text glows faintly. Classification headers use phosphor-influenced colors.

### Pillar 3: The Material World (from Poolrooms #8 + Shift Log E15)

The tile-grid aesthetic and aquatic color language provide the physical environment. Level One evolves the material story: in dark mode, the tile grid is visible as faint phosphor lines on a dark substrate (like a monitoring display overlaid on a tile wall). The caustic light shimmer becomes more prominent in dark mode -- luminous aqua refracting through darkness. From Shift Log, the **thermal printer receipt** texture is folded into code blocks, creating a warm-paper-on-dark-void contrast that is both novel and highly readable.

### New Element: The Split-Flap Apparatus (from Departure Board E14)

The split-flap character animation is the single most viscerally satisfying interactive idea across all 18 concepts. Level One adopts it as a **signature interactive component** for page title reveals. The mechanical, clattering quality of Solari boards maps perfectly to the institutional setting -- this is the building's internal status display, and it clicks into position every time you arrive at a new page. The warm amber LED palette from Departure Board is integrated as a secondary accent color for status indicators and interactive feedback.

### New Element: The Monitoring Overlay (from Analog Tape Log #3 + Somnography Lab D14)

The scroll-reactive OSD bar concept from Analog Tape Log and the EEG trace concept from Somnography Lab combine into a lightweight **monitoring telemetry** layer. Instead of a full VHS OSD or polysomnograph, Level One uses a thin status indicator in the Protocol Header that responds to scroll position and page depth -- a subtle signal that the system is watching, the instruments are running, and the readings are not normal.

---

## 4. Full Palette

### Dark Mode (Primary)

| Token | Hex | Role |
|---|---|---|
| `--lz-bg` | `#0C1018` | Primary background -- deep blue-black void, the Backrooms at night |
| `--lz-surface` | `#141A24` | Content card surface -- dark panel, slightly blue |
| `--lz-surface-alt` | `#1A222E` | Secondary surface -- sidebar, filing area, monitoring panel |
| `--lz-surface-raised` | `#202A36` | Hover/active state surface -- elevated panel |
| `--lz-text` | `#D4D0C4` | Primary text -- warm cream on dark, phosphor-tinged |
| `--lz-text-muted` | `#7A7868` | Secondary text -- faded carbon copy |
| `--lz-text-far` | `#4A4A42` | Decorative/distant text -- breadcrumb ancestors, ghost text |
| `--lz-accent` | `#D44838` | Primary accent -- institutional red, stamps, active indicators |
| `--lz-accent-low` | `rgba(212, 72, 56, 0.10)` | Red glow for callouts, hover states |
| `--lz-accent-secondary` | `#5B8FD4` | Institutional blue -- links, protocol IDs, classification headers |
| `--lz-accent-amber` | `#F0B830` | LED amber -- status indicators, split-flap accent, interactive feedback |
| `--lz-accent-amber-dim` | `#806020` | Dimmed amber -- inactive LEDs, secondary amber |
| `--lz-accent-amber-glow` | `rgba(240, 184, 48, 0.15)` | Amber LED bleed for hover/focus halos |
| `--lz-tile-grout` | `#1E2838` | Tile grid lines -- visible on dark as faint phosphor |
| `--lz-tile-accent` | `#162838` | Subtle tile color band for section dividers |
| `--lz-code-bg` | `#080C14` | Code block background -- deepest void |
| `--lz-code-border` | `#1E2838` | Code block border |
| `--lz-border` | `#1E2430` | General structural borders |
| `--lz-stamp-red` | `rgba(212, 72, 56, 0.25)` | Rubber stamp impression |
| `--lz-classified` | `#5B8FD4` | Protocol/classification header color |
| `--lz-caustic` | `rgba(0, 200, 240, 0.04)` | Caustic shimmer base (multiplied by decay) |
| `--lz-receipt-paper` | `#F0EBD8` | Thermal receipt paper for code block variant |
| `--lz-receipt-ink` | `#1A1816` | Thermal receipt ink |
| `--lz-receipt-fade` | `#B0A890` | Faded thermal text |
| `--lz-scan-line` | `rgba(255, 255, 255, 0.02)` | CRT scan line overlay |

### Light Mode (Secondary -- "Lights On")

| Token | Hex | Role |
|---|---|---|
| `--lz-bg` | `#F2F0EA` | Institutional tile white -- dry, warm, fluorescent-lit |
| `--lz-surface` | `#FAFAF6` | Content card surface -- fresh document paper |
| `--lz-surface-alt` | `#ECEAE4` | Secondary surface -- filing cabinet, sidebar |
| `--lz-surface-raised` | `#FFFFFF` | Hover/active -- elevated, brightest |
| `--lz-text` | `#1A1A1E` | Primary text -- typewriter ink |
| `--lz-text-muted` | `#6B6968` | Secondary text |
| `--lz-text-far` | `#A0A09A` | Decorative/distant |
| `--lz-accent` | `#C23828` | Institutional red |
| `--lz-accent-low` | `rgba(194, 56, 40, 0.06)` | Red tint |
| `--lz-accent-secondary` | `#1A3A5C` | Navy blue |
| `--lz-accent-amber` | `#D89818` | Amber in daylight -- less luminous |
| `--lz-accent-amber-dim` | `#A07810` | Dim amber |
| `--lz-accent-amber-glow` | `rgba(216, 152, 24, 0.10)` | Amber glow |
| `--lz-tile-grout` | `#D4D0C8` | Tile grid lines -- warm gray |
| `--lz-tile-accent` | `#C8D8E0` | Tile accent band |
| `--lz-code-bg` | `#F0EFEA` | Code block background |
| `--lz-code-border` | `#D0CFC8` | Code block border |
| `--lz-border` | `#C8C7C3` | Structural borders |
| `--lz-stamp-red` | `rgba(194, 56, 40, 0.30)` | Stamp |
| `--lz-classified` | `#1A3A5C` | Classification header |
| `--lz-caustic` | `rgba(184, 232, 255, 0.03)` | Caustic shimmer (subtler in light) |
| `--lz-receipt-paper` | `#F0EBD8` | Thermal receipt (same in both modes) |
| `--lz-receipt-ink` | `#1A1816` | Receipt ink |
| `--lz-scan-line` | `transparent` | No scan lines in light mode |

### Decay Tokens (driven by `--page-decay`)

These compute dynamically. They are the same custom properties in both modes; only the base colors they reference differ.

| Token | Formula | Effect |
|---|---|---|
| `--page-decay` | `0` (injected per page, range 0.0--0.7) | Master decay factor |
| `--lz-decay-stain` | `rgba(0, 140, 180, calc(var(--page-decay) * 0.06))` in dark; `rgba(180, 210, 228, calc(var(--page-decay) * 0.05))` in light | Water-damage stain overlay |
| `--lz-decay-caustic-intensity` | `calc(var(--page-decay) * 0.05)` | Caustic animation opacity multiplier |
| `--lz-decay-grout-shift` | `calc(var(--page-decay) * -12)` | Grout color hue shift (blue-ward) |
| `--lz-decay-heading-skew` | `calc(var(--page-decay) * -0.25deg)` | Heading underline/border skew |
| `--lz-decay-grid-drift` | `calc(var(--page-decay) * 2px)` | Background tile grid position drift |
| `--lz-decay-scan-intensity` | `calc(0.02 + var(--page-decay) * 0.03)` | Scan line opacity increase with depth |
| `--lz-decay-flicker-chance` | `calc(var(--page-decay) * 0.4)` | Controls whether page title animation glitches |

---

## 5. Typography

| Role | Font | Weight | Rationale |
|---|---|---|---|
| **Display** | [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) | 400 | Condensed all-caps Swiss poster type. Used for `<h1>` hero text, the Corruption Index, and split-flap character cells. Rigid institutional authority at surface level. ~20KB. |
| **Heading** | [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville) | 700 | Institutional serif for page titles (`<h1>`) and `<h2>`. Government report authority. Warm and readable. ~60KB (400+700). |
| **Body** | [Archivo](https://fonts.google.com/specimen/Archivo) | 400, 600 | Rational grotesque for all body text. Clean, wide weight range. Excellent readability at 16-17px. Not trendy. ~40KB. |
| **Mono** | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | 400 | Precise geometric monospace for code blocks. Slight rounding harmonizes with tile aesthetic. ~50KB. |
| **Stamp** | [Staatliches](https://fonts.google.com/specimen/Staatliches) | 400 | Compressed uppercase institutional display. Classification labels, protocol IDs, stamps. Small doses only. ~15KB. |
| **Status** | [Saira Condensed](https://fonts.google.com/specimen/Saira+Condensed) | 600 | Transit display typeface for the split-flap component and status indicators. Tall x-height, narrow width. Used exclusively within interactive components. ~25KB. |

**Total font budget:** ~210KB. Subset to Latin. Load via Google Fonts with `display=swap`. Bebas Neue and Saira Condensed are display-only (loaded on interaction or with `preload` for hero).

**Font loading strategy:** Archivo and Libre Baskerville load immediately (body + heading). JetBrains Mono lazy-loads when first code block is visible. Bebas Neue, Staatliches, and Saira Condensed load asynchronously for display/stamp/interactive use.

---

## 6. Layout

### Homepage Hero

A full-width dark composition. The top 4px is an institutional tile accent band in `--lz-tile-accent`. Below, a Protocol Header bar (see Signature Component 3) reads:

```
LIMINAL SYSTEMS INC. -- PROCEDURAL DOCUMENTATION
DOCUMENT: THE BACKLOGS // MASTER INDEX
CLASSIFICATION: SUBLEVEL 0 // OPEN DISTRIBUTION
```

The hero title "THE BACKLOGS" renders in Bebas Neue at massive scale (clamp(3rem, 8vw, 6rem)), left-aligned on wide viewports, with a 4px red vertical rule (`--lz-accent`) to its left. **On load, the title characters animate as a split-flap reveal** (see Signature Component 1). Below the title, a single sentence in Libre Baskerville italic explains the tool in formal procedural language: *"A hierarchical backlog management system for infinite corridors."*

The right side of the hero (on viewports >1200px) shows a faint tile grid receding into depth -- a CSS gradient that transitions from the full tile pattern to a darker, blue-shifted caustic wash. The grid opacity is 6% and the caustic overlay animates slowly (12s cycle).

A small red "APPROVED" stamp in Staatliches sits at -2deg rotation near the bottom-left of the hero. An amber LED status dot pulses next to a small "SYSTEM STATUS: MONITORING" label in Saira Condensed.

Below the hero, a departure-board-style navigation grid displays key sections:

```
DESTINATION          ROUTE      STATUS      PLATFORM
────────────────────────────────────────────────────
Getting Started      BL-001     ON TIME     §1
Commands             BL-002     ON TIME     §2
Configuration        BL-003     MONITORING  §3
Reference            BL-004     ON TIME     §4
Internals            BL-005     [DELAYED]   §5
```

Each row links to a section. STATUS uses LED-colored text: `--lz-accent-amber` for active, `--lz-accent` for delayed. Cells have the split-flap center-line texture (1px horizontal line at 50% height, 4% opacity). This board is optional on mobile -- collapses to a simple link list.

### Sidebar / Navigation

Background: `--lz-surface-alt`. Clean institutional filing index.

Each top-level section has a Staatliches protocol prefix in `--lz-classified` (e.g., `BL-CMD`, `BL-CFG`, `BL-REF`). Items within use Archivo at 14px, separated by 1px hairline rules in `--lz-border`. Active item: 3px left border in `--lz-accent`, font-weight 600. Section collapse/expand uses a simple chevron.

Sidebar header: "TABLE OF CONTENTS" in Staatliches, 11px, letter-spacing 0.15em, `--lz-text-muted`.

An amber LED status dot (6px, `--lz-accent-amber`) appears beside the currently active section, pulsing slowly (3s opacity cycle 0.6-1.0). No other decorative elements. The sidebar is the most "normal" part of the site -- fast, functional, scannable.

At the bottom of the sidebar, a small monitoring telemetry line in Saira Condensed 11px, `--lz-text-far`:
```
SYS: OK | DEPTH: 0 | DECAY: 0.00
```
This updates based on the current page's `--page-decay` value (purely decorative, no JS required if statically rendered per page).

### Content Page Structure

- A 3px tile accent band (`--lz-tile-accent`) across the top of the content area.
- Below it, the **Protocol Header** component (Signature Component 3).
- `<h1>`: Libre Baskerville, 1.75rem, 700 weight, `--lz-text`. 2px `--lz-accent` underline. On page load, the title **may** use the split-flap animation (configurable per page via frontmatter `animated: true`; default true for top-level pages, false for deep reference pages to reduce noise).
- `<h2>`: Libre Baskerville, 1.35rem, 700 weight. Preceded by a section number in `--lz-classified` Staatliches (e.g., `§2.3`).
- `<h3>`: Archivo, 1.1rem, 600 weight, `--lz-text-muted`.
- Body: Archivo 16px, `--lz-text`, line-height 1.72, max-width 68ch.
- Code blocks: `--lz-code-bg`, 1px `--lz-code-border` border, 0 border-radius, 3px left border in `--lz-classified`. On deep pages (`--page-decay > 0.3`), code blocks gain a "thermal receipt" variant option -- see Signature Component 2.
- Horizontal rules: tile accent bands (thin colored line between two grout lines).
- Background: faint tile grid at 4% opacity (`--lz-tile-grout`). In dark mode, a persistent scan line overlay at `--lz-scan-line` opacity runs over the entire content area (fixed position, pointer-events: none).
- **Decay at depth:** As `--page-decay` increases:
  - Tile grid grout shifts blue-ward (via `filter: hue-rotate(var(--lz-decay-grout-shift))` on the grid background layer)
  - Caustic shimmer animation opacity increases to `--lz-decay-caustic-intensity`
  - Heading underlines gain a `transform: skewX(var(--lz-decay-heading-skew))`
  - The tile accent bands gain a wet-sheen gradient (linear-gradient with a bright aqua point at 30% that fades)
  - Scan line opacity increases via `--lz-decay-scan-intensity`
  - Classification text in the Protocol Header shifts toward teal
  - At `--page-decay > 0.5`, a faint water-damage stain (`--lz-decay-stain`) bleeds from the bottom-right of the content area
  - None of these effects are dramatic individually. They accumulate.

### Callout Patterns

- **Note:** Left border 3px `--lz-classified`, `--lz-surface` background. Label: `[NOTE]` in Staatliches navy. Clean, institutional, on-grid.
- **Warning:** Left border 3px `--lz-accent`, faint red background tint (`--lz-accent-low`). Label: `[CAUTION]` in Staatliches red. An amber LED dot (4px) pulses beside the label. On deep pages, the label gains a slight stamp rotation (-1deg).
- **Danger:** Full red top border (2px) and left border (3px), `--lz-accent-low` background at higher opacity (0.12). Label: `[CRITICAL -- SEE ADDENDUM]` in Staatliches red bold. Amber LED dot is solid red (`--lz-accent`), no pulse -- steady alarm.
- **Tip:** No colored border. Left pipe character (`|`) in `--lz-text-far`. Label: `[TIP]` in Archivo 600 weight. The quietest callout.
- **Redacted (custom):** Content replaced with black bars (dark mode) or dark bars (light mode). Label: `[REDACTED -- CLEARANCE REQUIRED]`. Hover reveals content with a 300ms CSS transition (`background-color` fades from opaque to transparent, `color` transitions from matching-background to `--lz-text`). Used sparingly for hidden details or Easter eggs. On decayed pages, redacted blocks occasionally appear uninvited around trivial text, implying the system itself is obscuring information. See Interactive Component 3 for full behavior.

---

## 7. Interactive Signature Components

These are the "over the top art project" elements. Three components, each designed to be memorable, functional, and implementable.

---

### Signature Component 1: The Split-Flap Title Reveal

**What it looks like:**
When a page loads, the H1 title does not simply appear. Each character is housed in a small rectangular cell (matching the Bebas Neue character width + 4px padding, `--lz-surface-alt` background, with a 1px horizontal line through the vertical center at 8% opacity -- the signature split-flap divider). Characters are rendered in Saira Condensed 600 (the transit display font) during animation, then crossfade to Libre Baskerville 700 after settling, or remain Saira Condensed if the title is short and punchy.

**How it behaves:**
1. On page load, all character cells display as blank (`--lz-surface-alt` rectangles with the horizontal split line).
2. After a 200ms delay, characters begin "flipping" left-to-right with a 40ms stagger per character.
3. Each character rapidly cycles through 4-6 random uppercase characters using CSS `@keyframes` with `steps()` timing on a `::before` pseudo-element. Each intermediate character is displayed for approximately 60ms. The character cells have a `scaleY` pinch during flip (0.85 -> 1.0 -> 0.85 -> 1.0) creating the physical flap impression.
4. Characters settle left-to-right. Total duration for a 20-character title: ~1 second.
5. After settling, the split-line and cell backgrounds fade out over 300ms, leaving the title as clean text.

**Decay interaction:** On pages with `--page-decay > 0.3`, 1-2 characters in the title occasionally "stick" -- they flip through extra cycles before settling, as if the mechanism is jammed. At `--page-decay > 0.5`, one character may settle on the wrong letter briefly (200ms) before correcting, creating a textual glitch.

**What interaction triggers it:** Page load (automatic). Plays once. Respects `prefers-reduced-motion` (instant display, no animation).

**Why it is special:** The split-flap animation is one of the most universally satisfying mechanical animations in existence. Solari departure boards evoke a specific sensory memory (the sound, the rhythm, the anticipation) that translates visually even without audio. No documentation site has ever used this as a title reveal. Combined with the decay mechanic (characters sticking, wrong letters), it becomes a narrative device: the building's information systems are physically degrading.

**Implementation complexity:** Medium.
- JavaScript: ~40 lines. Splits title text into `<span>` elements with `data-char` attributes. Sets up CSS animation classes.
- CSS: ~50 lines. Keyframe definitions for the flap cycle, scaleY pinch, stagger delays via `calc()`.
- Astro component: ~30 lines. A `<SplitFlapTitle>` component that wraps the page title. Inserted via Starlight `PageTitle` slot override.
- Fallback: Without JS, the title renders as static text (progressive enhancement).
- Performance: animates `transform` and `content` on pseudo-elements only. No layout thrash. Uses `will-change: transform` on character cells during animation, removed after.

---

### Signature Component 2: The Thermal Receipt Code Block

**What it looks like:**
A specialized code block variant that styles code examples as thermal printer receipts -- warm paper background (`--lz-receipt-paper` #F0EBD8) with dark ink text (`--lz-receipt-ink` #1A1816), rendered against the dark page background. The contrast between the warm receipt and the cool dark surroundings is immediate and striking -- like a physical artifact pinned to a dark wall.

**Structure:**
```
╔══════════════════════════════════╗
│  SYSTEM LOG -- ENTRY #003       │
│  2026-02-14  08:47:23           │
╠══════════════════════════════════╣
│                                  │
│  $ bl grab --single              │
│  Claimed: P1.M2.E1.T042         │
│  Priority: high                  │
│  Estimate: 2h                    │
│                                  │
│  ░░░░░░  [receipt continues]     │  <- thermal fade
╚══════════════════════════════════╝
     ✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─       <- perforation line
```

- **Receipt header:** 2 lines of metadata in JetBrains Mono 12px, `--lz-receipt-fade`. Entry number auto-increments per code block on the page. Timestamp is the page's last-modified date.
- **Perforated edges:** Top and bottom borders rendered as a repeating CSS `background-image` of small circles (3px diameter, 8px spacing) in `--lz-receipt-fade`, simulating tear-off perforations. Below the bottom edge, a small scissors icon (CSS chevron pair) sits left-aligned.
- **Thermal fade effect:** On code blocks longer than 8 lines, the bottom 3 lines have progressively decreasing `opacity` (1.0 -> 0.8 -> 0.6), with a final line reading `[...log continues...]` in `--lz-receipt-fade`. **On hover**, the fade removes over 200ms, revealing full content. This mimics thermal print head warmup artifacts.
- **Code rendering:** JetBrains Mono 14px, line-height 1.5, on `--lz-receipt-paper`. Syntax highlighting uses a warm palette: keywords in `#8B4A2A` (brown), strings in `#2B5A3A` (forest green), comments in `--lz-receipt-fade`.

**When to use it:** The thermal receipt variant activates in two cases:
1. Explicitly via a code fence annotation: ` ```receipt ` or ` ```yaml receipt `
2. Automatically on pages with `--page-decay > 0.3` for code blocks annotated as output/log (the system is "printing" status updates).

Standard code blocks (dark background, light text) remain the default. The thermal receipt is a secondary variant -- roughly 20-30% of code blocks on the site.

**Decay interaction:** At `--page-decay > 0.4`, thermal receipts gain subtle visual artifacts:
- Random characters in the header may appear as `░` (thermal dropout)
- The paper color warms slightly toward yellow (`--lz-receipt-paper` shifts from #F0EBD8 to #E8DFC0)
- The perforation holes become slightly irregular (randomized `gap` values via calc on a seed from the page slug)

**Why it is special:** Every code block in every documentation site looks the same: dark rectangle, syntax-highlighted text. The thermal receipt inverts this convention for select examples, making them feel like physical artifacts produced by the system being documented. The fade effect implies the printout is a real object with physical constraints. Combined with the entry number and timestamp, each receipt-styled code block becomes a log entry in an ongoing institutional record.

**Implementation complexity:** Medium.
- Astro component: ~50 lines. `<ThermalCodeBlock>` wraps Starlight's built-in code block component. Reads a `variant="receipt"` prop or detects the `receipt` annotation.
- CSS: ~60 lines. Paper texture, perforation borders, fade gradient, hover reveal, warm syntax highlighting theme.
- Remark plugin (optional): ~20 lines. Transforms ` ```receipt ` annotations into the component wrapper.
- No JavaScript required for the core visual. The hover-reveal fade is pure CSS (`opacity` transition on a gradient overlay).

---

### Signature Component 3: The Protocol Header (Enhanced)

**What it looks like:**
Every content page features a Protocol Header block between the tile accent band and the `<h1>` title. It is a 52px-tall bar (or a block of 4 lines on narrow viewports) with `--lz-surface-alt` background and a 1px bottom border in `--lz-border`.

**Structure (wide viewport):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PROTOCOL: BL-CMD-GRAB          LEVEL 0 // OPEN          2026-02-14  │
│  ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮░░░░░░░░░░░░░  [DEPTH: 2]  ●  SYS: MONITORING    │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Row 1, Left:** Protocol ID in JetBrains Mono 13px, `--lz-classified`. Auto-generated from the page slug (`/commands/grab/` -> `BL-CMD-GRAB`).
- **Row 1, Center:** Classification level in Staatliches 12px. Default: `LEVEL 0 // OPEN` in `--lz-classified`. Advanced pages: `LEVEL 2 // RESTRICTED` in `--lz-accent`. Deprecated: `ARCHIVED // DO NOT DISTRIBUTE` with strikethrough.
- **Row 1, Right:** Last-modified date in JetBrains Mono 12px, `--lz-text-muted`.
- **Row 2:** A thin **corruption index** progress bar spanning the header width. The bar visualizes the page's `--page-decay` value: a horizontal strip (3px tall) where the filled portion is `--lz-accent` (red) at low decay, transitioning through `--lz-accent-amber` to a teal-blue at high decay. At depth 0, the bar is a clean solid red at 0%. At depth 3+, the bar is partially filled with an amber-to-teal gradient and the unfilled portion shows hairline cracks (1px gaps). To the right of the bar: `[DEPTH: N]` in JetBrains Mono 11px, an amber status LED dot (6px circle, pulsing), and `SYS: MONITORING` in Saira Condensed 11px.

**Scroll-reactive behavior (the monitoring element):**
When the user scrolls past 25% of the page, the status text transitions from `SYS: MONITORING` to `SYS: READING`. At 75%, it becomes `SYS: DEEP SCAN`. If the user stops scrolling for 10+ seconds, it shifts to `SYS: IDLE`. This is driven by a small JavaScript scroll listener (~25 lines) that updates a `data-status` attribute on the header. CSS transitions handle the text change (opacity crossfade, 200ms). The LED dot color shifts: amber (monitoring), green (reading), amber (deep scan), dim amber (idle).

This behavior is **deeply subtle** -- most users will never consciously notice it. Those who do will feel the system watching them. This is the atmospheric payoff: the building knows you are reading.

**Decay behavior:**
- At `--page-decay > 0.2`: the classification text shifts 1px vertically. A faint blue stain appears behind the protocol ID.
- At `--page-decay > 0.4`: the corruption index bar develops visual cracks (1px gaps in the fill). The status text occasionally flickers (opacity 0.7 for one frame, CSS animation).
- At `--page-decay > 0.5`: the classification changes to `LEVEL ? // [STATUS UNCLEAR]` in a color between navy and teal (`color-mix(in srgb, var(--lz-classified), #00A8A8 50%)`).
- At `--page-decay > 0.6`: the protocol ID may display with one character replaced by `░` (rendered server-side based on page slug hash).

**Why it is special:** The Protocol Header does four things at once:
1. Establishes the institutional worldbuilding on every page
2. Provides genuinely useful metadata (section, last updated, depth)
3. Serves as the primary canvas for the decay narrative
4. Contains the scroll-reactive monitoring telemetry -- the building's nervous system

**Implementation complexity:** Medium.
- Astro component: ~50 lines. Reads frontmatter for classification, computes protocol ID from slug, receives `--page-decay` value.
- CSS: ~40 lines. Layout, corruption index bar, decay transforms.
- JavaScript: ~25 lines. Scroll listener for status text, IntersectionObserver for initial visibility.
- Decay character replacement: ~10 lines in the Astro component (server-side, deterministic from slug hash).

---

## 8. Motion Design

All animations respect `@media (prefers-reduced-motion: reduce)`. In reduced-motion mode: all animations disabled, decay values applied instantly, split-flap title appears immediately, thermal fade is static, status text is `SYS: MONITORING` (no updates).

### 8.1 Tile Grid Drift on Scroll

The background tile grid shifts `background-position` by 0-2px as the user scrolls, scaled by `--page-decay`. At depth 0, no drift. At depth 4+, the grid drifts just enough to be subliminal.

- Implementation: CSS `scroll-timeline` where supported. Fallback: 10-line JS scroll listener setting a CSS variable.
- Easing: linear (no easing -- the drift is constant and uncanny).
- Performance: `background-position` change only, no layout.

### 8.2 Decay Reveal on Page Load

When a page with `--page-decay > 0` loads, the decay effects animate from zero to their target values over 600ms with a 300ms delay. The page appears pristine, then settles into its corrupted state.

- Implementation: CSS `@keyframes` with `animation-fill-mode: forwards`.
- Easing: `ease-out`.
- Properties animated: `opacity` (stain, caustic), `transform` (heading skew), `background-position` (grid drift).

### 8.3 Stamp Press on Callouts

When a callout with a stamp label (`[CAUTION]`, `[CRITICAL]`, etc.) enters the viewport, the label scales from 1.06 to 1.0 with opacity from 0.5 to target over 150ms. Fires once per callout via IntersectionObserver.

- Easing: `ease-out` (abrupt, physical).
- Performance: `transform` and `opacity` only.

### 8.4 Caustic Shimmer at Depth

On pages with `--page-decay > 0.2`, a slow caustic light animation runs on the background. Two overlapping radial-gradient layers animate at different speeds (13s and 21s -- Fibonacci intervals for organic feel). Opacity is `--lz-decay-caustic-intensity` (max ~3.5% at highest decay).

- Implementation: CSS `@keyframes` on `background-position` and `background-size` of two pseudo-element layers.
- Performance: `background-position` and `opacity` only, on a `position: fixed` element with `pointer-events: none`. GPU-composited.
- Fallback: Static gradient texture (no animation).

### 8.5 LED Status Pulse

Amber LED dots throughout the UI (sidebar, Protocol Header, callouts) pulse: `opacity` transitions between 0.6 and 1.0 over 3 seconds with an ease-in-out curve. Each dot has a slightly different `animation-delay` (derived from position), so pulses ripple across the interface.

- Implementation: Single CSS `@keyframes` rule, reused with per-element `animation-delay`.
- Performance: `opacity` only.

### 8.6 Scan Line Drift (Dark Mode Only)

A full-viewport overlay of horizontal lines (1px every 3px, `--lz-scan-line` opacity) drifts slowly downward. 60-second full cycle. Imperceptibly slow. Creates subliminal CRT monitoring-room feel.

- Implementation: `position: fixed` pseudo-element with `pointer-events: none`, `z-index: 9999`, `background: repeating-linear-gradient(...)`, `animation: scan-drift 60s linear infinite`.
- Performance: single animated element, `background-position` only.
- **Only active in dark mode** and only when `prefers-reduced-motion: no-preference`.

---

## 9. Decay System

The decay system is the narrative engine of Sublevel Zero. It is driven by a single CSS custom property.

### How `--page-decay` is Calculated

```
Route depth 1 (e.g., /getting-started/)     → --page-decay: 0.00
Route depth 2 (e.g., /commands/)             → --page-decay: 0.10
Route depth 3 (e.g., /commands/grab/)        → --page-decay: 0.25
Route depth 4 (e.g., /commands/grab/options/)→ --page-decay: 0.40
Route depth 5+ (e.g., /internals/engine/dag/)→ --page-decay: 0.55-0.70
```

The value is injected as an inline `style` attribute on the `<main>` element by a custom Starlight layout wrapper that reads `Astro.url.pathname` and counts segments. Frontmatter override: `decay: 0.6` forces a specific value.

### What Decay Affects

| Decay Range | Visual Effects |
|---|---|
| 0.00 | Pristine. Clean grid, sharp borders, red accent, blue classification text. |
| 0.01-0.15 | Tile grout begins to shift slightly blue. Barely perceptible. |
| 0.15-0.30 | Caustic shimmer appears at very low opacity. Scan lines strengthen slightly. Grid begins to drift on scroll. Heading underlines gain subtle skew. |
| 0.30-0.45 | Water-damage stain starts bleeding in from bottom-right. Code blocks may render as thermal receipts. Protocol Header classification text starts shifting teal. Corruption index bar shows partial fill with color transition. Split-flap title may have 1 sticky character. |
| 0.45-0.60 | Tile accent bands gain wet-sheen gradient. Protocol Header shows `LEVEL ? // [STATUS UNCLEAR]`. One character in protocol ID is `░`. Redacted blocks may appear uninvited around trivial text. LED indicators pulse slightly faster. |
| 0.60-0.70 | Maximum decay. Caustic shimmer is clearly visible. Water stain is prominent. Multiple heading skews visible. The site still functions perfectly -- all text is readable, all navigation works -- but the environment is clearly under stress. The Backrooms are leaking through. |

### Decay Constraints

- **Readability is never compromised.** The maximum heading skew (0.175deg at decay 0.7) is subliminal. Text contrast ratios remain above WCAG AA at all decay levels.
- **No JavaScript required for visual effects.** All decay visuals are CSS `calc()` expressions referencing `--page-decay`. JS is only used for scroll-reactive enhancements (grid drift, monitoring status).
- **Opt-out available.** A `[Disable Effects]` toggle in the site footer sets `--page-decay: 0 !important` and adds a `data-no-effects` attribute that disables scan lines, caustic shimmer, and LED pulses.

---

## 10. Worldbuilding Voice

### The Institution: Liminal Systems Inc.

Maintained from Level Zero. Liminal Systems Inc. is the fictional company that maintains the Backrooms' infrastructure and files procedural documentation for everything. The voice is:

- **Bureaucratically precise.** Protocol numbers, section codes, classification levels, last-updated timestamps. Everything has a form number.
- **Straight-faced.** No winking, no irony. The documents take themselves completely seriously. The humor comes from the gap between the institutional precision and the impossibility of what is being documented.
- **Procedurally concerned.** Warnings are "protocol deviations." Dangers are "addenda." Tips are just tips (even institutional horror needs practical advice). Deprecated features are "archived -- do not distribute."
- **Gradually uncertain.** At surface-level docs, the institution is confident: `LEVEL 0 // OPEN DISTRIBUTION`. At deeper levels, confidence erodes: `LEVEL ? // [STATUS UNCLEAR]`. The building is too deep. The filing system is breaking down. The system is still trying to maintain order, but the order is failing.

### The Monitoring System

New to Level One. The building has a monitoring system -- status LEDs, scroll-reactive telemetry, a thermal printer producing status logs, a split-flap departure board listing active documentation routes. This monitoring layer creates the sense that the building itself is aware of the reader. It is not hostile. It is procedural. It tracks your position, your reading depth, your idle time. It files reports.

The monitoring system provides the aesthetic connective tissue between the institutional voice (procedures, protocols) and the interactive components (split-flap animation, scroll-reactive status, LED pulses). Together they say: *"You are in a building. The building has systems. The systems are watching. The systems are starting to malfunction."*

---

## 11. Risks / Tradeoffs

### Risk 1: Performance Budget

**Concern:** The combination of scan line overlay, caustic shimmer animation, LED pulse animations, tile grid background, and potential split-flap title animation creates a meaningful rendering workload.

**Mitigation:**
- All animated elements use `transform`, `opacity`, or `background-position` only (GPU-compositable).
- Scan lines and caustic shimmer are single fixed-position elements with `pointer-events: none` and `will-change: background-position`.
- LED pulses are `opacity` only.
- Split-flap animation is contained to page load, runs for ~1s, then all animated elements are removed from the DOM.
- Performance budget: if any animation causes frame drops below 30fps on a 2020-era midrange device, it falls back to static. Test with Chrome DevTools Performance panel.

### Risk 2: Decay Calibration

**Concern:** The decay effects must feel subliminal at low values and atmospheric at high values. Too subtle = invisible. Too aggressive = the site looks broken.

**Mitigation:**
- All decay values are conservative. Maximum heading skew is 0.175deg (barely visible to the naked eye). Maximum grid drift is 1.4px. Maximum caustic opacity is 3.5%.
- Extensive user testing at each decay level. The "golden rule": if a user consciously notices a single decay effect and thinks "that's a bug," the effect is too strong.
- The `[Disable Effects]` toggle provides an escape hatch.

### Risk 3: Dark Mode as Primary

**Concern:** Dark-primary breaks the convention that light mode is default. Some users in bright environments will need light mode.

**Mitigation:**
- Light mode exists and is complete. It is not an afterthought -- it has its own palette, its own character (institutional fluorescent light instead of monitoring-room darkness), and the decay system works in both modes.
- The site respects `prefers-color-scheme` OS setting on first visit.
- A clear toggle is available in the header.
- WCAG AA contrast is met in both modes at all decay levels.

### Risk 4: Interactive Component Complexity

**Concern:** Three signature components (split-flap, thermal receipt, enhanced Protocol Header) plus redaction bars represent significant implementation work.

**Mitigation:**
- Each component is self-contained: own Astro file, own CSS, minimal JS.
- Components degrade gracefully: without JS, split-flap is a static title, thermal receipt is a styled code block, Protocol Header monitoring is static text.
- Recommended implementation order: (1) Protocol Header (most impactful, simplest), (2) Thermal Receipt Code Block (medium, big visual payoff), (3) Split-Flap Title (most complex, most dramatic).

### Risk 5: "Generic Hacker Terminal" Association

**Concern:** Dark mode + scan lines + green/amber accents could read as cyberpunk/hacker terminal.

**Mitigation:**
- The accent palette is institutional red and navy blue, not green/amber. Amber is a secondary accent used only for LED indicators, never for text or primary UI.
- The typography stack (Libre Baskerville, Archivo, Staatliches) is explicitly non-terminal: serif headings, grotesque body, compressed stamp labels. Nothing says "hacker."
- The scan lines are at 2% opacity, barely visible. The caustic shimmer is aquatic/cool, not neon.
- The institutional voice (protocols, classifications, Liminal Systems Inc.) firmly anchors the aesthetic in bureaucracy, not cyberpunk.

---

## 12. Full CSS Token Set

```css
/* =============================================
   SUBLEVEL ZERO -- Dark Mode (Primary)
   ============================================= */

:root {
  /* Backgrounds */
  --lz-bg: #0C1018;
  --lz-surface: #141A24;
  --lz-surface-alt: #1A222E;
  --lz-surface-raised: #202A36;

  /* Text */
  --lz-text: #D4D0C4;
  --lz-text-muted: #7A7868;
  --lz-text-far: #4A4A42;

  /* Accents */
  --lz-accent: #D44838;
  --lz-accent-low: rgba(212, 72, 56, 0.10);
  --lz-accent-secondary: #5B8FD4;
  --lz-accent-amber: #F0B830;
  --lz-accent-amber-dim: #806020;
  --lz-accent-amber-glow: rgba(240, 184, 48, 0.15);

  /* Tile grid */
  --lz-tile-grout: #1E2838;
  --lz-tile-accent: #162838;

  /* Code */
  --lz-code-bg: #080C14;
  --lz-code-border: #1E2838;

  /* Structural */
  --lz-border: #1E2430;
  --lz-stamp-red: rgba(212, 72, 56, 0.25);
  --lz-classified: #5B8FD4;
  --lz-caustic: rgba(0, 200, 240, 0.04);

  /* Thermal receipt */
  --lz-receipt-paper: #F0EBD8;
  --lz-receipt-ink: #1A1816;
  --lz-receipt-fade: #B0A890;

  /* Scan lines */
  --lz-scan-line: rgba(255, 255, 255, 0.02);

  /* Decay tokens */
  --page-decay: 0;
  --lz-decay-stain: rgba(0, 140, 180, calc(var(--page-decay) * 0.06));
  --lz-decay-caustic-intensity: calc(var(--page-decay) * 0.05);
  --lz-decay-grout-shift: calc(var(--page-decay) * -12);
  --lz-decay-heading-skew: calc(var(--page-decay) * -0.25deg);
  --lz-decay-grid-drift: calc(var(--page-decay) * 2px);
  --lz-decay-scan-intensity: calc(0.02 + var(--page-decay) * 0.03);

  /* Typography */
  --font-display: 'Bebas Neue', Impact, sans-serif;
  --font-heading: 'Libre Baskerville', Georgia, serif;
  --font-body: 'Archivo', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', Consolas, monospace;
  --font-stamp: 'Staatliches', Impact, sans-serif;
  --font-status: 'Saira Condensed', 'Arial Narrow', sans-serif;

  /* Tile grid background */
  --lz-tile-grid: repeating-linear-gradient(
    to right,
    transparent,
    transparent 59px,
    var(--lz-tile-grout) 59px,
    var(--lz-tile-grout) 60px
  ), repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 59px,
    var(--lz-tile-grout) 59px,
    var(--lz-tile-grout) 60px
  );

  /* Scan line overlay */
  --lz-scan-overlay: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    var(--lz-scan-line) 2px,
    var(--lz-scan-line) 3px
  );

  /* Split-flap texture */
  --lz-flap-split: linear-gradient(
    to bottom,
    transparent 49%,
    rgba(0, 0, 0, 0.08) 49%,
    rgba(0, 0, 0, 0.08) 51%,
    transparent 51%
  );

  /* Starlight integration */
  --sl-color-bg: var(--lz-bg);
  --sl-color-bg-nav: var(--lz-surface-alt);
  --sl-color-bg-sidebar: var(--lz-surface-alt);
  --sl-color-hairline: var(--lz-border);
  --sl-color-text: var(--lz-text);
  --sl-color-text-accent: var(--lz-text-muted);
  --sl-color-accent: var(--lz-accent);
  --sl-color-accent-low: var(--lz-accent-low);
  --sl-color-accent-high: var(--lz-accent);
  --sl-font: var(--font-body);
  --sl-font-display: var(--font-heading);
  --sl-font-mono: var(--font-mono);
}

/* =============================================
   SUBLEVEL ZERO -- Light Mode ("Lights On")
   ============================================= */

[data-theme="light"] {
  --lz-bg: #F2F0EA;
  --lz-surface: #FAFAF6;
  --lz-surface-alt: #ECEAE4;
  --lz-surface-raised: #FFFFFF;
  --lz-text: #1A1A1E;
  --lz-text-muted: #6B6968;
  --lz-text-far: #A0A09A;
  --lz-accent: #C23828;
  --lz-accent-low: rgba(194, 56, 40, 0.06);
  --lz-accent-secondary: #1A3A5C;
  --lz-accent-amber: #D89818;
  --lz-accent-amber-dim: #A07810;
  --lz-accent-amber-glow: rgba(216, 152, 24, 0.10);
  --lz-tile-grout: #D4D0C8;
  --lz-tile-accent: #C8D8E0;
  --lz-code-bg: #F0EFEA;
  --lz-code-border: #D0CFC8;
  --lz-border: #C8C7C3;
  --lz-stamp-red: rgba(194, 56, 40, 0.30);
  --lz-classified: #1A3A5C;
  --lz-caustic: rgba(184, 232, 255, 0.03);
  --lz-scan-line: transparent;
  --lz-decay-stain: rgba(180, 210, 228, calc(var(--page-decay) * 0.05));
}

/* =============================================
   Reduced Motion
   ============================================= */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .scan-overlay,
  .caustic-shimmer {
    animation: none !important;
  }

  .led-pulse {
    opacity: 1 !important;
    animation: none !important;
  }

  .split-flap-char {
    animation: none !important;
  }

  .split-flap-char::before {
    content: attr(data-char) !important;
  }
}

/* =============================================
   Disable Effects Toggle
   ============================================= */

[data-no-effects] {
  --page-decay: 0 !important;
  --lz-scan-line: transparent !important;
  --lz-caustic: transparent !important;
}

[data-no-effects] .scan-overlay,
[data-no-effects] .caustic-shimmer,
[data-no-effects] .led-pulse {
  display: none !important;
}
```

---

## 13. Astro/Starlight Implementation Notes

### 13.1 Decay Injection

Create a custom Starlight layout wrapper (`src/layouts/DocsLayout.astro`). It calculates `--page-decay` from the page's file path depth:

```astro
---
// src/layouts/DocsLayout.astro
const depth = Astro.url.pathname.split('/').filter(Boolean).length;
const decay = Math.min(0.7, [0, 0, 0.1, 0.25, 0.4, 0.55, 0.65, 0.7][depth] ?? 0.7);
const frontmatterDecay = Astro.props.frontmatter?.decay;
const pageDecay = frontmatterDecay ?? decay;
---
<main style={`--page-decay: ${pageDecay}`}>
  <slot />
</main>
```

This is the single integration point for the entire decay system.

### 13.2 Protocol Header Component

Create `src/components/ProtocolHeader.astro`. Reads page props for title, slug, last-updated, classification. Protocol ID derived from slug: `commands/grab` -> `BL-CMD-GRAB`. Classification level via frontmatter (`classification: "restricted"`) or default `LEVEL 0 // OPEN`.

Override Starlight's `PageTitle` component slot to include the Protocol Header above the title. The corruption index bar and monitoring status text are part of this component.

**JavaScript (client-side):** A small `<script>` tag (~25 lines) in the component handles scroll-reactive status text updates. Uses `IntersectionObserver` for viewport position and a `requestAnimationFrame`-throttled scroll listener.

### 13.3 Split-Flap Title Component

Create `src/components/SplitFlapTitle.astro`. This wraps the page's `<h1>` element.

**Server-side:** Renders the title as a series of `<span class="split-flap-char" data-char="T">T</span>` elements. Each span has the flap split texture background and animation delay calculated from its index.

**Client-side:** A `<script>` tag (~40 lines) runs on page load: detects `prefers-reduced-motion`, adds the `flap-animate` class to trigger CSS keyframes, and removes animation classes after completion. Falls back gracefully to static text.

### 13.4 Thermal Receipt Code Block

Create `src/components/ThermalCodeBlock.astro`. This wraps Starlight's code block component.

**Option A (recommended):** Create a remark plugin (`remark-thermal-receipt.mjs`, ~25 lines) that detects ` ```receipt ` or ` ```yaml receipt ` annotations and transforms them into the component wrapper. This allows authors to opt-in per code block.

**Option B:** Create a Starlight `Code` component override that checks for a `receipt` meta attribute and conditionally applies the thermal styling.

### 13.5 Tile Grid and Scan Line Background

Apply `--lz-tile-grid` as `background-image` on `<body>` with `opacity: 0.04` and `background-attachment: fixed`.

The scan line overlay is a `::after` pseudo-element on `<body>`:
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: var(--lz-scan-overlay);
  opacity: var(--lz-decay-scan-intensity, 0.02);
  animation: scan-drift 60s linear infinite;
}
```

### 13.6 Redaction Bar

Create a remark plugin (`remark-redacted.mjs`, ~25 lines) that transforms `:redacted[text]` syntax into `<span class="redacted" aria-label="Classified content">text</span>`. CSS handles the visual redaction (`background: currentColor; color: currentColor;`) and hover reveal (`background: transparent; color: var(--lz-text);` with 300ms transition). Screen readers see the actual text via the underlying text node.

### 13.7 Sidebar Protocol Prefixes

Override Starlight's sidebar via the `Sidebar` component slot. Prepend protocol group prefixes (`BL-CMD`, `BL-CFG`) to each top-level section label using CSS `::before` content generated from a `data-protocol` attribute set in the sidebar configuration.

### 13.8 Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&family=Libre+Baskerville:wght@400;700&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&family=Libre+Baskerville:wght@400;700&display=swap">
```

Lazy-load remaining fonts:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Bebas+Neue&family=Staatliches&family=Saira+Condensed:wght@600&display=swap" media="print" onload="this.media='all'">
```

Total budget: ~210KB. Subset to `&subset=latin` if extended characters are not needed.

### 13.9 Implementation Order

1. **Foundation:** CSS token set, font loading, tile grid background, Starlight theme overrides. (~1 day)
2. **Protocol Header:** Component + corruption index bar. (~0.5 day)
3. **Decay system:** Layout wrapper, decay injection, CSS decay effects. (~0.5 day)
4. **Callouts + Redaction:** Callout styling, remark-redacted plugin. (~0.5 day)
5. **Thermal Receipt Code Block:** Component + remark plugin. (~0.5 day)
6. **Split-Flap Title:** Component + animation CSS + JS. (~1 day)
7. **Monitoring telemetry:** Scroll-reactive status, LED pulses, scan lines. (~0.5 day)
8. **Homepage hero:** Departure board grid, hero composition, stamp. (~0.5 day)
9. **Polish:** Light mode refinement, reduced-motion testing, performance audit, disable-effects toggle. (~1 day)

**Estimated total: ~6 days of focused implementation.**

---

*End of Level One synthesis. This document specifies "Sublevel Zero" -- a dark-primary, interactive, decay-driven documentation theme that combines institutional procedural dread with analog monitoring apparatus and the physical world of the Backrooms. It is a documentation site that is also a place: a tiled sub-basement monitoring room whose systems are meticulous, whose displays are clattering into position, whose thermal printer is still running, and whose deeper levels are slowly flooding.*
