import path from 'node:path';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { vitePluginTapeManifest } from './src/content/vite-plugin-tape-manifest';

const isAnalyze = process.env.ANALYZE === 'true';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      vitePluginTapeManifest('./content/docs'),
      isAnalyze && visualizer({ open: true, gzipSize: true }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        ...(isProduction && {
          leva: path.resolve(__dirname, './src/debug/leva-stub.ts'),
        }),
      },
    },
    server: {
      port: 5173,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three/')) return 'three';
            if (id.includes('node_modules/@react-three/')) return 'react-three';
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'))
              return 'react';
          },
        },
      },
    },
  };
});
