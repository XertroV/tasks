#!/usr/bin/env bun
import pc from "picocolors";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { parse, stringify } from "yaml";
import { CriticalPathCalculator } from "./critical_path";
import { clearContext, endSession, findEpic, findMilestone, findPhase, findTask, getActiveSessions, getAllTasks, getCurrentTaskId, getStaleSessions, isBugId, isIdeaId, isTaskFileMissing, loadConfig, loadContext, loadSessions, saveSessions, setCurrentTask, startSession, updateSessionHeartbeat } from "./helpers";
import { TaskLoader } from "./loader";
import { Complexity, Priority, Status, TaskPath, type Epic, type Milestone, type Phase, type Task } from "./models";
import { claimTask, completeTask, StatusError, updateStatus } from "./status";
import { utcNow } from "./time";
import { runChecks } from "./check";

const AGENTS_SNIPPETS: Record<string, string> = {
  short: `# AGENTS.md (Short)

## Task Workflow
- Use \`tasks grab\` to claim work, then \`tasks done\` or \`tasks cycle\`.
- If a command fails to parse args/usage, run exactly one recovery command: \`tasks cycle\`.
- For explicit task IDs, use \`tasks claim <TASK_ID> [TASK_ID ...]\`.
- Prefer critical-path work, then \`critical > high > medium > low\` priority.
- If blocked, run \`tasks blocked --reason "<why>" --no-grab\` and handoff quickly.
- Keep each change scoped to one task; update status as soon as state changes.
- Before done: run targeted tests for changed code.
- For more see \`tasks --help\`.
`,
  medium: `# AGENTS.md (Medium)

## Defaults
- Claim with \`tasks grab\` (or \`tasks grab --single\` for focused work).
- Use \`tasks claim <TASK_ID> [TASK_ID ...]\` when task IDs are provided.
- If command argument parsing fails, run \`tasks cycle\` once to recover.
- CLI selection order is: critical-path first, then task priority.
- Use \`tasks work <id>\` when switching context; use \`tasks show\` to review details.
`,
  long: `# AGENTS.md (Long)

## Operating Model
- Default command: \`tasks\`. Use local \`.tasks/\` state as source of truth.
- Selection strategy: critical-path first, then \`critical > high > medium > low\`.
- Treat task files as contracts: requirements + acceptance criteria drive scope.
`,
};

export function parseFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export function parseOpt(args: string[], name: string): string | undefined {
  const exact = args.find((a) => a.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

export function jsonOut(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2));
}

export function textError(message: string): never {
  console.error(pc.red(`Error: ${message}`));
  process.exit(1);
}

function usage(): void {
  console.log(`Usage: tasks <command> [options]

Commands:
  list            List tasks with filtering options
  tree            Display full hierarchical tree
  show            Show detailed info for a task/phase/milestone/epic
  next            Get next available task on critical path
  claim           Claim specific task ID(s)
  grab            Auto-claim next task (or claim IDs)
  done            Mark task as complete
  cycle           Complete current task and grab next
  dash            Show quick dashboard of project status
  update          Update task status
  set             Set task properties (status/priority/etc)
  work            Set/show current working task
  unclaim         Release a claimed task
  blocked         Mark task as blocked and optionally grab next
  bug             Create a new bug report
  idea            Capture an idea as planning intake
  search          Search tasks by pattern
  check           Check task tree consistency
  init            Initialize a new .tasks project
  add             Add a new task to an epic
  add-epic        Add a new epic to a milestone
  add-milestone   Add a new milestone to a phase
  add-phase       Add a new phase to the project
  session         Manage agent sessions
  data            Export/summarize task data
  report          Generate reports (progress, velocity, estimates) [alias: r]
  timeline        Display an ASCII Gantt chart of the project timeline (alias: tl)
  schema          Show file schema information
  blockers        Show blocking tasks
  skills          Install skill files
  agents          Print AGENTS.md snippets

Quick rules:
  - Prefer 'tasks claim <TASK_ID> [TASK_ID ...]' for explicit IDs.
  - Use 'tasks grab' for automatic selection.
  - If command parsing fails, run 'tasks cycle' once.`);
}

// Helper functions for filtering and stats
function isUnfinished(status: Status): boolean {
  return status !== Status.DONE && status !== Status.CANCELLED && status !== Status.REJECTED;
}

function includeAuxItem(status: Status, unfinished: boolean, showCompletedAux: boolean): boolean {
  if (unfinished) return isUnfinished(status);
  if (showCompletedAux) return true;
  return isUnfinished(status);
}

function filterUnfinishedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => isUnfinished(t.status));
}

function hasUnfinishedTasks(epic: Epic): boolean {
  return epic.tasks.some((t) => isUnfinished(t.status));
}

function hasUnfinishedEpics(milestone: Milestone): boolean {
  return milestone.epics.some((e) => hasUnfinishedTasks(e));
}

function hasUnfinishedMilestones(phase: Phase): boolean {
  return phase.milestones.some((m) => hasUnfinishedEpics(m));
}

function calculateTaskStats(tasks: Task[]): { done: number; total: number } {
  return {
    done: tasks.filter((t) => t.status === Status.DONE).length,
    total: tasks.length,
  };
}

function getEpicStats(epic: Epic): { done: number; total: number } {
  return calculateTaskStats(epic.tasks);
}

function getMilestoneStats(milestone: Milestone): { done: number; total: number } {
  const tasks = milestone.epics.flatMap((e) => e.tasks);
  return calculateTaskStats(tasks);
}

function getPhaseStats(phase: Phase): { done: number; total: number } {
  const tasks = phase.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks));
  return calculateTaskStats(tasks);
}

