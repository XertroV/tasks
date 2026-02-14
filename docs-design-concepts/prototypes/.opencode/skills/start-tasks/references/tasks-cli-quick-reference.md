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
