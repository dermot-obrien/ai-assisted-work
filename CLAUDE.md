# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Assisted Work provides domain-agnostic, reusable AI agents for work management and image processing. It's designed to be included as a Git submodule (at `.ai-assisted-work/`) or copied directly into other projects.

## Architecture

### Agent System

Agents are defined in `agents/` with two main categories:

- **Work Management** (`agents/work-management/`): Manages work items through their lifecycle
- **Image Management** (`agents/image-management/`): Converts ASCII diagrams to PNG/Draw.io

Each agent has:
- An instruction file (e.g., `start-work.md`) with the full agent logic
- An `AGENTS.md` file with hard rules and boundaries
- A `README.md` with concepts and reference

### Work Item Structure

Work items live in `{project}/work-items/WI-{NNN}-{name}/` with:
- `scope.md` - Stakeholder-facing specification
- `plan.md` - Activities and tasks
- `progress.yaml` - Source of truth for state (versioned for concurrency)
- `deliverables/` - Output documents
- `locks/` - Activity lock files for multi-agent coordination

### Concurrency Model

**One agent per activity** - agents claim activities (not tasks) via lock files:
- Lock files: `locks/{activity_id}.lock`
- Activity locks expire (1h for agents, 8h for humans)
- `progress.yaml` uses optimistic locking via version field
- `changelog.log` is append-only for safe concurrent writes

Critical rules from `agents/work-management/AGENTS.md`:
- NEVER overwrite existing lock files when claiming
- NEVER release locks without updating `progress.yaml` first
- NEVER work on tasks without holding the activity lock
- NEVER claim activities marked `actor: human`

### ID Conventions

| Entity | Format | Example |
|--------|--------|---------|
| Initiative | `IN-{NNN}` | `IN-001` |
| Work Item | `WI-{NNN}` | `WI-001` |
| Activity | `{work_item}-A{N}` | `WI-001-A1` |
| Task | `{activity}-T{N}` | `WI-001-A1-T1` |
| Deliverable | `{work_item}-D{NN}` | `WI-001-D01` |

### Integration Patterns

**Claude Code**: Commands in `.claude/commands/` - minimal wrappers pointing to agent docs

**Cursor**: Rules in `.cursor/rules/aiaw-*.mdc` (prefixed to avoid conflicts)

**GitHub Copilot**: Delta template at `agents/github-copilot/copilot-instructions-ai-assisted-work.md` for manual merge

## Available Commands

Commands are defined in `.claude/commands/` as minimal wrappers. Each command file points to the full agent instructions.

| Command | Instructions |
|---------|--------------|
| `/start-work` | Read `.claude/commands/start-work.md` → `agents/work-management/start-work.md` |
| `/progress-work` | Read `.claude/commands/progress-work.md` → `agents/work-management/progress-work.md` |
| `/pivot-work` | Read `.claude/commands/pivot-work.md` → `agents/work-management/pivot-work.md` |
| `/work-status` | Read `.claude/commands/work-status.md` → `agents/work-management/work-status.md` |
| `/replace-ascii-diagrams` | Read `.claude/commands/replace-ascii-diagrams.md` → `agents/image-management/replace-ascii-diagrams.md` |

**Before executing any work management command, read:**
- `agents/work-management/AGENTS.md` - Critical concurrency rules
- `agents/work-management/README.md` - Core concepts

## Work Item Lifecycle

1. **Scoping**: Refine user intent, create `scope.md`
2. **Discovery**: Research, create `research.md` and `decisions.md` (optional for simple work)
3. **Planning**: Create `plan.md` and `progress.yaml`
4. **Execution**: Claim activities, work tasks, update progress

## Key Files for Development

When developing this repository itself:

- `DEPLOYMENT.md` - Deployment instructions (submodule vs copy-paste)
- `STRUCTURE.md` - Repository structure and safe deployment design
- `agents/work-management/_templates/` - Template files for work item documents
- `.claude/commands/` - Claude Code command wrappers
- `.cursor/rules/aiaw-*.mdc` - Cursor rule wrappers
- `.github/copilot-instructions.md` - Copilot instructions for THIS repo's development

## Work Items Location Discovery

Search in order: `00-change/work-items/`, `work-items/`, `docs/3-work/work-items/`, or any `**/work-items/` subfolder.
