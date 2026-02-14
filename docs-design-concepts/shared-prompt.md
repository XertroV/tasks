# The Backlogs — Docs Website Visual Concept Brief

## IMPORTANT: Use your frontend-design skill first!

Before doing any work, load the frontend-design skill:
- Use the Skill tool with skill="frontend-design"
- This will give you aesthetic guidelines to follow

## Product Context

**The Backlogs** is a CLI tool for hierarchical project backlog management. It stores tasks as YAML/Markdown files in a `.backlog/` directory. Dual implementations in Python and TypeScript/Bun. Key commands use `bl` as the canonical prefix (e.g., `bl grab`, `bl cycle`, `bl tree`).

### Brand Aesthetic: "The Backrooms" Liminal

The entire brand is inspired by "The Backrooms" creepypasta — infinite liminal office spaces, fluorescent hum, analog decay, institutional abandonment. Think: procedural order in uncanny environments.

### Existing Color Palette (from logo.py)
- **Fluorescent whites**: rgb(255, 252, 230) — hot institutional light
- **Yellows**: rgb(255, 230, 130) → rgb(200, 175, 50) — warm decay
- **Shadows**: rgb(80, 55, 5) → rgb(3, 2, 0) — void/corruption
- **Accents**: mold green rgb(20, 30, 10), carpet tans rgb(160, 140, 90)

### Logo Style
ASCII art with decay/corruption effects: progressive character dissolution (█▓▒░·), per-letter fluorescent flicker, VHS tracking artifacts, chromatic aberration. Multiple logo variants exist: "The Infinite Stack" (decaying text layers), "Level 0" (a Backrooms room), "The Flickering Sign" (institutional signage), "The Corridor" (one-point perspective hallway).

### Key Commands (for docs content examples)
`bl list`, `bl tree`, `bl show`, `bl claim ID`, `bl done`, `bl grab`, `bl cycle`, `bl next`, `bl dash`, `bl search PATTERN`, `bl add`, `bl move SOURCE --to DEST`, `bl blocked`, `bl why`, `bl session start|end`

## Target Platform
Static docs site built with **Astro/Starlight**. Must be practical to implement within Starlight's theming system (CSS custom properties, component overrides, layout slots).

## Audience
Developers and AI agents reading command documentation for extended sessions. Readability is non-negotiable.

## Design Constraints
- Avoid generic "AI SaaS docs" aesthetics
- No purple-heavy default gradients
- Must work in BOTH light and dark themes (or have a compelling dual-theme story)
- Code blocks and long-form reading must be ergonomically first-class
- Favor unusual but usable typography (avoid Inter/Roboto-only stacks)
- Accessible contrast ratios (WCAG AA minimum)

## Output Format Per Concept

For EACH concept, provide ALL of these sections:

### 1) Concept Name
A memorable, evocative name.

### 2) Vibe Statement
One sentence capturing the feeling.

### 3) Visual System
- **Palette**: Specific hex colors with names and roles (background, surface, text, accent, muted, code-bg, etc.)
- **Typography pairing**: Display font + body font + monospace font (with Google Fonts or similar sources)
- **Texture/material cues**: What physical materials does this evoke?
- **Iconography style**: Line weight, fill style, geometric vs organic

### 4) Layout Ideas
- **Homepage hero**: What does the landing page look like?
- **Sidebar/nav style**: How does navigation feel?
- **Content page structure**: Headers, paragraphs, spacing approach
- **Callout patterns**: How do tips, warnings, notes look?

### 5) Motion Ideas
- Subtle, meaningful animations
- Include reduced-motion fallback description
- Max 2-3 motion effects per concept

### 6) Signature Component
One unique UI element that defines this concept. Describe it in detail — what it looks like, how it behaves, what makes it special.

### 7) Risks/Tradeoffs
- Readability concerns
- Implementation complexity
- Novelty risk (too weird? too subtle?)

### 8) Practicality Score (1-10)
How feasible in Astro/Starlight?

### 9) Distinctiveness Score (1-10)
How far from "generic docs site"?

### 10) Sample CSS Token Set
```css
:root {
  /* Provide 10-15 CSS custom properties */
}
```
