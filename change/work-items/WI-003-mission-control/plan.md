# Work Item Plan: WI-003 Mission control

**Work Type:** development

**Level:** epic. It lands in 2026-Q4.

## Continuing this work (any agent)

State lives in [progress.yaml](progress.yaml). Read it first; the scope is [scope.md](scope.md). This work item follows the cross-platform trial, [WI-002](../WI-002-cross-platform-agent-trial/plan.md), and uses the same branch, store and roles:

| Where | What |
|---|---|
| Branch | `claude/bulletin-board-agent-collab-tmzxc5` in `dermot-obrien/ai-assisted-work`. Work on your own branch from it and open PRs into it, never into `main` |
| Store | `dermot-obrien/threads-trial`, source `trial`; the pool is `sources/trial/pool.json` there |
| Code | `skills/thread/bin/board.mjs` (the `pool` commands), `skills/thread/bin/pool.mjs` (starters); tests in `scripts/board-tests/pool.test.mjs`. Copy every change to `.claude/skills/thread/` too |
| Roles | `master:board-trial` merges in queue order; `dispatcher:trial` runs `pool tick` |

To pick up: join the board (`node .claude/skills/thread/bin/thread.mjs board start --tool <tool> --source trial`), claim the activity you take (`board claim WI-003-A2`), do its next pending task, run `npm test`, update progress.yaml, open a PR into the branch, post `board ready`, and release. Tasks marked `awaiting_human` are Dermot's.

## Analysis Summary

### Problem Statement

The board coordinates agents, but a person still starts each one, notices when one dies, and guesses which platform has allowance left. WI-002's race 1 showed the limit of keeping agents idle in a pool: only Claude Code can wait on the board, and every other platform's session ends with its turn.

### Proposed Approach

A pool of ways to start agents rather than a pool of idle agents. Work waits on the board as open calls. A dispatcher starts one agent per free task on a platform with room; the agent takes one task, posts ready and stops. A warden with no model notices an agent that died, releases its claims with a note, and the next tick starts another agent, which reads the first one's notes. Reliability comes from claims that expire and work that restarts, not from any agent staying up.

| Platform | How it is started | State, 13 October 2026 |
|---|---|---|
| Claude Code (cloud) | `ask`: the dispatcher session uses `create_session` | Proven by hand in race 1 |
| Copilot | `ask` through the GitHub tools, or `command` (`gh agent-task create`) from a job | Proven by hand in race 1 |
| Cursor | `cursor`: the cloud agents API | Built, tested against a stand-in; needs a key |
| Jules | `jules`: the Jules API, opening its own PR | Built, tested against a stand-in; needs a key |
| Codex | Unknown: is a cloud task scriptable? | To find out (A7-T5) |

## Product Breakdown

| ID | Product | Quality criteria | State |
|----|---------|------------------|-------|
| WI-003-D1 | Board events (`start`, `limit`, `beat`, `usage`) and `pool.json` | Documented, written and read by commands with tests | drafted |
| WI-003-D2 | The warden and its scheduled workflow | No model; dead agents' work released with a note and restarted | planned |
| WI-003-D3 | Halt, resume and caps | Agents stop at the next inbox check; the pool respects caps | planned |
| WI-003-D4 | `board review` and its JSON | A day or a week: activity, agents, rescues, consumption, what waits on Dermot | planned |
| WI-003-D5 | The review page | Readable on a phone; rebuilt by the warden's workflow | planned |
| WI-003-D6 | The dispatcher: `pool tick` on a schedule | Never starts twice for one task; skips limited platforms; runs without a person | drafted |
| WI-003-D7 | Platform starters | Each proven by a real start, or marked not scriptable with the reason | drafted |
| WI-003-D8 | Docs and DD-17 | The pool, warden and review can be set up from the docs alone | planned |

## Activity Dependency Graph

```
A1 events ──┬──> A2 warden ──┬──> A5 review page
            ├──> A4 review ──┘
            └──> A6 dispatcher ──> A8 docs
A7 starters (independent) ─────> A6 runs unattended
A3 halt and caps (independent)
```

| Activity | Product | Actor | Depends on |
|---|---|---|---|
| A1 Board events and pool.json | D1 | agent | |
| A2 The warden | D2 | agent | A1 |
| A3 Halt, resume and caps | D3 | agent | |
| A4 The review | D4 | agent | A1 |
| A5 The review page | D5 | agent | A2, A4 |
| A6 The dispatcher | D6 | agent | A1 |
| A7 Platform starters | D7 | agent; keys from Dermot | |
| A8 Docs, DD-17 | D8 | agent | A2, A6 |

## Definition of Done

Every product above is accepted against its criteria, and WI-002's race 2 has run through the pool with no person starting an agent.
