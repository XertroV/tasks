#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
INSTALL_ROOT="$DATA_HOME/backlog-cli"
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

mkdir -p "$INSTALL_ROOT"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  python -m venv --system-site-packages "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install --no-build-isolation --no-deps --editable "$ROOT_DIR"

echo "Installed backlog-cli (editable) to: $VENV_DIR"
echo "Executables: $VENV_DIR/bin/backlog, $VENV_DIR/bin/bl"
echo
echo "Verify:"
echo "  $VENV_DIR/bin/backlog --version"
echo
echo "If needed, add to PATH:"
echo "  export PATH=\"$VENV_DIR/bin:\$PATH\""
