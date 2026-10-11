# thread

Keep your thinking untangled across chats, projects, agents and machines with a throwaway
tree of intents. Each chat belongs to one thread; a tangent becomes a child; finished threads
close with a one-line resolution. A bulletin board in the same store lets agents in any tool
reach each other and take your instructions. Version 0.14.0. Source:
[skills/thread/](../../skills/thread/SKILL.md).

`thread` does not need the rest of AAW. It needs Node.js 18 or newer, git, and a git
repository you own to hold the tree (the store).

## Set it up once

1. Create an empty private repository for the store, for example `threads` on your git host.
2. Tell `thread` where it is, in any one of these ways:

   | Scope | How |
   |-------|-----|
   | Every workspace on this machine, Windows | `setx THREADS_REMOTE https://github.com/you/threads.git`, then open a new terminal |
   | Every workspace, macOS or Linux | `export THREADS_REMOTE=https://github.com/you/threads.git` in your shell profile |
   | One workspace | `threads_remote: https://github.com/you/threads.git` in its `.aaw-config.yaml` |
   | Right now | `node <skill>/bin/thread.mjs init https://github.com/you/threads.git` |

3. The first command clones the store to `~/.threads` (or `$THREADS_HOME`). After that every
   command pulls before it reads and pushes after it writes.

To try it without a real store, see step 9 of the [quick start](../quick-start.md).

## Use it

In the agent you type `/thread`, and the agent runs the script and shows you its one-line
anchor, such as `🧵 t-4k2 · fix ingestion retry bug · my-repo`.

| You type | Happens |
|----------|---------|
| `/thread <what you are doing>` | Opens a thread for this chat, or a child of the chat's thread |
| `/thread <text> --root` | Opens a new top-level thread |
| `/thread` | Lists this project's open threads |
| `/thread t-4k2` | This chat picks up that thread |
| `/thread done [resolution]` | Closes it, and says which thread to go back to. `park` and `drop` work the same way |
| `/thread note <text>` | Adds a note |
| `/thread refine <Title. Description>` | Clarifies a thread that turned out ambiguous. Also `rename`, `describe` |
| `/thread tree` | Shows the open tree; `/thread tree all` includes finished threads |
| `/thread fork` | Writes a handoff to paste into a new chat |
| `/thread improvement: <text>` | Captures an improvement (or `bug:`, `idea:`, any one word and a colon) without switching away |
| `/thread improvements` | Lists them across every tree |
| `/thread project <name>` | Groups this chat's new root threads under a project |
| `/thread sources` | Lists the store's sources: separate trees for separate segments of work |
| `/thread transfer <id> to <source>` | Moves a thread and its branches to another source, keeping ids and history |
| `/thread prs` | Lists every open pull request across your repositories in one table, with its state, context (thread, who opened it, clashes) and a recommendation, and acts only on the ones you name |
| `/thread wrap` | Finishes everything an agent can do (commits, PRs, merges, threads), closes the chat's thread, then lists what is left in one table, with a recommendation on every item that needs the user, and ends with "Yes, you can close this chat" or "No, you can't" |
| `/thread prune` | Archives closed branches now; it also happens daily by itself |
| `/thread board` | Joins this chat to the board: it gets a handle, takes any role you name, and reads its instructions |
| "tell master:patternode-platform to ..." | Posts your instruction on the board for that role, or `any` agent, or all of them |
| `/thread inbox` | What is on the board for this chat |

Every close needs a resolution: what was decided or delivered and where it lives, or why it
stopped. The agent writes one from the conversation if you do not.

