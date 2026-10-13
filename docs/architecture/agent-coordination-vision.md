# Agents working together: the vision

Status: draft for Dermot's review, 13 October 2026. Source: Dermot's vision of 11 October 2026 (the handover for WI-005, thread t-021 under t-33i), WI-002 and WI-003, the board's design decisions DD-12 to DD-16, Life Guide WI-035 and WI-036, and the wave 0 trial of 13 October.

## In one paragraph

One system for Dermot, many agents and many agent platforms, across work and personal life. Any session in any tool, cloud or local, is started with one line, "Go pick up work in <path>", and carries on from where the work was left, talking to every other agent through a bulletin board that extends the thread tree. The tree is the to-do list; anything can be dumped onto it and a curator files it against the plan; agents claim what they do, and pull requests merge in order. One platform does the thinking, cheap capacity on the others does the work, and nothing depends on one provider. Dermot sees all activity, all agents and all consumption in one place, and the whole of it reaches him through one simple chat, on the web and the phone.

## The vision, point by point

Each point is Dermot's, from 11 October 2026, with what it means for the design.

### 1. A board that extends threads, so agents in any tool coordinate

> Agents message each other, Dermot gives instructions to any agent or role, and agents pick them up automatically. Start a new session anywhere (Claude, Cursor, cloud or local), say "go pick up work in <path>", and it continues and messages everything else. Dermot can find out who is working on what.

- The board lives in the threads store, beside the tree, as new files that are never edited, so any agent with Node, git and push access takes part, and the history says who told whom what.
- Addresses are a chat's handle, a role (a job one chat holds under a lease, such as `master:patternode-platform`), every agent, an open call, a repository, or everyone following a thread. A message to a role reaches whoever holds it now, so nothing depends on what a session is called.
- Dermot's instructions are board posts from `user`, written by him (a Markdown file from the GitHub app is enough) or relayed by any agent. An agent accepts, does and reports done; `sent` shows him the outcome.
- An idle agent waits in `board wait` and is woken by what is new for it. `board status` answers "who is working on what".

### 2. Segmented by path, not one monolithic board

> Pointing at a higher level (for example `patternode`) includes everything beneath it.

- Sources are paths: `patternode`, `patternode/platform`, `patternode/business`, `personal`, `work`. A chat joins at one. Broadcasts, open calls and standing orders reach it from its own path, the paths above and the paths below; direct posts reach it from anywhere.
- Claims and roles count across the whole store, so the same work or role is never held twice in two paths.
- A view of `patternode` shows every agent, queue and open thread under it, and nothing of `personal`.

### 3. Threads are the to-do list; dumps are curated into the plan

> Free-form dumps ("stream of consciousness") are allowed; a curator agent keeps the board clean and files each dump against a formal activity or task in a plan. An epic must be broken down to an activity or task first. Claims and leases say who is doing what, and pull requests merge in order through a merge queue.

This is how agents coordinate on the same plan.

- There is one list of work: the tree. An open call is a task thread; the board keeps no second list.
- Two streams meet. The flow is whatever comes up (a chore, a bug noticed in passing, a reflection, meeting notes), dumped in one line with no structure. The plan is the formal structure: work items (epics or workstreams), their activities and their tasks, in plain files in the repository the work belongs to.
- A curator (`curator:<path>`) files each dump: as a thread of the right kind linked to a plan activity or task (`--plan WI-012-A3`), as a note on an existing thread, as a duplicate, as a reflection kept outside the plan, or as nothing. It asks the author when the intent is unclear rather than guess. A whole epic is too big to hold a chore; it is broken down to the activity first.
- Claims are leases. Claiming an activity on the board is its lock, across clones, tools and machines, which is the work skill's rule of one agent per activity made real wherever the work items live. A claim held by an agent that disappears expires, and work an agent left (its claim lapsed) is taken before fresh work, by the next agent, with its notes.
- Pull requests merge in order. A worker never merges: it posts `board ready` to the repository's merging role, saying what must merge first (`--after`, across repositories), and the merging role works the queue top down.
- Seen together for one plan: which activities are free, held or done, by whom, what each waits on, and where its pull requests are in the queue.

