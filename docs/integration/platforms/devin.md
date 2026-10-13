# Devin

Fact sheet for WI-002 activity A1: how Devin (Cognition) would take part in the board trial. Every statement comes from Devin's own pages, read on 13 October 2026; where the pages do not say, this sheet says unknown.

Sources, all read 13 October 2026:

| Ref | Page |
|---|---|
| P1 | https://devin.ai/pricing |
| D1 | https://docs.devin.ai/admin/billing/self-serve |
| D2 | https://docs.devin.ai/admin/billing/usage |
| D3 | https://docs.devin.ai/onboard-devin/agents-md |
| D4 | https://docs.devin.ai/product-guides/skills |
| D5 | https://docs.devin.ai/onboard-devin/knowledge-onboarding |
| D6 | https://docs.devin.ai/integrations/gh |
| D7 | https://docs.devin.ai/onboard-devin/environment |
| D8 | https://docs.devin.ai/onboard-devin/environment/blueprint-reference |
| D9 | https://docs.devin.ai/onboard-devin/environment/templates |
| D10 | https://docs.devin.ai/product-guides/secrets |
| D11 | https://docs.devin.ai/product-guides/security-profiles |
| D12 | https://docs.devin.ai/get-started/first-run |
| D13 | https://docs.devin.ai/product-guides/automations |
| D14 | https://docs.devin.ai/llms.txt and https://docs.devin.ai/_llms/en/api.txt (index of the v3 API) |
| D15 | https://docs.devin.ai/cli/extensibility/rules and https://docs.devin.ai/cli/subagents |

## Start

A cloud session (Devin Cloud) starts in any of these ways:

| Route | What it takes | Source |
|---|---|---|
| Web app, app.devin.ai | Choose Agent mode, pick the repositories, type the prompt | D12 |
| Slack or Microsoft Teams | Tag Devin in a thread or channel | D14 |
| GitHub | A comment starting `/devin` on an open pull request; the commenter needs write access and a linked Devin account | D6 |
| Linear | Assign a ticket to Devin | D14 |
| Automations | A trigger (Slack, GitHub event, Linear, a schedule, or an incoming webhook) starts a session with a set prompt | D13 |
| API | `POST` Create Session in the v3 organisation sessions API; Send Message resumes a suspended session | D14 |
| Devin CLI | `devin --cloud`, or `/handoff` from a local CLI session | D14 |

A script can start one: through the API, or by calling an automation's webhook URL. The pricing page lists the Devin API on the paid plans and not on Free (P1).

## Instructions

| File or feature | Loaded? | Source |
|---|---|---|
| `AGENTS.md` | Yes, at the project root or anywhere else. The first 16 KiB of each file is put in context automatically; the rest is read on demand | D3 |
| `CLAUDE.md` | Pulled into Knowledge automatically, with `AGENTS.md`, `.cursorrules`, `.windsurf`, `.rules` and `.mdc` | D5 |
| Skills | Yes, Agent Skills format. Scanned in every repository at `.agents/skills/` (recommended), `.devin/skills/`, `.github/skills/`, `.claude/skills/`, `.cognition/skills/` and `.windsurf/skills/` | D4 |
| Its own | Knowledge (deprecated, moving to skills in plugins), playbooks, Memory, plugins at personal or organisation scope | D4, D5 |

Skills are found in two ways: indexed from every repository connected to the organisation, before any clone, and scanned on disk as repositories are cloned (D4). Devin lists each skill's name and description at session start and invokes one when it judges it relevant, or when the prompt says `@skills:<name>` (D4). Two Devin extensions to the format matter here: `triggers` (default `["user", "model"]`) and `` !`command` `` blocks, which run a shell command and inject its output when the skill is invoked (D4). The thread skill would need checking for text Devin reads as such a block.

`AGENTS.md` (under 16 KiB here) is read in full and names the thread command, so the board is reachable with no skill folder at all.

## Second repository

Repository access comes from the Devin GitHub App, installed on a GitHub organisation or a personal account with "All repositories" or "Select repositories" (D6). It asks for read and write on contents, pull requests, issues, checks, actions and workflows (D6). A session clones and pushes through Devin's git proxy for the connected repositories, and the machine can also carry a `gh` token for API calls (D11). Security profiles can cut git to read-only or remove the `gh` token (D11).

For the board, the App would be installed on `dermot-obrien` with both `ai-assisted-work` and `threads` selected. The pages do not say whether a plain `git clone https://github.com/dermot-obrien/threads.git` in the shell, which is what `thread board start` runs, goes through the proxy with credentials, or only repositories added to the session or the environment do. Unknown until tried.

The fallback is a secret. Secrets can be organisation-wide, personal (only in your own sessions), per repository (in its blueprint) or given for one session only (D10). A personal secret `THREADS_REMOTE` holding a URL with a fine-grained token limited to the store would work without the proxy. Secrets are injected into blueprint steps; outside them, "Devin binds them to the specific commands that need them" rather than exporting them to every shell (D8), so whether `$THREADS_REMOTE` is visible to `node thread.mjs` is unknown.

A repository can also be added to the organisation's environment, so it is cloned into the snapshot every session boots from, under `~/repos/` (D7, D8). Cloning the store into the snapshot gives a stale copy; the skill pulls before it reads, so that is harmless if push works.

## Environment

