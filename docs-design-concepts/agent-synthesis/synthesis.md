# The Backlogs -- Docs Design Concept Synthesis

**Synthesized:** 2026-02-14
**Concepts reviewed:** 12 (from agents A, B, C)
**Purpose:** Final comparative analysis, recommendations, and hybrid direction for "The Backlogs" documentation site visual identity.

---

## 1. Comparison Matrix

| # | Concept Name | Readability | Uniqueness | Impl. Effort | Dual Theme | Key Risk | One-Line Summary |
|---|---|:---:|:---:|:---:|---|---|---|
| 1 | Municipal Safety Signage | 7 | 8 | 4 | Moderate | Yellow/black hazard palette feels aggressive during long reads | ISO safety signage as wayfinding metaphor for infinite office building docs |
| 2 | Fluorescent Hum | 9 | 7 | 2 | Moderate | So subtle that users may not perceive any theme at all | Warm fluorescent light on ceiling tile grid -- uncanny normality as design |
| 3 | Analog Tape Log | 8 | 9 | 6 | Weak | VHS aesthetic risks feeling gimmicky if CRT effects are overdone | VHS playback screen with timecodes, scan lines, and scroll-reactive OSD bar |
| 4 | Threshold Protocol | 8 | 9 | 5 | Strong | Typewriter font has lower readability; redaction overuse annoys readers | Declassified government dossier with redaction bars and classification stamps |
| 5 | Archival Operations Manual | 8 | 9 | 5 | Strong | Paper-artifact decorations (clips, stains) feel precious if overused | Recovered institutional binder with manila folders, stamps, and ring holes |
| 6 | Corridor Depth | 7 | 9 | 8 | Strong | CSS perspective math is brittle across viewports; parallax may disorient | One-point perspective corridor where breadcrumbs recede into vanishing point |
| 7 | Maintenance Terminal | 6 | 8 | 6 | Weak | All-monospace body text reduces long-form readability | Green-phosphor CRT maintenance console bolted to a sub-basement wall |
| 8 | Poolrooms | 8 | 10 | 7 | Strong | Aquatic palette may read as "pool company site" without careful restraint | Ceramic tile grid and caustic water-light patterns from Backrooms Poolrooms lore |
| 9 | Exit Sign Noir | 8 | 8 | 4 | Weak | Dark-only concept causes eye strain in bright ambient light | Film noir corridor lit by a dying red EXIT sign -- cinematic negative space |
| 10 | The Catalog | 7 | 9 | 7 | Moderate | Courier body text is wide and less efficient; ruled-line alignment is finicky | Library card catalog with mahogany drawers, brass hardware, and date-due slips |
| 11 | Grid Collapse | 9 | 10 | 6 | Strong | Decay effects must stay extremely subtle or the site looks broken | Swiss International Style grid that progressively corrupts at deeper doc levels |
| 12 | Memo from Nowhere | 8 | 10 | 7 | Moderate | Corporate-memo joke may feel stale on repeat visits | Internal memo from a nonexistent company with routing stamps and CONFIDENTIAL watermarks |

### Scoring Notes

- **Readability** accounts for font choices, contrast ratios, content measure, and whether decorative elements interfere with sustained reading.
- **Uniqueness** reflects how unprecedented the concept is specifically within developer documentation (not general web design).
- **Implementation effort** is scaled where 1 = pure CSS token swap and 10 = extensive custom components, JS, and Starlight overrides.
- **Dual theme support** rates how well the concept works in both light and dark modes. "Strong" means both modes are atmospherically compelling. "Weak" means one mode is the concept and the other is an afterthought.

---

## 2. Top 3 Recommended Directions

### Recommendation 1: Concept 11 -- "Grid Collapse"

