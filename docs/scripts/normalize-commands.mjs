import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(scriptDir, '..');

function read(file) {
  const p = join(docsRoot, '.generated', file);
  if (!existsSync(p)) return { generated_at: '', commands: [] };
  return JSON.parse(readFileSync(p, 'utf8'));
}

const py = read('python-help.json');
const ts = read('ts-help.json');
const pyMap = new Map(py.commands.map((c) => [c.name, c]));
const tsMap = new Map(ts.commands.map((c) => [c.name, c]));

const mergedNames = [...new Set([...pyMap.keys(), ...tsMap.keys()])].sort();

const commands = mergedNames.map((name) => {
  const p = pyMap.get(name);
  const t = tsMap.get(name);
  return {
    name,
    summary: p?.summary || t?.summary || '',
    aliases: [],
    usage: p?.usage || t?.usage || `backlog ${name}`,
    options: (p?.options?.length ? p.options : (t?.options || [])),
    source: p && t ? 'merged' : (p ? 'python' : 'typescript')
  };
});

const out = {
  generated_at: new Date().toISOString(),
  commands
};

const outPath = join(docsRoot, '.generated', 'commands.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath}`);
