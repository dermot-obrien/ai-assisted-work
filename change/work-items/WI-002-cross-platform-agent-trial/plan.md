# Work Item Plan: WI-002 Cross-platform agent trial

**Work Type:** development

**Level:** epic. It lands in 2026-Q4.

## Analysis Summary

### Problem Statement

The board (thread 0.14.0, DD-13 to DD-16) is built and unit-tested, but no agent has yet used it for real work, and nobody knows which agent platforms can join it. Until that is known, work cannot be spread across subscriptions.

### Current State

`scripts/test-board.mjs` (24 tests) drives the board with one process playing many handles against a local bare store. Nothing has run a real model through it: an agent joining from a one-line pointer, claiming against other agents racing it, opening a pull request and leaving the merge to the role.

### Proposed Approach

Run the trial in waves, the cheapest-to-observe first, and let the trial agents do real work for the trial itself.

| Wave | Platforms | Started by |
|---|---|---|
| 0 | Claude Code on the web (cloud sessions), Claude Code CLI (local, headless) | This session, the thinker: `create_session` for cloud, `claude -p` for local |
| 1 | Cursor cloud agents, Codex, Copilot coding agent, Jules | The user, from each platform, with the same one-line pointer |
| 2 | Gemini CLI, Devin, OpenHands | The user, or a script where the platform has one |

Wave 0's open calls are the platform fact sheets of activity A1: each Claude agent claims one platform, researches it on the vendor's own pages, writes `docs/integration/platforms/<platform>.md`, opens a pull request into the sandbox branch and posts `board ready`. So the trial exercises every checklist row on real work, and its output is what wave 1 needs.

### The sandbox, as built

The scope recommended two new private repositories. The GitHub integration this session runs under cannot create repositories (403), so wave 0 uses what exists:

| Piece | Wave 0 | Before wave 1 (the user) |
|---|---|---|
| Store | Source `trial` in `dermot-obrien/threads`. Board scopes keep it apart: a chat joined at `trial` sees nothing of `patternode`, `me` or the default source, and they see nothing of it | Create `threads-trial` if a platform needs a token limited to the store |
| Workspace | Branch `claude/bulletin-board-agent-collab-tmzxc5` of `dermot-obrien/ai-assisted-work`, with the skill committed at `.claude/skills/thread/`, `.aaw-config.yaml` (`threads_source: trial`), `AGENTS.md` and `CLAUDE.md` pointers. Trial pull requests target that branch, never `main` | Create `board-trial` for platforms that should not see AAW |
| Merging role | `master:board-trial`, held by this session | Same |

### New mechanisms (bootstrapped here)

| Mechanism | Why |
|---|---|
| Work item activities claimed on the board instead of `locks/` files | The work skill already allows it ("claim `WI-012-A3` on the board as well as with the lock file"); this work item runs that way, so the board coordinates its own trial |
| `scripts/board-trial.mjs`: `seed` puts the trial's open calls on the board; `check` grades the checklist per agent from the store alone | A trial result is evidence in the store, not an agent's own report |
| The one-line pointer, `AGENTS.md` and `CLAUDE.md` text for workspaces | The same words start an agent on any platform |

## Product Breakdown

| ID | Product | Why it is needed | Quality criteria | Approver | State |
|----|---------|------------------|------------------|----------|-------|
| WI-002-D1 | Platform fact sheets, one per platform (`docs/integration/platforms/`) | Wave 1 setup depends on how each platform loads instructions and reaches a second repository | Every claim cites the vendor's own page with the date read; unknowns say so | Dermot | planned |
| WI-002-D2 | The sandbox and trial harness (the sandbox branch, `scripts/board-trial.mjs`) | The checklist must be run the same way on every platform and graded from evidence | `seed` is idempotent; `check` grades checks 1 to 9 and 11 from the store and GitHub state | Dermot | planned |
| WI-002-D3 | The pointer for workspaces (`AGENTS.md`, `CLAUDE.md` text; the setup reference) | Platforms that do not load skills need to be led to the board | One line starts an agent; the rules (claim first, never merge) are in it | Dermot | planned |
| WI-002-D4 | Compatibility matrix (`docs/integration/agent-platforms.md`) | The trial's result | One row per platform tried, each cell from `check` output or marked not tried | Dermot | planned |
| WI-002-D5 | Board and skill fixes the trial turns up, with tests | Breakage found must not be left for wave 1 | Each fix has a test in `scripts/test-board.mjs` or `test-thread.mjs` | Dermot | planned |
| WI-002-D6 | Private results note with prices and the recommended line-up | The decision the trial informs | Dated; prices from vendor pages | Dermot | planned |

## Product Flow

```
D2 ──> D1 (written by wave 0 agents) ──> D3 ──> D4 ──> D6
 └──────────────> D5 (from every run)
```

## Definition of Done

This work item is done when every product in the Product Breakdown has reached `accepted` against its own quality criteria.

## Activity Dependency Graph

```
A2 sandbox + harness ──> A4a wave 0 (Claude cloud + local) ──┬──> A5 concurrent + handoff ──> A6 fixes
                                    │                         │
                                    └──> A1 fact sheets ──> A3 pointer ──> A4b wave 1 ──> A7 week of real work ──> A8 wave 2 ──> A9 publish
```

A1 is done by the wave 0 agents themselves, so A4a and A1 run together.

| Activity | Product | Actor | Depends on |
|---|---|---|---|
| A1 Platform fact sheets from vendor pages | D1 | agent (wave 0 trial agents) | A2 |
| A2 Sandbox, harness, seed | D2 | agent | |
| A3 Pointer text and setup reference | D3 | agent | A1 |
| A4a Wave 0: Claude Code cloud and CLI | D4 | agent | A2 |
| A4b Wave 1: Cursor, Codex, Copilot, Jules | D4 | human starts each platform; agent grades | A3 |
| A5 Concurrent and handoff runs | D4 | agent | A4a |
| A6 Fix what broke | D5 | agent | A4a, A5 |
| A7 A week of real work across platforms | D6 | human | A4b, A6 |
| A8 Wave 2 platforms | D4 | human | A6 |
| A9 Publish matrix and setup notes; private results note | D4, D6 | agent | A7, A8 |
