# SPDX-License-Identifier: Apache-2.0
"""model: one model, several representations.

Markdown tables, draw.io, JSON and YAML are projections of the same boxes-and-lines
model. This package extracts a model from any of them, emits it to any of them,
validates one against another, and renders the diagram.

Nothing here knows what the boxes mean. Domain vocabulary lives in `model.toml`.
"""
__version__ = "0.4.0"

from .schema import Model, Node, Edge, Group, Scenario, Step  # noqa: F401
from . import config, drawio, markdown, serial, validate, render, sync, scan, animate  # noqa: F401

__all__ = ["Model", "Node", "Edge", "Group", "Scenario", "Step",
           "config", "drawio", "markdown", "serial", "validate", "render", "sync", "scan", "animate",
           "load", "__version__"]


def load(path, cfg=None):
    """Read a model from whichever representation `path` is, by extension."""
    import os
    if cfg is None:
        cfg = config.load(None, near=path)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".md", ".markdown", ".mdx"):
        return markdown.read(path, cfg)
    if ext == ".drawio":
        return drawio.read(path, cfg)
    if ext in (".json", ".yaml", ".yml"):
        return serial.read(path)
    raise SystemExit(f"  ! cannot read a model from '{ext}'; "
                     f"expected .md, .drawio, .json, .yaml or .yml")
