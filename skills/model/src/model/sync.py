# SPDX-License-Identifier: Apache-2.0
"""Reconcile a document's model with an existing diagram, preserving layout.

The division of ownership is the whole point:

    the document owns   what exists, and what connects to what
    the diagram owns    where things sit, how edges route, how they look

So sync adds shapes for new rows, updates labels, flags shapes whose row has gone, and
does not touch the geometry of anything that survives. Regeneration that moved the
author's boxes would be abandoned after the first use, so geometry is never rewritten.

It works on the XML tree rather than through the Model, because a real diagram holds
bands, legends, annotations and swimlanes that the model has no place for. Anything
without a recognised identifier is left exactly as it was.

Scenario overlays are the exception: they are derived from the steps table, so they are
regenerated wholesale. Hand edits to an overlay layer will not survive, which is the
correct trade for contiguity and endpoint agreement holding by construction.
"""
from __future__ import annotations

import html
import re
import xml.etree.ElementTree as ET

from .drawio import (NODE_W, NODE_H, ROW_GAP, MARGIN, BADGE, OBJECT_TAGS, RESERVED,
                     _strip_html)

ORPHAN_STYLE = "strokeColor=#DC2626;strokeWidth=3;dashed=1;"


class Change:
    __slots__ = ("action", "kind", "id", "detail")

    def __init__(self, action, kind, ident, detail=""):
        self.action, self.kind, self.id, self.detail = action, kind, ident, detail

    def __str__(self):
        d = f"  {self.detail}" if self.detail else ""
        return f"{self.action:<8} {self.kind:<5} {self.id}{d}"

    def to_dict(self):
        return {"action": self.action, "kind": self.kind, "id": self.id, "detail": self.detail}


def _first(attrs, names):
    for n in names:
        if attrs.get(n):
            return attrs[n]
    return ""


def _obj_of(el):
    """(object_element, mxCell_element) for a cell, whichever wrapper it uses."""
    if el.tag in OBJECT_TAGS:
        mx = el.find("mxCell")
        return (el, mx) if mx is not None else (None, None)
    if el.tag == "mxCell":
        return None, el
    return None, None


def _attrs_of(obj, mx):
    return {k: v for k, v in obj.attrib.items() if k not in RESERVED} if obj is not None else {}


def _label_of(obj, mx):
    return (obj.get("label") if obj is not None else mx.get("value")) or ""


def _set_label(obj, mx, value):
    if obj is not None:
        obj.set("label", value)
    else:
        mx.set("value", value)


def _norm(label) -> str:
    """A label as a reader sees it: line breaks as spaces, tags and entities gone."""
    s = re.sub(r"<br\s*/?>|<div>|</div>|<p>|</p>", " ", str(label or ""), flags=re.I)
    s = html.unescape(_strip_html(s))
    return re.sub(r"\s+", " ", s).strip().lower()


def _label_keys(label) -> list:
    """Every form of a label a row might be written as.

    Hand-drawn shapes usually carry a name and a description: `<b>Q&A agent</b><br/>
    retrieve and synthesise`. A row names the component, not its caption, so the whole
    label, its first line, and its leading bold run are all offered as matches.
    """
    raw = str(label or "")
    keys = [_norm(raw), _norm(re.split(r"<br\s*/?>|<div>|\n", raw, 1, flags=re.I)[0])]
    bold = re.match(r"\s*<b>(.*?)</b>", raw, re.I | re.S)
    if bold:
        keys.append(_norm(bold.group(1)))
    out = []
    for k in keys:
        if k and k not in out:
            out.append(k)
    return out


def _cell_id(obj, mx):
    return obj.get("id") if obj is not None else mx.get("id")


def _rename_cell(root, old, new):
    """Give a cell a new id and follow every reference to it: parents, edge ends."""
    for el in root.iter():
        for k in ("id", "parent", "source", "target"):
            if el.get(k) == old:
                el.set(k, new)


