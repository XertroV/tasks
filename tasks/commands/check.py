"""Consistency checks for task tree integrity."""

from __future__ import annotations

import json
import re
from pathlib import Path

import click
import networkx as nx
from rich.console import Console

from ..helpers import (
    CONTEXT_FILE,
    SESSIONS_FILE,
    find_missing_task_files,
    get_all_tasks,
)
from ..loader import TaskLoader

console = Console()

PHASE_ID_RE = re.compile(r"^P\d+$")
MILESTONE_ID_RE = re.compile(r"^P\d+\.M\d+$")
EPIC_ID_RE = re.compile(r"^P\d+\.M\d+\.E\d+$")
TASK_ID_RE = re.compile(r"^P\d+\.M\d+\.E\d+\.T\d+$")


def _add_finding(
    findings, level: str, code: str, message: str, location: str | None = None
):
    finding = {"level": level, "code": code, "message": message}
    if location:
        finding["location"] = location
    findings.append(finding)


def _validate_tree_files(tree, findings):
    tasks_root = Path(".tasks")
    root_index = tasks_root / "index.yaml"
    if not root_index.exists():
        _add_finding(
            findings, "error", "missing_root_index", "Missing .tasks/index.yaml"
        )

    for phase in tree.phases:
        phase_index = tasks_root / phase.path / "index.yaml"
        if not phase_index.exists():
            _add_finding(
                findings,
                "error",
                "missing_phase_index",
                f"Missing phase index for {phase.id}",
                str(phase_index),
            )

        for milestone in phase.milestones:
            milestone_index = tasks_root / phase.path / milestone.path / "index.yaml"
            if not milestone_index.exists():
                _add_finding(
                    findings,
                    "error",
                    "missing_milestone_index",
                    f"Missing milestone index for {milestone.id}",
                    str(milestone_index),
                )

            for epic in milestone.epics:
                epic_index = (
                    tasks_root / phase.path / milestone.path / epic.path / "index.yaml"
                )
                if not epic_index.exists():
                    _add_finding(
                        findings,
                        "error",
                        "missing_epic_index",
                        f"Missing epic index for {epic.id}",
                        str(epic_index),
                    )

    for task in find_missing_task_files(tree):
        _add_finding(
            findings,
            "error",
            "missing_task_file",
            f"Task file missing for {task.id}",
            f".tasks/{task.file}",
        )


def _resolve_milestone_dep_id(dep_id: str, phase_id: str | None) -> str | None:
    dep = dep_id.strip()
    if not dep:
        return None
    if "." in dep:
        return dep
    if phase_id:
        return f"{phase_id}.{dep}"
    return dep


def _resolve_epic_dep_id(dep_id: str, milestone_id: str | None) -> str | None:
    dep = dep_id.strip()
    if not dep:
        return None
    if "." in dep:
        return dep
    if milestone_id:
        return f"{milestone_id}.{dep}"
    return dep


