# Repository Structure - Safe Deployment Design

This document explains how the repository is structured to enable safe copy-paste deployment without file conflicts.

## Design Principle

**All AI-Assisted Work files are in isolated folders.**

This ensures that when users copy this repository into their existing project, nothing gets overwritten.

---

## Safe Folder Structure

```
ai-assisted-work/
├── .claude/                             ✅ ISOLATED - Claude Code commands
│   └── commands/
│       ├── start-work.md
│       ├── progress-work.md
│       ├── pivot-work.md
│       ├── work-status.md
│       └── replace-ascii-diagrams.md
├── agents/                              ✅ ISOLATED - Safe to copy
│   ├── github-copilot/                  ← Delta templates (for manual merge)
│   │   ├── copilot-instructions-ai-assisted-work.md  ← Delta file (unique name, won't overwrite)
│   │   └── INTEGRATION.md               ← Manual merge instructions
│   ├── work-management/                 ← Agent definitions
│   │   ├── AGENTS.md
│   │   ├── README.md
│   │   ├── start-work.md
│   │   ├── progress-work.md
│   │   ├── pivot-work.md
│   │   ├── work-status.md
│   │   └── _templates/
│   └── image-management/                ← Image agent definitions
│       ├── AGENTS.md
│       ├── README.md
│       └── replace-ascii-diagrams.md
├── .cursor/                             ✅ ISOLATED - Cursor rules with aiaw- prefix
│   └── rules/
│       ├── aiaw-index.mdc
│       ├── aiaw-start-work.mdc
│       ├── aiaw-progress-work.mdc
│       ├── aiaw-pivot-work.mdc
│       ├── aiaw-work-status.mdc
│       └── aiaw-replace-ascii-diagrams.mdc
├── docs/                                ✅ ISOLATED - Safe to copy to docs/ai-work/
│   ├── getting-started/
│   ├── integration/
│   └── about/
├── examples/                            ✅ ISOLATED - Safe to copy
│   ├── work-management/
│   └── image-management/
├── schemas/                             ✅ ISOLATED - Safe to copy
│   └── progress.yaml
├── scripts/                             ✅ ISOLATED - Safe to copy
│   └── [helper scripts]
├── .github/                             ⚠️  FOR THIS REPO ONLY
│   ├── README.md                        ← Explains DO NOT COPY
│   ├── copilot-instructions.md          ← For ai-assisted-work development
│   ├── COPILOT-INTEGRATION.md           ← Historical reference
│   ├── VALIDATION.md                    ← Development validation
│   └── workflows/                       ← GitHub Actions for this repo
├── DEPLOYMENT.md                        📖 Main deployment guide
├── README.md                            📖 Project overview
├── CONTRIBUTING.md                      📖 Contribution guidelines
├── CHANGELOG.md                         📖 Version history
└── LICENSE                              📖 License information
```

---

## What Gets Copied vs. Merged

### ✅ Direct Copy (No Conflicts)

These folders can be copied directly into your project without any risk:

| Folder | Target Location | Conflict Risk |
|--------|----------------|---------------|
| `.claude/commands/` | `your-project/.claude/commands/` | ✅ None - isolated folder |
| `agents/` | `your-project/agents/` | ✅ None - isolated folder |
| `docs/` | `your-project/docs/ai-work/` | ✅ None - isolated subfolder |
| `examples/` | `your-project/examples/ai-work/` | ✅ None - isolated subfolder |
| `schemas/` | `your-project/schemas/` | ✅ None - isolated folder |
| `scripts/` | `your-project/scripts/ai-work/` | ✅ None - isolated subfolder |

### 📝 Manual Merge Required

These files require manual intervention:

| File | Why | Solution |
|------|-----|----------|
| `.github/copilot-instructions.md` | Would overwrite user's existing file | Use `agents/github-copilot/copilot-instructions-ai-assisted-work.md` as delta (unique name) |
| `.cursor/rules/*.mdc` | Might conflict with user's rules | Copy to `.cursor/rules/` (usually safe, but check) |

### ❌ Do Not Copy

These files are specific to the ai-assisted-work repository:

| File | Why |
|------|-----|
| `.github/copilot-instructions.md` | For ai-assisted-work development only |
| `.github/workflows/` | GitHub Actions for this repo |
| `README.md` | This project's readme |
| `.gitignore` | This project's ignore rules |
| `LICENSE` | This project's license |
| `CONTRIBUTING.md` | This project's contribution guide |

---

## Deployment Scenarios

### Scenario 1: Git Submodule (Recommended)

**Structure after deployment:**

```
your-project/
├── .ai-assisted-work/                            ← Submodule (completely isolated)
│   ├── .claude/commands/                         ← Claude Code commands
│   ├── agents/
│   ├── docs/
│   ├── examples/
│   └── ... (all ai-assisted-work files)
├── .claude/
│   └── commands/                                 ← Copied from .ai-assisted-work/.claude/commands/
├── .github/
│   ├── copilot-instructions.md                  ← Your file (manually created/updated)
│   └── copilot-instructions-ai-assisted-work.md ← Delta file (for reference)
├── .cursor/
│   └── rules/
│       └── aiaw-*.mdc                   ← Copied from .ai-assisted-work/.cursor/rules/
└── [your existing project files]        ← Completely untouched
```

**Advantages:**
- ✅ Perfect isolation - submodule is completely separate
- ✅ Easy updates - `git pull` in submodule
- ✅ Zero file conflicts
- ✅ Can track upstream changes

### Scenario 2: Copy-Paste

