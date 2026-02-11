"""Tests for tasks CLI commands."""

import pytest
import yaml
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from click.testing import CliRunner
from tasks.cli import cli


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


def create_task_file(tasks_dir, task_id, title, status="pending", claimed_by=None, claimed_at=None):
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

- [ ] First requirement
- [ ] Second requirement
- [ ] Third requirement

## Acceptance Criteria

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
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
        assert "Cannot claim P1.M1.E1.T001 because the task file is missing." in result.output


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
        assert "Cannot claim P1.M1.E1.T001 because the task file is missing." in result.output


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

class TestCycleCommand:
    """Tests for the cycle command."""

    def test_cycle_auto_grabs_when_epic_not_complete(self, runner, tmp_tasks_dir):
        """cycle should auto-grab next task when completing a task that doesn't complete the epic."""
        # Create 3 tasks in the same epic
        task_ids = create_multi_task_epic(tmp_tasks_dir, 3)
        
        # Mark first task as in_progress
        task_file = tmp_tasks_dir / ".tasks" / "01-test-phase" / "01-test-milestone" / "01-test-epic" / "T001-test-task.todo"
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
            "started_at": datetime.now(timezone.utc).isoformat()
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
        task2_file = tmp_tasks_dir / ".tasks" / "01-test-phase" / "01-test-milestone" / "01-test-epic" / "T002-test-task.todo"
        with open(task2_file, "r") as f:
            task2_content = f.read()
        assert "status: in_progress" in task2_content

    def test_cycle_stops_when_epic_complete(self, runner, tmp_tasks_dir):
        """cycle should stop and not auto-grab when completing the last task in an epic."""
        # Create 2 tasks in the same epic
        task_ids = create_multi_task_epic(tmp_tasks_dir, 2)
        
        # Mark first task as done
        task1_file = tmp_tasks_dir / ".tasks" / "01-test-phase" / "01-test-milestone" / "01-test-epic" / "T001-test-task.todo"
        with open(task1_file, "r") as f:
            content = f.read()
        content = content.replace("status: pending", "status: done")
        with open(task1_file, "w") as f:
            f.write(content)
        
        # Mark second task as in_progress
        task2_file = tmp_tasks_dir / ".tasks" / "01-test-phase" / "01-test-milestone" / "01-test-epic" / "T002-test-task.todo"
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
            "started_at": datetime.now(timezone.utc).isoformat()
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
        assert "./tasks.py grab" in result.output
        assert "Grabbed" not in result.output  # Should NOT auto-grab
        
        # Verify context is cleared
        assert not context_file.exists() or not Path(context_file).read_text().strip()

    def test_cycle_stops_when_milestone_complete(self, runner, tmp_tasks_dir):
        """cycle should stop when completing the last task that completes a milestone."""
        # Create one epic with one task (completes both epic and milestone)
        task_ids = create_multi_task_epic(tmp_tasks_dir, 1)
        
        # Mark the task as in_progress
        task_file = tmp_tasks_dir / ".tasks" / "01-test-phase" / "01-test-milestone" / "01-test-epic" / "T001-test-task.todo"
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
            "started_at": datetime.now(timezone.utc).isoformat()
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
        task1_file = tmp_tasks_dir / ".tasks" / "01-test-phase" / "01-test-milestone" / "01-test-epic" / "T001-test-task.todo"
        with open(task1_file, "r") as f:
            content = f.read()
        content = content.replace("status: pending", "status: done")
        with open(task1_file, "w") as f:
            f.write(content)
        
        # Mark second task as in_progress
        task2_file = tmp_tasks_dir / ".tasks" / "01-test-phase" / "01-test-milestone" / "01-test-epic" / "T002-test-task.todo"
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
        milestones.append({
            "id": f"P1.M{i}",
            "name": f"Milestone {i}",
            "path": f"0{i}-milestone-{i}",
            "status": "pending",
        })

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


def test_tree_details_shows_metadata(runner, tmp_tasks_dir):
    """Test tree --details shows metadata."""
    task_file = create_task_file(tmp_tasks_dir, "P1.M1.E1.T001", "Task 1", status="in_progress", claimed_by="agent-x")

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
