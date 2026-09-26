# SPDX-License-Identifier: Apache-2.0
"""The register rules, an epic's framing on the definition ladder, and the quarter's close.

Three checks that sit beside the arithmetic rather than inside it.

The register rules protect product sizing. A product is typed from the deliverable
register, the type must be in use, and an explicit size needs a reason. Each one broken
means a figure in section 5 rests on something the register does not support, so each
fails the run.

Framing reads each committed epic's `lane` and `flows`. A flow is a named path through a
capability, recorded with the rung it starts on and the rung the epic commits it to reach.
With a ladder bound, a rung the ladder does not name, or a movement down it, is the model
contradicting itself and fails the run. An epic whose products evidence none of a target
rung, or that names no lane, is a warning: the framing is incomplete, not wrong. With no
ladder bound the flows are reported as recorded and nothing is judged.

The close reads what happened: `rung_reached` on each flow and `actual_points` on each
product. It compares them with what was committed and planned, and gives, per register
type, the mean ratio of actual to base points as a hint for recalibrating the register.
It changes nothing.
"""
from capacity import f, product_points
from report import pts, table


def _rank(ladder):
    return {r: i for i, r in enumerate(ladder or [])}


def type_rung(register, d):
    row = register.get((d.get('deliverable_id') or '').strip()) or {}
    return (row.get('rung') or '').strip()


# ------------------------------------------------------------------- register rules
def register_rules(epics, register, err):
    """Every named product typed from the register, in use, and sized with a reason."""
    has_used = any('used' in row for row in register.values())
    checked = 0
    for item in epics:
        for d in item.get('deliverables') or []:
            checked += 1
            did = d.get('id') or '(a product with no id)'
            tid = (d.get('deliverable_id') or '').strip()
            if not tid:
                err('%s on %s names no type from the register, so it has no size'
                    % (did, item['id']))
            elif tid not in register:
                err('%s on %s is typed %s, which is not in the register. Retired ids are not '
                    'reissued, so pick a type the register holds' % (did, item['id'], tid))
            elif has_used and (register[tid].get('used') or '').strip().lower() != 'yes':
                err('%s on %s is typed %s, which the register marks used %s. Only types in '
                    'use are planned against'
                    % (did, item['id'], tid, (register[tid].get('used') or '').strip() or
                       'blank'))
            if d.get('points') is not None and not str(
                    d.get('points_override_reason') or '').strip():
                err('%s on %s overrides its type sizing with %s points but records no reason'
                    % (did, item['id'], pts(f(d['points']))))
    return checked


# -------------------------------------------------------------------------- framing
def framing_section(epics, register, ladder, err, warn):
    """Section 8. Each committed epic's lane and flows, judged against the ladder if bound."""
    rank = _rank(ladder)
    if ladder:
        print('  Ladder, least defined first: %s.' % ' > '.join(ladder))
    else:
        print('  No ladder is bound, so flows are reported as recorded and not judged. Bind '
              '`ladder` to check them.')
    body, no_criteria, no_flows = [], [], []
    for item in epics:
        wid = item['id']
        lane = str(item.get('lane') or '').strip()
        flows = item.get('flows') or []
        if not (item.get('advances_criterion_ids') or []):
            no_criteria.append(wid)
        if not flows:
            no_flows.append(wid)
        if ladder and not lane:
            warn('%s records no lane, so the capability area it advances is unstated' % wid)
        evidenced = {type_rung(register, d) for d in item.get('deliverables') or []}
        targets = []
        for fl in flows:
            name = fl.get('flow') or '(unnamed flow)'
            a, b = fl.get('rung_from'), fl.get('rung_to')
            body.append([wid, lane or '-', name, a or '-', b or '-',
                         'yes' if b and b in evidenced else 'no'])
            if not ladder:
                continue
            ok = True
            for which, value in (('rung_from', a), ('rung_to', b)):
                if value is None or str(value).strip() == '':
                    err('%s flow %s records no %s' % (wid, name, which))
                    ok = False
                elif value not in rank:
                    err('%s flow %s records %s %s, which the ladder does not name. It names %s'
                        % (wid, name, which, value, ', '.join(ladder)))
                    ok = False
            if not ok:
                continue
            if rank[b] < rank[a]:
                err('%s flow %s moves down the ladder, from %s to %s. A movement an epic '
                    'commits to goes up, or stays where it is' % (wid, name, a, b))
            elif rank[b] > rank[a] and b not in targets:
                targets.append(b)
        for b in targets:
            if b not in evidenced:
                warn('%s commits a flow to %s but names no product whose type evidences %s, '
                     'so nothing in the plan would show the rung was reached' % (wid, b, b))
    if body:
        print(table(['epic', 'lane', 'flow', 'from', 'to', 'evidenced'], body))
    if no_flows:
        print('  Names no flows: %s.' % ', '.join(no_flows))
    if no_criteria:
        print('  Advances no recorded criterion: %s. Reported, not failed, until criteria '
              'exist to cite.' % ', '.join(no_criteria))


# ---------------------------------------------------------------------------- close
def has_close(epics):
    return any(fl.get('rung_reached') for e in epics for fl in e.get('flows') or []) or any(
        d.get('actual_points') is not None for e in epics for d in e.get('deliverables') or [])


def close_section(epics, register, base, ladder, err):
    """Section 9. Committed against reached, planned against actual, and recalibration."""
    rank = _rank(ladder)
    body = []
    for item in epics:
        for fl in item.get('flows') or []:
            to, got = fl.get('rung_to'), fl.get('rung_reached')
            if not got:
                result = 'not recorded'
            elif ladder and got not in rank:
                err('%s flow %s records rung_reached %s, which the ladder does not name'
                    % (item['id'], fl.get('flow'), got))
                result = 'unknown rung'
            elif ladder and to in rank:
                result = ('reached' if rank[got] == rank[to]
                          else 'beyond' if rank[got] > rank[to] else 'short')
            else:
                result = 'reached' if got == to else 'differs'
            body.append([item['id'], fl.get('flow') or '-', fl.get('rung_from') or '-',
                         to or '-', got or '-', result])
    if body:
        print('  Flows, committed against reached.')
        print(table(['epic', 'flow', 'from', 'committed', 'reached', 'result'], body))

    body, by_type = [], {}
    tot_plan = tot_act = 0.0
    for item in epics:
        for d in item.get('deliverables') or []:
            if d.get('actual_points') is None:
                continue
            planned, actual = product_points(d, base), f(d['actual_points'])
            tot_plan += planned
            tot_act += actual
            body.append([d.get('id') or '-', d.get('deliverable_id') or '-', pts(planned),
                         pts(actual), ('+' if actual > planned else '') + pts(actual - planned)
                         if abs(actual - planned) > 0.005 else '0.0'])
            tid = (d.get('deliverable_id') or '').strip()
            if base.get(tid):
                by_type.setdefault(tid, []).append(actual / base[tid])
    if body:
        print('  Products, planned against actual.')
        print(table(['product', 'type', 'planned', 'actual', 'difference'], body,
                    ['total', '', pts(tot_plan), pts(tot_act),
                     ('+' if tot_act > tot_plan else '') + pts(tot_act - tot_plan)]))
    if by_type:
        print('  Register types, actual against base. A hint for recalibrating the register, '
              'not a correction to it.')
        print(table(['type', 'products', 'base', 'mean ratio', 'suggests'],
                    [[t, len(r), pts(base[t]), '%.2f' % (sum(r) / len(r)),
                      pts(base[t] * sum(r) / len(r))] for t, r in sorted(by_type.items())]))
