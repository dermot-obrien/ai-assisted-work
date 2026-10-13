# Cursor cloud agents

Fact sheet for WI-002 activity A1. Every statement below comes from Cursor's own pages, read on 13 October 2026. Where the pages do not say, this sheet says unknown. Cloud agents were called background agents until recently; `cursor.com/help/ai-features/background-agents` still exists. Every docs page has a Markdown version at the same URL plus `.md`, and `cursor.com/llms.txt` indexes them all.

The pricing pages disagree with each other: see [Limits and price](#limits-and-price) before any money is spent.

## Sources

| URL | Read |
|---|---|
| https://cursor.com/llms.txt (index of all docs pages) | 2026-10-13 |
| https://cursor.com/docs/cloud-agent | 2026-10-13 |
| https://cursor.com/docs/cloud-agent/setup | 2026-10-13 |
| https://cursor.com/docs/cloud-agent/capabilities | 2026-10-13 |
| https://cursor.com/docs/cloud-agent/builds | 2026-10-13 |
| https://cursor.com/docs/cloud-agent/security | 2026-10-13 |
| https://cursor.com/docs/cloud-agent/security-network | 2026-10-13 |
| https://cursor.com/docs/cloud-agent/automations | 2026-10-13 |
| https://cursor.com/docs/cloud-agent/api/endpoints | 2026-10-13 |
| https://cursor.com/docs/cloud-agent/api/webhooks | 2026-10-13 |
| https://cursor.com/docs/api | 2026-10-13 |
| https://cursor.com/docs/cli/overview | 2026-10-13 |
| https://cursor.com/docs/cli/reference/parameters | 2026-10-13 |
| https://cursor.com/docs/rules | 2026-10-13 |
| https://cursor.com/help/customization/rules | 2026-10-13 |
| https://cursor.com/docs/skills | 2026-10-13 |
| https://cursor.com/docs/hooks | 2026-10-13 |
| https://cursor.com/docs/reference/third-party-hooks | 2026-10-13 |
| https://cursor.com/docs/integrations/github | 2026-10-13 |
| https://cursor.com/help/ai-features/cloud-agents | 2026-10-13 |
| https://cursor.com/docs/models-and-pricing | 2026-10-13 |
| https://cursor.com/help/account-and-billing/pricing | 2026-10-13 |
| https://cursor.com/pricing | 2026-10-13 |

## Start

Each cloud agent runs in its own isolated Ubuntu VM. "You can run as many agents as you want in parallel"; no concurrency cap is stated.

| Route | How | Can a script start it? |
|---|---|---|
| Web | `cursor.com/agents`: pick a repository (or "Start from scratch") and send the prompt | No |
| Desktop app | Select **Cloud** in the dropdown under the agent input, or the Agents Window | No |
| iOS, Android | Native iOS app; on Android, `cursor.com/agents` as a PWA | No |
| CLI | In an `agent` session, prepend `&` to a message to hand the conversation to a cloud agent | Not documented as non-interactive |
| Cloud Agents API | `POST https://api.cursor.com/v1/agents` with `prompt.text` and `repos` (or a named `env`), Basic or Bearer auth with a user API key from Dashboard > API Keys. "Beta (All Plans)". Options include `repos[].startingRef`, `autoCreatePR`, `workOnCurrentBranch`, session-scoped `envVars` (beta, silently ignored where not enabled) and a webhook URL that receives `statusChange` on `FINISHED` or `ERROR` | Yes |
| SDKs | TypeScript and Python SDKs run agents on local or cloud runtimes | Yes |
| GitHub, Bitbucket | Comment `@cursor` on a pull request (GitHub also on an issue) | Yes, through the provider's API |
| Slack, Linear | `@cursor` | Not checked |
| Automations | Scheduled (preset or cron; "may run with a delay but will not start before the indicated time") or event triggers from GitHub, GitLab, Slack, Linear and webhooks. Repo-backed automations can open pull requests, on by default | Yes, by schedule or webhook |

## Instructions

From the Rules, Skills and Hooks pages:

| File or folder | Loaded |
|---|---|
| `AGENTS.md` | Yes, in the project root and in subdirectories (nested files apply to their directory and combine with parents). The setup page says "Cloud agents read `AGENTS.md` files" and recommends a section titled "Cursor Cloud specific instructions" |
| `CLAUDE.md` | Yes. "Cursor reads `CLAUDE.md` files the same way it reads `AGENTS.md`"; they are always applied, whatever `alwaysApply` says (help page on rules) |
| `.cursor/rules/*.mdc` | Project rules; plain `.md` files there are ignored |
| `.agents/skills/`, `.cursor/skills/` | Project skills, discovered recursively; nested folders scope a skill to their directory |
| `.claude/skills/`, `.codex/skills/` | Loaded "for compatibility" (skills page). The page does not say whether this applies in cloud agents as well as the editor; the third-party hooks page puts Claude configuration behind **Include Third-Party Plugins, Skills, and Other Configs** (on by default). Treat as likely but untested |
| `~/.cursor/skills/` | Personal skills reach cloud agents only with **Sync Skills for Cloud Agents** on. `~/.agents/skills/` never syncs |
| `.cursor/hooks.json` | Command hooks run in cloud agents, but not during "early exploratory turns in a read-only environment", and `sessionStart`, `sessionEnd` and the MCP hooks do not run in Cursor-hosted cloud agents. User-level `~/.cursor/hooks.json` is not available |
| `.claude/settings.json` hooks | Loaded by Cursor through the third-party setting; whether cloud agents run them is not stated. Unknown |
| `.cursor/environment.json` | Environment: Dockerfile or snapshot, `install`, `start`, `terminals` |

For this repository: `AGENTS.md` carries the board pointer and names the command by path, which wave 1 confirmed is enough for a Cursor cloud agent.

## Second repository

Two documented routes, either of which fits the store:

1. **Multi-repo environment.** "Select multiple repositories when you create the environment. Cursor clones each selected repo into the agent machine", and the agent "can open pull requests in the repos it changes". The API takes up to 20 entries in `repos`. So `dermot-obrien/threads` can be added next to `dermot-obrien/ai-assisted-work` in one environment. What the pages do not say: where the second clone lands (the skill expects `~/.threads`), and whether the git credential in the VM lets the skill's own `git clone https://github.com/dermot-obrien/threads.git` and `git push` succeed. Unknown until tried; pointing `THREADS_HOME` (which the skill reads) at the environment's clone of the store, or route 2, removes the question.
2. **Secret.** Secrets from the Cloud Agents dashboard (user, team or environment scoped) are injected as environment variables when an agent starts; running agents do not pick up new ones. Use type **Runtime Secret** for `THREADS_REMOTE` holding a URL with a fine-grained token limited to the store (`skills/thread/references/setup.md`): its value is redacted from tool output, transcript and commits.

Access through the GitHub App is the intersection of the repositories the app is installed on and what the triggering user can reach: "A Cloud Agent can only reach repositories the triggering user could already reach." The app needs read-write on each repository it edits ("You need read-write privileges to your repo and any dependent repos or submodules"). Its permissions: repository contents, pull requests, issues, checks and statuses, actions and workflows, administration (read branch protection), custom repository roles, organization custom properties. Installing it on an organization or repository takes admin rights on both Cursor and GitHub.

Commits are signed with Cursor's HSM-backed key and show as Verified on GitHub.

## Environment

| Question | Answer from the pages |
|---|---|
| Base | Isolated Ubuntu VM with a desktop (computer use). "Until an environment has a successful Build, agents start on Cursor's default image." Configure by agent-led setup, a saved snapshot, or a Dockerfile named in `.cursor/environment.json` |
| Node 18+ | Not stated for the default image. Can be guaranteed by the Dockerfile or the `install` script |
| git | Not stated as a tool, but the platform clones, branches, signs commits and pushes inside the VM, so git is present in practice |
| Network | Internet access is on by default. Three modes: allow all, default domains plus an allowlist, allowlist only. Even in allowlist only, "Cursor's own services and source control management (SCM) providers" stay reachable, so `github.com` should not need adding |
| Commands | The agent "auto-runs all terminal commands", unlike the desktop agent |
| Background processes | `start` runs after boot, then `terminals`, in a `tmux` session shared by the user and the agent; the agent can also run commands in the background |
| Waking | **Subscriptions**: the agent subscribes, ends its turn, and is woken by a follow-up when an event arrives. Sources: GitHub pull request activity and CI results, Slack replies, Linear issues, and **timers** (one-off or cron; also the built-in `/loop` skill). Subscriptions last at most 180 days and need a person-owned agent. Nothing documents a local process in the VM waking the agent |
| Lifetime | The runtime workspace is "recycled automatically after the run goes idle; the timer refreshes when you send follow-up prompts". The idle time is not stated. Snapshots are kept 90 days from last use |
| Pull requests | The security page says agents open draft pull requests for a person to review; by API, `autoCreatePR` decides, and commits go to a new `cursor/...` branch unless `workOnCurrentBranch` is set |
| CI | Agents try to fix GitHub Actions failures on pull requests they open, up to 10 follow-ups; Teams plans only for now |

## Limits and price

The three Cursor pages read on 13 October 2026 give two different plan line-ups.

**`cursor.com/pricing`** (the live page; plans sold through "X Subscription Corp" and shared with Grok):

| Plan | Price a month | Cloud agents | Usage |
|---|---|---|---|
| Free | $0 | No | Limited |
| Plus | $8 | No | Basic; "Only Grok models are available on this plan" |
| Premium | $30 | Yes, "Cloud agents & automations" | 4x Plus |
| Super | $100 | Yes | 15x Plus; priority model access at peak times |
| Ultra | $200 | Yes | 50x Plus |
| Teams | $30+ a user | Yes | 4 to 50x Plus by seat tier |
| Enterprise | Custom | Yes | Pooled |

"Your allowance refreshes weekly", with top-offs beyond it. Premium and above include Grok models; "third-party models remain available in Cursor at API list price", billed by usage, with spending caps.

**`cursor.com/docs/models-and-pricing`** and **`cursor.com/help/account-and-billing/pricing`**: Hobby (free), Start (India only, ₹649 a month, includes cloud agents), Pro $20, Pro+ $60, Ultra $200, Teams Standard $40 and Premium $120 a user. "Pro, Pro Plus, and Ultra include ... access to Cloud Agents", and usage is described as monthly with on-demand overage.

Whichever applies, cloud agents are "charged at API pricing for the selected model", a spend limit must be set the first time they are used, and a paid plan is required. Read together, the entry plan for cloud agents is **Premium at $30 a month** on the live page (or Pro at $20 on the docs pages), the window is **weekly**, and running a non-Grok model such as Claude costs API list price on top. The scope's "Pro about $20 a month" is out of date if the live page is current; confirm on the billing dashboard before subscribing.

API rate limit: 20 requests a minute by default; the Cloud Agents API is listed as "standard rate limiting". No limit on parallel agents is stated.

## Board fit

The 12 checks from `change/work-items/WI-002-cross-platform-agent-trial/scope.md`, for Cursor-hosted cloud agents:

| # | Check | Fit | Why |
|---|---|---|---|
| 1 | Skill found, or the `AGENTS.md` pointer leads to it | Likely | `AGENTS.md` and `CLAUDE.md` are read; `.claude/skills/` is on the compatibility list, though not confirmed for the cloud |
| 2 | Node 18+ and git | Likely | git is used by the platform itself; Node is unstated for the default image but can be pinned in the Dockerfile or `install` |
| 3 | Store cloned and pushed | Likely | A multi-repo environment including the store, or `THREADS_REMOTE` as a Runtime Secret. Whether the VM's git credential covers the skill's own clone of the store is unknown |
| 4 | One-line pointer is enough | Likely | Instructions files are applied from the first turn |
| 5 | Threads work | Likely | Plain Node and git once check 3 holds |
| 6 | Board messages work | Likely | Same commands as check 5 |
| 7 | Claims hold across platforms | Likely | Claims live in the store; nothing Cursor-specific |
| 8 | Merge discipline | Likely, with one risk | Agents open draft pull requests "for a human to review before anything merges". The risk is the base branch: Cursor opens its own pull request from a `cursor/...` branch, and the pages do not say it can target `claude/bulletin-board-agent-collab-tmzxc5` rather than the default branch. Start agents on that branch (`startingRef`) and check the base of the first pull request |
| 9 | Waiting, or inbox at turn boundaries | Likely, by a different mechanism | `board wait` in a background terminal cannot wake the agent, but a timer subscription (or `/loop`) can wake it to run `board inbox`; a `stop` or `beforeSubmitPrompt` hook can run it at turn boundaries |
| 10 | Session-start hook | Unlikely | `sessionStart` does not run in Cursor-hosted cloud agents, and hooks do not run in the early read-only turns. It does run on Self-Hosted Machines |
| 11 | Handoff across platforms | Likely | Depends only on the thread notes in the store |
| 12 | Cost and limits | Unknown | Weekly allowance plus API-priced model use for non-Grok models; the plan line-up itself is uncertain. Throughput per week needs the trial |

## Setup steps

Once, by the user:

1. Subscribe to a plan that includes cloud agents (Premium on the live pricing page, Pro on the docs pages); check which the billing dashboard offers.
2. Switch to Privacy Mode if Legacy Privacy Mode is on (cloud agents refuse it), and set the cloud agent spend limit when prompted.
3. Install the Cursor GitHub App from `github.com/apps/cursor` on `dermot-obrien/ai-assisted-work` and `dermot-obrien/threads`, with read-write.
4. In the Cloud Agents dashboard, create an environment with both repositories selected. Let the agent-led setup run, or commit `.cursor/environment.json` with an `install` that checks `node --version` is 18 or newer.
5. Add a **Runtime Secret** `THREADS_REMOTE` with a store URL carrying a fine-grained token limited to `dermot-obrien/threads` (contents read and write), as in `skills/thread/references/setup.md`. It covers the case where the environment's own clone of the store cannot be pushed from the skill.
6. Leave network access on the default, or on an allowlist: GitHub stays reachable either way.
7. Optional, in the code repository: add a "Cursor Cloud specific instructions" section to `AGENTS.md` (the board pointer already applies), and a `.cursor/hooks.json` `stop` hook running `node skills/thread/bin/thread.mjs board inbox --as "$BOARD_AS"` if inbox checks at turn ends are wanted.

For each task: start a cloud agent on `dermot-obrien/ai-assisted-work`, branch `claude/bulletin-board-agent-collab-tmzxc5`, with "Go pick up work in trial", from `cursor.com/agents` or by API:

```bash
curl https://api.cursor.com/v1/agents -H "Authorization: Bearer $CURSOR_API_KEY" \
  -H 'Content-Type: application/json' -d '{
    "prompt": {"text": "Go pick up work in trial"},
    "repos": [{"url": "https://github.com/dermot-obrien/ai-assisted-work",
               "startingRef": "claude/bulletin-board-agent-collab-tmzxc5"}],
    "autoCreatePR": false
  }'
```

`autoCreatePR: false` leaves the pull request to the board procedure, which opens it into the sandbox branch. Check the first run for: the skill offered, `node --version`, `board start` without `NOT PUSHED`, and the base branch of the pull request.
