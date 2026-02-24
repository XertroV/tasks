#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GO_PROJECT_DIR="$ROOT_DIR/backlog_go"
OUTPUT_BIN="$ROOT_DIR/backlog-go"

if [[ ! -d "$GO_PROJECT_DIR" ]]; then
  echo "Go project directory not found: $GO_PROJECT_DIR" >&2
  exit 1
fi

if ! command -v go >/dev/null 2>&1; then
  echo "Go toolchain not found in PATH." >&2
  exit 1
fi

(
  cd "$GO_PROJECT_DIR"
  go build -o "$OUTPUT_BIN" .
)

echo "Built binary: $OUTPUT_BIN"
