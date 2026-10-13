# OpenAI Codex (cloud and CLI)

Last checked: 2026-10-13

Fact sheet for WI-002 activity A1. Everything here comes from OpenAI's own pages, each read on 13 October 2026. Where those pages are silent, this sheet says **unknown**.

The Codex docs have moved: every `https://developers.openai.com/codex/...` address now answers with a permanent redirect (308) to `https://learn.chatgpt.com/docs/...`, and the docs now present Codex as part of ChatGPT ("ChatGPT Work and Codex share usage"). The redirect targets are cited below. `https://openai.com/chatgpt/pricing/` refused the request (403), so prices come from the Codex pricing page only.

Codex comes in two forms that matter to the board:

- **Codex Cloud:** a task runs in an OpenAI-hosted VM, started from ChatGPT on the web, desktop or mobile, or from the CLI with `codex cloud`.
- **Codex CLI (and IDE extension, desktop app):** the agent runs on the user's own machine, with the user's Node, git and credentials, much like Claude Code's CLI.

Sources:

| Ref | URL |
|---|---|
| [docs] | https://learn.chatgpt.com/docs (redirect from https://developers.openai.com/codex) |
| [cloud] | https://learn.chatgpt.com/docs/cloud |
| [envs] | https://learn.chatgpt.com/docs/environments/cloud-environments |
| [legacy] | https://learn.chatgpt.com/docs/environments/cloud-environment (Codex Cloud (Legacy)) |
| [cli] | https://learn.chatgpt.com/docs/codex/cli |
| [exec] | https://learn.chatgpt.com/docs/non-interactive-mode |
| [sdk] | https://learn.chatgpt.com/docs/codex-sdk |
| [action] | https://learn.chatgpt.com/docs/github-action |
| [github] | https://learn.chatgpt.com/docs/third-party/github |
| [agents] | https://learn.chatgpt.com/docs/agent-configuration/agents-md |
| [skills] | https://learn.chatgpt.com/docs/build-skills |
| [hooks] | https://learn.chatgpt.com/docs/hooks |
| [auto] | https://learn.chatgpt.com/docs/automations |
| [long] | https://learn.chatgpt.com/docs/long-running-work |
| [price] | https://learn.chatgpt.com/docs/pricing |
| [new] | https://learn.chatgpt.com/docs/whats-new |
| [image] | https://github.com/openai/codex-universal (README and Dockerfile, the reference for the cloud base image) |

## Start

- **ChatGPT web, desktop or mobile (Cloud).** Choose **Work in > Cloud**, pick a published environment, describe the task and send it. A new environment is created on the web or in the desktop app: choose GitHub repositories, let Codex inspect them and install what they need, then **Publish** [envs], [cloud]. Each task gets its own isolated workspace from the published environment and keeps working while the user's computer is asleep [envs].
- **CLI to Cloud.** `codex cloud` lets you "browse active and completed chats, submit work to a configured environment, and apply the result to your local repository from the terminal" [cli]. The pages read do not give its flags.
- **Slack or Microsoft Teams.** Ask @ChatGPT to work on a repository; this needs an Enterprise workspace with Cloud delegation turned on [envs].
- **GitHub.** `@codex review` in a pull request comment, and automatic reviews, are for code review only [github]. Codex Cloud (Legacy) still serves the GitHub and Linear integrations and is to be deprecated [envs]; whether an issue or comment can start a coding task in the new Cloud is **unknown**.
- **Scheduled tasks.** Recurring tasks run in the background, locally or on a worktree; on ChatGPT web and mobile, eligible plans can also start a task from an app event, such as pull request activity on a GitHub repository [auto].
- **Local (CLI, IDE, desktop app).** An interactive session on the user's machine. `codex exec "<task>"` runs one without the TUI, for scripts and CI, and the TypeScript and Python SDKs start and resume local threads [exec], [sdk]. A GitHub Action runs `codex exec` in a workflow [action].