function makeProgressBar(done: number, total: number, width = 20): string {
  if (total === 0) return "░".repeat(width);
  const pct = done / total;
  const filled = Math.floor(width * pct);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function listWithProgress(
  tree: TaskTree,
  unfinished: boolean,
  showCompletedAux: boolean,
  includeNormal: boolean,
  includeBugs: boolean,
  includeIdeas: boolean,
): void {
  console.log();
  console.log(pc.bold(pc.cyan("Project Progress")));
  console.log();

  const phasesToShow = includeNormal
    ? (unfinished ? tree.phases.filter((p) => hasUnfinishedMilestones(p)) : tree.phases)
    : [];
  const completedPhases: Array<{ id: string; name: string; total: number }> = [];

  for (const phase of phasesToShow) {
    const stats = getPhaseStats(phase);
    const { done, total } = stats;
    const inProgress = phase.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks)).filter((t) => t.status === Status.IN_PROGRESS).length;
    const blocked = phase.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks)).filter((t) => t.status === Status.BLOCKED).length;

    const pct = total > 0 ? (done / total) * 100 : 0;

    if (pct === 100) {
      completedPhases.push({ id: phase.id, name: phase.name, total });
      continue;
    }

    const bar = makeProgressBar(done, total);

    let indicator: string;
    if (inProgress > 0) {
      indicator = pc.yellow("→");
    } else if (blocked > 0) {
      indicator = pc.red("🔒");
    } else {
      indicator = "[ ]";
    }

    console.log(`${indicator} ${pc.bold(`${phase.id}: ${phase.name}`)}`);
    console.log(`    ${bar} ${pct.toFixed(1).padStart(5)}% (${done}/${total})`);

    for (const m of phase.milestones) {
      const mStats = getMilestoneStats(m);
      const mDone = mStats.done;
      const mTotal = mStats.total;
      const mInProgress = m.epics.flatMap((e) => e.tasks).filter((t) => t.status === Status.IN_PROGRESS).length;

      const mPct = mTotal > 0 ? (mDone / mTotal) * 100 : 0;

      if (mPct === 100) continue;

      const mBar = makeProgressBar(mDone, mTotal, 15);

      const mInd = mInProgress > 0 ? pc.yellow("→") : "○";

      console.log(`    ${mInd} ${m.id}: ${mBar} ${Math.round(mPct).toString().padStart(3)}%`);
    }

    console.log();
  }

  // Show bugs summary in progress view
  const bugs = includeBugs
    ? (tree.bugs ?? []).filter((b) => includeAuxItem(b.status, unfinished, showCompletedAux))
    : [];
  if (bugs.length > 0) {
    const bugsDone = bugs.filter((b) => b.status === Status.DONE).length;
    const bugsTotal = bugs.length;
    const bugPct = bugsTotal > 0 ? (bugsDone / bugsTotal) * 100 : 0;
    const bugBar = makeProgressBar(bugsDone, bugsTotal);
    console.log(`${bugPct === 100 ? pc.green("✓") : "🐛"} ${pc.bold("Bugs")}`);
    console.log(`    ${bugBar} ${bugPct.toFixed(1).padStart(5)}% (${bugsDone}/${bugsTotal})`);
    console.log();
  }

  const ideas = includeIdeas
    ? (tree.ideas ?? []).filter((i) => includeAuxItem(i.status, unfinished, showCompletedAux))
    : [];
  if (ideas.length > 0) {
    const ideasDone = ideas.filter((i) => i.status === Status.DONE).length;
    const ideasTotal = ideas.length;
    const ideaPct = ideasTotal > 0 ? (ideasDone / ideasTotal) * 100 : 0;
    const ideaBar = makeProgressBar(ideasDone, ideasTotal);
    console.log(`${ideaPct === 100 ? pc.green("✓") : "💡"} ${pc.bold("Ideas")}`);
    console.log(`    ${ideaBar} ${ideaPct.toFixed(1).padStart(5)}% (${ideasDone}/${ideasTotal})`);
    console.log();
  }

  if (completedPhases.length > 0) {
    const completedStr = completedPhases.map((p) => `${p.id} (${p.total})`).join(", ");
    console.log(`${pc.green("✓ Completed:")} ${completedStr}`);
    console.log();
  }
}

// Display helpers
function getStatusIcon(status: Status): string {
  switch (status) {
    case Status.DONE:
      return pc.green("[✓]");
    case Status.IN_PROGRESS:
      return pc.yellow("[→]");
    case Status.PENDING:
      return "[ ]";
    case Status.BLOCKED:
      return pc.red("[✗]");
    case Status.CANCELLED:
    case Status.REJECTED:
      return pc.dim("[X]");
    default:
      return "[ ]";
  }
}

function getTreeChars(isLast: boolean): { branch: string; continuation: string } {
  return {
    branch: isLast ? "└── " : "├── ",
    continuation: isLast ? "    " : "│   ",
  };
}

async function cmdList(args: string[]): Promise<void> {
  const outputJson = parseFlag(args, "--json");
  const statusFilter = parseOpt(args, "--status")?.split(",") ?? [];
  const showAll = parseFlag(args, "--all");
  const unfinished = parseFlag(args, "--unfinished");
  const bugsOnly = parseFlag(args, "--bugs");
  const ideasOnly = parseFlag(args, "--ideas");
  const showCompletedAux = parseFlag(args, "--show-completed-aux");
  const showProgress = parseFlag(args, "--progress");
  const includeNormal = !bugsOnly && !ideasOnly;
  const includeBugs = bugsOnly || (!bugsOnly && !ideasOnly);
  const includeIdeas = ideasOnly || (!bugsOnly && !ideasOnly);
  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { criticalPath, nextAvailable } = calc.calculate();
  tree.criticalPath = criticalPath;
  tree.nextAvailable = nextAvailable;

  if (showProgress) {
    listWithProgress(tree, unfinished, showCompletedAux, includeNormal, includeBugs, includeIdeas);
    return;
  }

  const tasks = getAllTasks(tree)
    .filter((t) => (statusFilter.length ? statusFilter.includes(t.status) : true))
    .filter((t) => {
      const isBug = /^B\d+$/.test(t.id);
      const isIdea = /^I\d+$/.test(t.id);
      if (isBug) return includeBugs;
      if (isIdea) return includeIdeas;
      return includeNormal;
    });
  if (outputJson) {
    const filteredPhases = (includeNormal ? tree.phases : [])
      .map((p) => ({
        ...p,
        milestones: p.milestones
          .filter((m) => (!unfinished || hasUnfinishedEpics(m)))
          .map((m) => ({
            ...m,
            epics: m.epics
              .filter((e) => (!unfinished || hasUnfinishedTasks(e)))
              .map((e) => ({
                ...e,
                tasks: unfinished ? filterUnfinishedTasks(e.tasks) : e.tasks,
              })),
          })),
      }))
      .filter((p) => (!unfinished || hasUnfinishedMilestones(p)));

    const bugsForJson = (includeBugs ? (tree.bugs ?? []) : [])
      .filter((b) => (statusFilter.length ? statusFilter.includes(b.status) : true))
      .filter((b) => includeAuxItem(b.status, unfinished, showCompletedAux));
    const ideasForJson = (includeIdeas ? (tree.ideas ?? []) : [])
      .filter((i) => (statusFilter.length ? statusFilter.includes(i.status) : true))
      .filter((i) => includeAuxItem(i.status, unfinished, showCompletedAux));
    jsonOut({
      critical_path: criticalPath,
      next_available: nextAvailable,
      phases: filteredPhases.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        stats: getPhaseStats(p),
        milestones: p.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          stats: getMilestoneStats(m),
        })),
      })),
      tasks: tasks
        .filter((t) => (!unfinished || isUnfinished(t.status)))
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          estimate_hours: t.estimateHours,
          complexity: t.complexity,
          priority: t.priority,
          on_critical_path: criticalPath.includes(t.id),
        })),
      bugs: bugsForJson.map((b) => ({
        id: b.id,
        title: b.title,
        status: b.status,
        priority: b.priority,
        estimate_hours: b.estimateHours,
        on_critical_path: criticalPath.includes(b.id),
      })),
      ideas: ideasForJson.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        priority: i.priority,
        estimate_hours: i.estimateHours,
        on_critical_path: criticalPath.includes(i.id),
      })),
    });
    return;
  }

  console.log(pc.cyan("Critical Path:"), criticalPath.slice(0, 10).join(" -> "));
  console.log();

  const phasesToShow = includeNormal
    ? (unfinished ? tree.phases.filter((p) => hasUnfinishedMilestones(p)) : tree.phases)
    : [];

  for (const p of phasesToShow) {
    const stats = getPhaseStats(p);
    console.log(`${pc.bold(p.name)} (${stats.done}/${stats.total} tasks done)`);

    const milestonesToShow = unfinished ? p.milestones.filter((m) => hasUnfinishedEpics(m)) : p.milestones;
    const milestoneLimit = showAll ? milestonesToShow.length : 5;
    const displayedMilestones = milestonesToShow.slice(0, milestoneLimit);
    const hiddenCount = milestonesToShow.length - displayedMilestones.length;

    for (let i = 0; i < displayedMilestones.length; i++) {
      const m = displayedMilestones[i]!;
      const mStats = getMilestoneStats(m);
      const isLast = i === displayedMilestones.length - 1 && hiddenCount === 0;
      const prefix = isLast ? "└── " : "├── ";
      console.log(`  ${prefix}${m.name} (${mStats.done}/${mStats.total} tasks done)`);
    }

    if (hiddenCount > 0) {
      console.log(`  └── ... and ${hiddenCount} more milestone${hiddenCount === 1 ? "" : "s"}`);
    }
  }

  // Show bugs section
  const bugsToShow = (includeBugs ? (tree.bugs ?? []) : [])
    .filter((b) => (statusFilter.length ? statusFilter.includes(b.status) : true))
    .filter((b) => includeAuxItem(b.status, unfinished, showCompletedAux));
  if (bugsToShow.length > 0) {
    console.log();
    const bugsDone = bugsToShow.filter((b) => b.status === Status.DONE).length;
    console.log(`${pc.bold("Bugs")} (${bugsDone}/${bugsToShow.length} done)`);
    for (let i = 0; i < bugsToShow.length; i++) {
      const b = bugsToShow[i]!;
      const isLast = i === bugsToShow.length - 1;
      const prefix = isLast ? "└── " : "├── ";
      const icon = getStatusIcon(b.status);
      const critMarker = criticalPath.includes(b.id) ? `${pc.yellow("★")} ` : "";
      console.log(`  ${prefix}${icon} ${critMarker}${b.id}: ${b.title} [${b.priority}]`);
    }
  }

  const ideasToShow = (includeIdeas ? (tree.ideas ?? []) : [])
    .filter((i) => (statusFilter.length ? statusFilter.includes(i.status) : true))
    .filter((i) => includeAuxItem(i.status, unfinished, showCompletedAux));
  if (ideasToShow.length > 0) {
    console.log();
    const ideasDone = ideasToShow.filter((i) => i.status === Status.DONE).length;
    console.log(`${pc.bold("Ideas")} (${ideasDone}/${ideasToShow.length} done)`);
    for (let i = 0; i < ideasToShow.length; i++) {
      const idea = ideasToShow[i]!;
      const isLast = i === ideasToShow.length - 1;
      const prefix = isLast ? "└── " : "├── ";
      const icon = getStatusIcon(idea.status);
      const critMarker = criticalPath.includes(idea.id) ? `${pc.yellow("★")} ` : "";
      console.log(`  ${prefix}${icon} ${critMarker}${idea.id}: ${idea.title} [${idea.priority}]`);
    }
  }
}

