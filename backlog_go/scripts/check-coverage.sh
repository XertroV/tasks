#!/usr/bin/env bash
set -euo pipefail

THRESHOLD="${1:-75}"
COVERAGE_FILE="${2:-coverage.out}"

if [[ ! -f "$COVERAGE_FILE" ]]; then
  echo "Coverage file not found: $COVERAGE_FILE" >&2
  exit 1
fi

if ! command -v go >/dev/null 2>&1; then
  echo "go binary not found in PATH" >&2
  exit 1
fi

ACTUAL=$(go tool cover -func="$COVERAGE_FILE" | awk '/^total:/ {gsub("%", "", $3); print $3; exit}')
if [[ -z "$ACTUAL" ]]; then
  echo "Unable to parse coverage percentage from $COVERAGE_FILE" >&2
  exit 1
fi

echo "Line coverage: ${ACTUAL}% (threshold ${THRESHOLD}%)"
if awk -v actual="$ACTUAL" -v threshold="$THRESHOLD" 'BEGIN { exit (actual + 0 >= threshold + 0 ? 0 : 1) }'; then
  exit 0
fi

echo "Coverage check failed: ${ACTUAL}% < ${THRESHOLD}%" >&2
exit 1
