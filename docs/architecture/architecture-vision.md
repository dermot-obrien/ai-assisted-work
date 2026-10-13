# Architecture vision: agents coordinating through a git store

Status: draft for Dermot's review, 13 October 2026. Companion to [the vision](agent-coordination-vision.md), which says what is wanted and why in Dermot's words; this document says how it is built, what holds it together, and how it grows. Decisions it rests on are DD-12 to DD-17 in [design decisions](../about/design-decisions.md).

## 1. Context

Dermot works with many AI agents at once: several cloud and local sessions, more than one tool, and soon several paid and free platforms. They need to share one picture of what is open, take work without colliding, pass messages and instructions, and land changes in order, with Dermot able to see and steer all of it. No platform offers this across platforms, and no server is to be run for it.

```
                 Dermot (chat, GitHub app, review page)
                        │ instructions, dumps, decisions
                        ▼
 ┌───────────────┐   git pull / push    ┌──────────────────────────────┐
 │ Agent on any  │ ◄──────────────────► │ Threads store (a git repo)   │
 │ platform, any │                      │ tree + board, by source path │
 │ machine       │ ── PRs ──┐           └──────────────┬───────────────┘
 └───────────────┘          ▼                          │ read
                   ┌──────────────────┐        ┌───────▼────────┐
                   │ Code repositories│        │ Watchers (cron)│
                   │ plan files, PRs  │        │ no model       │
                   └──────────────────┘        └────────────────┘
```

## 2. Goals and constraints

| Goal | From |
|---|---|
| Any session, any tool, cloud or local, joins with one line and carries on | Vision point 1 |
| Work segmented by path; a view of a path includes everything beneath it | Point 2 |
| The tree is the to-do list; dumps are curated into the plan; claims, leases and a merge queue | Point 3 |
| One system for Dermot, many agents and many platforms | Point 4 |
| No dependence on one provider; one thinker, many doers | Point 5 |
| All activity, agents and consumption in one place; every allowance used | Point 6 |
| Works offline or on a machine with no shared repository | Point 7 |
| Skills installed one by one, no framework | Point 8 |

| Constraint | Consequence |
|---|---|
| No server to run | State is files in git; anything that must run on its own is a scheduled job |
| Many platforms with different tools | The only requirement on an agent is Node 18+, git and push access; the skill is plain JavaScript with no dependencies |
| Agents and Dermot share one GitHub account today | Rules that matter must become server-side identities and rulesets; until then they are conventions |
| Platforms sleep, run out of quota or die without notice | Every hold on anything is a lease that expires |

## 3. Building blocks

| Block | What it is | Where |
|---|---|---|
| Threads store | A git repository of append-only JSON files: the tree's events and the board's records, per source path | `dermot-obrien/threads` (or a local repository) |
| `thread` skill | One Node script (`thread.mjs`, with `board.mjs`) that reads and writes the store; the agent's whole client | The `work` bundle, committed in each workspace |
| `work` skill | Plan files: work items, activities, tasks, products, `progress.yaml` | The `work` bundle; plans live in the repository they belong to |
| Installer | `skills.mjs`: declares skills in `.agents/skills.json`, pins them in a lock, installs copies | Moving to `dermot-obrien/skills` |
| Pointer | A short `AGENTS.md` block for platforms that read no skills: what the board is, the two commands that join it, the rules | Each workspace |
| Watchers | Deterministic scheduled jobs: warden, review, dispatcher | GitHub Actions in the store repository (planned, WI-003) |
| Guardrails | Identities, rulesets, required reviews, environments, caps, halt | GitHub and each provider (planned) |

## 4. The store

### Layout

```
threads/
  events/YYYY-MM-DD/<utc-stamp>-<host>-<6 hex>.json     tree events, default source
  archive/<stamp>-<host>-<hex>.jsonl                    pruned closed branches
  board/YYYY-MM-DD/<stamp>-<host>-<hex>.json            board records, default source
  board/**/*.md                                         posts written by hand
  board-archive/<stamp>.jsonl                           settled board records
  sources/<path>/{events,archive,board,board-archive}/  the same, per source path
  README.md                                             the format, for agents without the skill
```

### Rules that make it safe for many writers

