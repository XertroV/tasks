"""Report commands: report progress, velocity, estimate-accuracy."""

import click
import json
from datetime import timedelta
from collections import defaultdict
from rich.console import Console
from rich.table import Table

from ..models import Status
from ..loader import TaskLoader
from ..helpers import get_all_tasks, make_progress_bar, format_duration
from ..time_utils import utc_now, to_utc

console = Console()


def _print_report_commands():
    """Print available report subcommands."""
    console.print("[bold]Report commands:[/]")
    console.print("  - progress")
    console.print("  - velocity")
    console.print("  - estimate-accuracy")


def _run_default_report():
    """Run default report output and print available subcommands."""
    ctx = click.get_current_context()
    ctx.invoke(
        progress,
        output_format="text",
        by_phase=False,
        by_milestone=False,
        by_epic=False,
        show_all=False,
    )
    _print_report_commands()
    console.print()


@click.group(invoke_without_command=True)
def report():
    """Generate summary reports.

    Aliases: p=progress, v=velocity, ea=estimate-accuracy.
    """
    ctx = click.get_current_context()
    if ctx.invoked_subcommand is None:
        _run_default_report()


@click.group("r", invoke_without_command=True, hidden=True)
def report_alias():
    """Short alias for report commands.

    Usage: r p | r v | r ea
    """
    ctx = click.get_current_context()
    if ctx.invoked_subcommand is None:
        _run_default_report()


def _remaining_hours(tasks):
    """Sum estimate_hours for incomplete tasks."""
    return sum(t.estimate_hours for t in tasks if t.status != Status.DONE)


def _phase_tasks(phase):
    """Get all tasks in a phase."""
    return [t for m in phase.milestones for e in m.epics for t in e.tasks]


def _milestone_tasks(milestone):
    """Get all tasks in a milestone."""
    return [t for e in milestone.epics for t in e.tasks]


