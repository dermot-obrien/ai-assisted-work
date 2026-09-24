# Work Item Plan: {WI-NNN} {Title}

> Auto-generated during planning. Modify with caution.
>
> **Template placeholders**: Replace `{placeholder}` with actual values.
> Remove example activities and customize for your work item.

**Work Type:** {development | architecture | consultancy | mixed}

**Level:** {workstream | epic} — an epic lands inside one planning period, three months at
most. Anything longer is a workstream and is decomposed into epics.

<!-- Work Type Guidance:
- development: Code, tests, deployments. Use git branch, conventional commits, PRs.
- architecture: Diagrams, specs, decisions. Focus on documentation and review.
- consultancy: Research, analysis, recommendations. Track sources and deliverables.
- mixed: Combination of above. Label activities by type.
-->

## Analysis Summary

### Problem Statement

{What problem does this work item solve?}

### Current State

{What's the current situation? Why does the problem exist?}

### Proposed Approach

{High-level approach to solving the problem}

## Product Breakdown

The products this work item will leave behind. Named first; the activities below are derived
from them, never the other way round. If a product cannot be named, there is nothing to plan.

A product is tangible and verifiable by someone other than its author: a document, a diagram,
a running service, a dataset, a decision of record. An outcome counts when it is measurable,
because then it can be checked.

| ID | Product | Why it is needed | Quality criteria | Approver | State |
|----|---------|------------------|------------------|----------|-------|
| WI-NNN-D1 | {What will exist at the end} | {Why the work item fails without it} | {Testable, not aspirational} | {Who accepts it} | planned |
| WI-NNN-D2 | {...} | {...} | {...} | {...} | planned |

## Product Flow

The order the products must be built in, independent of who builds them.

```
WI-NNN-D1 ──> WI-NNN-D2 ──> WI-NNN-D3

WI-NNN-D4 (independent)
```

The activity graph below is derived from this. If D2 depends on D1, every activity producing
D2 depends on the activities producing D1. Where the two graphs disagree, the product flow is
right and the activity graph is wrong.

## Definition of Done

Composed from the products above, not authored separately, so the two cannot drift:

> This work item is done when every product in the Product Breakdown has reached `accepted`
> against its own quality criteria.

## Activity Dependency Graph

```
WI-NNN-A1 ──┬──> WI-NNN-A3 ──> WI-NNN-A5
            │
WI-NNN-A2 ──┘
     
WI-NNN-A4 (independent)
```

**Parallel Opportunities:**
- A1 and A2 can run in parallel (no dependencies)
- A4 can run in parallel with everything (independent)
- A3 requires both A1 and A2 to complete first
- A5 requires A3 to complete

## Activities

Activities are the unit of work assignment. A worker (human or agent) claims an activity and completes all tasks within it sequentially. Multiple workers can work different activities in parallel if dependencies allow.

**ID Convention:**
- Activity ID: `{work_item_id}-A{N}` (e.g., `WI-001-A1`)
- Task ID: `{activity_id}-T{N}` (e.g., `WI-001-A1-T1`)

### Activity WI-NNN-A1: {Activity Name}

**Produces:** WI-NNN-D1 — required. Every activity names the product it advances.

**Depends on:** None (can start immediately)

**Outcome:** {What will be true when this activity is complete}

**Deliverable Document:** [WI-NNN-D01](deliverables/D01-{name}.md)

| Task ID | Task | Effort | Deliverable | Status |
|---------|------|--------|-------------|--------|
| WI-NNN-A1-T1 | {First task - sets up foundation} | Low/Med/High | D01 | Pending |
| WI-NNN-A1-T2 | {Second task - builds on task 1} | Low/Med/High | D01 | Pending |
| WI-NNN-A1-T3 | {Third task - completes the activity} | Low/Med/High | D01 | Pending |

<!-- 
IMPORTANT: Keep plan.md lean!
- List tasks and reference deliverables
- Don't put detailed design content here
- Move options analysis, specifications, proposals to deliverable documents
-->

### Activity WI-NNN-A2: {Activity Name}

**Depends on:** None (can run parallel with WI-NNN-A1)

**Outcome:** {What will be true when this activity is complete}

**Deliverable Document:** [WI-NNN-D02](deliverables/D02-{name}.md)

| Task ID | Task | Effort | Deliverable | Status |
|---------|------|--------|-------------|--------|
| WI-NNN-A2-T1 | {Task description} | Low/Med/High | D02 | Pending |

### Activity WI-NNN-A3: {Activity Name}

**Depends on:** WI-NNN-A1, WI-NNN-A2 (must wait for both)

**Outcome:** {What will be true when this activity is complete}

**Deliverable Document:** [WI-NNN-D03](deliverables/D03-{name}.md)

| Task ID | Task | Effort | Deliverable | Status |
|---------|------|--------|-------------|--------|
| WI-NNN-A3-T1 | {Task that uses outputs from A1 and A2} | Low/Med/High | D03 | Pending |

### Activity WI-NNN-A4: {Independent Activity}

**Depends on:** None (can run in parallel with all others)

**Outcome:** {What will be true when this activity is complete}

**Deliverable Document:** [WI-NNN-D04](deliverables/D04-{name}.md)

| Task ID | Task | Effort | Deliverable | Status |
|---------|------|--------|-------------|--------|
| WI-NNN-A4-T1 | {Task description} | Low | D04 | Pending |

## Planning Guidelines

When creating activities:

0. **Derive from products**: start from the Product Breakdown. For each product ask what has
   to happen for it to exist, and make those the activities. Never start from a list of things
   to do and look for products afterwards.
1. **Group sequential work**: Tasks that must happen in order go in the same activity
2. **Separate independent work**: Work that can happen in parallel should be separate activities
3. **Minimize dependencies**: Fewer dependencies = more parallelism
4. **Clear outcomes**: Each activity should have a clear "done" state
5. **No cross-activity task dependencies**: Tasks only depend on earlier tasks in same activity
6. **Reasonable size**: 1-5 tasks per activity is typical

## Deliverables Rule

**Products are planned first and activities are derived from them.** The work item names what
will exist at the end, then asks what has to happen for each of those things to exist.

1. Every activity declares the product it advances, via `produces` in `progress.yaml`.
2. An activity that produces nothing is invalid. Split it, fold it into another, or name the
   product it was really for. Effort with nothing left behind is not work, it is motion.
3. Several activities may feed one product. One activity never feeds several: if it does, it
   is two activities.
4. A decision of record is a product. "Decided to do nothing, with the analysis and rationale
   written down and agreed" leaves something behind. "Investigated options" does not.
5. A product's `state` (planned, drafted, in_review, accepted) tracks the thing itself, and is
   distinct from the status of the activities producing it. Every activity can be complete
   while the product sits in review.

**Deliverable ID Convention:** `WI-NNN-D{N}` (e.g., `WI-001-D1`)

Either the short ID (`D1`) or the full ID (`WI-001-D1`) can be used when referencing a product
within the work item context.

## Keep Plan Lean

**Do:**
- List tasks with effort and deliverable references
- Add status column for tracking
- Keep activity sections brief

**Don't:**
- Put detailed options analysis in plan.md
- Include full specifications or proposals
- Duplicate content that belongs in deliverable documents

Move detailed content to `deliverables/D{NN}-{name}.md` files.

## Decisions

### Decision 1: {Title}

- **Options Considered**: {Option A, Option B}
- **Chosen**: {Option X}
- **Rationale**: {Why this option was selected}

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| {Risk description} | High/Med/Low | High/Med/Low | {How to address} |

## Verification Approach

<!-- Adapt based on work type -->

**For Development:**
- [ ] Unit tests for {component}
- [ ] Integration tests for {flow}
- [ ] Code review completed
- [ ] Deployed and verified

**For Architecture:**
- [ ] Diagrams reviewed by stakeholders
- [ ] Decisions documented and approved
- [ ] Specifications complete and clear

**For Consultancy:**
- [ ] Research validated with sources
- [ ] Recommendations reviewed
- [ ] Deliverables accepted by client

## Rollback / Recovery Plan

{How to revert or recover if something goes wrong}

## Final Verification Checklist

- [ ] All acceptance criteria from scope.md met
- [ ] All activities completed
- [ ] All deliverables produced
- [ ] Stakeholder sign-off obtained
