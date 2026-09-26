# SPDX-License-Identifier: Apache-2.0
"""The feature layer: products, their features, and how features reach epics and stories.

Optional, and off until the workspace binds `features`. It adds a backlog layer above the
epic, in the shape the Scaled Agile Framework gives it:

  product    a platform's consumable offering, owned by a platform team (`products`)
  feature    one thing a product will do, ranked by WSJF, always against one product
  epic       takes features on for a quarter: assigned in the feature register, and named on
             the epic as a deliverable of the feature type, so its size counts
  story      a work item that delivers part of a feature, citing it in `feature_ids`

Assignment runs in that order and each step is recorded once. A feature is assigned to an
epic in the feature register (`epic`), then named on that epic in the model. Stories are
assigned separately, by the work items themselves, never by the feature.

The register contracts are small on purpose. A workspace keeps whatever other columns it
likes; these are the ones read.

  features  id, title, product, epic, status, value, time_criticality, risk_reduction,
            job_size
  products  id, name, platform, team

  load_features(bind) -> {id: row} or None when unbound
  load_products(bind) -> {id: row} or None when unbound
  stories(bind) -> {feature id: [work item, ...]} from workItemsDir, or {}
  named_feature(deliverable, features, feature_type) -> feature id or None
  features_section(epics, feats, products, story_map, bind, err, warn)
  epic_features(item, feats, bind) -> [(feature id, planned)] for a card
  backlog(feats, products, story_map, bind) -> text
"""
import glob
import io
import os
import re

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


def load_features(bind):
    path = bind.optional('features')
    if not path:
        return None
    return {(r.get('id') or '').strip(): r for r in rows(path) if (r.get('id') or '').strip()}


def load_products(bind):
    path = bind.optional('products')
    if not path:
        return None
    return {(r.get('id') or '').strip(): r for r in rows(path) if (r.get('id') or '').strip()}


def wsjf(row):
    """(value + time criticality + risk reduction) / job size, or None until all four exist."""
    v = [_num(row.get(k)) for k in FACTORS]
    if any(x is None or x <= 0 for x in v):
        return None
    return (v[0] + v[1] + v[2]) / v[3]


def stories(bind):
    """Work items citing each feature, from `feature_ids` in every progress.yaml."""
    root = bind.optional('workItemsDir')
    out = {}
    if not root:
        return out
    for path in sorted(glob.glob(os.path.join(root, '*', 'progress.yaml'))):
        with io.open(path, encoding='utf-8') as fh:
            doc = yaml.safe_load(fh) or {}
        if not isinstance(doc, dict):
            continue
        for fid in doc.get('feature_ids') or []:
            out.setdefault(str(fid).strip(), []).append({
                'id': doc.get('work_item_id') or os.path.basename(os.path.dirname(path)),
                'title': doc.get('title') or '', 'status': doc.get('status') or ''})
    return out


def named_feature(d, feats, feature_type):
    """The feature a deliverable names, by the id its name starts with, or None."""
    if (d.get('deliverable_id') or '').strip() != feature_type:
        return None
    m = re.match(r'\s*(\S+)', str(d.get('name') or ''))
    return m.group(1).rstrip(':,.') if m else None


def epic_features(item, feats, bind):
    """The features on an epic: those named on it, then those assigned but not yet named."""
    ft = bind.feature_type
    named = [named_feature(d, feats, ft) for d in item.get('deliverables') or []]
    named = [n for n in named if n]
    out = [(n, True) for n in named]
    out += [(fid, False) for fid, r in sorted(feats.items())
            if (r.get('epic') or '').strip() == item['id'] and fid not in named]
    return out


def supported(feature_ids, feats, products):
    """Products the features belong to, and the platforms and teams offering them."""
    out = {}
    for fid in feature_ids:
        pid = (feats.get(fid, {}).get('product') or '').strip()
        if pid:
            out.setdefault(pid, []).append(fid)
    return [(pid, (products or {}).get(pid, {}), fids) for pid, fids in sorted(out.items())]


