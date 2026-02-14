# VCR/VHS Effect System -- Research & Implementation Guide

**Version:** 1.0  
**Created:** 2026-02-14  
**Purpose:** Reference guide for transforming Terminal Horror prototype from CRT terminal to VCR-based experience  

---

## Overview

The Terminal Horror prototype will shift from a CRT terminal aesthetic to a **VCR + VHS** experience. The user (protagonist) views the interface through a VCR monitor, with a lightgun for interaction. Key concepts:

- **VHS "Loading Code"**: Early Amiga games used VHS-style glitch effects during tape loading sequences
- **VCR Pause Effect**: Iconic static/tracking noise when pausing a VHS tape
- **Fast-Forward/Rewind**: Visual distortion during tape seeking
- **Lightgun Interaction**: The protagonist "shoots" links to navigate

---

## Part 1: VHS Visual Artifacts -- Technical Breakdown

### 1.1 Head Switching Noise

**Description:**
The horizontal noise band at the bottom of the frame caused by the video head switching between tracks. This is a fundamental artifact of helical scan VTR technology.

**Visual Characteristics:**
- Appears as a ~10-15% horizontal band at the bottom of the frame
- Contains scrambled lines, color distortion, and static
- Height varies slightly frame-to-frame
- More pronounced on older/damaged tapes

**Implementation:**

```css
.head-switching {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 12%; /* Bottom portion of frame */
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(255, 255, 255, 0.1) 30%,
    transparent 100%
  );
  pointer-events: none;
}

.head-switching::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 1px,
    rgba(255, 255, 255, 0.15) 1px,
    rgba(255, 255, 255, 0.15) 2px
  );
  animation: head-switch-scroll 0.1s steps(3) infinite;
}

@keyframes head-switch-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(3px); }
}
```

**GLSL Shader:**

```glsl
// Head switching noise (bottom 12% of frame)
float headSwitching(vec2 uv, float time) {
  float headZone = step(0.88, uv.y);
  float noise = snoise(vec2(uv.x * 50.0, time * 100.0)) * 0.5 + 0.5;
  float scramble = sin(uv.y * 200.0 + time * 50.0) * 0.5;
  return headZone * (noise * 0.6 + scramble * 0.4);
}

// In fragment shader:
float hs = headSwitching(vUv, uTime);
color = mix(color, vec3(noise), hs * 0.7);
```

---

### 1.2 Tracking Errors

**Description:**
Vertical rolling, horizontal skewing, and line displacement when the VCR's tracking doesn't align with the tape's helical scan pattern.

**Visual Characteristics:**
- **Vertical Roll**: Image scrolls up/down rapidly
- **Horizontal Skew**: Lines shift left/right progressively down the frame
- **Line Jitter**: Individual scan lines wobble horizontally
- **Color Band Shift**: RGB channels misalign vertically

**CSS Implementation:**

```css
.tracking-error {
  animation: tracking-roll 0.15s linear infinite;
}

@keyframes tracking-roll {
  0% { transform: translateY(0) skewX(0deg); }
  25% { transform: translateY(-2px) skewX(0.5deg); }
  50% { transform: translateY(-4px) skewX(-0.3deg); }
  75% { transform: translateY(-2px) skewX(0.2deg); }
  100% { transform: translateY(0) skewX(0deg); }
}

/* Horizontal line displacement */
.tracking-lines {
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  animation: line-jitter 0.05s steps(2) infinite;
}

@keyframes line-jitter {
  0% { background-position: 0 0; }
  50% { background-position: 1px 0; }
  100% { background-position: -1px 0; }
}
```

**GLSL Shader:**

```glsl
// Tracking error displacement
vec2 trackingDistort(vec2 uv, float time, float intensity) {
  // Vertical roll
  float roll = sin(time * 20.0) * intensity * 0.02;
  uv.y += roll;
  
  // Horizontal skew (progressive down frame)
  float skew = sin(uv.y * 30.0 + time * 10.0) * intensity * 0.01;
  uv.x += skew * uv.y;
  
  // Line jitter
  float jitter = sin(uv.y * 500.0 + time * 100.0) * intensity * 0.002;
  uv.x += jitter;
  
  return uv;
}

// Usage in fragment shader:
vec2 distortedUV = trackingDistort(vUv, uTime, uTrackingIntensity);
vec3 color = texture2D(uTexture, distortedUV).rgb;
```

---

### 1.3 Chroma Bleed / Color Smear

**Description:**
Horizontal color smearing caused by limited VHS chroma bandwidth (~0.5 MHz vs ~3 MHz for luma). Colors "bleed" horizontally, especially saturated reds and blues.

**Visual Characteristics:**
- Horizontal blur on saturated colors
- Red/orange colors bleed most noticeably
- Creates a "smeared paint" look on text and edges
- More visible on high-contrast edges

**CSS Implementation:**

