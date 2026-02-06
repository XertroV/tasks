"""Workflow commands: grab, cycle, work."""

import click
import json
from pathlib import Path
from rich.console import Console

from ..models import Status
from ..loader import TaskLoader
from ..critical_path import CriticalPathCalculator
from ..time_utils import utc_now, to_utc
from ..status import claim_task, complete_task, update_status, StatusError
from ..helpers import (
    load_context,
    save_context,
    clear_context,
    get_current_task_id,
    set_current_task,
    set_multi_task_context,
    set_sibling_task_context,
    get_sibling_tasks,
    get_all_current_tasks,
    start_session,
    make_progress_bar,
    find_newly_unblocked,
    print_completion_notices,
)

console = Console()

DEFAULT_SIBLING_ADDITIONAL_COUNT = 4


def load_config():
    """Load configuration."""
    from ..cli import load_config as cli_load_config

    return cli_load_config()


def get_default_agent():
    """Get the default agent ID from config."""
    config = load_config()
    return config.get("agent", {}).get("default_agent", "cli-user")


def _find_and_reclaim_stale_task(tree, config, agent, loader):
    """Find and reclaim the oldest stale task if available.

    Returns:
        str: Task ID of reclaimed stale task, or None if no stale tasks found
    """
    error_threshold = config["stale_claim"]["error_after_minutes"]
    now = utc_now()
    stale_tasks = []

    # Find all stale tasks
    for phase in tree.phases:
        for milestone in phase.milestones:
            for epic in milestone.epics:
                for t in epic.tasks:
                    if t.status == Status.IN_PROGRESS and t.claimed_at:
                        age_minutes = (now - to_utc(t.claimed_at)).total_seconds() / 60
                        if age_minutes >= error_threshold:
                            stale_tasks.append({
                                "task": t,
                                "age_minutes": age_minutes
                            })

    if not stale_tasks:
        return None

    # Sort by age, oldest first
    stale_tasks.sort(key=lambda x: x["age_minutes"], reverse=True)

    # Reclaim the oldest stale task
    stale_item = stale_tasks[0]
    stale_task = stale_item["task"]
    age = stale_item["age_minutes"]

    console.print(f"\n[cyan]Found {len(stale_tasks)} stale task(s) (>{error_threshold}m old)[/]")
    console.print("[cyan]Reclaiming oldest stale task...[/]\n")
    console.print(f"  [yellow]Reclaiming:[/] {stale_task.id} - {stale_task.title}")
    console.print(f"  [dim]Previously claimed by:[/] {stale_task.claimed_by or 'unknown'}")
    console.print(f"  [dim]Age:[/] {int(age)} minutes ({age / 60:.1f} hours)\n")

    # Reset to pending, then claim with current agent
    update_status(stale_task, Status.PENDING, reason=f"Stale claim reclaimed by {agent} ({int(age)}m)")
    loader.save_task(stale_task)

    return stale_task.id


def _display_task_details(task, show_file_contents=True):
    """Display detailed task information."""
    console.print(f"\n[bold]Task:[/] {task.id}")
    console.print(f"[bold]Title:[/] {task.title}")
    console.print(f"[bold]Status:[/] {task.status.value}")
    console.print(f"[bold]Estimate:[/] {task.estimate_hours} hours")
    console.print(f"[bold]Complexity:[/] {task.complexity.value}")
    console.print(f"[bold]Priority:[/] {task.priority.value}")

    if task.claimed_by:
        console.print(f"[bold]Claimed by:[/] {task.claimed_by}")

    console.print(f"\n[bold]File:[/] .tasks/{task.file}\n")

    if show_file_contents:
        task_file = Path(".tasks") / task.file
        if task_file.exists():
            with open(task_file) as f:
                content = f.read()

            console.print("─" * 50)
            console.print(f"[bold]Task File Contents[/]:")
            console.print("─" * 50)
            console.print(content)
            console.print("─" * 50 + "\n")


