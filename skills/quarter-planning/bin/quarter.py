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
  7  Approval        how far the plan, each epic and each product have been approved
  8  Framing         each committed epic's lane and flows, on the definition ladder
  9  Close           what each flow reached and what each product cost, once recorded

Levels 1 to 4 are integrity: a disagreement there means the model contradicts itself and the
run fails. Levels 5 and 6 are subscription: being over is a scoping decision, not a defect,
so it is reported and the run still passes. That distinction is the whole point of separating
budget from planned.

Level 7 reads the `approval` field on the WorkPlan, each committed epic and each of its
products. The stages are ordered, least advanced first, and default to draft, sized,
validated, approved; the last is approval, and approval is commitment. An approval that
claims more than the records beneath it support fails the run, because that is the model
contradicting itself again: an epic further on than its least advanced product, an epic
approved before the quarter's budget and resourcing are, or an epic sized with nothing named.

Level 5 also enforces the register: every product is typed from the deliverable register,
the type is in use where the register has a `used` column, and an explicit `points` carries
a `points_override_reason`. Level 8 reads each epic's `lane` and `flows`. With a `ladder`
bound, an unknown rung or a movement down the ladder fails the run, and a missing lane or a
target rung no product evidences is a warning. Level 9 appears only once `rung_reached` or
`actual_points` has been recorded, and is read only.

Nothing is mastered here, and the capacity arithmetic is not implemented here either: it is
imported from src/capacity.py, which every tool that needs it shares. What it reads is named
by binding key, not by path, because where each one lives is the workspace's business and is
declared in [suite.quarter-planning] of its .agents/skill-bindings.toml:

  calendar     the period and its non-working time
  basis        the conversion parameters, and the declared quarter capacity and budget
  resourcing   people, allocation, leave, and the share of each going to each epic
  sources      work_item.yaml, for budget_points and the named products, and work_plan.yaml,
               for which epics the quarter committed to
  register     base points per product type, the `used` flag, and the rung each type evidences

None of those has a default. Optional keys opt in to more: `ladder` for the definition
ladder, `epicsDir` and `cardsDir` for the epic folders and the generated cards, and
`workItemsDir` to read epics from AAW work items' progress.yaml as well. Run with --where to see what this workspace resolves them to,
before reading any of them.

Run:  python <skills>/quarter-planning/bin/quarter.py --quarter <slug> [--apply]
      python <skills>/quarter-planning/bin/quarter.py --quarter <slug> --cards [--check]

--apply writes the derived budget_points onto each epic in work_item.yaml, replacing only
that one value on that one line, or inserting the line after the record's id where there is
none, after taking a .bak copy. Use it when the distribution has changed and the recorded
budgets are behind it.

--cards writes one card per committed epic and the stage grid to the cardsDir binding, and
with --check writes nothing and fails if any is stale. Everything else is read only.
"""
import argparse
import io
import os
import re
import shutil
import sys


sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))
from bindings import Bindings  # noqa: E402
from capacity import Quarter, base_points, f, product_points  # noqa: E402
import cards as cards_mod  # noqa: E402
from framing import close_section, framing_section, has_close, register_rules  # noqa: E402
from planmodel import load_items, load_ladder, load_plan, load_register, work_item_path  # noqa: E402
from report import deduct, signed, table  # noqa: E402

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)
    print('  WARNING %s' % msg)


def epic_label(item):
    key = next((r.get('external_id') for r in (item.get('external_refs') or [])
                if (r.get('system') or '').lower() == 'jira' and r.get('external_id')), None)
    title = (item.get('title') or '').rstrip('.')
    return '%s %s' % (key, title) if key else title


def stage_of(record, stages):
    """A record's approval stage. Absent means the first stage, not unknown."""
    return record.get('approval') or stages[0]


