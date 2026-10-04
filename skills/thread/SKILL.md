---
name: thread
description: "Keep thought processes untangled across chats, projects, IDEs and machines in a tree of intents. Records why a chat exists, branches, closes or parks it, and shows what is open. Use when the user types /thread, says what they are doing or why they started, asks where they were, what is open, or what this chat was for, goes off on a tangent, wants to fork or split work into its own session (/thread split, /thread branch), wants a chat's work recorded and the chat renamed (/thread sync), is finishing, parking or abandoning something, asks to wrap up a chat or whether it can be closed (/thread wrap, 'wrap up'), or wants closed threads pruned or archived (/thread prune), or asks what pull requests are open (/thread prs). Also captures improvements, bugs and ideas as tagged threads (/thread improvement: <text>, 'add an improvement: ...') and lists them across every tree (/thread improvements), groups threads under projects (/thread project <name>), and keeps segments of work in separate sources (/thread sources)."
license: CC-BY-4.0
compatibility: Node.js 18 or newer and git. The store is a git repo cloned to ~/.threads ($THREADS_HOME); pushing needs write access to it. The remote for first use comes from `threads_remote:` in .aaw-config.yaml or $THREADS_REMOTE, and the source within it from `threads_source:` or $THREAD_SOURCE.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "0.15.0"
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
| `/thread fork` | `fork <id>` | See "Forking and splitting" |
| `/thread split [what]`, `/thread branch [what]`, "move this to its own session", "this is its own thing now" | `open` a child for the work, then `fork` it | See "Forking and splitting". This chat goes back to its own thread |
| `/thread sync`, "sync the threads", "make sure this is all in threads" | See "Syncing a chat" | Every strand of work in this chat recorded in a thread, and the chat renamed for the latest |
| `/thread tree` | `tree` (`--all`, or `tree all`, for finished threads too) | See "Showing the tree" |
| `/thread move <id> under <id>` | `move <id> --parent <id>` or `--root` | One-line acknowledgement |
| `/thread prune`, `/thread archive` | `prune` (`--dry-run` to preview, `--days <n>` to keep recent ones) | Show the output as-is. See "Pruning" |
| `/thread prs`, "what PRs are open" | See "Open pull requests" | One table of every open PR across the user's repositories, with state, context and a recommendation each |
| `/thread wrap`, "thread wrap", "wrap up" | See "Wrapping up a chat" | Finish everything an agent can, close the thread, list what is left, and end with whether the chat can be closed |
| `/thread improvement: <text>` (or `feature:`, `bug:`, `idea:`, any one word and a colon), or "add an improvement: <text>" | `open "<text>" --kind improvement --parent <this chat's id> --tool …` | One line with the new id. This chat keeps following its own thread. See "Capturing by kind" |
| `/thread kind <id> <kind>` | `kind <id> <kind>` (`none` clears it) | One-line acknowledgement |
| `/thread improvements` (or `features`, `bugs`, `ideas`), `/thread list <kind>` | `list --kind improvement` (`--all` for finished ones too) | Show the output as-is |
| `/thread project <name>` | `project "<name>"` | Show the anchor. This chat now has that project: pass `--project <its id>` whenever you open a root thread here. See "Projects" |
| `/thread projects` | `projects` | Show the output as-is |
| `/thread sources` | `sources` | Show the output as-is. See "Sources" |
| `/thread transfer <id> to <source>`, "move this tree to <source>" | `transfer <id> --to <source>` | Show the output as-is. Ask first: it moves the whole tree under that thread |
| `/thread tree all sources`, "threads in every source" | `tree --source all` (also `status`, `list`) | Show the output as-is |

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

## Capturing by kind

Some threads are not work in progress but something to come back to: an improvement, a
bug, an idea. Give those a kind, one lowercase word, so they can be found later wherever they
sit in the tree.

- **Capture is a dump, not a switch.** `/thread improvement: <text>` records the item and the chat
  carries on with what it was doing, under its own thread. Put what the user said in the title,
  and anything else they said about it in the description (`describe`), so it can be picked up
  cold. Don't ask clarifying questions at capture time.
- **Where it goes.** Under this chat's thread when the item comes out of this work. If it is
  plainly unrelated, or the chat has no thread, open it as a root. If the user keeps an inbox
  thread for that kind in this area (a thread whose description says so), put it there.
