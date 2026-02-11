"""CLI commands for task management."""

import click
import json
import yaml
from pathlib import Path
from builtins import next as builtin_next
from rich.console import Console

from .models import Status, TaskPath
from .loader import TaskLoader
from .critical_path import CriticalPathCalculator
from .time_utils import utc_now, to_utc
from .status import (
    claim_task,
    complete_task,
    update_status,
    StatusError,
    check_stale_claims,
)
from .helpers import (
    get_current_task_id,
    set_current_task,
    get_all_current_tasks,
    set_multi_task_context,
    get_all_tasks,
    task_file_path,
    is_task_file_missing,
    find_missing_task_files,
    find_newly_unblocked,
    make_progress_bar,
    print_completion_notices,
    format_phase_path,
    format_milestone_path,
    format_epic_path,
)


console = Console()

AGENTS_SNIPPETS = {
    "short": """# AGENTS.md (Short)

## Task Workflow
- Use `tasks grab` to claim work, then `tasks done` or `tasks cycle`.
- Prefer critical-path work, then `critical > high > medium > low` priority.
- If blocked, run `tasks blocked --reason "<why>" --no-grab` and handoff quickly.
- Keep each change scoped to one task; update status as soon as state changes.
- Before done: run targeted tests for changed code.
- For more see `tasks --help`.
""",
    "medium": """# AGENTS.md (Medium)

## Defaults
- Claim with `tasks grab` (or `tasks grab --single` for focused work).
- CLI selection order is: critical-path first, then task priority.
- Use `tasks work <id>` when switching context; use `tasks show` to review details.

## Execution Loop
1. `tasks grab` and read the task file.
2. Implement in small commits and keep diff narrow.
3. Run focused tests early, then broader tests before completion.
4. Finish with `tasks done` (or `tasks cycle` to continue immediately).

## Coordination
- Use `tasks handoff --to <agent> --notes "<context>"` for ownership transfer.
- Use `tasks blockers --suggest` and `tasks why <task-id>` when sequencing is unclear.
- Run `tasks dash` and `tasks report progress` for health checks.
""",
    "long": """# AGENTS.md (Long)

## Operating Model
- Default command: `tasks`. Use local `.tasks/` state as source of truth.
- Selection strategy: critical-path first, then `critical > high > medium > low`.
- Treat task files as contracts: requirements + acceptance criteria drive scope.

## Standard Loop
1. Claim:
   - `tasks grab` for normal flow.
   - `tasks grab --single` for strict focus.
2. Inspect:
   - `tasks show` for current task details.
   - `tasks why <task-id>` to inspect dependency readiness.
3. Implement:
   - Keep commits and PRs small and task-scoped.
   - Add or update tests with each behavior change.
4. Validate:
   - Run targeted tests first, full suite before completion if feasible.
5. Resolve:
   - `tasks done` when complete.
   - `tasks cycle` when moving directly to next claim.

## Multi-Agent Defaults
- Use handoff when parallelism helps:
  - `tasks handoff --to <agent> --notes "<state + next steps>"`
- If blocked:
  - `tasks blocked --reason "<root cause>" --no-grab`
  - Unblock owner or dependency explicitly.
- For triage:
  - `tasks blockers --deep --suggest`
  - `tasks search "<pattern>" --status=pending`

## Quality Gates
- Ensure behavior is covered by tests.
- Prefer deterministic, fast tests.
- Do not mark done with unresolved blockers, hidden assumptions, or failing tests.
""",
}


def load_config():
    """Load configuration."""
    defaults = {
        "agent": {"default_agent": "cli-user", "auto_claim_after_done": False},
        "session": {"heartbeat_timeout_minutes": 15},
        "stale_claim": {"warn_after_minutes": 60, "error_after_minutes": 120},
        "complexity_multipliers": {
            "low": 1.0,
            "medium": 1.25,
            "high": 1.5,
            "critical": 2.0,
        },
        "display": {"progress_bar_style": "unicode"},
        "timeline": {"default_weeks": 8, "hours_per_week": 40},
    }

    config_path = Path(".tasks/config.yaml")
    if config_path.exists():
        with open(config_path) as f:
            loaded = yaml.safe_load(f) or {}
        # Merge loaded config with defaults
        for key, value in defaults.items():
            if key not in loaded:
                loaded[key] = value
            elif isinstance(value, dict):
                for k, v in value.items():
                    if k not in loaded[key]:
                        loaded[key][k] = v
        return loaded

    return defaults


def get_default_agent():
    """Get the default agent ID from config."""
    config = load_config()
    return config.get("agent", {}).get("default_agent", "cli-user")


def _warn_missing_task_file(task) -> bool:
    """Warn when a task references a missing .todo file."""
    if not task or not is_task_file_missing(task):
        return False

    console.print(
        f"[yellow]Warning:[/] Task file missing for {task.id}: .tasks/{task.file}"
    )
    return True


def _warn_missing_task_files(tree, limit: int = 5) -> int:
    """Warn when list output includes tasks with missing files."""
    missing_tasks = find_missing_task_files(tree)
    if not missing_tasks:
        return 0

    console.print(
        f"[yellow]Warning:[/] {len(missing_tasks)} task file(s) referenced in index are missing."
    )
    for task in missing_tasks[:limit]:
        console.print(f"  - {task.id}: .tasks/{task.file}")
    if len(missing_tasks) > limit:
        console.print(f"  ... and {len(missing_tasks) - limit} more")
    console.print()
    return len(missing_tasks)


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """Task Management CLI."""
    pass


# ============================================================================
# List Command
# ============================================================================


@cli.command()
@click.option("--status", help="Filter by status (comma-separated)")
@click.option("--phase", help="Filter by phase ID")
@click.option("--milestone", help="Filter by milestone ID (e.g., M1, M2)")
@click.option("--epic", help="Filter by epic ID")
@click.option("--critical", is_flag=True, help="Show only critical path tasks")
@click.option("--available", is_flag=True, help="Show all unblocked/available tasks")
@click.option(
    "--complexity",
    type=click.Choice(["low", "medium", "high", "critical"]),
    help="Filter by complexity level",
)
@click.option(
    "--priority",
    type=click.Choice(["low", "medium", "high", "critical"]),
    help="Filter by priority level",
)
@click.option("--progress", "show_progress", is_flag=True, help="Show progress bars")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
@click.option("--all", "show_all", is_flag=True, help="Show all milestones (no limit)")
@click.option("--unfinished", is_flag=True, help="Show only unfinished items")
def list(
    status,
    phase,
    milestone,
    epic,
    critical,
    available,
    complexity,
    priority,
    show_progress,
    output_json,
    show_all,
    unfinished,
):
    """List tasks with filtering options."""
    try:
        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, next_available = calc.calculate()
        tree.critical_path = critical_path
        tree.next_available = next_available
        if not output_json:
            _warn_missing_task_files(tree)

        # Handle --progress flag
        if show_progress:
            _list_with_progress(tree, critical_path, complexity, priority, unfinished)
            return

        # Handle --milestone filter
        if milestone:
            m = tree.find_milestone(milestone)
            if not m:
                console.print(f"[red]Error:[/] Milestone not found: {milestone}")
                raise click.Abort()
            _show_milestone_detail(tree, m, critical_path, complexity, priority)
            return

        # Handle --available flag
        if available:
            all_available = calc.find_all_available()
            _list_available(
                tree, all_available, critical_path, output_json, complexity, priority
            )
            return

        # Default list view
        if output_json:
            _list_json(tree, critical_path, next_available, complexity, priority, show_all, unfinished)
        else:
            _list_text(tree, critical_path, complexity, priority, show_all, unfinished)

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def _task_matches_filters(task, complexity=None, priority=None):
    """Return True when a task matches complexity/priority filters."""
    if complexity and task.complexity.value != complexity:
        return False
    if priority and task.priority.value != priority:
        return False
    return True


