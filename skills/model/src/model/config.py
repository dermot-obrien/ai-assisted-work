# SPDX-License-Identifier: Apache-2.0
"""Configuration: how this project's documents and diagrams express a model.

Everything domain-specific lives here rather than in code. Identifier patterns, table
headings, column names, catalogue files and rule severities are all declared, which is
what lets the same tool serve an architecture pattern, a network topology or a process
flow without knowing which it is looking at.

The defaults are deliberately conventional, so a document that uses obvious headings
and column names works with no config at all.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field

try:
    import tomllib
except ModuleNotFoundError:                      # Python < 3.11
    tomllib = None

# Searched in order at each ancestor directory. `.agents/skill-bindings.toml` is the
# preferred name: one file binds the whole skill suite to the host repository's layout,
# and `.agents/` is the one directory convention with genuine cross-vendor adoption.
# `model.toml` is kept as an alias so existing repositories keep working.
CONFIG_NAMES = (
    os.path.join(".agents", "skill-bindings.toml"),
    "skill-bindings.toml",
    "model.toml",
    ".model.toml",
)

SEVERITIES = ("error", "warn", "off")

# Bump the major when an existing key changes meaning or is removed. The reader refuses
# a major it does not know, because there is no version-skew defence anywhere in the
# skills ecosystem and a silently misread binding is worse than a stopped run.
BINDINGS_MAJOR = 1
BINDINGS_VERSION = "1.0"

DEFAULT_RULES = {
    "node_missing_id": "error",       # a shape on the structure layer with no identifier
    "node_duplicate_id": "error",     # the same identifier twice, i.e. a copy-paste
    "node_id_mismatch": "warn",       # mxCell id differs from the identifier attribute
    "edge_missing_id": "warn",        # a connector with no identifier
    "edge_unlabelled": "warn",        # a connector that does not say what flows
    "edge_dangling": "error",         # a connector with a free end
    "edge_unknown_endpoint": "error", # an endpoint that is not an identified node
    "step_missing_fields": "error",   # an overlay element with no scenario or step
    "step_not_contiguous": "error",   # step numbers with a gap or a duplicate
    "step_endpoint_mismatch": "error",# asserted endpoints disagree with the real ones
    "catalogue_unreadable": "error",  # a declared catalogue is missing, unreadable or empty
    "not_in_catalogue": "error",      # an identifier absent from the declared catalogue
    "doc_not_in_diagram": "warn",     # the document claims it, the diagram lacks it
    "diagram_not_in_doc": "warn",     # the diagram shows it, the document omits it
    "id_unmatched": "error",          # a table cell holds text no identifier rule matches
    "id_attr_mismatch": "error",      # a local id in a catalogue attribute, or the reverse
    "mapping_missing": "warn",        # a local node with no mapping row
    "mapping_unknown_local": "error", # a mapping row for a local id that is not a node
    "mapping_invalid": "error",       # a relationship outside the vocabulary, or one that
                                      # contradicts its target (gap with a target, etc.)
    "mapping_not_in_catalogue": "error",  # a mapping target absent from the catalogue
    "mapping_duplicates_node": "warn",    # a local node realises a block drawn beside it
}

# How a local element relates to the catalogue entry it maps to.
MAPPING_RELATIONSHIPS = ("realises", "partial", "gap")


@dataclass
class TableSpec:
    section: str
    entity: str                        # node | edge
    columns: dict = field(default_factory=dict)
    id_pattern: str = ""

    @property
    def id_re(self):
        return re.compile(self.id_pattern) if self.id_pattern else None


@dataclass
class ScenarioSpec:
    section: str = "Scenarios"
    heading_pattern: str = r"^(S\d+)\b[\s:.-]*(.*)$"
    columns: dict = field(default_factory=lambda: {
        "step": "Step", "actor": "Actor", "action": "Action", "edge": "Interface",
        "target": "Target",
    })


@dataclass
class MappingSpec:
    """The table that maps local identifiers onto catalogue entries.

    Local ids exist so a document and its diagram can agree before the catalogue has an
    entry for every box. The mapping keeps that from becoming a second, unlinked
    vocabulary: every local node says what it realises, what it partly covers, or that
    it is a gap.
    """
    section: str = "Catalogue Mapping"
    columns: dict = field(default_factory=lambda: {
        "id": "Local ID", "maps_to": "Maps To", "relationship": "Relationship",
    })


@dataclass
class Catalogue:
    path: str
    column: str
    # How abstract an identifier from this catalogue is: "logical" for a catalogue of
    # technology-neutral building blocks, "physical" for one of products. Empty means the
    # catalogue says nothing about abstraction, and its identifiers are left out of it.
    level: str = ""


# Abstraction levels a node can contribute, from most to least abstract.
LEVELS = ("conceptual", "logical", "physical")
# Node kinds, as written in a table's kind column, that say something about abstraction.
# External nodes are outside the model's scope and contribute nothing.
KIND_LEVELS = {
    "local": "conceptual", "conceptual": "conceptual",
    "logical": "logical",
    "product": "physical", "physical": "physical",
    "external": None, "context": None,
}


@dataclass
class Config:
    # draw.io attribute names
    node_id_attrs: tuple = ("id",)
    edge_id_attr: str = "edge_id"
    group_attr: str = "group"
    kind_attr: str = "kind"
    # Local identifiers, for elements with no catalogue entry yet. Either a pattern, such as
    # '[0-9]{1,3}' for plain numbers, or a reserved prefix followed by two or three digits.
    # Both empty means the project has none, and every identifier is held to the catalogue.
    local_pattern: str = ""
    local_prefix: str = ""
    local_attr: str = "local_id"
    # markdown contract
    tables: list = field(default_factory=list)
    scenarios: ScenarioSpec = field(default_factory=ScenarioSpec)
    mapping: MappingSpec = field(default_factory=MappingSpec)
    # validation
    catalogues: list = field(default_factory=list)
    rules: dict = field(default_factory=lambda: dict(DEFAULT_RULES))
    # draw.io styling, passed through to the writer
    style: dict = field(default_factory=dict)
    # Bindings for other skills in the suite, as declared sections. Untouched by this
    # skill; `model doctor` reports them and each skill reads its own.
    suite: dict = field(default_factory=dict)
    path: str = ""                 # the config file this came from, "" if defaults
    version: str = BINDINGS_VERSION
    root: str = "."

    def severity(self, rule: str) -> str:
        return self.rules.get(rule, DEFAULT_RULES.get(rule, "warn"))

    # ------------------------------------------------------------ local identifiers

    @property
    def local_token(self):
        """The regex for one local id: `local_pattern`, else the prefix and two or three
        digits, else None when the project has no local ids."""
        if self.local_pattern:
            return self.local_pattern
        if self.local_prefix:
            return re.escape(self.local_prefix) + r"[0-9]{2,3}"
        return None

    @property
    def has_local(self) -> bool:
        return bool(self.local_token)

    @property
    def local_re(self):
        """A local id leading a table cell: `01 Gateway`, or `LOC-01 Gateway` with a prefix.

        It must lead. A plain number anywhere else in a cell is part of a name, as in
        `Microsoft 365 Copilot`, and reading it as an identifier would be a silent error.
        """
        tok = self.local_token
        if not tok:
            return None
        return re.compile(r"^\s*(?:" + tok + r")(?![A-Za-z0-9.-])")

    def is_local(self, ident: str) -> bool:
        tok = self.local_token
        return bool(tok and ident and re.fullmatch(tok, str(ident)))

    def cell_id_for(self, ident: str) -> str:
        """The draw.io cell id a node is drawn with.

        A catalogued node's cell id is its identifier. A local one is namespaced, because
        a plain number would collide with draw.io's own cells: `0` is the root and `1` the
        first layer, so a local node `1` must never be cell `1`.
        """
        return f"local-{ident}" if self.is_local(ident) else ident

    @property
    def node_attrs(self) -> tuple:
        """Every draw.io attribute that may carry a node identifier, local one included."""
        attrs = tuple(self.node_id_attrs)
        if self.has_local and self.local_attr not in attrs:
            attrs += (self.local_attr,)
        return attrs

    def attr_for(self, ident: str) -> str:
        """The draw.io attribute an identifier belongs in.

        A local id goes in `local_attr`. Otherwise the first attribute whose stem names
        the id's prefix wins, so `SBB-108.6` goes in `sbb_id` rather than `abb_id`, and
        anything unrecognised falls back to the first declared attribute.
        """
        if self.is_local(ident):
            return self.local_attr
        head = str(ident or "").split("-", 1)[0].lower()
        for a in self.node_id_attrs:
            if a.lower().rsplit("_id", 1)[0] == head:
                return a
        return self.node_id_attrs[0]

    def resolve(self, p: str) -> str:
        """Relative paths anchor to the directory holding the config file.

        Never to the process working directory. A binding means the same thing wherever
        it is run from, which is the rule ESLint and Terraform both had to learn the
        hard way, and the reason absolute paths do not belong in a committed config.
        """
        return p if os.path.isabs(p) else os.path.normpath(os.path.join(self.root, p))


def default_config() -> Config:
    """Works on a document using conventional headings, with no config file present."""
    return Config(tables=[
        TableSpec(section="Nodes", entity="node",
                  columns={"id": "Node", "label": "Node", "group": "Group"}),
        TableSpec(section="Components", entity="node",
                  columns={"id": "Component", "label": "Component", "group": "Group"}),
        TableSpec(section="Edges", entity="edge",
                  columns={"id": "Edge", "source": "From", "target": "To", "label": "Purpose"}),
        TableSpec(section="Interfaces", entity="edge",
                  columns={"id": "Interface", "source": "Provider", "target": "Consumer",
                           "label": "Purpose"}),
    ])


def find(start: str):
    """Nearest config file, searching upward. Returns a path or None."""
    d = os.path.abspath(start if os.path.isdir(start) else os.path.dirname(start) or ".")
    while True:
        for n in CONFIG_NAMES:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return p
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def load(path: str | None, near: str | None = None) -> Config:
    path = path or (find(near) if near else None)
    if not path:
        return default_config()
    if tomllib is None:
        raise SystemExit("  ! reading a config file needs Python 3.11 or newer (tomllib)")
    try:
        with open(path, "rb") as fh:
            raw = tomllib.load(fh)
    except tomllib.TOMLDecodeError as ex:
        # A regex in a TOML basic string is the usual cause: "\b" is an invalid escape.
        # Single-quoted literal strings do not process escapes and are what regexes want.
        raise SystemExit(
            f"  ! {path} is not valid TOML: {ex}\n"
            f"    A regex belongs in a single-quoted TOML literal string, which does "
            f"not process escapes.\n"
            f"    Write  pattern = '^(S[0-9]+)\\b'  rather than a double-quoted string.")

    cfg = Config(root=os.path.dirname(os.path.abspath(path)), path=os.path.abspath(path))

    declared = str(raw.get("bindingsVersion", "") or "").strip()
    if declared:
        cfg.version = declared
        try:
            major = int(declared.split(".")[0])
        except ValueError:
            raise SystemExit(f"  ! {path}: bindingsVersion '{declared}' is not a version")
        if major != BINDINGS_MAJOR:
            raise SystemExit(
                f"  ! {path}: bindingsVersion {declared} but this skill understands "
                f"{BINDINGS_MAJOR}.x.\n"
                f"    Refusing rather than guessing: a silently misread binding is worse "
                f"than a stopped run.")

    # Anything under [suite] belongs to other skills. Carried, never interpreted here.
    cfg.suite = raw.get("suite", {}) or {}

    m = raw.get("model", {})
    cfg.node_id_attrs = tuple(m.get("node_id_attrs", cfg.node_id_attrs))
    cfg.edge_id_attr = m.get("edge_id_attr", cfg.edge_id_attr)
    cfg.group_attr = m.get("group_attr", cfg.group_attr)
    cfg.kind_attr = m.get("kind_attr", cfg.kind_attr)
    cfg.local_prefix = str(m.get("local_prefix", cfg.local_prefix) or "")
    cfg.local_pattern = str(m.get("local_pattern", cfg.local_pattern) or "")
    if cfg.local_pattern:
        try:
            re.compile(cfg.local_pattern)
        except re.error as ex:
            raise SystemExit(f"  ! {path}: local_pattern is not a valid regex: {ex}")
    cfg.local_attr = m.get("local_attr", cfg.local_attr)

    md = raw.get("markdown", {})
    cfg.tables = [TableSpec(section=t["section"], entity=t.get("entity", "node"),
                            columns=t.get("columns", {}), id_pattern=t.get("id_pattern", ""))
                  for t in md.get("tables", [])]
    if not cfg.tables:
        cfg.tables = default_config().tables
    if "scenarios" in md:
        s = md["scenarios"]
        cfg.scenarios = ScenarioSpec(
            section=s.get("section", "Scenarios"),
            heading_pattern=s.get("heading_pattern", ScenarioSpec.heading_pattern),
            columns={**ScenarioSpec().columns, **s.get("columns", {})},
        )
    if "mapping" in md:
        mp = md["mapping"]
        cfg.mapping = MappingSpec(
            section=mp.get("section", MappingSpec.section),
            columns={**MappingSpec().columns, **mp.get("columns", {})},
        )

    cfg.catalogues = [Catalogue(path=c["path"], column=c["column"], level=c.get("level", ""))
                      for c in raw.get("catalogues", [])]
    for c in cfg.catalogues:
        if c.level and c.level not in LEVELS:
            raise SystemExit(f"  ! catalogue {c.path} has level '{c.level}'; expected one of {LEVELS}")

    for k, v in (raw.get("rules") or {}).items():
        if v not in SEVERITIES:
            raise SystemExit(f"  ! rule '{k}' has severity '{v}'; expected one of {SEVERITIES}")
        cfg.rules[k] = v

    cfg.style = raw.get("style", {})
    return cfg
