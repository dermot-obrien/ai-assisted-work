# SPDX-License-Identifier: Apache-2.0
"""SVG theme pinning: a rendered SVG looks the same whatever the viewer's colour scheme.

The draw.io CLI is not needed; the pinning is applied to a file shaped like its output.
"""
from __future__ import annotations

import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "src"))

from model import render  # noqa: E402

AUTO = ('<svg xmlns="http://www.w3.org/2000/svg" style="background: transparent; '
        'background-color: transparent; color-scheme: light dark;" width="10px" height="10px">'
        '<rect style="fill: light-dark(#FFFFFF, #121212);"/></svg>')


class PinSvgThemeTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.svg = os.path.join(self.dir, "view.svg")

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def write(self, text):
        with open(self.svg, "w", encoding="utf-8", newline="") as fh:
            fh.write(text)

    def root(self):
        with open(self.svg, encoding="utf-8") as fh:
            text = fh.read()
        return text[:text.index(">") + 1], text

    def test_light_pins_scheme_and_whitens_background(self):
        self.write(AUTO)
        self.assertTrue(render.pin_svg_theme(self.svg, "light"))
        root, text = self.root()
        self.assertIn("color-scheme: light;", root)
        self.assertNotIn("light dark", root)
        self.assertIn("background: #ffffff", root)
        self.assertNotIn("transparent", root)
        # Content is untouched: light-dark() stays, and the root scheme decides it.
        self.assertIn("light-dark(#FFFFFF, #121212)", text)

    def test_transparent_keeps_background(self):
        self.write(AUTO)
        render.pin_svg_theme(self.svg, "light", transparent=True)
        root, _ = self.root()
        self.assertIn("background: transparent", root)
        self.assertIn("color-scheme: light;", root)

    def test_dark_pins_dark(self):
        self.write(AUTO)
        render.pin_svg_theme(self.svg, "dark")
        root, _ = self.root()
        self.assertIn("color-scheme: dark;", root)
        self.assertNotIn("light dark", root)

    def test_auto_leaves_file_alone(self):
        self.write(AUTO)
        self.assertFalse(render.pin_svg_theme(self.svg, "auto"))
        _, text = self.root()
        self.assertEqual(text, AUTO)

    def test_root_without_style_gains_one(self):
        self.write('<svg xmlns="http://www.w3.org/2000/svg" width="1px"><g/></svg>')
        render.pin_svg_theme(self.svg, "light")
        root, _ = self.root()
        self.assertTrue(root.startswith('<svg style="'))
        self.assertIn("color-scheme: light;", root)

    def test_idempotent(self):
        self.write(AUTO)
        render.pin_svg_theme(self.svg, "light")
        self.assertFalse(render.pin_svg_theme(self.svg, "light"))

    def test_unknown_theme_is_refused(self):
        with self.assertRaises(SystemExit):
            render.export(self.svg, self.svg, theme="sepia")


if __name__ == "__main__":
    unittest.main()
