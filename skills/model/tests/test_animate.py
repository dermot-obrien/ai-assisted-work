# SPDX-License-Identifier: Apache-2.0
"""The scenario animation: geometry, the merge of document and diagram, and the page.

Standard library only, and no draw.io: every test supplies its own structure image.

    python -m unittest discover -s tests
"""
from __future__ import annotations

import io
import os
import re
import shutil
import struct
import sys
import tempfile
import textwrap
import unittest
from contextlib import redirect_stdout, redirect_stderr

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "src"))

from model import animate, cli, config  # noqa: E402

BINDINGS = textwrap.dedent("""\
    bindingsVersion = "1.0"

    [model]
    node_id_attrs = ["abb_id"]
    edge_id_attr  = "iface_id"
    local_pattern = '[0-9]{1,3}'

    [[markdown.tables]]
    section    = "Building Blocks"
    entity     = "node"
    id_pattern = 'ABB-[0-9]{3}'
    columns    = { id = "Building Block", label = "Building Block", group = "Source" }

    [[markdown.tables]]
    section    = "Interfaces"
    entity     = "edge"
    id_pattern = 'IF-[0-9]{2,3}'
    columns    = { id = "Interface", source = "Provider", target = "Consumer", label = "Purpose" }

    [markdown.scenarios]
    section         = "Scenarios"
    heading_pattern = '^(S[0-9]+)\\b[\\s:.-]*(.*)$'
    columns         = { step = "Step", actor = "Actor", action = "Action", edge = "Interface" }
    """)

DOC = textwrap.dedent("""\
    ---
    title: "Test model"
    model:
      diagram: components.drawio
    ---

    # Test model

    ## Building Blocks

    | Building Block | Role | Source |
    |---|---|---|
    | 01 Gateway | Front door | one |
    | 02 Store | Holds things | one |

    ## Interfaces

    | Interface | Provider | Consumer | Purpose | Protocol |
    |---|---|---|---|---|
    | IF-01 | 02 Store | 01 Gateway | records | HTTPS |

    ## Scenarios

    ### S1 Fetch a record

    | Step | Actor | Action | Interface |
    |---:|---|---|---|
    | 1 | 01 Gateway | Gateway asks the store | IF-01 |
    """)

# The frame spans 0..1000 by 0..500. 02 Store sits inside a container at (600, 100),
# so its absolute position is (650, 150), not the (50, 50) it is stored at.
DIAGRAM = textwrap.dedent("""\
    <mxfile compressed="false"><diagram id="p" name="p"><mxGraphModel><root>
      <mxCell id="0"/>
      <mxCell id="1" value="Structure" parent="0"/>
      <mxCell id="frame" value="" style="" vertex="1" parent="1"><mxGeometry x="0" y="0" width="1000" height="500" as="geometry"/></mxCell>
      <object label="01 Gateway" local_id="01" id="local-01"><mxCell style="" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="80" as="geometry"/></mxCell></object>
      <mxCell id="box" value="" style="container=1" vertex="1" parent="1"><mxGeometry x="600" y="100" width="300" height="300" as="geometry"/></mxCell>
      <object label="02 Store" local_id="02" id="local-02"><mxCell style="" vertex="1" parent="box"><mxGeometry x="50" y="50" width="200" height="80" as="geometry"/></mxCell></object>
      <object label="records" iface_id="IF-01" id="if-01"><mxCell style="" edge="1" parent="1" source="local-02" target="local-01"><mxGeometry relative="1" as="geometry"/></mxCell></object>
      <mxCell id="L1" value="S1 Fetch a record" parent="0" visible="0"/>
      <object label="1: Gateway asks the store" scenario="S1" step="1" iface_id="IF-01" from="01" to="02" id="S1-f1"><mxCell style="" edge="1" parent="L1" source="local-01" target="local-02"><mxGeometry relative="1" as="geometry"/></mxCell></object>
    </root></mxGraphModel></diagram></mxfile>
    """)


def png(w, h):
    """The first bytes of a PNG, enough for the size check."""
    ihdr = struct.pack(">II", w, h) + b"\x08\x06\x00\x00\x00"
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + ihdr + b"\x00\x00\x00\x00"