// Tree rendering functions
function renderTask(task: Task, isLast: boolean, prefix: string, criticalPath: string[], showDetails: boolean): string {
  const icon = getStatusIcon(task.status);
  const { branch } = getTreeChars(isLast);
  let line = `${prefix}${branch}${icon} ${task.id}: ${task.title}`;

  if (showDetails) {
    const details: string[] = [];
    if (task.estimateHours > 0) details.push(`(${task.estimateHours}h)`);
    if (task.status) details.push(`[${task.status}]`);
    if (task.claimedBy) details.push(`@${task.claimedBy}`);
    if (task.dependsOn.length > 0) details.push(`depends:${task.dependsOn.join(",")}`);
    if (criticalPath.includes(task.id)) details.push("★");

    if (details.length > 0) {
      line += ` ${details.join(" ")}`;
    }
  }

  return line;
}

function renderEpic(
  epic: Epic,
  isLast: boolean,
  prefix: string,
  criticalPath: string[],
  unfinished: boolean,
  showDetails: boolean,
  maxDepth: number,
  currentDepth: number,
): string[] {
  const stats = getEpicStats(epic);
  const { branch, continuation } = getTreeChars(isLast);
  const lines: string[] = [];

  lines.push(`${prefix}${branch}${epic.name} (${stats.done}/${stats.total}) [${epic.status}]`);

  if (currentDepth >= maxDepth) return lines;

  const tasksToShow = unfinished ? filterUnfinishedTasks(epic.tasks) : epic.tasks;
  const newPrefix = prefix + continuation;

  for (let i = 0; i < tasksToShow.length; i++) {
    const t = tasksToShow[i]!;
    const taskIsLast = i === tasksToShow.length - 1;
    lines.push(renderTask(t, taskIsLast, newPrefix, criticalPath, showDetails));
  }

  return lines;
}

function renderMilestone(
  milestone: Milestone,
  isLast: boolean,
  prefix: string,
  criticalPath: string[],
  unfinished: boolean,
  showDetails: boolean,
  maxDepth: number,
  currentDepth: number,
): string[] {
  const stats = getMilestoneStats(milestone);
  const { branch, continuation } = getTreeChars(isLast);
  const lines: string[] = [];

  lines.push(`${prefix}${branch}${milestone.name} (${stats.done}/${stats.total}) [${milestone.status}]`);

  if (currentDepth >= maxDepth) return lines;

  const epicsToShow = unfinished ? milestone.epics.filter((e) => hasUnfinishedTasks(e)) : milestone.epics;
  const newPrefix = prefix + continuation;

  for (let i = 0; i < epicsToShow.length; i++) {
    const e = epicsToShow[i]!;
    const epicIsLast = i === epicsToShow.length - 1;
    lines.push(...renderEpic(e, epicIsLast, newPrefix, criticalPath, unfinished, showDetails, maxDepth, currentDepth + 1));
  }

  return lines;
}

function renderPhase(
  phase: Phase,
  isLast: boolean,
  prefix: string,
  criticalPath: string[],
  unfinished: boolean,
  showDetails: boolean,
  maxDepth: number,
  currentDepth: number,
): string[] {
  const stats = getPhaseStats(phase);
  const { branch, continuation } = getTreeChars(isLast);
  const lines: string[] = [];

  lines.push(`${prefix}${branch}${pc.bold(phase.name)} (${stats.done}/${stats.total}) [${phase.status}]`);

  if (currentDepth >= maxDepth) return lines;

  const milestonesToShow = unfinished ? phase.milestones.filter((m) => hasUnfinishedEpics(m)) : phase.milestones;
  const newPrefix = prefix + continuation;

  for (let i = 0; i < milestonesToShow.length; i++) {
    const m = milestonesToShow[i]!;
    const milestoneIsLast = i === milestonesToShow.length - 1;
    lines.push(...renderMilestone(m, milestoneIsLast, newPrefix, criticalPath, unfinished, showDetails, maxDepth, currentDepth + 1));
  }

  return lines;
}

