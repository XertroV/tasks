export interface TapeManifestEntry {
  id: string;
  title: string;
  section: string;
  order: number;
  file: string;
}

export { vitePluginTapeManifest } from './vite-plugin-tape-manifest';
export {
  parseMdx,
  parseAllMdx,
  type ParsedPage,
  type ParsedSection,
  type ParsedLine,
  type LineType,
} from './mdxParser';
export {
  buildTapeModel,
  formatTimecode,
  parseTimecode,
  getPageAtPosition,
  getPageById,
  getAdjacentPages,
  getPagePosition,
  type TapeModel,
  type TapePage,
} from './tapeModel';
export { fetchMdxContent, preloadPages, ContentLoadError } from './contentLoader';
