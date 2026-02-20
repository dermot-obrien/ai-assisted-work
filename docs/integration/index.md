# Integration Guide

How to integrate AI-Assisted Work into your projects.

> **New to AI-Assisted Work?** See [Command Discovery](command-discovery.md) to understand how commands work across different AI assistants (Cursor, GitHub Copilot, Claude Code).

## Integration Options

### Option 1: Git Submodule (Recommended)

Best for: Projects wanting to stay current with updates and contribute back.

**Step 1: Fork the repository** (enables contributions)

1. Go to [https://github.com/dermot-obrien/ai-assisted-work](https://github.com/dermot-obrien/ai-assisted-work)
2. Click "Fork" to create your own copy
3. Your fork is at: `https://github.com/YOUR-USERNAME/ai-assisted-work`

**Step 2: Add your fork as a submodule**

Linux/Mac:
```bash
# Add your fork as submodule
git submodule add https://github.com/YOUR-USERNAME/ai-assisted-work.git .ai-assisted-work

# Initialize
git submodule update --init

# Update later
git submodule update --remote
```

Windows (PowerShell):
```powershell
# Add your fork as submodule
git submodule add https://github.com/YOUR-USERNAME/ai-assisted-work.git .ai-assisted-work

# Initialize
git submodule update --init

# Update later
git submodule update --remote
```

**Structure:**
```
your-project/
├── .ai-assisted-work/          # Submodule (your fork)
│   ├── skill-definitions/      # Full instructions
│   └── skills-for-agents/      # Command wrappers (copy from here)
├── work/                       # Your work items
└── .cursor/rules/              # Copy from .ai-assisted-work/skills-for-agents/cursor/
```

### Option 2: Direct Copy

Best for: One-time use, heavy customization.

1. Download or clone the repository
2. Copy the full repo into `.ai-assisted-work/` (see [DEPLOYMENT.md](../../DEPLOYMENT.md) for step-by-step copy-paste)

Linux/Mac:
```bash
mkdir -p .ai-assisted-work
cp -r ai-assisted-work/. .ai-assisted-work/
```

### Option 3: Fork Only

Best for: Organizations wanting full control without submodules.

1. Fork the repository on GitHub
2. Clone your fork directly into your project structure
3. Customize as needed

---

## Cursor Integration

### Copy Rules (Won't Overwrite)

The Cursor rule files use an `aiaw-` prefix (`aiaw-start-work.mdc`, `aiaw-progress-work.mdc`, etc.) so they won't overwrite your existing rules.

Linux/Mac:
```bash
# Create rules directory if needed
mkdir -p .cursor/rules

# Copy from submodule (wrappers point to .ai-assisted-work/skill-definitions/)
cp .ai-assisted-work/skills-for-agents/cursor/commands/aaw/*.md .cursor/rules/
# Rename to .mdc if your Cursor version expects that extension
```

Windows (PowerShell):
```powershell
# Create rules directory if needed
New-Item -ItemType Directory -Force -Path .cursor\rules

# Copy from submodule
Copy-Item .ai-assisted-work\skills-for-agents\cursor\commands\aaw\*.md .cursor\rules\
```

### Available Commands

| Command | Purpose | Instruction File |
|---------|---------|-------------------|
| `/aiaw-start-work` | Initialize new work item | `.ai-assisted-work/skill-definitions/work-management/start-work.md` |
| `/aiaw-progress-work` | Continue work on existing item | `.ai-assisted-work/skill-definitions/work-management/progress-work.md` |
| `/aiaw-work-status` | Check status of work items | `.ai-assisted-work/skill-definitions/work-management/work-status.md` |
| `/aiaw-next-task` | Identify next task to work on | `.ai-assisted-work/skill-definitions/work-management/next-task.md` |

---

## Claude Code Integration

Reference agents in prompts:

```bash
claude "Follow the instructions in .ai-assisted-work/skill-definitions/work-management/start-work.md 
to create a work item for: {description}"
```

---

## GitHub Copilot Integration

### Option A: Direct Reference (Quick)

Use `@workspace` with agent files:

```
@workspace #file:.ai-assisted-work/skill-definitions/work-management/start-work.md
Initialize a work item for {description}
```

### Option B: Custom Instructions (Recommended)

Copy the delta file for reference and manual merge:

Linux/Mac:
```bash
# Copy command wrappers for reference
mkdir -p .github
cp .ai-assisted-work/skills-for-agents/github/skills/aaw/*.md .github/

# Then manually merge content into your .github/copilot-instructions.md
```

Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Force -Path .github
Copy-Item .ai-assisted-work\skills-for-agents\github\skills\aaw\*.md .github\
# Then manually merge content into your .github\copilot-instructions.md
```

**Important:** The wrappers point to `.ai-assisted-work/skill-definitions/`. Open them and merge the command definitions into your `.github/copilot-instructions.md`.

---

## Work Item Location

By convention, work items live in `work/`:

```
your-project/
├── work/
│   ├── WI-001/
│   │   ├── scope.md
│   │   ├── plan.md
│   │   ├── progress.yaml
│   │   └── deliverables/
│   └── WI-002/
│       └── ...
└── ...
```

Customize the location by telling agents where to create work items.

---

## Domain-Specific Integration

### With AI-Assisted Architecture

```
architecture-project/
├── .ai-assisted-work/           # AI-Assisted Work submodule (your fork)
│   ├── skill-definitions/      # Full instructions
│   └── skills-for-agents/      # Command wrappers
├── methodology/                 # Architecture-specific
├── building-blocks/             # Architecture-specific
├── work/                        # Work items (use .ai-assisted-work skill-definitions)
│   └── WI-001/
│       ├── scope.md
│       ├── plan.md
│       └── progress.yaml
└── .cursor/rules/
    ├── aiaw-start-work.md      # From .ai-assisted-work/skills-for-agents/cursor/
    └── architecture.mdc        # Architecture-specific (your own)
```

### With Any Project Type

The agents are domain-agnostic. Just:

1. Fork the repository (enables contributions)
2. Add your fork as submodule to `.ai-assisted-work/`
3. Copy Cursor rules (optional)
4. Start creating work items

---

## Customization

### Custom Templates

Override templates in your project:

```
your-project/
├── .ai-assisted-work/           # Submodule (don't modify)
├── templates/                   # Your overrides
│   ├── scope.md                # Custom scope template
│   └── plan.md                 # Custom plan template
└── ...
```

Tell agents to use your templates instead of defaults.

### Custom Agents

Add project-specific agents:

```
your-project/
├── .ai-assisted-work/           # Submodule
├── .agents/                     # Your custom agents (optional)
│   └── code-review.md          # Project-specific agent
└── .cursor/rules/
    ├── aiaw-start-work.md      # From .ai-assisted-work/skills-for-agents/cursor/
    └── code-review.mdc         # Your custom rule
```

---

## Contributing Back

If you've forked the repository:

1. Make improvements in your fork
2. Create a pull request to the upstream repository
3. Your changes can benefit the community

```bash
# Add upstream remote (one-time)
git remote add upstream https://github.com/dermot-obrien/ai-assisted-work.git

# Sync your fork with upstream
git fetch upstream
git merge upstream/main
```

---

## Best Practices

### Do

- ✅ Fork first to enable contributions
- ✅ Keep submodule up to date
- ✅ Put work items in `work/` folder
- ✅ Use consistent work item IDs
- ✅ Commit work items to version control

### Don't

- ❌ Modify files inside submodule directly
- ❌ Scatter work items across project
- ❌ Skip progress.yaml updates
