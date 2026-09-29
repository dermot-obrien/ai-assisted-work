# Setting up a repo and cloud sessions

Locally nothing is needed beyond a store: the first command clones it to `~/.threads`. A
cloud session (Claude Code on the web, Cursor cloud agents) starts from a fresh clone of the
repo, so everything `/thread` needs must be **committed on the branch the session starts
from**. When asked to set a repo up, or when `/thread` is missing or can't push in the cloud,
check these in order and fix what's missing.

**In the repo:**

1. **This skill committed at `.claude/skills/thread/`** (`SKILL.md`, `bin/` and `references/`). Claude Code
   and Cursor both load skills from there. The AAW installer makes it a link to the installed
   copy; git stores the real files through it. Without AAW, copy this directory there. If
   `.claude/` is ignored, un-ignore down to the skill:

   ```gitignore
   /.claude/*
   !/.claude/skills/
   /.claude/skills/*
   !/.claude/skills/thread/
   ```

   (A directory pattern like `.claude/skills/` can't be partly un-ignored; replace it with
   `.claude/skills/*` plus the `!` line.)
2. **`threads_remote: <store url>` in `.aaw-config.yaml`** at the repo root (a file with
   just that line is fine), so no environment variables are needed.
3. **Refresh the committed copy** whenever this skill is updated: re-run the AAW install, or
   copy it again, then commit.

**Claude Code on the web:**

- **Leave the environment setup script empty.** It runs once per environment, outside the
  repo; a leftover `git …` line fails with `fatal: not a git repository` and blocks every
  session.
- **Give the session the store repo.** A private store needs credentials to clone as well
  as to push. The first `/thread` may ask to add the repo; allow it. It may not ask, and the
  clone fails with `could not read Username`: attach the store repo with push access, or
  select it as a repository when starting the session. The Claude GitHub App must be allowed
  on that repo.
- **Skills load at session start.** If `/thread` isn't offered, the skill isn't on the
  session's branch or was committed after the session started: start a new one.

**Cursor Cloud agents** (from Cursor's docs; not yet verified end to end):

1. **Skill:** Cursor loads project skills from `.agents/skills/`, `.cursor/skills/` and, for
   compatibility, `.claude/skills/`, so the committed `.claude/skills/thread/` is found in
   the agent's clone. Don't depend on `.agents/skills/` there: AAW installs it and it is
   usually gitignored. Cursor's "Sync Skills for Cloud Agents" setting only syncs
   `~/.cursor/skills/`, so it isn't needed for a committed skill.
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

**Fallback for either tool:** set `THREADS_REMOTE` as an environment variable or secret. If
the session can't get write access to the store, use a fine-grained token limited to that
repo (Contents: read and write):
`https://x-access-token:<token>@github.com/<owner>/<store>.git`.

**Check it works:** `/thread <id>` of something opened locally shows up in the cloud, and a
`/thread note` made in the cloud appears locally on the next `/thread`. `NOT PUSHED` means no
write access; events not pushed are lost when the cloud container ends, so fix access first.
