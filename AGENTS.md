# `backlog` -- a utility for managing project backlogs via files

## Expectations

- Keep files under 1000 LoC ideally; hard limit at 2000.
- Proactively exploit refactor opportunities towards a cleaner, more maintainable codebase. Always remove code duplication where practical.
 - When implementing features, implement them for both the python `backlog/` and typescript `backlog_ts/`.
 - Ensure `backlog/` and `backlog_ts/` are kept in sync (especially behaviorally)
- For JavaScript/TypeScript tooling and scripts, prefer `bun` over `npm` in all commands and docs.

## Task CLI quick rules (agent-facing)

- Do not assume positional arguments are accepted by `backlog` commands.
- If a `backlog` command fails with argument or usage parsing, run exactly one recovery command: `backlog cycle`.
- Prefer explicit task claiming when task IDs are provided:
  - `backlog claim <TASK_ID> [TASK_ID ...]`
- Use `backlog grab` for automatic selection, not for passing explicit task IDs.
- Keep Python and TypeScript implementations behaviorally in sync:
  - Python: `backlog/`
  - TypeScript: `backlog_ts/`
