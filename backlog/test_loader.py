"""Tests for TaskLoader creation helpers."""

import yaml
import pytest

from backlog.loader import TaskLoader


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


def test_loader_accepts_completed_status_alias(tmp_path, monkeypatch):
    """Loader should map legacy completed status to done."""
    tasks_dir = tmp_path / ".tasks"
    epic_dir = tasks_dir / "01-phase" / "01-milestone" / "01-epic"
    epic_dir.mkdir(parents=True)

    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(
            {
                "project": "Status Alias Test",
                "phases": [
                    {
                        "id": "P1",
                        "name": "Phase",
                        "path": "01-phase",
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
                        "file": "T001-status.todo",
                        "title": "Status Alias Task",
                        "status": "completed",
                        "estimate_hours": 1,
                        "complexity": "low",
                        "priority": "medium",
                        "depends_on": [],
                    }
                ]
            },
            f,
            sort_keys=False,
        )

    with open(epic_dir / "T001-status.todo", "w") as f:
        f.write(
            "---\n"
            "id: P1.M1.E1.T001\n"
            "title: Status Alias Task\n"
            "status: completed\n"
            "estimate_hours: 1\n"
            "complexity: low\n"
            "priority: medium\n"
            "depends_on: []\n"
            "tags: []\n"
            "---\n\n"
            "# Status Alias Task\n"
        )

    monkeypatch.chdir(tmp_path)
    tree = TaskLoader().load()
    task = tree.find_task("P1.M1.E1.T001")

    assert task is not None
    assert task.status.value == "done"


def test_move_task_to_another_epic_renumbers_and_updates_ids(tmp_path, monkeypatch):
    """Moving a task to another epic renumbers and remaps ID references."""
    tasks_dir = tmp_path / ".tasks"
    src_epic_dir = tasks_dir / "01-phase" / "01-milestone" / "01-epic"
    dst_epic_dir = tasks_dir / "01-phase" / "01-milestone" / "02-dst-epic"
    src_epic_dir.mkdir(parents=True)
    dst_epic_dir.mkdir(parents=True)

    (tasks_dir / "index.yaml").write_text(
        yaml.dump(
            {
                "project": "Move Test",
                "phases": [{"id": "P1", "name": "Phase", "path": "01-phase"}],
            },
            sort_keys=False,
        )
    )
    (tasks_dir / "01-phase" / "index.yaml").write_text(
        yaml.dump(
            {
                "milestones": [{"id": "M1", "name": "M", "path": "01-milestone"}],
            },
            sort_keys=False,
        )
    )
    (tasks_dir / "01-phase" / "01-milestone" / "index.yaml").write_text(
        yaml.dump(
            {
                "epics": [
                    {"id": "E1", "name": "Source", "path": "01-epic"},
                    {"id": "E2", "name": "Dest", "path": "02-dst-epic"},
                ]
            },
            sort_keys=False,
        )
    )
    (src_epic_dir / "index.yaml").write_text(
        yaml.dump(
            {
                "id": "P1.M1.E1",
                "name": "Source",
                "tasks": [
                    {
                        "id": "T001",
                        "file": "T001-move-me.todo",
                        "title": "Move Me",
                        "status": "pending",
                        "estimate_hours": 1,
                        "complexity": "low",
                        "priority": "medium",
                        "depends_on": [],
                    }
                ],
            },
            sort_keys=False,
        )
    )
    (dst_epic_dir / "index.yaml").write_text(
        yaml.dump({"id": "P1.M1.E2", "name": "Dest", "tasks": []}, sort_keys=False)
    )
    (src_epic_dir / "T001-move-me.todo").write_text(
        "---\n"
        "id: P1.M1.E1.T001\n"
        "title: Move Me\n"
        "status: pending\n"
        "estimate_hours: 1\n"
        "complexity: low\n"
        "priority: medium\n"
        "depends_on: []\n"
        "tags: []\n"
        "---\n\n"
        "# Move\n"
    )

    monkeypatch.chdir(tmp_path)
    loader = TaskLoader()
    result = loader.move_item("P1.M1.E1.T001", "P1.M1.E2")

    assert result["new_id"] == "P1.M1.E2.T001"
    assert not (src_epic_dir / "T001-move-me.todo").exists()
    assert (dst_epic_dir / "T001-move-me.todo").exists()

    moved_text = (dst_epic_dir / "T001-move-me.todo").read_text()
    assert "id: P1.M1.E2.T001" in moved_text