@report.command()
@click.option(
    "--format", "output_format", type=click.Choice(["text", "json"]), default="text"
)
@click.option("--by-phase", is_flag=True, help="Group by phase (default)")
@click.option("--by-milestone", is_flag=True, help="Show milestones within phases")
@click.option("--by-epic", is_flag=True, help="Show epics within milestones")
@click.option(
    "--all", "show_all", is_flag=True, help="Include completed phases/milestones/epics"
)
def progress(output_format, by_phase, by_milestone, by_epic, show_all):
    """Show overall progress report.

    Displays completion statistics across the project.
    """
    try:
        loader = TaskLoader()
        tree = loader.load()

        stats = tree.stats
        total = stats["total_tasks"]
        done = stats["done"]
        in_prog = stats["in_progress"]
        pending = stats["pending"]
        blocked = stats["blocked"]

        pct = (done / total * 100) if total > 0 else 0

        # Compute detail level
        if by_epic:
            detail_level = 3
        elif by_milestone:
            detail_level = 2
        else:
            detail_level = 1

        all_tasks = get_all_tasks(tree)
        overall_remaining = _remaining_hours(all_tasks)

        if output_format == "json":
            output = {
                "overall": {
                    "total": total,
                    "done": done,
                    "in_progress": in_prog,
                    "pending": pending,
                    "blocked": blocked,
                    "percent_complete": round(pct, 1),
                    "remaining_hours": round(overall_remaining, 1),
                },
                "phases": [],
            }

            for phase in tree.phases:
                p_stats = phase.stats
                p_total = p_stats["total_tasks"]
                p_done = p_stats["done"]
                p_pct = (p_done / p_total * 100) if p_total > 0 else 0

                if p_done == p_total and p_total > 0 and not show_all:
                    continue

                p_remaining = _remaining_hours(_phase_tasks(phase))
                phase_data = {
                    "id": phase.id,
                    "name": phase.name,
                    "total": p_total,
                    "done": p_done,
                    "in_progress": p_stats["in_progress"],
                    "pending": p_stats["pending"],
                    "blocked": p_stats["blocked"],
                    "percent_complete": round(p_pct, 1),
                    "remaining_hours": round(p_remaining, 1),
                }

                if detail_level >= 2:
                    phase_data["milestones"] = []
                    for m in phase.milestones:
                        m_stats = m.stats
                        m_total = m_stats["total_tasks"]
                        m_done = m_stats["done"]
                        m_pct = (m_done / m_total * 100) if m_total > 0 else 0

                        if m_done == m_total and m_total > 0 and not show_all:
                            continue

                        m_remaining = _remaining_hours(_milestone_tasks(m))
                        m_data = {
                            "id": m.id,
                            "name": m.name,
                            "total": m_total,
                            "done": m_done,
                            "in_progress": m_stats["in_progress"],
                            "pending": m_stats["pending"],
                            "blocked": m_stats["blocked"],
                            "percent_complete": round(m_pct, 1),
                            "remaining_hours": round(m_remaining, 1),
                        }

                        if detail_level >= 3:
                            m_data["epics"] = []
                            for e in m.epics:
                                e_stats = e.stats
                                e_total = e_stats["total"]
                                e_done = e_stats["done"]
                                e_pct = (e_done / e_total * 100) if e_total > 0 else 0

                                if e_done == e_total and e_total > 0 and not show_all:
                                    continue

                                e_remaining = _remaining_hours(e.tasks)
                                m_data["epics"].append(
                                    {
                                        "id": e.id,
                                        "name": e.name,
                                        "total": e_total,
                                        "done": e_done,
                                        "in_progress": e_stats["in_progress"],
                                        "pending": e_stats["pending"],
                                        "blocked": e_stats["blocked"],
                                        "percent_complete": round(e_pct, 1),
                                        "remaining_hours": round(e_remaining, 1),
                                    }
                                )

                        phase_data["milestones"].append(m_data)

                output["phases"].append(phase_data)

            click.echo(json.dumps(output, indent=2))
            return

        # Text output
        console.print("\n[bold cyan]Progress Report[/]\n")

        # Overall progress
        bar = make_progress_bar(done, total, width=30)
        console.print(f"[bold]Overall:[/] {bar} {pct:5.1f}%")
        console.print(
            f"  Done: {done} | In Progress: {in_prog} | Pending: {pending} | Blocked: {blocked}"
        )
        remaining_str = f"  Total: {total} tasks"
        if overall_remaining > 0:
            remaining_str += f" | ~{overall_remaining:.1f}h remaining"
        console.print(remaining_str + "\n")

        # Check if all phases are complete
        all_complete = (
            all(
                p.stats["done"] == p.stats["total_tasks"] and p.stats["total_tasks"] > 0
                for p in tree.phases
            )
            if tree.phases
            else False
        )

        if all_complete and not show_all:
            console.print(
                "[green]All phases complete.[/] Use --all to show completed phases."
            )
            console.print()
            return

        # By phase
        console.print("[bold]By Phase:[/]")
        for phase in tree.phases:
            p_stats = phase.stats
            p_total = p_stats["total_tasks"]
            p_done = p_stats["done"]
            p_pct = (p_done / p_total * 100) if p_total > 0 else 0

            if p_done == p_total and p_total > 0 and not show_all:
                continue

            bar = make_progress_bar(p_done, p_total, width=20)

            if p_pct == 100:
                status = "[green]✓[/]"
            elif p_stats["in_progress"] > 0:
                status = "[yellow]→[/]"
            else:
                status = "[ ]"

            console.print(f"\n  {status} [bold]{phase.id}[/] {phase.name}")
            p_remaining = _remaining_hours(_phase_tasks(phase))
            p_bar_line = f"      {bar} {p_pct:5.1f}% ({p_done}/{p_total})"
            if p_remaining > 0:
                p_bar_line += f"  ~{p_remaining:.1f}h remaining"
            console.print(p_bar_line)

            if detail_level >= 2:
                for m in phase.milestones:
                    m_stats = m.stats
                    m_total = m_stats["total_tasks"]
                    m_done = m_stats["done"]
                    m_pct = (m_done / m_total * 100) if m_total > 0 else 0

                    if m_done == m_total and m_total > 0 and not show_all:
                        continue

                    m_bar = make_progress_bar(m_done, m_total, width=15)
                    m_remaining = _remaining_hours(_milestone_tasks(m))
                    m_line = f"        {m.id}: {m_bar} {m_pct:4.0f}% ({m_done}/{m_total}) - {m.name}"
                    if m_remaining > 0:
                        m_line += f"  ~{m_remaining:.1f}h remaining"
                    console.print(m_line)

                    if detail_level >= 3:
                        for e in m.epics:
                            e_stats = e.stats
                            e_total = e_stats["total"]
                            e_done = e_stats["done"]
                            e_pct = (e_done / e_total * 100) if e_total > 0 else 0

                            if e_done == e_total and e_total > 0 and not show_all:
                                continue

                            e_bar = make_progress_bar(e_done, e_total, width=10)
                            e_remaining = _remaining_hours(e.tasks)
                            e_line = f"            {e.id}: {e_bar} {e_pct:4.0f}% ({e_done}/{e_total}) - {e.name}"
                            if e_remaining > 0:
                                e_line += f"  ~{e_remaining:.1f}h remaining"
                            console.print(e_line)

        console.print()

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@report.command("p", hidden=True)
@click.option(
    "--format", "output_format", type=click.Choice(["text", "json"]), default="text"
)
@click.option("--by-phase", is_flag=True, help="Group by phase (default)")
@click.option("--by-milestone", is_flag=True, help="Show milestones within phases")
@click.option("--by-epic", is_flag=True, help="Show epics within milestones")
@click.option(
    "--all", "show_all", is_flag=True, help="Include completed phases/milestones/epics"
)
def progress_alias(output_format, by_phase, by_milestone, by_epic, show_all):
    """Hidden alias for `report progress`."""
    ctx = click.get_current_context()
    ctx.invoke(
        progress,
        output_format=output_format,
        by_phase=by_phase,
        by_milestone=by_milestone,
        by_epic=by_epic,
        show_all=show_all,
    )


