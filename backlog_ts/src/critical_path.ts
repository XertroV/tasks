import type { Epic, Milestone, Phase, Task, TaskTree } from "./models";
import { Status } from "./models";
import { findEpic, findMilestone, findPhase, getAllTasks } from "./helpers";

type DependencyGraph = {
  nodes: string[];
  nodeOrder: Map<string, number>;
  weights: Map<string, number>;
  edges: Map<string, Set<string>>;
};

class DependencyCycleError extends Error {
  constructor(readonly cycle: string[]) {
    super(`task dependency cycle detected: ${cycle.join(" -> ")}`);
    this.name = "DependencyCycleError";
  }
}

export class CriticalPathCalculator {
  private readonly allTasks: Task[];
  private readonly taskById: Map<string, Task>;

  constructor(
    private readonly tree: TaskTree,
    private readonly complexityMultipliers: Record<string, number> = {
      low: 1,
      medium: 1.25,
      high: 1.5,
      critical: 2,
    },
  ) {
    this.allTasks = getAllTasks(tree);
    this.taskById = new Map(this.allTasks.map((task) => [task.id, task]));
  }

  private score(task: Task): number {
    if (task.status === Status.DONE) return 0;
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
        const task = this.taskById.get(id);
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
    if (task.status !== Status.PENDING || task.claimedBy) return false;

    for (const dep of task.dependsOn) {
      const depTasks = this.resolveDependencyTargets(dep, task.milestoneId);
      if (!depTasks || depTasks.some((depTask) => depTask.status !== Status.DONE)) {
        return false;
      }
    }

    if (!task.dependsOn.length) {
      const epic = task.epicId ? findEpic(this.tree, task.epicId) : undefined;
      if (epic) {
        const taskIndex = epic.tasks.findIndex((t) => t.id === task.id);
        if (taskIndex > 0) {
          const prevTask = epic.tasks[taskIndex - 1];
          if (prevTask.status !== Status.DONE) {
            return false;
          }
        }
      }
    }

    const phase = task.phaseId ? findPhase(this.tree, task.phaseId) : undefined;
    if (phase?.dependsOn.length) {
      for (const depPhaseId of phase.dependsOn) {
        const depPhase = findPhase(this.tree, depPhaseId);
        if (depPhase && !this.isPhaseComplete(depPhase)) {
          return false;
        }
      }
    }

    const milestone = task.milestoneId ? findMilestone(this.tree, task.milestoneId) : undefined;
    if (milestone?.dependsOn.length) {
      for (const depMilestoneId of milestone.dependsOn) {
        const depMilestone = findMilestone(this.tree, depMilestoneId);
        if (depMilestone && !this.isMilestoneComplete(depMilestone)) {
          return false;
        }
      }
    }

    const epic = task.epicId ? findEpic(this.tree, task.epicId) : undefined;
    if (epic?.dependsOn.length) {
      for (const depEpicId of epic.dependsOn) {
        const depEpic = findEpic(this.tree, depEpicId);
        if (depEpic && !this.isEpicComplete(depEpic)) {
          return false;
        }
      }
    }

    return true;
  }

  findAllAvailable(): string[] {
    return this.allTasks
      .filter((t) => this.isTaskAvailable(t))
      .sort((a, b) => this.compareAvailable(a, b))
      .map((t) => t.id);
  }

  findSiblingTasks(primaryTask: Task, count = 4): string[] {
    const epic = primaryTask.epicId ? findEpic(this.tree, primaryTask.epicId) : undefined;
    if (!epic) {
      return [];
    }

    const primaryIndex = epic.tasks.findIndex((t) => t.id === primaryTask.id);
    if (primaryIndex < 0) {
      return [];
    }

    const batchTaskIds = [primaryTask.id];
    const siblingIds: string[] = [];

    for (const task of epic.tasks.slice(primaryIndex + 1)) {
      if (siblingIds.length >= count) {
        break;
      }

      if (task.status !== Status.PENDING || task.claimedBy) {
        continue;
      }

      if (!this.checkDependenciesWithinBatch(task, batchTaskIds)) {
        continue;
      }

      batchTaskIds.push(task.id);
      siblingIds.push(task.id);
    }

    return siblingIds;
  }

  isPhaseComplete(phase: Phase): boolean {
    if (!phase.milestones.length) return true;
    return phase.milestones.every((milestone) => this.isMilestoneComplete(milestone));
  }

  isMilestoneComplete(milestone: Milestone): boolean {
    if (!milestone.epics.length) return true;
    return milestone.epics.every((epic) => this.isEpicComplete(epic));
  }

