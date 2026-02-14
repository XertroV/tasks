# Lightgun Interaction System for VCR Documentation

**Version:** 1.0  
**Created:** 2026-02-14  
**Concept:** NES Zapper meets VCR on-screen menus -- Navigate documentation by shooting links on a paused VHS tape

---

## Design Philosophy

**The Vibe:** It's 1991. You're in your family's wood-paneled den. The CRT TV flickers in the corner. You're holding the orange plastic NES Zapper, and the VCR's on-screen menu is asking you to choose "PLAY" or "REWIND." But this isn't a game -- it's documentation. And something is... wrong.

**Core Aesthetic Pillars:**

1. **Tactile Violence** -- Shooting a link should feel impactful. Not a click, a shot.
2. **VCR Authenticity** -- Menus should look like they came from a 1987 Funai VHS player
3. **Diegetic Horror** -- The gun exists in the world. The VCR is a physical object. The screen is haunted.
4. **Deliberate Action** -- Every navigation is a choice. You point. You aim. You pull the trigger.

---

## 1. LIGHTGUN CURSOR DESIGN

### 1.1 The Reticle

**Design Concept:** Classic NES Zapper crosshair with CRT phosphor glow

```
     ╱╲
    ╱  ╲
   ╱    ╲
  ╱      ╲
 ─────────────────
  ╲      ╱
   ╲    ╱
    ╲  ╱
     ╲╱
```

### 1.2 SVG Implementation

```svg
<svg id="lightgun-cursor" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <!-- Glow filter for phosphor effect -->
    <filter id="cursor-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Targeting mode glow (when over clickable) -->
    <filter id="targeting-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="1 0 0 0 0.1
                0 1 0 0 0.8
                0 0 1 0 0.3
                0 0 0 1 0"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Outer ring -->
  <circle cx="32" cy="32" r="28" 
          fill="none" 
          stroke="#33FF33" 
          stroke-width="1.5"
          stroke-dasharray="4 6"
          filter="url(#cursor-glow)"
          class="cursor-ring"/>
  
  <!-- Crosshair lines -->
  <g stroke="#33FF33" stroke-width="2" filter="url(#cursor-glow)" class="crosshair-lines">
    <!-- Top -->
    <line x1="32" y1="4" x2="32" y2="20"/>
    <!-- Bottom -->
    <line x1="32" y1="44" x2="32" y2="60"/>
    <!-- Left -->
    <line x1="4" y1="32" x2="20" y2="32"/>
    <!-- Right -->
    <line x1="44" y1="32" x2="60" y2="32"/>
  </g>
  
  <!-- Center dot -->
  <circle cx="32" cy="32" r="3" 
          fill="#33FF33" 
          filter="url(#cursor-glow)"
          class="center-dot"/>
  
  <!-- Corner brackets (gun sight style) -->
  <g stroke="#33FF33" stroke-width="1.5" fill="none" filter="url(#cursor-glow)" class="corner-brackets">
    <!-- Top-left -->
    <path d="M 8 16 L 8 8 L 16 8"/>
    <!-- Top-right -->
    <path d="M 48 8 L 56 8 L 56 16"/>
    <!-- Bottom-left -->
    <path d="M 8 48 L 8 56 L 16 56"/>
    <!-- Bottom-right -->
    <path d="M 48 56 L 56 56 L 56 48"/>
  </g>
</svg>
```

### 1.3 CSS Styling

```css
:root {
  /* Cursor color tokens */
  --cursor-idle: #33FF33;       /* Classic CRT green */
  --cursor-targeting: #00FFFF;  /* Cyan when over target */
  --cursor-firing: #FFFF00;     /* Yellow flash on shot */
  --cursor-disabled: #666666;   /* Grayed out */
  
  /* Animation timings */
  --cursor-pulse-duration: 2s;
  --firing-flash-duration: 100ms;
}

#lightgun-cursor {
  position: fixed;
  pointer-events: none;
  z-index: 10000;
  transform: translate(-50%, -50%);
  transition: filter 0.15s ease-out;
}

/* Idle state - subtle pulse */
#lightgun-cursor.idle {
  animation: cursor-pulse var(--cursor-pulse-duration) ease-in-out infinite;
}

@keyframes cursor-pulse {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; }
}

/* Targeting state - over a clickable */
#lightgun-cursor.targeting {
  filter: url(#targeting-glow);
  animation: targeting-pulse 0.5s ease-in-out infinite;
}

@keyframes targeting-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

/* Firing state - quick flash */
#lightgun-cursor.firing {
  filter: brightness(2) drop-shadow(0 0 20px var(--cursor-firing));
  animation: firing-recoil var(--firing-flash-duration) ease-out;
}

@keyframes firing-recoil {
  0% { transform: translate(-50%, -50%) scale(1.3); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

/* Miss state - shudder */
#lightgun-cursor.miss {
  animation: miss-shake 0.3s ease-out;
}

@keyframes miss-shake {
  0%, 100% { transform: translate(-50%, -50%); }
  20% { transform: translate(-48%, -50%); }
  40% { transform: translate(-52%, -50%); }
  60% { transform: translate(-50%, -48%); }
  80% { transform: translate(-50%, -52%); }
}

/* Hide default cursor when lightgun is active */
body.lightgun-mode {
  cursor: none !important;
}

body.lightgun-mode * {
  cursor: none !important;
}
```

### 1.4 JavaScript Cursor Controller

