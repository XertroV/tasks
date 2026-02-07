import { mkdtempSync, cpSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

function run(cmd: string[], cwd: string): { code: number; stdout: string; stderr: string } {
  const p = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    code: p.exitCode,
    stdout: p.stdout.toString(),
    stderr: p.stderr.toString(),
  };
}

function sanitizeText(s: string): string {
  return s
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function normalizeResult(r: { code: number; stdout: string; stderr: string }) {
  return {
    code: r.code,
    stdout: sanitizeText(r.stdout),
    stderr: sanitizeText(r.stderr),
  };
}

function assertSemanticJson(cmd: string[], py: string, ts: string): void {
  const pyo = JSON.parse(py || "null");
  const tso = JSON.parse(ts || "null");
  if (cmd[0] === "next") {
    if (pyo?.id !== tso?.id) throw new Error(`next --json id mismatch: py=${pyo?.id} ts=${tso?.id}`);
    return;
  }
  if (cmd[0] === "list") {
    if (!Array.isArray(tso?.critical_path)) throw new Error("list --json missing TS critical_path");
    if (!Array.isArray(pyo?.critical_path)) throw new Error("list --json missing Python critical_path");
    if ((pyo?.next_available ?? null) !== (tso?.next_available ?? null)) {
      throw new Error(`list --json next_available mismatch`);
    }
    return;
  }
  if (cmd[0] === "report" && cmd[1] === "progress") {
    if (!tso || typeof tso !== "object") throw new Error("report progress --json expected object");
    return;
  }
  if (cmd[0] === "data" && cmd[1] === "summary") {
    if (!tso || typeof tso !== "object") throw new Error("data summary --json expected object");
    return;
  }
}

function readTaskState(cwd: string): string {
  const p = join(cwd, ".tasks", "index.yaml");
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

function readFrontmatter(path: string): Record<string, unknown> {
  const raw = readFileSync(path, "utf8");
  const parts = raw.split("---\n");
  if (parts.length < 3) return {};
  return (parse(parts[1] ?? "") as Record<string, unknown>) ?? {};
}

function taskStatus(cwd: string, relPath: string): string | null {
  const full = join(cwd, ".tasks", relPath);
  if (!existsSync(full)) return null;
  const fm = readFrontmatter(full);
  return (fm.status as string | undefined) ?? null;
}

function assertCommandSemanticState(args: string[], pyRoot: string, tsRoot: string): void {
  if (args[0] === "claim") {
    const py = taskStatus(pyRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    const ts = taskStatus(tsRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    if (py !== ts) throw new Error(`claim status mismatch py=${py} ts=${ts}`);
    return;
  }
  if (args[0] === "done") {
    const py = taskStatus(pyRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    const ts = taskStatus(tsRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    if (py !== ts) throw new Error(`done status mismatch py=${py} ts=${ts}`);
    return;
  }
  if (args[0] === "update") {
    const py = taskStatus(pyRoot, "01-phase/01-ms/01-epic/T002-two.todo");
    const ts = taskStatus(tsRoot, "01-phase/01-ms/01-epic/T002-two.todo");
    if (py !== ts) throw new Error(`update status mismatch py=${py} ts=${ts}`);
    return;
  }
  if (args[0] === "blocked" && args.includes("--no-grab")) {
    const py = taskStatus(pyRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    const ts = taskStatus(tsRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    if (py !== ts) throw new Error(`blocked status mismatch py=${py} ts=${ts}`);
    return;
  }
}

function assertSyncState(pyRoot: string, tsRoot: string): void {
  const py = parse(readFileSync(join(pyRoot, ".tasks", "index.yaml"), "utf8")) as Record<string, unknown>;
  const ts = parse(readFileSync(join(tsRoot, ".tasks", "index.yaml"), "utf8")) as Record<string, unknown>;
  if (JSON.stringify(py.critical_path ?? []) !== JSON.stringify(ts.critical_path ?? [])) {
    throw new Error("sync critical_path mismatch");
  }
  if ((py.next_available ?? null) !== (ts.next_available ?? null)) {
    throw new Error("sync next_available mismatch");
  }
}

const fixtureTemplate = mkdtempSync(join(tmpdir(), "tasks-parity-template-"));
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const cliPath = join(here, "..", "src", "cli.ts");
const pyCliPath = join(repoRoot, "tasks.py");

function writeFixture(root: string): void {
  const tasksDir = join(root, ".tasks");
  mkdirSync(join(tasksDir, "01-phase", "01-ms", "01-epic"), { recursive: true });
  writeFileSync(
    join(tasksDir, "index.yaml"),
    `project: Parity\nphases:\n  - id: P1\n    name: Phase\n    path: 01-phase\n`,
  );
  writeFileSync(
    join(tasksDir, "01-phase", "index.yaml"),
    `milestones:\n  - id: M1\n    name: Milestone\n    path: 01-ms\n`,
  );
  writeFileSync(
    join(tasksDir, "01-phase", "01-ms", "index.yaml"),
    `epics:\n  - id: E1\n    name: Epic\n    path: 01-epic\n`,
  );
  writeFileSync(
    join(tasksDir, "01-phase", "01-ms", "01-epic", "index.yaml"),
    `tasks:\n  - id: T001\n    file: T001-one.todo\n  - id: T002\n    file: T002-two.todo\n`,
  );
  writeFileSync(
    join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-one.todo"),
    `---\nid: P1.M1.E1.T001\ntitle: One\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# One\n`,
  );
  writeFileSync(
    join(tasksDir, "01-phase", "01-ms", "01-epic", "T002-two.todo"),
    `---\nid: P1.M1.E1.T002\ntitle: Two\nstatus: pending\nestimate_hours: 2\ncomplexity: medium\npriority: high\ndepends_on:\n  - P1.M1.E1.T001\ntags: []\n---\n# Two\n`,
  );
}

writeFixture(fixtureTemplate);

const vectors = [
  ["list", "--json"],
  ["next", "--json"],
  ["show"],
  ["work"],
  ["work", "P1.M1.E1.T001"],
  ["claim", "P1.M1.E1.T001", "--agent", "agent-x"],
  ["done", "P1.M1.E1.T001"],
  ["update", "P1.M1.E1.T002", "blocked", "--reason", "waiting"],
  ["blocked", "P1.M1.E1.T001", "--reason", "waiting", "--no-grab"],
  ["unclaim", "P1.M1.E1.T001"],
  ["sync"],
];

for (const args of vectors) {
  const pyRoot = mkdtempSync(join(tmpdir(), "tasks-parity-py-"));
  const tsRoot = mkdtempSync(join(tmpdir(), "tasks-parity-ts-"));
  cpSync(join(fixtureTemplate, ".tasks"), join(pyRoot, ".tasks"), { recursive: true });
  cpSync(join(fixtureTemplate, ".tasks"), join(tsRoot, ".tasks"), { recursive: true });
  const py = normalizeResult(run(["python", pyCliPath, ...args], pyRoot));
  const ts = normalizeResult(run(["bun", "run", cliPath, ...args], tsRoot));

  if (py.code !== ts.code) {
    throw new Error(`Exit code mismatch for ${args.join(" ")}: py=${py.code} ts=${ts.code}`);
  }

  // semantic JSON parity when JSON output requested.
  if (args.includes("--json")) {
    assertSemanticJson(args, py.stdout, ts.stdout);
  }

  if (args[0] === "sync") {
    assertSyncState(pyRoot, tsRoot);
  } else {
    const pyState = readTaskState(pyRoot);
    const tsState = readTaskState(tsRoot);
    if (pyState !== tsState) {
      throw new Error(`State mismatch after ${args.join(" ")}`);
    }
  }
  assertCommandSemanticState(args, pyRoot, tsRoot);

  console.log(`OK parity: ${args.join(" ")}`);
}
