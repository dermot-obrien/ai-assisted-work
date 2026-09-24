# Planning (Phase 3)

Turn the refined scope and the recorded decisions into an execution plan. Write operations
throughout.

Product-based planning: name what will exist at the end, then derive the work that makes it
exist. The steps below are in order for a reason, and the order is the method.

## Step 3.0: Confirm the level

| Level | Test | Then |
|-------|------|------|
| `epic` | Lands inside one planning period, three months at most | Plan it here |
| `workstream` | Cannot land in one period; accretes scope; may never end | Decompose into epics first, then plan each epic |

Set `work_item_level` and, for an epic under a workstream, `parent_work_item_id`. An epic that
keeps growing during planning was a workstream all along: stop, promote it, and split.

## Step 3.1: Determine work type and complexity

| If the work involves | Type |
|----------------------|------|
| Code, tests, deployments | `development` |
| Diagrams, specifications, decisions | `architecture` |
| Research, analysis, recommendations | `consultancy` |
| More than one of the above | `mixed` |

| Complexity | Indicators | Approach |
|------------|------------|----------|
| Simple | 1 to 3 deliverables, clear scope | Single activity |
| Medium | 4 to 10 deliverables, some unknowns | Multiple activities |
| Complex | 10 or more deliverables, significant unknowns | Escalate to BMAD |

## Step 3.2: Name the products (the product breakdown)

List what will exist at the end that does not exist now. Do this before thinking about
activities at all. If no product can be named, there is nothing to plan and the work item
should not have been opened.

A product is tangible and verifiable by someone other than its author: a document, a diagram,
a running service, a dataset, a decision of record. An outcome counts when it is measurable,
because then it can be checked. "Ran the workshop" is not a product. "Workshop decisions
recorded and agreed by the named approver" is.

### Resolve the type register first

Read `deliverables_register` from `.aaw-config.yaml`. It is optional and null after a fresh
install.

**No register configured.** Write `quality_criteria` and `approver` inline on each product,
and leave `type` null. This is the default and is fully supported.

**A register is configured.** It points at a file, CSV or YAML, of deliverable types, each
with at least an id, a name, a purpose, quality criteria, a quality method and an approver.
Then:

- Pick each product's `type` from the register rather than inventing a bespoke one. If the
  register marks types as standard or non-standard, only commit to standard ones.
- The product inherits the type's quality criteria, quality method and approver. Do not
  restate them on the product; set a field on the product only where it genuinely differs
  from the type, and say why.
- If nothing in the register fits, say so and ask whether to add a type to the register or
  proceed with an inline product. Do not quietly invent a type id.

The register is the organisation's agreed set of things it produces, which is what makes
quality criteria consistent across work items instead of re-argued each time.

### Fields on each product

| Field | Meaning |
|-------|---------|
| `id` | `WI-NNN-D{N}` |
| `type` | Type id from the register, or null |
| `name` | What will exist at the end |
| `why_needed` | Why the work item fails without it |
| `quality_criteria` | Testable statements a reviewer can check, not aspirations. Inherited from `type` where a register is configured |
| `approver` | Who accepts it. Inherited from `type` where a register is configured. Null means the work item owner |
| `state` | `planned`, `drafted`, `in_review`, `accepted`. Tracks the product |
| `approval` | `draft`, `validated`, `approved`. Tracks the planning record |

Keep `state` and `approval` apart. `state` is the thing; `approval` is the plan for the thing.
That is what distinguishes a draft plan for a finished product from an approved plan for one
not yet started.

## Step 3.3: Declare the product flow

For each product, list the products on this same work item that must exist before it can
start, as `depends_on`. That is the product flow, and it is independent of who does the work.

## Step 3.4: Compose the definition of done

Do not author it separately. The work item is done when every product has reached `accepted`
against its own quality criteria. Composing it this way means the plan and the done criteria
cannot drift apart.

## Step 3.5: Derive the activities

Only now. For each product, ask what has to happen for it to exist, and make those the
activities. An activity is the unit of assignment: tasks within one run sequentially, separate
activities can run in parallel.

