// Wallpaper shader - yellowed institutional wallpaper with striping, seams,
// and top/bottom-biased decay.

uniform float uTime;
uniform float uDecay; // 0.0 = fresh, 1.0 = heavily decayed
uniform vec3 uBaseColor;
uniform float uStripScale;
uniform float uSeamWidth;
uniform float uStainStrength;
uniform float uFlicker;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  vec3 color = uBaseColor;

  // Vertical strip paper pattern with subtle irregularity.
  float stripJitter = (fbm(vec2(uv.x * 4.0, uv.y * 6.0)) - 0.5) * 0.12;
  float stripPhase = fract(uv.x * uStripScale + stripJitter);
  float stripBand = 0.5 + 0.5 * sin((uv.x * uStripScale + stripJitter) * 6.2831853);
  color *= mix(0.93, 1.04, stripBand);

  // Printed wallpaper motifs and fibers.
  float printPattern = fbm(vec2(uv.x * 14.0, uv.y * 10.0 + stripBand * 0.5));
  float paperFiber = noise(vec2(uv.x * 180.0, uv.y * 120.0));
  color *= mix(0.95, 1.02, printPattern);
  color += (paperFiber - 0.5) * 0.03;

  // Seams between strips.
  float seamDist = min(stripPhase, 1.0 - stripPhase);
  float seamMask = 1.0 - smoothstep(0.0, uSeamWidth, seamDist);
  color *= mix(1.0, 0.74, seamMask);

  // Decay: yellowing plus irregular grime, strongest near top and bottom.
  vec3 decayTint = vec3(0.82, 0.74, 0.54);
  float broadGrime = fbm(vec2(uv.x * 3.5, uv.y * 5.0 + uTime * 0.01));
  float topBias = smoothstep(0.72, 1.0, uv.y);
  float bottomBias = 1.0 - smoothstep(0.0, 0.3, uv.y);
  float edgeBias = clamp(topBias + bottomBias, 0.0, 1.0);
  float stainNoise = fbm(vec2(uv.x * 10.0 + 5.0, uv.y * 8.0 - uTime * 0.015));
  float stainMask = smoothstep(0.5, 0.9, stainNoise + edgeBias * 0.45);
  float decayMix = uDecay * (0.55 + broadGrime * 0.45);

  color = mix(color, decayTint, decayMix * 0.5);
  color = mix(color, vec3(0.55, 0.48, 0.34), stainMask * uDecay * uStainStrength);

  float phosphorFlicker = 1.0 + (sin(uTime * 35.0) * 0.015 * uFlicker);
  color *= phosphorFlicker;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
