"""Display commands: dash, progress bars."""

import click
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from ..models import Status
from ..loader import TaskLoader
from ..critical_path import CriticalPathCalculator
from ..status import check_stale_claims
from ..time_utils import utc_now, to_utc
from ..helpers import (
    load_context,
    get_active_sessions,
    get_stale_sessions,
    make_progress_bar,
    format_duration,
    get_all_tasks,
)

console = Console()


def load_config():
    """Load configuration."""
    from ..cli import load_config as cli_load_config

    return cli_load_config()


@click.command()
@click.option("--agent", help="Filter to specific agent")
def dash(agent):
    """Show a quick dashboard of project status.

    Displays:
    - Current working task (from context)
    - Progress bars per phase
    - Critical path summary
    - Blocked/stale counts
    """
    try:
        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        # Calculate critical path
        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, next_available = calc.calculate()

        # Get context
        ctx = load_context()
        current_task_id = ctx.get("current_task")
        current_agent = ctx.get("agent", "unknown")

        # Header with current task
        console.print()
        if current_task_id:
            task = tree.find_task(current_task_id)
            if task:
                started = ctx.get("started_at")
                duration_str = ""
                if started:
                    try:
                        started_dt = to_utc(datetime.fromisoformat(started))
                        mins = (utc_now() - started_dt).total_seconds() / 60
                        duration_str = f" | Session: {format_duration(mins)}"
                    except Exception:
                        pass

                console.print(
                    Panel(
                        f"[bold]{task.id}[/] - {task.title}\n"
                        f"Agent: {current_agent}{duration_str}",
                        title="[bold cyan]Current Task[/]",
                        border_style="cyan",
                    )
                )
            else:
                console.print(
                    f"[yellow]⚠ Working task '{current_task_id}' not found[/]\n"
                )
        else:
            console.print("[dim]No current working task set.[/]")
            console.print("[dim]Use 'backlog grab' to claim a task.[/]\n")

        # Progress by phase
        console.print("\n[bold]Progress:[/]")
        stats = tree.stats
        total_pct = (
            (stats["done"] / stats["total_tasks"] * 100)
            if stats["total_tasks"] > 0
            else 0
        )

        completed_phases = []
        for phase in tree.phases:
            p_stats = phase.stats
            done = p_stats["done"]
            total = p_stats["total_tasks"]
            pct = (done / total * 100) if total > 0 else 0

            if pct == 100:
                completed_phases.append((phase.id, phase.name, total))
                continue

            bar = make_progress_bar(done, total)

            # Color based on progress
            if pct > 50:
                color = "yellow"
            else:
                color = "white"

            console.print(
                f"  [{color}]{phase.id}:[/] {bar} {pct:5.1f}% ({done}/{total})"
            )

        console.print(
            f"\n  [bold]Total:[/] {make_progress_bar(stats['done'], stats['total_tasks'])} {total_pct:5.1f}% ({stats['done']}/{stats['total_tasks']})"
        )

        if completed_phases:
            completed_str = ", ".join(
                f"{pid} ({total} tasks)" for pid, pname, total in completed_phases
            )
            console.print(f"\n  [green]✓ Completed:[/] {completed_str}")

        # Critical path info
        console.print(f"\n[bold]Critical Path:[/]")
        remaining_on_path = [
            t
            for t in critical_path
            if tree.find_task(t) and tree.find_task(t).status != Status.DONE
        ]
        if remaining_on_path:
            # Calculate total hours remaining
            total_hours = 0
            for task_id in remaining_on_path[:10]:
                task = tree.find_task(task_id)
                if task:
                    total_hours += task.estimate_hours

            path_display = " → ".join(remaining_on_path[:5])
            if len(remaining_on_path) > 5:
                path_display += " → ..."

            console.print(f"  {path_display}")
            console.print(
                f"  [dim]{len(remaining_on_path)} tasks, ~{total_hours:.0f}h remaining[/]"
            )
        else:
            console.print("  [green]✓ All critical path tasks complete![/]")

        if next_available:
            next_task = tree.find_task(next_available)
            if next_task:
                console.print(f"\n  [bold]Next:[/] {next_task.id} - {next_task.title}")

        # Status counts
        all_tasks = get_all_tasks(tree)
        blocked_count = sum(1 for t in all_tasks if t.status == Status.BLOCKED)
        in_progress_count = sum(1 for t in all_tasks if t.status == Status.IN_PROGRESS)

        stale_claims = check_stale_claims(
            all_tasks,
            config["stale_claim"]["warn_after_minutes"],
            config["stale_claim"]["error_after_minutes"],
        )

        stale_sessions = get_stale_sessions(
            config.get("session", {}).get("heartbeat_timeout_minutes", 15)
        )

        console.print(f"\n[bold]Status:[/]")
        console.print(f"  In progress: {in_progress_count}")
        if blocked_count:
            console.print(f"  [red]Blocked: {blocked_count}[/]")
        if stale_claims:
            console.print(f"  [yellow]Stale claims: {len(stale_claims)}[/]")
        if stale_sessions:
            console.print(f"  [yellow]Stale sessions: {len(stale_sessions)}[/]")

        # Active sessions
        active = get_active_sessions()
        if active:
            console.print(f"\n[bold]Active Sessions:[/]")
            for sess in active[:5]:
                task_info = ""
                if sess["current_task"]:
                    task_info = f" on {sess['current_task']}"
                console.print(
                    f"  {sess['agent_id']}{task_info} ({format_duration(sess['duration_minutes'])})"
                )

        console.print()

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def add_progress_to_list(tree, calc, output_json=False):
    """Add progress bars to list output. Returns formatted string."""
    lines = []
    completed_phases = []

    for phase in tree.phases:
        p_stats = phase.stats
        done = p_stats["done"]
        total = p_stats["total_tasks"]
        pct = (done / total * 100) if total > 0 else 0

        if pct == 100:
            completed_phases.append((phase.id, phase.name, total))
            continue

        bar = make_progress_bar(done, total)

        # Status indicator
        if p_stats["in_progress"] > 0:
            indicator = "[yellow]→[/]"
        elif p_stats["blocked"] > 0:
            indicator = "[red]🔒[/]"
        else:
            indicator = "[ ]"

        lines.append(f"{indicator} [bold]{phase.name}[/]")
        lines.append(f"    {bar} {pct:5.1f}% ({done}/{total})")

        # Show milestones if phase is in progress
        for m in phase.milestones:
            m_stats = m.stats
            m_done = m_stats["done"]
            m_total = m_stats["total_tasks"]
            m_pct = (m_done / m_total * 100) if m_total > 0 else 0

            if m_pct == 100:
                continue

            m_bar = make_progress_bar(m_done, m_total, width=15)

            if m_stats["in_progress"] > 0:
                m_ind = "[yellow]→[/]"
            elif m_stats["blocked"] > 0:
                m_ind = "[red]🔒[/]"
            else:
                m_ind = "○"

            lines.append(f"    {m_ind} {m.id}: {m_bar} {m_pct:4.0f}%")

        lines.append("")

    if completed_phases:
        completed_str = ", ".join(
            f"{pid} ({total})" for pid, pname, total in completed_phases
        )
        lines.append(f"[green]✓ Completed:[/] {completed_str}")
        lines.append("")

    return "\n".join(lines)


def register_commands(cli):
    """Register display commands with the CLI."""
    cli.add_command(dash)
