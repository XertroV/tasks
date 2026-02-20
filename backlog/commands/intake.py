"""Intake commands for idea capture."""

import click
from rich.console import Console

from ..loader import TaskLoader
from ..data_dir import get_data_dir_name

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


@click.command()
@click.argument("fixed_words", nargs=-1, required=False)
@click.option("--title", "-T", required=False, help="Fixed item title")
@click.option("--description", "--desc", "description", required=False, help="Optional description metadata")
@click.option(
    "--at",
    required=False,
    help="Timestamp for completion and creation (ISO 8601); defaults to now",
)
@click.option("--tags", default="", help="Comma-separated tags")
@click.option("--body", "-b", default="", help="Body content for the fix note")
def fixed(fixed_words, title, description, at, tags, body):
    """Capture a completed ad-hoc fix as a done .todo."""
    try:
        positional_title = " ".join(fixed_words).strip()
        if not title and positional_title:
            title = positional_title

        if not title:
            raise ValueError("fixed requires --title or FIX_TEXT")

        if not description:
            description = title

        tags_list = [t.strip() for t in tags.split(",") if t.strip()]
        fixed_data = {
            "title": title,
            "description": description,
            "at": at,
            "tags": tags_list,
            "body": body if body else None,
        }

        loader = TaskLoader()
        created = loader.create_fixed(fixed_data)

        console.print(f"\n[green]✓ Created fixed:[/] {created.id}\n")
        console.print(f"  Title:    {created.title}")
        console.print(f"  Status:   {created.status.value}")
        console.print(f"  Tags:     {', '.join(created.tags) if created.tags else '(none)'}")

        console.print(f"\n[bold]File:[/] {get_data_dir_name()}/{created.file}")
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def register_commands(cli):
    """Register intake commands with the CLI."""
    cli.add_command(idea)
    cli.add_command(fixed)
