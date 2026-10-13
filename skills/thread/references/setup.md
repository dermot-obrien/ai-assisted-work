# Setting up a repo and cloud sessions

Locally nothing is needed beyond a store: the first command clones it to `~/.threads`. A
cloud agent starts from a fresh clone of the repo, so everything `/thread` needs must be
**committed on the branch the session starts from**. When asked to set a repo up, or when
`/thread` is missing or can't push in the cloud, check these in order and fix what's missing.

**In the repo, the same for every agent tool:**

1. **This skill committed at `.agents/skills/thread/`** (`SKILL.md`, `bin/` and `references/`),
   the folder agent tools share. A skills installer (such as `skills.mjs sync --copy`) writes it
   there; without one, copy this directory. If `.agents/` is ignored, un-ignore down to the skill:

   ```gitignore
   /.agents/*
   !/.agents/skills/
   /.agents/skills/*
   !/.agents/skills/thread/
   ```

2. **An `AGENTS.md` at the root** that says what the agent is to do and names the command,
   `node .agents/skills/thread/bin/thread.mjs`, so an agent that loads no skills at all still
   finds it. Keep every instruction there, in one file every tool reads; add no tool-specific
   instruction files. A tool that reads only its own file name gets a one-line shim that
   imports `AGENTS.md` and says nothing else: `CLAUDE.md` holding `@AGENTS.md` for Claude Code,
   and `GEMINI.md` holding `@./AGENTS.md` for Gemini CLI. Cursor, Copilot, Codex, Jules, Devin
   and OpenHands read `AGENTS.md` themselves.
3. **`threads_remote: <store url>` in `.aaw-config.yaml`** at the repo root (a file with
   just that line is fine), so no environment variables are needed.
4. **Refresh the committed copy** whenever this skill is updated: re-run the installer, or
   copy it again, then commit.

What differs by platform is only how a session gets access to the store repository, and its
known gaps. Each platform below is set up by a person, once, in that platform's settings; none
of it is committed.

**Claude Code on the web:**

- **Leave the environment setup script empty.** It runs once per environment, outside the
  repo; a leftover `git …` line fails with `fatal: not a git repository` and blocks every
  session.
- **Give the session the store repo.** A private store needs credentials to clone as well
  as to push. The first `/thread` may ask to add the repo; allow it. It may not ask, and the
  clone fails with `could not read Username`: attach the store repo with push access, or
  select it as a repository when starting the session. The Claude GitHub App must be allowed
  on that repo.