```css
.chroma-bleed {
  filter: url(#chroma-bleed);
  text-shadow: 
    0 0 0 #33ff33,
    3px 0 0 rgba(255, 0, 0, 0.3),   /* Red channel offset right */
    -3px 0 0 rgba(0, 255, 255, 0.3); /* Cyan channel offset left */
}

/* SVG filter for chromatic aberration with blur */
.chroma-bleed-svg {
  filter: url(#vhs-chroma);
}
```

**SVG Filter:**

```xml
<svg style="position: absolute; width: 0; height: 0;">
  <defs>
    <filter id="vhs-chroma" x="-20%" y="-20%" width="140%" height="140%">
      <!-- Red channel blur + offset -->
      <feGaussianBlur in="SourceGraphic" stdDeviation="2 0" result="blur"/>
      <feOffset in="blur" dx="3" dy="0" result="red"/>
      
      <!-- Cyan channel offset -->
      <feOffset in="SourceGraphic" dx="-3" dy="0" result="cyan"/>
      
      <!-- Composite layers -->
      <feBlend mode="screen" in="red" in2="cyan" result="blend"/>
      <feBlend mode="screen" in="blend" in2="SourceGraphic"/>
    </filter>
  </defs>
</svg>
```

**GLSL Shader:**

```glsl
// Chroma subsampling simulation (4:1:1 like VHS)
vec3 chromaBleed(sampler2D tex, vec2 uv, float intensity) {
  float offset = intensity * 0.008;
  
  // Sample with horizontal offset for chroma channels
  vec3 colorL = texture2D(tex, uv - vec2(offset, 0.0)).rgb;
  vec3 colorC = texture2D(tex, uv).rgb;
  vec3 colorR = texture2D(tex, uv + vec2(offset, 0.0)).rgb;
  
  // VHS-like chroma subsampling (more bleed on red)
  float redBleed = (colorL.r + colorC.r + colorR.r) / 3.0;
  float greenBleed = (colorL.g * 0.3 + colorC.g + colorR.g * 0.3) / 1.6;
  float blueBleed = (colorL.b * 0.2 + colorC.b + colorR.b * 0.2) / 1.4;
  
  return vec3(redBleed, greenBleed, blueBleed);
}
```

---

### 1.4 Dropout / Tape Damage

**Description:**
White horizontal lines caused by physical tape damage, dust, or oxide shedding. The VCR's dropout compensator replaces missing video with the previous line.

**Visual Characteristics:**
- Thin white or bright horizontal lines
- Random position and length
- Often appear in clusters
- Can be partial width (not full screen)

**CSS Implementation:**

```css
.dropout {
  position: relative;
}

.dropout::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.8);
  animation: dropout 4s steps(1) infinite;
  top: var(--dropout-y, 30%);
}

@keyframes dropout {
  0%, 95% { opacity: 0; }
  96%, 98% { opacity: 1; }
  99%, 100% { opacity: 0; }
}
```

**JavaScript for Dynamic Dropouts:**

```typescript
class DropoutEffect {
  private element: HTMLElement;
  private dropouts: HTMLElement[] = [];
  private maxDropouts = 5;

  constructor(container: HTMLElement) {
    this.element = container;
    this.startEffect();
  }

  private createDropout() {
    const dropout = document.createElement('div');
    dropout.style.cssText = `
      position: absolute;
      left: ${Math.random() * 30}%;
      right: ${Math.random() * 30}%;
      height: ${1 + Math.random() * 2}px;
      background: rgba(255, 255, 255, ${0.5 + Math.random() * 0.5});
      top: ${Math.random() * 100}%;
      pointer-events: none;
    `;
    this.element.appendChild(dropout);
    
    // Remove after brief appearance
    setTimeout(() => dropout.remove(), 50 + Math.random() * 100);
  }

  private startEffect() {
    setInterval(() => {
      if (Math.random() > 0.92) {
        this.createDropout();
      }
    }, 100);
  }
}
```

**GLSL Shader:**

```glsl
// Dropout simulation
float dropout(vec2 uv, float time) {
  // Create horizontal lines at random Y positions
  float line = step(0.998, fract(sin(floor(time * 20.0) * 12.9898) * 43758.5453));
  float yPos = fract(sin(floor(time * 15.0) * 78.233) * 43758.5453);
  
  // Check if current pixel is on a dropout line
  float onLine = 1.0 - smoothstep(0.0, 0.003, abs(uv.y - yPos));
  
  // Random width
  float width = fract(sin(floor(time * 10.0) * 45.164) * 43758.5453) * 0.6 + 0.2;
  float inWidth = step(0.5 - width/2.0, uv.x) * step(uv.x, 0.5 + width/2.0);
  
  return line * onLine * inWidth;
}
```

---

### 1.5 Static Noise / RF Interference

**Description:**
Grainy noise overlay from RF interference, poor signal quality, and tape hiss in the analog signal path.

**Visual Characteristics:**
- Fine grain overlay across entire frame
- Slight color tinting in noise
- Intensity varies with "signal quality"
- More visible in darker areas

**CSS Implementation:**

