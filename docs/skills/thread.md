# thread

Keep your thinking untangled across chats, projects, agents and machines with a throwaway
tree of intents. Each chat belongs to one thread; a tangent becomes a child; finished threads
close with a one-line resolution. Version 0.8.2. Source:
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
| `/thread prs` | Lists every open pull request across your repositories in one table, with its state, context (thread, who opened it, clashes) and a recommendation, and acts only on the ones you name |
| `/thread wrap` | Finishes everything an agent can do (commits, PRs, merges, threads), closes the chat's thread, then lists what is left in one table, with a recommendation on every item that needs the user, and ends with "Yes, you can close this chat" or "No, you can't" |
| `/thread prune` | Archives closed branches now; it also happens daily by itself |

Every close needs a resolution: what was decided or delivered and where it lives, or why it
stopped. The agent writes one from the conversation if you do not.

All the underlying commands and flags are in
[Commands](../reference/commands.md#threadmjs).

## Configuration

| Setting | Default | Meaning |
|---------|---------|---------|
| `THREADS_HOME` | `~/.threads` | Where the store is cloned. Use an absolute path |
| `THREADS_REMOTE`, or `threads_remote` in `.aaw-config.yaml` | unset | Where to clone the store from the first time |
| `THREAD_PROJECT`, or `threads_project` in `.aaw-config.yaml` | unset | The project new root threads go under |
| `THREADS_AUTO_PRUNE` | on | `0` stops the daily archive |
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
