# Deployment Guide

This guide explains how to deploy AI-Assisted Work into your existing project using two methods: **Git Submodule** or **Copy-Paste**.

## Key Design Principle

Both deployment methods place AI-Assisted Work in an isolated `.ai-assisted-work/` folder. This ensures:

✅ **Safe deployment** - Nothing overwrites your existing project files.  
✅ **Clean integration** - AI Work Management stays in its own space.  
✅ **Easy removal** - Delete the `.ai-assisted-work/` folder to remove.  
✅ **Consistent paths** - Both methods use the same `.ai-assisted-work/` prefix.  

**Delta files** are then added to external folders (like `.github/`) as needed.

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

If you use GitHub Copilot, copy the delta file for reference:

```bash
# Create .github folder if it doesn't exist
mkdir -p .github

# Copy the delta file (unique name - won't overwrite anything)
cp .ai-assisted-work/agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/
```

**Then manually merge into your `.github/copilot-instructions.md`:**

1. Open `.github/copilot-instructions-ai-assisted-work.md` to see the commands
2. Create or open your `.github/copilot-instructions.md`
3. Copy the relevant command sections into your file
4. The delta file includes pre-adjusted paths for `.ai-assisted-work/`

See [Manual Merge Instructions](#manual-merge-instructions) for detailed guidance.

### Step 3: Integrate with Cursor (Optional)

If you use Cursor:

```bash
# Create .cursor/rules folder if it doesn't exist
mkdir -p .cursor/rules

# Copy Cursor rules (aiaw- prefix - safe to copy directly)
cp .ai-assisted-work/.cursor/rules/aiaw-*.mdc .cursor/rules/
```

**Note:** Cursor rule files (`start-work.mdc`, `progress-work.mdc`, etc.) have unique names specific to AI-Assisted Work, so they won't overwrite any existing rules you may have.

### Step 3b: Integrate with Claude Code (Optional)

If you use Claude Code:

```bash
# Create .claude/commands folder if it doesn't exist
mkdir -p .claude/commands

# Copy Claude Code commands
cp .ai-assisted-work/.claude/commands/*.md .claude/commands/
```

**Note:** Claude Code commands are minimal wrappers that point to the full agent instructions in `.ai-assisted-work/agents/`.

### Step 4: Commit

```bash
git add .gitmodules .ai-assisted-work .github .cursor
git commit -m "Add AI-Assisted Work as submodule"
```

### Updating Later

```bash
cd .ai-assisted-work
git pull origin main
cd ..
git add .ai-assisted-work
git commit -m "Update AI-Assisted Work"
```

---

## Deployment Method 2: Copy-Paste

**Key principle:** Copy everything into `.ai-assisted-work/` folder (same location as submodule), then add delta files externally.

### Step 1: Clone Temporarily

```bash
# Clone to a temporary location
git clone https://github.com/dermot-obrien/ai-assisted-work.git /tmp/ai-assisted-work
```

### Step 2: Copy to .ai-assisted-work/ Folder

```bash
# Create the .ai-assisted-work folder and copy contents
mkdir -p .ai-assisted-work
cp -r /tmp/ai-assisted-work/.claude .ai-assisted-work/
cp -r /tmp/ai-assisted-work/.cursor .ai-assisted-work/
cp -r /tmp/ai-assisted-work/agents .ai-assisted-work/
cp -r /tmp/ai-assisted-work/docs .ai-assisted-work/
cp -r /tmp/ai-assisted-work/examples .ai-assisted-work/
cp -r /tmp/ai-assisted-work/schemas .ai-assisted-work/
cp -r /tmp/ai-assisted-work/scripts .ai-assisted-work/

# Optional: Copy reference files
cp /tmp/ai-assisted-work/DEPLOYMENT.md .ai-assisted-work/
cp /tmp/ai-assisted-work/STRUCTURE.md .ai-assisted-work/
cp /tmp/ai-assisted-work/README.md .ai-assisted-work/
```

**Important:** All AI-Assisted Work content stays inside `.ai-assisted-work/`. This matches the submodule structure and ensures no file conflicts.

### Step 3: Integrate with GitHub Copilot (Optional)

GitHub Copilot requires `.github/copilot-instructions.md` at your project root. We provide a **delta file** for you to manually merge.

```bash
# Create .github folder if it doesn't exist
mkdir -p .github

# Copy the delta file (unique name - won't overwrite anything)
cp .ai-assisted-work/agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/
```

**Then manually merge into your `.github/copilot-instructions.md`:**

1. Open `.github/copilot-instructions-ai-assisted-work.md` to see the commands
2. Create or open your `.github/copilot-instructions.md`
3. Copy the relevant command sections into your file
4. The delta file includes pre-adjusted paths for `.ai-assisted-work/`

See [Manual Merge Instructions](#manual-merge-instructions) below for detailed guidance.

### Step 4: Integrate with Cursor (Optional)

Cursor rules have **unique filenames** specific to AI-Assisted Work (`start-work.mdc`, `progress-work.mdc`, etc.), so they can be safely copied directly to `.cursor/rules/` without risk of overwriting existing files.

```bash
# Create .cursor/rules folder if it doesn't exist
mkdir -p .cursor/rules

# Copy Cursor rules (safe - aiaw- prefix avoids conflicts)
cp .ai-assisted-work/.cursor/rules/aiaw-*.mdc .cursor/rules/
```

**Note:** If you happen to have rules with the same names (unlikely), manually merge them instead.

### Step 4b: Integrate with Claude Code (Optional)

If you use Claude Code:

```bash
# Create .claude/commands folder if it doesn't exist
mkdir -p .claude/commands

# Copy Claude Code commands
cp .ai-assisted-work/.claude/commands/*.md .claude/commands/
```

**Note:** Claude Code commands are minimal wrappers that point to the full agent instructions in `.ai-assisted-work/agents/`.

### Step 5: Clean Up and Commit

```bash
# Remove temporary clone
rm -rf /tmp/ai-assisted-work

# Commit to your project
git add .ai-assisted-work/ .github/ .cursor/
git commit -m "Add AI-Assisted Work"
```

### Updating Later

```bash
# Clone fresh copy
git clone https://github.com/dermot-obrien/ai-assisted-work.git /tmp/ai-assisted-work

# Update .ai-assisted-work folder
rm -rf .ai-assisted-work/agents .ai-assisted-work/docs .ai-assisted-work/examples
cp -r /tmp/ai-assisted-work/agents .ai-assisted-work/
cp -r /tmp/ai-assisted-work/docs .ai-assisted-work/
cp -r /tmp/ai-assisted-work/examples .ai-assisted-work/

# Clean up
rm -rf /tmp/ai-assisted-work

# Commit
git add .ai-assisted-work/
git commit -m "Update AI-Assisted Work"
```

---

## Project Structure After Deployment

Both deployment methods result in the **same structure**:

```
your-project/
├── .ai-assisted-work/                             ← AI-Assisted Work (isolated)
│   ├── .claude/commands/                ← Claude Code commands (source)
│   ├── agents/
│   │   ├── github-copilot/              ← Delta templates
│   │   ├── work-management/             ← Agent definitions
│   │   ├── image-management/
│   │   └── cursor-rules/
│   ├── docs/
│   ├── examples/
│   └── schemas/
├── .claude/
│   └── commands/                        ← Copied from .ai-assisted-work
├── .github/
│   └── copilot-instructions.md          ← Delta file (manually added)
├── .cursor/
│   └── rules/
│       └── *.mdc                         ← Copied files (unique names)
└── [your existing project files]        ← Completely untouched
```

---

## What Goes Where

| Content | Location | Why |
|---------|----------|-----|
| **All AI-Assisted Work content** | `.ai-assisted-work/` | Isolated, no conflicts |
| **Claude Code commands** | `.claude/commands/*.md` | Required location by Claude Code |
| **GitHub Copilot instructions** | `.github/copilot-instructions.md` | Required location by GitHub Copilot |
| **Cursor rules** | `.cursor/rules/*.mdc` | Required location by Cursor |

### Delta Files vs Direct Copy

| File Type | Strategy | Reason |
|-----------|----------|--------|
| `.github/copilot-instructions.md` | **Delta** (manual merge) | User likely has existing file |
| `.claude/commands/*.md` | **Direct copy** (safe) | Minimal wrappers, no conflict risk |
| `.cursor/rules/*.mdc` | **Direct copy** (safe) | Unique filenames, no conflict risk |

---

## Manual Merge Instructions

If you already have `.github/copilot-instructions.md` in your project, you need to **manually merge** the AI-Assisted Work commands.

### Delta File Location

The delta file is at: `.github/copilot-instructions-ai-assisted-work.md` (after you copy it from `.ai-assisted-work/agents/github-copilot/`)

This file has a unique name that won't overwrite your existing configuration. Open it to see the commands, then copy what you need into your `.github/copilot-instructions.md`.

### Option 1: Append Section

Open your existing `.github/copilot-instructions.md` and append:

```markdown
---

## AI-Assisted Work Commands

When the user invokes one of these commands, read and follow the full agent instructions from the specified file.

### Work Management Agents

#### `/aiaw-start-work` - Initialize New Work Items

**Full instructions:** Read [`.ai-assisted-work/agents/work-management/start-work.md`](../.ai-assisted-work/agents/work-management/start-work.md)

**Required reading:**
- [`.ai-assisted-work/agents/work-management/AGENTS.md`](../.ai-assisted-work/agents/work-management/AGENTS.md)
- [`.ai-assisted-work/agents/work-management/README.md`](../.ai-assisted-work/agents/work-management/README.md)

**Purpose:** Create a new work item with scope, plan, and progress tracking.

#### `/aiaw-progress-work` - Continue Work on Items

[... continue with other commands from the template ...]
```

### Option 2: Reference by Inclusion

Add this to your existing `.github/copilot-instructions.md`:

```markdown
---

## AI-Assisted Work Integration

This project uses AI-Assisted Work for structured work management and image management.

When the user invokes `/aiaw-start-work`, `/aiaw-progress-work`, `/aiaw-pivot-work`, `/aiaw-work-status`, or `/aiaw-replace-ascii-diagrams`:

1. Read the full instructions from the corresponding file:
   - `/aiaw-start-work` → `.ai-assisted-work/agents/work-management/start-work.md`
   - `/aiaw-progress-work` → `.ai-assisted-work/agents/work-management/progress-work.md`
   - `/aiaw-pivot-work` → `.ai-assisted-work/agents/work-management/pivot-work.md`
   - `/aiaw-work-status` → `.ai-assisted-work/agents/work-management/work-status.md`
   - `/aiaw-replace-ascii-diagrams` → `.ai-assisted-work/agents/image-management/replace-ascii-diagrams.md`

2. Read supporting documentation:
   - `.ai-assisted-work/agents/work-management/AGENTS.md` - Agent rules
   - `.ai-assisted-work/agents/work-management/README.md` - Core concepts
   - `.ai-assisted-work/agents/image-management/AGENTS.md` - Image agent rules
   - `.ai-assisted-work/agents/image-management/README.md` - Image concepts

3. Follow the instructions exactly as written in those files
```

---

## Verification

### Test Claude Code Integration

1. Open Claude Code
2. Type: `/aiaw-start-work test work item`
3. Verify Claude reads `.claude/commands/aiaw-start-work.md`
4. Verify it follows the agent instructions from `.ai-assisted-work/agents/work-management/start-work.md`

### Test GitHub Copilot Integration

1. Open GitHub Copilot Chat
2. Type: `/aiaw-start-work test work item`
3. Verify Copilot reads the agent instructions from `.ai-assisted-work/agents/work-management/start-work.md`
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
│   ├── .claude/commands/                ← Claude Code commands (source)
│   ├── agents/
│   │   ├── github-copilot/              ← Delta templates
│   │   ├── work-management/             ← Agent definitions
│   │   ├── image-management/
│   │   └── cursor-rules/
│   ├── docs/
│   ├── examples/
│   └── README.md
├── .claude/
│   └── commands/                        ← Copied from .ai-assisted-work
├── .github/
│   └── copilot-instructions.md          ← Your file (manually merged or copied)
├── .cursor/
│   └── rules/
│       ├── your-rules.mdc
│       └── *.mdc                         ← Copied from .ai-assisted-work
└── [your project files]                  ← Untouched
```

### Copy-Paste Structure

```
your-project/
├── .ai-assisted-work/                   ← Copied from ai-assisted-work (isolated)
│   ├── .claude/commands/                ← Claude Code commands (source)
│   ├── agents/
│   │   ├── github-copilot/              ← Delta templates
│   │   ├── work-management/             ← Agent definitions
│   │   ├── image-management/
│   │   └── cursor-rules/
│   ├── docs/
│   └── examples/
├── .claude/
│   └── commands/                        ← Copied from .ai-assisted-work
├── .github/
│   └── copilot-instructions.md          ← Your file (manually merged or copied)
├── .cursor/
│   └── rules/
│       ├── your-rules.mdc
│       └── aiaw-*.mdc                   ← Copied from .ai-assisted-work/.cursor/rules
└── [your project files]                  ← Untouched
```

---

## What Gets Isolated (Safe for Copy-Paste)

All AI-Assisted Work files are in these folders:

| Folder | Contents | Safe to Copy? |
|--------|----------|---------------|
| `agents/` | Agent definitions, templates, rules | ✅ Yes - isolated |
| `docs/` | Documentation | ✅ Yes - can go in `docs/ai-assisted-work/` |
| `examples/` | Example work items | ✅ Yes - isolated |
| `schemas/` | YAML schemas | ✅ Yes - isolated |
| `scripts/` | Helper scripts | ✅ Yes - isolated |

**Files NOT copied automatically** (must be manually merged):

| File | Why | How to Handle |
|------|-----|---------------|
| `.github/copilot-instructions.md` | Would overwrite yours | Use `agents/github-copilot/copilot-instructions-ai-assisted-work.md` as delta (unique name) |
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
rm -rf agents/
rm -rf docs/ai-assisted-work/
rm -rf examples/ai-assisted-work/

# Manually remove from .github/copilot-instructions.md
# Manually remove from .cursor/rules/

git add -A
git commit -m "Remove AI-Assisted Work"
```

---

## Troubleshooting

### Issue: Paths Not Found

**Symptom:** Copilot says it can't find `agents/work-management/start-work.md`

**Solution:**
- **Submodule:** Ensure paths use `.ai-assisted-work/` prefix
- **Copy-paste:** Ensure `agents/` folder exists at project root
- Check file permissions

### Issue: Commands Not Working

**Symptom:** `/aiaw-start-work` not recognized

**Solution:**
1. Verify `.github/copilot-instructions.md` exists and contains the command
2. Restart GitHub Copilot extension
3. Try using `@workspace #file:agents/work-management/start-work.md` explicitly

### Issue: File Conflicts During Copy

**Symptom:** "File already exists" error

**Solution:**
- This shouldn't happen if following the guide correctly
- If `agents/` already exists from another system, use a different folder name like `ai-work-agents/`
- Update paths accordingly in copilot-instructions.md

---

## See Also

- [Claude Code Commands](.claude/commands/) - Claude Code command wrappers
- [GitHub Copilot Integration](agents/github-copilot/INTEGRATION.md) - Detailed Copilot setup
- [Cursor Rules](.cursor/rules/aiaw-index.mdc) - Cursor integration
- [Work Management Agents](agents/work-management/README.md) - Agent documentation
- [Examples](examples/work-management/) - Example work items

---

## Support

For questions or issues:
- Open an issue: https://github.com/dermot-obrien/ai-assisted-work/issues
- See documentation: [docs/](docs/)
