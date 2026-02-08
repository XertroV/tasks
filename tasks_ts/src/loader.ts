import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parse, stringify } from "yaml";
import { Complexity, Priority, Status, TaskPath, type Epic, type Milestone, type Phase, type Task, type TaskTree } from "./models";

interface AnyRec {
  [k: string]: unknown;
}

function estimateHoursFrom(data: AnyRec): number {
  return Number(data.estimate_hours ?? data.estimated_hours ?? 0);
}

function parseTodo(content: string): { frontmatter: AnyRec; body: string } {
  const parts = content.split("---\n");
  if (parts.length >= 3) {
    return { frontmatter: (parse(parts[1] ?? "") as AnyRec) ?? {}, body: parts.slice(2).join("---\n") };
  }
  return { frontmatter: {}, body: content };
}

export class TaskLoader {
  constructor(private readonly tasksDir = ".tasks") {
    if (!existsSync(tasksDir)) {
      throw new Error(`Tasks directory not found: ${tasksDir}`);
    }
  }

  async load(): Promise<TaskTree> {
    const root = this.mustYaml(join(this.tasksDir, "index.yaml"));
    const tree: TaskTree = {
      project: String(root.project ?? ""),
      description: String(root.description ?? ""),
      timelineWeeks: Number(root.timeline_weeks ?? 0),
      criticalPath: (root.critical_path as string[] | undefined) ?? [],
      nextAvailable: root.next_available as string | undefined,
      phases: [],
    };

    for (const p of ((root.phases as AnyRec[]) ?? [])) {
      tree.phases.push(await this.loadPhase(p));
    }
    return tree;
  }

  private async loadPhase(phaseData: AnyRec): Promise<Phase> {
    const phase: Phase = {
      id: String(phaseData.id),
      name: String(phaseData.name ?? ""),
      path: String(phaseData.path ?? ""),
      status: (phaseData.status as Status) ?? Status.PENDING,
      weeks: Number(phaseData.weeks ?? 0),
      estimateHours: estimateHoursFrom(phaseData),
      priority: (phaseData.priority as Priority) ?? Priority.MEDIUM,
      dependsOn: ((phaseData.depends_on as string[]) ?? []).slice(),
      milestones: [],
      description: String(phaseData.description ?? ""),
    };
    const phaseIndexPath = join(this.tasksDir, phase.path, "index.yaml");
    if (!existsSync(phaseIndexPath)) return phase;
    const idx = this.mustYaml(phaseIndexPath);
    for (const m of ((idx.milestones as AnyRec[]) ?? [])) {
      phase.milestones.push(await this.loadMilestone(join(this.tasksDir, phase.path), phase.id, m));
    }
    return phase;
  }

  private async loadMilestone(phasePath: string, phaseId: string, milestoneData: AnyRec): Promise<Milestone> {
    const msPath = TaskPath.forMilestone(phaseId, String(milestoneData.id));
    const m: Milestone = {
      id: msPath.fullId,
      name: String(milestoneData.name ?? ""),
      path: String(milestoneData.path ?? ""),
      status: (milestoneData.status as Status) ?? Status.PENDING,
      estimateHours: estimateHoursFrom(milestoneData),
      complexity: (milestoneData.complexity as Complexity) ?? Complexity.MEDIUM,
      dependsOn: ((milestoneData.depends_on as string[]) ?? []).slice(),
      epics: [],
      description: String(milestoneData.description ?? ""),
      phaseId,
    };
    const idxPath = join(phasePath, m.path, "index.yaml");
    if (!existsSync(idxPath)) return m;
    const idx = this.mustYaml(idxPath);
    for (const e of ((idx.epics as AnyRec[]) ?? [])) {
      m.epics.push(await this.loadEpic(join(phasePath, m.path), msPath, e));
    }
    return m;
  }

