# SPDX-License-Identifier: Apache-2.0
"""Render a .drawio through the draw.io desktop CLI.

draw.io is an Electron app that doubles as its own CLI, which brings a specific set of
traps, all of which this module works around:

  - The Windows portable build silently ignores CLI arguments. Only the installed build
    processes them, so the executable is located rather than assumed.
  - `--page-index` has an inconsistently documented base and open bugs where it exports
    a range rather than one page. Layers are addressed instead, by name, resolved to
    document-order indexes from the file itself.
  - The accepted flags change between releases. Version 29.7 dropped `--disable-update`
    and `--timeout`, both of which older documentation still lists. An unknown flag is
    not ignored: argument parsing breaks and the error reads "input file/directory not
    found", which blames the file. So the build is probed once via its own --help and
    only supported flags are passed.
  - PNG export has been reported to hang where SVG succeeds, so SVG is the default and
    the subprocess is always bounded by a timeout on this side.
  - Exit codes are coarse and at least one release prints "Export Failed" on success,
    so success is asserted on the output file existing and being non-empty.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys

from .drawio import layer_names

CANDIDATES_WIN = (
    r"C:\Program Files\draw.io\draw.io.exe",
    r"C:\Program Files (x86)\draw.io\draw.io.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\draw.io\draw.io.exe"),
)
CANDIDATES_NIX = (
    "/usr/bin/drawio", "/usr/local/bin/drawio", "/opt/drawio/drawio",
    "/Applications/draw.io.app/Contents/MacOS/draw.io",
)


def find_binary(explicit=None) -> str:
    """Locate the draw.io executable, or raise with something actionable."""
    for c in (explicit, os.environ.get("DRAWIO_BIN")):
        if c and os.path.exists(c):
            return c
    for name in ("drawio", "draw.io"):
        p = shutil.which(name)
        if p:
            return p
    for c in (CANDIDATES_WIN if sys.platform == "win32" else CANDIDATES_NIX):
        if c and os.path.exists(c):
            return c
    raise SystemExit(
        "  ! draw.io desktop not found.\n"
        "    Install it, or set DRAWIO_BIN to the executable.\n"
        "    On Windows use the INSTALLED build; the portable exe ignores CLI arguments.")


def resolve_layers(path, names) -> list:
    """Layer names to document-order indexes, which is what --layers takes."""
    have = layer_names(path)
    idx, missing = [], []
    for n in names:
        if n in have:
            idx.append(have.index(n))
        else:
            missing.append(n)
    if missing:
        raise SystemExit(f"  ! no such layer: {', '.join(missing)}\n"
                         f"    available: {', '.join(have) or '(none)'}")
    return idx


_CAPS = {}


def capabilities(exe) -> set:
    """Long options this build actually accepts, read from its own --help.

    The draw.io CLI has changed incompatibly between releases: flags documented in one
    version are silently absent in the next, and commander then swallows the input path
    as an option value and reports "input file/directory not found", which points at
    entirely the wrong thing. Probing once is cheaper than guessing, and it is the only
    thing that keeps this working across upgrades.
    """
    if exe in _CAPS:
        return _CAPS[exe]
    try:
        p = subprocess.run([exe, "--help"], capture_output=True, text=True, timeout=60)
        text = (p.stdout or "") + (p.stderr or "")
    except Exception:
        text = ""
    caps = set(re.findall(r"(--[a-z][a-z0-9-]*)", text))
    _CAPS[exe] = caps
    return caps


THEMES = ("light", "dark", "auto")


def export(path, out, fmt=None, layers=None, scale=None, width=None,
           transparent=False, binary=None, timeout=120, theme="light") -> dict:
    """Export one .drawio. `layers` is a list of layer NAMES, not indexes.

    `theme` applies to SVG. draw.io's own default is "auto": colours written as
    light-dark() pairs that follow the viewer's colour scheme, on a transparent
    background. An image embedded in a document or a slide then turns dark when the
    viewer's system does, while everything around it stays light. "light" and "dark"
    pin the image to one scheme; "auto" keeps draw.io's behaviour.
    """
    if theme not in THEMES:
        raise SystemExit(f"  ! unknown theme {theme!r}; use one of {', '.join(THEMES)}")
    exe = find_binary(binary)
    caps = capabilities(exe)
    fmt = (fmt or os.path.splitext(out)[1].lstrip(".") or "svg").lower()
    cmd = [exe, "-x", "-f", fmt, "-o", os.path.abspath(out)]
    # Only pass what this build understands. An unknown flag is not ignored; it breaks
    # argument parsing and the resulting error names the input file, not the flag.
    if "--disable-update" in caps:
        cmd.append("--disable-update")
    if "--timeout" in caps:
        cmd += ["--timeout", str(timeout)]
    if layers:
        cmd += ["-l", ",".join(str(i) for i in resolve_layers(path, layers))]
    if scale:
        cmd += ["-s", str(scale)]
    if width:
        cmd += ["--width", str(width)]
    if transparent and fmt in ("png", "svg"):
        cmd.append("-t")
    if fmt == "svg" and theme != "auto" and "--svg-theme" in caps:
        cmd += ["--svg-theme", theme]
    cmd.append(os.path.abspath(path))

    os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)
    before = os.path.getmtime(out) if os.path.exists(out) else None
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 30)

    # Assert on the artefact, not the exit code: some releases report failure on success.
    if not os.path.exists(out) or os.path.getsize(out) == 0:
        msg = (proc.stderr or proc.stdout or "").strip().split("\n")[-1] if (proc.stderr or proc.stdout) else ""
        raise SystemExit(f"  ! export produced nothing (exit {proc.returncode}){': ' + msg if msg else ''}")
    if before is not None and os.path.getmtime(out) == before:
        raise SystemExit(f"  ! export did not rewrite {out}; is draw.io already open on this file?")
    if fmt == "svg":
        pin_svg_theme(out, theme, transparent)
    record = write_record(path, out, layers)
    return {"path": os.path.abspath(out), "bytes": os.path.getsize(out), "format": fmt,
            "record": record}


_SVG_ROOT = re.compile(r"<svg\b[^>]*>")
_STYLE = re.compile(r'\sstyle="([^"]*)"')


def pin_svg_theme(svg_path, theme="light", transparent=False) -> bool:
    """Pin a draw.io SVG to one colour scheme, in its root element's style.

    Done after export as well as through --svg-theme, because older draw.io builds lack
    the flag and still write light-dark() colours. color-scheme on the root decides
    which half of every light-dark() pair applies, so the image looks the same whatever
    the viewer's setting. A light image also gets a white background unless it was
    asked to be transparent, since a transparent one shows whatever is behind it.
    Returns whether the file changed.
    """
    if theme == "auto":
        return False
    with open(svg_path, encoding="utf-8") as fh:
        text = fh.read()
    root = _SVG_ROOT.search(text)
    if not root:
        return False
    tag = root.group(0)
    m = _STYLE.search(tag)
    decls = []
    if m:
        for part in m.group(1).split(";"):
            if ":" not in part:
                continue
            key = part.split(":", 1)[0].strip().lower()
            if key == "color-scheme":
                continue
            if key in ("background", "background-color") and theme == "light" and not transparent:
                continue
            decls.append(part.strip())
    if theme == "light" and not transparent:
        decls = ["background: #ffffff", "background-color: #ffffff"] + decls
    decls.append(f"color-scheme: {theme}")
    style = ' style="' + "; ".join(decls) + ';"'
    new_tag = _STYLE.sub(lambda _: style, tag, count=1) if m else tag[:4] + style + tag[4:]
    if new_tag == tag:
        return False
    with open(svg_path, "w", encoding="utf-8", newline="") as fh:
        fh.write(text[:root.start()] + new_tag + text[root.end():])
    return True


# ---------------------------------------------------------------------- render records
#
# An image rendered from a diagram goes stale silently when the diagram changes and
# nobody re-renders. Each render therefore leaves a record beside the image,
# `<image>.render.json`, naming its source and a fingerprint of it. Anything that later
# uses the image, a deck for instance, can compare the fingerprint with the source as it
# is now and say the picture is out of date. The record is a file convention rather than
# an API, so a consumer needs no dependency on this skill.

RECORD_SUFFIX = ".render.json"


def fingerprint(path) -> str:
    """SHA-256 of a file with line endings normalised. A checkout that converts LF to
    CRLF must not look like an edit, or every Windows machine would disagree with CI."""
    import hashlib
    with open(path, "rb") as fh:
        data = fh.read().replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def record_path(image) -> str:
    return image + RECORD_SUFFIX


def write_record(source, image, layers=None) -> str:
    import json
    try:
        rel = os.path.relpath(os.path.abspath(source), os.path.dirname(os.path.abspath(image)))
    except ValueError:  # another Windows drive has no relative form
        rel = os.path.abspath(source)
    rec = {
        "source": rel.replace(os.sep, "/"),
        "sha256": fingerprint(source),
        "layers": list(layers or []),
        "note": "Written by model render. A consumer compares sha256 with the source to detect "
                "a stale render. Commit it with the image.",
    }
    p = record_path(os.path.abspath(image))
    with open(p, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(rec, fh, indent=2)
        fh.write("\n")
    return p


def check_record(image):
    """None when there is no record; otherwise (fresh, source_path, record)."""
    import json
    p = record_path(os.path.abspath(image))
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as fh:
        rec = json.load(fh)
    src = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(image)), rec.get("source", "")))
    fresh = os.path.exists(src) and fingerprint(src) == rec.get("sha256")
    return fresh, src, rec
