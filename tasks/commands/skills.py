"""Skill installation commands."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from textwrap import dedent

import click
from rich.console import Console


console = Console()

VALID_SKILLS = ("plan-task", "plan-ingest", "start-tasks")
VALID_CLIENTS = ("codex", "claude", "opencode", "common")
VALID_ARTIFACTS = ("skills", "commands", "both")
CLIENT_CAPABILITIES = {
    "codex": {"skills"},
    "claude": {"skills", "commands"},
    "opencode": {"skills", "commands"},
}


@dataclass(frozen=True)
class InstallOperation:
    """A single file write operation."""

    client: str
    artifact: str
    path: Path
    content: str


def load_config() -> dict:
    """Load CLI config if present."""
    from ..cli import load_config as cli_load_config

    return cli_load_config()


@click.group()
def skills():
    """Install or export planning skills for AI clients."""
    pass


@skills.command("install")
@click.pass_context
@click.argument("skill_names", nargs=-1)
@click.option(
    "--scope",
    type=click.Choice(["local", "global"]),
    default="local",
    show_default=True,
    help="Install scope when --dir is not set.",
)
@click.option(
    "--client",
    "client_name",
    type=click.Choice(list(VALID_CLIENTS)),
    default="common",
    show_default=True,
    help="Target client(s).",
)
@click.option(
    "--artifact",
    type=click.Choice(list(VALID_ARTIFACTS)),
    default="skills",
    show_default=True,
    help="Artifact type to install.",
)
@click.option(
    "--dir",
    "output_dir",
    type=click.Path(file_okay=False, path_type=Path),
    help="Write artifacts under this directory instead of client home paths.",
)
@click.option("--force", is_flag=True, help="Overwrite existing files.")
@click.option("--dry-run", is_flag=True, help="Show what would be written.")
@click.option("--json", "output_json", is_flag=True, help="Print JSON summary output.")
def install_skills(
    ctx: click.Context,
    skill_names: tuple[str, ...],
    scope: str,
    client_name: str,
    artifact: str,
    output_dir: Path | None,
    force: bool,
    dry_run: bool,
    output_json: bool,
):
    """Install built-in skills (`plan-task`, `plan-ingest`, `start-tasks`) for supported clients."""
    try:
        if _should_prompt_for_client(ctx):
            client_name = _prompt_for_client()

        selected_skills = _resolve_skills(skill_names)
        config = load_config()

        operations, warnings = _build_install_operations(
            skills=selected_skills,
            scope=scope,
            client_name=client_name,
            artifact=artifact,
            output_dir=output_dir,
            config=config,
        )

        if not operations:
            message = "No supported install targets were selected."
            if warnings:
                message = f"{message}\n" + "\n".join(f"- {w}" for w in warnings)
            raise click.ClickException(message)

        existing_paths = {str(op.path) for op in operations if op.path.exists()}
        conflicting_ops = [op for op in operations if str(op.path) in existing_paths]
        writable_ops = [op for op in operations if str(op.path) not in existing_paths]

        skipped_existing: list[Path] = []
        if conflicting_ops and not force and not dry_run:
            if not writable_ops:
                preview = "\n".join(
                    f"  - {op.path}"
                    for op in sorted(conflicting_ops, key=lambda op: str(op.path))
                )
                raise click.ClickException(
                    "Refusing to overwrite existing files (use --force):\n" + preview
                )

            skipped_existing = [op.path for op in conflicting_ops]
            warnings.append(
                f"Skipped {len(skipped_existing)} existing file(s); use --force to overwrite."
            )
            operations = writable_ops

        written = []
        if not dry_run:
            for op in operations:
                op.path.parent.mkdir(parents=True, exist_ok=True)
                op.path.write_text(op.content, encoding="utf-8")
                written.append(op.path)

        result = {
            "skills": selected_skills,
            "scope": scope,
            "client": client_name,
            "artifact": artifact,
            "output_dir": str(output_dir) if output_dir else None,
            "dry_run": dry_run,
            "force": force,
            "warnings": warnings,
            "skipped_existing_count": len(skipped_existing),
            "operations": [
                {
                    "client": op.client,
                    "artifact": op.artifact,
                    "path": str(op.path),
                    "action": "planned" if dry_run else "written",
                }
                for op in operations
            ],
            "written_count": 0 if dry_run else len(written),
        }

        if output_json:
            click.echo(json.dumps(result, indent=2))
            return

        _print_install_summary(result)

    except click.ClickException:
        raise
    except Exception as exc:
        raise click.ClickException(str(exc)) from exc


def _resolve_skills(skill_names: tuple[str, ...]) -> list[str]:
    """Normalize skill selection from CLI args."""
    normalized = [name.strip().lower() for name in skill_names if name.strip()]

    if not normalized or "all" in normalized:
        return list(VALID_SKILLS)

    seen = set()
    selected = []
    invalid = []

    for name in normalized:
        if name in seen:
            continue
        seen.add(name)
        if name in VALID_SKILLS:
            selected.append(name)
        else:
            invalid.append(name)

    if invalid:
        valid_text = ", ".join([*VALID_SKILLS, "all"])
        invalid_text = ", ".join(invalid)
        raise click.ClickException(
            f"Invalid skill name(s): {invalid_text}. Valid options: {valid_text}."
        )

    return selected


def _should_prompt_for_client(ctx: click.Context) -> bool:
    """Return True when interactive install should ask for target client."""
    return (
        ctx.get_parameter_source("client_name") == click.core.ParameterSource.DEFAULT
        and ctx.get_parameter_source("output_json")
        != click.core.ParameterSource.COMMANDLINE
        and click.get_text_stream("stdin").isatty()
    )


def _prompt_for_client() -> str:
    """Prompt interactively for client selection."""
    choices = {"1": "codex", "2": "claude", "3": "opencode", "4": "common"}
    click.echo("Select target coding CLI:")
    click.echo("  1) codex")
    click.echo("  2) claude")
    click.echo("  3) opencode")
    click.echo("  4) common (all)")
    selected = click.prompt("Choose [1-4]", default="4", show_default=False)
    selected = selected.strip().lower()

    if selected in choices:
        return choices[selected]
    if selected in VALID_CLIENTS:
        return selected
    raise click.ClickException(
        "Invalid client selection. Choose 1-4 or one of: codex, claude, opencode, common."
    )


def _resolve_clients(client_name: str) -> list[str]:
    """Expand the selected client list."""
    if client_name == "common":
        return ["codex", "claude", "opencode"]
    return [client_name]


def _resolve_artifacts(artifact: str) -> list[str]:
    """Expand artifact selector to concrete artifact names."""
    if artifact == "both":
        return ["skills", "commands"]
    return [artifact]


def _build_install_operations(
    *,
    skills: list[str],
    scope: str,
    client_name: str,
    artifact: str,
    output_dir: Path | None,
    config: dict,
) -> tuple[list[InstallOperation], list[str]]:
    """Compute all file writes needed for the requested install."""
    clients = _resolve_clients(client_name)
    artifacts = _resolve_artifacts(artifact)
    warnings = []
    ops_by_path: dict[str, InstallOperation] = {}
    max_subagents = _plan_ingest_max_subagents(config)

    for client in clients:
        supported = CLIENT_CAPABILITIES[client]
        for selected_artifact in artifacts:
            if selected_artifact not in supported:
                warnings.append(
                    f"{client} does not support '{selected_artifact}' artifacts; skipping."
                )
                continue

            root = _resolve_target_root(
                client=client,
                scope=scope,
                artifact=selected_artifact,
                output_dir=output_dir,
                config=config,
            )

            for skill_name in skills:
                if selected_artifact == "skills":
                    files = _render_skill_files(
                        skill_name,
                        client=client,
                        max_subagents=max_subagents,
                    )
                    for rel_path, content in files.items():
                        target = root / skill_name / rel_path
                        ops_by_path[str(target)] = InstallOperation(
                            client=client,
                            artifact=selected_artifact,
                            path=target,
                            content=content,
                        )
                else:
                    target = root / f"{skill_name}.md"
                    content = _render_command_file(
                        skill_name,
                        client=client,
                        max_subagents=max_subagents,
                    )
                    ops_by_path[str(target)] = InstallOperation(
                        client=client,
                        artifact=selected_artifact,
                        path=target,
                        content=content,
                    )

    operations = sorted(ops_by_path.values(), key=lambda op: str(op.path))
    return operations, warnings


def _resolve_target_root(
    *,
    client: str,
    scope: str,
    artifact: str,
    output_dir: Path | None,
    config: dict,
) -> Path:
    """Resolve target root for one client/artifact pair."""
    if output_dir:
        return output_dir / artifact / client

    configured = _configured_path(config, client=client, scope=scope, artifact=artifact)
    if configured:
        return configured

    if client == "codex":
        if artifact != "skills":
            raise ValueError("Codex only supports skills artifacts.")
        if scope == "local":
            return Path(".agents") / "skills"
        codex_home = os.environ.get("CODEX_HOME")
        if codex_home:
            return Path(codex_home).expanduser() / "skills"
        return Path.home() / ".agents" / "skills"

    if client == "claude":
        if scope == "local":
            return Path(".claude") / artifact
        return Path.home() / ".claude" / artifact

    if client == "opencode":
        if scope == "local":
            return Path(".opencode") / artifact
        return Path.home() / ".config" / "opencode" / artifact

    raise ValueError(f"Unknown client: {client}")


def _configured_path(
    config: dict, *, client: str, scope: str, artifact: str
) -> Path | None:
    """Read path override from config."""
    path_cfg = config.get("skills", {}).get("paths", {})
    key = f"{client}_{scope}_{artifact}"
    value = path_cfg.get(key)
    if not value:
        return None
    expanded = os.path.expanduser(os.path.expandvars(str(value)))
    return Path(expanded)


def _plan_ingest_max_subagents(config: dict) -> int:
    """Read max-subagents hint from config."""
    raw = config.get("skills", {}).get("plan_ingest", {}).get("max_subagents", 6)
    try:
        parsed = int(raw)
    except (TypeError, ValueError):
        return 6
    return max(1, parsed)


def _render_skill_files(
    skill_name: str, *, client: str, max_subagents: int
) -> dict[str, str]:
    """Return a map of relative file path to file content."""
    if skill_name == "plan-task":
        return {
            "SKILL.md": _plan_task_skill(client=client),
            "references/hierarchy-reference.md": _hierarchy_reference(),
        }

    if skill_name == "plan-ingest":
        return {
            "SKILL.md": _plan_ingest_skill(client=client, max_subagents=max_subagents),
            "references/decomposition-rubric.md": _decomposition_rubric(),
        }

    if skill_name == "start-tasks":
        return {
            "SKILL.md": _start_tasks_skill(client=client),
            "references/tasks-cli-quick-reference.md": _tasks_cli_quick_reference(),
        }

    raise ValueError(f"Unknown skill template: {skill_name}")


def _render_command_file(skill_name: str, *, client: str, max_subagents: int) -> str:
    """Render command markdown for Claude/OpenCode style command directories."""
    if skill_name == "plan-task":
        return _plan_task_command(client=client)
    if skill_name == "plan-ingest":
        return _plan_ingest_command(client=client, max_subagents=max_subagents)
    if skill_name == "start-tasks":
        return _start_tasks_command(client=client)
    raise ValueError(f"Unknown command template: {skill_name}")


def _print_install_summary(result: dict) -> None:
    """Human-friendly command output."""
    if result["dry_run"]:
        console.print("[cyan]Dry run: no files written.[/]")
    else:
        console.print(f"[green]Installed {result['written_count']} file(s).[/]")

    for warning in result["warnings"]:
        console.print(f"[yellow]Warning:[/] {warning}")

    grouped: dict[tuple[str, str], list[str]] = {}
    for op in result["operations"]:
        key = (op["client"], op["artifact"])
        grouped.setdefault(key, []).append(op["path"])

    for (client, artifact), paths in sorted(grouped.items()):
        console.print(f"\n[bold]{client} ({artifact})[/]")
        for path in sorted(paths):
            console.print(f"  - {path}")

    console.print()


def _skill_frontmatter(
    name: str, description: str, short_description: str | None = None
) -> str:
    """Build YAML frontmatter for skill files."""
    lines = ["---", f"name: {name}", f"description: {json.dumps(description)}"]
    if short_description:
        lines.extend(
            ["metadata:", f"  short-description: {json.dumps(short_description)}"]
        )
    lines.append("---")
    return "\n".join(lines)


def _plan_task_skill(*, client: str) -> str:
    """Codex skill template: plan-task."""
    short_description = None
    if client in {"codex", "opencode"}:
        short_description = "Idea-to-task decomposition for `.tasks`"

    frontmatter = _skill_frontmatter(
        name="plan-task",
        description="Transform feature ideas into properly scoped tasks in the `.tasks` hierarchy.",
        short_description=short_description,
    )
    body = dedent(
        """\
        # Plan Task

        Use this skill when a user wants to add work to the project plan.

        ## Preconditions
        - Repository has `.tasks/` and `tasks.py`.
        - You can inspect current hierarchy before creating tasks.

        ## Workflow
        1. Recon:
           - Read `.tasks/index.yaml` and related phase/milestone/epic indexes.
           - Find the best existing epic, or identify need for new epic/milestone.
        2. Clarify:
           - Ask only consequential scope and dependency questions.
           - Confirm acceptance criteria expectations.
        3. Decompose:
           - Create atomic tasks with concrete outputs.
           - Set estimate, complexity, priority, dependencies, and tags.
        4. Place:
           - Prefer existing epics unless cohesion would be harmed.
           - Propose new milestone only with explicit user confirmation.
        5. Execute:
           - Use `./tasks.py add ...` (or `add-epic`) to create items.
        6. Verify:
           - Run `./tasks.py show <TASK_ID>` and `./tasks.py list --milestone <ID>`.
           - Summarize created items and rationale.

        ## Quality Gates
        - No vague task titles.
        - No dependency sprawl.
        - No task creation before understanding scope boundaries.

        ## Reference
        See `references/hierarchy-reference.md`.
        """
    )
    return frontmatter + "\n\n" + body


def _plan_ingest_skill(*, client: str, max_subagents: int) -> str:
    """Codex skill template: plan-ingest."""
    short_description = None
    if client in {"codex", "opencode"}:
        short_description = "Spec ingestion to hierarchy-aware decomposition"

    frontmatter = _skill_frontmatter(
        name="plan-ingest",
        description=(
            "Ingest a project specification file or directory and convert it into "
            "structured plan decomposition for `.tasks`."
        ),
        short_description=short_description,
    )
    body = dedent(
        f"""\
        # Plan Ingest: Specification-to-Task Cartography

        You are a rigorous implementation cartographer. Your mandate is to ingest expansive specification material and transmute it into a hierarchically coherent, execution-ready decomposition for the `.tasks` system.

        Use this skill when input artifacts are substantial (single authoritative specification, doc set, RFC directory, or mixed planning corpus) and the user needs a principled mapping to phases, milestones, epics, and tasks.

        ## Operational Tenets

        ### Epistemic Discipline
        Do not infer certainty where evidence is absent. Specifications are frequently uneven: exhaustive in one subsystem, silent in another, and contradictory at interfaces. Preserve uncertainty as explicit assumptions and open questions.

        ### Hierarchical Integrity
        The output taxonomy is strict:

        ```
        Phase (P#) -> Milestone (M#) -> Epic (E#) -> Task (T###)
        ```

        Every proposed unit must satisfy semantic fit at its assigned tier. Avoid pseudo-epics that are mere tasks in disguise, and avoid tasks that are covertly multi-epic initiatives.

        ### Context Accretion Through Deliberate Ordering
        Epic decomposition must be staged to maximize informational yield:
        - Maximum parallel subagents: {max_subagents}
        - Assign epic decomposition out of order, not by natural sequence.
        - Use dependency-aware ordering with topological + farthest-first assignment.
        - Objective: ensure later epic decomposition benefits from context accumulated in earlier passes.

        ## Execution Protocol

        ### Phase 1: Source Reconnaissance
        1. Enumerate and classify input artifacts.
        2. Prioritize high-signal documents (architecture, requirements, constraints, API contracts, non-functional requirements).
        3. Construct a capability map, boundary map, and preliminary dependency graph.

        ### Phase 2: Structural Synthesis
        1. Propose major phases reflecting delivery epochs.
        2. Propose milestones as cohesive capability bundles.
        3. Propose epics as concern-aligned implementation clusters.
        4. Flag ambiguities that materially alter decomposition.

        ### Phase 3: Subagent-Orchestrated Epic Decomposition
        1. Partition candidate epics into decomposition batches.
        2. Dispatch subagents according to the out-of-order strategy above.
        3. Require each subagent to emit:
           - task candidates,
           - subtasks where justified,
           - acceptance criteria,
           - dependency assumptions.

        ### Phase 4: Consolidation and Normalization
        1. Merge subagent outputs into a single proposal.
        2. Eliminate redundancy and resolve scope collisions.
        3. Normalize dependency references and sequencing rationale.
        4. Validate that each task has a falsifiable done-state.

        ### Phase 5: Confirmation Gate
        Before any mutation of `.tasks/`:
        1. Present the full proposed hierarchy and decomposition.
        2. Ask targeted clarifying questions where ambiguity remains consequential.
        3. Obtain explicit user confirmation.

        ### Phase 6: Creation Handoff
        After confirmation, proceed with `plan-task`-compatible creation semantics.

        ## Required Deliverables
        - Hierarchy overview (phases, milestones, epics) with rationale.
        - Epic-level decomposition and task lists.
        - Acceptance criteria per task/subtask.
        - Explicit assumptions, risks, and unresolved decisions.

        ## Anti-Patterns
        - Treating narrative prose as implementation certainty.
        - Linear epic decomposition that forfeits context gains.
        - Over-fragmentation into low-value pseudo-tasks.
        - Concealing ambiguity instead of surfacing it.

        ## Reference
        For validation heuristics, read `references/decomposition-rubric.md`.
        """
    )
    return frontmatter + "\n\n" + body


def _start_tasks_skill(*, client: str) -> str:
    """Skill template: start-tasks."""
    short_description = None
    if client in {"codex", "opencode"}:
        short_description = "Run ongoing tasks grab/cycle execution loop"

    frontmatter = _skill_frontmatter(
        name="start-tasks",
        description=(
            "Run the default `.tasks` execution loop: start with `tasks grab`, "
            "complete work, and iterate with `tasks cycle`."
        ),
        short_description=short_description,
    )
    body = dedent(
        """\
        # Start Tasks

        Use this skill to run execution continuously against an existing `.tasks` tree.

        ## Primary Loop
        1. Start by claiming work with `tasks grab`.
        2. Implement the currently claimed work item(s).
        3. When a task is complete, advance with `tasks cycle [TASK_ID]` (or just `tasks cycle` if context is set).
        4. Repeat indefinitely until the user stops the session or no work remains.

        ## Batch Semantics
        - `tasks grab` may claim sibling batches by default.
        - Complete each claimed task and call `tasks cycle` as each task reaches done-state.
        - Do not reset to `tasks grab` between sibling completions unless context is lost.

        ## CLI Efficiency (Avoid Repeated `--help`)
        - Do not call `tasks --help` or `<command> --help` routinely.
        - Use the command signatures below directly:
          - `tasks grab [--single|--multi|--no-siblings] [--agent AGENT] [--scope SCOPE]`
          - `tasks cycle [TASK_ID] [--agent AGENT]`
          - `tasks show [TASK_OR_SCOPE]`
          - `tasks blocked [TASK_ID] --reason "..." [--no-grab]`
          - `tasks skip [TASK_ID] [--no-grab]`
          - `tasks handoff [TASK_ID] --to AGENT [--notes "..."]`
        - Only consult help output if an invocation actually fails due to argument mismatch.

        ## Operational Guardrails
        - Keep modifications bounded to the active claimed task context.
        - Run targeted tests before each `tasks cycle` that marks work complete.
        - If blocked, use `tasks blocked --reason "..."` promptly instead of stalling.
        - Preserve dependency order; do not force-complete blocked tasks.

        ## Reference
        See `references/tasks-cli-quick-reference.md`.
        """
    )
    return frontmatter + "\n\n" + body


def _hierarchy_reference() -> str:
    """Reference for ID formats and hierarchy."""
    return dedent(
        """\
        # Hierarchy Reference

        ## Structure
        Phase -> Milestone -> Epic -> Task

        ## ID Formats
        - Phase: `P1`
        - Milestone: `P1.M1`
        - Epic: `P1.M1.E1`
        - Task: `P1.M1.E1.T001`

        ## Placement Rules
        - Keep tasks in the smallest coherent epic.
        - Prefer extending existing epics when topic and dependency flow match.
        - Create new epic when concern is distinct or epic would become too large.
        - Create new milestone only when timeline and dependency boundaries justify it.
        """
    )


def _tasks_cli_quick_reference() -> str:
    """Reference cheat sheet for the execution-loop command set."""
    return dedent(
        """\
        # Tasks CLI Quick Reference

        ## Default Execution Loop
        1. `tasks grab`
        2. implement claimed work
        3. `tasks cycle [TASK_ID]`
        4. repeat

        ## Most-used Commands
        - `tasks grab [--single|--multi|--no-siblings] [--agent AGENT] [--scope SCOPE]`
        - `tasks cycle [TASK_ID] [--agent AGENT]`
        - `tasks show [TASK_OR_SCOPE]`
        - `tasks list --available`
        - `tasks blocked [TASK_ID] --reason "..." [--no-grab]`
        - `tasks skip [TASK_ID] [--no-grab]`
        - `tasks handoff [TASK_ID] --to AGENT [--notes "..."]`

        ## Guidance
        - Prefer direct command invocation over routine `--help` calls.
        - Use help only when a command invocation fails due to unknown options.
        """
    )


def _decomposition_rubric() -> str:
    """Reference rubric used by plan-ingest."""
    return dedent(
        """\
        # Decomposition Rubric

        ## Epic-Level Checks
        - Epic objective is explicit and testable.
        - Dependencies are directional and minimal.
        - Scope has clear in/out boundaries.

        ## Task-Level Checks
        - Task title is specific and bounded.
        - Acceptance criteria are observable.
        - Dependencies are concrete task IDs when known.
        - Estimate and complexity are plausible for the scope.

        ## Consolidation Checks
        - No duplicate tasks with overlapping acceptance criteria.
        - Critical dependency chains are represented.
        - Unknowns are surfaced instead of hidden as assumptions.
        """
    )


def _plan_task_command(*, client: str) -> str:
    """Command markdown: plan-task."""
    if client == "opencode":
        return dedent(
            """\
            ---
            description: Convert a feature idea into tasks under `.tasks`.
            ---

            Plan-task mode:

            1. Inspect current `.tasks` hierarchy for correct placement.
            2. Ask focused scope and dependency questions.
            3. Propose task decomposition with acceptance criteria.
            4. Create tasks only after confirmation.
            5. Verify with `tasks show` and `tasks list`.
            """
        )

    return dedent(
        """\
        ---
        description: Convert a feature idea into tasks under `.tasks`.
        argument-hint: "[feature idea]"
        ---

        Plan-task mode:

        1. Inspect current `.tasks` hierarchy for correct placement.
        2. Ask focused scope and dependency questions.
        3. Propose task decomposition with acceptance criteria.
        4. Create tasks only after confirmation.
        5. Verify with `tasks show` and `tasks list`.
        """
    )


def _plan_ingest_command(*, client: str, max_subagents: int) -> str:
    """Command markdown: plan-ingest."""
    if client == "opencode":
        return dedent(
            f"""\
            ---
            description: Ingest a specification file/directory and build a hierarchy-aware implementation plan.
            ---

            Plan-ingest mode:

            1. Parse spec sources and summarize the implementation surface.
            2. Propose phases, milestones, and epics.
            3. Run epic-level decomposition with subagents (max parallel: {max_subagents}).
            4. Assign epics out of order using dependency-aware topological + farthest-first strategy.
            5. Consolidate tasks, subtasks, and acceptance criteria.
            6. Ask clarifying questions where ambiguity blocks quality.
            7. Present final proposal and require confirmation before task creation.
            """
        )

    return dedent(
        f"""\
        ---
        description: Ingest a specification file/directory and build a hierarchy-aware implementation plan.
        argument-hint: "[path to spec file or directory]"
        ---

        Plan-ingest mode:

        1. Parse spec sources and summarize the implementation surface.
        2. Propose phases, milestones, and epics.
        3. Run epic-level decomposition with subagents (max parallel: {max_subagents}).
        4. Assign epics out of order using dependency-aware topological + farthest-first strategy.
        5. Consolidate tasks, subtasks, and acceptance criteria.
        6. Ask clarifying questions where ambiguity blocks quality.
        7. Present final proposal and require confirmation before task creation.
        """
    )


def _start_tasks_command(*, client: str) -> str:
    """Command markdown: start-tasks."""
    if client == "opencode":
        return dedent(
            """\
            ---
            description: Run the continuous tasks execution loop using `tasks grab` then `tasks cycle`.
            ---

            Start-tasks mode:

            1. Begin with `tasks grab`.
            2. Implement claimed work items.
            3. Use `tasks cycle [TASK_ID]` when each task is done.
            4. Continue repeating the cycle until the user stops or no work remains.

            Efficiency rule: use known command signatures directly and avoid repetitive `--help` calls.
            """
        )

    return dedent(
        """\
        ---
        description: Run the continuous tasks execution loop using `tasks grab` then `tasks cycle`.
        argument-hint: "[optional task id for cycle handoff context]"
        ---

        Start-tasks mode:

        1. Begin with `tasks grab`.
        2. Implement claimed work items.
        3. Use `tasks cycle [TASK_ID]` when each task is done.
        4. Continue repeating the cycle until the user stops or no work remains.

        Efficiency rule: use known command signatures directly and avoid repetitive `--help` calls.
        """
    )


def register_commands(cli):
    """Register skills command group."""
    cli.add_command(skills)
