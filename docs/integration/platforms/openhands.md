# OpenHands

Fact sheet for WI-002 activity A1. Every statement below comes from the vendor's own pages, read on 13 October 2026. Where the pages do not say, this sheet says unknown. The docs at `docs.all-hands.dev` now redirect (308) to `docs.openhands.dev`, and the product site is `openhands.dev`; the hosted app is still `app.all-hands.dev`.

OpenHands comes in three forms, and the board fit differs between them:

| Form | What it is | Who pays for the model |
|---|---|---|
| OpenHands Cloud | Hosted sandboxes at `app.all-hands.dev`, started from the web, the API, the CLI, Slack, Jira or a GitHub issue | You: your own key, or the OpenHands LLM provider at cost |
| CLI and local GUI | Open source (MIT), runs on your machine in a Docker sandbox or as a plain process | You: your own key |
| Software Agent SDK | A Python SDK and agent server, for building your own runs (for example in GitHub Actions) | You: your own key |

## Sources

| URL | Read |
|---|---|
| https://docs.openhands.dev/llms.txt (index of all pages) | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/cloud/openhands-cloud | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/cloud/cloud-api | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/cloud/cloud-ui | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/cloud/github-installation | 2026-10-13 |
| https://docs.openhands.dev/cookbook/service-account-github-pat | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/settings/secrets-settings | 2026-10-13 |
| https://docs.openhands.dev/overview/skills | 2026-10-13 |
| https://docs.openhands.dev/overview/skills/repo | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/customization/repository | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/customization/hooks | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/sandboxes/overview | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/sandboxes/remote | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/advanced/custom-sandbox-guide | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/cli/installation | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/cli/headless | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/cli/cloud | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/automations/event-automations | 2026-10-13 |
| https://docs.openhands.dev/openhands/usage/cloud/organizations/budgets | 2026-10-13 |
| https://openhands.dev/pricing | 2026-10-13 |

## Start

A cloud task is a conversation, and there are several ways to start one:

| Route | How | Can a script start it? |
|---|---|---|
| Web | Pick a repository and branch under Open Repository at `app.all-hands.dev`, then Launch | No |
| REST API | `POST https://app.all-hands.dev/api/v1/app-conversations` with `initial_message` and `selected_repository`, authenticated with an API key from Settings > API Keys. Returns a start task; poll `start-tasks` and then `app-conversations?ids=` for `execution_status` | Yes |
| CLI to cloud | `openhands login` (device flow), then `openhands cloud -t "<task>"` or `-f task.txt` | Yes, after a one-time interactive login |
| GitHub | Label an issue `openhands`, or comment starting `@openhands` on an issue or pull request | Yes, through the GitHub API |
| Slack, Jira | Apps for each | Not checked |
| Automations | Scheduled (cron) or event-based (GitHub events, custom webhooks); GitHub events need a team organization that has claimed the GitHub organization, or they are dropped silently | Yes, by webhook |
| Local CLI | `openhands` (interactive) or `openhands --headless -t "<task>"`; headless always runs in always-approve mode | Yes |

## Instructions

From the Skills Overview and Repository Customization pages:

| File or folder | Loaded |
|---|---|
| `AGENTS.md` at the repository root | Always; the full content goes into the initial system prompt |
| `CLAUDE.md`, `GEMINI.md` | Recognised as model-specific repository context |
| `.agents/skills/<name>/SKILL.md` | Yes, per the Agent Skills specification: name and description are advertised, the body is loaded when the agent invokes the skill. Optional `triggers` (keywords) and `paths` (globs) are OpenHands extensions |
| `~/.agents/skills/` | User skills |
| `.openhands/skills/`, `.openhands/microagents/` | Legacy, still supported; `.agents/skills/` wins on a name clash |
| `.claude/skills/` | Not mentioned. Treat as not read |
| Organization and user skill repositories | Cloud fetches the account's and its organizations' `.openhands` / `.agents` skill repositories at conversation start |
| `.openhands/setup.sh` | Runs every time OpenHands begins working with the repository |
| `.openhands/hooks.json` | Hooks, in a format compatible with Claude Code hooks, including `SessionStart`, `UserPromptSubmit` and `Stop` |

