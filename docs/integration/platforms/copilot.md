# GitHub Copilot cloud agent

Fact sheet for the board trial (WI-002, activity A1). GitHub now calls the coding agent the Copilot cloud agent. Every fact below comes from GitHub's own pages, each read on 13 October 2026. Where the pages do not say, this sheet says unknown.

## Start

- From GitHub.com: the agents panel, a hand-off from a Copilot Chat conversation, or assigning an issue or pull request to Copilot. Automations (scheduled or event-driven, from a repository's Agents tab) and GitHub Agentic Workflows (Markdown tasks run as Actions) also start work. Source: https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
- From a script, through the REST API: `POST https://api.github.com/agents/repos/{owner}/{repo}/tasks`, with only `prompt` required. It is in public preview and takes user-to-server tokens only (a personal access token, an OAuth app token or a GitHub App user token); installation tokens are not supported. The page does not say which plans have it. Source: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api
- From the command line: `gh agent-task create` (GitHub CLI 2.80.0 or later, public preview), with `--repo`, `--base` and `--follow`; `gh agent-task list` and `gh agent-task view --log` track sessions. Source: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-from-cli
- From an IDE: unknown. The pages read do not describe it.

So a script can start a task, through the API or `gh agent-task create`, and a dispatcher could start one per open task on the board.

## Instructions

- Repository instructions: `.github/copilot-instructions.md`, path-specific `.github/instructions/NAME.instructions.md`, and `AGENTS.md` (the nearest one in the tree takes precedence), or instead a single `CLAUDE.md` or `GEMINI.md` at the repository root. Source: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
- Agent skills work with the cloud agent. Project skills live in `.github/skills`, `.claude/skills` or `.agents/skills`; the page does not confirm that the cloud agent reads each of the three paths. Source: https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
- It also has custom agents, MCP servers and hooks.

`AGENTS.md` is read, so the one-line pointer in this branch's `AGENTS.md` reaches the agent even if the skill folders are not.

## Second repository

This is the platform's hard part.

- One repository per task: "It cannot make changes across multiple repositories in one run." Source: https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
- The agent's own token is limited to its repository: "By default, the scope of Copilot's authentication token is limited to the repository where it's running." Source: https://docs.github.com/en/copilot/tutorials/cloud-agent/give-access-to-resources
- It pushes to one branch only, a new `copilot/` branch or the branch of the pull request it was asked from, and "can only perform simple push operations. It cannot directly run `git push` or other Git commands." It cannot mark its pull requests ready for review, approve or merge them. Source: https://docs.github.com/en/copilot/concepts/agents/coding-agent/risks-and-mitigations
- Secrets: repository or organization Agents secrets and variables (Settings, Secrets and variables, Agents) are exposed as environment variables to the agent's development environment and to `copilot-setup-steps.yml`, and masked in session logs. Names starting `COPILOT_MCP_` go only to MCP servers. Actions, Codespaces and Dependabot secrets are not available. Source: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/configure-secrets-and-variables

The documented route for the store is therefore `THREADS_REMOTE` as an Agents secret holding a fine-grained token limited to the store. Whether `thread.mjs` can then push to the store from the agent's shell is unknown: the risks page says the agent cannot run `git push` directly, and does not say whether that restriction covers a git process started by a script with its own credentials. Setup steps run outside the agent's restrictions and outside the firewall, so `board start` (clone and briefing) can run there, but later writes (`claim`, `note`, `done`, `ready`) happen during the task.

## Environment

- Ubuntu Linux by default; larger and self-hosted runners may be Ubuntu x64 or Windows 64-bit. Source: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/customize-the-agent-environment
- `.github/workflows/copilot-setup-steps.yml`, on the default branch, with one job named `copilot-setup-steps`, preinstalls tools; only `steps`, `permissions`, `runs-on`, `services`, `snapshot` and `timeout-minutes` are honoured. The example installs Node.js 20 with `actions/setup-node`. Whether Node and git are on the default image is not stated; setup steps can install Node, and the repository is checked out with git. Same source.
- Network: a firewall limits the processes the agent starts through its Bash tool. A recommended allowlist (package registries, certificate authorities, some GitHub content hosts such as `*.githubusercontent.com`) is on by default; plain `github.com` is not shown in it. Repository admins can add hosts, and the firewall can be disabled when the organization lets repositories decide. It does not apply to setup steps or MCP servers. Sources: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/customize-the-agent-firewall and https://docs.github.com/en/copilot/reference/copilot-allowlist-reference
- Background commands that wake the agent: unknown. The pages do not describe the agent being woken by a background process.

## Limits and price

| Item | Fact | Source |
|---|---|---|
| Entry plan | Copilot Pro, $10 a month, includes the cloud agent; Free does not | https://github.com/features/copilot/plans |
| Allowance | Pro: 1,500 AI credits a month (1,000 base plus 500 flex); 1 credit = $0.01; Pro+ $39 with 7,000 | https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing |
| What a task costs | AI credits by model and tokens, plus GitHub Actions minutes, charged to the repository owner | https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing (search summary) |
| Window | Monthly; resets at 00:00 UTC on the first day of the calendar month; unused credits do not roll over | billing page above |
| When it runs out | Upgrade, set an additional-usage budget, or wait for the next month | billing page above |
| Session length | 59 minutes at most, which cannot be extended | https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent |
| Workflows on its pull requests | Do not run until a person with write access approves them, unless an admin turns that off | risks page above |

## Board fit

The 12 checks from `change/work-items/WI-002-cross-platform-agent-trial/scope.md`.

| # | Check | Fit | Why |
|---|---|---|---|
| 1 | Skill found, or `AGENTS.md` pointer | Likely | `AGENTS.md` is read; `.claude/skills` and `.agents/skills` are listed skill paths |
| 2 | Node 18+ and git | Likely | Not stated for the default image, but setup steps install Node (the example uses Node 20) |
| 3 | Store cloned and pushed | Unknown, leaning unlikely | The token is limited to one repository and the agent cannot run `git push` directly; an Agents secret token is the only documented route, and `github.com` must be added to the firewall allowlist |
| 4 | One-line pointer is enough | Likely, if 3 holds | Instructions and skills are loaded; the prompt comes from the issue or task text |
| 5 | Threads work | Depends on 3 | Every thread write is a push to the store |
| 6 | Board messages work | Depends on 3 | Same as 5 |
| 7 | Claims hold across platforms | Depends on 3 | Claims are pushes to the store |
| 8 | Merge discipline | Likely | The agent cannot approve or merge, and cannot mark its pull request ready; it opens one draft pull request per task, which the master session takes over |
| 9 | Waiting, or inbox at turn boundaries | Unlikely for waiting | No documented wake from a background process, and a 59-minute cap; checking the inbox at the start and end is possible if 3 holds |
| 10 | Session-start hook | Unknown | Hooks exist, and setup steps run before the agent; whether their output reaches the agent as a briefing is not stated |
| 11 | Handoff across platforms | Depends on 3 | Reading notes needs only a clone (setup steps can do it); writing them needs a push |
| 12 | Cost and limits | Measurable | Credits and Actions minutes per task are reported; monthly window |

## Setup steps

1. Subscribe to Copilot Pro (or use an organization seat) with the cloud agent enabled.
2. In the code repository, add an Agents secret `THREADS_REMOTE` holding `https://x-access-token:<token>@github.com/<owner>/threads.git`, with a fine-grained token limited to the store, contents read and write (`skills/thread/references/setup.md`).
3. Add `github.com` (and `api.github.com` if the GitHub MCP server warns) to the repository's custom firewall allowlist, or disable the firewall for the trial repository.
4. Add `.github/workflows/copilot-setup-steps.yml` on the default branch with one job `copilot-setup-steps` that installs Node 20 with `actions/setup-node` and runs `node .claude/skills/thread/bin/thread.mjs board start --tool copilot --source trial`, so the store is cloned before the agent starts.
5. Start a task with `gh agent-task create "Go pick up work in trial" --base claude/bulletin-board-agent-collab-tmzxc5` or by assigning an issue with that text.
6. Watch the log for `NOT PUSHED`. If it appears, check 3 has failed on this platform: record it, and fall back to the agent reporting through its pull request description for a person or the master session to copy to the board.