async function cmdTree(args: string[]): Promise<void> {
  const outputJson = parseFlag(args, "--json");
  const unfinished = parseFlag(args, "--unfinished");
  const showCompletedAux = parseFlag(args, "--show-completed-aux");
  const showDetails = parseFlag(args, "--details");
  const depthStr = parseOpt(args, "--depth");
  const maxDepth = depthStr ? Number(depthStr) : 4;

  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { criticalPath, nextAvailable } = calc.calculate();
  tree.criticalPath = criticalPath;
  tree.nextAvailable = nextAvailable;

  if (outputJson) {
    const filteredPhases = tree.phases
      .map((p) => ({
        ...p,
        milestones: p.milestones
          .filter((m) => (!unfinished || hasUnfinishedEpics(m)))
          .map((m) => ({
            ...m,
            epics: m.epics
              .filter((e) => (!unfinished || hasUnfinishedTasks(e)))
              .map((e) => ({
                ...e,
                tasks: unfinished ? filterUnfinishedTasks(e.tasks) : e.tasks,
              })),
          })),
      }))
      .filter((p) => (!unfinished || hasUnfinishedMilestones(p)));

    jsonOut({
      critical_path: criticalPath,
      next_available: nextAvailable,
      max_depth: maxDepth,
      show_details: showDetails,
      unfinished_only: unfinished,
      phases: filteredPhases,
    });
    return;
  }

  const phasesToShow = unfinished ? tree.phases.filter((p) => hasUnfinishedMilestones(p)) : tree.phases;
  const bugsToShow = (tree.bugs ?? []).filter((b) => includeAuxItem(b.status, unfinished, showCompletedAux));
  const ideasToShow = (tree.ideas ?? []).filter((i) => includeAuxItem(i.status, unfinished, showCompletedAux));
  const hasBugs = bugsToShow.length > 0;
  const hasIdeas = ideasToShow.length > 0;
  const hasAux = hasBugs || hasIdeas;

  for (let i = 0; i < phasesToShow.length; i++) {
    const p = phasesToShow[i]!;
    const isLast = i === phasesToShow.length - 1 && !hasAux;
    const lines = renderPhase(p, isLast, "", criticalPath, unfinished, showDetails, maxDepth, 1);
    console.log(lines.join("\n"));
  }

  // Render auxiliary sections
  if (hasBugs) {
    const bugsDone = bugsToShow.filter((b) => b.status === Status.DONE).length;
    const branch = hasIdeas ? "├── " : "└── ";
    const continuation = hasIdeas ? "│   " : "    ";
    console.log(`${branch}${pc.bold("Bugs")} (${bugsDone}/${bugsToShow.length})`);
    for (let i = 0; i < bugsToShow.length; i++) {
      const b = bugsToShow[i]!;
      const isLastBug = i === bugsToShow.length - 1 && !hasIdeas;
      const icon = getStatusIcon(b.status);
      console.log(renderTask(b, isLastBug, continuation, criticalPath, showDetails));
    }
  }

  if (hasIdeas) {
    const ideasDone = ideasToShow.filter((i) => i.status === Status.DONE).length;
    const { branch, continuation } = getTreeChars(true);
    console.log(`${branch}${pc.bold("Ideas")} (${ideasDone}/${ideasToShow.length})`);
    for (let i = 0; i < ideasToShow.length; i++) {
      const idea = ideasToShow[i]!;
      const isLastIdea = i === ideasToShow.length - 1;
      const icon = getStatusIcon(idea.status);
      console.log(renderTask(idea, isLastIdea, continuation, criticalPath, showDetails));
    }
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
    // Check auxiliary IDs before TaskPath.parse.
    if (isBugId(id) || isIdeaId(id)) {
      const aux = [...(tree.bugs ?? []), ...(tree.ideas ?? [])].find((t) => t.id === id);
      if (!aux) textError(`Task not found: ${id}`);
      console.log(`${aux.id}: ${aux.title}\nstatus=${aux.status} estimate=${aux.estimateHours}`);
      continue;
    }
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

  // Check for positional task IDs (excluding option values)
  const taskIds: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "--agent") {
      i += 1;
      continue;
    }
    if (arg.startsWith("--agent=")) continue;
    if (arg.startsWith("-")) continue;
    taskIds.push(arg);
  }
  if (taskIds.length > 0) {
    const claimedTasks: Task[] = [];
    for (const tid of taskIds) {
      const task = findTask(tree, tid);
      if (!task) textError(`Task not found: ${tid}`);
      if (isTaskFileMissing(task)) textError(`Cannot claim ${tid} because the task file is missing.`);
      try {
        claimTask(task, agent, false);
        await loader.saveTask(task);
        claimedTasks.push(task);
        console.log(`${pc.green("✓ Claimed:")} ${task.id} - ${task.title}`);
      } catch (e) {
        if (e instanceof StatusError) {
          jsonOut(e.toJSON());
          process.exit(1);
        }
        throw e;
      }
    }
    if (claimedTasks.length > 0) {
      const primary = claimedTasks[0]!;
      await setCurrentTask(primary.id, agent);
      console.log(`\n${pc.bold("Working on:")} ${primary.id}`);
    }
    return;
  }

  // Auto-select next available
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

