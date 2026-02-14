# Typography Research: "The Backlogs" Aesthetic

## 1. Analysis of the ASCII Logo
**Reference:** `/home/xertrov/src/tasks/README.md`

The logo depicts a heavy, blocky structure that begins solid at the top and progressively disintegrates into noise and dithered patterns at the bottom.

*   **Style:** Block / Glitch / Brutalist.
*   **Characters:** Full block (`█`), half blocks (`▀`, `▄`), and shading/dithering characters (`▓`, `▒`, `░`).
*   **Aesthetic:** "Digital Rot" or "Transmission Decay." It conveys a sense of a stable system breaking down into entropy—perfect for a "Backlogs" manager where tasks might rot if left unattended.
*   **Key Feature:** The gradient from order (solid blocks) to chaos (scattered pixels).

## 2. Font Research & Vibe Matching

### Vibe A: The Bureaucracy
*Keywords: Official, cold, printed manuals, redacted, typewriter, damp paper.*
*   **Primary Candidates:**
    *   **Special Elite:** Mimics a grimy, inked typewriter. It feels like a report written in a basement.
    *   **Courier Prime:** A cleaner, more legible typewriter font. Good for code but retains the vibe.
    *   **Playfair Display:** A high-contrast serif that feels "official" and "institutional" but can look sinister when paired with industrial elements.
    *   **Old Standard TT:** specific to late 19th/early 20th-century manuals. Very dry and academic.

### Vibe B: The Terminal
*Keywords: Glowing phosphor, scanlines, code, HUD, monospaced.*
*   **Primary Candidates:**
    *   **VT323:** The classic "green screen" terminal font. It has a distinct pixelated grid.
    *   **Share Tech Mono:** A modern, boxy monospace often used in UI/HUD designs. It feels like a functional OS.
    *   **Fira Code / JetBrains Mono:** Too clean/modern. We need something with more "character" or "age."
    *   **Space Mono:** Geometric and slightly eclectic. It feels like a retro-future interface.

### Vibe C: The ASCII Match
*Keywords: Blocky, glitch, 8-bit, distorted, heavy weight.*
*   **Primary Candidates:**
    *   **Rubik Glitch:** Matches the "decay" aspect of the logo perfectly.
    *   **Press Start 2P:** Matches the blockiness but feels too "Mario."
    *   **Bungee:** Very heavy and blocky, but maybe too cheerful.
    *   **Chakra Petch:** Square and structural, good for the "solid" part of the logo.

---

## 3. Recommended Font Stacks

### Stack 1: "The Report" (Bureaucracy & Texture)
*Rationale: Evokes the feeling of finding a redacted SCP document or a forgotten manual in a damp filing cabinet. High contrast between the "Authority" of the serif and the "Reality" of the typewriter.*

*   **Headings:** **Playfair Display** (Weight: 700/900) - *The Institutional Voice.*
*   **Body:** **Courier Prime** (Weight: 400) - *The Typed Record.*
*   **Accent/Meta:** **Special Elite** - *For stamps, notes, or "handwritten" feel.*

**CSS Snippet:**
```css
:root {
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Courier Prime', monospace;
  --font-accent: 'Special Elite', cursive;
}

h1, h2, h3 {
  font-family: var(--font-heading);
  font-weight: 700;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

p, li, code {
  font-family: var(--font-body);
  line-height: 1.6;
}
```

**Google Fonts Link:** [Playfair Display + Courier Prime + Special Elite](https://fonts.google.com/share?selection.family=Courier+Prime|Playfair+Display:wght@700;900|Special+Elite)

---

### Stack 2: "The Monitor" (Terminal & Scanlines)
*Rationale: Puts the user directly inside the "machine." This stack mimics the CLI interface itself, bridging the gap between the terminal tool and its documentation.*

*   **Headings:** **Share Tech Mono** - *The OS Interface.*
*   **Body:** **Space Mono** - *The Readable Data.* (Chosen over VT323 for body text legibility).
*   **Code/Pre:** **VT323** - *The Raw Output.*

**CSS Snippet:**
```css
:root {
  --font-heading: 'Share Tech Mono', monospace;
  --font-body: 'Space Mono', monospace;
  --font-code: 'VT323', monospace;
}

h1, h2, h3 {
  font-family: var(--font-heading);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

body {
  font-family: var(--font-body);
  font-size: 16px; /* Space Mono handles small sizes well */
}

pre, code {
  font-family: var(--font-code);
  font-size: 1.1em; /* VT323 needs to be slightly larger */
}
```

**Google Fonts Link:** [Share Tech Mono + Space Mono + VT323](https://fonts.google.com/share?selection.family=Share+Tech+Mono|Space+Mono:ital,wght@0,400;0,700;1,400|VT323)

---

### Stack 3: "The Decay" (Glitch & Contrast)
*Rationale: Directly mirrors the ASCII logo's transition from structure to noise. This is the most "Horror/Backrooms" specific stack.*

*   **Headings:** **Rubik Glitch** - *The Corruption.*
*   **Body:** **IBM Plex Mono** - *The Cold Hard Fact.* (Extremely neutral, industrial monospace).
*   **Subheadings:** **Chakra Petch** - *The Remaining Structure.*

**CSS Snippet:**
```css
:root {
  --font-heading: 'Rubik Glitch', display;
  --font-body: 'IBM Plex Mono', monospace;
  --font-sub: 'Chakra Petch', sans-serif;
}

h1 {
  font-family: var(--font-heading);
  color: #d00; /* Works well with the glitch aesthetic */
}

h2, h3 {
  font-family: var(--font-sub);
  font-weight: 600;
}

body {
  font-family: var(--font-body);
  font-weight: 400;
}
```

**Google Fonts Link:** [Rubik Glitch + IBM Plex Mono + Chakra Petch](https://fonts.google.com/share?selection.family=Chakra+Petch:wght@600|IBM+Plex+Mono:wght@400;600|Rubik+Glitch)

---

## 4. The Crucial ASCII Callback

The font that best captures the essence of the logo in `/home/xertrov/src/tasks/README.md` is:

### **Rubik Glitch**

**Why?**
The logo's defining characteristic isn't just that it's "blocky" (like *Press Start 2P*) or "technological" (like *Share Tech Mono*). Its core visual narrative is **Entropy**: the bottom half is dissolving into static (`░ ▒ ▓`).

*Rubik Glitch* captures this exact texture of "data rot" and "signal loss." Using this for the main title ("The Backlogs") would create a direct visual link between the CLI tool's ASCII art and the web documentation.