**Why this concept stands out.**
Grid Collapse is the only concept that uses the documentation structure itself as a narrative device. The visual system is not just a skin -- it tells a story. At surface-level docs (getting started, overview), the site is a pristine Swiss International Style grid: Bebas Neue headers, red accent bars, clinical white space, rigorous alignment. As the reader navigates deeper into reference pages and advanced configuration, the grid begins to decay. Headings skew fractionally. The background grid drifts. A warm yellow stain bleeds through the paper-white. Code block borders shift from neutral gray to unsettling amber. This mechanic maps perfectly to the Backrooms lore (deeper = less reliable reality) and creates a genuine sense of progression through the documentation hierarchy.

**Why it works for developer documentation.**
The Swiss grid baseline is one of the strongest possible foundations for technical writing. It is proven (Helvetica, Bauhaus, the entire Swiss poster tradition), highly readable, and information-dense without feeling cluttered. Developers are the audience most likely to notice -- and appreciate -- systematic visual degradation, because they think in terms of systems. The decay is also functionally meaningful: it signals "you are in deeper/more complex territory" through visual rhetoric, not just content. Surface-level docs feel safe and orderly. Advanced internals feel less certain. This is true of the actual content, and the design reinforces it.

**What makes it implementable.**
The base Swiss grid theme is extremely practical -- clean sans-serifs, high contrast, standard CSS. The decay system is driven by a single CSS custom property (`--page-decay: 0..1`) that can be injected via a Starlight layout wrapper based on route depth. All decay effects are CSS transforms, background-position shifts, and color transitions keyed to that one variable. No JavaScript is required for any visual effect (the grid drift can use CSS `scroll-timeline` or a trivial scroll listener). The Corruption Index progress bar is a straightforward HTML/CSS component.

**What would need to be toned down for production.**
The decay must be calibrated conservatively. The proposed 0.5-degree heading skew should be tested at 0.2-0.3 degrees initially. The background grid drift should cap at 1-2 pixels, not 3. The amber color shift on code borders should be a gentle warmth, not a stark change. The Corruption Index label text irregularity (`letter-spacing` jitter) should be dropped or reduced to imperceptible levels. The decay should feel subliminal, not broken. A "disable effects" toggle would be advisable for accessibility.

---

### Recommendation 2: Concept 4 -- "Threshold Protocol"

**Why this concept stands out.**
Threshold Protocol has the strongest worldbuilding of any concept. Every page is framed as a declassified procedural document -- classification headers, protocol numbers, section numbering, and the brilliant interactive redaction bar. The concept succeeds because it uses a universally understood visual language (government/institutional documents) and applies it without irony to developer documentation. The result is simultaneously funny, atmospheric, and genuinely usable. The SCP Foundation comparison is apt: that community proved you can build a massive readership around procedural fiction that treats absurdity with bureaucratic seriousness.

**Why it works for developer documentation.**
The procedural framing (protocol numbers, section hierarchy, classification levels) maps directly onto how documentation is actually structured. Commands become "procedures." Configuration options become "protocols." Warnings become "cautions -- protocol deviation." This is not decorative -- it is a coherent metaphor that makes the documentation more navigable, not less. The hierarchical numbering system (`1.`, `1.1.`, `1.1.1.`) in the sidebar is strictly superior to the standard Starlight navigation for deeply nested docs. The redaction bar is a genuinely useful component for hiding advanced details or spoiler-level internals behind an interactive reveal.

**What makes it implementable.**
The concept is primarily typographic -- Special Elite for display, Libre Baskerville for body, Courier Prime for code. The light color scheme (institutional off-white) requires minimal CSS. The document header block is a straightforward Starlight component override. The hierarchical sidebar numbering can be done with CSS counters (no JS). The redaction bar is approximately 20 lines of CSS with an optional remark plugin. The typewriter heading animation is the most complex element and can be gracefully degraded to a static display.