- **Finding them.** `list --kind improvement` is flat and crosses every tree and project, with the
  path each one sits under. It shows open and parked ones; `--all` adds the closed ones with
  their resolutions. `list --json` gives the same rows for a widget or a script.
- **Tagging after the fact.** `kind <id> improvement` marks an existing thread; `kind <id> none`
  clears it.
- **Promoting one.** When the item is written up properly somewhere that outlives the thread (a
  feature specification, an issue, a work item), follow the workspace's own procedure for that,
  then close the thread `done` with where it now lives, for example
  `done t-kus "specified as FE-004: change/features/FE-004-chat-stop.md"`. If it is rejected,
  `drop` it with why. The thread keeps its kind, so `list --all` still shows it and where it went.

## Projects

A project is what a group of threads is for: a product, a client, an initiative. It is a
thread of kind `project`, usually a root, and the threads of that project sit under it. A
project is not a repository: one repository can hold several projects, and one project can
span several repositories. Each thread still records the repository it was opened in (`ctx`).

- **Starting or finding one.** `project "<name>"` finds the project with that title (ignoring
  case), or starts it as a new root thread of kind `project`. `project <id>` finds one by id.
  An existing thread becomes a project with `kind <id> project`.
- **This chat's project.** After `/thread project <name>`, keep the project's id from the
  conversation, as you keep the thread id, and pass `--project <id>` every time you open a
  root thread in this chat. A thread opened with `--parent` already sits where it belongs.
- **A default for a workspace.** A root thread opened with neither `--parent` nor `--project`
  goes under `$THREAD_PROJECT`, or else `threads_project:` in the nearest `.aaw-config.yaml`,
  when either is set. Either takes a project id or title. `$THREAD_PROJECT` can be set per
  repository in `.claude/settings.json` (`"env": {"THREAD_PROJECT": "t-9c3"}`) or for a whole
  project in tools that have one. `--root` opens a root thread outside any project.
- **Status.** With a project set, `status` shows that project's tree first; otherwise it shows
  the trees opened in this repository.
- **Listing.** `projects` lists every project, across all trees.

## Sources

One store can hold several sources: separate trees for separate segments of work. A workspace
picks one with `threads_source: <name>` in `.aaw-config.yaml` or `$THREAD_SOURCE`; without
either, the default source is used and nothing changes. Commands read and write that source
only, an id in another source is found there, and `transfer` moves a tree between sources.
Read [references/sources.md](references/sources.md) before a transfer, when a view starts
with `source:`, or when the user asks about sources.

## Showing the tree

`tree` shows only unfinished threads: open (●) and parked (‖). Done and dropped threads are
hidden, and a closed thread's unfinished branches take its place, so nothing closed appears.
`tree --all` (`/thread tree --all`, `/thread tree all`, or "show the full tree") shows
everything, with resolutions, including threads already pruned into the archive. `tree <id>` limits either view to that thread's tree.

**If your environment can render a widget** (an inline visual or HTML widget tool, a canvas,
or an artifact), render the tree as a hierarchical task tree, not text:

1. Run `tree --json` (plus `--all` or an id if asked). It prints the same view as nested
   objects: `id`, `title`, `status`, `ctx`, `description`, `outcome`, `notes`, `ago`,
   `children`.
2. Draw it as an indented, collapsible task list: one row per thread with a status marker
   (open, parked, and in `--all` done and dropped), the title, a muted `id · ctx · ago`, and
   the description, outcome and notes on expand. Expand the roots, and group roots by `ctx`
   with this project's first. Keep it readable in light and dark themes.
3. Put nothing else in the widget. Afterwards, say in one line how many threads are open and
   in which projects.

Otherwise show `tree`'s text output as-is, in a code block. `--mermaid` gives a diagram for
tools that render Mermaid.

## Pruning

Every action is one event file in the store, so the live `events/` folder grows with every
chat. `prune` moves closed branches out of it into a new file under `archive/`, one file per
prune. A closed branch is a done or dropped thread whose every descendant is also done or
dropped; parked threads are unfinished and stay. Nothing is lost:

- `tree` and `status` read only the live events, which is what keeps them small.
- `tree --all`, `show` and `fork` replay the archive files as well, so the full tree and a
  closed thread's history look exactly as they did before the prune.
- Resuming, noting, closing or branching under an archived thread brings it (and its path)
  back into the live events first. So does an event written by another machine for a thread
  this one archived at the same time, on the next command.
- Archive files are new files and are never edited, so two machines pruning at once cannot
  conflict; an event found in two archives is counted once.