async function cmdSet(args: string[]): Promise<void> {
  const taskId = args.find((a) => !a.startsWith("-"));
  if (!taskId) textError("set requires TASK_ID");

  const statusValue = parseOpt(args, "--status");
  const priority = parseOpt(args, "--priority");
  const complexity = parseOpt(args, "--complexity");
  const estimateText = parseOpt(args, "--estimate");
  const title = parseOpt(args, "--title");
  const dependsOnText = parseOpt(args, "--depends-on");
  const tagsText = parseOpt(args, "--tags");
  const reason = parseOpt(args, "--reason");

  const hasAny = [statusValue, priority, complexity, estimateText, title, dependsOnText, tagsText].some((v) => v !== undefined);
  if (!hasAny) textError("set requires at least one property flag");

  const allowedPriority = new Set(Object.values(Priority));
  const allowedComplexity = new Set(Object.values(Complexity));
  const allowedStatus = new Set(Object.values(Status));

  if (priority && !allowedPriority.has(priority as Priority)) {
    textError(`Invalid priority: ${priority}`);
  }
  if (complexity && !allowedComplexity.has(complexity as Complexity)) {
    textError(`Invalid complexity: ${complexity}`);
  }
  if (statusValue && !allowedStatus.has(statusValue as Status)) {
    textError(`Invalid status: ${statusValue}`);
  }

  let estimate: number | undefined;
  if (estimateText !== undefined) {
    estimate = Number(estimateText);
    if (!Number.isFinite(estimate)) {
      textError(`Invalid estimate: ${estimateText}`);
    }
  }

  const loader = new TaskLoader();
  const tree = await loader.load();
  const task = findTask(tree, taskId);
  if (!task) textError(`Task not found: ${taskId}`);

  if (title !== undefined) task.title = title;
  if (estimate !== undefined) task.estimateHours = estimate;
  if (complexity !== undefined) task.complexity = complexity as Complexity;
  if (priority !== undefined) task.priority = priority as Priority;
  if (dependsOnText !== undefined) task.dependsOn = parseCsv(dependsOnText);
  if (tagsText !== undefined) task.tags = parseCsv(tagsText);

  try {
    if (statusValue !== undefined) {
      updateStatus(task, statusValue as Status, reason);
    }
    await loader.saveTask(task);
    console.log(`Updated: ${task.id}`);
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
  const noGrab = parseFlag(args, "--no-grab");
  let taskId = args.find((a) => !a.startsWith("-"));
  const reason = parseOpt(args, "--reason") ?? parseOpt(args, "-r");
  if (!reason) textError("blocked requires --reason");
  if (!taskId) taskId = await getCurrentTaskId();
  if (!taskId) textError("No task ID provided and no current working task set.");
  const agent = parseOpt(args, "--agent") ?? ((loadConfig().agent as Record<string, unknown>)?.default_agent as string) ?? "cli-user";

  const loader = new TaskLoader();
  const tree = await loader.load();
  const task = findTask(tree, taskId);
  if (!task) textError(`Task not found: ${taskId}`);
  updateStatus(task, Status.BLOCKED, reason);
  await loader.saveTask(task);
  await clearContext();
  console.log(`Blocked: ${task.id} (${reason})`);

  if (noGrab) return;

  const refreshed = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(refreshed, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { nextAvailable } = calc.calculate();
  if (!nextAvailable) {
    console.log("No available tasks found.");
    return;
  }
  const nextTask = findTask(refreshed, nextAvailable);
  if (!nextTask) {
    console.log("No available tasks found.");
    return;
  }
  if (isTaskFileMissing(nextTask)) {
    console.log(`Skipping auto-grab: ${nextTask.id} has no task file.`);
    return;
  }
  claimTask(nextTask, agent, false);
  await loader.saveTask(nextTask);
  await setCurrentTask(nextTask.id, agent);
  console.log(`Grabbed: ${nextTask.id} - ${nextTask.title}`);
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

export function computeStats(tree: { phases: Array<{ milestones: Array<{ epics: Array<{ tasks: Array<{ status: Status }> }> }> }> }): {
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

  textError(`Unknown data subcommand: ${sub}`);
}

// cmdReport is extracted to report.ts
import { cmdReport } from "./report";
import { cmdDash } from "./display";

async function cmdTimeline(args: string[]): Promise<void> {
  const scope = parseOpt(args, "--scope");
  const groupBy = parseOpt(args, "--group-by") ?? "milestone";
  const showDone = parseFlag(args, "--show-done");
  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { criticalPath } = calc.calculate();
  let tasks = getAllTasks(tree);
  if (scope) tasks = tasks.filter((t) => t.id.startsWith(scope));
  if (!showDone) tasks = tasks.filter((t) => t.status !== Status.DONE);
  if (!tasks.length) {
    console.log("No tasks to display.");
    return;
  }

  const groups = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const key = groupBy === "phase" ? t.phaseId : groupBy === "epic" ? t.epicId : groupBy === "status" ? t.status : t.milestoneId;
    const label = key ?? "Unknown";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(t);
  }
  console.log("Project Timeline");
  for (const [label, group] of groups.entries()) {
    console.log(label);
    for (const t of group) {
      const crit = criticalPath.includes(t.id) ? "*" : " ";
      console.log(`  ${crit} ${t.id} ${t.status} ${t.title}`);
    }
  }
}

async function cmdSchema(args: string[]): Promise<void> {
  const asJson = parseFlag(args, "--json");
  const compact = parseFlag(args, "--compact");
  const spec = {
    schema_version: 1,
    scope: "file-kinds",
    enums: {
      status: Object.values(Status),
      complexity: ["low", "medium", "high", "critical"],
      priority: ["critical", "high", "medium", "low"],
      context_mode: ["single", "multi", "siblings"],
    },
    files: [
      { name: "Root index", path_pattern: ".tasks/index.yaml", format: "yaml" },
      { name: "Phase index", path_pattern: ".tasks/<phase-path>/index.yaml", format: "yaml" },
      { name: "Milestone index", path_pattern: ".tasks/<phase-path>/<milestone-path>/index.yaml", format: "yaml" },
      { name: "Epic index", path_pattern: ".tasks/<phase-path>/<milestone-path>/<epic-path>/index.yaml", format: "yaml" },
      { name: "Task file", path_pattern: ".tasks/<phase-path>/<milestone-path>/<epic-path>/T###-*.todo", format: "markdown-with-yaml-frontmatter" },
      { name: "Context file", path_pattern: ".tasks/.context.yaml", format: "yaml" },
      { name: "Sessions file", path_pattern: ".tasks/.sessions.yaml", format: "yaml" },
      { name: "Config file", path_pattern: ".tasks/config.yaml", format: "yaml" },
    ],
  };
  if (asJson) {
    console.log(JSON.stringify(spec, null, compact ? undefined : 2));
    return;
  }
  console.log("Schema");
  for (const f of spec.files) {
    console.log(`- ${f.name}: ${f.path_pattern}`);
  }
}

async function cmdAgents(args: string[]): Promise<void> {
  const profile = parseOpt(args, "--profile") ?? "all";
  const order = profile === "all" ? ["short", "medium", "long"] : [profile];
  for (let i = 0; i < order.length; i++) {
    const key = order[i]!;
    if (!AGENTS_SNIPPETS[key]) textError(`Invalid profile: ${profile}`);
    if (i > 0) console.log(`\n${"=".repeat(72)}\n`);
    console.log(AGENTS_SNIPPETS[key]);
  }
}

function slugify(text: string, maxLength = 30): string {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.length > maxLength ? base.slice(0, maxLength).replace(/-+$/g, "") : base;
}

function parseCsv(val: string | undefined): string[] {
  if (!val) return [];
  return val.split(",").map((x) => x.trim()).filter(Boolean);
}

async function readYamlObj(path: string): Promise<Record<string, unknown>> {
  return (parse(await Bun.file(path).text()) as Record<string, unknown>) ?? {};
}

async function writeYamlObj(path: string, value: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, stringify(value));
}

async function cmdAdd(args: string[]): Promise<void> {
  const epicId = args.find((a) => !a.startsWith("-"));
  if (!epicId) textError("add requires EPIC_ID");
  const title = parseOpt(args, "--title") ?? parseOpt(args, "-T");
  if (!title) textError("add requires --title");
  const estimate = Number(parseOpt(args, "--estimate") ?? parseOpt(args, "-e") ?? "1");
  const complexity = parseOpt(args, "--complexity") ?? parseOpt(args, "-c") ?? "medium";
  const priority = parseOpt(args, "--priority") ?? parseOpt(args, "-p") ?? "medium";
  const dependsOn = parseCsv(parseOpt(args, "--depends-on") ?? parseOpt(args, "-d"));
  const tags = parseCsv(parseOpt(args, "--tags"));
  const bodyOpt = parseOpt(args, "--body") ?? parseOpt(args, "-b");

  const loader = new TaskLoader();
  const tree = await loader.load();
  const epic = findEpic(tree, epicId);
  if (!epic) textError(`Epic not found: ${epicId}`);
  const phase = findPhase(tree, epic.phaseId ?? "");
  const milestone = findMilestone(tree, epic.milestoneId ?? "");
  if (!phase || !milestone) textError(`Could not resolve parent paths for epic: ${epicId}`);

  const epicDir = join(".tasks", phase.path, milestone.path, epic.path);
  const existing = epic.tasks
    .map((t) => Number((t.id.match(/\.T(\d+)$/)?.[1] ?? "0")))
    .filter((n) => Number.isFinite(n));
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  const shortId = `T${String(next).padStart(3, "0")}`;
  const fullId = `${epic.id}.${shortId}`;
  const filename = `${shortId}-${slugify(title)}.todo`;
  const relFile = join(phase.path, milestone.path, epic.path, filename);
  const fullFile = join(".tasks", relFile);

  const fm = {
    id: fullId,
    title,
    status: "pending",
    estimate_hours: estimate,
    complexity,
    priority,
    depends_on: dependsOn,
    tags,
  };
  const body = bodyOpt ?? `\n# ${title}\n\n## Requirements\n\n- TODO: Add requirements\n\n## Acceptance Criteria\n\n- TODO: Add acceptance criteria\n`;
  await mkdir(dirname(fullFile), { recursive: true });
  await Bun.write(fullFile, `---\n${stringify(fm)}---\n${body}`);

  const epicIndexPath = join(epicDir, "index.yaml");
  const epicIndex = await readYamlObj(epicIndexPath);
  const tasks = ((epicIndex.tasks as Record<string, unknown>[] | undefined) ?? []).slice();
  tasks.push({
    id: shortId,
    file: filename,
    title,
    status: "pending",
    estimate_hours: estimate,
    complexity,
    priority,
    depends_on: dependsOn,
  });
  epicIndex.tasks = tasks;
  await writeYamlObj(epicIndexPath, epicIndex);
  console.log(`Created task: ${fullId}`);
  if (!bodyOpt) {
    console.log("IMPORTANT: You MUST fill in the .todo file that was created.");
  }
}

async function cmdAddEpic(args: string[]): Promise<void> {
  const milestoneId = args.find((a) => !a.startsWith("-"));
  if (!milestoneId) textError("add-epic requires MILESTONE_ID");
  const title = parseOpt(args, "--title") ?? parseOpt(args, "-T") ?? parseOpt(args, "--name") ?? parseOpt(args, "-n");
  if (!title) textError("add-epic requires --title");
  const estimate = Number(parseOpt(args, "--estimate") ?? parseOpt(args, "-e") ?? "4");
  const complexity = parseOpt(args, "--complexity") ?? parseOpt(args, "-c") ?? "medium";
  const dependsOn = parseCsv(parseOpt(args, "--depends-on") ?? parseOpt(args, "-d"));

  const loader = new TaskLoader();
  const tree = await loader.load();
  const milestone = findMilestone(tree, milestoneId);
  if (!milestone) textError(`Milestone not found: ${milestoneId}`);
  const phase = findPhase(tree, milestone.phaseId ?? "");
  if (!phase) textError(`Phase not found for milestone: ${milestoneId}`);

  const existing = milestone.epics
    .map((e) => Number((e.id.match(/\.E(\d+)$/)?.[1] ?? "0")))
    .filter((n) => Number.isFinite(n));
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  const shortId = `E${next}`;
  const fullId = `${milestone.id}.${shortId}`;
  const dirName = `${String(next).padStart(2, "0")}-${slugify(title)}`;
  const epicDir = join(".tasks", phase.path, milestone.path, dirName);
  await mkdir(epicDir, { recursive: true });
  await writeYamlObj(join(epicDir, "index.yaml"), {
    id: fullId,
    name: title,
    status: "pending",
    estimate_hours: estimate,
    complexity,
    depends_on: dependsOn,
    tasks: [],
    stats: { total: 0, done: 0, in_progress: 0, blocked: 0, pending: 0 },
  });

  const msIndexPath = join(".tasks", phase.path, milestone.path, "index.yaml");
  const msIndex = await readYamlObj(msIndexPath);
  const epics = ((msIndex.epics as Record<string, unknown>[] | undefined) ?? []).slice();
  epics.push({
    id: shortId,
    name: title,
    path: dirName,
    status: "pending",
    estimate_hours: estimate,
    complexity,
    depends_on: dependsOn,
    description: "",
  });
  msIndex.epics = epics;
  await writeYamlObj(msIndexPath, msIndex);
  console.log(`Created epic: ${fullId}`);
}

async function cmdAddMilestone(args: string[]): Promise<void> {
  const phaseId = args.find((a) => !a.startsWith("-"));
  if (!phaseId) textError("add-milestone requires PHASE_ID");
  const title = parseOpt(args, "--title") ?? parseOpt(args, "-T") ?? parseOpt(args, "--name") ?? parseOpt(args, "-n");
  if (!title) textError("add-milestone requires --title");
  const estimate = Number(parseOpt(args, "--estimate") ?? parseOpt(args, "-e") ?? "8");
  const complexity = parseOpt(args, "--complexity") ?? parseOpt(args, "-c") ?? "medium";
  const dependsOn = parseCsv(parseOpt(args, "--depends-on") ?? parseOpt(args, "-d"));

  const loader = new TaskLoader();
  const tree = await loader.load();
  const phase = findPhase(tree, phaseId);
  if (!phase) textError(`Phase not found: ${phaseId}`);

  const existing = phase.milestones
    .map((m) => Number((m.id.match(/\.M(\d+)$/)?.[1] ?? "0")))
    .filter((n) => Number.isFinite(n));
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  const shortId = `M${next}`;
  const fullId = `${phase.id}.${shortId}`;
  const dirName = `${String(next).padStart(2, "0")}-${slugify(title)}`;
  const msDir = join(".tasks", phase.path, dirName);
  await mkdir(msDir, { recursive: true });
  await writeYamlObj(join(msDir, "index.yaml"), {
    id: fullId,
    name: title,
    status: "pending",
    estimate_hours: estimate,
    complexity,
    depends_on: dependsOn,
    epics: [],
    stats: { total_tasks: 0, done: 0, in_progress: 0, blocked: 0, pending: 0 },
  });

  const phaseIndexPath = join(".tasks", phase.path, "index.yaml");
  const phaseIndex = await readYamlObj(phaseIndexPath);
  const milestones = ((phaseIndex.milestones as Record<string, unknown>[] | undefined) ?? []).slice();
  milestones.push({
    id: shortId,
    name: title,
    path: dirName,
    status: "pending",
    estimate_hours: estimate,
    complexity,
    depends_on: dependsOn,
    description: "",
  });
  phaseIndex.milestones = milestones;
  await writeYamlObj(phaseIndexPath, phaseIndex);
  console.log(`Created milestone: ${fullId}`);
}

async function cmdAddPhase(args: string[]): Promise<void> {
  const title = parseOpt(args, "--title") ?? parseOpt(args, "-T") ?? parseOpt(args, "--name") ?? parseOpt(args, "-n");
  if (!title) textError("add-phase requires --title");
  const weeks = Number(parseOpt(args, "--weeks") ?? "2");
  const estimate = Number(parseOpt(args, "--estimate") ?? parseOpt(args, "-e") ?? "40");
  const priority = parseOpt(args, "--priority") ?? parseOpt(args, "-p") ?? "medium";
  const dependsOn = parseCsv(parseOpt(args, "--depends-on") ?? parseOpt(args, "-d"));

  const rootIndexPath = join(".tasks", "index.yaml");
  const root = await readYamlObj(rootIndexPath);
  const phases = ((root.phases as Record<string, unknown>[] | undefined) ?? []).slice();
  const existing = phases
    .map((p) => Number((String(p.id ?? "").match(/^P(\d+)$/)?.[1] ?? "0")))
    .filter((n) => Number.isFinite(n));
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  const phaseId = `P${next}`;
  const dirName = `${String(next).padStart(2, "0")}-${slugify(title)}`;
  const phaseDir = join(".tasks", dirName);
  await mkdir(phaseDir, { recursive: true });
  await writeYamlObj(join(phaseDir, "index.yaml"), {
    id: phaseId,
    name: title,
    status: "pending",
    weeks,
    estimate_hours: estimate,
    complexity: "medium",
    depends_on: dependsOn,
    milestones: [],
    stats: { total_tasks: 0, done: 0, in_progress: 0, blocked: 0, pending: 0 },
  });
  phases.push({
    id: phaseId,
    name: title,
    path: dirName,
    status: "pending",
    weeks,
    estimate_hours: estimate,
    priority,
    depends_on: dependsOn,
    description: "",
  });
  root.phases = phases;
  await writeYamlObj(rootIndexPath, root);
  console.log(`Created phase: ${phaseId}`);
}

type InstallOp = { client: string; artifact: string; path: string; action?: string };

function resolveSkills(names: string[]): string[] {
  const valid = ["plan-task", "plan-ingest", "start-tasks"];
  const normalized = names.map((n) => n.trim().toLowerCase()).filter(Boolean);
  if (!normalized.length || normalized.includes("all")) return valid;
  for (const n of normalized) {
    if (!valid.includes(n)) throw new Error(`Invalid skill name: ${n}`);
  }
  return Array.from(new Set(normalized));
}

function resolveClients(clientName: string): string[] {
  if (clientName === "common") return ["codex", "claude", "opencode"];
  return [clientName];
}

function resolveArtifacts(artifact: string): string[] {
  if (artifact === "both") return ["skills", "commands"];
  return [artifact];
}

function defaultRoot(client: string, scope: string, artifact: string): string {
  if (client === "codex") {
    if (artifact !== "skills") throw new Error("codex does not support commands artifacts");
    if (scope === "local") return ".agents/skills";
    return process.env.CODEX_HOME ? `${process.env.CODEX_HOME}/skills` : `${process.env.HOME}/.agents/skills`;
  }
  if (client === "claude") return scope === "local" ? `.claude/${artifact}` : `${process.env.HOME}/.claude/${artifact}`;
  if (client === "opencode") return scope === "local" ? `.opencode/${artifact}` : `${process.env.HOME}/.config/opencode/${artifact}`;
  throw new Error(`Unknown client: ${client}`);
}

function skillTemplate(name: string): string {
  if (name === "plan-task") return "---\nname: plan-task\ndescription: plan task\n---\n# plan-task\n";
  if (name === "plan-ingest") return "---\nname: plan-ingest\ndescription: plan ingest\n---\n# plan-ingest\n";
  return "---\nname: start-tasks\ndescription: tasks grab and cycle\n---\n# start-tasks\n";
}

function commandTemplate(name: string): string {
  return `---\ndescription: ${name}\n---\n${name}\n`;
}

async function promptClientSelection(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return "common";

  console.log("Select target coding CLI:");
  console.log("  1) codex");
  console.log("  2) claude");
  console.log("  3) opencode");
  console.log("  4) common (all)");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question("Choose [1-4]: ")).trim().toLowerCase();
  rl.close();

  const mapped: Record<string, string> = {
    "1": "codex",
    "2": "claude",
    "3": "opencode",
    "4": "common",
  };

  const selected = mapped[answer] ?? answer;
  if (["codex", "claude", "opencode", "common"].includes(selected)) return selected;
  throw new Error("Invalid client selection. Choose 1-4 or codex|claude|opencode|common.");
}

