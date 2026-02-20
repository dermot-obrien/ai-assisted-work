# Deployment Guide

This guide explains how to deploy AI-Assisted Work into your existing project using two methods: **Git Submodule** or **Copy-Paste**.

## Key Design Principle

Both deployment methods place AI-Assisted Work in an isolated `.ai-assisted-work/` folder. This ensures:

✅ **Safe deployment** - Nothing overwrites your existing project files.  
✅ **Clean integration** - AI Work Management stays in its own space.  
✅ **Easy removal** - Delete the `.ai-assisted-work/` folder to remove.  
✅ **Consistent paths** - Both methods use the same `.ai-assisted-work/` prefix.  

**Skill files** are then added to external folders (like `.github/`) as needed.

## Quick Decision Guide

| Factor | Git Submodule | Copy-Paste |
|--------|---------------|------------|
| **Easy updates** | ✅ `git pull` in submodule | ⚠️ Manual copy |
| **Contributions** | ✅ Fork + PR workflow | ⚠️ Manual submission |
| **Customization** | ✅ Edit in your fork | ✅ Edit freely |
| **Complexity** | ⚠️ Submodule commands | ✅ Simple copy |
| **File conflicts** | ✅ None | ✅ None |
| **Recommended for** | Most users | One-time use |

---

## Deployment Method 1: Git Submodule (Recommended)

### Step 0: Fork the Repository (Recommended)

Fork the repository first to enable contributions back to the project:

1. Go to [github.com/dermot-obrien/ai-assisted-work](https://github.com/dermot-obrien/ai-assisted-work)
2. Click **Fork** to create your own copy
3. Use your fork URL in the submodule command below

**Why fork?**
- Contribute improvements back via pull requests
- Customize for your organization
- Stay in sync with upstream updates

### Step 1: Add Submodule

```bash
# From your project root (use YOUR fork URL)
git submodule add https://github.com/YOUR-USERNAME/ai-assisted-work.git .ai-assisted-work
git submodule update --init
```

This creates `.ai-assisted-work/` folder with all AI-Assisted Work files.

### Step 2: Integrate with GitHub Copilot (Optional)

If you use GitHub Copilot, copy the command wrappers and merge into your Copilot instructions:

```bash
# Create .github folder if it doesn't exist
mkdir -p .github/prompts

# Copy command wrappers (for reference or merge into copilot-instructions.md)
cp .ai-assisted-work/skills-for-agents/github/prompts/*.md .github/prompts/
```

Then manually merge the command sections into your `.github/copilot-instructions.md`. Each wrapper points to `.ai-assisted-work/skill-definitions/work-management/`.

### Step 3: Integrate with Cursor (Optional)

If you use Cursor:

```bash
# Create .cursor/rules folder if it doesn't exist
mkdir -p .cursor/rules

# Copy Cursor command wrappers (aiaw-* prefix avoids conflicts)
cp .ai-assisted-work/skills-for-agents/cursor/commands/aaw/*.md .cursor/rules/
```

**Note:** Cursor command files point to the full instructions in `.ai-assisted-work/skill-definitions/`. Rename to `aiaw-*.mdc` if your Cursor version expects the `.mdc` extension for rules.

### Step 4: Integrate with Claude Code (Optional)

If you use Claude Code:

```bash
# Create .claude/commands folder if it doesn't exist
mkdir -p .claude/commands

# Copy Claude Code command wrappers
cp .ai-assisted-work/skills-for-agents/claude/commands/aaw/*.md .claude/commands/
```

**Note:** Claude Code command files point to the full instructions in `.ai-assisted-work/skill-definitions/`.

### Step 5: Commit

```bash
git add .gitmodules .ai-assisted-work .github .cursor
git commit -m "Add AI-Assisted Work as submodule."
```

### Updating Later

```bash
cd .ai-assisted-work
git pull origin main
cd ..
git add .ai-assisted-work
git commit -m "Update AI-Assisted Work."
```

---

## Deployment Method 2: Copy-Paste

**Key principle:** Copy everything into `.ai-assisted-work/` folder (same location as submodule), then add command wrappers externally.

### Step 1: Clone Temporarily

```bash
# Clone to a temporary location
git clone https://github.com/dermot-obrien/ai-assisted-work.git /tmp/ai-assisted-work
```

### Step 2: Copy to .ai-assisted-work/ Folder

```bash
# Create the .ai-assisted-work folder and copy repo contents into it
mkdir -p .ai-assisted-work
cp -r /tmp/ai-assisted-work/. .ai-assisted-work/
```

**Important:** All AI-Assisted Work content stays inside `.ai-assisted-work/`. This matches the submodule structure and ensures no file conflicts.

### Step 3: Integrate with GitHub Copilot (Optional)

If you use GitHub Copilot:

```bash
mkdir -p .github/prompts
cp .ai-assisted-work/skills-for-agents/github/prompts/*.md .github/prompts/
```

Then merge the command sections into your `.github/copilot-instructions.md`. Wrappers point to `.ai-assisted-work/skill-definitions/`.

### Step 4: Integrate with Cursor (Optional)

If you use Cursor:

```bash
mkdir -p .cursor/rules
cp .ai-assisted-work/skills-for-agents/cursor/commands/aaw/*.md .cursor/rules/
```

Rename to `aiaw-*.mdc` if your Cursor version expects that extension.

### Step 5: Integrate with Claude Code (Optional)

If you use Claude Code:

```bash
mkdir -p .claude/commands
cp .ai-assisted-work/skills-for-agents/claude/commands/aaw/*.md .claude/commands/
```

### Step 6: Clean Up and Commit

```bash
# Remove temporary clone
rm -rf /tmp/ai-assisted-work

# Commit to your project
git add .ai-assisted-work .github .cursor .claude
git commit -m "Add AI-Assisted Work"
```

### Updating Later

```bash
# Clone fresh copy
git clone https://github.com/dermot-obrien/ai-assisted-work.git /tmp/ai-assisted-work

# Update .ai-assisted-work folder (replace contents, keep .git if submodule)
cp -r /tmp/ai-assisted-work/. .ai-assisted-work/

# Clean up
rm -rf /tmp/ai-assisted-work

git add .ai-assisted-work
git commit -m "Update AI-Assisted Work"
```

---

## Project Structure After Deployment

Both deployment methods result in the **same structure**:

```
your-project/
├── .ai-assisted-work/                             ← AI-Assisted Work (isolated)
│   ├── skill-definitions/               ← Full agent instructions (source)
│   │   └── work-management/             ← start-work, progress-work, work-status, etc.
│   ├── skills-for-agents/               ← Command wrappers (source for copy)
│   │   ├── cursor/commands/aaw/        ← Cursor wrappers
│   │   ├── claude/commands/aaw/         ← Claude Code wrappers
│   │   └── github/skills/aaw/           ← GitHub Copilot wrappers
│   ├── docs/
│   ├── examples/
│   └── schemas/
├── .claude/
│   └── commands/                        ← Copied from .ai-assisted-work/skills-for-agents/claude/
├── .github/
│   └── copilot-instructions.md          ← Manually merged from wrappers
├── .cursor/
│   └── rules/                            ← Copied from .ai-assisted-work/skills-for-agents/cursor/
└── [your existing project files]        ← Completely untouched
```

---

## What Goes Where

| Content | Location | Why |
|---------|----------|-----|
| **All AI-Assisted Work content** | `.ai-assisted-work/` | Isolated, no conflicts |
| **Claude Code commands** | `.claude/commands/*.md` | Required location by Claude Code |
| **GitHub Copilot instructions** | `.github/copilot-instructions.md` | Required location by GitHub Copilot |
| **Cursor rules** | `.cursor/rules/*.md` or `*.mdc` | Required location by Cursor |

### Wrappers vs Direct Copy

| File Type | Strategy | Reason |
|-----------|----------|--------|
| `.github/copilot-instructions.md` | **Merge** (manual) | User likely has existing file; merge from wrappers |
| `.claude/commands/*.md` | **Direct copy** (safe) | Copy from `skills-for-agents/claude/commands/aaw/` |
| `.cursor/rules/*.md` | **Direct copy** (safe) | Copy from `skills-for-agents/cursor/commands/aaw/`; rename to `*.mdc` if needed |

---

## Manual Merge Instructions

If you already have `.github/copilot-instructions.md` in your project, you need to **manually merge** the AI-Assisted Work commands.

### Wrapper File Location

After copying, the command wrappers are in `.github/` (from `.ai-assisted-work/skills-for-agents/github/skills/aaw/`). Open them to see the commands, then copy what you need into your `.github/copilot-instructions.md`. All paths in the wrappers point to `.ai-assisted-work/skill-definitions/`.

### Option 1: Append Section

Open your existing `.github/copilot-instructions.md` and append:

```markdown
---

## AI-Assisted Work Commands

When the user invokes one of these commands, read and follow the full agent instructions from the specified file.

### Work Management Agents

#### `/aiaw-start-work` - Initialize New Work Items

**Full instructions:** Read `.ai-assisted-work/skill-definitions/work-management/start-work.md`

**Required reading:**
- `.ai-assisted-work/skill-definitions/work-management/AGENTS.md`
- `.ai-assisted-work/skill-definitions/work-management/README.md`

**Purpose:** Create a new work item with scope, plan, and progress tracking.

#### `/aiaw-progress-work` - Continue Work on Items

[... continue with other commands from the wrappers ...]
```

### Option 2: Reference by Inclusion

Add this to your existing `.github/copilot-instructions.md`:

```markdown
---

## AI-Assisted Work Integration

This project uses AI-Assisted Work for structured work management.

When the user invokes `/aiaw-start-work`, `/aiaw-progress-work`, `/aiaw-work-status`, or `/aiaw-next-task`:

1. Read the full instructions from the corresponding file:
   - `/aiaw-start-work` → `.ai-assisted-work/skill-definitions/work-management/start-work.md`
   - `/aiaw-progress-work` → `.ai-assisted-work/skill-definitions/work-management/progress-work.md`
   - `/aiaw-work-status` → `.ai-assisted-work/skill-definitions/work-management/work-status.md`
   - `/aiaw-next-task` → `.ai-assisted-work/skill-definitions/work-management/next-task.md`

2. Read supporting documentation:
   - `.ai-assisted-work/skill-definitions/work-management/AGENTS.md` - Agent rules
   - `.ai-assisted-work/skill-definitions/work-management/README.md` - Core concepts

3. Follow the instructions exactly as written in those files
```

---

## Verification

### Test Claude Code Integration

1. Open Claude Code
2. Type: `/aiaw-start-work test work item`
3. Verify Claude reads the command file from `.claude/commands/`
4. Verify it follows the instructions from `.ai-assisted-work/skill-definitions/work-management/start-work.md`

### Test GitHub Copilot Integration

1. Open GitHub Copilot Chat
2. Type: `/aiaw-start-work test work item`
3. Verify Copilot reads the instructions from `.ai-assisted-work/skill-definitions/work-management/start-work.md`
4. Verify it follows the workflow

### Test Cursor Integration

1. Open Cursor
2. Type: `/aiaw-start-work test work item`
3. Verify Cursor loads the agent instructions

---

## Project Structure After Deployment

### Submodule Structure

```
your-project/
├── .ai-assisted-work/                             ← Submodule (isolated)
│   ├── skill-definitions/               ← Full instructions (work-management)
│   ├── skills-for-agents/               ← Command wrappers (cursor, claude, github)
│   ├── docs/
│   ├── examples/
│   └── schemas/
├── .claude/commands/                     ← Copied from .ai-assisted-work/skills-for-agents/claude/
├── .github/copilot-instructions.md       ← Your file (manually merged from wrappers)
├── .cursor/rules/                        ← Copied from .ai-assisted-work/skills-for-agents/cursor/
└── [your project files]                  ← Untouched
```

### Copy-Paste Structure

Same as submodule: `.ai-assisted-work/` contains `skill-definitions/`, `skills-for-agents/`, `docs/`, `examples/`, `schemas/`. Integration files are copied from `skills-for-agents/` to `.claude/commands/`, `.cursor/rules/`, and merged into `.github/copilot-instructions.md`.

---

## What Gets Isolated (Safe for Copy-Paste)

All AI-Assisted Work files are in these folders:

| Folder | Contents | Safe to Copy? |
|--------|----------|---------------|
| `skill-definitions/` | Full agent instructions (work-management) | ✅ Yes - isolated |
| `skills-for-agents/` | Command wrappers for Cursor, Claude, GitHub | ✅ Yes - source for copy |
| `docs/` | Documentation | ✅ Yes - can go in `docs/ai-assisted-work/` |
| `examples/` | Example work items | ✅ Yes - isolated |
| `schemas/` | YAML schemas | ✅ Yes - isolated |
| `scripts/` | Helper scripts | ✅ Yes - isolated |

**Files NOT copied automatically** (must be manually merged):

| File | Why | How to Handle |
|------|-----|---------------|
| `.github/copilot-instructions.md` | Would overwrite yours | Merge content from `skills-for-agents/github/skills/aaw/*.md` |
| `README.md` | Would overwrite yours | Don't copy (AI-Assisted Work's readme) |
| `.gitignore` | Would overwrite yours | Don't copy |

