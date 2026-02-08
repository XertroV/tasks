#!/usr/bin/env bun
import pc from "picocolors";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import { CriticalPathCalculator } from "./critical_path";
import { clearContext, endSession, findEpic, findMilestone, findPhase, findTask, getAllTasks, getCurrentTaskId, isTaskFileMissing, loadConfig, loadContext, loadSessions, saveSessions, setCurrentTask, startSession, updateSessionHeartbeat } from "./helpers";
import { TaskLoader } from "./loader";
import { Status, TaskPath } from "./models";
import { claimTask, completeTask, StatusError, updateStatus } from "./status";
import { utcNow } from "./time";
import { runChecks } from "./check";

function parseFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function parseOpt(args: string[], name: string): string | undefined {
  const exact = args.find((a) => a.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function jsonOut(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2));
}

function textError(message: string): never {
  console.error(pc.red(`Error: ${message}`));
  process.exit(1);
}

function usage(): void {
  console.log(`Usage: tasks <command> [options]\n\nCore commands: list show next claim grab done cycle update work unclaim blocked session check data report`);
}

async function cmdList(args: string[]): Promise<void> {
  const outputJson = parseFlag(args, "--json");
  const statusFilter = parseOpt(args, "--status")?.split(",") ?? [];
  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { criticalPath, nextAvailable } = calc.calculate();
  tree.criticalPath = criticalPath;
  tree.nextAvailable = nextAvailable;

  const tasks = getAllTasks(tree).filter((t) => (statusFilter.length ? statusFilter.includes(t.status) : true));
  if (outputJson) {
    jsonOut({
      critical_path: criticalPath,
      next_available: nextAvailable,
      phases: tree.phases.map((p) => ({ id: p.id, name: p.name, status: p.status })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        estimate_hours: t.estimateHours,
        complexity: t.complexity,
        priority: t.priority,
        on_critical_path: criticalPath.includes(t.id),
      })),
    });
    return;
  }

  console.log(pc.cyan("Critical Path:"), criticalPath.slice(0, 10).join(" -> "));
  for (const p of tree.phases) {
    console.log(`${pc.bold(p.name)} (${p.id})`);
  }
}

async function cmdNext(args: string[]): Promise<void> {
  const outputJson = parseFlag(args, "--json");
  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { nextAvailable } = calc.calculate();

  if (!nextAvailable) {
    console.log("No available tasks found.");
    return;
  }
  const task = findTask(tree, nextAvailable);
  if (!task) textError(`Task not found: ${nextAvailable}`);

  if (outputJson) {
    jsonOut({
      id: task.id,
      title: task.title,
      file: task.file,
      file_exists: !isTaskFileMissing(task),
      estimate_hours: task.estimateHours,
      complexity: task.complexity,
    });
    return;
  }
  console.log(`${task.id}: ${task.title}`);
}

async function cmdShow(args: string[]): Promise<void> {
  const loader = new TaskLoader();
  const tree = await loader.load();
  let ids = args.filter((a) => !a.startsWith("-"));
  if (!ids.length) {
    const current = await getCurrentTaskId();
    if (!current) {
      console.log("No task specified and no current working task set.");
      return;
    }
    ids = [current];
  }

  for (const id of ids) {
    const path = TaskPath.parse(id);
    if (path.isPhase) {
      const phase = findPhase(tree, id);
      if (!phase) textError(`Phase not found: ${id}`);
      console.log(`${phase.id} ${phase.name}`);
      continue;
    }
    if (path.isMilestone) {
      const m = findMilestone(tree, id);
      if (!m) textError(`Milestone not found: ${id}`);
      console.log(`${m.id} ${m.name}`);
      continue;
    }
    if (path.isEpic) {
      const e = findEpic(tree, id);
      if (!e) textError(`Epic not found: ${id}`);
      console.log(`${e.id} ${e.name}`);
      continue;
    }
    const t = findTask(tree, id);
    if (!t) textError(`Task not found: ${id}`);
    console.log(`${t.id}: ${t.title}\nstatus=${t.status} estimate=${t.estimateHours}`);
  }
}

