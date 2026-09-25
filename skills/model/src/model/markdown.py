# SPDX-License-Identifier: Apache-2.0
"""Markdown adapter: read a Model out of GFM tables, and write those tables back.

The document is the source of truth, so this is the primary adapter. The contract is
declared in config as section headings and column names, which keeps the parser honest:
it reads what the project says it wrote, rather than guessing.

HTML comments are stripped before parsing. Template guidance and example rows live in
comments, and treating them as content is how a template ends up in a model.
"""
from __future__ import annotations

import re

from .schema import Model, Node, Edge, Group, Scenario, Step

COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
FENCE_RE = re.compile(r"^(```|~~~)")
ROW_RE = re.compile(r"^\s*\|(.+)\|\s*$")
SEP_RE = re.compile(r"^\s*\|[\s:|-]+\|\s*$")
LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")


def _clean(md: str) -> str:
    return COMMENT_RE.sub("", md)


def _cells(line: str) -> list:
    inner = ROW_RE.match(line).group(1)
    return [LINK_RE.sub(r"\1", c).strip().strip("`").strip() for c in inner.split("|")]


def sections(md: str) -> list:
    """(level, title, body) for every heading, ignoring headings inside code fences."""
    lines, out, fenced = md.split("\n"), [], False
    cur = None
    for ln in lines:
        if FENCE_RE.match(ln):
            fenced = not fenced
        h = None if fenced else re.match(r"^(#{1,6})\s+(.*)$", ln)
        if h:
            if cur:
                out.append(cur)
            cur = [len(h.group(1)), h.group(2).strip(), []]
        elif cur:
            cur[2].append(ln)
    if cur:
        out.append(cur)
    return [(lv, t, "\n".join(b)) for lv, t, b in out]


def tables(body: str) -> list:
    """Every GFM table in a block, as a list of dicts keyed by header text."""
    out, rows, header = [], [], None
    for ln in body.split("\n"):
        if ROW_RE.match(ln):
            if SEP_RE.match(ln):
                continue
            c = _cells(ln)
            if header is None:
                header = c
            else:
                rows.append(dict(zip(header, c)))
        else:
            if header and rows:
                out.append(rows)
            header, rows = None, []
    if header and rows:
        out.append(rows)
    return out


def _get(row: dict, col: str) -> str:
    if col in row:
        return row[col]
    low = {k.lower(): v for k, v in row.items()}
    return low.get(str(col).lower(), "")


def _ident(text: str, spec, cfg=None) -> str:
    """The identifier in a cell: the configured pattern if there is one, else the
    first token. `ABB-024 Identity Provider` yields `ABB-024` either way.

    A local identifier is accepted alongside the table's own pattern when it leads the
    cell, so `01 Onyx, realising ABB-105` yields `01`; otherwise the leftmost match of the
    table's pattern wins.
    """
    text = (text or "").strip()
    local = cfg.local_re if cfg is not None else None
    if local:
        m = local.search(text)
        if m:
            return m.group(0).strip()
    rx = spec.id_re
    if rx:
        m = rx.search(text)
        return m.group(0) if m else ""
    return text.split()[0] if text else ""


def _unmatched(m, section, text):
    """Record a cell that held something no identifier rule matched.

    Dropping the row silently was the old behaviour, and it is the worst available: a
    table written with the wrong prefix produced an empty model and no finding.
    """
    m.attrs.setdefault("unmatched", []).append({"section": section, "text": text})


