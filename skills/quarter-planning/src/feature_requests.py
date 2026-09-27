# SPDX-License-Identifier: Apache-2.0
"""The feature-request layer: products, the requests raised against them, and the epics and
stories that deliver them.

Optional, and off until the workspace binds `requests`. It adds the demand side to the plan,
in the shape the Scaled Agile Framework gives it:

  product   a platform's consumable offering, owned by a platform team (`products`)
  request   something a consumer needs a product to do that it does not yet do, raised
            against one product and ranked there by WSJF (`requests`)
  epic      takes a request on when it needs a platform build. The epic is the SAFe
            feature: it carries the size, through its deliverables, and the quarter's
            capacity. A request adds no points of its own
  story     an activity of the epic. It may cite the requests it builds part of, in
            `request_ids`, which matters when one epic delivers several requests

Assignment runs in that order and each link is recorded once. A request is assigned to an
epic in the request register (`epic`). Stories are assigned separately, by the stories
themselves citing the request, never by the request listing its stories.

The register contracts are small on purpose. A workspace keeps whatever other columns it
likes; these are the ones read.

  requests  id, title, product, epic, status, requested_by, value, time_criticality,
            risk_reduction, job_size
  products  id, name, platform, team (owner is read where team is absent)

Stories are read from two places, whichever the workspace has: activities in each
`<workItemsDir>/*/progress.yaml`, and `activity` records in `<sources>/activity.yaml`.

  load_requests(bind) -> {id: row} or None when unbound
  load_products(bind) -> {id: row} or None when unbound
  stories(bind) -> {request id: [story id, ...]}
  epic_requests(item, reqs) -> [request id, ...]
  requests_section(epics, items, reqs, products, story_map, bind, err, warn)
  backlog(reqs, products, story_map) -> text
"""
import glob
import io
import os

import yaml

from capacity import rows
from report import pts, table

FACTORS = ('value', 'time_criticality', 'risk_reduction', 'job_size')
SCALE = (1, 2, 3, 5, 8, 13, 20)


def _num(x):
    try:
        return float(str(x).strip())
    except ValueError:
        return None


def _register(bind, key):
    path = bind.optional(key)
    if not path:
        return None
    return {(r.get('id') or '').strip(): r for r in rows(path) if (r.get('id') or '').strip()}


def load_requests(bind):
    return _register(bind, 'requests')


def load_products(bind):
    return _register(bind, 'products')


def wsjf(row):
    """(value + time criticality + risk reduction) / job size, or None until all four exist."""
    v = [_num(row.get(k)) for k in FACTORS]
    if any(x is None or x <= 0 for x in v):
        return None
    return (v[0] + v[1] + v[2]) / v[3]


def _cite(out, story_id, ids):
    for rid in ids or []:
        rid = str(rid).strip()
        if rid and story_id not in out.setdefault(rid, []):
            out[rid].append(story_id)


def stories(bind):
    """Stories citing each request, from progress.yaml activities and activity.yaml."""
    out = {}
    root = bind.optional('workItemsDir')
    if root:
        for path in sorted(glob.glob(os.path.join(root, '*', 'progress.yaml'))):
            with io.open(path, encoding='utf-8') as fh:
                doc = yaml.safe_load(fh) or {}
            if isinstance(doc, dict):
                for a in doc.get('activities') or []:
                    if isinstance(a, dict) and a.get('id'):
                        _cite(out, str(a['id']), a.get('request_ids'))
    path = os.path.join(bind.resolve('sources'), 'activity.yaml')
    if os.path.isfile(path):
        with io.open(path, encoding='utf-8') as fh:
            doc = yaml.safe_load(fh) or {}
        for a in (doc.get('activity') or []) if isinstance(doc, dict) else []:
            if isinstance(a, dict) and a.get('id'):
                _cite(out, str(a['id']), a.get('request_ids'))
    return out


def epic_requests(item, reqs):
    return [rid for rid, r in sorted(reqs.items()) if (r.get('epic') or '').strip() == item['id']]


