# AI Assisted Work

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

**Domain-agnostic, reusable AI agents for work management and image processing.**

AI Assisted Work provides structured agents that help AI assistants (Cursor, GitHub Copilot, Claude Code) manage work items through their lifecycle and convert ASCII diagrams to professional images. It's designed to be included in your projects via Git submodule or copy-paste.

## Key Features

| Category | Agents | Purpose |
|----------|--------|---------|
| **Work Management** | Start, Progress, Pivot, Status | Manage work items with scope, planning, and progress tracking |
| **Image Management** | Replace ASCII Diagrams | Convert ASCII diagrams to PNG/Draw.io images |

## Deployment

Both deployment methods place AI-Assisted Work in an isolated `.ai-assisted-work/` folder, ensuring nothing overwrites your existing project files.

| Method | Best For | Updates | Customization |
|--------|----------|---------|---------------|
| **[Git Submodule](DEPLOYMENT.md#deployment-method-1-git-submodule-recommended)** | Most users | `git pull` | Fork and modify |
| **[Copy-Paste](DEPLOYMENT.md#deployment-method-2-copy-paste)** | One-time use | Manual | Edit freely |

**See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.**

## Available Commands

Once integrated, these commands are available in your AI assistant:

| Command | Purpose |
|---------|---------|
| `/aiaw-start-work` | Initialize new work items |
| `/aiaw-progress-work` | Continue work on items |
| `/aiaw-pivot-work` | Rescope and replan |
| `/aiaw-work-status` | Report work status |
| `/aiaw-replace-ascii-diagrams` | Convert ASCII diagrams |

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

- **Documentation**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Code/Agents**: [MIT License](LICENSE)

## Author

**Dermot O'Brien** - [@dermot-obrien](https://github.com/dermot-obrien)

## Attribution

If you use AI-Assisted Work, attribution is appreciated:

> Built with [AI-Assisted Work](https://github.com/dermot-obrien/ai-assisted-work) by Dermot O'Brien

---

*AI-Assisted Work - Domain-agnostic AI agents for productivity*