```css
.static-noise {
  position: relative;
}

.static-noise::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.08;
  mix-blend-mode: overlay;
  pointer-events: none;
  animation: noise-shift 0.2s steps(5) infinite;
}

@keyframes noise-shift {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-1px, 1px); }
  40% { transform: translate(1px, -1px); }
  60% { transform: translate(-1px, -1px); }
  80% { transform: translate(1px, 1px); }
  100% { transform: translate(0, 0); }
}
```

**GLSL Shader:**

```glsl
// High-quality noise function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Static noise overlay
vec3 staticNoise(vec3 color, vec2 uv, float time, float intensity) {
  float n = noise(uv * 500.0 + time * 100.0);
  n = (n - 0.5) * 2.0 * intensity;
  
  // Slight color variation in noise
  vec3 noiseColor = vec3(
    n * 1.0,
    n * 0.95,
    n * 1.05
  );
  
  return color + noiseColor;
}
```

---

### 1.6 VHS Pause Frame (The "Jittery Still")

**Description:**
When pausing VHS, the VCR displays a single field repeatedly, creating a distinctive jitter effect as the two interlaced fields alternate.

**Visual Characteristics:**
- Rapid vertical oscillation (1-2 pixel bounce)
- Some lines appear "frozen" while others blur
- Color smearing increases
- Slight horizontal tearing
- The "iconic VCR pause" aesthetic

**CSS Implementation:**

```css
.vhs-pause {
  animation: pause-jitter 0.04s steps(2) infinite;
}

@keyframes pause-jitter {
  0% { transform: translateY(0); }
  50% { transform: translateY(1px); }
  100% { transform: translateY(0); }
}

/* Interlace simulation during pause */
.vhs-pause-interlace {
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 1px,
    rgba(0, 0, 0, 0.15) 1px,
    rgba(0, 0, 0, 0.15) 2px
  );
  animation: interlace-shift 0.04s steps(2) infinite alternate;
}

@keyframes interlace-shift {
  0% { background-position: 0 0; }
  100% { background-position: 0 1px; }
}
```

**JavaScript for Controlled Pause Effect:**

```typescript
class VHSPauseEffect {
  private element: HTMLElement;
  private isActive = false;
  private jitterIntensity = 1;
  private frameCount = 0;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  pause() {
    this.isActive = true;
    this.animate();
  }

  resume() {
    this.isActive = false;
    this.element.style.transform = '';
  }

  private animate = () => {
    if (!this.isActive) return;
    
    this.frameCount++;
    
    // Interlaced field alternation
    const field = this.frameCount % 2;
    const jitter = field === 0 ? 0 : this.jitterIntensity;
    
    // Additional random micro-jitter
    const microJitter = (Math.random() - 0.5) * 0.5;
    
    this.element.style.transform = `translateY(${jitter + microJitter}px)`;
    
    requestAnimationFrame(this.animate);
  };
}
```

**GLSL Shader:**

```glsl
// VHS Pause simulation
vec2 vhsPause(vec2 uv, float time, float paused) {
  if (paused < 0.5) return uv;
  
  // Interlaced field alternation
  float field = step(0.5, fract(time * 30.0)); // 30Hz field rate
  
  // Vertical displacement for interlace
  float yOffset = field * 0.002;
  
  // Random micro-jitter
  float jitter = (hash(vec2(floor(time * 60.0), 0.0)) - 0.5) * 0.001;
  
  uv.y += yOffset + jitter;
  
  return uv;
}
```

---

## Part 2: Amiga "Code Loading" Effects

### 2.1 Historical Context

Early Amiga demos and games (1985-1995) pioneered real-time visual effects that mimicked VHS loading sequences:

**Key Techniques:**
- **Copper Bars**: Horizontal color gradients controlled by the Amiga's copper coprocessor
- **Raster Effects**: Mid-frame palette changes for gradient skies
- **Bitplane Manipulation**: Hardware sprite and layer tricks
- **Trackmo Loading**: Visual sequences during disk/tape loading

**Aesthetic Elements:**
- Scrolling assembly code or hex dumps
- Raster bars in neon colors
- Bouncing sinus text (scrollers)
- Starfields and plasma effects
- Progressive "loading" progress bars

### 2.2 Loading Code Visual

**Description:**
Display scrolling hex code, assembly mnemonics, or binary data that "loads" before displaying content. Creates the illusion of code being streamed from tape.

**CSS Implementation:**

```css
.loading-code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: #33ff33;
  white-space: pre;
  line-height: 1.2;
  text-shadow: 0 0 5px #33ff33;
  animation: code-scroll 10s linear infinite;
}

@keyframes code-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
```

**TypeScript for Dynamic Code Generation:**

