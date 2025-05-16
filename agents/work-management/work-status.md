# Work Status Agent

Report the current status of a work item.

## Purpose

Generate a clear status report showing:
- Overall work item status
- Progress through activities and tasks
- Blockers and issues
- Next steps

## Prerequisites

- Work item exists with progress.yaml

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Work item path | Yes | Path to work item folder |
| Detail level | No | summary / detailed (default: summary) |

## Steps

1. **Read work item state**
   - Load progress.yaml
   - Load plan.md (for descriptions)
   - Load scope.md (for context)

2. **Calculate progress**
   - Count tasks by status
   - Calculate percentage complete
   - Identify current activity

3. **Identify blockers**
   - Tasks with `blocked` status
   - Human tasks awaiting action
   - External dependencies

4. **Determine next steps**
   - Next pending task
   - Tasks ready to start
   - Human actions needed

5. **Generate report**
   - Summary statistics
   - Activity-level progress
   - Task-level detail (if detailed)
   - Blockers section
   - Next steps

## Outputs

| Output | Description |
|--------|-------------|
| Status report | Formatted status summary |

## Report Format

### Summary Report

```markdown
# Work Item Status: WI-042

**Title**: API Versioning Best Practices
**Status**: In Progress
**Progress**: 60% (3/5 tasks completed)

## Summary

| Activity | Status | Progress |
|----------|--------|----------|
| A1: Research | In Progress | 2/3 tasks |
| A2: Documentation | Pending | 0/2 tasks |

## Blockers
- None

## Next Steps
- A1-T3: Research query param versioning (Agent)
- A2-T1: Draft comparison document (Agent) - blocked by A1
```

### Detailed Report

```markdown
# Work Item Status: WI-042 (Detailed)

**Title**: API Versioning Best Practices
**Status**: In Progress
**Started**: 2026-02-01
**Progress**: 60% (3/5 tasks completed)

## Activity: A1 - Research

| Task | Status | Actor | Notes |
|------|--------|-------|-------|
| A1-T1: Research URL path versioning | ✅ Completed | Agent | Created url-versioning.md |
| A1-T2: Research header versioning | ✅ Completed | Agent | Created header-versioning.md |
| A1-T3: Research query param versioning | ⬜ Pending | Agent | |

## Activity: A2 - Documentation

| Task | Status | Actor | Notes |
|------|--------|-------|-------|
| A2-T1: Draft comparison document | ⏳ Blocked | Agent | Waiting for A1 |
| A2-T2: Review and finalize | ⬜ Pending | Human | |

## Deliverables

| ID | Name | Status |
|----|------|--------|
| D01 | API Versioning Guide | Draft |

## Blockers
- None currently

## Next Steps
1. Complete A1-T3 (Agent task)
2. Start A2-T1 when A1 complete
3. Human review needed for A2-T2
```

## Status Indicators

| Indicator | Meaning |
|-----------|---------|
| ✅ | Completed |
| 🔄 | In Progress |
| ⬜ | Pending |
| ⏳ | Blocked |
| ❌ | Cancelled |
| 👤 | Awaiting Human |

## Progress Calculation

```
Progress % = (Completed Tasks / Total Tasks) × 100

Exclude cancelled tasks from total.
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Work item not found | Report error, check path |
| Invalid progress.yaml | Report parse error |
| Missing plan.md | Generate basic report from progress.yaml |

## Tips

- Use summary for quick check-ins
- Use detailed for handoffs or reviews
- Include blockers prominently
- Make next steps actionable
