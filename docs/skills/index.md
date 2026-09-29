# Skills

AAW ships six Agent Skills. Five manage work; `thread` is general tooling that stands on its
own.

| Skill | Version | Use it to | Writes |
|-------|---------|-----------|--------|
| [aaw-start-work](aaw-start-work.md) | 2.5.0 | Triage a request and, when it earns one, scope and plan a work item | a work item folder |
| [aaw-progress-work](aaw-progress-work.md) | 2.4.0 | Execute a planned work item, one claimed activity at a time | `progress.yaml`, locks, deliverables |
| [aaw-work-status](aaw-work-status.md) | 2.3.0 | Report on work items and initiatives | nothing |
| [aaw-next-task](aaw-next-task.md) | 2.2.0 | Present the next task with its context, without doing it | nothing |
| [aaw-start-initiative](aaw-start-initiative.md) | 2.2.0 | Create an initiative that groups work items under one goal | an initiative folder |
| [thread](thread.md) | 0.8.2 | Keep a tree of why each chat exists, across machines and agents | events in your thread store |

The versions are each skill's `metadata.version`, also listed in `bundle.json`.

## What they share

Invoking. Type `/<skill>` followed by any arguments, or describe the job and let the agent
choose: each skill's description says when to use it. The skills take an id (`WI-017`,
`IN-002`) or free text; none take flags.

Configuration. The `aaw-*` skills read `.aaw-config.yaml` at the workspace root:
`work_items_path`, `initiatives_path`, and `deliverables_register` where set. With no config
they fall back to `./change/work-items/` and `./change/initiatives/`. `thread` reads
`threads_remote` and `threads_project`, and its environment variables. Every key is in
[Configuration](../reference/configuration.md).

Runtime. The `aaw-*` skills are instructions only and need nothing installed; their checks
and the optional `aaw` CLI need Node.js 18 or newer. `thread` needs Node.js 18 or newer and
git.

Post-install check. Each skill has `bin/check.mjs`, which confirms the configuration it
depends on. See [Commands](../reference/commands.md#post-install-checks).

Structure. Each skill folder holds `SKILL.md` (what the agent loads), `references/` (longer
procedure, loaded only when needed), `assets/` (templates it copies) and `bin/` (scripts).
The `SKILL.md` files stay short on purpose; this documentation is for people.

## A typical flow

```
/aaw-start-initiative   (optional) a goal and a container
/aaw-start-work         triage; for an intervention: scope, discovery, plan
/aaw-progress-work      claim an activity, work its tasks, advance its product; repeat
/aaw-work-status        at any point: what is in flight, blocked, stale or parallelisable
/aaw-next-task          at any point: what to pick up next, with context
```

## Skills that used to live here

Three skills began in this repository and now live in their own, so they install without
AAW. Each repository's `NOTICE` records the commit here it was taken from.

| Skill | Repository |
|-------|------------|
| `markdown-deck` | [markdown-deck](https://github.com/dermot-obrien/markdown-deck) |
| `model` | [diagram-model](https://github.com/dermot-obrien/diagram-model) |
| `quarter-planning` | [delivery-planning](https://github.com/dermot-obrien/delivery-planning) |
