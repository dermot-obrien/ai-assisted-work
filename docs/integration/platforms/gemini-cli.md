# Gemini CLI: platform fact sheet

Activity A1 of WI-002 (cross-platform agent trial). Everything here comes from Google's own pages, read on 13 October 2026. Where the pages do not say, this sheet says unknown.

## Headline: the free tier is gone

WI-002's scope lists Gemini CLI as a wave 2 "cheapest" platform with a "free tier with a Google account". That no longer holds. Google retired Gemini CLI for consumer users on 18 June 2026 and moved them to Antigravity CLI, a closed-source tool written in Go:

> "On June 18, 2026, Gemini CLI and Gemini Code Assist IDE extensions will stop serving requests."
> — [An important update: Transitioning Gemini CLI to Antigravity CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/), Google Developers Blog, 19 May 2026 (read 13 October 2026)

| Who | Gemini CLI after 18 June 2026 |
|---|---|
| Gemini Code Assist for individuals (the free Google-login tier) | Lost access; moved to Antigravity CLI |
| Google AI Pro and Ultra (Google One) subscribers | Lost access; moved to Antigravity CLI |
| Gemini Code Assist Standard or Enterprise licence; Code Assist for GitHub through Google Cloud | Unchanged |
| Paid Gemini API keys and Gemini Enterprise Agent Platform (Vertex AI) API keys | Still works |

Every page on geminicli.com now carries the same banner: unpaid-tier and Google One users were replaced by Antigravity CLI on 18 June 2026.

The blog says Antigravity CLI keeps "Agent Skills, Hooks, Subagents, and Extensions (now as Antigravity plugins)" but gives no 1:1 parity. It does not mention `GEMINI.md`, `AGENTS.md` or pricing. **Recommendation:** drop Gemini CLI as a "cheapest" wave 2 entry. If a free Google option is still wanted, add Antigravity CLI as its own wave 2 row and research it separately. Gemini CLI stays usable only on a paid API key, through Vertex AI or with an enterprise Code Assist licence.

## Start

