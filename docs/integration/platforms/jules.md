# Google Jules

Last checked: 2026-10-13

Fact sheet for WI-002 activity A1. Everything here comes from Google's own pages, each read on 13 October 2026. Where those pages are silent, this sheet says **unknown**. Jules describes itself as "currently in beta".

Sources:

| Ref | URL |
|---|---|
| [docs] | https://jules.google/docs/ (Getting started) |
| [env] | https://jules.google/docs/environment/ |
| [run] | https://jules.google/docs/running-tasks/ |
| [code] | https://jules.google/docs/code/ |
| [repos] | https://jules.google/docs/tasks-repos/ |
| [sched] | https://jules.google/docs/scheduled-tasks/ |
| [errors] | https://jules.google/docs/errors/ |
| [limits] | https://jules.google/docs/usage-limits/ |
| [faq] | https://jules.google/docs/faq/ |
| [log] | https://jules.google/docs/changelog/ |
| [api] | https://jules.google/docs/api/reference/ |
| [cli] | https://jules.google/docs/cli/reference |
| [subs] | https://gemini.google/subscriptions/ |
| [one] | https://one.google.com/about/google-ai-plans/ |

## Start

There are five ways to start a task. Each one works on one connected GitHub repository and one starting branch.

- **Web.** In the app at jules.google.com, pick a repository and a branch, write a prompt, and optionally add a setup script. Jules writes a plan, and in the web app you approve it before any code is written [docs], [run].
- **GitHub issue.** Add the label `jules` to an issue; the label is not case sensitive [run].
- **CLI (Jules Tools).** Install it with `npm install -g @google/jules` and sign in with `jules login`, which opens a browser. Start a remote task with `jules remote new --repo owner/repo --session "<prompt>"`. `--repo` can be left out, in which case it comes from the current directory, and `--parallel <n>` starts several sessions on the same prompt [cli], [log] (2 Oct and 10 Nov 2025).
- **REST API (alpha).** Send `POST https://jules.googleapis.com/v1alpha/sessions` with an `X-Goog-Api-Key` header; a key is made in the web app's Settings, at most three at a time. The body takes `prompt`, `sourceContext.source` (for example `sources/github/owner/repo`), `sourceContext.githubRepoContext.startingBranch`, an optional `automationMode: AUTO_CREATE_PR`, and an optional `requirePlanApproval`. Through the API, plans are approved automatically by default. Follow-up messages go to `:sendMessage`; to see progress, poll sessions and activities [api].
- **Scheduled tasks.** Choose Planning, then Scheduled Task, then a frequency and cadence (daily, weekly) [sched]. Per [log] (10 Dec 2025), scheduled tasks open a pull request when they finish.

**Can a script start one?** Yes. The REST API with an API key needs no browser. The CLI needs a one-time browser sign-in first.

## Instructions

- **AGENTS.md:** "Jules automatically looks for an AGENTS.md file in the root of your repository" [docs]. The environment page also says Jules reads `agents.md` or `readme.md` for hints on setting up the environment [env]. Changelog entries for 20 Jun and 6 Aug 2025 cover support for it and better instruction-following [log].
- **CLAUDE.md:** not mentioned; **unknown**, assume it is not read.
- **`.agents/skills/`, `.claude/skills/`, SKILL.md:** not mentioned anywhere in the docs or changelog; **unknown**, assume they are not loaded. A skill is reachable only if `AGENTS.md` points to its script.
- **Its own:** per-repository "memory". Jules saves the preferences and corrections it is given and applies them to later tasks; it can be turned off in repo settings [log] (30 Sep 2025).

## Second repository

