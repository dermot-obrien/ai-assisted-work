# Organization Adoption

How organizations can adopt, customize, and contribute to AI-Assisted Work.

## Adoption Options

### Option 1: Direct Use (Submodule)

Include as a Git submodule in your projects:

```bash
# Add submodule
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work

# Update when needed
git submodule update --remote
```

**Best for**: Teams wanting latest updates, minimal customization.

### Option 2: Fork and Customize

Fork the repository for organizational customization:

```bash
# Fork via GitHub
# Then clone your fork
git clone https://github.com/YOUR-ORG/ai-assisted-work.git
```

**Best for**: Organizations needing custom templates, branding, agents.

### Option 3: Copy and Own

Copy AI-Assisted Work into your project (see [DEPLOYMENT.md](../../DEPLOYMENT.md) for full steps). Typically you copy into `.ai-assisted-work/`; for a custom location, copy `skill-definitions/` and `skills-for-agents/` as needed.

**Best for**: One-off use, no update requirements.

---

## Fork and Customize Model

### Repository Structure

```
your-org-ai-assisted-work/
├── upstream/                    # Original content (don't modify)
│   └── (git subtree or reference)
│
├── overrides/                   # Your customizations
│   ├── templates/               # Custom templates
│   │   ├── scope.md            # Extended scope template
│   │   └── plan.md             # Extended plan template
│   ├── agents/                  # Agent customizations
│   └── branding/                # Org branding
│
├── org-agents/                  # Org-specific agents
│   └── your-custom-agent.md
│
└── ORG-CONFIG.yaml             # Configuration
```

### Configuration

```yaml
# ORG-CONFIG.yaml
organization:
  name: "Your Organization"
  short_name: "yourorg"

upstream:
  repository: "https://github.com/dermot-obrien/ai-assisted-work"
  version_pinned: "1.0.0"
  auto_sync: false

overrides:
  templates:
    - path: "templates/scope.md"
      reason: "Added compliance fields"
    - path: "templates/progress.yaml"
      reason: "Added cost tracking"

org_agents:
  - id: "compliance-check"
    path: "org-agents/compliance-check.md"
```

---

## Template Customization

### Extending Base Templates

Add organization fields without breaking core structure:

```yaml
# Your extended progress.yaml template
version: 1
status: in_progress

# Core fields (keep these)
activities: []

# Organization extension
org_metadata:
  cost_center: ""
  compliance_status: ""
  risk_level: ""
```

### Custom Templates

Create entirely new templates for org needs:

```
overrides/templates/
├── scope.md              # Extended scope
├── plan.md               # Extended plan
├── progress.yaml         # Extended progress
└── org-checklist.md      # Org-specific template
```

---

## Syncing Updates

### When to Sync

| Upstream Change | Action |
|-----------------|--------|
| Bug fix (patch) | Safe to sync |
| New agent (minor) | Review, then sync |
| Breaking change (major) | Careful migration |

### How to Sync

```bash
# Fetch upstream
git fetch upstream

# Review changes
git log HEAD..upstream/main --oneline

# Merge carefully
git merge upstream/main

# Resolve conflicts (your overrides take precedence)
```

### Version Pinning

For stability, pin to specific versions:

```yaml
upstream:
  version_pinned: "1.0.0"
```

Upgrade deliberately:

```bash
git fetch upstream
git checkout v1.1.0
```

---

## Contributing Back

### What to Contribute

| Contribution | Accepted |
|--------------|----------|
| Bug fixes | ✅ Yes |
| Agent improvements | ✅ If generic |
| Template enhancements | ✅ If generic |
| Org-specific content | ❌ Keep in your fork |

### Contribution Process

1. **Generalize**: Remove org-specific content
2. **Test**: Verify in generic context
3. **Document**: Update documentation
4. **PR**: Submit pull request

### Example: Contributing a Template Improvement

```bash
# Create contribution branch
git checkout -b contrib/improved-plan-template

# Copy your improved template
cp overrides/templates/plan.md contrib-plan.md

# Remove org-specific fields
# Edit to be generic

# Submit PR to upstream
```

---

## Integration Patterns

### Pattern 1: Submodule in Domain Project

```
architecture-project/
├── .ai-assisted-work/                    # Submodule
│   └── agents/
├── methodology/                 # Domain-specific
├── building-blocks/             # Domain-specific
└── work/                        # Uses .ai-assisted-work agents
```

### Pattern 2: Fork as Organizational Standard

```
org-work-standard/               # Your fork
├── agents/                      # Core + org agents
├── templates/                   # Core + org templates
└── docs/                        # Org documentation

# All org projects use this fork
project-a/
├── .ai-assisted-work -> org-work-standard
└── ...
```

### Pattern 3: Cherry-Pick Agents

```
your-project/
├── .agents/
│   ├── start-work.md           # Copied from ai-assisted-work
│   ├── progress-work.md        # Copied
│   └── org-review.md           # Org-specific
└── ...
```

---

## Best Practices

### Do

- ✅ Keep upstream content unmodified (in its folder)
- ✅ Use overrides for customizations
- ✅ Document why you override
- ✅ Contribute generic improvements
- ✅ Pin versions for stability

### Don't

- ❌ Modify upstream files directly
- ❌ Include org-specific info in contributions
- ❌ Auto-sync without review
- ❌ Create divergent forks without reason

---

## Support

### For Organizations

- GitHub Issues for bugs/questions
- GitHub Discussions for community support
- PR reviews for contributions

### Resources

- [Integration Guide](../integration/index.md)
- [Contributing Guide](../../CONTRIBUTING.md)
- [Design Decisions](design-decisions.md)
