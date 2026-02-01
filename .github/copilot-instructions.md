# GitHub Copilot Instructions - AI-Assisted Work

This project uses the AI-Assisted Work system for structured work management and image management.

## Available Agent Commands

When the user invokes one of these commands, read and follow the full agent instructions from the specified file.

**Note:** This file documents the `/aiaw-self-*` commands for developing AI-Assisted Work itself. For using AI-Assisted Work in other projects, use the `/aiaw-*` commands which point to `.ai-assisted-work/agents/`.

### Work Management Agents

#### `/aiaw-self-start-work` - Initialize New Work Items

**Full instructions:** Read [`agents/work-management/start-work.md`](../agents/work-management/start-work.md)

**Required reading:**
- [`agents/work-management/AGENTS.md`](../agents/work-management/AGENTS.md) - Agent rules and concurrency model
- [`agents/work-management/README.md`](../agents/work-management/README.md) - Core concepts

**Purpose:** Create a new work item with scope, plan, and progress tracking.

---

#### `/aiaw-self-progress-work` - Continue Work on Items

**Full instructions:** Read [`agents/work-management/progress-work.md`](../agents/work-management/progress-work.md)

**Required reading:**
- [`agents/work-management/AGENTS.md`](../agents/work-management/AGENTS.md) - Agent rules and concurrency model
- [`agents/work-management/README.md`](../agents/work-management/README.md) - Core concepts

**Purpose:** Execute tasks and update progress on an existing work item.

---

#### `/aiaw-self-pivot-work` - Rescope and Replan

**Full instructions:** Read [`agents/work-management/pivot-work.md`](../agents/work-management/pivot-work.md)

**Required reading:**
- [`agents/work-management/AGENTS.md`](../agents/work-management/AGENTS.md) - Agent rules and concurrency model
- [`agents/work-management/README.md`](../agents/work-management/README.md) - Core concepts

**Purpose:** Revise the scope and plan when requirements change or the current approach isn't working.

---

#### `/aiaw-self-work-status` - Report Work Item Status

**Full instructions:** Read [`agents/work-management/work-status.md`](../agents/work-management/work-status.md)

**Required reading:**
- [`agents/work-management/README.md`](../agents/work-management/README.md) - Core concepts

**Purpose:** Generate a status report for work items.

---

### Image Management Agents

#### `/aiaw-self-replace-ascii-diagrams` - Convert ASCII to Images

**Full instructions:** Read [`agents/image-management/replace-ascii-diagrams.md`](../agents/image-management/replace-ascii-diagrams.md)

**Required reading:**
- [`agents/image-management/AGENTS.md`](../agents/image-management/AGENTS.md) - Agent rules for image conversion
- [`agents/image-management/README.md`](../agents/image-management/README.md) - Overview

**Purpose:** Scan documents for ASCII diagrams and replace them with Draw.io diagrams and PNG images.

---

## How to Use

When a user types a command like `/aiaw-self-start-work`, `/aiaw-self-progress-work`, etc.:

1. **Read the agent instructions file** specified above
2. **Read the supporting documentation** (AGENTS.md, README.md)
3. **Follow the instructions exactly** as written in those files
4. **Use the templates** from `agents/work-management/_templates/`

## Design Principles

- **Thin wrappers:** This file is minimal - all logic lives in agent instruction files
- **Single source of truth:** Agent files in `agents/` contain the full behavior
- **Cross-platform:** Works with Cursor, Claude Code, GitHub Copilot
- **Easy updates:** Update agent behavior by editing files in `agents/` only

## Submodule Usage

If this is being used as a submodule (e.g., at `.ai-assisted-work/`), prefix all paths with the submodule location:
- `.ai-assisted-work/agents/work-management/start-work.md`
- `.ai-assisted-work/agents/work-management/AGENTS.md`
- etc.