async function cmdSkills(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  if (!sub || sub === "--help") {
    console.log("Usage: tasks skills install [skill_names...] [--scope local|global] [--client codex|claude|opencode|common]");
    return;
  }
  if (sub !== "install") {
    textError(`Unknown skills subcommand: ${sub}`);
  }
  const skillNames = rest.filter((a) => !a.startsWith("-"));
  const scope = parseOpt(rest, "--scope") ?? "local";
  const parsedClient = parseOpt(rest, "--client");
  const client = parsedClient ?? (outputJson ? "common" : await promptClientSelection());
  const artifact = parseOpt(rest, "--artifact") ?? "skills";
  const outputDir = parseOpt(rest, "--dir");
  const force = parseFlag(rest, "--force");
  const dryRun = parseFlag(rest, "--dry-run");
  const outputJson = parseFlag(rest, "--json");

  const selectedSkills = resolveSkills(skillNames);
  const warnings: string[] = [];
  const ops: InstallOp[] = [];

  for (const c of resolveClients(client)) {
    for (const a of resolveArtifacts(artifact)) {
      if (c === "codex" && a === "commands") {
        warnings.push("codex does not support 'commands' artifacts; skipping.");
        continue;
      }
      const root = outputDir ? join(outputDir, a, c) : defaultRoot(c, scope, a);
      for (const skill of selectedSkills) {
        const path = a === "skills" ? join(root, skill, "SKILL.md") : join(root, `${skill}.md`);
        ops.push({ client: c, artifact: a, path });
      }
    }
  }

  const existing = ops.filter((o) => existsSync(o.path));
  if (existing.length && !force && !dryRun) {
    throw new Error(`Refusing to overwrite existing files (use --force):\n${existing.map((o) => o.path).join("\n")}`);
  }

  if (!dryRun) {
    for (const op of ops) {
      await mkdir(dirname(op.path), { recursive: true });
      const content = op.artifact === "skills"
        ? skillTemplate(op.path.includes("plan-task") ? "plan-task" : op.path.includes("plan-ingest") ? "plan-ingest" : "start-tasks")
        : commandTemplate(op.path.includes("plan-task") ? "plan-task" : op.path.includes("plan-ingest") ? "plan-ingest" : "start-tasks");
      await Bun.write(op.path, content);
    }
  }

  const result = {
    skills: selectedSkills,
    scope,
    client,
    artifact,
    output_dir: outputDir ?? null,
    dry_run: dryRun,
    force,
    warnings,
    operations: ops.map((o) => ({ ...o, action: dryRun ? "planned" : "written" })),
    written_count: dryRun ? 0 : ops.length,
  };
  if (outputJson) {
    jsonOut(result);
    return;
  }
  if (dryRun) console.log("Dry run: no files written.");
  else console.log(`Installed ${ops.length} file(s).`);
  for (const w of warnings) console.log(`Warning: ${w}`);
}

