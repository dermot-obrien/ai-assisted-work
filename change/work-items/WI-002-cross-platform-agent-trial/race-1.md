# Race 1: the same kind of task on every platform at once

WI-002 A5. Five agents, one per platform, start within a minute of each other on six open calls of the same size. Each call is one missing test for one `thread board` command. A reviewer on its own platform scores every pull request against the rubric below without knowing which platform wrote it, and `node scripts/board-trial.mjs race <thread>` reports the result from the store.

## What it measures

| Measure | From |
|---|---|
| Speed: minutes from claim to ready, and to done | Board records (claim, ready post) and the tree (close) |
| Quality: the reviewer's score out of 5 | The reviewer's post, `--ref` the pull request, text starting `review <n>/5` |
| Discipline: checks 5 to 8 of the trial | `board-trial.mjs check` |
| Coordination: six calls, five agents, nothing taken twice | Claims in store order |

Speed alone would reward the agent that skips the test run, so a fast pull request that fails the rubric loses to a slower one that passes it.

## The tasks

Each is an open call under the race thread. The worked example is `scripts/board-tests/retract.test.mjs`: one file, the shared fixture, one behaviour per test.

| Command | The behaviour to pin |
|---|---|
| `decline` | Declining an open call you took releases it, so another agent can claim it; a decline with no reason is refused |
| `release` | Releasing another agent's claim fails without `--take`; with `--take` the key is free and `locks` says who took it |
| `renew` | `renew` extends a lease due within 20 minutes; with nothing due it says so |
| `bye` | After `bye` the agent's claims and roles are free and `who` no longer lists it |
| `sent` | `sent` shows a post as not yet acknowledged, then the recipient's outcome once it is done |
| `role` | Taking a role someone holds exits 2 and names the holder; `roles` lists it; `--release` frees it |

The rules for every task, as each call says:

1. Add one file, `scripts/board-tests/<command>.test.mjs`, in the style of `retract.test.mjs`. Touch nothing else.
2. If a test shows the command is wrong, fix `skills/thread/bin/board.mjs` too, and say why in the pull request.
3. Run `node --test scripts/board-tests/*.test.mjs scripts/test-board.mjs`. Both pass before ready.
4. Open the pull request into `claude/bulletin-board-agent-collab-tmzxc5`, post ready to `master:board-trial`, note and close the task. Never merge.

## The rubric

One point each, scored by `reviewer:trial`:

1. **Guards the behaviour.** With the line the test is about removed or changed in `board.mjs`, the test fails. The reviewer checks this by changing the line and running it.
2. **Passes.** The whole suite (`npm test`) passes on the pull request's head.
3. **In scope.** Only the new test file, plus a fix to `board.mjs` that a failing test justified.
4. **Process.** Right base branch, ready posted, task noted and closed, not merged by its author.
5. **Readable.** Test names say the behaviour; the file reads like `retract.test.mjs`.

The reviewer posts one line per pull request:

```bash
node skills/thread/bin/thread.mjs board post "review 4/5: lost 1 (passes even with the release removed)" \
  --ref dermot-obrien/ai-assisted-work#90 --to master:board-trial --kind info --as <reviewer handle>
```

## How it starts

The race thread and its six calls are posted in the `trial` source. Then, within a minute:

| Platform | Started by | Prompt |
|---|---|---|
| Claude Code (cloud) | `master:board-trial`, with `create_session` | The pointer line below |
| Copilot | `master:board-trial`, through the GitHub MCP (`base_ref` the sandbox branch) | The pointer line below |
| Cursor | Dermot, in the Cursor web app, branch `claude/bulletin-board-agent-collab-tmzxc5` | The pointer line below |
| Codex | Dermot, in ChatGPT Codex | The pointer line below |
| Jules | Dermot, in Jules | The pointer line below |

The pointer line, the same for every platform:

> Go pick up work in trial. Work from branch claude/bulletin-board-agent-collab-tmzxc5 and open your pull request into it. Take one task only.

The reviewer is a Claude Code cloud session holding `reviewer:trial`, started at the same time. It waits on the merge queue, reviews each pull request as it becomes ready, and never merges. `master:board-trial` merges in queue order after the reviews.
