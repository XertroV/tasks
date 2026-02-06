"""Tests for priority-aware next-task selection used by grab/cycle."""

import json
import yaml
import pytest
from click.testing import CliRunner

from tasks.cli import cli
from tasks.loader import TaskLoader
from tasks.critical_path import CriticalPathCalculator


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def tmp_priority_tasks_dir(tmp_path, monkeypatch):
    """Create a tree where low-priority work appears on critical path before high-priority work."""
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(
            {
                "project": "Priority Selection Test",
                "description": "Ensure high priority beats low priority in grab selection",
                "timeline_weeks": 1,
                "phases": [
                    {
                        "id": "P1",
                        "name": "Phase 1",
                        "path": "01-phase-1",
                        "status": "in_progress",
                    }
                ],
            },
            f,
        )

    phase_dir = tasks_dir / "01-phase-1"
    phase_dir.mkdir()
    with open(phase_dir / "index.yaml", "w") as f:
        yaml.dump(
            {
                "milestones": [
                    {
                        "id": "M1",
                        "name": "Milestone 1",
                        "path": "01-milestone-1",
                        "status": "in_progress",
                    }
                ]
            },
            f,
        )

    milestone_dir = phase_dir / "01-milestone-1"
    milestone_dir.mkdir()
    with open(milestone_dir / "index.yaml", "w") as f:
        yaml.dump(
            {
                "epics": [
                    {
                        "id": "E1",
                        "name": "Low Priority Epic",
                        "path": "01-low-priority-epic",
                        "status": "in_progress",
                    },
                    {
                        "id": "E2",
                        "name": "High Priority Epic",
                        "path": "02-high-priority-epic",
                        "status": "in_progress",
                    },
                ]
            },
            f,
        )

    def write_epic_with_task(epic_path, task_id, title, priority):
        epic_dir = milestone_dir / epic_path
        epic_dir.mkdir()

        task_file = "T001-task.todo"
        frontmatter = {
            "id": task_id,
            "title": title,
            "status": "pending",
            "estimate_hours": 1.0,
            "complexity": "medium",
            "priority": priority,
            "depends_on": [],
            "tags": ["test"],
        }
        with open(epic_dir / task_file, "w") as f:
            f.write(f"---\n{yaml.dump(frontmatter, default_flow_style=False)}---\n\n# {title}\n")

        with open(epic_dir / "index.yaml", "w") as f:
            yaml.dump(
                {
                    "tasks": [
                        {
                            "id": task_id,
                            "title": title,
                            "file": task_file,
                            "status": "pending",
                            "estimate_hours": 1.0,
                            "complexity": "medium",
                            "priority": priority,
                        }
                    ]
                },
                f,
            )

    # Insert low-priority task first so it's favored by old traversal ordering.
    write_epic_with_task(
        "01-low-priority-epic", "P1.M1.E1.T001", "Low Priority Task", "low"
    )
    write_epic_with_task(
        "02-high-priority-epic", "P1.M1.E2.T001", "High Priority Task", "high"
    )

    monkeypatch.chdir(tmp_path)
    return tmp_path


def test_calculate_prefers_high_priority_available_task(tmp_priority_tasks_dir):
    """Next available should prefer high-priority work over lower-priority work."""
    loader = TaskLoader()
    tree = loader.load()
    calc = CriticalPathCalculator(
        tree, {"low": 1.0, "medium": 1.25, "high": 1.5, "critical": 2.0}
    )

    _critical_path, next_available = calc.calculate()
    assert next_available == "P1.M1.E2.T001"


def test_grab_picks_high_priority_before_low_priority(runner, tmp_priority_tasks_dir):
    """grab should claim high priority task before low priority alternatives."""
    result = runner.invoke(
        cli, ["grab", "--single", "--agent=test-agent", "--no-content"]
    )
    assert result.exit_code == 0
    assert "P1.M1.E2.T001" in result.output

    high_task_file = (
        tmp_priority_tasks_dir
        / ".tasks"
        / "01-phase-1"
        / "01-milestone-1"
        / "02-high-priority-epic"
        / "T001-task.todo"
    )
    low_task_file = (
        tmp_priority_tasks_dir
        / ".tasks"
        / "01-phase-1"
        / "01-milestone-1"
        / "01-low-priority-epic"
        / "T001-task.todo"
    )

    assert "status: in_progress" in high_task_file.read_text()
    assert "claimed_by: test-agent" in high_task_file.read_text()
    assert "status: pending" in low_task_file.read_text()


def test_next_json_returns_high_priority_task(runner, tmp_priority_tasks_dir):
    """next should expose priority-aware selection too."""
    result = runner.invoke(cli, ["next", "--json"])
    assert result.exit_code == 0

    output = json.loads(result.output)
    assert output["id"] == "P1.M1.E2.T001"
