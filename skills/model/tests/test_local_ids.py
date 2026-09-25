# SPDX-License-Identifier: Apache-2.0
"""Local identifiers, the mapping table, adoption, rename and scan.

Standard library only, so the tests run wherever the skill does:

    python -m unittest discover -s tests
"""
from __future__ import annotations

import io
import json
import re
import os
import shutil
import sys
import tempfile
import textwrap
import unittest
import xml.etree.ElementTree as ET
from contextlib import redirect_stdout, redirect_stderr

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "src"))

from model import config, markdown, drawio, validate, sync, scan, cli  # noqa: E402

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
    columns    = { id = "Building Block", label = "Building Block", group = "Source" }

    [[markdown.tables]]
    section    = "Interfaces"
    entity     = "edge"
    id_pattern = 'IF-[0-9]{2,3}|ABB-[0-9]{3}|SBB-[0-9]{3}(\\.[0-9]+){0,2}'
    columns    = { id = "Interface", source = "Provider", target = "Consumer", label = "Purpose" }

    [[catalogues]]
    path   = "abbs.csv"
    column = "ABB ID"
    """)

CATALOGUE = "ABB ID,ABB Name\nABB-017,Context Retrieval Service\nABB-105,Enterprise RAG Pipeline\n" \
            "ABB-106,Enterprise Search Platform\n"

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
    | ABB-017 Context Retrieval Service | The seam | loose |
    | 01 Onyx | Experiment vehicle | loose |

    ## Interfaces

    | Interface | Provider | Consumer | Purpose |
    |---|---|---|---|
    | IF-01 | 01 | ABB-017 | ranked chunks |

    ## Catalogue Mapping

    | Local ID | Maps To | Relationship |
    |---|---|---|
    | 01 | ABB-105 Enterprise RAG Pipeline | partial |
    """)


