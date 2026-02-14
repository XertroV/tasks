import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type CommandEntry = {
  name: string;
  summary: string;
  aliases: string[];
  usage?: string;
  options: Array<{ flag: string; description: string }>;
  source: 'python' | 'typescript' | 'merged';
};

export type CommandsPayload = {
  generated_at: string;
  commands: CommandEntry[];
};

export type ParityPayload = {
  generated_at: string;
  parity: Record<string, { status: 'expected' | 'gap'; notes: string[] }>;
};

function readJson<T>(file: string, fallback: T): T {
  const p = join(process.cwd(), '.generated', file);
  if (!existsSync(p)) return fallback;
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

export function loadCommands(): CommandsPayload {
  return readJson<CommandsPayload>('commands.json', { generated_at: '', commands: [] });
}

export function loadParity(): ParityPayload {
  return readJson<ParityPayload>('parity.json', { generated_at: '', parity: {} });
}
