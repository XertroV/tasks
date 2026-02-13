"""Helper functions for task management CLI."""

import yaml
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

from .models import Task, Status
from .time_utils import utc_now, utc_now_iso, to_utc
from .data_dir import BACKLOG_DIR, get_data_dir_name


def _safe_data_dir_name() -> str:
    try:
        return get_data_dir_name()
    except FileNotFoundError:
        return BACKLOG_DIR


def _context_file() -> Path:
    return Path(_safe_data_dir_name()) / ".context.yaml"


def _sessions_file() -> Path:
    return Path(_safe_data_dir_name()) / ".sessions.yaml"


# Backwards-compatible exported constants for imports/tests.
# These represent the preferred modern paths.
CONTEXT_FILE = Path(".backlog/.context.yaml")
SESSIONS_FILE = Path(".backlog/.sessions.yaml")


# ============================================================================
# Context Management (Working Task Memory)
# ============================================================================


def load_context() -> Dict[str, Any]:
    """Load current working context."""
    ctx_file = _context_file()
    if ctx_file.exists():
        with open(ctx_file) as f:
            return yaml.safe_load(f) or {}
    return {}


def save_context(context: Dict[str, Any]) -> None:
    """Save working context."""
    ctx_file = _context_file()
    ctx_file.parent.mkdir(parents=True, exist_ok=True)
    with open(ctx_file, "w") as f:
        yaml.dump(context, f, default_flow_style=False)


def clear_context() -> None:
    """Clear working context."""
    ctx_file = _context_file()
    if ctx_file.exists():
        ctx_file.unlink()


def get_current_task_id() -> Optional[str]:
    """Get current working task ID from context."""
    ctx = load_context()
    return ctx.get("current_task")


def set_current_task(task_id: str, agent: Optional[str] = None) -> None:
    """Set current working task in context."""
    ctx = load_context()
    ctx["current_task"] = task_id
    ctx["started_at"] = utc_now_iso()
    ctx["mode"] = "single"
    # Clear additional_tasks when setting single task
    if "additional_tasks" in ctx:
        del ctx["additional_tasks"]
    if "primary_task" in ctx:
        del ctx["primary_task"]
    if agent:
        ctx["agent"] = agent
    save_context(ctx)


def set_multi_task_context(
    agent: str, primary_task_id: str, additional_tasks: List[str]
) -> None:
    """Set multi-task context for agent."""
    context = {
        "agent": agent,
        "primary_task": primary_task_id,
        "additional_tasks": additional_tasks,
        "started_at": utc_now_iso(),
        "mode": "multi",
    }
    save_context(context)


def set_sibling_task_context(
    agent: str, primary_task_id: str, sibling_tasks: List[str]
) -> None:
    """Set sibling task context for agent."""
    context = {
        "agent": agent,
        "primary_task": primary_task_id,
        "sibling_tasks": sibling_tasks,
        "started_at": utc_now_iso(),
        "mode": "siblings",
    }
    save_context(context)


def get_sibling_tasks(agent: str) -> tuple[Optional[str], List[str]]:
    """Get primary and sibling tasks for agent.

    Returns:
        (primary_task_id, sibling_task_ids) or (None, []) if not in sibling mode
    """
    context = load_context()
    if not context or context.get("agent") != agent:
        return None, []
    if context.get("mode") != "siblings":
        return None, []

    primary = context.get("primary_task")
    siblings = context.get("sibling_tasks", [])
    return primary, siblings


def get_all_current_tasks(agent: str) -> tuple[Optional[str], List[str]]:
    """Get primary and additional tasks for agent."""
    context = load_context()
    if not context or context.get("agent") != agent:
        return None, []

    primary = context.get("primary_task") or context.get("current_task")
    additional = context.get("additional_tasks", [])
    return primary, additional


# ============================================================================
# Session Management
# ============================================================================


def load_sessions() -> Dict[str, Any]:
    """Load active sessions."""
    sess_file = _sessions_file()
    if sess_file.exists():
        with open(sess_file) as f:
            return yaml.safe_load(f) or {}
    return {}


def save_sessions(sessions: Dict[str, Any]) -> None:
    """Save sessions."""
    sess_file = _sessions_file()
    sess_file.parent.mkdir(parents=True, exist_ok=True)
    with open(sess_file, "w") as f:
        yaml.dump(sessions, f, default_flow_style=False)


def start_session(agent_id: str, task_id: Optional[str] = None) -> Dict[str, Any]:
    """Start or update a session for an agent."""
    sessions = load_sessions()
    now = utc_now_iso()

    if agent_id not in sessions:
        sessions[agent_id] = {
            "started_at": now,
            "last_heartbeat": now,
            "current_task": task_id,
            "progress": None,
        }
    else:
        sessions[agent_id]["last_heartbeat"] = now
        if task_id:
            sessions[agent_id]["current_task"] = task_id

    save_sessions(sessions)
    return sessions[agent_id]


