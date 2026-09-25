# SPDX-License-Identifier: Apache-2.0
"""Render records: the fingerprint left beside each rendered image.

The draw.io CLI is not needed; the record is written and checked directly.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "src"))

from model import render  # noqa: E402


class RenderRecordTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.src = os.path.join(self.dir, "diagram.drawio")
        os.makedirs(os.path.join(self.dir, "img"))
        self.img = os.path.join(self.dir, "img", "view.png")
        with open(self.src, "wb") as fh:
            fh.write(b"<mxfile>\n<diagram/>\n</mxfile>\n")
        with open(self.img, "wb") as fh:
            fh.write(b"png")

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def test_record_names_source_relative_to_image(self):
        p = render.write_record(self.src, self.img, ["Structure"])
        self.assertEqual(p, self.img + ".render.json")
        rec = json.load(open(p, encoding="utf-8"))
        self.assertEqual(rec["source"], "../diagram.drawio")
        self.assertEqual(rec["layers"], ["Structure"])
        self.assertEqual(len(rec["sha256"]), 64)

    def test_fresh_until_source_changes(self):
        render.write_record(self.src, self.img)
        fresh, src, _ = render.check_record(self.img)
        self.assertTrue(fresh)
        self.assertEqual(os.path.normcase(src), os.path.normcase(self.src))
        with open(self.src, "ab") as fh:
            fh.write(b"<!-- moved a box -->\n")
        self.assertFalse(render.check_record(self.img)[0])

    def test_line_endings_are_not_an_edit(self):
        render.write_record(self.src, self.img)
        data = open(self.src, "rb").read().replace(b"\n", b"\r\n")
        with open(self.src, "wb") as fh:
            fh.write(data)
        self.assertTrue(render.check_record(self.img)[0])

    def test_no_record_means_no_check(self):
        self.assertIsNone(render.check_record(self.img))

    def test_missing_source_is_stale(self):
        render.write_record(self.src, self.img)
        os.remove(self.src)
        self.assertFalse(render.check_record(self.img)[0])


if __name__ == "__main__":
    unittest.main()