async function cmdSearch(args: string[]): Promise<void> {
  const pattern = args.find((a) => !a.startsWith("-"));
  if (!pattern) textError("search requires PATTERN");
  const status = parseOpt(args, "--status");
  const tags = (parseOpt(args, "--tags") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const complexity = parseOpt(args, "--complexity");
  const priority = parseOpt(args, "--priority");
  const limit = Number(parseOpt(args, "--limit") ?? "20");
  const regex = new RegExp(pattern, "i");

  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { criticalPath } = calc.calculate();

  const matches = getAllTasks(tree).filter((t) => {
    const fileContent = existsSync(join(".tasks", t.file)) ? readFileSync(join(".tasks", t.file), "utf8") : "";
    if (!regex.test(t.title) && !regex.test(fileContent)) return false;
    if (status && t.status !== (status as Status)) return false;
    if (complexity && t.complexity !== complexity) return false;
    if (priority && t.priority !== priority) return false;
    if (tags.length) {
      const tt = new Set(t.tags.map((x) => x.toLowerCase()));
      if (!tags.some((x) => tt.has(x))) return false;
    }
    return true;
  });

  if (!matches.length) {
    console.log(`No tasks found matching '${pattern}'`);
    return;
  }

  console.log(`Found ${matches.length} result(s) for "${pattern}":`);
  for (const t of matches.slice(0, limit)) {
    const crit = criticalPath.includes(t.id) ? "*" : " ";
    console.log(`${crit} ${t.id} ${t.title} [${t.status}]`);
  }
}

async function cmdBlockers(args: string[]): Promise<void> {
  const deep = parseFlag(args, "--deep");
  const suggest = parseFlag(args, "--suggest");
  const loader = new TaskLoader();
  const tree = await loader.load();
  const cfg = loadConfig();
  const calc = new CriticalPathCalculator(tree, (cfg.complexity_multipliers as Record<string, number>) ?? {});
  const { criticalPath } = calc.calculate();
  const all = getAllTasks(tree);
  const blockedTasks = all.filter((t) => t.status === Status.BLOCKED);

  const pendingBlocked = all.filter((t) => t.status === Status.PENDING && !t.claimedBy && !calc.isTaskAvailable(t));
  if (!blockedTasks.length && !pendingBlocked.length) {
    console.log("No blocked tasks!");
    return;
  }
  console.log(`${blockedTasks.length} task(s) marked as BLOCKED`);
  console.log(`${pendingBlocked.length} task(s) waiting on dependencies`);

  const rootBlockers = new Set<string>();
  for (const t of pendingBlocked) {
    for (const dep of t.dependsOn) {
      const depTask = findTask(tree, dep);
      if (depTask && depTask.status !== Status.DONE) {
        if (depTask.status === Status.IN_PROGRESS || (depTask.status === Status.PENDING && calc.isTaskAvailable(depTask))) {
          rootBlockers.add(depTask.id);
        }
      }
    }
  }

  console.log("Blocking Chains:");
  for (const id of Array.from(rootBlockers).slice(0, deep ? 999 : 10)) {
    const t = findTask(tree, id);
    if (!t) continue;
    const crit = criticalPath.includes(id) ? " CRITICAL" : "";
    console.log(`${id} ${t.status}${crit} ${t.claimedBy ? `@${t.claimedBy}` : "UNCLAIMED"}`);
    if (suggest) {
      if (!t.claimedBy && t.status === Status.PENDING) console.log(`  suggest: grab ${id}`);
    }
  }
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
    console.log(`✓ Session started`);
    console.log(`  Agent: ${agent}`);
    if (task) console.log(`  Task:  ${task}`);
    console.log(`  Time:  ${String(sess.started_at)}`);
    return;
  }

  if (sub === "heartbeat") {
    const agent = parseOpt(rest, "--agent");
    const progress = parseOpt(rest, "--progress");
    if (!agent) textError("session heartbeat requires --agent");
    const ok = await updateSessionHeartbeat(agent, progress);
    if (!ok) {
      console.log(`Warning: No active session for '${agent}'`);
      return;
    }
    console.log(`✓ Heartbeat updated for ${agent}`);
    if (progress) console.log(`  Progress: ${progress}`);
    return;
  }

  if (sub === "end") {
    const agent = parseOpt(rest, "--agent");
    const status = parseOpt(rest, "--status") ?? "completed";
    if (!agent) textError("session end requires --agent");
    const ok = await endSession(agent);
    if (ok) {
      console.log(`✓ Session ended for ${agent}`);
      console.log(`  Status: ${status}`);
    } else {
      console.log(`No active session found for '${agent}'`);
    }
    return;
  }

  if (sub === "list") {
    const onlyStale = parseFlag(rest, "--stale");
    if (onlyStale) {
      const sessions = await getStaleSessions(timeout);
      if (!sessions.length) {
        console.log("✓ No stale sessions");
        return;
      }
      console.log(`Stale Sessions (no heartbeat > ${timeout}m):`);
      for (const sess of sessions) {
        console.log(`  ${String(sess.agent_id)}`);
        if (sess.current_task) console.log(`    Task: ${String(sess.current_task)}`);
        console.log(`    Last heartbeat: ${String(sess.age_minutes)}m ago`);
        if (sess.progress) console.log(`    Last progress: ${String(sess.progress)}`);
      }
      return;
    }

    const active = await getActiveSessions();
    if (!active.length) {
      console.log("No active sessions");
      return;
    }
    for (const sess of active) {
      const hbAge = Number(sess.last_heartbeat_minutes ?? 0);
      const hbStr = hbAge > timeout ? pc.red(`${hbAge}m`) : hbAge > timeout / 2 ? pc.yellow(`${hbAge}m`) : pc.green(`${hbAge}m`);
      console.log(
        `${String(sess.agent_id)} task=${String(sess.current_task ?? "-")} duration=${formatDuration(Number(sess.duration_minutes ?? 0))} last_hb=${hbStr} progress=${String(sess.progress ?? "-")}`,
      );
    }
    return;
  }

  if (sub === "clean") {
    const sessions = await loadSessions();
    const stale = await getStaleSessions(timeout);
    const cleaned: string[] = [];
    for (const s of stale) {
      const agent = String(s.agent_id);
      if (agent in sessions) {
        delete sessions[agent];
        cleaned.push(agent);
      }
    }
    await saveSessions(sessions);
    if (cleaned.length) {
      console.log(`✓ Removed ${cleaned.length} stale session(s):`);
      for (const agent of cleaned) console.log(`  - ${agent}`);
    } else {
      console.log("✓ No stale sessions to clean");
    }
    return;
  }

  textError(`Unknown session subcommand: ${sub}`);
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

async function cmdInit(args: string[]): Promise<void> {
  const project = parseOpt(args, "--project") ?? parseOpt(args, "-p");
  if (!project) textError("init requires --project");
  const description = parseOpt(args, "--description") ?? parseOpt(args, "-d") ?? "";
  const timelineWeeks = Number(parseOpt(args, "--timeline-weeks") ?? parseOpt(args, "-w") ?? "0");

  const indexPath = join(".tasks", "index.yaml");
  if (existsSync(indexPath)) textError("Already initialized (.tasks/index.yaml exists)");

  await writeYamlObj(indexPath, {
    project,
    description,
    timeline_weeks: timelineWeeks,
    phases: [],
  });
  console.log(`Initialized project "${project}" in .tasks/`);
}

async function cmdBug(args: string[]): Promise<void> {
  let title = parseOpt(args, "--title") ?? parseOpt(args, "-T");
  const optionNamesWithValue = new Set([
    "--title",
    "-T",
    "--priority",
    "-p",
    "--estimate",
    "-e",
    "--complexity",
    "-c",
    "--depends-on",
    "-d",
    "--tags",
    "--body",
    "-b",
  ]);
  const bugWords: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (optionNamesWithValue.has(arg)) {
      i += 1;
      continue;
    }
    if (arg.startsWith("-")) continue;
    bugWords.push(arg);
  }
  const positionalTitle = bugWords.join(" ").trim();

  const priority = parseOpt(args, "--priority") ?? parseOpt(args, "-p") ?? "high";
  const estimate = Number(parseOpt(args, "--estimate") ?? parseOpt(args, "-e") ?? "1");
  const complexity = parseOpt(args, "--complexity") ?? parseOpt(args, "-c") ?? "medium";
  const dependsOn = parseCsv(parseOpt(args, "--depends-on") ?? parseOpt(args, "-d"));
  const tags = parseCsv(parseOpt(args, "--tags"));
  let simple = parseFlag(args, "--simple") || parseFlag(args, "-s");
  const body = parseOpt(args, "--body") ?? parseOpt(args, "-b");

  if (!title && positionalTitle) {
    title = positionalTitle;
    simple = true;
  }
  if (!title) textError("bug requires --title or description text");

  const loader = new TaskLoader();
  const bug = await loader.createBug({
    title,
    priority,
    estimate,
    complexity,
    dependsOn,
    tags,
    simple,
    body,
  });
  console.log(`Created bug: ${bug.id}`);
  if (!simple && !body) {
    console.log("IMPORTANT: You MUST fill in the .todo file that was created.");
  }
}

