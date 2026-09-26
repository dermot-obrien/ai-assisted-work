# SPDX-License-Identifier: Apache-2.0
"""quarter.py against a small neutral workspace, copied fresh for each test.

    python -m unittest discover skills/quarter-planning/tests

The fixture under tests/fixture passes as it stands. Each test copies it, breaks or
extends one thing, and runs quarter.py as a subprocess, the way a workspace runs it.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
QUARTER = os.path.join(SKILL, 'bin', 'quarter.py')
FIXTURE = os.path.join(HERE, 'fixture')
sys.path.insert(0, os.path.join(SKILL, 'src'))

from report import pts  # noqa: E402


class Workspace(unittest.TestCase):
    """A fresh copy of the fixture, and helpers for editing it and running the skill."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix='qp-')
        self.ws = os.path.join(self.tmp, 'ws')
        shutil.copytree(FIXTURE, self.ws)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def path(self, *parts):
        return os.path.join(self.ws, *parts)

    def read(self, *parts):
        with open(self.path(*parts), encoding='utf-8') as fh:
            return fh.read()

    def write(self, rel, text):
        with open(self.path(rel), 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(text)

    def edit(self, rel, old, new):
        text = self.read(rel)
        self.assertIn(old, text, 'fixture %s no longer holds %r' % (rel, old))
        self.write(rel, text.replace(old, new, 1))

    def run_quarter(self, *extra):
        env = dict(os.environ, PYTHONIOENCODING='utf-8')
        r = subprocess.run([sys.executable, QUARTER, '--quarter', '2027-q1',
                            '--workspace', self.ws] + list(extra),
                           cwd=self.ws, capture_output=True, text=True, env=env)
        return r.returncode, r.stdout + r.stderr

    MODEL = 'planning/model/work_item.yaml'
    BINDINGS = '.agents/skill-bindings.toml'


class TestPassingRun(Workspace):

    def test_fixture_passes(self):
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)
        self.assertIn('integrity: the chain closes', out)
        self.assertIn('8. FRAMING', out)
        self.assertNotIn('9. CLOSE', out)
        self.assertNotIn('WARNING', out)

    def test_report_wording(self):
        code, out = self.run_quarter()
        self.assertIn('across 3 periods', out)
        self.assertNotIn('sprint', out)
        # Out of scope is a positive figure in its own column.
        ana = next(l for l in out.splitlines() if l.strip().startswith('Ana Example'))
        self.assertRegex(ana, r'30\.0\s+6\.0\s+24\.0$')
        # A long calendar note is wrapped, not cut.
        self.assertIn('rather than cut it off at the end', out)

    def test_budget_mode(self):
        code, out = self.run_quarter('--budget')
        self.assertEqual(code, 0, out)
        self.assertIn('Every figure above follows from the registers', out)

    def test_where_notes_fiscal_default(self):
        code, out = self.run_quarter('--where')
        self.assertNotIn('fiscal-year default', out)
        self.assertIn('ladder', out)
        text = self.read(self.BINDINGS)
        text = re.sub(r'(?m)^slugPattern.*\n', '', text)
        self.write(self.BINDINGS, text)
        code, out = self.run_quarter('--where')
        self.assertEqual(code, 0, out)
        self.assertIn('fiscal-year default', out)

    def test_unbound_optional_keys_change_nothing(self):
        text = self.read(self.BINDINGS)
        for key in ('ladder', 'epicsDir', 'cardsDir'):
            text = re.sub(r'(?m)^%s\s*=.*\n' % key, '', text)
        self.write(self.BINDINGS, text)
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)
        self.assertIn('No ladder is bound', out)


class TestRegisterRules(Workspace):

    def test_type_not_in_register(self):
        self.edit(self.MODEL, 'deliverable_id: abb-set', 'deliverable_id: no-such-type')
        code, out = self.run_quarter()
        self.assertEqual(code, 1, out)
        self.assertIn('EP-001-D2 on EP-001 is typed no-such-type, which is not in the register',
                      out)

    def test_type_not_in_use(self):
        self.edit(self.MODEL, 'deliverable_id: abb-set', 'deliverable_id: old-type')
        code, out = self.run_quarter()
        self.assertEqual(code, 1, out)
        self.assertIn('which the register marks used No', out)

    def test_used_column_absent_is_not_checked(self):
        path = 'registers/deliverable-types.csv'
        rows = [l.split(',') for l in self.read(path).splitlines()]
        self.write(path, '\n'.join(','.join(r[:4] + r[5:]) for r in rows) + '\n')
        self.edit(self.MODEL, 'deliverable_id: abb-set', 'deliverable_id: old-type')
        self.edit(self.MODEL, 'planned_points: 10', 'planned_points: 8')
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)

    def test_override_without_reason(self):
        self.edit(self.MODEL, '    points_override_reason: Most of the evidence already exists\n',
                  '')
        code, out = self.run_quarter()
        self.assertEqual(code, 1, out)
        self.assertIn('EP-001-D4 on EP-001 overrides its type sizing with 1.0 points but '
                      'records no reason', out)


