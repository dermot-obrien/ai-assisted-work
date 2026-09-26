---
name: quarter-planning
description: Plan and maintain a quarter in two stages, deriving a budget of points from the calendar and the resourcing register, allocating it down to epics, then elaborating deliverables and rolling their sizes up. Frames an epic against its capability lane and the definition ladder, names its products from the deliverable register, generates epic cards, and interprets the integrity checks. Use when planning or replanning a quarter, reporting or setting a quarter budget, framing or sizing an epic, setting budget_points, naming deliverables on a work item, generating epic cards, closing a quarter, or reconciling plan documents with the model.
license: CC-BY-4.0
compatibility: Python 3.11 or newer, and PyYAML. Reads the planning registers, the model sources and the deliverable register at whatever paths [suite.quarter-planning] in the workspace .agents/skill-bindings.toml declares. Those six paths are required and have no default, so the skill carries no directory layout; it assumes no jurisdiction's holidays either.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "3.1.0"
---

# Quarter Planning

Plans a quarter, and keeps the plan honest afterwards. It does not decide scope.

## The rule that governs everything

The model is the source of truth and everything else is derived from it. Never type a figure
into prose that a script can compute, and never publish a view that cannot be derived.

Each row below is a binding key, not a path. All six are required and none has a default,
because a default would be whichever workspace this skill was written in. Declare them in
`[suite.quarter-planning]` of `.agents/skill-bindings.toml`; `--where` shows what they
resolve to, and names the ones still undeclared, without reading any of them.

| Holds | Binding key | Authoritative for |
|---|---|---|
| Epics and their products | `sources` → `work_item.yaml` | `budget_points`, `planned_points`, the `deliverables` each epic names |
| Stories | `sources` → `activity.yaml` | Who is assigned. Not sizing |
| Product sizes | `register` | `base_story_points` per type, and the `used` flag |
| The quarter's assumptions | `basis` | Working days, usable fraction, person-days per point, expected absence, and the three totals the registers must reproduce |
| Non-working time | `calendar` | Working days per period. Public holidays and any shutdown are whatever the weekdays exceed these, so no jurisdiction is assumed |
| Capacity | `resourcing` | Points per person, and which allocations count |

Four more keys are optional, and a workspace that declares none of them validates exactly as
before. Each one opts in to something:

| Key | Opts in to |
|---|---|
| `ladder` | Judging each epic's framing against the definition ladder, a CSV of `rung,name,description` in ascending order |
| `epicsDir` | Linking each generated card to the epic's own hand-written folder |
| `cardsDir` | `--cards`, which writes the epic cards and the stage grid. May carry `{quarter}` |
| `workItemsDir` | Reading epics from AAW work items' `progress.yaml` as well as `work_item.yaml` |

Derived, never hand-edited: the epic cards and the stage grid, which this skill generates
with `--cards`, the capacity-load and epic-load views under the `quarterDir` binding, any
planning deck, and every figure quoted in the plan documents. A workspace lists its own
derived outputs; this skill only insists they are derived.

Regenerating what the model derives is the workspace's own job, not this skill's. Where the
binding names `commands.regenerate` and `commands.check`, run those; otherwise ask what this
workspace uses. A workspace that keeps a manifest of what depends on the model should add to
it in the same change as any new generator, not afterwards.

## The two stages

Read the workspace's planning playbook, at the `playbook` binding if it declares one, before
the first use. In short:

Stage 1, budget. Each epic is given `budget_points`, allocated down from each person's
enabler capacity split across the epics they work on. Set before stories exist. The epic
knows what it may spend, not what it will produce.

Stage 2, elaboration. The epic names its deliverables, each takes its points from its type in
the register, and those roll up into `planned_points`. The epic now knows what it intends to
produce and what that is worth.

The epic is the only place the two meet. They are compared, not reconciled. Planned above
budget is a scoping decision, never a request for more capacity: time and cost are fixed and
scope varies. An epic with no `budget_points` has been allocated no capacity, so its products
are deferred and cannot load anyone's quarter.

## Arguments

