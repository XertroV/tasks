import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(scriptDir, '..');
const repoRoot = join(scriptDir, '..', '..');

function run(args) {
  try {
    return execFileSync('python3', ['backlog.py', ...args], { encoding: 'utf8', cwd: repoRoot });
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
    const m = line.match(/^\s{2,}([a-z0-9-]+)\s{2,}(.*)$/i);
    if (!m) continue;
    out.push({ name: m[1], summary: m[2].trim() });
  }
  return out;
}

function parseOptions(helpText) {
  const lines = helpText.split('\n');
  const options = [];
  let inOptions = false;
  for (const line of lines) {
    if (line.trim() === 'Options:') {
      inOptions = true;
      continue;
    }
    if (!inOptions) continue;
    if (line.trim() === '' || line.trim() === 'Commands:') break;
    const m = line.match(/^\s{2,}(-{1,2}[\w-][^\s,]*?(?:,\s*-{1,2}[\w-]+)?(?:\s+[^\s]+)?)\s{2,}(.*)$/);
    if (m) options.push({ flag: m[1].trim(), description: m[2].trim() });
  }
  return options;
}

function parseUsage(helpText) {
  const m = helpText.match(/^Usage:\s*(.+)$/m);
  return m ? m[1].trim() : '';
}

const rootHelp = run(['--help']);
const commands = parseCommands(rootHelp);

const detail = [];
for (const cmd of commands) {
  const help = run([cmd.name, '--help']);
  detail.push({
    name: cmd.name,
    summary: cmd.summary,
    usage: parseUsage(help),
    options: parseOptions(help),
    aliases: [],
    raw_help: help
  });
}

const payload = {
  generated_at: new Date().toISOString(),
  commands: detail
};

const outPath = join(docsRoot, '.generated', 'python-help.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Wrote ${outPath}`);
