# AI Assisted Work

[![Version](https://img.shields.io/badge/version-3.2.0-blue.svg)](CHANGELOG.md)
[![Licence: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-blue.svg)](LICENSES/CC-BY-4.0.txt)
[![Licence: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSES/Apache-2.0.txt)
[![REUSE 3.3](https://img.shields.io/badge/REUSE-3.3-lightgrey.svg)](https://reuse.software/spec-3.3/)

AI-Assisted Work (AAW) is a set of [Agent Skills](https://agentskills.io) that lets any
coding or chat agent manage real work: triage a request, plan it from the products it will
leave behind, execute it across several agents without conflict, and pick up after an
interruption. Work is held in plain files (`progress.yaml`, lock files) in a folder you
choose, so every agent and person reads the same state. It is domain-agnostic, and not tied
to any one agile method.

Inspired by the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD), which is the
better choice if you want to align specifically to agile methods.

## Install

You need Node.js 18 or newer and git. No npm registry access is needed.

In the workspace (the folder or repository you open in your agent):

```
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/aaw.js install
```

or, as an npm git dependency: `npm i github:dermot-obrien/ai-assisted-work`, then
`npx aaw install`.

The installer writes `.aaw-config.yaml`, creates the work items folder, and places the skills
where your agent reads them:

| Agent | Workspace-level | User-level (every workspace) |
|-------|-----------------|------------------------------|
| VS Code with GitHub Copilot | `.agents/skills/` | `~/.copilot/skills/` |
| Cursor | `.agents/skills/` | `~/.cursor/skills/` |
| Claude Code | `.claude/skills/`, linked at `.agents/skills/` when `.claude/` exists | `~/.claude/skills/` |
| OpenAI Codex | `.agents/skills/` | `~/.agents/skills/` |
| Gemini CLI | `.agents/skills/` | `~/.gemini/skills/` |

`aaw install` does the workspace level. For the user level, copy the skill folders from the
clone; [Installing in each agent](docs/integration/index.md) has the commands for PowerShell
and bash, and covers hooks, CI and one clone serving many workspaces.

## Quick start

```
mkdir aaw-demo
cd aaw-demo
git init
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/aaw.js install --yes --tenant demo --work-items-path ./work-items
node .ai-assisted-work/bin/aaw.js verify
```

Then open `aaw-demo` in your agent, start a new chat and type:

```
/aaw-start-work write a one-page guide to our release process
```

The [quick start](docs/quick-start.md) goes further in about ten minutes: a small work item
you can list, lint, claim and hand to your agent, and a first thread.

## Skills

| Skill | Does |
|-------|------|
| [`/aaw-start-work`](docs/skills/aaw-start-work.md) | Triages a request; for work that earns it, scopes and plans a work item from the products it will leave behind |
| [`/aaw-progress-work`](docs/skills/aaw-progress-work.md) | Executes a planned work item, claiming one activity at a time under a lock, and recovers after an interruption |
| [`/aaw-work-status`](docs/skills/aaw-work-status.md) | Reports progress, product states, locks, parallel opportunities and stale work |
| [`/aaw-next-task`](docs/skills/aaw-next-task.md) | Presents the next task with its context, without doing it |
| [`/aaw-start-initiative`](docs/skills/aaw-start-initiative.md) | Groups work items under one goal, with an optional OKR layer |
| [`/thread`](docs/skills/thread.md) | Keeps a tree of why each chat exists, in a git repository you own, across machines and agents. Independent of the rest |

The hierarchy is initiative, work item, activity, task. A work item is either a
`workstream` (a durable subject that may never end) or an `epic` (a slice that lands within
one planning period, three months at most). An agile team can read epic, story and task.
Planning is product-based, after PRINCE2: every activity names the product it advances.

Three skills that began here now live in their own repositories, so they install without
this framework. Each repository's `NOTICE` records the commit here it was taken from:

| Skill | Repository | Does |
|-------|------------|------|
| `markdown-deck` | [markdown-deck](https://github.com/dermot-obrien/markdown-deck) | Renders tagged sections of a Markdown document into HTML slides and a PDF, keeping the Markdown as the only source |
| `model` | [diagram-model](https://github.com/dermot-obrien/diagram-model) | Treats a diagram and a document as two views of one model of boxes and lines: extract, emit, validate one against the other, render |
| `quarter-planning` | [delivery-planning](https://github.com/dermot-obrien/delivery-planning) | Plans the delivery of technology work by quarter. It reads this framework's work items where a workspace binds `workItemsDir`, and needs nothing else from it |

AAW is also the base that [AI-Assisted Architecture](https://github.com/dermot-obrien/ai-assisted-architecture)
and [AI-Assisted Research](https://github.com/dermot-obrien/ai-assisted-research) install
through.

## Documentation

| Page | Covers |
|------|--------|
| [Quick start](docs/quick-start.md) | From nothing to a first work item in ten minutes, tested in PowerShell and bash |
| [Concepts](docs/concepts/index.md) | The ideas, in the order you need them |
| [Installing in each agent](docs/integration/index.md) | Workspace and user-level installs, hooks, CI, customising |
| [Skills](docs/skills/index.md) | A page per skill |
| [Configuration](docs/reference/configuration.md) | Every `.aaw-config.yaml` key, environment variable and manifest key |
| [Commands](docs/reference/commands.md) | Every `aaw` command and flag, `thread.mjs`, the checks and the repository scripts |
| [Troubleshooting](docs/troubleshooting.md) | Keyed to the messages the tools print |
| [Examples](docs/examples.md) | Worked examples and templates |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Updating, removing and migrating an install |
| [All documentation](docs/index.md) | Including background, design decisions and the roadmap |

## Conformance

Every skill follows the [Agent Skills specification](https://agentskills.io/specification):
a `SKILL.md` whose `name` equals its folder, a `description` of at most 1,024 characters,
and a body under 500 lines and about 5,000 tokens, with longer procedure in `references/`.
CI checks each one with the specification's reference validator, `skills-ref`, and with
`scripts/validate-skills.mjs`, which also checks links. [CONTRIBUTING.md](CONTRIBUTING.md)
shows how to run both locally.

## Customisation

Fork this repository to customise it for your organisation. See
[Installing in each agent](docs/integration/index.md#customising) and
[Organisation adoption](docs/about/organization-adoption.md).

## Contributing

Contributions welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers building from source, the
checks CI runs, and versioning.

## Licence

This framework is permissively licensed to encourage the widest possible adoption: private, public, academic and commercial. Attribution is the primary expectation.

- **Documentation, skill definitions, templates, examples** ([`CC BY 4.0`](LICENSES/CC-BY-4.0.txt)): use, share, modify and redistribute, including commercially, with attribution.
- **Executable code** (`packages/`, `bin/`, `scripts/`, the scripts inside `skills/*/bin/`) ([`Apache-2.0`](LICENSES/Apache-2.0.txt)): the same permissions, with an explicit patent grant.

Per-file licensing is declared via SPDX identifiers and the [`REUSE.toml`](REUSE.toml) manifest, following the [REUSE Specification 3.3](https://reuse.software/spec-3.3/). See [`LICENSE`](LICENSE) for the full overview.

### Trademark

"AI-Assisted Work" and any associated logos are trademarks of Dermot O'Brien. The licences above grant rights to the **content and code** only; they do not grant rights to use these marks. Nominative use ("based on AI-Assisted Work") is welcome; please use a different name for forks or derivative offerings.

## Attribution

Created by **Dermot O'Brien** ([@dermot-obrien](https://github.com/dermot-obrien)).

If you use AI-Assisted Work, attribution is appreciated:

> Built with [AI-Assisted Work](https://github.com/dermot-obrien/ai-assisted-work) by Dermot O'Brien

---

*AI-Assisted Work - Domain-agnostic AI agents for productivity*.