**Cursor Cloud agents** (from Cursor's docs; not yet verified end to end):

1. **Skill:** Cursor loads project skills from `.agents/skills/`, so the committed
   `.agents/skills/thread/` is found in the agent's clone, and it reads `AGENTS.md`.
2. **Environment:** the agent runs on an Ubuntu machine with GitHub reachable by default.
   `/thread` needs only `node` (18+) and `git`. If the environment's `install` command
   (`.cursor/environment.json` or the dashboard) sets up a toolchain, make sure Node 18+ is
   in it. Don't clone the store there: `install` runs once per Build, from the project root,
   and the store is cloned on first use anyway.
3. **Access to the store repo:** the agent reaches GitHub through the Cursor GitHub app, so
   give the app read-write access to the store repo as well as the project repo (GitHub →
   Settings → Applications → Cursor → Repository access). If pushes still fail, go to step 4.
4. **Secret, when access isn't enough:** on the Cloud Agents dashboard
   (`cursor.com/dashboard/cloud-agents`) → Secrets, add `THREADS_REMOTE` as a **Runtime
   Secret**, which is redacted from transcripts and commits, set to the token URL below.
   Secrets are scoped to the team/workspace, or to one environment. They are injected when
   an agent starts, so start a new agent after adding one.
5. **Start the agent on a branch that has the skill,** type `/thread`, and do the check below.

**GitHub Copilot coding agent:**

1. **Store access:** Set an Agents secret named `THREADS_REMOTE` to a fine-grained token URL
   limited to the store repository (Contents: read and write). The agent's built-in token is
   limited to the code repository. Add `github.com` to the repository firewall allowlist if
   needed. Tried on 13 October 2026: the skill's own pushes to the store went through with this
   secret, although the agent itself never runs `git push`.
2. **Instructions:** Copilot reads `.github/copilot-instructions.md`, path-specific
   `.github/instructions/*.instructions.md`, and the nearest `AGENTS.md`; it can instead use
   a root `CLAUDE.md` or `GEMINI.md`. Skills are supported in `.agents/skills/` among others.
   `AGENTS.md` points to the thread command.
3. **Known gaps:** The agent cannot rename its pull request, which opens as a draft whose
   CI waits for a person to approve the run, so the merging role may post `board ready` for it.
   There is no documented wake-up for background commands. If the agent cannot be assigned an
   issue or picked in the agents panel, start it with `gh agent-task create`.

**OpenAI Codex Cloud:**

1. **Store access:** Install the ChatGPT Codex Connector GitHub app on the store repository as
   well as the code repository. Tried on 13 October 2026: Codex's own GitHub credential is used
   for github.com, so a push with only `THREADS_REMOTE` set was refused with "Write access to
   repository not granted" until the connector covered the store. Turn on agent internet access
   (the Package managers preset includes github.com). An environment variable, not a secret,
   reaches the agent.
2. **Instructions:** Codex reads `AGENTS.md` and finds skills in `.agents/skills/`.
3. **Known gaps:** If the task cannot be started on a chosen branch, put the branch in the
   prompt (fetch and check it out first). Cloud tasks have no documented background-command
   wake-up, and the pull request is created from the review screen after the task, so check its
   base branch and post `board ready` for it if the agent could not.

**Google Jules:**

1. **Store access:** Jules tasks use one connected repository. Configure the repository's
   `THREADS_REMOTE` environment variable with a fine-grained token limited to the store; whether
   Jules masks this variable from the task is unknown.
2. **Instructions:** Jules reads root `AGENTS.md`. Its documentation does not confirm support
   for `CLAUDE.md` or agent skills, so use the `AGENTS.md` pointer to the thread command.
3. **Known gaps:** Access and push to a separate store repository are unknown, as is whether
   the token is hidden from the task. There is no documented background-command wake-up, and
   the pull request base branch is unknown.

**Fallback for either tool:** set `THREADS_REMOTE` as an environment variable or secret. If
the session can't get write access to the store, use a fine-grained token limited to that
repo (Contents: read and write):
`https://x-access-token:<token>@github.com/<owner>/<store>.git`.

**Check it works:** `/thread <id>` of something opened locally shows up in the cloud, and a
`/thread note` made in the cloud appears locally on the next `/thread`. `NOT PUSHED` means no
write access; events not pushed are lost when the cloud container ends, so fix access first.

## The board at session start

The board needs nothing more than the store. The pointer the user gives ("Go pick up work in
patternode", "Join the board as master:patternode-platform") and `AGENTS.md` lead the agent to
run `board start`, which prints the briefing: standing orders, open calls, posts for its
repository. `board start --hook` prints the same briefing without joining, and prints nothing
when no store is configured, for a tool that can run a command when a session starts; set that
up in the tool's own settings rather than committing it, so the repository stays the same for
every tool.

## A local store, with no remote

Where the workspace cannot reach a shared store (a work laptop with no access to personal repositories, a machine offline), keep the threads in a git repository of its own on that machine. In `.aaw-config.yaml`:

```yaml
threads_home: ../threads-work     # a folder for the store, relative to this file (or ~/...)
threads_remote: local             # no remote: every command commits, nothing is pushed
```

or run `thread init --local` with `THREADS_HOME` set. The first command creates the store, with a README, and says where it is. The board works the same way in it. Keep the store outside the workspace's own repository, or add it to that repository's `.gitignore`. To share it later, `git -C <store> remote add origin <git-url>`; the next command pushes.
