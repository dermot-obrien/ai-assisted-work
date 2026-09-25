# SPDX-License-Identifier: Apache-2.0
"""Rules over a Model, and over the agreement between two representations of one.

Every rule has a configurable severity, because a rule that is right for a new diagram
authored to the convention is often wrong as a hard failure across an existing estate.
A tool that cannot be adopted incrementally does not get adopted.

The rules that earn their keep are the agreement ones. Anyone can see that a box has no
label. Nobody can see, by looking, that an arrow was re-pointed without its metadata
following, or that a row was added to a table and never drawn.
"""
from __future__ import annotations

import csv
import os

from .config import MAPPING_RELATIONSHIPS
from .schema import Model


class Finding:
    __slots__ = ("rule", "severity", "message", "where")

    def __init__(self, rule, severity, message, where=""):
        self.rule, self.severity, self.message, self.where = rule, severity, message, where

    def __str__(self):
        w = f"{self.where}: " if self.where else ""
        return f"{self.severity}  {w}{self.message}  [{self.rule}]"

    def to_dict(self):
        return {"rule": self.rule, "severity": self.severity,
                "message": self.message, "where": self.where}


def _add(out, cfg, rule, message, where=""):
    sev = cfg.severity(rule)
    if sev != "off":
        out.append(Finding(rule, sev, message, where))


def load_catalogue(cfg):
    """Identifiers the project recognises, plus anything wrong with getting them.

    Returns (ids, problems). A declared catalogue that cannot be read is a problem, not
    an absence. Skipping it silently turns `not_in_catalogue` into a no-op precisely when
    the configuration is wrong, which is the moment it most needs to speak up: a skill
    installed into a repository with a different layout points at nothing, and a rule set
    to `error` then passes everything.

    Three ways it can be wrong, all of them silent before: the file is not there, the
    declared column is not in it, or the column is there and empty.
    """
    ids, problems = set(), []
    for cat in cfg.catalogues:
        p = cfg.resolve(cat.path)
        if not os.path.exists(p):
            problems.append((cat, f"catalogue not found: {p}"))
            continue
        try:
            with open(p, newline="", encoding="utf-8-sig") as fh:
                reader = csv.DictReader(fh)
                cols = reader.fieldnames or []
                if cat.column not in cols:
                    shown = ", ".join(cols[:8]) + ("..." if len(cols) > 8 else "")
                    problems.append((cat, f"catalogue {cat.path} has no column "
                                          f"'{cat.column}'; it has {shown or '(no header)'}"))
                    continue
                found = 0
                for row in reader:
                    v = (row.get(cat.column) or "").strip()
                    if v:
                        ids.add(v)
                        found += 1
                if not found:
                    problems.append((cat, f"catalogue {cat.path} column "
                                          f"'{cat.column}' holds no values"))
        except (OSError, UnicodeDecodeError, csv.Error) as ex:
            problems.append((cat, f"catalogue {cat.path} could not be read: {ex}"))
    return ids, problems


def structural(m: Model, cfg) -> list:
    """Rules that need only the model itself."""
    out = []
    seen = {}

    for u in m.attrs.get("unmatched", []):
        hint = (f"; a local id leads its cell, as in '{cfg.local_prefix or ''}01 Name'"
                if cfg.has_local else "")
        _add(out, cfg, "id_unmatched",
             f"'{u['text']}' in {u['section']} matches no identifier rule, so the row "
             f"was not read{hint}", u["section"])

    for n in m.nodes:
        if not n.id:
            _add(out, cfg, "node_missing_id", f"node '{n.label}' has no identifier")
            continue
        held = n.attrs.get("id_attr")
        if held:
            want = cfg.attr_for(n.id)
            local_held = held == cfg.local_attr
            if cfg.is_local(n.id) != local_held and cfg.has_local:
                _add(out, cfg, "id_attr_mismatch",
                     f"{n.id} is held in '{held}' but belongs in '{want}'; a local id "
                     f"must never pass for a catalogue one, nor the reverse", n.id)
        if n.id in seen:
            _add(out, cfg, "node_duplicate_id",
                 f"{n.id} appears twice, likely a copy-paste", n.id)
        seen.setdefault(n.id, n)
        mx = n.attrs.get("mxcell_id")
        if mx and mx != cfg.cell_id_for(n.id):
            _add(out, cfg, "node_id_mismatch",
                 f"shape id is '{mx}' but should be '{cfg.cell_id_for(n.id)}' for {n.id}, "
                 f"so duplication stays detectable", n.id)

    ids = m.node_ids()
    for e in m.edges:
        where = e.key
        if not e.id:
            _add(out, cfg, "edge_missing_id", "connector has no identifier", where)
        if not e.label:
            _add(out, cfg, "edge_unlabelled", "connector does not say what flows", where)
        if not e.source or not e.target:
            _add(out, cfg, "edge_dangling", "connector has a free end", where)
            continue
        for role, v in (("source", e.source), ("target", e.target)):
            if v not in ids:
                _add(out, cfg, "edge_unknown_endpoint",
                     f"{role} '{v}' is not an identified node", where)

    for sc in m.scenarios:
        nums = [s.step for s in sc.steps]
        if not sc.key:
            _add(out, cfg, "step_missing_fields", "scenario has no key")
        for s in sc.steps:
            if not s.step or not s.actor:
                _add(out, cfg, "step_missing_fields",
                     f"step '{s.action}' is missing a number or an actor", sc.key)
            for role, claimed in (("from", s.attrs.get("from") or s.attrs.get("from_abb")),
                                  ("to", s.attrs.get("to") or s.attrs.get("to_abb"))):
                real = s.actor if role == "from" else s.target
                if claimed and real and claimed != real:
                    _add(out, cfg, "step_endpoint_mismatch",
                         f"step {s.step} asserts {role}={claimed} but resolves to {real}; "
                         f"it was re-pointed without updating the data", sc.key)
        uniq = sorted(set(nums))
        if uniq and uniq != list(range(1, len(uniq) + 1)):
            _add(out, cfg, "step_not_contiguous",
                 f"step numbers are {uniq}; they must run contiguously from 1", sc.key)

    return out


