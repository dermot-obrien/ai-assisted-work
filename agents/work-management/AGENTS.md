# Work Management Agents

Domain-agnostic agents for managing work items through their lifecycle.

## Overview

These agents help manage any type of work - development tasks, architecture decisions, research projects, documentation, or any multi-step effort.

## Available Agents

| Agent | File | Purpose |
|-------|------|---------|
| Start Work | `start-work.md` | Initialize new work items |
| Progress Work | `progress-work.md` | Execute tasks and update progress |
| Work Status | `work-status.md` | Report current status |
| Pivot Work | `pivot-work.md` | Rescope and replan |
| Complete Work | `complete-work.md` | Finalize and close |

## Work Item Structure

```
work-item/
├── scope.md              # What's in/out of scope
├── plan.md               # Activities and tasks
├── progress.yaml         # Machine-readable status
└── deliverables/         # Output artifacts
```

## Lifecycle

```
Start Work → Progress Work → [Status] → Complete Work
                  │
                  └── Pivot Work (if needed)
```

## Usage

### With Cursor

Copy rules from `../cursor-rules/` to your project's `.cursor/rules/`.

### With Claude Code

Reference agent instruction files in your prompts:

```
Follow the instructions in agents/work-management/start-work.md 
to initialize a new work item for [description]
```

### With Any AI Tool

Read the agent file and follow the instructions.

## Templates

See `_templates/` for standard work item templates.

## Domain-Agnostic

These agents work for any type of work:

| Domain | Example Work Items |
|--------|-------------------|
| Architecture | Design decisions, building blocks |
| Development | Features, bug fixes, refactoring |
| Research | Literature review, experiments |
| Documentation | Guides, specifications |
| Operations | Runbooks, incident response |

The agents make no assumptions about domain - you provide the context.
