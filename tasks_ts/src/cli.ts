#!/usr/bin/env bun
import pc from "picocolors";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import { CriticalPathCalculator } from "./critical_path";
import { clearContext, findEpic, findMilestone, findPhase, findTask, getAllTasks, getCurrentTaskId, isTaskFileMissing, loadConfig, loadContext, setCurrentTask } from "./helpers";
import { TaskLoader } from "./loader";
import { Status, TaskPath } from "./models";
import { claimTask, completeTask, StatusError, updateStatus } from "./status";
import { utcNow } from "./time";

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
  console.log(`Usage: tasks <command> [options]\n\nCore commands: list show next claim done update work unclaim blocked`);
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
    case "done":
      await cmdDone(rest);
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
    default:
      // Temporary compatibility fallback while remaining commands are ported.
      await delegateToPython(args);
  }
}

await main();