def _append_delegation_instructions(task, agent: str, primary_task) -> None:
    """Append delegation instructions to additional task's .todo file."""
    if not task or not primary_task:
        return

    task_file = Path(".tasks") / task.file
    if not task_file.exists():
        return

    instructions = f"""

## Delegation Instructions

**Delegated to subagent by**: {agent} (primary agent)
**Delegation date**: {utc_now().strftime("%Y-%m-%d %H:%M UTC")}
**Primary task**: {primary_task.id} - {primary_task.title}

**Instructions**:
This task was claimed as part of a multi-task batch. The primary agent ({agent})
should spawn a subagent to complete this task in parallel.

**Recommended approach**:
1. Use the Task tool with subagent_type to create a dedicated agent
2. Provide context from this task file as the prompt
3. Grant necessary tools for task completion
4. Monitor subagent progress
5. Aggregate results upon completion

**Independence verification**:
- Different epic: ✓ ({task.epic_id} vs {primary_task.epic_id})
- No dependency chain: ✓ (verified at claim time)
"""

    with open(task_file, "a") as f:
        f.write(instructions)


def _append_sibling_delegation_instructions(primary_task, sibling_tasks, agent: str) -> None:
    """Append sibling delegation instructions to the primary task's .todo file."""
    if not primary_task or not sibling_tasks:
        return

    task_file = Path(".tasks") / primary_task.file
    if not task_file.exists():
        return

    sibling_ids = [t.id for t in sibling_tasks]
    task_order = " → ".join([primary_task.id] + sibling_ids)

    instructions = f"""

## Sibling Batch Instructions

**Batch mode**: siblings (same epic: {primary_task.epic_id})
**Agent**: {agent}
**Date**: {utc_now().strftime("%Y-%m-%d %H:%M UTC")}
**Sibling tasks**: {", ".join(sibling_ids)}

**Instructions**:
This task is part of a sibling batch from the same epic.
Spawn ONE subagent to implement ALL sibling tasks sequentially.
Work through tasks in order: {task_order}
Mark each done individually after completion.

**Task files**:
"""

    for task in [primary_task] + sibling_tasks:
        instructions += f"- {task.id}: .tasks/{task.file}\n"

    with open(task_file, "a") as f:
        f.write(instructions)


def _display_grab_results(primary_task, additional_tasks, no_content: bool) -> None:
    """Display grab results with multi-task instructions."""
    if not primary_task:
        console.print(
            "[red]Error:[/] Primary task missing; cannot display grab results"
        )
        return

    additional_tasks = [task for task in (additional_tasks or []) if task]

    console.print(
        f"\n[green]✓ Grabbed PRIMARY:[/] {primary_task.id} - {primary_task.title}"
    )
    console.print(f"\n  Estimate:   {primary_task.estimate_hours} hours")
    console.print(f"  Complexity: {primary_task.complexity.value}")

    if additional_tasks:
        for i, task in enumerate(additional_tasks, 1):
            console.print(
                f"\n[green]✓ Grabbed ADDITIONAL #{i}:[/] {task.id} - {task.title}"
            )
            console.print(f"\n  Epic:       {task.epic_id}")
            console.print(f"  Estimate:   {task.estimate_hours} hours")
            console.print(f"  Independence: ✓ No dependency conflict")

        # Display multi-task workflow instructions
        console.print("\n" + "━" * 70)
        console.print("[bold]MULTI-TASK MODE INSTRUCTIONS[/]\n")
        console.print(
            f"You have claimed {len(additional_tasks) + 1} independent tasks. Recommended workflow:\n"
        )
        console.print(f"spawn subagents:\n")

        for task in [primary_task] + additional_tasks:
            console.print(f"   Spawn subagent for {task.id}:")
            console.print(f"   - Read task file: .tasks/{task.file}")
            console.print("   - Use Task tool with subagent to complete\n")

        console.print("3. Mark tasks done individually:")
        # console.print(f"   ./tasks.py done {primary_task.id}    # Primary")
        for task in [primary_task] + additional_tasks:
            console.print(f"   ./tasks.py done {task.id}    # After subagent completes")
        console.print("\n" + "━" * 70 + "\n")

    # Only show todo file contents for single task grabs.
    elif not no_content:
        _display_task_details(primary_task, show_file_contents=True)


