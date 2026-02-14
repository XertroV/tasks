# VCR Horror

A high-fidelity 3D immersive web experience simulating a VCR loading "code" from VHS tapes.

## Tech Stack
- **Runtime**: Bun
- **Framework**: Vite + React + TypeScript
- **3D Engine**: Three.js + React Three Fiber
- **State Management**: Zustand
- **Post-Processing**: @react-three/postprocessing

## Getting Started

1.  Install dependencies:
    ```bash
    bun install
    ```

2.  Run development server:
    ```bash
    bun run dev
    ```

3.  Build for production:
    ```bash
    bun run build
    ```

## Controls
-   **Mouse**: Aim Lightgun
-   **Left Click**: Shoot / Interact with Screen
-   **VCR Logic**: The system plays a simulated tape. Shooting the screen triggers a "seek" (glitch) effect.

## Vision
Inspired by `terminal-horror`, this project focuses on high-quality 3D visuals, CRT emulation, and satisfying analog interaction.