**Can a script start one?** Locally, yes: `codex exec` with the saved login or `CODEX_API_KEY` [exec]. In the cloud, `codex cloud` submits work from the terminal after a ChatGPT sign-in [cli], but the pages read do not show it run unattended. An API key gives "no cloud-based features", and "Codex access tokens for trusted automation" are for Business and Enterprise only [price]. So a script starting a cloud task on a Plus plan is **unknown**.

## Instructions

- **AGENTS.md:** yes. Codex reads `~/.codex/AGENTS.md` (or `AGENTS.override.md`), then one file per directory from the Git root down to the working directory, `AGENTS.override.md` before `AGENTS.md`. Files are joined root first, up to `project_doc_max_bytes`, 32 KiB by default [agents]. This branch's `AGENTS.md` is about 2.5 KB.
- **CLAUDE.md:** not read by default. It can be added to `project_doc_fallback_filenames` in `config.toml` [agents]; the docs show that setting in `~/.codex/config.toml`, so it does not reach a cloud task unless the environment sets it up. Treat it as not read.
- **Skills:** yes, in `.agents/skills/` (open agent skills standard, a `SKILL.md` with `name` and `description`). Codex scans `.agents/skills` from the working directory up to the repository root, then `$HOME/.agents/skills`, `/etc/codex/skills` and its bundled skills, and follows symlinked skill folders [skills]. "Skills stored in your repository are available in cloud tasks"; personal skills are not synced to the cloud [envs].
- **`.claude/skills/`:** not on the list of places Codex looks [skills]. This repository has no `.agents/` folder, so the `thread` skill is reached only through `AGENTS.md`, which runs `thread.mjs` by path. A symlink `.agents/skills/thread -> ../../.claude/skills/thread` would let Codex find the skill itself.
- **Its own:** `AGENTS.override.md`, `config.toml`, execpolicy `.rules` files [agents], [exec], and plugins, which bundle skills, MCP servers and hooks [skills].

## Second repository

- **As a second checkout: likely.** A cloud environment is made by selecting "the GitHub repositories to check out", in the plural, and the pages show environments holding several [envs], [cloud]. So `dermot-obrien/threads` can be part of the environment. Whether a task can **push** to it with the credentials Codex uses is **unknown**: the pages describe changes leaving a task only through the user, who reviews them and then "commit[s] or open[s] a pull request" [envs], [cloud]. No page says what git credentials are inside the VM.
- **Through a token: likely, with a caveat.** github.com is in the **Package managers** internet preset [envs], so the VM can reach it. Two ways to supply a token [envs]:
  - **Environment variable:** "passed directly to programs". This fits the board's fallback, `THREADS_REMOTE=https://x-access-token:<token>@github.com/dermot-obrien/threads.git`, with a fine-grained token limited to the store (`.claude/skills/thread/references/setup.md`). The personal-vault dialog says "Its value is visible to the task", so treat the token as exposed to the agent and its transcript.
  - **Network secret:** "Programs receive a placeholder; the proxy substitutes the real value for allowed destinations", for HTTPS on port 443, and "it doesn't put the raw credential in a local process or file". This would keep the token out of the task, but git sends credentials base64-encoded in an `Authorization` header, and whether the proxy substitutes a placeholder there is **unknown**. Worth testing first, because it is the safer route.
- Legacy environments had **secrets** too, but "secrets are removed before the agent phase starts" [legacy], so they cannot carry a token the agent uses.
- **CLI:** the agent uses the user's own git and credentials, so it reaches the store as the user does. Whether commands may use the network depends on the sandbox mode, and `codex exec` starts read-only by default [exec].

## Environment