| Argument | What it does |
|---|---|
| none, or `status` | Budget against planned per epic, load against capacity per person, and what currently fails |
| `frame EP-NNN` | Frame one epic: lane, criterion, rung movement, products |
| `size EP-NNN` | Name or revise the products on one epic and set its budget |
| `budget` | Report the top-level budget and the ladder it comes down, and stop. Read only |
| `validate` | Validate the whole chain: period, resources, quarter budget, epic budgets, elaboration, load, approval, framing, and the close once recorded. Read only |
| `cards` | Regenerate the epic cards and the stage grid, then check them. Needs `cardsDir` |
| `close` | Record what each flow reached and what each product took, then read section 9 |
| `approve <record> <stage>` | Move a WorkPlan, an epic or a product to an approval stage, then validate. Only on the user's say-so |
| `check` | Run the checks and interpret the output |
| `reconcile` | Regenerate the derived views, then align the plan documents to them |

## Report the budget

```bash
python <skills>/quarter-planning/bin/quarter.py --quarter <slug> --budget
```

A workspace usually wraps that in a script of its own, so the command people type is short.
`--where` prints the inputs the binding resolves to, and reads none of them, which is the
first thing to run when a figure comes from a file you did not expect.

One question answered: what may this quarter spend, and which input produced each step of that
figure. Every line names its source, so a figure that looks wrong is argued with at the step
that made it. It ends with the per-epic split and a confirmation that the three totals the
planning basis declares match what the registers derive, or the errors if they do not.

Use this for the conversation about whether the quarter can hold the work. Use `validate` when
something has moved and you need to know what disagrees.

## Validate the budget

```bash
python <skills>/quarter-planning/bin/quarter.py --quarter <slug>
```

One report, read top down, because that is the only direction the arithmetic runs:

| Section | Answers |
|---|---|
| 1 Period | How many working days the quarter has once public holidays and any shutdown come out, and what a person at 100 percent is therefore worth |
| 2 Resources | Who is on the quarter, at what allocation, less their own leave, less any dedication outside enabler work. Ends at the quarter's capacity |
| 3 Quarter budget | How much of that capacity has been distributed, and how much is still held |
| 4 Epic budgets | Each epic's budget derived from the distribution, against what the epic records, and who it comes from |
| 5 Elaboration | Named products against the budget each epic was given |
| 6 Load | Each person's owned products against the capacity they brought |
| 7 Approval | How far the plan, each committed epic and each of its products have been approved, and what is ready for approval |
| 8 Framing | Each committed epic's lane and flows, and whether its products evidence the rungs it commits to |
| 9 Close | Committed against reached per flow, planned against actual per product, and a recalibration hint per type. Only once recorded |

Sections 1 to 4 are integrity. A disagreement there means the model contradicts itself and the
run exits non-zero, because nothing below it means anything until it is fixed. Sections 5 and
6 are subscription: over is a scoping decision, not a defect, so they report and the run still
passes. Positive is under, negative is over, in both. Section 5 also enforces the register
rules, which are integrity: a product whose type is not in the register, a type the register
does not mark used, or an explicit `points` with no `points_override_reason` fails the run.
Section 7 is integrity again, but only for claims: an approval the records beneath it do not
support fails the run. Section 8 fails only on a rung the ladder does not name or a movement
down it, and warns on the rest. Warnings are printed where they arise and never fail the run.

`--apply` writes the derived `budget_points` onto the epics when the distribution has moved
and the recorded budgets are behind it. It takes a `.bak` first and replaces only that one
value on that one line, or inserts the line after the record's id where the record has none.
Any id works, not only `EP-NNN`. It patches text rather than round-tripping the YAML, which
would drop every comment in the file. An epic read from a work item's `progress.yaml` is not
written, because that file is versioned by its own protocol; set it there by hand. Compose
the roadmap and regenerate the views afterwards.

The arithmetic lives in `src/capacity.py` and nowhere else. Anything else that needs to know
what a person's capacity is imports it rather than recomputing, because three tools once
derived it three ways and disagreed by a tenth of a point: small enough that nothing looked
wrong, large enough to fail an equality check.

What has to be in place before the report means anything:

- A `WorkPlan` record for the quarter, `plan_type: quarterly`, carrying `quarter`, the dates
  and the committed `work_item_ids`. Without it nothing in the model states which epics the
  quarter committed to.
- `enabler_capacity_points`, `quarter_budget_points` and `unallocated_capacity_points` declared
  in the planning basis. They are checked against the registers, not trusted.
