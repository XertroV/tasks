#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${BACKLOG_REPO_URL:-https://github.com/XertroV/tasks.git}"
CLONE_DIR="${BACKLOG_CLONE_DIR:-$HOME/.backlogs/backlogs}"

if [[ "$(basename "$CLONE_DIR")" != "backlogs" ]]; then
  echo "error: BACKLOG_CLONE_DIR must end with 'backlogs' (got: $CLONE_DIR)" >&2
  exit 1
fi

find_python() {
  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return
  fi

  if command -v python >/dev/null 2>&1; then
    command -v python
    return
  fi

  echo "error: python3 (>=3.10) is required but was not found" >&2
  exit 1
}

PYTHON_BIN="$(find_python)"

"$PYTHON_BIN" - <<'PY'
import sys

if sys.version_info < (3, 10):
    raise SystemExit("error: Python 3.10+ is required")
PY

mkdir -p "$(dirname "$CLONE_DIR")"

if [[ -d "$CLONE_DIR/.git" ]]; then
  git -C "$CLONE_DIR" fetch --tags --prune
  git -C "$CLONE_DIR" pull --ff-only
elif [[ -e "$CLONE_DIR" ]]; then
  echo "error: $CLONE_DIR exists but is not a git checkout" >&2
  exit 1
else
  git clone "$REPO_URL" "$CLONE_DIR"
fi

VENV_DIR="$CLONE_DIR/.venv"
"$PYTHON_BIN" -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip setuptools wheel
"$VENV_DIR/bin/python" -m pip install --upgrade "$CLONE_DIR"

echo "Installed Backlogs CLI"
echo "  repo: $CLONE_DIR"
echo "  venv: $VENV_DIR"
echo "  executables: $VENV_DIR/bin/backlog, $VENV_DIR/bin/bl"

echo
echo "Try:"
echo "  $VENV_DIR/bin/backlog --help"

echo
echo "If backlog is not found in your shell, add this to your profile:"
echo "  export PATH=\"$VENV_DIR/bin:\$PATH\""
