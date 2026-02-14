# Design Concept: The Infinite Filing Cabinet (The Backlogs)

**Goal:** Transform the documentation for "The Backlogs" CLI into an immersive, framework-driven experience that mimics the sensation of rifling through filing cabinets in the Backrooms.
**Vibe:** Eerie, liminal, low-poly 3D, "silky" animations, subtle psychological horror.

---

## The Color Story: "Damp Wallpaper"
A unified palette to evoke the "mono-yellow" madness of the Backrooms while maintaining readability for documentation.

| Color Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Backrooms Yellow** | `#D6C68B` | Main wall color, cabinet metal shader base. |
| **Damp Carpet** | `#BFB48F` | Floor texture, slightly darker and "wetter" tone. |
| **Manilla Cream** | `#F2E8D5` | The paper/folder color. High readability surface. |
| **Fluorescent Hum** | `#FFFFF0` | Light source color (blindingly bright highlights). |
| **Dried Fluid** | `#5A4B27` | Deep shadows, text ink, rust on cabinets. |
| **Liminal Teal** | `#4A6C6F` | *Rare* accent color (links/buttons) to break the yellow fever. |

---

## Vision 1: The Infinite Hallway (First-Person Explorer)

*A literal interpretation. The user "walks" through the documentation.*

### 1. The Viewport
**First-Person (FPS) POV.** The camera floats at eye level in an endless corridor of yellow wallpaper and beige filing cabinets. The geometry repeats infinitely (procedural generation). The lighting hums and flickers.

### 2. The Navigation
**"On Rails" Walk.**
- **Scroll Down:** You walk forward down the hallway. The faster you scroll, the faster you run.
- **Scroll Up:** You retreat backward.
- **Hover:** Hovering over a cabinet "pauses" the walk and focuses the camera on that drawer.
- **Click:** Clicking a drawer slides it open with a heavy metallic *shhh-clunk*.

### 3. The "Rifling" Mechanic
**Physics-Based Pull.**
When a drawer opens, the camera swoops down to look into it top-down.
- **Mouse Drag:** You drag your mouse backward to "flick" through the hanging files (using R3F physics). They sway and collide with satisfying weight.
- **Selection:** Clicking a file pulls it out and holds it up to the screen (modal view) for reading. The background blurs.

### 4. The Horror Touch
**"The Wrong File."**
Occasionally (1 in 50 chance), when you pull out a file, the text is not documentation but frantic, handwritten scribbles: *"IT HEARS YOU BREATHING"* or *"DON'T LOOK BEHIND YOU"*. The light flickers violently for 0.5s, then the file snaps back to normal documentation.

### 5. Tech Stack
- `react-three-fiber` (Core 3D)
- `@react-three/rapier` (Physics for the swinging files)
- `@react-three/drei` (`ScrollControls` for the hallway movement)
- `zustand` (State machine for walking/reading modes)

---

## Vision 2: The Administrator's Desk (Isometric Strategy)

*A god-view experience. You are the archivist, and the cabinets come to you.*

### 1. The Viewport
**Fixed Isometric View (Orthographic Camera).**
You are looking down at a messy, infinite mahogany desk floating in a yellow void. In the distance, rows of cabinets stretch to the horizon. The desk is your "viewport" for content.

### 2. The Navigation
**Point-and-Click Adventure.**
- **The Room:** You don't move the camera; you move the room. Dragging the background pans the infinite rows of cabinets.
- **The Summoning:** Clicking a cabinet in the distance causes it to slide rapidly across the floor (ghostly smooth) and park itself next to your desk.

### 3. The "Rifling" Mechanic
**Card Stack / Rolodex.**
When a drawer opens, the files "fly" out and land on your desk in a neat stack.
- **Scroll:** Scrolling riffles through the stack (like Apple's old Cover Flow or a deck of cards).
- **Spread:** Pressing `Space` spreads the documents out on the desk surface in a grid (masonry layout).
- **Read:** Clicking a page zooms the camera straight down into the paper texture.

### 4. The Horror Touch
**"The Peripheral Movement."**
The desk is cluttered with objects (coffee cup, lamp, pens). If you leave the tab idle for 60 seconds, objects slightly change position when you aren't hovering over them. A pen rolls off the edge. The coffee cup ripples as if something heavy walked by. A shadow passes over the desk, but there is no object casting it.

### 5. Tech Stack
- `react-three-fiber`
- `framer-motion` (For the 2D UI overlays on the desk)
- `@react-three/drei` (`CameraShake` for subtle unease)
- `react-spring` (For the "snappy" file dealing animations)
- `maath` (For damping and smooth camera transitions)

---

## Vision 3: The Data Tunnel (Cinematic Fly-Through)

*Abstract and high-speed. The "Interstellar" Tesseract meets a 90s office.*

### 1. The Viewport
**Cinematic Fly-Cam.**
The camera floats in a void filled with floating documents and cabinet drawers, arranged in a spiral or tunnel formation. It feels like falling down a rabbit hole of bureaucracy.

### 2. The Navigation
**Scroll-Driven Timeline.**
- The Z-axis is the timeline of the project (Phases -> Milestones -> Epics).
- **Scroll:** You fly deeper into the tunnel. The "past" (completed tasks) flies behind you; the "future" (backlog) looms ahead.
- **Sections:** Passing a "Milestone" triggers a massive visual shift (e.g., the lights change from yellow to flickering orange).

### 3. The "Rifling" Mechanic
**Parallax Hover.**
Files are floating in suspension around you.
- **Hover:** Moving the mouse creates a "flashlight" effect. Files illuminate and float closer to the camera when hovered.
- **Read:** Clicking a file doesn't open a modal; instead, the camera flies *into* the paper, and the text becomes the HTML page background. The 3D world fades to a watermark behind the text.

### 4. The Horror Touch
**"The Glitch."**
As you scroll deeper and faster, the geometry begins to break. Cabinets clip into each other. The "ceiling" texture is replaced by a low-poly face for a split second. The documentation text momentarily corrupts into Zalgo text (`H̸̢̹ǫ̢̀w͎ ̣͉t͎o͇ ͎i̦n͉ștạll`) before correcting itself.

### 5. Tech Stack
- `react-three-fiber`
- `@react-three/postprocessing` (Bloom, Glitch, Noise, Vignette)
- `lenis` (Essential for the smooth, weighty scroll feel)
- `troika-three-text` (For high-quality 3D text rendering in the tunnel)

---