  isEpicComplete(epic: Epic): boolean {
    return epic.tasks.every((task) => task.status === Status.DONE);
  }

  calculate(explicitOnly = false): { criticalPath: string[]; nextAvailable?: string } {
    return this.calculateFromGraph(this.buildDependencyGraph(explicitOnly));
  }

  findAnyCycle(explicitOnly = false): string[] | null {
    return this.findFirstCycle(this.buildDependencyGraph(explicitOnly));
  }

  private calculateFromGraph(graph: DependencyGraph): { criticalPath: string[]; nextAvailable?: string } {
    const criticalPath = this.findLongestPath(graph);
    const available = this.findAllAvailable();
    const nextAvailable = available[0];
    return { criticalPath, nextAvailable };
  }

  private buildDependencyGraph(explicitOnly = false): DependencyGraph {
    const graph: DependencyGraph = {
      nodes: [],
      nodeOrder: new Map<string, number>(),
      weights: new Map<string, number>(),
      edges: new Map<string, Set<string>>(),
    };

    for (const task of this.allTasks) {
      graph.nodeOrder.set(task.id, graph.nodes.length);
      graph.nodes.push(task.id);
      graph.weights.set(task.id, this.score(task));
      graph.edges.set(task.id, new Set<string>());
    }

    this.addExplicitTaskDependencies(graph);
    if (!explicitOnly) {
      this.addHierarchyDependencies(graph);
    }

    return graph;
  }

  private addExplicitTaskDependencies(graph: DependencyGraph): void {
    for (const phase of this.tree.phases) {
      for (const milestone of phase.milestones) {
        for (const epic of milestone.epics) {
          for (const task of epic.tasks) {
            this.addExplicitEdgesForTask(graph, task, milestone.id);
          }
        }
      }
    }

    for (const bug of this.tree.bugs ?? []) {
      this.addExplicitEdgesForTask(graph, bug, bug.milestoneId);
    }

    for (const idea of this.tree.ideas ?? []) {
      this.addExplicitEdgesForTask(graph, idea, idea.milestoneId);
    }
  }

  private addExplicitEdgesForTask(graph: DependencyGraph, task: Task, milestoneId: string | undefined): void {
    for (const depId of task.dependsOn) {
      const depTasks = this.resolveDependencyTargets(depId, milestoneId);
      if (!depTasks) {
        continue;
      }
      for (const depTask of depTasks) {
        this.addEdge(graph, depTask.id, task.id);
      }
    }
  }

  private addHierarchyDependencies(graph: DependencyGraph): void {
    for (const phase of this.tree.phases) {
      for (const milestone of phase.milestones) {
        for (const epic of milestone.epics) {
          for (let idx = 1; idx < epic.tasks.length; idx += 1) {
            const task = epic.tasks[idx];
            const prevTask = epic.tasks[idx - 1];
            if (task && prevTask && task.dependsOn.length === 0) {
              this.addEdge(graph, prevTask.id, task.id);
            }
          }

          for (const depEpicId of epic.dependsOn) {
            const depEpic = this.resolveEpicDependency(depEpicId, milestone.id);
            if (!depEpic || depEpic.tasks.length === 0 || epic.tasks.length === 0) {
              continue;
            }
            this.addEdge(graph, depEpic.tasks[depEpic.tasks.length - 1]!.id, epic.tasks[0]!.id);
          }
        }

        for (const depMilestoneId of milestone.dependsOn) {
          const depMilestone = this.resolveMilestoneDependency(depMilestoneId, phase.id);
          if (!depMilestone || depMilestone.epics.length === 0 || milestone.epics.length === 0) {
            continue;
          }
          const lastDepTask = depMilestone.epics.at(-1)?.tasks.at(-1);
          const firstTask = milestone.epics[0]?.tasks[0];
          if (lastDepTask && firstTask) {
            this.addEdge(graph, lastDepTask.id, firstTask.id);
          }
        }
      }

      for (const depPhaseId of phase.dependsOn) {
        const depPhase = this.resolvePhaseDependency(depPhaseId);
        if (!depPhase || depPhase.milestones.length === 0 || phase.milestones.length === 0) {
          continue;
        }
        const lastDepTask = depPhase.milestones.at(-1)?.epics.at(-1)?.tasks.at(-1);
        const firstTask = phase.milestones[0]?.epics[0]?.tasks[0];
        if (lastDepTask && firstTask) {
          this.addEdge(graph, lastDepTask.id, firstTask.id);
        }
      }
    }
  }