```typescript
class CodeLoader {
  private element: HTMLElement;
  private lines: string[] = [];
  private hexChars = '0123456789ABCDEF';
  private mnemonics = ['MOV', 'JMP', 'CMP', 'ADD', 'SUB', 'LDX', 'STX', 'NOP', 'RTS', 'JSR'];
  
  constructor(element: HTMLElement) {
    this.element = element;
    this.generateCode();
  }

  private generateHex(): string {
    let hex = '';
    for (let i = 0; i < 32; i++) {
      hex += this.hexChars[Math.floor(Math.random() * 16)];
      if (i % 2 === 1) hex += ' ';
    }
    return hex;
  }

  private generateInstruction(): string {
    const mnemonic = this.mnemonics[Math.floor(Math.random() * this.mnemonics.length)];
    const reg = Math.floor(Math.random() * 8);
    const addr = '$' + Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0');
    return `${mnemonic.padEnd(4)} R${reg}, ${addr}`;
  }

  private generateCode() {
    const codeLines: string[] = [];
    
    for (let i = 0; i < 100; i++) {
      const type = Math.random();
      if (type < 0.3) {
        // Memory address + hex dump
        const addr = '$' + (0x1000 + i * 16).toString(16).toUpperCase();
        codeLines.push(`${addr}: ${this.generateHex()}`);
      } else if (type < 0.6) {
        // Assembly instruction
        codeLines.push(`        ${this.generateInstruction()}`);
      } else {
        // Binary representation
        let binary = '';
        for (let j = 0; j < 8; j++) {
          binary += Math.random() > 0.5 ? '1' : '0';
        }
        codeLines.push(`        %${binary}`);
      }
    }
    
    this.element.textContent = codeLines.join('\n');
  }
}
```

### 2.3 Raster Bars Effect

**Description:**
Horizontal gradient bars that scroll or pulse, reminiscent of Amiga copper effects.

**CSS Implementation:**

```css
.raster-bars {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 20px,
    linear-gradient(90deg, 
      #ff0000 0%, #ff7700 25%, #ffff00 50%, #00ff00 75%, #00ffff 100%
    ) 20px,
    transparent 40px
  );
  background-size: 100% 40px;
  animation: raster-scroll 2s linear infinite;
  opacity: 0.3;
  mix-blend-mode: screen;
}

@keyframes raster-scroll {
  0% { background-position: 0 0; }
  100% { background-position: 0 40px; }
}
```

**GLSL Shader:**

```glsl
// Raster bars (copper effect)
vec3 rasterBars(vec2 uv, float time) {
  float y = uv.y + time * 0.2;
  float bar = sin(y * 20.0) * 0.5 + 0.5;
  
  // Rainbow gradient
  vec3 color = vec3(
    sin(y * 6.28 + 0.0) * 0.5 + 0.5,
    sin(y * 6.28 + 2.09) * 0.5 + 0.5,
    sin(y * 6.28 + 4.18) * 0.5 + 0.5
  );
  
  // Add horizontal gradient for "bar" effect
  float hGradient = sin(uv.x * 3.14159) * 0.3 + 0.7;
  
  return color * bar * hGradient;
}
```

### 2.4 Sinus Text Scroller

**Description:**
Text that scrolls horizontally while oscillating vertically in a sine wave pattern - a staple of Amiga demos.

**CSS Implementation:**

```css
.sinus-scroller {
  white-space: nowrap;
  animation: sinus-scroll 15s linear infinite;
}

.sinus-scroller span {
  display: inline-block;
  animation: sinus-wave 1s ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}

@keyframes sinus-scroll {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

@keyframes sinus-wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
```

**JavaScript for Character-by-Character Wave:**

```typescript
function createSinusScroller(text: string, container: HTMLElement) {
  const chars = text.split('');
  
  chars.forEach((char, i) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.setProperty('--delay', `${i * 0.05}s`);
    container.appendChild(span);
  });
}

// Usage:
createSinusScroller('LOADING SYSTEM CODE... PLEASE WAIT...', document.querySelector('.scroller')!);
```

---

## Part 3: VCR Playback Effects

### 3.1 Fast-Forward Visual

**Description:**
When fast-forwarding, the VCR plays tape faster, creating rapid scrolling with visible scan lines and increased noise.

**Visual Characteristics:**
- Rapid upward vertical scroll
- Horizontal tearing
- Increased noise and tracking errors
- Occasional frame holds
- Audio pitch shift (high-pitched)

**CSS Implementation:**

```css
.fast-forward {
  animation: ff-scroll 0.3s linear infinite;
  filter: brightness(1.1) contrast(1.1);
}

@keyframes ff-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-20px); }
}

/* Tearing effect */
.fast-forward::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 10px,
    rgba(0, 0, 0, 0.3) 10px,
    rgba(0, 0, 0, 0.3) 12px
  );
  animation: tear-shift 0.05s steps(2) infinite;
  pointer-events: none;
}

@keyframes tear-shift {
  0% { transform: translateX(0); }
  100% { transform: translateX(3px); }
}
```

**GLSL Shader:**

```glsl
// Fast-forward effect
vec2 fastForward(vec2 uv, float time, float speed) {
  // Rapid vertical scroll
  uv.y = mod(uv.y + time * speed, 1.0);
  
  // Horizontal tearing
  float tear = step(0.98, fract(sin(floor(uv.y * 50.0) * 12.9898) * 43758.5453));
  uv.x += tear * (hash(vec2(floor(time * 100.0), uv.y)) - 0.5) * 0.1;
  
  return uv;
}
```

