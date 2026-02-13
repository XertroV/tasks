"""Tests for tasks CLI commands."""

import pytest
import yaml
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from click.testing import CliRunner
from backlog.cli import cli
from backlog.loader import TaskLoader


@pytest.fixture
def runner():
    """Create a Click CLI test runner."""
    return CliRunner()


@pytest.fixture
def tmp_tasks_dir(tmp_path, monkeypatch):
    """Create a temporary .tasks directory with test data."""
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    # Create root index.yaml
    root_index = {
        "project": "Test Project",
        "description": "Test project for CLI tests",
        "timeline_weeks": 1,
        "phases": [
            {
                "id": "P1",
                "name": "Test Phase",
                "path": "01-test-phase",
                "status": "in_progress",
            }
        ],
    }
    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(root_index, f)

    # Create phase directory and index
    phase_dir = tasks_dir / "01-test-phase"
    phase_dir.mkdir()

    phase_index = {
        "milestones": [
            {
                "id": "P1.M1",
                "name": "Test Milestone",
                "path": "01-test-milestone",
                "status": "in_progress",
            }
        ],
    }
    with open(phase_dir / "index.yaml", "w") as f:
        yaml.dump(phase_index, f)

    # Create milestone directory and index
    milestone_dir = phase_dir / "01-test-milestone"
    milestone_dir.mkdir()

    milestone_index = {
        "epics": [
            {
                "id": "P1.M1.E1",
                "name": "Test Epic",
                "path": "01-test-epic",
                "status": "in_progress",
            }
        ],
    }
    with open(milestone_dir / "index.yaml", "w") as f:
        yaml.dump(milestone_index, f)

    # Create epic directory and index
    epic_dir = milestone_dir / "01-test-epic"
    epic_dir.mkdir()

    epic_index = {
        "tasks": [],  # Will be populated by create_task_file
    }
    with open(epic_dir / "index.yaml", "w") as f:
        yaml.dump(epic_index, f)

    # Change to temp directory
    monkeypatch.chdir(tmp_path)

    return tmp_path


@pytest.fixture
def tmp_tasks_dir_short_ids(tmp_path, monkeypatch):
    """Create a temporary .tasks directory using short IDs in index files."""
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    root_index = {
        "project": "Test Project",
        "description": "Test project for CLI tests",
        "timeline_weeks": 1,
        "phases": [
            {
                "id": "P1",
                "name": "Test Phase",
                "path": "01-test-phase",
                "status": "in_progress",
            }
        ],
    }
    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(root_index, f)

    phase_dir = tasks_dir / "01-test-phase"
    phase_dir.mkdir()
    with open(phase_dir / "index.yaml", "w") as f:
        yaml.dump(
            {
                "milestones": [
                    {
                        "id": "M1",
                        "name": "Test Milestone",
                        "path": "01-test-milestone",
                        "status": "in_progress",
                    }
                ]
            },
            f,
        )

    milestone_dir = phase_dir / "01-test-milestone"
    milestone_dir.mkdir()
    with open(milestone_dir / "index.yaml", "w") as f:
        yaml.dump(
            {
                "epics": [
                    {
                        "id": "E1",
                        "name": "Test Epic",
                        "path": "01-test-epic",
                        "status": "in_progress",
                    }
                ]
            },
            f,
        )

    epic_dir = milestone_dir / "01-test-epic"
    epic_dir.mkdir()
    with open(epic_dir / "index.yaml", "w") as f:
        yaml.dump({"tasks": []}, f)

    monkeypatch.chdir(tmp_path)
    return tmp_path


def create_task_file(
    tasks_dir, task_id, title, status="pending", claimed_by=None, claimed_at=None
):
    """Helper to create a .todo task file."""
    # Parse task_id to determine path (e.g., P1.M1.E1.T001)
    parts = task_id.split(".")
    phase_num = parts[0][1:]  # P1 -> 1
    milestone_num = parts[1][1:]  # M1 -> 1
    epic_num = parts[2][1:]  # E1 -> 1
    task_num = parts[3][1:]  # T001 -> 001

    epic_dir = (
        tasks_dir
        / ".tasks"
        / f"0{phase_num}-test-phase"
        / f"0{milestone_num}-test-milestone"
        / f"0{epic_num}-test-epic"
    )
    epic_dir.mkdir(parents=True, exist_ok=True)

    task_filename = f"T{task_num}-test-task.todo"
    task_file = epic_dir / task_filename
    # File path relative to .tasks/ root
    task_file_relative = task_filename  # Just the filename, loader constructs full path

    frontmatter = {
        "id": task_id,
        "title": title,
        "status": status,
        "estimate_hours": 2.0,
        "complexity": "medium",
        "priority": "high",
        "depends_on": [],
        "tags": ["test"],
    }

    if claimed_by:
        frontmatter["claimed_by"] = claimed_by
    if claimed_at:
        frontmatter["claimed_at"] = claimed_at.isoformat()
        frontmatter["started_at"] = claimed_at.isoformat()

    content = f"""---
{yaml.dump(frontmatter, default_flow_style=False)}---

# {title}

Test task description.

## Requirements

- First requirement
- Second requirement
- Third requirement

## Acceptance Criteria

- Acceptance criterion 1
- Acceptance criterion 2
"""

    with open(task_file, "w") as f:
        f.write(content)

    # Update epic index.yaml with task entry
    epic_index_path = epic_dir / "index.yaml"
    if epic_index_path.exists():
        with open(epic_index_path) as f:
            epic_index = yaml.safe_load(f) or {}
    else:
        epic_index = {}

    if "tasks" not in epic_index:
        epic_index["tasks"] = []

    # Add task to the epic index
    task_entry = {
        "id": task_id,
        "title": title,
        "file": task_file_relative,
        "status": status,
        "estimate_hours": 2.0,
        "complexity": "medium",
        "priority": "high",
    }
    epic_index["tasks"].append(task_entry)

    with open(epic_index_path, "w") as f:
        yaml.dump(epic_index, f)

    return task_file


