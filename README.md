# AI Assisted Work

[![Version](https://img.shields.io/badge/version-6.0.0-blue.svg)](CHANGELOG.md)
[![Licence: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-blue.svg)](LICENSES/CC-BY-4.0.txt)
[![Licence: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSES/Apache-2.0.txt)
[![REUSE 3.3](https://img.shields.io/badge/REUSE-3.3-lightgrey.svg)](https://reuse.software/spec-3.3/)

AI-Assisted Work is one standalone [Agent Skill](https://agentskills.io), `work`, and a zero-dependency installer for standalone skills, [`bin/skills.mjs`](bin/skills.mjs). The skill installs on its own, depends on no other, and works in any agent that reads the format, including in a constrained environment with no npm registry and no access to personal repositories. [`bundle.json`](bundle.json) lists it. The `thread` skill moved to its own repository on 13 October 2026.

Until version 4.0.0 this repository was a framework: an `aaw` command, an install engine that other frameworks installed through, and packages. That is gone in 5.0.0. A workspace that still needs `aaw install` pins the [`v4.0.0`](https://github.com/dermot-obrien/ai-assisted-work/tree/v4.0.0) tag.

## The skill

| Skill | Version | Does |
|-------|---------|------|
| [`work`](docs/skills/work.md) | 3.2.0 | Work items, activities, tasks and initiatives in plain files: [`/work start`](docs/skills/work.md#start-work-start) triages and plans, [`/work progress`](docs/skills/work.md#progress-work-progress) executes under a lock, [`/work status`](docs/skills/work.md#status-work-status), [`/work next`](docs/skills/work.md#next-work-next), [`/work initiative`](docs/skills/work.md#initiative-work-initiative), [`/work dispatch`](docs/skills/work.md#dispatch-work-dispatch) runs a plan with parallel agents through branches and pull requests ([playbook](docs/playbooks/github-parallel-delivery.md)) |

Skills that were first published here live in repositories of their own and are not listed in `bundle.json`: `markdown-deck` ([markdown-deck](https://github.com/dermot-obrien/markdown-deck)), `model` ([diagram-model](https://github.com/dermot-obrien/diagram-model)), `pattern`, `use-case` and `cross-reference` ([architecture-pattern](https://github.com/dermot-obrien/architecture-pattern)) and `quarter-planning` ([delivery-planning](https://github.com/dermot-obrien/delivery-planning)). A workspace declares them by repository, as below.

## Install

Node.js 18 or newer, and git for skills from other repositories. Nothing else, and no npm registry.

```
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/skills.mjs list                  # the skills, ● for those installed here
node .ai-assisted-work/bin/skills.mjs install work          # the ones you want, or none named for all
node .ai-assisted-work/bin/skills.mjs check                 # ✓ or ✗ per installed skill
```

`install` reads the `bundle.json` beside the script; `--bundle <path or folder>` names another bundle. Each skill is copied to `.agents/skills/<name>`, which Codex, Cursor, Copilot, VS Code and Gemini CLI read, and linked from `.claude/skills/<name>` when `.claude/` exists, for Claude Code. `.agents/skills.lock.json` records where each came from; `.agents/.skill-sources/` holds the clones and belongs in `.gitignore`.

A workspace that installs the same skills every session declares them in a committed `.agents/skills.json`:

```json
{
  "sources": [
    { "bundle": "https://github.com/dermot-obrien/ai-assisted-work.git", "ref": "main", "skills": ["work"] },
    { "repo": "https://github.com/dermot-obrien/markdown-deck.git", "ref": "markdown-deck--v0.6.8", "name": "markdown-deck", "path": "skills/markdown-deck" }
  ]
}
```

`node bin/skills.mjs sync` installs what it declares, records each commit in `.agents/skills.lock.json`, and removes any skill it installed that the file no longer lists. Commit the lock too. A session start runs `node bin/skills.mjs sync --locked --copy`, which installs exactly the locked commits as copies. [Installing the skills](DEPLOYMENT.md) has the details: mirrors, machines with no network, updates and removal.

## Quick start

```
mkdir demo && cd demo && git init
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/skills.mjs install work
```

Then open `demo` in your agent, start a new chat and type:

```
/work start write a one-page guide to our release process
```

The [quick start](docs/quick-start.md) goes further: a small work item you write by hand and hand to your agent.

The work hierarchy is initiative, work item, activity, task. A work item is either a `workstream` (a durable subject that may never end) or an `epic` (a slice that lands within one planning period, three months at most). An agile team can read epic, story and task. Planning is product-based, after PRINCE2: every activity names the product it advances.

Inspired by the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD), which is the better choice if you want to align specifically to agile methods.

## Documentation

| Page | Covers |
|------|--------|
| [Quick start](docs/quick-start.md) | From nothing to a first work item in ten minutes |
| [Concepts](docs/concepts/index.md) | The ideas, in the order you need them |
| [Installing the skills](DEPLOYMENT.md) | `skills.mjs`, `.agents/skills.json`, updating and removing |
| [Installing in each agent](docs/integration/index.md) | Where each agent looks, user-level installs, hooks, customising |
| [Skills](docs/skills/index.md) | A page per skill |
| [Configuration](docs/reference/configuration.md) | Every `.aaw-config.yaml` key and environment variable |
| [Commands](docs/reference/commands.md) | `skills.mjs`, the post-install checks and the repository scripts |
| [Troubleshooting](docs/troubleshooting.md) | Keyed to the messages the tools print |
| [Examples](docs/examples.md) | Worked examples and templates |
| [All documentation](docs/index.md) | Including background, design decisions and the roadmap |

## Conformance

Every skill follows the [Agent Skills specification](https://agentskills.io/specification): a `SKILL.md` whose `name` equals its folder, a `description` of at most 1,024 characters, and a body under 500 lines and about 5,000 tokens, with longer procedure in `references/`. CI checks each one with the specification's reference validator, `skills-ref`, and with `scripts/validate-skills.mjs`, which also checks links. [CONTRIBUTING.md](CONTRIBUTING.md) shows how to run both locally.

## Customisation

Fork this repository to customise it for your organisation. See [Installing in each agent](docs/integration/index.md#customising) and [Organisation adoption](docs/about/organization-adoption.md).

## Contributing

Contributions welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the checks CI runs and versioning.

## Licence

These skills are permissively licensed to encourage the widest possible adoption: private, public, academic and commercial. Attribution is the primary expectation.

- **Documentation, skill definitions, templates, examples** ([`CC BY 4.0`](LICENSES/CC-BY-4.0.txt)): use, share, modify and redistribute, including commercially, with attribution.
- **Executable code** (`bin/`, `scripts/`, the scripts inside `skills/*/bin/`) ([`Apache-2.0`](LICENSES/Apache-2.0.txt)): the same permissions, with an explicit patent grant.

Per-file licensing is declared via SPDX identifiers and the [`REUSE.toml`](REUSE.toml) manifest, following the [REUSE Specification 3.3](https://reuse.software/spec-3.3/). See [`LICENSE`](LICENSE) for the full overview.

### Trademark

"AI-Assisted Work" and any associated logos are trademarks of Dermot O'Brien. The licences above grant rights to the **content and code** only; they do not grant rights to use these marks. Nominative use ("based on AI-Assisted Work") is welcome; please use a different name for forks or derivative offerings.

## Attribution

Created by **Dermot O'Brien** ([@dermot-obrien](https://github.com/dermot-obrien)).

If you use AI-Assisted Work, attribution is appreciated:

> Built with [AI-Assisted Work](https://github.com/dermot-obrien/ai-assisted-work) by Dermot O'Brien

---

*AI-Assisted Work: the work skill, and an installer for standalone skills*.