### 3.2 Rewind Visual

**Description:**
Similar to fast-forward but in reverse, with more instability as tape moves backward over heads.

**Visual Characteristics:**
- Rapid downward vertical scroll
- More pronounced tracking errors
- Color inversion flashes
- Horizontal streaks

**CSS Implementation:**

```css
.rewind {
  animation: rewind-scroll 0.25s linear infinite;
  filter: brightness(0.9) saturate(1.2);
}

@keyframes rewind-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(20px); }
}

/* Color flash during rewind */
.rewind::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.1);
  animation: color-flash 0.1s steps(2) infinite;
  pointer-events: none;
}

@keyframes color-flash {
  0%, 50% { opacity: 0; }
  75% { opacity: 1; filter: hue-rotate(180deg); }
  100% { opacity: 0; }
}
```

### 3.3 Play Mode

**Description:**
Normal playback with subtle, constant artifacts.

**Visual Characteristics:**
- Minor tracking drift
- Occasional dropout
- Subtle noise
- Normal scan lines

### 3.4 Eject Animation

**Description:**
Tape eject sequence with power-down effects.

**Visual Characteristics:**
- Screen collapse (vertical)
- Color fade to white/gray
- Static burst
- Power-off sound

**CSS Animation:**

```css
.eject {
  animation: eject-sequence 2s forwards;
}

@keyframes eject-sequence {
  0% { 
    transform: scaleY(1);
    filter: brightness(1);
  }
  30% { 
    transform: scaleY(0.1);
    filter: brightness(2);
  }
  50% {
    transform: scaleY(0.05) scaleX(1);
    filter: brightness(3) blur(2px);
  }
  70% {
    transform: scaleY(0.05) scaleX(0.5);
    filter: brightness(2);
  }
  100% {
    transform: scaleY(0) scaleX(0);
    filter: brightness(0);
    opacity: 0;
  }
}
```

---

## Part 4: Complete VHS Effect Shader

**Full Post-Processing Shader (GLSL):**

```glsl
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uPaused;
uniform float uFastForward;
uniform float uRewind;
uniform float uTrackingIntensity;
uniform float uNoiseIntensity;
uniform vec2 uResolution;

varying vec2 vUv;

// Noise functions
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// Head switching noise
float headSwitching(vec2 uv, float time) {
  float zone = step(0.88, uv.y);
  float n = noise(vec2(uv.x * 100.0, time * 200.0 + uv.y * 50.0));
  return zone * n * 0.8;
}

// Tracking distortion
vec2 trackingDistort(vec2 uv, float time, float intensity) {
  float roll = sin(time * 15.0) * intensity * 0.015;
  uv.y += roll;
  
  float skew = sin(uv.y * 40.0 + time * 8.0) * intensity * 0.008;
  uv.x += skew;
  
  float jitter = noise(vec2(uv.y * 300.0, time * 80.0)) * intensity * 0.003;
  uv.x += jitter - 0.0015;
  
  return uv;
}

// Chroma subsampling
vec3 chromaSubsample(sampler2D tex, vec2 uv, float intensity) {
  float offset = intensity * 0.006;
  vec3 color = vec3(0.0);
  
  color.r = texture2D(tex, uv + vec2(offset, 0.0)).r;
  color.g = texture2D(tex, uv).g;
  color.b = texture2D(tex, uv - vec2(offset, 0.0)).b;
  
  return color;
}

// Dropout
float dropout(vec2 uv, float time) {
  float lineY = fract(sin(floor(time * 8.0) * 127.1) * 43758.5453);
  float onLine = 1.0 - smoothstep(0.0, 0.004, abs(uv.y - lineY));
  float active = step(0.85, hash(vec2(floor(time * 15.0), 0.0)));
  return onLine * active;
}

// Pause jitter
vec2 pauseJitter(vec2 uv, float time, float paused) {
  if (paused < 0.5) return uv;
  
  float field = step(0.5, fract(time * 30.0));
  float jitter = field * 0.002;
  jitter += (hash(vec2(floor(time * 60.0), 0.0)) - 0.5) * 0.001;
  
  uv.y = mod(uv.y + jitter, 1.0);
  return uv;
}

// Fast-forward/rewind
vec2 playbackDistort(vec2 uv, float time, float ff, float rew) {
  float speed = ff - rew;
  
  if (abs(speed) > 0.01) {
    uv.y = mod(uv.y - time * speed * 0.5, 1.0);
    
    float tear = step(0.95, hash(vec2(floor(uv.y * 30.0), floor(time * 50.0))));
    uv.x += tear * (hash(vec2(time, uv.y)) - 0.5) * 0.08;
  }
  
  return uv;
}

void main() {
  vec2 uv = vUv;
  
  // Apply effects in order
  uv = trackingDistort(uv, uTime, uTrackingIntensity);
  uv = pauseJitter(uv, uTime, uPaused);
  uv = playbackDistort(uv, uTime, uFastForward, uRewind);
  
  // Sample with chroma subsampling
  vec3 color = chromaSubsample(tDiffuse, uv, 1.0);
  
  // Add artifacts
  color += headSwitching(vUv, uTime);
  color = mix(color, vec3(1.0), dropout(vUv, uTime));
  
  // Static noise
  float n = noise(vUv * 300.0 + uTime * 100.0);
  color += (n - 0.5) * uNoiseIntensity * 0.15;
  
  // Scanlines
  float scanline = sin(vUv.y * uResolution.y * 3.14159) * 0.04;
  color -= scanline;
  
  // Vignette
  float vignette = 1.0 - length(vUv - 0.5) * 0.5;
  color *= vignette;
  
  // Head switching noise at bottom
  float hs = headSwitching(vUv, uTime);
  color = mix(color, vec3(hash(vUv * 100.0 + uTime)), hs * 0.7);
  
  gl_FragColor = vec4(color, 1.0);
}
```

