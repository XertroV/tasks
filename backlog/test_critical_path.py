"""Tests for CriticalPathCalculator, especially multi-task selection diversity."""

import pytest
import yaml
from pathlib import Path
from backlog.loader import TaskLoader
from backlog.critical_path import CriticalPathCalculator


@pytest.fixture
def tmp_diverse_tasks_dir(tmp_path):
    """Create a task tree with multiple phases, milestones, and epics for diversity testing."""
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    # Create root index with multiple phases
    root_index = {
        "project": "Test Project",
        "description": "Test project for diversity testing",
        "timeline_weeks": 4,
        "phases": [
            {
                "id": "P1",
                "name": "Phase 1",
                "path": "01-phase-1",
                "status": "in_progress",
            },
            {
                "id": "P2",
                "name": "Phase 2",
                "path": "02-phase-2",
                "status": "in_progress",
            },
            {
                "id": "P3",
                "name": "Phase 3",
                "path": "03-phase-3",
                "status": "in_progress",
            },
        ],
    }
    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(root_index, f)

    # Create Phase 1 with 2 milestones
    phase1_dir = tasks_dir / "01-phase-1"
    phase1_dir.mkdir()
    phase1_index = {
        "milestones": [
            {
                "id": "M1",
                "name": "Milestone 1",
                "path": "01-milestone-1",
                "status": "in_progress",
            },
            {
                "id": "M2",
                "name": "Milestone 2",
                "path": "02-milestone-2",
                "status": "in_progress",
            },
        ],
    }
    with open(phase1_dir / "index.yaml", "w") as f:
        yaml.dump(phase1_index, f)

    # Create P1.M1 with 2 epics
    milestone_p1m1_dir = phase1_dir / "01-milestone-1"
    milestone_p1m1_dir.mkdir()
    milestone_p1m1_index = {
        "epics": [
            {
                "id": "E1",
                "name": "Epic 1",
                "path": "01-epic-1",
                "status": "in_progress",
            },
            {
                "id": "E2",
                "name": "Epic 2",
                "path": "02-epic-2",
                "status": "in_progress",
            },
        ],
    }
    with open(milestone_p1m1_dir / "index.yaml", "w") as f:
        yaml.dump(milestone_p1m1_index, f)

    # Create P1.M2 with 1 epic
    milestone_p1m2_dir = phase1_dir / "02-milestone-2"
    milestone_p1m2_dir.mkdir()
    milestone_p1m2_index = {
        "epics": [
            {
                "id": "E1",
                "name": "Epic 3",
                "path": "01-epic-3",
                "status": "in_progress",
            },
        ],
    }
    with open(milestone_p1m2_dir / "index.yaml", "w") as f:
        yaml.dump(milestone_p1m2_index, f)

    # Create Phase 2 with 1 milestone and 1 epic
    phase2_dir = tasks_dir / "02-phase-2"
    phase2_dir.mkdir()
    phase2_index = {
        "milestones": [
            {
                "id": "M1",
                "name": "Milestone 3",
                "path": "01-milestone-3",
                "status": "in_progress",
            },
        ],
    }
    with open(phase2_dir / "index.yaml", "w") as f:
        yaml.dump(phase2_index, f)

    milestone_p2m1_dir = phase2_dir / "01-milestone-3"
    milestone_p2m1_dir.mkdir()
    milestone_p2m1_index = {
        "epics": [
            {
                "id": "E1",
                "name": "Epic 4",
                "path": "01-epic-4",
                "status": "in_progress",
            },
        ],
    }
    with open(milestone_p2m1_dir / "index.yaml", "w") as f:
        yaml.dump(milestone_p2m1_index, f)

    # Create Phase 3 with 1 milestone and 1 epic
    phase3_dir = tasks_dir / "03-phase-3"
    phase3_dir.mkdir()
    phase3_index = {
        "milestones": [
            {
                "id": "M1",
                "name": "Milestone 4",
                "path": "01-milestone-4",
                "status": "in_progress",
            },
        ],
    }
    with open(phase3_dir / "index.yaml", "w") as f:
        yaml.dump(phase3_index, f)

    milestone_p3m1_dir = phase3_dir / "01-milestone-4"
    milestone_p3m1_dir.mkdir()
    milestone_p3m1_index = {
        "epics": [
            {
                "id": "E1",
                "name": "Epic 5",
                "path": "01-epic-5",
                "status": "in_progress",
            },
        ],
    }
    with open(milestone_p3m1_dir / "index.yaml", "w") as f:
        yaml.dump(milestone_p3m1_index, f)

    # Create tasks in each epic
    epic_configs = [
        ("P1.M1.E1", milestone_p1m1_dir / "01-epic-1"),
        ("P1.M1.E2", milestone_p1m1_dir / "02-epic-2"),
        ("P1.M2.E1", milestone_p1m2_dir / "01-epic-3"),
        ("P2.M1.E1", milestone_p2m1_dir / "01-epic-4"),
        ("P3.M1.E1", milestone_p3m1_dir / "01-epic-5"),
    ]

    for epic_id, epic_dir in epic_configs:
        epic_dir.mkdir(parents=True, exist_ok=True)

        # Create 2 tasks per epic
        tasks_list = []
        for task_num in range(1, 3):
            task_id = f"{epic_id}.T{task_num:03d}"
            task_file = epic_dir / f"T{task_num:03d}-task.todo"

            frontmatter = {
                "id": task_id,
                "title": f"Task {task_id}",
                "status": "pending",
                "estimate_hours": 2.0,
                "complexity": "medium",
                "priority": "high",
                "depends_on": [],
                "tags": ["test"],
            }

            content = f"""---
{yaml.dump(frontmatter, default_flow_style=False)}---

# Task {task_id}

Test task description.

## Requirements

- Requirement 1
- Requirement 2

## Acceptance Criteria

- Criterion 1
"""

            with open(task_file, "w") as f:
                f.write(content)

            tasks_list.append({
                "id": task_id,
                "title": f"Task {task_id}",
                "file": f"T{task_num:03d}-task.todo",
                "status": "pending",
                "estimate_hours": 2.0,
                "complexity": "medium",
                "priority": "high",
            })

        # Create epic index
        epic_index = {"tasks": tasks_list}
        with open(epic_dir / "index.yaml", "w") as f:
            yaml.dump(epic_index, f)

    return tmp_path