def supported(request_ids, reqs, products):
    """Products the requests are raised against, with the platform and team offering each."""
    out = {}
    for rid in request_ids:
        pid = (reqs.get(rid, {}).get('product') or '').strip()
        if pid:
            out.setdefault(pid, []).append(rid)
    return [(pid, (products or {}).get(pid, {}), rids) for pid, rids in sorted(out.items())]


def team_of(p):
    return (p.get('team') or p.get('owner') or '').strip()


# -------------------------------------------------------------------------- report
def requests_section(epics, items, reqs, products, story_map, bind, err, warn):
    """Section 10. The request register's rules, and the requests each committed epic takes on."""
    stages = bind.request_statuses
    first = stages[0] if stages else None
    known = {w.get('id') for w in items}

    for rid, r in sorted(reqs.items()):
        status = (r.get('status') or '').strip()
        if stages and status not in stages:
            err('%s has status %s, which is not one of %s'
                % (rid, status or 'blank', ', '.join(stages)))
        for k in FACTORS:
            v = (r.get(k) or '').strip()
            if v and _num(v) not in SCALE:
                err('%s scores %s %s, which is not on the scale %s'
                    % (rid, k, v, ', '.join(str(s) for s in SCALE)))
        pid = (r.get('product') or '').strip()
        if not pid:
            err('%s names no product. A request is always raised against one' % rid)
        elif products is not None and pid not in products:
            err('%s is raised against %s, which the product register does not hold' % (rid, pid))
        epic = (r.get('epic') or '').strip()
        if epic and epic not in known:
            err('%s is assigned to %s, which the planning model does not hold' % (rid, epic))
        if status and status not in (first, 'rejected') and wsjf(r) is None:
            warn('%s is %s but has no WSJF score, so it cannot be ranked' % (rid, status))

    for rid in sorted(set(story_map) - set(reqs)):
        warn('%s is cited by %s but the request register does not hold it'
             % (rid, ', '.join(story_map[rid])))

    body = []
    for item in epics:
        for rid in epic_requests(item, reqs):
            r = reqs[rid]
            status = (r.get('status') or '').strip()
            if status == first or status == 'rejected':
                warn('%s is assigned to %s but is %s, so it is not ready to build'
                     % (rid, item['id'], status))
            score = wsjf(r)
            body.append([item['id'], rid, (r.get('product') or '-').strip() or '-',
                         status or '-', pts(score) if score is not None else '-',
                         len(story_map.get(rid, []))])
    ranked = sum(1 for r in reqs.values() if wsjf(r) is not None)
    print('  %d request%s registered, %d scored.'
          % (len(reqs), '' if len(reqs) == 1 else 's', ranked))
    if body:
        print(table(['epic', 'request', 'product', 'status', 'wsjf', 'stories'], body))
    else:
        print('  No committed epic takes on a request.')


def backlog(reqs, products, story_map):
    """Each product's requests ranked by WSJF, with the epic and the stories delivering them."""
    out = []
    by_product = {}
    for rid, r in reqs.items():
        by_product.setdefault((r.get('product') or '').strip() or '(no product)', []).append(rid)
    for pid in sorted(by_product):
        p = (products or {}).get(pid, {})
        head = pid + (' %s' % p['name'] if p.get('name') else '')
        extra = ', '.join(x for x in ((p.get('platform') or '').strip(), team_of(p)) if x)
        out.append('%s%s' % (head, ' (%s)' % extra if extra else ''))
        rids = sorted(by_product[pid], key=lambda i: (-(wsjf(reqs[i]) or -1), i))
        body = []
        for rid in rids:
            r = reqs[rid]
            score = wsjf(r)
            body.append([rid, (r.get('title') or '').strip(), (r.get('status') or '').strip(),
                         pts(score) if score is not None else '-',
                         (r.get('epic') or '').strip() or '-',
                         ', '.join(story_map.get(rid, [])) or '-'])
        out.append(table(['request', 'title', 'status', 'wsjf', 'epic', 'stories'], body,
                         wrap={1: 40}))
        out.append('')
    orphans = sorted(set(story_map) - set(reqs))
    if orphans:
        out.append('Cited by stories but not in the request register: %s.' % ', '.join(orphans))
    return '\n'.join(out) if out else 'The request register is empty.'
