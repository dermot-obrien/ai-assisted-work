#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Validate a quarter's sizing model top down, from the period to the products.

The chain runs one way only. Time and cost are fixed first and scope varies against them,
which is the PRINCE2 Agile position the planning playbook takes. So the quarter's capacity is
established from the calendar and the people before any epic is looked at, and an epic's
budget is a distribution of that capacity rather than a figure derived from its contents.

  1  Period          calendar working days, less generic non-working time
  2  Resources       allocation, less individual non-working time, gives capacity per person
  3  Quarter budget  capacity distributed to epics, with the remainder held unallocated
  4  Epic budgets    each epic's budget_points must follow from the distribution
  5  Elaboration     each epic's named products, against the budget it was given
  6  Load            each person's owned products, against the capacity they brought

Levels 1 to 4 are integrity: a disagreement there means the model contradicts itself and the
run fails. Levels 5 and 6 are subscription: being over is a scoping decision, not a defect,
so it is reported and the run still passes. That distinction is the whole point of separating
budget from planned.

Nothing is mastered here, and the capacity arithmetic is not implemented here either: it is
imported from quarter_capacity.py, which every tool that needs it shares. Sources:

  change/planning/<quarter>/<quarter>-calendar.csv         the period and its non-working time
  change/planning/<quarter>/<quarter>-planning-basis.csv   the conversion parameters, and the
                                                           declared quarter capacity and budget
  change/planning/<quarter>/<quarter>-resourcing.csv       people, allocation, leave, and the
                                                           share of each going to each epic
  change/ai-programme/roadmap/sources/work_item.yaml       budget_points and the named products
  change/ai-programme/roadmap/sources/work_plan.yaml       which epics the quarter committed to
  governance/deliverables/architecture-deliverables.csv    base points per product type

Run:  python tools/scripts/validate-quarter-plan.py [--quarter fy27-q1] [--apply]

