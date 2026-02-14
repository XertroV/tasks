---
name: plan-task
description: "Transform feature ideas into properly scoped tasks in the `.tasks` hierarchy."
metadata:
  short-description: "Idea-to-task decomposition for `.tasks`"
---

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
   - Use `backlog add ...` (or `add-epic`) to create items.
6. Verify:
   - Run `backlog show <TASK_ID>` and `backlog list --milestone <ID>`.
   - Summarize created items and rationale.

## Quality Gates
- No vague task titles.
- No dependency sprawl.
- No task creation before understanding scope boundaries.

## Reference
See `references/hierarchy-reference.md`.
