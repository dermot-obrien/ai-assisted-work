# Work Items (Shared)

This folder contains **shared** work items for developing AI-Assisted Work itself. These work items are committed to the repository and visible to collaborators and forks.

For private work items (personal rationale, experiments, sensitive decisions), use `change/work-items-private/` which is gitignored.

## Usage

Use the `/aiaw-self-*` Cursor commands to manage work items:

| Command | Purpose |
|---------|---------|
| `/aiaw-self-start-work` | Create a new work item |
| `/aiaw-self-progress-work` | Continue work on an item |
| `/aiaw-self-work-status` | Check status of work items |
| `/aiaw-self-pivot-work` | Rescope when requirements change |
| `/aiaw-self-replace-ascii-diagrams` | Convert ASCII diagrams |

## Structure

```
change/work-items/
├── WI-001-feature-name/
│   ├── scope.md
│   ├── plan.md
│   ├── progress.yaml
│   └── deliverables/
└── WI-002-another-feature/
    └── ...
```

## Why /aiaw-self-* Commands?

The standard `/start-work`, `/progress-work` commands point to `.ai-assisted-work/agents/...` which is the path when this project is deployed as a submodule in another repository.

The `/aiaw-self-*` commands point to `agents/...` which is the correct path when working directly on this repository.

## See Also

- [agents/work-management/README.md](../../agents/work-management/README.md) - Work management concepts
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