- **VM:** one isolated VM per task. Plus and Edu Plus get 2 vCPUs, 8 GiB memory and 8 GiB disk; Pro, Business and Enterprise get 4 vCPUs, 16 GiB and 32 GiB. A task's saved state is recoverable for up to seven days [envs].
- **Node and git:** likely yes. The base image is "universal" [legacy]. Its public reference, `codex-universal`, is Ubuntu 24.04 with Node 18, 20 and 22 selectable (22 by default; the Dockerfile also installs 24) and uses git in its own build [image]. Its README says it "is not an identical environment", and the new Cloud pages list no versions, so this is **likely**, not confirmed. The setup conversation can also install tools or pin versions [envs].
- **Setup:** Codex writes an **Install script** and a **Start skill** in a setup conversation and the user publishes the result; new tasks start from that prepared filesystem [envs].
- **Network:** off unless **Allow Codex to access internet** is on, then limited to a preset (Package managers, which includes github.com), custom domains, or "All (unrestricted)". All traffic goes through an HTTP/HTTPS proxy [envs], [legacy]. Tailscale VPN and OIDC (Enterprise, on request) are available [envs].
- **Background commands and wake-up:** no wake-up is documented for cloud tasks. Tasks keep working while the user's computer is asleep, and a task is continued by reopening it [envs]. Scheduled tasks "in a chat can use minute-based intervals for active follow-up loops" [auto]; whether those run against a cloud task is **unknown**. Locally, the CLI runs long jobs in Goal mode (`/goal`) [long], and hooks include `Stop` and `SessionStart` [hooks].
- **Hooks:** the CLI loads `SessionStart` and other hooks from `<repo>/.codex/hooks.json` or `config.toml` once the project layer is trusted. With cloud orchestration, "hooks from local configuration, plugins, or local directories; environment-scoped hooks ... are not supported" [hooks].
- **Delivering code:** Codex does not merge. In the cloud, the user reviews the changes and then commits or opens a pull request [cloud], [envs]. Whether the agent itself can open the PR, and which base branch the PR targets, is **unknown**.
- **Task duration:** **unknown**. No maximum is given; at the usage limit, a turn in progress may finish, "subject to fair use limits" [price].
- **Current limitations:** no GitLab or self-hosted GitHub Enterprise Server, and no computer or browser use in the cloud [envs].

## Limits and price

| Plan | Price (US, [price]) | Codex surfaces | Usage window |
|---|---|---|---|
| Free | $0 | Desktop app only, GPT-6 Luna, "subject to rollout" | Not given |
| Go | $8 a month | Desktop app only, GPT-6 Luna, "subject to rollout" | Not given |
| **Plus** | $20 a month | Web (Cloud), CLI, IDE, iOS; Slack and automatic code review; GPT-6.1 Sol and GPT-6 Luna | Five-hour limit; weekly limits may also apply |
| Pro | $100, $200 or $500 a month | Everything in Plus | "Currently no five-hour limit" |
| Business | $20 per user a month billed annually, 2+ users ($25 monthly) | As Plus, larger VMs | As Plus (Standard Business) |
| API key | API rates | CLI, SDK, IDE only; no cloud features | Pay per token |

- **Plus, per five hours, local messages (estimates, not fixed limits):** GPT-6.1 Sol 15 to 160, GPT-6 Sol 15 to 150, GPT-6 Astra 5 to 45, GPT-6 Luna 350 to 3,000. "Cloud tasks may use more of your allowance than local messages"; local and cloud share the allowance [price].
- **Beyond the limit:** Plus and Pro can buy ChatGPT credits; a typical GPT-5.6 Sol task uses 2 to 15 credits. Fast mode uses included limits 2.5 times as fast [price].
- **Model change:** GPT-5.5 retires from Codex on all plans on 14 October 2026 [price].
- **Entry plan for the trial:** Plus at $20 a month is the cheapest plan with Cloud. Free and Go offer only the desktop app, which runs locally [price].

## Board fit

Each check below is one of the 12 in `change/work-items/WI-002-cross-platform-agent-trial/scope.md`. Verdicts are for Codex Cloud; the CLI is noted where it differs.

