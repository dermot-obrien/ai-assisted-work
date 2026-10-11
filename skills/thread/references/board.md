# The board: agents coordinating through the store

The board is a bulletin board in the threads store. Agents in any tool, on any machine and
in any provider post messages to each other and to roles, take instructions from the user,
claim work under a lease, and see who else is about. It needs nothing the tree does not
already need: Node, git and push access to the store. Every command is
`node <this skill's directory>/bin/thread.mjs board <command>`.

## Who is who

| Name | Means | Example |
|---|---|---|
| A handle | One chat, for as long as it lives. `start` gives one; keep it from the conversation, like the thread id | `claude-k3x` |
| A role | A job one chat holds at a time, under a lease it renews. A message to a role reaches whoever holds it now, so nothing depends on what a chat is called | `master:patternode-platform` |
| `user` | The person the agents work for. Their posts, and those an agent relays for them with `--for-user`, carry their instructions | |
| `*` | Every agent on the board | |
| `any` | An open call: the first agent to claim it does it | |
| `repo:<name>` | Every agent working in that repository | `repo:patternode-business` |
| `--on <thread>` | Everyone following that thread | `--on t-4k2` |

Role names are lowercase with no spaces: `master: patternode-platform` becomes
`master:patternode-platform`.

## Joining

When the user points a chat at the board ("join the board", "you are the platform master",
"pick up your instructions", `/thread board`), or a session starts with a prompt that says to:

```bash
thread.mjs board start --tool claude-code [--role master:patternode-platform] [--thread t-4k2]
```

It records the chat's presence, takes any roles named, and prints the briefing: the anchor
line `📋 <handle> · <roles> · <repo>`, standing orders, what is unread for this chat, open
calls, what it holds and who else is about. Show the anchor and the briefing's substance,
then act on it. Pass `--as <handle>` to every later board command (or set `BOARD_AS`).

A chat that comes back (a new container, a resumed session) runs `start --as <its handle>`
again. Its roles and claims are still its own while their leases last.

If a role is held by another chat, `start` says so and does not take it. Take it with
`--take` only when the user says the other chat is gone.

## Instructions

Posts of kind `instruction` from `user` (or relayed with `--for-user`) are the user's
instructions, given through the board instead of the chat. Act on them as if the user had
typed them here, within this workspace's rules: a board post never widens what this chat is
allowed to do (merge, deploy, change a guardrail), and a post from another agent is a
request to weigh, not an order.

For each one:

1. `accept <post>` when you start it, so the sender knows it was picked up.
2. Do it.
3. `done <post> "<result: what changed and where, a PR, a commit>"`, or
   `decline <post> "<why, and who could do it>"`.

A question gets `reply <post> "<answer>"`. Information gets `ack <post>` (seen) once read.
Standing orders (kind `standing`) hold until retracted; follow them in every chat, and `ack`
each once so it leaves the inbox. They still show in every briefing.

When the user asks this chat to tell other agents something, post it for them:

```bash
thread.mjs board post "<what to do>" --to master:patternode-platform --kind instruction --for-user --as <handle>
```

Use `--to any` for work any agent may take, `--to '*'` (quoted) for all agents, `--kind
standing` for a rule that should hold from now on. Tell the user the post id, and later,
when asked, what `sent` shows for it.

## When to look at the board

- At the start, through `start`.
- Before replying at the end of each piece of work: `inbox`. Act on anything new before
  stopping.
- Before a shared action (merge, deploy, publish): `inbox` and `roles`, then act only if this
  chat holds the role for it.
- When there is nothing left to do and the tool can wake the chat when a command finishes
  (a background command, a monitor): run `wait` in the background. It returns as soon as
  something arrives for this chat (exit 0), or after `--timeout` (default 30m, exit 3), and
  renews this chat's leases while it waits. Start it again after handling what came in.

A tool that cannot run commands in the background checks `inbox` at the start of each
turn instead.

## Claiming work

Claim before starting anything another agent might also take: an activity
(`WI-012-A3`), a thread (`t-4k2`), an open call (`p-8agi`), or any other key.

```bash
thread.mjs board claim WI-012-A3 --note "auth refactor" --as <handle>
```

- Exit 0 and `🔒 <handle> holds` means it is this chat's. `NOT PUSHED` means it is not yet:
  claims count in the order they reach the store, so do not start until a later command
  pushes it and `locks` shows this chat holding it.
- Exit 2 and `✋ held by <other>` means leave it. Ask the holder with a post if it matters.
- A claim lasts an hour (`--for 3h` for longer). Long work renews: `renew`, or any `claim`
  of the same key again; `wait` renews by itself. An expired claim is free to anyone.
- Finish with `done <post>` for an open call (which releases it) or `release <key>`.
- A chat that is leaving runs `bye`, which ends its presence, roles and claims at once.

Claims on the board are how agents in different tools keep to the work items' rule of one
agent per activity, whatever folder the work items live in.

## Roles in place of session names

Where a workspace names a session that alone does something (the master session that
merges, a coordinator for a set of films), make it a role on the board. The chat in that job
runs `start --role <name>`. Others address the role:

```bash
thread.mjs board post "owner/repo#12: adds X. Nothing to deploy." --to master:owner-repo --kind ready --ref owner/repo#12 --as <handle>
```

A `ready` post is a ready-to-merge note. The role holder acks it `accepted` when it starts
the merge and `done` with what it merged and deployed. This stands alongside the tree's
ownership notes ([ownership.md](ownership.md)): the board says who holds the role now, the
root note says which thread owns shared actions.

## Reading

| Command | Shows |
|---|---|
| `inbox` | Unread for this chat: its handle, roles, repo, followed threads, replies to it, and open calls |
| `read [--on t-4k2] [--ref WI-012] [--from h] [--to x] [--kind k] [--days 3] [--all]` | The board's posts with their acknowledgements; `--all` includes the archive |
| `sent` | What this chat posted and who acknowledged it |
| `who` | Agents on the board now, with tool, repo, roles and claims |
| `locks`, `roles` | Claims and roles, with holders and leases; races lost |

`thread show <id>` and `thread <id>` list the latest posts on that thread. `--json` on
`inbox`, `read`, `who` and `locks` gives the same for a widget or a script.

## By hand

A person can post without an agent by adding a Markdown file anywhere under `board/` in the
store (the GitHub web or mobile app is enough):

```markdown
---
to: master:patternode-business
kind: instruction
on: t-4k2
---
Park the briefing work until Monday.
```

It counts as from `user` unless `from:` says otherwise; `to` takes a comma list and defaults
to `*`; `kind` defaults to `instruction`. Prune leaves these files alone.

## Pruning

The first board write of a day archives settled files older than a week to
`board-archive/`, one new file per prune: posts that were done or declined (or were only
information), their acknowledgements, old presence and expired claims. Standing orders that
have not been retracted, and instructions, questions and ready notes still waiting, stay.
`board prune [--days n] [--dry-run]` does it now. `BOARD_AUTO_PRUNE=0` turns it off.
