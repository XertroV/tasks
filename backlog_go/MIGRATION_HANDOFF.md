# Migration handoff notes

## Ownership transition summary

- Primary implementation scope: Go CLI parity hardening for repository-owned tasks in `P1.M4`.
- Current state: all migration/hardening milestone tasks are implemented as tracked in
  `.backlog/01-go-implementation/...`.
- Go implementation command surface includes explicit parity and intentionally
  deferred command families (documented in `COMMAND_PARITY_MATRIX.md`).

## Known handoff items

- Keep the root `README.md` and `backlog_go/README.md` aligned as behaviors shift.
- Ensure `.github/workflows/go-ci.yml` reflects any required additional dependencies.
- Track future parity work under `P1` backlog tasks.
- Preserve fixtures under `backlog_go/testdata/parity-fixture` whenever loader
  formats change.

## Next owner checklist

- Run `bl check` for the working tree before continuing changes.
- Confirm `bl done` status for any remaining `P1` tasks before claiming new work.
- Update `PARITY_ACCEPTANCE_CHECKLIST.md` whenever behavior surface changes.