class Base(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.write("skill-bindings.toml", BINDINGS)
        self.doc = self.write("index.md", DOC)
        self.dia = self.write("components.drawio", DIAGRAM)
        self.image = self.write_bytes("structure.png", png(2000, 1000))
        self.cfg = config.load(None, near=self.doc)

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def write(self, name, text):
        p = os.path.join(self.dir, name)
        with open(p, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        return p

    def write_bytes(self, name, data):
        p = os.path.join(self.dir, name)
        with open(p, "wb") as fh:
            fh.write(data)
        return p

    def build(self, **kw):
        return animate.build(self.doc, self.cfg, image=self.image, force=True, **kw)


class GeometryTests(Base):
    def test_child_position_is_made_absolute(self):
        _, boxes, _, name = animate.geometry(self.dia)
        self.assertEqual(boxes["local-02"], (650.0, 150.0, 200.0, 80.0))
        self.assertEqual(name, "Structure")

    def test_hidden_overlay_is_not_structure(self):
        _, boxes, _, _ = animate.geometry(self.dia)
        self.assertNotIn("S1-f1", boxes)


class BuildTests(Base):
    def test_positions_scale_to_the_image(self):
        d = self.build()
        # The image is twice the frame's size, so everything doubles.
        self.assertEqual(d["nodes"]["02"]["box"], [1300.0, 300.0, 400.0, 160.0])
        self.assertEqual(d["nodes"]["01"]["name"], "Gateway")

    def test_step_takes_endpoints_from_the_diagram_and_words_from_the_document(self):
        st = self.build()["scenarios"][0]["steps"][0]
        self.assertEqual((st["from"], st["to"], st["edge"]), ("01", "02", "IF-01"))
        self.assertEqual(st["action"], "Gateway asks the store")

    def test_interface_details_come_from_spare_columns(self):
        e = self.build()["edges"]["IF-01"]
        self.assertEqual(e["label"], "records")
        self.assertIn(["Protocol", "HTTPS"], e["details"])

    def test_missing_action_fails_loudly(self):
        self.write("index.md", DOC.replace("| Gateway asks the store |", "|  |"))
        with self.assertRaises(animate.AnimateError) as cm:
            self.build()
        self.assertIn("no action text", str(cm.exception))

    def test_scenario_on_one_side_only_fails(self):
        self.write("index.md", DOC.replace("### S1 Fetch a record", "### S2 Fetch a record"))
        with self.assertRaises(animate.AnimateError) as cm:
            self.build()
        msg = str(cm.exception)
        self.assertIn("S2: in the document", msg)
        self.assertIn("S1: has an overlay layer", msg)

    def test_mismatched_image_fails_rather_than_misplacing(self):
        self.image = self.write_bytes("structure.png", png(2000, 1400))
        with self.assertRaises(animate.AnimateError) as cm:
            self.build()
        self.assertIn("would not line up", str(cm.exception))


class PageTests(Base):
    def test_page_is_standalone(self):
        out = os.path.join(self.dir, "scenarios.html")
        r = animate.write(self.build(), out)
        with open(out, encoding="utf-8") as fh:
            html = fh.read()
        self.assertEqual(r["scenarios"], {"S1": 1})
        self.assertIn('src="data:image/png;base64,', html)
        self.assertNotRegex(html, r"fetch\(|XMLHttpRequest|<script[^>]+src=|<link[^>]+href=")
        urls = set(re.findall(r"https?://[^\s\"')]+", html))
        self.assertEqual(urls, {"http://www.w3.org/2000/svg"})

    def test_bad_accent_is_refused(self):
        with self.assertRaises(animate.AnimateError):
            animate.write(self.build(), os.path.join(self.dir, "x.html"), accent="red")

    def test_default_out(self):
        self.assertTrue(animate.default_out("a/index.md").endswith("scenarios.html"))
        self.assertTrue(animate.default_out("a/view.md").endswith("view-scenarios.html"))

    def test_same_inputs_give_the_same_page(self):
        # String hashing is randomised per process, so run in separate processes with
        # different seeds: any iteration over a set would show up as a different page.
        import subprocess
        model_py = os.path.join(os.path.dirname(HERE), "bin", "model.py")
        pages = []
        for seed in ("1", "2", "3"):
            out = os.path.join(self.dir, f"page-{seed}.html")
            env = dict(os.environ, PYTHONHASHSEED=seed)
            r = subprocess.run([sys.executable, model_py, "animate", self.doc, "--image", self.image,
                                "--force", "--out", out], capture_output=True, text=True, env=env)
            self.assertEqual(r.returncode, 0, r.stderr)
            with open(out, "rb") as fh:
                pages.append(fh.read())
        self.assertEqual(len(set(pages)), 1)

    def test_cli(self):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = cli.main(["animate", self.doc, "--image", self.image, "--force"])
        self.assertEqual(code, 0, err.getvalue())
        self.assertTrue(os.path.exists(os.path.join(self.dir, "scenarios.html")))


if __name__ == "__main__":
    unittest.main()
