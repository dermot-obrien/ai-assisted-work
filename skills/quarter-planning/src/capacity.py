# SPDX-License-Identifier: Apache-2.0
"""One owner for the quarter's capacity arithmetic, imported by every tool that needs it.

Three tools used to compute the quarter's capacity: the hierarchy check from the register's
rounded capacity_points, the view generator by summing those rounded figures again, and the
quarter validator by deriving net capacity from the allocation and the leave. They disagreed
by a tenth of a point at the quarter level, which is small enough that nothing looked wrong
and large enough to fail an equality check. So the arithmetic lives here and nowhere else.

The chain runs top down, which is the PRINCE2 Agile position the planning playbook takes:

  period      calendar working days, less generic non-working time such as public holidays
  resource    allocation of that period per person, less their own leave, gives net capacity
  absence     less expected unplanned absence, which gives what is actually available
  scope       the share of each person's capacity given to each epic, which is the budget

Rounding happens once, at display. Every figure here is carried unrounded, because summing
figures that have already been rounded is what produced the disagreement.

  load(quarter) -> Quarter
  base_points() -> {deliverable type id: base points}
  product_points(deliverable, base) -> the size of one named product
"""
import csv
import datetime
import io
import os
import re

from bindings import Bindings

# Where anything lives is the workspace's business, declared in
# [suite.quarter-planning] of its .agents/skill-bindings.toml and resolved against that
# file. Nothing here assumes a directory layout. The assumptions that drive the
# arithmetic are not configuration either: they are per-quarter data carrying their own
# justification, and they live in the planning basis register the binding points at.
TOL = 0.05


def rows(path):
    with io.open(path, encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh))


def f(x, default=0.0):
    try:
        return float(str(x).strip())
    except (TypeError, ValueError):
        return default


def base_points(bind):
    """Base story points per deliverable type, from the bound deliverable register."""
    return {(r.get('id') or '').strip(): f(r.get('base_story_points'))
            for r in rows(bind.resolve('register'))}


def product_points(deliverable, base):
    """A product's size: its own points where set, otherwise its type's base points.

    Null is not zero. A deliverable with no points takes its type's base points, and an
    explicit points value is an override that the hierarchy check requires a reason for.
    """
    if deliverable.get('points') is not None:
        return f(deliverable['points'])
    return base.get((deliverable.get('deliverable_id') or '').strip(), 0.0)