  private async loadEpic(milestonePath: string, msPath: TaskPath, epicData: AnyRec): Promise<Epic> {
    const epicPath = msPath.withEpic(String(epicData.id));
    const e: Epic = {
      id: epicPath.fullId,
      name: String(epicData.name ?? ""),
      path: String(epicData.path ?? ""),
      status: (epicData.status as Status) ?? Status.PENDING,
      estimateHours: estimateHoursFrom(epicData),
      complexity: (epicData.complexity as Complexity) ?? Complexity.MEDIUM,
      dependsOn: ((epicData.depends_on as string[]) ?? []).slice(),
      tasks: [],
      description: String(epicData.description ?? ""),
      milestoneId: msPath.fullId,
      phaseId: msPath.phase,
    };
    const idxPath = join(milestonePath, e.path, "index.yaml");
    if (!existsSync(idxPath)) return e;
    const idx = this.mustYaml(idxPath);
    for (const taskData of ((idx.tasks as (AnyRec | string)[]) ?? [])) {
      e.tasks.push(await this.loadTask(join(milestonePath, e.path), epicPath, taskData));
    }
    return e;
  }

  private async loadTask(epicPath: string, epPath: TaskPath, taskData: AnyRec | string): Promise<Task> {
    let normalized: AnyRec;
    if (typeof taskData === "string") {
      const short = taskData.split("-")[0]?.replace(".todo", "") ?? "T001";
      normalized = { file: taskData, id: epPath.withTask(short).fullId };
    } else {
      normalized = taskData;
    }
    const filename = String(normalized.file ?? normalized.path ?? "");
    const taskFile = join(epicPath, filename);
    const frontmatter: AnyRec = existsSync(taskFile)
      ? parseTodo(await readFile(taskFile, "utf8")).frontmatter
      : {};
    let id = String(frontmatter.id ?? normalized.id ?? "");
    if (id && !id.startsWith(`${epPath.phase}.`)) {
      const short = id.split(".").at(-1) ?? "T001";
      id = epPath.withTask(short).fullId;
    }
    return {
      id,
      title: String(frontmatter.title ?? normalized.title ?? ""),
      file: taskFile.replace(`${this.tasksDir}/`, ""),
      status: (frontmatter.status as Status) ?? (normalized.status as Status) ?? Status.PENDING,
      estimateHours: Number(frontmatter.estimate_hours ?? frontmatter.estimated_hours ?? normalized.estimate_hours ?? normalized.estimated_hours ?? 0),
      complexity: (frontmatter.complexity as Complexity) ?? (normalized.complexity as Complexity) ?? Complexity.LOW,
      priority: (frontmatter.priority as Priority) ?? (normalized.priority as Priority) ?? Priority.MEDIUM,
      dependsOn: ((frontmatter.depends_on as string[]) ?? (normalized.depends_on as string[]) ?? []).slice(),
      claimedBy: frontmatter.claimed_by as string | undefined,
      claimedAt: frontmatter.claimed_at ? new Date(String(frontmatter.claimed_at)) : undefined,
      startedAt: frontmatter.started_at ? new Date(String(frontmatter.started_at)) : undefined,
      completedAt: frontmatter.completed_at ? new Date(String(frontmatter.completed_at)) : undefined,
      durationMinutes: frontmatter.duration_minutes ? Number(frontmatter.duration_minutes) : undefined,
      tags: ((frontmatter.tags as string[]) ?? []).slice(),
      epicId: epPath.fullId,
      milestoneId: epPath.milestoneId,
      phaseId: epPath.phase,
    };
  }

  async saveTask(task: Task): Promise<void> {
    const filePath = join(this.tasksDir, task.file);
    const existing = await readFile(filePath, "utf8");
    const { frontmatter, body } = parseTodo(existing);
    frontmatter.status = task.status;
    frontmatter.claimed_by = task.claimedBy ?? null;
    frontmatter.claimed_at = task.claimedAt?.toISOString() ?? null;
    frontmatter.started_at = task.startedAt?.toISOString() ?? null;
    frontmatter.completed_at = task.completedAt?.toISOString() ?? null;
    if (task.durationMinutes !== undefined) frontmatter.duration_minutes = task.durationMinutes;
    await writeFile(filePath, `---\n${stringify(frontmatter)}---\n${body}`);
  }

  async writeYaml(path: string, value: AnyRec): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, stringify(value));
  }

  private mustYaml(path: string): AnyRec {
    const text = readFileSync(path, "utf8");
    const parsed = parse(text);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`YAML file invalid: ${path}`);
    }
    return parsed as AnyRec;
  }
}