```typescript
// LightgunCursor.ts
interface CursorState {
  x: number;
  y: number;
  mode: 'idle' | 'targeting' | 'firing' | 'miss';
  lastFireTime: number;
}

export class LightgunCursor {
  private cursorEl: SVGSVGElement;
  private state: CursorState;
  private onFire: ((x: number, y: number, hit: boolean) => void) | null = null;
  
  constructor() {
    this.state = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      mode: 'idle',
      lastFireTime: 0
    };
    
    this.cursorEl = this.createCursorElement();
    document.body.appendChild(this.cursorEl);
    this.bindEvents();
  }
  
  private createCursorElement(): SVGSVGElement {
    // Create SVG from template above
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(CURSOR_SVG, 'image/svg+xml');
    return svgDoc.documentElement as SVGSVGElement;
  }
  
  private bindEvents() {
    // Mouse movement
    document.addEventListener('mousemove', this.handleMouseMove);
    
    // Click to fire
    document.addEventListener('click', this.handleFire);
    
    // Track targetable elements
    this.setupTargetTracking();
  }
  
  private handleMouseMove = (e: MouseEvent) => {
    this.state.x = e.clientX;
    this.state.y = e.clientY;
    this.updateCursorPosition();
  };
  
  private handleFire = (e: MouseEvent) => {
    if (Date.now() - this.state.lastFireTime < 200) return; // Debounce
    
    this.state.lastFireTime = Date.now();
    const target = this.getTargetAt(this.state.x, this.state.y);
    const hit = target !== null;
    
    // Visual feedback
    this.setMode(hit ? 'firing' : 'miss');
    
    // Audio feedback
    this.playFireSound(hit);
    
    // Callback
    if (this.onFire) {
      this.onFire(this.state.x, this.state.y, hit);
    }
    
    // Reset after animation
    setTimeout(() => {
      this.setMode('idle');
    }, hit ? 100 : 300);
    
    if (hit && target) {
      this.triggerHit(target);
    } else {
      this.triggerMiss();
    }
  };
  
  private updateCursorPosition() {
    this.cursorEl.style.left = `${this.state.x}px`;
    this.cursorEl.style.top = `${this.state.y}px`;
  }
  
  private setMode(mode: CursorState['mode']) {
    this.state.mode = mode;
    this.cursorEl.classList.remove('idle', 'targeting', 'firing', 'miss');
    this.cursorEl.classList.add(mode);
  }
  
  private getTargetAt(x: number, y: number): HTMLElement | null {
    // Temporarily hide cursor to detect element underneath
    this.cursorEl.style.display = 'none';
    const element = document.elementFromPoint(x, y) as HTMLElement;
    this.cursorEl.style.display = '';
    
    // Check if it's a shootable target
    if (element?.closest('.shootable, [data-shootable]')) {
      return element.closest('.shootable, [data-shootable]') as HTMLElement;
    }
    return null;
  }
  
  private setupTargetTracking() {
    // Use MutationObserver to watch for new shootable elements
    const observer = new MutationObserver(() => {
      this.updateTargetListeners();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.updateTargetListeners();
  }
  
  private updateTargetListeners() {
    const targets = document.querySelectorAll('.shootable, [data-shootable]');
    
    targets.forEach(target => {
      if (!(target as any)._lightgunTracked) {
        target.addEventListener('mouseenter', () => this.setMode('targeting'));
        target.addEventListener('mouseleave', () => this.setMode('idle'));
        (target as any)._lightgunTracked = true;
      }
    });
  }
  
  private triggerHit(target: HTMLElement) {
    target.classList.add('hit');
    
    // Dispatch custom event
    target.dispatchEvent(new CustomEvent('shot', {
      bubbles: true,
      detail: { x: this.state.x, y: this.state.y }
    }));
    
    // Remove hit class after animation
    setTimeout(() => target.classList.remove('hit'), 500);
  }
  
  private triggerMiss() {
    // Create dust puff effect at miss location
    this.createDustPuff(this.state.x, this.state.y);
  }
  
  private createDustPuff(x: number, y: number) {
    const puff = document.createElement('div');
    puff.className = 'dust-puff';
    puff.style.left = `${x}px`;
    puff.style.top = `${y}px`;
    document.body.appendChild(puff);
    
    setTimeout(() => puff.remove(), 500);
  }
  
  private playFireSound(hit: boolean) {
    // Will be implemented with Web Audio API
    // See section 3.4
  }
  
  public setFireCallback(callback: (x: number, y: number, hit: boolean) => void) {
    this.onFire = callback;
  }
  
  public destroy() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('click', this.handleFire);
    this.cursorEl.remove();
  }
}

const CURSOR_SVG = `...`; // Full SVG from above
```

---

## 2. LINK TARGET DESIGN SYSTEM

### 2.1 VCR Menu Aesthetic

**Reference:** 1980s-1990s VCR on-screen displays (OSD)

**Characteristics:**
- Blocky, pixelated text (often 8x8 or 8x16 character cells)
- Cyan/white text on semi-transparent blue/black backgrounds
- Chunky borders with beveled edges
- Blinking cursors and selection indicators
- Scanline artifacts from composite video

### 2.2 Target Component Styles

