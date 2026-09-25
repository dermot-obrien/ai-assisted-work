#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Entry point that runs from a copied directory, with nothing installed.

A skill is copied into a tool's skills folder, not pip-installed, so the package has to
be importable from where it sits. pyproject.toml is there for anyone who does want a
real install and a `model` command on PATH.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src"))

from model.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
