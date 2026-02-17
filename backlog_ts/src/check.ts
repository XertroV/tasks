import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { findEpic, findMilestone, findPhase, findTask, getAllTasks, isTaskFileMissing } from "./helpers";
import { TaskLoader } from "./loader";
import type { TaskTree } from "./models";
import { getDataDirName } from "./data_dir";

type Finding = {
  level: "error" | "warning";
  code: string;
  message: string;
  location?: string;
};

const PHASE_ID_RE = /^P\d+$/;
const MILESTONE_ID_RE = /^P\d+\.M\d+$/;
const EPIC_ID_RE = /^P\d+\.M\d+\.E\d+$/;
const TASK_ID_RE = /^P\d+\.M\d+\.E\d+\.T\d+$/;
const BUG_ID_RE = /^B\d+$/;

function addFinding(findings: Finding[], finding: Finding): void {
  findings.push(finding);
}

function resolveMilestoneDepId(depId: string, phaseId?: string): string {
  const dep = depId.trim();
  if (!dep) return dep;
  if (dep.includes(".")) return dep;
  return phaseId ? `${phaseId}.${dep}` : dep;
}

function resolveEpicDepId(depId: string, milestoneId?: string): string {
  const dep = depId.trim();
  if (!dep) return dep;
  if (dep.includes(".")) return dep;
  return milestoneId ? `${milestoneId}.${dep}` : dep;
}

function hasDirectedCycle(nodes: string[], edges: Array<[string, string]>): string[] | null {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n, []);
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const dfs = (n: string): string[] | null => {
    if (visiting.has(n)) {
      const idx = stack.indexOf(n);
      return idx >= 0 ? stack.slice(idx).concat(n) : [n, n];
    }
    if (visited.has(n)) return null;
    visiting.add(n);
    stack.push(n);
    for (const m of adj.get(n) ?? []) {
      const cyc = dfs(m);
      if (cyc) return cyc;
    }
    stack.pop();
    visiting.delete(n);
    visited.add(n);
    return null;
  };

  for (const n of nodes) {
    const cyc = dfs(n);
    if (cyc) return cyc;
  }
  return null;
}

function validateTreeFiles(tree: TaskTree, findings: Finding[]): void {
  const dataDir = getDataDirName();
  if (!existsSync(`${dataDir}/index.yaml`)) {
    addFinding(findings, {
      level: "error",
      code: "missing_root_index",
      message: `Missing ${dataDir}/index.yaml`,
    });
  }

  for (const phase of tree.phases) {
    const phaseIndex = `${dataDir}/${phase.path}/index.yaml`;
    if (!existsSync(phaseIndex)) {
      addFinding(findings, {
        level: "error",
        code: "missing_phase_index",
        message: `Missing phase index for ${phase.id}`,
        location: phaseIndex,
      });
    }

    for (const milestone of phase.milestones) {
      const milestoneIndex = `${dataDir}/${phase.path}/${milestone.path}/index.yaml`;
      if (!existsSync(milestoneIndex)) {
        addFinding(findings, {
          level: "error",
          code: "missing_milestone_index",
          message: `Missing milestone index for ${milestone.id}`,
          location: milestoneIndex,
        });
      }
      for (const epic of milestone.epics) {
        const epicIndex = `${dataDir}/${phase.path}/${milestone.path}/${epic.path}/index.yaml`;
        if (!existsSync(epicIndex)) {
          addFinding(findings, {
            level: "error",
            code: "missing_epic_index",
            message: `Missing epic index for ${epic.id}`,
            location: epicIndex,
          });
        }
      }
    }
  }

  for (const t of getAllTasks(tree)) {
    if (isTaskFileMissing(t)) {
      addFinding(findings, {
        level: "error",
        code: "missing_task_file",
        message: `Task file missing for ${t.id}`,
        location: `${dataDir}/${t.file}`,
      });
    }
  }
}

