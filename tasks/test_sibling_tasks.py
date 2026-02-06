"""Tests for sibling task batching: critical_path, helpers, and workflow integration."""

import pytest
import yaml
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from click.testing import CliRunner
from tasks.cli import cli
from tasks.loader import TaskLoader
from tasks.critical_path import CriticalPathCalculator
from tasks.models import Status, Task
from tasks.helpers import (
    set_sibling_task_context,
    get_sibling_tasks,
    set_current_task,
    set_multi_task_context,
    get_all_current_tasks,
    load_context,
    clear_context,
    CONTEXT_FILE,
)


# ============================================================================
# Fixtures
# ============================================================================


def _make_epic_dir(tasks_dir, phase_path, milestone_path, epic_path):
    """Create directory structure for an epic and return the epic dir."""
    epic_dir = tasks_dir / phase_path / milestone_path / epic_path
    epic_dir.mkdir(parents=True, exist_ok=True)
    return epic_dir


def _write_task_file(epic_dir, task_id, title, status="pending", depends_on=None, claimed_by=None):
    """Write a .todo task file and return (filename, frontmatter)."""
    parts = task_id.split(".")
    task_num = parts[3]  # e.g., "T001"
    filename = f"{task_num}-task.todo"

    frontmatter = {
        "id": task_id,
        "title": title,
        "status": status,
        "estimate_hours": 2.0,
        "complexity": "medium",
        "priority": "high",
        "depends_on": depends_on or [],
        "tags": ["test"],
    }
    if claimed_by:
        frontmatter["claimed_by"] = claimed_by

    content = f"---\n{yaml.dump(frontmatter, default_flow_style=False)}---\n\n# {title}\n\nTest task.\n"
    with open(epic_dir / filename, "w") as f:
        f.write(content)

    return filename, frontmatter


@pytest.fixture
def tmp_sibling_tasks_dir(tmp_path):
    """Create a task tree with one epic containing 5 tasks for sibling testing."""
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    # Root index
    root_index = {
        "project": "Sibling Test",
        "description": "Test project for sibling batching",
        "timeline_weeks": 4,
        "phases": [{
            "id": "P1",
            "name": "Phase 1",
            "path": "01-phase-1",
            "status": "in_progress",
        }],
    }
    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(root_index, f)

    # Phase
    phase_dir = tasks_dir / "01-phase-1"
    phase_dir.mkdir()
    with open(phase_dir / "index.yaml", "w") as f:
        yaml.dump({"milestones": [{
            "id": "M1",
            "name": "Milestone 1",
            "path": "01-milestone-1",
            "status": "in_progress",
        }]}, f)

    # Milestone
    milestone_dir = phase_dir / "01-milestone-1"
    milestone_dir.mkdir()
    with open(milestone_dir / "index.yaml", "w") as f:
        yaml.dump({"epics": [{
            "id": "E1",
            "name": "Epic 1",
            "path": "01-epic-1",
            "status": "in_progress",
        }]}, f)

    # Epic with 5 tasks
    epic_dir = milestone_dir / "01-epic-1"
    epic_dir.mkdir()

    tasks_list = []
    for i in range(1, 6):
        task_id = f"P1.M1.E1.T{i:03d}"
        filename, _fm = _write_task_file(epic_dir, task_id, f"Task {i}")
        tasks_list.append({
            "id": task_id,
            "title": f"Task {i}",
            "file": filename,
            "status": "pending",
            "estimate_hours": 2.0,
            "complexity": "medium",
            "priority": "high",
        })

    with open(epic_dir / "index.yaml", "w") as f:
        yaml.dump({"tasks": tasks_list}, f)

    return tmp_path


