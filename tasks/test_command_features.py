"""Integration tests for major command feature groups not covered elsewhere."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import yaml
from click.testing import CliRunner

from tasks.cli import cli


@pytest.fixture
def runner():
    return CliRunner()


def _write_task(
    epic_dir: Path, task_id: str, title: str, frontmatter_overrides: dict
) -> dict:
    """Create a task file and return its index entry."""
    task_short = task_id.split(".")[-1]
    filename = f"{task_short}-task.todo"

    frontmatter = {
        "id": task_id,
        "title": title,
        "status": "pending",
        "estimate_hours": 2.0,
        "complexity": "medium",
        "priority": "medium",
        "depends_on": [],
        "tags": [],
    }
    frontmatter.update(frontmatter_overrides)

    content = (
        "---\n"
        f"{yaml.dump(frontmatter, default_flow_style=False)}"
        "---\n\n"
        f"# {title}\n\n"
        "Task details.\n"
    )
    (epic_dir / filename).write_text(content)

    return {
        "id": task_id,
        "title": title,
        "file": filename,
        "status": frontmatter["status"],
        "estimate_hours": frontmatter["estimate_hours"],
        "complexity": frontmatter["complexity"],
        "priority": frontmatter["priority"],
        "depends_on": frontmatter.get("depends_on", []),
    }


@pytest.fixture
def tmp_feature_tasks_dir(tmp_path, monkeypatch):
    """Create a realistic task tree used to validate major command features."""
    now = datetime.now(timezone.utc)
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    # Root project index
    (tasks_dir / "index.yaml").write_text(
        yaml.dump(
            {
                "project": "Feature Test Project",
                "description": "Coverage for major command groups",
                "timeline_weeks": 4,
                "phases": [
                    {
                        "id": "P1",
                        "name": "Phase One",
                        "path": "01-phase-one",
                        "status": "in_progress",
                    }
                ],
            }
        )
    )

    # Phase + milestone indexes
    phase_dir = tasks_dir / "01-phase-one"
    phase_dir.mkdir()
    (phase_dir / "index.yaml").write_text(
        yaml.dump(
            {
                "milestones": [
                    {
                        "id": "M1",
                        "name": "Milestone One",
                        "path": "01-milestone-one",
                        "status": "in_progress",
                    }
                ]
            }
        )
    )

    milestone_dir = phase_dir / "01-milestone-one"
    milestone_dir.mkdir()
    (milestone_dir / "index.yaml").write_text(
        yaml.dump(
            {
                "epics": [
                    {
                        "id": "E1",
                        "name": "Core Epic",
                        "path": "01-core-epic",
                        "status": "in_progress",
                    },
                    {
                        "id": "E2",
                        "name": "Feature Epic",
                        "path": "02-feature-epic",
                        "status": "in_progress",
                    },
                ]
            }
        )
    )

    # Epic E1 tasks
    e1_dir = milestone_dir / "01-core-epic"
    e1_dir.mkdir()
    e1_tasks = [
        _write_task(
            e1_dir,
            "P1.M1.E1.T001",
            "Completed Setup Task",
            {
                "status": "done",
                "priority": "medium",
                "tags": ["setup"],
                "started_at": (now - timedelta(days=2, hours=2)).isoformat(),
                "completed_at": (now - timedelta(days=2)).isoformat(),
                "duration_minutes": 120,
            },
        ),
        _write_task(
            e1_dir,
            "P1.M1.E1.T002",
            "In Progress Core Task",
            {
                "status": "in_progress",
                "priority": "high",
                "tags": ["core"],
                "depends_on": ["P1.M1.E1.T001"],
                "claimed_by": "agent-a",
                "claimed_at": (now - timedelta(hours=3)).isoformat(),
                "started_at": (now - timedelta(hours=3)).isoformat(),
            },
        ),
    ]
    (e1_dir / "index.yaml").write_text(yaml.dump({"tasks": e1_tasks}))

    # Epic E2 tasks
    e2_dir = milestone_dir / "02-feature-epic"
    e2_dir.mkdir()
    e2_tasks = [
        _write_task(
            e2_dir,
            "P1.M1.E2.T001",
            "High Priority Feature Task",
            {
                "status": "pending",
                "priority": "high",
                "tags": ["backend", "searchable"],
            },
        ),
        _write_task(
            e2_dir,
            "P1.M1.E2.T002",
            "Waiting Feature Task",
            {
                "status": "pending",
                "priority": "medium",
                "depends_on": ["P1.M1.E1.T002"],
                "tags": ["backend"],
            },
        ),
        _write_task(
            e2_dir,
            "P1.M1.E2.T003",
            "Blocked Feature Task",
            {
                "status": "blocked",
                "priority": "low",
                "tags": ["blocked"],
            },
        ),
    ]
    (e2_dir / "index.yaml").write_text(yaml.dump({"tasks": e2_tasks}))

    # Working context for dash/workflow display commands
    (tasks_dir / ".context.yaml").write_text(
        yaml.dump(
            {
                "current_task": "P1.M1.E1.T002",
                "agent": "agent-a",
                "started_at": (now - timedelta(minutes=40)).isoformat(),
            }
        )
    )

    monkeypatch.chdir(tmp_path)
    return tmp_path


def test_data_export_json_contains_project_tree(runner, tmp_feature_tasks_dir):
    result = runner.invoke(cli, ["data", "export", "--format", "json"])
    assert result.exit_code == 0

    payload = json.loads(result.output)
    assert payload["project"] == "Feature Test Project"
    assert len(payload["phases"]) == 1
    assert payload["stats"]["total_tasks"] == 5


def test_data_summary_json_reports_status_counts(runner, tmp_feature_tasks_dir):
    result = runner.invoke(cli, ["data", "summary", "--format", "json"])
    assert result.exit_code == 0

    payload = json.loads(result.output)
    assert payload["overall"]["total_tasks"] == 5
    assert payload["overall"]["done"] == 1
    assert payload["overall"]["in_progress"] == 1
    assert payload["overall"]["pending"] == 2
    assert payload["overall"]["blocked"] == 1


def test_session_command_lifecycle(runner, tmp_feature_tasks_dir):
    start = runner.invoke(
        cli, ["session", "start", "--agent", "agent-feature", "--task", "P1.M1.E2.T001"]
    )
    assert start.exit_code == 0
    assert "Session started" in start.output

    hb = runner.invoke(
        cli,
        [
            "session",
            "heartbeat",
            "--agent",
            "agent-feature",
            "--progress",
            "running tests",
        ],
    )
    assert hb.exit_code == 0
    assert "Heartbeat updated" in hb.output

    listed = runner.invoke(cli, ["session", "list", "--active"])
    assert listed.exit_code == 0
    assert "agent-feature" in listed.output

    end = runner.invoke(cli, ["session", "end", "--agent", "agent-feature"])
    assert end.exit_code == 0
    assert "Session ended" in end.output


def test_search_finds_task_by_pattern_and_tag_filter(runner, tmp_feature_tasks_dir):
    result = runner.invoke(
        cli, ["search", "High Priority Feature", "--tags", "backend", "--limit", "5"]
    )
    assert result.exit_code == 0
    assert "P1.M1.E2.T001" in result.output


def test_blockers_shows_dependency_chain_and_root_blocker(
    runner, tmp_feature_tasks_dir
):
    result = runner.invoke(cli, ["blockers", "--suggest"])
    assert result.exit_code == 0
    assert "Blocking Chains" in result.output
    assert "P1.M1.E1.T002" in result.output


def test_dash_renders_current_task_and_progress(runner, tmp_feature_tasks_dir):
    result = runner.invoke(cli, ["dash"])
    assert result.exit_code == 0
    assert "Current Task" in result.output
    assert "P1.M1.E1.T002" in result.output
    assert "Progress:" in result.output


def test_timeline_renders_ascii_timeline(runner, tmp_feature_tasks_dir):
    result = runner.invoke(
        cli, ["timeline", "--weeks", "4", "--group-by", "phase", "--show-done"]
    )
    assert result.exit_code == 0
    assert "Project Timeline" in result.output
    assert "Legend:" in result.output


def test_tl_alias_matches_timeline_output(runner, tmp_feature_tasks_dir):
    timeline_result = runner.invoke(cli, ["timeline", "--weeks", "4", "--show-done"])
    alias_result = runner.invoke(cli, ["tl", "--weeks", "4", "--show-done"])

    assert timeline_result.exit_code == 0
    assert alias_result.exit_code == 0
    assert "Project Timeline" in alias_result.output
    assert "Legend:" in alias_result.output
    assert alias_result.output == timeline_result.output


def test_report_progress_json(runner, tmp_feature_tasks_dir):
    result = runner.invoke(cli, ["report", "progress", "--format", "json"])
    assert result.exit_code == 0

    payload = json.loads(result.output)
    assert payload["overall"]["total"] == 5
    assert payload["overall"]["done"] == 1
    assert payload["overall"]["in_progress"] == 1


def test_report_velocity_json(runner, tmp_feature_tasks_dir):
    result = runner.invoke(
        cli, ["report", "velocity", "--days", "3", "--format", "json"]
    )
    assert result.exit_code == 0

    payload = json.loads(result.output)
    assert payload["days_analyzed"] == 3
    assert len(payload["daily_data"]) == 3
    assert payload["total_completed"] >= 1


def test_velocity_hidden_alias_matches_report_velocity_json(
    runner, tmp_feature_tasks_dir
):
    alias_result = runner.invoke(cli, ["velocity", "--days", "3", "--format", "json"])
    report_result = runner.invoke(
        cli, ["report", "velocity", "--days", "3", "--format", "json"]
    )

    assert alias_result.exit_code == 0
    assert report_result.exit_code == 0

    alias_payload = json.loads(alias_result.output)
    report_payload = json.loads(report_result.output)

    assert alias_payload["days_analyzed"] == report_payload["days_analyzed"]
    assert alias_payload["total_completed"] == report_payload["total_completed"]
    assert alias_payload["daily_data"] == report_payload["daily_data"]


def test_velocity_hidden_alias_not_listed_in_help(runner, tmp_feature_tasks_dir):
    result = runner.invoke(cli, ["--help"])

    assert result.exit_code == 0
    assert "\n  velocity" not in result.output


def test_report_estimate_accuracy_json(runner, tmp_feature_tasks_dir):
    result = runner.invoke(cli, ["report", "estimate-accuracy", "--format", "json"])
    assert result.exit_code == 0

    payload = json.loads(result.output)
    assert payload["tasks_analyzed"] >= 1
    assert payload["total_estimated_hours"] > 0
    assert payload["total_actual_hours"] > 0


def test_list_json_priority_filter_stats(runner, tmp_feature_tasks_dir):
    result = runner.invoke(cli, ["list", "--json", "--priority", "high"])
    assert result.exit_code == 0

    payload = json.loads(result.output)
    assert payload["filter"]["priority"] == "high"
    assert payload["filtered_stats"]["total_tasks"] == 2
    assert payload["filtered_stats"]["in_progress"] == 1
    assert payload["filtered_stats"]["pending"] == 1


def test_list_json_priority_and_complexity_filters(runner, tmp_feature_tasks_dir):
    result = runner.invoke(
        cli, ["list", "--json", "--priority", "high", "--complexity", "medium"]
    )
    assert result.exit_code == 0

    payload = json.loads(result.output)
    assert payload["filter"]["priority"] == "high"
    assert payload["filter"]["complexity"] == "medium"
    assert payload["filtered_stats"]["total_tasks"] == 2


def test_list_available_priority_filter(runner, tmp_feature_tasks_dir):
    result = runner.invoke(cli, ["list", "--available", "--priority", "high"])
    assert result.exit_code == 0

    # Only the pending high-priority task is available in this fixture.
    assert "P1.M1.E2.T001" in result.output
    assert "P1.M1.E2.T002" not in result.output
    assert "P1.M1.E2.T003" not in result.output


def test_list_progress_shows_phase_and_milestone_ids(runner, tmp_feature_tasks_dir):
    result = runner.invoke(cli, ["list", "--progress"])
    assert result.exit_code == 0

    # Check that phase ID is shown (e.g., "P1:")
    assert "P1:" in result.output
    # Check that milestone ID is shown (e.g., "P1.M1:")
    assert "P1.M1:" in result.output
    # Check the header
    assert "Project Progress" in result.output
