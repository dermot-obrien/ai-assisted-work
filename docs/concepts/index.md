# Concepts

The ideas you need to use AAW, in the order you meet them. Each section is short and links
to the long-form page where one exists.

## 1. Skills, and the workspace they run in

AAW is a set of [Agent Skills](https://agentskills.io): folders holding a `SKILL.md` that an
agent loads when a request matches its description, or when you type `/<name>`. The agent
sees only each skill's name and description at first; the body loads when the skill is
used, and the files under `references/` only when a branch of the procedure reaches them.

A workspace is the folder you open in your agent, usually a git repository. `aaw install`
puts the skills in the workspace's `.agents/skills/` (and links `.claude/skills/` at them
for Claude Code) and writes `.aaw-config.yaml` at its root. The skills read that file to
find where work lives. See [Installing in each agent](../integration/index.md) and
[Configuration](../reference/configuration.md).

## 2. Work lives outside the repository

By default work items live under `~/aaw/<tenant>/<repo>/work-items/`, outside the
repository, so scope notes, progress state and locks stay out of its history. The
`tenant` is your namespace across repositories and machines. Point `work_items_path` inside
the repository instead when you want the work committed alongside the code, as this
repository does in `change/work-items/`.

## 3. Triage first: most work is a chore

`/aaw-start-work` classifies every request before it creates anything:

| Class | When | What it gets |
|-------|------|--------------|
| Chore | It does not change observable behaviour or output (an enabler, a cosmetic fix, docs, a small fix) | A branch and a changelog line. No work item |
| Change | It changes behaviour inside one unit | A small work item: a short `progress.yaml` and a one-paragraph plan |
| Intervention | It reaches beyond one unit: shared, many parts, or safety | A full work item: scope, discovery, plan, execution |
| Inquiry | You are not sure what to do yet | Research first, then triage the outcome |

Defaulting to the lightest class is the point: ceremony is earned. See
[Work classification](work-classification.md).

## 4. The hierarchy

```
Initiative            a funded body of work toward one goal          IN-001
  Work item           a workstream (durable subject) or an epic      WI-001
    Activity          one product advanced, at story grain           WI-001-A1
      Task            one step inside an activity                    WI-001-A1-T1
```

A work item sits at one of two levels, set in `work_item_level`:

- A `workstream` is a subject, not a schedule. It accretes scope, may never end, and is
  decomposed into epics.
- An `epic` is a bounded slice that lands inside one planning period, three months at most.
  If it cannot, it was a workstream all along.

Initiatives are optional; a work item can stand alone. Teams that think in agile terms can
read epic, story and task for work item, activity and task.

## 5. Products first, then the work

Planning is product-based, after PRINCE2. A work item names the products it will leave
behind (its `deliverables`), each with why it is needed, its quality criteria and who
accepts it. It declares the order they must be built in (the product flow), composes its
definition of done from them, and only then derives the activities that produce them.

Every activity names the product it advances in `produces`. An activity that produces
nothing is invalid: effort with nothing left behind is motion, not work. A product's
`state` (planned, drafted, in_review, accepted) is tracked separately from the status of
the activities producing it, because all the work can be finished while the product still
waits for review.

An organisation that keeps a catalogue of the things it produces can point AAW at it with
`deliverables_register`, so each product inherits its type's quality criteria and approver.
See [Configuration](../reference/configuration.md#deliverables_register).

## 6. The lifecycle of a work item

```
Scoping → Discovery → Planning → Execution → Done
```

| Phase | Skill | Leaves behind |
|-------|-------|---------------|
| Scoping | `/aaw-start-work` | `scope.md` for people, `scope-ai.md` with the verbatim request and the reasoning for agents |
| Discovery (skipped when the approach is obvious) | `/aaw-start-work` | `research.md`, `decisions.md` |
| Planning | `/aaw-start-work` | `plan.md`, `progress.yaml`, `changes.md` |
| Execution | `/aaw-progress-work` | the deliverables, under `deliverables/` |

Each phase starts read-only, in dialogue with you, and writes only after you confirm.
`status` in `progress.yaml` follows the work: `scoping`, `discovery`, `planning`,
`in_progress`, `blocked`, `review`, `abandoned`, `done`.

## 7. `progress.yaml` is the source of truth

Everything an agent or the CLI knows about a work item is in its `progress.yaml`. It carries
a `version` that every writer increments: read it, do the work, re-read it, and write only
if the version is unchanged. That is optimistic locking, and it is what lets several agents
share one file. `changelog.log` beside it is append-only.

The file's shape is defined by the work ontology, `schemas/work.schema.json`; from
`schema_version: 3` every activity must name what it `produces`. See
[Skill bundles](../integration/skill-bundles.md#the-work-ontology).

## 8. Claims and actors

Before working an activity a worker claims it by creating `locks/<activity-id>.lock` with an
exclusive create. The lock names the holder and an expiry: an hour for an agent, eight hours
for a human. A live lock means someone else is working; an expired one means a worker was
interrupted, and `/aaw-progress-work` recovers from it. The one rule that matters most:
update `progress.yaml` before deleting your lock.

Each activity and task has an `actor`: `agent`, `human` or `any`. Agents skip human-only
activities and mark human tasks inside a mixed activity `awaiting_human`, which the status
report lists. See [Work management](work-management.md) and
[Scaling limits](scaling-limits.md).

## 9. Seeing where things are

`/aaw-work-status` reports every work item, one work item or one initiative, including
parallel opportunities, live and expired locks, and items not updated for seven days.
`/aaw-next-task` presents the next task with its context without doing it. The `aaw` CLI
gives the same view from the shell (`aaw status`, `aaw next-task`, `aaw lint`). See
[Commands](../reference/commands.md).

## 10. Initiatives and the optional OKR layer

`/aaw-start-initiative` creates an `IN-NNN` container with a goal, a time horizon and
success criteria, and registers work items into it. Membership is recorded on the work item
(`initiative_id`); the initiative's list is a cache.

A workspace can also run objectives and key results beside the hierarchy: a work item
advances key results (`advances_kr_ids`) rather than containing them. It is optional and
additive.

## 11. Threads: why each chat exists

`thread` is separate from work management and useful on its own. It keeps a tree of intents
in a git repository you own: each chat belongs to one thread, a tangent becomes a child, and
finished threads close with a one-line resolution. Every machine and agent reads the same
tree, so you can always find what a chat was for. See [the thread skill](../skills/thread.md).

## 12. Keeping installs honest

The installed skills are copies. An edit made to a copy is lost at the next install without
review, so `aaw check-skills` reports any installed skill that no longer matches its
framework. Each skill also ships a post-install check (`bin/check.mjs`) that tests the
workspace configuration it depends on. See [Skill bundles](../integration/skill-bundles.md).

## Going deeper

- [Work management](work-management.md): the full reference, including recovery
- [Agent boundaries](agent-boundaries.md): what agents may decide alone
- [Development work](development-work.md) and [Architecture work](architecture-work.md)
- [Architect cognitive load](architect-cognitive-load.md): the motivation
- [Design decisions](../about/design-decisions.md): why it is built this way
