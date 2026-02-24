# Go Client Improvements Backlog (Deferred)

These are intentionally deferred so we do not lose track after the current show/help/hints pass.

## 1) Text/JSON Contract Alignment Audit
- Keep JSON stable while standardizing text semantics:
  - section headers
  - legends
  - marker meanings
  - spacing rules
- Add a lightweight style contract doc for future contributors.

## 2) Report Deep-View Readability
- Improve `report progress --by-milestone` and `--by-epic` text rendering:
  - denser hierarchy summaries
  - clearer rollups
  - better visual separation for completed vs active branches

## 3) Output Snapshot Tests
- Add golden/snapshot coverage for critical text commands:
  - `show`, `list --available`, `report progress`, `timeline`, `claim`
- Focus on semantic anchors and known guidance lines to avoid brittle color-dependent failures.

## 4) Cross-Implementation UX Parity Checks
- Add targeted parity checks for important UX semantics across Python/TypeScript/Go:
  - next-step hints presence
  - error guidance presence
  - alias/help discoverability
- Compare semantic fields/phrases, not full text equality.