def _is_unfinished(status):
    """Check if a status represents unfinished work."""
    return status not in (Status.DONE, Status.CANCELLED, Status.REJECTED)


def _filter_unfinished_tasks(tasks):
    """Filter tasks to only unfinished ones."""
    return [t for t in tasks if _is_unfinished(t.status)]


def _has_unfinished_tasks(epic):
    """Check if epic has any unfinished tasks."""
    return any(_is_unfinished(t.status) for t in epic.tasks)


def _has_unfinished_epics(milestone):
    """Check if milestone has any unfinished epics."""
    return any(_has_unfinished_tasks(e) for e in milestone.epics)


def _has_unfinished_milestones(phase):
    """Check if phase has any unfinished milestones."""
    return any(_has_unfinished_epics(m) for m in phase.milestones)


def _calculate_task_stats(tasks):
    """Calculate task statistics."""
    return {
        "done": sum(1 for t in tasks if t.status == Status.DONE),
        "total": len(tasks),
    }


def _get_epic_stats(epic):
    """Get statistics for an epic."""
    return _calculate_task_stats(epic.tasks)


def _get_milestone_stats(milestone):
    """Get statistics for a milestone."""
    tasks = [t for e in milestone.epics for t in e.tasks]
    return _calculate_task_stats(tasks)


def _get_phase_stats(phase):
    """Get statistics for a phase."""
    tasks = [t for m in phase.milestones for e in m.epics for t in e.tasks]
    return _calculate_task_stats(tasks)


def _get_status_icon(status):
    """Get a colored status icon for display."""
    if status == Status.DONE:
        return "[green][✓][/]"
    elif status == Status.IN_PROGRESS:
        return "[yellow][→][/]"
    elif status == Status.PENDING:
        return "[ ]"
    elif status == Status.BLOCKED:
        return "[red][✗][/]"
    else:  # CANCELLED or REJECTED
        return "[dim][X][/]"


def _show_filter_banner(complexity=None, priority=None):
    """Display active list filters."""
    parts = []
    if complexity:
        parts.append(f"complexity: {complexity}")
    if priority:
        parts.append(f"priority: {priority}")
    if parts:
        console.print(f"[dim]Filtering by {'; '.join(parts)}[/]\n")


def _list_with_progress(tree, critical_path, complexity=None, priority=None, unfinished=False):
    """Show list with progress bars."""
    console.print("\n[bold cyan]Project Progress[/]\n")
    _show_filter_banner(complexity, priority)

    phases_to_show = tree.phases
    if unfinished:
        phases_to_show = [p for p in tree.phases if _has_unfinished_milestones(p)]

    for phase in phases_to_show:
        # Filter tasks when filters are specified
        if complexity or priority:
            all_tasks = []
            for m in phase.milestones:
                for e in m.epics:
                    all_tasks.extend(
                        [
                            t
                            for t in e.tasks
                            if _task_matches_filters(t, complexity, priority)
                        ]
                    )

            if not all_tasks:
                continue

            # Recalculate stats for filtered tasks
            done = sum(1 for t in all_tasks if t.status.value == "done")
            total = len(all_tasks)
            in_progress = sum(1 for t in all_tasks if t.status.value == "in_progress")
            blocked = sum(1 for t in all_tasks if t.status.value == "blocked")
        else:
            p_stats = phase.stats
            done = p_stats["done"]
            total = p_stats["total_tasks"]
            in_progress = p_stats["in_progress"]
            blocked = p_stats["blocked"]

        pct = (done / total * 100) if total > 0 else 0

        bar = make_progress_bar(done, total)

        if pct == 100:
            indicator = "[green]✓[/]"
        elif in_progress > 0:
            indicator = "[yellow]→[/]"
        elif blocked > 0:
            indicator = "[red]🔒[/]"
        else:
            indicator = "[ ]"

        console.print(f"{indicator} [bold]{phase.name}[/]")
        console.print(f"    {bar} {pct:5.1f}% ({done}/{total})")

        # Show milestones if phase is in progress
        if 0 < pct < 100:
            for m in phase.milestones:
                # Filter milestone tasks when filters are specified
                if complexity or priority:
                    milestone_tasks = []
                    for e in m.epics:
                        milestone_tasks.extend(
                            [
                                t
                                for t in e.tasks
                                if _task_matches_filters(t, complexity, priority)
                            ]
                        )

                    if not milestone_tasks:
                        continue

                    m_done = sum(1 for t in milestone_tasks if t.status.value == "done")
                    m_total = len(milestone_tasks)
                    m_in_progress = sum(
                        1 for t in milestone_tasks if t.status.value == "in_progress"
                    )
                else:
                    m_stats = m.stats
                    m_done = m_stats["done"]
                    m_total = m_stats["total_tasks"]
                    m_in_progress = m_stats["in_progress"]

                m_pct = (m_done / m_total * 100) if m_total > 0 else 0

                m_bar = make_progress_bar(m_done, m_total, width=15)

                if m_pct == 100:
                    m_ind = "[green]✓[/]"
                elif m_in_progress > 0:
                    m_ind = "[yellow]→[/]"
                else:
                    m_ind = "○"

                console.print(f"    {m_ind} {m.id}: {m_bar} {m_pct:4.0f}%")

        console.print()