# -------------------------------------------------------------------------- report
def features_section(epics, feats, products, story_map, bind, err, warn):
    """Section 10. The feature register, and the features each committed epic takes on."""
    stages = bind.feature_statuses
    first = stages[0] if stages else None
    ft = bind.feature_type

    for fid, r in sorted(feats.items()):
        status = (r.get('status') or '').strip()
        if stages and status not in stages:
            err('%s has status %s, which is not one of %s'
                % (fid, status or 'blank', ', '.join(stages)))
        for k in FACTORS:
            v = (r.get(k) or '').strip()
            if v and _num(v) not in SCALE:
                err('%s scores %s %s, which is not on the scale %s'
                    % (fid, k, v, ', '.join(str(s) for s in SCALE)))
        pid = (r.get('product') or '').strip()
        if not pid:
            err('%s names no product. A feature always belongs to one' % fid)
        elif products is not None and pid not in products:
            err('%s belongs to %s, which the product register does not hold' % (fid, pid))
        if status and status not in (first, 'rejected') and wsjf(r) is None:
            warn('%s is %s but has no WSJF score, so it cannot be ranked' % (fid, status))

    by_epic = {e['id']: e for e in epics}
    seen = {}
    body = []
    for item in epics:
        for d in item.get('deliverables') or []:
            fid = named_feature(d, feats, ft)
            if (d.get('deliverable_id') or '').strip() == ft and not fid:
                err('%s on %s is typed %s but its name does not start with a feature id'
                    % (d.get('id') or 'a deliverable', item['id'], ft))
                continue
            if not fid:
                continue
            if fid not in feats:
                err('%s on %s names %s, which the feature register does not hold'
                    % (d.get('id') or 'a deliverable', item['id'], fid))
                continue
            if fid in seen:
                err('%s is named on both %s and %s. A feature is delivered by one epic'
                    % (fid, seen[fid], item['id']))
            seen[fid] = item['id']
            assigned = (feats[fid].get('epic') or '').strip()
            if not assigned:
                err('%s is named on %s but the feature register assigns it to no epic. Assign '
                    'it there first' % (fid, item['id']))
            elif assigned != item['id']:
                err('%s is named on %s but the feature register assigns it to %s'
                    % (fid, item['id'], assigned))
            status = (feats[fid].get('status') or '').strip()
            if status == first or status == 'rejected':
                warn('%s is named on %s but is %s, so it is not ready to plan'
                     % (fid, item['id'], status))
    for fid, r in sorted(feats.items()):
        epic = (r.get('epic') or '').strip()
        if epic in by_epic and fid not in seen:
            warn('%s is assigned to %s but not named on it as a %s deliverable, so its size '
                 'is not in the plan' % (fid, epic, ft))
    for item in epics:
        for fid, planned in epic_features(item, feats, bind):
            r = feats.get(fid, {})
            score = wsjf(r)
            body.append([item['id'], fid, (r.get('product') or '-').strip() or '-',
                         (r.get('status') or '-').strip() or '-',
                         pts(score) if score is not None else '-',
                         'yes' if planned else 'no', len(story_map.get(fid, []))])
    ranked = sum(1 for r in feats.values() if wsjf(r) is not None)
    print('  %d feature%s registered, %d scored.'
          % (len(feats), '' if len(feats) == 1 else 's', ranked))
    if body:
        print(table(['epic', 'feature', 'product', 'status', 'wsjf', 'planned', 'stories'],
                    body))
    else:
        print('  No committed epic takes on a feature.')


def backlog(feats, products, story_map, bind):
    """Each product's features ranked by WSJF, with the epic and the stories delivering them."""
    out = []
    by_product = {}
    for fid, r in feats.items():
        by_product.setdefault((r.get('product') or '').strip() or '(no product)', []).append(fid)
    for pid in sorted(by_product):
        p = (products or {}).get(pid, {})
        head = pid + (' %s' % p['name'] if p.get('name') else '')
        extra = ', '.join(x for x in ((p.get('platform') or '').strip(),
                                      (p.get('team') or '').strip()) if x)
        out.append('%s%s' % (head, ' (%s)' % extra if extra else ''))
        fids = sorted(by_product[pid], key=lambda i: (-(wsjf(feats[i]) or -1), i))
        body = []
        for fid in fids:
            r = feats[fid]
            score = wsjf(r)
            body.append([fid, (r.get('title') or '').strip(), (r.get('status') or '').strip(),
                         pts(score) if score is not None else '-',
                         (r.get('epic') or '').strip() or '-',
                         ', '.join(s['id'] for s in story_map.get(fid, [])) or '-'])
        out.append(table(['feature', 'title', 'status', 'wsjf', 'epic', 'stories'], body,
                         wrap={1: 40}))
        out.append('')
    orphans = sorted(set(story_map) - set(feats))
    if orphans:
        out.append('Cited by work items but not in the feature register: %s.'
                   % ', '.join(orphans))
    return '\n'.join(out) if out else 'The feature register is empty.'
