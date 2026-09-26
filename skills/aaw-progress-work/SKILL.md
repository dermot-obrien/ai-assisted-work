---
name: aaw-progress-work
description: Execute an AAW work item that has been scoped and planned, claiming activities under a lock, working their tasks in order, moving the named products through drafted, in_review and accepted, and recovering safely after an interruption. Use when asked to progress, continue, execute, implement or resume work on a WI, to pick up where a previous session stopped, or to run the execution phase of a work item.
license: CC-BY-4.0
compatibility: Reads .aaw-config.yaml at the workspace root for work_items_path. Needs a verifiable system clock for lock expiry. Git is needed only for the development work type.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "2.2.0"
---

# Progress Work

Phase 4, execution, for a work item that already has `scope.md`, `plan.md` and
`progress.yaml`. Applies to intervention and change work items. A chore has no work item to
progress; it was a branch and a changelog line finished in one pass by `/aaw-start-work`.

## The essential path

For single-agent work this is the whole loop:

```
1. READ   Load scope.md, plan.md, progress.yaml, and the deliverables block
2. FIND   First activity where status=pending and every depends_on is completed
3. LOCK   Create locks/{activity_id}.lock with your worker ID
4. WORK   Complete tasks in order, updating progress.yaml after each one
5. DONE   Set activity status=completed, advance its product, delete the lock
6. REPEAT From step 2 until no activity is available
```

The one rule that matters more than any other: update `progress.yaml` before deleting your
lock file. The next worker trusts the state you leave behind.

## Critical rules

Do not attempt to claim an activity if any of these hold:

1. The lock file was modified since you read it. Another worker is actively working. This is
   not a recoverable error.
2. The lock's `expires` is in the future. The activity is claimed.
3. You cannot verify the current time from the system. Never guess or fabricate a timestamp
   to reason about expiry; ask the user instead.

Never:

- Overwrite a lock file with a write or edit. Atomic create only, or delete-then-create for
  a verified stale lock
- Assume or invent the current time
- Treat "file modified since read" as recoverable when working with locks
- Claim an activity when another worker may be active
- Work tasks without holding the activity lock
- Release a lock without first updating `progress.yaml`

When in doubt, look for another available activity rather than forcing a claim.

Once you hold an activity lock you can trust the recorded state: if `progress.yaml` says a
task is pending, it is pending. That guarantee holds only because every worker updates state
before releasing.

## Locating the work item

1. Read `work_items_path` from `.aaw-config.yaml` at the workspace root.
2. Scan for `WI-{NNN}-*/` or `WI-*/progress.yaml`.
3. If the config is missing, fall back to `./change/work-items/`.

## Process

### Step 0: First-time setup, when status is `planning`

1. Check `artifacts.jira`. If the organisation requires a ticket, ask the user to create one
   and record the URL. Never auto-create one; proceed without if they prefer.
2. If `artifacts.branch` is null, create `wi/WI-{NNN}-{kebab-name}` and record it.
3. Create `changes.md` from `assets/templates/changes.md` if it does not exist.
4. Set the work item `status` to `in_progress`.

### Step 1: Load context

Read, in this order: `progress.yaml` (the source of truth, note its `version`), `scope.md`,
`scope-ai.md`, `plan.md`, then `notes.md`, `changes.md` and any `agents.md` if present.

Read both `scope.md` and `scope-ai.md`. The addendum holds why decisions were made and
instructions written for agents, which `scope.md` deliberately does not carry.

Read the `deliverables:` block. These are the products the work exists to produce, and their
`quality_criteria` are what the work will be judged against.

### Step 2: Find an available activity

Note the `version`, check `locks/`, then find an activity that is:

- Not locked, or locked with `expires < now` verified against the system clock
- `status: pending`
- Every activity in `depends_on` at `status: completed`
- Not sitting on an unresolved blocker
- Actor-compatible: as an agent, skip `actor: human` activities and those whose tasks are all
  `actor: human`

If nothing is available, say which of these applies to each activity rather than reporting a
bare "nothing to do". Details in [references/concurrency.md](references/concurrency.md).

### Step 3: Claim it