def _validate_ids_and_dependencies(tree, findings):
    all_tasks = get_all_tasks(tree)

    phase_ids = set()
    milestone_ids = set()
    epic_ids = set()
    task_ids = set()

    for phase in tree.phases:
        if not PHASE_ID_RE.match(phase.id):
            _add_finding(
                findings,
                "error",
                "invalid_phase_id",
                f"Invalid phase ID format: {phase.id}",
                phase.id,
            )
        if phase.id in phase_ids:
            _add_finding(
                findings,
                "error",
                "duplicate_phase_id",
                f"Duplicate phase ID: {phase.id}",
                phase.id,
            )
        phase_ids.add(phase.id)

        for dep in phase.depends_on:
            if dep == phase.id:
                _add_finding(
                    findings,
                    "error",
                    "self_dependency_phase",
                    f"Phase depends on itself: {phase.id}",
                    phase.id,
                )
            elif dep not in phase_ids and not any(p.id == dep for p in tree.phases):
                _add_finding(
                    findings,
                    "error",
                    "missing_phase_dependency",
                    f"Phase dependency not found: {dep}",
                    phase.id,
                )

        for milestone in phase.milestones:
            if not MILESTONE_ID_RE.match(milestone.id):
                _add_finding(
                    findings,
                    "error",
                    "invalid_milestone_id",
                    f"Invalid milestone ID format: {milestone.id}",
                    milestone.id,
                )
            if milestone.id in milestone_ids:
                _add_finding(
                    findings,
                    "error",
                    "duplicate_milestone_id",
                    f"Duplicate milestone ID: {milestone.id}",
                    milestone.id,
                )
            milestone_ids.add(milestone.id)

            if milestone.phase_id != phase.id:
                _add_finding(
                    findings,
                    "error",
                    "milestone_parent_mismatch",
                    f"Milestone {milestone.id} is attached to phase {phase.id} but reports phase_id={milestone.phase_id}",
                    milestone.id,
                )

            for dep in milestone.depends_on:
                dep_resolved = _resolve_milestone_dep_id(dep, phase.id)
                if dep_resolved == milestone.id:
                    _add_finding(
                        findings,
                        "error",
                        "self_dependency_milestone",
                        f"Milestone depends on itself: {milestone.id}",
                        milestone.id,
                    )
                elif dep_resolved and not tree.find_milestone(dep_resolved):
                    _add_finding(
                        findings,
                        "error",
                        "missing_milestone_dependency",
                        f"Milestone dependency not found: {dep}",
                        milestone.id,
                    )

            for epic in milestone.epics:
                if not EPIC_ID_RE.match(epic.id):
                    _add_finding(
                        findings,
                        "error",
                        "invalid_epic_id",
                        f"Invalid epic ID format: {epic.id}",
                        epic.id,
                    )
                if epic.id in epic_ids:
                    _add_finding(
                        findings,
                        "error",
                        "duplicate_epic_id",
                        f"Duplicate epic ID: {epic.id}",
                        epic.id,
                    )
                epic_ids.add(epic.id)

                if epic.phase_id != phase.id:
                    _add_finding(
                        findings,
                        "error",
                        "epic_phase_mismatch",
                        f"Epic {epic.id} has phase_id={epic.phase_id}, expected {phase.id}",
                        epic.id,
                    )
                if epic.milestone_id != milestone.id:
                    _add_finding(
                        findings,
                        "error",
                        "epic_milestone_mismatch",
                        f"Epic {epic.id} has milestone_id={epic.milestone_id}, expected {milestone.id}",
                        epic.id,
                    )

                for dep in epic.depends_on:
                    dep_resolved = _resolve_epic_dep_id(dep, milestone.id)
                    if dep_resolved == epic.id:
                        _add_finding(
                            findings,
                            "error",
                            "self_dependency_epic",
                            f"Epic depends on itself: {epic.id}",
                            epic.id,
                        )
                    elif dep_resolved and not tree.find_epic(dep_resolved):
                        _add_finding(
                            findings,
                            "error",
                            "missing_epic_dependency",
                            f"Epic dependency not found: {dep}",
                            epic.id,
                        )

                expected_prefix = f".tasks/{phase.path}/{milestone.path}/{epic.path}/"
                for task in epic.tasks:
                    if not TASK_ID_RE.match(task.id):
                        _add_finding(
                            findings,
                            "error",
                            "invalid_task_id",
                            f"Invalid task ID format: {task.id}",
                            task.id,
                        )
                    if task.id in task_ids:
                        _add_finding(
                            findings,
                            "error",
                            "duplicate_task_id",
                            f"Duplicate task ID: {task.id}",
                            task.id,
                        )
                    task_ids.add(task.id)

                    if task.epic_id != epic.id:
                        _add_finding(
                            findings,
                            "error",
                            "task_epic_mismatch",
                            f"Task {task.id} has epic_id={task.epic_id}, expected {epic.id}",
                            task.id,
                        )
                    if task.milestone_id != milestone.id:
                        _add_finding(
                            findings,
                            "error",
                            "task_milestone_mismatch",
                            f"Task {task.id} has milestone_id={task.milestone_id}, expected {milestone.id}",
                            task.id,
                        )
                    if task.phase_id != phase.id:
                        _add_finding(
                            findings,
                            "error",
                            "task_phase_mismatch",
                            f"Task {task.id} has phase_id={task.phase_id}, expected {phase.id}",
                            task.id,
                        )

                    if not task.id.startswith(f"{epic.id}."):
                        _add_finding(
                            findings,
                            "error",
                            "task_parent_path_mismatch",
                            f"Task {task.id} does not belong to parent epic {epic.id}",
                            task.id,
                        )

                    if not task.file.endswith(".todo"):
                        _add_finding(
                            findings,
                            "error",
                            "invalid_task_file_extension",
                            f"Task file must end with .todo: {task.file}",
                            task.id,
                        )

                    if not f".tasks/{task.file}".startswith(expected_prefix):
                        _add_finding(
                            findings,
                            "error",
                            "task_file_path_mismatch",
                            f"Task file path does not match parent hierarchy: .tasks/{task.file}",
                            task.id,
                        )

                    if task.estimate_hours == 0:
                        _add_finding(
                            findings,
                            "warning",
                            "zero_estimate_hours",
                            f"Task estimate must be positive, got 0: {task.id}",
                            task.id,
                        )

    for task in all_tasks:
        for dep in task.depends_on:
            if dep == task.id:
                _add_finding(
                    findings,
                    "error",
                    "self_dependency_task",
                    f"Task depends on itself: {task.id}",
                    task.id,
                )
            elif dep not in task_ids:
                _add_finding(
                    findings,
                    "error",
                    "missing_task_dependency",
                    f"Task dependency not found: {dep}",
                    task.id,
                )


