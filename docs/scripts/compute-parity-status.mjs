import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(scriptDir, '..');

function read(file) {
  const p = join(docsRoot, '.generated', file);
  if (!existsSync(p)) return { commands: [] };
  return JSON.parse(readFileSync(p, 'utf8'));
}

const py = read('python-help.json');
const ts = read('ts-help.json');

const pyMap = new Map(py.commands.map((c) => [c.name, c]));
const tsMap = new Map(ts.commands.map((c) => [c.name, c]));
const names = [...new Set([...pyMap.keys(), ...tsMap.keys()])].sort();

const parity = {};

for (const name of names) {
  const notes = [];
  const p = pyMap.get(name);
  const t = tsMap.get(name);
  if (!p) notes.push('Missing in Python help output');
  if (!t) notes.push('Missing in TypeScript help output');

  if (p && t) {
    const pFlags = new Set((p.options || []).map((o) => o.flag));
    const tFlags = new Set((t.options || []).map((o) => o.flag));
    for (const f of pFlags) if (!tFlags.has(f)) notes.push(`TS missing option: ${f}`);
    for (const f of tFlags) if (!pFlags.has(f)) notes.push(`Python missing option: ${f}`);
  }

  parity[name] = {
    status: notes.length ? 'gap' : 'expected',
    notes
  };
}

const out = {
  generated_at: new Date().toISOString(),
  parity
};

const outPath = join(docsRoot, '.generated', 'parity.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath}`);
