import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

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

function run(args: string[], cwd: string, extraEnv: NodeJS.ProcessEnv = {}) {
  const cliPath = join(fileURLToPath(new URL("..", import.meta.url)), "src", "cli.ts");
  return Bun.spawnSync(["bun", "run", cliPath, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...extraEnv },
  });
}

function runWithColor(args: string[], cwd: string) {
  return run(args, cwd, { FORCE_COLOR: "1", TERM: "xterm-256color" });
}

function updateTodoFrontmatter(taskPath: string, mutate: (frontmatter: Record<string, any>) => void): void {
  const content = readFileSync(taskPath, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error(`Missing frontmatter in ${taskPath}`);
  }

  const frontmatter = parse(match[1] as string) as Record<string, any>;
  mutate(frontmatter);

  const body = content.slice(match[0].length);
  writeFileSync(taskPath, `---\n${stringify(frontmatter)}---\n${body}`);
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

  test("list --available includes bugs and ideas", () => {
    root = setupFixture(true);

    const idea = run(["idea", "capture planning intake"], root);
    expect(idea.exitCode).toBe(0);

    const list = run(["list", "--available"], root);
    expect(list.exitCode).toBe(0);
    const output = list.stdout.toString();
    expect(output).toContain("B001: Critical Bug");
    expect(output).toContain("I001: capture planning intake");
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

  test("claim accepts multiple task ids", () => {
    root = setupFixture();
    const p = run([
      "claim",
      "P1.M1.E1.T001",
      "P1.M1.E1.T002",
      "--agent",
      "agent-z",
    ], root);

    expect(p.exitCode).toBe(0);
    const output = p.stdout.toString();
    expect(output).toContain("Claimed: P1.M1.E1.T001");
    expect(output).toContain("✓ Claimed: P1.M1.E1.T002 - B");

    const taskOne = readFileSync(
      join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"),
      "utf8",
    );
    const taskTwo = readFileSync(
      join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo"),
      "utf8",
    );
    expect(taskOne).toContain("status: in_progress");
    expect(taskTwo).toContain("status: in_progress");
  });

  test("done refuses to complete a non-in-progress task", () => {
    root = setupFixture();
    const todoPath = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    let todo = readFileSync(todoPath, "utf8");
    todo = todo.replace("status: pending", "status: blocked");
    writeFileSync(todoPath, todo);

    const p = run(["done", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(1);
    expect(p.stdout.toString()).toContain("INVALID_STATUS");
    expect(readFileSync(todoPath, "utf8")).toContain("status: blocked");
  });

  test("done --force marks non-in-progress task as done", () => {
    root = setupFixture();
    const todoPath = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    let todo = readFileSync(todoPath, "utf8");
    todo = todo.replace("status: pending", "status: blocked");
    writeFileSync(todoPath, todo);

    const p = run(["done", "--force", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Completed:");
    expect(readFileSync(todoPath, "utf8")).toContain("status: done");
  });

  test("done supports multiple task ids", () => {
    root = setupFixture(true);

    updateTodoFrontmatter(
      join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"),
      (frontmatter) => {
        frontmatter.status = "in_progress";
      },
    );
    updateTodoFrontmatter(
      join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo"),
      (frontmatter) => {
        frontmatter.status = "in_progress";
      },
    );
    updateTodoFrontmatter(
      join(root, ".tasks", "bugs", "B001-critical-bug.todo"),
      (frontmatter) => {
        frontmatter.status = "in_progress";
      },
    );

    const p = run(
      ["done", "P1.M1.E1.T001", "P1.M1.E1.T002", "B001"],
      root,
    );

    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Completed:");
    expect(p.stdout.toString()).toContain("P1.M1.E1.T001");
    expect(p.stdout.toString()).toContain("P1.M1.E1.T002");

    expect(readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"), "utf8")).toContain("status: done");
    expect(readFileSync(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo"), "utf8")).toContain("status: done");
    expect(readFileSync(join(root, ".tasks", "bugs", "B001-critical-bug.todo"), "utf8")).toContain("status: done");
  });

  test("done marks completed hierarchy levels and locks phase", () => {
    root = setupFixture();

    updateTodoFrontmatter(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"), (frontmatter) => {
      frontmatter.status = "done";
    });
    updateTodoFrontmatter(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo"), (frontmatter) => {
      frontmatter.status = "in_progress";
      frontmatter.claimed_by = "agent-c";
    });

    const p = run(["done", "P1.M1.E1.T002"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Completed: P1.M1.E1.T002");
    expect(p.stdout.toString()).toContain("EPIC COMPLETE");
    expect(p.stdout.toString()).toContain("MILESTONE COMPLETE");
    expect(p.stdout.toString()).toContain("PHASE COMPLETE");

    const rootIndex = parse(readFileSync(join(root, ".tasks", "index.yaml"), "utf8")) as {
      phases: Array<{ id: string; status: string; locked?: boolean }>;
    };
    const phaseEntry = rootIndex.phases.find((p) => p.id === "P1");
    expect(phaseEntry?.status).toBe("done");
    expect(phaseEntry?.locked).toBeTrue();

    const phaseIndex = parse(readFileSync(join(root, ".tasks", "01-phase", "index.yaml"), "utf8")) as {
      status?: string;
      locked?: boolean;
    };
    expect(phaseIndex.status).toBe("done");
    expect(phaseIndex.locked).toBeTrue();

    const milestoneIndex = parse(readFileSync(join(root, ".tasks", "01-phase", "01-ms", "index.yaml"), "utf8")) as {
      status?: string;
      epics: Array<{ id: string; status?: string }>;
    };
    expect(milestoneIndex.status).toBe("done");
    const epicEntry = milestoneIndex.epics.find((e) => e.id === "E1");
    expect(epicEntry?.status).toBe("done");

    const addErr = run(["add", "P1.M1.E1", "--title", "Blocked"], root);
    const addOutput = `${addErr.stdout.toString()}${addErr.stderr.toString()}`;
    expect(addErr.exitCode).not.toBe(0);
    expect(addOutput).toContain("has been closed and cannot accept new tasks");

    const unlock = run(["unlock", "P1"], root);
    expect(unlock.exitCode).toBe(0);
    expect(unlock.stdout.toString()).toContain("Unlocked: P1");

    const allowedAdd = run(["add", "P1.M1.E1", "--title", "Allowed"], root);
    expect(allowedAdd.exitCode).toBe(0);
    expect(allowedAdd.stdout.toString()).toContain("Created task:");
  });

  test("undone resets single task to pending", () => {
    root = setupFixture();
    const todoPath = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    let todo = readFileSync(todoPath, "utf8");
    todo = todo.replace("status: pending", "status: done");
    writeFileSync(todoPath, todo);

    const p = run(["undone", "P1.M1.E1.T001"], root);
    expect(p.exitCode).toBe(0);
    expect(readFileSync(todoPath, "utf8")).toContain("status: pending");
  });

  test("undone resets phase hierarchy and descendant tasks", () => {
    root = setupFixture();
    const t001Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    const t002Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo");
    writeFileSync(t001Path, readFileSync(t001Path, "utf8").replace("status: pending", "status: done"));
    writeFileSync(t002Path, readFileSync(t002Path, "utf8").replace("status: pending", "status: done"));

    const rootIndexPath = join(root, ".tasks", "index.yaml");
    writeFileSync(
      rootIndexPath,
      readFileSync(rootIndexPath, "utf8").replace("path: 01-phase\n", "path: 01-phase\n    status: done\n"),
    );
    const phaseIndexPath = join(root, ".tasks", "01-phase", "index.yaml");
    writeFileSync(
      phaseIndexPath,
      readFileSync(phaseIndexPath, "utf8").replace("path: 01-ms\n", "path: 01-ms\n    status: done\n"),
    );
    const msIndexPath = join(root, ".tasks", "01-phase", "01-ms", "index.yaml");
    writeFileSync(
      msIndexPath,
      readFileSync(msIndexPath, "utf8").replace("path: 01-epic\n", "path: 01-epic\n    status: done\n"),
    );

    const p = run(["undone", "P1"], root);
    expect(p.exitCode).toBe(0);
    expect(readFileSync(rootIndexPath, "utf8")).toContain("status: pending");
    expect(readFileSync(phaseIndexPath, "utf8")).toContain("status: pending");
    expect(readFileSync(msIndexPath, "utf8")).toContain("status: pending");
    expect(readFileSync(t001Path, "utf8")).toContain("status: pending");
    expect(readFileSync(t002Path, "utf8")).toContain("status: pending");
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

  test("cycle stops auto-grab when phase is completed", () => {
    root = setupFixture();
    updateTodoFrontmatter(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo"), (frontmatter) => {
      frontmatter.status = "done";
    });
    updateTodoFrontmatter(join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo"), (frontmatter) => {
      frontmatter.status = "in_progress";
      frontmatter.claimed_by = "agent-c";
    });

    const p = run(["cycle", "P1.M1.E1.T002", "--agent", "agent-c"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Completed: P1.M1.E1.T002");
    expect(p.stdout.toString()).toContain("Review Required");
    expect(p.stdout.toString()).toContain("PHASE COMPLETE");
    expect(p.stdout.toString()).not.toContain("Grabbed:");
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

  test("check accepts task dependencies on existing epic", () => {
    root = setupFixture();
    const milestoneIndex = join(root, ".tasks", "01-phase", "01-ms", "index.yaml");
    const milestoneData = parse(readFileSync(milestoneIndex, "utf8")) as { epics: Array<{ id: string; name: string; path: string }> };
    milestoneData.epics.push({ id: "E2", name: "Epic 2", path: "02-epic" });
    writeFileSync(milestoneIndex, `${stringify(milestoneData)}\n`);

    const epicDir = join(root, ".tasks", "01-phase", "01-ms", "02-epic");
    mkdirSync(epicDir, { recursive: true });
    const epicTask = join(epicDir, "T003-blocker.task");
    writeFileSync(
      join(epicDir, "index.yaml"),
      `tasks:
  - id: T001
    title: Blocker
    file: T003-blocker.task
    status: pending
    estimate_hours: 1
    complexity: low
    priority: medium
`,
    );
    writeFileSync(
      epicTask,
      `---
id: P1.M1.E2.T001
title: Blocker
status: pending
estimate_hours: 1
complexity: low
priority: medium
depends_on: []
tags: []
---`,
    );

    const taskPath = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo");
    updateTodoFrontmatter(taskPath, (frontmatter) => {
      frontmatter.depends_on = ["E2"];
    });

    const p = run(["check"], root);
    expect(p.exitCode).toBe(0);
  });

  test("check fails when task dependency references missing epic", () => {
    root = setupFixture();
    const taskPath = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo");
    updateTodoFrontmatter(taskPath, (frontmatter) => {
      frontmatter.depends_on = ["E2"];
    });

    const p = run(["check", "--json"], root);
    expect(p.exitCode).toBe(1);
    expect(p.stdout.toString()).toContain("missing_task_dependency");
    expect(p.stdout.toString()).toContain("E2");
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

    p = run(["bug", "fix flaky integration test"], root);
    expect(p.exitCode).toBe(0);
    p = run(["idea", "capture future optimization idea"], root);
    expect(p.exitCode).toBe(0);

    p = run(["report", "progress", "--format", "json"], root);
    expect(p.exitCode).toBe(0);
    const progress = JSON.parse(p.stdout.toString());
    expect(progress.overall.total).toBe(2);
    expect(progress.auxiliary.bugs.total).toBe(1);
    expect(progress.auxiliary.ideas.total).toBe(1);
    expect(progress.bugs[0].id).toBe("B001");
    expect(progress.ideas[0].id).toBe("I001");

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
    expect(p.stdout.toString()).toContain("Auxiliary:");
    expect(p.stdout.toString()).toContain("All Bugs");
    expect(p.stdout.toString()).toContain("All Ideas");

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

  test("lock/unlock gates add commands for epic, milestone, and phase", () => {
    root = setupFixture();

    let p = run(["lock", "P1.M1.E1"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("Locked: P1.M1.E1");

    p = run(["add", "P1.M1.E1", "--title", "Blocked"], root);
    expect(p.exitCode).not.toBe(0);
    const addErr = `${p.stdout.toString()}\n${p.stderr.toString()}`;
    expect(addErr).toContain("has been closed and cannot accept new tasks");
    expect(addErr.toLowerCase()).toContain("agent should create a new epic");

    p = run(["unlock", "P1.M1.E1"], root);
    expect(p.exitCode).toBe(0);
    p = run(["add", "P1.M1.E1", "--title", "Allowed"], root);
    expect(p.exitCode).toBe(0);

    p = run(["lock", "P1.M1"], root);
    expect(p.exitCode).toBe(0);
    p = run(["add-epic", "P1.M1", "--title", "Blocked Epic"], root);
    expect(p.exitCode).not.toBe(0);
    const addEpicErr = `${p.stdout.toString()}\n${p.stderr.toString()}`;
    expect(addEpicErr).toContain("has been closed and cannot accept new epics");

    p = run(["lock", "P1"], root);
    expect(p.exitCode).toBe(0);
    p = run(["add-milestone", "P1", "--title", "Blocked Milestone"], root);
    expect(p.exitCode).not.toBe(0);
    const addMsErr = `${p.stdout.toString()}\n${p.stderr.toString()}`;
    expect(addMsErr).toContain("has been closed and cannot accept new milestones");
  });

  test("move task to different epic renumbers ID", () => {
    root = setupFixture();
    const tasksRoot = join(root, ".tasks");
    mkdirSync(join(tasksRoot, "01-phase", "01-ms", "02-target-epic"), { recursive: true });
    writeFileSync(
      join(tasksRoot, "01-phase", "01-ms", "index.yaml"),
      [
        "epics:",
        "  - id: E1",
        "    name: E",
        "    path: 01-epic",
        "  - id: E2",
        "    name: Target",
        "    path: 02-target-epic",
        "",
      ].join("\n"),
    );
    writeFileSync(join(tasksRoot, "01-phase", "01-ms", "02-target-epic", "index.yaml"), "id: P1.M1.E2\nname: Target\ntasks: []\n");

    const p = run(["move", "P1.M1.E1.T001", "--to", "P1.M1.E2"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("New ID: P1.M1.E2.T001");

    const movedPath = join(tasksRoot, "01-phase", "01-ms", "02-target-epic", "T001-a.todo");
    expect(existsSync(movedPath)).toBeTrue();
    expect(readFileSync(movedPath, "utf8")).toContain("id: P1.M1.E2.T001");
  });

  test("move epic to different milestone remaps descendant task IDs", () => {
    root = setupFixture();
    const tasksRoot = join(root, ".tasks");
    mkdirSync(join(tasksRoot, "01-phase", "02-ms"), { recursive: true });
    writeFileSync(
      join(tasksRoot, "01-phase", "index.yaml"),
      [
        "milestones:",
        "  - id: M1",
        "    name: M",
        "    path: 01-ms",
        "  - id: M2",
        "    name: M2",
        "    path: 02-ms",
        "",
      ].join("\n"),
    );
    writeFileSync(join(tasksRoot, "01-phase", "02-ms", "index.yaml"), "epics: []\n");

    const p = run(["move", "P1.M1.E1", "--to", "P1.M2"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("New ID: P1.M2.E1");

    const movedTaskPath = join(tasksRoot, "01-phase", "02-ms", "01-e", "T001-a.todo");
    expect(existsSync(movedTaskPath)).toBeTrue();
    expect(readFileSync(movedTaskPath, "utf8")).toContain("id: P1.M2.E1.T001");
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
    expect(ideaText).toContain("estimate_hours: 10");
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

  test("grab auto-selected bug fans out in priority order", () => {
    root = setupFixture();
    let p = run(["bug", "--title", "primary bug", "--priority", "critical", "--simple"], root);
    expect(p.exitCode).toBe(0);
    p = run(["bug", "--title", "low bug", "--priority", "low", "--simple"], root);
    expect(p.exitCode).toBe(0);
    p = run(["bug", "--title", "high bug", "--priority", "high", "--simple"], root);
    expect(p.exitCode).toBe(0);

    p = run(["grab", "--agent", "agent-fanout", "--single", "--no-content"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    const idxB3 = out.indexOf("B003");
    const idxB2 = out.indexOf("B002");
    expect(idxB3).toBeGreaterThan(-1);
    expect(idxB2).toBeGreaterThan(-1);
    expect(idxB3).toBeLessThan(idxB2);
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

  test("list --progress shows yellow in-progress bar segment", () => {
    root = setupFixture();
    let p = run(["claim", "P1.M1.E1.T001", "--agent", "test"], root);
    expect(p.exitCode).toBe(0);

    p = runWithColor(["list", "--progress"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("▓");
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

  test("log command supports json and text output", () => {
    root = setupFixture();
    const now = Date.now();
    const task1Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    const task2Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo");

    updateTodoFrontmatter(task1Path, (frontmatter) => {
      frontmatter.status = "done";
      frontmatter.title = "Task One";
      frontmatter.claimed_by = "agent-a";
      frontmatter.claimed_at = new Date(now - 3 * 60 * 60 * 1000).toISOString();
      frontmatter.started_at = new Date(now - (2.5 * 60 * 60 * 1000)).toISOString();
      frontmatter.completed_at = new Date(now - 60 * 60 * 1000).toISOString();
    });
    updateTodoFrontmatter(task2Path, (frontmatter) => {
      frontmatter.status = "in_progress";
      frontmatter.title = "Task Two";
      frontmatter.claimed_by = "agent-b";
      frontmatter.claimed_at = new Date(now - 90 * 60 * 1000).toISOString();
      frontmatter.started_at = new Date(now - 45 * 60 * 1000).toISOString();
    });

    let p = run(["log", "--json"], root);
    expect(p.exitCode).toBe(0);
    const events = JSON.parse(p.stdout.toString());
    expect(Array.isArray(events)).toBeTrue();
    expect(events[0].task_id).toBe("P1.M1.E1.T002");
    expect(events[0].event).toBe("started");
    expect(events[0].actor).toBe("agent-b");
    expect(events[0].kind).toBe("updated");
    expect(events[1].task_id).toBe("P1.M1.E1.T001");
    expect(events[1].event).toBe("completed");
    expect(events[1].actor).toBe("agent-a");
    expect(events[1].kind).toBe("updated");
    expect(events.some((item: { event: string }) => item.event === "claimed")).toBeTrue();

    p = run(["log", "--limit", "2"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("Recent Activity Log");
    expect(out).toContain("✓");
    expect(out).toContain("P1.M1.E1.T001");
    expect(out).toContain("agent-a");
    expect(out).toContain("[updated]");
  });

  test("log command includes added events without timestamps", () => {
    root = setupFixture();
    let p = run(["log", "--json"], root);
    expect(p.exitCode).toBe(0);

    const events = JSON.parse(p.stdout.toString());
    expect(Array.isArray(events)).toBeTrue();
    expect(events).toHaveLength(2);
    expect(events.every((event: { event: string }) => event.event === "added")).toBeTrue();
    expect(events.every((event: { kind: string }) => event.kind === "created")).toBeTrue();
    expect(events.every((event: { actor: string | null }) => event.actor === null)).toBeTrue();
    expect(events.every((event: { timestamp: string }) => typeof event.timestamp === "string")).toBeTrue();
  });

  test("show on pending idea displays Instructions section", () => {
    root = setupFixture();
    let p = run(["idea", "refactor auth module"], root);
    expect(p.exitCode).toBe(0);

    p = run(["show", "I001"], root);
    expect(p.exitCode).toBe(0);
    const out = p.stdout.toString();
    expect(out).toContain("Instructions:");
    expect(out).toContain("Read the idea file at");
    expect(out).toContain("tasks add-phase");
    expect(out).toContain("tasks add-milestone");
    expect(out).toContain("tasks add-epic");
    expect(out).toContain("tasks add");
    expect(out).toContain("Created Work Items");
    expect(out).toContain("Mark this idea as done");
  });

  test("show on non-pending idea hides Instructions section", () => {
    root = setupFixture();
    // Complete all normal tasks so grab picks the idea
    const t001Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T001-a.todo");
    const t002Path = join(root, ".tasks", "01-phase", "01-ms", "01-epic", "T002-b.todo");
    writeFileSync(t001Path, readFileSync(t001Path, "utf8").replace("status: pending", "status: done"));
    writeFileSync(t002Path, readFileSync(t002Path, "utf8").replace("status: pending", "status: done"));

    let p = run(["idea", "refactor auth module"], root);
    expect(p.exitCode).toBe(0);

    // Claim it to change status to in_progress
    p = run(["grab", "--single", "--agent", "test-agent", "--no-content"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).toContain("I001");

    p = run(["show", "I001"], root);
    expect(p.exitCode).toBe(0);
    expect(p.stdout.toString()).not.toContain("Instructions:");
  });

  test("ls lists all phases", () => {
    root = setupFixture();
    const out = run(["ls"], root).stdout.toString();

    expect(out).toContain("P1: Phase");
    expect(out).toContain("0/2 tasks done");
  });

  test("ls lists milestones for a phase", () => {
    root = setupFixture();
    const out = run(["ls", "P1"], root).stdout.toString();

    expect(out).toContain("P1.M1: M");
    expect(out).toContain("0/2 tasks done");
  });

  test("ls lists epics for a milestone", () => {
    root = setupFixture();
    const out = run(["ls", "P1.M1"], root).stdout.toString();

    expect(out).toContain("P1.M1.E1: E");
    expect(out).toContain("0/2 tasks done");
  });

  test("ls lists tasks for an epic", () => {
    root = setupFixture();
    const out = run(["ls", "P1.M1.E1"], root).stdout.toString();

    expect(out).toContain("P1.M1.E1.T001: A [pending] 1h");
    expect(out).toContain("P1.M1.E1.T002: B [pending] 2h");
  });

  test("ls task alias prints frontmatter summary and show hint", () => {
    root = setupFixture();
    const out = run(["ls", "P1.M1.E1.T001"], root).stdout.toString();

    expect(out).toContain("Task: P1.M1.E1.T001 - A");
    expect(out).toContain("id: P1.M1.E1.T001");
    expect(out).toContain("title: A");
    expect(out).toContain("Body length:");
    expect(out).toContain("Run 'backlog show P1.M1.E1.T001' for full details.");
  });
});
