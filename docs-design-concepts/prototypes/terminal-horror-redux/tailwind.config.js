/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vhs-green': '#33FF33',
        'vhs-amber': '#FFAA00',
        'vcr-cyan': '#00FFFF',
        'vcr-blue': '#00BFFF',
        'crt-black': '#000000',
        'backrooms-beige': '#C4B998',
        'backrooms-shadow': '#8A7D5C',
        'carpet-brown': '#8B7355',
        'entity-red': '#FF0000',
      },
      fontFamily: {
        'vcr': ['VT323', 'IBM Plex Mono', 'monospace'],
        'terminal': ['IBM Plex Mono', 'Share Tech Mono', 'monospace'],
      },
      animation: {
        'scanline': 'scanline 0.1s linear infinite',
        'noise': 'noise 0.2s steps(5) infinite',
        'glitch': 'glitch 0.3s ease-in-out infinite',
        'tracking-roll': 'tracking-roll 0.15s linear infinite',
        'pause-jitter': 'pause-jitter 0.04s steps(2) infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(4px)' },
        },
        noise: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(2px, -2px)' },
          '60%': { transform: 'translate(-2px, -2px)' },
          '80%': { transform: 'translate(2px, 2px)' },
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)', filter: 'hue-rotate(0deg)' },
          '25%': { transform: 'translate(-2px, 1px)', filter: 'hue-rotate(90deg)' },
          '50%': { transform: 'translate(2px, -1px)', filter: 'hue-rotate(180deg)' },
          '75%': { transform: 'translate(-1px, 2px)', filter: 'hue-rotate(270deg)' },
        },
        'tracking-roll': {
          '0%': { transform: 'translateY(0) skewX(0deg)' },
          '25%': { transform: 'translateY(-2px) skewX(0.5deg)' },
          '50%': { transform: 'translateY(-4px) skewX(-0.3deg)' },
          '75%': { transform: 'translateY(-2px) skewX(0.2deg)' },
          '100%': { transform: 'translateY(0) skewX(0deg)' },
        },
        'pause-jitter': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(1px)' },
        },
      },
    },
  },
  plugins: [],
}
