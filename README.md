# AI Assisted Work

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

Domain-agnostic AI agents for work management and productivity.

## Overview

AI Assisted Work provides reusable AI agents for managing work items, converting diagrams, and automating common tasks. It is designed to be:

- **Domain-agnostic**: Works for any type of project or work.
- **Reusable**: Include as a Git submodule in domain-specific repositories.
- **Customizable**: Fork and extend for your personal and organization's needs.
- **Community-driven**: Contributions welcome.

## Key Features

### Work Management Agents

Manage work items through their lifecycle:

| Agent | Purpose |
|-------|---------|
| **Start Work** | Initialize work items with scope, plan, and tracking. |
| **Progress Work** | Execute tasks and update progress. |
| **Work Status** | Report current status and blockers. |
| **Pivot Work** | Rescope and replan when needed. |
| **Complete Work** | Finalize and close work items. |

### Image Management Agents

Manage images in AI assisted workflows. Convert ASCII diagrams typically created in AI generated workflows to proper images:

| Agent | Purpose |
|-------|---------|
| **Detect ASCII** | Find ASCII diagrams in markdown. |
| **Convert ASCII** | Generate PNG and Draw.io from ASCII. |
| **Replace ASCII** | Update documents with image references. |

## Quick Start

### Two Deployment Options

**Choose your deployment method:**

1. **Git Submodule** (Recommended) - Easy updates, clean separation.
2. **Copy-Paste** - Full control, easy customization.

Both methods place AI-Assisted Work in an isolated **`.ai-assisted-work/`** folder, ensuring nothing overwrites your existing project files. Delta files (like GitHub Copilot instructions) are then added externally as needed.

**See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.**

### Quick Setup

#### Option 1: Git Submodule

**First, fork the repository** at [github.com/dermot-obrien/ai-assisted-work](https://github.com/dermot-obrien/ai-assisted-work) to enable contributions.

**Linux/Mac:**

```bash
# Fork the repository and add YOUR FORK as submodule
git submodule add https://github.com/YOUR-USERNAME/ai-assisted-work.git .ai-assisted-work

# Optional: Copy GitHub Copilot delta file (for manual merge - won't overwrite)
mkdir -p .github
cp .ai-assisted-work/agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/
# Then manually merge content into your .github/copilot-instructions.md

# Optional: Add Cursor rules (safe - aiaw- prefix avoids conflicts)
mkdir -p .cursor/rules
cp .ai-assisted-work/.cursor/rules/aiaw-*.mdc .cursor/rules/
```

**Windows (PowerShell):**

```powershell
# Fork the repository and add YOUR FORK as submodule
git submodule add https://github.com/YOUR-USERNAME/ai-assisted-work.git .ai-assisted-work

# Optional: Copy GitHub Copilot delta file (for manual merge - won't overwrite)
New-Item -ItemType Directory -Force -Path .github
Copy-Item .ai-assisted-work/agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/
# Then manually merge content into your .github/copilot-instructions.md

# Optional: Add Cursor rules (safe - aiaw- prefix avoids conflicts)
New-Item -ItemType Directory -Force -Path .cursor/rules
Copy-Item .ai-assisted-work\.cursor\rules\aiaw-*.mdc .cursor\rules\
```

#### Option 2: Copy-Paste

**Linux/Mac:**

```bash
# Clone and copy to .ai-assisted-work/ folder
git clone https://github.com/dermot-obrien/ai-assisted-work.git /tmp/ai-work
mkdir -p .ai-assisted-work
cp -r /tmp/ai-work/agents .ai-assisted-work/
cp -r /tmp/ai-work/.cursor .ai-assisted-work/
cp -r /tmp/ai-work/docs .ai-assisted-work/
rm -rf /tmp/ai-work

# Optional: Copy GitHub Copilot delta file (for manual merge - won't overwrite)
mkdir -p .github
cp .ai-assisted-work/agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/
# Then manually merge content into your .github/copilot-instructions.md

# Optional: Add Cursor rules (safe - aiaw- prefix avoids conflicts)
mkdir -p .cursor/rules
cp .ai-assisted-work/.cursor/rules/aiaw-*.mdc .cursor/rules/
```

**Windows (PowerShell):**

```powershell
# Clone and copy to .ai-assisted-work/ folder
git clone https://github.com/dermot-obrien/ai-assisted-work.git $env:TEMP/ai-assisted-work
New-Item -ItemType Directory -Force -Path .ai-assisted-work
Copy-Item -Recurse $env:TEMP/ai-assisted-work/agents .ai-assisted-work/
Copy-Item -Recurse $env:TEMP/ai-assisted-work/.cursor .ai-assisted-work/
Copy-Item -Recurse $env:TEMP/ai-assisted-work/docs .ai-assisted-work/
Remove-Item -Recurse -Force $env:TEMP/ai-assisted-work

# Optional: Copy GitHub Copilot delta file (for manual merge - won't overwrite)
New-Item -ItemType Directory -Force -Path .github
Copy-Item .ai-assisted-work/agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/
# Then manually merge content into your .github/copilot-instructions.md

# Optional: Add Cursor rules (safe - aiaw- prefix avoids conflicts)
New-Item -ItemType Directory -Force -Path .cursor/rules
Copy-Item .ai-assisted-work\.cursor\rules\aiaw-*.mdc .cursor\rules\
```

### Available Commands

Once integrated:
- `/aiaw-start-work` - Initialize new work items.
- `/aiaw-progress-work` - Continue work on items.
- `/aiaw-pivot-work` - Rescope and replan.
- `/aiaw-work-status` - Report work status.
- `/aiaw-replace-ascii-diagrams` - Convert ASCII diagrams.

See [Command Discovery](docs/integration/command-discovery.md) for how commands work across Cursor, GitHub Copilot, and Claude Code.

## Integration Examples

### With AI-Assisted Architecture

```
your-architecture-repo/
├── .ai-assisted-work/           # Submodule
│   └── agents/
│       ├── work-management/
│       └── image-management/
├── work/                        # Your work items
└── docs/                        # Your documentation
```

### With Any Project

```
your-project/
├── .agents/                     # Copied from ai-assisted-work
│   ├── work-management/
│   └── image-management/
└── work/
    └── WI-001/
        ├── scope.md
        ├── plan.md
        └── progress.yaml
```

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - **START HERE** - Choose submodule or copy-paste deployment.
- [Getting Started](docs/getting-started/index.md) - First steps and concepts.
- [Work Management Agents](docs/agents/work-management/index.md) - Work item lifecycle.
- [Image Management Agents](docs/agents/image-management/index.md) - ASCII diagram conversion.
- [Integration Guide](docs/integration/index.md) - Cursor and Copilot setup.

## For Individuals and Organizations

Fork this repository to:

1. Customize templates for your personal work or organization.
2. Add organization-specific agents.
3. Integrate with your tooling.
4. Contribute improvements back.

See [Organization Adoption](docs/about/organization-adoption.md).

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- How to submit improvements
- Contribution guidelines
- Code of conduct

## License

- **Documentation**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Code/Agents**: [MIT License](LICENSE)

## Author

**Dermot O'Brien**
- GitHub: [@dermot-obrien](https://github.com/dermot-obrien)

---

*AI-Assisted Work - Domain-agnostic AI agents for productivity*
