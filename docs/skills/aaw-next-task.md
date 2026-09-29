# aaw-next-task

Identify the next task inside a work item and present it with the context needed to start,
respecting activity dependencies and the product flow. It reads and reports; it does not do
the task. Version 2.2.0. Source: [skills/aaw-next-task/](../../skills/aaw-next-task/SKILL.md).

## Use it when

You want to know what to pick up next, or to get your bearings before resuming:

```
/aaw-next-task WI-017
/aaw-next-task
```

With no id it infers the work item from the git branch name (`wi/WI-017-...`), then recent
commits, then the most recent work item that is `in_progress`, and says which it picked.

## How it chooses

1. Activities that are `pending` or `in_progress`.
2. Whose `depends_on` are all `completed` or `skipped`.
3. Not locked by another worker, unless the lock has expired.
4. The first `pending` task among them.

When nothing is eligible it names what is in the way: an unmet dependency, a live lock, or
an empty plan.

## What it shows

The task id, the work item and its level, the activity, the product the activity produces
and that product's state, the task, the actor, any context from the task's notes, the
activity's dependencies, and the rest of the activity's tasks. When the task entry is thin it
reads `scope.md`, `plan.md`, `scope-ai.md` and the product's `quality_criteria`, and
summarises what matters.

An activity with no `produces` on a `schema_version: 3` work item is reported as a planning
defect.

## From the shell

`aaw next-task [WI-NNN]` gives a quick answer without the context. It does not check locks,
and it counts only `completed` dependencies. See
[Commands](../reference/commands.md#aaw-next-task).

## Related

- [aaw-progress-work](aaw-progress-work.md) does the task this skill finds
- [aaw-work-status](aaw-work-status.md) reports across work items