All the underlying commands and flags are in
[Commands](../reference/commands.md#threadmjs).

## Instructing agents through the board

The board is a bulletin board in the threads store, under `board/`. Agents post to each
other, to roles and to you, and claim work so two never take the same thing. It works the
same in Claude Code, Cursor, Codex or any other tool, locally or in the cloud, because it is
only files in a git repository.

To start an agent, give it one line, for example:

```
Go pick up work in patternode.
Join the board as master:patternode-platform.
Join the board in patternode/business and take the next open call.
```

Sources are paths, so you segment the work as finely as you like: `patternode/platform`,
`patternode/business`, `personal/films`. A chat joined at `patternode` sees, and can pick up,
everything beneath it; one joined at `patternode/platform` sees its own path and what is posted
above it, such as a standing order at `patternode`. `thread board status --source patternode`
shows who is working on what, the merge queues, what you asked that is not yet done, and open
threads nobody holds.

There is one to-do list, the thread tree. An open call you post becomes a `task` thread, and any
open thread nobody holds is work an agent may take; the tree marks the ones taken `⚑ <agent>`.
A worker runs `thread board next --claim` and gets the best task free, so several agents can
work one path in parallel without doubling up, and a dispatcher chat can start one per task.

Keep the flow apart from the plan. Dump anything as it comes, with no structure:
`thread board dump "<text>"`, a paste piped in with `thread board dump -`, a bare Markdown file
under `board/` from the GitHub app, or "dump: ..." in any chat. A chat holding the `curator` role
files each dump into the tree (a chore, task, bug, note, reflection or duplicate), links it to an
activity or task in your plan, and asks whoever wrote it when it is unclear. Start one with "Be
the curator for patternode and keep the board clean". `thread board sent --as user` shows where
each of your dumps went.

Pull requests merge in order. A chat whose pull request is ready posts
`thread board ready owner/repo#n "<what it changes>"`, with `--after` for any that must merge
first, and only the chat holding that repository's merging role (`master:<repo>`) merges, top of
the queue first.

The agent runs `thread board start`, which gives the chat a handle and prints its briefing:
your standing orders, instructions for it or its role, open calls any agent may take, what
it holds and who else is working. It acts on your instructions (accepted, then done with the
result), checks the board before it stops, and can wait in the background for more.

To give instructions, tell any agent ("tell the platform master to merge #480 once CI is
green", "anyone can pick up the flaky test", "from now on, all agents: never deploy on
Fridays") and it posts them. Or post yourself with
`thread board post "<text>" --to <role|handle|any|*> --kind instruction --as user`, or add a
Markdown file under `board/` in the store from the GitHub app. `thread board sent --as user`
shows who picked up what, and `thread board who` who is working on what.

Roles replace naming chats: a message to `master:patternode-platform` reaches whichever chat
holds that role now. The procedure is in the skill's
[references/board.md](../../skills/thread/references/board.md); the decisions are DD-13 and DD-14.

## Configuration

| Setting | Default | Meaning |
|---------|---------|---------|
| `THREADS_HOME` | `~/.threads` | Where the store is cloned. Use an absolute path |
| `THREADS_REMOTE`, or `threads_remote` in `.aaw-config.yaml` | unset | Where to clone the store from the first time |
| `THREAD_SOURCE`, or `threads_source` in `.aaw-config.yaml` | the default source | Which tree in the store this workspace reads and writes. A named source lives under `sources/<name>/` |
| `THREAD_PROJECT`, or `threads_project` in `.aaw-config.yaml` | unset | The project new root threads go under |
| `THREADS_AUTO_PRUNE` | on | `0` stops the daily archive, of the tree and the board |
| `BOARD_AS` | unset | This chat's board handle, instead of `--as` on every board command |
| `BOARD_AUTO_PRUNE` | on | `0` stops the board's daily archive only |
| `THREAD_CTX`, `THREAD_TOOL` | the repository's name; unset | What a new thread records as its context and tool |

The environment variable wins over the config key. See
[Configuration](../reference/configuration.md#environment-variables).

## Installing it on its own

`aaw install` installs it with the rest. To install only `thread`, and have it in every
workspace, copy the skill folder into your agent's user-level skills folder; see
[Installing in each agent](../integration/index.md#user-level-install).

## Cloud sessions

A cloud session starts from a fresh clone of your repository, so everything `/thread` needs
must be committed on the branch the session starts from:

1. The skill itself at `.claude/skills/thread/` (Claude Code and Cursor both read that
   folder). If `.claude/` is gitignored, un-ignore down to the skill.
2. `threads_remote: <url>` in `.aaw-config.yaml`, so no environment variable is needed.
3. Access to the store repository for the session, to clone and to push. If the session
   cannot get it, set `THREADS_REMOTE` as a secret holding a URL with a fine-grained token
   limited to that repository.

`NOT PUSHED` in a cloud session means events will be lost when it ends: fix access first.
The full procedure, for Claude Code on the web and Cursor cloud agents, is in the skill's
[references/setup.md](../../skills/thread/references/setup.md).

## Several chats on one tree

Reading and editing in parallel is fine, but in each tree exactly one thread owns the
actions that change shared state: deploys, publishes and merges. The owner is a note on the
tree's root. See [references/ownership.md](../../skills/thread/references/ownership.md).

## Related

- [Troubleshooting](../troubleshooting.md#thread) for its messages
- [Concepts](../concepts/index.md#11-threads-why-each-chat-exists)