@pytest.fixture
def tmp_sibling_with_deps_dir(tmp_path):
    """Create a task tree where some sibling tasks have explicit dependencies."""
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    root_index = {
        "project": "Deps Test",
        "description": "Test sibling batching with dependencies",
        "timeline_weeks": 4,
        "phases": [{
            "id": "P1",
            "name": "Phase 1",
            "path": "01-phase-1",
            "status": "in_progress",
        }],
    }
    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(root_index, f)

    phase_dir = tasks_dir / "01-phase-1"
    phase_dir.mkdir()
    with open(phase_dir / "index.yaml", "w") as f:
        yaml.dump({"milestones": [{
            "id": "M1",
            "name": "Milestone 1",
            "path": "01-milestone-1",
            "status": "in_progress",
        }]}, f)

    milestone_dir = phase_dir / "01-milestone-1"
    milestone_dir.mkdir()
    with open(milestone_dir / "index.yaml", "w") as f:
        yaml.dump({"epics": [
            {
                "id": "E1",
                "name": "Epic 1",
                "path": "01-epic-1",
                "status": "in_progress",
            },
            {
                "id": "E2",
                "name": "Epic 2",
                "path": "02-epic-2",
                "status": "in_progress",
            },
        ]}, f)

    # Epic 1: T001 (done), T002 (pending), T003 (pending, depends on T002),
    #          T004 (pending, depends on external E2.T001)
    epic1_dir = milestone_dir / "01-epic-1"
    epic1_dir.mkdir()

    tasks_list = []

    # T001 is done
    fn, _ = _write_task_file(epic1_dir, "P1.M1.E1.T001", "Task 1", status="done")
    tasks_list.append({
        "id": "P1.M1.E1.T001", "title": "Task 1", "file": fn,
        "status": "done", "estimate_hours": 2.0, "complexity": "medium", "priority": "high",
    })

    # T002 is pending (no deps, implicit dep on T001 which is done)
    fn, _ = _write_task_file(epic1_dir, "P1.M1.E1.T002", "Task 2")
    tasks_list.append({
        "id": "P1.M1.E1.T002", "title": "Task 2", "file": fn,
        "status": "pending", "estimate_hours": 2.0, "complexity": "medium", "priority": "high",
    })

    # T003 depends explicitly on T002
    fn, _ = _write_task_file(epic1_dir, "P1.M1.E1.T003", "Task 3", depends_on=["P1.M1.E1.T002"])
    tasks_list.append({
        "id": "P1.M1.E1.T003", "title": "Task 3", "file": fn,
        "status": "pending", "estimate_hours": 2.0, "complexity": "medium", "priority": "high",
        "depends_on": ["P1.M1.E1.T002"],
    })

    # T004 depends on external task (E2.T001) which is NOT done
    fn, _ = _write_task_file(epic1_dir, "P1.M1.E1.T004", "Task 4", depends_on=["P1.M1.E2.T001"])
    tasks_list.append({
        "id": "P1.M1.E1.T004", "title": "Task 4", "file": fn,
        "status": "pending", "estimate_hours": 2.0, "complexity": "medium", "priority": "high",
        "depends_on": ["P1.M1.E2.T001"],
    })

    with open(epic1_dir / "index.yaml", "w") as f:
        yaml.dump({"tasks": tasks_list}, f)

    # Epic 2: T001 is pending
    epic2_dir = milestone_dir / "02-epic-2"
    epic2_dir.mkdir()
    fn, _ = _write_task_file(epic2_dir, "P1.M1.E2.T001", "E2 Task 1")
    with open(epic2_dir / "index.yaml", "w") as f:
        yaml.dump({"tasks": [{
            "id": "P1.M1.E2.T001", "title": "E2 Task 1", "file": fn,
            "status": "pending", "estimate_hours": 2.0, "complexity": "medium", "priority": "high",
        }]}, f)

    return tmp_path


