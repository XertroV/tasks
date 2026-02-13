import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TaskPath, type Task, Status, Complexity, Priority } from "../src/models";
import { StatusError } from "../src/status";
import { clearContext, endSession, findEpic, findMilestone, findPhase, getCurrentTaskId, isTaskFileMissing, loadConfig, loadContext, loadSessions, saveSessions, setCurrentTask, startSession, taskFilePath, updateSessionHeartbeat } from "../src/helpers";
import { TaskLoader } from "../src/loader";

let priorCwd = process.cwd();
let tempDir = "";

afterEach(() => {
  if (tempDir) {
    process.chdir(priorCwd);
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("targeted coverage", () => {
  test("TaskPath type guards and mutators", () => {
    const p = TaskPath.forPhase("P9");
    expect(p.isPhase).toBeTrue();
    expect(p.isMilestone).toBeFalse();

    const m = p.withMilestone("M2");
    expect(m.isMilestone).toBeTrue();

    const e = m.withEpic("E3");
    expect(e.isEpic).toBeTrue();

    const t = e.withTask("T010");
    expect(t.isTask).toBeTrue();
  });

  test("StatusError toJSON", () => {
    const err = new StatusError("msg", "CODE", { a: 1 }, "hint");
    const payload = err.toJSON();
    expect(payload.error).toBe("CODE");
    expect(payload.message).toBe("msg");
  });

  test("helpers context and missing file checks", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "tasks-ts-helper-"));
    priorCwd = process.cwd();
    process.chdir(tempDir);
    mkdirSync(".tasks", { recursive: true });

    await setCurrentTask("P1.M1.E1.T001", "agent-x");
    expect(await getCurrentTaskId("agent-x")).toBe("P1.M1.E1.T001");
    expect(await getCurrentTaskId("agent-y")).toBeUndefined();

    const task: Task = {
      id: "P1.M1.E1.T001",
      title: "x",
      file: "missing.todo",
      status: Status.PENDING,
      estimateHours: 1,
      complexity: Complexity.LOW,
      priority: Priority.LOW,
      dependsOn: [],
      tags: [],
    };
    expect(taskFilePath(task)).toContain(".tasks");
    expect(isTaskFileMissing(task)).toBeTrue();
  });

  test("helper find* and config merging", () => {
    const tree = {
      project: "X",
      criticalPath: [],
      phases: [
        {
          id: "P1",
          name: "P",
          path: "01-p",
          status: Status.PENDING,
          weeks: 1,
          estimateHours: 1,
          priority: Priority.MEDIUM,
          dependsOn: [],
          milestones: [
            {
              id: "P1.M1",
              name: "M",
              path: "01-m",
              status: Status.PENDING,
              estimateHours: 1,
              complexity: Complexity.LOW,
              dependsOn: [],
              epics: [
                {
                  id: "P1.M1.E1",
                  name: "E",
                  path: "01-e",
                  status: Status.PENDING,
                  estimateHours: 1,
                  complexity: Complexity.LOW,
                  dependsOn: [],
                  tasks: [],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(findPhase(tree, "P1")?.id).toBe("P1");
    expect(findMilestone(tree, "P1.M1")?.id).toBe("P1.M1");
    expect(findEpic(tree, "P1.M1.E1")?.id).toBe("P1.M1.E1");

    tempDir = mkdtempSync(join(tmpdir(), "tasks-ts-config-"));
    priorCwd = process.cwd();
    mkdirSync(join(tempDir, ".tasks"), { recursive: true });
    writeFileSync(
      join(tempDir, ".tasks", "config.yaml"),
      "agent:\n  default_agent: ai-agent\ncomplexity_multipliers:\n  high: 9\n",
    );
    process.chdir(tempDir);
    const cfg = loadConfig();
    expect((cfg.agent as Record<string, unknown>).default_agent).toBe("ai-agent");
    expect((cfg.complexity_multipliers as Record<string, unknown>).high).toBe(9);
    expect((cfg.stale_claim as Record<string, unknown>).warn_after_minutes).toBe(60);
  });

  test("loader writeYaml and id normalization branch", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "tasks-ts-loader2-"));
    priorCwd = process.cwd();

    const tasksDir = join(tempDir, ".tasks");
    mkdirSync(join(tasksDir, "01-phase", "01-ms", "01-epic"), { recursive: true });
    writeFileSync(join(tasksDir, "index.yaml"), "project: Demo\nphases:\n  - id: P1\n    name: P\n    path: 01-phase\n");
    writeFileSync(join(tasksDir, "01-phase", "index.yaml"), "milestones:\n  - id: M1\n    name: M\n    path: 01-ms\n");
    writeFileSync(join(tasksDir, "01-phase", "01-ms", "index.yaml"), "epics:\n  - id: E1\n    name: E\n    path: 01-epic\n");
    writeFileSync(join(tasksDir, "01-phase", "01-ms", "01-epic", "index.yaml"), "tasks:\n  - file: T001-a.todo\n");
    writeFileSync(
      join(tasksDir, "01-phase", "01-ms", "01-epic", "T001-a.todo"),
      "---\nid: T001\ntitle: A\nstatus: pending\nestimate_hours: 1\ncomplexity: low\npriority: medium\n---\n# A\n",
    );

    const loader = new TaskLoader(tasksDir);
    const tree = await loader.load();
    expect(tree.phases[0]?.milestones[0]?.epics[0]?.tasks[0]?.id).toBe("P1.M1.E1.T001");

    const out = join(tasksDir, "tmp", "x.yaml");
    await loader.writeYaml(out, { ok: true });
    expect(readFileSync(out, "utf8")).toContain("ok: true");
  });

  test("session helper lifecycle and context clear", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "tasks-ts-session-"));
    priorCwd = process.cwd();
    process.chdir(tempDir);
    mkdirSync(".tasks", { recursive: true });

    await saveSessions({});
    expect(Object.keys(await loadSessions())).toHaveLength(0);

    const sess = await startSession("agent-h", "P1.M1.E1.T001");
    expect(sess.current_task).toBe("P1.M1.E1.T001");
    expect((await loadSessions())["agent-h"]).toBeDefined();

    expect(await updateSessionHeartbeat("agent-h", "progressing")).toBeTrue();
    expect(await updateSessionHeartbeat("missing-agent")).toBeFalse();

    expect(await endSession("agent-h")).toBeTrue();
    expect(await endSession("agent-h")).toBeFalse();

    await setCurrentTask("P1.M1.E1.T001", "agent-h");
    expect((await loadContext()).current_task).toBe("P1.M1.E1.T001");
    await clearContext();
    expect(await loadContext()).toEqual({});
  });
});
