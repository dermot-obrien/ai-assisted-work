# Pivot Work Agent

Rescope and replan a work item when requirements change.

## Purpose

Handle changes to work items by:
- Understanding the change
- Updating scope
- Revising the plan
- Adjusting progress tracking
- Documenting the pivot

## Prerequisites

- Work item exists
- Clear understanding of what's changing

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Work item path | Yes | Path to work item folder |
| Change description | Yes | What's changing and why |

## Steps

1. **Understand current state**
   - Read scope.md
   - Read plan.md
   - Read progress.yaml
   - Note completed work

2. **Understand the change**
   - What triggered the pivot?
   - What's being added/removed/changed?
   - Impact on completed work?

3. **Update scope.md**
   - Revise objective if needed
   - Update in-scope items
   - Update out-of-scope items
   - Add note about scope change

4. **Update plan.md**
   - Mark obsolete tasks as cancelled
   - Add new tasks as needed
   - Update dependencies
   - Revise deliverables

5. **Update progress.yaml**
   - Mark cancelled tasks
   - Add new tasks as pending
   - Increment version
   - Add pivot note

6. **Document the pivot**
   - Why the change was made
   - What was impacted
   - New direction

7. **Report the changes**
   - Summary of pivot
   - Tasks cancelled
   - Tasks added
   - New next steps

## Outputs

| Output | Description |
|--------|-------------|
| Updated scope.md | Revised scope |
| Updated plan.md | Revised plan |
| Updated progress.yaml | Revised status |
| Pivot summary | What changed |

## Example

### Input

```
Work item: WI-042
Change: Also need to cover GraphQL versioning, not just REST
```

### Updates

**scope.md** (additions):
```markdown
## Scope Change Log

### 2026-02-01: Added GraphQL
- Added GraphQL versioning to scope
- Original scope was REST-only
- Reason: Broader applicability needed
```

**plan.md** (additions):
```markdown
### A3: GraphQL Research (NEW)

| Task ID | Task | Actor | Effort | Status |
|---------|------|-------|--------|--------|
| A3-T1 | Research GraphQL versioning | Agent | Medium | ⬜ |
| A3-T2 | Compare with REST approaches | Agent | Low | ⬜ |
```

**progress.yaml** (additions):
```yaml
version: 5
# ... existing content ...

activities:
  # ... existing ...
  - id: "A3"
    title: "GraphQL Research"
    status: "pending"
    added_at: "2026-02-01T14:00:00Z"
    added_reason: "Scope expanded to include GraphQL"
    tasks:
      - id: "A3-T1"
        title: "Research GraphQL versioning"
        status: "pending"
        actor: "agent"

pivot_log:
  - date: "2026-02-01T14:00:00Z"
    reason: "Scope expanded to include GraphQL versioning"
    added:
      - "A3: GraphQL Research"
    cancelled: []
```

## When to Pivot

| Trigger | Action |
|---------|--------|
| New requirements | Add tasks/activities |
| Dropped requirements | Cancel tasks |
| Wrong approach | Revise plan |
| Blocked indefinitely | Remove/replace tasks |
| Scope creep | Clarify and trim |

## Handling Completed Work

When pivot affects completed work:

1. **Keep completed work** if still valuable
2. **Note obsolescence** if no longer relevant
3. **Don't delete** - maintain history
4. **Update deliverables** list appropriately

## Progress Impact

| Scenario | Progress Impact |
|----------|-----------------|
| Tasks added | Progress % decreases |
| Tasks cancelled | Progress % increases |
| Activity added | Recalculate total |
| Activity removed | Recalculate total |

## Error Handling

| Error | Resolution |
|-------|------------|
| No work item | Check path |
| Unclear change | Ask clarifying questions |
| Conflicting changes | Discuss with stakeholder |

## Tips

- Document why you're pivoting
- Don't delete history
- Keep completed work visible
- Update dependencies carefully
- Communicate the pivot clearly
