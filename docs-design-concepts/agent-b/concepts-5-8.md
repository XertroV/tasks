# The Backlogs -- Docs Website Visual Concepts 5-8

---

## Concept 5: "Archival Operations Manual"

### 1) Concept Name
**Archival Operations Manual**

### 2) Vibe Statement
An archival operations manual recovered from a liminal facility that shouldn't exist -- dog-eared, coffee-stained, and stamped CLASSIFIED, yet meticulously organized by someone who knew the system was failing.

### 3) Visual System

**Palette**:
| Token                | Hex       | Role                                   |
|----------------------|-----------|----------------------------------------|
| `--color-bg`         | `#F5F0E1` | Aged manila paper                      |
| `--color-bg-alt`     | `#EDE6D0` | Slightly darker parchment for surfaces |
| `--color-surface`    | `#E8DFC8` | Card stock / folder tab background     |
| `--color-text`       | `#1A1A2E` | Institutional blue-black ink           |
| `--color-text-muted` | `#6B6B7B` | Faded carbon-copy text                 |
| `--color-accent`     | `#1B3A6B` | Deep institutional blue (stamps, links)|
| `--color-accent-hot` | `#C23B22` | Red classification stamp / URGENT      |
| `--color-code-bg`    | `#FFFDF5` | Slightly whiter, like a fresh page     |
| `--color-code-border`| `#C4B99A` | Tape edge / ruled line                 |
| `--color-tab-active` | `#D4C9A8` | Active folder tab (raised)             |
| `--color-ring-hole`  | `#B8AE94` | Ring-binder hole shadow                |
| `--color-stamp-bg`   | `#F5F0E1` | Background behind rubber stamps        |
| `--color-redact`     | `#1A1A2E` | Redaction bar color                    |

Dark mode adaptation:
| Token                | Hex       | Role                                   |
|----------------------|-----------|----------------------------------------|
| `--color-bg`         | `#1C1B18` | Darkroom / microfilm viewer background |
| `--color-bg-alt`     | `#252420` | Raised card surface                    |
| `--color-surface`    | `#2E2D28` | Folder tab in low light                |
| `--color-text`       | `#D4CCB0` | Aged paper tone on dark                |
| `--color-text-muted` | `#8A8472` | Carbon-copy on dark background         |
| `--color-accent`     | `#5B8FD4` | Lighter institutional blue for dark bg |
| `--color-accent-hot` | `#E05A45` | Brighter red stamp for dark bg         |
| `--color-code-bg`    | `#22211C` | Dark code panel                        |