### 4. One system across Dermot, the agents, the platforms, and work and personal life

> Life Guide provides the personal infrastructure, with input channels: a work-context dump (formal work item, epic and story status as CSV), Asana as a "letterbox", Plaud, and so on. The end state is one simple chat interface (web and phone) for all open loops: drop a thought, note or feeling at any time.

- Everything Dermot has to do, at work and in life, reaches the board through input channels, each landing as dumps or as minimal mirrors of the source system for the curator to file.
- Work and personal content never share a store (Life Guide DEC-032): a separate store holds the work paths, with only minimal fields leaving the work systems.
- The board is the back end; the front end is one conversation for every open loop (Life Guide WI-036), on the web and the phone, where a thought, a note or a feeling is dropped at any time and comes back as a filed item, an answer or a decision to make.

### 5. Every major agent platform, and the cheapest ones

> Test it on every major agent platform and the cheapest ones (Claude, Cursor, ChatGPT/Codex, GitHub Copilot, Gemini and others), so nothing depends on one provider. One platform is for thinking, the others are cheap capacity for doing.

- The thinker (Claude today) holds the judgement: design, decisions, curation and the merging roles. Doers on any platform take tasks with `board next --claim`, open a pull request, post ready and never merge.
- WI-002 runs the same twelve checks on each platform. Wave 0, Claude Code in the cloud and locally, passed on 13 October 2026 (below). The fact sheets for Cursor, Codex, Copilot, Jules, Gemini CLI, Devin and OpenHands, written by the wave 0 agents themselves, forecast the rest in the [compatibility matrix](../integration/agent-platforms.md).
- What the forecasts say shapes the design: only Claude Code documents waking an agent when a background command ends, so on other platforms a doer takes one task per session and checks its inbox at turn boundaries, and the thinker is the one that waits. Several platforms open the pull request after the agent stops, so `board ready` should accept a branch and let the merging role find the pull request.

### 6. Mission control, and every allowance used

> All activity, all agents, all consumption in one place. Use 100% of every plan's daily and weekly allowance and switch platforms the moment one hits its limit.

WI-003:

- A review, daily or weekly: what was done, by which agent on which platform, who died and what was rescued, consumption against allowance, and what waits on Dermot.
- A capacity ledger of each plan's windows (rolling, daily, weekly, credits), built from what agents report and from the limits they hit, since most platforms publish no usage figures.
- A dispatcher that starts agents where capacity is free and resets soonest, and moves to another platform the moment one hits its limit.
- A warden with no model, on a schedule, that notices when an agent has died, releases its claims with a note saying why and what was last done, and offers the work to another.
- Caps and a halt for a swarm, and guardrails on the server so no agent can merge or change what only Dermot or a merging role may.

### 7. A local store where nothing can be shared

> Threads must work from a local store in constrained environments, such as a machine with no shared repository.

- `threads_remote: local` keeps the tree and the board in a git repository on that machine alone; every command commits and nothing is pushed. It can be given a remote later and joins up from then on.

### 8. Standalone skills, not frameworks

> Skills become individually installable. AAW becomes just a bundle, then is retired as a framework entirely. AAA and AAR are likewise decomposed into standalone skills that refer only to skills, never to a framework. Repositories are named for their subject, never with a `-skills` suffix. `thread` and `work` stay together in one bundle, because they are mostly used together.

- `thread` and `work` live together in the repository being renamed `work`; the installer moves to `dermot-obrien/skills`; each workspace declares its skills and pins them in a lock (WI-005).
- So the board needs nothing but the `thread` skill committed where sessions start, and a platform that reads no skills is led to it by a short pointer in `AGENTS.md`.

## The layers

