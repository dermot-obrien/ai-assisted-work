# SPDX-License-Identifier: Apache-2.0
"""Serialise a Model to JSON, YAML or CSV, and read JSON or YAML back.

YAML is emitted with a small writer rather than a dependency. The model is dicts, lists,
strings and ints, so the subset needed is tiny and stdlib-only matters more here than
generality. Reading YAML needs a real parser, so PyYAML is loaded on demand and only for
that direction.
"""
from __future__ import annotations

import csv
import io
import json
import os
import re

from .schema import Model

PLAIN_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_ ./@+-]*$")
FORMATS = ("json", "yaml", "csv")


# ------------------------------------------------------------------------ writing

def to_json(m: Model) -> str:
    return json.dumps(m.to_dict(), indent=2, ensure_ascii=False) + "\n"


def _scalar(v) -> str:
    if v is True:
        return "true"
    if v is False:
        return "false"
    if v is None:
        return "null"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v)
    # Quote anything that could be misread as YAML syntax, a number or a boolean.
    if not s or not PLAIN_RE.match(s) or s.lower() in ("true", "false", "null", "yes", "no", "on", "off"):
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'
    return s


def _yaml(o, indent=0) -> list:
    pad = "  " * indent
    if isinstance(o, dict):
        lines = []
        for k, v in o.items():
            if isinstance(v, (dict, list)) and v:
                lines.append(f"{pad}{k}:")
                lines += _yaml(v, indent + 1)
            elif isinstance(v, (dict, list)):
                lines.append(f"{pad}{k}: {'{}' if isinstance(v, dict) else '[]'}")
            else:
                lines.append(f"{pad}{k}: {_scalar(v)}")
        return lines
    if isinstance(o, list):
        lines = []
        for item in o:
            if isinstance(item, dict):
                sub = _yaml(item, indent + 1)
                first = sub[0].lstrip() if sub else ""
                lines.append(f"{pad}- {first}")
                lines += sub[1:]
            else:
                lines.append(f"{pad}- {_scalar(item)}")
        return lines
    return [f"{pad}{_scalar(o)}"]


def to_yaml(m: Model) -> str:
    return "\n".join(_yaml(m.to_dict())) + "\n"


def to_csv(m: Model) -> str:
    """One flat table: the shape a spreadsheet, a graph import or a diff wants."""
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["kind", "id", "label", "group", "source", "target", "scenario", "step"])
    for n in m.nodes:
        w.writerow(["node", n.id, n.label, n.group, "", "", "", ""])
    for e in m.edges:
        w.writerow(["edge", e.id, e.label, "", e.source, e.target, "", ""])
    for sc in m.scenarios:
        for st in sc.steps:
            w.writerow(["step", st.edge, st.action, "", st.actor, st.target, sc.key, st.step])
    return buf.getvalue()


def dumps(m: Model, fmt: str) -> str:
    fmt = (fmt or "json").lower()
    if fmt == "json":
        return to_json(m)
    if fmt in ("yaml", "yml"):
        return to_yaml(m)
    if fmt == "csv":
        return to_csv(m)
    raise SystemExit(f"  ! unknown format '{fmt}'; expected one of {', '.join(FORMATS)}")


# ------------------------------------------------------------------------ reading

def read(path) -> Model:
    ext = os.path.splitext(path)[1].lower()
    text = open(path, encoding="utf-8").read()
    if ext == ".json":
        return Model.from_dict(json.loads(text))
    if ext in (".yaml", ".yml"):
        try:
            import yaml
        except ModuleNotFoundError:
            raise SystemExit(
                "  ! reading YAML needs PyYAML: pip install pyyaml\n"
                "    (writing YAML needs nothing; only the read direction has the dependency)")
        return Model.from_dict(yaml.safe_load(text))
    raise SystemExit(f"  ! cannot read a model from '{ext}'; expected .json, .yaml or .yml")
