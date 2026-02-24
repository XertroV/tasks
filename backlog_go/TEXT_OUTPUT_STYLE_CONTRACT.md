# Go CLI Text/JSON Output Style Contract

This contract keeps text output consistent and agent-friendly while preserving stable JSON payloads.

## Scope

- Applies to user-facing text output in `backlog_go/internal/runner`.
- Applies to commands with both text and JSON modes (`--json` or `--format json`).

## JSON Contract Rules

- JSON schema/field names are compatibility-sensitive.
- Text readability improvements must not change JSON keys, types, or semantic meaning.
- Prefer additive JSON changes only when required, and gate them with tests.

## Text Contract Rules

- Section headers:
  - Use clear top-level headers (for example: `Progress Report`, `Project Timeline`).
  - Use stable subsection labels (`Overall`, `Auxiliary`, `Phases`, etc.).
- Legend lines:
  - Include an explicit legend when symbols/markers are used.
  - Keep legend wording stable enough for semantic tests.
- Marker meanings:
  - `✓` = complete branch/item.
  - `→` = in-progress branch/item.
  - `·` = pending/no active work.
- Spacing:
  - One blank line between major sections.
  - Indentation should reflect hierarchy depth consistently.
  - Deep views should separate active vs completed branches clearly.

## Test Expectations

- Snapshot/anchor tests should verify semantic anchors, not ANSI color bytes.
- Parity tests should compare UX semantics across Go/Python/TypeScript:
  - next-step hints
  - error guidance
  - alias/help discoverability