async function cmdClaim(args: string[]): Promise<void> {
  const taskId = args.find((a) => !a.startsWith("-"));
  if (!taskId) textError("claim requires TASK_ID");
  const agent = parseOpt(args, "--agent") ?? ((loadConfig().agent as Record<string, unknown>)?.default_agent as string) ?? "cli-user";
  const force = parseFlag(args, "--force");
  const loader = new TaskLoader();
  const tree = await loader.load();
  const task = findTask(tree, taskId);
  if (!task) textError(`Task not found: ${taskId}`);
  if (isTaskFileMissing(task)) textError(`Cannot claim ${task.id} because the task file is missing.`);

  try {
    claimTask(task, agent, force);
    await loader.saveTask(task);
    await setCurrentTask(task.id, agent);
    console.log(`Claimed: ${task.id}`);
  } catch (e) {
    if (e instanceof StatusError) {
      jsonOut(e.toJSON());
      process.exit(1);
    }
    throw e;
  }
}

async function cmdGrab(args: string[]): Promise<void> {
  const agent = parseOpt(args, "--agent") ?? ((loadConfig().agent as Record<string, unknown>)?.default_agent as string) ?? "cli-user";
  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { nextAvailable } = calc.calculate();
  if (!nextAvailable) {
    console.log("No available tasks found.");
    return;
  }
  const task = findTask(tree, nextAvailable);
  if (!task) textError(`Task not found: ${nextAvailable}`);
  if (isTaskFileMissing(task)) textError(`Cannot claim ${task.id} because the task file is missing.`);

  claimTask(task, agent, false);
  await loader.saveTask(task);
  await setCurrentTask(task.id, agent);
  console.log(`Grabbed: ${task.id} - ${task.title}`);
}

async function cmdDone(args: string[]): Promise<void> {
  let taskId = args.find((a) => !a.startsWith("-"));
  if (!taskId) taskId = await getCurrentTaskId();
  if (!taskId) textError("No task ID provided and no current working task set.");

  const loader = new TaskLoader();
  const tree = await loader.load();
  const task = findTask(tree, taskId);
  if (!task) textError(`Task not found: ${taskId}`);

  try {
    if (task.startedAt) {
      task.durationMinutes = (utcNow().getTime() - task.startedAt.getTime()) / 60000;
    }
    completeTask(task);
    await loader.saveTask(task);
    console.log(`Completed: ${task.id}`);
  } catch (e) {
    if (e instanceof StatusError) {
      jsonOut(e.toJSON());
      process.exit(1);
    }
    throw e;
  }
}