**What would need to be toned down for production.**
Special Elite (the typewriter font) should be restricted to `<h1>` only -- never `<h2>` or smaller. The CLASSIFIED watermark on the homepage should be at 1-2% opacity, not the proposed 2%. The "APPROVED FOR DISTRIBUTION" stamp should appear only on the homepage, not repeated. Redaction bars should be used sparingly -- one or two per page maximum, reserved for genuinely optional/advanced content. The document header block (PROTOCOL / SUBJECT / CLASS / LAST UPDATED) should be made optional per-page via frontmatter, not mandatory on every page.

---

### Recommendation 3: Concept 8 -- "Poolrooms"

**Why this concept stands out.**
Poolrooms is the most visually ambitious concept and achieves the highest distinctiveness score. The Backrooms Poolrooms are one of the most iconic and beloved locations in the lore -- the eerie, serene, endlessly tiled space where fluorescent light refracts through impossibly still water. No documentation site has ever attempted an aquatic/ceramic tile aesthetic. The concept's strength is that it works on two levels: for readers unfamiliar with Backrooms lore, it is simply a clean, calming blue-and-white tile design with pleasant lighting effects. For those who know, it is immediately recognizable and deeply atmospheric. The dark mode ("night pool") variant is potentially even stronger than the light mode, with luminous aqua accents against deep blue-black.

**Why it works for developer documentation.**
The tile grid provides a strong structural metaphor -- content elements "snap to tile," creating a rigid, consistent layout grid that is inherently good for technical writing. The palette is cool, calming, and high-contrast (the specified `#1A2D3A` on `#E8F4F8` exceeds WCAG AAA). The typography choices (Outfit, Nunito Sans) are clean geometric sans-serifs with excellent readability. The caustic light animation at 3-5% opacity is atmospheric without interfering with reading. Code blocks styled as "deep pool" panels (dark blue, inset shadow) create a strong visual hierarchy. The pool depth markers as navigation metaphor ("1.0m COMMANDS", "2.0m GUIDES", "3.0m REFERENCE") are charming and functionally clear.

**What makes it implementable.**
The tile grid is a CSS `repeating-linear-gradient` background -- trivial. The caustic light animation uses layered radial gradients at low opacity, which is moderately complex CSS but well-documented in creative coding communities. The water-level reflection on the homepage is a CSS `transform: scaleY(-1)` with `filter: blur()` -- standard. The depth markers in the sidebar need a Starlight component override but are structurally simple. The overall font budget is light (three Google Fonts families). The tile accent bands as section dividers are pure CSS. The dark mode variant requires its own token set but is well-specified in the concept.

**What would need to be toned down for production.**
The caustic light animation should have a performance budget: if the animation causes any frame drops, fall back to a static gradient texture. The "water line" reflection effect on the homepage hero should be optional and degraded gracefully on mobile (remove the reflected duplicate, keep the gradient transition). The tile grid should not override content spacing -- it should be a visual texture, not a layout constraint. The proposed "content snapping to tile grid" feature should be dropped; it creates alignment headaches for variable-length content. Depth markers should be decorative rather than functional navigation elements. The ripple hover effect should be simplified to a CSS-only centered version rather than requiring JS for cursor position tracking.

---

## 3. Hybrid Direction

### Concept Name: "Level Zero"

### Vibe Statement
A pristine Swiss-grid documentation system built on ceramic tile, maintained by an institutional bureaucracy that files every procedure in triplicate -- and the deeper you read, the more the tile cracks, the water seeps in, and the fluorescent light starts to refract through spaces that should not be wet.

### Conceptual Foundation
"Level Zero" synthesizes three ideas:

1. **From Grid Collapse:** The structural decay mechanic. The documentation begins as a clean, rigorous grid and progressively corrupts at deeper navigation levels. This provides narrative tension and a reason to explore.

2. **From Threshold Protocol:** The institutional procedural framing. Every page is a "document" with a classification header, protocol number, and formal structure. This provides worldbuilding and a navigational metaphor that makes the docs more usable, not less.

3. **From Poolrooms:** The tile-grid material aesthetic and aquatic color language. The "walls" of the documentation are tiled. The "corruption" at deeper levels manifests as water damage -- tile discoloration, caustic light patterns, grout darkening. This provides the specific Backrooms-lore resonance that ties the entire concept to the project's identity.

