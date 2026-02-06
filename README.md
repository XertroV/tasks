# tasks(1)

## NAME
`tasks` - CLI for hierarchical project task orchestration stored in `.tasks/`.

## SYNOPSIS
```bash
tasks <command> [options] [args]
python -m tasks <command> [options] [args]
./tasks.py <command> [options] [args]   # repo-local wrapper
```

## DESCRIPTION
`tasks` manages a Phase -> Milestone -> Epic -> Task tree on disk.

- Loads project state from nested YAML indexes under `.tasks/`.
- Reads task metadata from `.todo` frontmatter.
- Computes a CCPM-style critical path using dependency graphs.
- Enforces status transitions and claim ownership.
- Tracks current work context and agent heartbeats.

## INSTALL
Local editable install (recommended for development):

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
```

Global command from anywhere:

```bash
# from repo root
pipx install --editable .
```

After installation, use `tasks ...` in any working directory (the command still expects a `.tasks/` tree in the current project directory).

`tasks.py` remains available as a repo-local wrapper and auto-reexecs into `.venv/bin/python` when present.

## FILE LAYOUT
Expected task tree:

```text
.tasks/
  index.yaml
  01-phase-name/
    index.yaml
    01-milestone-name/
      index.yaml
      01-epic-name/
        index.yaml
        T001-some-task.todo
```

ID format:

- Phase: `P1`
- Milestone: `P1.M1`
- Epic: `P1.M1.E1`
- Task: `P1.M1.E1.T001`

Task files are Markdown with YAML frontmatter (`id`, `title`, `status`, `estimate_hours`, `complexity`, `priority`, `depends_on`, `tags`, claim timestamps).

## QUICK START
```bash
tasks list --available
tasks grab
tasks show
tasks done
tasks cycle
tasks sync
tasks dash
```

## COMMANDS
Core:

- `list` - list tasks, available work, progress views (`--available`, `--progress`, `--json`, `--complexity`).
- `show [PATH_IDS...]` - detailed phase/milestone/epic/task info.
- `next` - next available task on critical path.
- `claim TASK_ID` - claim a specific task.
- `done [TASK_ID]` - mark complete, record duration, show newly unblocked tasks.
- `cycle [TASK_ID]` - `done` + auto-claim next task.
- `work [TASK_ID|--clear]` - set/show/clear current working context.
- `update TASK_ID STATUS` - manual status transition (`--reason` supported/required for blocked/rejected/cancelled).
- `sync` - recalc stats and critical path.
- `unclaim-stale` - release stale `in_progress` claims.
- `add`, `add-epic`, `add-milestone`, `add-phase` - create new tasks/epics/milestones/phases.

Workflow and analysis:

- `grab` - auto-claim next work item (supports `--single`, `--multi`, sibling batching by default).
- `blocked`, `skip`, `unclaim`, `handoff`, `why` - unblock/reassign/explain workflow.
- `dash` - one-screen status dashboard.
- `search PATTERN` and `blockers` - search and dependency-blocker analysis.
- `timeline` - ASCII timeline/Gantt view.
- `session ...` - session tracking (`start`, `heartbeat`, `list`, `end`, `clean`).
- `report ...` - reports (`progress`, `velocity`, `estimate-accuracy`).
- `data ...` - exports (`export`, `summary`).

## COMMON FLOWS
Claim and complete:

```bash
tasks grab
tasks show
tasks done
```

Pause or transfer:

```bash
tasks blocked --reason "waiting on dependency"
tasks handoff --to agent-2 --notes "implementation done; tests pending"
```

Health checks:

```bash
tasks dash
tasks blockers --deep --suggest
tasks report velocity --days 14
```

## CONTEXT FILES
- `.tasks/.context.yaml` - current/sibling/multi-task working context.
- `.tasks/.sessions.yaml` - active agent heartbeats.
- `.tasks/config.yaml` - optional overrides (agent defaults, stale thresholds, timeline settings).

## TESTS
```bash
pytest -q
```

## NOTES
- Most commands require a valid `.tasks/` tree and will fail fast if missing.
- `done`, `cycle`, `show`, `work`, `blocked`, `skip`, `unclaim`, and `handoff` can use current context when task ID is omitted.
- Stale claim warnings and auto-reclaim behavior are driven by `stale_claim` config thresholds.
