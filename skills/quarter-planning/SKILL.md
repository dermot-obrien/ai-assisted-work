---
name: quarter-planning
description: Plan and maintain a quarter in two stages, deriving a budget of points from the calendar and the resourcing register, allocating it down to epics, then elaborating deliverables and rolling their sizes up. Frames an epic against its capability lane, names its products from the deliverable register, and interprets the integrity checks. Use when planning or replanning a quarter, reporting or setting a quarter budget, framing or sizing an epic, setting budget_points, naming deliverables on a work item, or reconciling plan documents with the model.
license: CC-BY-4.0
compatibility: Python 3.11 or newer, and PyYAML. Reads the planning registers, the model sources and the deliverable register at whatever paths [suite.quarter-planning] in the workspace .agents/skill-bindings.toml declares; assumes no directory layout and no jurisdiction's holidays.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "2.1.0"
---

# Quarter Planning

Plans a quarter, and keeps the plan honest afterwards. It does not decide scope.

## The rule that governs everything

The model is the source of truth and everything else is derived from it. Never type a figure
into prose that a script can compute, and never publish a view that cannot be derived.

Each row below is a binding key, not a path. Run `--where` to see where this workspace puts
them; declare them in `[suite.quarter-planning]` of `.agents/skill-bindings.toml`.

| Holds | Binding key | Authoritative for |
|---|---|---|
| Epics and their products | `sources` → `work_item.yaml` | `budget_points`, `planned_points`, the `deliverables` each epic names |
| Stories | `sources` → `activity.yaml` | Who is assigned. Not sizing |
| Product sizes | `register` | `base_story_points` per type, and the `used` flag |
| The quarter's assumptions | `basis` | Working days, usable fraction, person-days per point, expected absence, and the three totals the registers must reproduce |
| Non-working time | `calendar` | Working days per period. Public holidays and any shutdown are whatever the weekdays exceed these, so no jurisdiction is assumed |
| Capacity | `resourcing` | Points per person, and which allocations count |

Derived, never hand-edited: the capacity-load and epic-load views under the `quarterDir`
binding, the epic cards, any planning deck, and every figure quoted in the plan documents. A
workspace lists its own derived outputs; this skill only insists they are derived.

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
| `validate` | Validate the whole chain: period, resources, quarter budget, epic budgets, elaboration, load, approval. Read only |
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

Sections 1 to 4 are integrity. A disagreement there means the model contradicts itself and the
run exits non-zero, because nothing below it means anything until it is fixed. Sections 5 and
6 are subscription: over is a scoping decision, not a defect, so they report and the run still
passes. Positive is under, negative is over, in both. Section 7 is integrity again, but only
for claims: an approval the records beneath it do not support fails the run.

`--apply` writes the derived `budget_points` onto the epics when the distribution has moved
and the recorded budgets are behind it. It takes a `.bak` first and replaces only that one
value on that one line. Compose the roadmap and regenerate the views afterwards.

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

Two things a framing must surface, because they are the ones usually missed: a flow at a low
rung that the outcome statement does not mention, and a two-sided shape where a provider and
a consumer are joined by a contract.

## Name products on an epic

Each entry on `WorkItem.deliverables` carries `id` as `EP-NNN-DN`, `deliverable_id` from the
register, a `name` for the instance, `why_needed`, `owner_stakeholder_id`, `quality_criteria`
for that instance only, and `state`.

Rules that are enforced, so check them before writing:

- The type's `used` flag must be `Yes`. A retired type fails the build. Retired ids are not
  reissued, so an id absent from the register is not a typo to fix by inventing one.
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
- `aaw-start-work` for opening a work item; this skill plans the quarter those work items sit in
