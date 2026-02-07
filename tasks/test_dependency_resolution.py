"""Regression tests for milestone/epic dependency ID resolution."""

from pathlib import Path

import pytest
import yaml

from tasks.critical_path import CriticalPathCalculator
from tasks.loader import TaskLoader
from tasks.models import Status


COMPLEXITY_MULTIPLIERS = {
    "low": 1.0,
    "medium": 1.5,
    "high": 2.0,
    "critical": 3.0,
}


def _write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)


def _write_task(epic_dir: Path, task_id: str) -> None:
    task_file = epic_dir / "T001-task.todo"
    frontmatter = {
        "id": task_id,
        "title": f"Task {task_id}",
        "status": "pending",
        "estimate_hours": 1.0,
        "complexity": "low",
        "priority": "medium",
        "depends_on": [],
        "tags": ["test"],
    }
    content = (
        "---\n"
        f"{yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)}"
        "---\n\n"
        f"# {task_id}\n"
    )
    with open(task_file, "w") as f:
        f.write(content)


def _write_epic(epic_dir: Path, task_id: str) -> None:
    epic_dir.mkdir(parents=True, exist_ok=True)
    _write_yaml(
        epic_dir / "index.yaml",
        {
            "tasks": [
                {
                    "id": task_id,
                    "title": f"Task {task_id}",
                    "file": "T001-task.todo",
                    "status": "pending",
                    "estimate_hours": 1.0,
                    "complexity": "low",
                    "priority": "medium",
                    "depends_on": [],
                }
            ]
        },
    )
    _write_task(epic_dir, task_id)


@pytest.fixture
def tmp_dependency_resolution_dir(tmp_path: Path) -> Path:
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    _write_yaml(
        tasks_dir / "index.yaml",
        {
            "project": "Dependency Resolution Test",
            "description": "Regression coverage for dependency ID normalization",
            "timeline_weeks": 2,
            "phases": [
                {"id": "P1", "name": "Phase 1", "path": "01-phase-1", "status": "in_progress"},
                {"id": "P2", "name": "Phase 2", "path": "02-phase-2", "status": "in_progress"},
            ],
        },
    )

    # Phase 1 -> Milestone M1 with two epics. E2 depends on E1.
    phase1_dir = tasks_dir / "01-phase-1"
    _write_yaml(
        phase1_dir / "index.yaml",
        {
            "milestones": [
                {"id": "M1", "name": "Milestone 1", "path": "01-milestone-1", "status": "in_progress"}
            ]
        },
    )
    p1m1_dir = phase1_dir / "01-milestone-1"
    _write_yaml(
        p1m1_dir / "index.yaml",
        {
            "epics": [
                {"id": "E1", "name": "Epic 1", "path": "01-epic-1", "status": "in_progress"},
                {
                    "id": "E2",
                    "name": "Epic 2",
                    "path": "02-epic-2",
                    "status": "in_progress",
                    "depends_on": ["E1"],
                },
            ]
        },
    )
    _write_epic(p1m1_dir / "01-epic-1", "P1.M1.E1.T001")
    _write_epic(p1m1_dir / "02-epic-2", "P1.M1.E2.T001")

    # Phase 2 -> Milestone M1 depends on absolute milestone ref P1.M1.
    phase2_dir = tasks_dir / "02-phase-2"
    _write_yaml(
        phase2_dir / "index.yaml",
        {
            "milestones": [
                {
                    "id": "M1",
                    "name": "Milestone 2",
                    "path": "01-milestone-1",
                    "status": "in_progress",
                    "depends_on": ["P1.M1"],
                }
            ]
        },
    )
    p2m1_dir = phase2_dir / "01-milestone-1"
    _write_yaml(
        p2m1_dir / "index.yaml",
        {"epics": [{"id": "E1", "name": "Epic 3", "path": "01-epic-1", "status": "in_progress"}]},
    )
    _write_epic(p2m1_dir / "01-epic-1", "P2.M1.E1.T001")

    return tmp_path


def _load_calc(project_root: Path) -> tuple:
    loader = TaskLoader(project_root / ".tasks")
    tree = loader.load()
    calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)
    return tree, calc


def test_epic_short_id_dependency_blocks_until_upstream_epic_complete(
    tmp_dependency_resolution_dir: Path,
):
    tree, calc = _load_calc(tmp_dependency_resolution_dir)
    available = set(calc.find_all_available())

    assert "P1.M1.E1.T001" in available
    assert "P1.M1.E2.T001" not in available

    tree.find_task("P1.M1.E1.T001").status = Status.DONE
    available_after = set(calc.find_all_available())

    assert "P1.M1.E2.T001" in available_after


def test_absolute_milestone_dependency_blocks_until_upstream_milestone_complete(
    tmp_dependency_resolution_dir: Path,
):
    tree, calc = _load_calc(tmp_dependency_resolution_dir)
    available = set(calc.find_all_available())

    assert "P2.M1.E1.T001" not in available

    tree.find_task("P1.M1.E1.T001").status = Status.DONE
    tree.find_task("P1.M1.E2.T001").status = Status.DONE
    available_after = set(calc.find_all_available())

    assert "P2.M1.E1.T001" in available_after