```css
:root {
  /* VCR OSD Color Palette */
  --vcr-bg-primary: rgba(0, 0, 40, 0.85);
  --vcr-bg-selected: rgba(0, 80, 120, 0.85);
  --vcr-border: #00BFFF;
  --vcr-text: #00FFFF;
  --vcr-text-dim: #008888;
  --vcr-highlight: #FFFFFF;
  
  /* Target states */
  --target-idle-border: #00BFFF;
  --target-targeting-border: #FFFF00;
  --target-hit-flash: #FF6600;
  
  /* Typography */
  --vcr-font: 'VT323', 'IBM Plex Mono', monospace;
}

/* Base shootable target */
.shootable {
  position: relative;
  display: inline-block;
  padding: 8px 16px;
  margin: 4px;
  
  font-family: var(--vcr-font);
  font-size: 24px;
  color: var(--vcr-text);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  
  background: var(--vcr-bg-primary);
  border: 3px solid var(--target-idle-border);
  
  /* VCR-style beveled border effect */
  box-shadow: 
    inset 2px 2px 0 rgba(255, 255, 255, 0.2),
    inset -2px -2px 0 rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(0, 0, 0, 0.8);
  
  /* Scanline overlay */
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  
  /* Prevent text selection */
  user-select: none;
  
  transition: all 0.15s ease-out;
}

/* Targeting state (cursor hovering) */
.shootable.targeting,
.shootable:hover {
  border-color: var(--target-targeting-border);
  background: var(--vcr-bg-selected);
  color: var(--vcr-highlight);
  
  /* Glow effect */
  box-shadow:
    inset 2px 2px 0 rgba(255, 255, 255, 0.3),
    inset -2px -2px 0 rgba(0, 0, 0, 0.4),
    0 0 20px rgba(255, 255, 0, 0.5),
    0 0 0 1px rgba(255, 255, 0, 0.8);
  
  /* Slight scale */
  transform: scale(1.02);
}

/* Hit state (when shot) */
.shootable.hit {
  animation: hit-flash 0.5s ease-out;
}

@keyframes hit-flash {
  0% {
    background: var(--target-hit-flash);
    border-color: #FFFF00;
    transform: scale(1.1);
    filter: brightness(2);
  }
  20% {
    background: var(--vcr-bg-selected);
    transform: scale(0.95);
  }
  40% {
    background: var(--target-hit-flash);
    transform: scale(1.05);
  }
  100% {
    background: var(--vcr-bg-primary);
    border-color: var(--target-idle-border);
    transform: scale(1);
    filter: brightness(1);
  }
}

/* Large menu-style target */
.shootable.menu-item {
  display: block;
  width: 280px;
  padding: 16px 24px;
  margin: 8px auto;
  text-align: center;
  font-size: 32px;
}

/* Icon + text target */
.shootable.icon-target {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
}

.shootable.icon-target .icon {
  font-size: 28px;
  opacity: 0.9;
}

/* Inline text link (less prominent) */
.shootable.inline {
  padding: 2px 8px;
  font-size: inherit;
  border-width: 2px;
  background: transparent;
}

.shootable.inline.targeting {
  background: var(--vcr-bg-primary);
}
```

### 2.3 React Component

```tsx
// ShootableTarget.tsx
import { useRef, useEffect, useState } from 'react';

interface ShootableProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'menu-item' | 'icon-target' | 'inline';
  icon?: string;
  disabled?: boolean;
  className?: string;
}

export function Shootable({
  children,
  href,
  onClick,
  variant = 'default',
  icon,
  disabled = false,
  className = '',
}: ShootableProps) {
  const ref = useRef<HTMLElement>(null);
  const [isTargeting, setIsTargeting] = useState(false);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const handleShot = (e: CustomEvent) => {
      if (disabled) return;
      
      // Navigate or trigger callback
      if (href) {
        // Trigger FF/REW transition, then navigate
        window.dispatchEvent(new CustomEvent('vcr-navigate', {
          detail: { href, x: e.detail.x, y: e.detail.y }
        }));
      }
      
      if (onClick) {
        onClick();
      }
    };
    
    element.addEventListener('shot', handleShot as EventListener);
    return () => element.removeEventListener('shot', handleShot as EventListener);
  }, [href, onClick, disabled]);
  
  const Tag = href ? 'a' : 'button';
  
  return (
    <Tag
      ref={ref as any}
      className={`shootable ${variant} ${className} ${isTargeting ? 'targeting' : ''}`}
      data-shootable
      data-disabled={disabled}
      onMouseEnter={() => setIsTargeting(true)}
      onMouseLeave={() => setIsTargeting(false)}
      {...(href ? { href } : { type: 'button' })}
    >
      {icon && <span className="icon">{icon}</span>}
      <span className="label">{children}</span>
    </Tag>
  );
}

// Usage examples:
<Shootable href="/docs/getting-started" variant="menu-item">
  Play Tutorial
</Shootable>

<Shootable href="/api" variant="icon-target" icon="►">
  API Reference
</Shootable>

<Shootable variant="inline" onClick={() => scrollToSection('intro')}>
  introduction
</Shootable>
```

---

## 3. HIT / MISS FEEDBACK SPECIFICATIONS

### 3.1 Visual Feedback

#### Hit Feedback

| Timing | Effect | Duration |
|--------|--------|----------|
| 0ms | Target explodes into 8-pixel particles | - |
| 0-50ms | Orange flash (full target area) | 50ms |
| 50-100ms | White flash overlay | 50ms |
| 100-300ms | Particles scatter outward | 200ms |
| 300-500ms | Target fades back in | 200ms |

**Particle Effect CSS:**

```css
.hit-particle {
  position: fixed;
  width: 8px;
  height: 8px;
  background: #FF6600;
  pointer-events: none;
  animation: particle-scatter 0.5s ease-out forwards;
}

@keyframes particle-scatter {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--tx), var(--ty)) scale(0);
  }
}
```

**Particle Generation (JS):**

```typescript
function createHitParticles(x: number, y: number) {
  const particleCount = 12;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'hit-particle';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    
    // Random scatter direction
    const angle = (i / particleCount) * Math.PI * 2;
    const distance = 50 + Math.random() * 50;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    
    // Random color (orange/yellow/white)
    const colors = ['#FF6600', '#FFAA00', '#FFFF00', '#FFFFFF'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 500);
  }
}
```

#### Miss Feedback (Dust Puff)

```css
.dust-puff {
  position: fixed;
  width: 60px;
  height: 60px;
  pointer-events: none;
  transform: translate(-50%, -50%);
  
  background: radial-gradient(
    circle,
    rgba(180, 160, 140, 0.8) 0%,
    rgba(180, 160, 140, 0.4) 30%,
    transparent 70%
  );
  
  animation: dust-puff 0.5s ease-out forwards;
}

@keyframes dust-puff {
  0% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(0.3);
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.5);
  }
}

/* CRT screen static burst on miss */
.screen-static-burst {
  position: fixed;
  inset: 0;
  background: url('data:image/svg+xml,...static-noise-svg...');
  opacity: 0;
  pointer-events: none;
  animation: static-burst 0.15s ease-out;
}

@keyframes static-burst {
  0% { opacity: 0.3; }
  100% { opacity: 0; }
}
```

### 3.2 Audio Feedback

#### Hit Sound