def approval_section(q, plan, by_id, committed, integrity_errors):
    """Level 7: what has been approved, and whether each approval is supported beneath it."""
    stages = q.bind.approval_stages
    rank = {s: i for i, s in enumerate(stages)}
    last = stages[-1]

    def known(where, value):
        if value not in rank:
            err('%s records approval %r, which is not one of %s'
                % (where, value, ', '.join(stages)))
            return False
        return True

    plan_stage = stage_of(plan, stages) if plan else None
    if plan:
        known('the WorkPlan', plan_stage)
    print('  Stages, least advanced first: %s. The last is approval, and approval is '
          'commitment.' % ' > '.join(stages))
    print('  Quarter budget and resourcing: %s.' % (plan_stage or 'no WorkPlan record'))

    body = []
    for wid in sorted(committed):
        item = by_id.get(wid)
        if not item:
            continue
        ep = stage_of(item, stages)
        ds = item.get('deliverables') or []
        dstages = [(d.get('id'), stage_of(d, stages)) for d in ds]
        ok = known(wid, ep)
        for did, st in dstages:
            ok = known(did, st) and ok
        counts = {}
        for _, st in dstages:
            counts[st] = counts.get(st, 0) + 1
        lowest = min(dstages, key=lambda x: rank.get(x[1], -1)) if dstages else None
        body.append([wid, epic_label(item)[:44], ep, len(ds),
                     lowest[1] if lowest else 'n/a',
                     ', '.join('%s %d' % (st, counts[st])
                               for st in sorted(counts, key=lambda k: rank.get(k, -1)))])
        if not ok:
            continue
        if not ds and rank[ep] > 0:
            err('%s is recorded %s but names no products, so there is nothing for that stage '
                'to rest on' % (wid, ep))
        if lowest and rank[ep] > rank[lowest[1]]:
            err('%s is recorded %s but its product %s is only %s. An epic cannot be further '
                'on than its least advanced product' % (wid, ep, lowest[0], lowest[1]))
        if ep == last and plan_stage != last:
            err('%s is recorded %s, which is commitment, but the quarter budget and resourcing '
                'are %s. The budget an epic commits to comes from them, so they are approved '
                'first' % (wid, ep, plan_stage or 'unrecorded'))
    print(table(['epic', 'title', 'epic', 'products', 'lowest', 'products by stage'], body))
    if plan_stage == last and integrity_errors:
        print('  The quarter budget is recorded %s, but levels 1 to 4 no longer agree, so what '
              'was approved has moved. Fix them and approve again.' % last)
    if len(stages) > 1:
        ready = [r[0] for r in body if r[2] == stages[-2]]
        if ready:
            print('  Ready for approval: %s.' % ', '.join(ready))


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
        print('%s to %s, %s, approval %s'
              % (plan.get('planned_start'), plan.get('planned_end'), plan.get('status'),
                 stage_of(plan, q.bind.approval_stages)))
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


RECORD = re.compile(r'^(?P<indent>[ ]*)-(?P<gap>[ ]+)id:[ ]*(?P<id>[^#\s]+)[ ]*(#.*)?$')


def apply_budgets(text, want):
    """Write budget_points onto the records named in `want`, by patching text.

    A YAML round trip would drop every comment in the file, so the value is patched in
    place. A record starts at any `- id: <id>` line at the list's own indentation, the
    indentation of the first record under `work_item:`, so products nested deeper are never
    taken for epics. Where a record has no budget_points line, one is inserted after its id
    line at the record's field indentation. Returns the new text and the ids written.
    """
    lines = text.split('\n')
    top = next((i for i, l in enumerate(lines) if re.match(r'^work_item:\s*(#.*)?$', l)), -1)
    indent = None
    for line in lines[top + 1:]:
        m = RECORD.match(line)
        if m:
            indent = m.group('indent')
            break
    if indent is None:
        return text, []
    written = []
    i = top + 1
    while i < len(lines):
        m = RECORD.match(lines[i])
        wid = m.group('id').strip('\'"') if m and m.group('indent') == indent else None
        if wid not in want:
            i += 1
            continue
        field = ' ' * (len(indent) + 1 + len(m.group('gap')))
        value = round(want[wid] + 1e-9, 2)
        end = i + 1
        while end < len(lines):
            line = lines[end]
            bare = line.strip()
            lead = len(line) - len(line.lstrip(' '))
            if bare and not bare.startswith('#') and lead <= len(indent):
                break
            end += 1
        done = False
        for j in range(i + 1, end):
            b = re.match(r'^%sbudget_points:[^#]*?(?P<c>[ ]+#.*)?$' % field, lines[j])
            if b:
                lines[j] = '%sbudget_points: %s%s' % (field, value, b.group('c') or '')
                done = True
                break
        if not done:
            lines.insert(i + 1, '%sbudget_points: %s' % (field, value))
        written.append(wid)
        i = end + (0 if done else 1)
    return '\n'.join(lines), written


