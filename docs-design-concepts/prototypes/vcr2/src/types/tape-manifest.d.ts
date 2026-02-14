declare module 'virtual:tape-manifest' {
  interface TapeManifestEntry {
    id: string;
    title: string;
    section: string;
    order: number;
    file: string;
  }

  const manifest: TapeManifestEntry[];
  export default manifest;
  export { manifest };
}
