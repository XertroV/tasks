# Go CLI parity acceptance checklist

This checklist is used by `P1.M4.E3.T001` and by release reviews.

## Canonical behavior checks

- [ ] Command parsing matches canonical usage and exits with expected non-zero codes.
- [ ] `--help` and `--version` are consistent and available from root.
- [ ] Core command set for this milestone returns success for success paths:
  - `init`
  - `list`, `ls`
  - `tree`
  - `show`
  - `log`
  - `dash`
  - `add`, `add-epic`, `add-milestone`, `add-phase`
  - `claim`, `unclaim`, `grab`, `done`, `cycle`, `work`, `set`, `update`, `next`,
    `preview`, `move`, `sync`, `undone`
- [ ] JSON output contract for supported commands remains parseable (e.g.
  `list --json`, `next --json`, `dash --json`, `next` payload shape).
- [ ] Data mutations persist deterministically:
  - `update`, `set`, `done`, `claim`, `grab`, `unclaim`, `move`, `sync`.
- [ ] Error messages remain actionable for malformed IDs, malformed flags, and
  missing/invalid paths.
- [ ] `admin` follows compatibility behavior without crashing (informative
  implemented-not-yet message).

## Cross-implementation confidence checks

- [ ] Golden fixture set exists for Go parity testing in `backlog_go/testdata`.
- [ ] Shared fixture execution can be replayed against Python and TypeScript
  without manual data reshaping.
- [ ] Parity runner confirms exit-code parity for implemented command families.
- [ ] Parity runner confirms comparable JSON contracts for supported `--json` commands.
- [ ] Known command gaps are explicitly enumerated in `COMMAND_PARITY_MATRIX.md`.

## Regression safety checks

- [ ] `go test ./...` passes with clean output.
- [ ] `make fmt-check` returns clean.
- [ ] Coverage gate meets or exceeds the repository threshold.
- [ ] No hidden side effects from command handlers in unrelated command families.