def _show_milestone_detail(tree, m, critical_path, complexity=None, priority=None):
    """Show milestone detail view."""
    console.print(f"\n[bold cyan]Milestone:[/] {m.id} - {m.name}\n")
    console.print(f"[bold]Status:[/] {m.status.value}")
    console.print(f"[bold]Estimate:[/] {m.estimate_hours} hours")
    console.print(f"[bold]Complexity:[/] {m.complexity.value}")

    _show_filter_banner(complexity, priority)

    # Calculate stats with optional filters
    if complexity or priority:
        all_tasks = []
        for e in m.epics:
            all_tasks.extend(
                [t for t in e.tasks if _task_matches_filters(t, complexity, priority)]
            )

        done = sum(1 for t in all_tasks if t.status.value == "done")
        total = len(all_tasks)
        in_progress = sum(1 for t in all_tasks if t.status.value == "in_progress")
        blocked = sum(1 for t in all_tasks if t.status.value == "blocked")
    else:
        m_stats = m.stats
        done = m_stats["done"]
        total = m_stats["total_tasks"]
        in_progress = m_stats["in_progress"]
        blocked = m_stats["blocked"]

    console.print(f"[bold]Progress:[/] {done}/{total} tasks done")
    if in_progress:
        console.print(f"[bold]In Progress:[/] {in_progress} tasks")
    if blocked:
        console.print(f"[bold yellow]Blocked:[/] {blocked} tasks")

    console.print(f"\n[bold]Epics:[/]")
    for e in m.epics:
        # Filter tasks when filters are specified
        if complexity or priority:
            filtered_tasks = [
                t for t in e.tasks if _task_matches_filters(t, complexity, priority)
            ]
            if not filtered_tasks:
                continue
            e_done = sum(1 for t in filtered_tasks if t.status.value == "done")
            e_total = len(filtered_tasks)
        else:
            filtered_tasks = e.tasks
            e_stats = e.stats
            e_done = e_stats["done"]
            e_total = e_stats["total"]

        status_icon = "✓" if e_done == e_total else "○"
        console.print(
            f"\n  [{status_icon}] [bold]{e.name}[/] ({e_done}/{e_total} tasks)"
        )
        console.print(f"      Path: {format_epic_path(tree, e)}")

        for t in filtered_tasks:
            status_icons = {
                "done": "[green]✓[/]",
                "in_progress": "[yellow]→[/]",
                "pending": "[ ]",
                "blocked": "[red]✗[/]",
            }
            icon = status_icons.get(t.status.value, "?")
            console.print(f"      {icon} {t.id}: {t.title} ({t.estimate_hours}h)")

    console.print()


def _list_available(
    tree, all_available, critical_path, output_json, complexity=None, priority=None
):
    """List available tasks with optional complexity/priority filtering."""
    if complexity or priority:
        filtered_available = []
        for task_id in all_available:
            t = tree.find_task(task_id)
            if t and _task_matches_filters(t, complexity, priority):
                filtered_available.append(task_id)
        all_available = filtered_available

    if not all_available:
        if complexity or priority:
            filters = []
            if complexity:
                filters.append(f"complexity={complexity}")
            if priority:
                filters.append(f"priority={priority}")
            console.print(
                f"[yellow]No available tasks found with filters: {', '.join(filters)}[/]"
            )
        else:
            console.print("[yellow]No available tasks found.[/]")
        return

    console.print(f"\n[bold green]Available Tasks ({len(all_available)}):[/]\n")
    _show_filter_banner(complexity, priority)

    if output_json:
        output = []
        for task_id in all_available:
            t = tree.find_task(task_id)
            if t:
                output.append(
                    {
                        "id": t.id,
                        "title": t.title,
                        "estimate_hours": t.estimate_hours,
                        "complexity": t.complexity.value,
                        "priority": t.priority.value,
                        "on_critical_path": task_id in critical_path,
                    }
                )
        click.echo(json.dumps(output, indent=2))
    else:
        by_phase = {}
        for task_id in all_available:
            t = tree.find_task(task_id)
            if t:
                task_path = TaskPath.parse(task_id)
                if task_path.phase not in by_phase:
                    by_phase[task_path.phase] = []
                by_phase[task_path.phase].append(t)

        for phase_id, tasks in sorted(by_phase.items()):
            p = tree.find_phase(phase_id)
            if p:
                console.print(f"\n[bold cyan]{p.name}[/] ({len(tasks)} available)")
                for t in tasks:
                    crit_marker = "[yellow]★[/] " if t.id in critical_path else "  "
                    console.print(f"  {crit_marker}[bold]{t.id}:[/] {t.title}")
                    console.print(f"     {t.estimate_hours}h, {t.complexity.value}")

        console.print(f"\n[dim]★ = On critical path[/]\n")


def _list_json(tree, critical_path, next_available, complexity=None, priority=None, show_all=False, unfinished=False):
    """Output list as JSON."""
    phases_to_show = tree.phases
    if unfinished:
        phases_to_show = [p for p in tree.phases if _has_unfinished_milestones(p)]

    output = {
        "critical_path": critical_path,
        "next_available": next_available,
        "stats": tree.stats,
        "phases": [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status.value,
                "stats": _get_phase_stats(p),
                "milestones": [
                    {
                        "id": m.id,
                        "name": m.name,
                        "status": m.status.value,
                        "stats": _get_milestone_stats(m),
                    }
                    for m in (p.milestones if not unfinished else [m for m in p.milestones if _has_unfinished_epics(m)])
                ],
            }
            for p in phases_to_show
        ],
    }

    # Add filter metadata and filtered stats when filters are specified
    if complexity or priority:
        filtered_stats = {
            "total_tasks": 0,
            "done": 0,
            "in_progress": 0,
            "blocked": 0,
            "pending": 0,
        }

        for p in tree.phases:
            for m in p.milestones:
                for e in m.epics:
                    for t in e.tasks:
                        if _task_matches_filters(t, complexity, priority):
                            if unfinished and not _is_unfinished(t.status):
                                continue
                            filtered_stats["total_tasks"] += 1
                            if t.status.value == "done":
                                filtered_stats["done"] += 1
                            elif t.status.value == "in_progress":
                                filtered_stats["in_progress"] += 1
                            elif t.status.value == "blocked":
                                filtered_stats["blocked"] += 1
                            elif t.status.value == "pending":
                                filtered_stats["pending"] += 1

        output["filter"] = {}
        if complexity:
            output["filter"]["complexity"] = complexity
        if priority:
            output["filter"]["priority"] = priority
        output["filtered_stats"] = filtered_stats

    click.echo(json.dumps(output, indent=2))