--apply writes the derived budget_points onto each epic in work_item.yaml, replacing only
that one value on that one line, after taking a .bak copy. Use it when the distribution has
changed and the recorded budgets are behind it. Everything else is read only.
"""
import argparse
import io
import os
import re
import shutil
import sys

import yaml

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))
from bindings import Bindings  # noqa: E402
from capacity import Quarter, base_points, f, product_points  # noqa: E402

errors = []


def err(msg):
    errors.append(msg)


def signed(x):
    """One decimal place with an explicit sign, for an over or under figure."""
    return ('%+.1f' % x) if abs(x) >= 0.05 else '0.0'


def deduct(x):
    """A deduction, shown negative, with no signed zero for the people who have none."""
    return ('-%.1f' % x) if abs(x) >= 0.05 else '0.0'


def epic_label(item):
    key = next((r.get('external_id') for r in (item.get('external_refs') or [])
                if (r.get('system') or '').lower() == 'jira' and r.get('external_id')), None)
    title = (item.get('title') or '').rstrip('.')
    return '%s %s' % (key, title) if key else title


def table(head, body, foot=None):
    """Plain fixed-width table. Numeric columns right-aligned, text left."""
    grid = [head] + body + ([foot] if foot else [])
    width = [max(len(str(r[i])) for r in grid) for i in range(len(head))]
    numeric = [all(re.match(r'^[-+]?[\d.]+%?$', str(r[i]).strip() or 'x') for r in body)
               for i in range(len(head))]

    def line(cells):
        return '  ' + ' '.join(
            (str(c).rjust(width[i]) if numeric[i] else str(c).ljust(width[i]))
            for i, c in enumerate(cells)).rstrip()

    rule = '  ' + ' '.join('-' * n for n in width)
    out = [line(head), rule] + [line(r) for r in body]
    if foot:
        out += [rule, line(foot)]
    return '\n'.join(out)


def budget_summary(q, by_id, plan):
    """The top-level budget and the ladder it comes down, and nothing else.

    One question answered: what may this quarter spend, and which input produced each step of
    that figure. Every line names its source, so a figure that looks wrong can be argued with
    at the step that made it rather than at the total.
    """
    b = q.basis
    to_epics = q.budget(by_id)
    reserve = q.reserve(by_id)
    budget, held = sum(to_epics.values()), sum(reserve.values())
    holidays = q.working_days_lost()
    allocations = ', '.join('%.0f' % q.people[s]['alloc'] for s in q.order)
    leave = [(q.people[s]['name'], q.people[s]['leave'], s) for s in q.order
             if q.people[s]['leave']]

    print('%s  %s' % (q.fiscal or q.slug, plan['name'] if plan else 'no WorkPlan record'))
    if plan:
        print('%s to %s, %s' % (plan.get('planned_start'), plan.get('planned_end'),
                                plan.get('status')))
    print()
    rows = [
        ['working days in the period', '%.0f' % q.working_days,
         'calendar, %d weekdays less %s' % (q.weekdays(), holidays)],
        ['points at 100 percent allocation', '%.1f' % q.full,
         '%.0f days x %.2f usable / %.1f person-days per point'
         % (b['working_days'], b['usable_fraction'], b['person_days_per_point'])],
        ['gross across %d people' % len(q.order), '%.1f' % sum(p['gross'] for p in
                                                               q.people.values()),
         '%.1f x %s percent' % (q.full, allocations)],
    ]
    for name, pts, sid in leave:
        rows.append(['less leave, %s' % name, '-%.1f' % pts,
                     '%s working days at %.0f percent allocation'
                     % (q.leave_days(sid), q.people[sid]['alloc'])])
    absence = sum(p['absence'] for p in q.people.values())
    if absence:
        rows.append(['less expected absence, everyone', '-%.1f' % absence,
                     '%.1f working days each at their allocation' % q.absence_days])
    rows += [
        ['ENABLER CAPACITY', '%.1f' % q.capacity, 'the fixed cost. Scope varies against it'],
        ['distributed to epics as budget', '%.1f' % budget,
         "each person's share of their allocation, across the epics they work on"],
    ]
    for k, v in sorted(reserve.items()):
        rows.append(['held unallocated on %s' % k, '%.1f' % v, 'given to no epic'])
    print(table(['step', 'points', 'from'], rows))

    print()
    print(table(['epic', 'budget', 'from'],
                [[wid, '%.1f' % pts,
                  ', '.join('%s %.1f' % (q.people[s]['name'].split()[0], p)
                            for s, p in sorted(q.split.get(wid, {}).items(),
                                               key=lambda x: -x[1]))]
                 for wid, pts in sorted(to_epics.items(), key=lambda x: -x[1])],
                ['total', '%.1f' % budget, '']))

    print()
    for name, derived in (('enabler_capacity_points', q.capacity),
                          ('quarter_budget_points', budget),
                          ('unallocated_capacity_points', held)):
        declared = b.get(name)
        if declared is None:
            err('the basis declares no %s' % name)
        elif abs(declared - derived) > q.bind.tolerance:
            err('the basis declares %s %.1f but the registers derive %.1f'
                % (name, declared, derived))
    for issue in q.issues:
        err(issue)
    for wid, derived in sorted(to_epics.items()):
        recorded = by_id[wid].get('budget_points')
        if recorded is None or abs(f(recorded) - derived) > q.bind.tolerance:
            err('%s records budget_points %s but the distribution gives %.1f'
                % (wid, recorded, derived))
    if errors:
        for e in errors:
            print('  ERROR %s' % e)
        return 1
    print('  Every figure above follows from the registers, and the basis declares the same '
          'three totals.')
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quarter', required=True,
                    help='quarter slug, e.g. fy27-q1; the form is set by slugPattern')
    ap.add_argument('--workspace', default=None,
                    help='where to start looking for .agents/skill-bindings.toml')
    ap.add_argument('--where', action='store_true',
                    help='print the resolved inputs and stop, without reading any of them')
    ap.add_argument('--budget', action='store_true',
                    help='print only the top-level budget and the ladder it comes down')
    ap.add_argument('--apply', action='store_true',
                    help='write the derived budget_points onto the epics in work_item.yaml')
    args = ap.parse_args()
    bind = Bindings(args.quarter, start=args.workspace or os.getcwd())
    if args.where:
        print(bind.describe())
        return 0
    missing = bind.missing()
    if missing:
        sys.stderr.write(
            'quarter-planning: %s not found for %s.\n'
            'Declare where they live in [suite.quarter-planning] of '
            '.agents/skill-bindings.toml, or run with --where to see what is looked for.\n'
            % (', '.join(k for k, _ in missing), args.quarter))
        for k, p in missing:
            sys.stderr.write('  %-11s %s\n' % (k, p))
        return 2
    if not os.path.isdir(bind.resolve('quarterDir')):
        print('no planning folder for %s' % args.quarter)
        return 2

    q = Quarter(args.quarter, bind)
    basis, people = q.basis, q.people
    base = base_points(bind)
    items = (yaml.safe_load(io.open(os.path.join(bind.resolve('sources'), 'work_item.yaml'), encoding='utf-8'))
             or {}).get('work_item') or []
    by_id = {w['id']: w for w in items}
    plans = (yaml.safe_load(io.open(os.path.join(bind.resolve('sources'), 'work_plan.yaml'), encoding='utf-8'))
             or {}).get('work_plan') or []
    plan = next((p for p in plans if p.get('quarter') == q.fiscal), None)

    if args.budget:
        return budget_summary(q, by_id, plan)

    print('%s  %s' % (q.fiscal or q.slug,
                      plan['name'] if plan else 'no WorkPlan record for this quarter'))
    if plan:
        print('%s to %s, %s, owned by %s'
              % (plan.get('planned_start'), plan.get('planned_end'), plan.get('status'),
                 plan.get('owner') or 'nobody'))
    else:
        err('no WorkPlan record carries quarter %s, so nothing in the model states which epics '
            'the quarter committed to' % q.fiscal)

    # ------------------------------------------------------------------ 1. the period
    print('\n1. PERIOD')
    if abs(q.working_days - basis.get('working_days', 0)) > 0.4:
        err('the calendar totals %d working days but the basis declares %.0f'
            % (q.working_days, basis.get('working_days', 0)))
    if abs(q.full - basis.get('points_at_full_allocation', 0)) > bind.tolerance:
        err('points_at_full_allocation is %.1f but the basis derives %.1f from working days, '
            'usable fraction and person-days per point'
            % (basis.get('points_at_full_allocation', 0), q.full))
    print(table(['period', 'dates', 'working days', 'note'],
                [[r['period_id'], '%s to %s' % (r['start'], r['end']), r['working_days'],
                  (r.get('note') or '')[:44]] for r in q.calendar]))
    print('  %d working days across %d sprint%s. Generic non-working time, being public '
          'holidays and any shutdown, is already netted out%s.'
          % (q.working_days, len(q.sprints), '' if len(q.sprints) == 1 else 's',
             ': ' + ', '.join('%s %s to %s' % (r['period_id'], r['start'], r['end'])
                              for r in q.non_working) if q.non_working else ''))
    print('  %.1f points at 100 percent allocation, being %.0f days x %.2f usable / %.1f '
          'person-days per point.'
          % (q.full, basis['working_days'], basis['usable_fraction'],
             basis['person_days_per_point']))

    # --------------------------------------------------------------- 2. the resources
    print('\n2. RESOURCES')
    for issue in q.issues:
        err(issue)
    head = ['person', 'role', 'alloc', 'gross', 'leave', 'absence', 'available',
            'out of scope', 'enabler']
    print(table(head,
                [[people[s]['name'], people[s]['role'], '%.0f%%' % people[s]['alloc'],
                  '%.1f' % people[s]['gross'], deduct(people[s]['leave']),
                  deduct(people[s]['absence']), '%.1f' % people[s]['available'],
                  deduct(people[s]['out_of_scope']),
                  '%.1f' % people[s]['enabler']] for s in q.order],
                ['total', '', '', '%.1f' % sum(p['gross'] for p in people.values()),
                 deduct(sum(p['leave'] for p in people.values())),
                 deduct(sum(p['absence'] for p in people.values())),
                 '%.1f' % sum(p['available'] for p in people.values()),
                 deduct(sum(p['out_of_scope'] for p in people.values())),
                 '%.1f' % q.capacity]))
    if q.absence_days:
        print('  Expected absence is %.1f working days per person at full allocation, deducted '
              'from everyone. Booked leave is per person and separate.' % q.absence_days)
    declared_cap = basis.get('enabler_capacity_points')
    if declared_cap is None:
        err("the basis declares no enabler_capacity_points, so nothing states the quarter's "
            'available resource')
    elif abs(q.capacity - declared_cap) > bind.tolerance:
        err('the basis declares enabler_capacity_points %.1f but the resourcing register '
            'derives %.1f' % (declared_cap, q.capacity))
    print('  %.1f points of enabler capacity. This is the fixed cost, and scope varies against '
          'it.' % q.capacity)

    # ---------------------------------------------------------- 3. the quarter budget
    print('\n3. QUARTER BUDGET')
    to_epics = q.budget(by_id)
    reserve = q.reserve(by_id)
    budget = sum(to_epics.values())
    held = sum(reserve.values())
    declared_budget = basis.get('quarter_budget_points')
    declared_reserve = basis.get('unallocated_capacity_points')
    if declared_budget is None:
        err('the basis declares no quarter_budget_points, so nothing states how much of the '
            "quarter's capacity has been given out")
    elif abs(budget - declared_budget) > bind.tolerance:
        err('the basis declares quarter_budget_points %.1f but the distribution in the '
            'resourcing register gives %.1f' % (declared_budget, budget))
    if declared_reserve is not None and abs(held - declared_reserve) > bind.tolerance:
        err('the basis declares unallocated_capacity_points %.1f but the register leaves %.1f '
            'undistributed' % (declared_reserve, held))
    if budget - q.capacity > bind.tolerance:
        err('the epic budgets total %.1f against %.1f of capacity, so more has been given out '
            'than the quarter holds' % (budget, q.capacity))
    print(table(['line', 'points'],
                [['enabler capacity for the period', '%.1f' % q.capacity],
                 ['distributed to epics as budget', '%.1f' % budget]]
                + [['held unallocated on %s' % k, '%.1f' % v]
                   for k, v in sorted(reserve.items())],
                ['capacity not yet accounted for', signed(q.capacity - budget - held)]))

    # ----------------------------------------------------------- 4. the epic budgets
    print('\n4. EPIC BUDGETS')
    committed = set(plan.get('work_item_ids') or []) if plan else set(to_epics)
    body, fixes = [], []
    for wid in sorted(to_epics, key=lambda k: -to_epics[k]):
        item, derived = by_id[wid], to_epics[wid]
        recorded = item.get('budget_points')
        who = ', '.join('%s %.1f' % (people[s]['name'].split()[0], p)
                        for s, p in sorted(q.split.get(wid, {}).items(), key=lambda x: -x[1]))
        drift = None if recorded is None else derived - f(recorded)
        body.append([wid, epic_label(item)[:44], '%.1f' % derived,
                     'unset' if recorded is None else '%.1f' % f(recorded),
                     'n/a' if drift is None else signed(drift), who])
        if recorded is None:
            err('%s is given %.1f points by the distribution but records no budget_points'
                % (wid, derived))
            fixes.append((wid, derived))
        elif abs(drift) > bind.tolerance:
            err('%s records budget_points %.1f but the distribution gives %.1f'
                % (wid, f(recorded), derived))
            fixes.append((wid, derived))
        if wid not in committed:
            err("%s carries a budget but the quarter's WorkPlan does not name it" % wid)
    print(table(['epic', 'title', 'derived', 'recorded', 'drift', 'from'], body,
                ['total', '', '%.1f' % budget, '', '', '']))
    for wid in sorted(committed - set(to_epics)):
        err('the WorkPlan names %s but the resourcing register distributes nothing to it' % wid)
    for w in items:
        if w.get('budget_points') is not None and w['id'] not in to_epics:
            err('%s records budget_points %s but no allocation in the resourcing register '
                'produces it' % (w['id'], w['budget_points']))

    # ------------------------------------------------------------ 5. the elaboration
    print('\n5. ELABORATION, PRODUCTS AGAINST BUDGET')
    print('  Positive is under budget, negative is over.')
    body, total_planned, total_budget = [], 0.0, 0.0
    for wid in sorted(to_epics, key=lambda k: -to_epics[k]):
        item = by_id[wid]
        ds = item.get('deliverables') or []
        planned = sum(product_points(d, base) for d in ds)
        b = to_epics[wid]
        total_planned += planned
        total_budget += b
        body.append([wid, epic_label(item)[:44], len(ds), '%.1f' % b, '%.1f' % planned,
                     signed(b - planned)])
        rec = item.get('planned_points')
        if rec is not None and abs(f(rec) - planned) > bind.tolerance:
            err('%s records planned_points %s but its products sum to %.1f' % (wid, rec, planned))
    print(table(['epic', 'title', 'products', 'budget', 'planned', 'over/under'], body,
                ['total', '', '', '%.1f' % total_budget, '%.1f' % total_planned,
                 signed(total_budget - total_planned)]))
    gap = total_planned - total_budget
    if gap > bind.tolerance:
        print('  OVER by %.1f points, %.0f percent of the budget. Time and cost are fixed, so '
              'this is a scope decision, not a capacity request.'
              % (gap, 100 * gap / total_budget if total_budget else 0))
    elif gap < -bind.tolerance:
        print('  UNDER by %.1f points. There is room to pull scope in, or to release the '
              'balance to another lane.' % -gap)
    else:
        print('  Subscribed to budget.')
    deferred = [(w['id'], sum(product_points(d, base) for d in (w.get('deliverables') or [])))
                for w in items
                if w.get('budget_points') is None and (w.get('deliverables') or [])]
    deferred = [(i, p) for i, p in deferred if p]
    if deferred:
        print('  Deferred, naming products but given no budget, so loading nobody: %s.'
              % ', '.join('%s %.0f' % (i, p) for i, p in sorted(deferred)))

    # -------------------------------------------------------------------- 6. the load
    print('\n6. LOAD AGAINST CAPACITY')
    print('  Positive is capacity still free, negative is load beyond capacity.')
    load = {}
    for w in items:
        if w.get('budget_points') is None:
            continue
        for d in (w.get('deliverables') or []):
            who = d.get('owner_stakeholder_id')
            if who and (who, w['id']) not in q.excluded:
                load[who] = load.get(who, 0.0) + product_points(d, base)
    for sid in sorted(set(load) - set(people)):
        err('%s owns %.1f points of products but is not in the capacity register'
            % (sid, load[sid]))
    body = []
    for s in sorted(q.order, key=lambda s: -people[s]['enabler']):
        c, l = people[s]['enabler'], load.get(s, 0.0)
        body.append([people[s]['name'], '%.1f' % c, '%.1f' % l,
                     '%.0f%%' % (100 * l / c) if c else 'n/a', signed(c - l)])
    loaded = sum(load.get(s, 0.0) for s in q.order)
    print(table(['person', 'capacity', 'load', 'load pct', 'free'], body,
                ['total', '%.1f' % q.capacity, '%.1f' % loaded,
                 '%.0f%%' % (100 * loaded / q.capacity) if q.capacity else 'n/a',
                 signed(q.capacity - loaded)]))

    # ------------------------------------------------------------------------ apply
    if args.apply:
        if not fixes:
            print('\nnothing to apply: every recorded budget already follows from the '
                  'distribution.')
            return 0
        path = os.path.join(bind.resolve('sources'), 'work_item.yaml')
        shutil.copy2(path, path + '.bak')
        lines = io.open(path, encoding='utf-8').read().split('\n')
        want = dict(fixes)
        written = []
        for i, line in enumerate(lines):
            m = re.match(r'^- id: (EP-\d+)\s*$', line)
            if not m or m.group(1) not in want:
                continue
            wid = m.group(1)
            for j in range(i + 1, len(lines)):
                if re.match(r'^- id: ', lines[j]):
                    break
                if re.match(r'^  budget_points:', lines[j]):
                    lines[j] = '  budget_points: %s' % round(want[wid] + 1e-9, 2)
                    written.append(wid)
                    break
        io.open(path, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
        print('\napplied budget_points to %s. Backup at work_item.yaml.bak.'
              % (', '.join(written) if written else 'nothing'))
        for wid, _ in fixes:
            if wid not in written:
                print('  %s has no budget_points line to replace; add one by hand' % wid)
        print('  Now compose the roadmap, regenerate the derived views, and re-run this check.')
        return 0

    print()
    if errors:
        for e in errors:
            print('  ERROR %s' % e)
        print('\nintegrity: %d error%s. Levels 1 to 4 must agree before levels 5 and 6 mean '
              'anything.' % (len(errors), '' if len(errors) == 1 else 's'))
        if fixes:
            print('Re-run with --apply to write the derived budget_points onto the epics.')
        return 1
    print('integrity: the chain closes from the calendar through to the products.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