It also runs by itself, once a day. Every command that writes (open, note, done, park, drop,
rename, refine, describe, move, resume) checks whether a prune has run yet today, in the
machine's local time. If not, it archives every branch closed before today began and prints
one line saying so; relay that line. So the live store holds the day's events plus whatever
is still in play, and each day's archive is its own file. New events are filed under
`events/YYYY-MM-DD/`. `THREADS_AUTO_PRUNE=0` turns the daily prune off.

`/thread prune` does it now, for every closed branch however recent. Run it when the user asks
to prune, archive or tidy the threads.

## Syncing a chat

One chat often drifts across several things. `/thread sync` makes sure each of them is in a
thread, makes the chat follow the latest, renames the chat to match where the tool can, and
pushes. It records; it does not finish work, commit or close the chat (that is `/thread wrap`).
Follow [references/sessions.md](references/sessions.md).

## Forking and splitting

`fork <id>` prints the anchor and the thread's path. Below it, write a short self-contained
handoff: the goal, the decisions so far, key facts and file paths, what is done and what is
next, and open questions. Never refer to "above". Beginning with the anchor line ties the new
chat to the same thread. If the new chat is a genuinely new branch, `open` a child first and
fork that.

**Splitting** is the usual reason to fork: work that began in this chat has become a standalone
thing and belongs in its own session. `/thread split` (or `/thread branch`) gives it its own thread, starts the new
session with the handoff where the tool can (else gives the handoff to paste), and returns this
chat to its own thread. Follow [references/sessions.md](references/sessions.md).

## Open pull requests

`/thread prs` reports every open pull request across the user's accounts and organisations in one
table, each with its state, context and a recommendation, and acts only on the ones the user
names. Follow [references/prs.md](references/prs.md).

## Wrapping up a chat

`/thread wrap` is an instruction to finish, not a question. "Thread wrap", "wrap up",
"everything wrapped up", "can I close this chat?" and "anything left?" mean the same. Do
every outstanding thing an agent can do, without asking, and stop only for a blocker that
prevents what comes after it. What is left at the end is only what the user must do.

Workspace rules win. Where a workspace forbids an action (committing, opening PRs,
merging, pushing a branch), that action becomes a user item; don't argue with the rule or
work around it. Never act on another chat's work: its uncommitted edits, its PRs, its
branches. Report it as an item for that chat's thread.

Work through this list, doing rather than proposing:

1. **Shared actions.** Before any merge, publish or deploy, read the tree root's notes (see
   [references/ownership.md](references/ownership.md)). A chat takes a shared action only if
   it is the owner recorded on the root, or the workspace says so (`threads_merges: own` in
   `.aaw-config.yaml` lets every chat merge the pull requests it opened). Otherwise don't
   take it: tell the owner what is ready (a message to its chat and a note on its thread),
   and list it as a 🌐 row. If this chat is the owner and is about to close, hand over first.
2. **Work in progress.** Commit and push this chat's changes. Open a PR for each branch that
   needs one. Never merge by default. Only the owner, or any chat where the workspace says so,
   merges each PR once it can be merged: checks pass, no review or unresolved conversation is
   outstanding, and the workspace allows it. Every other chat makes its PRs ready and hands
   them to the owner, even PRs it opened itself. Delete merged branches. Wait for running
   checks and tasks this chat started, unless they will plainly outlast the turn; then record
   each in a thread with what to do when it finishes, and list it as a 🌐 row.
3. **Knowledge.** Decisions, facts and gotchas that live only in the conversation go where
   they belong: the repository (docs, CLAUDE.md, a runbook) if other people or agents need
   them, the agent's memory if only future sessions do, and a thread note otherwise.
4. **Loose ends.** Every item still outstanding becomes a thread, or a note on one, with a
   description that stands on its own. A title alone is not enough to pick it up from cold.
   That includes every user item.
5. **This chat's thread.** Close it: `done` with a resolution when its own work is delivered
   and what remains lives in other threads; `park` with what is left and what would restart
   it when it is not. If the chat has no thread, open one under the right parent, then close
   it.
6. **This chat.** Wrapping is the user marking the chat done. When the answer will be yes,
   mark the chat itself done wherever the tool can: a session or chat status, a sidebar's
   completed mark, an archive flag the user has asked for. Don't ask first. A tool with no
   such mark skips this step.

### The reply

Write the reply only when nothing is left that the agent can do now. While agent work
remains, keep working; don't reply with a plan. Three parts, in this order, and nothing
after the last line.

