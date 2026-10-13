# AI-Assisted Work documentation

Start with the quick start, then read the concepts in order. The references are for looking
things up.

## Start here

| Page | Read it when |
|------|--------------|
| [Quick start](quick-start.md) | You want a working install and a first work item in ten minutes |
| [Concepts](concepts/index.md) | You want the ideas behind the skills, in the order you need them |
| [Installing the skills](../DEPLOYMENT.md) | You want to install, declare, update or remove skills with `bin/skills.mjs` |
| [Installing in each agent](integration/index.md) | You use VS Code with GitHub Copilot, Cursor, Claude Code, Codex or Gemini CLI, at workspace or user level |

## The skills

| Skill | Page |
|-------|------|
| `/work start` | [Start work](skills/work.md#start-work-start) |
| `/work progress` | [Progress work](skills/work.md#progress-work-progress) |
| `/work status` | [Work status](skills/work.md#status-work-status) |
| `/work next` | [Next task](skills/work.md#next-work-next) |
| `/work initiative` | [Start initiative](skills/work.md#initiative-work-initiative) |
| `thread` | [Thread](skills/thread.md) |

[All skills](skills/index.md) has what they share: arguments, configuration and the
post-install check.

## Reference

| Page | Covers |
|------|--------|
| [Configuration](reference/configuration.md) | Every `.aaw-config.yaml` key, environment variable and `SKILL.md` front matter key, with type, default, precedence and an example |
| [Commands](reference/commands.md) | `skills.mjs`, `thread.mjs`, the post-install checks and the repository scripts |
| [Troubleshooting](troubleshooting.md) | The real error and warning messages, and what to do about each |
| [Examples](examples.md) | Where the worked examples and templates are |
| [Skill bundles](integration/skill-bundles.md) | `bundle.json`, post-install checks and the work ontology |
| [Command discovery](integration/command-discovery.md) | How each agent finds and invokes the skills |
| [Agent platforms](integration/agent-platforms.md) | Which agent platforms can take work from the board, what each needs, and the trial results |

## Background

| Page | Covers |
|------|--------|
| [Work management](concepts/work-management.md) | The long-form reference: hierarchy, lifecycle, concurrency, recovery |
| [Work classification](concepts/work-classification.md) | The triage classes and why most work is a chore |
| [Agent boundaries](concepts/agent-boundaries.md), [Scaling limits](concepts/scaling-limits.md) | What agents may do on their own, and how far parallel work goes |
| [Development work](concepts/development-work.md), [Architecture work](concepts/architecture-work.md) | How the method applies to each kind of work |
| [Agents working together](architecture/agent-coordination-vision.md) | The vision: many agents on many platforms working the same plans, the board, mission control and guardrails |
| [About](about/index.md) | Vision, design decisions (DD-01 onwards), adoption and roadmap |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Tests, validators and versioning |
