# GitHub Copilot Integration Guide

This guide covers both deployment scenarios for integrating AI-Assisted Work with GitHub Copilot.

## Deployment Scenarios

### Scenario 1: Git Submodule (Recommended)

**Advantages:**
- Easy to update when AI-Assisted Work evolves
- No file conflicts
- Clean separation

**Setup:**

```bash
# Add as submodule
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
git submodule update --init

# Copy the delta file (unique name - won't overwrite anything)
mkdir -p .github
cp .ai-assisted-work/agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/

# Then manually merge content into your .github/copilot-instructions.md
# The delta file includes pre-adjusted paths for .ai-assisted-work/
```

### Scenario 2: Copy-Paste (Standalone)

**Advantages:**
- No git submodule complexity
- Full control over files
- Can customize freely

**Setup:**

```bash
# Clone the repository
git clone https://github.com/dermot-obrien/ai-assisted-work.git ai-work-temp

# Copy agents folder to your project
cp -r ai-work-temp/agents your-project/agents/

# Copy documentation (optional)
cp -r ai-work-temp/docs your-project/docs/ai-work/

# Clean up
rm -rf ai-work-temp
```

**Copy delta file and merge manually:**

```bash
# Copy the delta file (unique name - won't overwrite anything)
mkdir -p .github
cp agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/

# Then manually merge content into your .github/copilot-instructions.md
```

The `copilot-instructions-ai-assisted-work.md` file has a unique name and won't overwrite your existing configuration.

---

## Manual Merge Instructions

If you already have `.github/copilot-instructions.md` in your project:

### Option A: Append Commands

Add the AI-Assisted Work commands to your existing instructions:

```markdown
# Your Existing GitHub Copilot Instructions

[... your existing content ...]

---

## AI-Assisted Work Commands

### Work Management Agents

#### `/start-work` - Initialize New Work Items

**Full instructions:** Read [`agents/work-management/start-work.md`](../agents/work-management/start-work.md)

**Required reading:**
- [`agents/work-management/AGENTS.md`](../agents/work-management/AGENTS.md)
- [`agents/work-management/README.md`](../agents/work-management/README.md)

**Purpose:** Create a new work item with scope, plan, and progress tracking.

[... continue with other commands ...]
```

### Option B: Create Separate Section

Add a clear section in your existing instructions:

```markdown
# GitHub Copilot Instructions - Your Project

## Your Project Commands

[... your existing commands ...]

---

## AI-Assisted Work Integration

This project uses AI-Assisted Work for structured work management.

**See:** [`agents/github-copilot/copilot-instructions.md`](../agents/github-copilot/copilot-instructions.md) for full details.

Available commands:
- `/start-work` - Initialize new work items
- `/progress-work` - Continue work on items
- `/pivot-work` - Rescope and replan
- `/work-status` - Report work status
- `/replace-ascii-diagrams` - Convert ASCII diagrams

For each command, refer to the corresponding agent file in `agents/work-management/` or `agents/image-management/`.
```

### Option C: Include by Reference

Use GitHub Copilot's ability to reference files:

```markdown
# GitHub Copilot Instructions - Your Project

## Your Project Commands

[... your existing commands ...]

---

## AI-Assisted Work Commands

When the user invokes `/start-work`, `/progress-work`, `/pivot-work`, `/work-status`, or `/replace-ascii-diagrams`:

1. Read the instructions from `agents/github-copilot/copilot-instructions.md`
2. Follow the agent workflow specified there
```

---

## Verification

To verify the integration works:

1. Open GitHub Copilot Chat
2. Type `/start-work test work item`
3. Verify Copilot reads `agents/work-management/start-work.md`
4. Verify it follows the agent instructions

---

## File Structure After Integration

### Submodule Deployment

```
your-project/
├── .github/
│   ├── copilot-instructions.md                  ← Your file (manually created/updated)
│   └── copilot-instructions-ai-assisted-work.md ← Delta file (for reference)
├── .ai-assisted-work/                           ← Submodule
│   ├── agents/
│   │   ├── github-copilot/
│   │   │   ├── copilot-instructions-ai-assisted-work.md  ← Delta source
│   │   │   └── INTEGRATION.md           ← This file
│   │   ├── work-management/
│   │   ├── image-management/
│   │   └── cursor-rules/
│   └── docs/
└── [your project files]
```

### Copy-Paste Deployment

```
your-project/
├── .github/
│   ├── copilot-instructions.md                  ← Your file (manually created/updated)
│   └── copilot-instructions-ai-assisted-work.md ← Delta file (for reference)
├── agents/                               ← Copied from ai-work
│   ├── github-copilot/
│   │   ├── copilot-instructions-ai-assisted-work.md  ← Delta source
│   │   └── INTEGRATION.md               ← This file
│   ├── work-management/
│   ├── image-management/
│   └── cursor-rules/
└── [your project files]
```

---

## Path Adjustments

### For Submodule Deployment

In your `.github/copilot-instructions.md`, update paths:

```markdown
# Before (from template)
[`agents/work-management/start-work.md`](../agents/work-management/start-work.md)

# After (for submodule at .ai-assisted-work/)
[`.ai-assisted-work/agents/work-management/start-work.md`](../.ai-assisted-work/agents/work-management/start-work.md)
```

### For Copy-Paste Deployment

Paths remain as-is in the template:

```markdown
[`agents/work-management/start-work.md`](../agents/work-management/start-work.md)
```

---

## Troubleshooting

### Copilot Not Reading Agent Files

**Symptom:** GitHub Copilot doesn't follow agent instructions

**Solution:**
1. Verify `.github/copilot-instructions.md` exists
2. Check file paths are correct
3. Try `@workspace #file:agents/work-management/start-work.md` explicitly

### Path Not Found Errors

**Symptom:** Copilot says it can't find agent files

**Solution:**
1. For submodule: Ensure paths include `.ai-assisted-work/` prefix
2. For copy-paste: Ensure `agents/` folder exists at project root
3. Check relative paths are correct

### Commands Not Working

**Symptom:** `/start-work` command not recognized

**Solution:**
1. Ensure commands are defined in `.github/copilot-instructions.md`
2. Try typing the command in Copilot Chat (not editor)
3. Verify GitHub Copilot extension is active

---

## Maintenance

### Updating Agent Behavior

**For submodule:**
```bash
cd .ai-assisted-work
git pull origin main
cd ..
git add .ai-assisted-work
git commit -m "Update AI-Assisted Work agents"
```

**For copy-paste:**
```bash
# Pull updates manually
git clone https://github.com/dermot-obrien/ai-assisted-work.git ai-work-temp
cp -r ai-work-temp/agents your-project/agents/
rm -rf ai-work-temp
```

### Adding New Commands

1. Create new agent file in `agents/work-management/` or `agents/image-management/`
2. Update `agents/github-copilot/copilot-instructions-ai-assisted-work.md` delta template
3. Manually merge into your `.github/copilot-instructions.md`

---

## See Also

- [Cursor Integration](../cursor-rules/index.mdc) - For Cursor IDE users
- [Work Management Agents](../work-management/README.md) - Core concepts
- [Image Management Agents](../image-management/README.md) - Image workflows
