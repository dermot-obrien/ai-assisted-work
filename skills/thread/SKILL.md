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
| `/thread done [resolution]` | `done <id> "<resolution>"` | The output names the thread to go back to. This chat now follows that one |
| `/thread park [why]`, `/thread drop [why]` | `park` / `drop <id> "<resolution>"` | Same as done |
| `/thread note <text>` | `note <id> "<text>"` | One-line acknowledgement |
| `/thread fork` | `fork <id>` | See below |
| `/thread tree` | `tree` (`--all` to include finished trees, `--mermaid` for a diagram) | Show it as-is, in a code block |
| `/thread move <id> under <id>` | `move <id> --parent <id>` or `--root` | One-line acknowledgement |

Every close carries a one-line resolution, and the script refuses a close without one. It
is what the tree shows for that thread from then on, so it should let someone who was not in
the chat see how it ended: what was decided or delivered and where it lives (a PR, a commit, a
file), or for a park or drop, why it stopped and what would restart it. If the user gives
none, write it yourself from the conversation. If the user writes an outcome in words
("that's done, we went with X"), treat it as `/thread done "went with X"`.

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
- Each chat works in its own checkout or git worktree. Two chats in one folder overwrite each
  other's uncommitted edits, and each picks up the other's changes in its commits.

This sits alongside work-item locks (`aaw-progress-work`, `references/concurrency.md`). A lock
decides who works an activity; the tree's owner decides who changes shared environments.

## When sync fails

The script prints `NOT PUSHED` when it can't reach the remote. The event is kept locally and
goes up with the next successful command. Tell the user in one line. If there is no store
at all, it prints how to configure one; relay that. Never edit files in the store by hand.
