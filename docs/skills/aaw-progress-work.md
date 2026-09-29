# aaw-progress-work

Execute a work item that has been scoped and planned: claim an activity under a lock, work
its tasks in order, move its product through `drafted`, `in_review` and `accepted`, and
recover safely after an interruption. Version 2.4.0. Source:
[skills/aaw-progress-work/](../../skills/aaw-progress-work/SKILL.md).

## Use it when

A work item has a `plan.md` and a `progress.yaml`, and you want the work done or resumed:
"continue WI-004", "pick up where the last session stopped", or:

```
/aaw-progress-work WI-004
/aaw-progress-work
```

With no id it lists the work items not yet `done` and works the most recent. A chore has no
work item to progress; `/aaw-start-work` finishes it in one pass.

## The loop

```
1. READ   scope.md, plan.md, progress.yaml and its deliverables block
2. FIND   the first pending activity whose depends_on are all completed
3. LOCK   create locks/<activity>.lock with an exclusive create
4. WORK   its tasks in order, updating progress.yaml after each one
5. DONE   set the activity completed, advance its product, then delete the lock
6. REPEAT from 2 until nothing is available
```

The rule that matters most: update `progress.yaml` before deleting the lock. The next worker
trusts the state you leave.

Details worth knowing:

- First run. When the work item is still `planning`, it creates the branch
  `wi/WI-NNN-<slug>`, creates `changes.md`, and sets `in_progress`. It may ask you to link a
  ticket; it never creates one.
- Claims. A live lock (expiry in the future) means another worker; the skill looks for
  another activity rather than forcing one. It never guesses the time: if it cannot read the
  system clock, it asks you. An expired lock is taken over by delete-then-create.
- Versions. Each write re-reads `progress.yaml` and checks `version` has not moved, then
  increments it. A conflict means another worker wrote; it re-reads and re-evaluates.
- Actors. It works `agent` and `any` tasks, marks `human` tasks `awaiting_human`, skips
  human-only activities, and lists what is waiting in a Manual Tasks Report.
- Products. A product's `state` moves only when its work does. When every activity is
  complete but a product is not yet `accepted`, the work item goes to `review`, not `done`.
- Audit. Each claim, task and completion is appended to `changelog.log` as one JSON line.

## What it writes

`progress.yaml` (statuses, versions, product states), `locks/<activity>.lock` while working,
`changelog.log`, the deliverables under `deliverables/`, and `changes.md`.

## Doing it by hand

The same claim and release are available from the shell, which is useful for testing and
for clearing up:

```
node .ai-assisted-work/bin/aaw.js claim WI-004-A2 --agent me
node .ai-assisted-work/bin/aaw.js release WI-004-A2
```

See [Commands](../reference/commands.md#aaw-claim).

## Inside the skill

| File | Holds |
|------|-------|
| `references/concurrency.md` | The lock decision tree, optimistic locking, conflicts, scaling limits |
| `references/actors.md` | The actor model, mixed activities, the Manual Tasks Report |
| `references/products.md` | Product states, acceptance, older schema versions |
| `references/recovery.md` | Interruption recovery, blockers, error handling |
| `references/work-types.md` | Development, architecture and consultancy specifics |
| `assets/templates/` | `changes.md`, `notes.md`, `decisions.md`, `agents.md`, `changelog.log`, a deliverable template |
| `assets/locks/` | An example lock file and the lock format |

## Related

- [aaw-next-task](aaw-next-task.md) shows the next task without doing it
- [Concepts](../concepts/index.md), sections 7 and 8
- [Work management](../concepts/work-management.md) for the full concurrency and recovery model