def _render_velocity_histogram(velocity_data, num_periods, label_fn, display_max):
    """Render velocity histogram for text output.

    Args:
        velocity_data: Dict mapping period index to {"estimate_hours", "duration_hours", "count"}
        num_periods: Number of periods to display
        label_fn: Function that takes period index and returns display label
        display_max: Max velocity for bar scaling
    """
    # Calculate velocities
    velocities = []
    for i in range(num_periods):
        vdata = velocity_data[i]
        if vdata["duration_hours"] > 0:
            velocities.append(vdata["estimate_hours"] / vdata["duration_hours"])
        else:
            velocities.append(None)

    # Render each period
    for i in range(num_periods):
        vdata = velocity_data[i]
        label = label_fn(i)

        if vdata["duration_hours"] > 0:
            velocity = velocities[i]

            # Calculate bar (cap at display_max for visualization)
            display_velocity = min(velocity, display_max)
            bar_len = int(20 * display_velocity / display_max) if display_max > 0 else 0
            bar = "█" * bar_len + "░" * (20 - bar_len)

            # Color code based on efficiency
            if velocity >= 1.2:
                color = "green"
            elif velocity >= 0.8:
                color = "yellow"
            else:
                color = "red"

            console.print(
                f"  {label:13} {bar} [{color}]{velocity:.1f}x[/] "
                f"({vdata['estimate_hours']:.1f}h est / {vdata['duration_hours']:.1f}h actual)"
            )
        else:
            bar = "░" * 20
            console.print(f"  {label:13} {bar} [dim]no data[/]")

    return velocities


def _calculate_velocity_summary(velocity_data, num_periods):
    """Calculate summary statistics for velocity data.

    Returns: (total_estimate, total_actual, max_velocity)
    """
    total_est = sum(velocity_data[i]["estimate_hours"] for i in range(num_periods))
    total_act = sum(velocity_data[i]["duration_hours"] for i in range(num_periods))

    max_velocity = 0
    for i in range(num_periods):
        vdata = velocity_data[i]
        if vdata["duration_hours"] > 0:
            velocity = vdata["estimate_hours"] / vdata["duration_hours"]
            max_velocity = max(max_velocity, velocity)

    return total_est, total_act, max_velocity


def _make_day_buckets(now, num_days):
    """Return list of (start, end) tuples for calendar day buckets.

    Bucket 0 is today, bucket 1 is yesterday, etc.
    """
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    buckets = []
    for d in range(num_days):
        day_start = today_start - timedelta(days=d)
        day_end = day_start + timedelta(days=1)
        buckets.append((day_start, day_end))
    return buckets


def _make_static_hour_buckets(now, hours_to_show, bucket_hours):
    """Return list of (start, end) tuples for static clock-aligned hour buckets.

    Buckets align to clock boundaries (e.g., 00:00, 04:00, 08:00 for 4-hour buckets).
    Bucket 0 is the current period, bucket 1 is the previous, etc.
    """
    current_hour = now.hour
    bucket_start_hour = (current_hour // bucket_hours) * bucket_hours
    current_bucket_start = now.replace(
        hour=bucket_start_hour, minute=0, second=0, microsecond=0
    )

    num_buckets = hours_to_show // bucket_hours
    buckets = []
    for b in range(num_buckets):
        bucket_start = current_bucket_start - timedelta(hours=b * bucket_hours)
        bucket_end = bucket_start + timedelta(hours=bucket_hours)
        buckets.append((bucket_start, bucket_end))
    return buckets


def _allocate_task_to_buckets(
    task_start, task_end, estimate_hours, duration_hours, buckets
):
    """Split a task proportionally across time buckets.

    The task work period spans [task_start, task_end). If this interval crosses
    bucket boundaries, estimate and duration are split proportionally.

    Returns: dict of bucket_index -> {"estimate_hours", "duration_hours", "count"}
    """
    task_seconds = (task_end - task_start).total_seconds()
    result = {}

    if task_seconds <= 0:
        # Zero-duration task: assign fully to the bucket containing task_end
        for i, (bs, be) in enumerate(buckets):
            if bs <= task_end < be:
                result[i] = {
                    "estimate_hours": estimate_hours,
                    "duration_hours": duration_hours,
                    "count": 1.0,
                }
                return result
        return result

    for i, (bs, be) in enumerate(buckets):
        overlap_start = max(task_start, bs)
        overlap_end = min(task_end, be)
        if overlap_start < overlap_end:
            fraction = (overlap_end - overlap_start).total_seconds() / task_seconds
            result[i] = {
                "estimate_hours": estimate_hours * fraction,
                "duration_hours": duration_hours * fraction,
                "count": fraction,
            }

    return result


def _merge_intervals(intervals):
    """Merge overlapping time intervals to avoid double-counting.

    Returns list of non-overlapping (start, end) tuples.
    """
    if not intervals:
        return []
    sorted_ivs = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_ivs[0]]
    for start, end in sorted_ivs[1:]:
        if start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged


