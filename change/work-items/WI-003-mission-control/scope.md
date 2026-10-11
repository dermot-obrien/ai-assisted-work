# WI-003 Mission control: activity, agents and capacity in one place, with a warden that never sleeps

## Summary

A mission control for the board: one view for a daily or weekly review of everything the agents did, which agents are alive, and how much of each platform's allowance was used; a capacity ledger that knows every plan's daily, weekly and rolling windows; a dispatcher that moves work to whichever platform still has capacity; and a warden, always on and needing no agent platform, that notices when an agent has died, takes its work back, notes why, and offers it to another.

Status: scoped, not yet planned. Builds on thread 0.14.0 (DD-13 to DD-16) and on WI-002, which finds out how each platform can be started and what it reports. Guardrails for a swarm of agents are scoped separately (patternode-architecture, `change/planning/agent-guardrails-consolidation.md`); this work provides their enforcement points on the board.

## Intent

From the user, 11 October 2026: "a mission control interface where I can do my weekly review or even a daily review and see all the activity that's going on, all of the agents I'm using, and all of the consumption, in one place"; "use 100% of the capacity every day, including resets throughout the day, and 100% of my weekly capacity every week, across all of the agent systems I subscribe to"; "if an agent runs out of capacity … it'll just die, so maybe there is a still-alive check that is always on, that if it finds an agent has died it takes the work and assigns it to someone else, and puts that as a note, so we have full resilience"; "there's the potential for a swarm here, which is why I need mission control to keep an eye on what they're doing and have appropriate guardrails in place".

## What exists, and what is missing

| Already on the board | Missing |
|---|---|
| Presence with a lease, renewed by `renew` and `wait` | A heartbeat cheap enough to send every few minutes, and a timeout per platform |
| Claims expire, so a dead agent's work frees itself eventually | Taking work back as soon as an agent is known dead, with a note on its thread saying why and what was last done |
| `tidy` lists work held by agents no longer on the board | Acting on it without a curator having to run |
| `status`, `who`, `sent`, merge queues | A review over a day or a week; consumption against allowance; utilisation per platform |
| `next --list` for a dispatcher | Knowing which platforms have capacity now, and starting agents there |

## Components

### 1. Capacity ledger

A file in the store, `board/platforms.json` (one per source path if needed), describing each subscribed platform: plan, how many agents may run at once, and its windows (a rolling window such as five hours, a daily reset at a time and time zone, a weekly reset, a monthly credit pool, pay-as-you-go caps). Prices and plans stay out of the public repository; this file is the user's.

Agents add to it as they work, through two new board events:

| Event | Written by | Carries |
|---|---|---|
| `usage` | An agent after each task, and when it stops | Platform, tasks finished, and units where the platform shows them (messages, tokens, credits, compute units) |
| `limit` | An agent that sees a limit message before it stops, the warden when it infers one, or the user from the phone | Platform, which window, and when it resets |

Most platforms publish no usage API, so the ledger is an estimate built from self-reports, limit hits and deaths. That is stated in the view, never hidden. WI-002 records for each platform what it shows and where.

### 2. The warden: liveness without an agent

A deterministic job, no model involved, so it costs nothing and cannot run out of quota. Recommended home: a scheduled GitHub Actions workflow in the store repository, every ten minutes, running `node thread.mjs board warden`. It:

1. Reads heartbeats: a new lightweight `beat` (or any board write) from each agent; the expected interval per platform comes from the ledger.
2. Marks an agent dead when its beat is overdue by the platform's timeout, or its presence has lapsed.
3. For each claim the dead agent held: releases it, notes on the thread "released from claude-k3x: no heartbeat since 10:42; last note: …", and reposts it as an open call in the same path.
4. When several agents on one platform die inside one window, records a `limit` for that platform until its next reset, so the dispatcher stops starting agents there.
5. Writes a line to the review log, so the daily review shows every rescue.

### 3. The dispatcher: using all the capacity

A role (`dispatcher:<path>`) held by the thinking platform, or a scheduled job where a platform can be started from a script. On each tick it compares work waiting (`next --list`) with capacity left (the ledger), and starts agents on the platforms with the most unused capacity in their current window, first those whose window resets soonest, so nothing expires unused. At each platform's reset it starts the agents again. It never starts more than the standing orders allow.

How a platform can be started is the open question WI-002 answers: a cloud session with a prompt (Claude Code), an issue assigned through the API (Copilot's coding agent, which a workflow can do), a task from a CLI or API where one exists (Codex, Jules, Devin, Cursor). A platform that can only be started by hand gets a phone notification instead: "Cursor has capacity; 6 tasks waiting in patternode."

### 4. The review

`thread board review [--since 1d | 7d] [--source <path>]` and its JSON, for the daily and weekly review:

- Activity: threads opened and closed, tasks done, pull requests merged, by path, agent and platform
- Agents: who ran, for how long, who died and what the warden rescued
- Consumption: per platform, used against allowance per window, and capacity that expired unused
- Waiting on the user: approvals, questions, merge queues, instructions not picked up
- Guardrail events: refusals, halts, caps reached

The same JSON feeds a phone-friendly page: a static page rebuilt by the warden workflow at first, and later a screen in the user's own chat app if it adopts one.

### 5. Controls for a swarm (the board's enforcement points)

| Control | On the board |
|---|---|
| A cap on agents running at once, per path and per platform | A standing order the dispatcher and `start` respect |
| A spending cap on pay-as-you-go platforms and model keys | The dispatcher refuses to start an agent once the ledger says the cap is reached |
| A halt | `board halt [--source <path>]`: a standing order every agent sees at its next inbox check, after which it stops and releases its claims; `board resume` lifts it |
| No merge outside the merging role | Already the board's rule; made a real guardrail only by server-side protection (the guardrails scope) |

## Decisions for the user

1. **Where the warden runs.** Recommendation: GitHub Actions in the store repository, which is free at this volume and independent of every agent platform.
2. **Heartbeat interval.** Recommendation: a beat at least every 15 minutes while working; dead after 45 minutes without one, longer for platforms that pause.
3. **Where the ledger and review live.** Recommendation: the ledger in the private store; the review as JSON plus a static page now, and a chat app screen later.
4. **Caps.** The first standing orders: agents at once per path, and a monthly spend cap for pay-as-you-go platforms.

## Activities (starting point for planning)

| Activity | Product | Depends on |
|---|---|---|
| A1 `beat`, `usage` and `limit` events; `board/platforms.json` format | Board events and file format, with tests | |
| A2 The warden: dead-agent detection, rescue with notes, inferred limits | `board warden` with tests; the Actions workflow | A1 |
| A3 Halt, resume and caps as standing orders the board respects | Commands with tests | |
| A4 The review: `board review` and its JSON | Command with tests | A1 |
| A5 The review page | Static page built by the warden workflow | A2, A4 |
| A6 The dispatcher: capacity-aware choice and start at reset | Dispatcher procedure and script | A1; WI-002 results |
| A7 Platform starters: one per platform that can be started from a script | Starters, documented | WI-002 |
| A8 Docs: mission control in `references/board.md`, a design decision | Docs, DD-17 | A2 to A6 |
