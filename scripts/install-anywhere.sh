#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
BIN_HOME="${XDG_BIN_HOME:-$HOME/.local/bin}"
INSTALL_ROOT="$DATA_HOME/tasks-cli"
VENV_DIR="$INSTALL_ROOT/venv"

python - <<'PY'
import importlib.util
import sys

required = [
    ("click", "python-click"),
    ("yaml", "python-pyyaml"),
    ("rich", "python-rich"),
    ("networkx", "python-networkx"),
    ("setuptools", "python-setuptools"),
]

missing = [pkg for module, pkg in required if importlib.util.find_spec(module) is None]
if missing:
    print("Missing system Python dependencies.")
    print("Install on Arch with:")
    print("  sudo pacman -S --needed " + " ".join(missing))
    sys.exit(1)
PY

mkdir -p "$INSTALL_ROOT" "$BIN_HOME"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  python -m venv --system-site-packages "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install --no-build-isolation --no-deps --editable "$ROOT_DIR"

ln -sf "$VENV_DIR/bin/tasks" "$BIN_HOME/tasks"

echo "Installed tasks-cli (editable) to: $VENV_DIR"
echo "Linked commands in: $BIN_HOME"
echo
echo "Verify:"
echo "  $BIN_HOME/tasks --version"
echo
echo "If needed, add to PATH:"
echo "  export PATH=\"$BIN_HOME:\$PATH\""
