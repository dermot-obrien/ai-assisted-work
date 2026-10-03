# Sources

One store can hold several sources: separate trees for separate segments of work, such as an
employer's work, a business and a personal project. The default source is the store's root;
a named one lives under `sources/<name>/` in the same store. A workspace picks its source with
`threads_source: <name>` in `.aaw-config.yaml`, or `$THREAD_SOURCE` (per repository in
`.claude/settings.json` `"env"`); `--source <name>` overrides both for one command. Without
any of them nothing changes: the default source is used.

**The default source is the rule; a named source is the exception.** Every workspace uses the
default source unless the user has decided that a segment of work belongs in its own source.
Don't propose a new source for an ordinary project: group it with `/thread project` instead.
Set `threads_source:` only in the workspaces of a segment the user has named.

- Every command reads and writes the workspace's source only. `status`, `tree` and `list` start
  with `source: <name>` once the store has more than one, and `status` ends with a count of
  the open trees in the others. Relay those lines.
- `--source all` on `status`, `tree` or `list` shows every source in turn; with `--json` each
  root or row carries its `source`.
- Ids are unique across the store, and a command naming an id that lives in another source
  runs there and says so on stderr. An anchor line therefore keeps working after its tree
  moves, from any workspace.
- `transfer <id> --to <source>` moves a thread and everything under it, archived branches
  included, keeping ids and history. Ask before running it, naming the tree. A machine that
  writes to the old source before it sees the transfer has its event forwarded on the next
  command.
- A named source starts with its first write, which prints one line saying so. If that was
  not intended (a typo in the name), tell the user.

## Moving a workspace's threads to a new source

1. Agree with the user which trees belong to the segment. Check every root whose `ctx` is one
   of the segment's repositories, and the branches under shared roots.
2. `transfer <id> --to <source>` for each root of the segment. It creates the source if it is
   new. Branches move with their root; a branch moved on its own becomes a root there.
3. Set `threads_source: <source>` in each of the segment's workspaces (`.aaw-config.yaml`,
   committed, so cloud sessions get it too).
4. `tree --source <source>` to check, and `tree` in the old source to see they are gone.

The decision behind sources is DD-12 in AI-Assisted Work's design decisions.
