# work

Work items, activities, tasks and initiatives held in plain files: triage, scope, plan, execute, report. One skill with five flows, which until version 3.0.0 were five skills (`aaw-start-work`, `aaw-progress-work`, `aaw-work-status`, `aaw-next-task`, `aaw-start-initiative`). Source: [skills/work/](../../skills/work/SKILL.md).

| Flow | Was |
|---|---|
| [`/work start`](#start-work-start) | `aaw-start-work` |
| [`/work progress`](#progress-work-progress) | `aaw-progress-work` |
| [`/work status`](#status-work-status) | `aaw-work-status` |
| [`/work next`](#next-work-next) | `aaw-next-task` |
| [`/work initiative`](#initiative-work-initiative) | `aaw-start-initiative` |

## Start: `/work start`

Was `aaw-start-work`.

Classify a new piece of work and open only the workspace it earns, then scope, research and
plan it. Source: [skills/work/references/start.md](../../skills/work/references/start.md).

### Use it when

You have a new request and want it done properly: "start a work item for the auth
migration", "scope this before we build it", or `/work start <what you want>`.

```
/work start add rate limiting to the public API
/work start write a one-page guide to our release process
```

The argument is free text: the request, in your words. It is recorded verbatim.

### What it does

1. Triage, always first. It classifies the request:

   | Class | When | Result |
   |-------|------|--------|
   | Chore (the default) | No change to observable behaviour or output | Branch `chore/<desc>`, the work, a changelog line. No work item |
   | Change | Behaviour changes inside one unit | `WI-NNN` with a short `progress.yaml` and a one-paragraph plan, then straight to planning |
   | Intervention | Reaches beyond one unit: shared, many parts, or safety | `WI-NNN` with the full workspace, through every phase |
   | Inquiry | Not yet clear what to do | Handed to research, then triaged again |

2. Scoping, for an intervention. It records your exact words in `scope-ai.md`, asks what,
   why, constraints and success criteria, and writes `scope.md` only after you confirm its
   summary. It offers to link a ticket and never creates one.
3. Discovery, unless the approach is obvious. It researches the workspace and the web,
   presents two or three options with trade-offs and a recommendation, and records your
   choice (`research.md`, `decisions.md`). Every web source carries a URL and a date.
4. Planning. It confirms the level (a `workstream`, or an `epic` that lands within three
   months), names the products the work will leave behind with their quality criteria and
   approver, declares the order they must be built in, composes the definition of done from
   them, and only then derives the activities. It writes `plan.md`, `progress.yaml` and
   `changes.md` and asks you to approve the product breakdown and the activity graph.
5. It sets `status: in_progress`, claims the first available activity, and hands over to
   `/work progress`. It does not implement the plan.

### What it writes

In `<work_items_path>/WI-NNN-<slug>/`, numbered one above the highest existing `WI-`:

| File | Chore | Change | Intervention |
|------|:-----:|:------:|:------------:|
| `progress.yaml` | | yes | yes |
| `plan.md` | | light | yes |
| `scope.md`, `scope-ai.md` | | | yes |
| `changes.md` | | optional | optional, needed for a pull request |
| `research.md`, `decisions.md` | | | when research was done or a decision made |
| `notes.md` | | optional | optional |
| `deliverables/`, `locks/` | | yes | yes |

### Configuration

`work_items_path` (where to create the work item), `initiatives_path` (to link an
initiative), and `deliverables_register` (optional: product types to inherit quality
criteria from). See [Configuration](../reference/configuration.md).

### Inside the skill

| File | Holds |
|------|-------|
| `references/work-classification.md` | The three axes behind triage, class definitions, re-triage rules |
| `references/scoping.md` | The question set, the confirmation script, what goes in `scope.md` versus `scope-ai.md` |
| `references/discovery.md` | The research matrix by work type and the option format |
| `references/planning.md` | Complexity thresholds, the product description contract, the register rules, activity design |
| `references/examples.md` | Worked examples for development, architecture and consultancy work |
| `assets/templates/` | `progress.yaml`, `plan.md`, `scope.md`, `scope-ai.md`, `research.md`, `decisions.md`, `changes.md`, `notes.md` |

### Related

- [/work progress](#progress-work-progress) executes the plan
- [Concepts](../concepts/index.md), sections 3 to 6
- [Work classification](../concepts/work-classification.md)

## Progress: `/work progress`

Was `aaw-progress-work`.

Execute a work item that has been scoped and planned: claim an activity under a lock, work
its tasks in order, move its product through `drafted`, `in_review` and `accepted`, and
recover safely after an interruption. Source: [skills/work/references/progress.md](../../skills/work/references/progress.md).

### Use it when

A work item has a `plan.md` and a `progress.yaml`, and you want the work done or resumed:
"continue WI-004", "pick up where the last session stopped", or:

```
/work progress WI-004
/work progress
```

With no id it lists the work items not yet `done` and works the most recent. A chore has no
work item to progress; `/work start` finishes it in one pass.

### The loop

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

### What it writes

`progress.yaml` (statuses, versions, product states), `locks/<activity>.lock` while working,
`changelog.log`, the deliverables under `deliverables/`, and `changes.md`.

### Doing it by hand

The same claim and release are available from the shell, which is useful for testing and
for clearing up:

```
node .ai-assisted-work/bin/aaw.js claim WI-004-A2 --agent me
node .ai-assisted-work/bin/aaw.js release WI-004-A2
```

See [Commands](../reference/commands.md#aaw-claim).

### Inside the skill

| File | Holds |
|------|-------|
| `references/concurrency.md` | The lock decision tree, optimistic locking, conflicts, scaling limits |
| `references/actors.md` | The actor model, mixed activities, the Manual Tasks Report |
| `references/products.md` | Product states, acceptance, older schema versions |
| `references/recovery.md` | Interruption recovery, blockers, error handling |
| `references/work-types.md` | Development, architecture and consultancy specifics |
| `assets/templates/` | `changes.md`, `notes.md`, `decisions.md`, `agents.md`, `changelog.log`, a deliverable template |
| `assets/locks/` | An example lock file and the lock format |

### Related

- [/work next](#next-work-next) shows the next task without doing it
- [Concepts](../concepts/index.md), sections 7 and 8
- [Work management](../concepts/work-management.md) for the full concurrency and recovery model

## Status: `/work status`

Was `aaw-work-status`.

Report the status of work items and initiatives: activity progress, product states, the
activity graph, locks, parallel work and stale items. Read-only. Source: [skills/work/references/status.md](../../skills/work/references/status.md).

### Use it when

You want to know what is in flight, how something is tracking, or what is blocked:

```
/work status              every active work item, grouped by initiative
/work status WI-001       one work item in detail
/work status IN-002       one initiative and its members
```

### What it shows

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
  `/work progress`
- stale work items: not updated for seven days and not `done`, `abandoned` or `blocked`
- blocked items, naming the blocker

It never writes to `progress.yaml`, never claims and never clears a lock.

Symbols: `→` active, `✓` complete, `○` pending, `✗` blocked, `⌛` awaiting a human.

### From the shell

`aaw status`, `aaw status WI-NNN` and `aaw status IN-NNN` give a shorter version of the same
views. See [Commands](../reference/commands.md#aaw-status).

### Inside the skill

`references/status-reference.md` holds the status values, activity states, the legend and
the lock durations.

### Related

- [/work next](#next-work-next) for what to do next inside one work item
- [/work progress](#progress-work-progress) to act on what the report shows

## Next: `/work next`

Was `aaw-next-task`.

Identify the next task inside a work item and present it with the context needed to start,
respecting activity dependencies and the product flow. It reads and reports; it does not do
the task. Source: [skills/work/references/next.md](../../skills/work/references/next.md).

### Use it when

You want to know what to pick up next, or to get your bearings before resuming:

```
/work next WI-017
/work next
```

With no id it infers the work item from the git branch name (`wi/WI-017-...`), then recent
commits, then the most recent work item that is `in_progress`, and says which it picked.

### How it chooses

1. Activities that are `pending` or `in_progress`.
2. Whose `depends_on` are all `completed` or `skipped`.
3. Not locked by another worker, unless the lock has expired.
4. The first `pending` task among them.

When nothing is eligible it names what is in the way: an unmet dependency, a live lock, or
an empty plan.

### What it shows

The task id, the work item and its level, the activity, the product the activity produces
and that product's state, the task, the actor, any context from the task's notes, the
activity's dependencies, and the rest of the activity's tasks. When the task entry is thin it
reads `scope.md`, `plan.md`, `scope-ai.md` and the product's `quality_criteria`, and
summarises what matters.

An activity with no `produces` on a `schema_version: 3` work item is reported as a planning
defect.

### From the shell

`aaw next-task [WI-NNN]` gives a quick answer without the context. It does not check locks,
and it counts only `completed` dependencies. See
[Commands](../reference/commands.md#aaw-next-task).

### Related

- [/work progress](#progress-work-progress) does the task this skill finds
- [/work status](#status-work-status) reports across work items

## Initiative: `/work initiative`

Was `aaw-start-initiative`.

Create an initiative: the container that groups related work items toward one goal, with its
time horizon and success criteria, registering any existing work items into it. Version
2.2.0. Source: [skills/work/references/initiative.md](../../skills/work/references/initiative.md).

### Use it when

Several work items serve one goal and you want them tracked together:

```
/work initiative move every service onto the new identity platform
/work initiative group WI-004, WI-007 and WI-009 under the data migration
```

If the thing asked for is itself bounded and fits in one planning period, it is an epic, not
an initiative, and the skill says so rather than creating a container with one member.

### What it does

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
items join it when `/work start` sets their `initiative_id`.

Initiative statuses: `proposed`, `active`, `on_hold`, `completed`, `done`, `cancelled`.

### The optional OKR layer

On request, it also creates objectives (`OBJ-NNN`), key results (`KR-NNN`) and cadences such
as sprints (`SP-NNN`). A work item records the key results it advances in `advances_kr_ids`;
the objective's list of work items is a cache. Nothing changes for a workspace that does not
use it.

### Configuration

`initiatives_path`, created on first use; `work_items_path`, to register members. See
[Configuration](../reference/configuration.md).

### Inside the skill

| File | Holds |
|------|-------|
| `references/examples.md` | Worked examples |
| `assets/templates/initiative-scope.md`, `initiative-progress.yaml` | The two initiative files |
| `assets/templates/objective-progress.yaml`, `cadence.yaml` | The OKR layer |

### Related

- [/work start](#start-work-start) creates the member work items
- [/work status](#status-work-status) with `IN-NNN` reports on the initiative