def _append_graph_cycle_findings(
    graph, findings, code: str, message_prefix: str, location: str
):
    if nx.is_directed_acyclic_graph(graph):
        return
    cycles = list(nx.simple_cycles(graph))
    for cycle in cycles[:10]:
        if not cycle:
            continue
        chain = " -> ".join(cycle + [cycle[0]])
        _add_finding(findings, "error", code, f"{message_prefix}: {chain}", location)


def _validate_cycles(tree, findings):
    # Task dependency cycles
    task_graph = nx.DiGraph()
    all_tasks = get_all_tasks(tree)
    for task in all_tasks:
        task_graph.add_node(task.id)
    for phase in tree.phases:
        for milestone in phase.milestones:
            for epic in milestone.epics:
                for idx, task in enumerate(epic.tasks):
                    for dep in task.depends_on:
                        if task_graph.has_node(dep):
                            task_graph.add_edge(dep, task.id)
                    if not task.depends_on and idx > 0:
                        task_graph.add_edge(epic.tasks[idx - 1].id, task.id)
    _append_graph_cycle_findings(
        task_graph,
        findings,
        "task_dependency_cycle",
        "Task dependency cycle detected",
        "task_dependencies",
    )

    # Epic dependency cycles
    epic_graph = nx.DiGraph()
    for phase in tree.phases:
        for milestone in phase.milestones:
            for epic in milestone.epics:
                epic_graph.add_node(epic.id)
    for phase in tree.phases:
        for milestone in phase.milestones:
            for epic in milestone.epics:
                for dep in epic.depends_on:
                    dep_resolved = _resolve_epic_dep_id(dep, milestone.id)
                    if dep_resolved and epic_graph.has_node(dep_resolved):
                        epic_graph.add_edge(dep_resolved, epic.id)
    _append_graph_cycle_findings(
        epic_graph,
        findings,
        "epic_dependency_cycle",
        "Epic dependency cycle detected",
        "epic_dependencies",
    )

    # Milestone dependency cycles
    milestone_graph = nx.DiGraph()
    for phase in tree.phases:
        for milestone in phase.milestones:
            milestone_graph.add_node(milestone.id)
    for phase in tree.phases:
        for milestone in phase.milestones:
            for dep in milestone.depends_on:
                dep_resolved = _resolve_milestone_dep_id(dep, phase.id)
                if dep_resolved and milestone_graph.has_node(dep_resolved):
                    milestone_graph.add_edge(dep_resolved, milestone.id)
    _append_graph_cycle_findings(
        milestone_graph,
        findings,
        "milestone_dependency_cycle",
        "Milestone dependency cycle detected",
        "milestone_dependencies",
    )

    # Phase dependency cycles
    phase_graph = nx.DiGraph()
    for phase in tree.phases:
        phase_graph.add_node(phase.id)
    for phase in tree.phases:
        for dep in phase.depends_on:
            if phase_graph.has_node(dep):
                phase_graph.add_edge(dep, phase.id)
    _append_graph_cycle_findings(
        phase_graph,
        findings,
        "phase_dependency_cycle",
        "Phase dependency cycle detected",
        "phase_dependencies",
    )


