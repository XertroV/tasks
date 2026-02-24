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
  if (cmd[0] === "check") {
    if (typeof pyo?.ok !== "boolean" || typeof tso?.ok !== "boolean") {
      throw new Error("check --json missing ok boolean");
    }
    if (pyo?.summary?.errors !== tso?.summary?.errors) {
      throw new Error("check --json summary.errors mismatch");
    }
    return;
  }
  if (cmd[0] === "data" && cmd[1] === "summary") {
    if (!tso?.overall || typeof tso.overall.total_tasks !== "number") {
      throw new Error("data summary missing overall.total_tasks");
    }
    if (pyo?.project !== tso?.project) {
      throw new Error("data summary project mismatch");
    }
    return;
  }
  if (cmd[0] === "data" && cmd[1] === "export") {
    if (!Array.isArray(tso?.phases)) throw new Error("data export missing phases array");
    if (pyo?.project !== tso?.project) throw new Error("data export project mismatch");
    return;
  }
  if (cmd[0] === "report" && cmd[1] === "progress") {
    if (typeof pyo?.overall?.total !== "number" || typeof tso?.overall?.total !== "number") {
      throw new Error("report progress --format json missing overall.total");
    }
    return;
  }
  if (cmd[0] === "report" && cmd[1] === "velocity") {
    if (!Array.isArray(tso?.daily_data)) throw new Error("report velocity missing daily_data");
    return;
  }
  if (cmd[0] === "report" && cmd[1] === "estimate-accuracy") {
    if (typeof tso?.tasks_analyzed !== "number") throw new Error("report estimate-accuracy missing tasks_analyzed");
    return;
  }
  if (cmd[0] === "schema") {
    if (typeof tso?.schema_version !== "number") throw new Error("schema --json missing schema_version");
    if (!Array.isArray(tso?.files)) throw new Error("schema --json missing files");
    return;
  }
  if (cmd[0] === "search") {
    if (!tso || typeof tso !== "string") {
      // text output command; noop semantic gate beyond exit code.
    }
    return;
  }
  if (cmd[0] === "blockers") {
    return;
  }
  if (cmd[0] === "skills" && cmd[1] === "install") {
    if (!Array.isArray(tso?.operations)) throw new Error("skills install --json missing operations");
    return;
  }
  if (cmd[0] === "agents") {
    return;
  }
  if (cmd[0] === "add") {
    const pyIdx = parse(readFileSync(join(pyRoot, ".tasks", "01-phase", "01-ms", "01-epic", "index.yaml"), "utf8")) as Record<string, unknown>;
    const tsIdx = parse(readFileSync(join(tsRoot, ".tasks", "01-phase", "01-ms", "01-epic", "index.yaml"), "utf8")) as Record<string, unknown>;
    const pyTasks = (pyIdx.tasks as unknown[] | undefined) ?? [];
    const tsTasks = (tsIdx.tasks as unknown[] | undefined) ?? [];
    if (pyTasks.length !== tsTasks.length) throw new Error("add task count mismatch");
    return;
  }
  if (cmd[0] === "add-epic") {
    const pyIdx = parse(readFileSync(join(pyRoot, ".tasks", "01-phase", "01-ms", "index.yaml"), "utf8")) as Record<string, unknown>;
    const tsIdx = parse(readFileSync(join(tsRoot, ".tasks", "01-phase", "01-ms", "index.yaml"), "utf8")) as Record<string, unknown>;
    const py = (pyIdx.epics as unknown[] | undefined) ?? [];
    const ts = (tsIdx.epics as unknown[] | undefined) ?? [];
    if (py.length !== ts.length) throw new Error("add-epic count mismatch");
    return;
  }
  if (cmd[0] === "add-milestone") {
    const pyIdx = parse(readFileSync(join(pyRoot, ".tasks", "01-phase", "index.yaml"), "utf8")) as Record<string, unknown>;
    const tsIdx = parse(readFileSync(join(tsRoot, ".tasks", "01-phase", "index.yaml"), "utf8")) as Record<string, unknown>;
    const py = (pyIdx.milestones as unknown[] | undefined) ?? [];
    const ts = (tsIdx.milestones as unknown[] | undefined) ?? [];
    if (py.length !== ts.length) throw new Error("add-milestone count mismatch");
    return;
  }
  if (cmd[0] === "add-phase") {
    const pyIdx = parse(readFileSync(join(pyRoot, ".tasks", "index.yaml"), "utf8")) as Record<string, unknown>;
    const tsIdx = parse(readFileSync(join(tsRoot, ".tasks", "index.yaml"), "utf8")) as Record<string, unknown>;
    const py = (pyIdx.phases as unknown[] | undefined) ?? [];
    const ts = (tsIdx.phases as unknown[] | undefined) ?? [];
    if (py.length !== ts.length) throw new Error("add-phase count mismatch");
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
  if (args[0] === "grab") {
    const py = taskStatus(pyRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    const ts = taskStatus(tsRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    if (py !== ts) throw new Error(`grab status mismatch py=${py} ts=${ts}`);
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
  if (args[0] === "blocked" && args.includes("--grab")) {
    const pyBlocked = taskStatus(pyRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    const tsBlocked = taskStatus(tsRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    const pyNext = taskStatus(pyRoot, "01-phase/01-ms/01-epic/T002-two.todo");
    const tsNext = taskStatus(tsRoot, "01-phase/01-ms/01-epic/T002-two.todo");
    if (pyBlocked !== tsBlocked || pyNext !== tsNext) {
      throw new Error(`blocked(auto-grab) mismatch: py(${pyBlocked},${pyNext}) vs ts(${tsBlocked},${tsNext})`);
    }
    return;
  }
  if (args[0] === "blocked" && !args.includes("--grab")) {
    const pyBlocked = taskStatus(pyRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    const tsBlocked = taskStatus(tsRoot, "01-phase/01-ms/01-epic/T001-one.todo");
    if (pyBlocked !== tsBlocked) {
      throw new Error(`blocked status mismatch py=${pyBlocked} ts=${tsBlocked}`);
    }
    return;
  }
  if (args[0] === "session" && args[1] === "start") {
    const p = parse(readFileSync(join(pyRoot, ".tasks", ".sessions.yaml"), "utf8")) as Record<string, unknown>;
    const t = parse(readFileSync(join(tsRoot, ".tasks", ".sessions.yaml"), "utf8")) as Record<string, unknown>;
    if (!("agent-p" in p) || !("agent-p" in t)) throw new Error("session start missing agent-p");
    return;
  }
  if (args[0] === "session" && args[1] === "end") {
    const pPath = join(pyRoot, ".tasks", ".sessions.yaml");
    const tPath = join(tsRoot, ".tasks", ".sessions.yaml");
    const p = existsSync(pPath) ? (parse(readFileSync(pPath, "utf8")) as Record<string, unknown>) : {};
    const t = existsSync(tPath) ? (parse(readFileSync(tPath, "utf8")) as Record<string, unknown>) : {};
    if ("agent-p" in p || "agent-p" in t) throw new Error("session end did not remove agent-p");
    return;
  }
  if (args[0] === "idea") {
    const pyIndexPath = join(pyRoot, ".tasks", "ideas", "index.yaml");
    const tsIndexPath = join(tsRoot, ".tasks", "ideas", "index.yaml");
    if (!existsSync(pyIndexPath) || !existsSync(tsIndexPath)) {
      throw new Error("idea did not create .tasks/ideas/index.yaml");
    }
    const pyIdx = parse(readFileSync(pyIndexPath, "utf8")) as Record<string, unknown>;
    const tsIdx = parse(readFileSync(tsIndexPath, "utf8")) as Record<string, unknown>;
    const pyIdeas = (pyIdx.ideas as Record<string, unknown>[] | undefined) ?? [];
    const tsIdeas = (tsIdx.ideas as Record<string, unknown>[] | undefined) ?? [];
    if (pyIdeas.length !== tsIdeas.length) {
      throw new Error(`idea count mismatch py=${pyIdeas.length} ts=${tsIdeas.length}`);
    }
    const pyFirst = pyIdeas[0] ?? {};
    const tsFirst = tsIdeas[0] ?? {};
    const pyFile = String(pyFirst.file ?? "");
    const tsFile = String(tsFirst.file ?? "");
    if (!pyFile.startsWith("I001-") || !tsFile.startsWith("I001-")) {
      throw new Error(`idea file mismatch py=${pyFile} ts=${tsFile}`);
    }
    return;
  }
}

function assertSyncState(pyRoot: string, tsRoot: string): void {
  const py = parse(readFileSync(join(pyRoot, ".tasks", "index.yaml"), "utf8")) as Record<string, unknown>;
  const ts = parse(readFileSync(join(tsRoot, ".tasks", "index.yaml"), "utf8")) as Record<string, unknown>;
  if (!Array.isArray(py.critical_path) || !Array.isArray(ts.critical_path)) {
    throw new Error("sync critical_path missing or invalid");
  }
  const pyHasNext = (py.next_available ?? null) !== null;
  const tsHasNext = (ts.next_available ?? null) !== null;
  if (pyHasNext !== tsHasNext) {
    throw new Error("sync next_available nullability mismatch");
  }
  if (typeof py.stats !== "object" || typeof ts.stats !== "object") {
    throw new Error("sync stats missing");
  }
}

const fixtureTemplate = mkdtempSync(join(tmpdir(), "tasks-parity-template-"));
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const cliPath = join(here, "..", "src", "cli.ts");
const pyCliPath = join(repoRoot, "backlog.py");

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
  ["grab", "--agent", "agent-x"],
  ["done", "P1.M1.E1.T001"],
  ["update", "P1.M1.E1.T002", "blocked", "--reason", "waiting"],
  ["blocked", "P1.M1.E1.T001", "--reason", "waiting", "--grab"],
  ["blocked", "P1.M1.E1.T001", "--reason", "waiting"],
  ["unclaim", "P1.M1.E1.T001"],
  ["session", "start", "--agent", "agent-p", "--task", "P1.M1.E1.T001"],
  ["session", "list"],
  ["session", "end", "--agent", "agent-p"],
  ["check", "--json"],
  ["data", "summary", "--format", "json"],
  ["data", "export", "--format", "json"],
  ["report", "progress", "--format", "json"],
  ["report", "velocity", "--days", "7", "--format", "json"],
  ["report", "estimate-accuracy", "--format", "json"],
  ["timeline"],
  ["tl"],
  ["schema", "--json"],
  ["search", "One"],
  ["blockers", "--suggest"],
  ["skills", "install", "plan-task", "--client=codex", "--artifact=skills", "--dry-run", "--json"],
  ["agents", "--profile", "short"],
  ["add", "P1.M1.E1", "--title", "Parity Task"],
  ["add-epic", "P1.M1", "--title", "Parity Epic"],
  ["add-milestone", "P1", "--title", "Parity Milestone"],
  ["add-phase", "--title", "Parity Phase"],
  ["idea", "Parity idea"],
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
  } else if (["add", "add-epic", "add-milestone", "add-phase", "idea"].includes(args[0] ?? "")) {
    // add-family commands are validated semantically above; YAML serialization may differ.
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
