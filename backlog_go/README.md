# backlog_go

A standalone Go implementation of the Backlogs CLI.

This directory is the implementation home for the `P1` phase in `/.backlog`.

## Planned outcome

- Parity behavior with `backlog` (Python) and `backlog_ts` (TypeScript)
- Full command coverage
- Stable machine-readable output (`--json`) and critical-path planning semantics
- Release-ready packaging and CI checks

## Bootstrap

```bash
cd backlog_go

go mod tidy

go run ./
```

## Notes

Implementation is staged using the backlog tasks under `/.backlog/01-go-implementation`.