The synthesis is more than additive. Grid Collapse provides the *mechanic* (depth-based decay). Threshold Protocol provides the *voice* (institutional procedural documentation). Poolrooms provides the *material world* (tile, water, fluorescent light). Together, they create a documentation site that is a place: a tiled institutional corridor whose procedures are meticulous, whose filing system is perfect, and whose deeper levels are slowly flooding.

### Palette

| Token | Light Hex | Dark Hex | Role |
|---|---|---|---|
| `--lz-bg` | `#F5F5F0` | `#0E1218` | Primary background -- dry institutional tile |
| `--lz-surface` | `#FFFFFF` | `#161C24` | Content card surface -- fresh document paper |
| `--lz-surface-alt` | `#EDECEB` | `#1C242E` | Secondary surface -- filing area, sidebar |
| `--lz-text` | `#1A1A1E` | `#D8D4CC` | Primary text -- typewriter ink / cream on dark |
| `--lz-text-muted` | `#6B6968` | `#7A7872` | Secondary text -- faded carbon copy |
| `--lz-text-far` | `#A0A09A` | `#505050` | Decorative/distant text (breadcrumb ancestors) |
| `--lz-accent` | `#C23828` | `#D44838` | Primary accent -- institutional red (stamps, active) |
| `--lz-accent-low` | `rgba(194,56,40,0.08)` | `rgba(212,72,56,0.12)` | Red glow for callouts |
| `--lz-accent-secondary` | `#1A3A5C` | `#5B8FD4` | Institutional navy / bright blue (links, protocol IDs) |
| `--lz-tile-grout` | `#D4D0C8` | `#2A3040` | Tile grid lines |
| `--lz-tile-accent` | `#C8D8E0` | `#1A3848` | Subtle tile color band for section dividers |
| `--lz-code-bg` | `#F0EFEA` | `#0A1018` | Code block background |
| `--lz-code-border` | `#D0CFC8` | `#2A3040` | Code block border |
| `--lz-border` | `#C8C7C3` | `#2A2E38` | General structural borders |
| `--lz-decay-stain` | `rgba(180,210,228,0.00)` | `rgba(0,140,180,0.00)` | Water-damage stain (starts at 0, driven by decay) |
| `--lz-decay-caustic` | `rgba(184,232,255,0.00)` | `rgba(0,200,240,0.00)` | Caustic light pattern (starts at 0, driven by decay) |
| `--lz-decay-grout` | `#D4D0C8` | `#2A3040` | Grout color at depth 0 (darkens with decay) |
| `--lz-stamp-red` | `rgba(194,56,40,0.35)` | `rgba(212,72,56,0.30)` | Rubber stamp impression opacity |
| `--lz-classified` | `#1A3A5C` | `#5B8FD4` | Protocol/classification header color |
| `--page-decay` | `0` | `0` | Decay factor (0.0 at root, up to 0.6 at deepest) |

### Typography

