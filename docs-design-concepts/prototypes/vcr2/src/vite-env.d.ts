/// <reference types="vite/client" />

// Extend JSX namespace for React Three Fiber
import { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