def update_session_heartbeat(agent_id: str, progress: Optional[str] = None) -> bool:
    """Update session heartbeat."""
    sessions = load_sessions()
    if agent_id in sessions:
        sessions[agent_id]["last_heartbeat"] = utc_now_iso()
        if progress:
            sessions[agent_id]["progress"] = progress
        save_sessions(sessions)
        return True
    return False


def end_session(agent_id: str) -> bool:
    """End a session."""
    sessions = load_sessions()
    if agent_id in sessions:
        del sessions[agent_id]
        save_sessions(sessions)
        return True
    return False


def get_stale_sessions(timeout_minutes: int = 15) -> List[Dict[str, Any]]:
    """Find sessions with no recent heartbeat."""
    sessions = load_sessions()
    stale = []
    now = utc_now()

    for agent_id, session in sessions.items():
        last_heartbeat = to_utc(datetime.fromisoformat(session["last_heartbeat"]))
        age_minutes = (now - last_heartbeat).total_seconds() / 60
        if age_minutes > timeout_minutes:
            stale.append(
                {
                    "agent_id": agent_id,
                    "current_task": session.get("current_task"),
                    "age_minutes": int(age_minutes),
                    "progress": session.get("progress"),
                }
            )

    return stale


def get_active_sessions() -> List[Dict[str, Any]]:
    """Get all active sessions."""
    sessions = load_sessions()
    now = utc_now()
    active = []

    for agent_id, session in sessions.items():
        started = to_utc(datetime.fromisoformat(session["started_at"]))
        last_heartbeat = to_utc(datetime.fromisoformat(session["last_heartbeat"]))
        active.append(
            {
                "agent_id": agent_id,
                "current_task": session.get("current_task"),
                "started_at": session["started_at"],
                "duration_minutes": int((now - started).total_seconds() / 60),
                "last_heartbeat_minutes": int(
                    (now - last_heartbeat).total_seconds() / 60
                ),
                "progress": session.get("progress"),
            }
        )

    return active


# ============================================================================
# Display Helpers
# ============================================================================


def make_progress_bar(done: int, total: int, width: int = 20) -> str:
    """Create an ASCII progress bar."""
    if total == 0:
        return "░" * width

    pct = done / total
    filled = int(width * pct)
    empty = width - filled
    return "█" * filled + "░" * empty