**Structure after deployment:**

```
your-project/
├── .claude/
│   └── commands/                        ← Copied from ai-assisted-work/.claude/commands/
├── agents/                              ← Copied from ai-assisted-work
│   ├── github-copilot/                  ← Contains delta templates
│   ├── work-management/
│   ├── image-management/
│   └── cursor-rules/
├── docs/
│   ├── your-docs/                       ← Your existing docs
│   └── ai-work/                          ← Copied from ai-assisted-work/docs
├── .github/
│   ├── copilot-instructions.md                  ← Your file (manually created/updated)
│   └── copilot-instructions-ai-assisted-work.md ← Delta file (for reference)
├── .cursor/
│   └── rules/
│       └── aiaw-*.mdc                   ← Copied from agents/cursor-rules/
└── [your existing project files]        ← Completely untouched
```

**Advantages:**
- ✅ No submodule complexity
- ✅ Full control over files
- ✅ Easy customization
- ✅ Zero file conflicts (with manual merge)

---

## Delta Templates

**Delta templates** are files designed for manual merging into existing files.

### Location: `agents/github-copilot/`

| Template File | Target File | Purpose |
|---------------|-------------|---------|
| `copilot-instructions-ai-assisted-work.md` | `.github/copilot-instructions-ai-assisted-work.md` | Delta file for manual merge (unique name) |
| `INTEGRATION.md` | N/A | Manual merge instructions |

### How to Use Delta Templates

1. **Copy the delta file** (unique name - won't overwrite anything)
2. **Manually merge** the content into your existing file

**Example:**

```bash
# Copy delta file (unique name - safe, won't overwrite)
mkdir -p .github
cp agents/github-copilot/copilot-instructions-ai-assisted-work.md .github/

# Now manually merge content into your copilot-instructions.md
echo "Delta file copied to .github/copilot-instructions-ai-assisted-work.md"
echo "Manually merge content into your .github/copilot-instructions.md"
```

---

## Cursor Rules

Cursor rules (`.mdc` files) use an `aiaw-` prefix so they're safe to copy directly:

```bash
mkdir -p .cursor/rules
cp .cursor/rules/aiaw-*.mdc .cursor/rules/
```

**Why safe?**
- `aiaw-` prefix avoids conflicts with existing rules
- Cursor merges rules from multiple files
- Each `.mdc` file is a separate rule

---

## Path References

### In Delta Templates

Templates use **relative paths** that work for both scenarios:

```markdown
[`agents/work-management/start-work.md`](../agents/work-management/start-work.md)
```

### After Submodule Deployment

Update paths to include `.ai-assisted-work/` prefix:

```markdown
[`.ai-assisted-work/agents/work-management/start-work.md`](../.ai-assisted-work/agents/work-management/start-work.md)
```

### After Copy-Paste Deployment

Paths remain as-is (agents are at project root):

```markdown
[`agents/work-management/start-work.md`](../agents/work-management/start-work.md)
```

---

## Verification Checklist

After deployment, verify the structure:

### Submodule Deployment

- [ ] `.ai-assisted-work/` folder exists
- [ ] `.ai-assisted-work/agents/` contains agent definitions
- [ ] `.claude/commands/` copied from `.ai-assisted-work/.claude/commands/`
- [ ] `.github/copilot-instructions.md` references `.ai-assisted-work/agents/`
- [ ] `.cursor/rules/*.mdc` files reference `.ai-assisted-work/agents/`
- [ ] No files from `.ai-assisted-work/` at project root
- [ ] Your existing project files are untouched

### Copy-Paste Deployment

- [ ] `agents/` folder at project root
- [ ] `agents/work-management/` contains agent definitions
- [ ] `.claude/commands/` folder copied
- [ ] `agents/github-copilot/copilot-instructions-ai-assisted-work.md` exists as delta
- [ ] `.github/copilot-instructions-ai-assisted-work.md` copied for reference
- [ ] Content merged into `.github/copilot-instructions.md`
- [ ] `.cursor/rules/*.mdc` files copied
- [ ] Your existing project files are untouched

---

## Benefits of This Structure

### 1. Zero File Conflicts
All AI-Assisted Work content is in isolated folders that won't conflict with typical project structures.

### 2. Clear Separation
It's obvious what belongs to AI-Assisted Work (`agents/`, `docs/ai-work/`) vs. your project.

### 3. Easy Removal
Don't like it? Just delete the `agents/` folder (and optionally `docs/ai-work/`).

### 4. Update Flexibility
- **Submodule:** Pull updates easily
- **Copy-paste:** Cherry-pick updates manually

### 5. Transparent Integration
Delta templates make it clear when manual merging is needed.

---

## Migration from Old Structure

If you deployed an earlier version where files were in different locations:

### Old Location → New Location

| Old | New | Action |
|-----|-----|--------|
| `.github/copilot-instructions.md` (operational) | `agents/github-copilot/copilot-instructions-ai-assisted-work.md` (delta) | Unique name, won't overwrite |
| `.github/COPILOT-INTEGRATION.md` | `agents/github-copilot/INTEGRATION.md` | Moved to agents/ |
| Root level agent files | `agents/work-management/` | Already correct |

**For existing deployments:** No action needed. The new structure is for new deployments.

---

## See Also

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Main deployment guide
- [agents/github-copilot/INTEGRATION.md](../agents/github-copilot/INTEGRATION.md) - Copilot integration details
- [.cursor/rules/aiaw-index.mdc](../.cursor/rules/aiaw-index.mdc) - Cursor integration overview
