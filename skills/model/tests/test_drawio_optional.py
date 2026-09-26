# SPDX-License-Identifier: Apache-2.0
"""draw.io is optional: a stamped view stands in for a render, and animate says what to do
when there is neither.

    python -m unittest discover -s tests
"""
from __future__ import annotations

import io
import os
import sys
import unittest
from contextlib import redirect_stdout, redirect_stderr
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "src"))
sys.path.insert(0, HERE)

from model import animate, cli, render  # noqa: E402
from test_animate import Base  # noqa: E402

SVG = ('<svg xmlns="http://www.w3.org/2000/svg" width="1000px" height="500px" '
       'viewBox="0 0 1000 500"><rect width="1000" height="500" fill="#fff"/></svg>')


def no_drawio(*_a, **_k):
    raise AssertionError("draw.io must not be called")


class Stamp(Base):
    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = cli.main(list(argv))
        return code, out.getvalue() + err.getvalue()

    def test_stamp_then_check(self):
        view = self.write("components.svg", SVG)
        code, _ = self.run_cli("stamp", view, "--check")
        self.assertEqual(code, 1)                       # no record yet
        code, _ = self.run_cli("stamp", view, "--diagram", self.dia, "--layer", "Structure")
        self.assertEqual(code, 0)
        code, text = self.run_cli("stamp", view, "--check")
        self.assertEqual(code, 0, text)
        self.assertIn("current", text)
        with open(self.dia, "a", encoding="utf-8") as fh:  # the diagram changes
            fh.write("\n")
        code, text = self.run_cli("stamp", view, "--check")
        self.assertEqual(code, 1)
        self.assertIn("stale", text)

    def test_unknown_layer_is_refused(self):
        view = self.write("components.svg", SVG)
        code, text = self.run_cli("stamp", view, "--diagram", self.dia, "--layer", "Nope")
        self.assertEqual(code, 2)
        self.assertIn("no layer", text)


class AnimateWithoutDrawio(Base):
    def stamped_view(self):
        view = self.write("components.svg", SVG)
        render.write_record(self.dia, view, layers=["Structure"], by="model stamp")
        return view

    def test_current_svg_view_is_used_and_draw_io_is_not(self):
        self.stamped_view()
        with mock.patch.object(render, "export", no_drawio), \
             mock.patch.object(render, "available", lambda *_: None):
            d = animate.build(self.doc, self.cfg, force=True)
        self.assertEqual(d["mime"], "image/svg+xml")
        self.assertEqual(d["size"], [1000.0, 500.0])
        self.assertEqual(d["nodes"]["02"]["box"], [650.0, 150.0, 200.0, 80.0])

    def test_stale_view_without_draw_io_says_how_to_fix_it(self):
        self.stamped_view()
        with open(self.dia, "a", encoding="utf-8") as fh:
            fh.write("\n")
        with mock.patch.object(render, "export", no_drawio), \
             mock.patch.object(render, "available", lambda *_: None):
            with self.assertRaises(animate.AnimateError) as cm:
                animate.build(self.doc, self.cfg, force=True)
        self.assertIn("older than the diagram", str(cm.exception))
        self.assertIn("model stamp components.svg", str(cm.exception))

    def test_never_mode_refuses_to_render(self):
        with mock.patch.object(render, "export", no_drawio):
            with self.assertRaises(animate.AnimateError) as cm:
                animate.build(self.doc, self.cfg, force=True, render_mode="never")
        self.assertIn("no current view", str(cm.exception))

    def test_unstamped_export_is_not_trusted(self):
        self.write("components.svg", SVG)             # exported by hand, never stamped
        with mock.patch.object(render, "available", lambda *_: None):
            with self.assertRaises(animate.AnimateError) as cm:
                animate.build(self.doc, self.cfg, force=True)
        self.assertIn("no render record", str(cm.exception))

    def test_svg_page_is_standalone(self):
        self.stamped_view()
        out = os.path.join(self.dir, "scenarios.html")
        with mock.patch.object(render, "export", no_drawio):
            animate.write(animate.build(self.doc, self.cfg, force=True), out)
        with open(out, encoding="utf-8") as fh:
            html = fh.read()
        self.assertIn('src="data:image/svg+xml;base64,', html)


if __name__ == "__main__":
    unittest.main()