1. Every action is one new file, never edited. Two agents can never conflict on a file, so a push that loses a race rebases and retries without merging anything.
2. State is a replay: the tree is the events in time order; the board is its records in the order git first added them to `main`.
3. Ids are unique across the store; a source path is a folder, and paths nest (`patternode/platform` sits inside `patternode`).
4. Pruning moves settled records into a new archive file and never rewrites history.

### Records

| Kind | Records | Carries |
|---|---|---|
| Tree | `open`, `close`, `note`, `resume`, `move`, `rename`, `describe`, `kind`, `transfer` | Thread id, parent, text, context, status and resolution |
| Board | `hello`, `bye` | Presence: handle, tool, workspace, scope, lease |
| | `post` | From, to (handles, roles, `*`, `any`, `repo:<name>`), on a thread, kind (instruction, question, info, ready, standing, answer, dump), text, the task it opened |
| | `ack` | Seen, accepted, done or declined, with a note |
| | `claim`, `release` | A key (an activity, a thread, a post, `role:<name>`), holder, lease end |
| | `file`, `retract` | A curator's filing of a dump; a withdrawn post |

## 5. Core mechanisms

### Claims ordered by git, not clocks

A claim on a key holds when no unexpired claim on the same key by another agent reached `main` before it. Every reader computes the same answer from the same history, whatever the machines' clocks say. A claim counts once pushed; `NOT PUSHED` means not yet. Leases: presence and roles 8 hours, claims 1 hour, renewed by any claim of the same key or by `board wait`. An expired claim is free.

### Scopes by path

A chat joins at a source path. Posts to it, its roles or replies reach it from anywhere; broadcasts, open calls, standing orders and thread followers reach it from its own path, the paths above and the paths below. Claims and roles count across the whole store.

### One list of work

An open call (`post --to any`) opens a task thread in the tree; claiming the post claims the thread; closing either closes both. `board next` ranks what a chat could do: instructions and questions to it, the head of a merge queue it holds the role for, dumps if it curates, then open threads nobody holds. Work an agent left (claim lapsed) comes first, then tasks oldest first, then other threads. `--claim` takes the best, and on losing a race takes the next.

### Capture and curation

A dump is a post with no structure. A curator role files it: as a thread of a given kind linked to a plan activity or task, as a note, a duplicate, a reflection or nothing, and asks the author when unclear. An epic is refused as a link target; the activity it advances is named instead.

### Merge order

`board ready <owner/repo#n> --after <refs>` joins the merging role's queue in the order ready notes arrive, waits for every pull request it names, and keeps its place when posted again. The merging role marks `merging` and `merged`; `merging` refuses anything that waits.

### Waiting

`board wait` blocks until something new arrives for the chat (a post for it, an open call, an acknowledgement of one of its posts) or a timeout, renewing its leases meanwhile. On a platform that wakes an agent when a background command ends, this makes an idle agent cost nothing.

## 6. The plan on the board (to build)

The tree and board hold who does what; the plan files hold scope, products and state. To let many agents work one plan at once:

| Mechanism | Design |
|---|---|
| Publish | `board plan publish <WI>` opens a thread per activity (and task, where tasks are split) under the plan's thread, linked to its id; idempotent, so it is run again whenever the plan changes |
| Ready frontier | `board next` offers an activity only when every `depends_on` is complete in `progress.yaml`; `actor: human` activities are never offered to agents |
| Claim is the lock | Claiming `WI-012-A3` on the board replaces `locks/WI-012-A3.lock`; the work skill checks the board when it can reach the store |
| State in the pull request | The agent updates `progress.yaml` in the same pull request as the work, so plan and code merge together |
| Reservations | Claims on path keys (`path:bounded-contexts/portfolio/**`) warn other agents off shared files for one change |
| One view | `board status --plan <WI>`: each activity free, held or done, holder, what it waits on, its pull requests and their queue position |
| Ready by branch | `board ready` accepts a branch for platforms that open the pull request after the agent stops; the merging role resolves it |

Pilot: a plan of this repository's own, such as WI-003, whose activities can be worked by trial agents.

## 7. Agents and platforms

