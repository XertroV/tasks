import pc from "picocolors";
import { parseFlag, parseOpt, jsonOut, textError, computeStats } from "./cli";
import { getAllTasks } from "./helpers";
import { TaskLoader } from "./loader";
import { Status, type Epic, type Milestone, type Phase, type Task, type TaskTree } from "./models";

function makeProgressBar(done: number, total: number, width = 20): string {
  if (total === 0) return "░".repeat(width);
  const pct = done / total;
  const filled = Math.floor(width * pct);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function getRemainingHours(tasks: Task[]): number {
  return tasks.filter((t) => t.status !== Status.DONE).reduce((acc, t) => acc + t.estimateHours, 0);
}

function getPhaseTasks(phase: Phase): Task[] {
  return phase.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks));
}

function getMilestoneTasks(milestone: Milestone): Task[] {
  return milestone.epics.flatMap((e) => e.tasks);
}

interface ItemStats {
  total: number;
  done: number;
  in_progress: number;
  pending: number;
  blocked: number;
}

function computeItemStats(tasks: Task[]): ItemStats {
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === Status.DONE).length,
    in_progress: tasks.filter((t) => t.status === Status.IN_PROGRESS).length,
    pending: tasks.filter((t) => t.status === Status.PENDING).length,
    blocked: tasks.filter((t) => t.status === Status.BLOCKED).length,
  };
}

function isComplete(stats: ItemStats): boolean {
  return stats.done === stats.total && stats.total > 0;
}

function statusIcon(stats: ItemStats): string {
  const pct = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
  if (pct === 100) return pc.green("✓");
  if (stats.in_progress > 0) return pc.yellow("→");
  return "[ ]";
}

async function cmdReportProgress(args: string[]): Promise<void> {
  const outputFormat = parseOpt(args, "--format") ?? "text";
  const byEpic = parseFlag(args, "--by-epic");
  const byMilestone = parseFlag(args, "--by-milestone");
  const showAll = parseFlag(args, "--all");

  const loader = new TaskLoader();
  const tree = await loader.load();

  const stats = computeStats(tree);
  const total = stats.total_tasks;
  const done = stats.done;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const detailLevel = byEpic ? 3 : byMilestone ? 2 : 1;

  const allTasks = getAllTasks(tree);
  const overallRemaining = getRemainingHours(allTasks);

  if (outputFormat === "json") {
    const output: Record<string, unknown> = {
      overall: {
        total,
        done,
        in_progress: stats.in_progress,
        pending: stats.pending,
        blocked: stats.blocked,
        percent_complete: Number(pct.toFixed(1)),
        remaining_hours: Number(overallRemaining.toFixed(1)),
      },
      phases: [] as unknown[],
    };

    const phasesArr = output.phases as unknown[];

    for (const phase of tree.phases) {
      const pTasks = getPhaseTasks(phase);
      const pStats = computeItemStats(pTasks);
      const pPct = pStats.total > 0 ? (pStats.done / pStats.total) * 100 : 0;

      if (isComplete(pStats) && !showAll) continue;

      const pRemaining = getRemainingHours(pTasks);
      const phaseData: Record<string, unknown> = {
        id: phase.id,
        name: phase.name,
        total: pStats.total,
        done: pStats.done,
        in_progress: pStats.in_progress,
        pending: pStats.pending,
        blocked: pStats.blocked,
        percent_complete: Number(pPct.toFixed(1)),
        remaining_hours: Number(pRemaining.toFixed(1)),
      };

      if (detailLevel >= 2) {
        const milestones: unknown[] = [];
        for (const m of phase.milestones) {
          const mTasks = getMilestoneTasks(m);
          const mStats = computeItemStats(mTasks);
          const mPct = mStats.total > 0 ? (mStats.done / mStats.total) * 100 : 0;

          if (isComplete(mStats) && !showAll) continue;

          const mRemaining = getRemainingHours(mTasks);
          const mData: Record<string, unknown> = {
            id: m.id,
            name: m.name,
            total: mStats.total,
            done: mStats.done,
            in_progress: mStats.in_progress,
            pending: mStats.pending,
            blocked: mStats.blocked,
            percent_complete: Number(mPct.toFixed(1)),
            remaining_hours: Number(mRemaining.toFixed(1)),
          };

          if (detailLevel >= 3) {
            const epics: unknown[] = [];
            for (const e of m.epics) {
              const eStats = computeItemStats(e.tasks);
              const ePct = eStats.total > 0 ? (eStats.done / eStats.total) * 100 : 0;

              if (isComplete(eStats) && !showAll) continue;

              const eRemaining = getRemainingHours(e.tasks);
              epics.push({
                id: e.id,
                name: e.name,
                total: eStats.total,
                done: eStats.done,
                in_progress: eStats.in_progress,
                pending: eStats.pending,
                blocked: eStats.blocked,
                percent_complete: Number(ePct.toFixed(1)),
                remaining_hours: Number(eRemaining.toFixed(1)),
              });
            }
            mData.epics = epics;
          }

          milestones.push(mData);
        }
        phaseData.milestones = milestones;
      }

      phasesArr.push(phaseData);
    }

    jsonOut(output);
    return;
  }

  // Text output
  console.log();
  console.log(pc.bold(pc.cyan("Progress Report")));
  console.log();

  // Overall
  const bar = makeProgressBar(done, total, 30);
  console.log(`${pc.bold("Overall:")} ${bar} ${pct.toFixed(1).padStart(5)}%`);
  console.log(`  Done: ${done} | In Progress: ${stats.in_progress} | Pending: ${stats.pending} | Blocked: ${stats.blocked}`);
  let totalLine = `  Total: ${total} tasks`;
  if (overallRemaining > 0) {
    totalLine += ` | ~${overallRemaining.toFixed(1)}h remaining`;
  }
  console.log(totalLine);
  console.log();

  // Check if all phases are complete
  const allComplete =
    tree.phases.length > 0 &&
    tree.phases.every((p) => {
      const s = computeItemStats(getPhaseTasks(p));
      return isComplete(s);
    });

  if (allComplete && !showAll) {
    console.log(pc.green("All phases complete.") + " Use --all to show completed phases.");
    console.log();
    return;
  }

  // By phase
  console.log(pc.bold("By Phase:"));
  for (const phase of tree.phases) {
    const pTasks = getPhaseTasks(phase);
    const pStats = computeItemStats(pTasks);
    const pPct = pStats.total > 0 ? (pStats.done / pStats.total) * 100 : 0;

    if (isComplete(pStats) && !showAll) continue;

    const pBar = makeProgressBar(pStats.done, pStats.total, 20);
    const icon = statusIcon(pStats);

    console.log();
    console.log(`  ${icon} ${pc.bold(phase.id)} ${phase.name}`);
    const pRemaining = getRemainingHours(pTasks);
    let pBarLine = `      ${pBar} ${pPct.toFixed(1).padStart(5)}% (${pStats.done}/${pStats.total})`;
    if (pRemaining > 0) {
      pBarLine += `  ~${pRemaining.toFixed(1)}h remaining`;
    }
    console.log(pBarLine);

    if (detailLevel >= 2) {
      for (const m of phase.milestones) {
        const mTasks = getMilestoneTasks(m);
        const mStats = computeItemStats(mTasks);
        const mPct = mStats.total > 0 ? (mStats.done / mStats.total) * 100 : 0;

        if (isComplete(mStats) && !showAll) continue;

        const mBar = makeProgressBar(mStats.done, mStats.total, 15);
        const mRemaining = getRemainingHours(mTasks);
        let mLine = `        ${m.id}: ${mBar} ${Math.round(mPct).toString().padStart(4)}% (${mStats.done}/${mStats.total}) - ${m.name}`;
        if (mRemaining > 0) {
          mLine += `  ~${mRemaining.toFixed(1)}h remaining`;
        }
        console.log(mLine);

        if (detailLevel >= 3) {
          for (const e of m.epics) {
            const eStats = computeItemStats(e.tasks);
            const ePct = eStats.total > 0 ? (eStats.done / eStats.total) * 100 : 0;

            if (isComplete(eStats) && !showAll) continue;

            const eBar = makeProgressBar(eStats.done, eStats.total, 10);
            const eRemaining = getRemainingHours(e.tasks);
            let eLine = `            ${e.id}: ${eBar} ${Math.round(ePct).toString().padStart(4)}% (${eStats.done}/${eStats.total}) - ${e.name}`;
            if (eRemaining > 0) {
              eLine += `  ~${eRemaining.toFixed(1)}h remaining`;
            }
            console.log(eLine);
          }
        }
      }
    }
  }

  console.log();
}

