import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

let oldCwd = process.cwd();
let root = "";

afterEach(() => {
  if (root) {
    process.chdir(oldCwd);
    rmSync(root, { recursive: true, force: true });
    root = "";
  }
});

function setupFixture(): string {
  const r = mkdtempSync(join(tmpdir(), "tasks-ts-native-"));
  const t = join(r, ".tasks");
  mkdirSync(join(t, "01-phase", "01-ms", "01-epic"), { recursive: true });
  writeFileSync(
    join(t, "index.yaml"),
    `project: Native\nphases:\n  - id: P1\n    name: Phase\n    path: 01-phase\ncritical_path: []\n`,
  );
  writeFileSync(join(t, "01-phase", "index.yaml"), `milestones:\n  - id: M1\n    name: M\n    path: 01-ms\n`);
  writeFileSync(join(t, "01-phase", "01-ms", "index.yaml"), `epics:\n  - id: E1\n    name: E\n    path: 01-epic\n`);
  writeFileSync(
    join(t, "01-phase", "01-ms", "01-epic", "index.yaml"),
    `tasks:\n  - id: T001\n    file: T001-a.todo\n  - id: T002\n    file: T002-b.todo\n`,
  );
  writeFileSync(
    join(t, "01-phase", "01-ms", "01-epic", "T001-a.todo"),
    `---\nid: P1.M1.E1.T001\ntitle: A\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# A\n`,
  );
  writeFileSync(
    join(t, "01-phase", "01-ms", "01-epic", "T002-b.todo"),
    `---\nid: P1.M1.E1.T002\ntitle: B\nstatus: pending\nestimate_hours: 2\ncomplexity: medium\npriority: high\ndepends_on:\n  - P1.M1.E1.T001\ntags: []\n---\n# B\n`,
  );
  return r;
}

