# Go CLI release checklist

## Pre-release verification

- [ ] Working tree is clean for intended release scope.
- [ ] `go run . init --project` smoke path works on a fresh temporary directory.
- [ ] `go test ./...` passes.
- [ ] `make fmt-check` passes.
- [ ] Coverage gate passes (`make coverage-check COVERAGE_THRESHOLD=75`).
- [ ] Command parity acceptance checklist completed (`PARITY_ACCEPTANCE_CHECKLIST.md`).
- [ ] Known command gaps are reviewed in `COMMAND_PARITY_MATRIX.md`.
- [ ] Golden fixture path under `backlog_go/testdata/parity-fixture/` remains stable.

## Release artifacts

- Version tags are created from the module repository head when intended.
- Binaries are built via `go build -o backlog .` and stored as release artifacts.
- Workflow status in `.github/workflows/go-ci.yml` is green.

## Post-release actions

- Update documentation links in `backlog_go/README.md`.
- Confirm release notes and handoff package are attached to the corresponding
  migration task.
- Keep parity and CI thresholds unchanged unless a specific policy change is
  approved.
