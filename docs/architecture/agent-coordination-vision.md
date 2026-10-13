# Agents working together: the vision

Status: draft for Dermot's review, 13 October 2026. Sources: WI-002 and WI-003 scopes (the user's words of 11 October), the board's design decisions DD-13 to DD-16, patternode-architecture's agent guardrails scope, Life Guide DEC-032, how EP-002 (WI-062) is being run across nine sessions, and the wave 0 trial of 13 October.

## In one paragraph

Many agents, on many platforms and subscriptions, work on the same plans at once, around the clock, without stepping on each other and without Dermot relaying messages between them. One platform does the thinking (design, decisions, curation, merging); many others do the work. The plan says what is to be done, the board says who is doing what right now, small deterministic jobs keep it all alive and honest, and guardrails on the server make sure no agent can do what only Dermot or a merging role may do. Dermot sees all of it in one place, steers it from his phone, and pays only for agents that are working.

## What Dermot asked for

In his words, from the scopes:

- "Spread things out so I'm not depending on anyone and have lots of capability", with "a primary one for thinking, like Claude, and lots of others for doing progressive work."
- "A mission control interface where I can do my weekly review or even a daily review and see all the activity that's going on, all of the agents I'm using, and all of the consumption, in one place."
- "Use 100% of the capacity every day, including resets throughout the day, and 100% of my weekly capacity every week, across all of the agent systems I subscribe to."
- "If an agent runs out of capacity … it'll just die, so maybe there is a still-alive check that is always on, that if it finds an agent has died it takes the work and assigns it to someone else, and puts that as a note, so we have full resilience."
- "There's the potential for a swarm here, which is why I need mission control to keep an eye on what they're doing and have appropriate guardrails in place."
- And on 13 October: coordination of agents working on the same plan.

## Why: how it works today, and what that costs