def _display_sibling_grab_results(primary_task, sibling_tasks, no_content: bool) -> None:
    """Display grab results for sibling batch mode."""
    if not primary_task:
        console.print("[red]Error:[/] Primary task missing; cannot display grab results")
        return

    sibling_tasks = [task for task in (sibling_tasks or []) if task]

    console.print(
        f"\n[green]✓ Grabbed PRIMARY:[/] {primary_task.id} - {primary_task.title}"
    )
    console.print(f"\n  Estimate:   {primary_task.estimate_hours} hours")
    console.print(f"  Complexity: {primary_task.complexity.value}")

    if sibling_tasks:
        for i, task in enumerate(sibling_tasks, 1):
            console.print(
                f"\n[green]✓ Grabbed SIBLING #{i}:[/] {task.id} - {task.title}"
            )
            console.print(f"\n  Estimate:   {task.estimate_hours} hours")

        # Display sibling batch workflow instructions
        console.print("\n" + "━" * 70)
        console.print("[bold]SIBLING BATCH MODE INSTRUCTIONS[/]\n")
        console.print(
            f"You have claimed {len(sibling_tasks) + 1} sibling tasks from epic {primary_task.epic_id}.\n"
        )
        console.print("Spawn ONE subagent to implement ALL tasks sequentially:\n")

        task_order = " → ".join(
            [primary_task.id] + [t.id for t in sibling_tasks]
        )
        console.print(f"   Order: {task_order}\n")

        for task in [primary_task] + sibling_tasks:
            console.print(f"   - {task.id}: .tasks/{task.file}")

        console.print(f"\nMark tasks done individually:")
        for task in [primary_task] + sibling_tasks:
            console.print(f"   ./tasks.py done {task.id}")
        console.print("\n" + "━" * 70 + "\n")

    elif not no_content:
        _display_task_details(primary_task, show_file_contents=True)


@click.command()
@click.option("--agent", help="Agent session ID (uses config default if not set)")
@click.option("--scope", help="Filter by scope (phase/milestone/epic ID)")
@click.option("--no-content", is_flag=True, help="Suppress .todo file contents")
@click.option("--multi", is_flag=True, help="Claim up to 3 independent tasks from different epics")
@click.option("--single", is_flag=True, help="Claim only 1 task (disable batching)")
@click.option("--siblings/--no-siblings", default=True, help="Enable/disable sibling batching (default: enabled)")
@click.option(
    "--count", default=2, type=int, help="Number of additional tasks (with --multi)"
)
def grab(agent, scope, no_content, multi, single, siblings, count):
    """Auto-claim the next available task on critical path.

    Combines 'next' + 'claim' into a single command.

    By default, claims the primary task plus up to 4 sibling tasks from the
    same epic for sequential implementation. Use --single to claim only 1 task,
    or --multi for independent tasks from different epics.
    """
    try:
        # Use config default if agent not specified
        if not agent:
            agent = get_default_agent()
        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, next_available = calc.calculate()

        if not next_available:
            console.print("[yellow]No available tasks found.[/]\n")

            # Try to reclaim a stale task
            next_available = _find_and_reclaim_stale_task(tree, config, agent, loader)

            if not next_available:
                # Check for in-progress tasks that may be blocking
                in_progress = []
                for phase in tree.phases:
                    for milestone in phase.milestones:
                        for epic in milestone.epics:
                            for t in epic.tasks:
                                if t.status == Status.IN_PROGRESS:
                                    in_progress.append(t)

                if in_progress:
                    console.print(f"[dim]{len(in_progress)} task(s) are in progress:[/]")
                    for t in in_progress[:5]:
                        console.print(f"  [yellow]{t.id}[/] - {t.claimed_by or 'unknown'}")
                    if len(in_progress) > 5:
                        console.print(f"  ... and {len(in_progress) - 5} more")
                return

        # Filter by scope if provided
        if scope:
            # Find next available within scope
            all_available = calc.find_all_available()
            scoped = [t for t in all_available if t.startswith(scope)]
            if scoped:
                prioritized_scoped = calc.prioritize_task_ids(scoped, critical_path)
                next_available = prioritized_scoped[0] if prioritized_scoped else None
            else:
                console.print(f"[yellow]No available tasks in scope '{scope}'[/]")
                return

        # Get the primary task
        primary_task = tree.find_task(next_available)
        if not primary_task:
            console.print(f"[red]Task not found: {next_available}[/]\n")
            return

        # Claim primary task
        claim_task(primary_task, agent)
        loader.save_task(primary_task)

        additional_tasks = []
        sibling_task_objs = []

        # Determine mode: --single > --multi > default (siblings)
        if single:
            # Single-task mode: just claim the primary
            set_current_task(primary_task.id, agent)
        elif multi:
            # Multi-task mode: find independent tasks from different epics
            additional_task_ids = calc.find_independent_tasks(primary_task, count)

            if additional_task_ids:
                # Claim additional tasks
                for task_id in additional_task_ids:
                    task = tree.find_task(task_id)
                    if task:
                        claim_task(task, agent)
                        loader.save_task(task)
                        additional_tasks.append(task)

                        # Append delegation instructions to task file
                        _append_delegation_instructions(task, agent, primary_task)

                # Set multi-task context based on claimed tasks
                claimed_additional_ids = [task.id for task in additional_tasks]
                if claimed_additional_ids:
                    set_multi_task_context(
                        agent, primary_task.id, claimed_additional_ids
                    )
                else:
                    set_current_task(primary_task.id, agent)
            else:
                console.print(
                    "[yellow]Warning: No independent tasks available for multi-grab[/]\n"
                )
                set_current_task(primary_task.id, agent)
        elif siblings:
            # Sibling mode (DEFAULT): find tasks from same epic
            sibling_task_ids = calc.find_sibling_tasks(
                primary_task, count=DEFAULT_SIBLING_ADDITIONAL_COUNT
            )

            if sibling_task_ids:
                for task_id in sibling_task_ids:
                    task = tree.find_task(task_id)
                    if task:
                        claim_task(task, agent)
                        loader.save_task(task)
                        sibling_task_objs.append(task)

                claimed_sibling_ids = [task.id for task in sibling_task_objs]
                if claimed_sibling_ids:
                    set_sibling_task_context(
                        agent, primary_task.id, claimed_sibling_ids
                    )
                    _append_sibling_delegation_instructions(
                        primary_task, sibling_task_objs, agent
                    )
                else:
                    set_current_task(primary_task.id, agent)
            else:
                # No siblings available, fall back to single
                set_current_task(primary_task.id, agent)
        else:
            # --no-siblings explicitly: single task mode
            set_current_task(primary_task.id, agent)

        # Display results
        if sibling_task_objs:
            _display_sibling_grab_results(primary_task, sibling_task_objs, no_content)
        else:
            _display_grab_results(primary_task, additional_tasks, no_content)

        start_session(agent, primary_task.id)

    except StatusError as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@click.command()