1. **What the agent did.** A short list grouped by item or thread: what changed, with PR
   links, commit ids, and the ids of threads closed, parked or opened.
2. **Everything still outstanding**, one table in material order, blockers first. Every item,
   including those that wait on someone else, and every one already in a thread. Columns:
   #, Owner, Gate, Action, Thread, Recommendation.
   - #: the row number, 1, 2, 3 and so on, so the user can answer by number ("do 2", "1: go
     with the IT base"). When the user answers by number, act on that row of the table most
     recently shown.
   - Owner: 👤 **You**, 🤖 **Agent**, 🌐 **Waiting** (another person, another chat, CI).
   - Gate: 🔴 **Blocking** (something waits on it), 🟡 **Next**, ⚪ **Later**.
   - A 🤖 row is allowed only for something the agent cannot do yet, with what it waits for.
     Anything the agent can do now, it has done.
   - Keep 👤 rows to the fewest the user truly must do, each one concrete: a decision, an
     approval, a command. Put them first among rows with the same gate.
   - Every 👤 row carries a recommendation: what the agent would do or choose, and why, in
     one line. For a decision, name the option; for a command, say when to run it. Other rows
     may leave it empty.
3. **The last line**, one of exactly two:
   - `Yes, you can close this chat.` When everything the agent could do is done, every PR
     this chat opened is merged or is waiting on a person or an external gate such as CI,
     every outstanding item is in a thread that says what to do next, this chat's thread is
     closed or parked, and the chat is marked done where the tool can.
   - `No, you can't close this chat. Still to do here: <items>.` Only when the agent has to
     stop with work left that only this chat can carry, such as uncommitted work that cannot
     yet be committed. Name each item; the user decides whether to carry on.

For example:

```markdown
| # | Owner | Gate | Action | Thread | Recommendation |
|---|---|---|---|---|---|
| 1 | 👤 You | 🔴 Blocking | Choose the knowledge base for the subset | t-cuk | The IT help base: it has an owner and real search logs |
| 2 | 🌐 Waiting | 🟡 Next | Platform team confirms the export method | t-pcx | |
| 3 | 🤖 Agent | ⚪ Later | Register the requests once the products exist | t-evk | |

Yes, you can close this chat.
```

This shape is for wraps. Another reply that lists outstanding items reuses the table, its numbers and its
Recommendation column, but not the closing line; after a long run, keep to the short form in
"Coming back after a long run".

Don't end with a question. If a decision blocks the rest, it is a 👤 row marked 🔴, and the
work that does not depend on it is still done.

## Coming back after a long run

When you finish a long-running task in a chat that has a thread, start your reply with the
anchor line, then one line of what you did and one line saying what, if anything, needs the
user. That's what someone switching back from another chat needs.

## Many chats, one tree: the master owns shared actions

Several chats often work on the same repositories at once. Reading, exploring and editing in
parallel is fine, but in each repository group exactly one chat, the **master**, takes the
actions that change shared state: merging pull requests, releases and tags, publishes and
deploys. Its title starts with the owner prefix, `master` unless the workspace sets
`threads_master_prefix:` in `.aaw-config.yaml` (for example `master: image and video`), or the
user names it. The record is a note on the tree's root
(`note <root> "owner: t-9c3 (master: merges, releases, publishes, deploys)"`). Every other
chat is a worker: it never merges, not even its own green pull request. It makes the pull
request ready and hands it to the master (a message to the master's chat and a note on its
thread; from a cloud session, the pull request description and a thread note). A workspace
where each chat merges its own pull requests says so with `threads_merges: own`.

Read [references/ownership.md](references/ownership.md) before any shared action, before
handing a pull request to the master, when recording or handing over ownership, or when the
user asks a worker to merge or deploy.

## When sync fails

The script prints `NOT PUSHED` when it can't reach the remote. The event is kept locally and
goes up with the next successful command. Tell the user in one line. If there is no store
at all, it prints how to configure one; relay that. Never edit files in the store by hand.

## Setting up a repo and cloud sessions

Locally nothing is needed beyond a store: the first command clones it to `~/.threads`. A
cloud session starts from a fresh clone of the repo, so everything `/thread` needs must be
committed on the branch the session starts from. When asked to set a repo up, or when
`/thread` is missing or can't push in a cloud session (Claude Code on the web, Cursor cloud
agents), follow [references/setup.md](references/setup.md).