| Layer | Frequency | Duration | Description |
|-------|-----------|----------|-------------|
| **Impact bass** | 80Hz sine | 100ms | Low thud |
| **CRT discharge** | 1-4kHz noise burst | 50ms | Electrical snap |
| **Confirmation beep** | 880Hz square | 80ms | VCR menu beep |

```typescript
function playHitSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  // Impact bass
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.value = 80;
  bassGain.gain.setValueAtTime(0.5, now);
  bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  bass.connect(bassGain);
  bassGain.connect(ctx.destination);
  bass.start(now);
  bass.stop(now + 0.1);
  
  // CRT discharge (filtered noise burst)
  const noiseBuffer = createNoiseBuffer(ctx, 0.05);
  const noiseSource = ctx.createBufferSource();
  const noiseFilter = ctx.createBiquadFilter();
  const noiseGain = ctx.createGain();
  
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 2000;
  noiseFilter.Q.value = 2;
  
  noiseSource.buffer = noiseBuffer;
  noiseGain.gain.setValueAtTime(0.3, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);
  
  // Confirmation beep
  const beep = ctx.createOscillator();
  const beepGain = ctx.createGain();
  beep.type = 'square';
  beep.frequency.value = 880;
  beepGain.gain.setValueAtTime(0, now + 0.02);
  beepGain.gain.linearRampToValueAtTime(0.15, now + 0.03);
  beepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  beep.connect(beepGain);
  beepGain.connect(ctx.destination);
  beep.start(now + 0.02);
  beep.stop(now + 0.1);
}
```

#### Miss Sound

| Layer | Frequency | Duration | Description |
|-------|-----------|----------|-------------|
| **Dull thud** | 60Hz sine | 150ms | Impact on glass |
| **Glass ring** | 2kHz sine decay | 200ms | CRT tube resonance |

```typescript
function playMissSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  // Dull thud
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(100, now);
  thud.frequency.exponentialRampToValueAtTime(40, now + 0.15);
  thudGain.gain.setValueAtTime(0.4, now);
  thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(now);
  thud.stop(now + 0.15);
  
  // Glass ring
  const ring = ctx.createOscillator();
  const ringGain = ctx.createGain();
  ring.type = 'sine';
  ring.frequency.value = 2000;
  ringGain.gain.setValueAtTime(0, now + 0.05);
  ringGain.gain.linearRampToValueAtTime(0.1, now + 0.06);
  ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  ring.connect(ringGain);
  ringGain.connect(ctx.destination);
  ring.start(now + 0.05);
  ring.stop(now + 0.25);
}
```

### 3.3 VCR Beep (Menu Selection)

The classic VCR confirmation beep -- a short, pleasant tone that confirms selection:

```typescript
function playVCRBeep(frequency: number = 1000) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'square';
  osc.frequency.value = frequency;
  
  // Quick attack, immediate decay
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
  gain.gain.setValueAtTime(0.2, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}
```

---

## 4. FAST-FORWARD / REWIND TRANSITIONS

### 4.1 Visual Specification

#### Fast-Forward Effect

**Layers (back to front):**

1. **Speed lines** -- Horizontal motion blur streaks
2. **Frame skipping** -- Brief flashes of "skipped" pages
3. **Timecode overlay** -- VCR-style counter rapidly advancing
4. **Scanline distortion** -- Horizontal tearing
5. **Static bursts** -- Random noise flashes

**Timing:** 1.2 seconds total duration

```
Timeline:
|--0.0s--|--0.3s--|--0.6s--|--0.9s--|--1.2s--|
|        |        |        |        |        |
| START  |        | FRAME  |        | END    |
|        | ACCEL  | FLASH  | DECEL  |        |
```

#### Rewind Effect

Similar to FF but with:
- Reverse motion blur (streaks going left)
- Timecode decreasing
- Higher-pitched audio (tape squeal)
- More static/glitching (rewinding is "rougher")

### 4.2 CSS Implementation

```css
/* VCR Transition Container */
.vcr-transition {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
}

/* Speed Lines */
.vcr-speed-lines {
  position: absolute;
  inset: 0;
  
  /* Horizontal gradient streaks */
  background: repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 8px,
    rgba(255, 255, 255, 0.1) 8px,
    rgba(255, 255, 255, 0.1) 10px
  );
  
  opacity: 0;
  mix-blend-mode: screen;
}

.vcr-transition.ff .vcr-speed-lines {
  animation: speed-lines-ff 0.4s ease-in-out infinite;
}

.vcr-transition.rew .vcr-speed-lines {
  animation: speed-lines-rew 0.4s ease-in-out infinite;
}

@keyframes speed-lines-ff {
  0% { transform: translateX(-100%); opacity: 0.3; }
  50% { opacity: 0.7; }
  100% { transform: translateX(100%); opacity: 0.3; }
}

@keyframes speed-lines-rew {
  0% { transform: translateX(100%); opacity: 0.3; }
  50% { opacity: 0.7; }
  100% { transform: translateX(-100%); opacity: 0.3; }
}

/* Frame Flash (simulated page skip) */
.vcr-frame-flash {
  position: absolute;
  inset: 0;
  background: #000;
  opacity: 0;
  
  animation: frame-flash 0.15s steps(2) infinite;
}

.vcr-transition.ff .vcr-frame-flash {
  /* Flash shows "glimpse" of pages going by */
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
}

@keyframes frame-flash {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.3; }
}

/* Scanline Distortion */
.vcr-scanline-tear {
  position: absolute;
  left: 0;
  right: 0;
  height: 20px;
  background: rgba(255, 255, 255, 0.5);
  
  animation: scanline-tear 0.2s steps(1) infinite;
}

@keyframes scanline-tear {
  0% { top: 10%; }
  25% { top: 35%; }
  50% { top: 60%; }
  75% { top: 85%; }
  100% { top: 10%; }
}

/* Timecode Overlay */
.vcr-timecode {
  position: absolute;
  bottom: 20px;
  right: 20px;
  
  font-family: 'VT323', 'Share Tech Mono', monospace;
  font-size: 48px;
  color: #FFFFFF;
  text-shadow: 2px 2px 0 #000;
  
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 16px;
  border: 2px solid #00BFFF;
}

.vcr-timecode .separator {
  animation: timecode-blink 0.5s steps(1) infinite;
}

@keyframes timecode-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Static Burst Overlay */
.vcr-static {
  position: absolute;
  inset: 0;
  
  /* Animated noise SVG */
  background-image: url("data:image/svg+xml,...");
  opacity: 0;
  mix-blend-mode: overlay;
  
  animation: static-flicker 0.1s steps(2) infinite;
}

@keyframes static-flicker {
  0% { opacity: 0.1; }
  50% { opacity: 0.3; }
  100% { opacity: 0.05; }
}

/* Overall transition animation */
.vcr-transition.active {
  animation: vcr-transition-in 0.2s ease-out forwards;
}

.vcr-transition.exiting {
  animation: vcr-transition-out 0.2s ease-in forwards;
}

@keyframes vcr-transition-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes vcr-transition-out {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
```