@click.argument("task_id", required=False)
@click.option("--agent", help="Agent session ID (uses config default if not set)")
@click.option("--no-content", is_flag=True, help="Suppress .todo file contents")
def cycle(task_id, agent, no_content):
    """Mark task done and grab the next one.

    Combines 'done' + 'grab' into a single command.
    If TASK_ID is not provided, uses the current working task from context.
    """
    try:
        # Use config default if agent not specified
        if not agent:
            agent = get_default_agent()

        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        # Get task ID from context if not provided
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

        task = tree.find_task(task_id)
        if not task:
            console.print(f"[red]Error:[/] Task not found: {task_id}")
            raise click.Abort()

        # Skip if already done
        if task.status == Status.DONE:
            console.print(f"[yellow]⚠ Already done:[/] {task.id} - {task.title}")
        else:
            # Calculate duration
            duration = None
            if task.started_at:
                started = to_utc(task.started_at)
                duration = (utc_now() - started).total_seconds() / 60
                task.duration_minutes = duration

            # Complete the task
            complete_task(task)
            loader.save_task(task)

            console.print(f"\n[green]✓ Completed:[/] {task.id} - {task.title}")
            if duration:
                console.print(f"  Duration: {int(duration)} minutes")

        # Show what was unblocked
        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        unblocked = find_newly_unblocked(tree, calc, task_id)
        if unblocked:
            console.print(f"\n[cyan]Unblocked {len(unblocked)} task(s):[/]")
            for t in unblocked[:3]:
                console.print(f"  → {t.id}: {t.title}")
            if len(unblocked) > 3:
                console.print(f"  ... and {len(unblocked) - 3} more")

        # Check epic/milestone completion and print review instructions
        completion_status = print_completion_notices(console, tree, task)

        # Don't auto-grab if epic or milestone completed - user should review first
        if (
            completion_status["epic_completed"]
            or completion_status["milestone_completed"]
        ):
            console.print("─" * 50)
            console.print()
            console.print("[bold yellow]⚠ Review Required[/]")
            console.print("  Please review the completed work before continuing.")
            console.print()
            console.print("[dim]After review, grab next task:[/] './tasks.py grab'")
            console.print()
            clear_context()
            return

        # Handle sibling-task context
        sibling_primary, sibling_tasks = get_sibling_tasks(agent)

        if sibling_primary and (task_id == sibling_primary or task_id in sibling_tasks):
            if task_id == sibling_primary and sibling_tasks:
                # Primary completed, promote first sibling to primary
                new_primary = sibling_tasks[0]
                new_siblings = sibling_tasks[1:]

                if new_siblings:
                    set_sibling_task_context(agent, new_primary, new_siblings)
                else:
                    set_current_task(new_primary, agent)

                console.print(
                    f"\n[yellow]Primary sibling completed. Next sibling:[/] {new_primary}\n"
                )
                return
            elif task_id in sibling_tasks:
                # Sibling completed, remove from list
                new_siblings = [t for t in sibling_tasks if t != task_id]
                if new_siblings:
                    set_sibling_task_context(agent, sibling_primary, new_siblings)
                else:
                    set_current_task(sibling_primary, agent)
                console.print(
                    f"[yellow]Sibling task completed. Returning to primary:[/] {sibling_primary}\n"
                )
                return
            elif task_id == sibling_primary and not sibling_tasks:
                # Last task in batch completed - clear context and grab next
                pass  # Fall through to normal grab logic below

        # Handle multi-task context
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
            return
        elif task_id in additional:
            # Additional task completed, remove from list
            new_additional = [t for t in additional if t != task_id]
            if new_additional:
                set_multi_task_context(agent, primary, new_additional)
            else:
                set_current_task(primary, agent)
            console.print(
                f"[yellow]Additional task completed. Returning to primary:[/] {primary}\n"
            )
            return

        # Now grab next task
        console.print("─" * 50)

        # Recalculate after completing task
        tree = loader.load()  # Reload to get fresh state
        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, next_available = calc.calculate()

        if not next_available:
            console.print("\n[yellow]No more available tasks.[/]")

            # Try to reclaim a stale task
            next_available = _find_and_reclaim_stale_task(tree, config, agent, loader)

            if not next_available:
                clear_context()
                return

        next_task = tree.find_task(next_available)
        if not next_task:
            console.print(f"[red]Error:[/] Next task not found: {next_available}")
            return

        # Claim the next task
        claim_task(next_task, agent, force=False)
        loader.save_task(next_task)

        # Update context
        set_current_task(next_task.id, agent)
        start_session(agent, next_task.id)

        on_critical = next_task.id in critical_path
        crit_marker = " [yellow]★ Critical Path[/]" if on_critical else ""

        console.print(
            f"\n[green]✓ Grabbed:[/] {next_task.id} - {next_task.title}{crit_marker}\n"
        )
        console.print(f"  Estimate:   {next_task.estimate_hours} hours")
        console.print(f"  Complexity: {next_task.complexity.value}")
        console.print(f"  Priority:   {next_task.priority.value}\n")

        console.print(f"[bold]File:[/] .tasks/{next_task.file}\n")

        if not no_content:
            task_file = Path(".tasks") / next_task.file
            if task_file.exists():
                with open(task_file) as f:
                    content = f.read()

                console.print("─" * 50)
                console.print(f"[bold]Task File Contents[/]:")
                console.print("─" * 50)
                console.print(content)
                console.print("─" * 50 + "\n")

    except StatusError as e:
        console.print(json.dumps(e.to_dict(), indent=2))
        raise click.Abort()
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@click.command()
@click.argument("task_id", required=False)
@click.option("--clear", "clear_ctx", is_flag=True, help="Clear current working task")
def work(task_id, clear_ctx):
    """Set or show the current working task.

    Without arguments, shows the current working task.
    With TASK_ID, sets that as the current working task.
    With --clear, clears the working task context.
    """
    try:
        if clear_ctx:
            clear_context()
            console.print("[green]✓ Cleared working task context.[/]")
            return

        if task_id:
            # Set working task
            loader = TaskLoader()
            tree = loader.load()
            task = tree.find_task(task_id)

            if not task:
                console.print(f"[red]Error:[/] Task not found: {task_id}")
                raise click.Abort()

            set_current_task(task_id)
            console.print(f"\n[green]✓ Working task set:[/] {task.id} - {task.title}\n")
            console.print(f"  Status:     {task.status.value}")
            console.print(f"  Estimate:   {task.estimate_hours} hours")
            console.print(f"  File:       .tasks/{task.file}\n")
            console.print(f"[dim]Commands now use this task by default.[/]")
            console.print(f"[dim]Clear with:[/] './tasks.py work --clear'\n")
        else:
            # Show current working task
            ctx = load_context()
            current = ctx.get("current_task")

            if not current:
                console.print("[dim]No current working task set.[/]")
                console.print("[dim]Set with:[/] './tasks.py work <task-id>'")
                return

            loader = TaskLoader()
            tree = loader.load()
            task = tree.find_task(current)

            if not task:
                console.print(
                    f"[yellow]Warning:[/] Working task '{current}' not found in tree."
                )
                console.print("[dim]Clear with:[/] './tasks.py work --clear'")
                return

            started = ctx.get("started_at")
            agent = ctx.get("agent", "unknown")

            console.print(f"\n[bold cyan]Current Working Task[/]\n")
            console.print(f"  [bold]ID:[/]         {task.id}")
            console.print(f"  [bold]Title:[/]      {task.title}")
            console.print(f"  [bold]Status:[/]     {task.status.value}")
            console.print(f"  [bold]Agent:[/]      {agent}")
            if started:
                console.print(f"  [bold]Started:[/]    {started}")
            console.print(f"  [bold]Estimate:[/]   {task.estimate_hours} hours")
            console.print(f"  [bold]File:[/]       .tasks/{task.file}\n")

            console.print(f"[dim]Mark done:[/] './tasks.py done'")
            console.print(f"[dim]Done + next:[/] './tasks.py cycle'")
            console.print(f"[dim]Clear context:[/] './tasks.py work --clear'\n")

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@click.command()
@click.argument("task_id", required=False)
@click.option("--reason", "-r", required=True, help="Reason for blocking")
@click.option("--agent", help="Agent session ID (uses config default if not set)")
@click.option("--no-grab", is_flag=True, help="Don't auto-grab next task")
def blocked(task_id, reason, agent, no_grab):
    """Mark task as blocked and grab the next one.

    If TASK_ID is not provided, uses the current working task.
    """
    try:
        from ..status import update_status

        # Use config default if agent not specified
        if not agent:
            agent = get_default_agent()

        # Get task ID from context if not provided
        if not task_id:
            task_id = get_current_task_id()
            if not task_id:
                console.print(
                    "[red]Error:[/] No task ID provided and no current working task set."
                )
                raise click.Abort()

        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        task = tree.find_task(task_id)
        if not task:
            console.print(f"[red]Error:[/] Task not found: {task_id}")
            raise click.Abort()

        # Mark as blocked
        from ..models import Status

        update_status(task, Status.BLOCKED, reason)
        loader.save_task(task)

        console.print(f"\n[yellow]✗ Blocked:[/] {task.id} - {task.title}")
        console.print(f"  Reason: {reason}\n")

        # Clear context
        clear_context()

        if no_grab:
            return

        # Grab next task
        console.print("─" * 50)

        tree = loader.load()  # Reload
        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, next_available = calc.calculate()

        if not next_available:
            console.print("\n[yellow]No more available tasks.[/]")

            # Try to reclaim a stale task
            next_available = _find_and_reclaim_stale_task(tree, config, agent, loader)

            if not next_available:
                return

        next_task = tree.find_task(next_available)
        if not next_task:
            return

        claim_task(next_task, agent, force=False)
        loader.save_task(next_task)
        set_current_task(next_task.id, agent)
        start_session(agent, next_task.id)

        console.print(f"\n[green]✓ Grabbed:[/] {next_task.id} - {next_task.title}")
        console.print(f"  File: .tasks/{next_task.file}\n")

    except StatusError as e:
        console.print(json.dumps(e.to_dict(), indent=2))
        raise click.Abort()
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@click.command()
@click.argument("task_id", required=False)
@click.option("--agent", help="Agent session ID (uses config default if not set)")
@click.option("--no-grab", is_flag=True, help="Don't auto-grab next task")
def skip(task_id, agent, no_grab):
    """Unclaim task without completing and grab the next one.

    Useful when you can't complete a task but don't want to mark it blocked.
    If TASK_ID is not provided, uses the current working task.
    """
    try:
        from ..status import update_status

        # Use config default if agent not specified
        if not agent:
            agent = get_default_agent()

        # Get task ID from context if not provided
        if not task_id:
            task_id = get_current_task_id()
            if not task_id:
                console.print(
                    "[red]Error:[/] No task ID provided and no current working task set."
                )
                raise click.Abort()

        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        task = tree.find_task(task_id)
        if not task:
            console.print(f"[red]Error:[/] Task not found: {task_id}")
            raise click.Abort()

        # Return to pending (unclaim)
        from ..models import Status

        if not _reset_task_to_pending(task, loader):
            console.print(f"[yellow]Task is not in progress:[/] {task.status.value}")
            return

        console.print(f"\n[cyan]↩ Skipped:[/] {task.id} - {task.title}")
        console.print(f"  Status: in_progress → pending (unclaimed)\n")

        # Clear context
        clear_context()

        if no_grab:
            return

        # Grab next task
        console.print("─" * 50)

        tree = loader.load()  # Reload
        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, next_available = calc.calculate()

        if not next_available:
            console.print("\n[yellow]No more available tasks.[/]")

            # Try to reclaim a stale task
            next_available = _find_and_reclaim_stale_task(tree, config, agent, loader)

            if not next_available:
                return

        next_task = tree.find_task(next_available)
        if not next_task:
            return

        claim_task(next_task, agent, force=False)
        loader.save_task(next_task)
        set_current_task(next_task.id, agent)
        start_session(agent, next_task.id)

        console.print(f"\n[green]✓ Grabbed:[/] {next_task.id} - {next_task.title}")
        console.print(f"  File: .tasks/{next_task.file}\n")

    except StatusError as e:
        console.print(json.dumps(e.to_dict(), indent=2))
        raise click.Abort()
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def _reset_task_to_pending(task, loader):
    from ..models import Status

    if task.status == Status.IN_PROGRESS:
        update_status(task, Status.PENDING)
        loader.save_task(task)
        return True

    return False


