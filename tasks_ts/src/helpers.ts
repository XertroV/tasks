import { existsSync, readFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import type { Epic, Milestone, Phase, Task, TaskTree } from "./models";

export function getAllTasks(tree: TaskTree): Task[] {
  return tree.phases.flatMap((p) => p.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks)));
}

export function findTask(tree: TaskTree, id: string): Task | undefined {
  return getAllTasks(tree).find((t) => t.id === id);
}

export function findPhase(tree: TaskTree, id: string): Phase | undefined {
  return tree.phases.find((p) => p.id === id);
}

export function findMilestone(tree: TaskTree, id: string): Milestone | undefined {
  return tree.phases.flatMap((p) => p.milestones).find((m) => m.id === id);
}

export function findEpic(tree: TaskTree, id: string): Epic | undefined {
  return tree.phases.flatMap((p) => p.milestones.flatMap((m) => m.epics)).find((e) => e.id === id);
}

export function taskFilePath(task: Task, tasksDir = ".tasks"): string {
  return join(tasksDir, task.file);
}

export function isTaskFileMissing(task: Task, tasksDir = ".tasks"): boolean {
  return !existsSync(taskFilePath(task, tasksDir));
}

const CONTEXT_FILE = ".tasks/.context.yaml";

export async function loadContext(): Promise<Record<string, unknown>> {
  if (!existsSync(CONTEXT_FILE)) return {};
  return (parse(await readFile(CONTEXT_FILE, "utf8")) as Record<string, unknown>) ?? {};
}

export async function clearContext(): Promise<void> {
  if (existsSync(CONTEXT_FILE)) {
    await unlink(CONTEXT_FILE);
  }
}

export async function getCurrentTaskId(agent?: string): Promise<string | undefined> {
  if (!existsSync(CONTEXT_FILE)) return undefined;
  const ctx = await loadContext();
  if (agent && ctx.agent && ctx.agent !== agent) return undefined;
  return (ctx.current_task as string | undefined) ?? (ctx.primary_task as string | undefined);
}

export async function setCurrentTask(taskId: string, agent = "cli-user"): Promise<void> {
  const data = {
    mode: "single",
    agent,
    current_task: taskId,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await writeFile(CONTEXT_FILE, stringify(data));
}

export function loadConfig(tasksDir = ".tasks"): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    agent: { default_agent: "cli-user", auto_claim_after_done: false },
    stale_claim: { warn_after_minutes: 60, error_after_minutes: 120 },
    complexity_multipliers: { low: 1, medium: 1.25, high: 1.5, critical: 2 },
  };
  const path = join(tasksDir, "config.yaml");
  if (!existsSync(path)) return defaults;
  const loaded = (parse(readFileSync(path, "utf8")) as Record<string, unknown>) ?? {};
  return {
    ...defaults,
    ...loaded,
    agent: { ...(defaults.agent as object), ...((loaded.agent as object) ?? {}) },
    stale_claim: { ...(defaults.stale_claim as object), ...((loaded.stale_claim as object) ?? {}) },
    complexity_multipliers: {
      ...(defaults.complexity_multipliers as object),
      ...((loaded.complexity_multipliers as object) ?? {}),
    },
  };
}
