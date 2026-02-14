uniform float uTime;
uniform float uBreathIntensity;

varying vec2 vUv;

void main() {
  vUv = uv;

  vec3 displaced = position;
  float wave = sin((position.x * 2.5) + (uTime * 0.9)) * 0.0025;
  float ripple = sin((position.y * 7.0) + (uTime * 1.8)) * 0.0015;
  displaced += normal * (wave + ripple) * uBreathIntensity;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
