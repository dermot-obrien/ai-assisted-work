# Agents: work comes from the board

This branch (`trial/base`) is the sandbox for the cross-platform board trial (WI-002). Work here is handed out on a bulletin board in a git repository, the threads store, and every agent, whatever tool it runs in, takes it from there.

If you were told "Go pick up work in trial" (or anything like it), do this:

1. Join the board and take the best open task. You need Node 18+ and git, and push access to `dermot-obrien/threads` (the store; the first command clones it to `~/.threads`):

   ```bash
   node .claude/skills/thread/bin/thread.mjs board start --tool <your tool> --source trial
   node .claude/skills/thread/bin/thread.mjs board next --claim --as <the handle start gave you>
   ```

   Keep the handle and pass `--as <handle>` to every later board command. If a command prints `NOT PUSHED`, you cannot write to the store: stop and say so.
2. `node .claude/skills/thread/bin/thread.mjs show <task id>` says what the task is. Do it.
3. Work on your own branch from `trial/base`. Open a pull request into `trial/base` (never into `main`).
4. Post that it is ready, and do not merge it, whatever your tool's defaults: `thread.mjs board ready dermot-obrien/ai-assisted-work#<n> "<what it adds>" --to master:board-trial --as <handle>`.
5. Note on the task what you did (`thread.mjs note <task id> "<what, where, the PR>"`), then close it: `thread.mjs board done <task id> "<result>" --as <handle>` if it was an open call, else `thread.mjs done <task id> "<result>"`.
6. Before you stop: `thread.mjs board inbox --as <handle>`. Act on instructions (`accept`, do, `done`), answer questions (`reply`), then `bye`.

Rules: claim before working; never merge, push to `main` or `trial/base`, or take a task someone else holds. The full procedure is `.claude/skills/thread/references/board.md`.