- **Through Jules's GitHub app:** no. Jules can reach only the repositories granted to the "Google Labs Jules" GitHub App [repos]. Each task or API session names a single source [api], [run]. No page describes how a task can get at a second repository, and none lists the git credentials available inside the VM, so whether the agent can `git push` to the store with the app's credentials is **unknown**. The pages describe only one way changes reach GitHub: Jules's own **Publish branch** or **Publish PR** [code], or `AUTO_CREATE_PR` [api].
- **Through a token:** likely. The VM has internet access [faq]. Since 1 Oct 2025, repo-level environment variables can be added and turned on for a task; the setting is fixed once the task starts [log]. That makes room for the board's fallback: set `THREADS_REMOTE=https://x-access-token:<token>@github.com/dermot-obrien/threads.git` with a fine-grained token limited to the store (`.claude/skills/thread/references/setup.md`). Whether these variables are kept secret (redacted from logs, the transcript and commits) is **unknown**. The FAQ says only "Don't commit secrets ... to your repo" [faq]. Until that is confirmed, treat the token as exposed to the task transcript.

## Environment

- **VM:** short-lived, one per task, running Ubuntu Linux [env].
- **Node and git:** yes. The default is Node v22.16.0, with v18.20.8 and v20.19.2 also available through nvm. git is 2.49.0, alongside npm, pnpm, yarn, bun, Python, Go, Java, Rust and Docker. `. /opt/environment_summary.sh` prints the current list [env].
- **Setup script:** set per repository under Configuration, then Initial Setup. "Run and Snapshot" saves the result as the snapshot later tasks start from [env], [log] (5 Aug 2025).
- **Network:** the FAQ says code runs in a VM "with internet access" [faq]. Since 8 Aug 2025 Jules can also search the web [log]. No allow-list or firewall is documented, so any limits are **unknown**. Failed network calls are retried before the task is marked failed [errors].
- **Background commands and wake-up:** no. "Long-running processes like dev servers or watch scripts aren't currently supported in setup scripts" [faq]. Nothing describes a task being woken by a background command. A task stops when it finishes, or pauses when it waits for user input, and browser notifications fire when a plan is ready or a task completes [faq], [run].
- **Hooks:** no session-start hooks are documented. The setup script is the nearest equivalent, but it may run only at snapshot time.
- **Delivering code:** Jules does not merge. Jules is the commit author. When the user clicks **Publish PR**, Jules is the pull request's creator; when the user opens the PR from a published branch, the user is [code], [run]. Work in progress can be published at any point [log] (15 Aug 2025). Jules can act on PR review comments and push follow-up commits; Reactive Mode limits this to comments that mention @Jules [log] (23 Sep 2025). The docs do not say which base branch the PR targets, so it is **unknown** whether it targets the starting branch or the default branch.
- **Task duration and timeouts:** **unknown**. The pages report a task's runtime but give no maximum [run], [errors].

## Limits and price

| Plan | Price (US, [subs]) | Tasks per rolling 24 h | Concurrent tasks | Model |
|---|---|---|---|---|
| Jules (no cost) | $0 | 15 | 3 | Gemini 2.5 Pro |
| Jules in Google AI Pro | $19.99 a month | 100 | 15 | "Higher access to the latest model (starting with Gemini 3 Pro)" |
| Jules in Google AI Ultra | from $99.99 a month ($199.99 for the 20x tier) | 300 | 60 | "Priority access to the latest model" |

These task and concurrency figures come from [limits]. [one] gives the same tiers only as "Expanded / Higher / Highest", with no numbers. Google AI Plus ($4.99) is not listed with Jules [subs].

- **Window:** daily task limits count over a rolling 24 hours. At the limit, the new-task button is disabled until it resets [limits].
- **Accounts:** paid plans are for individual `@gmail.com` accounts only, users must be 18 or older, and limits are not pooled across a family plan [limits].
- **API keys:** at most 3 at a time [api].
- **Entry plan for the trial:** the no-cost tier (15 tasks a day, 3 at once) is enough for checks 1 to 11. Google AI Pro is only needed to measure throughput (check 12).

## Board fit

Each check below is one of the 12 in `change/work-items/WI-002-cross-platform-agent-trial/scope.md`.

