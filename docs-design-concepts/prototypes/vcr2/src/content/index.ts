export interface TapeManifestEntry {
  id: string;
  title: string;
  section: string;
  order: number;
  file: string;
}

export { vitePluginTapeManifest } from './vite-plugin-tape-manifest';