  private addEdge(graph: DependencyGraph, from: string, to: string): void {
    if (!from || !to) return;
    const edgeSet = graph.edges.get(from) ?? new Set<string>();
    edgeSet.add(to);
    graph.edges.set(from, edgeSet);
  }

  private findLongestPath(graph: DependencyGraph): string[] {
    const cycle = this.findFirstCycle(graph);
    if (cycle) {
      throw new DependencyCycleError(cycle);
    }

    const order = this.topologicalSort(graph);
    if (!order.length) {
      return [];
    }

    const dist = new Map<string, number>();
    const parent = new Map<string, string | undefined>();
    for (const node of order) {
      dist.set(node, graph.weights.get(node) ?? 0);
    }

    for (const node of order) {
      for (const successor of this.sortedSuccessors(graph, node)) {
        const candidate = (dist.get(node) ?? 0) + (graph.weights.get(successor) ?? 0);
        if (candidate > (dist.get(successor) ?? 0)) {
          dist.set(successor, candidate);
          parent.set(successor, node);
        }
      }
    }

    let endNode = order[0]!;
    let endScore = dist.get(endNode) ?? 0;
    for (const node of order) {
      const score = dist.get(node) ?? 0;
      if (score > endScore) {
        endNode = node;
        endScore = score;
      }
    }

    const path: string[] = [];
    let cursor: string | undefined = endNode;
    while (cursor) {
      path.unshift(cursor);
      cursor = parent.get(cursor);
    }
    return path;
  }

  private findFirstCycle(graph: DependencyGraph): string[] | null {
    const state = new Map<string, 0 | 1 | 2>();
    const stack: string[] = [];
    const position = new Map<string, number>();

    const dfs = (node: string): string[] | null => {
      state.set(node, 1);
      position.set(node, stack.length);
      stack.push(node);

      for (const successor of this.sortedSuccessors(graph, node)) {
        if (state.get(successor) === 1) {
          const start = position.get(successor) ?? 0;
          return [...stack.slice(start), successor];
        }
        if (state.get(successor) === 0 || state.get(successor) === undefined) {
          const cycle = dfs(successor);
          if (cycle) {
            return cycle;
          }
        }
      }

      stack.pop();
      position.delete(node);
      state.set(node, 2);
      return null;
    };

    for (const node of graph.nodes) {
      if (state.get(node) === 2) {
        continue;
      }
      const cycle = dfs(node);
      if (cycle) {
        return cycle;
      }
    }

    return null;
  }

  private topologicalSort(graph: DependencyGraph): string[] {
    const inDegree = new Map<string, number>();
    for (const node of graph.nodes) {
      inDegree.set(node, 0);
    }

    for (const [from, successors] of graph.edges.entries()) {
      if (!inDegree.has(from)) {
        continue;
      }
      for (const successor of successors) {
        if (!inDegree.has(successor)) {
          continue;
        }
        inDegree.set(successor, (inDegree.get(successor) ?? 0) + 1);
      }
    }

    const queue = graph.nodes.filter((node) => (inDegree.get(node) ?? 0) === 0);
    const resolved: string[] = [];

    while (queue.length > 0) {
      queue.sort((a, b) => (graph.nodeOrder.get(a) ?? 0) - (graph.nodeOrder.get(b) ?? 0));
      const node = queue.shift();
      if (!node) {
        break;
      }
      resolved.push(node);

      for (const successor of this.sortedSuccessors(graph, node)) {
        if (!inDegree.has(successor)) {
          continue;
        }
        const nextDegree = (inDegree.get(successor) ?? 0) - 1;
        inDegree.set(successor, nextDegree);
        if (nextDegree === 0) {
          queue.push(successor);
        }
      }
    }

    return resolved;
  }

  private sortedSuccessors(graph: DependencyGraph, node: string): string[] {
    const successors = Array.from(graph.edges.get(node) ?? []);
    successors.sort((a, b) => (graph.nodeOrder.get(a) ?? 0) - (graph.nodeOrder.get(b) ?? 0));
    return successors;
  }

  private resolveEpicDependency(depEpicId: string, currentMilestoneId?: string): Epic | undefined {
    const depId = depEpicId.trim();
    if (!depId) {
      return undefined;
    }

    const depEpic = findEpic(this.tree, depId);
    if (depEpic) {
      return depEpic;
    }

    if (!depId.includes(".") && currentMilestoneId) {
      return findEpic(this.tree, `${currentMilestoneId}.${depId}`);
    }

    return undefined;
  }