@click.command()
@click.argument("task_id", required=False)
@click.option("--agent", help="Agent session ID (uses config default if not set)")
def unclaim(task_id, agent):
    """Return a task to pending (unclaimed) without grabbing another."""
    try:
        if not agent:
            agent = get_default_agent()

        if not task_id:
            task_id = get_current_task_id()
            if not task_id:
                console.print(
                    "[red]Error:[/] No task ID provided and no current working task set."
                )
                raise click.Abort()

        loader = TaskLoader()
        tree = loader.load()

        task = tree.find_task(task_id)
        if not task:
            console.print(f"[red]Error:[/] Task not found: {task_id}")
            raise click.Abort()

        if not _reset_task_to_pending(task, loader):
            console.print(f"[yellow]Task is not in progress:[/] {task.status.value}")
            return

        console.print(f"\n[cyan]↩ Unclaimed:[/] {task.id} - {task.title}")
        console.print(f"  Status: in_progress → pending (unclaimed)\n")

        clear_context()

    except StatusError as e:
        console.print(json.dumps(e.to_dict(), indent=2))
        raise click.Abort()
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@click.command()
@click.argument("task_id", required=False)
@click.option("--to", "to_agent", required=True, help="Agent to hand off to")
@click.option("--notes", "-n", help="Handoff notes for the receiving agent")
@click.option("--force", is_flag=True, help="Force handoff even if task is not yours")
def handoff(task_id, to_agent, notes, force):
    """Hand off a task to another agent with notes.

    Transfers ownership of a task to another agent, optionally
    including notes about current progress or context.

    If TASK_ID is not provided, uses the current working task.

    Examples:
        ./tasks.py handoff --to=agent-2 --notes="Auth logic done, needs tests"
        ./tasks.py handoff P1.M1.E1.T003 --to=agent-2
    """
    try:
        from datetime import datetime

        # Get task ID from context if not provided
        if not task_id:
            task_id = get_current_task_id()
            if not task_id:
                console.print(
                    "[red]Error:[/] No task ID provided and no current working task set."
                )
                raise click.Abort()

        loader = TaskLoader()
        tree = loader.load()

        task = tree.find_task(task_id)
        if not task:
            console.print(f"[red]Error:[/] Task not found: {task_id}")
            raise click.Abort()

        # Check ownership
        ctx = load_context()
        current_agent = ctx.get("agent", "cli-user")

        if task.claimed_by and task.claimed_by != current_agent and not force:
            console.print(
                f"[red]Error:[/] Task is claimed by '{task.claimed_by}', not you."
            )
            console.print("[dim]Use --force to override.[/]")
            raise click.Abort()

        if task.status == Status.DONE:
            console.print(f"[yellow]Warning:[/] Task is already done.")
            return

        # Record handoff in task file
        task_file = Path(".tasks") / task.file
        if task_file.exists() and notes:
            with open(task_file, "r") as f:
                content = f.read()

            # Add handoff note
            handoff_note = f"""

## Handoff Notes

**From:** {current_agent}
**To:** {to_agent}
**Date:** {utc_now().strftime("%Y-%m-%d %H:%M UTC")}

{notes}
"""
            # Append to file
            with open(task_file, "a") as f:
                f.write(handoff_note)

        # Transfer ownership
        old_owner = task.claimed_by
        task.claimed_by = to_agent
        task.claimed_at = utc_now()

        # Keep status as in_progress
        if task.status == Status.PENDING:
            task.status = Status.IN_PROGRESS
            task.started_at = utc_now()

        loader.save_task(task)

        # Clear context for the handing-off agent
        clear_context()

        console.print(f"\n[green]✓ Handed off:[/] {task.id} - {task.title}\n")
        console.print(f"  From: {old_owner or current_agent}")
        console.print(f"  To:   {to_agent}")
        if notes:
            console.print(f"  Notes: {notes[:60]}{'...' if len(notes) > 60 else ''}")
        console.print(f"\n[bold]File:[/] .tasks/{task.file}")

        if notes:
            console.print(f"[dim]Handoff notes appended to task file.[/]")
        console.print()

    except StatusError as e:
        console.print(json.dumps(e.to_dict(), indent=2))
        raise click.Abort()
    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@click.command()