### 4.3 JavaScript Transition Controller

```tsx
// VCRTransition.tsx
import { useState, useEffect, useCallback } from 'react';

interface VCRTransitionProps {
  duration?: number;
  onComplete: () => void;
}

type TransitionDirection = 'ff' | 'rew';

export function VCRTransition({ 
  duration = 1200, 
  onComplete 
}: VCRTransitionProps) {
  const [active, setActive] = useState(false);
  const [direction, setDirection] = useState<TransitionDirection>('ff');
  const [timecode, setTimecode] = useState(0);
  
  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      const { href } = e.detail;
      // Determine direction based on navigation
      setDirection(shouldRewind(href) ? 'rew' : 'ff');
      setActive(true);
      playTransitionSound(direction);
    };
    
    window.addEventListener('vcr-navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('vcr-navigate', handleNavigate as EventListener);
  }, []);
  
  useEffect(() => {
    if (!active) return;
    
    // Animate timecode
    const startTime = direction === 'ff' ? 0 : duration;
    const endTime = direction === 'ff' ? duration : 0;
    const startRealTime = Date.now();
    
    const animateTimecode = () => {
      const elapsed = Date.now() - startRealTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentTime = startTime + (endTime - startTime) * progress;
      setTimecode(Math.floor(currentTime));
      
      if (progress < 1) {
        requestAnimationFrame(animateTimecode);
      } else {
        // Transition complete
        setTimeout(() => {
          setActive(false);
          onComplete();
        }, 100);
      }
    };
    
    requestAnimationFrame(animateTimecode);
  }, [active, direction, duration, onComplete]);
  
  if (!active) return null;
  
  const formatTimecode = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const frames = Math.floor((ms % 1000) / 33.33); // ~30fps
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };
  
  return (
    <div className={`vcr-transition active ${direction}`}>
      <div className="vcr-speed-lines" />
      <div className="vcr-frame-flash" />
      <div className="vcr-scanline-tear" />
      <div className="vcr-static" />
      
      <div className="vcr-timecode">
        {formatTimecode(timecode).split(':').map((segment, i, arr) => (
          <span key={i}>
            {segment}
            {i < arr.length - 1 && <span className="separator">:</span>}
          </span>
        ))}
      </div>
      
      {/* Glimpse frames (optional) */}
      <GlimpseFrames direction={direction} />
    </div>
  );
}

// Determine if navigation should "rewind" (going back in structure)
function shouldRewind(href: string): boolean {
  // Logic based on URL structure
  // e.g., going from /docs/api/methods to /docs/getting-started = rewind
  return false; // placeholder
}
```

### 4.4 Audio for Transitions

```typescript
function playTransitionSound(direction: 'ff' | 'rew') {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const duration = 1.2;
  
  // Tape motor hum (continuous)
  const motorNoise = createNoiseBuffer(ctx, duration);
  const motorSource = ctx.createBufferSource();
  const motorFilter = ctx.createBiquadFilter();
  const motorGain = ctx.createGain();
  
  motorFilter.type = 'lowpass';
  motorFilter.frequency.value = 200;
  
  motorGain.gain.setValueAtTime(0, now);
  motorGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
  motorGain.gain.setValueAtTime(0.1, now + duration - 0.2);
  motorGain.gain.linearRampToValueAtTime(0, now + duration);
  
  motorSource.buffer = motorNoise;
  motorSource.connect(motorFilter);
  motorFilter.connect(motorGain);
  motorGain.connect(ctx.destination);
  motorSource.start(now);
  
  // Speed whine (pitched oscillation)
  const whine = ctx.createOscillator();
  const whineGain = ctx.createGain();
  const whineLFO = ctx.createOscillator();
  const whineLFOGain = ctx.createGain();
  
  whine.type = 'sawtooth';
  whine.frequency.value = direction === 'ff' ? 800 : 1200;
  
  whineLFO.frequency.value = direction === 'ff' ? 5 : 8;
  whineLFOGain.gain.value = 100;
  
  whineGain.gain.setValueAtTime(0, now);
  whineGain.gain.linearRampToValueAtTime(0.03, now + 0.1);
  whineGain.gain.setValueAtTime(0.03, now + duration - 0.2);
  whineGain.gain.linearRampToValueAtTime(0, now + duration);
  
  whineLFO.connect(whineLFOGain);
  whineLFOGain.connect(whine.frequency);
  whine.connect(whineGain);
  whineGain.connect(ctx.destination);
  
  whine.start(now);
  whineLFO.start(now);
  whine.stop(now + duration);
  whineLFO.stop(now + duration);
  
  // Tape squeal (rewind only)
  if (direction === 'rew') {
    const squeal = ctx.createOscillator();
    const squealGain = ctx.createGain();
    
    squeal.type = 'sine';
    squeal.frequency.value = 3000;
    
    squealGain.gain.setValueAtTime(0, now + 0.2);
    squealGain.gain.linearRampToValueAtTime(0.02, now + 0.3);
    squealGain.gain.setValueAtTime(0.02, now + duration - 0.3);
    squealGain.gain.linearRampToValueAtTime(0, now + duration);
    
    squeal.connect(squealGain);
    squealGain.connect(ctx.destination);
    squeal.start(now);
    squeal.stop(now + duration);
  }
  
  // Click at end (tape stops)
  setTimeout(() => {
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.value = 100;
    clickGain.gain.setValueAtTime(0.2, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start();
    click.stop(ctx.currentTime + 0.05);
  }, duration * 1000);
}
```

