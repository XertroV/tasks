import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parse, stringify } from "yaml";
import { Complexity, Priority, Status, TaskPath, type Epic, type Milestone, type Phase, type Task, type TaskTree } from "./models";
import { getDataDir } from "./data_dir";

interface AnyRec {
  [k: string]: unknown;
}

function estimateHoursFrom(data: AnyRec): number {
  return Number(data.estimate_hours ?? data.estimated_hours ?? 0);
}

function coerceStatus(rawStatus: unknown, fallback: Status = Status.PENDING): Status {
  if (rawStatus === undefined || rawStatus === null) return fallback;
  if (Object.values(Status).includes(rawStatus as Status)) return rawStatus as Status;
  if (typeof rawStatus === "string") {
    const normalized = rawStatus.trim().toLowerCase().replace(/[-\s]+/g, "_");
    const aliases: Record<string, Status> = {
      complete: Status.DONE,
      completed: Status.DONE,
    };
    return aliases[normalized] ?? (normalized as Status);
  }
  return String(rawStatus) as Status;
}

function parseTodo(content: string): { frontmatter: AnyRec; body: string } {
  const parts = content.split("---\n");
  if (parts.length >= 3) {
    return { frontmatter: (parse(parts[1] ?? "") as AnyRec) ?? {}, body: parts.slice(2).join("---\n") };
  }
  return { frontmatter: {}, body: content };
}

function slugify(text: string, maxLength = 30): string {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.length > maxLength ? base.slice(0, maxLength).replace(/-+$/g, "") : base;
}

export class TaskLoader {
  private readonly tasksDir: string;
  
  constructor(tasksDir?: string) {
    this.tasksDir = tasksDir ?? getDataDir();
    if (!existsSync(this.tasksDir)) {
      throw new Error(`Data directory not found: ${this.tasksDir}`);
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
      bugs: [],
      ideas: [],
    };

    for (const p of ((root.phases as AnyRec[]) ?? [])) {
      tree.phases.push(await this.loadPhase(p));
    }
    tree.bugs = await this.loadBugs();
    tree.ideas = await this.loadIdeas();
    return tree;
  }

