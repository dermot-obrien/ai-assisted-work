# SPDX-License-Identifier: Apache-2.0
"""Templated binding paths, the ones carrying a {placeholder}.

A binding may be written once and mean a different location per run, which is how a
per-quarter or per-release register is bound. Checking such a path for existence is
checking a name nothing ever has, so doctor checks the stable part in front of the first
placeholder instead.

    python -m unittest discover -s tests
"""
from __future__ import annotations

import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "src"))

from model import bindings  # noqa: E402


class Cfg(object):
    """The smallest thing check_section needs: somewhere to resolve paths against."""

    def __init__(self, base):
        self.base = base

    def resolve(self, raw):
        return os.path.normpath(os.path.join(self.base, raw))


def contract(**options):
    return {"inputs": {"options": options}}


class TemplateStem(unittest.TestCase):

    def test_none_when_no_placeholder(self):
        self.assertIsNone(bindings._template_stem("../a/b.csv"))

    def test_directory_before_the_first_placeholder(self):
        self.assertEqual(
            bindings._template_stem("../change/planning/{quarter}/{quarter}-cal.csv"),
            "../change/planning")

    def test_placeholder_in_the_leading_segment(self):
        self.assertEqual(bindings._template_stem("{quarter}/x.csv"), "")

    def test_placeholder_inside_a_file_name(self):
        self.assertEqual(bindings._template_stem("../reports/{year}-summary.csv"),
                         "../reports")


class CheckSection(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        os.makedirs(os.path.join(self.tmp, "planning"))

    def check(self, raw):
        spec = {"basis": {"type": "path", "required": False, "default": raw}}
        _, issues = bindings.check_section({}, contract(**spec), Cfg(self.tmp), "test")
        return [i for i in issues if i.level == "error"]

    def test_a_template_whose_stem_exists_is_not_an_error(self):
        self.assertEqual(self.check("planning/{quarter}/{quarter}-basis.csv"), [])

    def test_a_template_whose_stem_is_missing_is_an_error(self):
        errs = self.check("nowhere/{quarter}/basis.csv")
        self.assertEqual(len(errs), 1)
        self.assertIn("before its first placeholder", errs[0].message)

    def test_a_plain_missing_path_is_still_an_error(self):
        errs = self.check("planning/basis.csv")
        self.assertEqual(len(errs), 1)
        self.assertIn("does not exist", errs[0].message)


if __name__ == "__main__":
    unittest.main()
