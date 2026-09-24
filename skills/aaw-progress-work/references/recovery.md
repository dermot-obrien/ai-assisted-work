# Recovery, blockers and errors

## Recovery after an interruption

A previous worker died mid-activity if you find `status: in_progress` with an expired lock.

1. **Find it.** `status: in_progress`, `locks/{id}.lock` present, `expires < now` verified
   against the system clock.
2. **Review what was done.** Completed tasks, which you do not redo. The task marked
   `in_progress`, which may be half done. The changelog for context. The product's `state` and
   `files_changed` for what already exists.
3. **Claim it.** Delete the stale lock, create a new one with your ID. If either step fails or
   the file changes, stop: the previous worker is alive after all.
4. **Verify.** Sanity-check that the completed tasks actually produced valid output. A task
   marked complete by a worker that then died is the likeliest place for a lie in the record.
5. **Resume** from the first task that is not `completed`.
6. **Log it:**

```
{"timestamp":"...","worker":"{your-id}","action":"resumed_activity","activity_id":"WI-003-A2","details":"Previous lock expired. T1 and T2 verified complete. Resuming from T3."}
```

Report it plainly:

```
Found expired lock on WI-001-A2:
  Holder: agent-xyz123
  Expired: 2 hours ago
  Last task: WI-001-A2-T3 (in_progress)

Claiming activity for recovery...
Verifying completed tasks...
  WI-001-A2-T1: verified complete
  WI-001-A2-T2: verified complete
  WI-001-A2-T3: incomplete - resuming from here
```

## Blockers

When you cannot proceed:

1. Set the task and activity `status: blocked`.
2. Add to the `blockers` array:

   ```yaml
   blockers:
     - id: WI-003-B1
       activity_id: WI-003-A2
       task_id: WI-003-A2-T3
       description: "Need database credentials for integration test"
       raised_at: "{ISO-8601}"
       raised_by: "{your-id}"
       resolved_at: null
       resolution: null
   ```

3. Release your lock. Other activities may be workable by you or someone else.
4. Append to the changelog and report to the user.

Do not hold a lock on work you cannot progress.

```
WI-001 Status: Blocked

All remaining activities have unresolved blockers:
  WI-001-A3: Blocked by WI-001-B1 - "Need API credentials"
  WI-001-A4: Depends on WI-001-A3 (blocked)

Blockers require user action. Use /aaw-work-status WI-001 for details.
```

## Missing files

| Missing | Action |
|---------|--------|
| `progress.yaml` | Stop. Run `/aaw-start-work` to create the work item properly |
| `scope.md` | Stop. Scoping never finished |
| `plan.md` | Stop. The work item is still in discovery; planning must complete first |
| `scope-ai.md` | Proceed. It is optional. Rely on `scope.md` and ask if anything is unclear |

```
Cannot proceed with WI-XXX: missing required file {filename}.
The work item appears incomplete. Run /aaw-start-work to create it properly.
```

## Malformed progress.yaml

Report the parse error, point at the likely cause (indentation, quoting, a stray colon), and
offer to reconstruct from `plan.md`. Do not silently rewrite the file.

## Lock acquisition failure

```
Activity WI-001-A2 was just claimed by another worker.
Checking for other available activities...

[found] Claiming WI-001-A3 instead.
[none]  No activities currently available. All are either locked by other
        workers or blocked on dependencies. Use /aaw-work-status WI-001.
```

## Version conflict

1. Re-read `progress.yaml`.
2. Check your activity is still yours and still valid.
3. Compatible: merge, increment `version`, retry.
4. Conflicting: report both sides and let the user decide.

```
Version conflict detected in progress.yaml.
Another worker modified the file. Re-reading and retrying...
[success] Changes merged, continuing.
[failure] Conflicting changes. Please review:
          - Your change:  {description}
          - Their change: {description}
```

## Backward compatibility

| Missing field | Default | Note |
|---------------|---------|------|
| `schema_version` | `1` | Implicit v1 |
| `activity.actor`, `task.actor` | `any` | Assume any worker |
| `activity.produces` | none | Pre-v3; use the legacy deliverables path |
| top-level `deliverables` | none | Pre-v3; products were not planned up front |
| `deliverable.files_changed` | `[]` | Old format did not track it |
| `artifacts.scope_ai`, `artifacts.changes` | `null` | Now optional |

Principles: read any version, using defaults for what is absent. Write forward by adding
fields rather than restructuring. Do not force a migration unless asked. Preserve existing
comments and structure.
