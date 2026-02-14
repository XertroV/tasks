import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:tape-manifest';
const RESOLVED_ID = `\0${VIRTUAL_MODULE_ID}`;

const SECTION_ORDER: Record<string, number> = {
  index: 0,
  'getting-started': 1,
  'agent-usage': 2,
  operations: 3,
  workflows: 4,
  'schema-and-data': 5,
  parity: 6,
  faq: 7,
};

interface TapeManifestEntry {
  id: string;
  title: string;
  section: string;
  order: number;
  file: string;
}

function extractFrontmatter(content: string): Record<string, string> {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return {};
  }

  const frontmatter: Record<string, string> = {};
  const lines = frontmatterMatch[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const value = line
      .slice(colonIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, '');

    frontmatter[key] = value;
  }

  return frontmatter;
}

function scanContentDirectory(
  docsPath: string,
  baseDir: string,
  section: string,
  sectionOrder: number
): TapeManifestEntry[] {
  const entries: TapeManifestEntry[] = [];
  const dirPath = path.join(docsPath, baseDir);

  if (!existsSync(dirPath)) {
    return entries;
  }

  const files = readdirSync(dirPath);
  let fileOrder = 0;

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = statSync(filePath);

    if (!stat.isFile() || !file.endsWith('.mdx')) {
      continue;
    }

    const content = readFileSync(filePath, 'utf-8');
    const frontmatter = extractFrontmatter(content);
    const id = file.replace(/\.mdx$/, '');
    const relativeFile = baseDir ? `${baseDir}/${file}` : file;

    entries.push({
      id,
      title: frontmatter.title ?? id,
      section,
      order: sectionOrder * 1000 + fileOrder,
      file: relativeFile,
    });

    fileOrder += 1;
  }

  return entries.sort((a, b) => a.order - b.order);
}

function generateManifest(docsPath: string): TapeManifestEntry[] {
  const allEntries: TapeManifestEntry[] = [];

  for (const [section, sectionOrder] of Object.entries(SECTION_ORDER)) {
    const baseDir = section === 'index' ? '' : section;
    const entries = scanContentDirectory(docsPath, baseDir, section, sectionOrder);
    allEntries.push(...entries);
  }

  return allEntries;
}

export function vitePluginTapeManifest(docsPath: string): Plugin {
  return {
    name: 'vite-plugin-tape-manifest',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_ID;
      }
      return null;
    },

    load(id) {
      if (id !== RESOLVED_ID) {
        return null;
      }

      const entries = generateManifest(docsPath);
      const moduleCode = `export const manifest = ${JSON.stringify(entries, null, 2)};\nexport default manifest;`;

      return moduleCode;
    },

    configureServer(server) {
      const watcher = server.watcher;
      const absoluteDocsPath = path.resolve(docsPath);

      watcher.on('add', (file) => {
        if (file.startsWith(absoluteDocsPath) && file.endsWith('.mdx')) {
          const module = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (module) {
            server.moduleGraph.invalidateModule(module);
            server.ws.send({ type: 'full-reload' });
          }
        }
      });

      watcher.on('change', (file) => {
        if (file.startsWith(absoluteDocsPath) && file.endsWith('.mdx')) {
          const module = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (module) {
            server.moduleGraph.invalidateModule(module);
            server.ws.send({ type: 'full-reload' });
          }
        }
      });
    },
  };
}
