# Work Items

This folder contains work items committed to the repository as live demonstrations of the AAW framework. Each item shows scope, plan, progress, and deliverables for a real change to the framework itself.

> **Note**: as of v2, work items live by default at the path declared in `.aaw-config.yaml` (typically outside the artefact repo). This folder is the special case where AAW *intentionally* publishes its own work items as documentation. For most adopters, the equivalent folder will not exist.

## Usage

Use the `/aiaw-self-*` commands to manage work items here. The standard `/aiaw-*` commands point to `.ai-assisted-work/packages/skills/...` (the submodule path); the `/aiaw-self-*` variants point to `packages/skills/...` for development directly on this repo.

| Command | Purpose |
|---------|---------|
| `/aiaw-self-start-work` | Create a new work item |
| `/aiaw-self-progress-work` | Continue work on an item |
| `/aiaw-self-work-status` | Check status of work items |
| `/aiaw-self-next-task` | Identify next task to work on |

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

## See Also

- [packages/skills/work-management/README.md](../../packages/skills/work-management/README.md) - Work management concepts
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