def test_move_epic_to_another_milestone_remaps_descendant_task_ids(
    tmp_path, monkeypatch
):
    """Moving an epic should remap epic and task IDs."""
    tasks_dir = tmp_path / ".tasks"
    src_epic_dir = tasks_dir / "01-phase" / "01-ms" / "01-epic"
    dst_ms_dir = tasks_dir / "01-phase" / "02-ms"
    src_epic_dir.mkdir(parents=True)
    dst_ms_dir.mkdir(parents=True)

    (tasks_dir / "index.yaml").write_text(
        yaml.dump(
            {
                "project": "Move Epic Test",
                "phases": [{"id": "P1", "name": "Phase", "path": "01-phase"}],
            },
            sort_keys=False,
        )
    )
    (tasks_dir / "01-phase" / "index.yaml").write_text(
        yaml.dump(
            {
                "milestones": [
                    {"id": "M1", "name": "MS1", "path": "01-ms"},
                    {"id": "M2", "name": "MS2", "path": "02-ms"},
                ]
            },
            sort_keys=False,
        )
    )
    (tasks_dir / "01-phase" / "01-ms" / "index.yaml").write_text(
        yaml.dump(
            {"epics": [{"id": "E1", "name": "Source Epic", "path": "01-epic"}]},
            sort_keys=False,
        )
    )
    (dst_ms_dir / "index.yaml").write_text(yaml.dump({"epics": []}, sort_keys=False))
    (src_epic_dir / "index.yaml").write_text(
        yaml.dump(
            {
                "id": "P1.M1.E1",
                "name": "Source Epic",
                "tasks": [{"id": "T001", "file": "T001-child.todo", "title": "Child"}],
            },
            sort_keys=False,
        )
    )
    (src_epic_dir / "T001-child.todo").write_text(
        "---\n"
        "id: P1.M1.E1.T001\n"
        "title: Child\n"
        "status: pending\n"
        "estimate_hours: 1\n"
        "complexity: low\n"
        "priority: medium\n"
        "depends_on: []\n"
        "tags: []\n"
        "---\n\n"
        "# Child\n"
    )

    monkeypatch.chdir(tmp_path)
    loader = TaskLoader()
    result = loader.move_item("P1.M1.E1", "P1.M2")

    assert result["new_id"] == "P1.M2.E1"
    moved_epic_dir = dst_ms_dir / "01-source-epic"
    assert moved_epic_dir.exists()
    moved_task_text = (moved_epic_dir / "T001-child.todo").read_text()
    assert "id: P1.M2.E1.T001" in moved_task_text


def test_load_with_benchmark_counts_tree_and_missing_files(tmp_path, monkeypatch):
    """load_with_benchmark should return timing and file counts for normal loading."""
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()
    phase_dir = tasks_dir / "01-phase"
    milestone_dir = phase_dir / "01-ms"
    epic_dir = milestone_dir / "01-epic"
    epic_dir.mkdir(parents=True)

    (tasks_dir / "index.yaml").write_text(
        """
project: Benchmark
phases:
  - id: P1
    name: Phase
    path: 01-phase
""",
        encoding="utf-8",
    )
    (phase_dir / "index.yaml").write_text(
        """
milestones:
  - id: M1
    name: Milestone
    path: 01-ms
""",
        encoding="utf-8",
    )
    (milestone_dir / "index.yaml").write_text(
        """
epics:
  - id: E1
    name: Epic
    path: 01-epic
""",
        encoding="utf-8",
    )
    (epic_dir / "index.yaml").write_text(
        """
tasks:
  - id: T001
    file: T001-existing.todo
  - id: T002
    file: T002-missing.todo
""",
        encoding="utf-8",
    )
    (epic_dir / "T001-existing.todo").write_text(
        """
---
id: P1.M1.E1.T001
title: Existing
status: pending
---

Existing task body
""",
        encoding="utf-8",
    )

    monkeypatch.chdir(tmp_path)
    tree, benchmark = TaskLoader(tasks_dir=str(tasks_dir)).load_with_benchmark()

    assert len(tree.phases) == 1
    assert benchmark["counts"]["phases"] == 1
    assert benchmark["counts"]["milestones"] == 1
    assert benchmark["counts"]["epics"] == 1
    assert benchmark["counts"]["tasks"] == 2
    assert benchmark["missing_task_files"] == 1
    assert benchmark["files"]["by_type"]["root_index"] == 1
    assert benchmark["files"]["by_type"]["todo_file"] == 1
    assert benchmark["index_parse_ms"] >= 0
    assert benchmark["task_frontmatter_parse_ms"] >= 0
    assert benchmark["task_body_parse_ms"] >= 0