  private async loadPhase(phaseData: AnyRec): Promise<Phase> {
    const phase: Phase = {
      id: String(phaseData.id),
      name: String(phaseData.name ?? ""),
      path: String(phaseData.path ?? ""),
      status: coerceStatus(phaseData.status, Status.PENDING),
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
      status: coerceStatus(milestoneData.status, Status.PENDING),
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
      status: coerceStatus(epicData.status, Status.PENDING),
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
      status: coerceStatus(frontmatter.status ?? normalized.status, Status.PENDING),
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
    frontmatter.title = task.title;
    frontmatter.status = task.status;
    frontmatter.estimate_hours = task.estimateHours;
    frontmatter.complexity = task.complexity;
    frontmatter.priority = task.priority;
    frontmatter.depends_on = task.dependsOn;
    frontmatter.tags = task.tags;
    frontmatter.claimed_by = task.claimedBy ?? null;
    frontmatter.claimed_at = task.claimedAt?.toISOString() ?? null;
    frontmatter.started_at = task.startedAt?.toISOString() ?? null;
    frontmatter.completed_at = task.completedAt?.toISOString() ?? null;
    if (task.durationMinutes !== undefined) frontmatter.duration_minutes = task.durationMinutes;
    await writeFile(filePath, `---\n${stringify(frontmatter)}---\n${body}`);
  }

  private async loadBugs(): Promise<import("./models").Task[]> {
    const bugsDir = join(this.tasksDir, "bugs");
    const indexPath = join(bugsDir, "index.yaml");
    if (!existsSync(indexPath)) return [];
    const idx = this.mustYaml(indexPath);
    const bugs: import("./models").Task[] = [];
    for (const entry of ((idx.bugs as AnyRec[]) ?? [])) {
      const filename = String(entry.file ?? "");
      if (!filename) continue;
      const filePath = join(bugsDir, filename);
      if (!existsSync(filePath)) continue;
      const fm = parseTodo(await readFile(filePath, "utf8")).frontmatter;
      bugs.push({
        id: String(fm.id ?? ""),
        title: String(fm.title ?? ""),
        file: join("bugs", filename),
        status: coerceStatus(fm.status, Status.PENDING),
        estimateHours: estimateHoursFrom(fm),
        complexity: (fm.complexity as Complexity) ?? Complexity.MEDIUM,
        priority: (fm.priority as Priority) ?? Priority.MEDIUM,
        dependsOn: ((fm.depends_on as string[]) ?? []).slice(),
        claimedBy: fm.claimed_by as string | undefined,
        claimedAt: fm.claimed_at ? new Date(String(fm.claimed_at)) : undefined,
        startedAt: fm.started_at ? new Date(String(fm.started_at)) : undefined,
        completedAt: fm.completed_at ? new Date(String(fm.completed_at)) : undefined,
        durationMinutes: fm.duration_minutes ? Number(fm.duration_minutes) : undefined,
        tags: ((fm.tags as string[]) ?? []).slice(),
        epicId: undefined,
        milestoneId: undefined,
        phaseId: undefined,
      });
    }
    return bugs;
  }

  private async loadIdeas(): Promise<import("./models").Task[]> {
    const ideasDir = join(this.tasksDir, "ideas");
    const indexPath = join(ideasDir, "index.yaml");
    if (!existsSync(indexPath)) return [];
    const idx = this.mustYaml(indexPath);
    const ideas: import("./models").Task[] = [];
    for (const entry of ((idx.ideas as AnyRec[]) ?? [])) {
      const filename = String(entry.file ?? "");
      if (!filename) continue;
      const filePath = join(ideasDir, filename);
      if (!existsSync(filePath)) continue;
      const fm = parseTodo(await readFile(filePath, "utf8")).frontmatter;
      ideas.push({
        id: String(fm.id ?? ""),
        title: String(fm.title ?? ""),
        file: join("ideas", filename),
        status: coerceStatus(fm.status, Status.PENDING),
        estimateHours: estimateHoursFrom(fm),
        complexity: (fm.complexity as Complexity) ?? Complexity.MEDIUM,
        priority: (fm.priority as Priority) ?? Priority.MEDIUM,
        dependsOn: ((fm.depends_on as string[]) ?? []).slice(),
        claimedBy: fm.claimed_by as string | undefined,
        claimedAt: fm.claimed_at ? new Date(String(fm.claimed_at)) : undefined,
        startedAt: fm.started_at ? new Date(String(fm.started_at)) : undefined,
        completedAt: fm.completed_at ? new Date(String(fm.completed_at)) : undefined,
        durationMinutes: fm.duration_minutes ? Number(fm.duration_minutes) : undefined,
        tags: ((fm.tags as string[]) ?? []).slice(),
        epicId: undefined,
        milestoneId: undefined,
        phaseId: undefined,
      });
    }
    return ideas;
  }

  async createBug(data: { title: string; priority?: string; estimate?: number; complexity?: string; dependsOn?: string[]; tags?: string[]; simple?: boolean; body?: string }): Promise<import("./models").Task> {
    const bugsDir = join(this.tasksDir, "bugs");
    await mkdir(bugsDir, { recursive: true });
    const indexPath = join(bugsDir, "index.yaml");

    // Determine next bug number
    let nextNum = 1;
    if (existsSync(indexPath)) {
      const idx = this.mustYaml(indexPath);
      const existing = ((idx.bugs as AnyRec[]) ?? [])
        .map((e) => String(e.file ?? ""))
        .map((f) => f.match(/^B(\d+)/))
        .filter(Boolean)
        .map((m) => Number(m![1]));
      if (existing.length) nextNum = Math.max(...existing) + 1;
    }

    const bugId = `B${String(nextNum).padStart(3, "0")}`;
    const filename = `${bugId}-${slugify(data.title)}.todo`;
    const filePath = join(bugsDir, filename);

    const fm: AnyRec = {
      id: bugId,
      title: data.title,
      status: "pending",
      estimate_hours: data.estimate ?? 1,
      complexity: data.complexity ?? "medium",
      priority: data.priority ?? "high",
      depends_on: data.dependsOn ?? [],
      tags: data.tags ?? [],
    };
    let body: string;
    if (data.body) {
      body = data.body;
    } else if (data.simple) {
      body = `\n${data.title}\n`;
    } else {
      body = `\n# ${data.title}\n\n## Steps to Reproduce\n\n1. TODO: Add steps\n\n## Expected Behavior\n\nTODO: Describe expected behavior\n\n## Actual Behavior\n\nTODO: Describe actual behavior\n`;
    }
    await writeFile(filePath, `---\n${stringify(fm)}---\n${body}`);

    // Update bugs index
    const idxData: AnyRec = existsSync(indexPath) ? this.mustYaml(indexPath) : { bugs: [] };
    const bugsList = ((idxData.bugs as AnyRec[]) ?? []).slice();
    bugsList.push({ file: filename });
    idxData.bugs = bugsList;
    await mkdir(dirname(indexPath), { recursive: true });
    await writeFile(indexPath, stringify(idxData));

    return {
      id: bugId,
      title: data.title,
      file: join("bugs", filename),
      status: Status.PENDING,
      estimateHours: data.estimate ?? 1,
      complexity: (data.complexity as Complexity) ?? Complexity.MEDIUM,
      priority: (data.priority as Priority) ?? Priority.HIGH,
      dependsOn: data.dependsOn ?? [],
      tags: data.tags ?? [],
      epicId: undefined,
      milestoneId: undefined,
      phaseId: undefined,
    };
  }

  async createIdea(data: { title: string; estimate?: number; complexity?: string; priority?: string; dependsOn?: string[]; tags?: string[] }): Promise<import("./models").Task> {
    const ideasDir = join(this.tasksDir, "ideas");
    await mkdir(ideasDir, { recursive: true });
    const indexPath = join(ideasDir, "index.yaml");

    let nextNum = 1;
    if (existsSync(indexPath)) {
      const idx = this.mustYaml(indexPath);
      const existing = ((idx.ideas as AnyRec[]) ?? [])
        .map((e) => {
          const id = String(e.id ?? "");
          const idMatch = id.match(/^I(\d+)$/);
          if (idMatch?.[1]) return Number(idMatch[1]);
          const file = String(e.file ?? "");
          const fileMatch = file.match(/^I(\d+)/);
          return fileMatch?.[1] ? Number(fileMatch[1]) : 0;
        })
        .filter((n) => Number.isFinite(n) && n > 0);
      if (existing.length) nextNum = Math.max(...existing) + 1;
    }

    const ideaId = `I${String(nextNum).padStart(3, "0")}`;
    const filename = `${ideaId}-${slugify(data.title)}.todo`;
    const filePath = join(ideasDir, filename);

    const fm: AnyRec = {
      id: ideaId,
      title: data.title,
      status: "pending",
      estimate_hours: data.estimate ?? 1,
      complexity: data.complexity ?? "medium",
      priority: data.priority ?? "medium",
      depends_on: data.dependsOn ?? [],
      tags: data.tags ?? ["idea", "planning"],
    };

    const body = `
# Idea Intake: ${data.title}

## Original Idea

${data.title}

## Planning Task (Equivalent of /plan-task)

- Run \`/plan-task "${data.title}"\` to decompose this idea into actionable work.
- Confirm placement in the current \`.tasks\` hierarchy before creating work items.

## Ingest Plan Into .tasks

- Create implementation items with \`tasks add\` and related hierarchy commands (\`tasks add-epic\`, \`tasks add-milestone\`, \`tasks add-phase\`) as needed.
- Create follow-up defects with \`tasks bug\` when bug-style work is identified.
- Record all created IDs below and wire dependencies.

## Created Work Items

- Add created task IDs
- Add created bug IDs (if any)

## Completion Criteria

- Idea has been decomposed into concrete \`.tasks\` work items.
- New items include clear acceptance criteria and dependencies.
- This idea intake is updated with created IDs and marked done.
`;
    await writeFile(filePath, `---\n${stringify(fm)}---\n${body}`);

    const idxData: AnyRec = existsSync(indexPath) ? this.mustYaml(indexPath) : { ideas: [] };
    const ideasList = ((idxData.ideas as AnyRec[]) ?? []).slice();
    ideasList.push({ id: ideaId, file: filename });
    idxData.ideas = ideasList;
    await mkdir(dirname(indexPath), { recursive: true });
    await writeFile(indexPath, stringify(idxData));

    return {
      id: ideaId,
      title: data.title,
      file: join("ideas", filename),
      status: Status.PENDING,
      estimateHours: data.estimate ?? 1,
      complexity: (data.complexity as Complexity) ?? Complexity.MEDIUM,
      priority: (data.priority as Priority) ?? Priority.MEDIUM,
      dependsOn: data.dependsOn ?? [],
      tags: data.tags ?? ["idea", "planning"],
      epicId: undefined,
      milestoneId: undefined,
      phaseId: undefined,
    };
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

  private leafId(fullId: string): string {
    return fullId.split(".").at(-1) ?? fullId;
  }

  private replaceMappedValues(value: unknown, remap: Record<string, string>): unknown {
    if (typeof value === "string") return remap[value] ?? value;
    if (Array.isArray(value)) return value.map((v) => this.replaceMappedValues(v, remap));
    if (value && typeof value === "object") {
      const out: AnyRec = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.replaceMappedValues(v, remap);
      }
      return out;
    }
    return value;
  }

  private async applyIdRemap(remap: Record<string, string>): Promise<void> {
    if (Object.keys(remap).length === 0) return;

    const root = this.mustYaml(join(this.tasksDir, "index.yaml"));
    await this.writeYaml(join(this.tasksDir, "index.yaml"), this.replaceMappedValues(root, remap) as AnyRec);

    const tree = await this.load();
    for (const phase of tree.phases) {
      const phaseIndexPath = join(this.tasksDir, phase.path, "index.yaml");
      if (existsSync(phaseIndexPath)) {
        const data = this.mustYaml(phaseIndexPath);
        await this.writeYaml(phaseIndexPath, this.replaceMappedValues(data, remap) as AnyRec);
      }
      for (const milestone of phase.milestones) {
        const msIndexPath = join(this.tasksDir, phase.path, milestone.path, "index.yaml");
        if (existsSync(msIndexPath)) {
          const data = this.mustYaml(msIndexPath);
          await this.writeYaml(msIndexPath, this.replaceMappedValues(data, remap) as AnyRec);
        }
        for (const epic of milestone.epics) {
          const epicIndexPath = join(this.tasksDir, phase.path, milestone.path, epic.path, "index.yaml");
          if (existsSync(epicIndexPath)) {
            const data = this.mustYaml(epicIndexPath);
            await this.writeYaml(epicIndexPath, this.replaceMappedValues(data, remap) as AnyRec);
          }
          for (const task of epic.tasks) {
            const taskPath = join(this.tasksDir, task.file);
            if (!existsSync(taskPath)) continue;
            const parsed = parseTodo(await readFile(taskPath, "utf8"));
            const fm = this.replaceMappedValues(parsed.frontmatter, remap) as AnyRec;
            await writeFile(taskPath, `---\n${stringify(fm)}---\n${parsed.body}`);
          }
        }
      }
    }

    for (const auxDir of ["bugs", "ideas"]) {
      const idxPath = join(this.tasksDir, auxDir, "index.yaml");
      if (existsSync(idxPath)) {
        const idx = this.mustYaml(idxPath);
        await this.writeYaml(idxPath, this.replaceMappedValues(idx, remap) as AnyRec);
      }
    }

    const refreshed = await this.load();
    for (const aux of [...(refreshed.bugs ?? []), ...(refreshed.ideas ?? [])]) {
      const filePath = join(this.tasksDir, aux.file);
      if (!existsSync(filePath)) continue;
      const parsed = parseTodo(await readFile(filePath, "utf8"));
      const fm = this.replaceMappedValues(parsed.frontmatter, remap) as AnyRec;
      await writeFile(filePath, `---\n${stringify(fm)}---\n${parsed.body}`);
    }

    for (const runtime of [".context.yaml", ".sessions.yaml"]) {
      const path = join(this.tasksDir, runtime);
      if (!existsSync(path)) continue;
      const data = this.mustYaml(path);
      await this.writeYaml(path, this.replaceMappedValues(data, remap) as AnyRec);
    }
  }

  async moveItem(sourceId: string, destId: string): Promise<{ source_id: string; dest_id: string; new_id: string; remapped_ids: Record<string, string> }> {
    const src = TaskPath.parse(sourceId);
    const dst = TaskPath.parse(destId);
    const tree = await this.load();
    const remap: Record<string, string> = {};

    if (src.isTask && dst.isEpic) {
      const srcTask = tree.phases.flatMap((p) => p.milestones.flatMap((m) => m.epics.flatMap((e) => e.tasks))).find((t) => t.id === sourceId);
      if (!srcTask) throw new Error(`Task not found: ${sourceId}`);
      const dstEpic = tree.phases.flatMap((p) => p.milestones.flatMap((m) => m.epics)).find((e) => e.id === destId);
      if (!dstEpic) throw new Error(`Epic not found: ${destId}`);
      const srcEpic = tree.phases.flatMap((p) => p.milestones.flatMap((m) => m.epics)).find((e) => e.id === srcTask.epicId);
      const srcMilestone = tree.phases.flatMap((p) => p.milestones).find((m) => m.id === srcTask.milestoneId);
      const srcPhase = tree.phases.find((p) => p.id === srcTask.phaseId);
      const dstMilestone = tree.phases.flatMap((p) => p.milestones).find((m) => m.id === dstEpic.milestoneId);
      const dstPhase = tree.phases.find((p) => p.id === dstEpic.phaseId);
      if (!srcEpic || !srcMilestone || !srcPhase || !dstMilestone || !dstPhase) throw new Error("Could not resolve source/destination hierarchy paths");

      const srcEpicDir = join(this.tasksDir, srcPhase.path, srcMilestone.path, srcEpic.path);
      const dstEpicDir = join(this.tasksDir, dstPhase.path, dstMilestone.path, dstEpic.path);
      const oldFilename = srcTask.file.split("/").at(-1)!;
      const oldFile = join(srcEpicDir, oldFilename);
      if (!existsSync(oldFile)) throw new Error(`Task file not found: ${oldFile}`);

      const dstEpicIndex = this.mustYaml(join(dstEpicDir, "index.yaml"));
      const dstTasks = ((dstEpicIndex.tasks as AnyRec[]) ?? []).slice();
      const nums = dstTasks.map((t) => Number(String(t.id ?? "").match(/T(\d+)/)?.[1] ?? "0")).filter((n) => Number.isFinite(n));
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      const newShort = `T${String(next).padStart(3, "0")}`;
      const newId = `${dstEpic.id}.${newShort}`;
      const newFilename = `${newShort}-${slugify(srcTask.title)}.todo`;
      await rename(oldFile, join(dstEpicDir, newFilename));

      const srcEpicIndexPath = join(srcEpicDir, "index.yaml");
      const srcEpicIndex = this.mustYaml(srcEpicIndexPath);
      const oldLeaf = this.leafId(sourceId);
      srcEpicIndex.tasks = (((srcEpicIndex.tasks as AnyRec[]) ?? [])).filter((entry) => {
        const id = String(entry.id ?? "");
        const file = String(entry.file ?? entry.path ?? "");
        return !(id === sourceId || this.leafId(id) === oldLeaf || file === oldFilename);
      });
      await this.writeYaml(srcEpicIndexPath, srcEpicIndex);

      dstTasks.push({
        id: newShort,
        file: newFilename,
        title: srcTask.title,
        status: srcTask.status,
        estimate_hours: srcTask.estimateHours,
        complexity: srcTask.complexity,
        priority: srcTask.priority,
        depends_on: srcTask.dependsOn,
      });
      dstEpicIndex.tasks = dstTasks;
      await this.writeYaml(join(dstEpicDir, "index.yaml"), dstEpicIndex);

      remap[sourceId] = newId;
    } else if (src.isEpic && dst.isMilestone) {
      const srcEpic = tree.phases.flatMap((p) => p.milestones.flatMap((m) => m.epics)).find((e) => e.id === sourceId);
      if (!srcEpic) throw new Error(`Epic not found: ${sourceId}`);
      const dstMilestone = tree.phases.flatMap((p) => p.milestones).find((m) => m.id === destId);
      if (!dstMilestone) throw new Error(`Milestone not found: ${destId}`);
      const srcMilestone = tree.phases.flatMap((p) => p.milestones).find((m) => m.id === srcEpic.milestoneId);
      const srcPhase = tree.phases.find((p) => p.id === srcEpic.phaseId);
      const dstPhase = tree.phases.find((p) => p.id === dstMilestone.phaseId);
      if (!srcMilestone || !srcPhase || !dstPhase) throw new Error("Could not resolve source/destination hierarchy paths");

      const srcMsDir = join(this.tasksDir, srcPhase.path, srcMilestone.path);
      const dstMsDir = join(this.tasksDir, dstPhase.path, dstMilestone.path);
      const srcEpicDir = join(srcMsDir, srcEpic.path);

      const dstMsIndex = this.mustYaml(join(dstMsDir, "index.yaml"));
      const dstEpics = ((dstMsIndex.epics as AnyRec[]) ?? []).slice();
      const nums = dstEpics.map((e) => Number(String(e.id ?? "").match(/E(\d+)/)?.[1] ?? "0")).filter((n) => Number.isFinite(n));
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      const newShort = `E${next}`;
      const newEpicId = `${dstMilestone.id}.${newShort}`;
      const newDirName = `${String(next).padStart(2, "0")}-${slugify(srcEpic.name)}`;
      await rename(srcEpicDir, join(dstMsDir, newDirName));

      const srcMsIndexPath = join(srcMsDir, "index.yaml");
      const srcMsIndex = this.mustYaml(srcMsIndexPath);
      const oldLeaf = this.leafId(sourceId);
      srcMsIndex.epics = (((srcMsIndex.epics as AnyRec[]) ?? [])).filter((entry) => {
        const id = String(entry.id ?? "");
        const path = String(entry.path ?? "");
        return !(id === sourceId || this.leafId(id) === oldLeaf || path === srcEpic.path);
      });
      await this.writeYaml(srcMsIndexPath, srcMsIndex);

      dstEpics.push({
        id: newShort,
        name: srcEpic.name,
        path: newDirName,
        status: srcEpic.status,
        estimate_hours: srcEpic.estimateHours,
        complexity: srcEpic.complexity,
        depends_on: srcEpic.dependsOn,
        description: srcEpic.description ?? "",
      });
      dstMsIndex.epics = dstEpics;
      await this.writeYaml(join(dstMsDir, "index.yaml"), dstMsIndex);

      remap[sourceId] = newEpicId;
      for (const t of srcEpic.tasks) {
        remap[t.id] = t.id.replace(`${sourceId}.`, `${newEpicId}.`);
      }
    } else if (src.isMilestone && dst.isPhase) {
      const srcMilestone = tree.phases.flatMap((p) => p.milestones).find((m) => m.id === sourceId);
      if (!srcMilestone) throw new Error(`Milestone not found: ${sourceId}`);
      const dstPhase = tree.phases.find((p) => p.id === destId);
      if (!dstPhase) throw new Error(`Phase not found: ${destId}`);
      const srcPhase = tree.phases.find((p) => p.id === srcMilestone.phaseId);
      if (!srcPhase) throw new Error("Could not resolve source phase");

      const srcPhaseDir = join(this.tasksDir, srcPhase.path);
      const dstPhaseDir = join(this.tasksDir, dstPhase.path);
      const srcMsDir = join(srcPhaseDir, srcMilestone.path);

      const dstPhaseIndex = this.mustYaml(join(dstPhaseDir, "index.yaml"));
      const dstMilestones = ((dstPhaseIndex.milestones as AnyRec[]) ?? []).slice();
      const nums = dstMilestones.map((m) => Number(String(m.id ?? "").match(/M(\d+)/)?.[1] ?? "0")).filter((n) => Number.isFinite(n));
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      const newShort = `M${next}`;
      const newMsId = `${dstPhase.id}.${newShort}`;
      const newDirName = `${String(next).padStart(2, "0")}-${slugify(srcMilestone.name)}`;
      await rename(srcMsDir, join(dstPhaseDir, newDirName));

      const srcPhaseIndexPath = join(srcPhaseDir, "index.yaml");
      const srcPhaseIndex = this.mustYaml(srcPhaseIndexPath);
      const oldLeaf = this.leafId(sourceId);
      srcPhaseIndex.milestones = (((srcPhaseIndex.milestones as AnyRec[]) ?? [])).filter((entry) => {
        const id = String(entry.id ?? "");
        const path = String(entry.path ?? "");
        return !(id === sourceId || this.leafId(id) === oldLeaf || path === srcMilestone.path);
      });
      await this.writeYaml(srcPhaseIndexPath, srcPhaseIndex);

      dstMilestones.push({
        id: newShort,
        name: srcMilestone.name,
        path: newDirName,
        status: srcMilestone.status,
        estimate_hours: srcMilestone.estimateHours,
        complexity: srcMilestone.complexity,
        depends_on: srcMilestone.dependsOn,
        description: srcMilestone.description ?? "",
      });
      dstPhaseIndex.milestones = dstMilestones;
      await this.writeYaml(join(dstPhaseDir, "index.yaml"), dstPhaseIndex);

      remap[sourceId] = newMsId;
      for (const epic of srcMilestone.epics) {
        const newEpicId = epic.id.replace(`${sourceId}.`, `${newMsId}.`);
        remap[epic.id] = newEpicId;
        for (const task of epic.tasks) {
          remap[task.id] = task.id.replace(`${epic.id}.`, `${newEpicId}.`);
        }
      }
    } else {
      throw new Error("Invalid move: supported moves are task->epic, epic->milestone, milestone->phase");
    }

    await this.applyIdRemap(remap);
    return {
      source_id: sourceId,
      dest_id: destId,
      new_id: remap[sourceId] ?? sourceId,
      remapped_ids: remap,
    };
  }
}
