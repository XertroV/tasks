import type { TapeManifestEntry } from './index';
import { createLogger } from '@/debug/logger';

const logger = createLogger('ContentLoader');

export class ContentLoadError extends Error {
  constructor(
    public readonly pageId: string,
    public readonly statusCode: number | null,
    message: string
  ) {
    super(message);
    this.name = 'ContentLoadError';
  }
}

async function fetchMdxFile(file: string): Promise<string> {
  const url = `/content/docs/${file}`;

  logger.debug(`Fetching MDX: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new ContentLoadError(file, response.status, `Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

export async function fetchMdxContent(entry: TapeManifestEntry): Promise<string> {
  try {
    const content = await fetchMdxFile(entry.file);
    logger.debug(`Loaded ${entry.id}: ${content.length} bytes`);
    return content;
  } catch (error) {
    if (error instanceof ContentLoadError) {
      throw error;
    }
    throw new ContentLoadError(entry.id, null, `Unexpected error loading ${entry.id}: ${error}`);
  }
}

export async function preloadPages(
  manifest: TapeManifestEntry[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, string>> {
  const contents = new Map<string, string>();
  let loaded = 0;

  logger.info(`Preloading ${manifest.length} pages...`);

  for (const entry of manifest) {
    try {
      const content = await fetchMdxContent(entry);
      contents.set(entry.id, content);
      loaded++;
      onProgress?.(loaded, manifest.length);
    } catch (error) {
      logger.error(`Failed to preload ${entry.id}:`, error);
    }
  }

  logger.info(`Preloaded ${loaded}/${manifest.length} pages`);

  return contents;
}
