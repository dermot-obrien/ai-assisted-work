# Concurrency

Multiple workers, human or agent, can work one work item when its activities are independent.
The protocol below is what makes that safe.

## Why the files are split the way they are

```
WI-001-feature-name/
├── progress.yaml     # source of truth, versioned, conflicts detected
├── locks/            # one file per activity, atomic create and delete
├── changelog.log     # append-only, safe for concurrent writes
└── deliverables/     # the products named in progress.yaml
```

Locks live in their own files so claiming does not contend with state writes. The changelog is
append-only so it never needs a read first.

## Reading state

1. Read `progress.yaml`, note the `version`.
2. Read `locks/*.lock` to see what is claimed.
3. Read `changelog.log` if you need history.

## Claiming an activity

1. Does `locks/{activity_id}.lock` exist?
2. If it does, read it. `expires > now` means taken, stop. `expires < now` means stale, delete
   it.
3. Create `locks/{activity_id}.lock` with exclusive create, which fails if the file appeared
   in the meantime. Write `holder`, `holder_type`, `acquired`, `expires`.
4. If the create failed, another worker won the race. Go back to step 1 and pick something
   else.

### Decision tree

```
START: want to claim activity X
  │
  ├─► Does locks/{X}.lock exist?
  │     │
  │     ├─► NO → create lock atomically → work
  │     │
  │     └─► YES → read it
  │           │
  │           ├─► expires > now? → STOP. Valid lock. Find another activity.
  │           │
  │           └─► expires < now?
  │                 │
  │                 ├─► delete the old lock
  │                 │     ├─► deleted → create new lock atomically
  │                 │     │     ├─► created → proceed with the recovery protocol
  │                 │     │     └─► failed  → another worker claimed it. STOP.
  │                 │     └─► delete failed, or the file changed → STOP. Worker is active.
  │                 │
  │                 └─► If the file changes at ANY point during this → STOP immediately.
```

Any file modification during a claim attempt means another worker is active. Back off.

## Optimistic locking on progress.yaml

1. Read `progress.yaml`, note `version`.
2. Make your changes in memory.
3. Re-read `progress.yaml`.
4. If `version` changed, another worker wrote. Merge their changes with yours, or abort and
   restart.
5. If unchanged, increment `version`, set `last_modified` and `last_modified_by`, write.

## Releasing

Update `progress.yaml` first, delete the lock second. Releasing without updating corrupts
state for the next worker, who will claim the activity and find it misdescribed.

## Appending to the changelog

Format one JSON object per line and append. No read needed; append is atomic.

```
{"timestamp":"2026-01-24T10:30:00Z","worker":"{your-id}","worker_type":"agent","action":"completed_task","activity_id":"WI-001-A1","task_id":"WI-001-A1-T1","details":"Implemented feature X","deliverable":"WI-001-D1"}
```

## "File modified since read" means stop

On a lock file or `progress.yaml`, this error means another worker is active. It is not
recoverable by retrying.

1. Do not re-read and retry the write.
2. Report: "Activity {X} has an active worker. Cannot claim."
3. Look for other available activities.
4. If none, report status and wait.

## Finding alternative work

Filter the activities for: `status: pending`, no lock file present, and every `depends_on`
activity at `status: completed`. Claim the first. If none qualify, tell the user precisely
why each is unavailable:

```
No activities currently available. Status:
- WI-001-A2: locked by agent-xyz000 (expires in 20 min)
- WI-001-A3: blocked on WI-001-A2
- WI-001-A1: completed

Use /aaw-work-status WI-001 for details.
```

## Pre-claim checklist

Verify all of these before claiming:

- [ ] I have read `progress.yaml` and noted the `version`
- [ ] I have checked `locks/` for existing lock files
- [ ] For my target: no valid lock exists, or the lock is definitively expired against a
      timestamp I verified rather than assumed
- [ ] I can read the current time from the system
- [ ] Every activity in `depends_on` is `completed`
- [ ] I will use atomic create, not overwrite, for the lock file
- [ ] If I detect any file modification during this, I will stop immediately

## Lock durations

| Worker type | Activity lock | Task lock |
|-------------|---------------|-----------|
| Human | 8 hours | 4 hours |
| Agent | 1 hour | 30 minutes |

Agent locks are shorter because agent sessions are volatile; human locks are longer to
accommodate human working patterns.

## Scaling limits

Two to five workers per work item, ten at the absolute maximum. Beyond that, activity
granularity and `progress.yaml` write contention both become the bottleneck, and the work item
should be split. Structuring activities for parallelism is the planner's job, not the
executor's.

## Parallel execution

```yaml
activities:
  - id: WI-005-A1
    depends_on: []                            # Worker 1 can claim
  - id: WI-005-A2
    depends_on: []                            # Worker 2 can claim simultaneously
  - id: WI-005-A3
    depends_on: ["WI-005-A1", "WI-005-A2"]    # waits for both
```

Whoever finishes first can claim A3. Activity dependencies are derived from the product flow,
so if two activities feed products with no dependency between them, they are genuinely
parallel.

## Chats, not activities

Locks coordinate workers on a work item's activities. They do not cover several chats acting
on the same environment (deploying, publishing data, merging a shared branch). For that, the
`thread` skill names one owning thread per tree of intents; see its section "Many chats, one
tree".