| Item | What the pages say | Source |
|---|---|---|
| Machine | A Linux (Ubuntu) VM per session, booted from the organisation's snapshot; Windows and macOS VMs can be configured | D7, D2 |
| Node 18+ | nvm is pre-installed on the base image; a Node version is chosen in the blueprint (for example `actions/setup-node` with `node-version: "20"`) or by `.nvmrc`. The default Node version is not stated | D8, D9 |
| git | Present: repositories are cloned into the snapshot and sessions push branches | D7, D11 |
| Network | Unrestricted by default; a security profile can set an allowlist, with the git proxy always allowed | D11 |
| Setup | A blueprint (YAML) with `initialize`, `maintenance` and `post-build` steps; Devin can write it from the repository when asked | D7, D8 |
| Background commands | The pages describe a shell, IDE and browser per session, not background jobs that wake the agent. The CLI's subagents run in the background; nothing says a cloud session wakes when a process it started exits | D14, D15 |
| Sleep | A session sleeps after 30 minutes idle (Enterprise can set 5 to 120) and wakes on a new message, including one sent through the API | D2, D14 |

## Limits and price

From P1 and D1. The prices reported in the WI-002 scope (Core about $20 a month plus about $2.25 per ACU) are out of date: Core plan users "have been migrated to the Free plan", and self-serve plans now use quotas and on-demand credits (D1).

| Plan | Price | Cloud sessions | Usage | Concurrent sessions |
|---|---|---|---|---|
| Free | $0 | Not listed (Devin Cloud is listed from Pro) | "Light quota", limited models | Not listed |
| Pro | $20 a month, one user | Yes | Daily and weekly quota, the daily more than a seventh of the weekly; extra usage as on-demand credits at API pricing | Up to 10 |
| Max | $200 a month, one user | Yes | A much larger weekly quota, no daily cap | Up to 10 |
| Teams | $80 a month minimum; full seats $40 a month each | Yes | Full seats have a Pro-sized quota; flex seats draw on shared credits | Unlimited |

Windows: quotas refresh daily and weekly on the calendar (D1). Usage counts Devin's actions, VM time and bandwidth; waiting for a reply, for tests or for clones costs only "the few units required to keep the Devin VM running", and a sleeping session costs nothing (D2). Automations run on credits on Teams and stop when credits run out (D1). On-demand credits roll over and never expire (D1). A linked ChatGPT Go, Plus or Pro plan can pay for GPT model use instead of the Devin quota (D1). The pricing page does not give the quota sizes in numbers.

## Board fit

Against the 12 checks in `change/work-items/WI-002-cross-platform-agent-trial/scope.md`.

| # | Check | Fit | Why |
|---|---|---|---|
| 1 | The skill is found, or `AGENTS.md` leads to it | Likely | `.claude/skills/` and `.agents/skills/` are scanned, and `AGENTS.md` is injected (D3, D4) |
| 2 | Node 18+ and git run | Likely | nvm is pre-installed and a blueprint can pin Node 20; git is used for every session (D8, D9). The default Node version is not stated |
| 3 | The store can be cloned and pushed | Unknown | The App can cover both repositories (D6), but whether a shell `git clone` of a repository not in the session goes through the git proxy is not documented; a token in a personal secret is the fallback, with its exposure to the shell also not documented (D8, D10) |
| 4 | The one-line pointer is enough | Likely | `AGENTS.md` is read before coding and holds the full procedure (D3) |
| 5 | Threads work | Likely, if check 3 passes | Only Node, git and push are needed |
| 6 | Board messages work | Likely, if check 3 passes | Same commands as check 5 |
| 7 | Claims hold across platforms | Likely | Claims are git pushes to the store; nothing Devin-specific |
| 8 | Merge discipline holds | Unknown | The GitHub page speaks of Devin merging once checks pass and recommends branch protection (D6); whether `AGENTS.md` keeps it from merging is untested. Branch protection on the trial base branch is the safe guard |
| 9 | Waiting works | Unlikely in the background | No documented wake on a background process; the session sleeps after 30 minutes idle and wakes on a message (D2). An automation on a schedule, or a script calling Send Message, could wake it to run `board inbox` |
| 10 | Session-start hook | Unknown | Cloud sessions have blueprint `maintenance` steps, surfaced to the agent at session start but not run automatically (D8); hooks are documented for the CLI only (D14) |
| 11 | Handoff across platforms | Likely | Picking up from thread notes needs only checks 3 and 5 |
| 12 | Cost and limits | Unknown | Quotas are daily and weekly but not given in numbers (P1, D1); measure in the trial from Settings > Usage & limits and Session Insights (D2) |

## Setup steps

1. Subscribe to Pro ($20 a month) at app.devin.ai; Free does not list Devin Cloud (P1).
2. Settings > Connections > GitHub: install the Devin.ai Integration on the `dermot-obrien` account with "Select repositories": `ai-assisted-work` and `threads` (D6).
3. Environment: ask Devin "Set up your environment for this repo", or write a blueprint that installs Node 20 (`github.com/actions/setup-node@v4`) and adds both repositories (D7, D8).
4. Add a personal secret `THREADS_REMOTE` holding `https://x-access-token:<fine-grained token>@github.com/dermot-obrien/threads.git`, the token limited to the store with contents read and write, as the fallback for check 3 (D10).
5. Protect `claude/bulletin-board-agent-collab-tmzxc5` so pull requests into it need a review, which keeps check 8 safe whatever Devin's defaults.
6. Start a session in Agent mode on `ai-assisted-work`, branch `claude/bulletin-board-agent-collab-tmzxc5`, with the prompt "Go pick up work in trial. Use `--tool devin` on board start."
7. For check 9, try an automation with a schedule trigger, or a script calling the Send Message API, that tells the session to run `board inbox` (D13, D14).