| Platform kind | How it joins | How it learns of new work |
|---|---|---|
| Wakes on a background command (Claude Code) | Skill committed at `.claude/skills/thread`; session-start hook prints the briefing | `board wait` in the background |
| Reads `AGENTS.md`, cannot wake (Cursor, Codex, Copilot, Jules, Devin, OpenHands, Gemini CLI as forecast) | The pointer in `AGENTS.md` | `board inbox` at turn boundaries; one task per session; a new session started by the dispatcher or Dermot |

Every platform reaches the store either through its GitHub app given the store repository, or through `THREADS_REMOTE` holding a token limited to the store. Platforms on trial use a separate trial store. The [compatibility matrix](../integration/agent-platforms.md) holds the state per platform.

## 8. Watchers (WI-003, to build)

| Watcher | Runs | Reads | Writes |
|---|---|---|---|
| Warden | Every 10 minutes | Presence, heartbeats (`beat`), claims, the capacity ledger | Releases a dead agent's claims with a note on each thread; reposts its work; records an inferred `limit` when several agents on one platform die in one window |
| Review | Daily and weekly | Everything in a period | A digest and its JSON: work done by agent and platform, rescues, consumption against allowance, what waits on Dermot, guardrail events; a static page |
| Dispatcher | On a tick, and at each platform's reset | Work waiting (`next --list`), the capacity ledger, caps | Starts agents where capacity is free and resets soonest; a phone notification where a platform cannot be started by script |

None uses a model, so none can run out of quota, and each is cheap enough to leave on.

## 9. Quality attributes

| Attribute | How it is met | Limit |
|---|---|---|
| Consistency | Append-only files and git's history order; every reader replays to the same state | A claim is not held until pushed |
| Availability | Any git host; agents keep working on local state and push later | GitHub outages stop new claims |
| Resilience | Leases expire; left work is taken first with its notes; the warden will shorten the gap | Without the warden, up to one lease length |
| Throughput | Tested with ten agents; pushes retry with jittered backoff | One `main` branch serialises pushes; hundreds of concurrent writers would need sharding by path into separate stores |
| Cost | Waiting costs nothing; watchers use no model | Platforms that cannot wait need a new session per task |
| Security | Tokens limited to the store; trial store kept apart | Agents share Dermot's identity until per-platform identities exist |
| Portability | Node and git only; local store mode | A platform that cannot run shell commands cannot take part |

## 10. Security and guardrails

| Rule | Today | Target |
|---|---|---|
| Only the merging role merges | Convention in the skill and each workspace's instructions | An identity per agent platform with no merge rights; rulesets allow merge only to Dermot and the merging identity |
| A guardrail changes only by Dermot | Deny rules in Claude Code, pinned tests | CODEOWNERS with required owner review in every repository |
| Agent access to the store | Session's own GitHub access, or a token in `THREADS_REMOTE` | A fine-grained token per platform, limited to its store |
| Swarm size and spend | None | Standing orders the dispatcher and `start` respect; provider spend limits |
| Stop | None | `board halt [--source <path>]`, honoured at every inbox check |

## 11. Roadmap

| Step | Delivers | Work item |
|---|---|---|
| 1 | Board fixes from wave 0 (thread 0.15.0) | WI-002, PR #71 |
| 2 | Skills standalone: `work` repository, installer in `dermot-obrien/skills` | WI-005 step 4 |
| 3 | Wave 1 platforms on a trial store | WI-002 |
| 4 | The plan on the board, piloted on a plan of this repository's own | New work item |
| 5 | Heartbeats, warden, halt and caps | WI-003 A1 to A3 |
| 6 | Review digest and page | WI-003 A4, A5 |
| 7 | Capacity ledger, dispatcher, platform starters | WI-003 A6, A7 |
| 8 | Per-platform identities and rulesets | Guardrails scope in patternode-architecture |

## 12. Risks and open questions

| Risk or question | Response |
|---|---|
| A platform that cannot push to the store | Its fact sheet's fallback: report through the pull request for the merging role to copy to the board; or leave the platform out |
| One `main` branch as the bottleneck | Measure in wave 1; split busy paths into stores of their own if pushes start to queue |
| Plan state in two places (plan files and the board) | The plan files stay the record; the board holds only claims and messages, and publishing is idempotent |
| Agents acting as Dermot on GitHub | Per-platform identities before wider use |
| Pilot plan for step 4 | A work item in this repository (WI-003 proposed); Dermot decides |
