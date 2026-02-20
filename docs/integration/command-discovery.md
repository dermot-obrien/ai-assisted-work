# Command Discovery Across AI Assistants

This guide explains how AI-Assisted Work commands are discovered and invoked across different AI coding assistants.

## Command Naming Convention

All AI-Assisted Work commands use the `aiaw-` prefix to avoid conflicts with other tools in your repository:

| Standard Command | Self-Development Command | Purpose |
|------------------|--------------------------|---------|
| `/aiaw-start-work` | `/aiaw-self-start-work` | Initialize a new work item |
| `/aiaw-progress-work` | `/aiaw-self-progress-work` | Continue work on an existing item |
| `/aiaw-pivot-work` | `/aiaw-self-pivot-work` | Revise scope and plan |
| `/aiaw-work-status` | `/aiaw-self-work-status` | Check status of work items |

- **`aiaw-*` commands**: Use when AI-Assisted Work is deployed as a submodule (paths start with `.ai-assisted-work/`)
- **`aiaw-self-*` commands**: Use when working **on** the AI-Assisted Work repository itself (paths start with `skill-definitions/`)

## Command Behavior Summary

| Feature | Cursor | Claude Code | GitHub Copilot |
|---------|--------|-------------|----------------|
| Commands appear in `/` menu | ✅ Yes | ✅ Yes | ✅ Yes |
| Commands work when typed | ✅ Yes | ✅ Yes | ✅ Yes |
| Requires knowing command names | No (discoverable) | No (discoverable) | No (discoverable) |
| Configuration location | `.cursor/rules/aiaw-*.mdc` | `.claude/commands/aiaw-*.md` | `.github/prompts/aiaw-*.prompt.md` |

---

## Cursor

### How it works

Cursor has a **custom slash command registration system**. When you create `.mdc` files with specific frontmatter, Cursor registers them as discoverable commands.

```yaml
---
name: aiaw-start-work
description: Initialize a new work item (AI-Assisted Work)
type: manual
---
```

- **`name`**: The slash command name (e.g., `/aiaw-start-work`)
- **`description`**: Shown in the command menu
- **`type: manual`**: Command must be explicitly invoked (not auto-applied)

### User experience

1. Type `/` in Cursor chat
2. See a dropdown menu of available commands including `/aiaw-start-work`, `/aiaw-progress-work`, etc.
3. Select a command to invoke it

### File location

Commands are defined in `.cursor/rules/aiaw-*.mdc` files. The `aiaw-` prefix ensures they don't conflict with other rules when copied to an existing repository.

---

## Claude Code

### How it works

Claude Code has a **native slash command system** via `.claude/commands/`. Each `.md` file in this folder becomes a discoverable command.

```
.claude/commands/
├── aiaw-start-work.md           → /aiaw-start-work
├── aiaw-progress-work.md        → /aiaw-progress-work
├── aiaw-pivot-work.md           → /aiaw-pivot-work
└── aiaw-work-status.md          → /aiaw-work-status
```

The filename (without extension) becomes the command name. Each file contains instructions pointing to the full agent documentation.

### User experience

1. Type `/` in Claude Code
2. See a dropdown menu of available commands including `/aiaw-start-work`, `/aiaw-progress-work`, etc.
3. Select a command to invoke it

This works similarly to Cursor - commands are discoverable through the UI.

### File location

Commands are defined in `.claude/commands/aiaw-*.md`. Each command file is a thin wrapper that points to the full instructions in `.ai-assisted-work/skill-definitions/`.

### Additional context

Claude Code also reads `CLAUDE.md` in the project root for general project context (architecture, conventions, etc.). This provides background knowledge but isn't required for commands to work.

---

## GitHub Copilot

### How it works

GitHub Copilot supports **discoverable slash commands** via `.github/prompts/` folder. Each `.prompt.md` file becomes a command you can invoke.

```
.github/prompts/
├── aiaw-start-work.prompt.md           → /aiaw-start-work
├── aiaw-progress-work.prompt.md        → /aiaw-progress-work
├── aiaw-pivot-work.prompt.md           → /aiaw-pivot-work
└── aiaw-work-status.prompt.md          → /aiaw-work-status
```

The filename (without `.prompt.md` extension) becomes the command name. Each file contains instructions pointing to the full agent documentation.

### User experience

1. Type `/` in GitHub Copilot Chat
2. See a dropdown menu of available commands including `/aiaw-start-work`, `/aiaw-progress-work`, etc.
3. Select a command to invoke it

This works similarly to Cursor and Claude Code - commands are discoverable through the UI.

### File locations

- **Prompt files**: `.github/prompts/aiaw-*.prompt.md` - Discoverable slash commands
- **Background context**: `.github/copilot-instructions.md` - Always loaded as workspace context

The prompt files provide UI discoverability, while `copilot-instructions.md` provides background context for all interactions.

### Additional features

GitHub Copilot prompts support:
- **File references**: Use `#file:path/to/file.md` or Markdown links to include other files
- **Variables**: Use `${VARIABLE}` syntax for dynamic content
- **Rich instructions**: Full Markdown support for complex agent instructions

---

## Available Commands

All AI assistants support these commands (typed manually or selected from menu):

| Command | Purpose |
|---------|---------|
| `/aiaw-start-work` | Initialize a new work item with scope, plan, and progress tracking |
| `/aiaw-progress-work` | Continue work on an existing work item |
| `/aiaw-pivot-work` | Revise scope and plan when requirements change |
| `/aiaw-work-status` | Check status of work items |

---

## Tips for Users

All three AI assistants now support discoverable commands:

1. **Type `/`** in any chat to see available commands
2. **Look for `aiaw-` prefix** to identify AI-Assisted Work commands
3. **Use `aiaw-self-*` commands** when developing AI-Assisted Work itself
4. **Include context** after selecting a command: `/aiaw-start-work Add caching layer to API`
5. **The AI will read the full instructions** from the agent files automatically
6. **Use the same workflow** across all three tools

---

## Why Prefixes Instead of Subfolders?

Research shows that **subfolders are not reliably supported** across all tools:

| Tool | Subfolder Support |
|------|-------------------|
| Cursor | ❌ No - nested folders within `.cursor/rules/` don't work |
| Claude Code | ✅ Yes - supports hierarchical command folders |
| GitHub Copilot | ⚠️ Requires VS Code settings workaround |

Using the `aiaw-` prefix ensures commands work correctly in all three tools without requiring user configuration.

---

## Configuration Summary

Each AI assistant uses a different configuration mechanism, but all provide the same discoverable command experience:

| Tool | Configuration Folder | File Pattern | Context File |
|------|---------------------|--------------|--------------|
| Cursor | `.cursor/rules/` | `aiaw-*.mdc` | N/A |
| Claude Code | `.claude/commands/` | `aiaw-*.md` | `CLAUDE.md` |
| GitHub Copilot | `.github/prompts/` | `aiaw-*.prompt.md` | `copilot-instructions.md` |

All command files are thin wrappers pointing to the full instructions in `.ai-assisted-work/skill-definitions/`.