async function cmdCycle(args: string[]): Promise<void> {
  let taskId = args.find((a) => !a.startsWith("-"));
  if (!taskId) taskId = await getCurrentTaskId();
  if (!taskId) textError("No task ID provided and no current working task set.");
  const agent = parseOpt(args, "--agent") ?? ((loadConfig().agent as Record<string, unknown>)?.default_agent as string) ?? "cli-user";

  const loader = new TaskLoader();
  const tree = await loader.load();
  const task = findTask(tree, taskId);
  if (!task) textError(`Task not found: ${taskId}`);

  try {
    if (task.startedAt) {
      task.durationMinutes = (utcNow().getTime() - task.startedAt.getTime()) / 60000;
    }
    completeTask(task);
    await loader.saveTask(task);
    console.log(`Completed: ${task.id}`);
  } catch (e) {
    if (e instanceof StatusError) {
      jsonOut(e.toJSON());
      process.exit(1);
    }
    throw e;
  }

  const refreshed = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(refreshed, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { nextAvailable } = calc.calculate();
  if (!nextAvailable) {
    await clearContext();
    console.log("No more available tasks.");
    return;
  }
  const nextTask = findTask(refreshed, nextAvailable);
  if (!nextTask) {
    await clearContext();
    console.log("No more available tasks.");
    return;
  }
  claimTask(nextTask, agent, false);
  await loader.saveTask(nextTask);
  await setCurrentTask(nextTask.id, agent);
  console.log(`Grabbed: ${nextTask.id} - ${nextTask.title}`);
}

async function cmdUpdate(args: string[]): Promise<void> {
  const pos = args.filter((a) => !a.startsWith("-"));
  const taskId = pos[0];
  const newStatus = pos[1];
  if (!taskId || !newStatus) textError("update requires TASK_ID STATUS");
  const reason = parseOpt(args, "--reason");
  const loader = new TaskLoader();
  const tree = await loader.load();
  const task = findTask(tree, taskId);
  if (!task) textError(`Task not found: ${taskId}`);

  try {
    updateStatus(task, newStatus as Status, reason);
    await loader.saveTask(task);
    console.log(`Updated: ${task.id} -> ${task.status}`);
  } catch (e) {
    if (e instanceof StatusError) {
      jsonOut(e.toJSON());
      process.exit(1);
    }
    throw e;
  }
}

async function cmdWork(args: string[]): Promise<void> {
  const clear = parseFlag(args, "--clear");
  const taskId = args.find((a) => !a.startsWith("-"));
  if (clear) {
    await clearContext();
    console.log("Cleared working task context.");
    return;
  }

  const loader = new TaskLoader();
  const tree = await loader.load();

  if (taskId) {
    const task = findTask(tree, taskId);
    if (!task) textError(`Task not found: ${taskId}`);
    await setCurrentTask(taskId);
    console.log(`Working task set: ${task.id} - ${task.title}`);
    return;
  }

  const ctx = await loadContext();
  const current = (ctx.current_task as string | undefined) ?? (ctx.primary_task as string | undefined);
  if (!current) {
    console.log("No current working task set.");
    return;
  }
  const task = findTask(tree, current);
  if (!task) {
    console.log(`Working task '${current}' not found in tree.`);
    return;
  }
  console.log("Current Working Task");
  console.log(`ID: ${task.id}`);
  console.log(`Title: ${task.title}`);
  console.log(`Status: ${task.status}`);
  console.log(`Estimate: ${task.estimateHours} hours`);
  console.log(`File: .tasks/${task.file}`);
}

async function cmdUnclaim(args: string[]): Promise<void> {
  let taskId = args.find((a) => !a.startsWith("-"));
  if (!taskId) taskId = await getCurrentTaskId();
  if (!taskId) textError("No task ID provided and no current working task set.");

  const loader = new TaskLoader();
  const tree = await loader.load();
  const task = findTask(tree, taskId);
  if (!task) textError(`Task not found: ${taskId}`);
  if (task.status !== Status.IN_PROGRESS) {
    console.log(`Task is not in progress: ${task.status}`);
    return;
  }
  updateStatus(task, Status.PENDING, "unclaim");
  await loader.saveTask(task);
  await clearContext();
  console.log(`Unclaimed: ${task.id} - ${task.title}`);
}

async function cmdBlocked(args: string[]): Promise<void> {
  if (!parseFlag(args, "--no-grab")) {
    await delegateToPython(["blocked", ...args]);
  }
  let taskId = args.find((a) => !a.startsWith("-"));
  const reason = parseOpt(args, "--reason") ?? parseOpt(args, "-r");
  if (!reason) textError("blocked requires --reason");
  if (!taskId) taskId = await getCurrentTaskId();
  if (!taskId) textError("No task ID provided and no current working task set.");

  const loader = new TaskLoader();
  const tree = await loader.load();
  const task = findTask(tree, taskId);
  if (!task) textError(`Task not found: ${taskId}`);
  updateStatus(task, Status.BLOCKED, reason);
  await loader.saveTask(task);
  await clearContext();
  console.log(`Blocked: ${task.id} (${reason})`);
}

async function cmdSync(): Promise<void> {
  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { criticalPath, nextAvailable } = calc.calculate();

  const rootPath = join(".tasks", "index.yaml");
  const root = parse(readFileSync(rootPath, "utf8")) as Record<string, unknown>;
  root.critical_path = criticalPath;
  root.next_available = nextAvailable ?? null;
  root.stats = {
    total_tasks: getAllTasks(tree).length,
    done: getAllTasks(tree).filter((t) => t.status === Status.DONE).length,
    in_progress: getAllTasks(tree).filter((t) => t.status === Status.IN_PROGRESS).length,
    blocked: getAllTasks(tree).filter((t) => t.status === Status.BLOCKED).length,
    pending: getAllTasks(tree).filter((t) => t.status === Status.PENDING).length,
  };
  Bun.write(rootPath, stringify(root));
  console.log("Synced");
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function computeStats(tree: { phases: Array<{ milestones: Array<{ epics: Array<{ tasks: Array<{ status: Status }> }> }> }> }): {
  total_tasks: number;
  done: number;
  in_progress: number;
  pending: number;
  blocked: number;
} {
  const all = tree.phases.flatMap((p) => p.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks)));
  return {
    total_tasks: all.length,
    done: all.filter((t) => t.status === Status.DONE).length,
    in_progress: all.filter((t) => t.status === Status.IN_PROGRESS).length,
    pending: all.filter((t) => t.status === Status.PENDING).length,
    blocked: all.filter((t) => t.status === Status.BLOCKED).length,
  };
}