---

## Part 5: Audio Synthesis

### 5.1 VCR Mechanical Sounds

**Tape Loading:**

```typescript
function createTapeLoadingSound(ctx: AudioContext): AudioBufferSourceNode {
  const duration = 3.0;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    
    // Mechanical whirring (filtered noise)
    const noise = (Math.random() * 2 - 1);
    const whir = Math.sin(t * 200) * 0.3;
    
    // Periodic clicking (tape mechanism)
    const click = Math.sin(t * 8) > 0.9 ? Math.random() * 0.5 : 0;
    
    // Wow/flutter (speed variation)
    const wow = 1 + Math.sin(t * 0.5) * 0.02;
    
    data[i] = (noise * 0.15 + whir + click) * wow;
  }
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}
```

**Fast-Forward/Rewind:**

```typescript
function createFFRWSound(ctx: AudioContext, isForward: boolean): AudioBufferSourceNode {
  const duration = 1.0;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    
    // High-pitched whine
    const pitch = isForward ? 800 : 600;
    const whine = Math.sin(t * pitch * Math.PI * 2) * 0.2;
    
    // Mechanical stress
    const stress = (Math.random() * 2 - 1) * 0.1;
    
    // Speed variation
    const speed = 1 + Math.sin(t * 10) * 0.05;
    
    data[i] = (whine + stress) * speed;
  }
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = 2.0; // Double speed
  return source;
}
```

### 5.2 VHS Audio Artifacts

**Wow and Flutter:**

```typescript
// Apply wow/flutter to existing audio
function applyWowFlutter(ctx: AudioContext, source: AudioNode, intensity: number): AudioNode {
  // Use a delay node with modulated delay time
  const delay = ctx.createDelay(0.1);
  delay.delayTime.value = 0.01;
  
  // LFO for wow (slow) and flutter (fast)
  const wowLFO = ctx.createOscillator();
  wowLFO.frequency.value = 0.5; // 0.5 Hz wow
  const wowGain = ctx.createGain();
  wowGain.gain.value = intensity * 0.01;
  
  const flutterLFO = ctx.createOscillator();
  flutterLFO.frequency.value = 6; // 6 Hz flutter
  const flutterGain = ctx.createGain();
  flutterGain.gain.value = intensity * 0.002;
  
  wowLFO.connect(wowGain);
  flutterLFO.connect(flutterGain);
  wowGain.connect(delay.delayTime);
  flutterGain.connect(delay.delayTime);
  
  wowLFO.start();
  flutterLFO.start();
  
  source.connect(delay);
  return delay;
}
```

**Tape Hiss:**

```typescript
function createTapeHiss(ctx: AudioContext): AudioBufferSourceNode {
  const duration = 10.0;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < data.length; i++) {
    // Pink noise approximation (more natural than white)
    let pink = 0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    const white = Math.random() * 2 - 1;
    
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    
    pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    pink *= 0.11;
    
    data[i] = pink * 0.08;
  }
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}
```

### 5.3 UI Feedback Sounds

**Selection "Beep":**

```typescript
function playSelectionBeep(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'square';
  osc.frequency.value = 1200;
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialDecayTo?.(0.001, ctx.currentTime + 0.08);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}
```

**Lightgun "Shot":**

```typescript
function playLightgunShot(ctx: AudioContext) {
  // White noise burst with quick decay
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    const envelope = Math.exp(-t * 30);
    data[i] = (Math.random() * 2 - 1) * envelope;
  }
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1500;
  filter.Q.value = 1;
  
  source.connect(filter);
  filter.connect(ctx.destination);
  source.start();
}
```

---

## Part 6: VCR Effect Stack -- Ordered Application

When applying VHS effects, the order matters significantly. Here's the recommended stack:

### Layer Order (Back to Front):

