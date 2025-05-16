# Integration Guide

How to integrate AI-Assisted Work into your projects.

## Integration Options

### Option 1: Git Submodule (Recommended)

Best for: Projects wanting to stay current with updates.

```bash
# Add as submodule
git submodule add https://github.com/dermotcanniffe/ai-assisted-work.git .ai-work

# Initialize
git submodule update --init

# Update later
git submodule update --remote
```

**Structure:**
```
your-project/
├── .ai-work/              # Submodule
│   └── agents/
├── work/                  # Your work items
└── .cursor/rules/         # Symlink or copy from .ai-work
```

### Option 2: Direct Copy

Best for: One-time use, heavy customization.

```bash
# Copy agents folder
cp -r ai-assisted-work/agents/ your-project/.agents/
```

### Option 3: Fork

Best for: Organizations wanting full control.

1. Fork the repository on GitHub
2. Clone your fork
3. Customize as needed
4. Use as submodule in projects

---

## Cursor Integration

### Copy Rules

```bash
# From submodule
cp .ai-work/agents/cursor-rules/*.mdc .cursor/rules/

# Or symlink (Unix/Mac)
ln -s ../.ai-work/agents/cursor-rules/*.mdc .cursor/rules/
```

### Available Commands

| Command | Purpose |
|---------|---------|
| `/start-work` | Initialize new work item |
| `/progress-work` | Continue work |
| `/work-status` | Check status |
| `/pivot-work` | Rescope |
| `/complete-work` | Finish work |
| `/replace-ascii` | Convert ASCII diagrams |

---

## Claude Code Integration

Reference agents in prompts:

```bash
claude "Follow the instructions in .ai-work/agents/work-management/start-work.md 
to create a work item for: {description}"
```

---

## GitHub Copilot Integration

Use `@workspace` with agent files:

```
@workspace #file:.ai-work/agents/work-management/start-work.md
Initialize a work item for {description}
```

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
├── .ai-work/                    # AI-Assisted Work submodule
│   └── agents/
├── methodology/                 # Architecture-specific
├── building-blocks/             # Architecture-specific
├── work/                        # Work items (use .ai-work agents)
│   └── WI-001/
│       ├── scope.md
│       ├── plan.md
│       └── progress.yaml
└── .cursor/rules/
    ├── start-work.mdc          # From .ai-work
    └── architecture.mdc        # Architecture-specific
```

### With Any Project Type

The agents are domain-agnostic. Just:

1. Add as submodule or copy
2. Set up Cursor rules (optional)
3. Start creating work items

---

## Customization

### Custom Templates

Override templates in your project:

```
your-project/
├── .ai-work/                    # Submodule (don't modify)
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
├── .ai-work/                    # Submodule
├── .agents/                     # Your custom agents
│   └── code-review.md          # Project-specific agent
└── .cursor/rules/
    ├── start-work.mdc          # From .ai-work
    └── code-review.mdc         # Your custom rule
```

---

## Best Practices

### Do

- ✅ Keep submodule up to date
- ✅ Put work items in `work/` folder
- ✅ Use consistent work item IDs
- ✅ Commit work items to version control

### Don't

- ❌ Modify files inside submodule
- ❌ Scatter work items across project
- ❌ Skip progress.yaml updates