def create_multi_task_epic(tasks_dir, num_tasks, epic_id="P1.M1.E1"):
    """Create an epic with multiple tasks for testing."""
    tasks = []
    for i in range(1, num_tasks + 1):
        task_id = f"{epic_id}.T{i:03d}"
        create_task_file(tasks_dir, task_id, f"Task {i}")
        tasks.append(task_id)
    return tasks


def create_bug_file(tasks_dir, bug_id, title, status="pending", depends_on=None):
    """Helper to create a .todo bug file and index entry."""
    bugs_dir = tasks_dir / ".tasks" / "bugs"
    bugs_dir.mkdir(parents=True, exist_ok=True)

    bug_filename = f"{bug_id.lower()}-test-bug.todo"
    bug_file = bugs_dir / bug_filename
    bug_depends_on = depends_on or []

    frontmatter = {
        "id": bug_id,
        "title": title,
        "status": status,
        "estimate_hours": 3.0,
        "complexity": "high",
        "priority": "critical",
        "depends_on": bug_depends_on,
        "tags": ["bug"],
    }

    content = f"""---
{yaml.dump(frontmatter, default_flow_style=False)}---

# {title}
"""
    with open(bug_file, "w") as f:
        f.write(content)

    bug_index_path = bugs_dir / "index.yaml"
    bug_index = {"bugs": []}
    if bug_index_path.exists():
        with open(bug_index_path) as f:
            bug_index = yaml.safe_load(f) or {"bugs": []}
    bug_index.setdefault("bugs", []).append({"id": bug_id, "file": bug_filename})

    with open(bug_index_path, "w") as f:
        yaml.dump(bug_index, f)

    return bug_file


class TestClaimCommand:
    """Tests for the claim command."""

    def test_claim_shows_metadata(self, runner, tmp_tasks_dir):
        """claim should display estimate and agent info."""
        create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Test Task")

        result = runner.invoke(cli, ["claim", "P1.M1.E1.T001", "--agent=test-agent"])

        assert result.exit_code == 0
        assert "Estimate:" in result.output
        assert "2.0 hours" in result.output
        assert "Agent:" in result.output
        assert "test-agent" in result.output

    def test_claim_shows_file_path(self, runner, tmp_tasks_dir):
        """claim should display the .todo file path."""
        create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Test Task")

        result = runner.invoke(cli, ["claim", "P1.M1.E1.T001", "--agent=test-agent"])

        assert result.exit_code == 0
        assert "File:" in result.output
        assert ".tasks/" in result.output

    def test_claim_shows_todo_contents(self, runner, tmp_tasks_dir):
        """claim should display .todo file contents."""
        create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Test Task")

        result = runner.invoke(cli, ["claim", "P1.M1.E1.T001", "--agent=test-agent"])

        assert result.exit_code == 0
        # claim dumps raw file content between separator lines
        assert "## Requirements" in result.output
        assert "First requirement" in result.output

    def test_claim_no_content_flag(self, runner, tmp_tasks_dir):
        """--no-content should suppress .todo file contents."""
        create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Test Task")

        result = runner.invoke(
            cli, ["claim", "P1.M1.E1.T001", "--agent=test-agent", "--no-content"]
        )

        assert result.exit_code == 0
        # Should NOT show file contents
        assert "## Requirements" not in result.output
        # But metadata should still appear
        assert "Estimate:" in result.output
        assert "Agent:" in result.output

    def test_claim_warns_when_task_file_missing(self, runner, tmp_tasks_dir):
        """claim should warn when a task entry exists but its file is missing."""
        task_file = create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Test Task")
        task_file.unlink()

        result = runner.invoke(cli, ["claim", "P1.M1.E1.T001", "--agent=test-agent"])

        assert result.exit_code != 0
        assert "Task file missing for P1.M1.E1.T001" in result.output
        assert (
            "Cannot claim P1.M1.E1.T001 because the task file is missing."
            in result.output
        )


class TestListCommand:
    """Tests for the list command."""

    def test_list_warns_when_task_file_missing(self, runner, tmp_tasks_dir):
        """list should warn when indexed task files are missing."""
        task_file = create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Test Task")
        task_file.unlink()

        result = runner.invoke(cli, ["list"])

        assert result.exit_code == 0
        assert "task file(s) referenced in index are missing" in result.output
        assert "P1.M1.E1.T001" in result.output

    def test_list_marks_bug_on_critical_path(self, runner, tmp_tasks_dir):
        """list should mark bugs that are on critical path."""
        create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Short Task")
        create_bug_file(tmp_tasks_dir, "B001", "Critical Bug")

        result = runner.invoke(cli, ["list"])

        assert result.exit_code == 0
        assert "★" in result.output
        assert "B001: Critical Bug" in result.output