Two cautions. Skill files are read when a conversation starts, so a change needs a new conversation. In Agent Canvas the skill catalogue is an allow-list of recommended skills by default; whether that also gates repository skills in Cloud is unknown.

For this repository: the thread skill lives in `skills/thread/`, which OpenHands does not list as a skill folder, but `AGENTS.md` is loaded and names the command path (`node skills/thread/bin/thread.mjs`). Installing the skill into `.agents/skills/thread/` as well would let OpenHands load it as a skill.

## Second repository

The GitHub App is installed per repository from `+ Add GitHub Repos` or Settings > Integrations. It requests short-lived tokens (eight hours) with read and write on contents, pull requests, issues, actions, workflows, commit statuses and webhooks. Access is the intersection of the repositories granted to the app and the user's own GitHub permissions.

Inside the sandbox the managed `GITHUB_TOKEN` is a refreshing lookup of that app token. The pages imply, without saying it in one sentence, that it covers every repository granted to the app, not just the one selected for the conversation. So adding `dermot-obrien/threads` to the app's repository list is the likely first route to the store.

The documented fallback is a secret. Custom secrets from Settings > Secrets are exported as environment variables in the runtime, so `THREADS_REMOTE` holding a URL with a fine-grained token limited to the store fits the existing setup (`skills/thread/references/setup.md`). The API can also pass `secrets` per conversation, and `GITHUB_TOKEN` there overrides the managed token.

One trap from the service-account cookbook: conversation secrets are registry secrets, injected into a bash command only when the command text names the secret. A command that runs `git push` through the thread skill without naming `THREADS_REMOTE` or `GITHUB_TOKEN` may run without it. The Secrets Management page, on the other hand, says custom secrets are exported automatically. Which of the two applies to account-level secrets in a Cloud conversation is unknown until tried; naming the variable in the command (`THREADS_REMOTE=$THREADS_REMOTE node ...`) works in both cases.

## Environment