def cards(q, bind, check):
    """Write the epic cards and the stage grid, or with check, report which are stale."""
    if not bind.declared('cardsDir'):
        sys.stderr.write('quarter-planning: --cards needs to know where the cards go. Declare '
                         'cardsDir in [suite.quarter-planning] of %s. It may carry {quarter}.\n'
                         % (bind.file or '.agents/skill-bindings.toml'))
        return 2
    files = cards_mod.build(q, bind, q.fiscal)
    stale = cards_mod.write(files, check=check)
    shown = [os.path.relpath(p, os.getcwd()) if os.path.splitdrive(p)[0].lower()
             == os.path.splitdrive(os.getcwd())[0].lower() else p for p in stale]
    if check:
        if stale:
            print('Stale epic cards for %s. Regenerate with %s:\n  %s'
                  % (q.fiscal, cards_mod.regenerate_command(bind, q.slug), '\n  '.join(shown)))
            return 1
        print('Epic cards for %s are current.' % q.fiscal)
        return 0
    print('Wrote %d of %d file(s) for %s.' % (len(stale), len(files), q.fiscal))
    for p in shown:
        print('  %s' % p)
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
    ap.add_argument('--cards', action='store_true',
                    help='write the epic cards and the stage grid to the cardsDir binding')
    ap.add_argument('--check', action='store_true',
                    help='with --cards, write nothing and exit non-zero if any card is stale')
    args = ap.parse_args()
    if args.check and not args.cards:
        ap.error('--check applies to --cards')
    bind = Bindings(args.quarter, start=args.workspace or os.getcwd())
    if args.where:
        print(bind.describe())
        return 0
    undeclared = bind.undeclared()
    if undeclared:
        sys.stderr.write(
            'quarter-planning: this workspace has not said where its registers are.\n'
            'Declare %s in [suite.quarter-planning] of %s.\n'
            'There is no default: a default would be another workspace\'s layout.\n'
            % (', '.join(undeclared), bind.file or '.agents/skill-bindings.toml'))
        return 2
    missing = bind.missing()
    if missing:
        sys.stderr.write(
            'quarter-planning: %s not found for %s.\n'
            'Declare where they live in [suite.quarter-planning] of '
            '.agents/skill-bindings.toml, or run with --where to see what is looked for.\n'
            % (', '.join(k for k, _ in missing), args.quarter))
        for k, p in missing:
            sys.stderr.write('  %-12s %s\n' % (k, p))
        return 2
    if not os.path.isdir(bind.resolve('quarterDir')):
        print('no planning folder for %s' % args.quarter)
        return 2

    q = Quarter(args.quarter, bind)
    if args.cards:
        return cards(q, bind, args.check)
    basis, people = q.basis, q.people
    base = base_points(bind)
    items, notes = load_items(bind, q.fiscal)
    by_id = {w['id']: w for w in items}
    plan = load_plan(bind, q.fiscal)

    if args.budget:
        return budget_summary(q, by_id, plan)

    print('%s  %s' % (q.fiscal or q.slug,
                      plan['name'] if plan else 'no WorkPlan record for this quarter'))
    if plan:
        print('%s to %s, %s, approval %s, owned by %s'
              % (plan.get('planned_start'), plan.get('planned_end'), plan.get('status'),
                 stage_of(plan, bind.approval_stages), plan.get('owner') or 'nobody'))
    else:
        err('no WorkPlan record carries quarter %s, so nothing in the model states which epics '
            'the quarter committed to' % q.fiscal)
    bridged = sorted(w['id'] for w in items if w.get('_source'))
    if bridged:
        print('Read from AAW work items as well as work_item.yaml: %s.' % ', '.join(bridged))
    for note in notes:
        warn(note)

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
                  r.get('note') or ''] for r in q.calendar], wrap={3: 44}))
    print('  %d working days across %d period%s. Generic non-working time, being public '
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
    print("  Out of scope is the part of available given to work outside the quarter's "
          'enabler scope. Enabler is available less out of scope.')
    print(table(head,
                [[people[s]['name'], people[s]['role'], '%.0f%%' % people[s]['alloc'],
                  '%.1f' % people[s]['gross'], deduct(people[s]['leave']),
                  deduct(people[s]['absence']), '%.1f' % people[s]['available'],
                  '%.1f' % people[s]['out_of_scope'],
                  '%.1f' % people[s]['enabler']] for s in q.order],
                ['total', '', '', '%.1f' % sum(p['gross'] for p in people.values()),
                 deduct(sum(p['leave'] for p in people.values())),
                 deduct(sum(p['absence'] for p in people.values())),
                 '%.1f' % sum(p['available'] for p in people.values()),
                 '%.1f' % sum(p['out_of_scope'] for p in people.values()),
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

    integrity_errors = len(errors)

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
    register = load_register(bind)
    in_scope = [w for w in items
                if w['id'] in to_epics or w['id'] in committed or w.get('quarter') == q.fiscal]
    before = len(errors)
    checked = register_rules(in_scope, register, err)
    breaches = len(errors) - before
    print('  Register rules: %d product%s checked against the register, %s.'
          % (checked, '' if checked == 1 else 's',
             'none in breach' if not breaches else
             '%d breach%s, listed below' % (breaches, '' if breaches == 1 else 'es')))
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

    # ---------------------------------------------------------------- 7. the approval
    print('\n7. APPROVAL')
    approval_section(q, plan, by_id, committed, integrity_errors)

    # ----------------------------------------------------------------- 8. the framing
    print('\n8. FRAMING')
    ladder = load_ladder(bind)
    epics = [by_id[w] for w in sorted(committed) if w in by_id]
    framing_section(epics, register, ladder, err, warn)

    # -------------------------------------------------------------------- 9. the close
    if has_close(epics):
        print('\n9. CLOSE')
        close_section(epics, register, base, ladder, err)

    # ------------------------------------------------------------------------ apply
    if args.apply:
        if not fixes:
            print('\nnothing to apply: every recorded budget already follows from the '
                  'distribution.')
            return 0
        path = work_item_path(bind)
        shutil.copy2(path, path + '.bak')
        text = io.open(path, encoding='utf-8').read()
        text, written = apply_budgets(text, dict(fixes))
        io.open(path, 'w', encoding='utf-8', newline='\n').write(text)
        print('\napplied budget_points to %s. Backup at work_item.yaml.bak.'
              % (', '.join(written) if written else 'nothing'))
        for wid, _ in fixes:
            if wid in written:
                continue
            src = by_id.get(wid, {}).get('_source')
            if src:
                print('  %s is read from %s, which --apply does not write because a work item '
                      'is versioned by its own protocol. Set budget_points there by hand'
                      % (wid, os.path.relpath(src, bind.base)))
            else:
                print('  %s has no record in work_item.yaml to write to; add one by hand' % wid)
        print('  Now compose the roadmap, regenerate the derived views, and re-run this check.')
        return 0

    print()
    if errors:
        for e in errors:
            print('  ERROR %s' % e)
        print('\nintegrity: %d error%s. Levels 1 to 4 must agree before levels 5 and 6 mean '
              'anything, every product must be typed from the register, level 7 must claim no '
              'more than the records beneath it, and the framing must stay on the ladder.'
              % (len(errors), '' if len(errors) == 1 else 's'))
        if fixes:
            print('Re-run with --apply to write the derived budget_points onto the epics.')
        return 1
    if warnings:
        print('%d warning%s, listed in the sections above. Warnings do not fail the run.'
              % (len(warnings), '' if len(warnings) == 1 else 's'))
    print('integrity: the chain closes from the calendar through to the products.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