def _day_label(d, day_buckets):
    """Return display label for a day bucket."""
    if d == 0:
        return "Today"
    elif d == 1:
        return "Yesterday"
    else:
        return day_buckets[d][0].strftime("%b %d")


def _hr_label(b, hr_buckets):
    """Return display label for an hour bucket."""
    bs, be = hr_buckets[b]
    return f"{bs.strftime('%a %H')}-{be.strftime('%H')}"


@report.command()
@click.option("--days", default=14, help="Number of days to analyze")
@click.option(
    "--format", "output_format", type=click.Choice(["text", "json"]), default="text"
)
def velocity(days, output_format):
    """Show task completion velocity.

    Analyzes completed tasks over recent days to show trends.
    Uses daily buckets for velocity-over-time and static clock-aligned
    buckets for recent velocity. Tasks crossing bucket boundaries are
    split proportionally.
    """
    try:
        loader = TaskLoader()
        tree = loader.load()

        all_tasks = get_all_tasks(tree)

        # Get completed tasks with completion dates
        completed = []
        for task in all_tasks:
            if task.status == Status.DONE and task.completed_at:
                completed.append(task)

        if not completed:
            console.print("\n[yellow]No completed tasks with timestamps found.[/]\n")
            return

        now = utc_now()

        # --- Throughput by day ---
        day_buckets = _make_day_buckets(now, days)
        day_data = defaultdict(lambda: {"count": 0, "hours": 0.0})

        first_completion = None
        last_completion = None

        for task in completed:
            completed_at = to_utc(task.completed_at)

            # Track time span
            if first_completion is None or completed_at < first_completion:
                first_completion = completed_at
            if last_completion is None or completed_at > last_completion:
                last_completion = completed_at

            # Assign to day bucket by completion time
            for i, (bs, be) in enumerate(day_buckets):
                if bs <= completed_at < be:
                    day_data[i]["count"] += 1
                    day_data[i]["hours"] += task.estimate_hours
                    break

        # Calculate actual working period
        actual_days_span = None
        if first_completion and last_completion:
            time_span = (last_completion - first_completion).total_seconds()
            actual_days_span = max(time_span / (24 * 3600), 0.1)

        # --- Daily velocity with proportional splitting ---
        # Collect intervals per bucket so we can merge overlapping work periods
        velocity_data = defaultdict(
            lambda: {"estimate_hours": 0.0, "duration_hours": 0.0, "count": 0.0}
        )
        velocity_intervals = defaultdict(list)
        tasks_with_duration = 0

        for task in completed:
            if task.duration_minutes is not None:
                completed_at = to_utc(task.completed_at)

                task_end = completed_at
                task_start = completed_at - timedelta(minutes=task.duration_minutes)

                allocations = _allocate_task_to_buckets(
                    task_start,
                    task_end,
                    task.estimate_hours,
                    task.duration_minutes / 60,
                    day_buckets,
                )

                if allocations:
                    tasks_with_duration += 1
                    for idx, alloc in allocations.items():
                        velocity_data[idx]["estimate_hours"] += alloc["estimate_hours"]
                        velocity_data[idx]["count"] += alloc["count"]
                        # Collect clipped interval for merging
                        bs, be = day_buckets[idx]
                        velocity_intervals[idx].append(
                            (max(task_start, bs), min(task_end, be))
                        )

        # Merge overlapping intervals to get true wall-clock hours per bucket
        for idx, intervals in velocity_intervals.items():
            merged = _merge_intervals(intervals)
            velocity_data[idx]["duration_hours"] = sum(
                (end - start).total_seconds() / 3600 for start, end in merged
            )

        # --- Static high-res velocity (4-hour fixed buckets) ---
        hours_to_show = 48
        bucket_hours = 4
        hr_buckets = _make_static_hour_buckets(now, hours_to_show, bucket_hours)
        num_hr_buckets = len(hr_buckets)

        high_res_velocity = defaultdict(
            lambda: {"estimate_hours": 0.0, "duration_hours": 0.0, "count": 0.0}
        )
        hr_intervals = defaultdict(list)
        high_res_tasks = 0

        for task in completed:
            if task.duration_minutes is not None:
                completed_at = to_utc(task.completed_at)

                task_end = completed_at
                task_start = completed_at - timedelta(minutes=task.duration_minutes)

                allocations = _allocate_task_to_buckets(
                    task_start,
                    task_end,
                    task.estimate_hours,
                    task.duration_minutes / 60,
                    hr_buckets,
                )

                if allocations:
                    high_res_tasks += 1
                    for idx, alloc in allocations.items():
                        high_res_velocity[idx]["estimate_hours"] += alloc[
                            "estimate_hours"
                        ]
                        high_res_velocity[idx]["count"] += alloc["count"]
                        # Collect clipped interval for merging
                        bs, be = hr_buckets[idx]
                        hr_intervals[idx].append(
                            (max(task_start, bs), min(task_end, be))
                        )

        # Merge overlapping intervals to get true wall-clock hours per bucket
        for idx, intervals in hr_intervals.items():
            merged = _merge_intervals(intervals)
            high_res_velocity[idx]["duration_hours"] = sum(
                (end - start).total_seconds() / 3600 for start, end in merged
            )

        if output_format == "json":
            total_count = sum(day_data[d]["count"] for d in range(days))
            total_hours = sum(day_data[d]["hours"] for d in range(days))
            avg_tasks = total_count / days
            avg_hours = total_hours / days

            actual_avg_hours_per_day = (
                total_hours / actual_days_span
                if actual_days_span and actual_days_span > 0
                else avg_hours
            )

            output = {
                "days_analyzed": days,
                "total_completed": len(completed),
                "daily_data": [],
                "averages": {
                    "tasks_per_day": round(avg_tasks, 1),
                    "hours_per_day": round(avg_hours, 1),
                },
                "actual_velocity": {
                    "working_period_days": round(actual_days_span, 2)
                    if actual_days_span
                    else None,
                    "hours_per_day": round(actual_avg_hours_per_day, 1)
                    if actual_days_span
                    else None,
                    "first_completion": first_completion.strftime("%Y-%m-%d %H:%M:%S")
                    if first_completion
                    else None,
                    "last_completion": last_completion.strftime("%Y-%m-%d %H:%M:%S")
                    if last_completion
                    else None,
                },
            }

            for d in range(days):
                data = day_data[d]
                output["daily_data"].append(
                    {
                        "day": d,
                        "date": day_buckets[d][0].strftime("%Y-%m-%d"),
                        "label": _day_label(d, day_buckets),
                        "tasks_completed": data["count"],
                        "hours_completed": round(data["hours"], 1),
                    }
                )

            # Completion estimate
            if actual_avg_hours_per_day > 0:
                remaining_tasks = [
                    t
                    for t in all_tasks
                    if t.status in [Status.PENDING, Status.IN_PROGRESS]
                ]
                remaining_hours = sum(t.estimate_hours for t in remaining_tasks)
                remaining_count = len(remaining_tasks)

                if remaining_hours > 0:
                    days_remaining = remaining_hours / actual_avg_hours_per_day
                    completion_date = now + timedelta(days=days_remaining)

                    output["completion_estimate"] = {
                        "remaining_tasks": remaining_count,
                        "remaining_hours": round(remaining_hours, 1),
                        "days_remaining": round(days_remaining, 1),
                        "estimated_completion_date": completion_date.strftime(
                            "%Y-%m-%d"
                        ),
                        "confidence": "high"
                        if total_count >= days * 3
                        else ("medium" if total_count >= days else "low"),
                        "based_on": "actual_working_period",
                    }

            # Velocity over time (daily)
            if tasks_with_duration > 0:
                velocity_daily = []
                for d in range(days):
                    vdata = velocity_data[d]
                    velocity_ratio = None
                    if vdata["duration_hours"] > 0:
                        velocity_ratio = round(
                            vdata["estimate_hours"] / vdata["duration_hours"], 2
                        )

                    velocity_daily.append(
                        {
                            "day": d,
                            "date": day_buckets[d][0].strftime("%Y-%m-%d"),
                            "label": _day_label(d, day_buckets),
                            "velocity": velocity_ratio,
                            "estimate_hours": round(vdata["estimate_hours"], 1),
                            "actual_hours": round(vdata["duration_hours"], 1),
                            "tasks_with_duration": round(vdata["count"], 1),
                        }
                    )

                output["velocity_over_time"] = {
                    "daily": velocity_daily,
                    "tasks_with_duration": tasks_with_duration,
                    "total_estimate_hours": round(
                        sum(velocity_data[d]["estimate_hours"] for d in range(days)), 1
                    ),
                    "total_actual_hours": round(
                        sum(velocity_data[d]["duration_hours"] for d in range(days)), 1
                    ),
                }

                # High-res static buckets
                if high_res_tasks > 0:
                    high_res_data = []
                    for b in range(num_hr_buckets):
                        vdata = high_res_velocity[b]
                        velocity_ratio = None
                        if vdata["duration_hours"] > 0:
                            velocity_ratio = round(
                                vdata["estimate_hours"] / vdata["duration_hours"], 2
                            )

                        bs, be = hr_buckets[b]
                        high_res_data.append(
                            {
                                "bucket": b,
                                "start": bs.strftime("%Y-%m-%d %H:%M"),
                                "end": be.strftime("%Y-%m-%d %H:%M"),
                                "label": _hr_label(b, hr_buckets),
                                "velocity": velocity_ratio,
                                "estimate_hours": round(vdata["estimate_hours"], 1),
                                "actual_hours": round(vdata["duration_hours"], 1),
                                "tasks_with_duration": round(vdata["count"], 1),
                            }
                        )

                    output["velocity_over_time"]["high_resolution"] = {
                        "bucket_hours": bucket_hours,
                        "hours_shown": hours_to_show,
                        "buckets": high_res_data,
                        "tasks_with_duration": high_res_tasks,
                    }

            click.echo(json.dumps(output, indent=2))
            return

        # Text output
        console.print("\n[bold cyan]Velocity Report[/]\n")

        console.print(f"[bold]Last {days} days:[/]\n")

        max_count = max((day_data[d]["count"] for d in range(days)), default=0)

        for d in range(days):
            data = day_data[d]
            label = _day_label(d, day_buckets)

            if max_count > 0:
                bar_len = int(20 * data["count"] / max_count) if max_count else 0
                bar = "█" * bar_len + "░" * (20 - bar_len)
            else:
                bar = "░" * 20

            console.print(
                f"  {label:12} {bar} {data['count']:3} tasks ({data['hours']:.1f}h)"
            )

        # Averages
        total_count = sum(day_data[d]["count"] for d in range(days))
        total_hours = sum(day_data[d]["hours"] for d in range(days))
        avg_tasks = total_count / days
        avg_hours = total_hours / days

        actual_avg_hours_per_day = (
            total_hours / actual_days_span
            if actual_days_span and actual_days_span > 0
            else avg_hours
        )

        console.print(f"\n[bold]Averages:[/]")
        console.print(
            f"  Tasks/day: {avg_tasks:.1f} [dim](across {days} day window)[/]"
        )
        console.print(
            f"  Hours/day: {avg_hours:.1f} [dim](across {days} day window)[/]"
        )

        if actual_days_span and actual_days_span != days:
            console.print(f"\n[bold]Actual Velocity:[/]")
            console.print(f"  Working period: {actual_days_span:.1f} days")
            console.print(
                f"  Hours/day: {actual_avg_hours_per_day:.1f} [dim](based on actual time span)[/]"
            )
            if first_completion and last_completion:
                console.print(
                    f"  [dim]From {first_completion.strftime('%Y-%m-%d')} to {last_completion.strftime('%Y-%m-%d')}[/]"
                )

        # Trend (compare today vs yesterday)
        if days >= 2:
            recent = day_data[0]["count"]
            previous = day_data[1]["count"]
            if previous > 0:
                change = ((recent - previous) / previous) * 100
                if change > 10:
                    console.print(f"\n  [green]↑ Trending up ({change:+.0f}%)[/]")
                elif change < -10:
                    console.print(f"\n  [red]↓ Trending down ({change:+.0f}%)[/]")
                else:
                    console.print(f"\n  [dim]→ Stable ({change:+.0f}%)[/]")

        # Completion estimate
        if actual_avg_hours_per_day > 0:
            remaining_tasks = [
                t for t in all_tasks if t.status in [Status.PENDING, Status.IN_PROGRESS]
            ]
            remaining_hours = sum(t.estimate_hours for t in remaining_tasks)
            remaining_count = len(remaining_tasks)

            if remaining_hours > 0:
                days_remaining = remaining_hours / actual_avg_hours_per_day
                completion_date = now + timedelta(days=days_remaining)

                console.print(f"\n[bold]Completion Estimate:[/]")
                console.print(
                    f"  Remaining: {remaining_count} tasks ({remaining_hours:.1f}h)"
                )

                if days_remaining < 7:
                    console.print(
                        f"  [green]Estimated: {days_remaining:.1f} days ({completion_date.strftime('%Y-%m-%d')})[/]"
                    )
                elif days_remaining < 365:
                    weeks_remaining = days_remaining / 7
                    console.print(
                        f"  [cyan]Estimated: {weeks_remaining:.1f} weeks ({completion_date.strftime('%Y-%m-%d')})[/]"
                    )
                else:
                    months = days_remaining / 30.44
                    console.print(
                        f"  [yellow]Estimated: {months:.1f} months ({completion_date.strftime('%Y-%m-%d')})[/]"
                    )

                # Confidence indicator
                if total_count >= days * 3:
                    console.print(
                        f"  [dim]Confidence: High (based on {total_count} completed tasks)[/]"
                    )
                elif total_count >= days:
                    console.print(
                        f"  [dim]Confidence: Medium (based on {total_count} completed tasks)[/]"
                    )
                else:
                    console.print(
                        f"  [dim]Confidence: Low (limited data: {total_count} completed tasks)[/]"
                    )

                if actual_days_span and actual_days_span != days:
                    console.print(
                        f"  [dim]Based on {actual_avg_hours_per_day:.1f}h/day actual velocity[/]"
                    )

        # Velocity over time (daily efficiency)
        if tasks_with_duration > 0:
            console.print(f"\n[bold]Velocity Over Time:[/]")
            console.print(
                f"[dim]Efficiency ratio: estimated hours / actual hours (daily, proportionally split)[/]\n"
            )

            total_est, total_act, max_velocity = _calculate_velocity_summary(
                velocity_data, days
            )
            display_max = max(5.0, max_velocity * 1.1) if max_velocity > 0 else 5.0

            _render_velocity_histogram(
                velocity_data, days, lambda d: _day_label(d, day_buckets), display_max
            )

            console.print(f"\n  [dim]Scale: 0.0x {'─' * 20} {display_max:.1f}x[/]")

            if total_act > 0:
                avg_velocity = total_est / total_act
                console.print(
                    f"  [bold]Average velocity:[/] {avg_velocity:.1f}x ({total_est:.1f}h est / {total_act:.1f}h actual)"
                )

                if avg_velocity >= 1.2:
                    console.print(f"  [green]Completing work faster than estimated[/]")
                elif avg_velocity >= 0.8:
                    console.print(f"  [yellow]Estimates are reasonably accurate[/]")
                else:
                    console.print(f"  [red]Taking longer than estimated[/]")

            console.print(
                f"\n  [dim]Based on {tasks_with_duration} completed tasks with duration tracking[/]"
            )

        # Static high-res velocity
        if high_res_tasks > 0:
            console.print(f"\n[bold]Recent Velocity (Last {hours_to_show} Hours):[/]")
            console.print(
                f"[dim]Static {bucket_hours}-hour periods, proportionally split[/]\n"
            )

            total_est_hr, total_act_hr, max_velocity_hr = _calculate_velocity_summary(
                high_res_velocity, num_hr_buckets
            )
            display_max_hr = (
                max(5.0, max_velocity_hr * 1.1) if max_velocity_hr > 0 else 5.0
            )

            _render_velocity_histogram(
                high_res_velocity,
                num_hr_buckets,
                lambda b: _hr_label(b, hr_buckets),
                display_max_hr,
            )

            console.print(f"\n  [dim]Scale: 0.0x {'─' * 20} {display_max_hr:.1f}x[/]")

            if total_act_hr > 0:
                avg_velocity_hr = total_est_hr / total_act_hr
                console.print(
                    f"  [bold]Recent average:[/] {avg_velocity_hr:.1f}x ({total_est_hr:.1f}h est / {total_act_hr:.1f}h actual)"
                )

            console.print(
                f"  [dim]Based on {high_res_tasks} tasks completed in last {hours_to_show}h[/]"
            )

        console.print()

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