class TestGrabCommand:
    """Tests for the grab command."""

    def test_grab_warns_when_task_file_missing(self, runner, tmp_tasks_dir):
        """grab should warn and stop when selected task file is missing."""
        task_file = create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Test Task")
        task_file.unlink()

        result = runner.invoke(
            cli, ["grab", "--single", "--agent=test-agent", "--no-content"]
        )

        assert result.exit_code == 0
        assert "Task file missing for P1.M1.E1.T001" in result.output
        assert (
            "Cannot claim P1.M1.E1.T001 because the task file is missing."
            in result.output
        )

    def test_grab_autoselected_bug_fanout_claims_additional_bugs(
        self, runner, tmp_tasks_dir
    ):
        create_bug_file(tmp_tasks_dir, "B001", "Primary Bug")
        create_bug_file(tmp_tasks_dir, "B002", "Second Bug")
        create_bug_file(tmp_tasks_dir, "B003", "Third Bug")

        result = runner.invoke(
            cli, ["grab", "--agent=test-agent", "--no-content", "--single"]
        )

        assert result.exit_code == 0
        assert "B001" in result.output
        assert "B002" in result.output
        assert "B003" in result.output
        assert "parallel" in result.output.lower() or "series" in result.output.lower()

    def test_grab_autoselected_bug_fanout_uses_priority_order(
        self, runner, tmp_tasks_dir
    ):
        create_bug_file(tmp_tasks_dir, "B001", "Primary Bug")
        create_bug_file(tmp_tasks_dir, "B002", "Low Bug")
        create_bug_file(tmp_tasks_dir, "B003", "High Bug")

        b2_file = tmp_tasks_dir / ".tasks" / "bugs" / "b002-test-bug.todo"
        b2_file.write_text(
            b2_file.read_text().replace("priority: critical", "priority: low")
        )

        b3_file = tmp_tasks_dir / ".tasks" / "bugs" / "b003-test-bug.todo"
        b3_file.write_text(
            b3_file.read_text().replace("priority: critical", "priority: high")
        )

        result = runner.invoke(
            cli, ["grab", "--agent=test-agent", "--no-content", "--single"]
        )

        assert result.exit_code == 0
        assert "ADDITIONAL #1: B003" in result.output
        assert "ADDITIONAL #2: B002" in result.output


class TestDoneCommand:
    """Tests for the done command."""

    def test_done_saves_duration(self, runner, tmp_tasks_dir):
        """done should save duration_minutes to the task file."""
        # Create and claim a task first
        claimed_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        create_task_file(
            tmp_tasks_dir,
            "P1.M1.E1.T001",
            "Test Task",
            status="in_progress",
            claimed_by="test-agent",
            claimed_at=claimed_at,
        )

        result = runner.invoke(cli, ["done", "P1.M1.E1.T001"])

        assert result.exit_code == 0
        assert "Completed" in result.output
        assert "Duration:" in result.output

        # Verify duration was saved to file
        task_file = (
            tmp_tasks_dir
            / ".tasks"
            / "01-test-phase"
            / "01-test-milestone"
            / "01-test-epic"
            / "T001-test-task.todo"
        )
        with open(task_file) as f:
            content = f.read()

        assert "duration_minutes:" in content


class TestNextCommand:
    """Tests for the next command."""

    def test_next_suggests_claim_command(self, runner, tmp_tasks_dir):
        """next should suggest how to claim the task."""
        create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Test Task")

        result = runner.invoke(cli, ["next"])

        # Should show the next task and suggest claiming it
        if result.exit_code == 0 and "Next task" in result.output:
            assert "grab" in result.output or "claim" in result.output

    def test_next_with_stale_locked_task(self, runner, tmp_tasks_dir):
        """
        Scenario: A task was claimed by an agent that failed.
        - Task is stale (agent not responding)
        - Task is still within lock period (15 min old)
        - All other tasks in the epic/milestone are completed

        Expected: `next` should show "no available tasks" and list the
        in-progress tasks blocking progress.
        """
        # Create a task that is in_progress (claimed 15 minutes ago)
        claimed_at = datetime.now(timezone.utc) - timedelta(minutes=15)
        create_task_file(
            tmp_tasks_dir,
            "P1.M1.E1.T001",
            "Locked Test Task",
            status="in_progress",
            claimed_by="failed-agent",
            claimed_at=claimed_at,
        )

        result = runner.invoke(cli, ["next"])

        # Should indicate no available tasks
        assert (
            "No available tasks" in result.output
            or "no available" in result.output.lower()
        )

        # Should show the in-progress task ID and who claimed it
        assert "P1.M1.E1.T001" in result.output
        assert "failed-agent" in result.output

    def test_next_shows_blocking_task_details(self, runner, tmp_tasks_dir):
        """next should show details about in-progress tasks when nothing available."""
        # Create an in-progress task
        claimed_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        create_task_file(
            tmp_tasks_dir,
            "P1.M1.E1.T001",
            "Blocking Task",
            status="in_progress",
            claimed_by="some-agent",
            claimed_at=claimed_at,
        )

        result = runner.invoke(cli, ["next"])

        # Should show the blocking task ID
        if "No available tasks" in result.output:
            assert "P1.M1.E1.T001" in result.output
            assert "some-agent" in result.output

    def test_next_can_select_bug(self, runner, tmp_tasks_dir):
        """next should return an available bug when it is highest priority work."""
        create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Regular Task")
        create_bug_file(tmp_tasks_dir, "B001", "Critical Bug")

        result = runner.invoke(cli, ["next", "--json"])

        assert result.exit_code == 0
        payload = yaml.safe_load(result.output)
        assert payload["id"] == "B001"


