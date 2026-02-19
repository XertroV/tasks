"""Search and analysis commands: search, blockers."""

import click
import re
from pathlib import Path
from collections import defaultdict
from rich.console import Console

from ..models import Status, TaskPath
from ..loader import TaskLoader
from ..critical_path import CriticalPathCalculator
from ..helpers import get_all_tasks, find_tasks_blocked_by
from ..time_utils import utc_now, to_utc

console = Console()


def load_config():
    """Load configuration."""
    from ..cli import load_config as cli_load_config
    return cli_load_config()


@click.command()
@click.argument("pattern")
@click.option("--status", help="Filter by status (pending, in_progress, done, blocked)")
@click.option("--tags", help="Filter by tags (comma-separated)")
@click.option("--complexity", type=click.Choice(["low", "medium", "high", "critical"]))
@click.option("--priority", type=click.Choice(["low", "medium", "high", "critical"]))
@click.option("--limit", default=20, help="Maximum results to show")
def search(pattern, status, tags, complexity, priority, limit):
    """Search tasks by title, description, or tags.

    PATTERN is a regex pattern to match against task titles.

    Examples:
        backlog search "auth"
        backlog search "API.*endpoint" --status=pending
        backlog search "security" --tags=backend
    """
    try:
        loader = TaskLoader()
        tree = loader.load("metadata")
        config = load_config()

        # Calculate critical path for highlighting
        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, _ = calc.calculate()

        all_tasks = get_all_tasks(tree)

        # Compile regex pattern
        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error as e:
            console.print(f"[red]Invalid regex pattern:[/] {e}")
            raise click.Abort()

        # Parse tags filter
        filter_tags = set()
        if tags:
            filter_tags = {t.strip().lower() for t in tags.split(",")}

        # Parse status filter
        status_filter = None
        if status:
            try:
                status_filter = Status(status)
            except ValueError:
                console.print(f"[red]Invalid status:[/] {status}")
                console.print(f"Valid: pending, in_progress, done, blocked, rejected, cancelled")
                raise click.Abort()

        # Search
        matches = []
        for task in all_tasks:
            # Match pattern against title
            if not regex.search(task.title):
                # Also check task file content for description
                task_file = Path(".tasks") / task.file
                if task_file.exists():
                    content = task_file.read_text()
                    if not regex.search(content):
                        continue
                else:
                    continue

            # Apply filters
            if status_filter and task.status != status_filter:
                continue

            if filter_tags:
                task_tags = {t.lower() for t in task.tags}
                if not filter_tags.intersection(task_tags):
                    continue

            if complexity and task.complexity.value != complexity:
                continue

            if priority and task.priority.value != priority:
                continue

            matches.append(task)

        if not matches:
            console.print(f"\n[yellow]No tasks found matching '{pattern}'[/]\n")
            return

        console.print(f"\n[bold]Found {len(matches)} result(s) for \"{pattern}\":[/]\n")

        # Group by phase
        by_phase = defaultdict(list)
        for task in matches[:limit]:
            path = TaskPath.parse(task.id)
            by_phase[path.phase].append(task)

        for phase_id, tasks in sorted(by_phase.items()):
            phase = tree.find_phase(phase_id)
            phase_name = phase.name if phase else phase_id
            console.print(f"[bold cyan]{phase_name}[/]")

            for task in tasks:
                # Status indicator
                status_icons = {
                    "done": "[green]✓[/]",
                    "in_progress": "[yellow]→[/]",
                    "pending": "[ ]",
                    "blocked": "[red]✗[/]",
                }
                icon = status_icons.get(task.status.value, "?")

                # Critical path marker
                crit = "[yellow]★[/]" if task.id in critical_path else " "

                console.print(f"\n  {crit} {icon} [bold]{task.id}[/] {task.title}")
                console.print(f"      {task.estimate_hours}h | {task.complexity.value} | {task.priority.value}")

                if task.tags:
                    console.print(f"      Tags: {', '.join(task.tags)}")

                if task.claimed_by:
                    console.print(f"      [dim]Claimed by: {task.claimed_by}[/]")

                if task.depends_on:
                    console.print(f"      [dim]Depends on: {', '.join(task.depends_on)}[/]")

            console.print()

        if len(matches) > limit:
            console.print(f"[dim]... and {len(matches) - limit} more results (use --limit to show more)[/]\n")

        console.print(f"[dim]★ = On critical path[/]\n")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@click.command()