**Typography pairing**:
- **Display**: [Special Elite](https://fonts.google.com/specimen/Special+Elite) -- typewriter font with genuine ink irregularity. Used for headings, stamp text, and classification labels.
- **Body**: [Lora](https://fonts.google.com/specimen/Lora) -- a serif with slight calligraphic warmth that reads like a well-typeset internal report. Excellent readability at body sizes.
- **Monospace**: [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) -- institutional, technical, period-appropriate for mainframe printout content.

**Texture/material cues**:
- Manila folder card stock with visible fiber
- Carbon-copy paper with slight blue-shift bleed
- Ring-binder holes punched along the left margin of content pages
- Coffee ring stains as very subtle watermarks on certain pages
- Red rubber stamp impressions (slightly rotated, imperfect registration)
- Photocopier artifacts: slight skew, edge darkening, toner speckling
- Paper clip shadows in the top-right of certain callout boxes
- Ruled lines (faint blue horizontal rules) as section separators

**Iconography style**:
- Hand-stamped aesthetic: thick outlines, slightly misregistered fills
- Monochrome institutional blue, with occasional red for warnings
- Geometric but imperfect -- as if cut from a stencil set
- Tab-index markers (A, B, C...) for navigation categories

### 4) Layout Ideas

**Homepage hero**:
A "cover page" layout: centered title in Special Elite typewriter font, stamped with a slightly rotated "CLASSIFIED // LEVEL 0" red rubber stamp. Below the title, a dossier-style summary block with a ruled-line border and a faint document ID number in the corner (e.g., "DOC-BL-001 // REV 3.2"). The hero background has a subtle manila paper texture with very faint photocopier edge darkening (CSS radial gradient, darker at edges). The `bl` command list appears as a table of contents with dotted leader lines connecting entries to page numbers (which are actually section anchors).

**Sidebar/nav style**:
Styled as folder tabs protruding from the left edge. Each top-level section is a manila folder tab with a typed label. The active tab appears "pulled forward" with a slightly brighter background and a subtle box-shadow. Nested items appear as an indented index within the open folder, using the body serif font. A vertical line of ring-binder holes (three small circles) runs along the left edge of the sidebar, purely decorative, created with repeating CSS `radial-gradient`. The sidebar background is slightly darker parchment (`--color-bg-alt`).

**Content page structure**:
- H1 headers are rendered in Special Elite, all-caps, with a faint underline that mimics a typewriter underline (individual dashes, not a solid CSS border).
- H2 headers appear as if stamped: slightly rotated (CSS `transform: rotate(-0.5deg)`), with a thin rectangular border styled like a rubber stamp impression.
- Body text in Lora at 18px/1.7 line-height for comfortable reading.
- Paragraphs separated by 1.5em, mimicking double-spaced institutional reports.
- A faint blue ruled line appears every ~4 lines of text as a background-image repeating gradient (extremely subtle, only visible on close inspection).
- Page margins are generous (left margin especially wide to accommodate the "ring binder" area).

**Callout patterns**:
- **Note**: A manila card with a paper-clip icon (CSS-only, using rotated borders) in the top-right corner. Slight drop shadow as if placed on top of the page. Header text in Special Elite.
- **Warning**: Bordered in red with a "CAUTION" rubber stamp rotated -3deg across the top-left corner. The stamp text uses `text-transform: uppercase; letter-spacing: 0.2em`.
- **Tip**: Styled as a Post-it note: pale yellow background (`#FFF8B8`), slight rotation (`transform: rotate(0.8deg)`), subtle box-shadow. Handwriting-style header using a cursive font would be ideal but for accessibility, uses Special Elite italic.
- **Danger**: A full redaction-bar aesthetic: black background with white text, as if the surrounding text was blacked out and only this warning remains visible.

### 5) Motion Ideas

1. **Stamp impact**: When a page loads, classification stamps (e.g., section labels, warning callouts) animate in with a quick scale-up from 1.2 to 1.0 with a slight rotation adjustment, mimicking the physical impact of a rubber stamp hitting paper. Duration: 200ms, ease-out. One stamp per page load, maximum.

2. **Typewriter cursor on search**: When the search input is focused, a blinking block cursor (CSS animation, `border-right: 2px solid var(--color-text)` with `animation: blink 1s step-end infinite`) appears, and placeholder text types out character by character using a CSS `@keyframes` animation on `max-width` of an `overflow: hidden` span.

3. **Page-turn fade**: Content pages transition in with a subtle skew-and-fade: `opacity: 0 -> 1` combined with `transform: perspective(800px) rotateY(2deg) -> rotateY(0)` over 300ms, suggesting a page being turned flat.

**Reduced-motion fallback**: All animations replaced with simple `opacity: 0 -> 1` fades at 150ms. Stamp impact becomes a static placement. Typewriter cursor becomes a standard blinking CSS caret.

### 6) Signature Component

**The Classification Header Strip**

Every documentation page has a top strip that mimics a document classification header from an institutional filing system. It is a 48px-tall bar spanning the full content width with the following elements:

- **Left**: A document ID in IBM Plex Mono, auto-generated from the page slug (e.g., `BL-CMD-0042`), rendered in faded blue ink (`--color-accent` at 60% opacity).
- **Center**: The page title in Special Elite, uppercase, letter-spaced at 0.15em.
- **Right**: A "classification level" badge. For normal pages: `LEVEL 0 // OPEN`. For advanced/internal pages: `LEVEL 2 // RESTRICTED` in red. For deprecated content: `ARCHIVED // DO NOT DISTRIBUTE` with a strikethrough.

The entire strip has a bottom border styled as a perforated line (CSS `border-bottom: 2px dashed var(--color-code-border)`) suggesting the document could be torn along this line. The strip background is a slightly different shade of manila (`--color-surface`) and the entire element has a very subtle `box-shadow: inset 0 -1px 3px rgba(0,0,0,0.06)` to feel recessed, as if embossed into the page.

On hover, the document ID briefly highlights as if selected for photocopying. On the homepage, the strip reads `MASTER INDEX // THE BACKLOGS // OPERATIONS MANUAL` with the red CLASSIFIED stamp overlaid.

### 7) Risks/Tradeoffs

- **Readability**: The typewriter display font (Special Elite) has lower readability than a clean sans-serif at small sizes. Mitigation: restrict it to H1/H2 headers and stamp labels only; never use for body text or code.
- **Implementation complexity**: The ring-binder holes, paper-clip decorations, and rubber-stamp overlays require careful CSS positioning. The photocopier edge-darkening effect needs a well-tuned radial gradient. Moderate complexity but all achievable with CSS only.
- **Novelty risk**: The "recovered document" aesthetic could feel gimmicky if overdone. The key is restraint: body text and code blocks must be perfectly clean and readable. The archival decoration is confined to headers, callouts, navigation, and page furniture. The actual content reading experience should feel like a well-organized report, not a prop.
- **Dark mode challenge**: The paper/manila aesthetic is inherently light-themed. Dark mode reframes as "microfilm viewer" or "darkroom examination" which is thematically consistent but requires separate texture work.
- **Font loading**: Special Elite is a display-only font and relatively lightweight (~30KB). Lora is well-optimized. IBM Plex Mono is larger but standard. Total web font budget: ~120KB, acceptable.

### 8) Practicality Score: 8/10
All elements are implementable with CSS custom properties, pseudo-elements, and background gradients. The folder-tab navigation requires Starlight component overrides for the sidebar but is straightforward. The classification header strip is a simple layout slot override. No JavaScript required for any visual effect except the optional typewriter search animation.

### 9) Distinctiveness Score: 9/10
The archival/institutional document aesthetic is rarely seen in developer documentation. The combination of typewriter typography, classification stamps, ring-binder decoration, and manila textures creates a strongly branded experience that is immediately recognizable and deeply tied to the Backrooms "recovered document" lore.

### 10) Sample CSS Token Set
```css
:root {
  /* Archival Operations Manual */
  --color-bg: #F5F0E1;
  --color-bg-alt: #EDE6D0;
  --color-surface: #E8DFC8;
  --color-text: #1A1A2E;
  --color-text-muted: #6B6B7B;
  --color-accent: #1B3A6B;
  --color-accent-hot: #C23B22;
  --color-code-bg: #FFFDF5;
  --color-code-border: #C4B99A;
  --color-tab-active: #D4C9A8;
  --color-ring-hole: #B8AE94;
  --color-redact: #1A1A2E;
  --font-display: 'Special Elite', 'Courier New', monospace;
  --font-body: 'Lora', 'Georgia', serif;
  --font-mono: 'IBM Plex Mono', 'Courier New', monospace;
  --radius-stamp: 2px;
  --stamp-rotation: -1.5deg;
}

[data-theme="dark"] {
  --color-bg: #1C1B18;
  --color-bg-alt: #252420;
  --color-surface: #2E2D28;
  --color-text: #D4CCBO;
  --color-text-muted: #8A8472;
  --color-accent: #5B8FD4;
  --color-accent-hot: #E05A45;
  --color-code-bg: #22211C;
  --color-code-border: #3D3A30;
  --color-ring-hole: #3A3830;
}
```

---

## Concept 6: "Corridor Depth"

### 1) Concept Name
**Corridor Depth**

### 2) Vibe Statement
The documentation site IS a corridor -- one-point perspective governs every surface, navigation items are doorways receding into depth, and content pages are rooms you have entered, always aware of the hallway continuing behind you.

### 3) Visual System

**Palette**:
| Token                | Hex       | Role                                    |
|----------------------|-----------|-----------------------------------------|
| `--color-bg`         | `#F7F3E8` | Distant wall (light, washed out by fluorescent light) |
| `--color-bg-deep`    | `#2A2518` | Deep corridor void                      |
| `--color-surface`    | `#EBE5D2` | Near wall (content card surface)        |
| `--color-surface-raised` | `#FFFCF0` | Closest surface (active content)   |
| `--color-text`       | `#2C2817` | Dark text (near, readable)              |
| `--color-text-muted` | `#8A8068` | Receding text (further away)            |
| `--color-text-far`   | `#B5AD96` | Very distant text (disabled/decorative) |
| `--color-accent`     | `#D4A828` | Warm fluorescent highlight              |
| `--color-accent-glow`| `#FFECB3` | Light pool on surfaces                  |
| `--color-code-bg`    | `#2A2518` | Code is a dark room you look into       |
| `--color-code-text`  | `#E8DFC0` | Lit text inside the dark room           |
| `--color-floor`      | `#9C8F6B` | Carpet tan for horizontal rules         |
| `--color-ceiling`    | `#D4CDB8` | Ceiling tile gray for top borders       |
| `--color-shadow`     | `#1A1508` | Deep perspective shadow                 |

Dark mode:
| Token                | Hex       | Role                                    |
|----------------------|-----------|-----------------------------------------|
| `--color-bg`         | `#131110` | Corridor with lights mostly off         |
| `--color-bg-deep`    | `#050403` | Total void at vanishing point           |
| `--color-surface`    | `#1E1C17` | Near wall, dimly lit                    |
| `--color-surface-raised` | `#28251E` | Active content under a light pool  |
| `--color-text`       | `#D8D0B8` | Illuminated text                        |
| `--color-text-muted` | `#7A7260` | Partially lit text                      |
| `--color-accent`     | `#E8BC3A` | Fluorescent accent, brighter in dark    |
| `--color-accent-glow`| `#3D3418` | Subtle glow halo in dark                |
| `--color-code-bg`    | `#0A0908` | Even darker code room                   |
| `--color-code-text`  | `#C8C0A0` | Code text                               |

**Typography pairing**:
- **Display**: [DM Serif Display](https://fonts.google.com/specimen/DM+Serif+Display) -- high-contrast serif with strong vertical stress, evoking the vertical lines of a corridor perspective. The thick-thin stroke variation creates a natural sense of depth.
- **Body**: [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4) -- refined, highly readable, with optical sizing that naturally adjusts weight for different sizes (smaller text appears further away and gains compensating weight).
- **Monospace**: [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) -- technical, precise, with slightly increased height that works well against the "dark room" code backgrounds.

**Texture/material cues**:
- Converging perspective lines as CSS border/gradient effects
- Layered card surfaces with progressive shadow depths (1dp, 4dp, 8dp)
- Fluorescent light pool effects: radial gradient "spotlights" on surfaces
- Carpet texture for floor (bottom borders, footers)
- Ceiling tile grid for header areas (repeating square pattern)
- Wallpaper stripe suggestion in sidebar backgrounds (faint vertical repeat)
- Distance fog: elements further from "viewer" (less important) have reduced contrast

**Iconography style**:
- Thin-line geometric with perspective foreshortening
- Icons styled as wall signs: rectangular frames with simple pictograms
- Consistent 1.5px stroke weight, `--color-text` fill
- Doorway motif (rectangle with dark interior) for navigation links

### 4) Layout Ideas

**Homepage hero**:
A full-width one-point perspective illustration built entirely from CSS gradients and borders. Two "walls" converge toward a vanishing point at center, created with angled CSS linear-gradients. The floor is a carpet-tan gradient getting darker toward the center (distance). The ceiling is a repeating tile grid shrinking toward the vanishing point. "THE BACKLOGS" appears as large text centered on the far wall (small, at the vanishing point) with a warm fluorescent glow behind it (`text-shadow` and radial gradient). Below the perspective illustration, the tagline appears as if written on the floor: `perspective: 800px; transform: rotateX(45deg)`. Key navigation links are styled as doorways -- dark rectangles along the corridor walls, each with a label above it like a room number.

**Sidebar/nav style**:
The sidebar represents "rooms along the corridor." Each top-level nav item is a doorway: a dark rectangular block with the label appearing as a room sign above/beside it. The active page's doorway is "entered" -- it loses its dark fill and instead its content area (the main content panel) becomes the "room interior." Nested nav items appear as sub-rooms or features within the current room. The sidebar has a subtle vertical gradient: brighter at the top (nearer to the viewer), darker at the bottom (further down the corridor). A thin converging line runs along the sidebar's right edge, tapering from 2px at top to 0.5px at bottom (achievable with a CSS border-image gradient).

**Content page structure**:
- Content exists within a "room" -- a card with layered depth. The card has a top shadow (ceiling), bottom shadow (floor), and side shadows (walls). The active content card uses `--color-surface-raised` and has the strongest shadow, feeling closest to the viewer.
- H1 headers have a subtle fluorescent glow effect: `text-shadow: 0 0 30px var(--color-accent-glow)` suggesting the text is under a ceiling light.
- H2 headers use a left-border styled as a wall edge (thick, tapering).
- Paragraphs at 17px/1.75 line-height in Source Serif 4.
- Code blocks are styled as "dark rooms" -- recessed panels with darker backgrounds and an inset shadow suggesting depth. A faint light-bar appears at the top of code blocks (thin gradient strip).

**Callout patterns**:
- **Note**: A door-sign style: small rectangular card with a top border in `--color-accent`, slightly recessed with `box-shadow: inset 0 1px 3px rgba(0,0,0,0.1)`. Feels like a sign posted next to a doorway.
- **Warning**: The sign gains a warm amber glow (`box-shadow: 0 0 15px rgba(212,168,40,0.2)`) and a caution-stripe top border (repeating linear-gradient of yellow and dark, 45deg).
- **Tip**: A "light pool" callout -- the background is slightly brighter (`--color-surface-raised`) with a soft radial gradient from center, as if a fluorescent light is directly overhead. Feels like a well-lit spot in the corridor.
- **Danger**: The doorway leads somewhere bad: dark background (`--color-bg-deep`), text in a warning color, entire callout feels like peering into a dark room. Red-tinted top border.

### 5) Motion Ideas

1. **Parallax depth on scroll**: As the user scrolls, sidebar items and background decorative elements move at slightly different rates using `transform: translateY()` driven by a lightweight scroll listener (or pure CSS `scroll-timeline` where supported). The effect is subtle -- 0.95x for the sidebar, 1.0x for content, 1.02x for decorative far-wall elements. Creates a gentle sense of moving through a corridor.

2. **Doorway hover**: When hovering over navigation items (doorways), the dark interior rectangle subtly brightens (`background-color` transition, 200ms) and gains a faint warm glow, as if a light is flickering on inside the room. A thin warm-yellow line appears at the bottom of the doorway (threshold).

3. **Content room entrance**: When navigating to a new page, the content area fades in with a slight scale-up from 0.98 to 1.0 combined with a shadow expansion, suggesting the user has stepped forward into a new room. Duration: 250ms ease-out.

**Reduced-motion fallback**: Parallax disabled entirely (all elements move at 1.0x). Doorway hover becomes a simple background-color change with no glow. Content entrance becomes a 150ms opacity fade with no transform.

### 6) Signature Component

**The Corridor Navigation Header**

A full-width header element (64px tall) that visualizes the user's position in the documentation hierarchy as a one-point perspective corridor. The implementation:

- The header background is a CSS-only one-point perspective corridor rendered with converging linear-gradients. Two trapezoidal "walls" (left and right) converge toward a vanishing point at the horizontal center. The floor and ceiling are suggested by top and bottom edge gradients.
- **Breadcrumbs as distance markers**: Each breadcrumb segment appears at a different "depth" in the corridor. The root ("The Backlogs") appears smallest and most muted at the vanishing point (center). Each subsequent level appears larger, brighter, and more "forward." The current page title appears at the largest size, fully saturated, at the front.
- Typography scales with depth: root breadcrumb at 11px in `--color-text-far`, intermediate at 13px in `--color-text-muted`, current at 16px bold in `--color-text`.
- A faint horizontal line connects the breadcrumb segments, tapering from thin (back) to thick (front), styled as the corridor's floor-wall junction.
- The vanishing point shifts horizontally based on scroll position (CSS `scroll-timeline`), creating a very subtle head-turn parallax effect.

This component replaces the standard Starlight breadcrumb and encodes spatial metaphor directly into the navigation. It immediately signals "you are in a place, not just reading a page."

### 7) Risks/Tradeoffs

- **Readability**: The depth metaphor must not interfere with text clarity. Distant/muted text should only be used for decorative or navigational elements, never for content the user needs to read. Code blocks being "dark rooms" works well for dark-on-light sites but needs careful contrast checking.
- **Implementation complexity**: The CSS perspective corridor in the header is achievable with gradients and transforms but requires careful tuning across viewport sizes. Parallax scroll effects need a lightweight JS solution or CSS `scroll-timeline` (partial browser support). Medium-high complexity.
- **Novelty risk**: The corridor concept is deeply tied to the Backrooms brand, which is a strength. Risk is that the perspective effects feel disorienting. Mitigation: keep perspective transforms subtle (never more than 3deg rotation, never more than 5% scale change).
- **Performance**: Multiple layered gradients and box-shadows could impact rendering on low-end devices. The parallax effect should use `transform` and `will-change` for GPU acceleration. Acceptable with care.
- **Responsive design**: The corridor header needs a mobile adaptation where the perspective effect is simplified or replaced with a depth-through-opacity approach.

### 8) Practicality Score: 6/10
The core color system and typography are straightforward. The corridor header and parallax effects are more complex but achievable. The main implementation challenge is the CSS perspective corridor -- it requires precise gradient math and responsive breakpoints. The sidebar doorway styling requires Starlight component overrides. Some effects (scroll-timeline parallax) have limited browser support and need fallbacks.

### 9) Distinctiveness Score: 9/10
One-point perspective as an organizing principle for a documentation site is genuinely novel. The spatial metaphor of "rooms along a corridor" for navigation creates a memorable mental model that is both functional (it maps to hierarchical navigation) and deeply atmospheric. No other docs site looks like this.

### 10) Sample CSS Token Set
```css
:root {
  /* Corridor Depth */
  --color-bg: #F7F3E8;
  --color-bg-deep: #2A2518;
  --color-surface: #EBE5D2;
  --color-surface-raised: #FFFCF0;
  --color-text: #2C2817;
  --color-text-muted: #8A8068;
  --color-text-far: #B5AD96;
  --color-accent: #D4A828;
  --color-accent-glow: #FFECB3;
  --color-code-bg: #2A2518;
  --color-code-text: #E8DFC0;
  --color-floor: #9C8F6B;
  --color-ceiling: #D4CDB8;
  --color-shadow: #1A1508;
  --font-display: 'DM Serif Display', 'Georgia', serif;
  --font-body: 'Source Serif 4', 'Georgia', serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
  --depth-near: 0 2px 8px rgba(26,21,8,0.12);
  --depth-mid: 0 4px 16px rgba(26,21,8,0.18);
  --depth-far: 0 1px 3px rgba(26,21,8,0.06);
}

[data-theme="dark"] {
  --color-bg: #131110;
  --color-bg-deep: #050403;
  --color-surface: #1E1C17;
  --color-surface-raised: #28251E;
  --color-text: #D8D0B8;
  --color-text-muted: #7A7260;
  --color-accent: #E8BC3A;
  --color-accent-glow: #3D3418;
  --color-code-bg: #0A0908;
  --color-code-text: #C8C0A0;
}
```

---

## Concept 7: "Maintenance Terminal"

### 1) Concept Name
**Maintenance Terminal**

### 2) Vibe Statement
The dedicated maintenance console bolted to the wall in a building sub-basement -- phosphor glow on dark glass, scan lines murmuring across the display, chunky input fields awaiting commands from someone who knows the system exists.

### 3) Visual System

**Palette**:
| Token                | Hex       | Role                                      |
|----------------------|-----------|-------------------------------------------|
| `--color-bg`         | `#0A0E08` | CRT glass, powered off (near-black green) |
| `--color-bg-panel`   | `#0D120A` | Slightly lighter panel area               |
| `--color-surface`    | `#131A0F` | Raised panel / input field background     |
| `--color-text`       | `#33FF66` | Primary phosphor green (P1 phosphor)      |
| `--color-text-dim`   | `#1A8033` | Dim phosphor (inactive/muted text)        |
| `--color-text-bright`| `#88FFAA` | Bright phosphor (highlighted/active)      |
| `--color-text-burn`  | `#CCFFDD` | Phosphor burn-in (headers, emphasis)      |
| `--color-accent`     | `#FFB833` | Amber warning (different phosphor color)  |
| `--color-accent-dim` | `#805C1A` | Dim amber                                 |
| `--color-code-bg`    | `#060A05` | Deeper black for code regions             |
| `--color-border`     | `#1A331A` | Panel frame / divider lines               |
| `--color-scanline`   | `rgba(0,0,0,0.15)` | Scan line overlay opacity        |
| `--color-glow`       | `rgba(51,255,102,0.06)` | Phosphor bloom around text    |
| `--color-crt-edge`   | `#050805` | CRT bezel edge darkening                  |

Light mode adaptation (this concept is primarily dark, but for accessibility):
| Token                | Hex       | Role                                      |
|----------------------|-----------|-------------------------------------------|
| `--color-bg`         | `#F0F5EE` | Light terminal paper / greenbar           |
| `--color-text`       | `#0A3D1A` | Dark green ink on paper                   |
| `--color-text-dim`   | `#4A7A5A` | Muted green                               |
| `--color-surface`    | `#E5EDE5` | Greenbar paper stripe                     |
| `--color-accent`     | `#8B5E00` | Amber on paper                            |
| `--color-code-bg`    | `#E0EAE0` | Code on greenbar                          |

**Typography pairing**:
- **Display**: [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono) -- squared-off monospace with a technical, utilitarian character. Used for headers and labels, evoking terminal system prompts.
- **Body**: [Martian Mono](https://fonts.google.com/specimen/Martian+Mono) -- a variable-width monospace that maintains the terminal feel while providing better readability at body text sizes through its slightly wider letterforms and careful kerning. Falls back to the grid below for true body text.
- **Body alternative / long-form**: [Space Mono](https://fonts.google.com/specimen/Space+Mono) -- monospace but with character, slightly playful without being unserious. Better for extended reading than pure technical monospaces.
- **Monospace (code)**: [Fira Code](https://fonts.google.com/specimen/Fira+Code) -- programming ligatures reinforce the "this is a working system" feel. The ligatures (!=, =>, >=) look like they belong on a maintenance terminal.

**Texture/material cues**:
- CRT scan lines (horizontal repeating gradient, 2px dark / 2px transparent)
- Phosphor glow bloom (text-shadow with green spread)
- Slight CRT barrel distortion at edges (CSS border-radius on the main viewport)
- Terminal bezel: thick dark border around the content area, beveled
- Metal panel texture for the "housing" around the terminal display
- Status LEDs (small colored dots) in the header/footer area
- Chunky physical-feeling buttons with beveled edges for interactive elements

**Iconography style**:
- Pixel-art-adjacent: icons built from simple geometric shapes on an implicit grid
- Single color (phosphor green), no fills, 2px stroke weight
- ASCII-art style where possible (arrows as `>`, checkmarks as `[x]`)
- Status indicators as blinking or steady dots

### 4) Layout Ideas

**Homepage hero**:
The entire viewport is the terminal. A thick dark bezel (16px border with `--color-crt-edge` and a subtle inner bevel via `box-shadow: inset 0 0 20px rgba(0,0,0,0.5)`) frames the content area. The hero content is a "boot sequence" display:

```
MAINTENANCE TERMINAL v3.2.1
FACILITY: LEVEL 0 // SECTOR 7G
================================

SYSTEM: THE BACKLOGS
STATUS: OPERATIONAL
LAST CYCLE: 2026-02-14T08:00:00Z

> AVAILABLE COMMANDS:
  bl list ........ List all tasks
  bl grab ........ Claim next task
  bl tree ........ Show hierarchy
  bl cycle ....... Cycle session

> ENTER COMMAND OR BROWSE DOCUMENTATION_
```

The blinking cursor at the end is a CSS animation. The text appears line by line on first load with a 30ms delay between lines (CSS `animation-delay` on each line). The command list items are actual clickable links styled as terminal output.

**Sidebar/nav style**:
A vertical panel styled as a system menu. Each nav section is introduced with a bracketed label: `[ COMMANDS ]`, `[ GUIDES ]`, `[ REFERENCE ]`. Items within are prefixed with `>` for unselected and `>>` for selected/active. The active item has a full-width background highlight in `--color-surface` with a left border in bright phosphor green. The sidebar has its own scan-line overlay. A "system status" block at the bottom shows mock diagnostics:

```
SYS: OK | MEM: 64K | UPTIME: 847d
```

**Content page structure**:
- All text is monospaced, maintaining the terminal illusion.
- H1 headers are rendered in bright phosphor (`--color-text-burn`) with a bottom border of `═` characters (not CSS border, actual repeated characters or a background-image).
- H2 headers prefixed with `##` (visible in the rendered output, not just markdown), in `--color-text-bright`.
- Body text in Space Mono at 15px/1.65 line-height. The slightly smaller size is appropriate for monospace body text and maintains the terminal feel.
- Paragraph spacing is 1.2em (tighter than typical docs, matching terminal output density).
- Code blocks have zero visual distinction from surrounding text except a left-border pipe character `|` and slightly darker background. They are "the same medium."
- Horizontal rules rendered as `────────────────` in `--color-border`.

**Callout patterns**:
- **Note**: Framed with ASCII box-drawing characters: `┌──NOTE──┐` ... `└─────────┘`. Green phosphor, standard brightness.
- **Warning**: Same box format but in amber (`--color-accent`): `┌──WARNING──┐`. The amber color immediately stands out against the green.
- **Tip**: Prefixed with `[TIP]` in bright phosphor, no box frame, just an indented block with a left pipe `│`.
- **Danger**: `┌──CRITICAL──┐` in bright amber with a blinking status LED (a small `::before` pseudo-element with a CSS animation alternating between `--color-accent` and `--color-accent-dim`).

### 5) Motion Ideas

1. **Scan line drift**: A full-viewport overlay with a repeating linear-gradient (2px opaque, 2px transparent) slowly drifts downward at approximately 1 pixel per second, looping seamlessly. This is a single CSS animation on a fixed `::after` pseudo-element with `pointer-events: none`. Extremely subtle but creates the subliminal CRT feel.

2. **Phosphor bloom on hover**: When hovering over interactive elements (links, nav items, buttons), the element's `text-shadow` expands from `0 0 4px` to `0 0 12px` of the glow color over 150ms, simulating the phosphor brightening under electron beam focus. Combined with a slight color shift from `--color-text` to `--color-text-bright`.

3. **Cursor blink**: The terminal cursor (visible on the search input and in the hero) uses a precise `step-end` blink animation at 530ms intervals, matching real terminal cursor blink rates. The cursor is a solid block character `█` that alternates between `--color-text` and `transparent`.

**Reduced-motion fallback**: Scan line drift stops (static overlay). Phosphor bloom becomes an instant color change with no shadow transition. Cursor blink remains (it is expected accessible behavior for text inputs).

### 6) Signature Component

**The Command Input Bar**

A persistent, site-wide input bar fixed at the bottom of the viewport (or toggled with `/` or `Ctrl+K`), styled as a genuine maintenance terminal command prompt. Details:

- **Visual**: A 48px-tall bar spanning the viewport width, with a dark background (`--color-code-bg`), separated from content by a double-line border (`═══`). At the left, a green prompt symbol: `MAINT>` in Share Tech Mono. The input field fills the remaining width with a blinking block cursor.
- **Behavior**: Typing filters/searches documentation pages in real time. Results appear above the bar as a dropdown of matched pages, each formatted as terminal output: `[CMD] bl grab -- Claim the next available task`. Selecting a result navigates to that page.
- **Enhancement**: Typing actual `bl` commands (e.g., `bl list`) could show the command's documentation page as the top result, making the search bar feel like a real terminal.
- **Detail**: When idle for 10+ seconds, a subtle "screen saver" effect activates: the prompt changes from `MAINT>` to `MAINT> _` with increased cursor blink rate. On any keypress, it snaps back.
- **Scan lines**: The command bar has its own scan line overlay, slightly more pronounced than the main content, reinforcing that this is the "actual terminal input."

This component transforms documentation search from a passive text field into an active, immersive terminal interaction. It makes the user feel like an operator, not a reader.

### 7) Risks/Tradeoffs

- **Readability**: Monospace body text is inherently less readable than proportional fonts for long-form content. Mitigation: Use Space Mono which has better letter differentiation than most monospaces, set at 15px with generous line-height (1.65), and keep line lengths under 80 characters (which is thematically appropriate for a terminal).
- **Implementation complexity**: The scan line overlay is trivial. The phosphor glow effects require `text-shadow` on many elements (performance consideration). The command bar requires JavaScript for the search/filter functionality. The CRT bezel effect needs careful responsive handling. Medium-high complexity.
- **Novelty risk**: "Terminal aesthetic" is common in developer tools. The risk is looking like every other "hacker theme." Mitigation: This is specifically a *maintenance terminal*, not a hacker terminal. The difference is in the details: institutional language ("FACILITY", "SECTOR", "MAINTENANCE"), the bezel/housing suggesting a bolted-down physical device, status indicators suggesting a running system, and the amber accent color for warnings (real maintenance consoles use amber, not red). The tone is operational, not performative.
- **Light mode**: The light mode adaptation (greenbar paper) works but loses most of the atmospheric impact. This concept is fundamentally a dark-mode experience. The light mode should be treated as "print view" -- functional but not the intended experience.
- **Accessibility**: Green on dark has good contrast (the specific green `#33FF66` on `#0A0E08` exceeds WCAG AAA at 10.8:1). Amber accent on dark also passes. The scan line overlay reduces effective contrast slightly; at 15% opacity this reduces contrast by roughly 7%, still well within AA.

### 8) Practicality Score: 7/10
The color system and typography are simple to implement. Scan lines are a single pseudo-element. The CRT bezel is CSS borders and shadows. The command bar requires JavaScript but is essentially a styled search component (Starlight already has search). The main complexity is ensuring the all-monospace layout works responsively and maintaining the immersive feel without it becoming cumbersome. Font loading is heavier (four monospace fonts) but can be optimized with `font-display: swap` and subsetting.

### 9) Distinctiveness Score: 8/10
While "terminal aesthetic" exists in the wild, the *maintenance terminal* specificity elevates it. The institutional language, physical bezel framing, amber warning system, and command-bar-as-search concept are not standard. The scan line effect, done subtly, adds genuine atmosphere. The light mode "greenbar paper" variant is an unexpected touch. Docking this slightly because terminal themes are a known category.

### 10) Sample CSS Token Set
```css
:root {
  /* Maintenance Terminal -- dark is primary */
  --color-bg: #0A0E08;
  --color-bg-panel: #0D120A;
  --color-surface: #131A0F;
  --color-text: #33FF66;
  --color-text-dim: #1A8033;
  --color-text-bright: #88FFAA;
  --color-text-burn: #CCFFDD;
  --color-accent: #FFB833;
  --color-accent-dim: #805C1A;
  --color-code-bg: #060A05;
  --color-border: #1A331A;
  --color-glow: rgba(51, 255, 102, 0.06);
  --color-scanline: rgba(0, 0, 0, 0.15);
  --font-display: 'Share Tech Mono', 'Courier New', monospace;
  --font-body: 'Space Mono', 'Courier New', monospace;
  --font-mono: 'Fira Code', 'Courier New', monospace;
  --scanline-size: 3px;
  --glow-spread: 4px;
}

[data-theme="light"] {
  --color-bg: #F0F5EE;
  --color-bg-panel: #E5EDE5;
  --color-surface: #DAE5DA;
  --color-text: #0A3D1A;
  --color-text-dim: #4A7A5A;
  --color-text-bright: #063010;
  --color-text-burn: #042008;
  --color-accent: #8B5E00;
  --color-accent-dim: #B8934A;
  --color-code-bg: #E0EAE0;
  --color-border: #A0BCA0;
  --color-glow: transparent;
  --color-scanline: transparent;
}
```

---

## Concept 8: "Poolrooms"

### 1) Concept Name
**Poolrooms**

### 2) Vibe Statement
Serene and deeply wrong -- the eerily calm, blue-tiled, water-filled liminal space where fluorescent light refracts through impossibly still water, casting caustic ripple patterns on tile walls that go on forever.

### 3) Visual System

**Palette**:
| Token                 | Hex       | Role                                         |
|-----------------------|-----------|----------------------------------------------|
| `--color-bg`          | `#E8F4F8` | Pale blue-white tile surface                 |
| `--color-bg-water`    | `#D0E8F0` | Slightly deeper blue, water-touched surface  |
| `--color-surface`     | `#F0F8FC` | Clean white tile (content cards)             |
| `--color-surface-wet` | `#C8DFE8` | Tile with water sheen                        |
| `--color-text`        | `#1A2D3A` | Deep teal-black (readable, cool-toned)       |
| `--color-text-muted`  | `#5A7A8A` | Faded tile inscription                       |
| `--color-text-submerged` | `#7AA0B0` | Text seen through water                   |
| `--color-accent`      | `#00A8CC` | Bright aqua (pool light reflection)          |
| `--color-accent-deep` | `#006A8A` | Deep pool blue (links, interactive)          |
| `--color-caustic`     | `#B8E8FF` | Caustic light pattern color                  |
| `--color-code-bg`     | `#1A2D3A` | Deep pool bottom (dark code background)      |
| `--color-code-text`   | `#B8E0F0` | Light reflected off pool bottom              |
| `--color-grout`       | `#94B8C8` | Tile grout lines                             |
| `--color-tile-accent` | `#78C8E0` | Occasional colored tile                      |
| `--color-warning`     | `#E8A830` | Warm amber (lifeguard sign)                  |
| `--color-danger`      | `#D04848` | Red (NO DIVING sign)                         |

Dark mode:
| Token                 | Hex       | Role                                         |
|-----------------------|-----------|----------------------------------------------|
| `--color-bg`          | `#0A1820` | Night pool -- dark water surface             |
| `--color-bg-water`    | `#0E2030` | Deeper water at night                        |
| `--color-surface`     | `#122838` | Tile barely visible in low light             |
| `--color-surface-wet` | `#0A1E2C` | Wet tile reflecting pool light               |
| `--color-text`        | `#C0DDE8` | Pale blue reflected light on text            |
| `--color-text-muted`  | `#6A98A8` | Dim reflection                               |
| `--color-accent`      | `#00C8F0` | Pool light, brighter at night                |
| `--color-accent-deep` | `#0090B0` | Deeper reflection                            |
| `--color-caustic`     | `rgba(0,200,240,0.08)` | Subtle night caustics            |
| `--color-code-bg`     | `#061018` | Deepest pool                                 |
| `--color-code-text`   | `#88C0D8` | Code text in deep water                      |
| `--color-grout`       | `#1A3848` | Grout barely visible at night                |

**Typography pairing**:
- **Display**: [Outfit](https://fonts.google.com/specimen/Outfit) -- geometric sans-serif with a clean, rounded quality that evokes the smooth curves of pool tile edges and the sleek simplicity of institutional pool signage. Medium weight for headers.
- **Body**: [Nunito Sans](https://fonts.google.com/specimen/Nunito+Sans) -- rounded terminals and open letterforms mirror the soft, diffused quality of light seen through water. Excellent readability at body sizes. The gentle roundness creates a "calm" reading experience that matches the poolrooms' eerie serenity.
- **Monospace**: [Overpass Mono](https://fonts.google.com/specimen/Overpass+Mono) -- clean, geometric monospace with slightly rounded edges. Feels institutional but not harsh, like pool depth markers or chemical safety codes printed on tile.

**Texture/material cues**:
- Ceramic tile grid: repeating CSS grid pattern (thin lines at regular intervals) as a site-wide background
- Grout lines: 1px borders in `--color-grout` forming the tile grid
- Caustic light patterns: animated SVG or CSS gradient overlay that slowly morphs, simulating light refraction through water
- Water-level line: a horizontal gradient transition on certain elements, lighter above (dry tile), slightly darker below (wet tile)
- Reflective surfaces: subtle CSS gradients that mimic light glancing off wet tile
- Pool gutter/overflow edge: a decorative detail at the top or bottom of content cards -- a lip with a subtle shadow
- Tile accent bands: occasional rows of colored tiles (`--color-tile-accent`) as decorative section dividers
- Slight surface shimmer: a very faint animated gradient on interactive elements

**Iconography style**:
- Rounded geometric, matching the tile/pool aesthetic
- Thin stroke (1.5px) in `--color-accent-deep`
- Pool signage style: simple pictograms in circles or rounded squares
- Depth markers and directional arrows as navigational metaphors

### 4) Layout Ideas

**Homepage hero**:
A full-width section styled as a pool edge viewed from above. The top third is "dry tile" -- white/pale blue with the tile grid pattern visible. A soft horizontal gradient transition marks the "water line" at about 40% down. Below the water line, the background shifts to `--color-bg-water` with a subtle caustic pattern overlay (animated CSS radial gradients slowly morphing). "THE BACKLOGS" appears reflected -- the actual title is on the dry tile above the water line, and a flipped, blurred, slightly rippled duplicate appears below the water line as a CSS reflection (`transform: scaleY(-1); filter: blur(2px); opacity: 0.3`). Below the title, the tagline appears with a gentle wave distortion (CSS `clip-path` or SVG filter). Key navigation links are styled as pool depth markers: `1.0m COMMANDS`, `1.5m GUIDES`, `2.0m REFERENCE`, `3.0m API`, with the depth values suggesting how deep into the documentation you will go.

**Sidebar/nav style**:
The sidebar is a column of tile, with each nav section separated by a colored tile accent band (a thin horizontal stripe in `--color-tile-accent`). Nav items are styled as tile labels -- text directly on the tile surface, almost like engraved or painted-on pool signage. The active nav item is "underwater" -- its background shifts to `--color-surface-wet` with a faint caustic shimmer, and its text becomes `--color-accent`. The sidebar has a very subtle vertical gradient from light (top, "shallow end") to slightly darker (bottom, "deep end"). Scroll depth in the sidebar creates a gentle darkening effect via CSS `scroll-timeline`.

**Content page structure**:
- Content cards are styled as tile panels: white surface with thin grout borders, slightly rounded corners (3px -- real tile has slight rounding from glazing).
- H1 headers use Outfit at 600 weight, `--color-text`, with a bottom border that is a tile accent band: a 3px line in `--color-tile-accent` with 1px grout lines above and below.
- H2 headers in `--color-accent-deep`, slightly smaller, with a left-side depth marker (a small vertical bar suggesting pool depth markings).
- Body text in Nunito Sans at 17px/1.75 line-height. The generous line-height creates a "spacious" feel matching the airy emptiness of the poolrooms.
- Code blocks styled as "deep pool" panels: dark blue background (`--color-code-bg`) with light text, an inset shadow suggesting depth, and a top edge styled as a water surface (thin gradient from `--color-bg-water` to `--color-code-bg` over 4px).
- Horizontal rules are tile accent bands: three thin lines (grout, colored tile, grout).

**Callout patterns**:
- **Note**: A tile panel with a left border in `--color-accent` (like a colored tile column at the edge of a pool lane). Clean white background. Header in Outfit semibold.
- **Warning**: Styled as a pool safety sign: amber/yellow background (`#FFF5E0`), `--color-warning` border, text in `--color-text`. A small triangle-exclamation icon rendered in CSS, evoking "CAUTION: WET FLOOR" signs.
- **Tip**: A "reflection" callout -- the callout appears to float slightly above its shadow (elevated `box-shadow: 0 4px 12px rgba(0,40,60,0.1)`), suggesting an object on still water. Pale blue background, `--color-accent-deep` accent.
- **Danger**: The "NO DIVING" sign: red border (`--color-danger`), bold header, the most visually stark element on the page. White background with red top border, minimal decoration.

### 5) Motion Ideas

1. **Caustic light animation**: A slow-moving CSS animated overlay on the page background simulating underwater caustic light patterns. Implemented as 3-4 overlapping `radial-gradient` layers with different sizes and positions, each animated with `@keyframes` at different speeds (8s, 13s, 21s -- Fibonacci intervals for organic feel). The gradients use `--color-caustic` at very low opacity (3-5%). The overall effect is a gentle, barely perceptible shimmer across the tile surface, as if light is refracting through water somewhere nearby. This runs continuously but is extremely subtle.

2. **Water surface hover**: When hovering over cards, links, or interactive elements, a ripple effect radiates from the cursor position. Implemented as an expanding `radial-gradient` on the element's `::after` pseudo-element, transitioning from a tight bright spot to a wider faded ring over 400ms. The effect uses `--color-caustic` at 15% opacity. Only one ripple at a time (no stacking).

3. **Depth transition**: When navigating between pages, the old content "sinks" (subtle downward translate + opacity fade) and new content "surfaces" (upward translate + opacity fade in). The sinking is 200ms, there is a 50ms gap, and the surfacing is 250ms. Combined with a brief intensification of the caustic overlay during transition, as if the surface was disturbed.

**Reduced-motion fallback**: Caustic animation paused (static gradient, still visible as a gentle texture). Ripple effect replaced with a simple background-color highlight. Depth transition replaced with a cross-fade. All transitions shortened to 150ms with no transforms.

### 6) Signature Component

**The Tile Grid Content Layout**

The entire main content area is rendered on a visible tile grid. This is not just a background texture -- the grid is structural, and content elements snap to it:

- **Grid specification**: Tiles are 48px square (adjustable via CSS variable `--tile-size`), with 2px grout lines in `--color-grout`. The grid is rendered as a CSS `background-image` using `repeating-linear-gradient` in both horizontal and vertical directions.
- **Content alignment**: Major content blocks (headings, paragraphs, code blocks, callouts) have their top edges aligned to tile grid lines via CSS `padding-top` and `margin-top` calculated to snap to the grid. This creates a sense of physical tile placement.
- **Accent tiles**: At random but consistent positions (seeded from the page slug to ensure stability), individual tiles in the grid are highlighted in `--color-tile-accent` at 30% opacity, creating the effect of a decorative tile pattern embedded in the wall. These are rendered as absolutely positioned pseudo-elements on the content container, placed at grid-snapped positions.
- **Water interaction**: When the user scrolls past approximately 60% of the page, the tile grid background subtly shifts from "dry" to "wet" -- the grout color darkens slightly, and the tile surface gains a `--color-surface-wet` tint. This is achieved with a CSS gradient overlay tied to scroll position (CSS `scroll-timeline`).
- **Tile depth markers**: On the left margin, small tile markers show the "depth" (scroll position) like a pool depth gauge: `0.5m`, `1.0m`, `1.5m`... These are decorative and position-fixed relative to the viewport, updating as the user scrolls.

This component makes the Poolrooms metaphor structural rather than decorative. The user is not just looking at a pool-themed site; they are reading documentation that is literally on tile walls surrounding a body of water.

### 7) Risks/Tradeoffs

- **Readability**: The aquatic palette is inherently cool and low-contrast in the lighter tones. The text color (`#1A2D3A` on `#E8F4F8`) provides a contrast ratio of 8.2:1, passing WCAG AAA. However, the "submerged" text style must be restricted to decorative elements only -- never for content. The caustic overlay could reduce contrast; at 3-5% opacity the impact is negligible.
- **Implementation complexity**: The tile grid is straightforward CSS. Caustic light animations are moderately complex (multiple layered gradient animations). The reflection effect on the homepage hero requires CSS transforms and filters. The ripple hover effect needs JavaScript for cursor position tracking (or can use a simplified centered version in pure CSS). Grid-snapping content to tile lines requires careful CSS math. Medium-high complexity overall.
- **Novelty risk**: The poolrooms aesthetic is visually distinctive and well-known in Backrooms lore, but could feel "too themed" -- like a pool supply company website rather than developer docs. Mitigation: the tile grid and aquatic palette provide atmosphere, but the typography (Outfit, Nunito Sans) and content layout are clean and professional. The "weirdness" comes from the *setting*, not from distorted readability. The key is that it should feel like a very well-organized, very clean space that happens to be submerged.
- **Performance**: The caustic animation involves multiple CSS gradients animating simultaneously. On low-end devices, this could cause jank. Mitigation: use `will-change: background-position` on the overlay layer, and disable the animation entirely on devices that report `prefers-reduced-motion` or low battery.
- **Dark mode**: The dark mode ("night pool") is potentially the stronger version of this concept. The luminous aqua accents against deep blue-black create striking contrast, and the caustic patterns become more visible and atmospheric at night. The light mode is the "daytime pool" variant -- cleaner, more spacious, but less atmospheric.

### 8) Practicality Score: 7/10
The color system and typography are simple. The tile grid is achievable with CSS background gradients. The caustic animation is the most complex element but can be simplified to a static texture if needed. The reflection effect and ripple hovers add complexity but are optional enhancements. The main Starlight integration challenge is the tile-grid content alignment, which requires custom CSS for content spacing. The depth markers need a small scroll-position JS snippet.

### 9) Distinctiveness Score: 10/10
No documentation site looks like the Poolrooms. The aquatic palette, tile grid, caustic light effects, and water-level transitions create an immediately recognizable and deeply unsettling-yet-calming environment that is entirely unique to developer documentation. It is a bold aesthetic choice that perfectly extends the Backrooms brand into a specific, beloved variant of the lore. Anyone who has seen Poolrooms imagery will instantly recognize and appreciate the reference.

### 10) Sample CSS Token Set
```css
:root {
  /* Poolrooms */
  --color-bg: #E8F4F8;
  --color-bg-water: #D0E8F0;
  --color-surface: #F0F8FC;
  --color-surface-wet: #C8DFE8;
  --color-text: #1A2D3A;
  --color-text-muted: #5A7A8A;
  --color-accent: #00A8CC;
  --color-accent-deep: #006A8A;
  --color-caustic: #B8E8FF;
  --color-code-bg: #1A2D3A;
  --color-code-text: #B8E0F0;
  --color-grout: #94B8C8;
  --color-tile-accent: #78C8E0;
  --color-warning: #E8A830;
  --color-danger: #D04848;
  --font-display: 'Outfit', 'Helvetica Neue', sans-serif;
  --font-body: 'Nunito Sans', 'Helvetica Neue', sans-serif;
  --font-mono: 'Overpass Mono', 'Consolas', monospace;
  --tile-size: 48px;
  --grout-width: 2px;
}

[data-theme="dark"] {
  --color-bg: #0A1820;
  --color-bg-water: #0E2030;
  --color-surface: #122838;
  --color-surface-wet: #0A1E2C;
  --color-text: #C0DDE8;
  --color-text-muted: #6A98A8;
  --color-accent: #00C8F0;
  --color-accent-deep: #0090B0;
  --color-caustic: rgba(0, 200, 240, 0.08);
  --color-code-bg: #061018;
  --color-code-text: #88C0D8;
  --color-grout: #1A3848;
  --color-tile-accent: #1A5A70;
}
```