def _wrap(root, el):
    """Turn a bare mxCell into an object-wrapped one, in place, keeping z-order."""
    if el.tag != "mxCell":
        return el, el.find("mxCell")
    idx = list(root).index(el)
    obj = ET.Element("object")
    obj.set("id", el.get("id"))
    obj.set("label", el.get("value") or "")
    for k in ("id", "value"):
        if k in el.attrib:
            del el.attrib[k]
    root.remove(el)
    obj.append(el)
    root.insert(idx, obj)
    return obj, el


def sync(doc, path, cfg, prune=False, dry_run=False, adopt=False) -> list:
    """Reconcile `path` with the model `doc`. Returns the changes made or proposed.

    With `adopt`, shapes that carry no identifier but whose label matches a row are
    tagged in place rather than duplicated. That is how a hand-drawn diagram joins the
    model without losing its layout.
    """
    tree = ET.parse(path)
    mxfile = tree.getroot()
    diagrams = mxfile.findall("diagram")
    if not diagrams:
        raise SystemExit(f"  ! {path} has no pages")
    page = diagrams[0]
    gm = page.find("mxGraphModel")
    if gm is None:
        raise SystemExit(
            f"  ! {path} is compressed, so it cannot be edited in place.\n"
            f"    Save it with Compressed unticked in draw.io Preferences, or normalise it:\n"
            f'    drawio -x -f xml -u -o "{path}" "{path}"')
    root = gm.find("root")

    id_attrs = cfg.node_attrs
    edge_attr = cfg.edge_id_attr

    layers = [el for el in root
              if el.tag == "mxCell" and el.get("parent") == "0" and el.get("id") != "0"]
    base_id = layers[0].get("id") if layers else "1"

    # ------------------------------------------------- index what is already drawn
    drawn_nodes, drawn_edges, max_y = {}, {}, MARGIN
    bare_nodes, bare_edges = [], []
    for el in list(root):
        obj, mx = _obj_of(el)
        if mx is None:
            continue
        attrs = _attrs_of(obj, mx)
        if attrs.get("scenario"):
            continue
        if mx.get("vertex") == "1":
            nid = _first(attrs, id_attrs)
            if nid:
                drawn_nodes[nid] = (el, obj, mx)
            else:
                bare_nodes.append(el)
            g = mx.find("mxGeometry")
            if g is not None and g.get("y"):
                try:
                    max_y = max(max_y, float(g.get("y")) + float(g.get("height") or NODE_H))
                except ValueError:
                    pass
        elif mx.get("edge") == "1":
            eid = attrs.get(edge_attr)
            if eid:
                drawn_edges[eid] = (el, obj, mx)
            else:
                bare_edges.append(el)

    changes = []
    wanted = {n.id: n for n in doc.nodes}
    if adopt:
        _adopt(root, doc, cfg, wanted, drawn_nodes, drawn_edges, bare_nodes, bare_edges,
               changes, dry_run)

    # Edges and overlays reference cells by cell id. That equals the identifier for a
    # generated or adopted shape, but not for a copy-pasted one, so resolve it.
    cell_of = {nid: _cell_id(obj, mx) for nid, (_el, obj, mx) in drawn_nodes.items()}
    for nid in wanted:
        cell_of.setdefault(nid, cfg.cell_id_for(nid))

    # ------------------------------------------------------------------- nodes
    for nid, n in wanted.items():
        label = n.label or n.id
        if nid in drawn_nodes:
            el, obj, mx = drawn_nodes[nid]
            # A label that already names the row, as its whole text, its first line or
            # its leading bold run, is the author's formatting of it. Leave it be.
            if not (set(_label_keys(_label_of(obj, mx)))
                    & {_norm(label), _norm(f"{nid} {label}")}):
                changes.append(Change("update", "node", nid, f"label -> {label}"))
                if not dry_run:
                    _set_label(obj, mx, label)
            if obj is not None and n.group and obj.get(cfg.group_attr) != n.group:
                changes.append(Change("update", "node", nid, f"{cfg.group_attr} -> {n.group}"))
                if not dry_run:
                    obj.set(cfg.group_attr, n.group)
        else:
            changes.append(Change("add", "node", nid, "placed below the existing shapes"))
            if not dry_run:
                max_y += NODE_H + ROW_GAP
                root.append(_new_node(n, cfg, cfg.attr_for(nid), base_id, MARGIN,
                                      int(max_y)))

    for nid, (el, obj, mx) in drawn_nodes.items():
        if nid in wanted:
            continue
        if prune:
            changes.append(Change("remove", "node", nid, "no row in the document"))
            if not dry_run:
                root.remove(el)
        else:
            changes.append(Change("orphan", "node", nid, "no row in the document; marked"))
            if not dry_run:
                _mark_orphan(mx)

    # ------------------------------------------------------------------- edges
    want_edges = {e.id: e for e in doc.edges if e.id}
    for eid, e in want_edges.items():
        if eid in drawn_edges:
            el, obj, mx = drawn_edges[eid]
            if e.label and _label_of(obj, mx).strip() != e.label:
                changes.append(Change("update", "edge", eid, f"label -> {e.label}"))
                if not dry_run:
                    _set_label(obj, mx, e.label)
            # Endpoints belong to the document. A diagram that disagrees is the defect
            # `validate` reports, and sync is what resolves it.
            for role, want in (("source", cell_of.get(e.source, e.source)),
                               ("target", cell_of.get(e.target, e.target))):
                if want and mx.get(role) != want:
                    changes.append(Change("rewire", "edge", eid,
                                          f"{role} {mx.get(role)} -> {want}"))
                    if not dry_run:
                        mx.set(role, want)
        else:
            changes.append(Change("add", "edge", eid, f"{e.source} -> {e.target}"))
            if not dry_run:
                root.append(_new_edge(e, cfg, base_id, cell_of))

    for eid, (el, obj, mx) in drawn_edges.items():
        if eid in want_edges:
            continue
        if prune:
            changes.append(Change("remove", "edge", eid, "no row in the document"))
            if not dry_run:
                root.remove(el)
        else:
            changes.append(Change("orphan", "edge", eid, "no row in the document; marked"))
            if not dry_run:
                _mark_orphan(mx)

    # -------------------------------------------------------- scenario overlays
    # Derived, so replaced rather than reconciled.
    existing_layers = {el.get("value", ""): el.get("id") for el in layers}
    removed = 0
    for el in list(root):
        obj, mx = _obj_of(el)
        if mx is None:
            continue
        if _attrs_of(obj, mx).get("scenario"):
            if not dry_run:
                root.remove(el)
            removed += 1
    for el in list(root):
        if el.tag == "mxCell" and el.get("parent") == "0" and str(el.get("id")).startswith("lyr-"):
            if not dry_run:
                root.remove(el)

    for sc in doc.scenarios:
        changes.append(Change("rebuild", "scen", sc.key, f"{len(sc.steps)} step(s)"))
        if dry_run:
            continue
        lyr = ET.SubElement(root, "mxCell")
        lyr.set("id", f"lyr-{sc.key}")
        lyr.set("value", f"{sc.key} {sc.name}".strip())
        lyr.set("parent", "0")
        lyr.set("visible", "0")
        _append_overlay(root, sc, cfg, drawn_nodes, wanted, f"lyr-{sc.key}", cell_of)

    if not dry_run:
        mxfile.set("compressed", "false")
        tree.write(path, encoding="utf-8", xml_declaration=False)
        # ElementTree writes one long line; a trailing newline keeps git happy.
        with open(path, "a", encoding="utf-8") as fh:
            fh.write("\n")
    return changes