class TestCycleCommand:
    """Tests for the cycle command."""

    def test_cycle_auto_grabs_when_epic_not_complete(self, runner, tmp_tasks_dir):
        """cycle should auto-grab next task when completing a task that doesn't complete the epic."""
        # Create 3 tasks in the same epic
        task_ids = create_multi_task_epic(tmp_tasks_dir, 3)

        # Mark first task as in_progress
        task_file = (
            tmp_tasks_dir
            / ".tasks"
            / "01-test-phase"
            / "01-test-milestone"
            / "01-test-epic"
            / "T001-test-task.todo"
        )
        with open(task_file, "r") as f:
            content = f.read()
        content = content.replace("status: pending", "status: in_progress")
        content = content.replace("tags:", "claimed_by: test-agent\ntags:")
        with open(task_file, "w") as f:
            f.write(content)

        # Update context to set current task
        context_dir = tmp_tasks_dir / ".tasks"
        context_file = context_dir / ".context.yaml"
        context = {
            "current_task": task_ids[0],
            "agent": "test-agent",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        with open(context_file, "w") as f:
            yaml.dump(context, f)

        # Call cycle to complete first task
        result = runner.invoke(cli, ["cycle", "--agent=test-agent"])

        # Assertions
        assert result.exit_code == 0
        assert "Completed" in result.output
        assert task_ids[0] in result.output
        assert "Grabbed" in result.output
        assert task_ids[1] in result.output  # Second task should be auto-claimed

        # Verify second task is now in_progress
        task2_file = (
            tmp_tasks_dir
            / ".tasks"
            / "01-test-phase"
            / "01-test-milestone"
            / "01-test-epic"
            / "T002-test-task.todo"
        )
        with open(task2_file, "r") as f:
            task2_content = f.read()
        assert "status: in_progress" in task2_content

    def test_cycle_autoselected_bug_fanout_claims_additional_bugs(
        self, runner, tmp_tasks_dir
    ):
        create_bug_file(
            tmp_tasks_dir,
            "B001",
            "Primary Bug",
            status="in_progress",
        )
        create_bug_file(tmp_tasks_dir, "B002", "Second Bug")
        create_bug_file(tmp_tasks_dir, "B003", "Third Bug")

        b1_file = tmp_tasks_dir / ".tasks" / "bugs" / "b001-test-bug.todo"
        b1_content = b1_file.read_text()
        b1_file.write_text(b1_content.replace("tags:", "claimed_by: test-agent\ntags:"))

        context_file = tmp_tasks_dir / ".tasks" / ".context.yaml"
        context = {
            "current_task": "B001",
            "agent": "test-agent",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        with open(context_file, "w") as f:
            yaml.dump(context, f)

        result = runner.invoke(cli, ["cycle", "--agent=test-agent", "--no-content"])

        assert result.exit_code == 0
        assert "Completed" in result.output
        assert "B001" in result.output
        assert "B002" in result.output
        assert "B003" in result.output

    def test_cycle_stops_when_epic_complete(self, runner, tmp_tasks_dir):
        """cycle should stop and not auto-grab when completing the last task in an epic."""
        # Create 2 tasks in the same epic
        task_ids = create_multi_task_epic(tmp_tasks_dir, 2)

        # Mark first task as done
        task1_file = (
            tmp_tasks_dir
            / ".tasks"
            / "01-test-phase"
            / "01-test-milestone"
            / "01-test-epic"
            / "T001-test-task.todo"
        )
        with open(task1_file, "r") as f:
            content = f.read()
        content = content.replace("status: pending", "status: done")
        with open(task1_file, "w") as f:
            f.write(content)

        # Mark second task as in_progress
        task2_file = (
            tmp_tasks_dir
            / ".tasks"
            / "01-test-phase"
            / "01-test-milestone"
            / "01-test-epic"
            / "T002-test-task.todo"
        )
        with open(task2_file, "r") as f:
            content = f.read()
        content = content.replace("status: pending", "status: in_progress")
        content = content.replace("tags:", "claimed_by: test-agent\ntags:")
        with open(task2_file, "w") as f:
            f.write(content)

        # Update context
        context_dir = tmp_tasks_dir / ".tasks"
        context_file = context_dir / ".context.yaml"
        context = {
            "current_task": task_ids[1],
            "agent": "test-agent",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        with open(context_file, "w") as f:
            yaml.dump(context, f)

        # Call cycle to complete the second (last) task
        result = runner.invoke(cli, ["cycle", "--agent=test-agent"])

        # Assertions
        assert result.exit_code == 0
        assert "Completed" in result.output
        assert task_ids[1] in result.output
        assert "EPIC COMPLETE" in result.output
        assert "Review Required" in result.output
        assert "backlog grab" in result.output
        assert "Grabbed" not in result.output  # Should NOT auto-grab

        # Verify context is cleared
        assert not context_file.exists() or not Path(context_file).read_text().strip()

    def test_cycle_stops_when_milestone_complete(self, runner, tmp_tasks_dir):
        """cycle should stop when completing the last task that completes a milestone."""
        # Create one epic with one task (completes both epic and milestone)
        task_ids = create_multi_task_epic(tmp_tasks_dir, 1)

        # Mark the task as in_progress
        task_file = (
            tmp_tasks_dir
            / ".tasks"
            / "01-test-phase"
            / "01-test-milestone"
            / "01-test-epic"
            / "T001-test-task.todo"
        )
        with open(task_file, "r") as f:
            content = f.read()
        content = content.replace("status: pending", "status: in_progress")
        content = content.replace("tags:", "claimed_by: test-agent\ntags:")
        with open(task_file, "w") as f:
            f.write(content)

        # Update context
        context_dir = tmp_tasks_dir / ".tasks"
        context_file = context_dir / ".context.yaml"
        context = {
            "current_task": task_ids[0],
            "agent": "test-agent",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        with open(context_file, "w") as f:
            yaml.dump(context, f)

        # Call cycle to complete it (completes both epic and milestone)
        result = runner.invoke(cli, ["cycle", "--agent=test-agent"])

        # Assertions
        assert result.exit_code == 0
        assert "Completed" in result.output
        assert task_ids[0] in result.output
        assert "EPIC COMPLETE" in result.output
        assert "MILESTONE COMPLETE" in result.output
        assert "Review Required" in result.output
        assert "Grabbed" not in result.output  # Should NOT auto-grab

        # Verify context is cleared
        assert not context_file.exists() or not Path(context_file).read_text().strip()

    def test_done_command_handles_completion_status(self, runner, tmp_tasks_dir):
        """done command should still work after updating print_completion_notices to return a value."""
        # Create 2 tasks in an epic
        task_ids = create_multi_task_epic(tmp_tasks_dir, 2)

        # Mark first task as done
        task1_file = (
            tmp_tasks_dir
            / ".tasks"
            / "01-test-phase"
            / "01-test-milestone"
            / "01-test-epic"
            / "T001-test-task.todo"
        )
        with open(task1_file, "r") as f:
            content = f.read()
        content = content.replace("status: pending", "status: done")
        with open(task1_file, "w") as f:
            f.write(content)

        # Mark second task as in_progress
        task2_file = (
            tmp_tasks_dir
            / ".tasks"
            / "01-test-phase"
            / "01-test-milestone"
            / "01-test-epic"
            / "T002-test-task.todo"
        )
        with open(task2_file, "r") as f:
            content = f.read()
        content = content.replace("status: pending", "status: in_progress")
        content = content.replace("tags:", "claimed_by: test-agent\ntags:")
        with open(task2_file, "w") as f:
            f.write(content)

        # Call done to complete the second (last) task
        result = runner.invoke(cli, ["done", task_ids[1]])

        # Assertions
        assert result.exit_code == 0
        assert "Completed" in result.output
        # Check for epic completion (if applicable)
        if "EPIC COMPLETE" in result.output:
            assert "EPIC COMPLETE" in result.output
        # Should not crash or error


def test_list_enhanced_shows_milestones(runner, tmp_tasks_dir):
    """Test enhanced list command shows milestones with task counts."""
    # Create two tasks
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T002", "Task 2", status="pending")

    result = runner.invoke(cli, ["list"])
    assert result.exit_code == 0
    assert "Test Phase (0/2 tasks done)" in result.output
    assert "Test Milestone (0/2 tasks done)" in result.output


def test_list_all_shows_all_milestones(runner, tmp_tasks_dir):
    """Test list --all shows all milestones without truncation."""
    # Add 7 milestones to test truncation
    phase_dir = tmp_tasks_dir / ".tasks" / "01-test-phase"
    milestones = []
    for i in range(1, 8):
        milestone_dir = phase_dir / f"0{i}-milestone-{i}"
        milestone_dir.mkdir(exist_ok=True)
        milestone_index = {"epics": []}
        with open(milestone_dir / "index.yaml", "w") as f:
            yaml.dump(milestone_index, f)
        milestones.append(
            {
                "id": f"P1.M{i}",
                "name": f"Milestone {i}",
                "path": f"0{i}-milestone-{i}",
                "status": "pending",
            }
        )

    # Update phase index
    phase_index = {"milestones": milestones}
    with open(phase_dir / "index.yaml", "w") as f:
        yaml.dump(phase_index, f)

    # Without --all, should show only 5 and truncate
    result = runner.invoke(cli, ["list"])
    assert result.exit_code == 0
    assert "... and 2 more milestone" in result.output

    # With --all, should show all 7
    result = runner.invoke(cli, ["list", "--all"])
    assert result.exit_code == 0
    assert "Milestone 7" in result.output
    assert "... and 2 more milestone" not in result.output


def test_list_unfinished_filters_completed(runner, tmp_tasks_dir):
    """Test list --unfinished filters out completed items."""
    task1 = create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="done")
    task2 = create_task_file(tmp_tasks_dir, "P1.M1.E1.T002", "Task 2", status="pending")

    result = runner.invoke(cli, ["list", "--unfinished"])
    assert result.exit_code == 0
    # Stats should show actual completion (1/2)
    assert "Test Phase (1/2 tasks done)" in result.output
    assert "Test Milestone (1/2 tasks done)" in result.output


def test_list_json_includes_milestone_metadata(runner, tmp_tasks_dir):
    """Test list --json includes milestone metadata."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T002", "Task 2", status="done")

    result = runner.invoke(cli, ["list", "--json"])
    assert result.exit_code == 0

    import json

    data = json.loads(result.output)
    assert "phases" in data
    assert len(data["phases"]) > 0
    assert "milestones" in data["phases"][0]
    assert len(data["phases"][0]["milestones"]) > 0
    assert "stats" in data["phases"][0]["milestones"][0]
    assert data["phases"][0]["milestones"][0]["stats"]["total"] == 2


def test_list_hides_completed_bugs_by_default(runner, tmp_tasks_dir):
    """list should hide completed bugs unless explicitly requested."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")
    create_bug_file(tmp_tasks_dir, "B001", "Done Bug", status="done")
    create_bug_file(tmp_tasks_dir, "B002", "Open Bug", status="pending")

    result = runner.invoke(cli, ["list"])
    assert result.exit_code == 0
    assert "B002: Open Bug" in result.output
    assert "B001: Done Bug" not in result.output


def test_list_can_show_completed_bugs_with_flag(runner, tmp_tasks_dir):
    """list --show-completed-aux should include completed bugs."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")
    create_bug_file(tmp_tasks_dir, "B001", "Done Bug", status="done")

    result = runner.invoke(cli, ["list", "--show-completed-aux"])
    assert result.exit_code == 0
    assert "B001: Done Bug" in result.output


def test_list_json_hides_completed_bugs_by_default(runner, tmp_tasks_dir):
    """list --json should exclude completed bugs by default."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")
    create_bug_file(tmp_tasks_dir, "B001", "Done Bug", status="done")
    create_bug_file(tmp_tasks_dir, "B002", "Open Bug", status="pending")

    result = runner.invoke(cli, ["list", "--json"])
    assert result.exit_code == 0

    import json

    data = json.loads(result.output)
    bug_ids = {b["id"] for b in data.get("bugs", [])}
    assert "B002" in bug_ids
    assert "B001" not in bug_ids


def test_tree_command_shows_full_hierarchy(runner, tmp_tasks_dir):
    """Test tree command shows full 4-level hierarchy."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T002", "Task 2", status="in_progress")

    result = runner.invoke(cli, ["tree"])
    assert result.exit_code == 0
    assert "Test Phase" in result.output
    assert "Test Milestone (0/2)" in result.output
    assert "Test Epic (0/2)" in result.output
    assert "P1.M1.E1.T001" in result.output
    assert "P1.M1.E1.T002" in result.output
    # Check for tree characters
    assert "├──" in result.output or "└──" in result.output


def test_tree_unfinished_filters_completed(runner, tmp_tasks_dir):
    """Test tree --unfinished filters completed work."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="done")
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T002", "Task 2", status="pending")

    result = runner.invoke(cli, ["tree", "--unfinished"])
    assert result.exit_code == 0
    assert "P1.M1.E1.T001" not in result.output
    assert "P1.M1.E1.T002" in result.output


def test_tree_hides_completed_bugs_by_default(runner, tmp_tasks_dir):
    """tree should hide completed bugs unless explicitly requested."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")
    create_bug_file(tmp_tasks_dir, "B001", "Done Bug", status="done")
    create_bug_file(tmp_tasks_dir, "B002", "Open Bug", status="pending")

    result = runner.invoke(cli, ["tree"])
    assert result.exit_code == 0
    assert "B002: Open Bug" in result.output
    assert "B001: Done Bug" not in result.output


def test_tree_can_show_completed_bugs_with_flag(runner, tmp_tasks_dir):
    """tree --show-completed-aux should include completed bugs."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")
    create_bug_file(tmp_tasks_dir, "B001", "Done Bug", status="done")

    result = runner.invoke(cli, ["tree", "--show-completed-aux"])
    assert result.exit_code == 0
    assert "B001: Done Bug" in result.output


