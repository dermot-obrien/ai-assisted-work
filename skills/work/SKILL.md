---
name: work
description: "Manage real work as work items, activities and tasks in plain files: triage a request into chore, change, intervention or inquiry and open only the workspace it earns; scope and plan a work item from the products it will leave behind; execute it one activity at a time under a lock; report status; present the next task; dispatch it to parallel agents through pull requests; group work items under an initiative. Use when asked to start work, start or scope a work item, open a WI, plan work before building it, or classify a request (/work start); to progress, continue, execute or resume a WI (/work progress); for work status, what is in flight, blocked or stale (/work status); what to do next or what is ready to pick up (/work next); to fan out agents on a WI in parallel via GitHub (/work dispatch); or to start an initiative, group work items under a goal or open an IN-NNN (/work initiative). Also answers to its old names: aaw-start-work, aaw-progress-work, aaw-work-status, aaw-next-task, aaw-start-initiative."
license: CC-BY-4.0
compatibility: Reads .aaw-config.yaml at the workspace root for work_items_path, initiatives_path and the optional deliverables_register; works with their defaults when the file is absent. No runtime dependencies; bin/check.mjs needs Node.js 18 or newer.
metadata:
  author: dermot-obrien
  version: "3.2.0"
---

# Work

Real work held in plain files, so every agent and person reads the same state: triage first, then only the ceremony the work earns. Domain-agnostic, and not tied to any one agile method.

This skill was five skills (`aaw-start-work`, `aaw-progress-work`, `aaw-work-status`, `aaw-next-task`, `aaw-start-initiative`), one method over one set of files. They are now flows of one skill, each in its own reference, so nothing depends on anything else. A user who types an old name gets the flow it named.

## The flows

| The user | Flow | Read |
|---|---|---|
| `/work start <request>`, "start work on …", "scope a work item", "plan this before building it" | Triage, then for a change or intervention: scope, research, plan | [references/start.md](references/start.md) |
| `/work progress [WI-NNN]`, "progress", "continue", "resume" a work item | Execute one activity at a time under a lock, and recover after an interruption | [references/progress.md](references/progress.md) |
| `/work status [WI-NNN \| IN-NNN]`, "what is in flight", "what is blocked or stale" | Report progress, products, locks, parallel work and stale items | [references/status.md](references/status.md) |
| `/work next [WI-NNN]`, "what's next", "what is ready to pick up" | Present the next task with its context, without doing it | [references/next.md](references/next.md) |
| `/work dispatch WI-NNN [workers]`, "run this in parallel", "fan out agents on it" | Publish the plan to the remote and GitHub, start workers in separate checkouts, watch and refill | [references/dispatch.md](references/dispatch.md) |
| `/work initiative <goal>`, "start an initiative", "group these work items" | Create an initiative and register work items in it | [references/initiative.md](references/initiative.md) |

Read the flow's reference before acting, and the references it names when it names them. With no flow named, triage the request as `/work start` does.

## The model in brief

- **Hierarchy.** Initiative, work item, activity, task. A work item is a `workstream` (a durable subject that may never end) or an `epic` (a slice that lands within one planning period, three months at most). An agile team can read epic, story and task.
- **Triage first.** Chore, change, intervention or inquiry ([references/work-classification.md](references/work-classification.md)). Most requests are chores and get no work item.
- **Products.** Planning is product-based: every activity names the product it advances, which moves through drafted, in review and accepted ([references/products.md](references/products.md)).
- **Files.** A work item is a folder `WI-NNN-<kebab-title>/` under `work_items_path`, with `scope.md`, `plan.md`, `progress.yaml` and a `locks/` folder. Ids: `WI-012`, activities `WI-012-A3`, tasks `WI-012-A3-T2`.

## Rules that hold in every flow

1. One agent per activity, under a lock created atomically; never work without it, never overwrite one, never guess the time to judge expiry. With `coordination: files` the lock is a file in `locks/` ([references/concurrency.md](references/concurrency.md)); with `coordination: github` it is the branch `wi/<activity-id>` on the remote, created with `bin/claim.mjs` ([references/github.md](references/github.md)).
2. Update `progress.yaml` before releasing a lock. The next worker trusts the state left behind.
3. Never claim or execute work marked for a human (`actor: human`); mark it awaiting the human instead ([references/actors.md](references/actors.md)).
4. After an interruption, recover from the files, never from memory ([references/recovery.md](references/recovery.md)).
5. Workspace rules win: where a workspace forbids committing, merging or deploying, those stay the user's.

## Configuration

`.aaw-config.yaml` at the workspace root, a plain workspace file that other skills may share. This skill reads:

| Key | Default | Meaning |
|---|---|---|
| `work_items_path` | `./change/work-items/` | Where work item folders live |
| `initiatives_path` | `./change/initiatives/` | Where initiatives live |
| `deliverables_register` | unset | An optional catalogue of deliverable types to name products from |
| `coordination` | `files` | `files`: workers share one checkout and lock files. `github`: workers in separate checkouts claim activities as branches on the remote |
| `base_branch` | the remote's default | The branch plans and activity pull requests go into |
| `coordination_remote` | `origin` | The remote that holds claims |
| `issues` | `none` | `github`: mirror work items and activities as issues and sub-issues |
| `integration_merge` | `human` | `agent`: workers may merge reviewed activity pull requests into a work item's integration branch, never into `base_branch` |

`node <this skill's directory>/bin/check.mjs`, run from the workspace root, reports a missing or wrong path.

## With other skills, when they are installed

None is needed. Where the workspace has them:

- A research skill (AI-Assisted Research) takes inquiries; without one, an inquiry is written down and stops ([references/start.md](references/start.md)).
- `quarter-planning` reads epics' optional planning block ([references/planning.md](references/planning.md)).
- Where agents work from separate checkouts, set `coordination: github`: claims become branches on the remote and every activity lands as a pull request ([references/github.md](references/github.md)). A coordination board, where the workspace has one, can show those claims too, but the branch is the one that excludes.
- GitHub access (an MCP server or `gh`) lets `/work dispatch` mirror the plan into issues. Without it the branches and pull requests carry the work alone.