def test_load_metadata_uses_frontmatter_only(tmp_path, monkeypatch):
    """Metadata mode should avoid full .todo parsing."""
    tasks_dir = tmp_path / ".tasks"
    phase_dir = tasks_dir / "01-phase"
    milestone_dir = phase_dir / "01-ms"
    epic_dir = milestone_dir / "01-epic"
    epic_dir.mkdir(parents=True)

    (tasks_dir / "index.yaml").write_text(
        """
project: Metadata Load
phases:
  - id: P1
    name: Phase
    path: 01-phase
""",
        encoding="utf-8",
    )
    (phase_dir / "index.yaml").write_text(
        """
milestones:
  - id: M1
    name: Milestone
    path: 01-ms
""",
        encoding="utf-8",
    )
    (milestone_dir / "index.yaml").write_text(
        """
epics:
  - id: E1
    name: Epic
    path: 01-epic
""",
        encoding="utf-8",
    )
    (epic_dir / "index.yaml").write_text(
        """
tasks:
  - id: T001
    file: T001-metadata.todo
""",
        encoding="utf-8",
    )
    (epic_dir / "T001-metadata.todo").write_text(
        "\n".join(
            [
                "---",
                "id: P1.M1.E1.T001",
                "title: Fast Load Task",
                "status: pending",
                "estimate_hours: 2",
                "complexity: low",
                "priority: medium",
                "depends_on: []",
                "tags: []",
                "---",
                "",
                "Long body content that should not be eagerly parsed.",
            ],
        ),
        encoding="utf-8",
    )

    monkeypatch.chdir(tmp_path)
    loader = TaskLoader()

    calls = {"todo_file": 0, "todo_frontmatter": 0}
    original_parse_todo_file = loader._parse_todo_file
    original_parse_todo_frontmatter = loader._parse_todo_frontmatter

    def parse_todo_file(*args, **kwargs):
        calls["todo_file"] += 1
        return original_parse_todo_file(*args, **kwargs)

    def parse_todo_frontmatter(*args, **kwargs):
        calls["todo_frontmatter"] += 1
        return original_parse_todo_frontmatter(*args, **kwargs)

    monkeypatch.setattr(loader, "_parse_todo_file", parse_todo_file)
    monkeypatch.setattr(loader, "_parse_todo_frontmatter", parse_todo_frontmatter)

    tree = loader.load("metadata")

    task = tree.find_task("P1.M1.E1.T001")
    assert task is not None
    assert task.title == "Fast Load Task"
    assert calls["todo_file"] == 0
    assert calls["todo_frontmatter"] == 1


def test_load_with_benchmark_full_mode_can_skip_task_body_parsing(tmp_path, monkeypatch):
    """Benchmark full mode can skip task body parsing when requested."""
    tasks_dir = tmp_path / ".tasks"
    epic_dir = tasks_dir / "01-phase" / "01-ms" / "01-epic"
    epic_dir.mkdir(parents=True)

    (tasks_dir / "index.yaml").write_text(
        """
project: Benchmark Fast
phases:
  - id: P1
    name: Phase
    path: 01-phase
""",
        encoding="utf-8",
    )
    (tasks_dir / "01-phase" / "index.yaml").write_text(
        """
milestones:
  - id: M1
    name: Milestone
    path: 01-ms
""",
        encoding="utf-8",
    )
    (tasks_dir / "01-phase" / "01-ms" / "index.yaml").write_text(
        """
epics:
  - id: E1
    name: Epic
    path: 01-epic
""",
        encoding="utf-8",
    )
    (epic_dir / "index.yaml").write_text(
        """
tasks:
  - id: T001
    file: T001-body-heavy.todo
""",
        encoding="utf-8",
    )
    (epic_dir / "T001-body-heavy.todo").write_text(
        "\n".join(
            [
                "---",
                "id: P1.M1.E1.T001",
                "title: Body Heavy Task",
                "status: pending",
                "estimate_hours: 1",
                "complexity: low",
                "priority: medium",
                "depends_on: []",
                "tags: []",
                "---",
                "A",
                "A",
                "A",
            ],
        ),
        encoding="utf-8",
    )

    monkeypatch.chdir(tmp_path)
    loader = TaskLoader(tasks_dir=str(tasks_dir))
    include_body_calls = []
    original_parse_todo_file = loader._parse_todo_file

    def parse_todo_file(*args, **kwargs):
        include_body = kwargs.get("include_body")
        if include_body is None and len(args) > 3:
            include_body = args[3]
        include_body_calls.append(include_body)
        return original_parse_todo_file(*args, **kwargs)

    monkeypatch.setattr(loader, "_parse_todo_file", parse_todo_file)

    _, benchmark = loader.load_with_benchmark(mode="full", parse_task_body=False)

    assert include_body_calls == [False]
    assert benchmark["task_body_parse_ms"] == 0