async function cmdReportVelocity(args: string[]): Promise<void> {
  const outputFormat = parseOpt(args, "--format") ?? "text";
  const days = Number(parseOpt(args, "--days") ?? "14");
  const loader = new TaskLoader();
  const tree = await loader.load();
  const tasks = getAllTasks(tree);
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

  const oldestDayWithData = dayData.reduce((oldest, d) => {
    if (d.tasks_completed > 0 || d.hours_completed > 0) return d.day;
    return oldest;
  }, -1);
  const velocityDaysToShow = oldestDayWithData >= 0 ? Math.min(days, oldestDayWithData + 2) : Math.min(1, days);

  const payload = {
    days_analyzed: days,
    total_completed: completed.length,
    daily_data: dayData.slice(0, velocityDaysToShow),
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
}

async function cmdReportEstimateAccuracy(args: string[]): Promise<void> {
  const outputFormat = parseOpt(args, "--format") ?? "text";
  const loader = new TaskLoader();
  const tree = await loader.load();
  const tasks = getAllTasks(tree);
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
}

function printReportCommands(): void {
  console.log("Report commands:");
  console.log("  - progress");
  console.log("  - velocity");
  console.log("  - estimate-accuracy");
}

export async function cmdReport(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);

  if (sub === "--help") {
    console.log("Usage: backlog report <progress|velocity|estimate-accuracy|p|v|ea> [options]");
    return;
  }

  if (!sub) {
    await cmdReportProgress([]);
    printReportCommands();
    return;
  }

  const normalizedSub =
    sub === "p" ? "progress" : sub === "v" ? "velocity" : sub === "ea" ? "estimate-accuracy" : sub;

  if (normalizedSub === "progress") {
    await cmdReportProgress(rest);
    return;
  }

  if (normalizedSub === "velocity") {
    await cmdReportVelocity(rest);
    return;
  }

  if (normalizedSub === "estimate-accuracy") {
    await cmdReportEstimateAccuracy(rest);
    return;
  }

  textError(`Unknown report subcommand: ${sub}`);
}
