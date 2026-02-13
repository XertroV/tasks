"""Intake commands for idea capture."""

import click
from rich.console import Console

from ..loader import TaskLoader

console = Console()


@click.command()
@click.argument("idea_words", nargs=-1, required=True)
def idea(idea_words):
    """Capture an idea as a planning intake .todo."""
    try:
        title = " ".join(idea_words).strip()
        if not title:
            raise ValueError("idea requires a non-empty idea description")

        loader = TaskLoader()
        created = loader.create_idea({"title": title})

        console.print(f"\n[green]✓ Created idea:[/] {created.id}\n")
        console.print(f"  Title: {created.title}")
        console.print(f"\n[bold]File:[/] .tasks/{created.file}")
        console.print(
            "[yellow]IMPORTANT:[/] This intake tracks planning work; run `/plan-task` on the idea and ingest resulting items with tasks commands.\n"
        )

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def register_commands(cli):
    """Register intake commands with the CLI."""
    cli.add_command(idea)
