"""Critical Chain Project Management (CCPM) critical path calculation."""

import re
import networkx as nx
from typing import List, Dict, Tuple, Optional
from .models import TaskTree, Task, Epic, Milestone, Phase, Status


class CriticalPathCalculator:
    """Calculate critical path using CCPM principles."""

    PRIORITY_RANK = {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 3,
    }

    TYPE_RANK = {
        "bug": 0,
        "task": 1,
        "idea": 2,
    }

    def __init__(self, tree: TaskTree, complexity_multipliers: Dict[str, float]):
        self.tree = tree
        self.complexity_multipliers = complexity_multipliers
        self.graph = nx.DiGraph()

    def calculate(self) -> Tuple[List[str], str]:
        """
        Calculate critical path and next available task.

        Returns:
            (critical_path, next_available_task_id)
        """
        # Build dependency graph
        self._build_graph()

        # Find longest path (critical path)
        critical_path = self._find_longest_path()

        # Find next available task on critical path
        next_task = self._find_next_available(critical_path)

        return critical_path, next_task

    def _build_graph(self) -> None:
        """Build weighted dependency graph."""
        # Add all tasks as nodes
        for phase in self.tree.phases:
            self._add_phase_nodes(phase)
        for aux_task in self._iter_aux_tasks():
            self._add_bug_node(aux_task)

        # Add dependency edges
        for phase in self.tree.phases:
            self._add_phase_dependencies(phase)
        self._add_bug_dependencies()

    def _iter_aux_tasks(self):
        """Iterate over non-hierarchical task items (bugs, ideas)."""
        yield from getattr(self.tree, "bugs", [])
        yield from getattr(self.tree, "ideas", [])

    def _add_bug_node(self, bug: Task) -> None:
        """Add a bug as a weighted graph node."""
        multiplier = self.complexity_multipliers.get(bug.complexity.value, 1.0)
        weight = 0 if bug.status == Status.DONE else bug.estimate_hours * multiplier

        self.graph.add_node(
            bug.id,
            weight=weight,
            status=bug.status.value,
            task=bug,
        )

    def _add_bug_dependencies(self) -> None:
        """Add dependency edges for bugs."""
        for aux_task in self._iter_aux_tasks():
            for dep_id in aux_task.depends_on:
                if self.graph.has_node(dep_id):
                    self.graph.add_edge(dep_id, aux_task.id)

    def _add_phase_nodes(self, phase: Phase) -> None:
        """Add nodes for all tasks in a phase."""
        for milestone in phase.milestones:
            for epic in milestone.epics:
                for task in epic.tasks:
                    # Calculate weighted duration (estimate * complexity multiplier)
                    multiplier = self.complexity_multipliers.get(
                        task.complexity.value, 1.0
                    )

                    # If task is done, weight is 0 (no remaining time)
                    if task.status == Status.DONE:
                        weight = 0
                    else:
                        weight = task.estimate_hours * multiplier

                    self.graph.add_node(
                        task.id,
                        weight=weight,
                        status=task.status.value,
                        task=task,
                    )

    def _add_phase_dependencies(self, phase: Phase) -> None:
        """Add dependency edges."""
        for milestone in phase.milestones:
            for epic in milestone.epics:
                # Add task-level dependencies
                for i, task in enumerate(epic.tasks):
                    # Explicit dependencies
                    for dep_id in task.depends_on:
                        if self.graph.has_node(dep_id):
                            self.graph.add_edge(dep_id, task.id)

                    # Implicit dependency on previous task (if no explicit deps)
                    if not task.depends_on and i > 0:
                        prev_task = epic.tasks[i - 1]
                        self.graph.add_edge(prev_task.id, task.id)

                # Epic-level dependencies
                for dep_epic_id in epic.depends_on:
                    # Resolve relative (E1) or absolute (P1.M1.E1) epic dependency IDs.
                    dep_epic = self._resolve_epic_dependency(dep_epic_id, milestone.id)
                    if dep_epic and dep_epic.tasks:
                        last_dep_task = dep_epic.tasks[-1]
                        # First task of current epic depends on last task of dep epic
                        if epic.tasks:
                            self.graph.add_edge(last_dep_task.id, epic.tasks[0].id)

            # Milestone-level dependencies
            for dep_milestone_id in milestone.depends_on:
                # Resolve relative (M1) or absolute (P1.M1) milestone dependency IDs.
                dep_milestone = self._resolve_milestone_dependency(
                    dep_milestone_id, phase
                )
                if dep_milestone and dep_milestone.epics:
                    # Find last task of last epic in dep milestone
                    last_dep_epic = dep_milestone.epics[-1]
                    if last_dep_epic.tasks:
                        last_dep_task = last_dep_epic.tasks[-1]
                        # First task of current milestone depends on it
                        if milestone.epics and milestone.epics[0].tasks:
                            first_task = milestone.epics[0].tasks[0]
                            self.graph.add_edge(last_dep_task.id, first_task.id)

        # Phase-level dependencies
        for phase in self.tree.phases:
            for dep_phase_id in phase.depends_on:
                dep_phase = self.tree.find_phase(dep_phase_id)
                if dep_phase and dep_phase.milestones:
                    # Find last task of last milestone in dep phase
                    last_dep_milestone = dep_phase.milestones[-1]
                    if last_dep_milestone.epics:
                        last_dep_epic = last_dep_milestone.epics[-1]
                        if last_dep_epic.tasks:
                            last_dep_task = last_dep_epic.tasks[-1]
                            # First task of current phase depends on it
                            if phase.milestones and phase.milestones[0].epics:
                                first_epic = phase.milestones[0].epics[0]
                                if first_epic.tasks:
                                    first_task = first_epic.tasks[0]
                                    self.graph.add_edge(last_dep_task.id, first_task.id)

    def _find_longest_path(self) -> List[str]:
        """Find longest path through the graph (critical path)."""
        if not self.graph.nodes():
            return []

        # Check for cycles first
        if not nx.is_directed_acyclic_graph(self.graph):
            try:
                cycles = list(nx.simple_cycles(self.graph))
                if not cycles:
                    raise RuntimeError(
                        "Dependency graph is not acyclic but no cycles found (unexpected)"
                    )

                cycle_info = []
                for i, cycle in enumerate(cycles[:5]):  # Show first 5 cycles
                    if not cycle:
                        cycle_info.append(
                            f"  Cycle {i + 1}: [empty cycle - this is unexpected]"
                        )
                        continue
                    cycle_str = (
                        " → ".join(str(node) for node in cycle) + f" → {cycle[0]}"
                    )
                    cycle_info.append(f"  Cycle {i + 1}: {cycle_str}")

                raise RuntimeError(
                    f"Dependency graph contains {len(cycles)} cycle(s):\n"
                    + "\n".join(cycle_info)
                    + (
                        f"\n  ... and {len(cycles) - 5} more cycles"
                        if len(cycles) > 5
                        else ""
                    )
                )
            except RuntimeError:
                raise
            except Exception as e:
                raise RuntimeError(f"Error detecting cycles: {str(e)}") from e

        try:
            # Use topological sort to order nodes
            topo_order = list(nx.topological_sort(self.graph))
        except nx.NetworkXError as e:
            # Shouldn't happen after cycle check, but handle anyway
            raise RuntimeError(f"Topological sort failed: {str(e)}") from e

        # Calculate longest path using dynamic programming.
        # Seed each node with its own weight so isolated nodes are ranked correctly.
        dist = {node: self.graph.nodes[node]["weight"] for node in topo_order}
        parent = {node: None for node in topo_order}

        for node in topo_order:
            for successor in self.graph.successors(node):
                successor_weight = self.graph.nodes[successor]["weight"]
                new_dist = dist[node] + successor_weight
                if new_dist > dist[successor]:
                    dist[successor] = new_dist
                    parent[successor] = node

        # Find node with maximum distance
        if not dist:
            return []

        end_node = max(dist.items(), key=lambda x: x[1])[0]

        # Reconstruct path
        path = []
        current = end_node
        while current is not None:
            path.append(current)
            current = parent[current]

        path.reverse()
        return path

    def _find_next_available(self, critical_path: List[str]) -> str:
        """Find next available task using priority-first ordering."""
        available_task_ids = self.find_all_available()
        if not available_task_ids:
            return None

        prioritized = self.prioritize_task_ids(available_task_ids, critical_path)
        return prioritized[0] if prioritized else None

    def prioritize_task_ids(
        self, task_ids: List[str], critical_path: List[str]
    ) -> List[str]:
        """Sort task IDs by type, priority, then critical-path proximity.

        Ordering:
        1. Task type: bugs > normal tasks > ideas
        2. Task priority: critical > high > medium > low
        3. On critical path (preferred within same type/priority)
        4. Earlier position on critical path
        5. Original input order
        """
        critical_path_pos = {task_id: idx for idx, task_id in enumerate(critical_path)}
        ranked = []

        for original_idx, task_id in enumerate(task_ids):
            task = self.tree.find_task(task_id)
            if not task:
                continue

            priority_value = (
                task.priority.value
                if hasattr(task.priority, "value")
                else str(task.priority)
            )
            type_rank = self._task_type_rank(task.id)
            priority_rank = self.PRIORITY_RANK.get(priority_value, 999)
            on_critical = task_id in critical_path_pos
            cp_index = critical_path_pos.get(task_id, float("inf"))

            ranked.append(
                (
                    type_rank,
                    priority_rank,
                    0 if on_critical else 1,
                    cp_index,
                    original_idx,
                    task_id,
                )
            )

        ranked.sort(key=lambda r: (r[0], r[1], r[2], r[3], r[4]))
        return [r[5] for r in ranked]

    def _task_type_rank(self, task_id: str) -> int:
        """Return ordering rank for task categories: bug > task > idea."""
        if re.match(r"^B\d+$", task_id):
            return self.TYPE_RANK["bug"]
        if re.match(r"^I\d+$", task_id):
            return self.TYPE_RANK["idea"]
        return self.TYPE_RANK["task"]

    def _resolve_milestone_dependency(
        self, dep_milestone_id: str, current_phase: Optional[Phase]
    ) -> Optional[Milestone]:
        """Resolve milestone dependency IDs in absolute or phase-relative form."""
        dep_id = dep_milestone_id.strip()
        if not dep_id:
            return None

        dep_milestone = self.tree.find_milestone(dep_id)
        if dep_milestone:
            return dep_milestone

        if "." not in dep_id and current_phase:
            return self.tree.find_milestone(f"{current_phase.id}.{dep_id}")

        return None

    def _resolve_epic_dependency(
        self, dep_epic_id: str, current_milestone_id: Optional[str]
    ) -> Optional[Epic]:
        """Resolve epic dependency IDs in absolute or milestone-relative form."""
        dep_id = dep_epic_id.strip()
        if not dep_id:
            return None

        dep_epic = self.tree.find_epic(dep_id)
        if dep_epic:
            return dep_epic

        if "." not in dep_id and current_milestone_id:
            return self.tree.find_epic(f"{current_milestone_id}.{dep_id}")

        return None

    def _check_dependencies(self, task: Task) -> bool:
        """Check if all task dependencies are satisfied."""
        # Check explicit task dependencies
        for dep_id in task.depends_on:
            dep_task = self.tree.find_task(dep_id)
            if not dep_task:
                # Dependency not found - assume not satisfied
                return False

            if dep_task.status != Status.DONE:
                return False

        # Check implicit dependencies (previous task in epic)
        if not task.depends_on:
            epic = self.tree.find_epic(task.epic_id)
            if epic and epic.tasks:
                task_index = next(
                    (i for i, t in enumerate(epic.tasks) if t.id == task.id), None
                )
                if task_index and task_index > 0:
                    prev_task = epic.tasks[task_index - 1]
                    if prev_task.status != Status.DONE:
                        return False

        # Check phase-level dependencies
        task_phase = self.tree.find_phase(task.phase_id) if task.phase_id else None
        if task_phase and task_phase.depends_on:
            for dep_phase_id in task_phase.depends_on:
                dep_phase = self.tree.find_phase(dep_phase_id)
                if dep_phase:
                    # Check if all tasks in dependency phase are complete
                    if not self._is_phase_complete(dep_phase):
                        return False

        # Check milestone-level dependencies
        task_milestone = (
            self.tree.find_milestone(task.milestone_id) if task.milestone_id else None
        )

        if task_milestone and task_milestone.depends_on:
            for dep_milestone_id in task_milestone.depends_on:
                dep_milestone = self._resolve_milestone_dependency(
                    dep_milestone_id, task_phase
                )

                if dep_milestone:
                    # Check if all tasks in dependency milestone are complete
                    if not self._is_milestone_complete(dep_milestone):
                        return False

        # Check epic-level dependencies
        task_epic = self.tree.find_epic(task.epic_id) if task.epic_id else None

        if task_epic and task_epic.depends_on:
            for dep_epic_id in task_epic.depends_on:
                dep_epic = self._resolve_epic_dependency(dep_epic_id, task.milestone_id)
                if dep_epic:
                    # Check if all tasks in dependency epic are complete
                    if not self._is_epic_complete(dep_epic):
                        return False

        return True

    def _is_phase_complete(self, phase: Phase) -> bool:
        """Check if all tasks in a phase are complete."""
        for milestone in phase.milestones:
            if not self._is_milestone_complete(milestone):
                return False
        return True

    def _is_milestone_complete(self, milestone: Milestone) -> bool:
        """Check if all tasks in a milestone are complete."""
        for epic in milestone.epics:
            if not self._is_epic_complete(epic):
                return False
        return True

    def _is_epic_complete(self, epic: Epic) -> bool:
        """Check if all tasks in an epic are complete."""
        return all(task.status == Status.DONE for task in epic.tasks)

    def find_all_available(self) -> List[str]:
        """Find all tasks that are currently available (unblocked)."""
        available_tasks = []

        for phase in self.tree.phases:
            for milestone in phase.milestones:
                for epic in milestone.epics:
                    for task in epic.tasks:
                        if (
                            task.status == Status.PENDING
                            and not task.claimed_by
                            and self._check_dependencies(task)
                        ):
                            available_tasks.append(task.id)

        for aux_task in self._iter_aux_tasks():
            if (
                aux_task.status == Status.PENDING
                and not aux_task.claimed_by
                and self._check_dependencies(aux_task)
            ):
                available_tasks.append(aux_task.id)

        return available_tasks

    def find_sibling_tasks(self, primary_task: Task, count: int = 3) -> List[str]:
        """Find up to 'count' sibling tasks from the same epic as primary_task.

        Siblings are tasks that come after primary_task in the same epic,
        are pending/unclaimed, and whose dependencies are satisfied within
        the batch context (i.e., dependencies are either DONE or included
        earlier in the batch).

        Args:
            primary_task: The primary task already claimed
            count: Maximum number of additional sibling tasks to find

        Returns:
            List of sibling task IDs (not including primary_task)
        """
        epic = self.tree.find_epic(primary_task.epic_id)
        if not epic:
            return []

        # Find primary task's index in the epic
        primary_idx = next(
            (i for i, t in enumerate(epic.tasks) if t.id == primary_task.id), None
        )
        if primary_idx is None:
            return []

        # Build batch incrementally, starting with primary
        batch_ids = [primary_task.id]
        sibling_ids = []

        for task in epic.tasks[primary_idx + 1 :]:
            if len(sibling_ids) >= count:
                break

            # Must be pending and unclaimed
            if task.status != Status.PENDING or task.claimed_by:
                continue

            # Check if dependencies are satisfied within batch context
            if self._check_dependencies_within_batch(task, batch_ids):
                batch_ids.append(task.id)
                sibling_ids.append(task.id)

        return sibling_ids

    def _check_dependencies_within_batch(
        self, task: Task, batch_task_ids: List[str]
    ) -> bool:
        """Check if task's dependencies are satisfied within the batch context.

        A dependency is satisfied if it is either:
        1. Already DONE
        2. Included in the batch (will be completed before this task)

        Args:
            task: The task to check
            batch_task_ids: IDs of tasks already in the batch (including primary)

        Returns:
            True if all dependencies are satisfied within the batch
        """
        # Check explicit dependencies
        for dep_id in task.depends_on:
            dep_task = self.tree.find_task(dep_id)
            if not dep_task:
                return False
            if dep_task.status != Status.DONE and dep_id not in batch_task_ids:
                return False

        # Check implicit dependency (previous task in epic)
        if not task.depends_on:
            epic = self.tree.find_epic(task.epic_id)
            if epic and epic.tasks:
                task_index = next(
                    (i for i, t in enumerate(epic.tasks) if t.id == task.id), None
                )
                if task_index and task_index > 0:
                    prev_task = epic.tasks[task_index - 1]
                    if (
                        prev_task.status != Status.DONE
                        and prev_task.id not in batch_task_ids
                    ):
                        return False

        # Check phase-level dependencies (these must be fully satisfied - can't be in batch)
        task_phase = self.tree.find_phase(task.phase_id) if task.phase_id else None
        if task_phase and task_phase.depends_on:
            for dep_phase_id in task_phase.depends_on:
                dep_phase = self.tree.find_phase(dep_phase_id)
                if dep_phase and not self._is_phase_complete(dep_phase):
                    return False

        # Check milestone-level dependencies
        task_milestone = (
            self.tree.find_milestone(task.milestone_id) if task.milestone_id else None
        )

        if task_milestone and task_milestone.depends_on:
            for dep_milestone_id in task_milestone.depends_on:
                dep_milestone = self._resolve_milestone_dependency(
                    dep_milestone_id, task_phase
                )

                if dep_milestone and not self._is_milestone_complete(dep_milestone):
                    return False

        # Check epic-level dependencies
        task_epic = self.tree.find_epic(task.epic_id) if task.epic_id else None

        if task_epic and task_epic.depends_on:
            for dep_epic_id in task_epic.depends_on:
                dep_epic = self._resolve_epic_dependency(dep_epic_id, task.milestone_id)
                if dep_epic and not self._is_epic_complete(dep_epic):
                    return False

        return True

    def find_independent_tasks(self, primary_task: Task, count: int = 2) -> List[str]:
        """Find up to 'count' tasks independent from primary_task, maximizing spread across codebase."""
        available_tasks = self.find_all_available()

        # Collect ALL candidates that are from different epics and have no dependency with primary
        candidates = []
        for task_id in available_tasks:
            if task_id == primary_task.id:
                continue

            task = self.tree.find_task(task_id)
            if not task:
                continue

            # Must be from different epic
            if task.epic_id == primary_task.epic_id:
                continue

            # Check for dependency relationships with primary
            if self._has_dependency_relationship(primary_task, task):
                continue

            candidates.append(task)

        # Iteratively select the most diverse tasks
        selected_tasks = []

        for _ in range(count):
            if not candidates:
                break

            # Score all remaining candidates based on diversity from primary + selected
            best_task = None
            best_score = -1

            for task in candidates:
                # Check for dependency conflicts with already selected tasks
                has_conflict = any(
                    self._has_dependency_relationship(task, selected)
                    for selected in selected_tasks
                )

                if has_conflict:
                    continue

                # Calculate diversity score
                score = self._calculate_diversity_score(
                    task, primary_task, selected_tasks
                )

                if score > best_score:
                    best_score = score
                    best_task = task

            if best_task is None:
                break

            # Add the best task and remove from candidates
            selected_tasks.append(best_task)
            candidates.remove(best_task)

        return [task.id for task in selected_tasks]

    def _calculate_diversity_score(
        self, task: Task, primary_task: Task, selected_tasks: List[Task]
    ) -> int:
        """Calculate diversity score for a task - higher means more spread out."""
        score = 0

        # Score vs primary task
        if task.phase_id != primary_task.phase_id:
            score += 1000  # Different phase is highly valuable
        elif task.milestone_id != primary_task.milestone_id:
            score += 100  # Different milestone within same phase
        elif task.epic_id != primary_task.epic_id:
            score += 10  # Different epic (already enforced, but score anyway)

        # Score vs already selected tasks
        for selected in selected_tasks:
            if task.phase_id != selected.phase_id:
                score += 1000
            elif task.milestone_id != selected.milestone_id:
                score += 100
            elif task.epic_id != selected.epic_id:
                score += 10

        return score

    def _has_dependency_relationship(self, task_a: Task, task_b: Task) -> bool:
        """Check if task_a and task_b have any dependency relationship."""
        return self._is_in_dependency_chain(
            task_a, task_b.id
        ) or self._is_in_dependency_chain(task_b, task_a.id)

    def _is_in_dependency_chain(self, task: Task, target_id: str, visited=None) -> bool:
        """Recursively check if target_id is in task's dependency chain."""
        if visited is None:
            visited = set()

        if task.id in visited:
            return False
        visited.add(task.id)

        # Check explicit dependencies
        for dep_id in task.depends_on:
            if dep_id == target_id:
                return True
            dep_task = self.tree.find_task(dep_id)
            if dep_task and self._is_in_dependency_chain(dep_task, target_id, visited):
                return True

        # Check implicit dependencies (previous task in epic)
        epic = self.tree.find_epic(task.epic_id)
        if epic and not task.depends_on:
            task_idx = next(
                (i for i, t in enumerate(epic.tasks) if t.id == task.id), None
            )
            if task_idx and task_idx > 0:
                prev_task = epic.tasks[task_idx - 1]
                if prev_task.id == target_id:
                    return True

        return False
