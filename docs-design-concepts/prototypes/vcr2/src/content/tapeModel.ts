import { createLogger } from '@/debug/logger';
import type { TapeManifestEntry } from './index';
import type { ParsedPage } from './mdxParser';

const logger = createLogger('TapeModel');

export interface TapePage {
  id: string;
  title: string;
  section: string;
  order: number;
  tapePosition: number;
  duration: number;
  parsed?: ParsedPage;
}

export interface TapeModel {
  pages: TapePage[];
  totalDuration: number;
  pageCount: number;
}

const PAGE_DURATION = 150;

export function buildTapeModel(manifest: TapeManifestEntry[]): TapeModel {
  const pages: TapePage[] = manifest.map((entry, index) => ({
    id: entry.id,
    title: entry.title,
    section: entry.section,
    order: entry.order,
    tapePosition: index * PAGE_DURATION,
    duration: PAGE_DURATION,
  }));

  const totalDuration = pages.length * PAGE_DURATION;

  logger.info(`Built tape model: ${pages.length} pages, ${totalDuration}s total`);

  return {
    pages,
    totalDuration,
    pageCount: pages.length,
  };
}

export function getPageAtPosition(model: TapeModel, position: number): TapePage | null {
  if (position < 0 || position >= model.totalDuration) {
    return null;
  }

  const index = Math.floor(position / PAGE_DURATION);
  return model.pages[index] ?? null;
}

export function getPageById(model: TapeModel, pageId: string): TapePage | null {
  return model.pages.find((page) => page.id === pageId) ?? null;
}

export function getAdjacentPages(
  model: TapeModel,
  pageId: string
): { prev: string | null; next: string | null } {
  const index = model.pages.findIndex((page) => page.id === pageId);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? (model.pages[index - 1]?.id ?? null) : null,
    next: index < model.pages.length - 1 ? (model.pages[index + 1]?.id ?? null) : null,
  };
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const f = Math.floor((safe % 1) * 30);

  return [h, m, s, f].map((v) => v.toString().padStart(2, '0')).join(':');
}

export function parseTimecode(timecode: string): number {
  const parts = timecode.split(':').map(Number);
  if (parts.length !== 4) {
    return 0;
  }

  const [h, m, s, f] = parts;
  return h * 3600 + m * 60 + s + f / 30;
}

export function getPagePosition(model: TapeModel, pageId: string): number {
  const page = getPageById(model, pageId);
  return page?.tapePosition ?? 0;
}
