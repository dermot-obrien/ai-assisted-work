# Many chats, one tree: the master owns shared actions

Several chats often work on the same repositories at once: branches of the same goal, in
different tools or on different machines. The repositories they share form a group, for
example a platform repository and the architecture repository that designs it. Reading,
exploring and editing in parallel is fine. Changing shared state from more than one chat is
not, because each chat acts on what it last saw and none of them sees the others.

In each repository group exactly one chat is the **master**: one session per group, alone
merging, releasing, publishing and deploying. The others are **workers**: they open pull
requests and tell the master what is ready. Only the master takes the actions that change
shared state:

| Only the master | What goes wrong with two |
|---|---|
| Merging pull requests into the integration branch (`develop` under Git Flow), and rebasing or force-pushing a shared branch | One chat's integration undoes or duplicates the other's |
| Opening and merging a release pull request (`develop` into `main`), when the user asks for a release, and tagging it | Two releases cut from different commits |
| Publishing data or packages that people or services read | The last publish wins, silently |
| Deploys, infrastructure applies, and image builds that decide what gets deployed | The environment ends up running code that neither chat tested |

## Who the master is

- The master is the chat whose title starts with the owner prefix, for example
  `master: image and video`, or the chat the user names. Only the master uses the prefix.
  The prefix is `master` unless the workspace sets another (see
  [Workspace settings](#workspace-settings)).
- The owner note on the tree's root is the record, which every chat can read, cloud sessions
  included: `note <root> "owner: t-9c3 (master: merges, releases, publishes, deploys)"`. A
  title can drift or be read wrongly; the note decides. The latest owner note wins. If none
  is named, ask the user rather than claiming it.
- In a tool that cannot rename chats, the master puts the prefix after the anchor line when it
  records ownership, so scrolling up shows it.
- To hand over, the master notes the new owner on the root and notes on the new master's
  thread what it inherits: open pull requests and their order, anything merged but not
  released or deployed, and anything half done. The old master drops the prefix and the new
  one adds it. A master hands over before its thread is closed, parked or dropped.

## Workers

A worker never merges (not even its own pull request with every check green), never pushes to
`develop` or `main`, never tags, publishes or deploys, and never retargets or edits another
chat's pull request. When the user tells a worker to "merge", it hands the pull request to
the master instead.

A worker makes its pull request ready:

- The branch starts from the integration branch (`origin/develop`) and the pull request
  targets it.
- Checks pass, or there are none, and GitHub says it can be merged.
- The description says what changed and how it was checked.
- Open items are in threads.
- Pull requests that depend on each other are stacked, with the merge order stated.

Then it tells the master:

- **Locally:** a message to the master's chat (in Claude Code, `SendMessage` to the session
  found with `ListAgents`) with the link, what it holds, how it was tested and what it
  overlaps with, plus the same as a note on the master's thread.
- **From a cloud session**, which cannot message back: the same in the pull request
  description and in a note on its own thread. The master finds it with `/thread prs`.

If no master is running, the worker tells the user and leaves the pull request open; it does
not merge in the master's place.

## The master

- Before a shared action, run `resume <root>` and read the notes to confirm it is still the
  owner.
- Merge with a merge commit once the checks pass and any overlap with other open pull requests
  is resolved, in the stated order. Delete the branch, then tell the worker it is in.
- Open the release pull request (`develop` into `main`) only when the user asks for a release,
  merge it with a merge commit (never squash, or the two branches' histories diverge), and tag
  the release on `main`.
- Deploys promote the same commit: `develop` to a staging or preview environment where there
  is one, production from a tagged release on `main`. There is no long-lived branch between
  `develop` and `main`. If a release needs time to settle while `develop` moves on, cut a
  short-lived `release/X.Y` from `develop`, land fixes there, and merge it into `main` (tag)
  and back into `develop`.

## Workspace settings

Two optional keys in the nearest `.aaw-config.yaml` above the working directory change the
defaults. Read them before a shared action or a wrap.

| Key | Default | Effect |
|---|---|---|
| `threads_master_prefix` | `master` | The title prefix that marks the master, for example `threads_master_prefix: owner` gives `owner: image and video` |
| `threads_merges` | `master` | Who merges pull requests. `master`: only the owner recorded on the root. `own`: every chat merges the pull requests it opened, once they can be merged (a workspace with one chat at a time). Releases, publishes and deploys stay with the master either way |

With neither key set, a chat that is not the recorded owner never merges.

## Every chat

- If the user asks a worker to take a shared action anyway, say which chat is the master and
  act only once they confirm. Then record the new owner on the root.
- Each chat works in its own checkout or git worktree. Two chats in one folder overwrite each
  other's uncommitted edits, and each picks up the other's changes in its commits.
- Workspace rules win: where a repository's instructions name a different owner or forbid an
  action, follow them.

This sits alongside work-item locks (the `aaw-progress-work` skill's concurrency reference). A
lock decides who works an activity; the master decides who changes shared environments.
