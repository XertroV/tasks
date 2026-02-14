---
name: plan-ingest
description: "Ingest a project specification file or directory and convert it into structured plan decomposition for `.tasks`."
metadata:
  short-description: "Spec ingestion to hierarchy-aware decomposition"
---

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
- Maximum parallel subagents: 6
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
