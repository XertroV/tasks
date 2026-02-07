"""Tests for the tasks check command."""

from pathlib import Path

import yaml
from click.testing import CliRunner

from tasks.cli import cli


def _write_yaml(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)


def _write_task_file(path: Path, task_id: str, title: str, depends_on=None) -> None:
    if depends_on is None:
        depends_on = []
    frontmatter = {
        "id": task_id,
        "title": title,
        "status": "pending",
        "estimate_hours": 1.0,
        "complexity": "low",
        "priority": "medium",
        "depends_on": depends_on,
        "tags": ["test"],
    }
    content = (
        "---\n"
        f"{yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)}"
        "---\n\n"
        f"# {title}\n"
    )
    with open(path, "w") as f:
        f.write(content)


def _create_minimal_tree(
    tmp_path: Path,
    t1_depends=None,
    t2_depends=None,
    include_t1=True,
    include_t2=True,
) -> Path:
    tasks_dir = tmp_path / ".tasks"
    epic_dir = tasks_dir / "01-phase" / "01-milestone" / "01-epic"

    _write_yaml(
        tasks_dir / "index.yaml",
        {
            "project": "Check Test",
            "description": "check tests",
            "timeline_weeks": 1,
            "phases": [
                {
                    "id": "P1",
                    "name": "Phase 1",
                    "path": "01-phase",
                    "status": "in_progress",
                }
            ],
        },
    )

    _write_yaml(
        tasks_dir / "01-phase" / "index.yaml",
        {
            "milestones": [
                {
                    "id": "M1",
                    "name": "Milestone 1",
                    "path": "01-milestone",
                    "status": "in_progress",
                }
            ]
        },
    )

    _write_yaml(
        tasks_dir / "01-phase" / "01-milestone" / "index.yaml",
        {
            "epics": [
                {
                    "id": "E1",
                    "name": "Epic 1",
                    "path": "01-epic",
                    "status": "in_progress",
                }
            ]
        },
    )

    _write_yaml(
        epic_dir / "index.yaml",
        {
            "tasks": [
                {
                    "id": "T001",
                    "title": "Task 1",
                    "file": "T001-task-1.todo",
                    "status": "pending",
                    "estimate_hours": 1.0,
                    "complexity": "low",
                    "priority": "medium",
                    "depends_on": t1_depends or [],
                },
                {
                    "id": "T002",
                    "title": "Task 2",
                    "file": "T002-task-2.todo",
                    "status": "pending",
                    "estimate_hours": 1.0,
                    "complexity": "low",
                    "priority": "medium",
                    "depends_on": t2_depends or [],
                },
            ]
        },
    )

    if include_t1:
        _write_task_file(
            epic_dir / "T001-task-1.todo", "P1.M1.E1.T001", "Task 1", t1_depends
        )
    if include_t2:
        _write_task_file(
            epic_dir / "T002-task-2.todo", "P1.M1.E1.T002", "Task 2", t2_depends
        )

    return tmp_path


def test_check_passes_on_valid_tree(tmp_path, monkeypatch):
    _create_minimal_tree(tmp_path)
    monkeypatch.chdir(tmp_path)
    runner = CliRunner()

    result = runner.invoke(cli, ["check"])

    assert result.exit_code == 0
    assert "Consistency check passed" in result.output


def test_check_fails_when_task_file_missing(tmp_path, monkeypatch):
    _create_minimal_tree(tmp_path, include_t2=False)
    monkeypatch.chdir(tmp_path)
    runner = CliRunner()

    result = runner.invoke(cli, ["check"])

    assert result.exit_code == 1
    assert "missing_task_file" in result.output


def test_check_fails_when_dependency_task_missing(tmp_path, monkeypatch):
    _create_minimal_tree(tmp_path, t2_depends=["P1.M1.E1.T999"])
    monkeypatch.chdir(tmp_path)
    runner = CliRunner()

    result = runner.invoke(cli, ["check", "--json"])

    assert result.exit_code == 1
    assert '"missing_task_dependency"' in result.output


def test_check_detects_task_dependency_cycle(tmp_path, monkeypatch):
    _create_minimal_tree(
        tmp_path,
        t1_depends=["P1.M1.E1.T002"],
        t2_depends=["P1.M1.E1.T001"],
    )
    monkeypatch.chdir(tmp_path)
    runner = CliRunner()

    result = runner.invoke(cli, ["check"])

    assert result.exit_code == 1
    assert "task_dependency_cycle" in result.output


def test_check_warnings_do_not_fail_unless_strict(tmp_path, monkeypatch):
    _create_minimal_tree(tmp_path)
    _write_yaml(
        tmp_path / ".tasks" / ".context.yaml",
        {
            "mode": "single",
            "current_task": "P1.M1.E1.T999",
            "started_at": "2026-01-01T00:00:00+00:00",
        },
    )
    monkeypatch.chdir(tmp_path)
    runner = CliRunner()

    result = runner.invoke(cli, ["check"])
    strict_result = runner.invoke(cli, ["check", "--strict"])

    assert result.exit_code == 0
    assert "stale_context_task" in result.output
    assert strict_result.exit_code == 1
