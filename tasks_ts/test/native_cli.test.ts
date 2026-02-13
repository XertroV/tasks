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

function setupFixture(includeBug = false): string {
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

  if (includeBug) {
    mkdirSync(join(t, "bugs"), { recursive: true });
    writeFileSync(join(t, "bugs", "index.yaml"), "bugs:\n  - id: B001\n    file: B001-critical-bug.todo\n");
    writeFileSync(
      join(t, "bugs", "B001-critical-bug.todo"),
      `---\nid: B001\ntitle: Critical Bug\nstatus: pending\nestimate_hours: 5\ncomplexity: high\npriority: critical\ndepends_on: []\ntags: [bug]\n---\n# Critical Bug\n`,
    );
  }

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

  test("next can return bugs and list marks bug critical path", () => {
    root = setupFixture(true);

    const next = run(["next", "--json"], root);
    expect(next.exitCode).toBe(0);
    expect(JSON.parse(next.stdout.toString()).id).toBe("B001");

    const list = run(["list"], root);
    expect(list.exitCode).toBe(0);
    expect(list.stdout.toString()).toContain("★ B001: Critical Bug");
  });

  test("list hides completed bugs by default and can include via flag", () => {
    root = setupFixture(true);
    const bugPath = join(root, ".tasks", "bugs", "B001-critical-bug.todo");
    let bugText = readFileSync(bugPath, "utf8");
    bugText = bugText.replace("status: pending", "status: done");
    writeFileSync(bugPath, bugText);

    let p = run(["list"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).not.toContain("B001: Critical Bug");

    p = run(["list", "--show-completed-aux"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("B001: Critical Bug");
  });

  test("list --json hides completed bugs by default", () => {
    root = setupFixture(true);
    const bugPath = join(root, ".tasks", "bugs", "B001-critical-bug.todo");
    let bugText = readFileSync(bugPath, "utf8");
    bugText = bugText.replace("status: pending", "status: done");
    writeFileSync(bugPath, bugText);

    const p = run(["list", "--json"], root);
    expect(p.exitCode).toBe(0);
    const payload = JSON.parse(p.stdout.toString());
    expect(Array.isArray(payload.bugs)).toBeTrue();
    expect(payload.bugs.length).toBe(0);
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

  test("set updates task properties", () => {
    root = setupFixture();
    const p = run([
      "set",
      "P1.M1.E1.T001",
      "--priority",
      "critical",
      "--complexity",
      "high",
      "--estimate",
      "3.5",
      "--title",
      "Updated Task",
      "--depends-on",
      "B060,P1.M1.E1.T002",
      "--tags",
      "bugfix,urgent",
    ], root);
    expect(p.exitCode).toBe(0);

    const todo = readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"), "utf8");
    expect(todo).toContain("title: Updated Task");
    expect(todo).toContain("priority: critical");
    expect(todo).toContain("complexity: high");
    expect(todo).toContain("estimate_hours: 3.5");
    expect(todo).toContain("- B060");
    expect(todo).toContain("- P1.M1.E1.T002");
    expect(todo).toContain("- bugfix");
    expect(todo).toContain("- urgent");
  });

  test("set requires at least one field", () => {
    root = setupFixture();
    const p = run(["set", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(1);
    expect(p.stderr.toString()).toContain("set requires at least one property flag");
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

  test("cycle auto-selected bug fans out to additional bugs", () => {
    root = setupFixture();
    let p = run(["bug", "--title", "bug one", "--simple"], root);
    expect(p.exitCode).toBe(0);
    p = run(["bug", "--title", "bug two", "--simple"], root);
    expect(p.exitCode).toBe(0);
    p = run(["bug", "--title", "bug three", "--simple"], root);
    expect(p.exitCode).toBe(0);

    p = run(["claim", "B001", "--agent", "agent-cycle"], root);
    expect(p.exitCode).toBe(0);
    p = run(["cycle", "B001", "--agent", "agent-cycle", "--no-content"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("Completed: B001");
    expect(out).toContain("B002");
    expect(out).toContain("B003");
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

  test("check command warns on uninitialized todo files", () => {
    root = setupFixture();
    const taskPath = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    
    // Create a task file with default template content
    const uninitializedContent = `---
id: P1.M1.E1.T001
title: Task 1
status: pending
estimate_hours: 1
complexity: low
priority: medium
depends_on: []
tags: []
---

# Task 1

## Requirements

- TODO: Add requirements

## Acceptance Criteria

- TODO: Add acceptance criteria
`;
    writeFileSync(taskPath, uninitializedContent);
    
    let p = run(["check"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("uninitialized_todo");
    expect(p.stdout.toString()).toContain("P1.M1.E1.T001");
    
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
    expect(velocity.daily_data.length).toBe(2);

    p = run(["report", "estimate-accuracy", "--format", "json"], root);
    expect(p.exitCode).toBe(0);
    const accuracy = JSON.parse(p.stdout.toString());
    expect(accuracy.tasks_analyzed).toBeGreaterThanOrEqual(1);

    p = run(["report"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Progress Report");
    expect(p.stdout.toString()).toContain("Report commands:");

    p = run(["r", "p", "--format", "json"], root);
    expect(p.exitCode).toBe(0);
    const progressAlias = JSON.parse(p.stdout.toString());
    expect(progressAlias.overall.total).toBe(2);

    p = run(["r", "v", "--days", "7", "--format", "json"], root);
    expect(p.exitCode).toBe(0);
    const velocityAlias = JSON.parse(p.stdout.toString());
    expect(velocityAlias.days_analyzed).toBe(7);
    expect(velocityAlias.daily_data.length).toBe(2);
  });

  test("timeline and schema commands", () => {
    root = setupFixture();
    let p = run(["timeline"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Project Timeline");

    const alias = run(["tl"], root);
    expect(alias.exitCode).toBe(0);
    expect(alias.stdout.toString()).toContain("Project Timeline");
    expect(alias.stdout.toString()).toBe(p.stdout.toString());

    p = run(["schema", "--json"], root);
    expect(p.exitCode).toBe(0);
    const schema = JSON.parse(p.stdout.toString());
    expect(schema.schema_version).toBe(1);
    expect(Array.isArray(schema.files)).toBeTrue();
  });

  test("help shows timeline alias on one line", () => {
    root = setupFixture();
    const p = run(["--help"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("timeline        Display an ASCII Gantt chart of the project timeline (alias: tl)");
    expect(out).not.toContain("\n  tl             Display an ASCII Gantt chart of the project timeline.");
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

  test("idea command creates planning intake under .tasks/ideas", () => {
    root = setupFixture();
    const p = run(["idea", "add integration tests using gpt-oss-120 via groq"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Created idea:");

    const indexText = readFileSync(join(root, ".tasks", "ideas", "index.yaml"), "utf8");
    expect(indexText).toContain("id: I001");
    const fileMatch = indexText.match(/file:\s*(\S+)/);
    expect(fileMatch).toBeTruthy();

    const ideaText = readFileSync(join(root, ".tasks", "ideas", fileMatch![1]!), "utf8");
    expect(ideaText).toContain("Run `/plan-task");
    expect(ideaText).toContain("tasks add");
    expect(ideaText).toContain("tasks bug");
  });

  test("bug accepts positional description as simple title", () => {
    root = setupFixture();
    const p = run(["bug", "fix flaky integration test"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("Created bug:");
    expect(out).not.toContain("IMPORTANT");

    const bugsIndexText = readFileSync(join(root, ".tasks", "bugs", "index.yaml"), "utf8");
    const fileMatch = bugsIndexText.match(/file:\s*(\S+)/);
    expect(fileMatch).toBeTruthy();

    const bugText = readFileSync(join(root, ".tasks", "bugs", fileMatch![1]!), "utf8");
    expect(bugText).toContain("title: fix flaky integration test");
    expect(bugText).not.toContain("## Steps to Reproduce");
  });

  test("grab prioritizes normal tasks over ideas", () => {
    root = setupFixture();
    let p = run(["idea", "collect future refactor idea"], root);
    expect(p.exitCode).toBe(0);

    p = run(["grab", "--single", "--agent", "agent-priority", "--no-content"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("P1.M1.E1.T001");
    expect(out).not.toContain("I001");
  });

  test("grab prioritizes bugs over normal tasks", () => {
    root = setupFixture();
    let p = run(["bug", "--title", "tiny low bug", "--estimate", "0.1", "--complexity", "low", "--priority", "low", "--simple"], root);
    expect(p.exitCode).toBe(0);

    p = run(["grab", "--single", "--agent", "agent-priority", "--no-content"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("B001");
  });

  test("grab auto-selected bug fans out to additional bugs", () => {
    root = setupFixture();
    let p = run(["bug", "--title", "bug one", "--simple"], root);
    expect(p.exitCode).toBe(0);
    p = run(["bug", "--title", "bug two", "--simple"], root);
    expect(p.exitCode).toBe(0);
    p = run(["bug", "--title", "bug three", "--simple"], root);
    expect(p.exitCode).toBe(0);

    p = run(["grab", "--agent", "agent-fanout", "--single", "--no-content"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("B001");
    expect(out).toContain("B002");
    expect(out).toContain("B003");
    expect(out.toLowerCase()).toContain("parallel");
  });

  test("list and next include idea tasks", () => {
    root = setupFixture();
    const t001Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    const t002Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo");
    writeFileSync(t001Path, readFileSync(t001Path, "utf8").replace("status: pending", "status: done"));
    writeFileSync(t002Path, readFileSync(t002Path, "utf8").replace("status: pending", "status: done"));

    let p = run(["idea", "capture planning work"], root);
    expect(p.exitCode).toBe(0);

    p = run(["list"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Ideas");
    expect(p.stdout.toString()).toContain("I001: capture planning work");

    p = run(["next", "--json"], root);
    expect(p.exitCode).toBe(0);
    expect(JSON.parse(p.stdout.toString()).id).toBe("I001");
  });

  test("list --bugs and --ideas filter auxiliary sections", () => {
    root = setupFixture();

    let p = run(["bug", "--title", "critical bug", "--simple"], root);
    expect(p.exitCode).toBe(0);

    p = run(["idea", "future planning idea"], root);
    expect(p.exitCode).toBe(0);

    p = run(["list", "--bugs"], root);
    expect(p.exitCode).toBe(0);
    const bugsOut = p.stdout.toString();
    expect(bugsOut).toContain("Bugs");
    expect(bugsOut).toContain("B001");
    expect(bugsOut).not.toContain("Ideas");
    expect(bugsOut).not.toContain("Phase");

    p = run(["list", "--ideas"], root);
    expect(p.exitCode).toBe(0);
    const ideasOut = p.stdout.toString();
    expect(ideasOut).toContain("Ideas");
    expect(ideasOut).toContain("I001");
    expect(ideasOut).not.toContain("Bugs");
    expect(ideasOut).not.toContain("Phase");
  });

  test("grab can claim idea tasks", () => {
    root = setupFixture();
    const t001Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    const t002Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo");
    writeFileSync(t001Path, readFileSync(t001Path, "utf8").replace("status: pending", "status: done"));
    writeFileSync(t002Path, readFileSync(t002Path, "utf8").replace("status: pending", "status: done"));

    let p = run(["idea", "capture architecture idea"], root);
    expect(p.exitCode).toBe(0);

    p = run(["grab", "--single", "--agent", "agent-idea", "--no-content"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("I001");

    const indexText = readFileSync(join(root, ".tasks", "ideas", "index.yaml"), "utf8");
    const fileMatch = indexText.match(/file:\s*(\S+)/);
    expect(fileMatch).toBeTruthy();
    const ideaText = readFileSync(join(root, ".tasks", "ideas", fileMatch![1]!), "utf8");
    expect(ideaText).toContain("status: in_progress");
    expect(ideaText).toContain("claimed_by: agent-idea");
  });

  test("enhanced list command shows milestones with task counts", () => {
    root = setupFixture();
    let p = run(["list"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("Phase (0/2 tasks done)");
    expect(out).toContain("M (0/2 tasks done)");
  });

  test("list --all shows all milestones", () => {
    root = setupFixture();
    // Add more milestones to test truncation
    const t = join(root, ".tasks");
    for (let i = 2; i <= 7; i++) {
      mkdirSync(join(t, "01-phase", `0${i}-ms`), { recursive: true });
      writeFileSync(join(t, "01-phase", `0${i}-ms`, "index.yaml"), `epics: []\n`);
    }
    const phaseIndex = join(t, "01-phase", "index.yaml");
    let content = `milestones:\n  - id: M1\n    name: M\n    path: 01-ms\n`;
    for (let i = 2; i <= 7; i++) {
      content += `  - id: M${i}\n    name: M${i}\n    path: 0${i}-ms\n`;
    }
    writeFileSync(phaseIndex, content);

    let p = run(["list"], root);
    expect(p.exitCode).toBe(0);
    let out = p.stdout.toString();
    expect(out).toContain("... and 2 more milestones");

    p = run(["list", "--all"], root);
    expect(p.exitCode).toBe(0);
    out = p.stdout.toString();
    expect(out).not.toContain("... and");
    expect(out).toContain("M7");
  });

  test("list --unfinished filters completed items", () => {
    root = setupFixture();
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "test"], root);
    expect(p.exitCode).toBe(0);
    p = run(["done", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);

    p = run(["list", "--unfinished"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    // Stats should show actual completion (1/2), not filtered view
    expect(out).toContain("Phase (1/2 tasks done)");
    expect(out).toContain("M (1/2 tasks done)");
  });

  test("list --json includes milestone metadata", () => {
    root = setupFixture();
    let p = run(["list", "--json"], root);
    expect(p.exitCode).toBe(0);
    const data = JSON.parse(p.stdout.toString());
    expect(Array.isArray(data.phases)).toBeTrue();
    expect(data.phases[0].milestones).toBeDefined();
    expect(data.phases[0].milestones[0].stats).toBeDefined();
    expect(data.phases[0].milestones[0].stats.total).toBe(2);
  });

  test("list --progress shows phase and milestone IDs", () => {
    root = setupFixture();
    // Complete a task so the phase has progress and milestones are displayed
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "test"], root);
    expect(p.exitCode).toBe(0);
    p = run(["done", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);

    p = run(["list", "--progress"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("P1: Phase");
    expect(out).toContain("P1.M1:");
    expect(out).toContain("Project Progress");
  });

  test("list --progress --unfinished filters completed items", () => {
    root = setupFixture();
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "test"], root);
    expect(p.exitCode).toBe(0);
    p = run(["done", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);

    p = run(["list", "--progress", "--unfinished"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("P1: Phase");
  });

  test("tree command shows full 4-level hierarchy", () => {
    root = setupFixture();
    let p = run(["tree"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("Phase");
    expect(out).toContain("M (0/2)");
    expect(out).toContain("E (0/2)");
    expect(out).toContain("P1.M1.E1.T001");
    expect(out).toContain("P1.M1.E1.T002");
    expect(out).toContain("├──");
    expect(out).toContain("└──");
  });

  test("tree --unfinished filters completed work", () => {
    root = setupFixture();
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "test"], root);
    expect(p.exitCode).toBe(0);
    p = run(["done", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);

    p = run(["tree", "--unfinished"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).not.toContain("P1.M1.E1.T001");
    expect(out).toContain("P1.M1.E1.T002");
  });

  test("tree hides completed bugs by default and can include via flag", () => {
    root = setupFixture(true);
    const bugPath = join(root, ".tasks", "bugs", "B001-critical-bug.todo");
    let bugText = readFileSync(bugPath, "utf8");
    bugText = bugText.replace("status: pending", "status: done");
    writeFileSync(bugPath, bugText);

    let p = run(["tree"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).not.toContain("B001: Critical Bug");

    p = run(["tree", "--show-completed-aux"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("B001: Critical Bug");
  });

  test("tree --details shows metadata", () => {
    root = setupFixture();
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "agent-x"], root);
    expect(p.exitCode).toBe(0);

    p = run(["tree", "--details"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("@agent-x");
    expect(out).toContain("(1h)");
    expect(out).toContain("[in_progress]");
    expect(out).toContain("depends:P1.M1.E1.T001");
  });

  test("tree --depth limits expansion correctly", () => {
    root = setupFixture();
    let p = run(["tree", "--depth", "1"], root);
    expect(p.exitCode).toBe(0);
    let out = p.stdout.toString();
    expect(out).toContain("Phase");
    expect(out).not.toContain("M (0/2)");

    p = run(["tree", "--depth", "2"], root);
    expect(p.exitCode).toBe(0);
    out = p.stdout.toString();
    expect(out).toContain("Phase");
    expect(out).toContain("M (0/2)");
    expect(out).not.toContain("E (0/2)");

    p = run(["tree", "--depth", "3"], root);
    expect(p.exitCode).toBe(0);
    out = p.stdout.toString();
    expect(out).toContain("Phase");
    expect(out).toContain("M (0/2)");
    expect(out).toContain("E (0/2)");
    expect(out).not.toContain("P1.M1.E1.T001");
  });

  test("tree --json outputs complete hierarchy", () => {
    root = setupFixture();
    let p = run(["tree", "--json"], root);
    expect(p.exitCode).toBe(0);
    const data = JSON.parse(p.stdout.toString());
    expect(data.max_depth).toBe(4);
    expect(data.show_details).toBe(false);
    expect(data.unfinished_only).toBe(false);
    expect(Array.isArray(data.phases)).toBeTrue();
    expect(data.phases[0].milestones[0].epics[0].tasks.length).toBe(2);
  });

  test("tree handles empty epics gracefully", () => {
    root = setupFixture();
    const t = join(root, ".tasks");
    mkdirSync(join(t, "01-phase", "01-ms", "02-empty"), { recursive: true });
    writeFileSync(join(t, "01-phase", "01-ms", "02-empty", "index.yaml"), `tasks: []\n`);
    const msIndex = join(t, "01-phase", "01-ms", "index.yaml");
    writeFileSync(
      msIndex,
      `epics:\n  - id: E1\n    name: E\n    path: 01-epic\n  - id: E2\n    name: Empty\n    path: 02-empty\n`,
    );

    let p = run(["tree"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("Empty (0/0)");
  });

  test("list and tree show consistent task counts", () => {
    root = setupFixture();
    let listOut = run(["list"], root);
    expect(listOut.exitCode).toBe(0);
    let treeOut = run(["tree"], root);
    expect(treeOut.exitCode).toBe(0);

    const listStr = listOut.stdout.toString();
    const treeStr = treeOut.stdout.toString();

    expect(listStr).toContain("(0/2 tasks done)");
    expect(treeStr).toContain("(0/2)");
  });
});
