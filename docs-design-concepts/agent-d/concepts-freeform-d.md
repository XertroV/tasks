# The Backlogs -- Docs Visual Theme Concepts (Freeform Series D)

---

## Concept 13: "The Eternal Hotel"

### 1) Concept Name
**The Eternal Hotel**

### 2) Vibe Statement
You checked into a hotel that has no checkout -- the documentation is the guest services compendium left open on the nightstand, the elevator directory that lists floors that should not exist, the room service menu for a kitchen that never closes, and every page smells faintly of stale laundered linen and industrial carpet cleaner.

### 3) Visual System

**Palette:**

| Token | Hex | Role |
|---|---|---|
| `--hotel-linen` | `#F2EDE4` | Primary background -- clean pressed hotel sheet white, warm and flat |
| `--hotel-card` | `#FFFEF8` | Content surface -- the thick cardstock of a guest services folder |
| `--hotel-carpet` | `#6B4F3A` | Primary accent -- that universal mid-century hotel carpet brown |
| `--hotel-carpet-deep` | `#3D2B1E` | Deep carpet brown for dark accents, active states |
| `--hotel-brass` | `#C4994A` | Secondary accent -- elevator buttons, room number plates, door handles |
| `--hotel-brass-polish` | `#E8C874` | Polished brass highlight for hover/focus states |
| `--hotel-ink` | `#1C1810` | Primary text -- the ink of a guest compendium, warm near-black |
| `--hotel-ink-light` | `#7A7060` | Secondary text -- faded hotel stationery |
| `--hotel-burgundy` | `#7A1B2D` | Tertiary accent -- velvet rope, DO NOT DISTURB tag, wine list headers |
| `--hotel-mint` | `#4A8C6A` | Success/safe state -- the muted mint of hotel bathroom tile |
| `--hotel-ivory` | `#F0E8D4` | Code background -- slightly yellowed notepad paper |
| `--hotel-rule` | `#D4C8B0` | Horizontal rules -- the embossed lines on hotel stationery |
| `--hotel-shadow` | `rgba(60, 43, 30, 0.14)` | Warm shadows -- everything casts warm light |
| `--hotel-neon` | `#FF3B4E` | The vacancy sign -- used extremely sparingly for critical alerts |
| `--hotel-neon-glow` | `rgba(255, 59, 78, 0.12)` | Neon halo for danger states |

Dark mode ("Night Mode -- Lights Off"):
| Token | Hex | Role |
|---|---|---|
| `--hotel-linen` | `#141210` | The room at 3 AM, curtains drawn |
| `--hotel-card` | `#1E1B16` | Guest compendium under lamplight |
| `--hotel-carpet` | `#8B6B4F` | Carpet catches the hallway light under the door |
| `--hotel-carpet-deep` | `#5C4030` | Deep carpet in darkness |
| `--hotel-brass` | `#D4A85A` | Brass catches any available light |
| `--hotel-ink` | `#E0D8C8` | Cream paper text under low light |
| `--hotel-ink-light` | `#8A806A` | Faded in the dark |
| `--hotel-burgundy` | `#A83040` | Burgundy glows warmer in the dark |
| `--hotel-ivory` | `#1A1814` | Notepad in shadow |
| `--hotel-rule` | `#3A3428` | Rules barely visible |