class Base(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.write("skill-bindings.toml", BINDINGS)
        self.write("abbs.csv", CATALOGUE)
        self.doc = self.write("index.md", DOC)
        self.cfg = config.load(None, near=self.doc)

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def write(self, name, text):
        p = os.path.join(self.dir, name)
        with open(p, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        return p

    def read(self, path):
        with open(path, encoding="utf-8") as fh:
            return fh.read()

    def rules(self, findings):
        return sorted(f.rule for f in findings)

    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = cli.main(list(argv))
        return code, out.getvalue(), err.getvalue()


class ConfigTests(Base):
    def test_is_local(self):
        self.assertTrue(self.cfg.is_local("01"))
        self.assertTrue(self.cfg.is_local("7"))
        self.assertTrue(self.cfg.is_local("123"))
        self.assertFalse(self.cfg.is_local("1234"))
        self.assertFalse(self.cfg.is_local("ABB-017"))

    def test_attr_for(self):
        self.assertEqual(self.cfg.attr_for("01"), "local_id")
        self.assertEqual(self.cfg.attr_for("ABB-017"), "abb_id")
        self.assertEqual(self.cfg.attr_for("SBB-108.6"), "sbb_id")

    def test_no_prefix_means_no_local_ids(self):
        cfg = config.Config()
        self.assertFalse(cfg.is_local("01"))
        self.assertEqual(cfg.node_attrs, ("id",))


class PlainNumberTests(Base):
    def test_a_number_inside_a_name_is_not_an_id(self):
        self.write("index.md", DOC.replace("| 01 Onyx |", "| Microsoft 365 Copilot |"))
        m = markdown.read(self.doc, self.cfg)
        self.assertNotIn("365", m.node_ids())
        self.assertIn("id_unmatched", self.rules(validate.structural(m, self.cfg)))

    def test_local_cell_ids_never_collide_with_drawio_cells(self):
        self.assertEqual(self.cfg.cell_id_for("1"), "local-1")
        self.assertEqual(self.cfg.cell_id_for("ABB-017"), "ABB-017")
        self.write("index.md", DOC.replace("| 01 Onyx |", "| 1 Onyx |").replace("| 01 |", "| 1 |")
                   .replace("| IF-01 | 01 |", "| IF-01 | 1 |"))
        m = markdown.read(self.doc, self.cfg)
        p = os.path.join(self.dir, "components.drawio")
        drawio.write(m, p, self.cfg)
        ids = [el.get("id") for el in ET.parse(p).getroot().iter() if el.get("id")]
        self.assertEqual(ids.count("1"), 1, "cell 1 is draw.io's layer, and stays the only one")
        self.assertIn("local-1", ids)
        self.assertEqual(self.rules(validate.check(m, self.cfg, drawio.read(p, self.cfg))), [])


class PrefixTests(Base):
    def test_a_prefix_still_works_for_projects_that_want_one(self):
        cfg = config.Config(local_prefix="LOC-")
        self.assertTrue(cfg.is_local("LOC-01"))
        self.assertFalse(cfg.is_local("01"))
        self.assertEqual(cfg.local_re.search("LOC-07 Gateway").group(0).strip(), "LOC-07")


class MarkdownTests(Base):
    def test_reads_hybrid_ids_and_front_matter(self):
        m = markdown.read(self.doc, self.cfg)
        self.assertEqual([n.id for n in m.nodes], ["ABB-017", "01"])
        self.assertEqual((m.edges[0].source, m.edges[0].target), ("01", "ABB-017"))
        self.assertEqual(m.attrs["model"], {"diagram": "components.drawio"})
        self.assertEqual(m.attrs["mapping"][0]["maps_to"], "ABB-105")

    def test_sbb_with_dots(self):
        self.write("index.md", DOC.replace("ABB-017 Context", "SBB-108.6 Copilot"))
        m = markdown.read(self.doc, self.cfg)
        self.assertIn("SBB-108.6", m.node_ids())

    def test_unmatched_row_is_reported_not_dropped(self):
        self.write("index.md", DOC.replace("| 01 Onyx |", "| Onyx 01 |"))
        m = markdown.read(self.doc, self.cfg)
        self.assertNotIn("ONX-01", m.node_ids())
        self.assertIn("id_unmatched", self.rules(validate.structural(m, self.cfg)))


class ValidateTests(Base):
    def test_clean_document(self):
        m = markdown.read(self.doc, self.cfg)
        self.assertEqual(self.rules(validate.check(m, self.cfg)), [])

    def test_local_ids_skip_catalogue(self):
        m = markdown.read(self.doc, self.cfg)
        self.assertEqual(validate.catalogue(m, self.cfg), [])

    def test_mapping_rules(self):
        cases = {
            "| 01 | ABB-105 Enterprise RAG Pipeline | partial |": [],
            "| 01 | ABB-999 | partial |": ["mapping_not_in_catalogue"],
            "| 01 | ABB-105 | sort of |": ["mapping_invalid"],
            "| 01 | ABB-105 | gap |": ["mapping_invalid"],
            "| 01 | gap | gap |": [],
            "| 01 | | realises |": ["mapping_invalid"],
            "| 01 | ABB-017 | realises |": ["mapping_duplicates_node"],
            "| 02 | ABB-105 | partial |": ["mapping_missing", "mapping_unknown_local"],
        }
        row = "| 01 | ABB-105 Enterprise RAG Pipeline | partial |"
        for new, want in cases.items():
            with self.subTest(row=new):
                self.write("index.md", DOC.replace(row, new))
                m = markdown.read(self.doc, self.cfg)
                self.assertEqual(self.rules(validate.mapping(m, self.cfg)), want)


class DrawioTests(Base):
    def emit(self):
        m = markdown.read(self.doc, self.cfg)
        p = os.path.join(self.dir, "components.drawio")
        drawio.write(m, p, self.cfg)
        return p

    def test_local_id_written_to_local_attr(self):
        p = self.emit()
        objs = {o.get("id"): o for o in ET.parse(p).getroot().iter("object")}
        self.assertEqual(objs["local-01"].get("local_id"), "01")
        self.assertIsNone(objs["local-01"].get("abb_id"))
        self.assertEqual(objs["ABB-017"].get("abb_id"), "ABB-017")

    def test_round_trip_agrees(self):
        p = self.emit()
        doc = markdown.read(self.doc, self.cfg)
        dia = drawio.read(p, self.cfg)
        self.assertEqual(self.rules(validate.check(doc, self.cfg, dia)), [])

    def test_local_id_in_catalogue_attr_is_caught(self):
        p = self.emit()
        self.write("components.drawio",
                   self.read(p).replace('local_id="01"', 'abb_id="01"'))
        dia = drawio.read(p, self.cfg)
        self.assertIn("id_attr_mismatch", self.rules(validate.structural(dia, self.cfg)))


HAND_DRAWN = textwrap.dedent("""\
    <mxfile compressed="false"><diagram id="p" name="Slide"><mxGraphModel><root>
      <mxCell id="0" />
      <mxCell id="1" parent="0" />
      <mxCell id="a7" value="Context&lt;br&gt;Retrieval  Service" style="rounded=1;" vertex="1" parent="1">
        <mxGeometry x="400" y="300" width="160" height="60" as="geometry" />
      </mxCell>
      <mxCell id="b9" value="Onyx" style="rounded=1;" vertex="1" parent="1">
        <mxGeometry x="100" y="300" width="160" height="60" as="geometry" />
      </mxCell>
      <mxCell id="c1" value="Legend" style="text;" vertex="1" parent="1">
        <mxGeometry x="10" y="10" width="80" height="20" as="geometry" />
      </mxCell>
      <mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="a7" target="b9">
        <mxGeometry relative="1" as="geometry" />
      </mxCell>
    </root></mxGraphModel></diagram></mxfile>
    """)


class AdoptTests(Base):
    def test_adopt_tags_in_place_and_keeps_layout(self):
        p = self.write("components.drawio", HAND_DRAWN)
        doc = markdown.read(self.doc, self.cfg)
        changes = sync.sync(doc, p, self.cfg, adopt=True)
        acts = sorted((c.action, c.id) for c in changes if c.action == "adopt")
        self.assertEqual(acts, [("adopt", "01"), ("adopt", "ABB-017"), ("adopt", "IF-01")])
        self.assertFalse(any(c.action == "add" for c in changes))

        root = ET.parse(p).getroot()
        objs = {o.get("id"): o for o in root.iter("object")}
        self.assertEqual(objs["local-01"].get("local_id"), "01")
        geo = objs["local-01"].find("mxCell/mxGeometry")
        self.assertEqual((geo.get("x"), geo.get("y")), ("100", "300"))
        # The arrow was drawn backwards; the document owns direction.
        edge = next(o for o in root.iter("object") if o.get("iface_id") == "IF-01")
        self.assertEqual((edge.find("mxCell").get("source"), edge.find("mxCell").get("target")),
                         ("local-01", "ABB-017"), "edge ends are cell ids; a local node's is namespaced")
        # The legend is untouched.
        self.assertTrue(any(c.get("id") == "c1" for c in root.iter("mxCell")))

        dia = drawio.read(p, self.cfg)
        self.assertEqual(self.rules(validate.check(doc, self.cfg, dia)), [])

    def test_adopt_matches_name_line_of_a_captioned_shape(self):
        captioned = HAND_DRAWN.replace(
            'value="Onyx"',
            'value="&lt;b&gt;Onyx&lt;/b&gt;&lt;br/&gt;&lt;font&gt;experiment vehicle&lt;/font&gt;"')
        p = self.write("components.drawio", captioned)
        doc = markdown.read(self.doc, self.cfg)
        changes = sync.sync(doc, p, self.cfg, adopt=True, dry_run=True)
        self.assertIn(("adopt", "01"), [(c.action, c.id) for c in changes])

    def test_ambiguous_label_is_not_guessed(self):
        p = self.write("components.drawio", HAND_DRAWN.replace('value="Legend"', 'value="Onyx"'))
        doc = markdown.read(self.doc, self.cfg)
        changes = sync.sync(doc, p, self.cfg, adopt=True, dry_run=True)
        self.assertIn(("ambig", "01"), [(c.action, c.id) for c in changes])


class RenameTests(Base):
    def test_promote_local_to_catalogue(self):
        m = markdown.read(self.doc, self.cfg)
        p = os.path.join(self.dir, "components.drawio")
        drawio.write(m, p, self.cfg)
        sync.rename(self.doc, p, "01", "ABB-106", self.cfg)

        text = self.read(self.doc)
        self.assertIsNone(re.search(r"(?<![A-Za-z0-9-])01(?![A-Za-z0-9])", text), "every whole-token 01 was renamed; IF-01 is a different id")
        self.assertIn("| IF-01 | ABB-106 | ABB-017 |", text)
        doc = markdown.read(self.doc, self.cfg)
        self.assertNotIn("mapping", doc.attrs)

        objs = {o.get("id"): o for o in ET.parse(p).getroot().iter("object")}
        self.assertIn("ABB-106", objs)
        self.assertEqual(objs["ABB-106"].get("abb_id"), "ABB-106")
        self.assertIsNone(objs["ABB-106"].get("local_id"))
        dia = drawio.read(p, self.cfg)
        self.assertEqual(self.rules(validate.check(doc, self.cfg, dia)), [])

    def test_front_matter_and_prose_numbers_are_left_alone(self):
        self.write("index.md", DOC.replace('title: "Test model"', 'title: "Test model"\norder: 01')
                   + "\nSee 01 in the prose, and the date 2026-01-01.\n")
        m = markdown.read(self.doc, self.cfg)
        drawio.write(m, os.path.join(self.dir, "components.drawio"), self.cfg)
        sync.rename(self.doc, os.path.join(self.dir, "components.drawio"), "01", "07", self.cfg)
        text = self.read(self.doc)
        self.assertIn("order: 01", text, "front matter is never touched")
        self.assertIn("See 01 in the prose", text, "a plain number in prose is not the identifier")
        self.assertIn("| 07 Onyx |", text)
        self.assertIn("| IF-01 | 07 | ABB-017 |", text)
        objs = {o.get("id"): o for o in ET.parse(os.path.join(self.dir, "components.drawio")).getroot().iter("object")}
        self.assertEqual(objs["local-07"].get("local_id"), "07")

    def test_refuses_to_merge(self):
        with self.assertRaises(SystemExit):
            sync.rename(self.doc, None, "01", "ABB-017", self.cfg, dry_run=True)


class ScanTests(Base):
    def test_finds_declared_models_only(self):
        m = markdown.read(self.doc, self.cfg)
        drawio.write(m, os.path.join(self.dir, "components.drawio"), self.cfg)
        self.write("notes.md", "# Just notes\n")
        second = DOC.replace("components.drawio", "other.drawio")
        self.write("other.md", second)

        code, out, _err = self.run_cli("scan", self.dir, "--json")
        data = json.loads(out)
        by_doc = {os.path.basename(e["doc"]): e for e in data["models"]}
        self.assertEqual(sorted(by_doc), ["index.md", "other.md"])
        self.assertEqual(by_doc["index.md"]["result"], "ok")
        self.assertEqual(by_doc["index.md"]["localIds"], ["index.md#01"])
        self.assertEqual(by_doc["index.md"]["views"][0]["file"], "components.svg")
        self.assertFalse(by_doc["other.md"]["diagramExists"])
        self.assertEqual(by_doc["other.md"]["result"], "error")
        self.assertEqual([os.path.basename(s) for s in data["skipped"]], ["notes.md"])
        self.assertEqual(code, 1)

    def test_validate_uses_declared_diagram(self):
        m = markdown.read(self.doc, self.cfg)
        drawio.write(m, os.path.join(self.dir, "components.drawio"), self.cfg)
        code, out, _err = self.run_cli("validate", self.doc, "--json")
        self.assertEqual(code, 0)
        self.assertTrue(json.loads(out)["against"].endswith("components.drawio"))


if __name__ == "__main__":
    unittest.main()