- `leave_working_days` on each person's rows in the resourcing register. Leave is stated in
  working days and the points deduction is derived, so the two cannot drift.

## Approval stages

A plan is approved in stages, and each stage is recorded on the model record it approves, in an
`approval` field, never in a register or a document. The same stages apply at every level:

| Stage | Means |
|---|---|
| `draft` | Written, not yet checked. The default when the field is absent |
| `sized` | The size is agreed: for a product its points, for an epic that its products are named and sized |
| `validated` | Checked and ready for approval |
| `approved` | Approved, and approval is commitment. Nothing further records commitment |

Where each level records it:

| Level | Record | `approved` means |
|---|---|---|
| Quarter budget and resourcing | The quarterly `WorkPlan` | The resourcing, and the budget derived from it, are approved. One mark covers both, because the budget is calculated from the resourcing |
| Epic | The `WorkItem` | The epic as written is approved: goal, value, dependencies, framing. Its budget needs no mark of its own, because it follows from the approved resourcing |
| Product | Each entry in the epic's `deliverables` | The product as defined is approved. Distinct from `state`, which tracks the product itself |

Section 7 enforces three rules, each because breaking it means the model contradicts itself:

- An epic is never further on than its least advanced product.
- An epic is not `approved` until the quarter's `WorkPlan` is, because the budget it commits
  to comes from the approved resourcing.
- An epic past `draft` names at least one product.

A workspace with different stage names declares them, least advanced first, as
`approvalStages` in its binding. The last stage is always read as approval and commitment.

When the resourcing or the distribution changes after the `WorkPlan` is approved, set it back
to `validated` and approve it again. The report flags an approved plan whose sections 1 to 4
no longer agree, but it cannot see a change that leaves them agreeing, so this one is a
discipline, not a check.

## The definition ladder and framing

The unit of progress is a rung on the workspace's definition ladder. Each rung names the
artefact that proves it, so a rung is a claim that can be checked rather than a statement of
effort. Bind the ladder as `ladder`, a CSV with the columns `rung`, `name` and `description`,
one row per rung, least defined first. The skill ships no ladder, because which rungs a
workspace recognises is its own method.

Framing lives on the epic record in the model:

| Field | Holds |
|---|---|
| `lane` | The capability area the epic advances. One per epic |
| `flows` | One entry per flow: `flow`, an optional `description`, `rung_from` and `rung_to` |
| `advances_criterion_ids` | The criteria the epic advances. Empty is reported, not failed |
| `home` | The epic's own folder, by name, under `epicsDir` |

The register's optional `rung` column says which rung each product type evidences. Section 8
joins the two:

| With `ladder` bound | Result |
|---|---|
| A `rung_from` or `rung_to` the ladder does not name | Fails the run |
| `rung_to` below `rung_from` | Fails the run |
| A target rung that no product's type evidences | Warning |
| No `lane` | Warning |

With no ladder bound, section 8 lists the flows as recorded and judges nothing.

## Epic folder and epic card

An epic has two faces, kept apart on purpose.

| | Epic folder | Epic card |
|---|---|---|
| Where | `<epicsDir>/<home>/` | `<cardsDir>/<id>.md` |
| Written by | Hand | `--cards`, from the model |
| Lifetime | The epic's whole life, across quarters | One quarter |
| Holds | Framing, scope decisions, dependencies, what was left out, and discovery | The rung movement, the products with their types, rungs, points, states and approvals, and budget against planned |

The folder is where the epic is driven from and where its thinking accumulates. The card is a
view: every figure about the epic and no prose that was not generated, so it cannot drift from
the model. Never edit a card. Change the model or the folder, then regenerate.

```bash
python <skills>/quarter-planning/bin/quarter.py --quarter <slug> --cards
python <skills>/quarter-planning/bin/quarter.py --quarter <slug> --cards --check
```

The first writes one `<id>.md` per committed epic and a `README.md` holding the stage grid and
the epics table. The second writes nothing and exits non-zero if any file is stale, so it can
sit beside a workspace's other checks. What a card holds, and the recommended outline of an
epic folder's index page, are in [references/epic-cards.md](references/epic-cards.md).

## Epics from AAW work items

