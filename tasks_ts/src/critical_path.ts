import type { Task, TaskTree } from "./models";
import { Status } from "./models";
import { getAllTasks } from "./helpers";

export class CriticalPathCalculator {
  constructor(
    private readonly tree: TaskTree,
    private readonly complexityMultipliers: Record<string, number> = {
      low: 1,
      medium: 1.25,
      high: 1.5,
      critical: 2,
    },
  ) {}

  private score(task: Task): number {
    return task.estimateHours * (this.complexityMultipliers[task.complexity] ?? 1);
  }

  private typeRank(task: Task): number {
    if (/^B\d+$/.test(task.id)) return 0;
    if (/^I\d+$/.test(task.id)) return 2;
    return 1;
  }

  private priorityRank(task: Task): number {
    if (task.priority === "critical") return 0;
    if (task.priority === "high") return 1;
    if (task.priority === "medium") return 2;
    return 3;
  }

  private compareAvailable(a: Task, b: Task): number {
    const typeDiff = this.typeRank(a) - this.typeRank(b);
    if (typeDiff !== 0) return typeDiff;

    const priorityDiff = this.priorityRank(a) - this.priorityRank(b);
    if (priorityDiff !== 0) return priorityDiff;

    return this.score(b) - this.score(a);
  }

  private prioritizeTaskIds(taskIds: string[], criticalPath: string[]): string[] {
    const cpPos = new Map(criticalPath.map((id, idx) => [id, idx]));
    const ranked = taskIds
      .map((id, originalIdx) => {
        const task = getAllTasks(this.tree).find((t) => t.id === id);
        if (!task) return undefined;
        const typeRank = this.typeRank(task);
        const priorityRank = this.priorityRank(task);
        const onCritical = cpPos.has(id) ? 0 : 1;
        const cpIndex = cpPos.get(id) ?? Number.POSITIVE_INFINITY;
        return { id, originalIdx, typeRank, priorityRank, onCritical, cpIndex };
      })
      .filter((x): x is { id: string; originalIdx: number; typeRank: number; priorityRank: number; onCritical: number; cpIndex: number } => !!x);

    ranked.sort((a, b) => {
      if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank;
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
      if (a.onCritical !== b.onCritical) return a.onCritical - b.onCritical;
      if (a.cpIndex !== b.cpIndex) return a.cpIndex - b.cpIndex;
      return a.originalIdx - b.originalIdx;
    });

    return ranked.map((r) => r.id);
  }

  isTaskAvailable(task: Task): boolean {
    if (task.status !== Status.PENDING) return false;
    const byId = new Map(getAllTasks(this.tree).map((t) => [t.id, t]));
    for (const dep of task.dependsOn) {
      const dt = byId.get(dep);
      if (dt && dt.status !== Status.DONE) return false;
    }
    return true;
  }

  findAllAvailable(): string[] {
    return getAllTasks(this.tree)
      .filter((t) => this.isTaskAvailable(t))
      .sort((a, b) => this.compareAvailable(a, b))
      .map((t) => t.id);
  }

  calculate(): { criticalPath: string[]; nextAvailable?: string } {
    const all = getAllTasks(this.tree);
    const criticalPath = all.slice().sort((a, b) => this.score(b) - this.score(a)).map((t) => t.id);
    const available = this.findAllAvailable();
    const nextAvailable = available[0];
    return { criticalPath, nextAvailable };
  }

  private hasDependencyRelationship(taskA: Task, taskB: Task): boolean {
    return this.isInDependencyChain(taskA, taskB.id, new Set()) || this.isInDependencyChain(taskB, taskA.id, new Set());
  }

  private isInDependencyChain(task: Task, targetId: string, visited: Set<string>): boolean {
    if (visited.has(task.id)) return false;
    visited.add(task.id);
    for (const depId of task.dependsOn) {
      if (depId === targetId) return true;
      const depTask = getAllTasks(this.tree).find((t) => t.id === depId);
      if (depTask && this.isInDependencyChain(depTask, targetId, visited)) return true;
    }
    return false;
  }

  findAdditionalBugs(primaryTask: Task, count = 2): string[] {
    if (!/^B\d+$/.test(primaryTask.id)) return [];
    const bugIds = this.findAllAvailable().filter((id) => /^B\d+$/.test(id) && id !== primaryTask.id);
    const { criticalPath } = this.calculate();
    const prioritizedBugIds = this.prioritizeTaskIds(bugIds, criticalPath);

    const selected: Task[] = [];
    for (const id of prioritizedBugIds) {
      const task = getAllTasks(this.tree).find((t) => t.id === id);
      if (!task) continue;
      if (selected.length >= count) break;
      if (this.hasDependencyRelationship(primaryTask, task)) continue;
      if (selected.some((s) => this.hasDependencyRelationship(s, task))) continue;
      selected.push(task);
    }
    return selected.map((t) => t.id);
  }
}