class TestFraming(Workspace):

    def test_unknown_rung_fails(self):
        self.edit(self.MODEL, 'rung_to: R1', 'rung_to: R9')
        code, out = self.run_quarter()
        self.assertEqual(code, 1, out)
        self.assertIn('EP-001 flow Intake records rung_to R9, which the ladder does not name',
                      out)

    def test_downward_movement_fails(self):
        self.edit(self.MODEL, 'rung_from: R1\n    rung_to: R3', 'rung_from: R3\n    rung_to: R1')
        code, out = self.run_quarter()
        self.assertEqual(code, 1, out)
        self.assertIn('EP-001 flow Process moves down the ladder, from R3 to R1', out)

    def test_no_lane_warns(self):
        self.edit(self.MODEL, '  lane: Example lane\n', '')
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)
        self.assertIn('WARNING EP-001 records no lane', out)
        self.assertIn('1 warning', out)

    def test_unevidenced_target_warns(self):
        self.edit(self.MODEL, 'deliverable_id: capability-area', 'deliverable_id: plan-document')
        self.edit(self.MODEL, 'planned_points: 10', 'planned_points: 8')
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)
        self.assertIn('WARNING EP-001 commits a flow to R1 but names no product whose type '
                      'evidences R1', out)

    def test_no_ladder_reports_without_judging(self):
        text = self.read(self.BINDINGS)
        self.write(self.BINDINGS, re.sub(r'(?m)^ladder\s*=.*\n', '', text))
        self.edit(self.MODEL, 'rung_to: R1', 'rung_to: R9')
        self.edit(self.MODEL, '  lane: Example lane\n', '')
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)
        self.assertIn('No ladder is bound', out)
        self.assertNotIn('WARNING', out)

    def test_empty_criteria_reported_not_failed(self):
        self.edit(self.MODEL, 'advances_criterion_ids: [CR-001]', 'advances_criterion_ids: []')
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)
        self.assertIn('Advances no recorded criterion: EP-001, WI-002', out)


class TestCards(Workspace):
    CARDS = ('planning', '2027-q1', 'cards')

    def test_write_then_check(self):
        code, out = self.run_quarter('--cards')
        self.assertEqual(code, 0, out)
        card = self.read(*self.CARDS, 'EP-001.md')
        self.assertTrue(card.startswith('---\ntitle: "EP-001 card, 2027-Q1"\n'), card[:80])
        self.assertIn('status: Generated', card)
        self.assertIn('<!-- Generated by the quarter-planning skill', card)
        self.assertIn('[its own page](../../../epics/EP-001-example/index.md)', card)
        self.assertIn('| 29.5 | 10.0 | +19.5 |', card)
        other = self.read(*self.CARDS, 'WI-002.md')
        self.assertIn('The epic has no home folder recorded.', other)
        grid = self.read(*self.CARDS, 'README.md')
        self.assertIn('| Example lane | Process | R1 | R3 | [EP-001](./EP-001.md) |', grid)
        self.assertIn('[WI-002](./WI-002.md)', grid)
        for text in (card, other, grid):
            self.assertNotIn('—', text)

        code, out = self.run_quarter('--cards', '--check')
        self.assertEqual(code, 0, out)
        self.assertIn('are current', out)

        self.edit(self.MODEL, '    points: 1\n', '    points: 1.25\n')
        code, out = self.run_quarter('--cards', '--check')
        self.assertEqual(code, 1, out)
        self.assertIn('EP-001.md', out)
        self.assertIn('README.md', out)

    def test_readme_home_is_linked(self):
        os.remove(self.path('epics', 'EP-001-example', 'index.md'))
        self.write('epics/EP-001-example/README.md', '# EP-001\n')
        self.run_quarter('--cards')
        self.assertIn('(../../../epics/EP-001-example/README.md)',
                      self.read(*self.CARDS, 'EP-001.md'))

    def test_cards_need_a_binding(self):
        text = self.read(self.BINDINGS)
        self.write(self.BINDINGS, re.sub(r'(?m)^cardsDir\s*=.*\n', '', text))
        code, out = self.run_quarter('--cards')
        self.assertEqual(code, 2, out)
        self.assertIn('Declare cardsDir', out)

    def test_points_format(self):
        self.assertEqual([pts(x) for x in (0.25, 2, 9.25, 10, 0.5, 6.3)],
                         ['0.25', '2.0', '9.25', '10.0', '0.5', '6.3'])


