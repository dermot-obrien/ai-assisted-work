# SPDX-License-Identifier: Apache-2.0
"""Find the models in a folder: every document that declares its diagram.

A folder may hold several models side by side, such as a reference architecture and two
alternative views of the same space. Each is a document plus the diagram it names, and
the model is whatever the document's tables say. Nothing is inferred from file names:
the declaration is what makes a pair a pair.

    ---
    model:
      diagram: components.drawio
    ---

Local identifiers are scoped to their document, so two documents in one folder can each
have a local 01 that means different things. Reports qualify them as `doc.md#01`.
"""
from __future__ import annotations

import os
import re

from . import drawio, markdown
from . import validate as validate_mod

MD_EXT = (".md", ".markdown", ".mdx")


def declared(path) -> dict:
    """The `model:` block of a document's front matter, or {} when it has none."""
    try:
        meta = markdown.read_meta(path)
    except (OSError, UnicodeDecodeError):
        return {}
    block = meta.get("model")
    return block if isinstance(block, dict) else {}


def find(folder, recursive=False) -> tuple:
    """(tuples, skipped): documents that declare a diagram, and those that do not."""
    found, skipped = [], []
    walker = os.walk(folder) if recursive else [(folder, [], os.listdir(folder))]
    for root, dirs, files in walker:
        dirs[:] = sorted(d for d in dirs if not d.startswith((".", "_")) and d != "dist")
        for f in sorted(files):
            if not f.lower().endswith(MD_EXT):
                continue
            p = os.path.join(root, f)
            block = declared(p)
            if block.get("diagram"):
                found.append((p, block))
            else:
                skipped.append(p)
    return found, skipped


def view_names(diagram_path) -> list:
    """The images a publish step renders for one diagram.

    The structure layer alone becomes `<stem>.svg`. Each scenario layer, keyed by the
    leading token of its name, becomes `<stem>-<key>.svg` rendered over the structure,
    so two models in one folder never write the same file.
    """
    stem = os.path.splitext(os.path.basename(diagram_path))[0]
    layers = drawio.layer_names(diagram_path)
    if not layers:
        return []
    base = layers[0]
    views = [{"file": f"{stem}.svg", "layers": [base]}]
    for name in layers[1:]:
        key = (name.split() or [""])[0]
        if re.fullmatch(r"S[0-9]+", key):
            views.append({"file": f"{stem}-{key.lower()}.svg", "layers": [base, name],
                          "scenario": key})
    return views


def inspect(doc_path, block, cfg) -> dict:
    """Validate one document against its diagram and describe what publishing needs."""
    doc = markdown.read(doc_path, cfg)
    dia_path = os.path.normpath(os.path.join(os.path.dirname(doc_path), block["diagram"]))
    entry = {
        "doc": doc_path,
        "diagram": dia_path,
        "diagramExists": os.path.exists(dia_path),
        "summary": doc.summary(),
        "localIds": [f"{os.path.basename(doc_path)}#{n.id}"
                     for n in doc.nodes if cfg.is_local(n.id)],
        "deckTagged": _deck_tagged(doc_path),
        "views": [],
    }
    diagram = None
    if entry["diagramExists"]:
        try:
            diagram = drawio.read(dia_path, cfg)
            entry["views"] = view_names(dia_path)
        except Exception as ex:                  # an unreadable diagram is a finding
            entry["diagramError"] = str(ex)
    findings = validate_mod.check(doc, cfg, diagram)
    if not entry["diagramExists"]:
        findings.append(validate_mod.Finding(
            "doc_not_in_diagram", "error",
            f"declared diagram {block['diagram']} does not exist; emit it first",
            os.path.basename(doc_path)))
    entry["result"] = validate_mod.worst(findings)
    entry["counts"] = {s: sum(1 for f in findings if f.severity == s) for s in ("error", "warn")}
    entry["findings"] = [f.to_dict() for f in findings]
    return entry


def _deck_tagged(path) -> bool:
    with open(path, encoding="utf-8") as fh:
        return "<!-- deck:" in fh.read()