def _list_text(tree, critical_path, complexity=None, priority=None, show_all=False, unfinished=False):
    """Output list as text."""
    console.print(
        f"\n[bold cyan]Critical Path:[/] {' → '.join(critical_path[:10])}"
        f"{'...' if len(critical_path) > 10 else ''}\n"
    )

    _show_filter_banner(complexity, priority)

    phases_to_show = tree.phases
    if unfinished:
        phases_to_show = [p for p in tree.phases if _has_unfinished_milestones(p)]

    for p in phases_to_show:
        # Calculate stats with optional filters
        if complexity or priority:
            all_tasks = []
            for m in p.milestones:
                for e in m.epics:
                    all_tasks.extend(
                        [
                            t
                            for t in e.tasks
                            if _task_matches_filters(t, complexity, priority)
                        ]
                    )

            if not all_tasks:
                continue

            done = sum(1 for t in all_tasks if t.status.value == "done")
            total = len(all_tasks)
            in_progress = sum(1 for t in all_tasks if t.status.value == "in_progress")
        else:
            stats = p.stats
            done = stats["done"]
            total = stats["total_tasks"]
            in_progress = stats["in_progress"]

        status_display = f"{done}/{total} tasks done"
        if in_progress:
            status_display += f", {in_progress} in progress"

        console.print(f"[bold]{p.name}[/] ({status_display})")

        # Show up to 5 milestones (or all with --all)
        milestones_to_show = []
        milestones_list = p.milestones
        if unfinished:
            milestones_list = [m for m in p.milestones if _has_unfinished_epics(m)]

        for m in milestones_list:
            if complexity or priority:
                # Check if milestone has any tasks matching active filters
                milestone_tasks = []
                for e in m.epics:
                    milestone_tasks.extend(
                        [
                            t
                            for t in e.tasks
                            if _task_matches_filters(t, complexity, priority)
                        ]
                    )

                if not milestone_tasks:
                    continue

                m_done = sum(1 for t in milestone_tasks if t.status.value == "done")
                m_total = len(milestone_tasks)
            else:
                m_stats = m.stats
                m_done = m_stats["done"]
                m_total = m_stats["total_tasks"]

            milestones_to_show.append((m, m_done, m_total))

        milestone_limit = len(milestones_to_show) if show_all else 5
        for i, (m, m_done, m_total) in enumerate(milestones_to_show[:milestone_limit]):
            is_last = i == min(milestone_limit, len(milestones_to_show)) - 1 and len(milestones_to_show) <= milestone_limit
            prefix = "└──" if is_last else "├──"
            console.print(f"  {prefix} {m.name} ({m_done}/{m_total} tasks done)")

        if len(milestones_to_show) > milestone_limit:
            console.print(
                f"  └── ... and {len(milestones_to_show) - milestone_limit} more milestone{'s' if len(milestones_to_show) - milestone_limit > 1 else ''}\n"
            )
        else:
            console.print()


# ============================================================================
# Tree Command
# ============================================================================


def _render_task(task, is_last, prefix, critical_path, show_details):
    """Render a task line in the tree."""
    icon = _get_status_icon(task.status)
    branch = "└── " if is_last else "├── "
    line = f"{prefix}{branch}{icon} {task.id}: {task.title}"

    if show_details:
        details = []
        if task.estimate_hours > 0:
            details.append(f"({task.estimate_hours}h)")
        if task.status:
            details.append(f"[{task.status.value}]")
        if task.claimed_by:
            details.append(f"@{task.claimed_by}")
        if task.depends_on:
            details.append(f"depends:{','.join(task.depends_on)}")
        if task.id in critical_path:
            details.append("★")

        if details:
            line += f" {' '.join(details)}"

    return line


def _render_epic(epic, is_last, prefix, critical_path, unfinished, show_details, max_depth, current_depth):
    """Render an epic and its tasks in the tree."""
    stats = _get_epic_stats(epic)
    branch = "└── " if is_last else "├── "
    continuation = "    " if is_last else "│   "
    lines = []

    lines.append(f"{prefix}{branch}{epic.name} ({stats['done']}/{stats['total']}) [{epic.status.value}]")

    if current_depth >= max_depth:
        return lines

    tasks_to_show = _filter_unfinished_tasks(epic.tasks) if unfinished else epic.tasks
    new_prefix = prefix + continuation

    for i, t in enumerate(tasks_to_show):
        task_is_last = i == len(tasks_to_show) - 1
        lines.append(_render_task(t, task_is_last, new_prefix, critical_path, show_details))

    return lines


def _render_milestone(milestone, is_last, prefix, critical_path, unfinished, show_details, max_depth, current_depth):
    """Render a milestone and its epics in the tree."""
    stats = _get_milestone_stats(milestone)
    branch = "└── " if is_last else "├── "
    continuation = "    " if is_last else "│   "
    lines = []

    lines.append(f"{prefix}{branch}{milestone.name} ({stats['done']}/{stats['total']}) [{milestone.status.value}]")

    if current_depth >= max_depth:
        return lines

    epics_to_show = milestone.epics
    if unfinished:
        epics_to_show = [e for e in milestone.epics if _has_unfinished_tasks(e)]

    new_prefix = prefix + continuation

    for i, e in enumerate(epics_to_show):
        epic_is_last = i == len(epics_to_show) - 1
        lines.extend(_render_epic(e, epic_is_last, new_prefix, critical_path, unfinished, show_details, max_depth, current_depth + 1))

    return lines


def _render_phase(phase, is_last, prefix, critical_path, unfinished, show_details, max_depth, current_depth):
    """Render a phase and its milestones in the tree."""
    stats = _get_phase_stats(phase)
    branch = "└── " if is_last else "├── "
    continuation = "    " if is_last else "│   "
    lines = []

    lines.append(f"{prefix}{branch}[bold]{phase.name}[/] ({stats['done']}/{stats['total']}) [{phase.status.value}]")

    if current_depth >= max_depth:
        return lines

    milestones_to_show = phase.milestones
    if unfinished:
        milestones_to_show = [m for m in phase.milestones if _has_unfinished_epics(m)]

    new_prefix = prefix + continuation

    for i, m in enumerate(milestones_to_show):
        milestone_is_last = i == len(milestones_to_show) - 1
        lines.extend(_render_milestone(m, milestone_is_last, new_prefix, critical_path, unfinished, show_details, max_depth, current_depth + 1))

    return lines


