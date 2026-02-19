"""Timeline command: ASCII Gantt chart visualization."""

import click
from datetime import datetime, timedelta
from rich.console import Console
from rich.table import Table

from ..models import Status
from ..loader import TaskLoader
from ..critical_path import CriticalPathCalculator
from ..helpers import get_all_tasks

console = Console()


def load_config():
    """Load configuration."""
    from ..cli import load_config as cli_load_config

    return cli_load_config()


@click.command(short_help="ASCII project timeline (alias: tl).")
@click.option("--scope", help="Filter by scope (phase/milestone/epic ID)")
@click.option(
    "--weeks", type=int, help="Number of weeks to display (auto-detect if not set)"
)
@click.option(
    "--group-by",
    "group_by",
    type=click.Choice(["phase", "milestone", "epic", "status"]),
    default="milestone",
    help="How to group tasks",
)
@click.option("--show-done", is_flag=True, help="Include completed tasks")
@click.option("--width", type=int, default=40, help="Chart width in characters")
def timeline(scope, weeks, group_by, show_done, width):
    """Display an ASCII Gantt chart of the project timeline.

    Shows tasks as bars on a timeline, grouped by milestone/phase/epic.
    Critical path tasks are highlighted.

    Examples:
        backlog timeline
        backlog timeline --scope=P1.M1
        backlog timeline --weeks=8 --group-by=phase
    """
    try:
        loader = TaskLoader()
        tree = loader.load("metadata")
        config = load_config()

        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, _ = calc.calculate()

        # Get all tasks
        all_tasks = get_all_tasks(tree)

        # Filter by scope
        if scope:
            all_tasks = [t for t in all_tasks if t.id.startswith(scope)]

        # Filter done tasks
        if not show_done:
            all_tasks = [t for t in all_tasks if t.status != Status.DONE]

        if not all_tasks:
            console.print("[yellow]No tasks to display.[/]")
            return

        # Calculate timeline bounds
        total_hours = sum(t.estimate_hours for t in all_tasks)
        hours_per_week = 40  # Assume 40 hours per week
        auto_weeks = max(4, int(total_hours / hours_per_week) + 2)
        display_weeks = weeks or auto_weeks

        console.print(f"\n[bold cyan]Project Timeline[/] ({display_weeks} weeks)\n")

        # Show legend
        console.print(
            "[dim]Legend:[/] "
            "[green]█[/]=done "
            "[yellow]▓[/]=in_progress "
            "[blue]░[/]=pending "
            "[red]▒[/]=blocked "
            "[yellow]★[/]=critical"
        )
        console.print()

        # Group tasks
        groups = _group_tasks(tree, all_tasks, group_by)

        # Calculate positions for each task
        task_positions = _calculate_positions(tree, all_tasks, calc, critical_path)

        # Render each group
        for group_name, tasks in groups.items():
            console.print(f"[bold]{group_name}[/]")

            for task in tasks:
                pos = task_positions.get(task.id, {})
                start_pct = pos.get("start", 0)
                end_pct = pos.get("end", start_pct + 0.05)

                bar = _render_bar(task, start_pct, end_pct, width, critical_path)

                # Status indicator
                status_char = {
                    Status.DONE: "[green]✓[/]",
                    Status.IN_PROGRESS: "[yellow]→[/]",
                    Status.PENDING: " ",
                    Status.BLOCKED: "[red]✗[/]",
                }.get(task.status, " ")

                # Critical path marker
                crit = "[yellow]★[/]" if task.id in critical_path else " "

                # Truncate title
                title = (
                    task.title[:25] + "..."
                    if len(task.title) > 28
                    else task.title.ljust(28)
                )

                console.print(f"  {status_char}{crit} {task.id:15} {title} {bar}")

            console.print()

        # Show week markers
        _show_week_markers(display_weeks, width)

        # Summary
        stats = tree.stats
        pct_done = (
            (stats["done"] / stats["total_tasks"] * 100)
            if stats["total_tasks"] > 0
            else 0
        )
        console.print(
            f"\n[dim]Progress: {stats['done']}/{stats['total_tasks']} tasks ({pct_done:.0f}%)[/]"
        )
        console.print(f"[dim]Critical path: {len(critical_path)} tasks[/]\n")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def _group_tasks(tree, tasks, group_by):
    """Group tasks by the specified field."""
    groups = {}

    for task in tasks:
        if group_by == "phase":
            key = task.phase_id or "Unknown"
            phase = tree.find_phase(key)
            label = f"{key}: {phase.name}" if phase else key
        elif group_by == "milestone":
            key = task.milestone_id or "Unknown"
            milestone = tree.find_milestone(key)
            label = f"{key}: {milestone.name}" if milestone else key
        elif group_by == "epic":
            key = task.epic_id or "Unknown"
            epic = tree.find_epic(key)
            label = f"{key}: {epic.name}" if epic else key
        elif group_by == "status":
            label = task.status.value
        else:
            label = "All"

        if label not in groups:
            groups[label] = []
        groups[label].append(task)

    return groups