An epic opened with `aaw-start-work` lives in `<work items>/WI-NNN/progress.yaml`, not in the
composed `work_item.yaml`. Bind `workItemsDir` and the skill reads both: every `progress.yaml`
with `work_item_level: epic` and a `planning_period` equal to the quarter's label becomes an
epic record.

| progress.yaml | Read as |
|---|---|
| `work_item_id` | `id` |
| `title`, `budget_points`, `planned_points`, `lane`, `flows`, `home`, `approval` | The same |
| Deliverable `type` | `deliverable_id` |
| Deliverable `owner` | `owner_stakeholder_id` |
| Deliverable `id`, `name`, `points`, `points_override_reason`, `state`, `approval`, `actual_points` | The same |

Where both stores hold the same id, `work_item.yaml` wins and the clash is a warning. A work
item's epic still needs the quarter's WorkPlan to name it, and a row in the resourcing
register to give it a budget.

## Close the quarter

At the quarter's end, record what happened on the model records:

- `rung_reached` on each flow, from the evidence that exists, never from the effort spent.
- `actual_points` on each product, what it actually took.

Once any is recorded, the validation adds section 9: each flow committed against reached
(reached, short or beyond), each product planned against actual, and per register type the
mean ratio of actual to base points. That ratio is a hint for recalibrating the register, not
a correction to it: change a type's base points deliberately, in the register, with the
reasoning. Section 9 is read only. Carry anything unfinished into the next quarter as its
starting rung.

## Status

1. The workspace's `commands.check`, and read the assignment block it prints first.
2. For each committed epic, report `budget_points` against the sum of its products.
3. Report each person's load against capacity from the derived capacity-load view.
4. State the gap in points, and which epics carry it. Do not propose the cut.

An epic with no `budget_points` is deferred. Say so rather than reporting it as over.

## Frame an epic

Follow the workspace's governing planning method, at the `playbook` binding where one is
declared. That method governs and this skill only carries the mechanics. Establish, in this
order:

1. The capability area and the named flows the epic advances. One lane per epic.
2. The `Criterion` ids it advances, as `advances_criterion_ids`. This is the join between
   ends and means.
3. The rung movement on the Definition Ladder, from and to, per flow.
4. What will be true at the end of the quarter that is not true now. If the value statement
   is circular, the epic is unframed.
5. The products that make it true, from the register.

Record 1 to 3 on the epic's model record, as `lane`, `advances_criterion_ids` and `flows`,
so section 8 can check them. Write 4, and the reasoning behind all of it, in the epic's own
folder under `epicsDir`, following the outline in
[references/epic-cards.md](references/epic-cards.md). The card then carries the figures and
the folder carries the argument.

Two things a framing must surface, because they are the ones usually missed: a flow at a low
rung that the outcome statement does not mention, and a two-sided shape where a provider and
a consumer are joined by a contract.

## Name products on an epic

Each entry on `WorkItem.deliverables` carries `id` as `EP-NNN-DN`, `deliverable_id` from the
register, a `name` for the instance, `why_needed`, `owner_stakeholder_id`, `quality_criteria`
for that instance only, and `state`.

Rules that section 5 enforces, so check them before writing:

- The type must be in the register, and where the register has a `used` column, marked
  `Yes`. A retired type fails the run. Retired ids are not reissued, so an id absent from the
  register is not a typo to fix by inventing one.
- `points` omitted means the type's base points, not zero. Set it only to override.
- Any explicit `points` needs a `points_override_reason`, and the check fails without one.
- A product already produced carries `points: 0` with the reason, so it is recorded without
  consuming capacity.
- A product no story produces warns rather than fails. That is deliberate: some products are
  authored elsewhere and architecture's condition is receipt.

## Regenerate and check

```bash
<commands.regenerate>    # rebuilds the derived views from the model
<commands.check>         # fails on any prose that disagrees with them
```

Then reconcile the quarter's plan documents, whatever the workspace keeps under the
`quarterDir` binding, to the regenerated views. Where a sentence asserts something the new
figures contradict, rewrite the sentence rather than swapping the number. "The team is full
and the reserve is gone" is a claim, not a figure.

## Interpreting the check