@pytest.fixture
def tmp_multi_epic_dir(tmp_path):
    """Create a task tree with 2 epics for testing mode switching."""
    tasks_dir = tmp_path / ".tasks"
    tasks_dir.mkdir()

    root_index = {
        "project": "Multi Epic Test",
        "description": "Test with multiple epics",
        "timeline_weeks": 4,
        "phases": [
            {
                "id": "P1",
                "name": "Phase 1",
                "path": "01-phase-1",
                "status": "in_progress",
            },
            {
                "id": "P2",
                "name": "Phase 2",
                "path": "02-phase-2",
                "status": "in_progress",
            },
        ],
    }
    with open(tasks_dir / "index.yaml", "w") as f:
        yaml.dump(root_index, f)

    # Phase 1, Milestone 1, Epic 1 with 4 tasks
    p1_dir = tasks_dir / "01-phase-1"
    p1_dir.mkdir()
    with open(p1_dir / "index.yaml", "w") as f:
        yaml.dump({"milestones": [{
            "id": "M1", "name": "Milestone 1", "path": "01-milestone-1", "status": "in_progress",
        }]}, f)

    m1_dir = p1_dir / "01-milestone-1"
    m1_dir.mkdir()
    with open(m1_dir / "index.yaml", "w") as f:
        yaml.dump({"epics": [{
            "id": "E1", "name": "Epic 1", "path": "01-epic-1", "status": "in_progress",
        }]}, f)

    e1_dir = m1_dir / "01-epic-1"
    e1_dir.mkdir()
    tasks_list = []
    for i in range(1, 5):
        task_id = f"P1.M1.E1.T{i:03d}"
        fn, _ = _write_task_file(e1_dir, task_id, f"P1 Task {i}")
        tasks_list.append({
            "id": task_id, "title": f"P1 Task {i}", "file": fn,
            "status": "pending", "estimate_hours": 2.0, "complexity": "medium", "priority": "high",
        })
    with open(e1_dir / "index.yaml", "w") as f:
        yaml.dump({"tasks": tasks_list}, f)

    # Phase 2, Milestone 1, Epic 1 with 2 tasks
    p2_dir = tasks_dir / "02-phase-2"
    p2_dir.mkdir()
    with open(p2_dir / "index.yaml", "w") as f:
        yaml.dump({"milestones": [{
            "id": "M1", "name": "Milestone 1", "path": "01-milestone-1", "status": "in_progress",
        }]}, f)

    m2_dir = p2_dir / "01-milestone-1"
    m2_dir.mkdir()
    with open(m2_dir / "index.yaml", "w") as f:
        yaml.dump({"epics": [{
            "id": "E1", "name": "Epic 1", "path": "01-epic-1", "status": "in_progress",
        }]}, f)

    e2_dir = m2_dir / "01-epic-1"
    e2_dir.mkdir()
    tasks_list2 = []
    for i in range(1, 3):
        task_id = f"P2.M1.E1.T{i:03d}"
        fn, _ = _write_task_file(e2_dir, task_id, f"P2 Task {i}")
        tasks_list2.append({
            "id": task_id, "title": f"P2 Task {i}", "file": fn,
            "status": "pending", "estimate_hours": 2.0, "complexity": "medium", "priority": "high",
        })
    with open(e2_dir / "index.yaml", "w") as f:
        yaml.dump({"tasks": tasks_list2}, f)

    return tmp_path


@pytest.fixture
def runner():
    """Create a Click CLI test runner."""
    return CliRunner()


COMPLEXITY_MULTIPLIERS = {"low": 1.0, "medium": 1.5, "high": 2.0, "critical": 3.0}


# ============================================================================
# Unit Tests: CriticalPathCalculator.find_sibling_tasks
# ============================================================================


