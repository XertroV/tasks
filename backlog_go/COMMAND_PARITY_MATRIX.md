# backlog_go command parity matrix

This document tracks behavior against the Python and TypeScript reference
implementations for milestone release planning.

## Status legend

- ✅ parity-targeted
- ⚠️ implemented but with noted limitations
- ⚙️ implemented as explicit compatibility stub
- ❌ not implemented in this milestone

## Matrix

| Command | go | parity status |
|---|---|---|
| `init` | ✅ | Fully implemented |
| `list`, `ls` | ✅ | Parity-targeted command output |
| `tree` | ✅ | Parity-targeted |
| `show` | ✅ | Parity-targeted |
| `add` | ✅ | Parity-targeted |
| `add-epic` | ✅ | Parity-targeted |
| `add-milestone` | ✅ | Parity-targeted |
| `add-phase` | ✅ | Parity-targeted |
| `set` | ✅ | Parity-targeted |
| `update` | ✅ | Parity-targeted |
| `claim` | ✅ | Parity-targeted |
| `done` | ✅ | Parity-targeted |
| `unclaim` | ✅ | Parity-targeted |
| `grab` | ✅ | Parity-targeted |
| `cycle` | ✅ | Parity-targeted |
| `work` | ✅ | Parity-targeted |
| `next` | ✅ | Parity-targeted |
| `preview` | ✅ | Parity-targeted |
| `move` | ✅ | Parity-targeted |
| `sync` | ✅ | Parity-targeted |
| `log` | ✅ | Parity-targeted |
| `dash` | ✅ | Parity-targeted |
| `admin` | ⚙️ | Compatibility stub with explicit guidance |
| `check` | ❌ | Not implemented |
| `search` | ❌ | Not implemented |
| `blockers` | ❌ | Not implemented |
| `why` | ❌ | Not implemented |
| `timeline` | ❌ | Not implemented |
| `report` | ❌ | Not implemented |
| `data` | ❌ | Not implemented |
| `schema` | ❌ | Not implemented |
| `session` | ❌ | Not implemented |
| `agents` | ❌ | Not implemented |
| `skills` | ❌ | Not implemented |
| `idea` | ❌ | Not implemented |
| `bug` | ❌ | Not implemented |
| `handoff` | ❌ | Not implemented |

## Current known limitation

- The Go CLI uses `.backlog` as the primary project directory and intentionally
  reports unsupported command gaps instead of silently no-opping.
- Some command aliases from Python/TypeScript (`grants`, `sprint`, and other legacy
  entrypoints) are deferred to future milestones.