**Typography pairing:**
- **Display font:** [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) (600 weight) -- A high-contrast didone serif with extreme thin/thick stroke variation, evoking luxury hotel signage, embossed room numbers, and the gold-leaf lettering on a concierge desk. Its elegance is almost too much -- uncannily refined for developer documentation. Used for H1, H2, and the hotel "brand" elements.
- **Body font:** [EB Garamond](https://fonts.google.com/specimen/EB+Garamond) (400/500 weight) -- A scholarly, warm serif with excellent readability at body sizes. Feels like the text in a leather-bound hotel guest book or a well-typeset room directory. Its old-style figures and ligatures add quiet sophistication.
- **Monospace font:** [Inconsolata](https://fonts.google.com/specimen/Inconsolata) (400 weight) -- Clean, legible, with a humanist warmth that other monospaces lack. Feels like something typed on a hotel business center typewriter rather than a cold terminal.

**Texture/material cues:**
- Heavy linen cardstock with subtle visible fiber (CSS noise filter at 2% opacity)
- Brass plate finishes -- borders and badges with warm metallic appearance
- Deep pile carpet texture -- bottom borders and footer areas in `--hotel-carpet`
- Embossed/debossed text -- headings with subtle `text-shadow` that suggests letterpress
- Hotel stationery watermark -- faint repeating logo at low opacity
- Key card slot UI elements -- rectangular badges with rounded corners and a notch
- Elevator button styling -- circular interactive elements with beveled edges
- The light strip under a hotel room door -- a thin warm gradient at the bottom of sidebar

**Iconography style:**
- Refined line icons, 1.25px stroke weight, rounded caps and joins
- Inspired by hotel amenity icons: keys, elevators, doors, bells, concierge
- Brass-colored (`--hotel-brass`) at rest, polished (`--hotel-brass-polish`) on hover
- Contained within small circles or rounded rectangles like hotel signage pictograms

### 4) Layout Ideas

**Homepage hero:**
The landing page is styled as the cover of a hotel guest services compendium -- a thick, leather-textured folder that opens to reveal the documentation. The cover displays:

```
                    ☆ ☆ ☆ ☆ ☆

             THE ETERNAL HOTEL
           ─── GUEST SERVICES ───

          Hierarchical Backlog Management
              for Infinite Corridors

         ·  Check-In Guide (Getting Started)
         ·  Floor Directory (Commands)
         ·  Room Service (Configuration)
         ·  Concierge Desk (Support)

           Est. ████  ·  Floor ∞
```

The title "THE BACKLOGS" appears in Cormorant Garamond at a large size, letter-spaced, centered, with a thin brass-colored rule above and below. The five stars are rendered in `--hotel-brass`. Below the title, navigation links are styled as a hotel directory -- each entry has a dotted leader line (like a menu price list) connecting the name to its "floor number." The background has a very subtle linen texture. A faint `--hotel-burgundy` ribbon bookmark element (an absolutely positioned CSS triangle) peeks out from the right edge of the "compendium."

**Sidebar/nav style:**
Styled as an elevator floor directory panel. The sidebar background is `--hotel-carpet-deep` (dark warm brown). Each top-level section appears as a floor listing:

```
  ─── FLOOR DIRECTORY ───
  L    Lobby .............. Overview
  1    Commands ........... bl list, bl grab
  2    Configuration ...... .backlog/
  3    Guides ............. Workflows
  B    Basement ........... Internals
```

Floor numbers are rendered in `--hotel-brass` Cormorant Garamond within small circular badges (like elevator buttons). The active floor's button appears "pressed" -- inverted colors (brass background, dark text) with a subtle inset shadow. Subsection items appear as room numbers within that floor: `1.01`, `1.02`, `1.03`. A thin warm light gradient at the bottom of the sidebar suggests the light strip under a hotel room door -- a 3px gradient from `--hotel-brass` at 20% opacity to transparent.

**Content page structure:**
- Each page is wrapped in a "guest compendium page" container -- `--hotel-card` background, generous padding, warm drop shadow on all sides, with a thin `--hotel-burgundy` top border (2px) like the edge binding of a hotel folder.
- At the top of each page: a small "room plate" showing the breadcrumb path as a brass room number: `FLOOR 2 · ROOM 2.03 · CONFIGURATION`. Rendered in Cormorant Garamond small caps, `--hotel-brass`, with a subtle embossed `text-shadow`.
- H1 headers: Cormorant Garamond, 2.5rem, `--hotel-ink`, letter-spacing 0.06em, with a thin `--hotel-rule` bottom border and generous margin below (2.5rem). The heading feels like the title page of a section in a leather-bound book.
- H2 headers: Cormorant Garamond, 1.6rem, `--hotel-carpet-deep`, with a small brass diamond ornament (`◆`) before the text.
- H3 headers: EB Garamond, 1.2rem, 500 weight italic, `--hotel-ink`.
- Body text: EB Garamond, 17.5px, `--hotel-ink`, line-height 1.8. The generous line-height and the warm serif create an almost literary reading experience -- you are reading a well-typeset hotel guide, not a tech doc.
- Code blocks: `--hotel-ivory` background, 1px `--hotel-rule` border, no border-radius (square like notepad paper), with a small label tab in the top-right corner reading "EXAMPLE" or "TERMINAL" in Inconsolata `--hotel-ink-light`, 0.75rem, tracking 0.1em. A faint horizontal ruling pattern on the code block background (every 1.5rem, 1px `--hotel-rule` at 30% opacity) simulates hotel notepad paper.
- Max content width: 66ch.
- Links: `--hotel-carpet` colored with a dotted underline (like menu price leaders), transitioning to `--hotel-brass` on hover.

**Callout patterns:**
- **Note:** Styled as a "Concierge Recommendation" -- a card with a `--hotel-card` background, `--hotel-brass` left border (3px), and header reading "CONCIERGE NOTE" in Cormorant Garamond small caps. A small bell icon (🛎) in brass. The tone is helpful and slightly servile.
- **Warning:** Styled as a "DO NOT DISTURB" tag -- landscape-oriented card with rounded corners, a circular hole punch at one end (CSS radial gradient), `--hotel-burgundy` background with cream text. Header reads "PLEASE NOTE" in Cormorant Garamond. The slightly rotated presentation (-1.5deg) evokes a tag hanging from a door handle.
- **Danger:** Styled as a "FIRE SAFETY NOTICE" -- `--hotel-neon` left border (4px), with a faint `--hotel-neon-glow` background. Header "EMERGENCY NOTICE" in bold. The neon red creates immediate contrast against the warm palette.
- **Tip:** Styled as a "Room Service Suggestion" -- minimal, with a thin `--hotel-mint` left border and italic header text. Background is transparent. Feels like a handwritten note slipped under the door.

### 5) Motion Ideas

1. **Elevator Arrival Ding:** When navigating to a new page, there is a brief visual "elevator door" transition: two vertical panels slide apart from center over 400ms, revealing the new content beneath. The panels are `--hotel-carpet-deep` colored. This is implemented as two absolutely positioned pseudo-elements on the content wrapper, animating `transform: translateX()` from center to edges. The effect is fast, elegant, and unmistakable. After the doors open, they fade out over 200ms to not occlude content.

2. **Brass Button Press:** Interactive elements styled as elevator buttons (circular nav items, the search button) have a press animation: on click/tap, the element transitions from a convex appearance (subtle `box-shadow: 0 2px 4px` below and highlight above) to a concave one (`box-shadow: inset 0 2px 4px`) over 100ms, then returns over 200ms. This feels tactile and satisfying -- like pressing a real brass elevator button.

3. **Vacancy Sign Flicker:** On the homepage, the word "THE BACKLOGS" or a small "VACANCY" indicator has a neon-sign flicker: a rapid opacity variation between 0.7 and 1.0 using a multi-step CSS animation at irregular intervals (similar to the Exit Sign concept but in `--hotel-neon` red, briefer, and restricted to the homepage only). The flicker suggests a motel vacancy sign buzzing on the building exterior.

**Reduced-motion fallback:** Elevator doors replaced with a simple 200ms opacity fade. Button press becomes an instant visual state change (no animation, just the shadow swap). Vacancy flicker is replaced with a static glow at full opacity.

### 6) Signature Component

**The Floor Directory Breadcrumb**

A persistent breadcrumb bar at the top of each content page, styled as a backlit hotel elevator directory panel. The panel is 44px tall, `--hotel-carpet-deep` background, spanning the full content width.

Structure:
- The breadcrumb path is displayed as a sequence of "floor buttons" -- small brass circles (28px diameter) containing the floor/section number in Cormorant Garamond. Between each button, a thin horizontal brass line connects them (like the metal track of an elevator position indicator).
- The current page's button is "illuminated" -- the `--hotel-brass` background is at full brightness with a subtle warm glow (`box-shadow: 0 0 8px var(--hotel-brass-polish)`), while previous buttons are dimmer (`--hotel-brass` at 60% opacity).
- Below each button, the section name appears in EB Garamond at 0.7rem, `--hotel-ink-light`, centered.
- On the right side of the panel: a small indicator reading "FLOOR 2 OF 5" in Inconsolata, `--hotel-brass`, suggesting the reader's position in the overall hierarchy.
- An animated brass arrow (a small triangle) sits below the illuminated button and slides smoothly to the new position when navigating between pages (CSS `transition: left 400ms ease-in-out` on a positioned element).

The entire component feels like the brass-and-glass floor indicator above an elevator door -- the display that tells you where you are in a building that might have infinitely many floors. It transforms breadcrumb navigation into spatial orientation within the hotel.

On mobile, the directory simplifies to a single-line text breadcrumb with brass-colored separators (`·`), maintaining the warm palette without the button styling.

### 7) Risks/Tradeoffs

- **Readability:** EB Garamond at body size is excellent for sustained reading -- it was designed for exactly this purpose. The warm palette provides high contrast (`#1C1810` on `#FFFEF8` = 15.2:1, well above AAA). The only concern is the Cormorant Garamond display font at small sizes -- its extreme thin strokes could disappear on low-DPI screens. Mitigation: never use Cormorant below 1.25rem.
- **Implementation complexity:** The elevator door transition requires two animated pseudo-elements and some care around z-indexing and content flow. The floor directory breadcrumb needs a custom Starlight component override. The brass button press effect is pure CSS. The linen texture and notepad ruling are background gradients. Overall: medium complexity.
- **Novelty risk:** The hotel metaphor is strong and coherent but could feel "too themed" for developers expecting spare technical docs. The key defense is that the actual reading experience (EB Garamond body text, generous spacing, clean layout) is superb -- the hotel dressing is confined to navigation chrome, callouts, and page furniture. The content itself reads beautifully.
- **Dark mode story:** "3 AM in the hotel room" is a compelling dark mode narrative. The room is dark except for the warm brass light under the door, the red glow of the clock radio, and the faint neon from the vacancy sign outside. The dark mode palette leans into warm darkness rather than cool darkness, differentiating it from every other dark docs theme.
- **Font loading:** Four Google Fonts at specific weights: approximately 140KB total. Cormorant Garamond and EB Garamond share design heritage, so the aesthetic coherence is worth the byte cost. Subset to Latin to reduce size.

### 8) Practicality Score: 7/10
The color system and typography are straightforward Starlight CSS custom properties. The floor directory breadcrumb requires a component override. The elevator door transition requires a custom page transition component (or can be simplified to a fade). The brass button styling is pure CSS. The hotel notepad code block ruling is a background gradient. The main complexity is in the number of distinct decorative elements (room plates, door tags, ribbon bookmarks) that each need individual CSS work.

### 9) Distinctiveness Score: 10/10
No documentation site has ever been themed as a hotel guest services compendium. The combination of luxury serif typography, brass accents, elevator metaphors, and the "infinite hotel" narrative is entirely original. The concept extends the Backrooms aesthetic in a direction none of the existing 12 concepts have explored -- the Backrooms are not just offices and corridors; they are also hotels that go on forever, with room service menus for meals that never arrive. The banality of hospitality becomes cosmic horror.

### 10) Sample CSS Token Set

```css
:root {
  /* The Eternal Hotel -- Light Mode (Daytime Check-In) */
  --sl-color-bg: #F2EDE4;
  --sl-color-bg-nav: #3D2B1E;
  --sl-color-bg-sidebar: #3D2B1E;
  --sl-color-hairline: #D4C8B0;
  --sl-color-text: #1C1810;
  --sl-color-text-accent: #7A7060;
  --sl-color-accent: #6B4F3A;
  --sl-color-accent-low: rgba(107, 79, 58, 0.08);
  --sl-color-accent-high: #6B4F3A;
  --hotel-card: #FFFEF8;
  --hotel-brass: #C4994A;
  --hotel-brass-polish: #E8C874;
  --hotel-burgundy: #7A1B2D;
  --hotel-mint: #4A8C6A;
  --hotel-ivory: #F0E8D4;
  --hotel-neon: #FF3B4E;
  --hotel-neon-glow: rgba(255, 59, 78, 0.12);
  --hotel-shadow: rgba(60, 43, 30, 0.14);
  --hotel-rule: #D4C8B0;
  --sl-font: 'EB Garamond', 'Georgia', serif;
  --sl-font-display: 'Cormorant Garamond', 'Garamond', serif;
  --sl-font-mono: 'Inconsolata', 'Courier New', monospace;
  --hotel-linen-texture: url("data:image/svg+xml,..."); /* inline noise SVG */
}

[data-theme="dark"] {
  /* Night Mode -- 3 AM, Curtains Drawn */
  --sl-color-bg: #141210;
  --sl-color-bg-nav: #1E1B16;
  --sl-color-bg-sidebar: #1E1B16;
  --sl-color-hairline: #3A3428;
  --sl-color-text: #E0D8C8;
  --sl-color-text-accent: #8A806A;
  --sl-color-accent: #8B6B4F;
  --sl-color-accent-low: rgba(139, 107, 79, 0.12);
  --sl-color-accent-high: #8B6B4F;
  --hotel-card: #1E1B16;
  --hotel-brass: #D4A85A;
  --hotel-ivory: #1A1814;
  --hotel-burgundy: #A83040;
}
```

---

## Concept 14: "Somnography Lab"

### 1) Concept Name
**Somnography Lab**

### 2) Vibe Statement
The documentation is a sleep study report from a subject who keeps dreaming about the same infinite office building -- clinical polysomnography charts, REM cycle annotations, and the researcher's increasingly disturbed margin notes, all printed on continuous-feed chart paper with that distinctive blue grid.

### 3) Visual System

**Palette:**

| Token | Hex | Role |
|---|---|---|
| `--somno-paper` | `#F0F4F8` | Primary background -- clinical chart paper, cool blue-white |
| `--somno-grid` | `#C8D8E8` | Grid lines on chart paper -- the light blue of medical graphs |
| `--somno-grid-major` | `#90B0CC` | Major grid lines -- every 5th line, slightly bolder |
| `--somno-surface` | `#FFFFFF` | Content cards -- white examination room surfaces |
| `--somno-ink` | `#1A202E` | Primary text -- clinical blue-black ballpoint |
| `--somno-ink-light` | `#5A6A80` | Secondary text -- pencil annotations, timestamps |
| `--somno-trace-alpha` | `#2255AA` | EEG alpha wave trace -- primary accent for links, headings |
| `--somno-trace-beta` | `#44AA55` | EEG beta wave trace -- active/awake state, success indicators |
| `--somno-trace-theta` | `#CC8822` | EEG theta wave trace -- drowsy/transition state, warning |
| `--somno-trace-delta` | `#7744BB` | EEG delta wave trace -- deep sleep state, code blocks |
| `--somno-rem-red` | `#CC3344` | REM marker -- rapid eye movement indicator, danger/critical |
| `--somno-code-bg` | `#1A202E` | Code blocks -- like viewing a screen in a dark sleep lab |
| `--somno-code-text` | `#C0D0E0` | Code text -- monitor glow in a dark room |
| `--somno-annotation` | `#CC3344` | Researcher's red pen annotations |
| `--somno-highlight` | `rgba(34, 85, 170, 0.08)` | Selection/hover highlight -- faint alpha wave wash |
| `--somno-shadow` | `rgba(26, 32, 46, 0.10)` | Cool clinical shadows |

Dark mode ("Overnight Monitoring"):
| Token | Hex | Role |
|---|---|---|
| `--somno-paper` | `#0C1018` | Sleep lab at night -- all monitors dimmed |
| `--somno-grid` | `#1A2838` | Grid lines, barely visible in the dark |
| `--somno-grid-major` | `#243448` | Major grid lines faintly glowing |
| `--somno-surface` | `#121822` | Equipment surfaces in low light |
| `--somno-ink` | `#C0D0E0` | Text on dark monitors |
| `--somno-ink-light` | `#6A7A90` | Dim secondary text |
| `--somno-trace-alpha` | `#4477CC` | Alpha trace, brighter on dark |
| `--somno-trace-beta` | `#55CC66` | Beta trace, brighter on dark |
| `--somno-trace-theta` | `#DDAA33` | Theta trace, brighter on dark |
| `--somno-trace-delta` | `#9966DD` | Delta trace, brighter on dark |
| `--somno-code-bg` | `#080C14` | Deepest monitor background |

**Typography pairing:**
- **Display font:** [Literata](https://fonts.google.com/specimen/Literata) (700 weight) -- A variable serif designed specifically for extended screen reading, with optical sizes that adjust stroke contrast at different scales. At display sizes it has a clinical, academic authority -- like the title of a published medical study. Its slightly squared terminals evoke technical precision.
- **Body font:** [Atkinson Hyperlegible](https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next) (400/700 weight) -- Designed by the Braille Institute for maximum character differentiation and readability. In the context of a sleep study report, its clarity is clinical and purposeful -- every character must be unambiguous in medical documentation. It also subtly communicates "accessibility is not an afterthought here."
- **Monospace font:** [Victor Mono](https://fonts.google.com/specimen/Victor+Mono) (400 weight) -- A distinctive monospace with optional cursive italics. The italic variant is used for researcher annotations and comments in code blocks, creating a visible distinction between "system output" (upright) and "human notes" (italic/cursive). Its slightly narrow letterforms work well at code-block density.

**Texture/material cues:**
- Continuous-feed chart paper with light blue grid lines (CSS `repeating-linear-gradient` in both axes)
- EEG/polysomnography trace lines -- sinusoidal SVG paths used as decorative dividers
- Clipboard/examination room aesthetics -- content cards have a slight "clipped to a board" appearance
- Thermal printer paper for "system output" sections (slightly warm-tinted, monospace)
- Researcher's red pen annotations -- margin notes in a distinct color and slightly different angle
- Medical chart tabs along the right edge of content pages
- Electrode dot markers -- small colored circles that correspond to trace colors

**Iconography style:**
- Clean medical/scientific line icons, 1.5px stroke, rounded joins
- Color-coded by the EEG trace palette (alpha blue, beta green, theta amber, delta purple)
- Simple geometric: circles for states, waveforms for processes, arrows for flow
- Small enough to sit inline with text like medical chart annotations

### 4) Layout Ideas

**Homepage hero:**
The hero presents a stylized polysomnography readout -- a full-width chart paper background with blue grid lines, over which four decorative EEG trace lines (SVG `<path>` elements) draw themselves across the page in the four trace colors: alpha (blue), beta (green), theta (amber), delta (purple). Each trace is a different frequency and amplitude, representing different documentation "states":

```
SUBJECT: The Backlogs
STUDY ID: PSG-2026-0214
RECORDING START: 00:00:00
STATUS: MONITORING

   Alpha (Commands) ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿
   Beta  (Active)   ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿
   Theta (Guides)   ∿∿∿∿∿∿∿∿∿∿
   Delta (Deep)     ∿∿∿∿∿
```

The title "THE BACKLOGS" appears in Literata, clinical and centered, with a study metadata block below (Subject, Study ID, Date, Status). Navigation links are presented as "monitoring channels" -- each with its trace color and a waveform snippet next to the label. The overall composition feels like a medical study cover page that happens to be about software documentation.

**Sidebar/nav style:**
The sidebar is styled as the channel list of a polysomnograph. Each top-level section has a small colored electrode dot (8px circle) to its left in the corresponding trace color: Commands = alpha blue, Guides = theta amber, Reference = delta purple, etc. The active section has an animated trace line (a tiny sine wave snippet, 40px wide, animating via SVG `stroke-dashoffset`) next to its name, suggesting live monitoring. Section headers appear as channel labels: `CH1: COMMANDS`, `CH2: GUIDES` in Victor Mono, `--somno-ink-light`, 0.75rem. The sidebar background is `--somno-paper` with the blue grid visible, reinforcing the chart paper metaphor. A thin dark left border separates the sidebar from a narrow "margin ruler" strip (4px wide, marked with small tick marks every 20px, like the edge of chart paper).

**Content page structure:**
- The page background has the blue grid visible at all times (CSS `repeating-linear-gradient` creating 20px squares with `--somno-grid` lines and bolder `--somno-grid-major` lines every 100px). Content is readable over the grid because the grid is at low contrast against `--somno-paper`.
- At the top of each page: a "study annotation" block in a clinical format:
  ```
  CHANNEL: CH1-A3 (bl grab)
  EPOCH: 2026-02-14 08:00
  STAGE: N2 (Light Documentation)
  NOTES: See annotation at §3.2
  ```
  This block uses Victor Mono, `--somno-ink-light`, 0.8rem, with a 1px `--somno-grid-major` border and `--somno-surface` background.
- H1: Literata, 2.25rem, `--somno-ink`, with a colored left border (4px) in the section's trace color. Below the heading, a thin decorative sine wave SVG in the same trace color spans the content width.
- H2: Literata, 1.5rem, `--somno-trace-alpha`, preceded by a small section number in Victor Mono `--somno-ink-light`.
- H3: Atkinson Hyperlegible, 1.15rem, 700 weight, `--somno-ink`.
- Body: Atkinson Hyperlegible, 16.5px, `--somno-ink`, line-height 1.75, max-width 68ch. The clinical clarity of Atkinson Hyperlegible makes every character distinct -- appropriate for a medical report and excellent for code-heavy documentation.
- Code blocks: `--somno-code-bg` (dark), `--somno-code-text` (light blue-gray), with a thin left border in `--somno-trace-delta` (purple, "deep state"). Comments in code are rendered in Victor Mono italic (the cursive variant), creating a visual distinction as if the researcher annotated the code listing.
- Links: `--somno-trace-alpha` with a 1px dotted underline, transitioning to solid on hover.

**Callout patterns:**
- **Note:** Styled as a "Researcher's Annotation" -- a card with a thin `--somno-trace-alpha` left border, white background, header "ANNOTATION" in Victor Mono caps, 0.8rem, `--somno-ink-light`. The content is in Atkinson Hyperlegible. A small "(See epoch 14:22)" reference in `--somno-ink-light` italic appears at the bottom.
- **Warning:** Styled as an "Anomalous Reading" -- `--somno-trace-theta` (amber) left border (4px), faint amber background tint (`rgba(204, 136, 34, 0.06)`). Header "ANOMALY DETECTED" in Victor Mono, `--somno-trace-theta`. Suggests something abnormal appeared in the data.
- **Danger:** Styled as a "REM Intrusion Alert" -- `--somno-rem-red` left border (4px), faint red background tint. Header "REM INTRUSION" in Victor Mono bold, `--somno-rem-red`. An animated pulse indicator (a small circle that fades between 50% and 100% opacity over 2s) sits to the right of the header. The language implies the subject is dreaming when they should not be.
- **Tip:** Styled as a margin note -- no border, no background. The text is in `--somno-annotation` (red pen) with a slight `transform: rotate(-0.8deg)`, as if handwritten in the margin of the chart paper. Header in Victor Mono italic: "note to self --"

### 5) Motion Ideas

1. **EEG Trace Draw:** On the homepage, the four decorative EEG trace lines animate via SVG `stroke-dasharray` and `stroke-dashoffset` -- each trace "draws" itself from left to right over 3 seconds with staggered start times (0ms, 400ms, 800ms, 1200ms). The traces use different frequencies: alpha is a smooth 2Hz sine wave, beta is faster and smaller (8Hz), theta is slow and large (0.5Hz), delta is very slow and high amplitude. After drawing, the traces remain static. This is pure SVG animation with CSS keyframes controlling `stroke-dashoffset`.

2. **Live Monitoring Pulse on Active Nav:** The currently active sidebar item has a small inline SVG trace that animates continuously -- a 40px-wide sine wave that scrolls from right to left via `stroke-dashoffset` animation over 2 seconds, looping. This creates the impression of a live EEG feed for the "channel" you are currently monitoring. The animation is very small and contained to the sidebar.

3. **Epoch Transition:** When navigating between pages, the content area does a brief "chart paper advance" -- the content slides upward by 20px (one grid square) and simultaneously fades in over 300ms, simulating the chart paper advancing to a new epoch/section on a strip chart recorder.

**Reduced-motion fallback:** EEG traces appear fully drawn immediately (no animation). Active nav trace is a static sine wave image (no scrolling). Epoch transition is a simple 200ms opacity fade with no transform.

### 6) Signature Component

**The Hypnogram Timeline**

A horizontal timeline component that appears at the top of each major documentation section (or as a site-wide navigation element). It is styled as a clinical hypnogram -- the chart used in sleep studies to show sleep stage transitions over time.

Implementation:
- The timeline is 48px tall and spans the full content width. Its background is `--somno-paper` with the blue grid visible.
- The horizontal axis represents the documentation structure -- each major section (Commands, Guides, Configuration, Reference, Internals) is a segment on the timeline.
- The vertical axis represents "depth" (conceptually mapped to sleep stages): **W** (Wake/Overview) at the top, **N1** (Light/Getting Started) slightly below, **N2** (Medium/Commands) in the middle, **N3** (Deep/Configuration) lower, **REM** (Dreaming/Internals) at the bottom.
- A stepped line in `--somno-trace-alpha` connects the sections, dropping to the appropriate "stage" for each section. Overview is at W (top), Commands at N2 (middle), Internals at REM (bottom). The current section's step is highlighted with a filled circle and a pulsing glow.
- Stage labels (W, N1, N2, N3, REM) appear on the left axis in Victor Mono, 0.65rem, `--somno-ink-light`.
- Below the timeline, small labels for each section appear at their horizontal positions.
- On hover over any section segment, a tooltip shows: "Stage: N2 | Duration: 12 pages | Subject notes: 'The corridors continue.'" -- mixing clinical data with Backrooms narrative.

The hypnogram transforms documentation navigation into a sleep architecture visualization. The deeper you go into the docs, the "deeper" you are sleeping -- and the closer you are to REM, where the Backrooms dreams happen. It maps technical depth to neurological depth, creating an uncanny metaphor where reading documentation is a form of descent into unconsciousness.

On mobile, the hypnogram collapses into a simple horizontal progress bar with stage labels, retaining the color coding but dropping the stepped chart visualization.

### 7) Risks/Tradeoffs

- **Readability:** Atkinson Hyperlegible is one of the most readable body fonts in existence -- it was designed for visually impaired readers. The blue grid background is the primary concern; at the specified opacity (`--somno-grid` = `#C8D8E8` against `--somno-paper` = `#F0F4F8`), the contrast between grid and background is low (1.15:1), making the grid subtle enough not to interfere with text reading. Text contrast (`#1A202E` on `#F0F4F8`) is 11.3:1, well above AAA.
- **Implementation complexity:** The hypnogram timeline is the most complex element -- it requires either a custom SVG component or a carefully calculated CSS stepped visualization. The EEG trace animations are SVG-based and moderately complex. The blue grid background is trivial CSS. The trace-colored nav indicators require Starlight sidebar component overrides. Overall: medium-high complexity.
- **Novelty risk:** The sleep study metaphor is highly unusual for developer documentation. Some developers may find it confusing if they are unfamiliar with polysomnography. Mitigation: the metaphor is layered *over* clean, conventional documentation structure. If you ignore the EEG traces and stage labels, you have a well-organized docs site with good typography and a light blue color scheme. The sleep study layer adds atmosphere for those who engage with it, without obstructing those who do not.
- **Dark mode story:** "Overnight monitoring" -- the sleep lab at 3 AM, all room lights off, with only the glow of monitoring equipment. The EEG traces become luminous against the dark background, creating a genuinely atmospheric dark mode. The researcher's red annotations stand out more sharply. This is the "real" version of the concept -- the subject is sleeping, the monitors are running, and you are the technician watching the data scroll by.
- **Color palette breadth:** Four trace colors plus annotation red gives five accent colors, which is more than most docs themes. The risk is visual noise. Mitigation: each trace color is assigned to a specific semantic role and used consistently -- alpha=links/navigation, beta=success, theta=warning, delta=code/depth, red=critical/annotations. The system is chromatic but orderly.

### 8) Practicality Score: 6/10
The color system, typography, and grid background are easy to implement. The hypnogram timeline requires a custom component with either SVG or careful CSS positioning. The EEG trace animations are SVG-heavy. The sidebar channel indicators need component overrides. The researcher annotation styling (rotated tip callouts, cursive code comments) requires targeted CSS. The concept has more moving parts than a simpler theme, but each individual element is achievable.

### 9) Distinctiveness Score: 10/10
No documentation site has ever been themed as a clinical sleep study report. The four-color EEG trace system, the hypnogram navigation, the chart paper grid, and the "dreaming about infinite offices" narrative are completely without precedent. The concept connects to the Backrooms aesthetic through the lens of someone experiencing it as a recurring dream -- a clinical document about an uncanny subjective experience. It is both deeply weird and rigorously structured, which is exactly what developer documentation should be.

### 10) Sample CSS Token Set

```css
:root {
  /* Somnography Lab -- Light Mode (Daytime Clinic) */
  --sl-color-bg: #F0F4F8;
  --sl-color-bg-nav: #F0F4F8;
  --sl-color-bg-sidebar: #F0F4F8;
  --sl-color-hairline: #C8D8E8;
  --sl-color-text: #1A202E;
  --sl-color-text-accent: #5A6A80;
  --sl-color-accent: #2255AA;
  --sl-color-accent-low: rgba(34, 85, 170, 0.08);
  --sl-color-accent-high: #2255AA;
  --somno-grid: #C8D8E8;
  --somno-grid-major: #90B0CC;
  --somno-trace-alpha: #2255AA;
  --somno-trace-beta: #44AA55;
  --somno-trace-theta: #CC8822;
  --somno-trace-delta: #7744BB;
  --somno-rem-red: #CC3344;
  --somno-annotation: #CC3344;
  --somno-code-bg: #1A202E;
  --somno-code-text: #C0D0E0;
  --sl-font: 'Atkinson Hyperlegible', 'Helvetica Neue', sans-serif;
  --sl-font-display: 'Literata', 'Georgia', serif;
  --sl-font-mono: 'Victor Mono', 'Consolas', monospace;
  --chart-grid: repeating-linear-gradient(
    to right,
    transparent 0px, transparent 19px,
    var(--somno-grid) 19px, var(--somno-grid) 20px
  ), repeating-linear-gradient(
    to bottom,
    transparent 0px, transparent 19px,
    var(--somno-grid) 19px, var(--somno-grid) 20px
  );
  --chart-grid-major: repeating-linear-gradient(
    to right,
    transparent 0px, transparent 99px,
    var(--somno-grid-major) 99px, var(--somno-grid-major) 100px
  ), repeating-linear-gradient(
    to bottom,
    transparent 0px, transparent 99px,
    var(--somno-grid-major) 99px, var(--somno-grid-major) 100px
  );
}

[data-theme="dark"] {
  /* Overnight Monitoring -- 3 AM Sleep Lab */
  --sl-color-bg: #0C1018;
  --sl-color-bg-nav: #0C1018;
  --sl-color-bg-sidebar: #121822;
  --sl-color-hairline: #1A2838;
  --sl-color-text: #C0D0E0;
  --sl-color-text-accent: #6A7A90;
  --sl-color-accent: #4477CC;
  --somno-grid: #1A2838;
  --somno-grid-major: #243448;
  --somno-trace-alpha: #4477CC;
  --somno-trace-beta: #55CC66;
  --somno-trace-theta: #DDAA33;
  --somno-trace-delta: #9966DD;
  --somno-code-bg: #080C14;
}
```

---

## Concept 15: "Condemned Property"

### 1) Concept Name
**Condemned Property**

### 2) Vibe Statement
The documentation reads like a building inspector's report for a structure that violates every code in the book yet cannot be demolished -- municipal inspection forms, structural assessment diagrams, violation notices stapled to the wall, and an inspector who has been filing reports for years about a building that keeps adding rooms.

### 3) Visual System

**Palette:**

| Token | Hex | Role |
|---|---|---|
| `--inspect-concrete` | `#E8E4DC` | Primary background -- poured concrete, slightly warm gray |
| `--inspect-form` | `#FFFEF8` | Content surface -- municipal form paper, bright white |
| `--inspect-carbon` | `#1E1E22` | Primary text -- carbon paper impression, slightly cool black |
| `--inspect-carbon-light` | `#6A6A72` | Secondary text -- faded second-copy carbon |
| `--inspect-orange` | `#E87028` | Primary accent -- safety orange, construction cones, violation stamps |
| `--inspect-orange-deep` | `#B85820` | Dark orange for active states, visited links |
| `--inspect-hi-vis` | `#C8E020` | High-visibility yellow-green -- used for success/safe states |
| `--inspect-hi-vis-dim` | `#8AA818` | Muted hi-vis for borders |
| `--inspect-red-tag` | `#CC2020` | Red tag / condemned notice -- danger, critical failures |
| `--inspect-blue-form` | `#2850A0` | Municipal form blue -- form field labels, section headers |
| `--inspect-blue-light` | `#A8C0E0` | Light form blue -- form field backgrounds, grid lines |
| `--inspect-code-bg` | `#F4F2EC` | Code blocks -- photocopied form paper |
| `--inspect-tape` | `#FFD000` | Caution tape yellow for borders and dividers |
| `--inspect-tape-stripe` | `repeating-linear-gradient(-45deg, #FFD000 0px, #FFD000 10px, #1E1E22 10px, #1E1E22 20px)` | Caution tape stripe pattern |
| `--inspect-chain-link` | `#8A8A90` | Chain-link fence gray for secondary borders |
| `--inspect-shadow` | `rgba(30, 30, 34, 0.12)` | Cool industrial shadows |

Dark mode ("Night Inspection -- Flashlight Only"):
| Token | Hex | Role |
|---|---|---|
| `--inspect-concrete` | `#18181C` | Concrete in darkness |
| `--inspect-form` | `#222228` | Form paper under flashlight |
| `--inspect-carbon` | `#D0D0D8` | Carbon text under torch beam |
| `--inspect-carbon-light` | `#7A7A84` | Faded carbon in low light |
| `--inspect-orange` | `#F08038` | Safety orange, brighter in the dark |
| `--inspect-blue-form` | `#5080C8` | Form blue, adjusted for dark bg |
| `--inspect-blue-light` | `#1A2840` | Light blue form areas, darkened |
| `--inspect-code-bg` | `#1A1A20` | Code on dark form paper |
| `--inspect-hi-vis` | `#D8F030` | Hi-vis almost glowing in the dark |

**Typography pairing:**
- **Display font:** [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed) (700 weight) -- A condensed grotesque sans-serif with an industrial, utilitarian character. Used uppercase for section headers and form labels, it feels like the stamped text on a municipal form header or the lettering on a construction sign. Its condensed proportions allow long titles to fit in the tight header spaces of official forms.
- **Body font:** [Public Sans](https://fonts.google.com/specimen/Public+Sans) (400/600 weight) -- Designed by USWDS (U.S. Web Design System) for government digital services. Its provenance is literally municipal -- it was created for government forms and public-facing documents. Neutral, clear, authoritative without being warm or cold. Perfect for inspection reports.
- **Monospace font:** [Red Hat Mono](https://fonts.google.com/specimen/Red+Hat+Mono) (400 weight) -- A monospace with slightly rounded terminals and generous spacing. Feels like the fixed-width font used in building permit databases and code compliance software. More legible than Courier, more industrial than Fira Code.

**Texture/material cues:**
- Poured concrete surface -- subtle CSS noise texture at 3% opacity, warm gray
- Municipal form paper -- form fields with light blue backgrounds and dark blue labels
- Carbon copy paper -- a slight duplication/offset effect on certain header text
- Caution tape -- yellow/black diagonal stripes as section dividers
- Chain-link fence pattern -- a subtle diamond grid overlay for restricted sections
- Red condemned tags -- bright red cards stapled over deprecated content
- Construction cone orange -- badges and inline markers
- Clipboard with metal clip -- content pages have a "clipped" top edge (gradient shadow at top)
- Thermal print receipts for timestamps -- slightly warm-toned, monospace
- Weathered inspection stickers -- small circular badges with dates and check marks

**Iconography style:**
- Thick-stroke geometric icons, 2.5px stroke weight, square caps
- Safety-sign aesthetic: simple pictograms in circles or triangles
- Color-coded: orange for navigation, red for warnings, blue for informational, hi-vis green for safe
- Icons have a "stamped" quality -- slightly rough edges, not pixel-perfect
- Construction/building motifs: hard hats, wrenches, clipboards, structural beams

### 4) Layout Ideas

**Homepage hero:**
The landing page is styled as the cover sheet of a building inspection report. A thick orange banner across the top reads "MUNICIPAL BUILDING INSPECTION REPORT" in Barlow Condensed, white text on `--inspect-orange`. Below it:

```
┌──────────────────────────────────────────────┐
│  PROPERTY INSPECTION REPORT                  │
│  ────────────────────────────────────────     │
│  PROPERTY:    The Backlogs                   │
│  ADDRESS:     .backlog/, Level 0, Corridor ∞ │
│  PERMIT NO:   BL-2026-0214                   │
│  INSPECTOR:   [UNASSIGNED]                   │
│  DATE:        2026-02-14                     │
│  STATUS:      ██ ACTIVE — ONGOING VIOLATIONS │
│                                              │
│  STRUCTURAL SUMMARY:                         │
│  · Foundation (Installation) .... COMPLIANT  │
│  · Electrical (Commands) ........ REVIEW     │
│  · Plumbing (Data Flow) ......... VIOLATION  │
│  · Egress (Navigation) .......... SEE NOTE 7 │
│  · Occupancy (Sessions) ......... NON-CONFORM│
│                                              │
│  ☐ APPROVED  ☐ CONDITIONAL  ☑ FURTHER REVIEW│
└──────────────────────────────────────────────┘
```

The form is rendered on `--inspect-form` white with `--inspect-blue-form` labels and `--inspect-carbon` values. Form fields have `--inspect-blue-light` backgrounds. The "ACTIVE -- ONGOING VIOLATIONS" status is in `--inspect-orange`, bolded. The structural summary doubles as navigation -- each line item links to its corresponding documentation section. The checkbox at the bottom has "FURTHER REVIEW" checked in orange. Below the form, a caution tape stripe divider separates the hero from the rest of the page.

**Sidebar/nav style:**
The sidebar is styled as an inspection checklist. Background is `--inspect-concrete` with a faint concrete noise texture. Each top-level section is a checklist item:

```
INSPECTION CHECKLIST
━━━━━━━━━━━━━━━━━━━━
☑ 1. FOUNDATION (Getting Started)
☐ 2. STRUCTURAL (Commands)
☐ 3. ELECTRICAL (Configuration)
☐ 4. PLUMBING (Data & Files)
☐ 5. MECHANICAL (Workflows)
☐ 6. OCCUPANCY (Advanced)
```

Completed/visited sections show a filled checkbox (`☑`) in `--inspect-hi-vis`. The current section shows an orange inspection marker (`▶`) instead of a checkbox. Unvisited sections show an empty checkbox (`☐`) in `--inspect-carbon-light`. Subsection items appear as indented violation/compliance items: `├── 2.1 bl list .............. OK` or `├── 2.3 bl grab .............. SEE NOTE`. The sidebar title "INSPECTION CHECKLIST" is in Barlow Condensed, uppercase, with a thick bottom border.

**Content page structure:**
- Each page is wrapped in a "form" container -- `--inspect-form` background, a thin `--inspect-blue-form` top border (3px), and a small "form number" in the top-right corner: `FORM BL-INS-042 REV.3` in Red Hat Mono, 0.7rem, `--inspect-carbon-light`.
- At the top of each page: a "field inspection header" structured as form fields:
  ```
  SECTION:        2.3 — bl grab
  CATEGORY:       Structural / Commands
  LAST INSPECTED: 2026-02-14
  COMPLIANCE:     CONDITIONAL
  ```
  Each label is in `--inspect-blue-form` Barlow Condensed, values in `--inspect-carbon` Public Sans. Fields have `--inspect-blue-light` background rectangles. This block has a `--inspect-shadow` drop shadow.
- H1: Barlow Condensed, 2.25rem, uppercase, `--inspect-carbon`, letter-spacing 0.04em. A thick `--inspect-orange` left border (5px) runs the full height of the heading, with a small orange triangle pointing right at the vertical center.
- H2: Public Sans, 1.4rem, 600 weight, `--inspect-blue-form`, preceded by a form section number (`§2.3.1`).
- H3: Public Sans, 1.1rem, 600 weight, `--inspect-carbon`.
- Body: Public Sans, 16px, `--inspect-carbon`, line-height 1.7, max-width 70ch. The neutral clarity of Public Sans makes for comfortable long-form reading.
- Code blocks: `--inspect-code-bg` background, 1px `--inspect-chain-link` border (slightly gray-metallic), with a label tab in the top-left: "EXHIBIT" or "SAMPLE" in Barlow Condensed, `--inspect-blue-form`, 0.7rem. The code itself is in Red Hat Mono. Line numbers are in `--inspect-carbon-light` with a vertical `--inspect-blue-light` separator.
- Horizontal rules: rendered as caution tape stripes (the `--inspect-tape-stripe` pattern, 6px tall), immediately recognizable and on-brand.

**Callout patterns:**
- **Note (Compliance Note):** A form-field callout -- `--inspect-form` background, `--inspect-blue-form` left border (3px), header "COMPLIANCE NOTE" in Barlow Condensed `--inspect-blue-form`. Content in Public Sans. A small blue form-number badge appears in the top-right corner. The tone is bureaucratic and precise.
- **Warning (Code Violation):** `--inspect-orange` left border (4px), faint orange background tint (`rgba(232, 112, 40, 0.06)`), header "CODE VIOLATION" in Barlow Condensed `--inspect-orange`. An orange construction cone icon (CSS triangles) sits beside the header. The callout implies something is wrong and must be corrected.
- **Danger (Condemned Notice):** Styled as a red condemnation tag -- `--inspect-red-tag` background, white text, header "CONDEMNED — DO NOT USE" in Barlow Condensed. The entire callout is slightly rotated (`transform: rotate(-0.5deg)`) with a CSS "staple" in the top-left corner (a small dark rectangle with an inset shadow). This is used for deprecated features or dangerous practices.
- **Tip (Inspector's Note):** Minimal styling -- no background, just a `--inspect-hi-vis-dim` left border (2px dashed) and header "INSPECTOR'S NOTE" in Public Sans italic, `--inspect-carbon-light`. Feels like a handwritten margin annotation on the inspection form.

### 5) Motion Ideas

1. **Caution Tape Scroll:** The caution tape stripe dividers (`--inspect-tape-stripe`) have a slow `background-position` animation that shifts the diagonal stripes to the left over 12 seconds, looping infinitely. The movement is slow enough to be subliminal but creates a sense of an active construction zone. On hover, the speed doubles briefly (transition the animation-duration from 12s to 6s), as if the tape is being pulled.

2. **Red Tag Staple Impact:** When a "Condemned Notice" callout enters the viewport (via `IntersectionObserver`), it animates in with a brief "staple gun" effect: the callout appears from `scale(1.02) opacity(0)` to `scale(1) opacity(1)` over 150ms with an abrupt `ease-out` timing, accompanied by the CSS "staple" element snapping from `scaleY(0)` to `scaleY(1)` over 80ms. The effect is sudden and decisive -- a condemnation notice being stapled to the wall.

3. **Form Field Highlight on Scroll:** As the user scrolls through a content page, the "field inspection header" at the top transitions: the "LAST INSPECTED" date field updates its background from `--inspect-blue-light` to a briefly brighter `--inspect-hi-vis` at 15% opacity for 1 second, then fades back. This simulates the inspector "updating" the inspection timestamp as you review the page. Triggered once on first scroll via `IntersectionObserver`.

**Reduced-motion fallback:** Caution tape is static (no scroll animation). Condemned notice appears instantly without scale effect. Form field highlight is a static color without transition.

### 6) Signature Component

**The Violation Log Sidebar**

A collapsible panel on the right side of content pages (or at the bottom on narrow viewports), styled as a running log of building code violations found during inspection. It serves as a combination of page metadata, related links, and worldbuilding narrative.

Structure:
```
┌─ VIOLATION LOG ──────────────────┐
│                                  │
│  VIO-042-A  [STRUCTURAL]        │
│  Non-compliant egress path.     │
│  See: bl tree                   │
│  Status: ▓▓▓▓░░░░ PARTIAL FIX   │
│                                  │
│  VIO-042-B  [ELECTRICAL]        │
│  Unlicensed wiring in backlog   │
│  configuration layer.           │
│  See: .backlog/config.yml       │
│  Status: ████████ RESOLVED      │
│                                  │
│  VIO-042-C  [OCCUPANCY]         │
│  Structure exceeds maximum task  │
│  capacity for assigned level.   │
│  See: bl blocked                │
│  Status: ░░░░░░░░ OPEN          │
│                                  │
│  ── 3 violations on record ──   │
│  Last inspection: 2026-02-14    │
└──────────────────────────────────┘
```

Implementation:
- The panel has a `--inspect-form` background with a `--inspect-orange` top border (3px) and `--inspect-shadow` drop shadow.
- "VIOLATION LOG" header in Barlow Condensed, `--inspect-orange`.
- Each violation entry has:
  - A violation ID in Red Hat Mono, `--inspect-carbon-light` (e.g., `VIO-042-A`)
  - A category tag in brackets, color-coded: `[STRUCTURAL]` in blue, `[ELECTRICAL]` in orange, `[OCCUPANCY]` in red
  - A brief description in Public Sans, `--inspect-carbon`, 0.85rem
  - A "See:" cross-reference link in `--inspect-blue-form`
  - A progress bar showing compliance status: filled blocks in `--inspect-hi-vis` for resolved portions, empty blocks in `--inspect-chain-link` for unresolved
  - Status label: "RESOLVED" in hi-vis, "PARTIAL FIX" in orange, "OPEN" in red
- The bottom of the panel shows a summary count and last inspection date.

The violations are authored as page frontmatter or a data file, mapping to related documentation pages. "Structural" violations reference navigation/hierarchy docs, "Electrical" violations reference configuration, "Plumbing" violations reference data flow, etc. The metaphor is consistent: the building (the software) has code violations (documentation gaps or known issues) that the inspector (the reader) is reviewing.

This component transforms a conventional "Related Pages" or "Known Issues" sidebar into a narrative artifact that deepens the building inspection fiction while remaining genuinely useful for cross-referencing documentation.

### 7) Risks/Tradeoffs

- **Readability:** Public Sans is an exceptionally readable government-standard font. The concrete background with noise texture must be very subtle (3% opacity) to not reduce text contrast. Text contrast: `#1E1E22` on `#FFFEF8` = 15.8:1, excellent. The form field styling (blue backgrounds behind field values) is unusual for docs but standard for municipal forms -- developers familiar with form-based UIs will find it readable.
- **Implementation complexity:** The inspection header form fields require a custom Starlight component override for page metadata. The caution tape dividers are pure CSS. The violation log sidebar is a custom component that reads from page frontmatter. The condemned notice callout with its staple pseudo-element requires careful CSS positioning. The checklist sidebar navigation requires a Starlight sidebar override. Overall: medium-high complexity, with several distinct custom components.
- **Novelty risk:** Building inspection reports are deeply mundane documents, which is exactly the point -- the horror of the Backrooms is found in institutional mundanity applied to impossible spaces. The risk is that the concept is too dry, too bureaucratic to be engaging. Mitigation: the violation descriptions can be lightly humorous ("Structure exceeds maximum task capacity for assigned level" is a building code way of saying "too many tasks"), and the condemned notice callout adds dramatic visual punctuation. The concept works because it commits to the fiction with a straight face.
- **Dark mode story:** "Night inspection" -- the inspector is surveying the building with a flashlight. The concrete darkens, the form paper is illuminated in a pool of light, and the safety orange and hi-vis colors become the most prominent elements (as they would be in actual low-light conditions). The caution tape glows faintly. This is a strong dark mode concept because safety colors are specifically designed to be visible in the dark.
- **Metaphor coherence:** The building/software mapping is natural and consistent: foundation=installation, structural=architecture/commands, electrical=configuration, plumbing=data flow, occupancy=sessions/capacity, egress=navigation. Each domain maps to a documentation section, making the violation log a genuinely useful organizational tool rather than a decorative gimmick.

### 8) Practicality Score: 7/10
The color system and typography are straightforward Starlight CSS variables. The form-field headers require a custom component. The caution tape is pure CSS gradients. The checklist sidebar needs a component override. The violation log sidebar is a medium-complexity custom component. The condemned notice is CSS-only. The main challenge is the number of distinct form-styled elements (headers, fields, checkboxes, progress bars) that each need individual styling. Achievable but requires dedicated CSS work.

### 9) Distinctiveness Score: 10/10
No documentation site has ever been themed as a building inspection report. The combination of municipal form styling, safety-orange accents, caution tape dividers, condemned notices, and a violation log sidebar is entirely unprecedented. The concept extends the Backrooms aesthetic through a lens that no other concept has used -- not the experience of being IN the Backrooms, but the experience of someone whose JOB is to document and inspect the Backrooms as a building. The inspector is the reader. The building is the software. The violations are the documentation gaps. The metaphor is deep, consistent, and unique.

### 10) Sample CSS Token Set

```css
:root {
  /* Condemned Property -- Light Mode (Daylight Inspection) */
  --sl-color-bg: #E8E4DC;
  --sl-color-bg-nav: #E8E4DC;
  --sl-color-bg-sidebar: #E8E4DC;
  --sl-color-hairline: #C0BEB8;
  --sl-color-text: #1E1E22;
  --sl-color-text-accent: #6A6A72;
  --sl-color-accent: #E87028;
  --sl-color-accent-low: rgba(232, 112, 40, 0.08);
  --sl-color-accent-high: #E87028;
  --inspect-form: #FFFEF8;
  --inspect-blue-form: #2850A0;
  --inspect-blue-light: #D8E4F0;
  --inspect-hi-vis: #C8E020;
  --inspect-hi-vis-dim: #8AA818;
  --inspect-red-tag: #CC2020;
  --inspect-tape: #FFD000;
  --inspect-chain-link: #8A8A90;
  --inspect-code-bg: #F4F2EC;
  --inspect-shadow: rgba(30, 30, 34, 0.12);
  --inspect-tape-stripe: repeating-linear-gradient(
    -45deg,
    var(--inspect-tape) 0px,
    var(--inspect-tape) 10px,
    var(--sl-color-text) 10px,
    var(--sl-color-text) 20px
  );
  --sl-font: 'Public Sans', 'Helvetica Neue', sans-serif;
  --sl-font-display: 'Barlow Condensed', 'Impact', sans-serif;
  --sl-font-mono: 'Red Hat Mono', 'Consolas', monospace;
}

[data-theme="dark"] {
  /* Night Inspection -- Flashlight Only */
  --sl-color-bg: #18181C;
  --sl-color-bg-nav: #18181C;
  --sl-color-bg-sidebar: #1E1E24;
  --sl-color-hairline: #2A2A30;
  --sl-color-text: #D0D0D8;
  --sl-color-text-accent: #7A7A84;
  --sl-color-accent: #F08038;
  --sl-color-accent-low: rgba(240, 128, 56, 0.12);
  --sl-color-accent-high: #F08038;
  --inspect-form: #222228;
  --inspect-blue-form: #5080C8;
  --inspect-blue-light: #1A2840;
  --inspect-hi-vis: #D8F030;
  --inspect-code-bg: #1A1A20;
  --inspect-chain-link: #4A4A52;
}
```