class TestApply(Workspace):

    def test_inserts_missing_budget_points(self):
        # Ids need not look like EP-NNN.
        for rel in (self.MODEL, 'planning/model/work_plan.yaml',
                    'planning/2027-q1/2027-q1-resourcing.csv'):
            self.write(rel, self.read(rel).replace('EP-001', 'ALPHA-1'))
        self.edit(self.MODEL, '  budget_points: 29.5  # derived from the resourcing\n', '')
        code, out = self.run_quarter()
        self.assertEqual(code, 1, out)
        code, out = self.run_quarter('--apply')
        self.assertIn('applied budget_points to ALPHA-1', out)
        text = self.read(self.MODEL)
        self.assertIn('- id: ALPHA-1\n  budget_points: 29.5\n  title:', text)
        self.assertIn('# Epics and the products they name. Comments here must survive', text)
        self.assertTrue(os.path.isfile(self.path(self.MODEL) + '.bak'))
        self.assertNotIn('ALPHA-1-D1\n    budget_points', text)
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)

    def test_replaces_and_keeps_comment(self):
        self.edit(self.MODEL, 'budget_points: 29.5  #', 'budget_points: 12  #')
        code, out = self.run_quarter('--apply')
        self.assertIn('applied budget_points to EP-001', out)
        self.assertIn('  budget_points: 29.5  # derived from the resourcing\n',
                      self.read(self.MODEL))


class TestBridge(Workspace):

    def test_progress_yaml_supplies_an_epic(self):
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)
        self.assertIn('Read from AAW work items as well as work_item.yaml: WI-002', out)
        self.assertRegex(out, r'WI-002 Second example increment\s+9\.0\s+9\.0')

    def test_without_the_binding_the_epic_is_unknown(self):
        text = self.read(self.BINDINGS)
        self.write(self.BINDINGS, re.sub(r'(?m)^workItemsDir\s*=.*\n', '', text))
        code, out = self.run_quarter()
        self.assertEqual(code, 1, out)
        self.assertIn('held unallocated on WI-002', out)

    def test_other_periods_are_ignored(self):
        self.edit('work-items/WI-002/progress.yaml', 'planning_period: 2027-Q1',
                  'planning_period: 2027-Q2')
        code, out = self.run_quarter()
        self.assertEqual(code, 1, out)
        self.assertNotIn('Read from AAW work items', out)

    def test_work_item_yaml_wins_on_clash(self):
        text = self.read(self.MODEL)
        self.write(self.MODEL, text + '''- id: WI-002
  title: Second example increment, composed
  quarter: 2027-Q1
  lane: Second lane
  flows:
  - flow: Serve
    rung_from: R2
    rung_to: R3
  budget_points: 9
  deliverables:
  - id: WI-002-D1
    deliverable_id: logical-pattern
    name: Example pattern, made logical
    owner_stakeholder_id: ana
    state: planned
''')
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)
        self.assertIn('WARNING WI-002 is recorded in both work_item.yaml and', out)
        self.assertIn('Second example increment, composed', out)

    def test_bridged_products_are_register_checked(self):
        self.edit('work-items/WI-002/progress.yaml', 'type: logical-pattern', 'type: old-type')
        self.edit('work-items/WI-002/progress.yaml', 'planned_points: 4', 'planned_points: 2')
        code, out = self.run_quarter()
        self.assertEqual(code, 1, out)
        self.assertIn('WI-002-D1 on WI-002 is typed old-type', out)


class TestClose(Workspace):

    def test_close_section(self):
        self.edit(self.MODEL, 'rung_to: R1\n', 'rung_to: R1\n    rung_reached: R1\n')
        self.edit(self.MODEL, 'rung_to: R3\n', 'rung_to: R3\n    rung_reached: R2\n')
        self.edit(self.MODEL, 'name: Example decision\n',
                  'name: Example decision\n    actual_points: 3\n')
        self.edit(self.MODEL, 'name: A smaller example decision\n',
                  'name: A smaller example decision\n    actual_points: 1\n')
        code, out = self.run_quarter()
        self.assertEqual(code, 0, out)
        self.assertIn('9. CLOSE', out)
        self.assertRegex(out, r'EP-001 Intake\s+R0\s+R1\s+R1\s+reached')
        self.assertRegex(out, r'EP-001 Process\s+R1\s+R3\s+R2\s+short')
        self.assertRegex(out, r'EP-001-D3\s+decision\s+2\.0\s+3\.0\s+\+1\.0')
        # decision: 3 of 2 and 1 of 2, a mean ratio of 1.0, suggesting 2.0.
        self.assertRegex(out, r'decision\s+2\s+2\.0\s+1\.00\s+2\.0')

    def test_close_leaves_files_alone(self):
        self.edit(self.MODEL, 'rung_to: R1\n', 'rung_to: R1\n    rung_reached: R1\n')
        before = self.read(self.MODEL)
        self.run_quarter()
        self.assertEqual(before, self.read(self.MODEL))


if __name__ == '__main__':
    unittest.main()
