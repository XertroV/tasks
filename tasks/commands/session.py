"""Session management commands."""

import click
from datetime import datetime
from rich.console import Console
from rich.table import Table

from ..helpers import (
    load_sessions,
    save_sessions,
    start_session,
    update_session_heartbeat,
    end_session,
    get_active_sessions,
    get_stale_sessions,
    format_duration,
)

console = Console()


def load_config():
    """Load configuration."""
    from ..cli import load_config as cli_load_config
    return cli_load_config()


@click.group()
def session():
    """Manage agent sessions."""
    pass


@session.command()
@click.option("--agent", required=True, help="Agent session ID")
@click.option("--task", help="Current task ID")
def start(agent, task):
    """Start a new session for an agent.

    Sessions track active work and enable stale detection.
    """
    try:
        sess = start_session(agent, task)

        console.print(f"\n[green]✓ Session started[/]\n")
        console.print(f"  Agent: {agent}")
        if task:
            console.print(f"  Task:  {task}")
        console.print(f"  Time:  {sess['started_at']}")
        console.print(f"\n[dim]Remember to send heartbeats with:[/]")
        console.print(f"  ./tasks.py session heartbeat --agent={agent}\n")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@session.command()
@click.option("--agent", required=True, help="Agent session ID")
@click.option("--progress", help="Progress note (e.g., 'Working on tests')")
def heartbeat(agent, progress):
    """Update session heartbeat to indicate active work.

    Should be called periodically (every 5-10 minutes) to prevent
    the session from being marked as stale.
    """
    try:
        if update_session_heartbeat(agent, progress):
            console.print(f"[green]✓ Heartbeat updated[/] for {agent}")
            if progress:
                console.print(f"  Progress: {progress}")
        else:
            console.print(f"[yellow]Warning:[/] No active session for '{agent}'")
            console.print(f"[dim]Start a session with:[/] ./tasks.py session start --agent={agent}")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@session.command()
@click.option("--agent", required=True, help="Agent session ID")
@click.option("--status", type=click.Choice(["completed", "paused", "error"]), default="completed")
def end(agent, status):
    """End an agent session.

    Use --status to indicate how the session ended:
    - completed: Work finished normally
    - paused: Work paused, may resume later
    - error: Session ended due to an error
    """
    try:
        if end_session(agent):
            console.print(f"\n[green]✓ Session ended[/] for {agent}")
            console.print(f"  Status: {status}\n")
        else:
            console.print(f"[yellow]No active session found for '{agent}'[/]")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@session.command("list")
@click.option("--active", is_flag=True, help="Show only active sessions")
@click.option("--stale", is_flag=True, help="Show only stale sessions")
def list_sessions(active, stale):
    """List all sessions.

    Shows active agent sessions and their status.
    """
    try:
        config = load_config()
        timeout = config.get("session", {}).get("heartbeat_timeout_minutes", 15)

        if stale:
            sessions = get_stale_sessions(timeout)
            if not sessions:
                console.print("\n[green]✓ No stale sessions[/]\n")
                return

            console.print(f"\n[bold yellow]Stale Sessions (no heartbeat > {timeout}m):[/]\n")
            for sess in sessions:
                console.print(f"  [yellow]{sess['agent_id']}[/]")
                if sess["current_task"]:
                    console.print(f"    Task: {sess['current_task']}")
                console.print(f"    Last heartbeat: {sess['age_minutes']}m ago")
                if sess["progress"]:
                    console.print(f"    Last progress: {sess['progress']}")
                console.print()

        else:
            sessions = get_active_sessions()
            if not sessions:
                console.print("\n[dim]No active sessions[/]\n")
                return

            console.print("\n[bold cyan]Active Sessions:[/]\n")

            table = Table(show_header=True, header_style="bold")
            table.add_column("Agent")
            table.add_column("Task")
            table.add_column("Duration")
            table.add_column("Last HB")
            table.add_column("Progress")

            for sess in sessions:
                # Determine status color based on heartbeat age
                hb_age = sess["last_heartbeat_minutes"]
                if hb_age > timeout:
                    status = f"[red]{hb_age}m[/]"
                elif hb_age > timeout / 2:
                    status = f"[yellow]{hb_age}m[/]"
                else:
                    status = f"[green]{hb_age}m[/]"

                table.add_row(
                    sess["agent_id"],
                    sess["current_task"] or "-",
                    format_duration(sess["duration_minutes"]),
                    status,
                    (sess["progress"] or "-")[:30],
                )

            console.print(table)
            console.print()

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@session.command()
def clean():
    """Remove all stale sessions.

    Cleans up sessions that haven't had a heartbeat in too long.
    """
    try:
        config = load_config()
        timeout = config.get("session", {}).get("heartbeat_timeout_minutes", 15)

        stale = get_stale_sessions(timeout)
        if not stale:
            console.print("\n[green]✓ No stale sessions to clean[/]\n")
            return

        sessions = load_sessions()
        removed = []

        for sess in stale:
            agent_id = sess["agent_id"]
            if agent_id in sessions:
                del sessions[agent_id]
                removed.append(agent_id)

        save_sessions(sessions)

        console.print(f"\n[green]✓ Removed {len(removed)} stale session(s):[/]")
        for agent_id in removed:
            console.print(f"  - {agent_id}")
        console.print()

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def register_commands(cli):
    """Register session commands with the CLI."""
    cli.add_command(session)