1. Create `locks/{activity_id}.lock` with exclusive create:

   ```json
   {
     "holder": "{your-id}",
     "holder_type": "agent",
     "acquired": "2026-01-24T10:00:00Z",
     "expires": "2026-01-24T11:00:00Z",
     "task_id": null,
     "task_acquired": null,
     "task_expires": null
   }
   ```

   If the create fails, another worker won the race. Return to Step 2.

2. Re-read `progress.yaml` and check `version` is unchanged. If it changed, re-evaluate: your
   activity may no longer be available. If unchanged, increment `version`, set
   `last_modified` and `last_modified_by`, and set the activity to `in_progress`.

3. Append one JSON line to `changelog.log`:

   ```
   {"timestamp":"2026-01-24T10:00:00Z","worker":"{your-id}","worker_type":"agent","action":"claimed_activity","activity_id":"WI-001-A1","details":"Starting work"}
   ```

The full lock decision tree and the pre-claim checklist are in
[references/concurrency.md](references/concurrency.md).

### Step 4: Work the tasks, in order

For each task:

1. **Check the actor.** `agent` or `any`, execute. `human`, mark `awaiting_human` and handle
   it per [references/actors.md](references/actors.md).
2. **Update the lock** with `task_id`, `task_acquired` and `task_expires`, so a recovering
   worker knows where you stopped.
3. **Do the work**, and advance the product the activity `produces`. Execution moves named
   products through their states; it does not invent new ones. See
   [references/products.md](references/products.md).
4. **Mark the task complete** in `progress.yaml` with a version check: re-read, confirm your
   lock is still valid, increment `version`, set `status`, `completed_by`, `completed_at` and
   a one-line `notes`.
5. **Append to `changelog.log`.**

Update after each task. Do not batch to the end: a batched update is exactly what is lost
when a session dies.

### Step 5: Complete the activity

Order matters here.

1. Update `progress.yaml`: activity `status: completed`, `completed_by`, `completed_at`,
   version incremented. Update the product's `state` if this activity finished it. This step
   is mandatory and comes first, because the lock is what guarantees the next worker sees
   accurate state.
2. Only then delete `locks/{activity_id}.lock`.
3. Append the completion line to `changelog.log`.
4. Check which activities the completion has unblocked.

### Step 6: Continue or finish

- More activities available: claim the next one.
- Every activity complete but products still short of `accepted`: set the work item to
  `review`. Do not set `done`.
- Every product `accepted`: the work item is done.
- Remaining activities blocked or held by other workers: report and stop.

## Reporting

Before starting, present the activity list with your position in it:

```
Work Item: WI-003 - System Architecture Review
Type: architecture      Status: in_progress

Products:
  ✓ WI-003-D1: Current state assessment    accepted
  → WI-003-D2: Options analysis            drafted

Activities:
  ✓ WI-003-A1: Document Current State → D1 (completed)
  → WI-003-A2: Evaluate Options → D2 (in_progress, 2/4 tasks done) [YOU]
  ○ WI-003-A3: Create Diagrams → D2 (pending, depends on WI-003-A2)
  ⊕ WI-003-A5: Stakeholder Presentation → D3 (pending, no dependencies) [AVAILABLE]

Your Progress in WI-003-A2:
  ✓ WI-003-A2-T1: Research cloud providers
  → WI-003-A2-T3: Assess technical fit
  ○ WI-003-A2-T4: Document trade-offs

Ready to continue with WI-003-A2-T3?
```

Legend: `✓` completed, `→` in progress, `○` pending, `⊕` available for parallel work,
`⌛` awaiting human. Include the Manual Tasks Report whenever human tasks are outstanding.

Run without an argument to list work items whose status is not `done` and work the most
recent.

## References

| Topic | File |
|-------|------|
| Locks, optimistic locking, conflicts, scaling limits | [references/concurrency.md](references/concurrency.md) |
| Actor model, mixed activities, manual tasks report | [references/actors.md](references/actors.md) |
| Product states, acceptance, older schema versions | [references/products.md](references/products.md) |
| Interruption recovery, blockers, error handling | [references/recovery.md](references/recovery.md) |
| Development, architecture and consultancy specifics | [references/work-types.md](references/work-types.md) |

## Related skills

- `/aaw-start-work` created this work item and its plan.
- `/aaw-next-task` identifies the next task without executing it.
- `/aaw-work-status` reports across work items.