@cli.command()
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
@click.option("--unfinished", is_flag=True, help="Show only unfinished items")
@click.option("--details", is_flag=True, help="Show task metadata (estimates, agents, dependencies)")
@click.option("--depth", type=int, default=4, help="Limit tree expansion depth (1=phases, 2=milestones, 3=epics, 4=tasks)")
def tree(output_json, unfinished, details, depth):
    """Display full hierarchical tree of phases, milestones, epics, and tasks."""
    try:
        loader = TaskLoader()
        tree_data = loader.load()
        config = load_config()

        calc = CriticalPathCalculator(tree_data, config["complexity_multipliers"])
        critical_path, next_available = calc.calculate()
        tree_data.critical_path = critical_path
        tree_data.next_available = next_available

        if output_json:
            phases_to_show = tree_data.phases
            if unfinished:
                phases_to_show = [p for p in tree_data.phases if _has_unfinished_milestones(p)]

            output = {
                "critical_path": critical_path,
                "next_available": next_available,
                "max_depth": depth,
                "show_details": details,
                "unfinished_only": unfinished,
                "phases": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "status": p.status.value,
                        "stats": _get_phase_stats(p),
                        "milestones": [
                            {
                                "id": m.id,
                                "name": m.name,
                                "status": m.status.value,
                                "stats": _get_milestone_stats(m),
                                "epics": [
                                    {
                                        "id": e.id,
                                        "name": e.name,
                                        "status": e.status.value,
                                        "stats": _get_epic_stats(e),
                                        "tasks": [
                                            {
                                                "id": t.id,
                                                "title": t.title,
                                                "status": t.status.value,
                                                "estimate_hours": t.estimate_hours,
                                                "claimed_by": t.claimed_by,
                                                "depends_on": t.depends_on,
                                                "on_critical_path": t.id in critical_path,
                                            }
                                            for t in (_filter_unfinished_tasks(e.tasks) if unfinished else e.tasks)
                                        ],
                                    }
                                    for e in m.epics
                                    if not unfinished or _has_unfinished_tasks(e)
                                ],
                            }
                            for m in p.milestones
                            if not unfinished or _has_unfinished_epics(m)
                        ],
                    }
                    for p in phases_to_show
                ],
            }
            click.echo(json.dumps(output, indent=2))
            return

        # Text output
        phases_to_show = tree_data.phases
        if unfinished:
            phases_to_show = [p for p in tree_data.phases if _has_unfinished_milestones(p)]

        for i, p in enumerate(phases_to_show):
            is_last = i == len(phases_to_show) - 1
            lines = _render_phase(p, is_last, "", critical_path, unfinished, details, depth, 1)
            for line in lines:
                console.print(line)

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


# ============================================================================
# Show Command
# ============================================================================


@cli.command()
@click.argument("path_ids", nargs=-1)
def show(path_ids):
    """Show detailed information for phases, milestones, epics, or tasks.

    PATH_IDS can be one or more IDs like P1, P1.M01, P1.M01.E1, P1.M01.E1.T001.
    If no PATH_ID is provided, shows the current working task.

    Examples:
        ./tasks.py show P1.M2
        ./tasks.py show P1.M2 P4.M1.E2
        ./tasks.py show              # Shows current working task
    """
    try:
        # Use current task from context if no path_ids provided
        if not path_ids:
            current = get_current_task_id()
            if not current:
                console.print(
                    "[dim]No task specified and no current working task set.[/]"
                )
                console.print(
                    "[dim]Use './tasks.py work <task-id>' to set a working task.[/]"
                )
                return
            path_ids = (current,)

        loader = TaskLoader()
        tree = loader.load()

        for i, path_id in enumerate(path_ids):
            if i > 0:
                console.print("\n" + "═" * 60 + "\n")

            task_path = TaskPath.parse(path_id)

            if task_path.is_phase:
                _show_phase(tree, path_id)
            elif task_path.is_milestone:
                _show_milestone(tree, path_id)
            elif task_path.is_epic:
                _show_epic(tree, path_id)
            else:
                _show_task(tree, path_id)

    except ValueError as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def _show_phase(tree, phase_id):
    """Display phase details."""
    phase = tree.find_phase(phase_id)
    if not phase:
        console.print(f"[red]Error:[/] Phase not found: {phase_id}")
        raise click.Abort()

    stats = phase.stats
    console.print(f"\n[bold cyan]Phase:[/] {phase.id} - {phase.name}\n")
    console.print(f"[bold]Path:[/] {format_phase_path(phase)}")
    console.print(f"[bold]Status:[/] {phase.status.value}")
    console.print(f"[bold]Weeks:[/] {phase.weeks}")
    console.print(f"[bold]Estimate:[/] {phase.estimate_hours} hours")
    console.print(f"[bold]Priority:[/] {phase.priority.value}")
    console.print(
        f"\n[bold]Progress:[/] {stats['done']}/{stats['total_tasks']} tasks done"
    )

    console.print(f"\n[bold]Milestones ({len(phase.milestones)}):[/]")
    for m in phase.milestones:
        m_stats = m.stats
        status_icon = "[green]✓[/]" if m.is_complete else "○"
        console.print(f"\n  {status_icon} [bold]{m.id}[/] - {m.name}")
        console.print(f"      {m_stats['done']}/{m_stats['total_tasks']} tasks")
        console.print(f"      [dim]{format_milestone_path(tree, m)}[/]")
    console.print()


def _show_milestone(tree, milestone_id):
    """Display milestone details."""
    milestone = tree.find_milestone(milestone_id)
    if not milestone:
        console.print(f"[red]Error:[/] Milestone not found: {milestone_id}")
        raise click.Abort()

    stats = milestone.stats
    console.print(f"\n[bold cyan]Milestone:[/] {milestone.id} - {milestone.name}\n")
    console.print(f"[bold]Path:[/] {format_milestone_path(tree, milestone)}")
    console.print(f"[bold]Status:[/] {milestone.status.value}")
    console.print(f"[bold]Estimate:[/] {milestone.estimate_hours} hours")
    console.print(
        f"\n[bold]Progress:[/] {stats['done']}/{stats['total_tasks']} tasks done"
    )

    console.print(f"\n[bold]Epics ({len(milestone.epics)}):[/]")
    for e in milestone.epics:
        e_stats = e.stats
        status_icon = "[green]✓[/]" if e.is_complete else "○"
        console.print(f"\n  {status_icon} [bold]{e.id}[/] - {e.name}")
        console.print(f"      {e_stats['done']}/{e_stats['total']} tasks")
        console.print(f"      [dim]{format_epic_path(tree, e)}[/]")
    console.print()


def _show_epic(tree, epic_id):
    """Display epic details."""
    epic = tree.find_epic(epic_id)
    if not epic:
        console.print(f"[red]Error:[/] Epic not found: {epic_id}")
        raise click.Abort()

    stats = epic.stats
    console.print(f"\n[bold cyan]Epic:[/] {epic.id} - {epic.name}\n")
    console.print(f"[bold]Path:[/] {format_epic_path(tree, epic)}")
    console.print(f"[bold]Status:[/] {epic.status.value}")
    console.print(f"[bold]Estimate:[/] {epic.estimate_hours} hours")
    console.print(f"\n[bold]Progress:[/] {stats['done']}/{stats['total']} tasks done")

    console.print(f"\n[bold]Tasks ({len(epic.tasks)}):[/]")
    for t in epic.tasks:
        status_icons = {
            "done": "[green]✓[/]",
            "in_progress": "[yellow]→[/]",
            "pending": "[ ]",
            "blocked": "[red]✗[/]",
        }
        icon = status_icons.get(t.status.value, "?")
        console.print(f"\n  {icon} [bold]{t.id}[/]: {t.title}")
        console.print(
            f"      {t.estimate_hours}h, {t.complexity.value}, {t.priority.value}"
        )
        console.print(f"      [dim].tasks/{t.file}[/]")
    console.print()