---

## 5. DIEGETIC INTEGRATION

### 5.1 The Lightgun in the Scene

**Concept:** First-person perspective -- the lightgun is the player's "hand"

**Visual Elements:**

1. **Gun Model** -- Visible at bottom of screen when "lowered"
2. **Muzzle Flash** -- 3D light burst when firing
3. **Gun Reflection** -- Visible in CRT glass
4. **Recoil Animation** -- Gun kicks back on shot

**3D Gun Model (simplified):**

```tsx
// LightgunModel.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function LightgunModel({ isAiming, isFiring }: { 
  isAiming: boolean; 
  isFiring: boolean;
}) {
  const gunRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!gunRef.current) return;
    
    // Gun sway when idle
    if (!isAiming) {
      gunRef.current.rotation.z = Math.sin(Date.now() * 0.001) * 0.02;
    }
    
    // Recoil on fire
    if (isFiring) {
      gunRef.current.position.z = -0.1;
      setTimeout(() => {
        if (gunRef.current) {
          gunRef.current.position.z = 0;
        }
      }, 50);
    }
  });
  
  return (
    <group ref={gunRef} position={[0.3, -0.4, -0.5]} rotation={[0, 0, 0.1]}>
      {/* Gun body */}
      <mesh>
        <boxGeometry args={[0.08, 0.15, 0.3]} />
        <meshStandardMaterial color="#FF6600" roughness={0.6} />
      </mesh>
      
      {/* Barrel */}
      <mesh position={[0, 0.05, 0.2]}>
        <cylinderGeometry args={[0.02, 0.025, 0.2, 8]} rotation={[Math.PI/2, 0, 0]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Trigger guard */}
      <mesh position={[0, -0.08, -0.05]}>
        <torusGeometry args={[0.03, 0.008, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Muzzle flash (when firing) */}
      {isFiring && (
        <pointLight 
          position={[0, 0.05, 0.4]} 
          color="#FFFF00" 
          intensity={5} 
          distance={2} 
        />
      )}
    </group>
  );
}
```

### 5.2 The VCR as Scene Object

The VCR should be visible in the 3D room -- either as a model under the TV or as a standalone unit:

```tsx
// VCRModel.tsx
export function VCRModel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* VCR body */}
      <mesh>
        <boxGeometry args={[0.4, 0.1, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      
      {/* Tape slot */}
      <mesh position={[0, 0.02, 0.13]}>
        <boxGeometry args={[0.15, 0.02, 0.01]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      
      {/* LED indicators */}
      <mesh position={[-0.15, 0.02, 0.13]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial 
          color="#00FF00" 
          emissive="#00FF00" 
          emissiveIntensity={0.5} 
        />
      </mesh>
      
      {/* VCR display (could show timecode) */}
      <mesh position={[0.1, 0.02, 0.13]}>
        <planeGeometry args={[0.08, 0.03]} />
        <meshStandardMaterial 
          color="#000033" 
          emissive="#00FFFF" 
          emissiveIntensity={0.3} 
        />
      </mesh>
    </group>
  );
}
```

### 5.3 CRT TV as the "Screen"

The documentation screen should feel like it's being displayed on a physical CRT TV:

```tsx
// CRTTVModel.tsx
export function CRTTVModel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* TV cabinet */}
      <mesh>
        <boxGeometry args={[0.6, 0.5, 0.45]} />
        <meshStandardMaterial color="#3D2817" roughness={0.9} />
      </mesh>
      
      {/* CRT bezel */}
      <mesh position={[0, 0.05, 0.23]}>
        <boxGeometry args={[0.5, 0.38, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
      </mesh>
      
      {/* Screen (curved) */}
      <mesh position={[0, 0.05, 0.25]}>
        <sphereGeometry args={[0.8, 32, 32, 0, Math.PI * 0.3, 0, Math.PI * 0.25]} />
        <meshStandardMaterial 
          color="#000000"
          emissive="#001100"
          emissiveIntensity={0.1}
        />
      </mesh>
      
      {/* Screen glow */}
      <rectAreaLight
        position={[0, 0.05, 0.3]}
        width={0.4}
        height={0.3}
        intensity={0.5}
        color="#33FF33"
      />
      
      {/* Controls */}
      <mesh position={[0.2, -0.18, 0.23]}>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 16]} rotation={[Math.PI/2, 0, 0]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}
```

---

## 6. HORROR INTEGRATION

### 6.1 Unusual Behaviors

The lightgun/VCR system can glitch in unsettling ways:

#### The Misfire

Sometimes when you shoot, nothing happens -- or something unexpected happens:

```typescript
const MISFIRE_CHANCE = 0.02; // 2% chance

function handleFire(x: number, y: number, target: HTMLElement | null) {
  if (Math.random() < MISFIRE_CHANCE) {
    triggerMisfire();
    return;
  }
  // Normal firing logic...
}

function triggerMisfire() {
  const misfireTypes = [
    'blank',        // Click, no bang
    'delayed',      // Shot fires 1-2 seconds later
    'wrong-place',  // Shot appears somewhere else on screen
    'double',       // Two shots fire in quick succession
    'static',       // Screen fills with static, then clears
  ];
  
  const type = misfireTypes[Math.floor(Math.random() * misfireTypes.length)];
  
  switch (type) {
    case 'blank':
      playClickSound(); // Just a click, no bang
      break;
    case 'delayed':
      playClickSound();
      setTimeout(() => {
        playFireSound(true);
        createMuzzleFlash();
      }, 1500 + Math.random() * 1000);
      break;
    case 'wrong-place':
      playFireSound(true);
      createHitParticles(Math.random() * window.innerWidth, Math.random() * window.innerHeight);
      break;
    // ... more cases
  }
}
```

