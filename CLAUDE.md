# Agents: work comes from the board

This branch (`claude/bulletin-board-agent-collab-tmzxc5`) is the sandbox for the cross-platform board trial (WI-002). Work here is handed out on a bulletin board in a git repository, the threads store, and every agent, whatever tool it runs in, takes it from there.

If you were told "Go pick up work in trial" (or anything like it), do this:

1. Join the board and take the best open task. You need Node 18+ and git, and push access to `dermot-obrien/threads-trial` (the trial store; the first command clones it to `~/.threads`):

   ```bash
   node .claude/skills/thread/bin/thread.mjs board start --tool <your tool> --source trial
   node .claude/skills/thread/bin/thread.mjs board next --claim --as <the handle start gave you>
   ```

   If `board start` cannot clone the store (`could not read Username`), attach `dermot-obrien/threads-trial` to your session (in Claude Code on the web, the `add_repo` tool) and run it again.

   Keep the handle and pass `--as <handle>` to every later board command. If a command prints `NOT PUSHED`, run `node .claude/skills/thread/bin/thread.mjs sync`; if that still says `NOT PUSHED`, you cannot write to the store: stop and say so.
2. `node .claude/skills/thread/bin/thread.mjs show <task id>` says what the task is. Do it.
3. Work on your own branch from `claude/bulletin-board-agent-collab-tmzxc5`. Open a pull request into `claude/bulletin-board-agent-collab-tmzxc5` (never into `main`).
4. Before opening it, run `thread.mjs board inbox --as <handle>`: standing orders (such as how to title a pull request) and instructions may have arrived while you worked. Then post that it is ready, and do not merge it, whatever your tool's defaults: `thread.mjs board ready dermot-obrien/ai-assisted-work#<n> "<what it adds>" --to master:board-trial --as <handle>`.
5. Note on the task what you did (`thread.mjs note <task id> "<what, where, the PR>"`), then close it with `thread.mjs done <task id> "<result>"`. An open call and its task are one piece of work: closing the task finishes the call too.
6. Before you stop: `thread.mjs board inbox --as <handle>`. Act on instructions (`accept`, do, `done`), answer questions (`reply`), acknowledge standing orders once with `ack` (they are never done), then `bye`.

## If your platform cannot wait or names its pull request late

When your platform cannot run `board wait` in the background, check the inbox at the start and at the end of every turn, and take one task per session:

```bash
node .claude/skills/thread/bin/thread.mjs board inbox --as <handle>
```

Act on what is there (accept an instruction, do it, `done` it; `reply` to a question; `ack` a standing order once), then stop. Do not claim another task in the same session. A later session, started by the dispatcher or by Dermot, takes the next one.

If the pull request is opened after you stop, say so in the task's note with the branch name before you close the task, so the merging role can find it:

```bash
node .claude/skills/thread/bin/thread.mjs note <task id> "pull request opens after this session, branch <name>"
```

Rules: claim before working; never merge, push to `main` or `claude/bulletin-board-agent-collab-tmzxc5`, or take a task someone else holds. The full procedure is `.claude/skills/thread/references/board.md`.