def _show_task(tree, task_id):
    """Display task details."""
    task = tree.find_task(task_id)
    if not task:
        console.print(f"[red]Error:[/] Task not found: {task_id}")
        raise click.Abort()

    console.print(f"\n[bold]Task:[/] {task.id}")
    console.print(f"[bold]Title:[/] {task.title}")
    console.print(f"[bold]Status:[/] {task.status.value}")
    console.print(f"[bold]Estimate:[/] {task.estimate_hours} hours")
    console.print(f"[bold]Complexity:[/] {task.complexity.value}")
    console.print(f"[bold]Priority:[/] {task.priority.value}")

    if task.claimed_by:
        console.print(f"[bold]Claimed by:[/] {task.claimed_by}")
        if task.claimed_at:
            age = (utc_now() - to_utc(task.claimed_at)).total_seconds() / 3600
            console.print(
                f"[bold]Claimed at:[/] {task.claimed_at.isoformat()} ({age:.1f}h ago)"
            )

    console.print(f"\n[bold]File:[/] .tasks/{task.file}\n")

    task_file = task_file_path(task)
    if task_file.exists():
        with open(task_file) as f:
            content = f.read()
        if "## Requirements" in content:
            req_section = content.split("## Requirements")[1].split("##")[0]
            console.print("[bold]Requirements:[/]")
            console.print(req_section.strip())
    else:
        _warn_missing_task_file(task)


# ============================================================================
# Next Command
# ============================================================================


@cli.command()
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def next(output_json):
    """Get next available task on critical path."""
    try:
        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, next_available = calc.calculate()

        if not next_available:
            console.print("[yellow]No available tasks found.[/]\n")
            _show_blocking_tasks(tree)
            return

        task = tree.find_task(next_available)

        if output_json:
            output = {
                "id": task.id,
                "title": task.title,
                "file": task.file,
                "file_exists": not is_task_file_missing(task),
                "estimate_hours": task.estimate_hours,
                "complexity": task.complexity.value,
            }
            click.echo(json.dumps(output, indent=2))
        else:
            console.print("\n[bold green]Next task on critical path:[/]\n")
            console.print(f"  [bold]ID:[/] {task.id}")
            console.print(f"  [bold]Title:[/] {task.title}")
            console.print(f"  [bold]Estimate:[/] {task.estimate_hours} hours")
            console.print(f"  [bold]File:[/] .tasks/{task.file}\n")
            _warn_missing_task_file(task)
            console.print(
                f"[dim]To claim:[/] './tasks.py grab' or './tasks.py claim {task.id}'\n"
            )

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def _show_blocking_tasks(tree):
    """Show tasks that may be blocking progress."""
    in_progress = [t for t in get_all_tasks(tree) if t.status == Status.IN_PROGRESS]

    if in_progress:
        console.print(f"There are {len(in_progress)} task(s) in progress:\n")
        for t in in_progress[:5]:
            age_str = ""
            if t.claimed_at:
                now = utc_now()
                claimed = to_utc(t.claimed_at)
                age_minutes = (now - claimed).total_seconds() / 60
                age_str = (
                    f" ({int(age_minutes)}m ago)"
                    if age_minutes < 60
                    else f" ({age_minutes / 60:.1f}h ago)"
                )
            console.print(f"  [yellow]{t.id}[/] - {t.claimed_by or 'unknown'}{age_str}")


# ============================================================================
# Claim Command
# ============================================================================


@cli.command()
@click.argument("task_id")
@click.option("--agent", help="Agent session ID (uses config default if not set)")
@click.option("--force", is_flag=True, help="Override existing claim")
@click.option("--no-content", is_flag=True, help="Suppress .todo file contents")
def claim(task_id, agent, force, no_content):
    """Claim a task and mark as in-progress."""
    try:
        # Use config default if agent not specified
        if not agent:
            agent = get_default_agent()
        loader = TaskLoader()
        tree = loader.load()
        task = tree.find_task(task_id)

        if not task:
            console.print(f"[red]Error:[/] Task not found: {task_id}")
            raise click.Abort()

        if _warn_missing_task_file(task):
            console.print(
                f"[red]Error:[/] Cannot claim {task.id} because the task file is missing."
            )
            raise click.Abort()

        claim_task(task, agent, force)
        loader.save_task(task)

        console.print(f"\n[green]✓ Claimed:[/] {task.id} - {task.title}\n")
        console.print(f"  Agent:      {agent}")
        console.print(f"  Claimed at: {task.claimed_at.isoformat()}")
        console.print(f"  Estimate:   {task.estimate_hours} hours\n")

        console.print(f"[bold]File:[/] .tasks/{task.file}\n")

        if not no_content:
            task_file = task_file_path(task)
            if task_file.exists():
                with open(task_file) as f:
                    content = f.read()
                console.print("─" * 50)
                console.print(content)
                console.print("─" * 50 + "\n")
            else:
                _warn_missing_task_file(task)

        console.print(f"[dim]Mark done:[/] './tasks.py done {task.id}'\n")

    except StatusError as e:
        console.print(json.dumps(e.to_dict(), indent=2))
        raise click.Abort()


# ============================================================================
# Done Command (Enhanced with unblocked tasks)
# ============================================================================


