"""Data models for task management system."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Union


@dataclass(frozen=True)
class TaskPath:
    """
    Represents a hierarchical path in the task system.

    Handles parsing and construction of IDs like:
    - Phase: "P1"
    - Milestone: "P1.M1"
    - Epic: "P1.M1.E1"
    - Task: "P1.M1.E1.T001"

    Examples:
        >>> TaskPath.parse("P1.M1.E1.T001")
        TaskPath(phase='P1', milestone='M1', epic='E1', task='T001')

        >>> TaskPath(phase='P1', milestone='M1').full_id
        'P1.M1'

        >>> TaskPath.parse("P1.M1.E1").task_id("T002")
        'P1.M1.E1.T002'
    """

    phase: str
    milestone: Optional[str] = None
    epic: Optional[str] = None
    task: Optional[str] = None

    @classmethod
    def parse(cls, path_str: str) -> "TaskPath":
        """Parse a path string into a TaskPath object."""
        parts = path_str.split(".")

        if len(parts) < 1 or len(parts) > 4:
            raise ValueError(f"Invalid path format: {path_str}")

        return cls(
            phase=parts[0],
            milestone=parts[1] if len(parts) > 1 else None,
            epic=parts[2] if len(parts) > 2 else None,
            task=parts[3] if len(parts) > 3 else None,
        )

    @classmethod
    def for_phase(cls, phase_id: str) -> "TaskPath":
        """Create a path for a phase."""
        return cls(phase=phase_id)

    @classmethod
    def for_milestone(cls, phase_id: str, milestone_id: str) -> "TaskPath":
        """Create a path for a milestone."""
        return cls(phase=phase_id, milestone=milestone_id)

    @classmethod
    def for_epic(cls, phase_id: str, milestone_id: str, epic_id: str) -> "TaskPath":
        """Create a path for an epic."""
        return cls(phase=phase_id, milestone=milestone_id, epic=epic_id)

    @classmethod
    def for_task(
        cls, phase_id: str, milestone_id: str, epic_id: str, task_id: str
    ) -> "TaskPath":
        """Create a path for a task."""
        return cls(phase=phase_id, milestone=milestone_id, epic=epic_id, task=task_id)

    @property
    def full_id(self) -> str:
        """Return the full path string."""
        parts = [self.phase]
        if self.milestone:
            parts.append(self.milestone)
        if self.epic:
            parts.append(self.epic)
        if self.task:
            parts.append(self.task)
        return ".".join(parts)

    @property
    def phase_id(self) -> str:
        """Return just the phase ID."""
        return self.phase

    @property
    def milestone_id(self) -> Optional[str]:
        """Return the full milestone ID (P1.M1) or None."""
        if not self.milestone:
            return None
        return f"{self.phase}.{self.milestone}"

    @property
    def epic_id(self) -> Optional[str]:
        """Return the full epic ID (P1.M1.E1) or None."""
        if not self.milestone or not self.epic:
            return None
        return f"{self.phase}.{self.milestone}.{self.epic}"

    @property
    def task_id(self) -> Optional[str]:
        """Return the full task ID (P1.M1.E1.T001) or None."""
        if not self.milestone or not self.epic or not self.task:
            return None
        return self.full_id

    @property
    def depth(self) -> int:
        """Return the depth of this path (1=phase, 2=milestone, 3=epic, 4=task)."""
        if self.task:
            return 4
        if self.epic:
            return 3
        if self.milestone:
            return 2
        return 1

    @property
    def is_phase(self) -> bool:
        return self.depth == 1

    @property
    def is_milestone(self) -> bool:
        return self.depth == 2

    @property
    def is_epic(self) -> bool:
        return self.depth == 3

    @property
    def is_task(self) -> bool:
        return self.depth == 4

    def with_milestone(self, milestone: str) -> "TaskPath":
        """Return a new path with the given milestone."""
        return TaskPath(phase=self.phase, milestone=milestone)

    def with_epic(self, epic: str) -> "TaskPath":
        """Return a new path with the given epic."""
        if not self.milestone:
            raise ValueError("Cannot add epic without milestone")
        return TaskPath(phase=self.phase, milestone=self.milestone, epic=epic)

    def with_task(self, task: str) -> "TaskPath":
        """Return a new path with the given task."""
        if not self.milestone or not self.epic:
            raise ValueError("Cannot add task without milestone and epic")
        return TaskPath(
            phase=self.phase, milestone=self.milestone, epic=self.epic, task=task
        )

    def parent(self) -> Optional["TaskPath"]:
        """Return the parent path, or None if this is a phase."""
        if self.task:
            return TaskPath(phase=self.phase, milestone=self.milestone, epic=self.epic)
        if self.epic:
            return TaskPath(phase=self.phase, milestone=self.milestone)
        if self.milestone:
            return TaskPath(phase=self.phase)
        return None

    def __str__(self) -> str:
        return self.full_id

    def __repr__(self) -> str:
        return f"TaskPath({self.full_id!r})"


class Status(str, Enum):
    """Task status values."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BLOCKED = "blocked"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class Complexity(str, Enum):
    """Task complexity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Priority(str, Enum):
    """Task priority levels."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Task:
    """Individual task."""

    id: str  # e.g., "P1.M1.E1.T001"
    title: str
    file: str  # Path to .todo file
    status: Status
    estimate_hours: float
    complexity: Complexity
    priority: Priority
    depends_on: List[str] = field(default_factory=list)
    claimed_by: Optional[str] = None
    claimed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[float] = None  # Actual time spent, saved when task is marked done
    tags: List[str] = field(default_factory=list)

    # Hierarchical IDs - all should be fully qualified (e.g., "P1.M1.E1")
    epic_id: Optional[str] = None
    milestone_id: Optional[str] = None
    phase_id: Optional[str] = None

    @property
    def task_path(self) -> TaskPath:
        """Return a TaskPath for this task."""
        return TaskPath.parse(self.id)

    @property
    def is_available(self) -> bool:
        """Check if task is available to claim."""
        return self.status == Status.PENDING and not self.claimed_by

    @property
    def is_stale(self) -> bool:
        """Check if claim is stale (>2h old)."""
        if not self.claimed_at:
            return False
        age_minutes = (datetime.utcnow() - self.claimed_at).total_seconds() / 60
        return age_minutes > 120  # 2 hours


