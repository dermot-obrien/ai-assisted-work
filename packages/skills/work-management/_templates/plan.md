# Work Item Plan: {WI-NNN} {Title}

> Auto-generated during planning. Modify with caution.
>
> **Template placeholders**: Replace `{placeholder}` with actual values.
> Remove example activities and customize for your work item.

**Work Type:** {development | architecture | consultancy | mixed}

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

1. **Group sequential work**: Tasks that must happen in order go in the same activity
2. **Separate independent work**: Work that can happen in parallel should be separate activities
3. **Minimize dependencies**: Fewer dependencies = more parallelism
4. **Clear outcomes**: Each activity should have a clear "done" state
5. **No cross-activity task dependencies**: Tasks only depend on earlier tasks in same activity
6. **Reasonable size**: 1-5 tasks per activity is typical

## Deliverables Rule

**Every completed activity should produce a deliverable:**

1. **A file created or modified** (tracked in progress.yaml)
2. **A decision documented** (in deliverable document)
3. **Both**

Even a "decision to do nothing" is a deliverable - document the analysis and rationale.

**Key points:**
- Deliverables are tracked at the **activity level**, not individual tasks
- Multiple tasks contribute to a single activity deliverable
- Update the deliverable document incrementally as you complete tasks

**Deliverable ID Convention:** `WI-NNN-D{NN}` (e.g., `WI-001-D01`)

**Note:** Either the short ID (`D01`) or full ID (`WI-001-D01`) can be used when referencing deliverables in tasks. The short ID is a shorthand for the full ID within the work item context.

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
