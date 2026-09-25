# SPDX-License-Identifier: Apache-2.0
"""Derived abstraction: conceptual, logical, physical or mixed, from the kinds of box.

    python -m unittest discover -s tests
"""
from __future__ import annotations

import io
import json
import os
import shutil
import sys
import tempfile
import textwrap
import unittest
from contextlib import redirect_stdout, redirect_stderr

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "src"))

from model import config, markdown, validate, cli  # noqa: E402

BINDINGS = textwrap.dedent("""\
    bindingsVersion = "1.0"

    [model]
    node_id_attrs = ["abb_id", "sbb_id"]
    edge_id_attr  = "iface_id"
    local_pattern = '[0-9]{1,3}'

    [[markdown.tables]]
    section    = "Building Blocks"
    entity     = "node"
    id_pattern = 'ABB-[0-9]{3}|SBB-[0-9]{3}(\\.[0-9]+){0,2}'
    columns    = { id = "Building Block", label = "Building Block", kind = "Kind" }

    [[catalogues]]
    path   = "abbs.csv"
    column = "ABB ID"
    level  = "logical"

    [[catalogues]]
    path   = "sbbs.csv"
    column = "id"
    level  = "physical"
    """)


def doc(rows):
    body = "\n".join(f"| {r[0]} | {r[1] if len(r) > 1 else ''} |" for r in rows)
    return textwrap.dedent("""\
        ---
        title: "Test model"
        ---

        # Test model

        ## Building Blocks

        | Building Block | Kind |
        |---|---|
        """) + body + "\n"


class Abstraction(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.write("skill-bindings.toml", BINDINGS)
        self.write("abbs.csv", "ABB ID,Name\nABB-017,Retrieval\nABB-024,Identity\n")
        self.write("sbbs.csv", "id,name\nSBB-017.1,Search product\n")

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def write(self, name, text):
        p = os.path.join(self.dir, name)
        with open(p, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        return p

    def level(self, rows):
        p = self.write("index.md", doc(rows))
        cfg = config.load(None, near=p)
        return validate.abstraction(markdown.read(p, cfg), cfg)

    def test_all_local_is_conceptual(self):
        self.assertEqual(self.level([("01 Agent",), ("02 Gateway",)]), "conceptual")

    def test_abbs_with_local_roles_is_logical(self):
        self.assertEqual(self.level([("ABB-017 Retrieval",), ("03 Harness",)]), "logical")
        self.assertEqual(self.level([("ABB-017 Retrieval",), ("ABB-024 Identity",)]), "logical")

    def test_all_sbb_or_product_is_physical(self):
        self.assertEqual(self.level([("SBB-017.1 Search product",), ("04 Vendor tool", "product")]),
                         "physical")

    def test_external_boxes_are_ignored(self):
        self.assertEqual(self.level([("SBB-017.1 Search product",), ("09 Core systems", "external")]),
                         "physical")
        self.assertEqual(self.level([("01 Agent",), ("09 Core systems", "context")]), "conceptual")

    def test_local_with_sbb_is_mixed(self):
        self.assertEqual(self.level([("01 Agent",), ("SBB-017.1 Search product",)]), "mixed")
        self.assertEqual(self.level([("ABB-017 Retrieval",), ("SBB-017.1 Search product",)]), "mixed")

    def test_only_external_gives_nothing(self):
        self.assertEqual(self.level([("09 Core systems", "external")]), "")

    def test_catalogue_without_level_is_unknown(self):
        self.write("skill-bindings.toml", BINDINGS.replace('level  = "logical"\n', ""))
        self.assertEqual(self.level([("ABB-017 Retrieval",), ("01 Agent",)]), "mixed")

    def test_bad_level_is_refused(self):
        self.write("skill-bindings.toml", BINDINGS.replace('level  = "logical"', 'level  = "vague"'))
        p = self.write("index.md", doc([("01 Agent",)]))
        with self.assertRaises(SystemExit):
            config.load(None, near=p)

    def test_validate_reports_it(self):
        p = self.write("index.md", doc([("ABB-017 Retrieval",), ("03 Harness",)]))
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            cli.main(["validate", p])
        self.assertIn("abstraction logical", out.getvalue())
        out = io.StringIO()
        with redirect_stdout(out), redirect_stderr(io.StringIO()):
            cli.main(["validate", p, "--json"])
        self.assertEqual(json.loads(out.getvalue())["abstraction"], "logical")


if __name__ == "__main__":
    unittest.main()