async function cmdIdea(args: string[]): Promise<void> {
  const title = args.join(" ").trim();
  if (!title) textError("idea requires IDEA_TEXT");

  const loader = new TaskLoader();
  const idea = await loader.createIdea({ title });
  console.log(`Created idea: ${idea.id}`);
  console.log(`File: .tasks/${idea.file}`);
  console.log("IMPORTANT: This intake tracks planning work; run `/plan-task` on the idea and ingest resulting items with tasks commands.");
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
    case "init":
      await cmdInit(rest);
      return;
    case "list":
      await cmdList(rest);
      return;
    case "tree":
      await cmdTree(rest);
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
    case "dash":
      await cmdDash(rest);
      return;
    case "update":
      await cmdUpdate(rest);
      return;
    case "set":
      await cmdSet(rest);
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
    case "sync":
      await cmdSync();
      return;
    case "data":
      await cmdData(rest);
      return;
    case "report":
      await cmdReport(rest);
      return;
    case "r":
      await cmdReport(rest);
      return;
    case "timeline":
      await cmdTimeline(rest);
      return;
    case "tl":
      await cmdTimeline(rest);
      return;
    case "schema":
      await cmdSchema(rest);
      return;
    case "search":
      await cmdSearch(rest);
      return;
    case "blockers":
      await cmdBlockers(rest);
      return;
    case "skills":
      await cmdSkills(rest);
      return;
    case "agents":
      await cmdAgents(rest);
      return;
    case "add":
      await cmdAdd(rest);
      return;
    case "add-epic":
      await cmdAddEpic(rest);
      return;
    case "add-milestone":
      await cmdAddMilestone(rest);
      return;
    case "add-phase":
      await cmdAddPhase(rest);
      return;
    case "bug":
      await cmdBug(rest);
      return;
    case "idea":
      await cmdIdea(rest);
      return;
    default:
      textError(`Unknown command: ${cmd}`);
  }
}

await main();