| Today | Cost |
|---|---|
| A "master" session per repository, found by its chat title (open pull request #57 would make the title prefix a workspace setting; board roles supersede it); workers tell it a pull request is ready with `send_message`, a thread note and a closing line in their reply | Works only inside one provider; a renamed or dead session breaks the chain; Dermot relays when it cannot be reached |
| A coordinator chat per plan (EP-002, the briefing films) that holds the merge order and checks every few hours whether anything changed | The EP-002 coordinator and the board-design session each passed USD 130 to 140, most of it re-reading a very large context to find that nothing had changed |
| Merge order written by hand in chat ("#494, #496, #495, #501, #499, then #502") | Lost when the chat ends; nothing stops an out-of-order merge |
| Activity locks as files in a local `locks/` folder | Agents in separate clones or tools cannot see each other's locks |
| Rules as prose in each repository's `CLAUDE.md`, `AGENTS.md` and tool rules | A rule an agent only reads is a convention; platforms read them differently, and some contradict each other |
| One platform (Claude) for nearly everything | One quota, one outage or one price change stops all work |

## The picture

Five layers, each with one job. Each layer is plain files in git or a small job, so any agent on any platform can take part with Node and git, and nothing needs a server of its own.

```
  Dermot ── phone, chat, mission control page, Markdown file from the GitHub app
     │
  ┌──▼────────────────────────────────────────────────────────────────────────┐
  │ INTENT   the thread tree: why each piece of work exists, what is open     │  threads store
  ├───────────────────────────────────────────────────────────────────────────┤
  │ PLAN     work items, activities, tasks; products and their states;        │  each repository
  │          dependencies between activities                                  │  (work skill)
  ├───────────────────────────────────────────────────────────────────────────┤
  │ BOARD    who holds what (claims, roles), messages and instructions,       │  threads store
  │          merge queues, presence, standing orders                          │  (thread board)
  ├───────────────────────────────────────────────────────────────────────────┤
  │ AGENTS   thinkers and doers on any platform, joined at a scope            │  Claude, Cursor,
  │          ("Go pick up work in patternode")                                 │  Codex, Copilot, ...
  ├───────────────────────────────────────────────────────────────────────────┤
  │ WATCHERS no model: warden (liveness, rescue), dispatcher (capacity),      │  GitHub Actions
  │          review (daily and weekly digest)                                 │  on a schedule
  └───────────────────────────────────────────────────────────────────────────┘
  GUARDRAILS on the server, around all of it: identities without merge rights,
  rulesets, required reviews, CODEOWNERS, environments, spend limits, halt
```

## Principles

1. **A repository Dermot owns is the bus.** The board and the tree are new files in a git repository, never edited, so every platform can read and write them, there is a full history of who told whom what, and nothing depends on one provider's messaging.
2. **The job is addressed, not the chat.** Roles (`master:patternode-platform`, `coordinator:wi-062`, `curator:personal`) are held under a renewable lease. A message to a role reaches whoever holds it now, so a session can die and be replaced without anyone being told its new name.
3. **One list of work.** The tree holds every open thing; the plan holds the formal structure; the board never keeps a third list. An open call is a task in the tree, and a claim on an activity is the activity's lock.
4. **Order comes from git, not clocks.** A claim holds when no live claim on the same key reached `main` before it, so races between machines and platforms resolve the same way for every reader.
5. **Waiting costs nothing.** An idle agent waits in a background `board wait` and is woken by what is new for it. Polling by re-reading a chat is the expensive way, and the wrong one.
6. **Judgement on the thinker, volume on the doers.** Design, decisions, curation and merging stay on the primary platform; any platform can take a task from the board. Running out of one plan's quota slows the work; it does not stop it.
7. **No model where none is needed.** Liveness, rescue, capacity and the review digest are deterministic jobs that cannot run out of quota and cost nothing to leave on.
8. **Evidence over self-report.** What an agent did is what it left in the store, the plan and GitHub. The trial grader, the warden and the review all read those, never an agent's own summary.
9. **Rules that matter live on the server.** Prose tells an agent what is expected; only the server side holds for every platform. An agent never gets the means to merge its own pull request or change a guardrail.
10. **One line starts an agent.** "Go pick up work in <scope>" is the whole prompt; the briefing, the pointer in `AGENTS.md` and the skill supply the rest.

## Coordinating agents on the same plan

This is the part that does not exist yet, and the reason EP-002 needs a coordinator chat. The aim: a plan such as WI-062 is worked by many agents at once, each on its own activity, in the right order, with handoffs, without a person or a long chat holding it together.

### The plan becomes claimable work

- **Publish.** A work item's activities and tasks are projected onto the board as threads under the plan's thread (kind `activity` or `task`, linked with `--plan WI-062-A3`). The plan files stay the source of truth for scope, products and state; the board carries only who holds what and what was said.
- **The ready frontier.** Only activities whose `depends_on` are complete are offered by `board next`. Finishing A2 makes A3 claimable for whoever comes next, on any platform. Activities marked `actor: human` are never offered to agents; they appear in Dermot's review instead.
- **Claim equals lock.** Claiming `WI-062-A3` on the board is the activity lock the `work` skill requires, across clones and tools. The local `locks/` files retire.
- **State flows back in pull requests.** The agent updates `progress.yaml` (task states, product state) in the same pull request as the work, so the plan in the repository and the code agree when it merges.

### One plan, one coordinator role

- A role `coordinator:<work item>` holds the decisions the plan cannot make by itself: sequencing changes, scope questions, which approach wins when two activities touch the same contract. It is a role, not a chat that must stay alive: whoever holds it is woken by `board wait` when a question or a ready note arrives, and a new session can take the role over from the plan thread's notes.
- Workers ask the coordinator with `board post --to coordinator:wi-062 --kind question`, never by stopping to wait for Dermot unless the question is his to answer, in which case the coordinator relays it to the review.

### Order across activities and repositories

- **Merge order is data.** `board ready <repo#n> --after <repo#m>` records that one pull request waits for another, across repositories (the architecture decision before its implementation, an API before its callers). The merging role's queue refuses an out-of-order merge. The hand-written "#494, #496, #495" becomes the queue.
- **Ready by branch.** Some platforms open the pull request only after the agent stops, so the agent cannot name it. `board ready` will take a branch, and the merging role resolves it to its pull request.
- **Labels tie pull requests to the plan,** as EP-002 already does (`epic: EP-002`, `activity: WI-062-A2`), so the review can show a plan's pull requests and their state without asking anyone.

### Shared ground between activities

- **Contracts on the plan thread.** When an activity changes something another activity depends on (a module boundary, a schema, a port), its agent posts on the plan's thread (`--on`), which reaches every agent following that plan.
- **Reservations on shared files.** A claim on a path key (`path:bounded-contexts/portfolio/**`) warns other agents off a file set for the length of a change, as MCP Agent Mail's file reservations do. Advisory, short-leased, released by the pull request.

### Handoff and rescue

- An agent that stops part way leaves its state in the activity's notes, ending "STOPPED HERE: …". When its claim lapses, the activity comes before fresh work in `board next`, and the next agent is told whose work it is taking and to read the notes first. This was proven on 13 October: a local agent took the Copilot fact sheet a "dead" agent had left and finished it from its notes.
- The warden (below) shortens the wait: it notices the missed heartbeat, releases the claim with a note, and reposts the work.

### Seeing one plan

`board status --plan WI-062` (to build): every activity with its state, holder, what it waits on, its pull requests and their place in the merge queue, and the questions waiting on the coordinator or on Dermot.

## Roles

| Role | Held by | Does | Never |
|---|---|---|---|
| `user` | Dermot | Instructions, standing orders, decisions, approvals, every `terraform apply` | |
| Thinker | The primary platform | Design, scoping, decisions written for Dermot | Merges outside its role |
| `coordinator:<work item>` | A thinker session | Keeps one plan moving: order, questions, handoffs | Does the plan's activities itself |
| `dispatcher:<scope>` | A thinker session, or a job | Starts doers where capacity is free, up to the caps | Assigns by name; it lets `next --claim` pick |
| `curator:<scope>` | A scheduled session | Files dumps into the tree and the plan, asks when unclear | Does the work it files |
| Worker | Any platform | Claims, does, opens a pull request, posts ready | Merges, takes held work |
| `master:<repo>` | One session per repository | Works the merge queue in order, deploys | Skips the queue |
| Warden | GitHub Actions, no model | Liveness, rescue, inferred limits | Decides anything that needs judgement |

## Mission control and capacity (WI-003)

- **Heartbeats and the warden.** Agents send a cheap `beat` while working. A scheduled job, every ten minutes and with no model, marks an agent dead when its beat is overdue for its platform, releases its claims with a note on each thread ("released from claude-k3x: no heartbeat since 10:42; last note: …"), reposts the work, and infers a quota limit when several agents on one platform die in one window.
- **The capacity ledger.** Each subscribed platform's windows (rolling, daily, weekly, monthly credits), how many agents it may run at once, and what is used, built from agents' `usage` and `limit` posts. Most platforms publish no usage API, so the ledger is an estimate and says so.
- **The dispatcher.** Compares work waiting with capacity left and starts agents where capacity will expire soonest, so no window resets unused; at each reset it starts them again. Where a platform cannot be started by script, it sends Dermot a phone notification instead.
- **The review.** `board review --since 1d|7d`: what was done, by which agent and platform, who died and what was rescued, consumption against allowance, what waits on Dermot, and every guardrail event. The same data feeds a phone-friendly page.

## Guardrails

The patternode-architecture scope (`change/planning/agent-guardrails-consolidation.md`) sets the target; the board supplies enforcement points:

| Rule | Enforced by |
|---|---|
| Only the merging role merges | A GitHub identity per agent platform with no merge rights; rulesets allow merge only to Dermot and the master identity |
| A guardrail is changed only by Dermot | CODEOWNERS with required owner review, pinned tests, deny rules in each tool |
| Swarm size and spend | Standing orders the board and dispatcher respect (agents at once per scope and platform; monthly spend for pay-as-you-go), provider spend limits |
| Stop everything | `board halt [--source <path>]`: every agent stops at its next inbox check and releases its claims |
| Trial and real work kept apart | A separate store with a token limited to it for platforms on trial |

## Platforms

| Platform | State on 13 October 2026 |
|---|---|
| Claude Code, cloud and local | Wave 0 done. From one line: joined, claimed under real races with no work taken twice, messages and standing orders followed mid-run, ready posted and never merged, background `board wait` woke cloud sessions, a dead agent's work was picked up from its notes. Cloud to cloud round trips: 14 s for a question, 36 s and 79 s for instructions. 13 findings, 12 fixed with tests |
| Cursor, Codex, Copilot, Jules | Fact sheets written by the wave 0 agents (`docs/integration/platforms/`). Wave 1 needs a trial store and a token limited to it |
| All platforms but Claude Code | None documents waking an agent when a background command ends. So on them a worker takes one task per session and checks the inbox at turn boundaries, and the thinker on Claude Code is the one that waits. The [compatibility matrix](../integration/agent-platforms.md) has the detail |
| Gemini CLI, Devin, OpenHands | Fact sheets written. Gemini CLI's free tier is gone; Devin's old Core plan was retired. Wave 2 |

## The road from here

| Step | What | Where |
|---|---|---|
| 1 | Board fixes from wave 0 into `main`; the compatibility matrix | WI-002 |
| 2 | Trial store and scoped token; Cursor, Copilot, Codex, Jules one at a time | WI-002 wave 1 |
| 3 | Plan on the board: publish, ready frontier, claim as lock, `status --plan`, path reservations, coordinator role | New work item, piloted on WI-062 |
| 4 | Heartbeats, warden, halt and caps | WI-003 A1 to A3 |
| 5 | Review digest and the mission control page | WI-003 A4, A5 |
| 6 | Capacity ledger and dispatcher; platform starters | WI-003 A6, A7, after WI-002 |
| 7 | Server-side guardrails: agent identities, rulesets, CODEOWNERS | patternode-architecture guardrails scope |
| 8 | A week of real work across platforms, then the recommended line-up of subscriptions | WI-002 A7 to A9 |

## Not the aim

- A project-management tool for people. Jira, Linear, Asana and GitHub Issues stay where they fit; the Life Guide letterbox already bridges Asana to the board.
- A methodology. Scrum, SAFe or anything else sits above the plan's structure.
- A server to run. If a piece needs one, it is a scheduled job in GitHub Actions, or it is not built.
- Autonomy over decisions that are Dermot's: merging policy, guardrails, spending, anything irreversible.

## Questions for Dermot

1. **The plan on the board.** Pilot it on WI-062, which already runs across nine sessions with a coordinator, or on a smaller plan first? Recommendation: WI-062, because it is where the cost is today.
2. **Where the plan lives.** Keep work items in each repository with the board carrying claims only (recommended), or move the plan into the threads store.
3. **Agent identities.** Give each platform its own GitHub identity without merge rights before wave 1, or after it. Recommendation: before, starting with the wave 1 platforms, because a platform on trial is exactly where an unexpected merge would happen.
4. **Pull request #57.** Close it as superseded by board roles, keeping only the idea of a workspace setting for who merges. Recommendation: close.
5. **Naming.** With AI-Assisted Work becoming `work`, this document and the board's design decisions move with it; confirm the repository name `work`.