@report.command("v", hidden=True)
@click.option("--days", default=14, help="Number of days to analyze")
@click.option(
    "--format", "output_format", type=click.Choice(["text", "json"]), default="text"
)
def velocity_short_alias(days, output_format):
    """Hidden alias for `report velocity`."""
    ctx = click.get_current_context()
    ctx.invoke(velocity, days=days, output_format=output_format)


@click.command("velocity", hidden=True)
@click.option("--days", default=14, help="Number of days to analyze")
@click.option(
    "--format", "output_format", type=click.Choice(["text", "json"]), default="text"
)
def velocity_alias(days, output_format):
    """Hidden top-level alias for `report velocity`."""
    ctx = click.get_current_context()
    ctx.invoke(velocity, days=days, output_format=output_format)


@report.command("estimate-accuracy")
@click.option(
    "--format", "output_format", type=click.Choice(["text", "json"]), default="text"
)
def estimate_accuracy(output_format):
    """Compare estimated vs actual task durations.

    Shows how accurate time estimates have been.
    """
    try:
        loader = TaskLoader()
        tree = loader.load()

        all_tasks = get_all_tasks(tree)

        # Get tasks with duration data
        with_duration = []
        for task in all_tasks:
            if task.status == Status.DONE and task.duration_minutes is not None:
                with_duration.append(task)

        if not with_duration:
            console.print("\n[yellow]No completed tasks with duration data found.[/]")
            console.print("[dim]Duration is recorded when marking tasks done.[/]\n")
            return

        # Calculate accuracy metrics
        total_estimated_hours = 0
        total_actual_hours = 0
        variances = []

        for task in with_duration:
            est_hours = task.estimate_hours
            actual_hours = task.duration_minutes / 60

            total_estimated_hours += est_hours
            total_actual_hours += actual_hours

            if est_hours > 0:
                variance = (actual_hours - est_hours) / est_hours * 100
                variances.append(
                    {
                        "task": task,
                        "estimated": est_hours,
                        "actual": actual_hours,
                        "variance": variance,
                    }
                )

        if output_format == "json":
            output = {
                "tasks_analyzed": len(with_duration),
                "total_estimated_hours": round(total_estimated_hours, 1),
                "total_actual_hours": round(total_actual_hours, 1),
                "accuracy_percent": round(
                    (total_estimated_hours / total_actual_hours * 100)
                    if total_actual_hours > 0
                    else 0,
                    1,
                ),
                "average_variance_percent": round(
                    sum(v["variance"] for v in variances) / len(variances)
                    if variances
                    else 0,
                    1,
                ),
            }
            click.echo(json.dumps(output, indent=2))
            return

        # Text output
        console.print("\n[bold cyan]Estimate Accuracy Report[/]\n")

        console.print(f"[bold]Analyzed:[/] {len(with_duration)} completed tasks\n")

        console.print(f"[bold]Totals:[/]")
        console.print(f"  Estimated: {total_estimated_hours:.1f} hours")
        console.print(f"  Actual:    {total_actual_hours:.1f} hours")

        if total_actual_hours > 0:
            accuracy = total_estimated_hours / total_actual_hours * 100
            if accuracy > 90 and accuracy < 110:
                console.print(f"  [green]Accuracy: {accuracy:.0f}% (good)[/]")
            elif accuracy >= 110:
                console.print(
                    f"  [yellow]Accuracy: {accuracy:.0f}% (overestimating)[/]"
                )
            else:
                console.print(f"  [red]Accuracy: {accuracy:.0f}% (underestimating)[/]")

        # Show worst offenders
        if variances:
            console.print(f"\n[bold]Biggest variances:[/]")

            # Sort by absolute variance
            sorted_vars = sorted(
                variances, key=lambda v: abs(v["variance"]), reverse=True
            )

            for v in sorted_vars[:5]:
                task = v["task"]
                est = v["estimated"]
                act = v["actual"]
                var = v["variance"]

                if var > 0:
                    indicator = "[red]over[/]"
                else:
                    indicator = "[yellow]under[/]"

                console.print(f"\n  {task.id}: {task.title[:40]}...")
                console.print(
                    f"    Est: {est:.1f}h → Actual: {act:.1f}h ({var:+.0f}% {indicator})"
                )

        # Recommendations
        avg_var = (
            sum(v["variance"] for v in variances) / len(variances) if variances else 0
        )
        console.print(f"\n[bold]Recommendation:[/]")
        if avg_var > 20:
            console.print(
                f"  [yellow]Estimates are {abs(avg_var):.0f}% low on average. Consider adding buffer.[/]"
            )
        elif avg_var < -20:
            console.print(
                f"  [yellow]Estimates are {abs(avg_var):.0f}% high on average. Can be more aggressive.[/]"
            )
        else:
            console.print(
                f"  [green]Estimates are reasonably accurate (avg variance: {avg_var:+.0f}%)[/]"
            )

        console.print()

    except Exception as e:
        console.print(f"[red]Error:[/] {str(e)}")
        raise click.Abort()


