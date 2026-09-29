# AI-Assisted Work documentation

Start with the quick start, then read the concepts in order. The references are for looking
things up.

## Start here

| Page | Read it when |
|------|--------------|
| [Quick start](quick-start.md) | You want a working install and a first work item in ten minutes |
| [Concepts](concepts/index.md) | You want the ideas behind the skills, in the order you need them |
| [Installing in each agent](integration/index.md) | You use VS Code with GitHub Copilot, Cursor, Claude Code, Codex or Gemini CLI, at workspace or user level |

## The skills

| Skill | Page |
|-------|------|
| `aaw-start-work` | [Start work](skills/aaw-start-work.md) |
| `aaw-progress-work` | [Progress work](skills/aaw-progress-work.md) |
| `aaw-work-status` | [Work status](skills/aaw-work-status.md) |
| `aaw-next-task` | [Next task](skills/aaw-next-task.md) |
| `aaw-start-initiative` | [Start initiative](skills/aaw-start-initiative.md) |
| `thread` | [Thread](skills/thread.md) |

[All skills](skills/index.md) has what they share: arguments, configuration and the
post-install check.

## Reference

| Page | Covers |
|------|--------|
| [Configuration](reference/configuration.md) | Every `.aaw-config.yaml` key, environment variable, `SKILL.md` front matter key and manifest key, with type, default, precedence and an example |
| [Commands](reference/commands.md) | Every `aaw` command and flag, `thread.mjs`, the post-install checks and the repository scripts |
| [Troubleshooting](troubleshooting.md) | The real error and warning messages, and what to do about each |
| [Examples](examples.md) | Where the worked examples and templates are |
| [Skill bundles](integration/skill-bundles.md) | `bundle.json`, post-install checks and the work ontology |
| [Command discovery](integration/command-discovery.md) | How each agent finds and invokes the skills |
| [Protocol](../packages/protocol/README.md) | The contract every backend implements |

## Background

| Page | Covers |
|------|--------|
| [Work management](concepts/work-management.md) | The long-form reference: hierarchy, lifecycle, concurrency, recovery |
| [Work classification](concepts/work-classification.md) | The triage classes and why most work is a chore |
| [Agent boundaries](concepts/agent-boundaries.md), [Scaling limits](concepts/scaling-limits.md) | What agents may do on their own, and how far parallel work goes |
| [Development work](concepts/development-work.md), [Architecture work](concepts/architecture-work.md) | How the method applies to each kind of work |
| [About](about/index.md) | Vision, design decisions (DD-01 onwards), adoption and roadmap |
| [DEPLOYMENT.md](../DEPLOYMENT.md) | Updating, removing and migrating an install |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Building from source, tests, validators and releases |
