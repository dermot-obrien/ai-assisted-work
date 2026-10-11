# AI Assisted Work

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](CHANGELOG.md)
[![Licence: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-blue.svg)](LICENSES/CC-BY-4.0.txt)
[![Licence: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSES/Apache-2.0.txt)
[![REUSE 3.3](https://img.shields.io/badge/REUSE-3.3-lightgrey.svg)](https://reuse.software/spec-3.3/)

AI-Assisted Work is a bundle of standalone [Agent Skills](https://agentskills.io). Each skill installs on its own, depends on no other, and works in any agent that reads the format, including in a constrained environment with no npm registry and no access to personal repositories. This repository lists them in [`bundle.json`](bundle.json) and carries the installer, [`bin/skills.mjs`](bin/skills.mjs).

Until version 4.0.0 it was a framework of six skills. Its five work-item skills are now one skill, `work`, and the skills that left for repositories of their own are listed here by repository and version.

## The skills

| Skill | Version | Does | Lives in |
|-------|---------|------|----------|
| [`work`](docs/skills/work.md) | 3.0.0 | Work items, activities, tasks and initiatives in plain files: [`/work start`](docs/skills/work.md#start-work-start) triages and plans, [`/work progress`](docs/skills/work.md#progress-work-progress) executes under a lock, [`/work status`](docs/skills/work.md#status-work-status), [`/work next`](docs/skills/work.md#next-work-next), [`/work initiative`](docs/skills/work.md#initiative-work-initiative) | This repository, `skills/work` |
| [`thread`](docs/skills/thread.md) | 0.14.0 | A tree of why each chat exists, and a bulletin board for agents in any tool, in a git repository you own or a local one | This repository, `skills/thread`, moving to [thread](https://github.com/dermot-obrien/thread) |
| `markdown-deck` | 0.6.8 | Renders tagged sections of a Markdown document into HTML slides and a PDF | [markdown-deck](https://github.com/dermot-obrien/markdown-deck) |
| `model` | 0.8.2 | A diagram and a document as two views of one model: extract, emit, validate, render | [diagram-model](https://github.com/dermot-obrien/diagram-model) |
| `pattern`, `use-case`, `cross-reference` | 0.10.3, 0.2.0, 0.2.0 | Architecture patterns, use cases and cross-references between documents | [architecture-pattern](https://github.com/dermot-obrien/architecture-pattern) |
| `quarter-planning` | 3.6.0 | Plans technology delivery by quarter; reads `work` items where a workspace binds them | [delivery-planning](https://github.com/dermot-obrien/delivery-planning) |

`pattern` and `use-case` still name `model` and `markdown-deck` as requirements; the installer reports a missing one rather than pulling it in.

## Install

Node.js 18 or newer, and git for skills from other repositories. Nothing else, and no npm registry.

```
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/skills.mjs list                  # the skills, ● for those installed here
node .ai-assisted-work/bin/skills.mjs install work thread   # the ones you want, or none named for all
node .ai-assisted-work/bin/skills.mjs check                 # ✓ or ✗ per installed skill
```

Each skill is copied to `.agents/skills/<name>`, which Codex, Cursor, Copilot, VS Code and Gemini CLI read, and linked from `.claude/skills/<name>` when `.claude/` exists, for Claude Code. `.agents/skills.lock.json` records where each came from; `.agents/.skill-sources/` holds the clones and belongs in `.gitignore`.

| Where you are | How |
|---|---|
| No access to GitHub, or no access to personal repositories | Copy the skill folders (or clones) onto the machine and install with `--from <folder>`; nothing is fetched |
| A mirror of the repositories | `SKILLS_BASE_URL=<base>`; each clone comes from `<base>/<repository>.git` |
| One skill from its own repository | `skills.mjs install --repo <url> --ref <tag> --path skills/<name>` |
| No shared threads store | `threads_remote: local` and `threads_home: <folder>` in `.aaw-config.yaml` ([thread setup](skills/thread/references/setup.md#a-local-store-with-no-remote)) |
| A workspace that declares its skills | Commit `.agents/skills.json` listing bundles and single skills (format in `skills.mjs help`), then `skills.mjs sync` installs them, records each commit in the lock, and removes any skill it installed that the file no longer lists. Commit the lock too; a session start runs `skills.mjs sync --locked`, which installs exactly the locked commits |
| Without any installer | Copy `skills/<name>/` to `.agents/skills/<name>/` (and `.claude/skills/<name>/`) |

`aaw install` (`bin/aaw.js`), the framework installer, still works and installs `work` and `thread`, and AI-Assisted Architecture and AI-Assisted Research still install through it. Their skills now stand alone, so a workspace can install all three bundles with `skills.mjs sync` instead ([WI-005](change/work-items/WI-005-retire-ai-assisted-work/scope.md) step 2c).

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

The [quick start](docs/quick-start.md) goes further: a small work item you can list, claim and hand to your agent, and a first thread.

The work hierarchy is initiative, work item, activity, task. A work item is either a `workstream` (a durable subject that may never end) or an `epic` (a slice that lands within one planning period, three months at most). An agile team can read epic, story and task. Planning is product-based, after PRINCE2: every activity names the product it advances.

Inspired by the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD), which is the better choice if you want to align specifically to agile methods.

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
