# SPDX-License-Identifier: Apache-2.0
"""Command line for the model skill.

Agentic conventions, deliberately: structured output on stdout, diagnostics on stderr,
non-interactive throughout, distinct documented exit codes, and bounded output so a
large diagram cannot flood a context window.

Exit codes:
  0  success, or validation found nothing above the fail threshold
  1  validation found something at or above the fail threshold
  2  usage error, or an input could not be read
  3  an external tool was missing or failed (draw.io, PyYAML)
"""
from __future__ import annotations

import argparse
import json
import os
import sys

from . import load, __version__
from . import config as config_mod
from . import drawio, markdown, serial, validate as validate_mod, render as render_mod
from . import sync as sync_mod
from . import scan as scan_mod
from . import bindings as bindings_mod
from . import animate as animate_mod

MAX_FINDINGS = 200


def _err(msg, code=2):
    print(msg, file=sys.stderr)
    return code


def cmd_extract(a) -> int:
    cfg = config_mod.load(a.config, near=a.input)
    m = load(a.input, cfg)
    text = serial.dumps(m, a.format)
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)) or ".", exist_ok=True)
        with open(a.out, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        print(f"  {m.summary()} -> {a.out}")
    else:
        sys.stdout.write(text)
    return 0


def cmd_emit(a) -> int:
    cfg = config_mod.load(a.config, near=a.input)
    m = load(a.input, cfg)
    to = a.to.lower()
    os.makedirs(os.path.dirname(os.path.abspath(a.out)) or ".", exist_ok=True)

    if to == "drawio":
        if os.path.exists(a.out) and not a.force:
            return _err(f"  ! {a.out} exists. Emitting would discard its layout.\n"
                        f"    Use `model sync` to reconcile, or --force to overwrite.", 2)
        drawio.write(m, a.out, cfg, style=cfg.style)
    elif to in ("md", "markdown"):
        markdown.write(m, a.out, cfg)
    elif to in serial.FORMATS:
        with open(a.out, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(serial.dumps(m, to))
    else:
        return _err(f"  ! unknown target '{a.to}'; expected drawio, markdown, json, yaml or csv")
    print(f"  {m.summary()} -> {a.out}")
    return 0


def cmd_validate(a) -> int:
    cfg = config_mod.load(a.config, near=a.input)
    primary = load(a.input, cfg)
    against = a.against
    if not against and a.input.endswith((".md", ".markdown", ".mdx")):
        # A document that declares its diagram is checked against it by default.
        block = scan_mod.declared(a.input)
        if block.get("diagram"):
            against = os.path.join(os.path.dirname(a.input), block["diagram"])

    if against:
        other = load(against, cfg)
        doc, dia = ((primary, other) if a.input.endswith((".md", ".markdown", ".mdx"))
                    else (other, primary))
        findings = validate_mod.check(doc, cfg, dia)
    else:
        findings = (validate_mod.structural(primary, cfg) + validate_mod.catalogue(primary, cfg)
                    + validate_mod.mapping(primary, cfg))

    if a.json:
        print(json.dumps({
            "input": a.input,
            "against": against,
            "summary": primary.summary(),
            "result": validate_mod.worst(findings),
            "counts": {s: sum(1 for f in findings if f.severity == s) for s in ("error", "warn")},
            "findings": [f.to_dict() for f in findings[:MAX_FINDINGS]],
            "truncated": max(0, len(findings) - MAX_FINDINGS),
        }, indent=2))
    else:
        print(f"  {os.path.basename(a.input)}: {primary.summary()}")
        for f in findings[:MAX_FINDINGS]:
            print(f"  {f}", file=sys.stderr)
        if len(findings) > MAX_FINDINGS:
            print(f"  ... and {len(findings) - MAX_FINDINGS} more; use --json for all",
                  file=sys.stderr)
        errs = sum(1 for f in findings if f.severity == "error")
        warns = sum(1 for f in findings if f.severity == "warn")
        if findings:
            print(f"  {errs} error(s), {warns} warning(s)", file=sys.stderr)

    threshold = a.fail_on
    if threshold == "never":
        return 0
    if threshold == "warn" and findings:
        return 1
    return 1 if any(f.severity == "error" for f in findings) else 0


def cmd_render(a) -> int:
    try:
        r = render_mod.export(a.input, a.out, fmt=a.format, layers=a.layer or None,
                              scale=a.scale, width=a.width, transparent=a.transparent,
                              binary=a.drawio_bin, timeout=a.timeout, theme=a.theme)
    except SystemExit as e:
        return _err(str(e), 3)
    print(f"  {_shown(r['path'])} ({r['bytes'] // 1024} KB, {r['format']})")
    print(f"  {_shown(r['record'])} (render record; commit it with the image)")
    return 0


def _shown(path):
    """Relative when it can be. On Windows a path on another drive has no relative form,
    and relpath raises rather than returning the absolute path."""
    try:
        return os.path.relpath(path)
    except ValueError:
        return os.path.abspath(path)


def cmd_sync(a) -> int:
    cfg = config_mod.load(a.config, near=a.doc)
    doc = load(a.doc, cfg)
    if not os.path.exists(a.drawio):
        return _err(f"  ! {a.drawio}: not found. Use `emit --to drawio` to create it first.")
    changes = sync_mod.sync(doc, a.drawio, cfg, prune=a.prune, dry_run=a.dry_run,
                            adopt=a.adopt)
    if a.json:
        print(json.dumps({"doc": a.doc, "drawio": a.drawio, "dry_run": a.dry_run,
                          "changes": [c.to_dict() for c in changes[:MAX_FINDINGS]]}, indent=2))
    else:
        for c in changes[:MAX_FINDINGS]:
            print(f"  {c}")
        if len(changes) > MAX_FINDINGS:
            print(f"  ... and {len(changes) - MAX_FINDINGS} more")
        verb = "would change" if a.dry_run else "changed"
        print(f"  {len(changes)} {verb} in {os.path.basename(a.drawio)}")
    return 0


def cmd_rename(a) -> int:
    cfg = config_mod.load(a.config, near=a.doc)
    dia = a.drawio
    if dia is None:
        block = scan_mod.declared(a.doc)
        if block.get("diagram"):
            dia = os.path.join(os.path.dirname(a.doc), block["diagram"])
    if dia and not os.path.exists(dia):
        return _err(f"  ! {dia}: not found")
    changes = sync_mod.rename(a.doc, dia, a.old, a.new, cfg, dry_run=a.dry_run)
    for c in changes:
        print(f"  {c}")
    if not dia:
        print("  no diagram declared or given; only the document was changed")
    return 0


def cmd_scan(a) -> int:
    if not os.path.isdir(a.folder):
        return _err(f"  ! {a.folder}: not a folder")
    cfg = config_mod.load(a.config, near=a.folder)
    found, skipped = scan_mod.find(a.folder, recursive=a.recursive)
    entries = [scan_mod.inspect(p, block, cfg) for p, block in found]
    worst = validate_mod.worst([validate_mod.Finding("", e["result"], "")
                                for e in entries if e["result"] != "ok"])
    if a.json:
        for e in entries:
            e["truncated"] = max(0, len(e["findings"]) - MAX_FINDINGS)
            e["findings"] = e["findings"][:MAX_FINDINGS]
        print(json.dumps({"folder": a.folder, "result": worst, "models": entries,
                          "skipped": skipped}, indent=2))
    else:
        for e in entries:
            c = e["counts"]
            print(f"  {e['result']:<5} {_shown(e['doc'])} + "
                  f"{os.path.basename(e['diagram'])}: {e['summary']}; "
                  f"{c['error']} error(s), {c['warn']} warning(s), "
                  f"{len(e['views'])} view(s)")
            for f in e["findings"][:20]:
                print(f"        {f['severity']}  {f['where'] + ': ' if f['where'] else ''}"
                      f"{f['message']}  [{f['rule']}]", file=sys.stderr)
        print(f"  {len(entries)} model(s); {len(skipped)} document(s) declare no diagram")
    if a.fail_on == "never":
        return 0
    if a.fail_on == "warn":
        return 1 if worst != "ok" else 0
    return 1 if worst == "error" else 0


def cmd_doctor(a) -> int:
    """Report how this skill has been bound to the host repository, and what is wrong.

    Run this before anything else. It converts two silent failures, the agent never
    reading the binding and the binding pointing somewhere wrong, into one visible one.
    """
    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    cfg = config_mod.load(a.config, near=a.near or os.getcwd())

    # Any skill in the suite can be checked from here. A prose skill declares its
    # contract in inputs.toml and borrows this resolver rather than shipping a runtime
    # of its own, which keeps the "run a script, do not read the file" rule affordable.
    skill_dir, skill = here, a.skill or "model"
    if skill != "model":
        siblings = bindings_mod.sibling_skills(here)
        if skill not in siblings:
            return _err(f"  ! no skill '{skill}' installed beside this one.\n"
                        f"    found: {', '.join(siblings) or '(none)'}", 3)
        skill_dir = siblings[skill]
    payload, issues = bindings_mod.report(cfg, skill_dir, skill=skill)

    if a.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"  binding file : {payload['bindingFile']}")
        print(f"  version      : {payload['bindingsVersion']}")
        print(f"  anchor       : {payload['anchor']}")
        for c in payload["catalogues"]:
            mark = "ok " if c["exists"] else "!! "
            print(f"  catalogue    : {mark}{c['resolved']}  [{c['column']}]")
        print(f"  identifiers  : {payload['catalogueIdentifiers']}")
        if payload["siblings"]:
            print(f"  siblings     : {', '.join(payload['siblings'])}")
        for k, v in sorted(payload["resolved"].items()):
            print(f"  {k:13}: {v}")
        for i in issues:
            print(f"  {i}", file=sys.stderr)
        print(f"  result       : {payload['result']}")
    return 1 if payload["result"] == "error" else 0


def cmd_layers(a) -> int:
    names = drawio.layer_names(a.input)
    if a.json:
        print(json.dumps([{"index": i, "name": n} for i, n in enumerate(names)], indent=2))
    else:
        for i, n in enumerate(names):
            print(f"  {i}  {n}")
    return 0


def cmd_animate(a) -> int:
    cfg = config_mod.load(a.config, near=a.doc)
    try:
        data = animate_mod.build(a.doc, cfg, diagram_path=a.diagram, image=a.image,
                                 drawio_bin=a.drawio_bin, force=a.force)
        r = animate_mod.write(data, a.out or animate_mod.default_out(a.doc),
                              accent=a.accent, interval=a.interval)
    except animate_mod.AnimateError as e:
        return _err(str(e), 1)
    except SystemExit as e:                      # draw.io missing or failed
        return _err(str(e), 3)
    steps = ", ".join(f"{k} {n}" for k, n in r["scenarios"].items())
    print(f"  {_shown(r['path'])} ({r['bytes'] // 1024} KB; {steps} steps). Opens from disk.")
    return 0


def build_parser():
    p = argparse.ArgumentParser(
        prog="model", description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--version", action="version", version=f"model {__version__}")
    sub = p.add_subparsers(dest="cmd", required=True)

    def common(sp):
        sp.add_argument("--config", help="path to model.toml (default: nearest one upward)")
        return sp

    e = common(sub.add_parser("extract", help="read a model out of any representation"))
    e.add_argument("input", help=".md, .drawio, .json or .yaml")
    e.add_argument("--format", default="json", choices=list(serial.FORMATS) + ["yml"])
    e.add_argument("--out", help="write here instead of stdout")
    e.set_defaults(fn=cmd_extract)

    m = common(sub.add_parser("emit", help="write a model into another representation"))
    m.add_argument("input")
    m.add_argument("--to", required=True,
                   help="drawio | markdown | json | yaml | csv")
    m.add_argument("--out", required=True)
    m.add_argument("--force", action="store_true",
                   help="overwrite an existing .drawio, discarding its layout")
    m.set_defaults(fn=cmd_emit)

    v = common(sub.add_parser("validate", help="check a model, and two representations against each other"))
    v.add_argument("input")
    v.add_argument("--against", help="the other representation to compare with")
    v.add_argument("--json", action="store_true", help="machine-readable output on stdout")
    v.add_argument("--fail-on", default="error", choices=("error", "warn", "never"))
    v.set_defaults(fn=cmd_validate)

    r = sub.add_parser("render", help="export a .drawio via the draw.io desktop CLI")
    r.add_argument("input")
    r.add_argument("--out", required=True)
    r.add_argument("--format", help="svg (default) | png | pdf | jpg")
    r.add_argument("--layer", action="append",
                   help="layer NAME to include; repeatable. Omit for every layer")
    r.add_argument("--scale", type=float)
    r.add_argument("--width", type=int)
    r.add_argument("--transparent", action="store_true")
    r.add_argument("--theme", default="light", choices=render_mod.THEMES,
                   help="SVG colour scheme: light (default), dark, or auto to follow the viewer")
    r.add_argument("--drawio-bin", help="path to the draw.io executable")
    r.add_argument("--timeout", type=int, default=120)
    r.set_defaults(fn=cmd_render)

    y = common(sub.add_parser("sync", help="reconcile a diagram with a document, keeping the layout"))
    y.add_argument("doc", help="the document that owns what exists and what connects")
    y.add_argument("drawio", help="the diagram that owns the layout")
    y.add_argument("--prune", action="store_true",
                   help="delete shapes with no row, instead of marking them")
    y.add_argument("--dry-run", action="store_true", help="report without writing")
    y.add_argument("--adopt", action="store_true",
                   help="tag unidentified shapes whose label matches a row, instead of "
                        "adding new ones")
    y.add_argument("--json", action="store_true")
    y.set_defaults(fn=cmd_sync)

    n = common(sub.add_parser("rename", help="change an identifier in a document and its diagram"))
    n.add_argument("doc")
    n.add_argument("old")
    n.add_argument("new")
    n.add_argument("--drawio", help="the diagram (default: the one the document declares)")
    n.add_argument("--dry-run", action="store_true")
    n.set_defaults(fn=cmd_rename)

    s = common(sub.add_parser("scan", help="find and validate every declared model in a folder"))
    s.add_argument("folder")
    s.add_argument("--recursive", action="store_true")
    s.add_argument("--json", action="store_true")
    s.add_argument("--fail-on", default="error", choices=("error", "warn", "never"))
    s.set_defaults(fn=cmd_scan)

    d = common(sub.add_parser("doctor", help="check how this skill is bound to the repository"))
    d.add_argument("--skill", help="check a sibling skill's contract instead of model's")
    d.add_argument("--near", help="resolve the binding file from here (default: cwd)")
    d.add_argument("--json", action="store_true")
    d.set_defaults(fn=cmd_doctor)

    an = common(sub.add_parser("animate", help="write a standalone HTML step-through of a document's scenarios"))
    an.add_argument("doc", help="the .md document; its declared diagram supplies the geometry")
    an.add_argument("--diagram", help="the .drawio, when the document declares none")
    an.add_argument("--out", help="default: scenarios.html beside index.md, else <stem>-scenarios.html")
    an.add_argument("--image", help="a PNG of the structure layer to use instead of rendering one")
    an.add_argument("--accent", default=animate_mod.DEFAULT_ACCENT, help="#RRGGBB for arrows and badges")
    an.add_argument("--interval", type=float, default=3.2, help="seconds per step when playing")
    an.add_argument("--force", action="store_true", help="animate even if validation reports errors")
    an.add_argument("--drawio-bin", help="path to the draw.io executable")
    an.set_defaults(fn=cmd_animate)

    l = sub.add_parser("layers", help="list a .drawio's layers with their indexes")
    l.add_argument("input")
    l.add_argument("--json", action="store_true")
    l.set_defaults(fn=cmd_layers)

    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.fn(args)
    except FileNotFoundError as ex:
        return _err(f"  ! {ex.filename}: not found")
    except SystemExit as ex:
        if isinstance(ex.code, int):
            return ex.code
        return _err(str(ex.code), 2)


if __name__ == "__main__":
    sys.exit(main())
