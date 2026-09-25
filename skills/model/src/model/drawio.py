# SPDX-License-Identifier: Apache-2.0
"""draw.io / mxGraph adapter: read a .drawio into a Model, and write one back.

Two facts drive every design choice here.

First, the mxCell id is not a stable key. mxGraphModel.createIds defaults to true,
cellAdded resolves id collisions by generating new ids, and clipboard copy goes through
cloneCells and importCells, so copy, paste, duplicate and moving between pages all
produce fresh ids. Custom attributes are part of the cell's user object and ARE cloned,
so the identifier goes on an <object> wrapper. The consequence: a copy-pasted shape
keeps its identifier and gets a new mxCell id, which is why duplicate detection is
mandatory rather than optional.

Second, scenarios are layers, not pages. A duplicated page regenerates every mxCell id,
so overlay arrows stop referencing the real shapes, and it clones every identifier so a
reader sees each node once per page. Layers keep one set of shapes and one id space.
"""
from __future__ import annotations

import base64
import re
import urllib.parse
import xml.etree.ElementTree as ET
import zlib

from .schema import Model, Node, Edge, Group, Scenario, Step, slug

OBJECT_TAGS = ("object", "UserObject")
# draw.io assigns these its own meaning; they are unavailable as custom properties.
RESERVED = {"id", "label", "placeholders", "tooltip", "link", "linkTarget", "tags", "treeRoot"}
TAG_RE_CHARS = ("<", ">")

# XML attribute names are constrained; anything else is dropped rather than
# written out to produce a file no parser will read.
XML_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]*$")

NODE_W, NODE_H = 220, 80
COL_GAP, ROW_GAP = 120, 48
MARGIN = 80
BADGE = 30


# ------------------------------------------------------------------------ reading

def _inflate(text: str) -> str:
    """Base64, then raw DEFLATE (wbits=-15, no zlib header), then URL decode."""
    return urllib.parse.unquote(zlib.decompress(base64.b64decode(text), -15).decode("utf-8"))


def _strip_html(s):
    out, depth = [], 0
    for ch in str(s or ""):
        if ch == "<":
            depth += 1
        elif ch == ">":
            depth = max(0, depth - 1)
        elif depth == 0:
            out.append(ch)
    return "".join(out).strip()


def iter_pages(path):
    """Yield (index, page_id, page_name, mxGraphModel) for every page, either encoding."""
    for i, diagram in enumerate(ET.parse(path).getroot().findall("diagram")):
        model = diagram.find("mxGraphModel")
        if model is None:                       # compressed page
            payload = (diagram.text or "").strip()
            if not payload:
                continue
            model = ET.fromstring(_inflate(payload))
        yield i, diagram.get("id"), diagram.get("name"), model


class _Cell:
    __slots__ = ("id", "label", "style", "parent", "kind", "source", "target", "attrs", "geom")

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))


def _parse_page(model) -> dict:
    """Flatten a page's <root> into {mxCell id: _Cell}, unwrapping object/UserObject."""
    cells = {}
    for child in model.find("root"):
        if child.tag in OBJECT_TAGS:
            mx = child.find("mxCell")
            if mx is None:
                continue
            cid, label = child.get("id"), child.get("label")
            attrs = {k: v for k, v in child.attrib.items() if k not in RESERVED}
        elif child.tag == "mxCell":
            mx, cid, label, attrs = child, child.get("id"), child.get("value"), {}
        else:
            continue

        if mx.get("edge") == "1":
            kind = "edge"
        elif mx.get("vertex") == "1":
            kind = "vertex"
        elif mx.get("parent") == "0":
            kind = "layer"
        else:
            kind = "other"

        g = mx.find("mxGeometry")
        cells[cid] = _Cell(
            id=cid, label=label, style=mx.get("style", ""), parent=mx.get("parent"),
            kind=kind, source=mx.get("source"), target=mx.get("target"), attrs=attrs,
            geom={k: g.get(k) for k in ("x", "y", "width", "height")} if g is not None else None,
        )
    return cells


def _layers(cells) -> list:
    return [c for c in cells.values() if c.kind == "layer"]


def _owning_layer(cells, cell):
    seen, cur = set(), cell
    while cur is not None and cur.parent not in (None, "0"):
        if cur.id in seen:
            return None                          # cycle guard
        seen.add(cur.id)
        cur = cells.get(cur.parent)
    return cur


