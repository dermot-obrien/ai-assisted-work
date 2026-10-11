# WI-002 Cross-platform agent trial: the board and threads on every major agent platform

## Summary

Prove that the `thread` skill and its board (thread 0.14.0, DD-13 to DD-16) work the same on every major cloud agent platform, and on the cheapest ones, so that work can be spread across many subscriptions with no dependence on any one provider. One platform does the thinking (design, curation, merging); many others do the work, each claiming tasks from the same board with the same one-line pointer.

Status: scoped, not yet planned. Plan it with `/work start` once the decisions below are made.

## Intent

From the user, 11 October 2026: test against "all the main ones and the cheapest ones, because I want to spread things out so I'm not depending on anyone and have lots of capability", using basic subscription plans, with "a primary one for thinking, like Claude, and lots of others for doing progressive work".

The board makes this possible in principle: it is only files in a git repository, so any agent that can run Node and git and push to the store can take part. This work finds out where that holds, where it breaks, and what each platform needs.

## The roles

| Role | Held by | Does |
|---|---|---|
| Thinker | The primary platform (Claude today) | Design, decisions, scoping; holds `curator`, `dispatcher` and the merging roles (`master:<repo>`) |
| Doer | Any platform | Joins with "Go pick up work in <path>", takes the best task with `board next --claim`, opens a pull request, posts `board ready`, never merges |

The split keeps judgement on one platform and spreads volume across the rest, so running out of one plan's quota slows work down instead of stopping it.

## Platforms

Entry prices are third-party reports from mid to late 2026, which disagree in places; activity A1 confirms each on the vendor's own page before money is spent.

| Platform | How a cloud task starts | Reads skills or instructions from | Entry plan (reported) | Wave |
|---|---|---|---|---|
| Claude Code (web, CLI) | A session with a prompt, routines, `send_message` between sessions | `.claude/skills/`, `CLAUDE.md` | Existing subscription | 1 (baseline, known to work) |
| Cursor cloud agents | From the IDE, web or Slack; up to 8 in parallel | `.agents/skills/`, `.cursor/skills/`, `.claude/skills/`, rules | Pro about $20 a month with included usage; cloud agents may bill on top | 1 (used, works; verify end to end) |
| OpenAI Codex (cloud, CLI) | A task from ChatGPT or the CLI, in its own cloud environment | `AGENTS.md`; skills support to verify | Included with ChatGPT Plus about $20 a month, metered in five-hour windows | 1 |
| GitHub Copilot coding agent | Assign an issue, or ask from a pull request; runs in GitHub Actions | `AGENTS.md`, `.github/copilot-instructions.md`; skills to verify | Pro about $10 a month with a monthly allowance of premium requests | 1 |
| Google Jules | A task on a repository from the web | `AGENTS.md` to verify | Free tier about 15 tasks a day; Google AI Pro about $20 a month | 1 (cheapest) |
| Devin | A session from the web or Slack | Its own knowledge and playbooks; `AGENTS.md` to verify | Core about $20 a month, pay as you go at about $2.25 per compute unit | 2 |
| Gemini CLI | Local, or in GitHub Actions | `GEMINI.md`, `.agents/skills/` | Free tier with a Google account | 2 (cheapest) |
| OpenHands | Self-hosted or its cloud | Microagents, `AGENTS.md` to verify | Open source; pay only for the model key | 2 (cheapest) |
| Amp, Kiro, Windsurf, Factory | Various | Various | Free tiers or about $15 to $40 a month reported | 3 (if waves 1 and 2 leave gaps) |

The user's "the Danny thing" is read here as Devin; correct it if another platform was meant.

## What has to work on each platform

The same checklist, run on every platform, in a sandbox (A2) rather than the real store:

