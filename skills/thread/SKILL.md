---
name: thread
description: Keep thought processes untangled across chats, projects, IDEs and machines with a throwaway tree of intents. Records why a chat exists, branches when the work diverges, closes or parks it when it's finished, and shows the tree of what is open. Use when the user types /thread, says what they are doing or why they started, asks where they were, what is open, or what this chat was for, goes off on a tangent, wants to fork work into a new chat, is finishing, parking or abandoning something, or asks whether a chat is done and can be deleted (/thread wrap).
license: CC-BY-4.0
compatibility: Node.js 18 or newer and git. The store is a git repo cloned to ~/.threads ($THREADS_HOME); pushing needs write access to it. The remote for first use comes from `threads_remote:` in .aaw-config.yaml or $THREADS_REMOTE.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "0.4.0"
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
| `/thread done [resolution]` | `done <id> "<resolution>"` | The output names the thread to go back to. This chat now follows that one |
| `/thread park [why]`, `/thread drop [why]` | `park` / `drop <id> "<resolution>"` | Same as done |
| `/thread note <text>` | `note <id> "<text>"` | One-line acknowledgement |
| `/thread refine <text>` | `refine <id> "<text>"` | Show the output as-is: the new anchor, description and earlier titles |
| `/thread rename <title>` | `rename <id> "<title>"` | Show the new anchor |
| `/thread describe <text>` | `describe <id> "<text>"` | One-line acknowledgement |
| `/thread fork` | `fork <id>` | See below |
| `/thread tree` | `tree` (`--all` to include finished trees, `--mermaid` for a diagram) | Show it as-is, in a code block |
| `/thread move <id> under <id>` | `move <id> --parent <id>` or `--root` | One-line acknowledgement |
| `/thread wrap` | See "Wrapping up a chat" | Say whether the chat can be deleted |

Every close carries a one-line resolution, and the script refuses a close without one. It
is what the tree shows for that thread from then on, so it should let someone who was not in
the chat see how it ended: what was decided or delivered and where it lives (a PR, a commit, a
file), or for a park or drop, why it stopped and what would restart it. If the user gives
none, write it yourself from the conversation. If the user writes an outcome in words
("that's done, we went with X"), treat it as `/thread done "went with X"`.

## Clarifying a thread

A title written in the moment can turn out to be ambiguous, or the work can drift from it.
Clarify it rather than leaving it to be misread later:

- `refine` takes one string. Its first sentence becomes the title and the rest becomes the
  description: `refine t-4k2 "Fix the EDGAR retry bug. Daily ingest only; the quarterly
  backfill is t-9xz."` A sentence ends at a full stop followed by a space or the end of the
  text, so a version like `v3.2.0` does not split it. Text with no such full stop only
  renames, and leaves any description as it was.
- `rename` changes only the title and `describe` sets only the description.

Earlier titles are kept and shown by `show` and `resume`, so a renamed thread still says what
it was called. The latest description replaces the previous one. The tree shows titles only,
so keep a title to one short line and put the detail in the description.

When a chat's work has clearly moved away from its title, offer one line: "This has become
<X>; refine the thread? (`/thread refine <text>`)". Offer once, as with opening a thread.

## Forking to a new chat

`fork <id>` prints the anchor and the thread's path. Below it, write a short self-contained
handoff: the goal, the decisions so far, key facts and file paths, and open questions. Never
refer to "above". Give it to the user to paste into a new chat. Beginning with the anchor
line ties the new chat to the same thread. If the new chat is a genuinely new branch,
`open` a child first and fork that.

## Wrapping up a chat

`/thread wrap` asks one question: is everything in this chat finished or recorded somewhere
that outlives it, so the chat can be deleted? Treat "can I delete this chat?", "are we done
here?" and "anything left?" the same way.

Nothing should exist only in the chat. Check, in this order, and fix what you can:

1. **Work in progress.** Uncommitted changes, commits not pushed, background tasks or
   monitors still running, and PRs this chat opened (their state and checks). Commit and
   push what belongs to this chat's task. Never commit another chat's edits, merge a PR or
   delete a branch to make the answer yes; report those instead.
2. **Shared actions.** If this chat's thread owns deploys, publishes or merges for its tree,
   hand over first (see "Many chats, one tree").
3. **Knowledge.** Decisions, facts and gotchas that live only in the conversation go where
   they belong: the repository (docs, CLAUDE.md, a runbook) if other people or agents need
   them, the agent's memory if only future sessions do, and a thread note otherwise.
4. **Loose ends.** Every follow-up becomes a note on this thread's parent or a new child
   thread, with a description that stands on its own. A title alone is not enough to pick
   it up from cold.
5. **This chat's thread.** Close it with `done` and a resolution. If it is not finished,
   `park` it with what is left and what would restart it.

Then answer in one of two ways. "Yes, you can delete this chat" with a short table of what
went where. Or "Not yet" with exactly what still needs the user or another chat, such as a PR
to merge, a question to decide or a task still running. Things waiting on the user outside the
chat, such as PRs to merge, do not block deletion; name them anyway.

## Coming back after a long run

When you finish a long-running task in a chat that has a thread, start your reply with the
anchor line, then one line of what you did and one line saying what, if anything, needs the
user. That's what someone switching back from another chat needs.

## Many chats, one tree: one owner for shared actions

Several chats often work under one tree at once: branches of the same goal, in different
tools or on different machines. Reading, exploring and editing in parallel is fine. Changing
shared state from more than one chat is not, because each chat acts on what it last saw and
none of them sees the others.

In each tree, exactly one thread owns the actions that change shared state:

| Owned by one thread per tree | What goes wrong with two |
|---|---|
| Deploys, infrastructure applies, and image builds that decide what gets deployed | The environment ends up running code that neither chat tested |
| Publishing data that people or services read | The last publish wins, silently |
| Merging into, rebasing or force-pushing a shared branch | One chat's integration undoes or duplicates the other's |

How it works:

- The owner is recorded as a note on the tree's root:
  `note <root> "owner: t-9c3 (deploys, publishes, merges)"`. If no owner is named, the first
  chat that needs a shared action records itself. The latest owner note wins.
- Before a shared action, run `resume <root>` and read the notes. If another thread owns it,
  do not act. Say in one line which thread owns it, and leave a note on the owner's thread
  saying what is ready (commit, branch, what to deploy).
- If the user asks a chat that is not the owner to act anyway, say which thread owns it and
  act only once they confirm. Then record the new owner on the root.
- To hand over, the owner notes the new owner on the root, and notes on the new owner's
  thread what it inherits: anything built but not deployed, and anything half done. A thread
  that owns shared actions hands over before it is closed, parked or dropped.
- Make the owner visible where the chat list is. In a tool that can rename chats, the owning
  chat's title starts with `main · `, for example `main · earnings lab`. Only the owner uses
  the prefix. On handover the old owner drops it and the new owner adds it. In a tool that
  cannot rename chats, the owner puts `main` after the anchor line when it records ownership,
  so scrolling up shows it.
- Each chat works in its own checkout or git worktree. Two chats in one folder overwrite each
  other's uncommitted edits, and each picks up the other's changes in its commits.

This sits alongside work-item locks (`aaw-progress-work`, `references/concurrency.md`). A lock
decides who works an activity; the tree's owner decides who changes shared environments.

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
