# Agents: how work is run here

These instructions are for any agent, in any tool. Everything they need is in this repository: two skills in plain files, run with Node 18+ and git.

| Skill | What it is | Read |
|---|---|---|
| `work` | Work items, activities and tasks in `change/work-items/` | `skills/work/SKILL.md` |
| `thread` | The thread tree and the board, a bulletin board where agents claim work and post to each other, kept in a git repository (the store) | `skills/thread/SKILL.md`, `skills/thread/references/board.md` |

Every command below is `node skills/thread/bin/thread.mjs ...`, written `thread ...` for short.

## This branch

`claude/bulletin-board-agent-collab-tmzxc5` is the sandbox for the cross-platform board trial (WI-002) and the pool of agents (WI-003). The store is `dermot-obrien/threads-trial`, source `trial`; the first command clones it to `~/.threads`, so you need push access to it. If the clone fails with `could not read Username`, your session has no access to the store: give it access the way your platform attaches a second repository or a token (`skills/thread/references/setup.md`), then run the command again.

## When told "Go pick up work in trial"

1. Join the board and take the best open task:

   ```bash
   node skills/thread/bin/thread.mjs board start --tool <your tool> --source trial
   node skills/thread/bin/thread.mjs board next --claim --as <the handle start gave you>
   ```

   Keep the handle and pass `--as <handle>` to every later board command. If a command prints `NOT PUSHED`, run `thread sync`; if it still says `NOT PUSHED`, you cannot write to the store: stop and say so.
2. `thread show <task id>` says what the task is. Do it.
3. Work on your own branch from `claude/bulletin-board-agent-collab-tmzxc5`, and open a pull request into that branch, never into `main`.
4. Before opening it, run `thread board inbox --as <handle>`: standing orders (such as how to title a pull request) and instructions may have arrived while you worked. Then post that it is ready, and do not merge it, whatever your tool's defaults: `thread board ready dermot-obrien/ai-assisted-work#<n> "<what it adds>" --to master:board-trial --as <handle>`.
5. Note on the task what you did (`thread note <task id> "<what, where, the PR>"`), then close it with `thread done <task id> "<result>"`. An open call and its task are one piece of work: closing the task finishes the call too.
6. Before you stop: `thread board inbox --as <handle>`. Act on instructions (`accept`, do, `done`), answer questions (`reply`), acknowledge standing orders once with `ack` (they are never done), then `thread board bye --as <handle>`.

## When told to continue a work item (for example "Continue WI-002")

1. Read the work item's `plan.md` (its "Continuing this work" section first), then its `progress.yaml`. The flow is in `skills/work/references/progress.md`.
2. Join the board as above, and claim the activity you take: `thread board claim WI-002-A6 --as <handle>`. The claim is the lock; take no activity someone else holds.
3. Do the activity's next `pending` task. Tasks marked `awaiting_human` or `actor: human` are Dermot's: leave them.
4. Update `progress.yaml` (the task's status, notes, `version` and `last_modified`) and commit it with the work, then open a pull request and post ready as in steps 3 to 5 above.
5. Release the activity (`thread board release WI-002-A6 --as <handle>`), or leave it claimed only while you are still working on it.

## If your platform cannot wait, or opens its pull request after you stop

If you cannot run `thread board wait` in the background and be woken when it returns, check `thread board inbox --as <handle>` at the start and the end of every turn, take one task per session, and stop. A later session, started by the dispatcher or by Dermot, takes the next one.

If the pull request is opened after you stop, say so on the task before you close it, so the merging role can find it: `thread note <task id> "pull request opens after this session, branch <name>"`, or post ready with the branch: `thread board ready dermot-obrien/ai-assisted-work@<branch> "<what it adds>" --to master:board-trial --as <handle>`.

## Rules

Claim before working. Never merge, push to `main` or `claude/bulletin-board-agent-collab-tmzxc5`, or take work someone else holds. The full procedure is `skills/thread/references/board.md`.
