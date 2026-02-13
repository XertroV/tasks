export enum Status {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  BLOCKED = "blocked",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export enum Complexity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum Priority {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export class TaskPath {
  constructor(
    public readonly phase: string,
    public readonly milestone?: string,
    public readonly epic?: string,
    public readonly task?: string,
  ) {}

  static parse(pathStr: string): TaskPath {
    const parts = pathStr.split(".");
    if (parts.length < 1 || parts.length > 4 || !parts[0]) {
      throw new Error(`Invalid path format: ${pathStr}`);
    }
    return new TaskPath(parts[0], parts[1], parts[2], parts[3]);
  }

  static forPhase(phaseId: string): TaskPath {
    return new TaskPath(phaseId);
  }

  static forMilestone(phaseId: string, milestoneId: string): TaskPath {
    return new TaskPath(phaseId, milestoneId);
  }

  static forEpic(phaseId: string, milestoneId: string, epicId: string): TaskPath {
    return new TaskPath(phaseId, milestoneId, epicId);
  }

  static forTask(phaseId: string, milestoneId: string, epicId: string, taskId: string): TaskPath {
    return new TaskPath(phaseId, milestoneId, epicId, taskId);
  }

  get fullId(): string {
    return [this.phase, this.milestone, this.epic, this.task].filter(Boolean).join(".");
  }

  get phaseId(): string {
    return this.phase;
  }

  get milestoneId(): string | undefined {
    if (!this.milestone) return undefined;
    return `${this.phase}.${this.milestone}`;
  }

  get epicId(): string | undefined {
    if (!this.milestone || !this.epic) return undefined;
    return `${this.phase}.${this.milestone}.${this.epic}`;
  }

  get taskId(): string | undefined {
    if (!this.milestone || !this.epic || !this.task) return undefined;
    return this.fullId;
  }

  get depth(): 1 | 2 | 3 | 4 {
    if (this.task) return 4;
    if (this.epic) return 3;
    if (this.milestone) return 2;
    return 1;
  }

  get isPhase(): boolean {
    return this.depth === 1;
  }

  get isMilestone(): boolean {
    return this.depth === 2;
  }

  get isEpic(): boolean {
    return this.depth === 3;
  }

  get isTask(): boolean {
    return this.depth === 4;
  }

  withMilestone(milestone: string): TaskPath {
    return new TaskPath(this.phase, milestone);
  }

  withEpic(epic: string): TaskPath {
    if (!this.milestone) throw new Error("Cannot add epic without milestone");
    return new TaskPath(this.phase, this.milestone, epic);
  }

  withTask(task: string): TaskPath {
    if (!this.milestone || !this.epic) throw new Error("Cannot add task without milestone and epic");
    return new TaskPath(this.phase, this.milestone, this.epic, task);
  }

  parent(): TaskPath | undefined {
    if (this.task) return new TaskPath(this.phase, this.milestone, this.epic);
    if (this.epic) return new TaskPath(this.phase, this.milestone);
    if (this.milestone) return new TaskPath(this.phase);
    return undefined;
  }
}

export interface Task {
  id: string;
  title: string;
  file: string;
  status: Status;
  estimateHours: number;
  complexity: Complexity;
  priority: Priority;
  dependsOn: string[];
  claimedBy?: string;
  claimedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMinutes?: number;
  tags: string[];
  epicId?: string;
  milestoneId?: string;
  phaseId?: string;
}

export interface Epic {
  id: string;
  name: string;
  path: string;
  status: Status;
  estimateHours: number;
  complexity: Complexity;
  dependsOn: string[];
  tasks: Task[];
  description?: string;
  milestoneId?: string;
  phaseId?: string;
}

export interface Milestone {
  id: string;
  name: string;
  path: string;
  status: Status;
  estimateHours: number;
  complexity: Complexity;
  dependsOn: string[];
  epics: Epic[];
  description?: string;
  phaseId?: string;
}

export interface Phase {
  id: string;
  name: string;
  path: string;
  status: Status;
  weeks: number;
  estimateHours: number;
  priority: Priority;
  dependsOn: string[];
  milestones: Milestone[];
  description?: string;
}

export interface TaskTree {
  project: string;
  description?: string;
  timelineWeeks?: number;
  criticalPath: string[];
  nextAvailable?: string;
  phases: Phase[];
  bugs: Task[];
}