def _validate_runtime_files(tree, findings):
    if CONTEXT_FILE.exists():
        try:
            import yaml

            with open(CONTEXT_FILE) as f:
                context = yaml.safe_load(f) or {}
            referenced = []
            current = context.get("current_task")
            primary = context.get("primary_task")
            additional = context.get("additional_tasks") or []
            siblings = context.get("sibling_tasks") or []
            if current:
                referenced.append(current)
            if primary:
                referenced.append(primary)
            referenced.extend(additional)
            referenced.extend(siblings)
            for task_id in referenced:
                if not tree.find_task(task_id):
                    _add_finding(
                        findings,
                        "warning",
                        "stale_context_task",
                        f"Context references missing task: {task_id}",
                        str(CONTEXT_FILE),
                    )
        except Exception as exc:
            _add_finding(
                findings,
                "warning",
                "context_parse_error",
                f"Could not parse context file: {exc}",
                str(CONTEXT_FILE),
            )

    if SESSIONS_FILE.exists():
        try:
            import yaml

            with open(SESSIONS_FILE) as f:
                sessions = yaml.safe_load(f) or {}
            for _agent, payload in sessions.items():
                task_id = (
                    payload.get("current_task") if isinstance(payload, dict) else None
                )
                if task_id and not tree.find_task(task_id):
                    _add_finding(
                        findings,
                        "warning",
                        "stale_session_task",
                        f"Session references missing task: {task_id}",
                        str(SESSIONS_FILE),
                    )
        except Exception as exc:
            _add_finding(
                findings,
                "warning",
                "sessions_parse_error",
                f"Could not parse sessions file: {exc}",
                str(SESSIONS_FILE),
            )


def run_checks(tasks_dir: str = ".tasks") -> dict:
    """Run consistency checks and return normalized findings."""
    findings = []

    loader = TaskLoader(tasks_dir)
    tree = loader.load()

    _validate_tree_files(tree, findings)
    _validate_ids_and_dependencies(tree, findings)
    _validate_cycles(tree, findings)
    _validate_runtime_files(tree, findings)

    errors = [f for f in findings if f["level"] == "error"]
    warnings = [f for f in findings if f["level"] == "warning"]
    return {
        "ok": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "summary": {
            "errors": len(errors),
            "warnings": len(warnings),
            "total": len(findings),
        },
    }


def _print_text_report(report: dict):
    errors = report["errors"]
    warnings = report["warnings"]
    summary = report["summary"]

    if not errors and not warnings:
        console.print("[green]✓ Consistency check passed with no issues.[/]")
        return

    console.print(
        f"[bold]Consistency check results:[/] {summary['errors']} error(s), {summary['warnings']} warning(s)"
    )

    if errors:
        console.print("\n[red]Errors:[/]")
        for item in errors:
            loc = f" ({item['location']})" if "location" in item else ""
            console.print(f"  - {item['code']}: {item['message']}{loc}")

    if warnings:
        console.print("\n[yellow]Warnings:[/]")
        for item in warnings:
            loc = f" ({item['location']})" if "location" in item else ""
            console.print(f"  - {item['code']}: {item['message']}{loc}")


@click.command()
@click.option("--json", "as_json", is_flag=True, help="Output report as JSON.")
@click.option(
    "--strict",
    is_flag=True,
    help="Treat warnings as failures (non-zero exit).",
)
def check(as_json, strict):
    """Check task tree consistency (files, dependencies, cycles, IDs)."""
    try:
        report = run_checks()
    except Exception as exc:
        raise click.ClickException(str(exc)) from exc

    if as_json:
        click.echo(json.dumps(report, indent=2))
    else:
        _print_text_report(report)

    should_fail = bool(report["errors"]) or (strict and bool(report["warnings"]))
    if should_fail:
        raise click.exceptions.Exit(1)


def register_commands(cli):
    """Register check command."""
    cli.add_command(check)