def front_matter(raw: str):
    """(meta, body). Flat `key: value` pairs, plus one level of nested mapping.

    Enough for `model:` with `diagram:` beneath it, without a YAML dependency. Lists and
    deeper nesting are carried as their raw text rather than guessed at.
    """
    fm = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", raw, re.S)
    if not fm:
        return {}, raw
    meta, parent = {}, None
    for ln in fm.group(1).splitlines():
        if not ln.strip() or ln.lstrip().startswith("#"):
            continue
        indented = ln[:1] in (" ", "\t")
        if ":" not in ln:
            continue
        k, v = ln.split(":", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if not indented:
            if v:
                meta[k], parent = v, None
            else:
                meta[k], parent = {}, k
        elif parent is not None and isinstance(meta.get(parent), dict) and not k.startswith("-"):
            meta[parent][k] = v
    return meta, raw[fm.end():]


def read_meta(path) -> dict:
    """Front matter only, for callers that need to know what a document declares."""
    with open(path, encoding="utf-8") as fh:
        return front_matter(fh.read())[0]


def _label(text: str, ident: str) -> str:
    t = (text or "").strip()
    return t[len(ident):].strip(" :-") if ident and t.startswith(ident) else t


def read(path, cfg) -> Model:
    with open(path, encoding="utf-8") as fh:
        meta, raw = front_matter(fh.read())
    body = _clean(raw)

    m = Model(source=str(path), name=str(meta.get("title", "")),
              version=str(meta.get("version", "")))
    if isinstance(meta.get("model"), dict):
        m.attrs["model"] = meta["model"]
    secs = sections(body)
    groups = {}

    for spec in cfg.tables:
        for lv, title, sbody in secs:
            if title.strip().lower() != spec.section.strip().lower():
                continue
            for rows in tables(sbody):
                for row in rows:
                    if spec.entity == "node":
                        raw_id = _get(row, spec.columns.get("id", "id"))
                        nid = _ident(raw_id, spec, cfg)
                        if not nid:
                            if raw_id.strip():
                                _unmatched(m, spec.section, raw_id.strip())
                            continue
                        lab = _get(row, spec.columns.get("label", spec.columns.get("id", "id")))
                        # The group is a free label, not an identifier, so the id
                        # pattern must not be applied to it.
                        grp = (_get(row, spec.columns["group"]).strip()
                               if spec.columns.get("group") else "")
                        if grp:
                            groups.setdefault(grp, Group(id=grp, label=grp))
                        m.nodes.append(Node(
                            id=nid, label=_label(lab, nid), group=grp,
                            kind=_get(row, spec.columns.get("kind", "")),
                            attrs=_rest(row, spec),
                        ))
                    else:
                        cells = {r: _get(row, spec.columns.get(r, "id" if r == "id" else ""))
                                 for r in ("id", "source", "target")}
                        got = {r: _ident(v, spec, cfg) for r, v in cells.items()}
                        eid, src, tgt = got["id"], got["source"], got["target"]
                        if not (src or tgt or eid):
                            continue
                        for r in ("source", "target"):
                            if cells[r].strip() and not got[r]:
                                _unmatched(m, spec.section, cells[r].strip())
                        m.edges.append(Edge(
                            id=eid, source=src, target=tgt,
                            label=_get(row, spec.columns.get("label", "")),
                            kind=_get(row, spec.columns.get("kind", "")),
                            attrs=_rest(row, spec),
                        ))

    m.groups = [groups[k] for k in sorted(groups)]
    m.scenarios = _read_scenarios(secs, cfg)
    mapping = _read_mapping(secs, cfg)
    if mapping:
        m.attrs["mapping"] = mapping
    return m


def _read_mapping(secs, cfg) -> list:
    """Rows of the mapping table, as {local, maps_to, relationship, text}.

    `maps_to` is the first identifier in the cell, catalogue or not, so a row can say
    `ABB-105 Enterprise RAG Pipeline` and the name rides along as prose.
    """
    spec = cfg.mapping
    cols = spec.columns
    out = []
    for _lv, title, body in secs:
        if title.strip().lower() != spec.section.strip().lower():
            continue
        for rows in tables(body):
            for row in rows:
                local = _first_token(_get(row, cols["id"]))
                if not local:
                    continue
                target = _get(row, cols["maps_to"]).strip()
                out.append({
                    "local": local,
                    "maps_to": _first_token(target) if target and target.lower() not in
                               ("-", "none", "n/a", "gap") else "",
                    "relationship": _get(row, cols["relationship"]).strip().lower(),
                    "text": target,
                })
    return out


def _attr_key(header: str) -> str:
    """A spare column header becomes an attribute key, and draw.io writes keys as XML
    attribute names, so "Role in this architecture" has to become role_in_this_architecture."""
    k = re.sub(r"[^A-Za-z0-9]+", "_", str(header or "")).strip("_").lower()
    return k if k and not k[0].isdigit() else f"x_{k}" if k else ""


def _rest(row: dict, spec) -> dict:
    used = {str(v).lower() for v in spec.columns.values()}
    out = {}
    for k, v in row.items():
        if k.lower() in used or not v:
            continue
        key = _attr_key(k)
        if key:
            out[key] = v
    return out


def _read_scenarios(secs, cfg) -> list:
    spec = cfg.scenarios
    rx = re.compile(spec.heading_pattern)
    out, inside, depth = [], False, 0
    for lv, title, body in secs:
        if title.strip().lower() == spec.section.strip().lower():
            inside, depth = True, lv
            continue
        if inside and lv <= depth:
            inside = False
        if not inside:
            continue
        mm = rx.match(title.strip())
        if not mm:
            continue
        sc = Scenario(key=mm.group(1), name=(mm.group(2) or "").strip())
        for rows in tables(body):
            for row in rows:
                try:
                    n = int(re.sub(r"\D", "", _get(row, spec.columns["step"])) or 0)
                except ValueError:
                    n = 0
                if not n:
                    continue
                sc.steps.append(Step(
                    step=n,
                    actor=_first_token(_get(row, spec.columns["actor"])),
                    action=_get(row, spec.columns["action"]),
                    edge=_first_token(_get(row, spec.columns.get("edge", ""))),
                    target=_first_token(_get(row, spec.columns.get("target", ""))),
                ))
        sc.steps.sort(key=lambda s: s.step)
        if sc.steps:
            out.append(sc)
    return out


def _first_token(s: str) -> str:
    s = (s or "").strip()
    return s.split()[0] if s else ""


# ------------------------------------------------------------------------ writing

def write(m: Model, path, cfg) -> None:
    """Emit the model as Markdown tables, using the configured contract."""
    parts = [f"# {m.name or 'Model'}", ""]
    for spec in cfg.tables:
        if spec.entity == "node" and m.nodes:
            cols = [spec.columns.get("id", "Node"), spec.columns.get("label", "Label")]
            if spec.columns.get("group"):
                cols.append(spec.columns["group"])
            parts += [f"## {spec.section}", "", _row(cols), _sep(cols)]
            for n in m.nodes:
                vals = [f"{n.id} {n.label}".strip(), n.label]
                if spec.columns.get("group"):
                    vals.append(n.group)
                parts.append(_row(vals[:len(cols)]))
            parts.append("")
            break
    for spec in cfg.tables:
        if spec.entity == "edge" and m.edges:
            cols = [spec.columns.get("id", "Edge"), spec.columns.get("source", "From"),
                    spec.columns.get("target", "To"), spec.columns.get("label", "Purpose")]
            parts += [f"## {spec.section}", "", _row(cols), _sep(cols)]
            for e in m.edges:
                parts.append(_row([e.id, e.source, e.target, e.label]))
            parts.append("")
            break
    if m.scenarios:
        sc_cols = [cfg.scenarios.columns["step"], cfg.scenarios.columns["actor"],
                   cfg.scenarios.columns["action"], cfg.scenarios.columns.get("edge", "Edge")]
        parts += [f"## {cfg.scenarios.section}", ""]
        for sc in m.scenarios:
            parts += [f"### {sc.key} {sc.name}".rstrip(), "", _row(sc_cols), _sep(sc_cols)]
            for st in sc.steps:
                parts.append(_row([str(st.step), st.actor, st.action, st.edge]))
            parts.append("")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(parts).rstrip() + "\n")


def _row(vals):
    return "| " + " | ".join(str(v or "") for v in vals) + " |"


def _sep(cols):
    return "|" + "|".join("---" for _ in cols) + "|"
