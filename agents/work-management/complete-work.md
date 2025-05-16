# Complete Work Agent

Finalize and close a work item.

## Purpose

Properly close a completed work item by:
- Verifying completion
- Finalizing deliverables
- Updating status
- Creating completion summary

## Prerequisites

- Work item exists
- All required tasks completed (or cancelled)

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Work item path | Yes | Path to work item folder |
| Force complete | No | Complete even if tasks pending (default: false) |

## Steps

1. **Verify completion status**
   - Read progress.yaml
   - Check all tasks completed or cancelled
   - Identify any pending tasks

2. **Handle incomplete tasks**
   - If tasks pending and not force: report and stop
   - If force: mark remaining as cancelled with note

3. **Verify deliverables**
   - Check all deliverables exist
   - Note any missing deliverables

4. **Update progress.yaml**
   - Set work item status to `completed`
   - Set completed_at timestamp
   - Increment version
   - Add completion notes

5. **Create completion summary**
   - What was accomplished
   - Deliverables produced
   - Any cancelled work
   - Lessons learned (optional)

6. **Report completion**
   - Summary of work done
   - Deliverables list
   - Any follow-up items

## Outputs

| Output | Description |
|--------|-------------|
| Updated progress.yaml | Status: completed |
| Completion summary | What was accomplished |

## Completion Checklist

Before completing, verify:

- [ ] All required tasks completed
- [ ] Human review tasks done
- [ ] Deliverables created
- [ ] Quality acceptable
- [ ] No outstanding blockers

## Example

### Final progress.yaml

```yaml
version: 8
last_modified: "2026-02-03T16:00:00Z"
last_modified_by: "agent"

work_item:
  id: "WI-042"
  title: "API Versioning Best Practices"
  status: "completed"
  started_at: "2026-02-01T10:00:00Z"
  completed_at: "2026-02-03T16:00:00Z"

activities:
  - id: "A1"
    title: "Research"
    status: "completed"
    tasks:
      - id: "A1-T1"
        status: "completed"
        completed_at: "2026-02-01T11:00:00Z"
      - id: "A1-T2"
        status: "completed"
        completed_at: "2026-02-01T14:00:00Z"
      - id: "A1-T3"
        status: "completed"
        completed_at: "2026-02-02T10:00:00Z"
  
  - id: "A2"
    title: "Documentation"
    status: "completed"
    tasks:
      - id: "A2-T1"
        status: "completed"
        completed_at: "2026-02-02T15:00:00Z"
      - id: "A2-T2"
        status: "completed"
        completed_at: "2026-02-03T16:00:00Z"
        completed_by: "human"

artifacts:
  - id: "D01"
    title: "API Versioning Best Practices Guide"
    path: "./deliverables/api-versioning-guide.md"
    status: "approved"

completion:
  summary: "Completed research and documentation of API versioning best practices"
  deliverables:
    - "api-versioning-guide.md"
  follow_up:
    - "Consider implementation guide as future work item"
```

### Completion Summary

```markdown
# Work Item Completed: WI-042

## Summary
API Versioning Best Practices research and documentation completed.

## Duration
- Started: 2026-02-01
- Completed: 2026-02-03
- Duration: 3 days

## Tasks Completed
- 5/5 tasks (100%)

## Deliverables
1. **API Versioning Best Practices Guide** 
   - Path: deliverables/api-versioning-guide.md
   - Status: Approved

## Key Outcomes
- Documented URL path, header, and query param versioning approaches
- Provided comparison and recommendations
- Human review completed

## Follow-Up Items
- Consider creating implementation guide (new work item)
```

## Force Completion

Use `force_complete: true` when:
- Remaining tasks no longer relevant
- Work superseded by other work
- Stakeholder decides to close early

When forcing:
- Mark remaining tasks as `cancelled`
- Note reason in completion summary
- Document what was not done

## Error Handling

| Error | Resolution |
|-------|------------|
| Tasks still pending | Report pending tasks, ask to force or complete them |
| Missing deliverables | Report missing, ask to proceed anyway |
| Already completed | Report already complete |

## Tips

- Don't force complete without good reason
- Document what was accomplished
- Note any follow-up work needed
- Keep the work item folder (don't delete)
- Archive if your organization has archive procedures