async function cmdData(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const loader = new TaskLoader();
  const tree = await loader.load();
  const scope = parseOpt(rest, "--scope");

  if (!sub || sub === "--help") {
    console.log("Usage: tasks data <summary|export> [options]");
    return;
  }

  if (sub === "summary") {
    const outputFormat = parseOpt(rest, "--format") ?? "text";
    const stats = computeStats(tree);
    const total = stats.total_tasks;
    const done = stats.done;
    const pct = total > 0 ? (done / total) * 100 : 0;
    const summary = {
      project: tree.project,
      timestamp: new Date().toISOString(),
      overall: {
        total_tasks: total,
        done,
        in_progress: stats.in_progress,
        pending: stats.pending,
        blocked: stats.blocked,
        percent_complete: Number(pct.toFixed(1)),
      },
      phases: tree.phases.map((p) => {
        const tasks = p.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks));
        const pDone = tasks.filter((t) => t.status === Status.DONE).length;
        const pTotal = tasks.length;
        return {
          id: p.id,
          name: p.name,
          done: pDone,
          total: pTotal,
          percent_complete: Number((pTotal ? (pDone / pTotal) * 100 : 0).toFixed(1)),
        };
      }),
    };
    if (outputFormat === "json") {
      jsonOut(summary);
      return;
    }
    console.log(tree.project);
    console.log(`Overall: ${done}/${total} tasks (${pct.toFixed(1)}%)`);
    return;
  }

  if (sub === "export") {
    const outputFormat = parseOpt(rest, "--format") ?? "json";
    const output = parseOpt(rest, "--output") ?? parseOpt(rest, "-o");
    const includeContent = parseFlag(rest, "--include-content");
    const pretty = !rest.includes("--pretty=false");
    const stats = computeStats(tree);
    const exportData = {
      exported_at: new Date().toISOString(),
      project: tree.project,
      description: tree.description ?? "",
      timeline_weeks: tree.timelineWeeks ?? 0,
      stats,
      phases: tree.phases
        .filter((p) => (scope ? p.id.startsWith(scope) || scope.startsWith(p.id) : true))
        .map((p) => ({
          id: p.id,
          name: p.name,
          path: p.path,
          status: p.status,
          weeks: p.weeks,
          estimate_hours: p.estimateHours,
          priority: p.priority,
          depends_on: p.dependsOn,
          milestones: p.milestones
            .filter((m) => (scope ? m.id.startsWith(scope) || scope.startsWith(m.id) : true))
            .map((m) => ({
              id: m.id,
              name: m.name,
              path: m.path,
              status: m.status,
              estimate_hours: m.estimateHours,
              complexity: m.complexity,
              depends_on: m.dependsOn,
              epics: m.epics
                .filter((e) => (scope ? e.id.startsWith(scope) || scope.startsWith(e.id) : true))
                .map((e) => ({
                  id: e.id,
                  name: e.name,
                  path: e.path,
                  status: e.status,
                  estimate_hours: e.estimateHours,
                  complexity: e.complexity,
                  depends_on: e.dependsOn,
                  tasks: e.tasks
                    .filter((t) => (scope ? t.id.startsWith(scope) : true))
                    .map((t) => ({
                      id: t.id,
                      title: t.title,
                      file: t.file,
                      status: t.status,
                      estimate_hours: t.estimateHours,
                      complexity: t.complexity,
                      priority: t.priority,
                      depends_on: t.dependsOn,
                      tags: t.tags,
                      claimed_by: t.claimedBy ?? null,
                      claimed_at: t.claimedAt?.toISOString() ?? null,
                      started_at: t.startedAt?.toISOString() ?? null,
                      completed_at: t.completedAt?.toISOString() ?? null,
                      duration_minutes: t.durationMinutes ?? null,
                      ...(includeContent
                        ? { content: existsSync(join(".tasks", t.file)) ? readFileSync(join(".tasks", t.file), "utf8") : null }
                        : {}),
                    })),
                })),
            })),
        })),
    };
    const rendered =
      outputFormat === "yaml"
        ? stringify(exportData)
        : JSON.stringify(exportData, null, pretty ? 2 : undefined);
    if (output) {
      await Bun.write(output, rendered);
      console.log(`Exported to ${output}`);
      return;
    }
    console.log(rendered);
    return;
  }

  await delegateToPython(["data", ...args]);
}

