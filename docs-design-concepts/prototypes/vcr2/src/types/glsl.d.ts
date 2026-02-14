// Type declarations for GLSL shader imports
// Usage: import fragmentShader from './shaders/example.frag.glsl?raw';

declare module '*.glsl?raw' {
  const content: string;
  export default content;
}

declare module '*.frag.glsl?raw' {
  const content: string;
  export default content;
}

declare module '*.vert.glsl?raw' {
  const content: string;
  export default content;
}

declare module '*.glsl' {
  const content: string;
  export default content;
}