@cli.command()
@click.argument("task_id", required=False)
@click.option("--verify", is_flag=True, help="Confirm epic/milestone review")
def done(task_id, verify):
    """Mark task as complete.

    Shows newly unblocked tasks after completion.
    If TASK_ID is not provided, uses the current working task.
    """
    try:
        # Use current task from context if not provided
        if not task_id:
            task_id = get_current_task_id()
            if not task_id:
                console.print(
                    "[red]Error:[/] No task ID provided and no current working task set."
                )
                console.print(
                    "[dim]Use './tasks.py work <task-id>' to set a working task.[/]"
                )
                raise click.Abort()

        loader = TaskLoader()
        tree = loader.load()
        config = load_config()
        task = tree.find_task(task_id)

        if not task:
            console.print(f"[red]Error:[/] Task not found: {task_id}")
            raise click.Abort()

        if task.status == Status.DONE:
            console.print(f"[yellow]⚠ Already done:[/] {task.id} - {task.title}")
            return

        # Calculate duration
        duration = None
        if task.started_at:
            started = to_utc(task.started_at)
            duration = (utc_now() - started).total_seconds() / 60
            task.duration_minutes = duration

        complete_task(task)
        loader.save_task(task)

        console.print(f"\n[green]✓ Completed:[/] {task.id} - {task.title}\n")
        if duration:
            console.print(f"  Duration: {int(duration)} minutes\n")

        # Show unblocked tasks
        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, _ = calc.calculate()
        unblocked = find_newly_unblocked(tree, calc, task_id)

        if unblocked:
            console.print(f"[cyan]Unblocked {len(unblocked)} task(s):[/]")
            for t in unblocked:
                crit = " [yellow]★[/]" if t.id in critical_path else ""
                console.print(f"  → {t.id}: {t.title}{crit}")

            # Suggest next task
            on_crit = [t for t in unblocked if t.id in critical_path]
            if on_crit:
                console.print(
                    f"\n[dim]Claim next:[/] './tasks.py grab' or './tasks.py cycle'\n"
                )

        # Check epic/milestone completion and print review instructions
        _completion_status = print_completion_notices(console, tree, task)

        # Handle multi-task context
        agent = get_default_agent()
        primary, additional = get_all_current_tasks(agent)

        if primary == task_id and additional:
            # Primary completed, promote first additional to primary
            console.print(
                "\n[yellow]Primary task completed. Additional tasks still active.[/]"
            )
            new_primary = additional[0]
            new_additional = additional[1:]

            if new_additional:
                set_multi_task_context(agent, new_primary, new_additional)
            else:
                set_current_task(new_primary, agent)

            console.print(f"[bold]New primary task:[/] {new_primary}\n")
        elif task_id in additional:
            # Additional task completed, remove from list
            new_additional = [t for t in additional if t != task_id]
            if new_additional:
                set_multi_task_context(agent, primary, new_additional)
            else:
                set_current_task(primary, agent)

    except StatusError as e:
        console.print(json.dumps(e.to_dict(), indent=2))
        raise click.Abort()


# ============================================================================
# Update Command
# ============================================================================


@cli.command()
@click.argument("task_id")
@click.argument("new_status")
@click.option("--reason", help="Reason for status change")
def update(task_id, new_status, reason):
    """Update task status."""
    try:
        loader = TaskLoader()
        tree = loader.load()
        task = tree.find_task(task_id)

        if not task:
            console.print(f"[red]Error:[/] Task not found: {task_id}")
            raise click.Abort()

        status = Status(new_status)
        update_status(task, status, reason)
        loader.save_task(task)

        console.print(f"\n[green]✓ Updated:[/] {task.id}\n")
        console.print(f"  Status: {task.status.value}")
        if reason:
            console.print(f"  Reason: {reason}\n")

    except StatusError as e:
        console.print(json.dumps(e.to_dict(), indent=2))
        raise click.Abort()


# ============================================================================
# Sync Command
# ============================================================================


@cli.command()
def sync():
    """Recalculate statistics and critical path."""
    try:
        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, next_available = calc.calculate()
        tree.critical_path = critical_path
        tree.next_available = next_available

        loader.save_stats(tree)

        stats = tree.stats
        console.print("\n[green]✓ Synchronized task tree[/]\n")
        console.print(f"  Total tasks: {stats['total_tasks']}")
        console.print(f"  Done: {stats['done']}")
        console.print(f"  In progress: {stats['in_progress']}")
        console.print(f"  Pending: {stats['pending']}")
        console.print(f"  Blocked: {stats['blocked']}\n")
        console.print(f"  Critical path length: {len(critical_path)} tasks")
        if next_available:
            console.print(f"  Next available: {next_available}\n")

        # Check stale claims
        all_tasks = get_all_tasks(tree)
        stale = check_stale_claims(
            all_tasks,
            config["stale_claim"]["warn_after_minutes"],
            config["stale_claim"]["error_after_minutes"],
        )

        if stale:
            console.print("[yellow]Stale claims:[/]")
            for item in stale:
                console.print(f"  {item['level'].upper()}: {item['message']}")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


# ============================================================================
# Unclaim Stale Command
# ============================================================================


@cli.command("unclaim-stale")
@click.option(
    "--threshold",
    "-t",
    default=None,
    type=int,
    help="Age threshold in minutes (uses error threshold from config if not specified)",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Show what would be unclaimed without making changes",
)
def unclaim_stale(threshold, dry_run):
    """Unclaim stale task claims.

    Finds tasks that have been claimed for longer than the threshold
    and releases them back to pending status.

    Examples:
        ./tasks.py unclaim-stale                    # Use config error threshold
        ./tasks.py unclaim-stale --threshold 120    # Unclaim tasks older than 120 minutes
        ./tasks.py unclaim-stale --dry-run          # Preview without making changes
    """
    try:
        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        # Use error threshold from config if not specified
        if threshold is None:
            threshold = config["stale_claim"]["error_after_minutes"]

        all_tasks = get_all_tasks(tree)
        now = utc_now()

        # Find stale claims
        stale_tasks = []
        for task in all_tasks:
            if task.status == Status.IN_PROGRESS and task.claimed_at:
                age_minutes = (now - to_utc(task.claimed_at)).total_seconds() / 60
                if age_minutes >= threshold:
                    stale_tasks.append(
                        {
                            "task": task,
                            "age_minutes": age_minutes,
                        }
                    )

        if not stale_tasks:
            console.print(
                f"\n[green]✓ No stale claims found[/] (threshold: {threshold} minutes)\n"
            )
            return

        console.print(
            f"\n[yellow]Found {len(stale_tasks)} stale claim(s)[/] (threshold: {threshold} minutes)\n"
        )

        for item in stale_tasks:
            task = item["task"]
            age = item["age_minutes"]

            console.print(f"  {task.id}: {task.title}")
            console.print(f"    Claimed by: {task.claimed_by or 'unknown'}")
            console.print(f"    Age: {int(age)} minutes ({age / 60:.1f} hours)")

            if not dry_run:
                # Unclaim the task by transitioning to pending
                update_status(task, Status.PENDING, reason=f"Stale claim ({int(age)}m)")
                loader.save_task(task)
                console.print(f"    [green]✓ Unclaimed[/]")
            else:
                console.print(f"    [dim]Would unclaim (dry-run)[/]")

            console.print()

        if dry_run:
            console.print(
                f"[dim]Run without --dry-run to actually unclaim these tasks[/]\n"
            )
        else:
            console.print(f"[green]✓ Unclaimed {len(stale_tasks)} task(s)[/]\n")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


# ============================================================================
# Agents Command
# ============================================================================


@cli.command()
@click.option(
    "--profile",
    type=click.Choice(["short", "medium", "long", "all"]),
    default="all",
    show_default=True,
    help="Select output draft length.",
)
def agents(profile):
    """Print concise AGENTS.md draft text for task workflow defaults."""
    order = ["short", "medium", "long"] if profile == "all" else [profile]
    for i, key in enumerate(order):
        if i:
            console.print("\n" + "=" * 72 + "\n")
        console.print(AGENTS_SNIPPETS[key])


