// Ceiling tile shader - acoustic ceiling tiles with grid pattern
// White-gray speckled surface with dark grid lines

uniform vec3 uTileColor;
uniform vec3 uGridColor;
uniform float uTileScale;
uniform float uGridWidth;
uniform float uTileAging;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  vec2 tileUv = uv * uTileScale;
  vec2 localUv = fract(tileUv);
  vec2 tileId = floor(tileUv);

  // Recessed grid between tiles.
  float edgeX = min(localUv.x, 1.0 - localUv.x);
  float edgeY = min(localUv.y, 1.0 - localUv.y);
  float edgeDist = min(edgeX, edgeY);
  float gridMask = 1.0 - smoothstep(uGridWidth, uGridWidth + 0.01, edgeDist);

  vec3 color = uTileColor;

  // Tile-to-tile manufacturing variation.
  float tileVariation = noise(vec2(tileId.x * 0.77, tileId.y * 0.91));
  color *= mix(0.95, 1.03, tileVariation);

  // Surface grain and pin-speckle.
  float speckle = noise(vec2(uv.x * 260.0, uv.y * 260.0));
  float microPit = step(0.86, noise(vec2(uv.x * 620.0 + 9.0, uv.y * 620.0 - 4.0)));
  color *= mix(0.94, 1.04, speckle);
  color *= 1.0 - microPit * 0.04;

  // Slight center sag in each tile.
  vec2 toCenter = localUv - 0.5;
  float centerDist = dot(toCenter, toCenter);
  float sag = smoothstep(0.0, 0.2, centerDist);
  color *= mix(1.02, 0.96, sag);

  // Aging stains.
  float stain = fbm(vec2(uv.x * 4.0 + 3.0, uv.y * 5.0 - 2.0));
  float stainMask = smoothstep(0.62, 0.9, stain);
  color = mix(color, vec3(0.72, 0.69, 0.61), stainMask * uTileAging * 0.25);

  color = mix(color, uGridColor, gridMask);
  color *= mix(1.0, 0.68, gridMask);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