@click.option("--deep", is_flag=True, help="Show full dependency chains")
@click.option("--suggest", is_flag=True, help="Suggest actions to unblock")
def blockers(deep, suggest):
    """Analyze blocked tasks and dependency chains.

    Shows:
    - Tasks currently blocked
    - What's blocking them (root cause)
    - Unclaimed blockers that need attention
    """
    try:
        loader = TaskLoader()
        tree = loader.load("metadata")
        config = load_config()

        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, _ = calc.calculate()

        all_tasks = get_all_tasks(tree)

        # Find all blocked tasks
        blocked_tasks = [t for t in all_tasks if t.status == Status.BLOCKED]

        # Find tasks that are pending but have unsatisfied dependencies
        pending_blocked = []
        for task in all_tasks:
            if task.status == Status.PENDING and not task.claimed_by:
                if not calc._check_dependencies(task):
                    pending_blocked.append(task)

        if not blocked_tasks and not pending_blocked:
            console.print("\n[green]✓ No blocked tasks![/]\n")
            return

        console.print(f"\n[bold red]{len(blocked_tasks)} task(s) marked as BLOCKED[/]")
        console.print(f"[bold yellow]{len(pending_blocked)} task(s) waiting on dependencies[/]\n")

        # Analyze blocking chains
        chains = []

        # Build a map of what each task blocks
        blocks_map = defaultdict(list)
        for task in all_tasks:
            blocked_by_task = find_tasks_blocked_by(tree, task.id)
            for blocked in blocked_by_task:
                blocks_map[task.id].append(blocked.id)

        # Find root blockers (tasks that are blocking others but aren't blocked themselves)
        root_blockers = set()
        all_blocking = set()

        for task in pending_blocked:
            # Find what's blocking this task
            for dep_id in task.depends_on:
                dep = tree.find_task(dep_id)
                if dep and dep.status != Status.DONE:
                    all_blocking.add(dep_id)

            # Check implicit dependency
            if not task.depends_on and task.epic_id:
                epic = tree.find_epic(task.epic_id)
                if epic:
                    task_idx = next((i for i, t in enumerate(epic.tasks) if t.id == task.id), None)
                    if task_idx and task_idx > 0:
                        prev = epic.tasks[task_idx - 1]
                        if prev.status != Status.DONE:
                            all_blocking.add(prev.id)

        # Identify root blockers (blockers that aren't themselves blocked)
        for blocker_id in all_blocking:
            blocker = tree.find_task(blocker_id)
            if blocker:
                if blocker.status == Status.IN_PROGRESS:
                    root_blockers.add(blocker_id)
                elif blocker.status == Status.PENDING and calc._check_dependencies(blocker):
                    root_blockers.add(blocker_id)

        # Group by root blocker
        console.print("[bold]Blocking Chains:[/]\n")

        chains_shown = 0
        for root_id in sorted(root_blockers):
            root = tree.find_task(root_id)
            if not root:
                continue

            # Count how many tasks this blocks (transitively)
            blocked_count = len(blocks_map.get(root_id, []))

            # Status and indicators
            on_crit = "[yellow]★ CRITICAL PATH[/]" if root_id in critical_path else ""
            status_str = f"[yellow]{root.status.value}[/]"
            claimed = f" @{root.claimed_by}" if root.claimed_by else " [red]UNCLAIMED[/]"

            console.print(f"[bold]{root_id}[/] {status_str}{claimed} {on_crit}")
            console.print(f"  {root.title}")
            console.print(f"  [dim]Blocks {blocked_count} task(s)[/]")

            if deep:
                # Show the chain
                blocked_by_root = blocks_map.get(root_id, [])
                for blocked_id in blocked_by_root[:5]:
                    blocked = tree.find_task(blocked_id)
                    if blocked:
                        console.print(f"    └─► {blocked_id}: {blocked.title[:40]}...")

                if len(blocked_by_root) > 5:
                    console.print(f"    └─► ... and {len(blocked_by_root) - 5} more")

            if suggest:
                if not root.claimed_by and root.status == Status.PENDING:
                    console.print(f"  [cyan]💡 Unclaimed! Run: backlog grab {root_id}[/]")
                elif root.status == Status.IN_PROGRESS and root.claimed_at:
                    claimed = to_utc(root.claimed_at)
                    age_hours = (utc_now() - claimed).total_seconds() / 3600
                    if age_hours > 2:
                        console.print(f"  [yellow]💡 In progress for {age_hours:.1f}h. Consider check-in.[/]")

            console.print()
            chains_shown += 1

            if chains_shown >= 10 and not deep:
                remaining = len(root_blockers) - chains_shown
                if remaining > 0:
                    console.print(f"[dim]... and {remaining} more blocking chains (use --deep to see all)[/]\n")
                break

        # Summary
        console.print("[bold]Summary:[/]")
        unclaimed_blockers = sum(1 for r in root_blockers if tree.find_task(r) and not tree.find_task(r).claimed_by)
        console.print(f"  Root blockers: {len(root_blockers)}")
        if unclaimed_blockers:
            console.print(f"  [red]Unclaimed blockers: {unclaimed_blockers}[/]")
        critical_blockers = sum(1 for r in root_blockers if r in critical_path)
        if critical_blockers:
            console.print(f"  [yellow]On critical path: {critical_blockers}[/]")

        console.print()

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def register_commands(cli):
    """Register search commands with the CLI."""
    cli.add_command(search)
    cli.add_command(blockers)