def _calculate_positions(tree, all_tasks, calc, critical_path):
    """Calculate start/end positions for each task as percentages."""
    positions = {}

    # Build cumulative position based on dependencies
    # Simple algorithm: place tasks after their dependencies

    task_map = {t.id: t for t in all_tasks}
    total_hours = sum(t.estimate_hours for t in all_tasks) or 1

    # Track cumulative hours per task
    task_end_hour = {}

    def get_task_start(task):
        """Get the earliest start hour for a task."""
        if task.id in task_end_hour:
            return task_end_hour[task.id] - task.estimate_hours

        start = 0

        # Check explicit dependencies
        for dep_id in task.depends_on:
            if dep_id in task_end_hour:
                start = max(start, task_end_hour[dep_id])
            elif dep_id in task_map:
                # Calculate dependency first
                dep = task_map[dep_id]
                get_task_end(dep)
                if dep_id in task_end_hour:
                    start = max(start, task_end_hour[dep_id])

        # Check implicit dependency (previous in epic)
        epic = tree.find_epic(task.epic_id)
        if epic and not task.depends_on:
            idx = next((i for i, t in enumerate(epic.tasks) if t.id == task.id), 0)
            if idx > 0:
                prev = epic.tasks[idx - 1]
                if prev.id in task_end_hour:
                    start = max(start, task_end_hour[prev.id])
                elif prev.id in task_map:
                    get_task_end(prev)
                    if prev.id in task_end_hour:
                        start = max(start, task_end_hour[prev.id])

        return start

    def get_task_end(task):
        """Calculate end hour for a task."""
        if task.id in task_end_hour:
            return task_end_hour[task.id]

        start = get_task_start(task)
        end = start + task.estimate_hours
        task_end_hour[task.id] = end
        return end

    # Calculate all positions
    for task in all_tasks:
        get_task_end(task)

    # Find max to normalize
    max_hour = max(task_end_hour.values()) if task_end_hour else 1

    # Convert to percentages
    for task in all_tasks:
        start_hour = get_task_start(task)
        end_hour = task_end_hour.get(task.id, start_hour + task.estimate_hours)
        positions[task.id] = {
            "start": start_hour / max_hour,
            "end": end_hour / max_hour,
        }

    return positions


def _render_bar(task, start_pct, end_pct, width, critical_path):
    """Render a single task bar."""
    # Calculate character positions
    start_pos = int(start_pct * width)
    end_pos = int(end_pct * width)
    bar_len = max(1, end_pos - start_pos)

    # Choose character based on status
    if task.status == Status.DONE:
        char = "█"
        color = "green"
    elif task.status == Status.IN_PROGRESS:
        char = "▓"
        color = "yellow"
    elif task.status == Status.BLOCKED:
        char = "▒"
        color = "red"
    else:  # pending
        char = "░"
        color = "blue"

    # Build the bar
    padding_before = " " * start_pos
    bar = char * bar_len
    padding_after = " " * (width - end_pos)

    return f"│{padding_before}[{color}]{bar}[/]{padding_after}│"


def _show_week_markers(weeks, width):
    """Show week markers below the chart."""
    # Calculate positions for week markers
    chars_per_week = width / weeks

    # Build marker line
    markers = ""
    for i in range(weeks + 1):
        pos = int(i * chars_per_week)
        markers += f"{i:>3}".rjust(int(chars_per_week)) if i < weeks else ""

    # Week labels
    labels = " " * 50 + "│"
    for i in range(0, weeks + 1, max(1, weeks // 8)):
        pos = int(i * chars_per_week)
        labels = labels[: 50 + 1 + pos] + f"W{i}" + labels[50 + 3 + pos :]

    console.print(f"{'':50} └{'─' * width}┘")
    console.print(f"{'':50}  [dim]Week 0{' ' * (width - 10)}Week {weeks}[/]")


def register_commands(cli):
    """Register timeline commands with the CLI."""
    cli.add_command(timeline)
    tl_alias = click.Command(
        "tl",
        callback=timeline.callback,
        params=timeline.params,
        help=timeline.help,
        short_help="Alias for timeline",
        hidden=True,
    )
    cli.add_command(tl_alias)