@dataclass
class Epic:
    """Collection of related tasks."""

    id: str  # e.g., "P1.M1.E1"
    name: str
    path: str
    status: Status
    estimate_hours: float
    complexity: Complexity
    depends_on: List[str] = field(default_factory=list)
    tasks: List[Task] = field(default_factory=list)
    description: Optional[str] = None

    # Computed
    milestone_id: Optional[str] = None
    phase_id: Optional[str] = None

    @property
    def stats(self):
        """Compute task statistics."""
        return {
            "total": len(self.tasks),
            "done": sum(1 for t in self.tasks if t.status == Status.DONE),
            "in_progress": sum(1 for t in self.tasks if t.status == Status.IN_PROGRESS),
            "blocked": sum(1 for t in self.tasks if t.status == Status.BLOCKED),
            "pending": sum(1 for t in self.tasks if t.status == Status.PENDING),
        }

    @property
    def is_complete(self) -> bool:
        """Check if all tasks are done."""
        return all(t.status == Status.DONE for t in self.tasks)


@dataclass
class Milestone:
    """Collection of related epics."""

    id: str  # e.g., "P1.M1"
    name: str
    path: str
    status: Status
    estimate_hours: float
    complexity: Complexity
    depends_on: List[str] = field(default_factory=list)
    epics: List[Epic] = field(default_factory=list)
    description: Optional[str] = None

    # Computed
    phase_id: Optional[str] = None

    @property
    def stats(self):
        """Compute aggregate statistics."""
        total_tasks = sum(len(e.tasks) for e in self.epics)
        done = sum(e.stats["done"] for e in self.epics)
        in_progress = sum(e.stats["in_progress"] for e in self.epics)
        blocked = sum(e.stats["blocked"] for e in self.epics)
        pending = sum(e.stats["pending"] for e in self.epics)

        return {
            "total_tasks": total_tasks,
            "done": done,
            "in_progress": in_progress,
            "blocked": blocked,
            "pending": pending,
        }

    @property
    def is_complete(self) -> bool:
        """Check if all epics are complete."""
        return all(e.is_complete for e in self.epics)


@dataclass
class Phase:
    """Major development phase."""

    id: str  # e.g., "P1"
    name: str
    path: str
    status: Status
    weeks: int
    estimate_hours: float
    priority: Priority
    depends_on: List[str] = field(default_factory=list)
    milestones: List[Milestone] = field(default_factory=list)
    description: Optional[str] = None

    @property
    def stats(self):
        """Compute aggregate statistics."""
        total_tasks = sum(m.stats["total_tasks"] for m in self.milestones)
        done = sum(m.stats["done"] for m in self.milestones)
        in_progress = sum(m.stats["in_progress"] for m in self.milestones)
        blocked = sum(m.stats["blocked"] for m in self.milestones)
        pending = sum(m.stats["pending"] for m in self.milestones)

        return {
            "total_tasks": total_tasks,
            "done": done,
            "in_progress": in_progress,
            "blocked": blocked,
            "pending": pending,
        }

    @property
    def is_complete(self) -> bool:
        """Check if all milestones are complete."""
        return all(m.is_complete for m in self.milestones)


@dataclass
class TaskTree:
    """Root of the entire task tree."""

    project: str
    description: str
    timeline_weeks: int
    phases: List[Phase] = field(default_factory=list)
    critical_path: List[str] = field(default_factory=list)
    next_available: Optional[str] = None

    @property
    def stats(self):
        """Compute global statistics."""
        total_tasks = sum(p.stats["total_tasks"] for p in self.phases)
        done = sum(p.stats["done"] for p in self.phases)
        in_progress = sum(p.stats["in_progress"] for p in self.phases)
        blocked = sum(p.stats["blocked"] for p in self.phases)
        pending = sum(p.stats["pending"] for p in self.phases)

        total_estimate_hours = sum(p.estimate_hours for p in self.phases)

        return {
            "total_tasks": total_tasks,
            "done": done,
            "in_progress": in_progress,
            "blocked": blocked,
            "pending": pending,
            "total_estimate_hours": total_estimate_hours,
        }

    def find_task(self, task_id: str) -> Optional[Task]:
        """Find a task by ID."""
        for phase in self.phases:
            for milestone in phase.milestones:
                for epic in milestone.epics:
                    for task in epic.tasks:
                        if task.id == task_id:
                            return task
        return None

    def find_epic(self, epic_id: str) -> Optional[Epic]:
        """Find an epic by ID."""
        for phase in self.phases:
            for milestone in phase.milestones:
                for epic in milestone.epics:
                    if epic.id == epic_id:
                        return epic
        return None

    def find_milestone(self, milestone_id: str) -> Optional[Milestone]:
        """Find a milestone by ID."""
        for phase in self.phases:
            for milestone in phase.milestones:
                if milestone.id == milestone_id:
                    return milestone
        return None

    def find_phase(self, phase_id: str) -> Optional[Phase]:
        """Find a phase by ID."""
        for phase in self.phases:
            if phase.id == phase_id:
                return phase
        return None
