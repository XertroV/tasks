"""Tests for TaskLoader creation helpers."""

import yaml
import pytest

from tasks.loader import TaskLoader


@pytest.fixture
def tmp_empty_phase_dir(tmp_path, monkeypatch):
    """Create a .tasks tree with one empty phase (no milestones)."""
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    root_index = {
        "project": "Test Project",
        "description": "Loader tests",
        "timeline_weeks": 1,
        "phases": [
            {
                "id": "P1",
                "name": "Phase One",
                "path": "01-phase-one",
                "status": "in_progress",
            }
        ],
    }
    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(root_index, f)

    phase_dir = tasks_dir / "01-phase-one"
    phase_dir.mkdir()
    with open(phase_dir / "index.yaml", "w") as f:
        yaml.dump({"milestones": []}, f)

    monkeypatch.chdir(tmp_path)
    return tmp_path


def test_create_milestone_starts_numbering_at_m1(tmp_empty_phase_dir):
    """First milestone in a phase should be M1, not M0."""
    loader = TaskLoader()

    milestone = loader.create_milestone("P1", {"name": "First Milestone"})

    assert milestone.id == "P1.M1"
    assert milestone.path.startswith("01-")

    phase_index_path = tmp_empty_phase_dir / ".tasks" / "01-phase-one" / "index.yaml"
    with open(phase_index_path) as f:
        phase_index = yaml.safe_load(f)

    assert phase_index["milestones"][0]["id"] == "M1"


def test_create_milestone_after_legacy_m0_uses_m1(tmp_empty_phase_dir):
    """Legacy M0 data should lead to next milestone being M1."""
    phase_dir = tmp_empty_phase_dir / ".tasks" / "01-phase-one"

    with open(phase_dir / "index.yaml", "w") as f:
        yaml.dump(
            {
                "milestones": [
                    {
                        "id": "M0",
                        "name": "Legacy Milestone",
                        "path": "00-legacy-milestone",
                        "status": "done",
                    }
                ]
            },
            f,
        )

    legacy_dir = phase_dir / "00-legacy-milestone"
    legacy_dir.mkdir()
    with open(legacy_dir / "index.yaml", "w") as f:
        yaml.dump({"epics": []}, f)

    loader = TaskLoader()
    milestone = loader.create_milestone("P1", {"name": "New Milestone"})

    assert milestone.id == "P1.M1"
    assert milestone.path.startswith("01-")


def test_loader_accepts_estimated_hours_alias(tmp_path, monkeypatch):
    """Loader should accept estimated_hours as an alias for estimate_hours."""
    tasks_dir = tmp_path / ".tasks"
    epic_dir = tasks_dir / "01-phase" / "01-milestone" / "01-epic"
    epic_dir.mkdir(parents=True)

    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(
            {
                "project": "Alias Test",
                "phases": [
                    {
                        "id": "P1",
                        "name": "Phase",
                        "path": "01-phase",
                        "estimated_hours": 12,
                    }
                ],
            },
            f,
            sort_keys=False,
        )

    with open(tasks_dir / "01-phase" / "index.yaml", "w") as f:
        yaml.dump(
            {
                "milestones": [
                    {
                        "id": "M1",
                        "name": "Milestone",
                        "path": "01-milestone",
                        "estimated_hours": 8,
                    }
                ]
            },
            f,
            sort_keys=False,
        )

    with open(tasks_dir / "01-phase" / "01-milestone" / "index.yaml", "w") as f:
        yaml.dump(
            {
                "epics": [
                    {
                        "id": "E1",
                        "name": "Epic",
                        "path": "01-epic",
                        "estimated_hours": 5,
                    }
                ]
            },
            f,
            sort_keys=False,
        )

    with open(epic_dir / "index.yaml", "w") as f:
        yaml.dump(
            {
                "tasks": [
                    {
                        "id": "T001",
                        "file": "T001-alias.todo",
                        "title": "Alias Task",
                        "status": "pending",
                        "estimated_hours": 3,
                        "complexity": "low",
                        "priority": "medium",
                        "depends_on": [],
                    }
                ]
            },
            f,
            sort_keys=False,
        )

    with open(epic_dir / "T001-alias.todo", "w") as f:
        f.write(
            "---\n"
            "id: P1.M1.E1.T001\n"
            "title: Alias Task\n"
            "status: pending\n"
            "estimated_hours: 3\n"
            "complexity: low\n"
            "priority: medium\n"
            "depends_on: []\n"
            "tags: []\n"
            "---\n\n"
            "# Alias Task\n"
        )

    monkeypatch.chdir(tmp_path)
    tree = TaskLoader().load()
    task = tree.find_task("P1.M1.E1.T001")

    assert task is not None
    assert tree.phases[0].estimate_hours == 12
    assert tree.phases[0].milestones[0].estimate_hours == 8
    assert tree.phases[0].milestones[0].epics[0].estimate_hours == 5
    assert task.estimate_hours == 3
