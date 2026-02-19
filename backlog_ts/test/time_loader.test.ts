import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TaskLoader } from "../src/loader";
import { isoOrNull, toUtc } from "../src/time";
import { Status } from "../src/models";

describe("time", () => {
  test("toUtc parses and throws", () => {
    expect(toUtc("2026-01-01T00:00:00Z").toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(() => toUtc("bad-datetime")).toThrow();
  });

  test("isoOrNull", () => {
    expect(isoOrNull(null)).toBeNull();
    expect(isoOrNull(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("loader", () => {
  test("loads minimal tree and saves task", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(tasksDir, { recursive: true });
    writeFileSync(
      join(tasksDir, "index.yaml"),
      `project: Demo\nphases:\n  - id: P1\n    name: Phase\n    path: 01-phase\n`,
    );
    mkdirSync(join(tasksDir, "01-phase", "01-ms", "01-epic"), { recursive: true });
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
      `tasks:\n  - id: T001\n    file: T001-demo.todo\n    title: Hello\n`,
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-demo.todo"),
      `---\nid: P1.M1.E1.T001\ntitle: Hello\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Hello\n`,
    );

    const loader = new TaskLoader(tasksDir);
    const tree = await loader.load();
    expect(tree.project).toBe("Demo");
    expect(tree.phases.length).toBe(1);
    const task = tree.phases[0]?.milestones[0]?.epics[0]?.tasks[0];
    expect(task?.id).toBe("P1.M1.E1.T001");

    if (!task) throw new Error("Task missing");
    task.status = Status.IN_PROGRESS;
    await loader.saveTask(task);

    const updated = await Bun.file(join(tasksDir, task.file)).text();
    expect(updated).toContain("status: in_progress");
  });

  test("accepts estimated_hours alias while loading", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-alias-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(join(tasksDir, "01-phase", "01-ms", "01-epic"), { recursive: true });
    writeFileSync(
      join(tasksDir, "index.yaml"),
      `project: Demo\nphases:\n  - id: P1\n    name: Phase\n    path: 01-phase\n    estimated_hours: 10\n`,
    );
    writeFileSync(
      join(tasksDir, "01-phase", "index.yaml"),
      `milestones:\n  - id: M1\n    name: Milestone\n    path: 01-ms\n    estimated_hours: 8\n`,
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "index.yaml"),
      `epics:\n  - id: E1\n    name: Epic\n    path: 01-epic\n    estimated_hours: 6\n`,
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "index.yaml"),
      `tasks:\n  - id: T001\n    file: T001-demo.todo\n    title: Hello\n    estimated_hours: 4\n`,
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-demo.todo"),
      `---\nid: P1.M1.E1.T001\ntitle: Hello\nstatus: pending\nestimated_hours: 3\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Hello\n`,
    );

    const tree = await new TaskLoader(tasksDir).load();
    const phase = tree.phases[0];
    const milestone = phase?.milestones[0];
    const epic = milestone?.epics[0];
    const task = epic?.tasks[0];

    expect(phase?.estimateHours).toBe(10);
    expect(milestone?.estimateHours).toBe(8);
    expect(epic?.estimateHours).toBe(6);
    expect(task?.estimateHours).toBe(3);
  });

  test("maps completed status alias to done", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-status-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(join(tasksDir, "01-phase", "01-ms", "01-epic"), { recursive: true });
    writeFileSync(
      join(tasksDir, "index.yaml"),
      `project: Demo\nphases:\n  - id: P1\n    name: Phase\n    path: 01-phase\n`,
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
      `tasks:\n  - id: T001\n    file: T001-demo.todo\n    title: Hello\n    status: completed\n`,
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-demo.todo"),
      `---\nid: P1.M1.E1.T001\ntitle: Hello\nstatus: completed\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Hello\n`,
    );

    const tree = await new TaskLoader(tasksDir).load();
    const task = tree.phases[0]?.milestones[0]?.epics[0]?.tasks[0];
    expect(task?.status).toBe(Status.DONE);
  });

  test("loadWithBenchmark returns counts for files, tasks, and missing files", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-benchmark-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(join(tasksDir, "01-phase", "01-ms", "01-epic"), { recursive: true });
    writeFileSync(
      join(tasksDir, "index.yaml"),
      `project: Demo\nphases:\n  - id: P1\n    name: Phase\n    path: 01-phase\n`,
    "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "index.yaml"),
      `milestones:\n  - id: M1\n    name: Milestone\n    path: 01-ms\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "index.yaml"),
      `epics:\n  - id: E1\n    name: Epic\n    path: 01-epic\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "index.yaml"),
      `tasks:\n  - id: T001\n    file: T001-present.todo\n  - id: T002\n    file: T002-missing.todo\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-present.todo"),
      `---\nid: P1.M1.E1.T001\ntitle: Present task\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Present Task\n`,
      "utf8",
    );

    const { benchmark } = await new TaskLoader(tasksDir).loadWithBenchmark();

    expect(benchmark.counts.phases).toBe(1);
    expect(benchmark.counts.milestones).toBe(1);
    expect(benchmark.counts.epics).toBe(1);
    expect(benchmark.counts.tasks).toBe(2);
    expect(benchmark.missing_task_files).toBe(1);
    expect(benchmark.files.by_type.root_index).toBe(1);
    expect(benchmark.files.by_type.todo_file).toBe(1);
    expect(benchmark.files.total).toBeGreaterThan(4);
    expect(benchmark.overall_ms).toBeGreaterThanOrEqual(0);
    expect(benchmark.phase_timings.length).toBe(1);
  });
});
