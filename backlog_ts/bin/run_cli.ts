#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function maxTsMtimeMs(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, maxTsMtimeMs(fullPath));
      continue;
    }
    if (entry.isFile() && extname(entry.name) === ".ts") {
      newest = Math.max(newest, statSync(fullPath).mtimeMs);
    }
  }
  return newest;
}

function resolveCacheDir(): string {
  const candidates = [
    process.env.BACKLOG_TS_CACHE_DIR,
    process.env.XDG_CACHE_HOME ? join(process.env.XDG_CACHE_HOME, "backlog_ts") : undefined,
    process.env.HOME ? join(process.env.HOME, ".cache", "backlog_ts") : undefined,
    join(tmpdir(), "backlog_ts"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      mkdirSync(candidate, { recursive: true });
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error("No writable cache directory available for backlog_ts CLI bundle.");
}

const binDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(binDir, "..");
const srcDir = join(projectRoot, "src");
const entrypoint = join(srcDir, "cli.ts");
const cacheDir = resolveCacheDir();
const bundlePath = join(cacheDir, "cli.js");

const srcNewestMtimeMs = maxTsMtimeMs(srcDir);
const bundleMtimeMs = existsSync(bundlePath) ? statSync(bundlePath).mtimeMs : 0;
const needsBuild = bundleMtimeMs < srcNewestMtimeMs;

if (needsBuild) {
  const result = await Bun.build({
    entrypoints: [entrypoint],
    outdir: cacheDir,
    target: "bun",
    sourcemap: "none",
    minify: false,
    write: true,
  });
  if (!result.success) {
    const messages = result.logs.map((entry) => entry.message).join("\n");
    throw new Error(`Failed to build backlog_ts CLI bundle:\n${messages}`);
  }
}

const importUrl = `${pathToFileURL(bundlePath).href}?v=${Math.trunc(statSync(bundlePath).mtimeMs)}`;
await import(importUrl);
