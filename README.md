# AI Assisted Work

[![Version: v1.1.0](https://img.shields.io/badge/Version-v1.1.0-purple.svg)](LICENSE)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Commercial License Available](https://img.shields.io/badge/Commercial-License%20Available-green.svg)](LICENSE-COMMERCIAL.txt)
[![Docs License: CC BY 4.0](https://img.shields.io/badge/Docs-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

**Domain-agnostic, reusable AI agents for work management.**

This AI Assisted Work (AAW) method is not opinionated about any specific work management method and uses a simple `Work Item` → `Activity`→ `Task` hierarchy (which can map to `Epic`, `Story` and `Task` in an Agile workflow). Inspired by the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) which is better if you want to specifically align to Agile methods. 

AI Assisted Work provides structured agents that help AI assistants (Cursor, GitHub Copilot, Claude Code) manage complex work items through their lifecycle. It also includes utility commands such as converting ASCII diagrams to images. It is designed to be included in your projects via Git submodule or copy-paste.

## Key Features

| Category | Agents | Purpose |
|----------|--------|---------|
| **Work Management** | Start, Progress, Status | Manage work items with scope, planning, and progress tracking. Enable multiple agents to work on the same work item without conflict. Support agents continuing to work on a work item after unexpected failures and pick up where the last agent got to. |
| **Image Management** | Replace ASCII Diagrams | Convert ASCII diagrams to editable Draw.io diagrams and then to PNG images. Allow agents to reason and iterate on documents with ASCII diagrams and, once the document is stable, convert those ASCII diagrams to editable Draw.io diagrams and PNGs. |

## Deployment

Both deployment methods place AI-Assisted Work in an isolated `.ai-assisted-work/` folder, ensuring nothing overwrites your existing project files.

| Method | Best For | Updates | Customization |
|--------|----------|---------|---------------|
| **[Git Submodule](DEPLOYMENT.md#deployment-method-1-git-submodule-recommended)** | Most users | `git pull` | Fork and modify. |
| **[Copy-Paste](DEPLOYMENT.md#deployment-method-2-copy-paste)** | One-time use | Manual | Edit freely. |

**See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.**

## Available Commands

Once integrated, these commands are available in your AI assistant:

| Command | Purpose |
|---------|---------|
| `/aiaw-start-work` | Initialize new work items. |
| `/aiaw-progress-work` | Continue work on items. |
| `/aiaw-work-status` | Report work status. |
| `/aiaw-replace-ascii-diagrams` | Convert ASCII diagrams. |

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

## License

This project is dual-licensed:

### For Open Source Use
- **Code/Agents**: [AGPL-3.0](LICENSE-AGPL-3.0.txt) - Free for open-source projects
- **Documentation**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

### For Commercial Use
If you want to use this software in a proprietary/commercial product or cannot comply with AGPL-3.0 requirements (e.g., you don't want to open-source your application), you must obtain a [Commercial License](LICENSE-COMMERCIAL.txt).

**Commercial use includes:**
- Proprietary or closed-source applications
- SaaS or hosted services without open-sourcing your code
- Any use where AGPL-3.0 compliance is not possible

**Contact for commercial licensing:** dermots.stuff@gmail.com

See [LICENSE](LICENSE) for details.

## Author

**Dermot O'Brien** - [@dermot-obrien](https://github.com/dermot-obrien)

## Attribution

If you use AI-Assisted Work, attribution is appreciated:

> Built with [AI-Assisted Work](https://github.com/dermot-obrien/ai-assisted-work) by Dermot O'Brien

---

*AI-Assisted Work - Domain-agnostic AI agents for productivity*.
