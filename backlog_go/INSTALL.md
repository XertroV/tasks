# backlog_go install and runtime examples

## Prerequisites

- Go 1.22+.
- Unix-style shell for examples below.

## Quick install

```bash
cd backlog_go
go install
```

If `go install` writes to a location outside your `PATH`, use:

```bash
export PATH="$HOME/go/bin:$PATH"
```

## Run examples

```bash
cd backlog_go
go run . --help
go run . init --project "Backlog Project"
go run . list --json
go run . show --help
```

## Build and distribution

```bash
cd backlog_go
go build -o backlog .
./backlog init --project "Backlog Project"
./backlog list
```

CI runs from this directory should call:

```bash
go test ./...
make coverage-check
```