```
  Dermot: one chat (web, phone), the GitHub app, mission control
     │            ▲
  input channels  │  review, questions, decisions
  (work CSV, Asana letterbox, Plaud, dumps)
     │            │
  ┌──▼────────────┴───────────────────────────────────────────────────┐
  │ TREE      what is open and why; the to-do list                    │ threads store, by path
  ├───────────────────────────────────────────────────────────────────┤
  │ PLAN      work items, activities, tasks, products                 │ each repository (work skill)
  ├───────────────────────────────────────────────────────────────────┤
  │ BOARD     posts, instructions, roles, claims, merge queues,       │ threads store, by path
  │           dumps and their filing                                  │ (thread skill)
  ├───────────────────────────────────────────────────────────────────┤
  │ AGENTS    a thinker and many doers, any platform, joined at a path│ Claude, Cursor, Codex, ...
  ├───────────────────────────────────────────────────────────────────┤
  │ WATCHERS  warden, dispatcher, review: no model                    │ scheduled jobs
  └───────────────────────────────────────────────────────────────────┘
  around it all: guardrails on the server (identities without merge
  rights, rulesets, required reviews), caps and a halt
```

## Roles

| Role | Held by | Does | Never |
|---|---|---|---|
| `user` | Dermot | Instructions, standing orders, decisions, approvals, every `terraform apply`, merges in his own repositories | |
| Thinker | The primary platform | Design, scoping, decisions written for Dermot | |
| `curator:<path>` | A scheduled session | Files dumps against the plan, asks when unclear, sweeps the board | Does the work it files; merges |
| `dispatcher:<path>` | A thinker session, or a job | Starts doers where capacity is free, within the caps | Assigns by hand; doers take work with `next --claim` |
| `master:<repo>` | One session per repository | Works the merge queue in order, deploys | Merges out of order |
| Doer | Any platform | Claims, does, opens a pull request, posts ready | Merges; takes work someone else holds |
| Warden | A scheduled job, no model | Liveness, rescue with a note, inferred limits | Anything that needs judgement |

## Where it stands, 13 October 2026

| Point | State |
|---|---|
| 1 Board | Built (thread 0.14.0, DD-13 to DD-16). Wave 0 with real agents found 13 problems; 12 fixed in thread 0.15.0 (PR #71) |
| 2 Paths | Built: sources as paths, scoped views; a scope leak in `status` fixed in 0.15.0 |
| 3 To-do list, curation, claims, merge queue | Built: dumps, curator, claims and leases, the merge queue. Proven in wave 0: real claim races with nothing taken twice, a dead agent's task finished by the next from its notes, every pull request posted ready and none merged by its author. Still to build: publishing a plan's activities onto the board with only those whose dependencies are done offered, and one view per plan |
| 4 One system, Life Guide | Life Guide WI-035 (board intake, letterbox; DEC-032 accepted) and WI-036 (one conversation for open loops) |
| 5 Platforms | Claude Code passed wave 0, cloud and local; cloud to cloud round trips of 14 s for a question and 36 s and 79 s for instructions. Seven fact sheets and the matrix written; wave 1 (Cursor, Copilot, Codex, Jules) waits on a trial store and a token limited to it |
| 6 Mission control | WI-003, scoped |
| 7 Local store | Built (`threads_remote: local`) |
| 8 Standalone skills | WI-005 steps 1 to 3 done; step 4 (the rename to `work`, the installer to `dermot-obrien/skills`) next |

## Not the aim

- A project-management tool for people. Asana, GitHub Issues and the work systems stay where they are; channels bring their minimal content to the board.
- A methodology. Initiative, work item, activity and task are structure; any method sits above them.
- A server to run. What needs to run on its own is a scheduled job.
- Agents deciding what is Dermot's: merging in his repositories, guardrails, spending, anything irreversible.

## Questions for Dermot

1. Publishing a plan onto the board (point 3): which plan to pilot it on.
2. Agent identities without merge rights: before wave 1 or after it. Recommendation: before, since a platform on trial is where an unexpected merge would happen.
3. Thread version: PR #71 takes thread 0.15.0, which the handover's step B had planned for the purl change on the rename; that change becomes 0.16.0. Confirm.