def read(path, cfg) -> Model:
    """Build a Model from the first page of a .drawio.

    The first layer is the structure; every other layer is a scenario overlay, matched
    to a scenario by the `scenario` attribute on its elements, falling back to the
    layer name.
    """
    m = Model(source=str(path))
    pages = list(iter_pages(path))
    if not pages:
        return m
    _, _, pname, page = pages[0]
    m.name = pname or ""
    cells = _parse_page(page)
    layers = _layers(cells)
    base_id = layers[0].id if layers else "1"

    id_attrs = cfg.node_attrs
    edge_attr = cfg.edge_id_attr
    seen_groups = {}

    for c in cells.values():
        layer = _owning_layer(cells, c)
        on_base = layer is not None and layer.id == base_id
        scen = c.attrs.get("scenario")

        if c.kind == "vertex" and on_base and not scen:
            nid = _first(c.attrs, id_attrs)
            if not nid:
                continue                         # a band, a legend, an annotation
            grp = c.attrs.get(cfg.group_attr, "")
            if grp and grp not in seen_groups:
                seen_groups[grp] = Group(id=grp, label=grp)
            m.nodes.append(Node(
                id=nid, label=_strip_html(c.label), group=grp,
                kind=c.attrs.get(cfg.kind_attr, ""),
                attrs={"mxcell_id": c.id, "id_attr": _which(c.attrs, id_attrs),
                       **_extra(c.attrs, id_attrs, cfg)},
            ))

        elif c.kind == "edge" and on_base and not scen:
            s, t = cells.get(c.source), cells.get(c.target)
            m.edges.append(Edge(
                id=c.attrs.get(edge_attr, ""),
                source=_first(s.attrs, id_attrs) if s else (c.source or ""),
                target=_first(t.attrs, id_attrs) if t else (c.target or ""),
                label=_strip_html(c.label),
                kind=c.attrs.get(cfg.kind_attr, ""),
                attrs={"mxcell_id": c.id, **_extra(c.attrs, id_attrs, cfg)},
            ))

    # Scenario overlays, grouped by the scenario key on each element.
    buckets = {}
    for c in cells.values():
        scen = c.attrs.get("scenario")
        if not scen:
            continue
        layer = _owning_layer(cells, c)
        buckets.setdefault(scen, {"name": _strip_html(layer.label) if layer else scen, "items": []})
        buckets[scen]["items"].append((c, cells))

    for key in sorted(buckets):
        sc = Scenario(key=key, name=buckets[key]["name"])
        for c, cs in buckets[key]["items"]:
            if c.kind != "edge":
                continue                         # badges carry no information the arrow lacks
            s, t = cs.get(c.source), cs.get(c.target)
            try:
                n = int(c.attrs.get("step", ""))
            except ValueError:
                n = 0
            sc.steps.append(Step(
                step=n,
                actor=_first(s.attrs, id_attrs) if s else "",
                target=_first(t.attrs, id_attrs) if t else "",
                action=_unnumber(_strip_html(c.label)),
                edge=c.attrs.get(edge_attr, ""),
                attrs={k: v for k, v in c.attrs.items()
                       if k in ("from_abb", "to_abb", "from", "to")},
            ))
        sc.steps.sort(key=lambda s: s.step)
        m.scenarios.append(sc)

    m.groups = [seen_groups[k] for k in sorted(seen_groups)]
    return m


def _unnumber(s: str) -> str:
    """Drop a leading "3: " that the writer adds for legibility on the canvas."""
    head, sep, rest = s.partition(":")
    return rest.strip() if sep and head.strip().isdigit() else s


def _first(attrs, names):
    for n in names:
        if attrs.get(n):
            return attrs[n]
    return ""


def _which(attrs, names):
    """The attribute that supplied the identifier, so a local id filed under abb_id is
    visible to validation rather than quietly accepted."""
    return next((n for n in names if attrs.get(n)), "")


def _extra(attrs, id_attrs, cfg):
    skip = set(id_attrs) | {cfg.group_attr, cfg.kind_attr, cfg.edge_id_attr, "scenario", "step"}
    return {k: v for k, v in attrs.items() if k not in skip}


# ------------------------------------------------------------------------ writing

def _esc(s):
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _layout(m: Model) -> dict:
    """Deterministic grid: one column per group, nodes stacked within it.

    Mechanical rather than pretty, and that is the intent. The point of generation is
    that every box and arrow exists with the right identifier; arranging them is human
    judgement, and `sync` is what preserves that arrangement afterwards.
    """
    order, cols = [], {}
    for n in m.nodes:
        cols.setdefault(n.group or "", []).append(n)
        if (n.group or "") not in order:
            order.append(n.group or "")
    pos = {}
    x = MARGIN
    for g in order:
        y = MARGIN + (60 if g else 0)
        for n in cols[g]:
            pos[n.id] = (x, y)
            y += NODE_H + ROW_GAP
        x += NODE_W + COL_GAP
    return pos