def catalogue(m: Model, cfg) -> list:
    out = []
    if not cfg.catalogues:
        return out                      # none declared: there is nothing to check against

    known, problems = load_catalogue(cfg)
    for cat, msg in problems:
        _add(out, cfg, "catalogue_unreadable", msg, cat.path)
    if not known:
        # Every catalogue failed, and each failure is already reported. Flagging every
        # node as unknown on top of that would bury the one finding that matters.
        return out

    for n in m.nodes:
        if n.id and not cfg.is_local(n.id) and n.id not in known:
            _add(out, cfg, "not_in_catalogue", f"{n.id} is not in the catalogue", n.id)
    return out


def mapping(m: Model, cfg) -> list:
    """Every local node says what it realises, partly covers, or leaves as a gap.

    Only local nodes need a row. A catalogued node is its own mapping, which is why a
    row for one is reported rather than silently carried.
    """
    out = []
    if not cfg.has_local:
        return out
    rows = m.attrs.get("mapping", [])
    locals_ = {n.id for n in m.nodes if cfg.is_local(n.id)}
    by_local = {}
    known, _problems = load_catalogue(cfg) if cfg.catalogues else (set(), [])
    drawn = m.node_ids()
    sec = cfg.mapping.section

    for r in rows:
        lid, tgt, rel = r["local"], r["maps_to"], r["relationship"]
        where = f"{sec}: {lid}"
        by_local.setdefault(lid, []).append(r)
        if not cfg.is_local(lid):
            _add(out, cfg, "mapping_invalid",
                 f"{lid} is not a local id; only local ids belong here", where)
            continue
        if lid not in locals_:
            _add(out, cfg, "mapping_unknown_local",
                 f"{lid} has a mapping row but is not a node in this document", where)
        if rel not in MAPPING_RELATIONSHIPS:
            _add(out, cfg, "mapping_invalid",
                 f"relationship '{rel or '(blank)'}' must be one of "
                 f"{', '.join(MAPPING_RELATIONSHIPS)}", where)
            continue
        if rel == "gap" and tgt:
            _add(out, cfg, "mapping_invalid",
                 f"{lid} is a gap but names {tgt}; a gap has no target", where)
        if rel != "gap" and not tgt:
            _add(out, cfg, "mapping_invalid",
                 f"{lid} is '{rel}' but names no target", where)
        if tgt:
            if cfg.is_local(tgt):
                _add(out, cfg, "mapping_invalid",
                     f"{lid} maps to {tgt}, another local id; map to the catalogue", where)
            elif known and tgt not in known:
                _add(out, cfg, "mapping_not_in_catalogue",
                     f"{lid} maps to {tgt}, which is not in the catalogue", where)
            if rel == "realises" and tgt in drawn:
                _add(out, cfg, "mapping_duplicates_node",
                     f"{lid} realises {tgt}, which is also drawn here; one concept, two "
                     f"boxes", where)

    for lid in sorted(locals_):
        if lid not in by_local:
            _add(out, cfg, "mapping_missing",
                 f"{lid} has no row in {sec}; say what it realises, or that it is a gap",
                 lid)
    return out


def check(doc: Model, cfg, diagram: Model = None) -> list:
    """Every rule that applies to a document, and to its diagram when there is one."""
    findings = structural(doc, cfg) + catalogue(doc, cfg) + mapping(doc, cfg)
    if diagram is not None:
        findings += [f for f in structural(diagram, cfg)
                     if f.rule in ("node_duplicate_id", "id_attr_mismatch",
                                   "edge_dangling", "edge_unknown_endpoint",
                                   "step_endpoint_mismatch", "step_not_contiguous")]
        findings += agreement(doc, diagram, cfg)
    return findings


def agreement(doc: Model, diagram: Model, cfg) -> list:
    """Where the document and the diagram disagree, in both directions."""
    out = []
    d_nodes, g_nodes = doc.node_ids(), diagram.node_ids()
    d_edges, g_edges = doc.edge_ids(), diagram.edge_ids()

    for i in sorted(d_nodes - g_nodes):
        _add(out, cfg, "doc_not_in_diagram", f"{i} is in the document but not on the diagram", i)
    for i in sorted(g_nodes - d_nodes):
        _add(out, cfg, "diagram_not_in_doc", f"{i} is on the diagram but not in the document", i)
    for i in sorted(d_edges - g_edges):
        _add(out, cfg, "doc_not_in_diagram",
             f"{i} is in the document but no connector carries it", i)
    for i in sorted(g_edges - d_edges):
        _add(out, cfg, "diagram_not_in_doc",
             f"{i} is on a connector but not in the document", i)

    # An edge present in both but wired differently is the quietest and worst defect.
    by_id = {e.id: e for e in diagram.edges if e.id}
    for e in doc.edges:
        g = by_id.get(e.id)
        if not g or not e.source or not e.target:
            continue
        if (g.source, g.target) != (e.source, e.target):
            _add(out, cfg, "step_endpoint_mismatch",
                 f"{e.id} is {e.source}->{e.target} in the document but "
                 f"{g.source}->{g.target} on the diagram", e.id)
    return out


def worst(findings) -> str:
    if any(f.severity == "error" for f in findings):
        return "error"
    if any(f.severity == "warn" for f in findings):
        return "warn"
    return "ok"
