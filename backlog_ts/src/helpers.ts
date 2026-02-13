import { existsSync, readFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import type { Epic, Milestone, Phase, Task, TaskTree } from "./models";
import { getDataDir, getDataDirName } from "./data_dir";

export function getAllTasks(tree: TaskTree): Task[] {
  return [
    ...tree.phases.flatMap((p) => p.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks))),
    ...(tree.bugs ?? []),
    ...(tree.ideas ?? []),
  ];
}

export function isBugId(id: string): boolean {
  return /^B\d+$/.test(id);
}

export function isIdeaId(id: string): boolean {
  return /^I\d+$/.test(id);
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

export function taskFilePath(task: Task, tasksDir?: string): string {
  return join(tasksDir ?? getDataDirName(), task.file);
}

export function isTaskFileMissing(task: Task, tasksDir?: string): boolean {
  return !existsSync(taskFilePath(task, tasksDir));
}

function contextFile(): string {
  return join(getDataDirName(), ".context.yaml");
}

function sessionsFile(): string {
  return join(getDataDirName(), ".sessions.yaml");
}

export async function loadContext(): Promise<Record<string, unknown>> {
  const ctxFile = contextFile();
  if (!existsSync(ctxFile)) return {};
  return (parse(await readFile(ctxFile, "utf8")) as Record<string, unknown>) ?? {};
}

export async function clearContext(): Promise<void> {
  const ctxFile = contextFile();
  if (existsSync(ctxFile)) {
    await unlink(ctxFile);
  }
}

export async function getCurrentTaskId(agent?: string): Promise<string | undefined> {
  const ctxFile = contextFile();
  if (!existsSync(ctxFile)) return undefined;
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
  await writeFile(contextFile(), stringify(data));
}

export function loadConfig(tasksDir?: string): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    agent: { default_agent: "cli-user", auto_claim_after_done: false },
    session: { heartbeat_timeout_minutes: 15 },
    stale_claim: { warn_after_minutes: 60, error_after_minutes: 120 },
    complexity_multipliers: { low: 1, medium: 1.25, high: 1.5, critical: 2 },
  };
  const dir = tasksDir ?? getDataDirName();
  const path = join(dir, "config.yaml");
  if (!existsSync(path)) return defaults;
  const loaded = (parse(readFileSync(path, "utf8")) as Record<string, unknown>) ?? {};
  return {
    ...defaults,
    ...loaded,
    agent: { ...(defaults.agent as object), ...((loaded.agent as object) ?? {}) },
    session: { ...(defaults.session as object), ...((loaded.session as object) ?? {}) },
    stale_claim: { ...(defaults.stale_claim as object), ...((loaded.stale_claim as object) ?? {}) },
    complexity_multipliers: {
      ...(defaults.complexity_multipliers as object),
      ...((loaded.complexity_multipliers as object) ?? {}),
    },
  };
}

export async function loadSessions(): Promise<Record<string, unknown>> {
  const sessFile = sessionsFile();
  if (!existsSync(sessFile)) return {};
  return (parse(await readFile(sessFile, "utf8")) as Record<string, unknown>) ?? {};
}

export async function saveSessions(sessions: Record<string, unknown>): Promise<void> {
  await writeFile(sessionsFile(), stringify(sessions));
}

export async function startSession(agentId: string, taskId?: string): Promise<Record<string, unknown>> {
  const sessions = await loadSessions();
  const now = new Date().toISOString();
  const current = (sessions[agentId] as Record<string, unknown> | undefined) ?? {};
  sessions[agentId] = {
    started_at: (current.started_at as string | undefined) ?? now,
    last_heartbeat: now,
    current_task: taskId ?? (current.current_task as string | undefined) ?? null,
    progress: current.progress ?? null,
  };
  await saveSessions(sessions);
  return sessions[agentId] as Record<string, unknown>;
}

export async function updateSessionHeartbeat(agentId: string, progress?: string): Promise<boolean> {
  const sessions = await loadSessions();
  const existing = sessions[agentId] as Record<string, unknown> | undefined;
  if (!existing) return false;
  existing.last_heartbeat = new Date().toISOString();
  if (progress) existing.progress = progress;
  sessions[agentId] = existing;
  await saveSessions(sessions);
  return true;
}

export async function endSession(agentId: string): Promise<boolean> {
  const sessions = await loadSessions();
  if (!(agentId in sessions)) return false;
  delete sessions[agentId];
  await saveSessions(sessions);
  return true;
}

export async function getStaleSessions(timeoutMinutes = 15): Promise<Array<Record<string, unknown>>> {
  const sessions = await loadSessions();
  const now = Date.now();
  const stale: Array<Record<string, unknown>> = [];

  for (const [agentId, data] of Object.entries(sessions)) {
    const sess = data as Record<string, unknown>;
    const hbIso = String(sess.last_heartbeat ?? new Date().toISOString());
    const ageMinutes = Math.floor((now - new Date(hbIso).getTime()) / 60000);
    if (ageMinutes > timeoutMinutes) {
      stale.push({
        agent_id: agentId,
        current_task: (sess.current_task as string | null) ?? null,
        age_minutes: ageMinutes,
        progress: (sess.progress as string | null) ?? null,
      });
    }
  }

  return stale;
}

export async function getActiveSessions(): Promise<Array<Record<string, unknown>>> {
  const sessions = await loadSessions();
  const now = Date.now();
  const active: Array<Record<string, unknown>> = [];

  for (const [agentId, data] of Object.entries(sessions)) {
    const sess = data as Record<string, unknown>;
    const startedIso = String(sess.started_at ?? new Date().toISOString());
    const hbIso = String(sess.last_heartbeat ?? new Date().toISOString());
    active.push({
      agent_id: agentId,
      current_task: (sess.current_task as string | null) ?? null,
      started_at: startedIso,
      duration_minutes: Math.floor((now - new Date(startedIso).getTime()) / 60000),
      last_heartbeat_minutes: Math.floor((now - new Date(hbIso).getTime()) / 60000),
      progress: (sess.progress as string | null) ?? null,
    });
  }

  return active;
}
