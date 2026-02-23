# PAG-Server Task Management System

This directory contains the hierarchical task breakdown for PAG-Server development.

## Quick Start

The task CLI is `backlog` (alias: `tasks`). Install via:

```bash
curl -fsSO https://raw.githubusercontent.com/XertroV/tasks/refs/heads/master/install.sh
sh install.sh
```

### Basic Commands

```bash
# Claim the next available task (auto-selects by priority/critical path)
backlog grab

# Claim a specific task
backlog claim P1.M1.E1.T001

# Show task details
backlog show P1.M1.E1.T001

# Mark task complete and grab the next one
backlog cycle

# Mark task complete (without grabbing next)
backlog done P1.M1.E1.T001

# Dashboard overview
backlog dash

# List tasks in a scope
backlog ls <PHASE|MILESTONE|EPIC>

# Show full hierarchy tree
backlog tree

# Add a new task to an epic
backlog add <EPIC_ID> \
  --title "Task title" \
  --estimate <hours> \
  --complexity <low|medium|high|critical> \
  --priority <low|medium|high|critical> \
  --depends-on "P#.M#.E#.T###" \
  --tags "tag1,tag2" \
  --body "Description and acceptance criteria"

# Add a new epic to a milestone
backlog add-epic <MILESTONE_ID> \
  --title "Epic name" \
  --estimate <hours> \
  --complexity <low|medium|high|critical> \
  --depends-on "E#,E#"

# Report progress
backlog report progress

# Recalculate statistics and critical path
backlog sync
```

## Directory Structure

```
.tasks/
├── index.yaml               # Root index (phases)
├── 01-foundation/           # Phase 1
│   ├── index.yaml           # Phase index (milestones)
│   ├── 01-project-init/     # Milestone 1
│   │   ├── index.yaml       # Milestone index (epics)
│   │   ├── 01-phoenix-setup/    # Epic 1
│   │   │   ├── index.yaml       # Epic index (tasks)
│   │   │   ├── T001-mix-new.todo
│   │   │   ├── T002-deps.todo
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── bugs/                    # Bug reports (B### IDs)
└── ideas/                   # Captured ideas (I### IDs)
```

## Task File Format

Each `.todo` file contains:
- **YAML Frontmatter**: Metadata (ID, status, estimates, claims)
- **Markdown Body**: Requirements, acceptance criteria, context, notes

Example:

```markdown
---
id: P1.M1.E1.T001
title: Initialize Phoenix project
status: pending
estimate_hours: 0.5
complexity: low
priority: high
depends_on: []
claimed_by: null
claimed_at: null
---

# Initialize Phoenix project

Description here...

## Requirements

- [ ] Step 1
- [ ] Step 2

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
```

## Status Workflow

```
pending ──claim──> in_progress ──complete──> done
   │                    │
   └──block──> blocked  │
                └──reject──> rejected
```

Valid transitions:
- `pending` → `in_progress`, `blocked`, `cancelled`
- `in_progress` → `done`, `blocked`, `rejected`, `pending`
- `done` → `blocked`, `rejected`
- `blocked` → `pending`, `cancelled`
- `rejected` → `pending`

## Critical Path

The CLI automatically calculates the critical path using CCPM (Critical Chain Project Management):

1. Builds dependency graph from explicit `depends_on` and implicit ordering
2. Weights tasks by estimate × complexity multiplier
3. Finds longest path (critical path)
4. Identifies next available unclaimed task

Complexity multipliers:
- `low`: 1.0x
- `medium`: 1.25x
- `high`: 1.5x
- `critical`: 2.0x

## Current Status

See `backlog dash` for live status. Project has 19 phases; most are complete.