function validateIdsAndDependencies(tree: TaskTree, findings: Finding[]): void {
  const allTasks = getAllTasks(tree);
  const taskIds = new Set<string>();
  const phaseIds = new Set<string>();
  const milestoneIds = new Set<string>();
  const epicIds = new Set<string>();

  for (const phase of tree.phases) {
    if (!PHASE_ID_RE.test(phase.id)) addFinding(findings, { level: "error", code: "invalid_phase_id", message: `Invalid phase ID format: ${phase.id}`, location: phase.id });
    if (phaseIds.has(phase.id)) addFinding(findings, { level: "error", code: "duplicate_phase_id", message: `Duplicate phase ID: ${phase.id}`, location: phase.id });
    phaseIds.add(phase.id);

    for (const dep of phase.dependsOn) {
      if (dep === phase.id) addFinding(findings, { level: "error", code: "self_dependency_phase", message: `Phase depends on itself: ${phase.id}`, location: phase.id });
      else if (!findPhase(tree, dep)) addFinding(findings, { level: "error", code: "missing_phase_dependency", message: `Phase dependency not found: ${dep}`, location: phase.id });
    }

    for (const milestone of phase.milestones) {
      if (!MILESTONE_ID_RE.test(milestone.id)) addFinding(findings, { level: "error", code: "invalid_milestone_id", message: `Invalid milestone ID format: ${milestone.id}`, location: milestone.id });
      if (milestoneIds.has(milestone.id)) addFinding(findings, { level: "error", code: "duplicate_milestone_id", message: `Duplicate milestone ID: ${milestone.id}`, location: milestone.id });
      milestoneIds.add(milestone.id);

      for (const dep of milestone.dependsOn) {
        const resolved = resolveMilestoneDepId(dep, phase.id);
        if (resolved === milestone.id) addFinding(findings, { level: "error", code: "self_dependency_milestone", message: `Milestone depends on itself: ${milestone.id}`, location: milestone.id });
        else if (resolved && !findMilestone(tree, resolved)) addFinding(findings, { level: "error", code: "missing_milestone_dependency", message: `Milestone dependency not found: ${dep}`, location: milestone.id });
      }

      for (const epic of milestone.epics) {
        if (!EPIC_ID_RE.test(epic.id)) addFinding(findings, { level: "error", code: "invalid_epic_id", message: `Invalid epic ID format: ${epic.id}`, location: epic.id });
        if (epicIds.has(epic.id)) addFinding(findings, { level: "error", code: "duplicate_epic_id", message: `Duplicate epic ID: ${epic.id}`, location: epic.id });
        epicIds.add(epic.id);

        for (const dep of epic.dependsOn) {
          const resolved = resolveEpicDepId(dep, milestone.id);
          if (resolved === epic.id) addFinding(findings, { level: "error", code: "self_dependency_epic", message: `Epic depends on itself: ${epic.id}`, location: epic.id });
          else if (resolved && !findEpic(tree, resolved)) addFinding(findings, { level: "error", code: "missing_epic_dependency", message: `Epic dependency not found: ${dep}`, location: epic.id });
        }

        for (const task of epic.tasks) {
          if (!TASK_ID_RE.test(task.id)) addFinding(findings, { level: "error", code: "invalid_task_id", message: `Invalid task ID format: ${task.id}`, location: task.id });
          if (taskIds.has(task.id)) addFinding(findings, { level: "error", code: "duplicate_task_id", message: `Duplicate task ID: ${task.id}`, location: task.id });
          taskIds.add(task.id);

          if (task.estimateHours === 0) {
            addFinding(findings, {
              level: "warning",
              code: "zero_estimate_hours",
              message: `Task estimate must be positive, got 0: ${task.id}`,
              location: task.id,
            });
          }

          for (const dep of task.dependsOn) {
            if (dep === task.id) addFinding(findings, { level: "error", code: "self_dependency_task", message: `Task depends on itself: ${task.id}`, location: task.id });
            else if (!allTasks.some((t) => t.id === dep)) {
              const resolvedEpic = resolveEpicDepId(dep, milestone.id);
              if (resolvedEpic && findEpic(tree, resolvedEpic)) {
                continue;
              }
              addFinding(findings, { level: "error", code: "missing_task_dependency", message: `Task dependency not found: ${dep}`, location: task.id });
            }
          }
        }
      }
    }
  }
}

function validateBugs(tree: TaskTree, findings: Finding[]): void {
  const dataDir = getDataDirName();
  const allTasks = getAllTasks(tree);
  const allIds = new Set(allTasks.map((t) => t.id));
  const bugIds = new Set<string>();

  for (const bug of (tree.bugs ?? [])) {
    if (!BUG_ID_RE.test(bug.id)) {
      addFinding(findings, { level: "error", code: "invalid_bug_id", message: `Invalid bug ID format: ${bug.id}`, location: bug.id });
    }
    if (bugIds.has(bug.id)) {
      addFinding(findings, { level: "error", code: "duplicate_bug_id", message: `Duplicate bug ID: ${bug.id}`, location: bug.id });
    }
    bugIds.add(bug.id);

    if (isTaskFileMissing(bug)) {
      addFinding(findings, { level: "error", code: "missing_bug_file", message: `Bug file missing for ${bug.id}`, location: `${dataDir}/${bug.file}` });
    }

    if (bug.estimateHours === 0) {
      addFinding(findings, { level: "warning", code: "zero_estimate_hours", message: `Bug estimate must be positive, got 0: ${bug.id}`, location: bug.id });
    }

    for (const dep of bug.dependsOn) {
      if (dep === bug.id) {
        addFinding(findings, { level: "error", code: "self_dependency_bug", message: `Bug depends on itself: ${bug.id}`, location: bug.id });
      } else if (!allIds.has(dep)) {
        addFinding(findings, { level: "error", code: "missing_bug_dependency", message: `Bug dependency not found: ${dep}`, location: bug.id });
      }
    }
  }
}