class TestFindSiblingTasks:
    """Test find_sibling_tasks algorithm."""

    def test_find_sibling_tasks_basic(self, tmp_sibling_tasks_dir):
        """Find up to 3 siblings in the same epic."""
        loader = TaskLoader(tmp_sibling_tasks_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        primary = tree.find_task("P1.M1.E1.T001")
        siblings = calc.find_sibling_tasks(primary, count=3)

        # Should get exactly 3 siblings (T002, T003, T004)
        assert len(siblings) == 3
        assert siblings[0] == "P1.M1.E1.T002"
        assert siblings[1] == "P1.M1.E1.T003"
        assert siblings[2] == "P1.M1.E1.T004"

    def test_find_sibling_tasks_no_siblings(self, tmp_sibling_tasks_dir):
        """Fallback when primary is the last task in the epic."""
        loader = TaskLoader(tmp_sibling_tasks_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        primary = tree.find_task("P1.M1.E1.T005")
        siblings = calc.find_sibling_tasks(primary, count=3)

        assert siblings == []

    def test_find_sibling_tasks_partial_batch(self, tmp_sibling_tasks_dir):
        """Handle fewer siblings than count."""
        loader = TaskLoader(tmp_sibling_tasks_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        # Start from T004, only T005 is after
        primary = tree.find_task("P1.M1.E1.T004")
        siblings = calc.find_sibling_tasks(primary, count=3)

        assert len(siblings) == 1
        assert siblings[0] == "P1.M1.E1.T005"

    def test_find_sibling_tasks_with_dependencies(self, tmp_sibling_with_deps_dir):
        """Siblings with dependencies within batch should be included."""
        loader = TaskLoader(tmp_sibling_with_deps_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        # T002 is pending, T003 depends on T002, T004 depends on external
        primary = tree.find_task("P1.M1.E1.T002")
        siblings = calc.find_sibling_tasks(primary, count=3)

        # T003 depends on T002 which is in batch → included
        # T004 depends on P1.M1.E2.T001 which is NOT done and NOT in batch → excluded
        assert "P1.M1.E1.T003" in siblings
        assert "P1.M1.E1.T004" not in siblings

    def test_find_sibling_tasks_external_dependency(self, tmp_sibling_with_deps_dir):
        """Skip siblings with external blocking dependencies."""
        loader = TaskLoader(tmp_sibling_with_deps_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        primary = tree.find_task("P1.M1.E1.T002")
        siblings = calc.find_sibling_tasks(primary, count=3)

        # T004 depends on E2.T001 (pending, not in batch) - should be excluded
        assert "P1.M1.E1.T004" not in siblings

    def test_find_sibling_tasks_dependency_chain(self, tmp_sibling_with_deps_dir):
        """Chain of dependencies within batch should all be included."""
        loader = TaskLoader(tmp_sibling_with_deps_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        # T002 (primary) → T003 depends on T002 → OK
        primary = tree.find_task("P1.M1.E1.T002")
        siblings = calc.find_sibling_tasks(primary, count=3)

        # T003 should be in batch since T002 is in batch
        assert "P1.M1.E1.T003" in siblings

    def test_find_sibling_tasks_skips_claimed(self, tmp_sibling_tasks_dir):
        """Skip tasks that are already claimed.

        When T002 is claimed (skipped), T003's implicit dep on T002 is unsatisfied
        (T002 is not DONE and not in batch), so T003+ are also excluded.
        """
        loader = TaskLoader(tmp_sibling_tasks_dir / ".tasks")
        tree = loader.load()

        # Mark T002 as claimed
        t002 = tree.find_task("P1.M1.E1.T002")
        t002.claimed_by = "other-agent"

        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)
        primary = tree.find_task("P1.M1.E1.T001")
        siblings = calc.find_sibling_tasks(primary, count=3)

        # T002 is claimed so skipped. T003 has implicit dep on T002 (not done, not in batch)
        # so T003 and subsequent tasks with implicit deps are also excluded.
        assert "P1.M1.E1.T002" not in siblings
        assert siblings == []

    def test_find_sibling_tasks_skips_non_pending(self, tmp_sibling_tasks_dir):
        """Skip tasks that are not in pending status."""
        loader = TaskLoader(tmp_sibling_tasks_dir / ".tasks")
        tree = loader.load()

        # Mark T002 as done
        t002 = tree.find_task("P1.M1.E1.T002")
        t002.status = Status.DONE

        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)
        primary = tree.find_task("P1.M1.E1.T001")
        siblings = calc.find_sibling_tasks(primary, count=3)

        assert "P1.M1.E1.T002" not in siblings
        # T003 has implicit dep on T002 (done) → should be included
        assert "P1.M1.E1.T003" in siblings


class TestCheckDependenciesWithinBatch:
    """Test _check_dependencies_within_batch method."""

    def test_no_dependencies(self, tmp_sibling_tasks_dir):
        """Task with no explicit deps and satisfied implicit dep should pass."""
        loader = TaskLoader(tmp_sibling_tasks_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        # T002 has implicit dep on T001 which is in batch
        t002 = tree.find_task("P1.M1.E1.T002")
        result = calc._check_dependencies_within_batch(t002, ["P1.M1.E1.T001"])
        assert result is True

    def test_explicit_dep_in_batch(self, tmp_sibling_with_deps_dir):
        """Task whose explicit dep is in the batch should pass."""
        loader = TaskLoader(tmp_sibling_with_deps_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        # T003 depends on T002, T002 is in batch
        t003 = tree.find_task("P1.M1.E1.T003")
        result = calc._check_dependencies_within_batch(t003, ["P1.M1.E1.T002"])
        assert result is True

    def test_explicit_dep_done(self, tmp_sibling_with_deps_dir):
        """Task whose explicit dep is done should pass."""
        loader = TaskLoader(tmp_sibling_with_deps_dir / ".tasks")
        tree = loader.load()

        # Mark T002 as done
        t002 = tree.find_task("P1.M1.E1.T002")
        t002.status = Status.DONE

        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)
        t003 = tree.find_task("P1.M1.E1.T003")
        result = calc._check_dependencies_within_batch(t003, [])
        assert result is True

    def test_explicit_dep_not_in_batch_not_done(self, tmp_sibling_with_deps_dir):
        """Task whose explicit dep is not in batch and not done should fail."""
        loader = TaskLoader(tmp_sibling_with_deps_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        # T004 depends on P1.M1.E2.T001 which is pending and not in batch
        t004 = tree.find_task("P1.M1.E1.T004")
        result = calc._check_dependencies_within_batch(t004, ["P1.M1.E1.T002", "P1.M1.E1.T003"])
        assert result is False

    def test_implicit_dep_not_in_batch_not_done(self, tmp_sibling_tasks_dir):
        """Task with unsatisfied implicit dep should fail."""
        loader = TaskLoader(tmp_sibling_tasks_dir / ".tasks")
        tree = loader.load()
        calc = CriticalPathCalculator(tree, COMPLEXITY_MULTIPLIERS)

        # T003 has implicit dep on T002. T002 not done and not in batch.
        t003 = tree.find_task("P1.M1.E1.T003")
        result = calc._check_dependencies_within_batch(t003, ["P1.M1.E1.T001"])
        assert result is False


# ============================================================================
# Unit Tests: helpers.py sibling context management
# ============================================================================


class TestSiblingContext:
    """Test sibling context management functions."""

    def test_set_sibling_task_context(self, tmp_path, monkeypatch):
        """Set sibling context correctly."""
        monkeypatch.chdir(tmp_path)
        (tmp_path / ".tasks").mkdir()

        set_sibling_task_context("agent-1", "P1.M1.E1.T001", ["P1.M1.E1.T002", "P1.M1.E1.T003"])

        ctx = load_context()
        assert ctx["mode"] == "siblings"
        assert ctx["primary_task"] == "P1.M1.E1.T001"
        assert ctx["sibling_tasks"] == ["P1.M1.E1.T002", "P1.M1.E1.T003"]
        assert ctx["agent"] == "agent-1"

    def test_get_sibling_tasks(self, tmp_path, monkeypatch):
        """Retrieve sibling context correctly."""
        monkeypatch.chdir(tmp_path)
        (tmp_path / ".tasks").mkdir()

        set_sibling_task_context("agent-1", "P1.M1.E1.T001", ["P1.M1.E1.T002"])

        primary, siblings = get_sibling_tasks("agent-1")
        assert primary == "P1.M1.E1.T001"
        assert siblings == ["P1.M1.E1.T002"]

    def test_get_sibling_tasks_wrong_agent(self, tmp_path, monkeypatch):
        """Should return None for wrong agent."""
        monkeypatch.chdir(tmp_path)
        (tmp_path / ".tasks").mkdir()

        set_sibling_task_context("agent-1", "P1.M1.E1.T001", ["P1.M1.E1.T002"])

        primary, siblings = get_sibling_tasks("agent-2")
        assert primary is None
        assert siblings == []

    def test_get_sibling_tasks_wrong_mode(self, tmp_path, monkeypatch):
        """Should return None if context is not in sibling mode."""
        monkeypatch.chdir(tmp_path)
        (tmp_path / ".tasks").mkdir()

        set_multi_task_context("agent-1", "P1.M1.E1.T001", ["P2.M1.E1.T001"])

        primary, siblings = get_sibling_tasks("agent-1")
        assert primary is None
        assert siblings == []

    def test_context_mode_isolation(self, tmp_path, monkeypatch):
        """Multi vs siblings mode don't interfere."""
        monkeypatch.chdir(tmp_path)
        (tmp_path / ".tasks").mkdir()

        # Set multi context
        set_multi_task_context("agent-1", "P1.M1.E1.T001", ["P2.M1.E1.T001"])
        primary_multi, additional = get_all_current_tasks("agent-1")
        assert primary_multi == "P1.M1.E1.T001"
        assert additional == ["P2.M1.E1.T001"]
        # Sibling getter should return nothing
        primary_sib, siblings = get_sibling_tasks("agent-1")
        assert primary_sib is None

        # Now switch to sibling context
        set_sibling_task_context("agent-1", "P1.M1.E1.T001", ["P1.M1.E1.T002"])
        primary_sib, siblings = get_sibling_tasks("agent-1")
        assert primary_sib == "P1.M1.E1.T001"
        assert siblings == ["P1.M1.E1.T002"]


# ============================================================================
# Unit Tests: workflow.py grab command
# ============================================================================


class TestGrabCommand:
    """Test grab command with sibling batching."""

    def test_grab_default_siblings(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """Default behavior claims siblings."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        result = runner.invoke(cli, ["grab", "--agent=test-agent"])

        assert result.exit_code == 0
        assert "Grabbed PRIMARY" in result.output
        # Should have siblings
        assert "SIBLING" in result.output or "Grabbed SIBLING" in result.output

    def test_grab_with_single_flag(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """--single claims only 1 task."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        result = runner.invoke(cli, ["grab", "--agent=test-agent", "--single"])

        assert result.exit_code == 0
        assert "Grabbed" in result.output or "✓ Grabbed" in result.output
        # Should NOT have sibling instructions
        assert "SIBLING BATCH" not in result.output
        assert "MULTI-TASK" not in result.output

    def test_grab_with_multi_flag(self, runner, tmp_multi_epic_dir, monkeypatch):
        """--multi still works (cross-epic)."""
        monkeypatch.chdir(tmp_multi_epic_dir)

        result = runner.invoke(cli, ["grab", "--agent=test-agent", "--multi"])

        assert result.exit_code == 0
        assert "MULTI-TASK" in result.output or "Grabbed" in result.output

    def test_grab_with_no_siblings_flag(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """--no-siblings claims only 1 task."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        result = runner.invoke(cli, ["grab", "--agent=test-agent", "--no-siblings"])

        assert result.exit_code == 0
        assert "SIBLING BATCH" not in result.output

    def test_grab_siblings_context_set(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """Default grab sets sibling context."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        result = runner.invoke(cli, ["grab", "--agent=test-agent"])
        assert result.exit_code == 0

        ctx = load_context()
        assert ctx.get("mode") == "siblings"
        assert ctx.get("primary_task") == "P1.M1.E1.T001"
        assert len(ctx.get("sibling_tasks", [])) > 0

    def test_grab_single_context_set(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """--single grab sets single context."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        result = runner.invoke(cli, ["grab", "--agent=test-agent", "--single"])
        assert result.exit_code == 0

        ctx = load_context()
        assert ctx.get("mode") == "single"

    def test_delegation_instructions_appended(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """Correct delegation instructions appended to primary task file."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        result = runner.invoke(cli, ["grab", "--agent=test-agent"])
        assert result.exit_code == 0

        # Read the primary task file
        task_file = (
            tmp_sibling_tasks_dir / ".tasks" / "01-phase-1" / "01-milestone-1"
            / "01-epic-1" / "T001-task.todo"
        )
        content = task_file.read_text()
        assert "Sibling Batch Instructions" in content
        assert "P1.M1.E1.T002" in content


# ============================================================================
# Unit Tests: workflow.py cycle command with siblings
# ============================================================================


class TestCycleWithSiblings:
    """Test cycle command with sibling batch context."""

    def _setup_sibling_context(self, tmp_path, primary_id, sibling_ids, agent="test-agent"):
        """Helper to set up a sibling context after claiming tasks."""
        context_file = tmp_path / ".tasks" / ".context.yaml"
        context = {
            "agent": agent,
            "primary_task": primary_id,
            "sibling_tasks": sibling_ids,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "mode": "siblings",
        }
        with open(context_file, "w") as f:
            yaml.dump(context, f)

    def _mark_task_in_progress(self, tmp_path, task_id, agent="test-agent"):
        """Mark a task as in_progress in its .todo file."""
        parts = task_id.split(".")
        task_num = parts[3]
        task_file = (
            tmp_path / ".tasks" / "01-phase-1" / "01-milestone-1"
            / "01-epic-1" / f"{task_num}-task.todo"
        )
        content = task_file.read_text()
        content = content.replace("status: pending", "status: in_progress")
        if "claimed_by:" not in content:
            content = content.replace("tags:", f"claimed_by: {agent}\ntags:")
        task_file.write_text(content)

    def test_cycle_sibling_promotion(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """Primary completion promotes first sibling."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        # Mark T001 as in_progress
        self._mark_task_in_progress(tmp_sibling_tasks_dir, "P1.M1.E1.T001")
        # Also mark T002 and T003 as in_progress (they are claimed as siblings)
        self._mark_task_in_progress(tmp_sibling_tasks_dir, "P1.M1.E1.T002")
        self._mark_task_in_progress(tmp_sibling_tasks_dir, "P1.M1.E1.T003")

        # Set sibling context
        self._setup_sibling_context(
            tmp_sibling_tasks_dir,
            "P1.M1.E1.T001",
            ["P1.M1.E1.T002", "P1.M1.E1.T003"],
        )

        # Complete primary
        result = runner.invoke(cli, ["cycle", "P1.M1.E1.T001", "--agent=test-agent"])

        assert result.exit_code == 0
        assert "Completed" in result.output
        assert "Next sibling" in result.output or "P1.M1.E1.T002" in result.output

        # Check context was updated
        ctx = load_context()
        primary = ctx.get("primary_task")
        siblings = ctx.get("sibling_tasks", [])
        # Either promoted to sibling mode with T002 as primary, or set to single with T002
        assert primary == "P1.M1.E1.T002" or ctx.get("current_task") == "P1.M1.E1.T002"

    def test_cycle_sibling_completion(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """Non-primary completion removes sibling from list."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        # Mark tasks as in_progress
        self._mark_task_in_progress(tmp_sibling_tasks_dir, "P1.M1.E1.T001")
        self._mark_task_in_progress(tmp_sibling_tasks_dir, "P1.M1.E1.T002")
        self._mark_task_in_progress(tmp_sibling_tasks_dir, "P1.M1.E1.T003")

        # Set sibling context
        self._setup_sibling_context(
            tmp_sibling_tasks_dir,
            "P1.M1.E1.T001",
            ["P1.M1.E1.T002", "P1.M1.E1.T003"],
        )

        # Complete a sibling (not primary)
        result = runner.invoke(cli, ["cycle", "P1.M1.E1.T002", "--agent=test-agent"])

        assert result.exit_code == 0
        assert "Completed" in result.output
        assert "Returning to primary" in result.output or "P1.M1.E1.T001" in result.output

        # Check context was updated - T002 removed from siblings
        ctx = load_context()
        if ctx.get("mode") == "siblings":
            assert "P1.M1.E1.T002" not in ctx.get("sibling_tasks", [])
            assert ctx.get("primary_task") == "P1.M1.E1.T001"

    def test_cycle_last_sibling_clears_context(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """When all siblings done, completing primary clears context and grabs next."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        # Set up: only primary remaining (no siblings left)
        self._mark_task_in_progress(tmp_sibling_tasks_dir, "P1.M1.E1.T001")

        # Set context with empty siblings (all siblings already completed)
        self._setup_sibling_context(
            tmp_sibling_tasks_dir,
            "P1.M1.E1.T001",
            [],
        )

        result = runner.invoke(cli, ["cycle", "P1.M1.E1.T001", "--agent=test-agent"])

        assert result.exit_code == 0
        assert "Completed" in result.output

    def test_cycle_auto_grab_uses_sibling_batching(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """When cycle grabs fresh work, it should use the same default sibling mode as grab."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        # Complete one current task, then cycle should auto-grab next work.
        self._mark_task_in_progress(tmp_sibling_tasks_dir, "P1.M1.E1.T001")
        set_current_task("P1.M1.E1.T001", "test-agent")

        result = runner.invoke(cli, ["cycle", "--agent=test-agent"])

        assert result.exit_code == 0
        assert "Completed" in result.output
        assert "Grabbed PRIMARY" in result.output

        ctx = load_context()
        assert ctx.get("mode") == "siblings"
        assert ctx.get("primary_task") == "P1.M1.E1.T002"
        assert len(ctx.get("sibling_tasks", [])) >= 1


# ============================================================================
# Integration Tests: end-to-end sibling batching
# ============================================================================


class TestSiblingBatchingIntegration:
    """Integration tests for the full sibling batching workflow."""

    def test_end_to_end_sibling_batch(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """Full workflow: grab with siblings → complete primary → verify promotion."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        # Step 1: Grab with siblings
        result = runner.invoke(cli, ["grab", "--agent=test-agent"])
        assert result.exit_code == 0

        # Step 2: Verify context shows sibling mode
        ctx = load_context()
        assert ctx.get("mode") == "siblings"
        primary = ctx.get("primary_task")
        siblings = ctx.get("sibling_tasks", [])
        assert primary == "P1.M1.E1.T001"
        assert len(siblings) > 0

        # Step 3: Complete primary task
        result = runner.invoke(cli, ["cycle", primary, "--agent=test-agent"])
        assert result.exit_code == 0

        # Step 4: Verify first sibling promoted
        ctx = load_context()
        new_primary = ctx.get("primary_task") or ctx.get("current_task")
        assert new_primary == siblings[0]

    def test_partial_batch_one_sibling(self, tmp_path, monkeypatch):
        """Epic with only 2 pending tasks: primary + 1 sibling."""
        tasks_dir = tmp_path / ".tasks"
        tasks_dir.mkdir()

        root_index = {
            "project": "Partial Test",
            "description": "Partial batch test",
            "timeline_weeks": 1,
            "phases": [{
                "id": "P1", "name": "Phase 1", "path": "01-phase-1", "status": "in_progress",
            }],
        }
        with open(tasks_dir / "index.yaml", "w") as f:
            yaml.dump(root_index, f)

        phase_dir = tasks_dir / "01-phase-1"
        phase_dir.mkdir()
        with open(phase_dir / "index.yaml", "w") as f:
            yaml.dump({"milestones": [{
                "id": "M1", "name": "M1", "path": "01-m1", "status": "in_progress",
            }]}, f)

        m_dir = phase_dir / "01-m1"
        m_dir.mkdir()
        with open(m_dir / "index.yaml", "w") as f:
            yaml.dump({"epics": [{
                "id": "E1", "name": "E1", "path": "01-e1", "status": "in_progress",
            }]}, f)

        e_dir = m_dir / "01-e1"
        e_dir.mkdir()
        tasks_list = []
        for i in range(1, 3):  # Only 2 tasks
            task_id = f"P1.M1.E1.T{i:03d}"
            fn, _ = _write_task_file(e_dir, task_id, f"Task {i}")
            tasks_list.append({
                "id": task_id, "title": f"Task {i}", "file": fn,
                "status": "pending", "estimate_hours": 2.0, "complexity": "medium", "priority": "high",
            })
        with open(e_dir / "index.yaml", "w") as f:
            yaml.dump({"tasks": tasks_list}, f)

        monkeypatch.chdir(tmp_path)
        runner = CliRunner()
        result = runner.invoke(cli, ["grab", "--agent=test-agent"])
        assert result.exit_code == 0

        ctx = load_context()
        assert ctx.get("mode") == "siblings"
        assert len(ctx.get("sibling_tasks", [])) == 1

    def test_partial_batch_single_task(self, tmp_path, monkeypatch):
        """Epic with only 1 pending task: no siblings, falls back to single."""
        tasks_dir = tmp_path / ".tasks"
        tasks_dir.mkdir()

        root_index = {
            "project": "Single Test",
            "description": "Single task test",
            "timeline_weeks": 1,
            "phases": [{
                "id": "P1", "name": "Phase 1", "path": "01-phase-1", "status": "in_progress",
            }],
        }
        with open(tasks_dir / "index.yaml", "w") as f:
            yaml.dump(root_index, f)

        phase_dir = tasks_dir / "01-phase-1"
        phase_dir.mkdir()
        with open(phase_dir / "index.yaml", "w") as f:
            yaml.dump({"milestones": [{
                "id": "M1", "name": "M1", "path": "01-m1", "status": "in_progress",
            }]}, f)

        m_dir = phase_dir / "01-m1"
        m_dir.mkdir()
        with open(m_dir / "index.yaml", "w") as f:
            yaml.dump({"epics": [{
                "id": "E1", "name": "E1", "path": "01-e1", "status": "in_progress",
            }]}, f)

        e_dir = m_dir / "01-e1"
        e_dir.mkdir()
        fn, _ = _write_task_file(e_dir, "P1.M1.E1.T001", "Only Task")
        with open(e_dir / "index.yaml", "w") as f:
            yaml.dump({"tasks": [{
                "id": "P1.M1.E1.T001", "title": "Only Task", "file": fn,
                "status": "pending", "estimate_hours": 2.0, "complexity": "medium", "priority": "high",
            }]}, f)

        monkeypatch.chdir(tmp_path)
        runner = CliRunner()
        result = runner.invoke(cli, ["grab", "--agent=test-agent"])
        assert result.exit_code == 0

        ctx = load_context()
        # Should fall back to single mode
        assert ctx.get("mode") == "single"

    def test_max_5_claimed(self, runner, tmp_sibling_tasks_dir, monkeypatch):
        """Epic with 5+ pending tasks: verify max 5 claimed (primary + 4)."""
        monkeypatch.chdir(tmp_sibling_tasks_dir)

        result = runner.invoke(cli, ["grab", "--agent=test-agent"])
        assert result.exit_code == 0

        ctx = load_context()
        siblings = ctx.get("sibling_tasks", [])
        # Primary + 4 siblings max (all remaining tasks in this fixture)
        assert len(siblings) == 4

    def test_mode_switching(self, runner, tmp_multi_epic_dir, monkeypatch):
        """Test switching between sibling and multi mode."""
        monkeypatch.chdir(tmp_multi_epic_dir)

        # Grab with default (siblings)
        result = runner.invoke(cli, ["grab", "--agent=test-agent"])
        assert result.exit_code == 0

        ctx = load_context()
        assert ctx.get("mode") == "siblings"

        # Clear and grab with --single
        clear_context()
        # Unclaim the tasks that were claimed (reload and reset)
        loader = TaskLoader(tmp_multi_epic_dir / ".tasks")
        tree = loader.load()
        for phase in tree.phases:
            for milestone in phase.milestones:
                for epic in milestone.epics:
                    for task in epic.tasks:
                        if task.status == Status.IN_PROGRESS:
                            task.status = Status.PENDING
                            task.claimed_by = None
                            task.claimed_at = None
                            loader.save_task(task)

        result = runner.invoke(cli, ["grab", "--agent=test-agent", "--single"])
        assert result.exit_code == 0

        ctx = load_context()
        assert ctx.get("mode") == "single"