function run(args: string[], cwd: string) {
  const cliPath = join(fileURLToPath(new URL("..", import.meta.url)), "src", "cli.ts");
  return Bun.spawnSync(["bun", "run", cliPath, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("native cli", () => {
  test("list/next/show json and text", () => {
    root = setupFixture();
    const list = run(["list", "--json"], root);
    expect(list.exitCode).toBe(0);
    const payload = JSON.parse(list.stdout.toString());
    expect(Array.isArray(payload.tasks)).toBeTrue();

    const next = run(["next", "--json"], root);
    expect(next.exitCode).toBe(0);
    expect(JSON.parse(next.stdout.toString()).id).toBe("P1.M1.E1.T001");

    const show = run(["show", "P1.M1.E1.T001"], root);
    expect(show.exitCode).toBe(0);
    expect(show.stdout.toString()).toContain("P1.M1.E1.T001");
  });

  test("claim done update sync mutate files", () => {
    root = setupFixture();
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "agent-z"], root);
    expect(p.exitCode).toBe(0);

    const todoPath = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    expect(readFileSync(todoPath, "utf8")).toContain("status: in_progress");

    p = run(["done", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);
    expect(readFileSync(todoPath, "utf8")).toContain("status: done");

    p = run(["update", "P1.M1.E1.T002", "blocked", "--reason", "wait"], root);
    expect(p.exitCode).toBe(0);

    p = run(["sync"], root);
    expect(p.exitCode).toBe(0);
    const rootIndex = readFileSync(join(root, ".tasks", "index.yaml"), "utf8");
    expect(rootIndex).toContain("critical_path:");
    expect(rootIndex).toContain("next_available:");
  });

  test("work set/show/clear", () => {
    root = setupFixture();
    let p = run(["work"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("No current working task set.");

    p = run(["work", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Working task set");

    p = run(["work"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Current Working Task");
    expect(p.stdout.toString()).toContain("P1.M1.E1.T001");

    p = run(["work", "--clear"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Cleared working task context.");
  });

  test("unclaim and blocked --no-grab", () => {
    root = setupFixture();
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "agent-z"], root);
    expect(p.exitCode).toBe(0);

    p = run(["blocked", "P1.M1.E1.T001", "--reason", "waiting", "--no-grab"], root);
    expect(p.exitCode).toBe(0);
    let todo = readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"), "utf8");
    expect(todo).toContain("status: blocked");

    p = run(["update", "P1.M1.E1.T001", "pending", "--reason", "retry"], root);
    expect(p.exitCode).toBe(0);
    p = run(["claim", "P1.M1.E1.T001", "--agent", "agent-z"], root);
    expect(p.exitCode).toBe(0);
    p = run(["unclaim", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);
    todo = readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"), "utf8");
    expect(todo).toContain("status: pending");
  });

  test("blocked auto-grab next task", () => {
    root = setupFixture();
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "agent-b"], root);
    expect(p.exitCode).toBe(0);
    p = run(["blocked", "P1.M1.E1.T001", "--reason", "waiting"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Blocked: P1.M1.E1.T001");
    expect(p.stdout.toString()).toContain("No available tasks found.");
    const todo1 = readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"), "utf8");
    const todo2 = readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo"), "utf8");
    expect(todo1).toContain("status: blocked");
    expect(todo2).toContain("status: pending");
  });

  test("grab and cycle workflow", () => {
    root = setupFixture();
    let p = run(["grab", "--agent", "agent-c"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Grabbed:");
    let todo1 = readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"), "utf8");
    expect(todo1).toContain("status: in_progress");

    p = run(["cycle", "P1.M1.E1.T001", "--agent", "agent-c"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Completed: P1.M1.E1.T001");
    expect(p.stdout.toString()).toContain("Grabbed: P1.M1.E1.T002");

    todo1 = readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"), "utf8");
    const todo2 = readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo"), "utf8");
    expect(todo1).toContain("status: done");
    expect(todo2).toContain("status: in_progress");
  });

  test("session lifecycle", () => {
    root = setupFixture();
    let p = run(["session", "start", "--agent", "agent-s", "--task", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Session started");

    p = run(["session", "heartbeat", "--agent", "agent-s", "--progress", "testing"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Heartbeat updated");

    p = run(["session", "list"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("agent-s");

    p = run(["session", "end", "--agent", "agent-s"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Session ended");

    p = run(["session", "list"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("No active sessions");
  });

  test("check command json and strict behavior", () => {
    root = setupFixture();
    let p = run(["check", "--json"], root);
    expect(p.exitCode).toBe(0);
    const report = JSON.parse(p.stdout.toString());
    expect(report.ok).toBeTrue();
    expect(report.summary.errors).toBe(0);

    // Create stale context warning and ensure strict exits non-zero.
    writeFileSync(join(root, ".tasks", ".context.yaml"), "current_task: P9.M9.E9.T999\n");
    p = run(["check", "--strict"], root);
    expect(p.exitCode).toBe(1);
    expect(p.stdout.toString()).toContain("warning");

    // Zero estimates should warn and fail in strict mode.
    const taskPath = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    writeFileSync(taskPath, readFileSync(taskPath, "utf8").replace("estimate_hours: 1", "estimate_hours: 0"));
    p = run(["check"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("zero_estimate_hours");
    p = run(["check", "--strict"], root);
    expect(p.exitCode).toBe(1);
  });

  test("data summary/export json", () => {
    root = setupFixture();
    let p = run(["data", "summary", "--format", "json"], root);
    expect(p.exitCode).toBe(0);
    const summary = JSON.parse(p.stdout.toString());
    expect(summary.project).toBe("Native");
    expect(summary.overall.total_tasks).toBe(2);

    p = run(["data", "export", "--format", "json"], root);
    expect(p.exitCode).toBe(0);
    const exported = JSON.parse(p.stdout.toString());
    expect(exported.project).toBe("Native");
    expect(Array.isArray(exported.phases)).toBeTrue();
    expect(exported.phases[0].milestones[0].epics[0].tasks.length).toBe(2);
  });

  test("report progress/velocity/estimate-accuracy json", () => {
    root = setupFixture();
    // create duration-bearing completed task
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "agent-r"], root);
    expect(p.exitCode).toBe(0);
    p = run(["done", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);

    p = run(["report", "progress", "--format", "json"], root);
    expect(p.exitCode).toBe(0);
    const progress = JSON.parse(p.stdout.toString());
    expect(progress.overall.total).toBe(2);

    p = run(["report", "velocity", "--days", "7", "--format", "json"], root);
    expect(p.exitCode).toBe(0);
    const velocity = JSON.parse(p.stdout.toString());
    expect(velocity.days_analyzed).toBe(7);
    expect(Array.isArray(velocity.daily_data)).toBeTrue();

    p = run(["report", "estimate-accuracy", "--format", "json"], root);
    expect(p.exitCode).toBe(0);
    const accuracy = JSON.parse(p.stdout.toString());
    expect(accuracy.tasks_analyzed).toBeGreaterThanOrEqual(1);
  });

  test("timeline and schema commands", () => {
    root = setupFixture();
    let p = run(["timeline"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Project Timeline");

    p = run(["schema", "--json"], root);
    expect(p.exitCode).toBe(0);
    const schema = JSON.parse(p.stdout.toString());
    expect(schema.schema_version).toBe(1);
    expect(Array.isArray(schema.files)).toBeTrue();
  });

  test("search and blockers commands", () => {
    root = setupFixture();
    let p = run(["search", "A"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("P1.M1.E1.T001");

    p = run(["blockers"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("waiting on dependencies");

    p = run(["blockers", "--suggest"], root);
    expect(p.exitCode).toBe(0);
  });

  test("skills install dry-run json and write", () => {
    root = setupFixture();
    let p = run(
      ["skills", "install", "plan-task", "--client=codex", "--artifact=skills", "--dry-run", "--json"],
      root,
    );
    expect(p.exitCode).toBe(0);
    const dry = JSON.parse(p.stdout.toString());
    expect(dry.dry_run).toBeTrue();
    expect(Array.isArray(dry.operations)).toBeTrue();
    expect(dry.operations[0].path).toContain(".agents/skills/plan-task/SKILL.md");

    p = run(
      ["skills", "install", "plan-task", "--client=codex", "--artifact=skills"],
      root,
    );
    expect(p.exitCode).toBe(0);
    expect(readFileSync(join(root, ".agents", "skills", "plan-task", "SKILL.md"), "utf8")).toContain("plan-task");
  });

  test("agents profile output", () => {
    root = setupFixture();
    let p = run(["agents", "--profile", "short"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("AGENTS.md (Short)");

    p = run(["agents", "--profile", "all"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("AGENTS.md (Short)");
    expect(out).toContain("AGENTS.md (Medium)");
    expect(out).toContain("AGENTS.md (Long)");
  });

  test("add/add-epic/add-milestone/add-phase commands", () => {
    root = setupFixture();
    let p = run(["add", "P1.M1.E1", "--title", "New Task"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Created task:");

    p = run(["add-epic", "P1.M1", "--title", "New Epic"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Created epic:");

    p = run(["add-milestone", "P1", "--title", "New Milestone"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Created milestone:");

    p = run(["add-phase", "--title", "New Phase"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Created phase:");
  });
});