async function cmdReport(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const loader = new TaskLoader();
  const tree = await loader.load();
  const tasks = getAllTasks(tree);

  if (!sub || sub === "--help") {
    console.log("Usage: tasks report <progress|velocity|estimate-accuracy> [options]");
    return;
  }

  if (sub === "progress") {
    const outputFormat = parseOpt(rest, "--format") ?? "text";
    const stats = computeStats(tree);
    const total = stats.total_tasks;
    const done = stats.done;
    const pct = total > 0 ? (done / total) * 100 : 0;
    const phases = tree.phases.map((p) => {
      const pTasks = p.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks));
      const pStats = {
        total: pTasks.length,
        done: pTasks.filter((t) => t.status === Status.DONE).length,
        in_progress: pTasks.filter((t) => t.status === Status.IN_PROGRESS).length,
        pending: pTasks.filter((t) => t.status === Status.PENDING).length,
        blocked: pTasks.filter((t) => t.status === Status.BLOCKED).length,
      };
      return { id: p.id, name: p.name, ...pStats, percent_complete: Number((pStats.total ? (pStats.done / pStats.total) * 100 : 0).toFixed(1)) };
    });
    const payload = {
      overall: {
        total,
        done,
        in_progress: stats.in_progress,
        pending: stats.pending,
        blocked: stats.blocked,
        percent_complete: Number(pct.toFixed(1)),
      },
      phases,
    };
    if (outputFormat === "json") {
      jsonOut(payload);
      return;
    }
    console.log("Progress Report");
    console.log(`Overall: ${done}/${total} (${pct.toFixed(1)}%)`);
    return;
  }

  if (sub === "velocity") {
    const outputFormat = parseOpt(rest, "--format") ?? "text";
    const days = Number(parseOpt(rest, "--days") ?? "14");
    const now = Date.now();
    const completed = tasks.filter((t) => t.status === Status.DONE && t.completedAt);
    if (!completed.length) {
      console.log("No completed tasks with timestamps found.");
      return;
    }
    const dayData = Array.from({ length: days }, (_, d) => {
      const start = new Date(now - d * 86400000);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 86400000);
      const matching = completed.filter((t) => {
        const ts = t.completedAt!.getTime();
        return ts >= start.getTime() && ts < end.getTime();
      });
      return {
        day: d,
        date: start.toISOString().slice(0, 10),
        tasks_completed: matching.length,
        hours_completed: Number(matching.reduce((acc, t) => acc + t.estimateHours, 0).toFixed(1)),
      };
    });
    const totalCompleted = dayData.reduce((a, b) => a + b.tasks_completed, 0);
    const totalHours = dayData.reduce((a, b) => a + b.hours_completed, 0);
    const payload = {
      days_analyzed: days,
      total_completed: completed.length,
      daily_data: dayData,
      averages: {
        tasks_per_day: Number((totalCompleted / days).toFixed(1)),
        hours_per_day: Number((totalHours / days).toFixed(1)),
      },
    };
    if (outputFormat === "json") {
      jsonOut(payload);
      return;
    }
    console.log("Velocity Report");
    console.log(`Tasks/day: ${payload.averages.tasks_per_day}`);
    return;
  }

  if (sub === "estimate-accuracy") {
    const outputFormat = parseOpt(rest, "--format") ?? "text";
    const withDuration = tasks.filter((t) => t.status === Status.DONE && t.durationMinutes !== undefined);
    if (!withDuration.length) {
      console.log("No completed tasks with duration data found.");
      return;
    }
    const totalEstimated = withDuration.reduce((acc, t) => acc + t.estimateHours, 0);
    const totalActual = withDuration.reduce((acc, t) => acc + (t.durationMinutes ?? 0) / 60, 0);
    const payload = {
      tasks_analyzed: withDuration.length,
      total_estimated_hours: Number(totalEstimated.toFixed(1)),
      total_actual_hours: Number(totalActual.toFixed(1)),
      accuracy_percent: Number((totalActual > 0 ? (totalEstimated / totalActual) * 100 : 0).toFixed(1)),
      average_variance_percent: Number(
        (
          withDuration.reduce((acc, t) => {
            const actual = (t.durationMinutes ?? 0) / 60;
            return acc + (t.estimateHours > 0 ? ((actual - t.estimateHours) / t.estimateHours) * 100 : 0);
          }, 0) / withDuration.length
        ).toFixed(1),
      ),
    };
    if (outputFormat === "json") {
      jsonOut(payload);
      return;
    }
    console.log("Estimate Accuracy Report");
    console.log(`Tasks analyzed: ${payload.tasks_analyzed}`);
    return;
  }

  await delegateToPython(["report", ...args]);
}

