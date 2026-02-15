# Getting Started

Quick start guide for AI-Assisted Work.

## What is AI-Assisted Work?

AI-Assisted Work provides domain-agnostic AI agents for:

- **Work Management**: Track tasks, progress, and deliverables
- **Image Management**: Convert ASCII diagrams to proper images

## Quick Start

### 1. Get the Agents

**Option A: Clone**
```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git
```

**Option B: Submodule**
```bash
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
```

### 2. Set Up Cursor (Optional)

Copy command wrappers to your project:
```bash
mkdir -p .cursor/rules
cp .ai-assisted-work/skills-for-agents/cursor/commands/aaw/*.md .cursor/rules/
# Rename to .mdc if your Cursor version expects that extension
```

### 3. Start Your First Work Item

In Cursor, type `/aiaw-start-work` or tell your AI assistant:

```
Follow the instructions in .ai-assisted-work/skill-definitions/work-management/start-work.md 
to create a work item for: "Research best practices for [topic]"
```

### 4. Work Through Tasks

Progress through tasks:
```
/progress-work work/WI-001
```

Check status:
```
/work-status work/WI-001
```

## Work Item Structure

Each work item has:

```
work/WI-001/
├── scope.md          # What's in/out of scope
├── plan.md           # Activities and tasks
├── progress.yaml     # Machine-readable status
└── deliverables/     # Output files
```

## Agent Workflow

```
Start Work → Progress Work → [Status] → Complete Work
                  │
                  └── Pivot Work (if scope changes)
```

## Next Steps

- [Work Management](../../skill-definitions/work-management/README.md) - Core concepts and lifecycle
- [Image Management](../../skill-definitions/image-management/README.md) - Replace ASCII diagrams
- [Integration Guide](../integration/index.md) - Cursor, Copilot, Claude Code setup
- [DEPLOYMENT.md](../../DEPLOYMENT.md) - Step-by-step deployment
