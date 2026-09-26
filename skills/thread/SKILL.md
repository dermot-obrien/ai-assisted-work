---
name: thread
description: Keep thought processes untangled across chats, projects, IDEs and machines with a throwaway tree of intents. Records why a chat exists, branches when the work diverges, closes or parks it when it's finished, and shows the tree of what is open. Use when the user types /thread, says what they are doing or why they started, asks where they were, what is open, or what this chat was for, goes off on a tangent, wants to fork work into a new chat, or is finishing, parking or abandoning something.
license: CC-BY-4.0
compatibility: Node.js 18 or newer and git. The store is a git repo cloned to ~/.threads ($THREADS_HOME); pushing needs write access to it. The remote for first use comes from `threads_remote:` in .aaw-config.yaml or $THREADS_REMOTE.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "0.2.0"
---

# Thread

A light way to remember **why this chat exists** and where it went. Every chat belongs to
one node in a tree of intents. The tree is shared by every machine, IDE, project and chat,
so the user can switch freely and always get back to what they were doing.

This is the opposite of ceremony. One line in, one line out. Never ask more than one
short question, and usually ask none.

## The tool

All state is read and written through the script beside this file:

```bash
node <this skill's directory>/bin/thread.mjs <command> ...
```

Pass `--tool <your tool>` (`claude-code`, `cursor`, `copilot`, `codex`, `gemini`) when you
open a thread. The project (`ctx`) is taken from the git repo you are running in. Run the
commands yourself; don't ask the user to.

## This chat's thread

Each chat is tied to one thread id, e.g. `t-4k2`. **You keep track of it from the
conversation**: it's in the most recent anchor line, which looks like

```
🧵 t-4k2 · fix ingestion retry bug · patternode-platform
```

Whenever a command below prints an anchor, show it to the user **verbatim as the first line
of your reply**. Tools that can't rename chats still show it, so scrolling up tells them
why the chat exists.

If a chat has no thread yet and the user gives a substantial new task, you may offer one
line: "Want me to thread this? (`/thread <what you're doing>`)". Offer once per chat and
don't nag.

## What the user types → what you run

| User | Run | Then |
|---|---|---|
| `/thread <text>` in a chat **with no thread** | `open "<text>" --tool …` | Show the anchor |
| `/thread <text>` in a chat **that has a thread** | `open "<text>" --parent <this chat's id> --tool …` | Show the new anchor. This chat now follows the new id. If the text is plainly unrelated to the current thread, open it with no `--parent` (a new root) and say so in one line |
| `/thread <text> --root` | `open "<text>" --tool …` | New top-level thread for this chat |
| `/thread` | `status` | Show the output as-is: this project's open threads, plus a count elsewhere |
| `/thread <id>` | `resume <id>` | Show the anchor, path and notes. This chat now follows that id |
| `/thread done [outcome]` | `done <id> "<outcome>"` | The output names the thread to go back to. This chat now follows that one |
| `/thread park [why]`, `/thread drop [why]` | `park` / `drop <id> "<why>"` | Same as done |
| `/thread note <text>` | `note <id> "<text>"` | One-line acknowledgement |
| `/thread fork` | `fork <id>` | See below |
| `/thread tree` | `tree` (`--all` to include finished trees, `--mermaid` for a diagram) | Show it as-is, in a code block |
| `/thread move <id> under <id>` | `move <id> --parent <id>` or `--root` | One-line acknowledgement |

If the user writes an outcome in words ("that's done, we went with X"), treat it as
`/thread done "went with X"`. Keep outcomes to one line.

## Forking to a new chat

`fork <id>` prints the anchor and the thread's path. Below it, write a short self-contained
handoff: the goal, the decisions so far, key facts and file paths, and open questions. Never
refer to "above". Give it to the user to paste into a new chat. Beginning with the anchor
line ties the new chat to the same thread. If the new chat is a genuinely new branch,
`open` a child first and fork that.

## Coming back after a long run

When you finish a long-running task in a chat that has a thread, start your reply with the
anchor line, then one line of what you did and one line saying what, if anything, needs the
user. That's what someone switching back from another chat needs.

## When sync fails

The script prints `NOT PUSHED` when it can't reach the remote. The event is kept locally and
goes up with the next successful command. Tell the user in one line. If there is no store
at all, it prints how to configure one; relay that. Never edit files in the store by hand.

## Setting up a repo and cloud sessions

Locally nothing is needed beyond a store: the first command clones it to `~/.threads`. A
cloud session (Claude Code on the web, Cursor cloud agents) starts from a fresh clone of the
repo, so everything `/thread` needs must be **committed on the branch the session starts
from**. When asked to set a repo up, or when `/thread` is missing or can't push in the cloud,
check these in order and fix what's missing.

**In the repo:**

1. **This skill committed at `.claude/skills/thread/`** (`SKILL.md` and `bin/`). Claude Code
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
- **Allow the store repo** when the first `/thread` asks to add it. The Claude GitHub App
  must be allowed on that repo.
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