- **Display font:** [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) (400) -- Condensed all-caps Swiss poster type. Used for `<h1>` hero text and the Corruption Index label. Conveys rigid institutional authority at the surface level.
- **Heading font:** [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville) (700) -- Institutional serif for `<h1>` page titles and `<h2>`. Feels like a government report heading. Warm, authoritative, readable.
- **Body font:** [Archivo](https://fonts.google.com/specimen/Archivo) (400/600) -- Rational grotesque for all body text. Clean, wide weight range, modern without being trendy. Excellent readability at 16-17px.
- **Mono font:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (400) -- Precise and geometric for code blocks. Its slight rounding harmonizes with the tile aesthetic.
- **Stamp font:** [Staatliches](https://fonts.google.com/specimen/Staatliches) (400) -- Compressed uppercase institutional display. Used for classification labels, protocol IDs, stamps. Appears in small doses only.

### Layout

**Homepage hero.**
A full-width Swiss-grid composition. The top 8px is an institutional tile accent band in `--lz-tile-accent`. Below it, a classification header in Staatliches:

```
LIMINAL SYSTEMS INC. -- PROCEDURAL DOCUMENTATION
DOCUMENT: THE BACKLOGS // MASTER INDEX
CLASSIFICATION: LEVEL 0 // OPEN DISTRIBUTION
```

The hero title "THE BACKLOGS" appears in Bebas Neue at massive scale, left-aligned, with a 4px red vertical rule to its left. Below, a single paragraph in Libre Baskerville italic explains what the tool is, in formal procedural language. The right side of the hero (on wide viewports) shows a faint tile grid receding into depth -- a CSS gradient that transitions from the full tile pattern to a softer, slightly blue-shifted wash, hinting at the water that lies deeper. A small red "APPROVED" stamp sits at a slight rotation near the bottom of the hero. The composition is asymmetric, confident, and mostly empty.

**Sidebar / navigation.**
Clean institutional filing index. Background is `--lz-surface-alt`. Each top-level section has a Staatliches protocol prefix in `--lz-classified` (e.g., `BL-CMD`, `BL-CFG`, `BL-REF`). Items within are Archivo, separated by hairline rules. Active item has a 3px left border in `--lz-accent` and bold weight. Section collapse/expand uses a simple chevron. At the top of the sidebar, small text reads "TABLE OF CONTENTS" in Staatliches. No decorative elements. The sidebar is the most "normal" part of the site -- it needs to be fast and functional.

**Content page structure.**
- A thin tile accent band (3px `--lz-tile-accent`) runs across the top of the content area.
- Below it, the **Protocol Header** block (the signature component -- see below).
- `<h1>`: Libre Baskerville, 1.75rem, 700 weight, `--lz-text`, with a 2px `--lz-accent` underline.
- `<h2>`: Libre Baskerville, 1.35rem, 700 weight, preceded by a section number in `--lz-classified` Staatliches.
- `<h3>`: Archivo, 1.1rem, 600 weight, `--lz-text-muted`.
- Body: Archivo, 1rem (16px), `--lz-text`, line-height 1.72, max-width 68ch.
- Code blocks: `--lz-code-bg`, 1px `--lz-code-border` border, 0 border-radius, left border 3px `--lz-classified`. Code label ("EXAMPLE" or "EXHIBIT A") in Staatliches above the block on deep pages only.
- Horizontal rules: tile accent bands (thin colored line between two grout lines).
- The background has a faint tile grid at 4-5% opacity (repeating linear-gradient, 60px intervals).
- **Decay at depth:** As `--page-decay` increases, the tile grid grout darkens and shifts slightly blue. A faint caustic-light gradient appears on the background. The tile accent bands at section breaks gain a wet-sheen gradient. Heading underlines waver by 0.2deg. The classification header text shifts subtly toward blue-green tones. None of these effects are dramatic. They accumulate.

**Callout patterns.**
- **Note:** Left border 3px `--lz-classified`, `--lz-surface` background. Label: `[NOTE]` in Staatliches navy. Clean, institutional, on-grid.
- **Warning:** Left border 3px `--lz-accent`, faint red background tint (`--lz-accent-low`). Label: `[CAUTION]` in Staatliches red. On deep pages, the label gains a slight stamp rotation (-1deg).
- **Danger:** Full red top and left border, `--lz-accent-low` background. Label: `[CRITICAL -- SEE ADDENDUM]` in Staatliches red bold. The most visually stark element on any page.
- **Tip:** No colored border. Left pipe character (`|`) in `--lz-text-far`. Label: `[TIP]` in Archivo 600 weight. The quietest callout.
- **Redacted (custom):** Content replaced with black bars. Label: `[REDACTED -- CLEARANCE REQUIRED]`. Hover reveals content with a 300ms CSS transition. Used sparingly for hidden details or Easter eggs. On deep/decayed pages, redacted blocks occasionally appear uninvited around genuinely trivial text (e.g., a config option name is "redacted" with the value visible, implying the system itself is obscuring information).

### Motion

1. **Tile grid drift on scroll.** The background tile grid shifts `background-position` by 0-2px as the user scrolls, scaled by `--page-decay`. At depth 0, no drift. At depth 4+, the grid moves just enough to be subliminal. Implemented with CSS `scroll-timeline` where supported, falling back to a 10-line JS scroll listener.

2. **Decay reveal on page load.** When a page with `--page-decay > 0` loads, the decay effects animate from zero to their target values over 600ms with a 300ms delay. The page appears pristine, then settles into its corrupted state. Uses CSS `@keyframes` with `animation-fill-mode: forwards`.

3. **Stamp press on callouts.** When a callout with a stamp label enters the viewport (IntersectionObserver), the label scales from 1.08 to 1.0 with opacity from 0.4 to target over 150ms. Fires once. Abrupt, physical.

4. **Caustic shimmer at depth.** On pages with `--page-decay > 0.3`, a very slow (12-second cycle) radial-gradient animation runs on the background at `calc(var(--page-decay) * 0.04)` opacity. Two overlapping gradients at different speeds create an organic shimmer. The effect is so subtle it registers as "the light is doing something" rather than "there is an animation."

**Reduced-motion fallback.** All animations disabled. Decay values applied instantly (no reveal animation). Tile grid static. Caustic shimmer becomes a static texture. Stamps appear at full opacity.

### Signature Component: "The Protocol Header"

Every content page features a Protocol Header block between the page's tile accent band and its `<h1>` title. It is a 48px-tall bar (or a block of 3-4 lines on narrow viewports) with `--lz-surface-alt` background and a 1px bottom border.

**Structure:**

```
PROTOCOL: BL-CMD-003          CLASSIFICATION: LEVEL 0 // OPEN          2026-02-14
```

- **Left:** Protocol ID in JetBrains Mono, `--lz-classified`. Auto-generated from the page slug (e.g., `/commands/grab/` becomes `BL-CMD-GRAB`).
- **Center:** Classification level in Staatliches. Default pages: `LEVEL 0 // OPEN` in `--lz-classified`. Advanced/internal pages: `LEVEL 2 // RESTRICTED` in `--lz-accent`. Deprecated: `ARCHIVED // DO NOT DISTRIBUTE` with strikethrough.
- **Right:** Last-modified date in JetBrains Mono, `--lz-text-muted`.

**Decay behavior.** On pages with `--page-decay > 0.2`, the protocol header gains subtle changes:
- The classification text shifts 1px vertically.
- A faint blue-tinted stain appears behind the protocol ID (water damage reaching the filing system).
- At `--page-decay > 0.5`, the classification changes to `LEVEL ? // [STATUS UNCLEAR]` in a color between navy and teal.

**Implementation.** A single Astro component that reads page frontmatter (or derives values from the file path). The decay effects are driven entirely by the `--page-decay` CSS variable with no JS. The component replaces Starlight's default page header and is approximately 40 lines of Astro + 30 lines of CSS.

The Protocol Header accomplishes three things: it establishes the institutional voice on every page, it provides genuinely useful metadata (last updated, section category), and it serves as the primary canvas for the decay mechanic. It is the first thing the reader sees that tells them "you are in a specific place in a specific system -- and that system may not be entirely stable."

### Full CSS Token Set

```css
:root {
  /* Level Zero -- Light Mode (Primary) */
  --lz-bg: #F5F5F0;
  --lz-surface: #FFFFFF;
  --lz-surface-alt: #EDECEB;
  --lz-text: #1A1A1E;
  --lz-text-muted: #6B6968;
  --lz-text-far: #A0A09A;
  --lz-accent: #C23828;
  --lz-accent-low: rgba(194, 56, 40, 0.08);
  --lz-accent-secondary: #1A3A5C;
  --lz-tile-grout: #D4D0C8;
  --lz-tile-accent: #C8D8E0;
  --lz-code-bg: #F0EFEA;
  --lz-code-border: #D0CFC8;
  --lz-border: #C8C7C3;
  --lz-stamp-red: rgba(194, 56, 40, 0.35);
  --lz-classified: #1A3A5C;

  /* Decay tokens (driven by --page-decay) */
  --page-decay: 0;
  --lz-decay-stain: rgba(180, 210, 228, calc(var(--page-decay) * 0.06));
  --lz-decay-caustic: rgba(184, 232, 255, calc(var(--page-decay) * 0.04));
  --lz-decay-grout-shift: calc(var(--page-decay) * -15);
  --lz-decay-heading-skew: calc(var(--page-decay) * -0.3deg);
  --lz-decay-grid-drift: calc(var(--page-decay) * 2px);

  /* Typography */
  --font-display: 'Bebas Neue', Impact, sans-serif;
  --font-heading: 'Libre Baskerville', Georgia, serif;
  --font-body: 'Archivo', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', Consolas, monospace;
  --font-stamp: 'Staatliches', Impact, sans-serif;

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

  /* Starlight integration tokens */
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

[data-theme="dark"] {
  --lz-bg: #0E1218;
  --lz-surface: #161C24;
  --lz-surface-alt: #1C242E;
  --lz-text: #D8D4CC;
  --lz-text-muted: #7A7872;
  --lz-text-far: #505050;
  --lz-accent: #D44838;
  --lz-accent-low: rgba(212, 72, 56, 0.12);
  --lz-accent-secondary: #5B8FD4;
  --lz-tile-grout: #2A3040;
  --lz-tile-accent: #1A3848;
  --lz-code-bg: #0A1018;
  --lz-code-border: #2A3040;
  --lz-border: #2A2E38;
  --lz-stamp-red: rgba(212, 72, 56, 0.30);
  --lz-classified: #5B8FD4;
  --lz-decay-stain: rgba(0, 140, 180, calc(var(--page-decay) * 0.06));
  --lz-decay-caustic: rgba(0, 200, 240, calc(var(--page-decay) * 0.04));
}
```

### Astro/Starlight Implementation Notes

1. **Decay injection.** Create a custom Starlight layout wrapper (`src/layouts/DocsLayout.astro`) that calculates `--page-decay` from the page's file path depth. Depth 1 = 0.0, depth 2 = 0.1, depth 3 = 0.25, depth 4+ = 0.4-0.6. Inject this as a `style` attribute on the `<main>` element. This is the single integration point for the entire decay system; all visual effects cascade from this one variable.

2. **Protocol Header component.** Create `src/components/ProtocolHeader.astro`. It reads `Astro.props` for the page title, slug, and last-updated date. The protocol ID is derived from the slug (e.g., `commands/grab` becomes `BL-CMD-GRAB` by splitting on `/`, uppercasing, and joining with `-`). The classification level can be set via frontmatter (`classification: "restricted"`) or defaults to `LEVEL 0 // OPEN`. Override Starlight's `PageTitle` component slot to include the Protocol Header above the title.

3. **Tile grid background.** Apply `--lz-tile-grid` as `background-image` on the `<body>` with `opacity: 0.045`. Use `background-attachment: fixed` so the grid is stationary (content scrolls beneath it, reinforcing the "tiled wall" metaphor). At `--page-decay > 0`, a second background layer adds the caustic shimmer animation.

4. **Sidebar protocol prefixes.** Override Starlight's sidebar via the `Sidebar` component slot. Prepend protocol group prefixes (`BL-CMD`, `BL-CFG`) to each top-level section label using CSS `::before` content generated from a `data-protocol` attribute set in the sidebar configuration.

5. **Redaction bar.** Create a remark plugin (`remark-redacted.mjs`) that transforms `:redacted[text]` syntax into `<span class="redacted" aria-label="Classified content">text</span>`. CSS handles the visual redaction and hover reveal. Screen readers read the actual text via `aria-label`. Approximately 25 lines of plugin code and 15 lines of CSS.

6. **Font loading.** Load Bebas Neue (display only, ~20KB), Libre Baskerville (400/700, ~60KB), Archivo (400/600, ~40KB), JetBrains Mono (400, ~50KB), and Staatliches (400, ~15KB) via Google Fonts with `display=swap`. Total font budget: ~185KB, within acceptable range. Subset to Latin if not needing extended character sets.

7. **Reduced motion.** Wrap all decay animations and the caustic shimmer in `@media (prefers-reduced-motion: no-preference)`. In reduced-motion mode, decay CSS values apply instantly (no transition), the tile grid is static, and the caustic layer is a fixed low-opacity gradient (no animation).

---

## 4. Moodboard Prompts

### Moodboard 1: Grid Collapse

A top-down photograph of a large-format Swiss International Style poster (white paper, Helvetica-bold black text, red accent bar) lying flat on a worn beige carpet under harsh fluorescent lighting. The poster is pristine on the left side but transitions rightward into water damage: the paper buckles, the red bar bleeds into rust-orange, the grid lines warp and separate, and a faint yellow-brown stain spreads from the lower-right corner like a slow tide. The fluorescent tube above is reflected in a thin puddle forming at the paper's edge. The composition is shot from directly above, flat, clinical, with a single warm shadow from the photographer's unseen hand. Reference: the visual language of Vignelli's NYC subway map crossed with the Backrooms carpet decay. Render as a high-resolution architectural photograph, natural overhead lighting, shallow depth of field on the water edge, Hasselblad medium-format aesthetic.

### Moodboard 2: Threshold Protocol

A flat-lay composition on a gray steel desk surface, arranged with the precision of an evidence photograph. In the center: a stack of off-white government documents, the top page showing a typewriter-typed heading ("PROTOCOL: BL-CMD-003 -- SUBJECT: AUTOMATIC TASK SELECTION") with a red "CLASSIFIED" rubber stamp impression at a slight angle. Surrounding the stack: a manila folder with a typed label, a single black redaction bar (a physical strip of opaque tape) obscuring one line of text, a Bic pen with the cap off, and a pair of reading glasses with one lens slightly cracked. The desk has a single fluorescent reflection running diagonally. The color temperature is cold institutional white with warm amber in the document paper. Reference: David Fincher's Zodiac evidence room scenes crossed with SCP Foundation containment documents. Render as a forensic evidence photograph, overhead studio lighting with a single soft-box, Nikon D850 RAW aesthetic, focus stacked for full sharpness, 35mm equivalent lens.

### Moodboard 3: Poolrooms

An architectural interior photograph of an infinite tiled room with no visible ceiling. The walls and floor are covered in small square ceramic tiles in pale blue-white, with neat grout lines receding into a vanishing point. The lower third of the walls is submerged in absolutely still, crystal-clear water that reflects the tile pattern perfectly. Fluorescent tube lights mounted high on the walls cast caustic ripple patterns (dancing light refractions) across the dry upper tiles. The water is lit from below by a single submerged pool light emitting a cool aqua glow. There is no furniture, no people, no doors -- just tile, water, light, and infinite depth. The space is serene and deeply unsettling. Reference: Backrooms Poolrooms Level 37, James Turrell's light installations, and mid-century municipal swimming pool architecture. Render as a wide-angle architectural photograph shot on a 17mm tilt-shift lens, long exposure to smooth the water surface, tungsten-balanced with slight cyan cross-processing, the style of Candida Hofer's institutional interior photography.

---

*End of synthesis. This document recommends proceeding with the "Level Zero" hybrid direction, which combines the structural narrative of Grid Collapse, the institutional voice of Threshold Protocol, and the material world of the Poolrooms into a single cohesive design system that is distinctive, implementable, and deeply on-brand for The Backlogs.*
