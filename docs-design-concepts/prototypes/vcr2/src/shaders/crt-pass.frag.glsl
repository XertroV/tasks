precision highp float;

uniform float uCurvature;
uniform float uScanlineIntensity;
uniform float uScanlineCount;
uniform float uPhosphorIntensity;
uniform float uVignetteStrength;
uniform float uFlicker;
uniform float uBrightness;
uniform vec2 uResolution;
uniform float uTime;

uniform sampler2D tDiffuse;

varying vec2 vUv;

vec2 barrelDistortion(vec2 uv, float strength) {
    if (strength <= 0.0) return uv;

    vec2 centered = uv - 0.5;
    float dist = length(centered);
    float distortion = 1.0 + dist * dist * strength;
    
    vec2 distorted = centered * distortion + 0.5;
    return distorted;
}

float scanline(float y, float count, float intensity) {
    if (intensity <= 0.0) return 1.0;

    float scanlinePos = y * count;
    float scanlineValue = sin(scanlinePos * 3.14159) * 0.5 + 0.5;
    return mix(1.0, scanlineValue, intensity);
}

vec3 phosphorGlow(vec3 color, vec2 uv, float intensity) {
    if (intensity <= 0.0) return color;

    vec3 phosphorRGB = vec3(1.0, 0.95, 0.9);
    color *= mix(vec3(1.0), phosphorRGB, intensity);

    float glow = sin(uv.y * 3.14159) * 0.5 + 0.5;
    color += color * glow * intensity * 0.1;
    
    return color;
}

float vignette(vec2 uv, float strength) {
    if (strength <= 0.0) return 1.0;

    vec2 centered = uv - 0.5;
    float dist = length(centered);
    return 1.0 - smoothstep(0.4, 0.9, dist * strength);
}

float flicker(float time, float intensity) {
    if (intensity <= 0.0) return 1.0;

    float noise1 = fract(sin(time * 123.456) * 43758.5453);
    float noise2 = fract(sin(time * 789.012) * 23421.631);
    float flickerNoise = noise1 * 0.5 + noise2 * 0.5;
    return 1.0 - flickerNoise * intensity * 0.15;
}

void main() {
    vec2 uv = vUv;

    uv = barrelDistortion(uv, uCurvature);

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec4 color = texture2D(tDiffuse, uv);

    float scanlineMult = scanline(uv.y, uScanlineCount, uScanlineIntensity);
    color.rgb *= scanlineMult;

    color.rgb = phosphorGlow(color.rgb, uv, uPhosphorIntensity);

    float vignetteMult = vignette(uv, uVignetteStrength);
    color.rgb *= vignetteMult;

    float flickerMult = flicker(uTime, uFlicker);
    color.rgb *= flickerMult;

    color.rgb *= uBrightness;

    gl_FragColor = color;
}