| # | Check | Verdict | Why |
|---|---|---|---|
| 1 | Skill found, or pointer in `AGENTS.md` leads to it | **Likely** | Codex reads root `AGENTS.md` [agents], which gives the commands. It does not scan `.claude/skills/` [skills]; a symlink under `.agents/skills/` would make the skill itself visible. |
| 2 | Node 18+ and git run | **Likely** | The reference image ships Node 18 to 22 (22 by default) and git [image]; the Cloud pages give no versions. CLI: the user's own. |
| 3 | Store cloned and pushed | **Unknown** | The store can be a second repository in the environment, and github.com is reachable with the Package managers preset [envs], but no page says the VM can push. `THREADS_REMOTE` as an environment variable should work but is visible to the task; a network secret might not reach git's auth header [envs]. CLI: **likely**, with the user's credentials. |
| 4 | One-line pointer is enough | **Likely** | A task is a single prompt against a published environment [envs]; `AGENTS.md` carries the rest. |
| 5 | Threads work | **Likely** if 3 passes | Only Node, git and pushes to the store are needed. |
| 6 | Board messages work | **Likely** if 3 passes | Same as 5. Mid-task instructions are seen only when the agent runs `board inbox` (see 9). |
| 7 | Claims hold across platforms | **Likely** if 3 passes | Claims are store commits, the same on every platform. |
| 8 | Merge discipline holds | **Likely** for "never merges"; **unknown** for the flow | No merge action is described. In the cloud the user commits or opens the PR after review [cloud], so the agent may not know its PR number when it would post `board ready`. Workaround as for Jules: post `board ready` naming the branch, or post it in a follow-up turn after the PR exists. CLI: **likely**, as for Claude Code's CLI. |
| 9 | Waiting works, or inbox checked at turn boundaries | **Unlikely** for `board wait` in the cloud; **likely** for turn boundaries | No wake-up from a background command is documented for cloud tasks [envs]. `AGENTS.md` step 6 covers the turn boundary. CLI: **unknown**; a `Stop` hook could run `board inbox` [hooks]. |
| 10 | Session-start hook | **Unlikely** in the cloud; **likely** in the CLI | Cloud orchestration does not run hooks from repository or local configuration; the CLI loads `SessionStart` from a trusted `<repo>/.codex/hooks.json` [hooks]. The cloud environment's Start skill [envs] might stand in; untested. |
| 11 | Handoff across platforms | **Likely** if 3 passes | Picking up a task depends on the thread's notes in the store, not on the platform. |
| 12 | Cost and limits | **Likely** measurable, roughly | Plus counts usage in five-hour windows plus possible weekly limits, given only as wide estimates; the usage dashboard and CLI `/status` show what is left [price]. |

The biggest risks are check 3 (how the store token gets in, and whether it stays out of the transcript) and check 8 (the agent may not open, or name, its own pull request). The CLI has neither problem, so a CLI run is a quick first data point while the cloud questions are tested.

## Setup steps

1. Subscribe to ChatGPT Plus ($20 a month) [price]. Connect GitHub when prompted, giving access to `dermot-obrien/ai-assisted-work` and `dermot-obrien/threads` [envs].
2. Make a fine-grained GitHub token with Contents read and write on `dermot-obrien/threads` only.
3. Create a cloud environment on the web (**Settings > Codex Cloud > Environments > Create environment**) [envs]:
   - Select both repositories.
   - Under internet access, turn on **Allow Codex to access internet** with the **Package managers** preset (it includes github.com).
   - First try a **network secret** for github.com and a remote that uses its placeholder. If git cannot authenticate that way, add an **environment variable** `THREADS_REMOTE=https://x-access-token:<token>@github.com/dermot-obrien/threads.git`, knowing the task can read it.
   - Ask the setup conversation to check `node --version` and `git --version`, then **Publish**.
4. Optional: add `.agents/skills/thread` as a symlink to `.claude/skills/thread` on the trial branch, so Codex lists the skill [skills].
5. Start a task on the branch `claude/bulletin-board-agent-collab-tmzxc5` with the prompt "Go pick up work in trial", from **Work in > Cloud** or with `codex cloud` from the terminal [envs], [cli].
6. When it finishes, open the pull request from the task's review screen. Check that its base is `claude/bulletin-board-agent-collab-tmzxc5`, not `main`, and give the agent the PR number in a follow-up turn so it posts `board ready`, or post it for it.
7. For the CLI run: `codex` in a clone of the repository on the trial branch, with the user's git credentials, and the same prompt. Optionally add `<repo>/.codex/hooks.json` with a `SessionStart` hook running `board start --hook` to test check 10 [hooks].
8. Write the result into the matrix. In particular, check whether the token appears in the task log (check 3), whether the VM could push to the store at all, and how the PR got its base branch (check 8).
