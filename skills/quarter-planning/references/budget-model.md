<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# How a quarter's budget is determined

A quarter's budget is not set. It is derived, from the calendar and from who is on the
quarter, and every step of the derivation names the input it came from. This document is the
contract: what each register must hold, what the arithmetic does with it, and what is
deliberately not configuration.

## Configuration, data, and arithmetic

Three different things, kept apart on purpose.

**Arithmetic** is the ladder below. It is the same everywhere and lives in `src/capacity.py`,
in one place, because three tools once derived a person's capacity three ways and disagreed by
a tenth of a point: small enough that nothing looked wrong, large enough to fail an equality
check.

**Configuration** is where a workspace keeps its registers, how its quarters are named, and
what commands rebuild its derived views. It changes when a workspace reorganises, which is
rarely. It lives in `[suite.quarter-planning]` of `.agents/skill-bindings.toml`, and
`inputs.toml` lists every key.

**Data** is the assumptions: working days, usable fraction, person-days per point, expected
absence. These are NOT configuration, and putting them in a config file would be a mistake.
They change every quarter, they are the figures most worth arguing about, and each one needs
the reasoning that produced it recorded beside it. So they are rows in the planning basis
register, each carrying its own `basis` text, and they are reviewed the way a plan is reviewed
rather than edited the way a setting is edited.

The test for which bucket something belongs in: if someone should have to justify it, it is
data.

## The registers

Three per quarter, at the `basis`, `calendar` and `resourcing` bindings. Column names are the
contract; file names and directories are not.

### Planning basis: `parameter,value,unit,basis`

One row per assumption. `basis` is prose, and is not optional in practice: a parameter with no
recorded reasoning is a number nobody can argue with.

| Parameter | What it is |
|---|---|
| `working_days` | Working days in the quarter, after non-working time |
| `usable_fraction` | The share of a working day that reaches planned work. Focus factor |
| `person_days_per_point` | What one point costs in person-days. The unit of the currency |
| `points_at_full_allocation` | Derived, and declared so it can be checked: `working_days * usable_fraction / person_days_per_point` |
| `expected_absence_days_per_person` | Unplanned absence, actuarial rather than known |
| `enabler_capacity_points` | Declared total, checked against the resourcing register |
| `quarter_budget_points` | What has been distributed to epics, checked the same way |
| `unallocated_capacity_points` | What is deliberately held back |

The last three are declarations, not inputs. The run derives each from the registers and fails
if the declaration disagrees, so a hand edit to a plan document cannot quietly become the
truth.

### Calendar: `period_id,type,start,end,working_days,note`

Periods and their working days. A row with `type: non_working` is a shutdown. Everything else
is a working period.

The skill knows no jurisdiction's holidays and does not want to. It counts the weekdays the
date range spans, subtracts the working days declared and the shutdown weekdays, and calls
whatever remains public holidays. A workspace states its own non-working time by declaring
fewer working days than the calendar has weekdays.

### Resourcing: one row per person per work item

`stakeholder_id,name,role,allocation_pct,gross_capacity_points,leave_working_days,`
`adjustment_points,capacity_points,work_item_id,share_of_allocation_pct,`
`counts_against_enabler_capacity,adjustment_reason`

The register states what is known: who, at what allocation, with what booked leave, and how
their allocation splits across work items. The points columns are stated too, and they are
checked against the derivation rather than trusted, so a hand edit that does not follow from
the allocation is caught where it was made.

Two columns carry more weight than they look:

- `leave_working_days` is the input; `adjustment_points` is derived from it. Leave is stated
  in days because that is what a person books, and the points deduction follows. Stating both
  independently is how they drift.
- `counts_against_enabler_capacity: no` marks a dedication outside the scope being budgeted.
  It reduces what the person brings rather than disappearing, so it is carried as out-of-scope
  and excluded from the distribution.

A person's `share_of_allocation_pct` rows must total 100. Anything less means part of their
allocation is unaccounted for, and the run says so.

## The ladder

Top down, which is the position the method takes: the period is fixed, capacity follows from
it, and scope varies against capacity.

```
working_days x usable_fraction / person_days_per_point
    = points at 100 percent allocation          [planning basis]

per person:
    gross      = allocation_pct x points at 100 percent
    less leave = leave_working_days, converted at the same rate
    = net capacity                               [checked against the register]
    less expected absence, scaled by allocation
    = available                                  [what can be given to an epic]

per row:
    available x share_of_allocation_pct
    -> the epic named, when the row counts
    -> out of scope, when it does not

sum of everything distributed to an epic
    = ENABLER CAPACITY                           [the fixed cost scope varies against]
    = quarter_budget_points + unallocated_capacity_points
```

Rounding happens once, at display. Every figure is carried unrounded, because summing figures
that have already been rounded is what produced the original disagreement. The `tolerance`
binding absorbs float representation only, not real drift.

Expected absence sits at the quarter level rather than in the register because it is
actuarial. Nobody can name the days they will be unexpectedly absent, so it is a single
parameter scaled by allocation. Booked leave, which people do know, stays in the register.

## Reading the budget back

```bash
python <skills>/quarter-planning/bin/quarter.py --quarter <slug> --budget
```

Prints the ladder with each step's source, the per-epic split, and whether the three declared
totals reconcile. `--where` prints the resolved inputs and reads none of them, which is the
first thing to run when a figure comes from a file you did not expect.

An epic's budget is the sum of what people gave it. The epic's own `budget_points` records
that, and is checked against the distribution; `--apply` writes the derived figure onto the
epics when the distribution has moved and the recorded budgets are behind it.

## Where this leaves scope

Budget is what an epic may spend. Planned points are what it intends to produce, rolled up
from the named products at their register sizes. The epic is the only place the two meet, and
they are compared, never reconciled.

Planned above budget is a scoping decision. It is not a request for more capacity, because
capacity was derived from a calendar and a set of people, and neither moves because a plan
would prefer them to.
