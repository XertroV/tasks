# Go CI gating rules

## Thresholds

- Formatting: `gofmt` must report no files.
- Unit tests: `go test ./...` must pass.
- Coverage: minimum line coverage is `75%`.
- Parse/JSON contract checks: command families with `--json` outputs must continue
  to emit parseable JSON in compatibility mode.

## Fail conditions

- Any command returning non-zero outside expected failure tests fails the run.
- Coverage below threshold fails the job.
- Missing parity fixture data or mismatches between fixtures and expected
  canonical state fails parity jobs.
- Deterministic failures in command-state comparisons (state drift between
  supported implementations) fail the parity run.

## Runbook

1. Execute `make fmt-check` from `backlog_go`.
2. Execute `go test ./...`.
3. Execute `make coverage-check COVERAGE_THRESHOLD=75`.
4. Execute parity harness checks when external toolchain dependencies are
   available.