# ============================================================================
# Add Commands
# ============================================================================


@cli.command()
@click.argument("epic_id")
@click.option("--title", "-T", required=True, help="Task title")
@click.option("--estimate", "-e", default=1.0, type=float, help="Hours estimate")
@click.option(
    "--complexity",
    "-c",
    default="medium",
    type=click.Choice(["low", "medium", "high", "critical"]),
)
@click.option(
    "--priority",
    "-p",
    default="medium",
    type=click.Choice(["low", "medium", "high", "critical"]),
)
@click.option("--depends-on", "-d", default="", help="Comma-separated task IDs")
@click.option("--tags", default="", help="Comma-separated tags")
def add(epic_id, title, estimate, complexity, priority, depends_on, tags):
    """Add a new task to an epic."""
    try:
        loader = TaskLoader()

        depends_list = [d.strip() for d in depends_on.split(",") if d.strip()]
        tags_list = [t.strip() for t in tags.split(",") if t.strip()]

        task_data = {
            "title": title,
            "estimate_hours": estimate,
            "complexity": complexity,
            "priority": priority,
            "depends_on": depends_list,
            "tags": tags_list,
        }

        task = loader.create_task(epic_id, task_data)

        console.print(f"\n[green]✓ Created task:[/] {task.id}\n")
        console.print(f"  Title:      {task.title}")
        console.print(f"  Estimate:   {task.estimate_hours}h")
        console.print(f"\n[bold]File:[/] .tasks/{task.file}")
        console.print(
            "[yellow]IMPORTANT:[/] You MUST fill in the .todo file that was created.\n"
        )

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@cli.command("add-epic")
@click.argument("milestone_id")
@click.option("--title", "-T", "--name", "-n", required=True, help="Epic title")
@click.option("--estimate", "-e", default=4.0, type=float, help="Hours estimate")
@click.option(
    "--complexity",
    "-c",
    default="medium",
    type=click.Choice(["low", "medium", "high", "critical"]),
)
@click.option("--depends-on", "-d", default="", help="Comma-separated epic IDs")
def add_epic(milestone_id, title, estimate, complexity, depends_on):
    """Add a new epic to a milestone."""
    try:
        loader = TaskLoader()

        depends_list = [d.strip() for d in depends_on.split(",") if d.strip()]

        epic_data = {
            "name": title,
            "estimate_hours": estimate,
            "complexity": complexity,
            "depends_on": depends_list,
        }

        epic = loader.create_epic(milestone_id, epic_data)

        console.print(f"\n[green]✓ Created epic:[/] {epic.id}\n")
        console.print(f"  Title:    {epic.name}")
        console.print(f"  Estimate: {epic.estimate_hours}h")
        tree = loader.load()
        display_epic = tree.find_epic(epic.id) or epic
        console.print(f"\n[bold]Path:[/] {format_epic_path(tree, display_epic)}\n")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@cli.command("add-milestone")
@click.argument("phase_id")
@click.option("--title", "-T", "--name", "-n", required=True, help="Milestone title")
@click.option("--estimate", "-e", default=8.0, type=float, help="Hours estimate")
@click.option(
    "--complexity",
    "-c",
    default="medium",
    type=click.Choice(["low", "medium", "high", "critical"]),
)
@click.option("--depends-on", "-d", default="", help="Comma-separated milestone IDs")
@click.option("--description", help="Milestone description")
def add_milestone(phase_id, title, estimate, complexity, depends_on, description):
    """Add a new milestone to a phase.

    Examples:
        ./tasks.py add-milestone P1 --title "Project Setup" --estimate 16
        ./tasks.py add-milestone P4 -T "Tool Registry" -e 12 -c high
    """
    try:
        loader = TaskLoader()

        depends_list = [d.strip() for d in depends_on.split(",") if d.strip()]

        milestone_data = {
            "name": title,
            "estimate_hours": estimate,
            "complexity": complexity,
            "depends_on": depends_list,
            "description": description,
        }

        milestone = loader.create_milestone(phase_id, milestone_data)

        console.print(f"\n[green]✓ Created milestone:[/] {milestone.id}\n")
        console.print(f"  Title:    {milestone.name}")
        console.print(f"  Estimate: {milestone.estimate_hours}h")
        tree = loader.load()
        display_milestone = tree.find_milestone(milestone.id) or milestone
        console.print(
            f"\n[bold]Path:[/] {format_milestone_path(tree, display_milestone)}\n"
        )

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@cli.command("add-phase")
@click.option("--title", "-T", "--name", "-n", required=True, help="Phase title")
@click.option("--weeks", "-w", default=2, type=int, help="Timeline in weeks")
@click.option("--estimate", "-e", default=40.0, type=float, help="Hours estimate")
@click.option(
    "--priority",
    "-p",
    default="medium",
    type=click.Choice(["low", "medium", "high", "critical"]),
)
@click.option("--depends-on", "-d", default="", help="Comma-separated phase IDs")
@click.option("--description", help="Phase description")
def add_phase(title, weeks, estimate, priority, depends_on, description):
    """Add a new phase to the project.

    Phases are automatically numbered sequentially.

    Examples:
        ./tasks.py add-phase --title "Security Hardening" --weeks 3 --priority high
        ./tasks.py add-phase -T "Beta Testing" -w 4 -e 60 -p medium
    """
    try:
        loader = TaskLoader()

        depends_list = [d.strip() for d in depends_on.split(",") if d.strip()]

        phase_data = {
            "name": title,
            "weeks": weeks,
            "estimate_hours": estimate,
            "priority": priority,
            "depends_on": depends_list,
            "description": description,
        }

        phase = loader.create_phase(phase_data)

        console.print(f"\n[green]✓ Created phase:[/] {phase.id}\n")
        console.print(f"  Title:    {phase.name}")
        console.print(f"  Weeks:    {phase.weeks}")
        console.print(f"  Estimate: {phase.estimate_hours}h")
        console.print(f"\n[bold]Path:[/] {format_phase_path(phase)}\n")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


# ============================================================================
# Register Commands from Modules
# ============================================================================


def _register_all_commands():
    """Register commands from all modules."""
    from .commands import (
        workflow,
        display,
        search,
        reports,
        session,
        timeline,
        data,
        skills,
        schema,
        check,
    )

    workflow.register_commands(cli)
    display.register_commands(cli)
    search.register_commands(cli)
    reports.register_commands(cli)
    session.register_commands(cli)
    timeline.register_commands(cli)
    data.register_commands(cli)
    skills.register_commands(cli)
    schema.register_commands(cli)
    check.register_commands(cli)


_register_all_commands()


if __name__ == "__main__":
    cli()