#### The Rejected Input

Sometimes the VCR "rejects" your shot:

```css
.vcr-rejected {
  animation: vcr-reject 0.5s ease-out;
}

@keyframes vcr-reject {
  0%, 100% { transform: translateY(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateY(-5px); }
  20%, 40%, 60%, 80% { transform: translateY(0); }
}

.vcr-rejected::after {
  content: 'REJECTED';
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--vcr-font);
  font-size: 16px;
  color: #FF0000;
  animation: reject-text 1s ease-out forwards;
}

@keyframes reject-text {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}
```

### 6.2 Shooting Non-Targets

What happens when you shoot something that's NOT a link?

```typescript
function handleNonTargetShot(x: number, y: number) {
  // 1. Dust puff (normal miss)
  createDustPuff(x, y);
  
  // 2. But sometimes... something responds
  if (Math.random() < 0.05) {
    // The screen "bruises" where you shot
    createScreenBruise(x, y);
    
    // Or text on screen reacts
    if (Math.random() < 0.3) {
      corruptNearbyText(x, y);
    }
    
    // Or a whisper plays
    if (Math.random() < 0.2) {
      playWhisperSound();
    }
  }
}

function createScreenBruise(x: number, y: number) {
  const bruise = document.createElement('div');
  bruise.className = 'screen-bruise';
  bruise.style.left = `${x}px`;
  bruise.style.top = `${y}px`;
  document.body.appendChild(bruise);
  
  // Bruise fades over time
  setTimeout(() => bruise.remove(), 10000);
}
```

```css
.screen-bruise {
  position: fixed;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  
  background: radial-gradient(
    circle,
    rgba(100, 50, 50, 0.5) 0%,
    rgba(50, 0, 0, 0.3) 50%,
    transparent 70%
  );
  
  animation: bruise-appear 0.3s ease-out forwards, bruise-fade 10s ease-out forwards;
}

@keyframes bruise-appear {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

@keyframes bruise-fade {
  0%, 80% { opacity: 1; }
  100% { opacity: 0; }
}
```

### 6.3 The Entity Responds to Shots

In the horror sequence, shooting at the entity should have consequences:

```typescript
function handleEntityShot() {
  // The entity doesn't like being shot at
  
  // 1. Screen distort
  applyScreenDistortion(1.0); // Intensity 1.0
  
  // 2. Gun jams for a moment
  jamGun(2000);
  
  // 3. Audio feedback
  playEntityRetaliationSound();
  
  // 4. Visual glitch
  corruptAllText(500);
  
  // 5. Maybe it moves closer?
  if (Math.random() < 0.3) {
    moveEntityCloser();
  }
}
```

### 6.4 VCR "Memories"

The VCR sometimes shows glimpses of "previous" recordings:

```typescript
function triggerVCRMemory() {
  // Flash a brief image of something else
  const memoryOverlay = document.createElement('div');
  memoryOverlay.className = 'vcr-memory';
  
  // Could be:
  // - A frame from a "previous recording"
  // - A distorted version of the current page
  // - Something... else
  
  document.body.appendChild(memoryOverlay);
  setTimeout(() => memoryOverlay.remove(), 150);
}
```

---

## 7. ACCESSIBILITY CONSIDERATIONS

### 7.1 Keyboard Controls

The lightgun system must be fully operable via keyboard:

| Key | Action |
|-----|--------|
| `Tab` | Move cursor to next target |
| `Shift+Tab` | Move cursor to previous target |
| `Enter` / `Space` | Fire at current target |
| `Arrow keys` | Move cursor in 2D space |
| `Escape` | Cancel current action / Return to idle |

```typescript
class KeyboardLightgun {
  private targets: HTMLElement[] = [];
  private currentIndex: number = -1;
  private cursorPos: { x: number; y: number };
  
  constructor() {
    this.cursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.bindKeyboardEvents();
    this.updateTargets();
  }
  
  private bindKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          this.cycleTarget(e.shiftKey ? -1 : 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.fire();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.moveCursor(0, -20);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.moveCursor(0, 20);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.moveCursor(-20, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.moveCursor(20, 0);
          break;
      }
    });
  }
  
  private cycleTarget(direction: number) {
    this.targets = Array.from(document.querySelectorAll('.shootable, [data-shootable]'));
    if (this.targets.length === 0) return;
    
    this.currentIndex = (this.currentIndex + direction + this.targets.length) % this.targets.length;
    const target = this.targets[this.currentIndex];
    const rect = target.getBoundingClientRect();
    
    this.cursorPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    this.updateCursorPosition();
    target.focus();
    
    // Play navigation beep
    playNavigationBeep();
  }
  
  private moveCursor(dx: number, dy: number) {
    this.cursorPos.x = Math.max(0, Math.min(window.innerWidth, this.cursorPos.x + dx));
    this.cursorPos.y = Math.max(0, Math.min(window.innerHeight, this.cursorPos.y + dy));
    this.updateCursorPosition();
  }
  
  private fire() {
    const target = this.getTargetAt(this.cursorPos.x, this.cursorPos.y);
    const hit = target !== null;
    
    // Trigger visual/audio feedback
    this.setMode(hit ? 'firing' : 'miss');
    
    if (hit && target) {
      this.triggerHit(target);
    } else {
      this.triggerMiss();
    }
  }
}
```

### 7.2 Screen Reader Announcements

```tsx
// Accessible target component
export function AccessibleShootable({ children, href, label }: ShootableProps) {
  return (
    <a
      href={href}
      className="shootable"
      data-shootable
      role="link"
      aria-label={label || `Navigate to ${href}`}
      tabIndex={0}
    >
      <span className="sr-only">Target: </span>
      {children}
    </a>
  );
}
```

