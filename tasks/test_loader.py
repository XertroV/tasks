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
