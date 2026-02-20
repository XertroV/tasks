import { describe, expect, test, vi } from "bun:test";
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
    expect(benchmark.index_parse_ms).toBeGreaterThanOrEqual(0);
    expect(benchmark.task_frontmatter_parse_ms).toBeGreaterThanOrEqual(0);
    expect(benchmark.task_body_parse_ms).toBeGreaterThanOrEqual(0);
    expect(benchmark.overall_ms).toBeGreaterThanOrEqual(0);
    expect(benchmark.phase_timings.length).toBe(1);
  });

  test("loadWithBenchmark full mode can skip task body parsing", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-benchmark-nobody-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(tasksDir, { recursive: true });
    writeFileSync(
      join(tasksDir, "index.yaml"),
      `project: Demo\nphases:\n  - id: P1\n    name: Phase\n    path: 01-phase\n`,
      "utf8",
    );
    mkdirSync(join(tasksDir, "01-phase", "01-ms", "01-epic"), { recursive: true });
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
      `tasks:\n  - id: T001\n    file: T001-heavy.todo\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-heavy.todo"),
      `---\nid: P1.M1.E1.T001\ntitle: Heavy Body Task\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Body\n` +
        "x".repeat(2048),
      "utf8",
    );

    const { tree, benchmark } = await new TaskLoader(tasksDir).loadWithBenchmark("full", false);

    expect(benchmark.task_body_parse_ms).toBe(0);
    expect(tree.phases[0]?.milestones[0]?.epics[0]?.tasks[0]?.id).toBe("P1.M1.E1.T001");
  });

  test("loadWithBenchmark index mode avoids todo parsing", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-benchmark-index-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(tasksDir, { recursive: true });
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
      `---\nid: P1.M1.E1.T001\ntitle: Present\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Present\n`,
      "utf8",
    );

    const loader = new TaskLoader(tasksDir);
    const todoFileSpy = vi
      .spyOn(loader as unknown as TaskLoader, "loadTodoFile")
      .mockResolvedValue({ frontmatter: {}, body: "", elapsedMs: 0 });
    const frontmatterSpy = vi
      .spyOn(loader as unknown as TaskLoader, "loadTodoFrontmatter")
      .mockResolvedValue({ frontmatter: {}, elapsedMs: 0 });

    const { benchmark } = await loader.loadWithBenchmark("index");

    expect(todoFileSpy).not.toHaveBeenCalled();
    expect(frontmatterSpy).not.toHaveBeenCalled();
    expect(benchmark.counts.tasks).toBe(2);
    expect(benchmark.missing_task_files).toBe(0);
    expect(benchmark.files.by_type.todo_file).toBe(0);

    todoFileSpy.mockRestore();
    frontmatterSpy.mockRestore();
  });

  test("load with metadata mode uses frontmatter loader", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-metadata-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(tasksDir, { recursive: true });
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
      `tasks:\n  - id: T001\n    file: T001-demo.todo\n    title: Hello\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-demo.todo"),
      `---\nid: P1.M1.E1.T001\ntitle: Hello\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Hello\n`,
      "utf8",
    );

    const loader = new TaskLoader(tasksDir);
    const todoFileSpy = vi
      .spyOn(loader as unknown as TaskLoader, "loadTodoFile")
      .mockResolvedValue({
        frontmatter: {},
        body: "",
        elapsedMs: 0,
      });
    const frontmatterSpy = vi
      .spyOn(loader as unknown as TaskLoader, "loadTodoFrontmatter")
      .mockResolvedValue({
        frontmatter: {
          id: "P1.M1.E1.T001",
          title: "Hello",
          status: "pending",
          estimate_hours: 1,
          complexity: "low",
          priority: "medium",
          depends_on: [],
          tags: [],
        },
        body: "",
        elapsedMs: 0,
      });

    const tree = await loader.load("metadata");
    expect(frontmatterSpy).toHaveBeenCalledTimes(1);
    expect(todoFileSpy).not.toHaveBeenCalled();
    expect(tree.phases[0]?.milestones[0]?.epics[0]?.tasks[0]?.id).toBe(
      "P1.M1.E1.T001",
    );

    todoFileSpy.mockRestore();
    frontmatterSpy.mockRestore();
  });

  test("load with index mode skips todo file parsing", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-index-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(tasksDir, { recursive: true });
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
      `tasks:\n  - id: T001\n    file: T001-index.todo\n    title: Indexed\n    status: pending\n    estimate_hours: 1\n    complexity: low\n    priority: medium\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-index.todo"),
      `---\nid: P1.M1.E1.T001\ntitle: Indexed\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Indexed\n`,
      "utf8",
    );

    const loader = new TaskLoader(tasksDir);
    const todoFileSpy = vi
      .spyOn(loader as unknown as TaskLoader, "loadTodoFile")
      .mockResolvedValue({ frontmatter: {}, body: "", elapsedMs: 0 });
    const frontmatterSpy = vi
      .spyOn(loader as unknown as TaskLoader, "loadTodoFrontmatter")
      .mockResolvedValue({ frontmatter: {}, body: "", elapsedMs: 0 });

    const tree = await loader.load("index");

    expect(todoFileSpy).not.toHaveBeenCalled();
    expect(frontmatterSpy).not.toHaveBeenCalled();
    expect(tree.phases[0]?.milestones[0]?.epics[0]?.tasks[0]?.id).toBe(
      "P1.M1.E1.T001",
    );
    expect(tree.phases[0]?.milestones[0]?.epics[0]?.tasks[0]?.title).toBe("Indexed");

    todoFileSpy.mockRestore();
    frontmatterSpy.mockRestore();
  });

  test("loadScope loads only the requested phase", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-scope-phase-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(tasksDir, { recursive: true });
    writeFileSync(
      join(tasksDir, "index.yaml"),
      `project: Scoped\nphases:\n  - id: P1\n    name: Phase One\n    path: 01-phase-one\n  - id: P2\n    name: Phase Two\n    path: 02-phase-two\n`,
      "utf8",
    );
    mkdirSync(join(tasksDir, "01-phase-one", "01-ms"), { recursive: true });
    mkdirSync(join(tasksDir, "02-phase-two", "01-ms"), { recursive: true });
    writeFileSync(
      join(tasksDir, "01-phase-one", "index.yaml"),
      `milestones:\n  - id: M1\n    name: Milestone One\n    path: 01-ms\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "02-phase-two", "index.yaml"),
      `milestones:\n  - id: M1\n    name: Milestone Two\n    path: 01-ms\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase-one", "01-ms", "index.yaml"),
      `epics:\n  - id: E1\n    name: Epic One\n    path: 01-epic\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "02-phase-two", "01-ms", "index.yaml"),
      `epics:\n  - id: E1\n    name: Epic Two\n    path: 01-epic\n`,
      "utf8",
    );
    mkdirSync(join(tasksDir, "01-phase-one", "01-ms", "01-epic"), { recursive: true });
    mkdirSync(join(tasksDir, "02-phase-two", "01-ms", "01-epic"), { recursive: true });
    writeFileSync(
      join(tasksDir, "01-phase-one", "01-ms", "01-epic", "index.yaml"),
      `tasks:\n  - id: T001\n    file: T001-one.todo\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "02-phase-two", "01-ms", "01-epic", "index.yaml"),
      `tasks:\n  - id: T001\n    file: T001-two.todo\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase-one", "01-ms", "01-epic", "T001-one.todo"),
      `---\nid: P1.M1.E1.T001\ntitle: One\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# One\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "02-phase-two", "01-ms", "01-epic", "T001-two.todo"),
      `---\nid: P2.M1.E1.T001\ntitle: Two\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Two\n`,
      "utf8",
    );

    const loader = new TaskLoader(tasksDir);
    const tree = await loader.loadScope("P2", "metadata");

    expect(tree.phases).toHaveLength(1);
    expect(tree.phases[0]?.id).toBe("P2");
    expect(tree.phases[0]?.milestones[0]?.id).toBe("P2.M1");
    expect(tree.phases[0]?.milestones[0]?.epics[0]?.tasks[0]?.id).toBe(
      "P2.M1.E1.T001",
    );
  });

  test("loadScope filters by epic and task id", async () => {
    const root = mkdtempSync(join(tmpdir(), "tasks-ts-loader-scope-task-"));
    const tasksDir = join(root, ".tasks");
    mkdirSync(tasksDir, { recursive: true });
    writeFileSync(
      join(tasksDir, "index.yaml"),
      `project: Scoped\nphases:\n  - id: P1\n    name: Phase\n    path: 01-phase\n`,
      "utf8",
    );
    mkdirSync(join(tasksDir, "01-phase", "01-ms"), { recursive: true });
    writeFileSync(
      join(tasksDir, "01-phase", "index.yaml"),
      `milestones:\n  - id: M1\n    name: Milestone\n    path: 01-ms\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "index.yaml"),
      `epics:\n  - id: E1\n    name: Epic One\n    path: 01-epic\n  - id: E2\n    name: Epic Two\n    path: 02-epic\n`,
      "utf8",
    );
    mkdirSync(join(tasksDir, "01-phase", "01-ms", "01-epic"), { recursive: true });
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "index.yaml"),
      `tasks:\n  - id: T001\n    file: T001-a.todo\n  - id: T002\n    file: T002-b.todo\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-a.todo"),
      `---\nid: T001\ntitle: First\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# First\n`,
      "utf8",
    );
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T002-b.todo"),
      `---\nid: T002\ntitle: Second\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\ndepends_on: []\ntags: []\n---\n# Second\n`,
      "utf8",
    );

    const loader = new TaskLoader(tasksDir);
    const epicTree = await loader.loadScope("P1.M1.E1", "metadata");
    expect(epicTree.phases).toHaveLength(1);
    expect(epicTree.phases[0]?.milestones).toHaveLength(1);
    expect(epicTree.phases[0]?.milestones[0]?.epics).toHaveLength(1);
    expect(epicTree.phases[0]?.milestones[0]?.epics[0]?.id).toBe("P1.M1.E1");

    const taskTree = await loader.loadScope("P1.M1.E1.T002", "metadata");
    expect(taskTree.phases).toHaveLength(1);
    expect(taskTree.phases[0]?.milestones).toHaveLength(1);
    expect(taskTree.phases[0]?.milestones[0]?.epics).toHaveLength(1);
    expect(taskTree.phases[0]?.milestones[0]?.epics[0]?.tasks).toHaveLength(1);
    expect(taskTree.phases[0]?.milestones[0]?.epics[0]?.tasks[0]?.id).toBe(
      "P1.M1.E1.T002",
    );
  });
});
