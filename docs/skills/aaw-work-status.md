# aaw-work-status

Report the status of work items and initiatives: activity progress, product states, the
activity graph, locks, parallel work and stale items. Read-only. Version 2.3.0. Source:
[skills/aaw-work-status/](../../skills/aaw-work-status/SKILL.md).

## Use it when

You want to know what is in flight, how something is tracking, or what is blocked:

```
/aaw-work-status              every active work item, grouped by initiative
/aaw-work-status WI-001       one work item in detail
/aaw-work-status IN-002       one initiative and its members
```

## What it shows

- All work items: grouped by `initiative_id`, with epics nested under their workstream, and
  the rest under Standalone.
- One work item: level, status, period, the intent from `scope.md`, the products and their
  states, the definition of done (how many products are accepted), a progress bar, the
  activity graph, and every activity and task with who holds or completed it.
- One initiative: its goal, horizon, success criteria and member work items.

Product state and activity progress are reported separately, because every activity can be
complete while a product is still in review.

Without being asked it also surfaces:

- parallel opportunities: activities with no unmet dependencies and no live lock
- lock state: live locks with time left, and expired locks that need recovery through
  `/aaw-progress-work`
- stale work items: not updated for seven days and not `done`, `abandoned` or `blocked`
- blocked items, naming the blocker

It never writes to `progress.yaml`, never claims and never clears a lock.

Symbols: `→` active, `✓` complete, `○` pending, `✗` blocked, `⌛` awaiting a human.

## From the shell

`aaw status`, `aaw status WI-NNN` and `aaw status IN-NNN` give a shorter version of the same
views. See [Commands](../reference/commands.md#aaw-status).

## Inside the skill

`references/status-reference.md` holds the status values, activity states, the legend and
the lock durations.

## Related

- [aaw-next-task](aaw-next-task.md) for what to do next inside one work item
- [aaw-progress-work](aaw-progress-work.md) to act on what the report shows