- Every activity sets `produces` to a product declared on this work item. This is required
- An activity that produces nothing is invalid. Split it, fold it into another, or name the
  product it was really for
- Several activities may feed one product. One activity never feeds several; if it does, it is
  two activities
- The activity graph is derived from the product flow. If D2 depends on D1, activities
  producing D2 depend on those producing D1. Where the two graphs disagree, the product flow
  is right and the activity graph is wrong
- Group sequential tasks into the same activity, put independent work into different
  activities, minimise cross-activity dependencies, and give every activity a clear done state

## Step 3.6: Write plan.md

From `assets/templates/plan.md`:

1. Problem statement, from the refined scope
2. Approach, from the decisions
3. Product breakdown, with quality criteria and approvers
4. Product flow
5. Definition of done, composed from the products
6. Activities with their tasks, each naming the product it produces
7. Activity dependencies, derived from the product flow
8. Risks and mitigations
9. Verification approach

## Step 3.7: Initialise progress.yaml

From `assets/templates/progress.yaml`:

1. Set `work_item_id`, `title`, `type`, `work_item_level` and, where it applies,
   `parent_work_item_id` and `planning_period`
2. Set `status: planning`
3. Populate the top-level `deliverables` array from the product breakdown, every entry at
   `state: planned`
4. Populate the `activities` array from `plan.md`, each with its `produces`
5. Set `artifacts.jira` to the URL captured in Scoping, or null if skipped

## Step 3.8: Initialise changes.md

From `assets/templates/changes.md`:

1. Set the work item ID and title
2. Create an empty Deliverables Index table
3. Create one section per activity, all pending
4. Set `artifacts.changes` to `"./changes.md"` in `progress.yaml`

This document is updated during execution to track every workspace file created or modified,
and it is what the release changelog and the PR description are built from.

## Step 3.9: Present the plan for approval

```
Work Item: WI-003 - {Title}
Type: {development/architecture/consultancy/mixed}
Location: {work_items_path}/WI-003-{name}/
JIRA: {URL or "Not linked"}
Branch: wi/WI-003-{name} (will be created at execution start)

Summary: {From scope.md}

Products (what will exist at the end):
  WI-003-D1: {Name} — accepted by {approver}
  WI-003-D2: {Name} — accepted by {approver}, needs D1

Product Flow:
  WI-003-D1 ──> WI-003-D2

Definition of Done: every product above reaches `accepted` against its quality criteria.

Activity Graph (derived from the product flow):
  WI-003-A1 (Discovery) ──┬──> WI-003-A3 (Synthesis)
  WI-003-A2 (Analysis)  ──┘

Activities:
  WI-003-A1: {Title} ({N} tasks, {effort})
      → Produces: WI-003-D1
      → Can start immediately
  WI-003-A2: {Title} ({N} tasks, {effort})
      → Produces: WI-003-D1
      → Can run parallel with A1
  WI-003-A3: {Title} ({N} tasks, {effort})
      → Produces: WI-003-D2
      → Requires A1 and A2 complete (D2 depends on D1)

Documents Created:
  ✓ scope.md (required - stakeholder specification)
  ✓ scope-ai.md (recommended - AI agent addendum)
  ✓ research.md (has research findings)
  ✓ decisions.md (has decision record)
  ✓ plan.md (required)
  ✓ progress.yaml (required)
  ✓ changes.md (required - for release changelog)

Ready to begin execution?
```

## The light path for a change

A work item classified as a change gets a short `progress.yaml` and a one-paragraph plan,
nothing else. It still names at least one product, because a change with no product is a
chore. Skip Steps 3.1, 3.3 and 3.4, write only what the change needs, and move to
Execution. Do not produce a full `plan.md`, an activity graph or an approval script for a
change.

## Escalating a complex work item

If the analysis shows 10 or more deliverables and significant unknowns, the work item is a
candidate for BMAD:

1. Complete Scoping so `scope.md` exists
2. Tell the user: "This work item is complex enough to benefit from BMAD. Run
   `/bmad:bmm:workflows:create-tech-spec` or `/bmad:bmm:workflows:create-prd`"
3. The work item folder becomes the container for the BMAD artifacts
