---
name: start-tasks
description: "Run the default `.tasks` execution loop: start with `tasks grab`, complete work, and iterate with `tasks cycle`."
metadata:
  short-description: "Run ongoing tasks grab/cycle execution loop"
---

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
