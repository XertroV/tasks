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
}
