# Many chats, one tree: one owner for shared actions

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

This sits alongside work-item locks (the `aaw-progress-work` skill's concurrency reference). A lock
decides who works an activity; the tree's owner decides who changes shared environments.