```
1. SOURCE CONTENT (terminal text, images, video)
   |
2. VERTICAL DISTORTIONS (tracking roll, pause jitter)
   |
3. HORIZONTAL DISTORTIONS (skew, line jitter)
   |
4. CHROMA PROCESSING (subsampling, bleed)
   |
5. SCANLINES (interlaced line pattern)
   |
6. HEAD SWITCHING NOISE (bottom band)
   |
7. DROPOUT (random white lines)
   |
8. STATIC NOISE (grain overlay)
   |
9. VIGNETTE (edge darkening)
   |
10. OVERLAY ELEMENTS (UI, tracking indicator)
```

### Implementation Priority:

| Priority | Effect | Essential? | Performance Impact |
|----------|--------|------------|-------------------|
| 1 | Scanlines | Yes | Low |
| 2 | Static Noise | Yes | Medium |
| 3 | Chroma Bleed | Yes | Medium |
| 4 | Pause Jitter | Yes | Low |
| 5 | Tracking Errors | Recommended | Medium |
| 6 | Head Switching | Recommended | Low |
| 7 | Dropout | Optional | Low |
| 8 | Vignette | Optional | Low |

---

## Part 7: React Component Integration

### Complete VHS Monitor Component:

```tsx
import { useRef, useEffect, useState } from 'react';

interface VHSMonitorProps {
  children: React.ReactNode;
  paused?: boolean;
  fastForward?: boolean;
  rewind?: boolean;
  trackingIntensity?: number;
  noiseIntensity?: number;
}

export function VHSMonitor({
  children,
  paused = false,
  fastForward = false,
  rewind = false,
  trackingIntensity = 0.3,
  noiseIntensity = 0.15,
}: VHSMonitorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [glitchActive, setGlitchActive] = useState(false);
  
  // Random glitch trigger
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 100 + Math.random() * 200);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  const modeClass = fastForward ? 'fast-forward' : rewind ? 'rewind' : paused ? 'vhs-pause' : '';
  
  return (
    <div className="vhs-container" ref={containerRef}>
      {/* CRT Screen housing */}
      <div className="crt-frame">
        {/* Glass reflection */}
        <div className="crt-glass" />
        
        {/* Main content area */}
        <div className={`vhs-screen ${modeClass} ${glitchActive ? 'glitch' : ''}`}>
          {/* Effect layers */}
          <div className="vhs-effects">
            <div className="scanlines" />
            <div className="static-noise" style={{ opacity: noiseIntensity }} />
            <div className="head-switching" />
            <div className="vignette" />
            <div className="chroma-bleed" />
          </div>
          
          {/* Content */}
          <div className="vhs-content">
            {children}
          </div>
        </div>
        
        {/* Tracking indicator */}
        <div className="tracking-indicator">
          <span className="tracking-dot" />
          <span className="tracking-text">TRK</span>
        </div>
      </div>
      
      {/* VCR chassis */}
      <div className="vcr-body">
        <div className="vcr-slot">
          <div className="tape-window">
            <div className="tape-reel left" />
            <div className="tape-reel right" />
          </div>
        </div>
        <div className="vcr-buttons">
          <button className="vcr-btn eject">EJECT</button>
          <button className="vcr-btn rewind">REW</button>
          <button className="vcr-btn play">PLAY</button>
          <button className="vcr-btn ff">FF</button>
        </div>
        <div className="vcr-display">
          <span className="display-text">--:--:--</span>
        </div>
      </div>
    </div>
  );
}
```

### CSS for VHS Monitor:

