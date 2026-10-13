# Agent platforms on the board: compatibility matrix

Which agent platforms can take work from the board (the `thread` skill's `board` commands), and what each needs. The checks are the twelve in [WI-002's scope](../../change/work-items/WI-002-cross-platform-agent-trial/scope.md). The architecture they serve is [agents working together](../architecture/agent-coordination-vision.md).

A row marked tried was graded from the evidence the agents left in the store and on GitHub (`node scripts/board-trial.mjs check`), never from an agent's own report. Every other row is a forecast from the platform's own documentation, linked in its fact sheet, and changes to tried once the platform runs the trial.

## The matrix

Key: ✓ passed in the trial · likely / unlikely / unknown, forecast from the vendor's documentation · – not applicable.

| # | Check | Claude Code (cloud and local) | Cursor cloud agents | OpenAI Codex | Copilot coding agent | Google Jules | Gemini CLI | Devin | OpenHands |
|---|---|---|---|---|---|---|---|---|---|
| | State | **Tried, 13 Oct 2026** | Forecast | Forecast | Forecast | Forecast | Forecast | Forecast | Forecast |
| 1 | Skill found, or `AGENTS.md` leads to it | ✓ | likely | likely | likely | likely | likely, with setup | likely | likely |
| 2 | Node 18+ and git | ✓ | likely | likely | likely | likely | likely | likely | likely |
| 3 | Store cloned and pushed | ✓ (cloud sessions attach the store themselves) | likely | unknown | unknown, leaning unlikely | unknown | likely locally | unknown | likely |
| 4 | One-line pointer is enough | ✓ | likely | likely | likely | likely | likely | likely | likely |
| 5 | Threads | ✓ | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 |
| 6 | Board messages | ✓ (instructions, questions, a standing order mid-run) | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 |
| 7 | Claims hold across platforms | ✓ (real races, nothing taken twice) | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 |
| 8 | Ready posted, never merged | ✓ | likely; watch the base branch | likely; may not know its PR number | likely; cannot merge | likely; Publish PR is a person's click | likely; token without merge rights | unknown; protect the branch | unknown; app token can merge |
| 9 | Woken by `board wait` | ✓ in the cloud (6 wakes, 14 to 79 s round trips) | unlikely; a timer can stand in | unlikely; inbox at turn boundaries | unlikely; 59-minute cap | unlikely | unknown | unlikely; wakes on a message | unlikely |
| 10 | Session-start hook | ✓ (a hook in the tool's own settings) | unlikely in the cloud | unlikely in the cloud; CLI yes | unknown | unlikely | likely | unknown | likely |
| 11 | Handoff across agents | ✓ (a dead agent's task finished from its notes) | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 | likely if 3 |
| 12 | Cost and limits measurable | ✓ (USD 0.80 to 2.20 a session) | roughly | roughly (five-hour windows) | roughly (premium requests) | yes (tasks a day) | yes (API key billing) | roughly (quotas, credits) | yes (model key) |
| | Fact sheet | – | [cursor](platforms/cursor.md) | [codex](platforms/codex.md) | [copilot](platforms/copilot.md) | [jules](platforms/jules.md) | [gemini-cli](platforms/gemini-cli.md) | [devin](platforms/devin.md) | [openhands](platforms/openhands.md) |

## What the forecasts say together

- **Check 3 decides everything after it.** Every platform reaches the store with a token limited to it (`THREADS_REMOTE`), or with its GitHub app on the store too. Use a trial store until a platform has passed, so a misbehaving agent never touches the real tree.
- **Only Claude Code waits.** No other platform documents waking an agent when a background command ends. On those platforms a worker takes one task per session and checks `board inbox` at turn boundaries; the thinker, on Claude Code, is the one that sits in `board wait`. That matches the split between thinker and doers.
- **Several platforms do not know their own pull request number** (Jules and Codex in the cloud open it after the agent stops). The board should accept a branch in `ready` and let the merging role resolve it to a pull request.
- **Merge discipline is only as strong as the token.** Devin's and OpenHands's app tokens can merge. Branch protection on the trial branch, and later an identity per platform without merge rights, make "never merge" a guardrail rather than a request.
- **Prices moved.** Gemini CLI's free tier ended on 18 June 2026, and Devin's old Core plan was retired. The fact sheets carry dated prices; the recommended line-up of subscriptions is kept privately.

## Claude Code, wave 0 in detail

Run on 13 October 2026 in the store's `trial` source, with the workspace on the WI-002 branch. Seven open calls (one fact sheet per platform) were taken by six agents started with nothing but "Go pick up work in trial.": three cloud sessions, three local ones, and one more of each for the handoff and messaging runs.

| Check | Evidence |
|---|---|
| 3 | A fresh cloud session that could not clone the store attached it to itself (`add_repo`) and carried on |
| 7 | `claude-49g` lost Gemini CLI to `claude-ltm` in a race and took Jules; no task was worked twice |
| 6 | A standing order on pull request titles, two instructions and two questions, sent mid-run, were all followed or answered |
| 8 | Seven pull requests opened into the sandbox branch, each posted `ready` to `master:board-trial`; none was merged by its author |
| 9 | Two cloud sessions talking only through the board: question answered in 14 s, instructions done in 36 s and 79 s |
| 11 | Local agent H1 stopped part way through Copilot without releasing; local agent L3 took it next, ahead of fresh work, and finished it from H1's notes |

Thirteen findings, F1 to F13 in [WI-002's progress](../../change/work-items/WI-002-cross-platform-agent-trial/progress.yaml), twelve fixed with tests.