# ------------------------------------------------------------------- element makers

def _mark_orphan(mx):
    s = mx.get("style", "")
    if ORPHAN_STYLE not in s:
        mx.set("style", s + (";" if s and not s.endswith(";") else "") + ORPHAN_STYLE)


def _new_node(n, cfg, id_attr, parent, x, y):
    obj = ET.Element("object")
    obj.set("id", cfg.cell_id_for(n.id))
    obj.set("label", n.label or n.id)
    obj.set(id_attr, n.id)
    if n.group:
        obj.set(cfg.group_attr, n.group)
    mx = ET.SubElement(obj, "mxCell")
    mx.set("style", cfg.style.get("node", "rounded=1;whiteSpace=wrap;html=1;"))
    mx.set("vertex", "1")
    mx.set("parent", parent)
    g = ET.SubElement(mx, "mxGeometry")
    g.set("x", str(x)); g.set("y", str(y))
    g.set("width", str(NODE_W)); g.set("height", str(NODE_H))
    g.set("as", "geometry")
    return obj


def _new_edge(e, cfg, parent, cell_of=None):
    cell_of = cell_of or {}
    obj = ET.Element("object")
    obj.set("id", e.id or f"{e.source}-{e.target}")
    obj.set("label", e.label or "")
    if e.id:
        obj.set(cfg.edge_id_attr, e.id)
    mx = ET.SubElement(obj, "mxCell")
    mx.set("style", cfg.style.get("edge", "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;"))
    mx.set("edge", "1")
    mx.set("parent", parent)
    mx.set("source", cell_of.get(e.source, e.source))
    mx.set("target", cell_of.get(e.target, e.target))
    g = ET.SubElement(mx, "mxGeometry")
    g.set("relative", "1"); g.set("as", "geometry")
    return obj


