# SPDX-License-Identifier: Apache-2.0
"""The canonical model: boxes, lines, groups and numbered walkthroughs.

Deliberately generic. There is no architecture vocabulary here, because anything that
can be drawn as boxes and lines fits this shape: a network topology, a process flow, a
data lineage, an org chart. A reference architecture is one subclass of it.

Domain meaning lives in `attrs` and in the consuming project's config, never in this
module. That is what lets the skill be published without dragging an ontology along.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict

SLUG_RE = re.compile(r"[^A-Za-z0-9]+")


def slug(s: str) -> str:
    return SLUG_RE.sub("-", str(s or "")).strip("-").lower() or "x"


@dataclass
class Node:
    """A box. `id` is the stable key; everything else may change freely."""
    id: str
    label: str = ""
    group: str = ""          # optional grouping key, drawn as a band or container
    kind: str = ""           # free-form classification, drives styling via config
    attrs: dict = field(default_factory=dict)


@dataclass
class Edge:
    """A line. `id` is optional: an unidentified edge is still a valid edge."""
    source: str
    target: str
    id: str = ""
    label: str = ""
    kind: str = ""
    attrs: dict = field(default_factory=dict)

    @property
    def key(self) -> str:
        return self.id or f"{self.source}->{self.target}"


@dataclass
class Group:
    id: str
    label: str = ""
    attrs: dict = field(default_factory=dict)


@dataclass
class Step:
    """One numbered step of a walkthrough, overlaid on the structure."""
    step: int
    actor: str = ""          # node id the step acts on or from
    action: str = ""
    edge: str = ""           # edge id the step traverses, when it traverses one
    target: str = ""         # node id, when the step is a transition
    attrs: dict = field(default_factory=dict)


@dataclass
class Scenario:
    """A walkthrough. Rendered as a numbered overlay, one per draw.io layer.

    This is a UML communication diagram: structure plus numbered messages. It cannot
    express branching, loops or concurrency, so a scenario that needs those belongs in
    a sequence diagram instead.
    """
    key: str
    name: str = ""
    steps: list = field(default_factory=list)
    attrs: dict = field(default_factory=dict)


@dataclass
class Model:
    name: str = ""
    version: str = ""
    source: str = ""
    nodes: list = field(default_factory=list)
    edges: list = field(default_factory=list)
    groups: list = field(default_factory=list)
    scenarios: list = field(default_factory=list)
    attrs: dict = field(default_factory=dict)

    # ---------------------------------------------------------------- lookups

    def node(self, node_id):
        return next((n for n in self.nodes if n.id == node_id), None)

    def node_ids(self) -> set:
        return {n.id for n in self.nodes}

    def edge_ids(self) -> set:
        return {e.id for e in self.edges if e.id}

    def scenario(self, key):
        return next((s for s in self.scenarios if s.key == key), None)

    # ------------------------------------------------------------ (de)serialise

    def to_dict(self) -> dict:
        d = asdict(self)
        # Drop empties so a round-trip through JSON stays readable and diffable.
        def prune(o):
            if isinstance(o, dict):
                return {k: prune(v) for k, v in o.items() if v not in ("", {}, [], None)}
            if isinstance(o, list):
                return [prune(v) for v in o]
            return o
        return prune(d)

    @staticmethod
    def from_dict(d: dict) -> "Model":
        m = Model(
            name=d.get("name", ""),
            version=d.get("version", ""),
            source=d.get("source", ""),
            attrs=d.get("attrs", {}) or {},
        )
        m.nodes = [Node(**_only(n, Node)) for n in d.get("nodes", [])]
        m.edges = [Edge(**_only(e, Edge)) for e in d.get("edges", [])]
        m.groups = [Group(**_only(g, Group)) for g in d.get("groups", [])]
        for s in d.get("scenarios", []):
            sc = Scenario(**_only({k: v for k, v in s.items() if k != "steps"}, Scenario))
            sc.steps = [Step(**_only(st, Step)) for st in s.get("steps", [])]
            m.scenarios.append(sc)
        return m

    # --------------------------------------------------------------- reporting

    def summary(self) -> str:
        def n(count, word):
            return f"{count} {word}" if count == 1 else f"{count} {word}s"
        parts = [n(len(self.nodes), "node"), n(len(self.edges), "edge")]
        if self.groups:
            parts.append(n(len(self.groups), "group"))
        if self.scenarios:
            steps = sum(len(s.steps) for s in self.scenarios)
            parts.append(f"{n(len(self.scenarios), 'scenario')} ({n(steps, 'step')})")
        return ", ".join(parts)


def _only(d: dict, cls) -> dict:
    """Keep the keys the dataclass accepts; stash the rest under attrs.

    Unknown keys are data, not errors. A model that round-trips through another tool
    may carry fields this version does not know about, and dropping them silently is
    worse than carrying them.
    """
    known = set(cls.__dataclass_fields__)
    out = {k: v for k, v in d.items() if k in known}
    extra = {k: v for k, v in d.items() if k not in known}
    if extra:
        out.setdefault("attrs", {})
        out["attrs"] = {**extra, **(out.get("attrs") or {})}
    return out