| Question | Answer from the pages |
|---|---|
| Node 18+ | The default sandbox image, `ghcr.io/openhands/agent-server:<release>-python`, "already includes Python and Node.js". The Node version is not stated |
| git | Not stated for the image, but the platform clones the selected repository into the sandbox and pushes branches, so git is present in practice |
| Network | No outbound limit or allowlist is documented for Cloud sandboxes. Unknown |
| Background commands | The agent server API has "Start Bash Command: execute a bash command in the background" and "Run Conversation: start running the conversation in the background". Nothing documents a background process waking the agent; a conversation resumes on a new message (the API's send-message, the UI, or `@openhands`) |
| Pausing | With too many conversations running, older ones are paused; a paused sandbox resumes when resources are free or from the UI |
| Hooks | `.openhands/hooks.json` with `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `SessionEnd` |
| Commit identity | Set in Settings (Git author settings); otherwise from the account |

## Limits and price

From `openhands.dev/pricing`, read 13 October 2026:

| Plan | Price | Limits stated |
|---|---|---|
| Local (open source) | Free | One user, unlimited daily conversations, bring your own LLM key |
| Individual (SaaS) | Free | One user, 10 conversations a day; hosted cloud, API, Slack and Jira; models through the OpenHands LLM provider pay as you go "at cost, with no markup", or bring your own key |
| Enterprise | Custom | Unlimited users, conversations and concurrent conversations per user; SaaS or self-hosted |

There is no paid individual tier on the page. The real cost is the model: a key you already pay for, or the OpenHands provider at cost. A per-conversation maximum budget can be set in Settings, and organizations can set monthly budgets with alerts at 80, 90 and 100 percent; at 100 percent new conversations may be blocked until the month resets. Concurrency limits for the free tier are not stated beyond "older conversations will be paused". The 10-a-day cap is the window that matters for the board.

## Board fit

The 12 checks from `change/work-items/WI-002-cross-platform-agent-trial/scope.md`, for OpenHands Cloud:

| # | Check | Fit | Why |
|---|---|---|---|
| 1 | Skill found, or the `AGENTS.md` pointer leads to it | Likely | `AGENTS.md` and `CLAUDE.md` are loaded in full; the pointer names the command. `.claude/skills/` is not read, so the skill itself is not advertised unless also placed in `.agents/skills/` |
| 2 | Node 18+ and git | Likely | Node.js is in the default image (version unstated); git is used to clone and push |
| 3 | Store cloned and pushed | Likely | Add the store to the GitHub App's repositories, or set `THREADS_REMOTE` as a secret. Secret injection may need the name in the command text |
| 4 | One-line pointer is enough | Likely | `AGENTS.md` sits in the system prompt from the first turn |
| 5 | Threads work | Likely | Plain Node and git once check 3 holds |
| 6 | Board messages work | Likely | Same commands as check 5 |
| 7 | Claims hold across platforms | Likely | The board's claims live in the store, not the platform; nothing OpenHands-specific |
| 8 | Merge discipline | Unknown | The app token has write on contents and pull requests, so the agent can merge if it chooses; the issue flow "opens a pull request" and nothing documents merging by default. Depends on the agent following `AGENTS.md` |
| 9 | Waiting, or inbox at turn boundaries | Unlikely for `board wait`; likely for the inbox | A background command can run, but nothing wakes the agent from it. A `Stop` or `UserPromptSubmit` hook could run `board inbox` at turn boundaries |
| 10 | Session-start hook | Likely | `.openhands/hooks.json` supports `SessionStart` (non-blocking), in a Claude Code compatible format; `.openhands/setup.sh` also runs at start. Whether hook output reaches the agent's context is not stated for `SessionStart` |
| 11 | Handoff across platforms | Likely | Depends only on the thread notes in the store |
| 12 | Cost and limits | Unknown | Free tier is 10 conversations a day; model cost is per token on your key or at cost. Throughput per week needs the trial |

The CLI in headless mode on a machine or in GitHub Actions passes checks 2 to 7 wherever Node, git and a token are present, but it runs in always-approve mode, so check 8 rests on the instructions alone.

## Setup steps

For OpenHands Cloud, once, by the user:

1. Sign in at `app.all-hands.dev` with GitHub.
2. Under `+ Add GitHub Repos`, grant the app the code repository (`dermot-obrien/ai-assisted-work`) and, if the store should be reached through the app, `dermot-obrien/threads`.
3. Otherwise, in Settings > Secrets add `THREADS_REMOTE` with a store URL carrying a fine-grained token limited to `dermot-obrien/threads` (contents read and write), as in `skills/thread/references/setup.md`.
4. In Settings, choose the model: your own key, or the OpenHands provider. Set a maximum budget per conversation.
5. Set the Git author name and email in Settings so commits are attributed.
6. Optional, in the code repository: add `.openhands/hooks.json` with a `SessionStart` hook running `node skills/thread/bin/thread.mjs board start --tool openhands --hook`, and install the thread skill into `.agents/skills/thread/` so it is advertised as a skill.

For each task: start a conversation on the repository and branch `claude/bulletin-board-agent-collab-tmzxc5` with "Go pick up work in trial", from the web, `openhands cloud -t`, or `POST /api/v1/app-conversations`. If secret injection fails, tell the agent to name the variable in the command: `THREADS_REMOTE=$THREADS_REMOTE node skills/thread/bin/thread.mjs board start --tool openhands --source trial`.

For the local CLI: `uv tool install openhands --python 3.12` (or the install script), configure a model key, then `openhands --headless -t "Go pick up work in trial"` in a clone where `node`, `git` and push access to the store already work.
