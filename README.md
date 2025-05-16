# AI-Assisted Work

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

Domain-agnostic AI agents for work management and productivity.

## Overview

AI-Assisted Work provides reusable AI agents for managing work items, converting diagrams, and automating common tasks. It is designed to be:

- **Domain-agnostic**: Works for any type of project or work
- **Reusable**: Include as a Git submodule in domain-specific repositories
- **Customizable**: Fork and extend for your organization's needs
- **Community-driven**: Contributions welcome

## Key Features

### Work Management Agents

Manage work items through their lifecycle:

| Agent | Purpose |
|-------|---------|
| **Start Work** | Initialize work items with scope, plan, and tracking |
| **Progress Work** | Execute tasks and update progress |
| **Work Status** | Report current status and blockers |
| **Pivot Work** | Rescope and replan when needed |
| **Complete Work** | Finalize and close work items |

### ASCII Image Agents

Convert ASCII diagrams to proper images:

| Agent | Purpose |
|-------|---------|
| **Detect ASCII** | Find ASCII diagrams in markdown |
| **Convert ASCII** | Generate Draw.io/Mermaid from ASCII |
| **Replace ASCII** | Update documents with image references |

## Quick Start

### Use Directly

```bash
# Clone the repository
git clone https://github.com/dermotcanniffe/ai-assisted-work.git

# Copy agents to your project
cp -r ai-assisted-work/agents/ your-project/.agents/
```

### Use as Submodule

```bash
# Add as submodule in your repository
git submodule add https://github.com/dermotcanniffe/ai-assisted-work.git .ai-work

# Initialize submodule
git submodule update --init
```

### Use with Cursor

Copy Cursor rules to your project:

```bash
cp ai-assisted-work/agents/cursor-rules/*.mdc your-project/.cursor/rules/
```

## Integration Examples

### With AI-Assisted Architecture

```
your-architecture-repo/
├── .ai-work/                    # Submodule
│   └── agents/
│       ├── work-management/
│       └── ascii-image/
├── work/                        # Your work items
└── docs/                        # Your documentation
```

### With Any Project

```
your-project/
├── .agents/                     # Copied from ai-assisted-work
│   ├── work-management/
│   └── ascii-image/
└── work/
    └── WI-001/
        ├── scope.md
        ├── plan.md
        └── progress.yaml
```

## Documentation

- [Getting Started](docs/getting-started/index.md)
- [Work Management Agents](docs/agents/work-management/index.md)
- [ASCII Image Agents](docs/agents/ascii-image/index.md)
- [Integration Guide](docs/integration/index.md)

## For Organizations

Fork this repository to:

1. Customize templates for your organization
2. Add organization-specific agents
3. Integrate with your tooling
4. Contribute improvements back

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

**Dermot Canniffe**
- GitHub: [@dermotcanniffe](https://github.com/dermotcanniffe)
- LinkedIn: [dermotcanniffe](https://linkedin.com/in/dermotcanniffe)

---

*AI-Assisted Work - Domain-agnostic AI agents for productivity*
