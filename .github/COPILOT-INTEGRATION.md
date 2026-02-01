# GitHub Copilot Quick Reference

## Integration Setup

GitHub Copilot uses `.github/copilot-instructions.md` to provide custom instructions.

### Thin Wrapper Architecture

```
.github/copilot-instructions.md           (Thin wrapper - you are here)
    ↓ directs to ↓
agents/work-management/start-work.md      (Full agent instructions)
agents/work-management/AGENTS.md          (Agent rules & concurrency)
agents/work-management/README.md          (Core concepts)
```

**Design principle:** All agent logic lives in `agents/` modules. The copilot-instructions.md is just a routing layer.

## Available Commands

| Command | Agent File | Purpose |
|---------|-----------|---------|
| `/start-work` | `agents/work-management/start-work.md` | Create new work item |
| `/progress-work` | `agents/work-management/progress-work.md` | Continue work on item |
| `/pivot-work` | `agents/work-management/pivot-work.md` | Rescope and replan |
| `/work-status` | `agents/work-management/work-status.md` | Report work status |
| `/replace-ascii-diagrams` | `agents/image-management/replace-ascii-diagrams.md` | Convert ASCII diagrams |

## How It Works

1. **User types command:** `/start-work`
2. **Copilot reads:** `.github/copilot-instructions.md`
3. **Instructions direct to:** `agents/work-management/start-work.md`
4. **Agent also reads:**
   - `agents/work-management/AGENTS.md` (rules)
   - `agents/work-management/README.md` (concepts)
5. **Agent executes:** Following the full instructions

## Benefits

✅ **Single source of truth** - Agent behavior defined once in `agents/`
✅ **Cross-platform** - Same agents work with Cursor, Claude Code, Copilot
✅ **Easy updates** - Modify `agents/*.md` files, wrapper stays the same
✅ **Portable** - Works as submodule or standalone

## Installation

### For Your Project (Submodule)

```bash
# Add as submodule
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work

# Copy GitHub Copilot instructions
mkdir -p .github
cp .ai-assisted-work/.github/copilot-instructions.md .github/

# Update paths in copilot-instructions.md to use .ai-assisted-work/ prefix
```

### For Standalone Use

```bash
# Clone repository
git clone https://github.com/dermot-obrien/ai-assisted-work.git

# Copy GitHub Copilot instructions (already in place)
# Ready to use!
```

## Cursor Integration

For Cursor IDE users, the same thin wrapper architecture exists:

```bash
cp agents/cursor-rules/*.mdc .cursor/rules/
```

The `.mdc` files mirror the structure of `copilot-instructions.md`.

## Comparison with Other Tools

| Tool | Configuration Location | Format | Thin Wrapper |
|------|----------------------|--------|--------------|
| GitHub Copilot | `.github/copilot-instructions.md` | Markdown | ✅ |
| Cursor | `.cursor/rules/*.mdc` | MDC (frontmatter + MD) | ✅ |
| Claude Code | Manual reference in prompts | N/A | ✅ |

All tools reference the same agent instruction files in `agents/`.

## Maintenance

**To add a new agent:**

1. Create full instructions in `agents/{category}/{agent-name}.md`
2. Add entry to `.github/copilot-instructions.md`
3. (Optional) Create matching `.cursor/rules/{agent-name}.mdc`

**To update agent behavior:**

1. Edit `agents/{category}/{agent-name}.md`
2. No changes needed to `.github/copilot-instructions.md`

This keeps maintenance simple and ensures consistency across platforms.
