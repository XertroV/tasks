"""Data commands: export, import."""

import click
import json
import yaml
from pathlib import Path
from rich.console import Console

from ..models import Status
from ..loader import TaskLoader
from ..helpers import get_all_tasks
from ..time_utils import utc_now, utc_now_iso

console = Console()


@click.group()
def data():
    """Import and export task data."""
    pass


@data.command("export")
@click.option("--format", "output_format", type=click.Choice(["json", "yaml"]), default="json",
              help="Output format")
@click.option("--output", "-o", type=click.Path(), help="Output file (stdout if not specified)")
@click.option("--scope", help="Filter by scope (phase/milestone/epic ID)")
@click.option("--include-content", is_flag=True, help="Include .todo file contents")
@click.option("--pretty", is_flag=True, default=True, help="Pretty-print output")
def export_data(output_format, output, scope, include_content, pretty):
    """Export task data to JSON or YAML.

    Exports the full task tree or a filtered subset for backup,
    sharing, or external tool integration.

    Examples:
        backlog data export > backup.json
        backlog data export --format=yaml -o tasks.yaml
        backlog data export --scope=P1.M1 --include-content
    """
    try:
        loader = TaskLoader()
        tree = loader.load("metadata")

        # Build export data
        export = {
            "exported_at": utc_now_iso(),
            "project": tree.project,
            "description": tree.description,
            "timeline_weeks": tree.timeline_weeks,
            "stats": tree.stats,
            "phases": [],
        }

        for phase in tree.phases:
            # Filter by scope
            if scope and not phase.id.startswith(scope) and not scope.startswith(phase.id):
                continue

            phase_data = {
                "id": phase.id,
                "name": phase.name,
                "path": phase.path,
                "status": phase.status.value,
                "weeks": phase.weeks,
                "estimate_hours": phase.estimate_hours,
                "priority": phase.priority.value,
                "depends_on": phase.depends_on,
                "stats": phase.stats,
                "milestones": [],
            }

            for milestone in phase.milestones:
                if scope and not milestone.id.startswith(scope) and not scope.startswith(milestone.id):
                    continue

                milestone_data = {
                    "id": milestone.id,
                    "name": milestone.name,
                    "path": milestone.path,
                    "status": milestone.status.value,
                    "estimate_hours": milestone.estimate_hours,
                    "complexity": milestone.complexity.value,
                    "depends_on": milestone.depends_on,
                    "stats": milestone.stats,
                    "epics": [],
                }

                for epic in milestone.epics:
                    if scope and not epic.id.startswith(scope) and not scope.startswith(epic.id):
                        continue

                    epic_data = {
                        "id": epic.id,
                        "name": epic.name,
                        "path": epic.path,
                        "status": epic.status.value,
                        "estimate_hours": epic.estimate_hours,
                        "complexity": epic.complexity.value,
                        "depends_on": epic.depends_on,
                        "stats": epic.stats,
                        "tasks": [],
                    }

                    for task in epic.tasks:
                        if scope and not task.id.startswith(scope):
                            continue

                        task_data = {
                            "id": task.id,
                            "title": task.title,
                            "file": task.file,
                            "status": task.status.value,
                            "estimate_hours": task.estimate_hours,
                            "complexity": task.complexity.value,
                            "priority": task.priority.value,
                            "depends_on": task.depends_on,
                            "tags": task.tags,
                            "claimed_by": task.claimed_by,
                            "claimed_at": task.claimed_at.isoformat() if task.claimed_at else None,
                            "started_at": task.started_at.isoformat() if task.started_at else None,
                            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                            "duration_minutes": task.duration_minutes,
                        }

                        if include_content:
                            task_file = Path(".tasks") / task.file
                            if task_file.exists():
                                with open(task_file) as f:
                                    task_data["content"] = f.read()

                        epic_data["tasks"].append(task_data)

                    if epic_data["tasks"] or not scope:
                        milestone_data["epics"].append(epic_data)

                if milestone_data["epics"] or not scope:
                    phase_data["milestones"].append(milestone_data)

            if phase_data["milestones"] or not scope:
                export["phases"].append(phase_data)

        # Format output
        if output_format == "json":
            indent = 2 if pretty else None
            result = json.dumps(export, indent=indent, default=str)
        else:  # yaml
            result = yaml.dump(export, default_flow_style=False, allow_unicode=True)

        # Write output
        if output:
            with open(output, "w") as f:
                f.write(result)
            console.print(f"[green]✓ Exported to {output}[/]")

            # Show summary
            all_tasks = get_all_tasks(tree)
            if scope:
                all_tasks = [t for t in all_tasks if t.id.startswith(scope)]
            console.print(f"  {len(export['phases'])} phases, {len(all_tasks)} tasks")
        else:
            click.echo(result)

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@data.command("summary")
@click.option("--format", "output_format", type=click.Choice(["json", "text"]), default="text")
def summary(output_format):
    """Export a compact summary of project status.

    Useful for quick status reports or external dashboards.
    """
    try:
        loader = TaskLoader()
        tree = loader.load("metadata")

        stats = tree.stats
        total = stats["total_tasks"]
        done = stats["done"]
        pct = (done / total * 100) if total > 0 else 0

        summary_data = {
            "project": tree.project,
            "timestamp": utc_now_iso(),
            "overall": {
                "total_tasks": total,
                "done": done,
                "in_progress": stats["in_progress"],
                "pending": stats["pending"],
                "blocked": stats["blocked"],
                "percent_complete": round(pct, 1),
            },
            "phases": [],
        }

        for phase in tree.phases:
            p_stats = phase.stats
            p_total = p_stats["total_tasks"]
            p_pct = (p_stats["done"] / p_total * 100) if p_total > 0 else 0

            summary_data["phases"].append({
                "id": phase.id,
                "name": phase.name,
                "done": p_stats["done"],
                "total": p_total,
                "percent_complete": round(p_pct, 1),
            })

        if output_format == "json":
            click.echo(json.dumps(summary_data, indent=2))
        else:
            console.print(f"\n[bold cyan]{tree.project}[/]")
            console.print(f"[dim]{utc_now().strftime('%Y-%m-%d %H:%M UTC')}[/]\n")

            console.print(f"[bold]Overall:[/] {done}/{total} tasks ({pct:.1f}%)")
            console.print(f"  In Progress: {stats['in_progress']} | Blocked: {stats['blocked']}\n")

            console.print("[bold]By Phase:[/]")
            for p in summary_data["phases"]:
                bar_len = int(20 * p["percent_complete"] / 100)
                bar = "█" * bar_len + "░" * (20 - bar_len)
                console.print(f"  {p['id']}: {bar} {p['percent_complete']:5.1f}% - {p['name']}")

            console.print()

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def register_commands(cli):
    """Register data commands with the CLI."""
    cli.add_command(data)
