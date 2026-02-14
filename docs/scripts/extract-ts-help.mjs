import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(scriptDir, '..');
const repoRoot = join(scriptDir, '..', '..');

function run(args) {
  try {
    return execFileSync('bun', ['run', 'backlog_ts/src/cli.ts', ...args], { encoding: 'utf8', cwd: repoRoot });
  } catch (err) {
    // Some environments report EPERM even when child exited successfully.
    if (typeof err?.stdout === 'string' && err.stdout.length > 0) return err.stdout;
    throw err;
  }
}

function parseCommands(helpText) {
  const lines = helpText.split('\n');
  const out = [];
  let inCommands = false;
  for (const line of lines) {
    if (line.trim() === 'Commands:') {
      inCommands = true;
      continue;
    }
    if (!inCommands) continue;
    if (!line.trim()) continue;
    if (line.startsWith('Quick rules:')) break;
    const m = line.match(/^\s{2,}([a-z0-9-]+)\s{2,}(.*)$/i);
    if (!m) continue;
    out.push({ name: m[1], summary: m[2].trim() });
  }
  return out;
}

function parseUsage(helpText) {
  const m = helpText.match(/^Usage:\s*(.+)$/m);
  return m ? m[1].trim() : '';
}

const rootHelp = run(['--help']);
const commands = parseCommands(rootHelp);

const detail = commands.map((cmd) => ({
  name: cmd.name,
  summary: cmd.summary,
  usage: `backlog ${cmd.name}`,
  options: [],
  aliases: []
}));

const payload = {
  generated_at: new Date().toISOString(),
  commands: detail
};

const outPath = join(docsRoot, '.generated', 'ts-help.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Wrote ${outPath}`);