function validateCycles(tree: TaskTree, findings: Finding[]): void {
  const allTasks = getAllTasks(tree);
  const taskNodes = allTasks.map((t) => t.id);
  const taskEdges: Array<[string, string]> = [];
  for (const phase of tree.phases) {
    for (const milestone of phase.milestones) {
      for (const epic of milestone.epics) {
        epic.tasks.forEach((task, idx) => {
          for (const dep of task.dependsOn) {
            if (taskNodes.includes(dep)) {
              taskEdges.push([dep, task.id]);
            } else {
              const depEpic = findEpic(tree, resolveEpicDepId(dep, milestone.id));
              if (depEpic) {
                for (const depTask of depEpic.tasks) {
                  taskEdges.push([depTask.id, task.id]);
                }
              }
            }
          }
          if (task.dependsOn.length === 0 && idx > 0) taskEdges.push([epic.tasks[idx - 1]!.id, task.id]);
        });
      }
    }
  }
  // Include bugs in cycle detection
  for (const bug of (tree.bugs ?? [])) {
    for (const dep of bug.dependsOn) {
      if (taskNodes.includes(dep)) taskEdges.push([dep, bug.id]);
    }
  }
  const taskCycle = hasDirectedCycle(taskNodes, taskEdges);
  if (taskCycle) {
    addFinding(findings, {
      level: "error",
      code: "task_dependency_cycle",
      message: `Task dependency cycle detected: ${taskCycle.join(" -> ")}`,
      location: "task_dependencies",
    });
  }
}

async function validateRuntimeFiles(tree: TaskTree, findings: Finding[]): Promise<void> {
  const dataDir = getDataDirName();
  const contextPath = `${dataDir}/.context.yaml`;
  const sessionsPath = `${dataDir}/.sessions.yaml`;
  if (existsSync(contextPath)) {
    try {
      const context = (parse(await readFile(contextPath, "utf8")) as Record<string, unknown>) ?? {};
      const referenced = [
        context.current_task,
        context.primary_task,
        ...(((context.additional_tasks as string[]) ?? []) as string[]),
        ...(((context.sibling_tasks as string[]) ?? []) as string[]),
      ].filter(Boolean) as string[];
      for (const id of referenced) {
        if (!findTask(tree, id)) {
          addFinding(findings, { level: "warning", code: "stale_context_task", message: `Context references missing task: ${id}`, location: contextPath });
        }
      }
    } catch (err) {
      addFinding(findings, { level: "warning", code: "context_parse_error", message: `Could not parse context file: ${String(err)}`, location: contextPath });
    }
  }

  if (existsSync(sessionsPath)) {
    try {
      const sessions = (parse(await readFile(sessionsPath, "utf8")) as Record<string, unknown>) ?? {};
      for (const value of Object.values(sessions)) {
        if (!value || typeof value !== "object") continue;
        const taskId = (value as Record<string, unknown>).current_task as string | undefined;
        if (taskId && !findTask(tree, taskId)) {
          addFinding(findings, { level: "warning", code: "stale_session_task", message: `Session references missing task: ${taskId}`, location: sessionsPath });
        }
      }
    } catch (err) {
      addFinding(findings, { level: "warning", code: "sessions_parse_error", message: `Could not parse sessions file: ${String(err)}`, location: sessionsPath });
    }
  }
}

async function validateUninitializedTodos(tree: TaskTree, findings: Finding[]): Promise<void> {
  const dataDir = getDataDirName();
  const defaultMarkers = [
    "- TODO: Add requirements",
    "- TODO: Add acceptance criteria",
    "TODO: Add steps",
    "TODO: Describe expected behavior",
    "TODO: Describe actual behavior",
  ];

  const allTasks = getAllTasks(tree);
  for (const task of allTasks) {
    const taskFile = `${dataDir}/${task.file}`;
    if (!existsSync(taskFile)) {
      // Skip missing files - already reported by validateTreeFiles
      continue;
    }

    try {
      const content = await readFile(taskFile, "utf8");
      const hasDefaultContent = defaultMarkers.some((marker) => content.includes(marker));

      if (hasDefaultContent) {
        addFinding(findings, {
          level: "warning",
          code: "uninitialized_todo",
          message: `Task file still contains default placeholder content: ${task.id}`,
          location: taskFile,
        });
      }
    } catch (err) {
      // If we can't read the file, skip it
    }
  }
}

export async function runChecks(tasksDir?: string): Promise<{ ok: boolean; errors: Finding[]; warnings: Finding[]; summary: { errors: number; warnings: number; total: number } }> {
  const findings: Finding[] = [];
  const loader = new TaskLoader(tasksDir);
  const tree = await loader.load();
  validateTreeFiles(tree, findings);
  validateIdsAndDependencies(tree, findings);
  validateBugs(tree, findings);
  validateCycles(tree, findings);
  await validateRuntimeFiles(tree, findings);
  await validateUninitializedTodos(tree, findings);

  const errors = findings.filter((f) => f.level === "error");
  const warnings = findings.filter((f) => f.level === "warning");
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: { errors: errors.length, warnings: warnings.length, total: findings.length },
  };
}
