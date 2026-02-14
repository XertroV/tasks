import { createLogger } from '@/debug/logger';
import { type Tokens, marked } from 'marked';
import type { TapeManifestEntry } from './index';

const logger = createLogger('MdxParser');

export type LineType = 'heading' | 'text' | 'code' | 'link' | 'list-item' | 'blank';

export interface ParsedLine {
  type: LineType;
  content: string;
  indent?: number;
  href?: string;
  pageId?: string;
}

export interface ParsedSection {
  heading?: string;
  level?: number;
  lines: ParsedLine[];
}

export interface ParsedPage {
  id: string;
  title: string;
  sections: ParsedSection[];
  links: string[];
}

const WRAP_WIDTH = 60;

function stripHtmlJsx(text: string): string {
  let result = text;
  result = result.replace(/<[^>]+\/>/g, '');
  result = result.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '');
  result = result.replace(/<[^>]+>/g, '');
  result = result.replace(/\{[^}]*\}/g, '');
  return result.trim();
}

function wrapText(text: string, width: number = WRAP_WIDTH): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= width) {
      currentLine = `${currentLine} ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

function resolveInternalLink(href: string, manifest: TapeManifestEntry[]): string | null {
  if (!href.startsWith('/') && !href.startsWith('./') && !href.startsWith('../')) {
    return null;
  }

  let pageId = href.replace(/^\.\//, '').replace(/^\//, '').replace(/\/$/, '');
  pageId = pageId.replace(/\.(md|mdx)$/, '');

  const found = manifest.find((entry) => entry.id === pageId || entry.file === pageId);
  if (found) {
    return found.id;
  }

  return pageId;
}

function parseCodeBlock(code: string, indent = 0): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const codeLines = code.split('\n');

  for (const line of codeLines) {
    if (line.trim()) {
      lines.push({
        type: 'code',
        content: line,
        indent,
      });
    } else {
      lines.push({ type: 'code', content: '', indent });
    }
  }

  return lines;
}

function parseTable(table: Tokens.Table): ParsedLine[] {
  const lines: ParsedLine[] = [];

  const colWidths = table.header.map((cell: Tokens.TableCell, i: number) => {
    const dataWidths = table.rows.map((row: Tokens.TableCell[]) => row[i]?.text?.length ?? 0);
    return Math.max(cell.text.length, ...dataWidths);
  });

  const headerRow = table.header
    .map((cell: Tokens.TableCell, i: number) => cell.text.padEnd(colWidths[i] ?? 0))
    .join(' | ');
  lines.push({ type: 'text', content: `| ${headerRow} |` });

  const separatorRow = colWidths.map((w: number) => '-'.repeat(w)).join(' | ');
  lines.push({ type: 'text', content: `| ${separatorRow} |` });

  for (const row of table.rows) {
    const rowText = row
      .map((cell: Tokens.TableCell, i: number) => (cell.text ?? '').padEnd(colWidths[i] ?? 0))
      .join(' | ');
    lines.push({ type: 'text', content: `| ${rowText} |` });
  }

  return lines;
}

function parseList(list: Tokens.List): ParsedLine[] {
  const lines: ParsedLine[] = [];

  for (const item of list.items) {
    const prefix = list.ordered ? `${item.task ? '- [ ] ' : ''}` : '- ';
    let content = '';

    for (const token of item.tokens) {
      if (token.type === 'text') {
        content += (token as Tokens.Text).text;
      } else if (token.type === 'link') {
        const link = token as Tokens.Link;
        const stripped = stripHtmlJsx(link.text);
        content += stripped;
      }
    }

    const wrapped = wrapText(content);
    for (let i = 0; i < wrapped.length; i++) {
      lines.push({
        type: 'list-item',
        content: i === 0 ? `${prefix}${wrapped[i]}` : `  ${wrapped[i]}`,
        indent: 0,
      });
    }
  }

  return lines;
}

export function parseMdx(
  raw: string,
  entry: TapeManifestEntry,
  manifest: TapeManifestEntry[]
): ParsedPage {
  logger.debug(`Parsing MDX for ${entry.id}`);

  let content = raw;

  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    content = content.slice(frontmatterMatch[0].length);
  }

  content = content.replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, '');
  content = content.replace(/export\s+default\s+[\s\S]*?(?:\n\n|\n(?=[A-Za-z])|$)/g, '');
  content = stripHtmlJsx(content);

  const tokens = marked.lexer(content);

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection = { lines: [] };
  const allLinks: string[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const heading = token as Tokens.Heading;
        if (currentSection.lines.length > 0 || currentSection.heading) {
          sections.push(currentSection);
          currentSection = { lines: [] };
        }
        currentSection.heading = heading.text;
        currentSection.level = heading.depth;
        currentSection.lines.push({
          type: 'heading',
          content: heading.text,
        });
        break;
      }

      case 'paragraph': {
        const para = token as Tokens.Paragraph;
        let text = '';
        for (const t of para.tokens || []) {
          if (t.type === 'text') {
            text += (t as Tokens.Text).text;
          } else if (t.type === 'link') {
            const link = t as Tokens.Link;
            const pageId = resolveInternalLink(link.href, manifest);
            if (pageId) {
              allLinks.push(pageId);
              currentSection.lines.push({
                type: 'link',
                content: stripHtmlJsx(link.text),
                href: link.href,
                pageId,
              });
            } else {
              text += stripHtmlJsx(link.text);
            }
          } else if (t.type === 'codespan') {
            text += (t as Tokens.Codespan).text;
          }
        }
        if (text.trim()) {
          for (const line of wrapText(text)) {
            currentSection.lines.push({ type: 'text', content: line });
          }
        }
        break;
      }

      case 'code': {
        const code = token as Tokens.Code;
        const codeLines = parseCodeBlock(code.text, 0);
        currentSection.lines.push(...codeLines);
        break;
      }

      case 'list': {
        const list = token as Tokens.List;
        const listLines = parseList(list);
        currentSection.lines.push(...listLines);
        break;
      }

      case 'table': {
        const table = token as Tokens.Table;
        const tableLines = parseTable(table);
        currentSection.lines.push(...tableLines);
        break;
      }

      case 'space':
      case 'hr':
        currentSection.lines.push({ type: 'blank', content: '' });
        break;

      default:
        if ('raw' in token && token.raw?.trim()) {
          const stripped = stripHtmlJsx(token.raw);
          if (stripped) {
            for (const line of wrapText(stripped)) {
              currentSection.lines.push({ type: 'text', content: line });
            }
          }
        }
    }
  }

  if (currentSection.lines.length > 0 || currentSection.heading) {
    sections.push(currentSection);
  }

  logger.debug(`Parsed ${entry.id}: ${sections.length} sections, ${allLinks.length} links`);

  return {
    id: entry.id,
    title: entry.title,
    sections,
    links: allLinks,
  };
}

export function parseAllMdx(
  rawContents: Map<string, string>,
  manifest: TapeManifestEntry[]
): Map<string, ParsedPage> {
  const pages = new Map<string, ParsedPage>();

  for (const entry of manifest) {
    const raw = rawContents.get(entry.id);
    if (raw) {
      const page = parseMdx(raw, entry, manifest);
      pages.set(entry.id, page);
    }
  }

  return pages;
}