def register_commands(cli):
    """Register report commands with the CLI."""
    cli.add_command(report)
    cli.add_command(report_alias)
    cli.add_command(velocity_alias)


@report_alias.command("p")
@click.option(
    "--format", "output_format", type=click.Choice(["text", "json"]), default="text"
)
@click.option("--by-phase", is_flag=True, help="Group by phase (default)")
@click.option("--by-milestone", is_flag=True, help="Show milestones within phases")
@click.option("--by-epic", is_flag=True, help="Show epics within milestones")
@click.option(
    "--all", "show_all", is_flag=True, help="Include completed phases/milestones/epics"
)
def report_alias_progress(output_format, by_phase, by_milestone, by_epic, show_all):
    """Alias for `report progress`."""
    ctx = click.get_current_context()
    ctx.invoke(
        progress,
        output_format=output_format,
        by_phase=by_phase,
        by_milestone=by_milestone,
        by_epic=by_epic,
        show_all=show_all,
    )


@report_alias.command("v")
@click.option("--days", default=14, help="Number of days to analyze")
@click.option(
    "--format", "output_format", type=click.Choice(["text", "json"]), default="text"
)
def report_alias_velocity(days, output_format):
    """Alias for `report velocity`."""
    ctx = click.get_current_context()
    ctx.invoke(velocity, days=days, output_format=output_format)


@report_alias.command("ea")
@click.option(
    "--format", "output_format", type=click.Choice(["text", "json"]), default="text"
)
def report_alias_estimate_accuracy(output_format):
    """Alias for `report estimate-accuracy`."""
    ctx = click.get_current_context()
    ctx.invoke(estimate_accuracy, output_format=output_format)