def test_tree_details_shows_metadata(runner, tmp_tasks_dir):
    """Test tree --details shows metadata."""
    task_file = create_task_file(
        tmp_tasks_dir,
        "P1.M1.E1.T001",
        "Task 1",
        status="in_progress",
        claimed_by="agent-x",
    )

    result = runner.invoke(cli, ["tree", "--details"])
    assert result.exit_code == 0
    assert "@agent-x" in result.output
    assert "h)" in result.output  # estimate hours (format may be 1h or 2.0h)
    # Status is shown via icon [→] for in_progress


def test_tree_depth_limits_expansion(runner, tmp_tasks_dir):
    """Test tree --depth limits expansion correctly."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")

    # Depth 1: Only phases
    result = runner.invoke(cli, ["tree", "--depth", "1"])
    assert result.exit_code == 0
    assert "Test Phase" in result.output
    assert "Test Milestone" not in result.output

    # Depth 2: Phases and milestones
    result = runner.invoke(cli, ["tree", "--depth", "2"])
    assert result.exit_code == 0
    assert "Test Phase" in result.output
    assert "Test Milestone" in result.output
    assert "Test Epic" not in result.output

    # Depth 3: Phases, milestones, and epics
    result = runner.invoke(cli, ["tree", "--depth", "3"])
    assert result.exit_code == 0
    assert "Test Phase" in result.output
    assert "Test Milestone" in result.output
    assert "Test Epic" in result.output
    assert "P1.M1.E1.T001" not in result.output


def test_tree_json_outputs_complete_hierarchy(runner, tmp_tasks_dir):
    """Test tree --json outputs complete hierarchy."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="pending")
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T002", "Task 2", status="done")

    result = runner.invoke(cli, ["tree", "--json"])
    assert result.exit_code == 0

    import json

    data = json.loads(result.output)
    assert data["max_depth"] == 4
    assert data["show_details"] is False
    assert data["unfinished_only"] is False
    assert len(data["phases"]) > 0
    assert len(data["phases"][0]["milestones"]) > 0
    assert len(data["phases"][0]["milestones"][0]["epics"]) > 0
    assert len(data["phases"][0]["milestones"][0]["epics"][0]["tasks"]) == 2


