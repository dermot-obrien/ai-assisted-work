# Status reference

## Work item status

| Status | Phase | Meaning |
|--------|-------|---------|
| `scoping` | 1 | Refining intent with the user |
| `discovery` | 2 | Researching and gathering options |
| `planning` | 3 | Naming products and deriving activities |
| `in_progress` | 4 | Implementation underway |
| `blocked` | — | Waiting on external input or resolution |
| `review` | 4 | Implementation complete, verification pending |
| `abandoned` | — | Cancelled or superseded |
| `done` | — | Every product accepted and verified |

## Activity status

| Status | Meaning |
|--------|---------|
| `pending` | Not started, waiting for dependencies or a worker |
| `in_progress` | Claimed by a worker, tasks being worked |
| `awaiting_human` | Agent finished all agent-compatible tasks, human tasks remain |
| `completed` | All tasks finished successfully |
| `blocked` | Cannot proceed; check the `blockers:` array |
| `skipped` | Intentionally not done, with a reason |

## Product state and approval

Two independent axes on each entry in the `deliverables:` block. Report both.

| `state` | Meaning |
|---------|---------|
| `planned` | Named, not started |
| `drafted` | Exists but not yet reviewed |
| `in_review` | With its approver |
| `accepted` | Passed its own `quality_criteria` |

| `approval` | Meaning |
|------------|---------|
| `draft` | The planning record itself is not yet agreed |
| `validated` | The definition has been checked |
| `approved` | The definition has been signed off |

`state` tracks the product; `approval` tracks the plan for the product. A product can be
`accepted` while its record is still `draft`, which means real work happened against an
unagreed definition. That is worth flagging in a status report.

## Work item level

| Level | Meaning |
|-------|---------|
| `workstream` | A durable strand inside an initiative. Accretes scope, may never end |
| `epic` | A bounded slice landing in one planning period, three months at most |

A workstream shows aggregate progress across its epics. Do not report a percentage for a
workstream as though it were finite; report epics done out of epics planned, and say that more
may be added.

## Symbols

```
✓  Completed or accepted
→  In progress, or locked
○  Pending, available if dependencies met
⊕  Available for parallel work now
✗  Blocked
⚠️  Expired lock, recovery needed
```

## Lock durations

| Worker type | Activity lock | Task lock |
|-------------|---------------|-----------|
| Human | 8 hours | 4 hours |
| Agent | 1 hour | 30 minutes |

Human locks are longer to accommodate human working patterns; agent locks are shorter because
agent sessions are volatile. Mixed teams work the same work item: humans and agents can hold
different activities at the same time.

Locks live as files in the work item's `locks/` directory, not in `progress.yaml`, so claiming
and releasing do not contend with state writes.

## Stale detection

A work item is stale when `updated` is more than 7 days old and its status is not `done`,
`abandoned` or `blocked`. Recommend reviewing it: either resume, or close with a reason. Never
close one from a status report.
