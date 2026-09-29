# aaw-start-initiative

Create an initiative: the container that groups related work items toward one goal, with its
time horizon and success criteria, registering any existing work items into it. Version
2.2.0. Source: [skills/aaw-start-initiative/](../../skills/aaw-start-initiative/SKILL.md).

## Use it when

Several work items serve one goal and you want them tracked together:

```
/aaw-start-initiative move every service onto the new identity platform
/aaw-start-initiative group WI-004, WI-007 and WI-009 under the data migration
```

If the thing asked for is itself bounded and fits in one planning period, it is an epic, not
an initiative, and the skill says so rather than creating a container with one member.

## What it does

1. Scoping. It records your words verbatim, then asks, read-only, for the goal, the time
   horizon, measurable success criteria, what is in and out of scope, and which work items
   belong. It writes nothing until you confirm its summary.
2. Creation. In `<initiatives_path>/IN-NNN-<slug>/`, numbered one above the highest
   existing `IN-`, it writes:

   | File | Holds |
   |------|-------|
   | `scope.md` | The goal, success criteria, horizon, the work items table, why it exists, scope boundaries |
   | `progress.yaml` | `initiative_id`, `title`, `status: proposed`, owner, dates, `work_items`, optional `root_work_item` |

3. Registration. For each existing work item named, it sets `initiative_id` in that work
   item's own `progress.yaml`, which is the source of truth, and adds it to the initiative's
   `work_items` list, which is a cache.

An initiative has no plan, deliverables or locks: those belong to its work items. New work
items join it when `/aaw-start-work` sets their `initiative_id`.

Initiative statuses: `proposed`, `active`, `on_hold`, `completed`, `done`, `cancelled`.

## The optional OKR layer

On request, it also creates objectives (`OBJ-NNN`), key results (`KR-NNN`) and cadences such
as sprints (`SP-NNN`). A work item records the key results it advances in `advances_kr_ids`;
the objective's list of work items is a cache. Nothing changes for a workspace that does not
use it.

## Configuration

`initiatives_path`, created on first use; `work_items_path`, to register members. See
[Configuration](../reference/configuration.md).

## Inside the skill

| File | Holds |
|------|-------|
| `references/examples.md` | Worked examples |
| `assets/templates/initiative-scope.md`, `initiative-progress.yaml` | The two initiative files |
| `assets/templates/objective-progress.yaml`, `cadence.yaml` | The OKR layer |

## Related

- [aaw-start-work](aaw-start-work.md) creates the member work items
- [aaw-work-status](aaw-work-status.md) with `IN-NNN` reports on the initiative