| Message | What it means | What to do |
|---|---|---|
| `X records planned_points N but its deliverables sum to M` | The epic record disagrees with its own products | Set `planned_points` to the sum, or fix the products |
| `X is loaded to N against M of capacity` | Over-subscription | Not a tooling fix. Cut scope, or record the decision not to |
| `X names deliverables worth N but has no budget_points` | Stage 1 has not been done for that epic | Allocate a budget, or confirm it is deferred |
| `deliverable X is declared on Y but its id does not belong to it` | Structural break in `work_item.yaml`: a block has been cut across a record boundary | Repair from `roadmap.yaml`, which holds the composed copy |
| `overrides its type sizing with N points but records no reason` | `points` set without `points_override_reason` | Add the reason |
| `D on X is typed T, which is not in the register` | A product typed outside the register | Pick a type the register holds. Never invent an id |
| `D on X is typed T, which the register marks used No` | A retired type | Retype the product from a type in use |
| `D on X names no type from the register` | A product with no `deliverable_id` | Type it |
| `X flow F records rung_to R, which the ladder does not name` | A rung outside the bound ladder | Fix the rung, or the ladder |
| `X flow F moves down the ladder, from A to B` | A movement that loses definition | Fix the rungs. A rung lost is recorded at close, not planned |
| `WARNING X commits a flow to R but names no product whose type evidences R` | Nothing planned would show the rung was reached | Name a product of a type that evidences R, or lower the commitment |
| `WARNING X records no lane` | The capability area is unstated | Set `lane` |
| `WARNING X is recorded in both work_item.yaml and ...` | Two records for one epic | Remove one. `work_item.yaml` is used meanwhile |
| `Stale epic cards for Q` | A card no longer matches the model | Run `--cards` and commit the result |
| `<file>.csv has X; the model gives Y` | A derived view is stale | `commands.regenerate` |
| `<file>.md says X; the derived view has Y` | Prose has drifted from the model | Fix the prose, never the view |
| `activity X is assigned but has no estimate` | Warning. Sizing lives on products, not activities | Usually nothing |
| `X is recorded S but its product Y is only T` | An epic's approval runs ahead of one of its products | Bring the product up, or the epic back |
| `X is recorded approved, which is commitment, but the quarter budget and resourcing are S` | An epic committed before the budget it commits to | Approve the WorkPlan first, or set the epic back |
| `X records approval V, which is not one of ...` | A stage the workspace has not declared | Fix the value, or declare the stage in `approvalStages` |
| `The quarter budget is recorded approved, but levels 1 to 4 no longer agree` | What was approved has moved | Fix sections 1 to 4, then approve again |

## Failure modes, learned the hard way

Never edit `work_item.yaml` by text range. A block delete that runs past a record boundary
silently removes whole work items and orphans their deliverables onto a neighbour. Parse,
edit the structure, serialise. If it happens, `roadmap.yaml` holds the composed copy of every
record, including working-tree edits, and is the recovery source.

Back up the derived views before regenerating. They are untracked, so git cannot restore
them, and a regeneration from a half-migrated model writes zeros over figures that came from
a state which no longer exists.

Null is not zero. A deliverable with no `points` takes its type's base points. An activity
with no `estimate_points` is unsized, not free. Two tools that disagree about this will
compute the same quantity differently and neither will look wrong.

Never write a Unicode minus into a table the checker prints. Windows cannot encode it and the
run dies partway, which makes the error count look smaller than it is. Use an ASCII hyphen.

If a view cannot be derived from the model, retire it rather than hand-maintaining it. Hand
figures rot silently and are believed for exactly as long as nobody checks.

Prefer deriving a label over hardcoding it. A hardcoded epic label hid a name drift for weeks;
deriving it from the model's title and Jira reference surfaced it immediately.

## What this skill does not do

It does not decide scope cuts, which are the user's. It does not edit the ontology schema,
which is governed and needs asking first. It does not regenerate hand-authored diagrams. It
carries no copy of the repository's scripts and does not reimplement their arithmetic: if a
figure is wrong, fix the script that derives it.

## Related

- The workspace's planning playbook, at the `playbook` binding, which governs the method
- The deliverable register, at the `register` binding: product types, sizes, and the used-only rule
- [references/budget-model.md](references/budget-model.md), the chain from calendar to epic budget
- [references/epic-cards.md](references/epic-cards.md), what a card holds and how an epic folder is laid out
- `aaw-start-work` for opening a work item; this skill plans the quarter those work items sit in