async function cmdSession(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  const timeout = Number(((loadConfig().session as Record<string, unknown>)?.heartbeat_timeout_minutes as number | undefined) ?? 15);

  if (!sub || sub === "--help") {
    console.log("Usage: tasks session <start|heartbeat|list|end|clean> [options]");
    return;
  }

  if (sub === "start") {
    const agent = parseOpt(rest, "--agent");
    const task = parseOpt(rest, "--task");
    if (!agent) textError("session start requires --agent");
    const sess = await startSession(agent, task);
    console.log(`Session started: ${agent}`);
    console.log(`Time: ${String(sess.started_at)}`);
    return;
  }

  if (sub === "heartbeat") {
    const agent = parseOpt(rest, "--agent");
    const progress = parseOpt(rest, "--progress");
    if (!agent) textError("session heartbeat requires --agent");
    const ok = await updateSessionHeartbeat(agent, progress);
    if (!ok) {
      console.log(`No active session for '${agent}'`);
      return;
    }
    console.log(`Heartbeat updated for ${agent}`);
    return;
  }

  if (sub === "end") {
    const agent = parseOpt(rest, "--agent");
    if (!agent) textError("session end requires --agent");
    const ok = await endSession(agent);
    console.log(ok ? `Session ended for ${agent}` : `No active session found for '${agent}'`);
    return;
  }

  if (sub === "list") {
    const onlyStale = parseFlag(rest, "--stale");
    const sessions = await loadSessions();
    const now = Date.now();
    const rows = Object.entries(sessions).map(([agent, data]) => {
      const s = data as Record<string, unknown>;
      const started = new Date(String(s.started_at ?? new Date().toISOString())).getTime();
      const hb = new Date(String(s.last_heartbeat ?? new Date().toISOString())).getTime();
      const lastHbMinutes = Math.floor((now - hb) / 60000);
      const durationMinutes = Math.floor((now - started) / 60000);
      return { agent, task: (s.current_task as string | null) ?? "-", progress: (s.progress as string | null) ?? "-", lastHbMinutes, durationMinutes };
    });
    const filtered = onlyStale ? rows.filter((r) => r.lastHbMinutes > timeout) : rows;
    if (!filtered.length) {
      console.log(onlyStale ? "No stale sessions" : "No active sessions");
      return;
    }
    for (const r of filtered) {
      console.log(`${r.agent} task=${r.task} duration=${formatDuration(r.durationMinutes)} last_hb=${r.lastHbMinutes}m progress=${r.progress}`);
    }
    return;
  }

  if (sub === "clean") {
    const sessions = await loadSessions();
    const now = Date.now();
    const cleaned: string[] = [];
    for (const [agent, data] of Object.entries(sessions)) {
      const s = data as Record<string, unknown>;
      const hb = new Date(String(s.last_heartbeat ?? new Date().toISOString())).getTime();
      const lastHbMinutes = Math.floor((now - hb) / 60000);
      if (lastHbMinutes > timeout) {
        delete sessions[agent];
        cleaned.push(agent);
      }
    }
    await saveSessions(sessions);
    console.log(cleaned.length ? `Removed ${cleaned.length} stale session(s)` : "No stale sessions to clean");
    return;
  }

  await delegateToPython(["session", ...args]);
}