### 7.3 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable cursor animations */
  #lightgun-cursor.idle,
  #lightgun-cursor.targeting {
    animation: none;
  }
  
  /* Simplify hit effects */
  .shootable.hit {
    animation: none;
    background: var(--vcr-bg-selected);
  }
  
  /* Disable VCR transition animations */
  .vcr-speed-lines,
  .vcr-static,
  .vcr-scanline-tear {
    display: none;
  }
  
  /* Instant transitions */
  .vcr-transition {
    transition-duration: 0ms !important;
  }
}
```

### 7.4 High Contrast Mode

```css
@media (prefers-contrast: high) {
  :root {
    --vcr-bg-primary: rgba(0, 0, 0, 0.95);
    --vcr-border: #FFFFFF;
    --vcr-text: #FFFFFF;
    --cursor-idle: #FFFF00;
    --cursor-targeting: #00FF00;
  }
  
  .shootable {
    border-width: 4px;
    background-image: none;
  }
  
  #lightgun-cursor {
    filter: none;
  }
}
```

### 7.5 Alternative Mode: Traditional Navigation

For users who cannot use the lightgun interface:

```tsx
function useAccessibilityMode() {
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  
  useEffect(() => {
    // Check for accessibility preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasTouchscreen = 'ontouchstart' in window;
    
    // Auto-enable for touch devices or reduced motion preference
    if (prefersReducedMotion || hasTouchscreen) {
      setAccessibilityMode(true);
    }
  }, []);
  
  return accessibilityMode;
}

// In the main app
{accessibilityMode ? (
  <TraditionalNavigation />
) : (
  <LightgunNavigation />
)}
```

---

## 8. IMPLEMENTATION CHECKLIST

### Phase 1: Core Cursor System
- [ ] Create lightgun cursor SVG component
- [ ] Implement cursor state management (idle/targeting/firing/miss)
- [ ] Add cursor CSS animations
- [ ] Implement mouse tracking
- [ ] Add click-to-fire handling

### Phase 2: Target System
- [ ] Create shootable target CSS styles
- [ ] Build Shootable React component
- [ ] Implement hit detection
- [ ] Add hit/miss particle effects
- [ ] Create dust puff on miss

### Phase 3: Audio Integration
- [ ] Implement Web Audio API wrapper
- [ ] Create hit sound (bass + discharge + beep)
- [ ] Create miss sound (thud + glass ring)
- [ ] Implement VCR transition audio
- [ ] Add optional audio cues

### Phase 4: VCR Transitions
- [ ] Build VCRTransition component
- [ ] Implement speed lines animation
- [ ] Add scanline distortion
- [ ] Create timecode overlay
- [ ] Add static burst effects
- [ ] Implement FF/REW direction detection

### Phase 5: Diegetic Elements
- [ ] Create 3D lightgun model
- [ ] Add gun to first-person camera
- [ ] Implement muzzle flash effect
- [ ] Create VCR model for scene
- [ ] Create CRT TV model

### Phase 6: Horror Integration
- [ ] Implement misfire behavior
- [ ] Add VCR rejection animation
- [ ] Create screen bruise effect
- [ ] Add entity response to shots
- [ ] Implement VCR memory flashes

### Phase 7: Accessibility
- [ ] Implement keyboard navigation
- [ ] Add screen reader support
- [ ] Support prefers-reduced-motion
- [ ] Support high contrast mode
- [ ] Add alternative navigation mode toggle

---

## 9. COLOR PALETTE REFERENCE

```
LIGHTGUN CURSOR PALETTE:
├── #33FF33  ████████  Idle green (CRT phosphor)
├── #00FFFF  ████████  Targeting cyan
├── #FFFF00  ████████  Firing yellow flash
└── #666666  ████████  Disabled gray

VCR MENU PALETTE:
├── rgba(0, 0, 40, 0.85)   Primary background
├── rgba(0, 80, 120, 0.85) Selected background
├── #00BFFF  ████████  Border blue
├── #00FFFF  ████████  Text cyan
└── #FFFFFF  ████████  Highlight white

HIT EFFECT PALETTE:
├── #FF6600  ████████  Flash orange
├── #FFAA00  ████████  Particle gold
├── #FFFF00  ████████  Particle yellow
└── #FFFFFF  ████████  Particle white

MISS EFFECT PALETTE:
├── #B4A08C  ████████  Dust tan
└── rgba(180, 160, 140, 0.8)  Dust gradient

HORROR PALETTE:
├── #643232  ████████  Bruise red
├── #FF0000  ████████  Rejected red
└── #320000  ████████  Deep blood
```

---

## 10. FILE STRUCTURE

```
src/
├── components/
│   ├── lightgun/
│   │   ├── LightgunCursor.tsx      # Cursor component
│   │   ├── LightgunModel.tsx       # 3D gun model
│   │   ├── Shootable.tsx           # Target component
│   │   └── VCRTransition.tsx       # FF/REW transition
│   ├── scene/
│   │   ├── VCRModel.tsx            # VCR 3D model
│   │   └── CRTTVModel.tsx          # TV 3D model
│   └── effects/
│       ├── HitParticles.tsx        # Particle system
│       ├── DustPuff.tsx            # Miss effect
│       └── ScreenBruise.tsx        # Horror effect
├── hooks/
│   ├── useLightgun.ts              # Lightgun state hook
│   └── useAccessibilityMode.ts     # A11y detection
├── utils/
│   ├── audio/
│   │   ├── lightgunAudio.ts        # Gun sounds
│   │   ├── vcrAudio.ts             # VCR sounds
│   │   └── audioContext.ts         # Web Audio wrapper
│   └── lightgun/
│       ├── cursorController.ts     # Cursor logic
│       ├── hitDetection.ts         # Hit/miss detection
│       └── accessibility.ts        # Keyboard navigation
└── styles/
    ├── lightgun-cursor.css         # Cursor styles
    ├── shootable-targets.css       # Target styles
    └── vcr-transitions.css         # Transition styles
```

---

*End of Lightgun Interaction System Specification. This document serves as the complete blueprint for implementing the VCR + Lightgun documentation navigation system.*
