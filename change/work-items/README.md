# Work Items

This folder contains work items committed to the repository as live demonstrations of the AAW framework. Each item shows scope, plan, progress, and deliverables for a real change to the framework itself.

> **Note**: as of v2, work items live by default at the path declared in `.aaw-config.yaml` (typically outside the artefact repo). This folder is the special case where AAW *intentionally* publishes its own work items as documentation. For most adopters, the equivalent folder will not exist.

## Usage

Use the `work` skill to manage work items here. It is self-contained under `skills/work/`, so the same skill serves development on this repo and deployed use elsewhere.

| Command | Purpose |
|---------|---------|
| `/work start` | Create a new work item |
| `/work progress` | Continue work on an item |
| `/work status` | Check status of work items |
| `/work next` | Identify next task to work on |
| `/work initiative` | Create an initiative |

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

- [docs/concepts/work-management.md](../../docs/concepts/work-management.md) - Work management concepts
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
