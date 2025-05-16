# Progress Work Agent

Execute tasks and update work item progress.

## Purpose

Continue work on an existing work item by:
- Reading current state
- Identifying next task(s) to execute
- Executing agent tasks
- Updating progress tracking
- Creating/updating deliverables

## Prerequisites

- Work item exists with plan.md and progress.yaml
- At least one task in pending or in_progress state

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Work item path | Yes | Path to work item folder |
| Specific task | No | Task ID to work on (default: next pending) |

## Steps

1. **Read current state**
   - Load progress.yaml
   - Load plan.md
   - Identify work item status

2. **Identify next task**
   - Find tasks with status `pending` or `in_progress`
   - Check dependencies (skip if blockers exist)
   - Prefer `in_progress` tasks over `pending`
   - Select based on dependency order

3. **Check task actor**
   - If `actor: human` → Report and skip (don't execute)
   - If `actor: agent` → Proceed to execute

4. **Execute task**
   - Read task description from plan.md
   - Execute according to requirements
   - Create or update deliverables as needed

5. **Update progress.yaml**
   - Set task status: `pending` → `in_progress` → `completed`
   - Update timestamps
   - Increment version
   - Add notes if relevant

6. **Report progress**
   - What was done
   - What was produced (deliverables)
   - What's next
   - Any blockers

## Outputs

| Output | Description |
|--------|-------------|
| Updated progress.yaml | Reflects completed work |
| Deliverables | Task outputs in deliverables/ |
| Progress report | Summary of what was done |

## Task Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Currently being worked on |
| `completed` | Done |
| `blocked` | Waiting on dependency |
| `cancelled` | No longer needed |

## Example Session

### Before

```yaml
# progress.yaml (before)
version: 3
activities:
  - id: A1
    tasks:
      - id: A1-T1
        status: completed
      - id: A1-T2
        status: pending      # <- Next task
        actor: agent
      - id: A1-T3
        status: pending
```

### Agent Action

Execute A1-T2: "Research header versioning"

- Research the topic
- Create notes in deliverables/
- Update progress

### After

```yaml
# progress.yaml (after)
version: 4
activities:
  - id: A1
    tasks:
      - id: A1-T1
        status: completed
      - id: A1-T2
        status: completed    # <- Done
        completed_at: "2026-02-01T11:30:00Z"
        notes: "Created header-versioning-notes.md"
      - id: A1-T3
        status: pending
```

## Handling Human Tasks

When encountering a task with `actor: human`:

1. **Do NOT execute** the task
2. **Report** that it requires human action
3. **Leave status** as `pending` or `awaiting_human`
4. **Suggest** what the human should do
5. **Move on** to next agent task (if any)

Example output:
```
Task A2-T2 "Review and finalize" requires human action.

What you need to do:
- Review the draft document in deliverables/api-versioning-draft.md
- Make any necessary edits
- When complete, update progress.yaml to mark as completed

Next agent task: None available until A2-T2 is complete.
```

## Handling Dependencies

When a task has dependencies:

1. Check if dependencies are completed
2. If blocked, report the blocker
3. Find alternative tasks without blockers
4. If all blocked, report and wait

Example:
```
Task A2-T1 is blocked by:
- A1-T3 (status: pending)

Working on A1-T3 instead...
```

## Error Handling

| Error | Resolution |
|-------|------------|
| No pending tasks | Report work item may be complete |
| All tasks blocked | Report blockers, suggest resolution |
| Missing deliverable folder | Create it |
| Invalid progress.yaml | Report error, suggest fix |
| Task not found | List available tasks |

## Tips

- Always update progress.yaml after work
- Create deliverables in the deliverables/ folder
- Add notes to explain what was done
- Don't skip human review tasks
- Report blockers immediately
