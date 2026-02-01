# Pivot Work

Revise the scope and plan of an active work item after work has started. Use this when requirements change, new information emerges, or the current approach isn't working.

**Prerequisites**: Work item must exist with `status: in_progress` or `status: blocked`.

**Interaction Style**: Read-only for dialogue and analysis, then write operations to update documents. Use the most appropriate tool mode for each phase.

**See also:**
- [README.md](README.md) - Core concepts, ID conventions, lifecycle for work item management
- [start-work.md](start-work.md) - Creating work items (Phases 1-3)
- [work-status.md](work-status.md) - Checking status
- [limitations.md](limitations.md) - Scaling limits

## When to Use Pivot Work

Use `/pivot-work` when:

- **Requirements changed**: User provides new or changed requirements
- **Approach isn't working**: Current plan is blocked or proving ineffective
- **New information**: Discovery during implementation reveals a better approach
- **Scope creep**: Work has expanded beyond original intent

Do NOT use `/pivot-work` for:

- Minor task adjustments (just update progress.yaml)
- Adding clarifying notes (use notes.md)
- Normal blockers that can be resolved (use blocker protocol in progress-work.md)

## Usage

```
/pivot-work WI-NNN "reason for pivot"
```

Or without argument to select from active work items:

```
/pivot-work
```

## Process

### Step 1: Load Context

1. Read `progress.yaml` to understand current state
2. Read `scope.md` to understand stakeholder-facing requirements
3. Read `scope-ai.md` to understand intent formation, decision rationale, and agent instructions
4. Read `plan.md` to understand current approach
5. Read `notes.md` if exists for session history
6. Check `locks/` for any active work

### Step 2: Assess Impact (Plan Mode)

Analyze the pivot request:

```
Pivot Analysis for WI-003
=========================

Current State:
  Status: in_progress
  Activities: 2/4 complete
  Active locks: WI-003-A3 (agent-xyz, expires 30 min)

Pivot Request:
  "{User's reason for pivot}"

Impact Assessment:
  - Completed work affected: {Yes/No - list if yes}
  - In-progress work affected: {Yes/No - list if yes}
  - Pending work affected: {Yes/No - list if yes}

Options:
  A) Minimal pivot - adjust remaining work only
  B) Moderate pivot - redo some completed work
  C) Major pivot - significant rework required
  D) Abandon and restart - create new work item

Recommendation: Option {X} because {rationale}

Which approach would you like to take?
```

### Step 3: Handle Active Locks

If activities are locked by other workers:

1. **Wait option**: Wait for locks to expire or be released
2. **Coordinate option**: Ask user to coordinate with other workers
3. **Force option**: Mark locked activities as `blocked` with pivot reason

```yaml
blockers:
  - id: WI-003-B1
    activity_id: WI-003-A3
    task_id: null
    description: "Pivot in progress - work paused pending scope revision"
    raised_at: "{timestamp}"
    raised_by: "{your-id}"
```

### Step 4: Update Scope Documents (Agent Mode)

Update both scope documents to reflect the pivot:

**Update `scope.md`** (stakeholder-facing):

1. Update the Summary if the overall direction changed
2. Update the Intent section to reflect new understanding
3. Revise Acceptance Criteria as needed
4. Update In Scope / Out of Scope sections

Keep scope.md clean and professional - stakeholders don't need to see the pivot history.

**Update `scope-ai.md`** (AI agent addendum):

Add a "Revised Intent" section:

```markdown
## Revised Intent (if applicable)

> {User's new/changed requirements - preserve verbatim}

**Reason for revision**: {Why the scope changed}

**Revision Date**: {date}

**Impact on Original Scope**:
- {What from original scope is unchanged}
- {What from original scope is modified}
- {What from original scope is removed}
- {What is newly added}
```

Update the Agent Instructions section if the pivot changes:
- Terminology
- Scope boundaries
- Key concepts

### Step 5: Revise Plan (Agent Mode)

Update `plan.md`:

