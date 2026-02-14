# Docs Design Concepts: Prototypes & Next Steps

We have developed **4 distinct interactive prototypes** ranging from production-ready HTML/CSS to a high-fidelity 3D React experience.

## 1. Sublevel Zero (The Flagship HTML Prototype)
**Location:** `docs-design-concepts/prototypes/sublevel-zero/index.html`
**Concept:** A dark, institutional monitoring system where the documentation decays as you go deeper.
**Key Features:**
-   **Split-Flap Title:** Characters cycle mechanically on page load.
-   **Decay System:** As you navigate deeper (Commands -> Internals), the UI corrupts (water stains, skew, glitches).
-   **Thermal Receipts:** Code blocks look like physical thermal paper printouts.
-   **Redaction:** Hover over redacted text to invert colors and read it.
-   **Scroll Monitoring:** The header status changes based on your scroll position ("MONITORING" -> "READING" -> "DEEP SCAN").

## 2. Departure Board (The Aesthetic Prototype)
**Location:** `docs-design-concepts/prototypes/departure-board/index.html`
**Concept:** A transit terminal for a system that doesn't exist.
**Key Features:**
-   **Full Split-Flap Board:** The hero section is a fully animated departure board.
-   **LED Status:** Pulsing amber/green/red LEDs indicate system status.
-   **Ticker:** A smooth scrolling dot-matrix ticker.

## 3. Somnography Hybrid (The Narrative Prototype)
**Location:** `docs-design-concepts/prototypes/somnography-hybrid/index.html`
**Concept:** A sleep study of a subject dreaming about the documentation.
**Key Features:**
-   **EEG Traces:** SVG sine waves animate on load.
-   **Hypnogram:** Navigation tracks sleep depth (Wake -> N1 -> N2 -> REM).
-   **Researcher Notes:** Diegetic annotations in red pen on the docs.

## 4. The Administrator's Desk (High Effort Mode - React/R3F)
**Location:** `docs-design-concepts/prototypes/administrator-desk/`
**Concept:** You are sitting at a desk in the Backrooms, organizing infinite files.
**How to Run:**
```bash
cd docs-design-concepts/prototypes/administrator-desk
bun install
bun run dev
```
**Key Features:**
-   **3D Environment:** Infinite yellow void with volumetric fog and dust motes.
-   **Diegetic UI:** Sidebar is a stack of physical manila folders. Content is a sheet of paper on the desk.
-   **Procedural Audio:** A low hum that deepens as you scroll.
-   **Volumetric Lighting:** The desk lamp flickers and casts god rays.
-   **Glitch Text:** Headers randomly corrupt to Zalgo text.

---

## Recommendation
-   **For the main docs site:** Use **Sublevel Zero**. It balances "art project" with actual usability. The decay system is sustainable for long-term content.
-   **For the "High Effort" landing page / marketing:** Use **The Administrator's Desk**. It's a showstopper. You could even embed the Sublevel Zero docs *inside* the paper on the desk for the ultimate meta-experience.
