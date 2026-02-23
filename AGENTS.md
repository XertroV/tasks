# `backlog` -- a utility for managing project backlogs via files

3 clients are maintained to parity:
- python: `backlog`
- typescript: `backlog_ts`
- go: `backlog_go`

## Expectations

- Keep files under 1000 LoC ideally; hard limit at 2000.
- Proactively exploit refactor opportunities towards a cleaner, more maintainable codebase. Always remove code duplication where practical.
 - When implementing features, implement them for both the python `backlog/` and typescript `backlog_ts/`.
 - Ensure `backlog/` and `backlog_ts/` are kept in sync (especially behaviorally); we aim for parity.
- For JavaScript/TypeScript tooling and scripts, prefer `bun` over `npm` in all commands and docs.
- When adding new features, ALWASY write accompanying tests (for both python and typescript).
- When fixing bugs, ALWAYS check & fix both codebases.
- When adding commands, flags, etc, ALWAYS add to both codebases (and implement the base feature in typescript if it's missing).
- When designing, remember that this is meant to be useful and discoverable for agents! Keep to predictable patterns, ensure error messages are detailed, and generally ensure the tool is as helpful as possible.

## Task CLI quick rules (agent-facing)

- Do not assume positional arguments are accepted by `backlog` commands.
- If a `backlog` command fails with argument or usage parsing, run exactly one recovery command: `backlog cycle`.
- Prefer explicit task claiming when task IDs are provided:
  - `backlog claim <TASK_ID> [TASK_ID ...]`
- Use `backlog grab` for automatic selection, not for passing explicit task IDs.
- Keep Python, Go, and TypeScript implementations behaviorally in sync:
  - Python: `backlog/`
  - TypeScript: `backlog_ts/`
  - Go: `backlog_go/`

# Work Loop & Task Backlog

We are dogfooding!

## Defaults
- Claim with `backlog grab` (or `backlog grab --single` for focused work).
- Use `backlog claim <TASK_ID> [TASK_ID ...]` when task IDs are provided.
- If command argument parsing fails, run `backlog cycle` once to recover.
- CLI selection order is: critical-path first, then task priority.
- Use `backlog work <id>` when switching context; use `backlog show` to review details.

## Execution Loop
1. `backlog grab` and read the task file.
2. Implement in small commits and keep diff narrow.
3. Run focused tests early, then broader tests before completion.
4. Finish with `backlog done` (or `backlog cycle` to continue immediately).

## Coordination
- Use `backlog handoff --to <agent> --notes "<context>"` for ownership transfer.
- Use `backlog blockers --suggest` and `backlog why <task-id>` when sequencing is unclear.
- Run `backlog dash` and `backlog report progress` for health checks.