  private resolveMilestoneDependency(depMilestoneId: string, currentPhaseId?: string): Milestone | undefined {
    const depId = depMilestoneId.trim();
    if (!depId) {
      return undefined;
    }

    const depMilestone = findMilestone(this.tree, depId);
    if (depMilestone) {
      return depMilestone;
    }

    if (!depId.includes(".") && currentPhaseId) {
      return findMilestone(this.tree, `${currentPhaseId}.${depId}`);
    }

    return undefined;
  }

  private resolvePhaseDependency(depPhaseId: string): Phase | undefined {
    const depId = depPhaseId.trim();
    if (!depId) {
      return undefined;
    }
    return findPhase(this.tree, depId);
  }

  private checkDependenciesWithinBatch(task: Task, batchTaskIds: string[]): boolean {
    const batchTaskIdSet = new Set(batchTaskIds);

    for (const depId of task.dependsOn) {
      const depTasks = this.resolveDependencyTargets(depId, task.milestoneId);
      if (!depTasks || depTasks.some((depTask) => depTask.status !== Status.DONE && !batchTaskIdSet.has(depTask.id))) {
        return false;
      }
    }

    if (!task.dependsOn.length && task.epicId) {
      const epic = findEpic(this.tree, task.epicId);
      if (epic) {
        const taskIndex = epic.tasks.findIndex((t) => t.id === task.id);
        if (taskIndex > 0) {
          const prevTask = epic.tasks[taskIndex - 1];
          if (prevTask.status !== Status.DONE && !batchTaskIdSet.has(prevTask.id)) {
            return false;
          }
        }
      }
    }

    const phase = task.phaseId ? findPhase(this.tree, task.phaseId) : undefined;
    if (phase?.dependsOn.length) {
      for (const depPhaseId of phase.dependsOn) {
        const depPhase = findPhase(this.tree, depPhaseId);
        if (depPhase && !this.isPhaseComplete(depPhase)) {
          return false;
        }
      }
    }

    const milestone = task.milestoneId ? findMilestone(this.tree, task.milestoneId) : undefined;
    if (milestone?.dependsOn.length) {
      for (const depMilestoneId of milestone.dependsOn) {
        const depMilestone = findMilestone(this.tree, depMilestoneId);
        if (depMilestone && !this.isMilestoneComplete(depMilestone)) {
          return false;
        }
      }
    }

    const epic = task.epicId ? findEpic(this.tree, task.epicId) : undefined;
    if (epic?.dependsOn.length) {
      for (const depEpicId of epic.dependsOn) {
        const depEpic = findEpic(this.tree, depEpicId);
        if (depEpic && !this.isEpicComplete(depEpic)) {
          return false;
        }
      }
    }

    return true;
  }

  private hasDependencyRelationship(taskA: Task, taskB: Task): boolean {
    return this.isInDependencyChain(taskA, taskB.id, new Set()) || this.isInDependencyChain(taskB, taskA.id, new Set());
  }

  private isInDependencyChain(task: Task, targetId: string, visited: Set<string>): boolean {
    if (visited.has(task.id)) return false;
    visited.add(task.id);

    for (const depId of task.dependsOn) {
      if (depId === targetId) return true;
      const depTasks = this.resolveDependencyTargets(depId, task.milestoneId);
      if (!depTasks) {
        continue;
      }
      for (const depTask of depTasks) {
        if (depTask.id === targetId || this.isInDependencyChain(depTask, targetId, visited)) {
          return true;
        }
      }
    }
    return false;
  }

  private resolveDependencyTargets(
    depId: string,
    milestoneId: string | undefined,
  ): Task[] | null {
    const direct = this.taskById.get(depId);
    if (direct) return [direct];

    const resolvedEpicId = depId.includes(".") ? depId : milestoneId ? `${milestoneId}.${depId}` : depId;
    if (!resolvedEpicId) return null;

    const depEpic = findEpic(this.tree, resolvedEpicId);
    if (depEpic) return depEpic.tasks;

    return null;
  }

  findAdditionalBugs(primaryTask: Task, count = 2): string[] {
    if (!/^B\d+$/.test(primaryTask.id)) return [];
    const bugIds = this.findAllAvailable().filter((id) => /^B\d+$/.test(id) && id !== primaryTask.id);
    const { criticalPath } = this.calculate();
    const prioritizedBugIds = this.prioritizeTaskIds(bugIds, criticalPath);

    const selected: Task[] = [];
    for (const id of prioritizedBugIds) {
      const task = this.taskById.get(id);
      if (!task) continue;
      if (selected.length >= count) break;
      if (this.hasDependencyRelationship(primaryTask, task)) continue;
      if (selected.some((s) => this.hasDependencyRelationship(s, task))) continue;
      selected.push(task);
    }
    return selected.map((t) => t.id);
  }
}
