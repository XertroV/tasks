"""Focused tests for workflow and report command branches."""

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import yaml
from click.testing import CliRunner

from backlog.cli import cli
from backlog.helpers import get_current_task_id, set_current_task
from backlog.loader import TaskLoader
from backlog.models import Status


def _task_filename(task_id: str, title: str) -> str:
    short = task_id.split(".")[-1]
    slug = (
        title.lower()
        .replace(" ", "-")
        .replace("/", "-")
        .replace(":", "")
        .replace(",", "")
    )
    return f"{short}-{slug}.todo"


def _write_task(epic_dir: Path, task_id: str, title: str, overrides: dict) -> dict:
    filename = _task_filename(task_id, title)
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
    frontmatter.update(overrides)

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


def _load_task(task_id: str):
    loader = TaskLoader()
    tree = loader.load()
    return tree.find_task(task_id)


def _save_task_fields(task_id: str, **fields) -> None:
    loader = TaskLoader()
    tree = loader.load()
    task = tree.find_task(task_id)
    assert task is not None
    for key, value in fields.items():
        setattr(task, key, value)
    loader.save_task(task)


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def tmp_workflow_reports_dir(tmp_path, monkeypatch):
    now = datetime.now(timezone.utc)
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    (tasks_dir / "index.yaml").write_text(
        yaml.dump(
            {
                "project": "Workflow and Reports Project",
                "description": "Target branch-heavy workflow/report behavior",
                "timeline_weeks": 2,
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

    e1_dir = milestone_dir / "01-core-epic"
    e1_dir.mkdir()
    e1_tasks = [
        _write_task(
            e1_dir,
            "P1.M1.E1.T001",
            "Open API Endpoint",
            {"status": "pending", "priority": "high", "tags": ["core"]},
        ),
        _write_task(
            e1_dir,
            "P1.M1.E1.T002",
            "Refactor Auth Middleware",
            {
                "status": "in_progress",
                "priority": "medium",
                "depends_on": ["P1.M1.E1.T001"],
                "claimed_by": "agent-a",
                "claimed_at": (now - timedelta(hours=3)).isoformat(),
                "started_at": (now - timedelta(hours=3)).isoformat(),
                "tags": ["auth"],
            },
        ),
        _write_task(
            e1_dir,
            "P1.M1.E1.T003",
            "Write Migration Docs",
            {"status": "pending", "priority": "low", "tags": ["docs"]},
        ),
    ]
    (e1_dir / "index.yaml").write_text(yaml.dump({"tasks": e1_tasks}))

    e2_dir = milestone_dir / "02-feature-epic"
    e2_dir.mkdir()
    e2_tasks = [
        _write_task(
            e2_dir,
            "P1.M1.E2.T001",
            "Baseline Delivery",
            {
                "status": "done",
                "priority": "high",
                "estimate_hours": 2.0,
                "started_at": (now - timedelta(days=1, hours=2)).isoformat(),
                "completed_at": (now - timedelta(days=1)).isoformat(),
                "duration_minutes": 120,
            },
        ),
        _write_task(
            e2_dir,
            "P1.M1.E2.T002",
            "Fast Follow Delivery",
            {
                "status": "done",
                "priority": "critical",
                "estimate_hours": 3.0,
                "started_at": (now - timedelta(hours=2)).isoformat(),
                "completed_at": (now - timedelta(hours=1)).isoformat(),
                "duration_minutes": 60,
            },
        ),
        _write_task(
            e2_dir,
            "P1.M1.E2.T003",
            "Pending Feature Expansion",
            {"status": "pending", "priority": "critical", "tags": ["feature"]},
        ),
    ]
    (e2_dir / "index.yaml").write_text(yaml.dump({"tasks": e2_tasks}))

    monkeypatch.chdir(tmp_path)
    return tmp_path


def test_work_set_show_clear(runner, tmp_workflow_reports_dir):
    set_res = runner.invoke(cli, ["work", "P1.M1.E1.T001"])
    assert set_res.exit_code == 0
    assert "Working task set" in set_res.output

    show_res = runner.invoke(cli, ["work"])
    assert show_res.exit_code == 0
    assert "Current Working Task" in show_res.output
    assert "P1.M1.E1.T001" in show_res.output

    clear_res = runner.invoke(cli, ["work", "--clear"])
    assert clear_res.exit_code == 0
    assert "Cleared working task context" in clear_res.output


def test_blocked_no_grab_uses_context_and_marks_blocked(
    runner, tmp_workflow_reports_dir
):
    set_current_task("P1.M1.E1.T002", "agent-a")
    result = runner.invoke(
        cli, ["blocked", "--reason", "waiting on dependency", "--no-grab"]
    )

    assert result.exit_code == 0
    assert "Blocked:" in result.output
    assert "waiting on dependency" in result.output
    assert "Grabbed:" not in result.output

    task = _load_task("P1.M1.E1.T002")
    assert task.status == Status.BLOCKED
    assert get_current_task_id() is None


def test_skip_auto_grabs_next_task(runner, tmp_workflow_reports_dir):
    set_current_task("P1.M1.E1.T002", "agent-a")
    result = runner.invoke(cli, ["skip", "--agent", "agent-a"])

    assert result.exit_code == 0
    assert "Skipped:" in result.output
    assert "Grabbed:" in result.output
    assert "skip --no-grab" in result.output

    old_task = _load_task("P1.M1.E1.T002")
    assert old_task.status == Status.PENDING

    current_task = get_current_task_id()
    assert current_task is not None
    assert current_task != "P1.M1.E1.T002"


def test_unclaim_from_context(runner, tmp_workflow_reports_dir):
    set_current_task("P1.M1.E1.T002", "agent-a")
    result = runner.invoke(cli, ["unclaim", "--agent", "agent-a"])

    assert result.exit_code == 0
    assert "Unclaimed:" in result.output

    task = _load_task("P1.M1.E1.T002")
    assert task.status == Status.PENDING
    assert get_current_task_id() is None


def test_handoff_appends_notes_and_transfers_ownership(
    runner, tmp_workflow_reports_dir
):
    set_current_task("P1.M1.E1.T002", "agent-a")
    result = runner.invoke(
        cli,
        [
            "handoff",
            "--to",
            "agent-b",
            "--notes",
            "Auth changes done; needs coverage expansion.",
        ],
    )

    assert result.exit_code == 0
    assert "Handed off:" in result.output
    assert "agent-b" in result.output

    task = _load_task("P1.M1.E1.T002")
    assert task.claimed_by == "agent-b"
    assert task.status == Status.IN_PROGRESS

    task_file = Path(".tasks") / task.file
    content = task_file.read_text()
    assert "## Handoff Notes" in content
    assert "needs coverage expansion" in content


def test_handoff_requires_force_for_other_owner(runner, tmp_workflow_reports_dir):
    result = runner.invoke(cli, ["handoff", "P1.M1.E1.T002", "--to", "agent-b"])

    assert result.exit_code != 0
    assert "Use --force to override." in result.output


def test_why_reports_dependency_blocker(runner, tmp_workflow_reports_dir):
    result = runner.invoke(cli, ["why", "P1.M1.E1.T002"])
    assert result.exit_code == 0
    assert "Explicit dependencies:" in result.output
    assert "P1.M1.E1.T001" in result.output
    assert "Task is blocked on dependencies." in result.output


def test_why_done_task_short_circuit(runner, tmp_workflow_reports_dir):
    result = runner.invoke(cli, ["why", "P1.M1.E2.T001"])
    assert result.exit_code == 0
    assert "This task is complete." in result.output


def test_grab_reclaims_stale_when_no_available(runner, tmp_workflow_reports_dir):
    _save_task_fields("P1.M1.E1.T001", status=Status.BLOCKED)
    _save_task_fields("P1.M1.E1.T003", status=Status.BLOCKED)
    _save_task_fields("P1.M1.E2.T003", status=Status.BLOCKED)

    stale_ts = datetime.now(timezone.utc) - timedelta(hours=6)
    _save_task_fields(
        "P1.M1.E1.T002",
        status=Status.IN_PROGRESS,
        claimed_by="old-agent",
        claimed_at=stale_ts,
        started_at=stale_ts,
    )

    result = runner.invoke(
        cli, ["grab", "--single", "--agent", "agent-reclaimer", "--no-content"]
    )

    assert result.exit_code == 0
    assert "Reclaiming oldest stale task" in result.output
    assert "P1.M1.E1.T002" in result.output

    reclaimed = _load_task("P1.M1.E1.T002")
    assert reclaimed.status == Status.IN_PROGRESS
    assert reclaimed.claimed_by == "agent-reclaimer"


def test_report_progress_text_with_milestones(runner, tmp_workflow_reports_dir):
    result = runner.invoke(cli, ["report", "progress", "--by-milestone"])

    assert result.exit_code == 0
    assert "Progress Report" in result.output
    assert "By Phase:" in result.output
    assert "M1:" in result.output


def test_report_defaults_to_progress_and_lists_commands(
    runner, tmp_workflow_reports_dir
):
    result = runner.invoke(cli, ["report"])

    assert result.exit_code == 0
    assert "Progress Report" in result.output
    assert "Report commands:" in result.output
    assert "progress" in result.output
    assert "velocity" in result.output
    assert "estimate-accuracy" in result.output


def test_report_short_aliases(runner, tmp_workflow_reports_dir):
    progress_res = runner.invoke(cli, ["r", "p"])
    assert progress_res.exit_code == 0
    assert "Progress Report" in progress_res.output

    velocity_res = runner.invoke(cli, ["r", "v", "--days", "2"])
    assert velocity_res.exit_code == 0
    assert "Velocity Report" in velocity_res.output


def test_report_velocity_text_sections(runner, tmp_workflow_reports_dir):
    result = runner.invoke(cli, ["report", "velocity", "--days", "3"])

    assert result.exit_code == 0
    assert "Velocity Report" in result.output
    assert "Averages:" in result.output
    assert "Completion Estimate:" in result.output
    assert "Velocity Over Time:" in result.output
    assert "Recent Velocity (Last 48 Hours):" in result.output


def test_report_velocity_over_time_trims_old_empty_days(
    runner, tmp_workflow_reports_dir
):
    result = runner.invoke(cli, ["report", "velocity", "--days", "5"])

    assert result.exit_code == 0

    now = datetime.now(timezone.utc)
    first_trailing_empty = (now - timedelta(days=2)).strftime("%b %d")
    older_empty = (now - timedelta(days=3)).strftime("%b %d")

    velocity_section = result.output.split("Velocity Over Time:", 1)[1].split(
        "Scale:", 1
    )[0]

    assert first_trailing_empty in velocity_section
    assert older_empty not in velocity_section


def test_report_recent_velocity_trims_old_empty_buckets(
    runner, tmp_workflow_reports_dir
):
    result = runner.invoke(cli, ["report", "velocity", "--days", "5"])

    assert result.exit_code == 0

    recent_section = result.output.split("Recent Velocity (Last 48 Hours):", 1)[
        1
    ].split("Scale:", 1)[0]
    bucket_lines = [
        line
        for line in recent_section.splitlines()
        if line.strip() and "-" in line and ("actual)" in line or "no data" in line)
    ]

    assert len(bucket_lines) >= 2
    assert "no data" in bucket_lines[-1]
    assert "actual)" in bucket_lines[-2]


def test_report_velocity_no_completed_data(runner, tmp_workflow_reports_dir):
    for task_id in ("P1.M1.E2.T001", "P1.M1.E2.T002"):
        _save_task_fields(
            task_id,
            status=Status.PENDING,
            completed_at=None,
            duration_minutes=None,
        )

    result = runner.invoke(cli, ["report", "velocity", "--days", "2"])
    assert result.exit_code == 0
    assert "No completed tasks with timestamps found." in result.output


def test_report_estimate_accuracy_text_sections(runner, tmp_workflow_reports_dir):
    result = runner.invoke(cli, ["report", "estimate-accuracy"])

    assert result.exit_code == 0
    assert "Estimate Accuracy Report" in result.output
    assert "Biggest variances:" in result.output
    assert "Recommendation:" in result.output


def test_report_estimate_accuracy_no_duration_data(runner, tmp_workflow_reports_dir):
    for task_id in ("P1.M1.E2.T001", "P1.M1.E2.T002"):
        _save_task_fields(task_id, status=Status.PENDING)

    result = runner.invoke(cli, ["report", "estimate-accuracy"])
    assert result.exit_code == 0
    assert "No completed tasks with duration data found." in result.output