@click.argument("task_id")
def why(task_id):
    """Explain why a task is blocked or on the critical path.

    Shows the dependency chain and what needs to happen for this task.
    """
    try:
        loader = TaskLoader()
        tree = loader.load()
        config = load_config()

        task = tree.find_task(task_id)
        if not task:
            console.print(f"[red]Error:[/] Task not found: {task_id}")
            raise click.Abort()

        calc = CriticalPathCalculator(tree, config["complexity_multipliers"])
        critical_path, _ = calc.calculate()

        console.print(f"\n[bold]{task.id}[/] - {task.title}")
        console.print(f"Status: {task.status.value}")

        if task.status.value == "done":
            console.print("[green]✓ This task is complete.[/]\n")
            return

        # Check if on critical path
        if task.id in critical_path:
            pos = critical_path.index(task.id)
            console.print(
                f"\n[yellow]★ ON CRITICAL PATH[/] (position {pos + 1} of {len(critical_path)})"
            )
            console.print("  Delaying this task delays the entire project.")

        # Check dependencies
        if task.depends_on:
            console.print(f"\n[bold]Explicit dependencies:[/]")
            all_satisfied = True
            for dep_id in task.depends_on:
                dep = tree.find_task(dep_id)
                if dep:
                    if dep.status.value == "done":
                        console.print(f"  [green]✓[/] {dep_id} - {dep.title} (done)")
                    else:
                        console.print(
                            f"  [red]✗[/] {dep_id} - {dep.title} ({dep.status.value})"
                        )
                        all_satisfied = False
                else:
                    console.print(f"  [red]?[/] {dep_id} - not found")
                    all_satisfied = False

            if all_satisfied:
                console.print("  [green]All explicit dependencies satisfied.[/]")

        # Check implicit dependency (previous task in epic)
        epic = tree.find_epic(task.epic_id)
        if epic:
            task_idx = next(
                (i for i, t in enumerate(epic.tasks) if t.id == task_id), None
            )
            if task_idx and task_idx > 0 and not task.depends_on:
                prev = epic.tasks[task_idx - 1]
                console.print(f"\n[bold]Implicit dependency (previous in epic):[/]")
                if prev.status.value == "done":
                    console.print(f"  [green]✓[/] {prev.id} - {prev.title} (done)")
                else:
                    console.print(
                        f"  [red]✗[/] {prev.id} - {prev.title} ({prev.status.value})"
                    )

        # Determine if task can be started
        can_start = calc._check_dependencies(task)
        if can_start:
            if task.status.value == "pending":
                if task.claimed_by:
                    console.print(f"\n[yellow]Task is claimed by {task.claimed_by}[/]")
                else:
                    console.print(f"\n[green]✓ Task can be started![/]")
                    console.print(f"  Run: ./tasks.py grab {task.id}")
            elif task.status.value == "in_progress":
                console.print(f"\n[yellow]Task is in progress[/]")
                console.print(f"  Claimed by: {task.claimed_by}")
        else:
            console.print(f"\n[red]Task is blocked on dependencies.[/]")

        console.print()

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def register_commands(cli):
    """Register workflow commands with the CLI."""
    cli.add_command(grab)
    cli.add_command(cycle)
    cli.add_command(work)
    cli.add_command(blocked)
    cli.add_command(skip)
    cli.add_command(handoff)
    cli.add_command(unclaim)
    cli.add_command(why)
