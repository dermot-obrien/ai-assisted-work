# SPDX-License-Identifier: Apache-2.0
"""A step-through animation of a model's scenarios, as one standalone HTML file.

The document supplies the names, the step narratives and the interface details; the
diagram supplies the geometry and the endpoints each step connects. The page draws its
own arrows between the boxes' current positions rather than copying draw.io's routing,
so moving boxes needs nothing but a re-run.

The output opens from disk in any browser: the structure view is embedded as a data
URI, script and styles are inline, and nothing is fetched. It fails rather than guess:
a step with no narrative, an endpoint with no geometry, or a scenario present on one
side only is an error, because a silent gap produces a confident wrong walkthrough.
"""
from __future__ import annotations

import base64
import json
import os
import re
import struct
import tempfile
import xml.etree.ElementTree as ET

from . import drawio, markdown, render, validate

DEFAULT_ACCENT = "#D6453D"
TOLERANCE = 0.015          # relative difference between image and diagram aspect ratios


class AnimateError(SystemExit):
    """Raised with every problem found, so one run lists them all."""


# ------------------------------------------------------------------ diagram geometry

def _num(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def geometry(path):
    """Absolute geometry of every vertex on the structure layer, keyed by mxCell id.

    draw.io stores a child's position relative to its parent group or container, so
    positions are accumulated up the parent chain until a layer is reached. Returns
    (cells, absolute boxes, structure layer id, structure layer name).
    """
    pages = list(drawio.iter_pages(path))
    if not pages:
        raise AnimateError(f"  ! {path}: no pages")
    cells = drawio._parse_page(pages[0][3])
    layers = drawio._layers(cells)
    if not layers:
        raise AnimateError(f"  ! {path}: no layers")
    base = layers[0]

    boxes = {}

    def absolute(cid, seen=()):
        if cid in boxes:
            return boxes[cid]
        c = cells.get(cid)
        if c is None or c.kind != "vertex" or not c.geom or cid in seen:
            return None
        x, y = _num(c.geom.get("x")), _num(c.geom.get("y"))
        p = cells.get(c.parent)
        if p is not None and p.kind == "vertex":
            pa = absolute(p.id, seen + (cid,))
            if pa:
                x, y = x + pa[0], y + pa[1]
        boxes[cid] = (x, y, _num(c.geom.get("width")), _num(c.geom.get("height")))
        return boxes[cid]

    on_base = {}
    for cid, c in cells.items():
        if c.kind == "vertex" and c.geom and not c.attrs.get("scenario"):
            layer = drawio._owning_layer(cells, c)
            if layer is not None and layer.id == base.id:
                b = absolute(cid)
                if b and (b[2] > 0 or b[3] > 0):
                    on_base[cid] = b
    return cells, on_base, base.id, drawio._strip_html(base.label) or "Structure"


def bounds(boxes):
    xs0 = [b[0] for b in boxes.values()]
    ys0 = [b[1] for b in boxes.values()]
    xs1 = [b[0] + b[2] for b in boxes.values()]
    ys1 = [b[1] + b[3] for b in boxes.values()]
    return min(xs0), min(ys0), max(xs1), max(ys1)


def png_size(data: bytes):
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise AnimateError("  ! the structure image is not a PNG")
    w, h = struct.unpack(">II", data[16:24])
    return w, h


# ------------------------------------------------------------------ assembly

def build(doc_path, cfg, diagram_path=None, image=None, drawio_bin=None, force=False):
    """Everything the page needs, as a dict. Raises AnimateError listing every problem."""
    doc = markdown.read(doc_path, cfg)
    if not diagram_path:
        block = doc.attrs.get("model") or {}
        if not block.get("diagram"):
            raise AnimateError(f"  ! {doc_path} declares no diagram; add `model: diagram:` "
                               f"to its front matter or pass --diagram")
        diagram_path = os.path.join(os.path.dirname(doc_path), block["diagram"])
    dia = drawio.read(diagram_path, cfg)

    problems = []
    if not force:
        errs = [f for f in validate.check(doc, cfg, dia) if f.severity == "error"]
        problems += [f"  validate: {f}" for f in errs]

    cells, boxes, base_id, base_name = geometry(diagram_path)
    node_cell = {n.id: n.attrs.get("mxcell_id") for n in dia.nodes}
    doc_nodes = {n.id: n for n in doc.nodes}
    doc_edges = {e.id: e for e in doc.edges if e.id}
    doc_scen = {s.key: s for s in doc.scenarios}
    dia_scen = {s.key: s for s in dia.scenarios}

    for k in sorted(set(doc_scen) - set(dia_scen)):
        problems.append(f"  {k}: in the document but has no overlay layer on the diagram")
    for k in sorted(set(dia_scen) - set(doc_scen)):
        problems.append(f"  {k}: has an overlay layer but no steps table in the document")

    used_nodes, scenarios = set(), []
    for key in [s.key for s in doc.scenarios if s.key in dia_scen]:
        ds, gs = doc_scen[key], dia_scen[key]
        by_step = {s.step: s for s in ds.steps}
        steps = []
        for g in gs.steps:
            d = by_step.get(g.step)
            where = f"  {key} step {g.step}"
            if d is None:
                problems.append(f"{where}: on the diagram but not in the document's table")
                continue
            if not d.action.strip():
                problems.append(f"{where}: no action text in the document")
            if d.actor and g.actor and d.actor != g.actor:
                problems.append(f"{where}: the document's actor is {d.actor} but the "
                                f"diagram's arrow starts at {g.actor}")
            for end in (g.actor, g.target):
                if not end or not boxes.get(node_cell.get(end)):
                    problems.append(f"{where}: endpoint {end or '(none)'} has no shape on "
                                    f"the structure layer")
                elif end not in doc_nodes:
                    problems.append(f"{where}: endpoint {end} has no row in the document")
                used_nodes.add(end)
            edge = d.edge or g.edge
            if edge and edge not in doc_edges:
                problems.append(f"{where}: interface {edge} has no row in the document")
            steps.append({"n": g.step, "from": g.actor, "to": g.target, "edge": edge,
                          "action": d.action.strip()})
        for s in ds.steps:
            if s.step not in {g.step for g in gs.steps}:
                problems.append(f"  {key} step {s.step}: in the document but has no arrow "
                                f"on the diagram")
        scenarios.append({"key": key, "name": ds.name or gs.name, "steps": steps})

    if not scenarios and not problems:
        problems.append("  no scenarios to animate")
    if problems:
        raise AnimateError("  ! cannot animate:\n" + "\n".join(problems))

    # The structure view, rendered unless one is supplied.
    if image:
        with open(image, "rb") as fh:
            png = fh.read()
    else:
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "structure.png")
            render.export(diagram_path, out, fmt="png", layers=[base_name], binary=drawio_bin)
            with open(out, "rb") as fh:
                png = fh.read()
    W, H = png_size(png)

    x0, y0, x1, y1 = bounds(boxes)
    bw, bh = max(x1 - x0, 1), max(y1 - y0, 1)
    if abs((W / H) - (bw / bh)) / (bw / bh) > TOLERANCE:
        raise AnimateError(
            f"  ! the rendered view is {W}x{H} but the shapes span {bw:.0f}x{bh:.0f}, so "
            f"positions would not line up. Something outside the shapes widens the render, "
            f"usually an edge label or waypoint. Add a background rectangle that encloses "
            f"everything on the structure layer, as a frame.")
    s = min(W / bw, H / bh)
    ox, oy = (W - bw * s) / 2, (H - bh * s) / 2

    def px(b):
        return [round((b[0] - x0) * s + ox, 1), round((b[1] - y0) * s + oy, 1),
                round(b[2] * s, 1), round(b[3] * s, 1)]

    nodes = {}
    for nid in used_nodes:
        n = doc_nodes[nid]
        nodes[nid] = {"box": px(boxes[node_cell[nid]]), "name": n.label or nid}
    edges = {}
    for sc in scenarios:
        for st in sc["steps"]:
            e = doc_edges.get(st["edge"])
            if e and st["edge"] not in edges:
                edges[st["edge"]] = {"label": e.label,
                                     "details": [[k.replace("_", " ").capitalize(), v]
                                                 for k, v in e.attrs.items()][:3]}
    return {"title": doc.name or os.path.basename(doc_path), "size": [W, H], "nodes": nodes,
            "edges": edges, "scenarios": scenarios,
            "png": base64.b64encode(png).decode("ascii")}


