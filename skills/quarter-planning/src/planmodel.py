# SPDX-License-Identifier: Apache-2.0
"""Reading the planning model: epics, the quarter's WorkPlan, the register and the ladder.

Every tool in this skill reads the model the same way, through this module, so the
validator and the card generator cannot disagree about which epics exist or what a product
is typed as.

Epics come from two stores. The composed `work_item.yaml` under the `sources` binding is
the planning model. Where a workspace also binds `workItemsDir`, AAW work items are read
too: each `<workItemsDir>/*/progress.yaml` with `work_item_level: epic` and a
`planning_period` equal to the quarter's label becomes an epic record, mapped onto the
fields `work_item.yaml` uses. On an id that both stores hold, `work_item.yaml` wins and the
clash is reported, because two records for one epic is a fault somebody has to resolve.

  load_items(bind, label) -> (items, notes)
  load_plan(bind, label) -> the quarterly WorkPlan record, or None
  load_register(bind) -> {type id: register row}
  load_ladder(bind) -> [rung, ...] in ascending order, or None when no ladder is bound
"""
import glob
import io
import os

import yaml

from capacity import rows


def _yaml(path, key):
    with io.open(path, encoding='utf-8') as fh:
        return (yaml.safe_load(fh) or {}).get(key) or []


def work_item_path(bind):
    return os.path.join(bind.resolve('sources'), 'work_item.yaml')


def load_plans(bind):
    return _yaml(os.path.join(bind.resolve('sources'), 'work_plan.yaml'), 'work_plan')


def load_plan(bind, label):
    return next((p for p in load_plans(bind) if p.get('quarter') == label), None)


# Deliverable fields carried across from progress.yaml, as (progress.yaml, work_item.yaml).
_DELIVERABLE_FIELDS = (
    ('id', 'id'), ('type', 'deliverable_id'), ('name', 'name'), ('why_needed', 'why_needed'),
    ('points', 'points'), ('points_override_reason', 'points_override_reason'),
    ('owner', 'owner_stakeholder_id'), ('state', 'state'), ('approval', 'approval'),
    ('actual_points', 'actual_points'),
)

# Epic fields carried across unchanged, beyond the id and the quarter.
_EPIC_FIELDS = ('title', 'budget_points', 'planned_points', 'lane', 'flows', 'home',
                'approval', 'advances_criterion_ids', 'threads')


def from_progress(doc, path):
    """One epic record, shaped like a work_item.yaml entry, from a progress.yaml document."""
    item = {'id': doc.get('work_item_id'), 'quarter': doc.get('planning_period'),
            '_source': path}
    for k in _EPIC_FIELDS:
        if doc.get(k) is not None:
            item[k] = doc[k]
    deliverables = []
    for d in doc.get('deliverables') or []:
        out = {}
        for src, dst in _DELIVERABLE_FIELDS:
            if d.get(src) is not None:
                out[dst] = d[src]
        deliverables.append(out)
    item['deliverables'] = deliverables
    return item


def bridged_items(bind, label):
    """Epics for this quarter from AAW work items, when workItemsDir is bound."""
    root = bind.optional('workItemsDir')
    if not root:
        return []
    out = []
    for path in sorted(glob.glob(os.path.join(root, '*', 'progress.yaml'))):
        with io.open(path, encoding='utf-8') as fh:
            doc = yaml.safe_load(fh) or {}
        if not isinstance(doc, dict):
            continue
        if doc.get('work_item_level') != 'epic' or doc.get('planning_period') != label:
            continue
        if not doc.get('work_item_id'):
            continue
        out.append(from_progress(doc, path))
    return out


def load_items(bind, label):
    """Every epic the model knows, and notes on how the two stores were joined."""
    items = list(_yaml(work_item_path(bind), 'work_item'))
    known = {w.get('id') for w in items}
    notes = []
    for b in bridged_items(bind, label):
        if b['id'] in known:
            notes.append('%s is recorded in both work_item.yaml and %s. The work_item.yaml '
                         'record is used and the work item is ignored'
                         % (b['id'], os.path.relpath(b['_source'], bind.base)))
            continue
        items.append(b)
        known.add(b['id'])
    return items, notes


def load_register(bind):
    """The deliverable register by type id, every column kept."""
    return {(r.get('id') or '').strip(): r for r in rows(bind.resolve('register'))}


def load_ladder(bind):
    """The ladder's rungs, least defined first, or None when the workspace binds none."""
    path = bind.optional('ladder')
    if not path:
        return None
    return [(r.get('rung') or '').strip() for r in rows(path) if (r.get('rung') or '').strip()]


def committed_ids(plan, items, label, budgeted=()):
    """The epics this quarter committed to: the WorkPlan's list, or failing that, what the
    model says is in the quarter."""
    if plan and plan.get('work_item_ids'):
        return list(plan['work_item_ids'])
    ids = [w['id'] for w in items if w.get('quarter') == label]
    return ids or list(budgeted)
