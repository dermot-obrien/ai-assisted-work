# Work type specifics and state values

The process is identical across work types and worker types. These are the per-type habits
layered on top.

## Development

- Branch `wi/WI-{NNN}-{kebab-name}`, created in Step 0, recorded in `artifacts.branch`
- Commit after each task or logical group
- Conventional commits: `feat(WI-001): {activity}.{task} - {description}`
- Record the PR URL in `artifacts.pr` when it is opened
- Keep `changes.md` current with every file change

## Architecture

- Diagram files in `artifacts.diagrams`
- Decisions in `decisions.md` or as ADRs, and as the product where the decision is the product
- Link specifications to the tasks that produce them
- Keep `changes.md` current with every document change

## Consultancy

- Research tracked in `artifacts.research`, with a URL and retrieval date per source
- Interview findings in `notes.md`
- Keep `changes.md` current with every document change

Across all three: the work item is complete when every product in the `deliverables:` block is
`accepted`, not when the last activity closes.

## Activity states

| State | Meaning |
|-------|---------|
| `pending` | Not started, waiting on dependencies or a worker |
| `in_progress` | Claimed, tasks being worked |
| `awaiting_human` | All agent-compatible tasks done, human tasks remain |
| `completed` | All tasks finished successfully |
| `blocked` | Cannot proceed; see the `blockers` array |
| `skipped` | Intentionally not done, with a reason in notes |

## Task states

| State | Meaning |
|-------|---------|
| `pending` | Not started |
| `in_progress` | Being worked, under a task lock |
| `completed` | Finished successfully |
| `blocked` | Cannot proceed within this activity |
| `skipped` | Intentionally not done, with a reason |
| `awaiting_human` | Needs human action; flagged for the Manual Tasks Report |

## Standing rules

1. Claim the activity before working any of its tasks.
2. Update `progress.yaml` before releasing a lock. Everything else depends on this.
3. Update after each task. Do not batch to the end.
4. Track your current task in the lock file so recovery knows where you stopped.
5. Respect live locks. Only a verifiably expired one may be cleared.
6. Never start an activity whose dependencies are incomplete.
7. On recovery, verify that work marked complete actually is.
8. Release the lock when blocked.
9. Advance the product, not just the task. An activity that closes without moving its product
   has not finished.
