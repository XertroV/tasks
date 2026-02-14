import '@react-three/fiber';

declare module '@react-three/fiber' {
  interface ThreeElements {
    wallpaperMaterial: JSX.IntrinsicElements['meshStandardMaterial'] & {
      uTime?: number;
      uDecay?: number;
      uFlicker?: number;
    };
    carpetMaterial: JSX.IntrinsicElements['meshStandardMaterial'] & {
      uTime?: number;
      uWear?: number;
    };
    breathingWallMaterial: JSX.IntrinsicElements['meshStandardMaterial'] & {
      uTime?: number;
      uDecay?: number;
    };
  }
}