```css
.vhs-container {
  --vhs-green: #33ff33;
  --vhs-amber: #ffaa00;
  --crt-curve: 20px;
  
  background: #1a1a1a;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 
    inset 0 2px 4px rgba(255,255,255,0.1),
    0 10px 40px rgba(0,0,0,0.5);
}

.crt-frame {
  background: #2a2a2a;
  border-radius: var(--crt-curve);
  padding: 15px;
  position: relative;
}

.vhs-screen {
  position: relative;
  background: #000;
  border-radius: calc(var(--crt-curve) - 10px);
  overflow: hidden;
  aspect-ratio: 4/3;
}

/* Effect layers */
.vhs-effects {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.3) 2px,
    rgba(0, 0, 0, 0.3) 4px
  );
}

.static-noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
  animation: noise-anim 0.2s steps(5) infinite;
}

@keyframes noise-anim {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(2px, -2px); }
  60% { transform: translate(-2px, -2px); }
  80% { transform: translate(2px, 2px); }
  100% { transform: translate(0, 0); }
}

.head-switching {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 10%;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.9),
    rgba(255, 255, 255, 0.05) 50%,
    transparent
  );
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 50%,
    rgba(0, 0, 0, 0.5) 100%
  );
}

.chroma-bleed {
  position: absolute;
  inset: 0;
  mix-blend-mode: screen;
  opacity: 0.3;
  filter: url(#vhs-chroma);
}

/* Pause state */
.vhs-pause .vhs-content {
  animation: pause-jitter 0.04s steps(2) infinite;
}

@keyframes pause-jitter {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(1px); }
}

/* Fast-forward state */
.fast-forward .vhs-content {
  animation: ff-scroll 0.3s linear infinite;
  filter: brightness(1.1);
}

@keyframes ff-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-20px); }
}

/* Rewind state */
.rewind .vhs-content {
  animation: rewind-scroll 0.25s linear infinite;
  filter: brightness(0.9) hue-rotate(10deg);
}

@keyframes rewind-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(20px); }
}

/* Glitch state */
.glitch .vhs-content {
  animation: glitch-severe 0.1s steps(2) infinite;
}

@keyframes glitch-severe {
  0% { transform: translate(0, 0) skewX(0); filter: hue-rotate(0); }
  25% { transform: translate(-3px, 1px) skewX(-1deg); filter: hue-rotate(90deg); }
  50% { transform: translate(2px, -1px) skewX(1deg); filter: hue-rotate(180deg); }
  75% { transform: translate(-1px, -2px) skewX(-0.5deg); filter: hue-rotate(270deg); }
  100% { transform: translate(0, 0) skewX(0); filter: hue-rotate(360deg); }
}

/* Content */
.vhs-content {
  position: relative;
  z-index: 5;
  height: 100%;
  overflow: hidden;
  font-family: 'IBM Plex Mono', monospace;
  color: var(--vhs-green);
  text-shadow: 0 0 10px var(--vhs-green);
}

/* VCR body styling */
.vcr-body {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  padding: 15px;
  background: linear-gradient(to bottom, #2a2a2a, #1a1a1a);
  border-radius: 8px;
}

.vcr-slot {
  width: 200px;
  height: 40px;
  background: #0a0a0a;
  border-radius: 4px;
  overflow: hidden;
}

.vcr-buttons {
  display: flex;
  gap: 8px;
}

.vcr-btn {
  padding: 8px 12px;
  background: #333;
  border: none;
  border-radius: 4px;
  color: #888;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.1s;
}

.vcr-btn:hover {
  background: #444;
  color: #fff;
}

.vcr-btn:active {
  transform: translateY(2px);
}

.vcr-display {
  margin-left: auto;
  background: #0a0a0a;
  padding: 8px 16px;
  border-radius: 4px;
  font-family: 'Share Tech Mono', monospace;
  color: var(--vhs-amber);
  font-size: 14px;
}
```

---

## Part 8: Reference Implementations

### Online Resources:

| Resource | URL | Description |
|----------|-----|-------------|
| Shadertoy VHS | shadertoy.com/results?query=vhs | Multiple VHS shader examples |
| OBS VHS Filter | github.com/exeldro/vhs-filter | Real-time VHS effect plugin |
| RetroArch Shaders | github.com/libretro/glsl-shaders | CRT/VHS shader collection |
| THREE.js Postprocessing | threejs.org/examples/#webgl_postprocessing | WebGL effect framework |

### Key ShaderToy References:

1. **VHS Effect by Flix01**: `view/ldlXzM` - Complete VHS simulation
2. **VCR Pause by dmix**: `view/Ms2SDV` - Pause jitter effect
3. **CRT + VHS by klembot**: `view/XtK3W3` - Combined effects

### Amiga Demo References:

1. **Unreal Superhero 3** (1992) - Raster bars, copper effects
2. **State of the Art** (1992) - Code loading sequences
3. **9 Fingers** (1993) - Advanced copper tricks
4. **The C64 VHS Loading** - Vintage tape loading aesthetic

---

## Part 9: Implementation Checklist

### Phase 1: Core VHS Effects
- [ ] Implement scanline overlay
- [ ] Add static noise layer
- [ ] Create chroma bleed filter
- [ ] Implement pause jitter
- [ ] Add head switching noise

### Phase 2: VCR Controls
- [ ] Fast-forward visual effect
- [ ] Rewind visual effect
- [ ] Play mode (with subtle artifacts)
- [ ] Eject animation
- [ ] VCR UI buttons

### Phase 3: Advanced Effects
- [ ] Tracking error simulation
- [ ] Dropout generation
- [ ] Random glitch triggers
- [ ] Chroma subsampling shader

### Phase 4: Audio
- [ ] Tape loading sound
- [ ] Fast-forward/rewind audio
- [ ] Selection beep
- [ ] Lightgun shot sound
- [ ] Ambient tape hiss

### Phase 5: Integration
- [ ] Replace CRT terminal with VHS monitor
- [ ] Page transitions via FF/REW
- [ ] Lightgun cursor implementation
- [ ] Loading code sequence
- [ ] Horror event adaptation

---

## Conclusion

This document provides a comprehensive reference for implementing VCR/VHS aesthetics in the Terminal Horror prototype. The key to authenticity is:

1. **Layering effects** in the correct order
2. **Subtlety over intensity** - real VHS artifacts are often barely noticeable
3. **Timing matters** - effects should feel organic, not scripted
4. **Audio-visual sync** - visual artifacts should correlate with audio

The VHS aesthetic transforms the prototype from a sterile digital terminal into an analog, tactile experience that feels both nostalgic and unsettling - perfect for a horror experience.

---

*End of VCR Effects Documentation*