1. Mark affected completed activities:
   ```markdown
   ### Activity WI-003-A1: Backend API (COMPLETED - VALID)

   ### Activity WI-003-A2: Frontend UI (COMPLETED - REQUIRES REWORK)
   **Rework Reason**: {why this needs to be redone}
   ```

2. Update or replace affected pending activities

3. Add new activities if needed

4. Update dependency graph

5. Update verification approach

### Step 6: Reset Progress State (Agent Mode)

Update `progress.yaml`:

1. **Version check**: Read version, increment after changes
2. **Update activities**:
   - Keep `completed` status for unaffected work
   - Set `status: pending` for activities needing rework
   - Add new activities
   - Remove obsolete activities
3. **Clear stale locks**: Delete lock files for activities being reset
4. **Add changelog entry**

Example progress.yaml update:

```yaml
version: 5  # Incremented
last_modified: "{timestamp}"
last_modified_by: "{your-id}"

activities:
  - id: WI-003-A1
    status: completed      # Unchanged - work still valid
    # ...

  - id: WI-003-A2
    status: pending        # Reset - needs rework
    completed_by: null     # Cleared
    completed_at: null     # Cleared
    tasks:
      - id: WI-003-A2-T1
        status: pending    # Reset
        # ...

  - id: WI-003-A5          # New activity added
    title: "{New activity from pivot}"
    status: pending
    depends_on: []
    # ...
```

### Step 7: Document the Pivot

Append to changelog.log:

```json
{"timestamp":"{ISO-8601}","worker":"{your-id}","worker_type":"agent","action":"pivot_started","details":"Reason: {brief reason}"}
{"timestamp":"{ISO-8601}","worker":"{your-id}","worker_type":"agent","action":"pivot_completed","details":"Reset activities: WI-003-A2, WI-003-A3. Added: WI-003-A5"}
```

Add entry to notes.md:

```markdown
### {Date} - Pivot

**Reason**: {Why the pivot was needed}

**Changes Made**:
- Scope: {Summary of scope changes}
- Plan: {Summary of plan changes}
- Progress: {What was reset}

**Preserved Work**:
- {List of completed work that remains valid}
```

### Step 8: Present Summary

```
Pivot Complete: WI-003
======================

Scope Changes:
  - Added: {new requirements}
  - Modified: {changed requirements}
  - Removed: {dropped requirements}

Plan Changes:
  - Activities preserved: WI-003-A1 (completed)
  - Activities reset: WI-003-A2, WI-003-A3
  - Activities added: WI-003-A5
  - Activities removed: WI-003-A4

Ready to Resume:
  Available activities: WI-003-A2, WI-003-A5 (no dependencies)

Use /progress-work WI-003 to continue implementation.
```

## Pivot Types

### Minimal Pivot

Only affects pending work. Completed work remains valid.

- Update scope.md with revision
- Modify pending activities in plan.md
- No status resets needed

### Moderate Pivot

Some completed work needs rework.

- Update scope.md with revision
- Mark affected activities for rework
- Reset their status to `pending`
- Clear completion data

### Major Pivot

Significant portion of work invalid.

- Consider if new work item is cleaner
- If continuing: full scope/plan revision
- Reset multiple activities

### Abandon

Work item is no longer viable.

- Set `status: abandoned` in progress.yaml
- Add abandonment reason to notes.md
- Create new work item if work continues differently

## Important Rules

1. **Always preserve valid work**: Don't reset activities that don't need changes
2. **Document the reason**: Future agents need to understand why the pivot happened
3. **Handle locks gracefully**: Coordinate with other workers when possible
4. **Version check**: Always follow optimistic locking protocol
5. **User approval**: Get user confirmation before resetting completed work
6. **Changelog everything**: Pivots are significant events to track

## Cross-References

- [README.md](README.md) - Work item concepts and lifecycle
- [start-work.md](start-work.md) - Creating new work items
- [progress-work.md](progress-work.md) - Executing work items
- [work-status.md](work-status.md) - Checking status
- [limitations.md](limitations.md) - System constraints
