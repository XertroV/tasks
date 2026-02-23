# backlog_go

`backlog_go` is the Go implementation of the Backlogs CLI, aligned to project
behavioral contracts defined in Python and TypeScript implementations.

## Quickstart

```bash
cd backlog_go
go run . init --project "Backlog Project"
go run . list
go run . grab
go run . show
go run . done
```

`go run .` prints CLI output to stdout and exits with code `0` on success.

## Install and build

### Run from source

```bash
cd backlog_go
go run .
go run . --help
```

### Build

```bash
cd backlog_go
go build -o backlog .
./backlog --help
```

### Install executable

```bash
cd backlog_go
go install
backlog --help
```

Use `go build` instead of `go install` if your environment cannot write to the
default module bin directory.

### Development workflow

```bash
cd backlog_go
make tidy            # go mod tidy
make fmt             # format source
make fmt-check       # fail if gofmt changes are needed
make test            # run unit tests
make coverage-check  # enforce COVERAGE_THRESHOLD (defaults to 95)
make check           # fmt-check + test + coverage
```

## Command parity and known limitations

Use `COMMAND_PARITY_MATRIX.md` for the authoritative matrix.

- Implemented and parity-targeted: `init`, `list`, `ls`, `tree`, `show`, `add`,
  `add-epic`, `add-milestone`, `add-phase`, `set`, `update`, `claim`, `done`,
  `unclaim`, `grab`, `cycle`, `work`, `next`, `preview`, `sync`, `move`,
  `log`, `dash`, `admin` (compatibility stub), `--help`, and `--version`.
- Limited / planned for this milestone: `search`, `check`, `blockers`, `timeline`,
  `report*`, `data*`, `schema`, `session`, `agents`, `skills`, `idea`,
  `bug`, `handoff`, `why`, and alias/legacy command surfaces.

## Related implementation folders

- `backlog_ts/` — TypeScript/Bun implementation.
- Root project `README.md` for canonical end-user docs.

## Milestone governance docs

- [Parity acceptance checklist](./PARITY_ACCEPTANCE_CHECKLIST.md)
- [CI gating policy](./CI_GATING.md)
- [Release checklist](./RELEASE_CHECKLIST.md)
- [Versioning strategy](./VERSIONING.md)
- [Migration handoff notes](./MIGRATION_HANDOFF.md)
- [Post-implementation review summary](./POST_IMPLEMENTATION_REVIEW.md)
