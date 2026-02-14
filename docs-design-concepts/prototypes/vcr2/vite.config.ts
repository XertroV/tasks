import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { vitePluginTapeManifest } from './src/content/vite-plugin-tape-manifest';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), vitePluginTapeManifest('./content/docs')],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
