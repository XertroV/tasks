# `tasks` -- a utility for managing tasks via files

## Expectations

- Keep files under 1000 LoC ideally; hard limit at 2000.
- Proactively exploit refactor opportunities towards a cleaner, more maintainable codebase. Always remove code duplication where practical.
 - When implementing features, implement them for both the python `tasks/` and typescript `tasks_ts/`.
 - Ensure `tasks/` and `tasks_ts/` are kept in sync (especially behaviorally)

## Task CLI quick rules (agent-facing)

- Do not assume positional arguments are accepted by `tasks` commands.
- If a `tasks` command fails with argument or usage parsing, run exactly one recovery command: `tasks cycle`.
- Prefer explicit task claiming when task IDs are provided:
  - `tasks claim <TASK_ID> [TASK_ID ...]`
- Use `tasks grab` for automatic selection, not for passing explicit task IDs.
- Keep Python and TypeScript implementations behaviorally in sync:
  - Python: `tasks/`
  - TypeScript: `tasks_ts/`