def format_duration(minutes: float) -> str:
    """Format a duration in minutes as a human-readable string."""
    if minutes < 60:
        return f"{int(minutes)}m"
    hours = int(minutes // 60)
    mins = int(minutes % 60)
    if mins == 0:
        return f"{hours}h"
    return f"{hours}h {mins}m"


# ============================================================================
# Task Tree Helpers
# ============================================================================


def _join_path(*parts: str) -> str:
    """Join path parts using forward slashes without duplicate separators."""
    cleaned = [part.strip("/") for part in parts if part]
    return "/".join(cleaned)


def format_phase_path(phase) -> str:
    """Format a phase path for display."""
    return _join_path(get_data_dir_name(), phase.path)


def _milestone_rel_path(tree, milestone) -> str:
    """Build milestone path relative to data dir (without the prefix)."""
    phase = tree.find_phase(milestone.phase_id) if milestone.phase_id else None
    if phase:
        return _join_path(phase.path, milestone.path)
    return milestone.path


def format_milestone_path(tree, milestone) -> str:
    """Format a milestone path for display."""
    return _join_path(get_data_dir_name(), _milestone_rel_path(tree, milestone))


def _epic_rel_path(tree, epic) -> str:
    """Build epic path relative to data dir (without the prefix)."""
    milestone = tree.find_milestone(epic.milestone_id) if epic.milestone_id else None
    if milestone:
        return _join_path(_milestone_rel_path(tree, milestone), epic.path)
    return epic.path


def format_epic_path(tree, epic) -> str:
    """Format an epic path for display."""
    return _join_path(get_data_dir_name(), _epic_rel_path(tree, epic))


def is_bug_id(task_id: str) -> bool:
    """Check if an ID matches the bug ID format (B001, B002, etc.)."""
    import re

    return bool(re.match(r"^B\d+$", task_id))


def is_idea_id(task_id: str) -> bool:
    """Check if an ID matches the idea ID format (I001, I002, etc.)."""
    import re

    return bool(re.match(r"^I\d+$", task_id))


def get_all_tasks(tree) -> List[Task]:
    """Get all tasks from tree as a flat list."""
    tasks = []
    for phase in tree.phases:
        for milestone in phase.milestones:
            for epic in milestone.epics:
                tasks.extend(epic.tasks)
    tasks.extend(getattr(tree, "bugs", []))
    tasks.extend(getattr(tree, "ideas", []))
    return tasks


def task_file_path(task: Task, tasks_root: Optional[Path] = None) -> Path:
    """Resolve a task's .todo file path."""
    if tasks_root is None:
        tasks_root = Path(get_data_dir_name())
    return tasks_root / task.file


def is_task_file_missing(task: Task, tasks_root: Optional[Path] = None) -> bool:
    """Return True when a task's .todo file is missing."""
    return not task_file_path(task, tasks_root).exists()


def find_missing_task_files(tree, tasks_root: Optional[Path] = None) -> List[Task]:
    """Return tasks referenced in the index whose .todo files are missing."""
    return [
        task for task in get_all_tasks(tree) if is_task_file_missing(task, tasks_root)
    ]


def find_tasks_blocked_by(tree, task_id: str) -> List[Task]:
    """Find all tasks that are directly blocked by a given task."""
    blocked = []

    for phase in tree.phases:
        for milestone in phase.milestones:
            for epic in milestone.epics:
                for i, task in enumerate(epic.tasks):
                    # Check explicit dependencies
                    if task_id in task.depends_on:
                        blocked.append(task)
                        continue

                    # Check implicit dependency (next task in epic with no explicit deps)
                    if not task.depends_on and i > 0:
                        prev_task = epic.tasks[i - 1]
                        if prev_task.id == task_id:
                            blocked.append(task)

    # Also check auxiliary tasks for explicit dependencies
    for bug in getattr(tree, "bugs", []):
        if task_id in bug.depends_on:
            blocked.append(bug)

    for idea in getattr(tree, "ideas", []):
        if task_id in idea.depends_on:
            blocked.append(idea)

    return blocked


def find_newly_unblocked(tree, calc, completed_task_id: str) -> List[Task]:
    """Find tasks that are newly unblocked after completing a task."""
    # Get tasks that directly depend on the completed task
    blocked_by_this = find_tasks_blocked_by(tree, completed_task_id)

    # Filter to only pending tasks that now have all dependencies satisfied
    newly_unblocked = []
    for task in blocked_by_this:
        if task.status == Status.PENDING and not task.claimed_by:
            # Check if this task is now unblocked
            if calc._check_dependencies(task):
                newly_unblocked.append(task)

    return newly_unblocked


# ============================================================================
# Completion Notifications
# ============================================================================


def print_completion_notices(console, tree, task) -> Dict[str, bool]:
    """Print epic/milestone completion notices with NEXT_STEPS.

    Call this after completing a task to check if the epic or milestone
    is now complete and display appropriate review instructions.

    Args:
        console: Rich Console instance for output
        tree: TaskTree instance
        task: The completed Task instance

    Returns:
        Dict with keys 'epic_completed' and 'milestone_completed' (both bool)
    """
    result = {"epic_completed": False, "milestone_completed": False}

    epic = tree.find_epic(task.epic_id)
    if epic and epic.is_complete:
        result["epic_completed"] = True
        console.print("═" * 60)
        console.print(f"  [bold yellow]🔍 EPIC COMPLETE:[/] {epic.name}")
        console.print(f"  [bold]Epic ID:[/] {epic.id}")
        console.print(f"  [bold]Path:[/] {format_epic_path(tree, epic)}")
        console.print("═" * 60)
        console.print()
        console.print("[bold cyan]NEXT_STEPS:[/] Review the completed epic")
        console.print("  1. Spawn a review subagent to verify implementation")
        console.print(
            f"  2. Check acceptance criteria in {format_epic_path(tree, epic)} are met"
        )
        console.print("  3. Ensure integration between all tasks in the epic")
        console.print("  4. Run `mix lint` and fix any warnings")
        console.print()

        # Check milestone completion
        milestone = tree.find_milestone(task.milestone_id)
        if milestone and milestone.is_complete:
            result["milestone_completed"] = True
            console.print("═" * 60)
            console.print(f"  [bold green]🎯 MILESTONE COMPLETE:[/] {milestone.name}")
            console.print(f"  [bold]Milestone ID:[/] {milestone.id}")
            console.print(f"  [bold]Path:[/] {format_milestone_path(tree, milestone)}")
            console.print("═" * 60)
            console.print()
            console.print("[bold cyan]NEXT_STEPS:[/] Review the completed milestone")
            console.print(
                "  1. Spawn a comprehensive review subagent (in addition to the epic review agent)"
            )
            console.print("  2. Verify all epics integrate correctly together")
            console.print("  3. Run full test suite: `mix test`")
            console.print("  4. Run `mix lint` and fix any warnings")
            console.print()

    return result
