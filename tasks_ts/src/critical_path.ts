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
      .sort((a, b) => this.score(b) - this.score(a))
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