| # | Check | Verdict | Why |
|---|---|---|---|
| 1 | Skill found, or pointer in `AGENTS.md` leads to it | **Likely** | Jules reads root `AGENTS.md` [docs], and this branch's `AGENTS.md` already gives the commands. Jules does not load the skill folders themselves; it only runs `thread.mjs` by path. |
| 2 | Node 18+ and git run | **Likely** | Node 22.16.0 (18 and 20 through nvm) and git 2.49.0 are preinstalled [env]. |
| 3 | Store cloned and pushed | **Unknown** | The GitHub App is per repository, and no page says what the VM's git credentials can reach [repos]. The `THREADS_REMOTE` token as a repo environment variable [log] should work over the VM's internet access [faq]. Whether that variable is kept secret is unknown. |
| 4 | One-line pointer is enough | **Likely** | Through the API, plans are auto-approved [api]. In the web app the user approves the plan, which is one extra click but not more prompting [run]. |
| 5 | Threads work | **Likely** if 3 passes | Only Node, git and pushes to the store are needed. |
| 6 | Board messages work | **Likely** if 3 passes | Same as 5. Instructions that arrive mid-task are seen only when the agent runs `board inbox` (see 9). |
| 7 | Claims hold across platforms | **Likely** if 3 passes | Claims are store commits, so they work the same as on other platforms. |
| 8 | Merge discipline holds | **Likely** for "never merges"; **unknown** for the flow | Jules never merges; the docs describe no merge action [code]. The agent itself may be unable to open the PR: PRs come from Publish PR or `AUTO_CREATE_PR` [code], [api]. If so, the PR number does not exist while the agent runs, so it cannot post `board ready <repo>#<n>` itself. It is also unknown whether the PR targets the starting branch. Workaround: have the agent post `board ready` naming its branch, or post it in a follow-up message after the PR is published. |
| 9 | Waiting works, or inbox checked at turn boundaries | **Unlikely** for `board wait`; **likely** for turn boundaries | Long-running and background processes are not supported [faq], and no wake-up mechanism is documented. `AGENTS.md` step 6 (`board inbox` before stopping) covers the turn boundary. |
| 10 | Session-start hook | **Unlikely** | No hooks are documented. The repo setup script [env] could run `board start --hook`, but it may run only when the snapshot is made, not for each task. |
| 11 | Handoff across platforms | **Likely** if 3 passes | Picking up a task depends on the thread's notes in the store, not on the platform. |
| 12 | Cost and limits | **Likely** measurable | The no-cost tier allows 15 tasks a day and 3 at once; AI Pro at $19.99 a month allows 100 and 15, over a rolling 24 h [limits], [subs]. |

The biggest risks are check 3 (whether the store token stays secret) and check 8 (the agent cannot open, or name, its own pull request).

## Setup steps

1. Sign in at jules.google.com with a personal `@gmail.com` account [limits]. Install the Google Labs Jules GitHub App on `dermot-obrien/ai-assisted-work` only [repos].
2. Make a fine-grained GitHub token with Contents read and write on `dermot-obrien/threads` only.
3. In Jules, open the repository's Configuration:
   - Add the environment variable `THREADS_REMOTE=https://x-access-token:<token>@github.com/dermot-obrien/threads.git` and turn it on for trial tasks [log] (1 Oct 2025).
   - Set Initial Setup to `node --version && git --version`, then click Run and Snapshot [env].
4. Start a task on the branch `claude/bulletin-board-agent-collab-tmzxc5` with the prompt "Go pick up work in trial", through one of:
   - **web:** approve the plan when it appears;
   - **CLI:** `jules remote new --repo dermot-obrien/ai-assisted-work --session "Go pick up work in trial"`;
   - **API:** set `startingBranch` to the trial branch and leave out `AUTO_CREATE_PR`, so that publishing stays a human step.
5. When it finishes, click **Publish PR**. Check the base branch, and retarget the PR to `claude/bulletin-board-agent-collab-tmzxc5` if it was opened against `main`. Then send the PR number in a follow-up message so that Jules posts `board ready`, or post it for Jules.
6. Write the result into the matrix. In particular, check whether the token appears in the task log or the plan (check 3), and how the PR got its base branch (check 8).
