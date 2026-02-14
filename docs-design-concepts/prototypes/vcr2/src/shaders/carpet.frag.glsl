// Carpet shader - institutional carpet, muted brown-gray
// Procedural texture with subtle wear patterns

uniform float uWear; // 0.0 = new, 1.0 = worn
uniform vec3 uColor;
uniform float uLoopScale;
uniform float uTrackStrength;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  vec3 color = uColor;

  // Loop-pile structure: directional rows plus random fiber breakups.
  float loopRows = 0.5 + 0.5 * sin((uv.y + uv.x * 0.08) * uLoopScale * 6.2831853);
  float loopNoise = noise(vec2(uv.x * 260.0, uv.y * 240.0));
  float pile = mix(0.78, 1.06, loopRows * 0.65 + loopNoise * 0.35);
  color *= pile;

  // Broad variation from tufting batches.
  float batch = fbm(vec2(uv.x * 5.5, uv.y * 5.0));
  color *= mix(0.92, 1.04, batch);

  // Worn traffic zones: desaturated + flattened fibers.
  float trafficBand = exp(-pow((uv.x - 0.5) * 2.5, 2.0));
  float wearNoise = fbm(vec2(uv.x * 3.0 + 11.0, uv.y * 4.0 - 7.0));
  float wearMask = smoothstep(0.35, 0.9, trafficBand * uTrackStrength + wearNoise * 0.65);
  float wearAmount = wearMask * uWear;

  vec3 wornColor = mix(color, vec3(dot(color, vec3(0.333))), 0.3);
  wornColor *= 1.06;
  color = mix(color, wornColor, wearAmount * 0.6);

  float crushedPile = smoothstep(0.45, 0.9, loopNoise) * wearAmount;
  color *= 1.0 - crushedPile * 0.12;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