| # | Check | How it is tested |
|---|---|---|
| 1 | The skill is found, or a pointer in `AGENTS.md` leads to it | Start a task with only "Go pick up work in trial" |
| 2 | Node 18 or newer and git run | `node --version`, `git --version` inside the task |
| 3 | The store, a second private repository, can be cloned and pushed | `thread board start`; look for `NOT PUSHED` |
| 4 | The one-line pointer is enough | The agent joins, reads the briefing and claims a task without more prompting |
| 5 | Threads work | Opens, notes and closes its task's thread with a resolution |
| 6 | Board messages work | Accepts an instruction, answers a question, marks it done |
| 7 | Claims hold across platforms | Three platforms run `next --claim` on one scope at once; no task is taken twice |
| 8 | Merge discipline holds | Opens a pull request, posts `board ready`, and does not merge, whatever the platform's own defaults |
| 9 | Waiting works, or the inbox is checked at turn boundaries | `board wait` in the background where the platform can wake on it |
| 10 | Session-start hook, where the platform has hooks | `board start --hook` shows the briefing before the first turn |
| 11 | Handoff across platforms | One platform stops mid-task; another picks it up from the thread's notes after the claim expires |
| 12 | Cost and limits | Tasks finished per plan per week, and what stopped it (quota, window, credits) |

Known risks to check first, from each platform's documented behaviour (to confirm in A1):

- **Second-repository access.** Agents are usually given one repository. Copilot's coding agent runs behind a firewall in Actions; Codex cloud tasks may have internet access only during setup unless it is turned on for the task. The fallback for each is `THREADS_REMOTE` as a secret holding a fine-grained token limited to the store (`references/setup.md`).
- **Skills.** Platforms that do not read `.agents/skills/` or `.claude/skills/` need a short pointer in `AGENTS.md`: what the board is, the command that joins it, and the rules (claim before working, never merge your own pull request).
- **Own merge and branch habits.** Some platforms open or update pull requests in their own way; the trial checks that the board's rules win.

## Method

1. A sandbox: a throwaway store (`threads-trial`) and a small code repository seeded with about ten tasks of graded difficulty (a docs fix, a test to add, a small feature, a refactor), all on the board as open threads under one path.
2. Each platform, one at a time, gets the same prompt: "Go pick up work in trial." Results go into the matrix.
3. Then the concurrent run: three wave 1 platforms at once, plus a handoff between two.
4. Then a week of real work on one low-risk path (for example Patternode documentation), to measure throughput per plan.

## Products

| Product | Where | Public? |
|---|---|---|
| Compatibility matrix: the checklist per platform, with the setup each needs | `docs/integration/agent-platforms.md` | Yes, without prices |
| Setup notes per platform | `skills/thread/references/setup.md` | Yes |
| An `AGENTS.md` pointer for platforms that do not read skills, written by `aaw install` | `packages/installer`, docs | Yes |
| Fixes the trial turns up in the board or the skill | `skills/thread/` | Yes |
| Trial results with dated prices and the recommended line-up of subscriptions | A dated note in the user's private repository | No |

## Decisions for the user

1. **Wave 1.** Recommendation: Claude Code, Cursor, Codex, Copilot and Jules: the platforms already used plus the two cheapest well-known ones.
2. **Budget.** A month at entry tiers for wave 1 is about $70 to $90 beyond what is already paid (reported prices); wave 2 adds pay-as-you-go use on Devin and model keys for OpenHands.
3. **Sandbox first.** Recommendation: yes. A separate trial store, so a misbehaving agent cannot touch the real tree or the real merge queues.
4. **What is published.** Recommendation: the matrix and setup notes go into AAW; prices and the user's line-up stay private, because they date quickly and are personal.

## Activities (starting point for planning)

| Activity | Product | Depends on |
|---|---|---|
| A1 Confirm each platform's current plan, limits, skill loading and second-repository access on the vendor's pages | Platform fact sheet | |
| A2 Build the sandbox store and seeded repository | `threads-trial`, sandbox repository | Decision 3 |
| A3 `AGENTS.md` pointer and installer support | Pointer text, installer change | A1 |
| A4 Run the checklist on each wave 1 platform | Matrix rows | A2, A3 |
| A5 Concurrent and handoff runs | Matrix results for checks 7 and 11 | A4 |
| A6 Fix what broke | Board and skill fixes with tests | A4, A5 |
| A7 A week of real work across platforms | Throughput and cost per plan | A6 |
| A8 Wave 2 platforms | More matrix rows | A6 |
| A9 Publish the matrix and setup notes; write the private results note | Docs; private note | A7, A8 |

## Depends on

AAW thread 0.14.0 (branch `claude/agent-bulletin-board-9xglra`) merged, so every platform installs the same skill.
