import { create } from 'zustand';
import type { TapeManifestEntry } from '@/content/index';
import { buildTapeModel, formatTimecode, getAdjacentPages, getPageAtPosition, type TapeModel, type TapePage } from '@/content/tapeModel';
import { fetchMdxContent, preloadPages } from '@/content/contentLoader';
import { parseMdx, type ParsedPage } from '@/content/mdxParser';
import { createLogger } from '@/debug/logger';

const logger = createLogger('ContentStore');

interface ContentState {
  manifest: TapeManifestEntry[];
  tapeModel: TapeModel | null;
  loadedPages: Map<string, ParsedPage>;
  currentPage: ParsedPage | null;
  currentPageId: string | null;
  isLoading: boolean;
  loadError: string | null;
  preloadProgress: { loaded: number; total: number };
}

interface ContentActions {
  loadManifest: (entries: TapeManifestEntry[]) => void;
  loadPage: (pageId: string) => Promise<ParsedPage | null>;
  getPageByTapePosition: (position: number) => TapePage | null;
  getCurrentPage: () => ParsedPage | null;
  getAdjacentPageIds: () => { prev: string | null; next: string | null };
  preloadAllPages: () => Promise<void>;
  clearError: () => void;
}

type ContentStore = ContentState & ContentActions;

export const useContentStore = create<ContentStore>((set, get) => ({
  manifest: [],
  tapeModel: null,
  loadedPages: new Map(),
  currentPage: null,
  currentPageId: null,
  isLoading: false,
  loadError: null,
  preloadProgress: { loaded: 0, total: 0 },

  loadManifest: (entries: TapeManifestEntry[]) => {
    const tapeModel = buildTapeModel(entries);
    set({
      manifest: entries,
      tapeModel,
      loadedPages: new Map(),
      currentPage: null,
      currentPageId: null,
      loadError: null,
    });
    logger.info(`Loaded manifest with ${entries.length} entries`);
  },

  loadPage: async (pageId: string): Promise<ParsedPage | null> => {
    const state = get();

    const cached = state.loadedPages.get(pageId);
    if (cached) {
      set({ currentPage: cached, currentPageId: pageId, loadError: null });
      logger.debug(`Cache hit for page ${pageId}`);
      return cached;
    }

    const entry = state.manifest.find((e) => e.id === pageId);
    if (!entry) {
      const error = `Page not found: ${pageId}`;
      logger.error(error);
      set({ loadError: error });
      return null;
    }

    set({ isLoading: true, loadError: null });

    try {
      const rawContent = await fetchMdxContent(entry);
      const parsed = parseMdx(rawContent, entry, state.manifest);

      const newLoadedPages = new Map(state.loadedPages);
      newLoadedPages.set(pageId, parsed);

      set({
        loadedPages: newLoadedPages,
        currentPage: parsed,
        currentPageId: pageId,
        isLoading: false,
      });

      logger.info(`Loaded page ${pageId}`);
      return parsed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to load page ${pageId}:`, errorMessage);
      set({ isLoading: false, loadError: errorMessage });
      return null;
    }
  },

  getPageByTapePosition: (position: number): TapePage | null => {
    const { tapeModel } = get();
    if (!tapeModel) return null;
    return getPageAtPosition(tapeModel, position);
  },

  getCurrentPage: (): ParsedPage | null => {
    return get().currentPage;
  },

  getAdjacentPageIds: (): { prev: string | null; next: string | null } => {
    const { tapeModel, currentPageId } = get();
    if (!tapeModel || !currentPageId) {
      return { prev: null, next: null };
    }
    return getAdjacentPages(tapeModel, currentPageId);
  },

  preloadAllPages: async (): Promise<void> => {
    const state = get();
    if (state.manifest.length === 0) {
      logger.warn('Cannot preload: no manifest loaded');
      return;
    }

    set({ isLoading: true, preloadProgress: { loaded: 0, total: state.manifest.length } });

    const rawContents = await preloadPages(state.manifest, (loaded, total) => {
      set({ preloadProgress: { loaded, total } });
    });

    const newLoadedPages = new Map(state.loadedPages);

    for (const entry of state.manifest) {
      const raw = rawContents.get(entry.id);
      if (raw) {
        const parsed = parseMdx(raw, entry, state.manifest);
        newLoadedPages.set(entry.id, parsed);
      }
    }

    set({
      loadedPages: newLoadedPages,
      isLoading: false,
      preloadProgress: { loaded: state.manifest.length, total: state.manifest.length },
    });

    logger.info(`Preloaded ${newLoadedPages.size} pages`);
  },

  clearError: () => {
    set({ loadError: null });
  },
}));

export const contentStore = useContentStore;
export { formatTimecode };
