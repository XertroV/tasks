#!/usr/bin/env python3
"""PAG-Server Task Management CLI."""

import sys
from pathlib import Path

# Ensure we use the venv
venv_python = Path(__file__).parent / ".venv" / "bin" / "python"
if venv_python.exists() and not sys.executable.endswith("/.venv/bin/python"):
    import os

    os.execv(str(venv_python), [str(venv_python)] + sys.argv)

from tasks.cli import cli

if __name__ == "__main__":
    cli()