def default_out(doc_path):
    stem = os.path.splitext(os.path.basename(doc_path))[0]
    name = "scenarios.html" if stem == "index" else f"{stem}-scenarios.html"
    return os.path.join(os.path.dirname(doc_path), name)


def write(data, out, accent=DEFAULT_ACCENT, interval=3.2):
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", accent or ""):
        raise AnimateError(f"  ! --accent must be a #RRGGBB colour, not {accent!r}")
    png = data.pop("png")
    store = "model-animate:" + re.sub(r"[^a-z0-9]+", "-", data["title"].lower()).strip("-")
    html = (_TEMPLATE
            .replace("__TITLE__", _esc(data["title"]))
            .replace("__ACCENT__", accent)
            .replace("__PNG__", png)
            .replace("__W__", str(data["size"][0])).replace("__H__", str(data["size"][1]))
            .replace("__DATA__", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
            .replace("__STORE__", json.dumps(store))
            .replace("__INTERVAL__", str(int(interval * 1000))))
    os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(html)
    return {"path": os.path.abspath(out), "bytes": os.path.getsize(out),
            "scenarios": {s["key"]: len(s["steps"]) for s in data["scenarios"]}}


def _esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


_TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__: scenarios</title>
<style>
:root{--bg:#F5F6F8;--panel:#FFFFFF;--ink:#1C2430;--muted:#5B6474;--line:#D6DAE1;--accent:__ACCENT__;--pick:#2F4A6D;--shade:rgba(18,24,34,.55)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#12161D;--panel:#1B212B;--ink:#E6EAF0;--muted:#A2ABBA;--line:#2F3846;--pick:#5C7FAD;--shade:rgba(0,0,0,.6)}}
:root[data-theme="dark"]{--bg:#12161D;--panel:#1B212B;--ink:#E6EAF0;--muted:#A2ABBA;--line:#2F3846;--pick:#5C7FAD;--shade:rgba(0,0,0,.6)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--panel)}
h1{font-size:17px;margin:0}
.tabs{display:flex;gap:6px;flex-wrap:wrap}
button{font:inherit;color:var(--ink)}
.tabs button,.ctl button{border:1px solid var(--line);background:var(--panel);border-radius:6px;padding:6px 10px;cursor:pointer}
.tabs button[aria-pressed="true"]{background:var(--pick);color:#fff;border-color:var(--pick)}
main{display:grid;grid-template-columns:minmax(0,1fr) 320px;min-height:calc(100vh - 58px)}
@media (max-width:900px){main{grid-template-columns:1fr}}
.stage{padding:12px}
.canvas{position:relative;width:100%;margin:0 auto;aspect-ratio:__W__/__H__;background:#fff;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.world{position:absolute;inset:0;transform-origin:0 0;transition:transform .7s ease}
.world img,.world svg{position:absolute;inset:0;width:100%;height:100%}
.pop{position:absolute;max-width:340px;background:var(--panel);color:var(--ink);border:2px solid var(--accent);border-radius:8px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:13px;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s}
.pop.on{opacity:1;transform:none}
.pop .n{display:inline-block;background:var(--accent);color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;font-weight:700;line-height:22px;margin-right:6px}
.pop .a{font-weight:600}
.pop .m{color:var(--muted);font-size:12px;margin-top:6px}
aside{border-left:1px solid var(--line);background:var(--panel);padding:14px 16px;display:flex;flex-direction:column;gap:12px}
@media (max-width:900px){aside{border-left:0;border-top:1px solid var(--line)}}
aside h2{font-size:15px;margin:0}
ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}
ol li button{display:flex;gap:8px;width:100%;text-align:left;border:1px solid transparent;background:none;border-radius:6px;padding:6px;cursor:pointer}
ol li button:hover{border-color:var(--line)}
ol li button[aria-current="step"]{border-color:var(--accent)}
ol li .k{flex:0 0 22px;height:22px;border-radius:50%;background:var(--line);text-align:center;font-weight:700;font-size:12px;line-height:22px}
ol li button[aria-current="step"] .k,ol li.done .k{background:var(--accent);color:#fff}
.ctl{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.hint{color:var(--muted);font-size:12px}
.draw{stroke-dasharray:var(--len);stroke-dashoffset:var(--len);animation:draw .7s ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.pulse{animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{stroke-opacity:.35}}
@media (prefers-reduced-motion: reduce){.draw{animation:none;stroke-dashoffset:0}.pulse{animation:none}.pop,.world{transition:none}}
</style>
</head>
<body>
<header>
  <h1>__TITLE__: scenarios</h1>
  <div class="tabs" role="group" aria-label="Scenario" id="tabs"></div>
</header>
<main>
  <section class="stage">
    <div class="canvas" id="canvas">
      <div class="world" id="world">
        <img alt="Structure view" src="data:image/png;base64,__PNG__">
        <svg id="ov" viewBox="0 0 __W__ __H__" aria-hidden="true">
          <defs>
            <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="__ACCENT__"/></marker>
            <mask id="m"><rect x="0" y="0" width="__W__" height="__H__" fill="#fff"/><g id="holes"></g></mask>
          </defs>
          <rect id="shade" x="0" y="0" width="__W__" height="__H__" fill="var(--shade)" mask="url(#m)" opacity="0"/>
          <g id="done"></g><g id="cur"></g>
        </svg>
      </div>
      <div class="pop" id="pop" role="status" aria-live="polite"></div>
    </div>
  </section>
  <aside>
    <h2 id="sname"></h2>
    <div class="ctl">
      <button id="prev" aria-label="Previous step">&#9664; Prev</button>
      <button id="next" aria-label="Next step">Next &#9654;</button>
      <button id="play" aria-label="Play">&#9654; Play</button>
      <button id="reset">Restart</button>
      <button id="follow" aria-pressed="true">Zoom to step: on</button>
      <span class="hint">Arrow keys step, space plays</span>
    </div>
    <ol id="steps"></ol>
  </aside>
</main>
<script>
const D=__DATA__, W=D.size[0], H=D.size[1], K=W/2400, ACC="__ACCENT__", NS="http://www.w3.org/2000/svg";
const $=id=>document.getElementById(id);
let si=0, i=-1, timer=null, follow=true, Z={z:1,tx:0,ty:0};
function el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e;}
const B=id=>{const n=D.nodes[id];return n?{x:n.box[0],y:n.box[1],w:n.box[2],h:n.box[3]}:null;};
const nm=id=>(D.nodes[id]||{}).name||id;
function edgePt(b,tx,ty){const cx=b.x+b.w/2,cy=b.y+b.h/2,dx=tx-cx,dy=ty-cy;if(!dx&&!dy)return[cx,cy];const s=Math.min(dx?(b.w/2)/Math.abs(dx):1e9,dy?(b.h/2)/Math.abs(dy):1e9);return[cx+dx*s,cy+dy*s];}
function arrow(a,b,g,cur){const A=B(a),Bb=B(b);if(!A||!Bb)return[0,0];
  const p=edgePt(A,Bb.x+Bb.w/2,Bb.y+Bb.h/2),q=edgePt(Bb,A.x+A.w/2,A.y+A.h/2);
  const dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy)||1,bend=Math.min(120*K,len*.18);
  const cx=(p[0]+q[0])/2-dy/len*bend,cy=(p[1]+q[1])/2+dx/len*bend;
  const path=el("path",{d:`M${p[0]},${p[1]} Q${cx},${cy} ${q[0]},${q[1]}`,fill:"none",stroke:ACC,"stroke-width":(cur?6:3)*K,"stroke-opacity":cur?1:.45,"marker-end":"url(#ah)","stroke-linecap":"round"},g);
  if(cur){path.style.setProperty("--len",path.getTotalLength());path.classList.add("draw");}
  return[cx,cy];}
function ring(id,g,strong){const b=B(id);if(b)el("rect",{x:b.x-6*K,y:b.y-6*K,width:b.w+12*K,height:b.h+12*K,rx:10*K,fill:"none",stroke:ACC,"stroke-width":(strong?5:3)*K,class:strong?"pulse":""},g);}
function hole(id){const b=B(id);if(b)el("rect",{x:b.x-8*K,y:b.y-8*K,width:b.w+16*K,height:b.h+16*K,rx:10*K,fill:"#000"},$("holes"));}
function badge(id,n,g,k){const b=B(id);if(!b)return;const x=b.x+14*K+k*30*K,y=b.y+2*K;el("circle",{cx:x,cy:y,r:15*K,fill:ACC,stroke:"#fff","stroke-width":3*K},g);const t=el("text",{x,y:y+5.5*K,"text-anchor":"middle","font-size":16*K,"font-weight":700,fill:"#fff","font-family":"system-ui,sans-serif"},g);t.textContent=n;}
function setZ(z,tx,ty){Z={z,tx,ty};$("world").style.transform=`translate(${tx}px,${ty}px) scale(${z})`;}
function focus(s,mid){const c=$("canvas").getBoundingClientRect(),sc=c.width/W;if(!follow){setZ(1,0,0);return;}
  const bs=[B(s.from),B(s.to)].filter(Boolean),pad=140*K;
  const x0=Math.min(...bs.map(b=>b.x),mid[0])-pad,y0=Math.min(...bs.map(b=>b.y),mid[1])-pad,x1=Math.max(...bs.map(b=>b.x+b.w),mid[0])+pad,y1=Math.max(...bs.map(b=>b.y+b.h),mid[1])+pad+120*K;
  const z=Math.max(1,Math.min(2.6,W/(x1-x0),H/(y1-y0)));
  let tx=c.width/2-((x0+x1)/2)*sc*z,ty=c.height/2-((y0+y1)/2)*sc*z;
  tx=Math.min(0,Math.max(c.width-c.width*z,tx));ty=Math.min(0,Math.max(c.height-c.height*z,ty));setZ(z,tx,ty);}
function showPop(s){const p=$("pop"),E=D.edges[s.edge]||{};
  p.innerHTML='<div><span class="n"></span><span class="a"></span></div><div class="m"></div>';
  p.querySelector(".n").textContent=s.n;p.querySelector(".a").textContent=s.action;
  const det=(E.details||[]).map(d=>d[0]+": "+d[1]).join("  ·  ");
  p.querySelector(".m").textContent=`${s.from} ${nm(s.from)} → ${s.to} ${nm(s.to)}${s.edge?"  ·  "+s.edge:""}${E.label?" "+E.label:""}${det?"  ·  "+det:""}`;
  const c=$("canvas").getBoundingClientRect(),sc=c.width/W,T=(x,y)=>[x*sc*Z.z+Z.tx,y*sc*Z.z+Z.ty];
  const bs=[B(s.from),B(s.to)].filter(Boolean);
  const[ux0,uy0]=T(Math.min(...bs.map(b=>b.x)),Math.min(...bs.map(b=>b.y))),[ux1,uy1]=T(Math.max(...bs.map(b=>b.x+b.w)),Math.max(...bs.map(b=>b.y+b.h)));
  p.classList.remove("on");p.style.left="0px";p.style.top="0px";
  requestAnimationFrame(()=>{const w=p.offsetWidth,h=p.offsetHeight,g=16,cx=(ux0+ux1)/2-w/2,cy=(uy0+uy1)/2-h/2;
    const fits=([x,y])=>x>=8&&y>=8&&x+w<=c.width-8&&y+h<=c.height-8;
    let[x,y]=[[cx,uy1+g],[cx,uy0-h-g],[ux1+g,cy],[ux0-w-g,cy]].find(fits)||[c.width-w-8,c.height-h-8];
    p.style.left=Math.max(8,Math.min(x,c.width-w-8))+"px";p.style.top=Math.max(8,Math.min(y,c.height-h-8))+"px";p.classList.add("on");});}
function render(){const S=D.scenarios[si];$("done").innerHTML="";$("cur").innerHTML="";$("holes").innerHTML="";const used={};
  S.steps.forEach((s,j)=>{if(j>i)return;const g=j===i?$("cur"):$("done"),k=used[s.from]=(used[s.from]??-1)+1;const mid=arrow(s.from,s.to,g,j===i);badge(s.from,s.n,g,k);
    if(j===i){ring(s.from,g,false);ring(s.to,g,true);hole(s.from);hole(s.to);focus(s,mid);showPop(s);}});
  $("shade").setAttribute("opacity",i>=0?1:0);if(i<0){$("pop").classList.remove("on");setZ(1,0,0);}
  document.querySelectorAll("#steps li").forEach((li,j)=>{li.classList.toggle("done",j<i);const b=li.querySelector("button");b.removeAttribute("aria-current");if(j===i)b.setAttribute("aria-current","step");});}
function go(n){i=Math.max(-1,Math.min(D.scenarios[si].steps.length-1,n));render();}
function stop(){clearInterval(timer);timer=null;$("play").innerHTML="&#9654; Play";$("play").setAttribute("aria-label","Play");}
function play(){if(timer){stop();return;}const L=D.scenarios[si].steps.length;if(i>=L-1)go(-1);$("play").innerHTML="&#10074;&#10074; Pause";$("play").setAttribute("aria-label","Pause");go(i+1);timer=setInterval(()=>{if(i>=D.scenarios[si].steps.length-1){stop();return;}go(i+1);},__INTERVAL__);}
function pick(n){stop();si=n;i=-1;document.querySelectorAll("#tabs button").forEach((b,j)=>b.setAttribute("aria-pressed",j===n));
  const S=D.scenarios[n];$("sname").textContent=S.key+" "+S.name;const ol=$("steps");ol.innerHTML="";
  S.steps.forEach((s,j)=>{const li=document.createElement("li"),b=document.createElement("button");b.innerHTML='<span class="k"></span><span></span>';b.firstChild.textContent=s.n;b.lastChild.textContent=s.action;b.onclick=()=>{stop();go(j);};li.appendChild(b);ol.appendChild(li);});
  render();try{localStorage.setItem(__STORE__,S.key);}catch(e){}}
D.scenarios.forEach((S,n)=>{const b=document.createElement("button");b.textContent=S.key+" "+S.name;b.onclick=()=>pick(n);$("tabs").appendChild(b);});
$("follow").onclick=()=>{follow=!follow;$("follow").setAttribute("aria-pressed",follow);$("follow").textContent="Zoom to step: "+(follow?"on":"off");render();};
$("prev").onclick=()=>{stop();go(i-1);};$("next").onclick=()=>{stop();go(i+1);};$("play").onclick=play;$("reset").onclick=()=>{stop();go(-1);};
document.addEventListener("keydown",e=>{if(e.key==="ArrowRight"){stop();go(i+1);}else if(e.key==="ArrowLeft"){stop();go(i-1);}else if(e.key===" "){e.preventDefault();play();}});
window.addEventListener("resize",()=>{if(i>=0)render();});
let start=0;try{const k=localStorage.getItem(__STORE__);const n=D.scenarios.findIndex(s=>s.key===k);if(n>=0)start=n;}catch(e){}
pick(start);
</script>
</body>
</html>
"""
