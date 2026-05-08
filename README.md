# AI Assisted Work

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](CHANGELOG.md)
[![Licence: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-blue.svg)](LICENSES/CC-BY-4.0.txt)
[![Licence: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSES/Apache-2.0.txt)
[![REUSE 3.3](https://img.shields.io/badge/REUSE-3.3-lightgrey.svg)](https://reuse.software/spec-3.3/)

**Domain-agnostic, reusable AI agents for work management.**

This AI Assisted Work (AAW) method is not opinionated about any specific work management method and uses a simple `Work Item` → `Activity`→ `Task` hierarchy (which can map to `Epic`, `Story` and `Task` in an Agile workflow). Inspired by the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) which is better if you want to specifically align to Agile methods. 

AI Assisted Work provides structured agents that help AI assistants (Cursor, GitHub Copilot, Claude Code) manage complex work items through their lifecycle. It is designed to be included in your projects via Git submodule or copy-paste.

## Key Features

| Category | Agents | Purpose |
|----------|--------|---------|
| **Work Management** | Start, Progress, Status | Manage work items with scope, planning, and progress tracking. Enable multiple agents to work on the same work item without conflict. Support agents continuing to work on a work item after unexpected failures and pick up where the last agent got to. |

## Install

```bash
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
git submodule update --init
node .ai-assisted-work/bin/aaw.js init
```

Requires Node.js (16+). Works in corporate environments where npm registry access is restricted but git+GitHub access is allowed — the bundled CLI ships in the submodule. Cross-platform on Mac, Linux, and Windows. See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

## Available Commands

Once installed, these commands are available in your AI assistant:

| Command | Purpose |
|---------|---------|
| `/aaw-start-work` | Initialize new work items. |
| `/aaw-progress-work` | Continue work on items. |
| `/aaw-work-status` | Report work status. |
| `/aaw-next-task` | Identify the next task to work on. |
| `/aaw-start-initiative` | Create a strategic initiative grouping work items. |

And from the shell:

```bash
aaw status            # list work items in this workspace
aaw status WI-001     # show one work item with activity/task tree
aaw verify            # sanity-check the install
```

## Documentation

| Document | Description |
|----------|-------------|
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Step-by-step deployment instructions |
| [Getting Started](docs/getting-started/index.md) | First steps and core concepts |
| [Integration Guide](docs/integration/index.md) | Cursor, Copilot, and Claude Code setup |
| [Command Discovery](docs/integration/command-discovery.md) | How commands work across AI assistants |

## Customization

Fork this repository to customize for your organization. See [Organization Adoption](docs/about/organization-adoption.md) for guidance.

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Licence

This framework is permissively licensed to encourage the widest possible adoption — private, public, academic, and commercial. Attribution is the primary expectation.

- **Documentation, skill definitions, agent shims, templates, examples** ([`CC BY 4.0`](LICENSES/CC-BY-4.0.txt)) — use, share, modify, and redistribute, including commercially, with attribution.
- **Executable code** (`packages/cli/`, `packages/protocol/`, `bin/`, build scripts) ([`Apache-2.0`](LICENSES/Apache-2.0.txt)) — same permissions, with an explicit patent grant.

Per-file licensing is declared via SPDX identifiers and the [`REUSE.toml`](REUSE.toml) manifest, following the [REUSE Specification 3.3](https://reuse.software/spec-3.3/). See [`LICENSE`](LICENSE) for the full overview.

### Trademark

"AI-Assisted Work" and any associated logos are trademarks of Dermot O'Brien. The licences above grant rights to the **content and code** only; they do not grant rights to use these marks. Nominative use ("based on AI-Assisted Work") is welcome; please use a different name for forks or derivative offerings.

## Attribution

Created by **Dermot O'Brien** ([@dermot-obrien](https://github.com/dermot-obrien)).

If you use AI-Assisted Work, attribution is appreciated:

> Built with [AI-Assisted Work](https://github.com/dermot-obrien/ai-assisted-work) by Dermot O'Brien

---

*AI-Assisted Work - Domain-agnostic AI agents for productivity*.