def test_list_and_tree_consistent_task_counts(runner, tmp_tasks_dir):
    """Test list and tree show consistent task counts."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="done")
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T002", "Task 2", status="pending")

    list_result = runner.invoke(cli, ["list"])
    tree_result = runner.invoke(cli, ["tree"])

    assert list_result.exit_code == 0
    assert tree_result.exit_code == 0

    # Both should show 1/2 completion
    assert "(1/2" in list_result.output
    assert "(1/2)" in tree_result.output


def test_idea_command_creates_planning_intake_todo(runner, tmp_tasks_dir):
    """idea should create an intake .todo and ideas index entry."""
    result = runner.invoke(
        cli, ["idea", "add integration tests using gpt-oss-120 via groq"]
    )

    assert result.exit_code == 0
    assert "Created idea:" in result.output

    ideas_index_path = tmp_tasks_dir / ".tasks" / "ideas" / "index.yaml"
    assert ideas_index_path.exists()

    ideas_index = yaml.safe_load(ideas_index_path.read_text())
    assert "ideas" in ideas_index
    assert len(ideas_index["ideas"]) == 1
    assert ideas_index["ideas"][0]["id"] == "I001"

    idea_file = ideas_index["ideas"][0]["file"]
    idea_path = tmp_tasks_dir / ".tasks" / "ideas" / idea_file
    assert idea_path.exists()

    content = idea_path.read_text()
    assert "Run `/plan-task" in content
    assert "tasks add" in content
    assert "tasks bug" in content


def test_idea_command_increments_idea_ids(runner, tmp_tasks_dir):
    """idea IDs should increment sequentially in .tasks/ideas/."""
    first = runner.invoke(cli, ["idea", "first idea"])
    second = runner.invoke(cli, ["idea", "second idea"])

    assert first.exit_code == 0
    assert second.exit_code == 0

    ideas_index_path = tmp_tasks_dir / ".tasks" / "ideas" / "index.yaml"
    ideas_index = yaml.safe_load(ideas_index_path.read_text())
    ids = [entry["id"] for entry in ideas_index["ideas"]]
    assert ids == ["I001", "I002"]


def test_list_and_next_include_ideas(runner, tmp_tasks_dir):
    """list/next should include idea intake tasks."""
    create = runner.invoke(cli, ["idea", "capture a planning intake"])
    assert create.exit_code == 0

    list_result = runner.invoke(cli, ["list"])
    assert list_result.exit_code == 0
    assert "Ideas" in list_result.output
    assert "★" in list_result.output
    assert "I001: capture a planning intake" in list_result.output

    next_result = runner.invoke(cli, ["next", "--json"])
    assert next_result.exit_code == 0
    payload = yaml.safe_load(next_result.output)
    assert payload["id"] == "I001"


def test_grab_can_claim_idea(runner, tmp_tasks_dir):
    """grab should be able to claim idea intake tasks."""
    create = runner.invoke(cli, ["idea", "iterate on architecture options"])
    assert create.exit_code == 0

    result = runner.invoke(
        cli, ["grab", "--single", "--agent=test-agent", "--no-content"]
    )
    assert result.exit_code == 0
    assert "I001" in result.output

    ideas_index = yaml.safe_load(
        (tmp_tasks_dir / ".tasks" / "ideas" / "index.yaml").read_text()
    )
    idea_path = tmp_tasks_dir / ".tasks" / "ideas" / ideas_index["ideas"][0]["file"]
    idea_content = idea_path.read_text()
    assert "status: in_progress" in idea_content
    assert "claimed_by: test-agent" in idea_content


def test_list_bugs_and_ideas_flags(runner, tmp_tasks_dir):
    bug_result = runner.invoke(cli, ["bug", "--title", "critical bug", "--simple"])
    assert bug_result.exit_code == 0

    idea_result = runner.invoke(cli, ["idea", "future planning idea"])
    assert idea_result.exit_code == 0

    bugs_only = runner.invoke(cli, ["list", "--bugs"])
    assert bugs_only.exit_code == 0
    assert "Bugs" in bugs_only.output
    assert "B001" in bugs_only.output
    assert "Ideas" not in bugs_only.output
    assert "Phase" not in bugs_only.output

    ideas_only = runner.invoke(cli, ["list", "--ideas"])
    assert ideas_only.exit_code == 0
    assert "Ideas" in ideas_only.output
    assert "I001" in ideas_only.output
    assert "Bugs" not in ideas_only.output
    assert "Phase" not in ideas_only.output


def test_set_updates_multiple_fields(runner, tmp_tasks_dir):
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Original")

    result = runner.invoke(
        cli,
        [
            "set",
            "P1.M1.E1.T001",
            "--priority",
            "critical",
            "--complexity",
            "high",
            "--estimate",
            "3.5",
            "--title",
            "Updated Task",
            "--depends-on",
            "B060,P1.M1.E1.T002",
            "--tags",
            "bugfix,urgent",
        ],
    )

    assert result.exit_code == 0
    task_file = (
        tmp_tasks_dir
        / ".tasks"
        / "01-test-phase"
        / "01-test-milestone"
        / "01-test-epic"
        / "T001-test-task.todo"
    )
    content = task_file.read_text()
    assert "title: Updated Task" in content
    assert "priority: critical" in content
    assert "complexity: high" in content
    assert "estimate_hours: 3.5" in content
    assert "- B060" in content
    assert "- P1.M1.E1.T002" in content
    assert "- bugfix" in content
    assert "- urgent" in content


def test_set_requires_at_least_one_property(runner, tmp_tasks_dir):
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Original")
    result = runner.invoke(cli, ["set", "P1.M1.E1.T001"])
    assert result.exit_code != 0
    assert "set requires at least one property flag" in result.output


def test_show_idea_pending_displays_instructions(runner, tmp_tasks_dir):
    """show on a pending idea should display an Instructions section."""
    create = runner.invoke(cli, ["idea", "refactor auth module"])
    assert create.exit_code == 0

    result = runner.invoke(cli, ["show", "I001"])
    assert result.exit_code == 0
    assert "Instructions:" in result.output
    assert "Read the idea file at" in result.output
    assert "tasks add-phase" in result.output
    assert "tasks add-milestone" in result.output
    assert "tasks add-epic" in result.output
    assert "tasks add" in result.output
    assert "Created Work Items" in result.output
    assert "Mark this idea as done" in result.output


def test_show_idea_non_pending_hides_instructions(runner, tmp_tasks_dir):
    """show on a non-pending idea should NOT display Instructions."""
    create = runner.invoke(cli, ["idea", "refactor auth module"])
    assert create.exit_code == 0

    # Claim it to change status to in_progress
    claim = runner.invoke(
        cli, ["grab", "--single", "--agent=test-agent", "--no-content"]
    )
    assert claim.exit_code == 0

    result = runner.invoke(cli, ["show", "I001"])
    assert result.exit_code == 0
    assert "Instructions:" not in result.output


def test_move_task_to_different_epic_renumbers_id(runner, tmp_tasks_dir_short_ids):
    """move should relocate a task to destination epic with renumbered ID."""
    tasks_root = tmp_tasks_dir_short_ids / ".tasks"
    target_epic_dir = (
        tasks_root / "01-test-phase" / "01-test-milestone" / "02-target-epic"
    )
    target_epic_dir.mkdir(parents=True, exist_ok=True)

    # Add a second epic under the milestone
    milestone_index_path = (
        tasks_root / "01-test-phase" / "01-test-milestone" / "index.yaml"
    )
    milestone_index = yaml.safe_load(milestone_index_path.read_text())
    milestone_index.setdefault("epics", []).append(
        {
            "id": "E2",
            "name": "Target Epic",
            "path": "02-target-epic",
            "status": "pending",
        }
    )
    milestone_index_path.write_text(yaml.dump(milestone_index))

    # Create destination epic index
    (target_epic_dir / "index.yaml").write_text(
        yaml.dump(
            {
                "id": "P1.M1.E2",
                "name": "Target Epic",
                "tasks": [],
            }
        )
    )

    # Existing task in source epic
    create_task_file(
        tmp_tasks_dir_short_ids, "P1.M1.E1.T001", "Move This Task", status="pending"
    )

    tree_before = TaskLoader().load()
    target_epic_id = None
    for p in tree_before.phases:
        for m in p.milestones:
            for e in m.epics:
                if e.path == "02-target-epic":
                    target_epic_id = e.id
                    break
    assert target_epic_id is not None

    result = runner.invoke(cli, ["move", "P1.M1.E1.T001", "--to", target_epic_id])

    assert result.exit_code == 0
    assert "Moved:" in result.output
    assert "New ID:" in result.output
    assert f"{target_epic_id}.T001" in result.output

    moved_task = target_epic_dir / "T001-move-this-task.todo"
    assert moved_task.exists()
    assert f"id: {target_epic_id}.T001" in moved_task.read_text()


def test_move_epic_to_different_milestone_remaps_descendant_ids(
    runner, tmp_tasks_dir_short_ids
):
    """move should relocate epic and remap child task IDs to new milestone prefix."""
    tasks_root = tmp_tasks_dir_short_ids / ".tasks"
    phase_dir = tasks_root / "01-test-phase"
    target_ms_dir = phase_dir / "02-target-ms"
    target_ms_dir.mkdir(parents=True, exist_ok=True)

    # Add second milestone under phase
    phase_index_path = phase_dir / "index.yaml"
    phase_index = yaml.safe_load(phase_index_path.read_text())
    phase_index.setdefault("milestones", []).append(
        {
            "id": "M2",
            "name": "Target Milestone",
            "path": "02-target-ms",
            "status": "pending",
        }
    )
    phase_index_path.write_text(yaml.dump(phase_index))

    # Create destination milestone index
    (target_ms_dir / "index.yaml").write_text(yaml.dump({"epics": []}))

    create_task_file(tmp_tasks_dir_short_ids, "P1.M1.E1.T001", "A", status="pending")

    tree_before = TaskLoader().load()
    target_ms_id = None
    for p in tree_before.phases:
        for m in p.milestones:
            if m.path == "02-target-ms":
                target_ms_id = m.id
                break
    assert target_ms_id is not None

    result = runner.invoke(cli, ["move", "P1.M1.E1", "--to", target_ms_id])

    assert result.exit_code == 0
    assert "Moved:" in result.output
    assert "New ID:" in result.output
    assert f"{target_ms_id}.E1" in result.output

    moved_task = target_ms_dir / "01-test-epic" / "T001-test-task.todo"
    assert moved_task.exists()
    assert f"id: {target_ms_id}.E1.T001" in moved_task.read_text()


def test_move_rejects_invalid_source_destination_pair(runner, tmp_tasks_dir):
    """move should reject unsupported hierarchy moves."""
    create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Invalid Move", status="pending")

    # Task cannot move directly to phase
    result = runner.invoke(cli, ["move", "P1.M1.E1.T001", "--to", "P1"])
    assert result.exit_code != 0
    assert "Invalid move" in result.output