class Quarter(object):
    """The period, the people, and the distribution of their capacity to epics."""

    def __init__(self, slug, bind=None):
        self.slug = slug
        self.bind = bind or Bindings(slug)
        self.fiscal = self.bind.label()
        self.dir = self.bind.resolve('quarterDir')
        self.issues = []
        basis_rows = rows(self.bind.resolve('basis'))
        self.basis = {r['parameter']: f(r['value']) for r in basis_rows}
        self.basis_text = {r['parameter']: (r.get('basis') or '') for r in basis_rows}
        self.calendar = rows(self.bind.resolve('calendar'))
        self.register = rows(self.bind.resolve('resourcing'))
        self.working_days = sum(int(f(r['working_days'])) for r in self.calendar)
        self.non_working = [r for r in self.calendar if r.get('type') == 'non_working']
        self.sprints = [r for r in self.calendar if r.get('type') != 'non_working']
        self.full = (self.basis['working_days'] * self.basis['usable_fraction']
                     / self.basis['person_days_per_point'])
        self.absence_days = self.basis.get('expected_absence_days_per_person', 0.0)
        self._people()
        self._distribute()

    def path(self, key):
        """A bound input by binding key: basis, calendar, resourcing, sources, register."""
        return self.bind.resolve(key)

    def note(self, msg):
        self.issues.append(msg)

    # ---------------------------------------------------------------- resources
    def _people(self):
        """Net capacity per person: allocation of the period, less their own leave.

        The register states gross, the adjustment and net as well. They are checked against
        the derivation rather than trusted, so a hand edit that does not follow from the
        allocation is caught where it is made.
        """
        self.people, self.order, self.shares = {}, [], {}
        for r in self.register:
            sid = r['stakeholder_id']
            self.shares[sid] = self.shares.get(sid, 0.0) + f(r['share_of_allocation_pct'])
            if sid in self.people:
                continue
            self.order.append(sid)
            alloc = f(r['allocation_pct']) / 100.0
            gross = alloc * self.full
            leave = (f(r.get('leave_working_days')) * alloc * self.basis['usable_fraction']
                     / self.basis['person_days_per_point'])
            # Expected absence is actuarial rather than known, so it is a quarter-level
            # parameter scaled by allocation, not a column in the register. The register keeps
            # stating what is known: the allocation, and the leave someone has booked. Net is
            # gross less booked leave, which is what the register records and is checked
            # against below; available is net less expected absence, and is what can be given
            # to an epic.
            absence = (self.absence_days * alloc * self.basis['usable_fraction']
                       / self.basis['person_days_per_point'])
            self.people[sid] = {'sid': sid, 'name': r['name'], 'role': r['role'],
                                'alloc': f(r['allocation_pct']), 'gross': gross,
                                'leave': leave, 'leave_days': f(r.get('leave_working_days')),
                                'net': gross - leave, 'absence': absence,
                                'available': gross - leave - absence,
                                'enabler': 0.0, 'out_of_scope': 0.0}
            if abs(gross - f(r['gross_capacity_points'])) > TOL:
                self.note('%s: the register records gross capacity %s, but a %s percent '
                          'allocation of %.1f points gives %.1f'
                          % (r['name'], r['gross_capacity_points'], r['allocation_pct'],
                             self.full, gross))
            if abs(-leave - f(r['adjustment_points'])) > TOL:
                self.note('%s: the register records an adjustment of %s points, but %s working '
                          'days of leave at %s percent allocation gives %.1f'
                          % (r['name'], r['adjustment_points'], r.get('leave_working_days'),
                             r['allocation_pct'], -leave))
            if abs(gross - leave - f(r['capacity_points'])) > TOL:
                self.note('%s: the register records net capacity %s, but gross less leave '
                          'gives %.1f' % (r['name'], r['capacity_points'], gross - leave))
            if leave and not (r.get('adjustment_reason') or '').strip():
                self.note('%s carries leave with no reason recorded' % r['name'])
        for sid, tot in self.shares.items():
            if abs(tot - 100) > 0.5:
                self.note("%s's shares of allocation total %.0f percent, not 100, so part of "
                          'the allocation is unaccounted for' % (self.people[sid]['name'], tot))

    # ------------------------------------------------------------- distribution
    def _distribute(self):
        """Each person's net capacity, split across the epics their shares name.

        A row that does not count against enabler capacity is a dedication outside this
        quarter's scope. It reduces what the person brings to enabler work rather than
        disappearing, so it is carried as out_of_scope and excluded from the distribution.
        """
        self.distribution, self.split, self.excluded = {}, {}, set()
        for r in self.register:
            sid, wid = r['stakeholder_id'], r['work_item_id']
            pts = self.people[sid]['available'] * f(r['share_of_allocation_pct']) / 100.0
            if r.get('counts_against_enabler_capacity') != 'yes':
                self.people[sid]['out_of_scope'] += pts
                self.excluded.add((sid, wid))
                continue
            self.people[sid]['enabler'] += pts
            self.distribution[wid] = self.distribution.get(wid, 0.0) + pts
            self.split.setdefault(wid, {})
            self.split[wid][sid] = self.split[wid].get(sid, 0.0) + pts

    # ------------------------------------------------------------------ figures
    @property
    def capacity(self):
        """The quarter's enabler capacity. The fixed cost that scope varies against."""
        return sum(p['enabler'] for p in self.people.values())

    def budget(self, known_ids):
        """What the distribution gives to work items the model knows about."""
        return {k: v for k, v in self.distribution.items() if k in known_ids}

    def reserve(self, known_ids):
        """Capacity counted for the quarter but distributed to no epic."""
        return {k: v for k, v in self.distribution.items() if k not in known_ids}

    def weekdays(self):
        """Weekdays between the first and last date the calendar covers, holidays included."""
        dates = [r[k] for r in self.calendar for k in ('start', 'end') if r.get(k)]
        if not dates:
            return 0
        first = datetime.date.fromisoformat(min(dates))
        last = datetime.date.fromisoformat(max(dates))
        return sum(1 for n in range((last - first).days + 1)
                   if (first + datetime.timedelta(days=n)).weekday() < 5)

    def working_days_lost(self):
        """How the weekdays that are not working days were lost, as a phrase."""
        shutdown = 0
        for r in self.non_working:
            a = datetime.date.fromisoformat(r['start'])
            b = datetime.date.fromisoformat(r['end'])
            shutdown += sum(1 for n in range((b - a).days + 1)
                            if (a + datetime.timedelta(days=n)).weekday() < 5)
        holidays = self.weekdays() - self.working_days - shutdown
        parts = []
        if holidays:
            parts.append('%d public holiday%s' % (holidays, '' if holidays == 1 else 's'))
        if shutdown:
            parts.append('%d shutdown weekday%s' % (shutdown, '' if shutdown == 1 else 's'))
        return ' and '.join(parts) or 'nothing'

    def leave_days(self, sid):
        return '%.0f' % self.people[sid]['leave_days']

    def person_capacity(self):
        """Enabler capacity per stakeholder id, for checking load against."""
        return {s: self.people[s]['enabler'] for s in self.order}
