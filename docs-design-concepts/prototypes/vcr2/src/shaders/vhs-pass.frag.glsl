precision highp float;

uniform float uTime;
uniform float uTrackingError;
uniform float uHeadSwitchHeight;
uniform float uHeadSwitchNoise;
uniform float uChromaBleed;
uniform float uDropoutRate;
uniform float uStaticNoise;
uniform float uPauseJitter;
uniform float uFFSpeed;
uniform float uREWSpeed;
uniform float uHorrorIntensity;
uniform float uGlitchSeed;
uniform vec2 uResolution;

uniform sampler2D tDiffuse;

varying vec2 vUv;

#include noise.glsl

float random(float seed) {
  return fract(sin(seed * 12.9898) * 43758.5453);
}

float randomVec2(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

void applyTrackingError(inout vec2 uv, inout float verticalShift) {
  if (uTrackingError <= 0.0) return;

  float trackingWave = sin(uv.y * 80.0 + uTime * 2.0) * uTrackingError * 0.02;
  float trackingNoise = noise(vec2(uv.y * 50.0, uTime * 5.0)) * uTrackingError * 0.015;
  uv.x += trackingWave + trackingNoise;

  verticalShift += noise(vec2(uTime * 3.0, 0.0)) * uTrackingError * 0.03;
}

void applyHeadSwitchNoise(inout vec4 color, vec2 uv, float verticalShift) {
  if (uHeadSwitchNoise <= 0.0) return;

  float headPosition = mod(uv.y + verticalShift, uHeadSwitchHeight);
  float headEdge = smoothstep(0.0, 0.02, headPosition) * smoothstep(uHeadSwitchHeight, uHeadSwitchHeight - 0.02, headPosition);
  float edgeNoise = noise(vec2(uv.x * 100.0, uTime * 20.0)) * (1.0 - headEdge);

  color.rgb += edgeNoise * uHeadSwitchNoise * 0.3;
}

void applyChromaBleed(inout vec4 color, vec2 uv) {
  if (uChromaBleed <= 0.0) return;

  float bleedOffset = uChromaBleed * 0.01;
  vec4 leftColor = texture2D(tDiffuse, vec2(uv.x - bleedOffset, uv.y));
  vec4 rightColor = texture2D(tDiffuse, vec2(uv.x + bleedOffset, uv.y));

  color.r = mix(color.r, (leftColor.r + rightColor.r) * 0.5, uChromaBleed * 0.5);
  color.b = mix(color.b, (leftColor.b + rightColor.b) * 0.5, uChromaBleed * 0.3);
}

void applyDropout(inout vec4 color, vec2 uv) {
  if (uDropoutRate <= 0.0) return;

  float dropoutNoise = noise(vec2(uv.y * 500.0, uTime * 10.0));
  if (dropoutNoise > 1.0 - uDropoutRate * 0.1) {
    float dropoutStrength = randomVec2(uv + uTime) * uDropoutRate;
    color.rgb *= 1.0 - dropoutStrength * 0.8;
  }
}

void applyStaticNoise(inout vec4 color, vec2 uv) {
  if (uStaticNoise <= 0.0) return;

  float staticValue = noise(vec3(uv * 200.0, uTime * 30.0));
  staticValue = step(1.0 - uStaticNoise * 0.3, staticValue);

  vec3 staticColor = vec3(randomVec2(uv + uTime));
  color.rgb = mix(color.rgb, staticColor, staticValue * uStaticNoise);
}

void applyPauseJitter(inout vec2 uv) {
  if (uPauseJitter <= 0.0) return;

  float jitterX = noise(vec2(uTime * 50.0, 0.0)) * uPauseJitter * 0.02;
  float jitterY = noise(vec2(0.0, uTime * 30.0)) * uPauseJitter * 0.005;
  uv.x += jitterX;
  uv.y += jitterY;
}

void applyFFREWEffect(inout vec4 color, vec2 uv) {
  if (uFFSpeed <= 0.0 && uREWSpeed <= 0.0) return;

  float speed = max(uFFSpeed, uREWSpeed);
  int lines = int(speed * 20.0) + 1;

  for (int i = 1; i <= 5; i++) {
    if (i > lines) break;

    float offset = float(i) * 0.015;
    if (uFFSpeed > 0.0) {
      vec4 offsetColor = texture2D(tDiffuse, vec2(uv.x, uv.y - offset));
      color.rgb = mix(color.rgb, offsetColor.rgb, 0.15 * speed);
    }
    if (uREWSpeed > 0.0) {
      vec4 offsetColor = texture2D(tDiffuse, vec2(uv.x, uv.y + offset));
      color.rgb = mix(color.rgb, offsetColor.rgb, 0.15 * speed);
    }
  }
}

void applyHorrorEffects(inout vec4 color, vec2 uv) {
  if (uHorrorIntensity <= 0.0) return;

  float horrorNoise = noise(vec3(uv * 50.0, uTime * 2.0));
  color.rgb = mix(color.rgb, color.rgb * 0.7, horrorNoise * uHorrorIntensity * 0.3);

  float flicker = 1.0 - uHorrorIntensity * 0.2 * sin(uTime * 15.0);
  color.rgb *= flicker;

  if (uHorrorIntensity > 0.5) {
    float glitchLine = step(0.98, noise(vec2(uv.y * 100.0, uTime * 5.0)));
    color.rgb += vec3(glitchLine * uHorrorIntensity * 0.3);
  }
}

void main() {
  vec2 uv = vUv;

  float verticalShift = 0.0;

  applyTrackingError(uv, verticalShift);
  applyPauseJitter(uv);

  uv.y = mod(uv.y + verticalShift, 1.0);
  uv.x = clamp(uv.x, 0.0, 1.0);

  vec4 color = texture2D(tDiffuse, uv);

  applyHeadSwitchNoise(color, uv, verticalShift);
  applyChromaBleed(color, uv);
  applyDropout(color, uv);
  applyStaticNoise(color, uv);
  applyFFREWEffect(color, uv);
  applyHorrorEffects(color, uv);

  gl_FragColor = color;
}