def _geom_of(entry):
    _el, _obj, mx = entry
    g = mx.find("mxGeometry")
    if g is None:
        return None
    try:
        return float(g.get("x") or 0), float(g.get("y") or 0)
    except ValueError:
        return None


def _append_overlay(root, sc, cfg, drawn_nodes, wanted, lyr, cell_of=None):
    """Badges and flow arrows over the real shapes, at their real positions."""
    cell_of = cell_of or {}
    badge_style = cfg.style.get("badge", "ellipse;whiteSpace=wrap;html=1;fillColor=#E95160;"
                                         "strokeColor=none;fontColor=#FFFFFF;fontStyle=1;")
    flow_style = cfg.style.get("flow", "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;"
                                       "dashed=1;strokeWidth=2;strokeColor=#E95160;")
    used_on = {}
    for st in sc.steps:
        entry = drawn_nodes.get(st.actor)
        xy = _geom_of(entry) if entry else None
        if xy:
            k = used_on.get(st.actor, 0)
            used_on[st.actor] = k + 1
            obj = ET.SubElement(root, "object")
            obj.set("id", f"{sc.key}-badge-{st.step}")
            obj.set("label", str(st.step))
            obj.set("scenario", sc.key)
            obj.set("step", str(st.step))
            mx = ET.SubElement(obj, "mxCell")
            mx.set("style", badge_style); mx.set("vertex", "1"); mx.set("parent", lyr)
            g = ET.SubElement(mx, "mxGeometry")
            g.set("x", str(int(xy[0] - BADGE // 2 + k * (BADGE + 6))))
            g.set("y", str(int(xy[1] - BADGE // 2)))
            g.set("width", str(BADGE)); g.set("height", str(BADGE)); g.set("as", "geometry")
        if st.actor and st.target:
            obj = ET.SubElement(root, "object")
            obj.set("id", f"{sc.key}-flow-{st.step}")
            obj.set("label", str(st.step))
            obj.set("scenario", sc.key)
            obj.set("step", str(st.step))
            if st.edge:
                obj.set(cfg.edge_id_attr, st.edge)
            obj.set("from", st.actor)
            obj.set("to", st.target)
            mx = ET.SubElement(obj, "mxCell")
            mx.set("style", flow_style); mx.set("edge", "1"); mx.set("parent", lyr)
            mx.set("source", cell_of.get(st.actor, st.actor))
            mx.set("target", cell_of.get(st.target, st.target))
            g = ET.SubElement(mx, "mxGeometry")
            g.set("relative", "1"); g.set("as", "geometry")


# ------------------------------------------------------------------------ adoption

def _adopt(root, doc, cfg, wanted, drawn_nodes, drawn_edges, bare_nodes, bare_edges,
           changes, dry_run):
    """Tag unidentified shapes whose label names a row, and the connectors between them.

    A match is exact after normalising case, whitespace and markup, against the label,
    the identifier, or both together. One candidate is adopted; two are reported and
    left alone, because guessing which box an author meant is how a model goes wrong
    quietly.
    """
    index = {}
    for el in bare_nodes:
        obj, mx = _obj_of(el)
        for key in _label_keys(_label_of(obj, mx)):
            index.setdefault(key, []).append(el)
    taken = set()
    used_ids = {el.get("id") for el in root.iter() if el.get("id")}

    for nid, n in wanted.items():
        if nid in drawn_nodes:
            continue
        keys = [k for k in (_norm(n.label), _norm(f"{nid} {n.label}"), _norm(nid)) if k]
        cands = []
        for k in keys:
            cands = list({id(el): el for el in index.get(k, [])
                          if id(el) not in taken}.values())
            if cands:
                break
        if not cands:
            continue
        if len(cands) > 1:
            changes.append(Change("ambig", "node", nid,
                                  f"{len(cands)} shapes are labelled '{n.label}'; none tagged"))
            continue
        el = cands[0]
        taken.add(id(el))
        obj, mx = _obj_of(el)
        changes.append(Change("adopt", "node", nid,
                              f"tagged the shape labelled '{_label_keys(_label_of(obj, mx))[-1]}'"))
        if dry_run:
            drawn_nodes[nid] = (el, obj, mx)
            continue
        obj, mx = _wrap(root, el)
        obj.set(cfg.attr_for(nid), nid)
        old = obj.get("id")
        target = cfg.cell_id_for(nid)
        if old != target and target not in used_ids:
            _rename_cell(root, old, target)
            used_ids.add(target)
        drawn_nodes[nid] = (obj, obj, mx)

    # Connectors: a bare edge between two identified shapes takes the id of the one row
    # joining them, in either direction. Direction then follows the document, which is
    # what the rewire pass in sync does.
    by_cell = {_cell_id(o, m): nid for nid, (_e, o, m) in drawn_nodes.items()}
    rows = {}
    for e in doc.edges:
        if e.id and e.id not in drawn_edges:
            rows.setdefault(frozenset((e.source, e.target)), []).append(e)
    for el in bare_edges:
        obj, mx = _obj_of(el)
        s, t = by_cell.get(mx.get("source")), by_cell.get(mx.get("target"))
        if not (s and t):
            continue
        cands = rows.get(frozenset((s, t)), [])
        if len(cands) != 1:
            if len(cands) > 1:
                changes.append(Change("ambig", "edge", f"{s}->{t}",
                                      f"{len(cands)} rows join these; none tagged"))
            continue
        e = cands.pop()
        flipped = (s, t) != (e.source, e.target)
        changes.append(Change("adopt", "edge", e.id,
                              "tagged; direction follows the document" if flipped else "tagged"))
        if dry_run:
            drawn_edges[e.id] = (el, obj, mx)
            continue
        obj, mx = _wrap(root, el)
        obj.set(cfg.edge_id_attr, e.id)
        drawn_edges[e.id] = (obj, obj, mx)


# -------------------------------------------------------------------------- rename

TOKEN = r"(?<![A-Za-z0-9-]){}(?![A-Za-z0-9])"


def rename(doc_path, drawio_path, old, new, cfg, dry_run=False) -> list:
    """Promote or correct an identifier everywhere it lives.

    In the document body, never its front matter: every whole-token occurrence, prose
    included. An identifier with no letters in it, a plain-number local id, is replaced
    only where it leads a table cell, because the same number in prose or a date is not
    the identifier. When a local id is promoted to a catalogue one its mapping row goes,
    because a catalogued node is its own mapping. In the diagram: the identifier moves to
    the attribute the new id belongs in, the cell id follows with every reference to it,
    and overlay assertions and labels are rewritten.
    """
    from . import markdown as md_mod

    changes = []
    rx = re.compile(TOKEN.format(re.escape(old)))
    promoting = cfg.is_local(old) and not cfg.is_local(new)
    numeric = not re.search(r"[A-Za-z]", old)

    doc = md_mod.read(doc_path, cfg)
    if new in doc.node_ids() or new in doc.edge_ids():
        raise SystemExit(f"  ! {new} is already an identifier in {doc_path}; refusing to merge "
                         f"two identifiers into one")
    with open(doc_path, encoding="utf-8") as fh:
        text = fh.read()
    fm = re.match(r"^---\r?\n.*?\r?\n---\r?\n", text, re.S)
    head, text = (text[:fm.end()], text[fm.end():]) if fm else ("", text)
    out, in_map = [], False
    for ln in text.split("\n"):
        h = re.match(r"^(#{1,6})\s+(.*)$", ln)
        if h:
            in_map = h.group(2).strip().lower() == cfg.mapping.section.strip().lower()
        if promoting and in_map and ln.lstrip().startswith("|"):
            first = ln.strip().strip("|").split("|")[0].strip().strip("`")
            if first.split()[:1] == [old]:
                changes.append(Change("remove", "map", old,
                                      f"mapping row dropped; {new} is catalogued"))
                continue
        out.append(ln)
    body = "\n".join(out)
    if numeric:
        cell = re.compile(r"(\|\s*)" + re.escape(old) + r"(?![A-Za-z0-9.-])")
        n = 0
        lines = []
        for ln in body.split("\n"):
            if ln.lstrip().startswith("|"):
                ln, k = cell.subn(lambda m: m.group(1) + new, ln)
                n += k
            lines.append(ln)
        new_body = "\n".join(lines)
    else:
        new_body, n = rx.subn(new, body)
    changes.append(Change("rename", "doc", old, f"-> {new}, {n} occurrence(s)"))
    if not dry_run:
        with open(doc_path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(head + new_body)

    if drawio_path:
        tree = ET.parse(drawio_path)
        page = tree.getroot().find("diagram")
        gm = page.find("mxGraphModel") if page is not None else None
        if gm is None:
            raise SystemExit(f"  ! {drawio_path} is compressed or empty; save it uncompressed")
        root = gm.find("root")
        hits = 0
        renamed_cells = []
        for el in list(root):
            obj, mx = _obj_of(el)
            if obj is None:
                continue
            for a in cfg.node_attrs:
                if obj.get(a) == old:
                    del obj.attrib[a]
                    obj.set(cfg.attr_for(new), new)
                    renamed_cells.append(obj.get("id"))
                    hits += 1
            for a in ("from", "to", "from_abb", "to_abb"):
                if obj.get(a) == old:
                    obj.set(a, new)
            lab = obj.get("label") or ""
            if rx.search(lab):
                obj.set("label", rx.sub(new, lab))
        # The cell id follows the identifier, as cfg.cell_id_for says it should be, with
        # every edge end and parent that points at it.
        target = cfg.cell_id_for(new)
        for cid in renamed_cells:
            if cid and cid != target and not any(el.get("id") == target for el in root.iter()):
                _rename_cell(root, cid, target)
        changes.append(Change("rename", "shape", old, f"-> {new}, {hits} shape(s)"))
        if not dry_run:
            tree.write(drawio_path, encoding="utf-8", xml_declaration=False)
            with open(drawio_path, "a", encoding="utf-8") as fh:
                fh.write("\n")
    return changes