async function delegateToPython(args: string[]): Promise<never> {
  const here = dirname(fileURLToPath(import.meta.url));
  const wrapper = join(here, "..", "..", "tasks.py");
  const venvPython = join(here, "..", "..", ".venv", "bin", "python");
  const py = existsSync(venvPython) ? venvPython : "python";
  const proc = Bun.spawn([py, wrapper, ...args], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
  const code = await proc.exited;
  process.exit(code);
}

async function cmdCheck(args: string[]): Promise<void> {
  const asJson = parseFlag(args, "--json");
  const strict = parseFlag(args, "--strict");
  const report = await runChecks();
  if (asJson) {
    jsonOut(report);
  } else if (!report.errors.length && !report.warnings.length) {
    console.log("Consistency check passed with no issues.");
  } else {
    console.log(`Consistency check results: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s)`);
    if (report.errors.length) {
      console.log("Errors:");
      for (const e of report.errors) {
        console.log(`- ${e.code}: ${e.message}${e.location ? ` (${e.location})` : ""}`);
      }
    }
    if (report.warnings.length) {
      console.log("Warnings:");
      for (const w of report.warnings) {
        console.log(`- ${w.code}: ${w.message}${w.location ? ` (${w.location})` : ""}`);
      }
    }
  }
  if (report.errors.length || (strict && report.warnings.length)) {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const rest = args.slice(1);

  if (!cmd || cmd === "--help" || cmd === "help") {
    usage();
    return;
  }
  if (cmd === "--version") {
    console.log("0.1.0");
    return;
  }

  switch (cmd) {
    case "list":
      await cmdList(rest);
      return;
    case "next":
      await cmdNext(rest);
      return;
    case "show":
      await cmdShow(rest);
      return;
    case "claim":
      await cmdClaim(rest);
      return;
    case "grab":
      await cmdGrab(rest);
      return;
    case "done":
      await cmdDone(rest);
      return;
    case "cycle":
      await cmdCycle(rest);
      return;
    case "update":
      await cmdUpdate(rest);
      return;
    case "work":
      await cmdWork(rest);
      return;
    case "unclaim":
      await cmdUnclaim(rest);
      return;
    case "blocked":
      await cmdBlocked(rest);
      return;
    case "session":
      await cmdSession(rest);
      return;
    case "check":
      await cmdCheck(rest);
      return;
    case "data":
      await cmdData(rest);
      return;
    case "report":
      await cmdReport(rest);
      return;
    default:
      // Temporary compatibility fallback while remaining commands are ported.
      await delegateToPython(args);
  }
}

await main();