class TestDiversitySelection:
    """Test that find_independent_tasks selects diverse tasks across the codebase."""

    def test_selects_different_phases_over_same_milestone(self, tmp_diverse_tasks_dir):
        """When selecting multiple tasks, should prioritize different phases over same milestone."""
        # Load the task tree
        loader = TaskLoader(tmp_diverse_tasks_dir / ".tasks")
        tree = loader.load()

        # Create calculator
        complexity_multipliers = {"low": 1.0, "medium": 1.5, "high": 2.0, "critical": 3.0}
        calculator = CriticalPathCalculator(tree, complexity_multipliers)

        # Use P1.M1.E1.T001 as primary task
        primary_task = tree.find_task("P1.M1.E1.T001")
        assert primary_task is not None

        # Find 3 independent tasks
        independent = calculator.find_independent_tasks(primary_task, count=3)

        # Should get 3 tasks
        assert len(independent) == 3

        # Extract phase IDs from selected tasks
        selected_phases = set()
        selected_milestones = set()
        for task_id in independent:
            task = tree.find_task(task_id)
            assert task is not None
            selected_phases.add(task.phase_id)
            selected_milestones.add(task.milestone_id)

        # Should have tasks from different phases (P2, P3 preferred over P1.M2)
        # At minimum, should have 2 different phases
        assert len(selected_phases) >= 2, f"Expected tasks from multiple phases, got: {selected_phases}"

        # Should have tasks from P2 and P3 (different phases)
        assert "P2" in selected_phases or "P3" in selected_phases, \
            f"Expected tasks from P2 or P3, got phases: {selected_phases}"

    def test_selects_different_milestones_when_no_other_phases(self, tmp_diverse_tasks_dir):
        """When only one phase available, should still spread across milestones."""
        # Load the task tree
        loader = TaskLoader(tmp_diverse_tasks_dir / ".tasks")
        tree = loader.load()

        # Mark all tasks in P2 and P3 as done to limit available tasks
        for phase in tree.phases:
            if phase.id in ["P2", "P3"]:
                for milestone in phase.milestones:
                    for epic in milestone.epics:
                        for task in epic.tasks:
                            task.status = "done"

        # Create calculator
        complexity_multipliers = {"low": 1.0, "medium": 1.5, "high": 2.0, "critical": 3.0}
        calculator = CriticalPathCalculator(tree, complexity_multipliers)

        # Use P1.M1.E1.T001 as primary task
        primary_task = tree.find_task("P1.M1.E1.T001")
        assert primary_task is not None

        # Find 2 independent tasks (should get from P1.M1.E2 and P1.M2.E1)
        independent = calculator.find_independent_tasks(primary_task, count=2)

        # Should get at least 1 task
        assert len(independent) >= 1

        # Extract milestone IDs
        selected_milestones = set()
        for task_id in independent:
            task = tree.find_task(task_id)
            assert task is not None
            selected_milestones.add(task.milestone_id)

        # Should prioritize P1.M2 (different milestone) over P1.M1.E2 (same milestone)
        if len(independent) >= 1:
            # At least one should be from P1.M2
            milestone_ids = [tree.find_task(tid).milestone_id for tid in independent]
            assert "P1.M2" in milestone_ids, \
                f"Expected task from P1.M2, got: {milestone_ids}"

    def test_all_selected_tasks_are_independent(self, tmp_diverse_tasks_dir):
        """All selected tasks should be from different epics and have no dependencies."""
        # Load the task tree
        loader = TaskLoader(tmp_diverse_tasks_dir / ".tasks")
        tree = loader.load()

        # Create calculator
        complexity_multipliers = {"low": 1.0, "medium": 1.5, "high": 2.0, "critical": 3.0}
        calculator = CriticalPathCalculator(tree, complexity_multipliers)

        # Use P1.M1.E1.T001 as primary task
        primary_task = tree.find_task("P1.M1.E1.T001")
        assert primary_task is not None

        # Find 4 independent tasks
        independent = calculator.find_independent_tasks(primary_task, count=4)

        # Should get multiple tasks
        assert len(independent) >= 2

        # All should be from different epics
        epic_ids = set()
        for task_id in independent:
            task = tree.find_task(task_id)
            assert task is not None
            assert task.epic_id not in epic_ids, f"Found duplicate epic: {task.epic_id}"
            epic_ids.add(task.epic_id)

        # None should be the primary task's epic
        assert primary_task.epic_id not in epic_ids

        # None should have dependency relationships with each other
        tasks = [tree.find_task(tid) for tid in independent]
        for i, task_a in enumerate(tasks):
            for task_b in tasks[i+1:]:
                assert not calculator._has_dependency_relationship(task_a, task_b), \
                    f"Found dependency between {task_a.id} and {task_b.id}"

    def test_diversity_score_calculation(self, tmp_diverse_tasks_dir):
        """Test that diversity scores are calculated correctly."""
        # Load the task tree
        loader = TaskLoader(tmp_diverse_tasks_dir / ".tasks")
        tree = loader.load()

        # Create calculator
        complexity_multipliers = {"low": 1.0, "medium": 1.5, "high": 2.0, "critical": 3.0}
        calculator = CriticalPathCalculator(tree, complexity_multipliers)

        # Get tasks from different locations
        primary_task = tree.find_task("P1.M1.E1.T001")  # Phase 1, Milestone 1, Epic 1
        same_milestone_task = tree.find_task("P1.M1.E2.T001")  # Phase 1, Milestone 1, Epic 2
        diff_milestone_task = tree.find_task("P1.M2.E1.T001")  # Phase 1, Milestone 2
        diff_phase_task = tree.find_task("P2.M1.E1.T001")  # Phase 2

        assert all([primary_task, same_milestone_task, diff_milestone_task, diff_phase_task])

        # Calculate scores
        score_same_milestone = calculator._calculate_diversity_score(
            same_milestone_task, primary_task, []
        )
        score_diff_milestone = calculator._calculate_diversity_score(
            diff_milestone_task, primary_task, []
        )
        score_diff_phase = calculator._calculate_diversity_score(
            diff_phase_task, primary_task, []
        )

        # Different phase should score highest
        assert score_diff_phase > score_diff_milestone, \
            f"Different phase ({score_diff_phase}) should score higher than different milestone ({score_diff_milestone})"

        # Different milestone should score higher than same milestone
        assert score_diff_milestone > score_same_milestone, \
            f"Different milestone ({score_diff_milestone}) should score higher than same milestone ({score_same_milestone})"

        # Verify approximate score values
        assert score_diff_phase >= 1000, "Different phase should score at least 1000"
        assert score_diff_milestone >= 100, "Different milestone should score at least 100"
        assert score_same_milestone >= 10, "Different epic in same milestone should score at least 10"

    def test_diversity_with_selected_tasks(self, tmp_diverse_tasks_dir):
        """Test that diversity score accounts for already selected tasks."""
        # Load the task tree
        loader = TaskLoader(tmp_diverse_tasks_dir / ".tasks")
        tree = loader.load()

        # Create calculator
        complexity_multipliers = {"low": 1.0, "medium": 1.5, "high": 2.0, "critical": 3.0}
        calculator = CriticalPathCalculator(tree, complexity_multipliers)

        # Get tasks
        primary_task = tree.find_task("P1.M1.E1.T001")  # Phase 1, Milestone 1
        candidate_task = tree.find_task("P2.M1.E1.T001")  # Phase 2
        selected_task = tree.find_task("P1.M2.E1.T001")  # Phase 1, Milestone 2

        assert all([primary_task, candidate_task, selected_task])

        # Score without selected tasks
        score_no_selected = calculator._calculate_diversity_score(
            candidate_task, primary_task, []
        )

        # Score with a selected task from Phase 1
        score_with_selected = calculator._calculate_diversity_score(
            candidate_task, primary_task, [selected_task]
        )

        # Score should be higher when we already have a P1 task selected
        # because P2 is different from both P1 (primary) and P1 (selected)
        assert score_with_selected > score_no_selected, \
            "Score should increase when candidate is different from selected tasks"

    def test_realistic_multi_selection_scenario(self, tmp_diverse_tasks_dir):
        """
        Realistic scenario: grab --multi should select tasks spread across the codebase.

        Given a primary task from P1.M1.E1, when selecting 3 additional tasks,
        they should be maximally spread out (ideally from P2, P3, and P1.M2).
        """
        # Load the task tree
        loader = TaskLoader(tmp_diverse_tasks_dir / ".tasks")
        tree = loader.load()

        # Create calculator
        complexity_multipliers = {"low": 1.0, "medium": 1.5, "high": 2.0, "critical": 3.0}
        calculator = CriticalPathCalculator(tree, complexity_multipliers)

        # Use P1.M1.E1.T001 as primary task
        primary_task = tree.find_task("P1.M1.E1.T001")
        assert primary_task is not None

        # Find 3 independent tasks - this simulates `grab --multi --count=3`
        independent = calculator.find_independent_tasks(primary_task, count=3)

        # Should get 3 tasks
        assert len(independent) == 3

        # Analyze distribution
        selected_tasks = [tree.find_task(tid) for tid in independent]
        phase_distribution = {}
        milestone_distribution = {}

        for task in selected_tasks:
            phase_distribution[task.phase_id] = phase_distribution.get(task.phase_id, 0) + 1
            milestone_distribution[task.milestone_id] = milestone_distribution.get(task.milestone_id, 0) + 1

        print(f"\nSelected tasks: {independent}")
        print(f"Phase distribution: {phase_distribution}")
        print(f"Milestone distribution: {milestone_distribution}")

        # Key assertion: should have tasks from multiple phases
        # With P1, P2, P3 available, we should get at least 2 different phases
        assert len(phase_distribution) >= 2, \
            f"Expected tasks from at least 2 phases, got: {phase_distribution}"

        # Should prioritize different phases
        # Expect at least one task from P2 or P3 (different phases entirely)
        has_different_phase = any(phase_id != "P1" for phase_id in phase_distribution.keys())
        assert has_different_phase, \
            f"Expected at least one task from P2 or P3, got: {phase_distribution}"

        # All tasks should be from different epics (already enforced, but verify)
        epic_ids = [task.epic_id for task in selected_tasks]
        assert len(epic_ids) == len(set(epic_ids)), "All tasks should be from different epics"

        # None should be from the same epic as primary
        assert primary_task.epic_id not in epic_ids, "No task should be from primary task's epic"