- **Interactive:** run `gemini` in a project directory; `--include-directories` adds folders and `-m` picks a model ([README](https://github.com/google-gemini/gemini-cli), read 13 October 2026).
- **Headless (scriptable):** `gemini -p "<prompt>"`. Headless mode also starts whenever there is no TTY. `--output-format json` returns one object (`response`, `stats`, `error`), and `--output-format stream-json` emits NDJSON events. Exit codes: `0` success, `1` error, `42` input error, `53` turn limit exceeded ([Headless mode](https://geminicli.com/docs/cli/headless), read 13 October 2026). A script can start a task, so a cron job or CI step can run "Go pick up work in trial".
- **GitHub Actions:** [`google-github-actions/run-gemini-cli`](https://github.com/google-github-actions/run-gemini-cli) (read 13 October 2026) runs on issue and pull request events, on schedules and on `@gemini-cli` mentions in comments. Inputs include `gemini_api_key`, `use_vertex_ai`, `settings` (written to `.gemini/settings.json`) and `prompt`. The README does not mention `workflow_dispatch`, but the action is an ordinary step, so any trigger should work.
- **Web or cloud tasks:** none. Gemini CLI is a local CLI, with no hosted agent of its own. It runs wherever you put it: a laptop, a VM, CI.

## Instructions

- **Context files:** by default `GEMINI.md`, concatenated from `~/.gemini/GEMINI.md`, the workspace directories and their parents, and just in time from directories a tool touches. `@./path.md` imports other files ([Project context](https://geminicli.com/docs/cli/gemini-md), read 13 October 2026).
- **AGENTS.md / CLAUDE.md:** not read by default. `context.fileName` in `settings.json` takes a name or a list of names. Google's own example is `["AGENTS.md", "CONTEXT.md", "GEMINI.md"]`. `CLAUDE.md` can be listed the same way; the docs do not mention it.
- **Skills:** "Agent Skills" are discovered from (lowest to highest precedence) built-in, extension, user (`~/.gemini/skills/` or `~/.agents/skills/`) and workspace (`.gemini/skills/` or `.agents/skills/`). Within a tier `.agents/skills/` beats `.gemini/skills/`. Name and description load at session start, and the `SKILL.md` body loads when the skill is activated ([Agent Skills](https://geminicli.com/docs/cli/skills/), read 13 October 2026). **`.claude/skills/` is not read.** Whether skills are on by default is not stated; `/skills enable` and `/skills disable` exist.
- **Hooks:** `SessionStart`, `SessionEnd`, `BeforeAgent`, `AfterAgent`, `BeforeModel`, `AfterModel`, `BeforeToolSelection`, `BeforeTool`, `AfterTool`, `PreCompress`, `Notification`. They are configured in `.gemini/settings.json` (project), `~/.gemini/settings.json`, `/etc/gemini-cli/settings.json` or extensions ([Hooks](https://geminicli.com/docs/hooks/), read 13 October 2026). A `SessionStart` hook returns JSON. Its `hookSpecificOutput.additionalContext` is "injected as the first turn in history" in interactive mode and "prepended to the user's prompt" in headless mode. Plain stdout is not injected; stdout must be only the JSON ([Hooks reference](https://geminicli.com/docs/hooks/reference/), read 13 October 2026).

## Second repository

Gemini CLI has no repository model of its own. It uses the git credentials of the machine or runner it runs on.

- **Local or VM:** the store clones and pushes if the user's git can (SSH key, credential helper or `THREADS_REMOTE` with a token).
- **GitHub Actions:** the default `GITHUB_TOKEN` covers only the workflow's repository. The action recommends a custom GitHub App (`APP_ID` variable, `APP_PRIVATE_KEY` secret). An app installed on both repositories, or a fine-grained token limited to the store and passed as `THREADS_REMOTE`, would reach the store. The action's README does not discuss other repositories, so this is unknown until tested.

## Environment

- **Node:** Node.js 20.0.0 or newer ([Installation](https://geminicli.com/docs/get-started/installation), read 13 October 2026), which more than covers the board's Node 18+. It also needs macOS 15+, Windows 11 24H2+ or Ubuntu 20.04+; 4 GB RAM (16 GB for heavy use); Bash, Zsh or PowerShell; internet access; and a region on the Gemini Code Assist supported list.
- **git:** not bundled; whatever the host has. GitHub-hosted runners include git and Node.
- **Network:** no limits of its own. The sandbox is off unless enabled (`-s`, `GEMINI_SANDBOX`, or `tools.sandbox`). The macOS Seatbelt default profile `permissive-open` allows network access; the `*-proxied` profiles route it through a proxy. Docker, Podman, gVisor and LXC sandboxes also exist. None of the documented profiles blocks the network outright ([Sandboxing](https://geminicli.com/docs/cli/sandbox), read 13 October 2026).
- **Background commands:** the agent can start a long-running command and "detach it", and `/shells` shows logs and kills processes ([Shell commands](https://geminicli.com/docs/cli/tutorials/shell-commands), read 13 October 2026). The pages do not say the agent is woken or notified when a background command finishes.
- **Auth in headless and CI:** a cached Google-login OAuth token (consumer logins no longer served, see above), `GEMINI_API_KEY`, Vertex AI (`GOOGLE_CLOUD_PROJECT` with `GOOGLE_CLOUD_LOCATION`, using ADC or a service account through `GOOGLE_APPLICATION_CREDENTIALS`) ([Authentication](https://geminicli.com/docs/get-started/authentication), read 13 October 2026).

## Limits and price

From [Quota and pricing](https://geminicli.com/docs/resources/quota-and-pricing) (read 13 October 2026; the page was last updated 18 June 2026). Limits are daily requests per user. The page also says there is a per-minute limit, without a number, and does not say when the day resets.

| Access | Daily requests | Still serves Gemini CLI? |
|---|---|---|
| Google login, Code Assist for individuals (free) | 1,000 | No, since 18 June 2026 |
| Google login, Google AI Pro | 1,500 | No, since 18 June 2026 |
| Google login, Google AI Ultra | 2,000 | No, since 18 June 2026 |
| Gemini API key, free (unpaid) | 250, Flash only | Unclear: the quota page still lists it, but the blog names only *paid* API keys as keeping access |
| Gemini API key, pay as you go | Varies by tier; billed per token | Yes |
| Vertex AI express mode | Varies; free for 90 days, then billing | Yes (Vertex API key) |
| Vertex AI pay as you go | Dynamic shared quota or provisioned throughput | Yes |
| Workspace Code Assist Standard | 1,500 | Yes |
| Workspace Code Assist Enterprise / Workspace AI Ultra | 2,000 | Yes (Enterprise); Workspace AI Ultra not stated |

Google AI Plus and Workspace AI Standard, Plus and Expanded are not supported for the CLI.

Pay-as-you-go API prices ([Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), read 13 October 2026), per million tokens: Gemini 3.1 Flash-Lite $0.25 in and $1.50 out (free tier available); Gemini 3.1 Pro Preview $2.00 in and $12.00 out up to 200k-token prompts, $4.00 and $18.00 above (no free tier). There is no flat monthly plan for the CLI any more: the cheapest working entry is a paid API key billed per token. The monthly cost depends on how much the agent does and is unknown until measured (check 12).

## Board fit

Against the 12 checks in `change/work-items/WI-002-cross-platform-agent-trial/scope.md`, assuming a paid API key or Vertex. On a consumer login every check is **unlikely**, because the CLI no longer serves requests.

| # | Check | Verdict | Why |
|---|---|---|---|
| 1 | Skill found or pointer leads to it | Likely, with setup | `.claude/skills/` is not read. Either mirror the skill into `.agents/skills/` (read natively), or set `context.fileName` to include `AGENTS.md` or `CLAUDE.md` so the existing pointer loads |
| 2 | Node 18+ and git | Likely | The CLI itself requires Node 20+; git comes from the host or runner |
| 3 | Store clone and push | Likely locally; unknown in Actions | Locally it uses the host's git credentials. In Actions it needs a GitHub App or token covering the store, which the docs do not cover |
| 4 | One-line pointer is enough | Likely | Headless `-p "Go pick up work in trial"` with the pointer in a loaded context file |
| 5 | Threads work | Likely | Only Node and git commands through the shell tool |
| 6 | Board messages work | Likely | Same as 5 |
| 7 | Claims hold across platforms | Likely | Claims are store-side; nothing Gemini-specific |
| 8 | Merge discipline | Likely | No built-in PR-merge habit in the CLI. In Actions, the token's permissions decide whether it *can* merge; give it no merge rights |
| 9 | Waiting or inbox at turn boundaries | Unknown | Background commands can be detached, but the docs do not say the agent wakes when one ends. Headless runs end after one task, so checking the inbox at the end of a turn is the realistic mode |
| 10 | Session-start hook | Likely | `SessionStart` with `hookSpecificOutput.additionalContext` injects context in both modes; `board start --hook` would need to print that JSON shape (adapter or flag) |
| 11 | Handoff across platforms | Likely | Thread notes are store-side |
| 12 | Cost and limits | Unknown | Per-token billing on a paid key; no flat plan. Measure it |

## Setup steps

For a paid Gemini API key on a local machine or VM:

1. Install Node 20+, git and the CLI: `npm install -g @google/gemini-cli` (or `npx @google/gemini-cli`).
2. Create a **paid** API key in Google AI Studio and export `GEMINI_API_KEY`. Confirm with `/stats model` that requests are served.
3. Give git push access to `dermot-obrien/threads` (SSH key, or `export THREADS_REMOTE=<url with a fine-grained token limited to the store>`).
4. In the code repository, add `.gemini/settings.json`:
   ```json
   { "context": { "fileName": ["AGENTS.md", "CLAUDE.md", "GEMINI.md"] } }
   ```
   so the existing board pointer is loaded. Optionally expose the skill at `.agents/skills/thread/` as well.
5. Optional: add a `SessionStart` hook that runs `thread board start --hook` and wraps its output as `{"hookSpecificOutput":{"additionalContext":"..."}}`.
6. Run `gemini -p "Go pick up work in trial" --output-format json`, and check that `board start` does not print `NOT PUSHED`.

For GitHub Actions: use `google-github-actions/run-gemini-cli` with `gemini_api_key` (or `use_vertex_ai`) as a secret, pass the `settings` JSON from step 4, and give the job a GitHub App or token that can push to both repositories but has no merge rights. The workflow trigger is `schedule` or an issue comment.
