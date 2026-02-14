export interface TapeManifestEntry {
  id: string;
  title: string;
  section: string;
  order: number;
  file: string;
}

export interface TapePage {
  id: string;
  title: string;
  section: string;
  order: number;
  tapePosition: number;
  duration: number;
  content: string;
  links: TapeLink[];
}

export interface TapeLink {
  label: string;
  targetPageId: string;
  targetPosition: number;
}

export interface TapeModel {
  pages: TapePage[];
  totalDuration: number;
  currentPosition: number;
  currentPageId: string;
}

export interface ParsedPage {
  title: string;
  sections: ParsedSection[];
  links: { label: string; target: string }[];
}

export interface ParsedSection {
  heading?: string;
  lines: ParsedLine[];
}

export interface ParsedLine {
  type: 'text' | 'code' | 'heading' | 'link' | 'list-item' | 'blank';
  content: string;
  indent: number;
  linkTarget?: string;
}

export const SECTION_ORDER = [
  'index',
  'getting-started',
  'agent-usage',
  'operations',
  'workflows',
  'schema-and-data',
  'parity',
  'faq',
] as const;

export type SectionName = (typeof SECTION_ORDER)[number];

export const PAGE_DURATION_SECONDS = 150;
export const TOTAL_PAGES = 48;
export const TOTAL_TAPE_DURATION = PAGE_DURATION_SECONDS * TOTAL_PAGES;
