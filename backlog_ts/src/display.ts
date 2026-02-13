import pc from "picocolors";
import { loadContext, getAllTasks, findTask, loadConfig, getActiveSessions, getStaleSessions } from "./helpers";
import { TaskLoader } from "./loader";
import { CriticalPathCalculator } from "./critical_path";
import { Status, type Task } from "./models";
import { checkStaleClaims } from "./status";

function makeProgressBar(done: number, total: number, width = 20): string {
  if (total === 0) return "░".repeat(width);
  const pct = done / total;
  const filled = Math.floor(width * pct);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function getPhaseStats(phase: { milestones: Array<{ epics: Array<{ tasks: Task[] }> }> }): { done: number; total: number } {
  const tasks = phase.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks));
  return {
    done: tasks.filter((t) => t.status === Status.DONE).length,
    total: tasks.length,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export async function cmdDash(_args: string[]): Promise<void> {
  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { criticalPath, nextAvailable } = calc.calculate();

  const ctx = await loadContext();
  const currentTaskId = (ctx.current_task as string | undefined) ?? (ctx.primary_task as string | undefined);
  const currentAgent = (ctx.agent as string | undefined) ?? "unknown";

  console.log();

  // Header with current task
  if (currentTaskId) {
    const task = findTask(tree, currentTaskId);
    if (task) {
      console.log(pc.bold(pc.cyan("Current Task")));
      console.log(`  ${pc.bold(task.id)} - ${task.title}`);
      console.log(`  Agent: ${currentAgent}`);
      console.log();
    } else {
      console.log(pc.yellow(`⚠ Working task '${currentTaskId}' not found`));
      console.log();
    }
  } else {
    console.log(pc.dim("No current working task set."));
    console.log(pc.dim("Use 'backlog grab' to claim a task."));
    console.log();
  }

  // Progress by phase
  console.log(pc.bold("Progress:"));
  const allTasks = getAllTasks(tree);
  const totalDone = allTasks.filter((t) => t.status === Status.DONE).length;
  const totalTasks = allTasks.length;
  const totalPct = totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0;

  const completedPhases: Array<{ id: string; name: string; total: number }> = [];

  for (const phase of tree.phases) {
    const stats = getPhaseStats(phase);
    const { done, total } = stats;
    const pct = total > 0 ? (done / total) * 100 : 0;

    if (pct === 100) {
      completedPhases.push({ id: phase.id, name: phase.name, total });
      continue;
    }

    const bar = makeProgressBar(done, total);
    const color = pct > 50 ? pc.yellow : pc.white;
    console.log(`  ${color(phase.id)}: ${bar} ${pct.toFixed(1).padStart(5)}% (${done}/${total})`);
  }

  console.log();
  console.log(`  ${pc.bold("Total:")} ${makeProgressBar(totalDone, totalTasks)} ${totalPct.toFixed(1).padStart(5)}% (${totalDone}/${totalTasks})`);

  if (completedPhases.length > 0) {
    const completedStr = completedPhases.map((p) => `${p.id} (${p.total} tasks)`).join(", ");
    console.log();
    console.log(`  ${pc.green("✓ Completed:")} ${completedStr}`);
  }

  // Critical path info
  console.log();
  console.log(pc.bold("Critical Path:"));
  const remainingOnPath = criticalPath.filter((id) => {
    const t = findTask(tree, id);
    return t && t.status !== Status.DONE;
  });

  if (remainingOnPath.length > 0) {
    let totalHours = 0;
    for (const id of remainingOnPath.slice(0, 10)) {
      const t = findTask(tree, id);
      if (t) totalHours += t.estimateHours;
    }

    const pathDisplay = remainingOnPath.slice(0, 5).join(" → ") + (remainingOnPath.length > 5 ? " → ..." : "");
    console.log(`  ${pathDisplay}`);
    console.log(pc.dim(`  ${remainingOnPath.length} tasks, ~${totalHours.toFixed(0)}h remaining`));
  } else {
    console.log(`  ${pc.green("✓ All critical path tasks complete!")}`);
  }

  if (nextAvailable) {
    const nextTask = findTask(tree, nextAvailable);
    if (nextTask) {
      console.log();
      console.log(`  ${pc.bold("Next:")} ${nextTask.id} - ${nextTask.title}`);
    }
  }

  // Status counts
  const blockedCount = allTasks.filter((t) => t.status === Status.BLOCKED).length;
  const inProgressCount = allTasks.filter((t) => t.status === Status.IN_PROGRESS).length;
  const staleClaims = checkStaleClaims(
    allTasks,
    Number(((cfg.stale_claim as Record<string, unknown>)?.warn_after_minutes as number | undefined) ?? 60),
    Number(((cfg.stale_claim as Record<string, unknown>)?.error_after_minutes as number | undefined) ?? 120),
  );
  const timeout = Number(((cfg.session as Record<string, unknown>)?.heartbeat_timeout_minutes as number | undefined) ?? 15);
  const staleSessions = await getStaleSessions(timeout);

  console.log();
  console.log(pc.bold("Status:"));
  console.log(`  In progress: ${inProgressCount}`);
  if (blockedCount > 0) {
    console.log(`  ${pc.red(`Blocked: ${blockedCount}`)}`);
  }
  if (staleClaims.length > 0) {
    console.log(`  ${pc.yellow(`Stale claims: ${staleClaims.length}`)}`);
  }
  if (staleSessions.length > 0) {
    console.log(`  ${pc.yellow(`Stale sessions: ${staleSessions.length}`)}`);
  }

  const active = await getActiveSessions();
  if (active.length > 0) {
    console.log();
    console.log(pc.bold("Active Sessions:"));
    for (const sess of active.slice(0, 5)) {
      const taskInfo = sess.current_task ? ` on ${String(sess.current_task)}` : "";
      console.log(`  ${String(sess.agent_id)}${taskInfo} (${formatDuration(Number(sess.duration_minutes ?? 0))})`);
    }
  }

  console.log();
}
