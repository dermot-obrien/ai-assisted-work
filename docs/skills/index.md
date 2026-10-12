# Skills

This repository holds two standalone skills, below. Each depends on no other, and installs with `bin/skills.mjs` ([Installing the skills](../../DEPLOYMENT.md)).

| Skill | Version | Use it to | Writes |
|-------|---------|-----------|--------|
| [work](work.md) | 3.0.0 | Work items: [`/work start`](work.md#start-work-start) triages and plans, [`/work progress`](work.md#progress-work-progress) executes one claimed activity at a time, [`/work status`](work.md#status-work-status) reports, [`/work next`](work.md#next-work-next) presents the next task, [`/work initiative`](work.md#initiative-work-initiative) groups work items under a goal | work item and initiative folders, `progress.yaml`, locks, deliverables |
| [thread](thread.md) | 0.14.0 | Keep a tree of why each chat exists, and a bulletin board for agents, across machines and tools | events in your thread store |

The versions are each skill's `metadata.version`, also listed in `bundle.json`.

## What they share

Invoking. Type `/<skill>` followed by any arguments, or describe the job and let the agent
choose: each skill's description says when to use it. The skills take an id (`WI-017`,
`IN-002`) or free text; none take flags.

Configuration. `work` reads `.aaw-config.yaml` at the workspace root:
`work_items_path`, `initiatives_path`, and `deliverables_register` where set. With no config
they fall back to `./change/work-items/` and `./change/initiatives/`. `thread` reads
`threads_remote` and `threads_project`, and its environment variables. Every key is in
[Configuration](../reference/configuration.md).

Runtime. `work` is instructions only and needs nothing installed; its check needs Node.js 18 or newer. `thread` needs Node.js 18 or newer and git.

Post-install check. Each skill has `bin/check.mjs`, which confirms the configuration it
depends on. See [Commands](../reference/commands.md#post-install-checks).

Structure. Each skill folder holds `SKILL.md` (what the agent loads), `references/` (longer
procedure, loaded only when needed), `assets/` (templates it copies) and `bin/` (scripts).
The `SKILL.md` files stay short on purpose; this documentation is for people.

## A typical flow

```
/work initiative   (optional) a goal and a container
/work start         triage; for an intervention: scope, discovery, plan
/work progress      claim an activity, work its tasks, advance its product; repeat
/work status        at any point: what is in flight, blocked, stale or parallelisable
/work next          at any point: what to pick up next, with context
```

## Skills that used to live here

Six skills began in this repository and now live in their own. The `NOTICE` in markdown-deck, diagram-model and delivery-planning records the commit here each was taken from. They are not listed in this repository's `bundle.json`: a workspace declares each by repository in `.agents/skills.json` ([format](../../DEPLOYMENT.md#declare-a-workspaces-skills)).

| Skill | Repository |
|-------|------------|
| `markdown-deck` | [markdown-deck](https://github.com/dermot-obrien/markdown-deck) |
| `model` | [diagram-model](https://github.com/dermot-obrien/diagram-model) |
| `pattern`, `use-case`, `cross-reference` | [architecture-pattern](https://github.com/dermot-obrien/architecture-pattern) |
| `quarter-planning` | [delivery-planning](https://github.com/dermot-obrien/delivery-planning) |