---

## Removing AI-Assisted Work

### For Submodule

```bash
git submodule deinit .ai-assisted-work
git rm .ai-assisted-work
rm -rf .git/modules/.ai-assisted-work
git commit -m "Remove AI-Assisted Work submodule"

# Manually remove from .github/copilot-instructions.md if needed
```

### For Copy-Paste

```bash
rm -rf .ai-assisted-work/

# Manually remove AI-Assisted Work sections from .github/copilot-instructions.md
# Manually remove aiaw-* files from .cursor/rules/
# Manually remove aiaw-* files from .claude/commands/

git add -A
git commit -m "Remove AI-Assisted Work"
```

---

## Troubleshooting

### Issue: Paths Not Found

**Symptom:** Copilot or Cursor says it can't find the instruction file

**Solution:**
- Ensure paths use `.ai-assisted-work/skill-definitions/` (not `agents/`)
- Work management: `.ai-assisted-work/skill-definitions/work-management/`
- Check file permissions and that the submodule or copy is present

### Issue: Commands Not Working

**Symptom:** `/aiaw-start-work` not recognized

**Solution:**
1. Verify `.github/copilot-instructions.md` (or Cursor rules / Claude commands) contains the command and points to `.ai-assisted-work/skill-definitions/...`
2. Restart the AI assistant extension
3. Try referencing the file explicitly: `.ai-assisted-work/skill-definitions/work-management/start-work.md`

### Issue: File Conflicts During Copy

**Symptom:** "File already exists" error

**Solution:**
- This shouldn't happen if following the guide correctly (everything goes under `.ai-assisted-work/`)
- If `.ai-assisted-work/` already exists, replace its contents or use a different submodule path
- Ensure all paths in wrappers point to `.ai-assisted-work/skill-definitions/`

---

## See Also

- [skill-definitions/work-management/](skill-definitions/work-management/README.md) - Work management instructions and README
- [skills-for-agents/](skills-for-agents/) - Command wrappers for Cursor, Claude, GitHub
- [Command Discovery](docs/integration/command-discovery.md) - How commands work across AI assistants
- [Getting Started](docs/getting-started/index.md) - First steps and concepts

---

## Support

For questions or issues:
- Open an issue: https://github.com/dermot-obrien/ai-assisted-work/issues
- See documentation: [docs/](docs/)