def write(m: Model, path, cfg, style=None) -> None:
    """Emit a complete .drawio: structure on the base layer, one layer per scenario."""
    style = style or {}
    pos = _layout(m)
    out = []
    out.append('<mxfile host="model-skill" type="device" compressed="false">')
    out.append(f'  <diagram id="p-{slug(m.name) or "model"}" name="{_esc(m.name or "Model")}">')
    out.append('    <mxGraphModel dx="1422" dy="798" grid="0" gridSize="10" guides="1" '
               'tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" '
               'pageWidth="1920" pageHeight="1080" math="0" shadow="0">')
    out.append("      <root>")
    out.append('        <mxCell id="0" />')
    out.append('        <mxCell id="1" value="Structure" parent="0" />')
    for sc in m.scenarios:
        out.append(f'        <mxCell id="lyr-{_esc(sc.key)}" '
                   f'value="{_esc(sc.key + " " + (sc.name or ""))}" parent="0" visible="0" />')

    node_style = style.get("node", "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;"
                                   "strokeColor=#3A4654;fontSize=14;align=center;verticalAlign=middle;")
    edge_style = style.get("edge", "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;"
                                   "fontSize=12;strokeColor=#3A4654;")
    badge_style = style.get("badge", "ellipse;whiteSpace=wrap;html=1;fillColor=#C25B54;"
                                     "strokeColor=none;fontColor=#FFFFFF;fontSize=14;fontStyle=1;")
    flow_style = style.get("flow", "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;dashed=1;"
                                   "strokeWidth=2;strokeColor=#C25B54;fontColor=#C25B54;fontSize=12;")

    # Structure. id and the identifier attribute are set to the same value on purpose:
    # a copy-pasted shape keeps the attribute and gets a random id, which is how
    # accidental duplication becomes detectable.
    for n in m.nodes:
        x, y = pos.get(n.id, (MARGIN, MARGIN))
        extra = "".join(f' {k}="{_esc(v)}"' for k, v in sorted(n.attrs.items())
                        if k not in ("mxcell_id", "id_attr") and isinstance(v, str)
                        and XML_NAME_RE.match(k))
        grp = f' {cfg.group_attr}="{_esc(n.group)}"' if n.group else ""
        kind = f' {cfg.kind_attr}="{_esc(n.kind)}"' if n.kind else ""
        label = n.label or n.id
        out.append(f'        <object id="{_esc(cfg.cell_id_for(n.id))}" label="{_esc(label)}" '
                   f'{cfg.attr_for(n.id)}="{_esc(n.id)}"{grp}{kind}{extra}>')
        out.append(f'          <mxCell style="{node_style}" vertex="1" parent="1">')
        out.append(f'            <mxGeometry x="{x}" y="{y}" width="{NODE_W}" '
                   f'height="{NODE_H}" as="geometry" />')
        out.append("          </mxCell>")
        out.append("        </object>")

    for i, e in enumerate(m.edges):
        eid = e.id or f"e{i + 1}"
        attr = f' {cfg.edge_id_attr}="{_esc(e.id)}"' if e.id else ""
        out.append(f'        <object id="{_esc(eid)}" label="{_esc(e.label)}"{attr}>')
        out.append(f'          <mxCell style="{edge_style}" edge="1" parent="1" '
                   f'source="{_esc(cfg.cell_id_for(e.source))}" target="{_esc(cfg.cell_id_for(e.target))}">')
        out.append('            <mxGeometry relative="1" as="geometry" />')
        out.append("          </mxCell>")
        out.append("        </object>")

    # Overlays. Arrows point at the real structure shapes, so the overlay is part of
    # the graph rather than a picture laid on top of it.
    for sc in m.scenarios:
        lyr = f"lyr-{sc.key}"
        # Several steps commonly act from the same node. Badges must fan out along its
        # top edge, or the later ones sit exactly on the earlier ones and the reader
        # sees one step where there are four.
        used_on = {}
        for st in sc.steps:
            if st.actor and st.actor in pos:
                bx, by = pos[st.actor]
                k = used_on.get(st.actor, 0)
                used_on[st.actor] = k + 1
                x = bx - BADGE // 2 + k * (BADGE + 6)
                out.append(f'        <object id="{_esc(sc.key)}-badge-{st.step}" '
                           f'label="{st.step}" scenario="{_esc(sc.key)}" step="{st.step}">')
                out.append(f'          <mxCell style="{badge_style}" vertex="1" parent="{lyr}">')
                out.append(f'            <mxGeometry x="{x}" y="{by - BADGE // 2}" '
                           f'width="{BADGE}" height="{BADGE}" as="geometry" />')
                out.append("          </mxCell>")
                out.append("        </object>")
            if st.actor and st.target:
                eid = f' {cfg.edge_id_attr}="{_esc(st.edge)}"' if st.edge else ""
                out.append(f'        <object id="{_esc(sc.key)}-flow-{st.step}" '
                           f'label="{st.step}" scenario="{_esc(sc.key)}" '
                           f'step="{st.step}"{eid} from="{_esc(st.actor)}" '
                           f'to="{_esc(st.target)}">')
                out.append(f'          <mxCell style="{flow_style}" edge="1" parent="{lyr}" '
                           f'source="{_esc(cfg.cell_id_for(st.actor))}" target="{_esc(cfg.cell_id_for(st.target))}">')
                out.append('            <mxGeometry relative="1" as="geometry" />')
                out.append("          </mxCell>")
                out.append("        </object>")

    out.append("      </root>")
    out.append("    </mxGraphModel>")
    out.append("  </diagram>")
    out.append("</mxfile>")
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(out) + "\n")


def layer_names(path) -> list:
    """Layer names of the first page, in document order. The index is what -l takes."""
    for _i, _pid, _pname, page in iter_pages(path):
        cells = _parse_page(page)
        return [(_strip_html(c.label) or c.id) for c in _layers(cells)]
    return []
