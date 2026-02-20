# Vision

The strategic vision for AI-Assisted Work.

## The Problem

### Fragmented AI Tooling

Every project reinvents the wheel for AI-assisted work:

| Problem | Impact |
|---------|--------|
| **Duplicate effort** | Same agents written repeatedly |
| **Inconsistent patterns** | Different approaches in each project |
| **No reuse** | Work management tied to specific domains |
| **Learning curve** | Each project has unique patterns |

### Domain Coupling

Work management shouldn't be domain-specific:

- Starting work is the same in architecture as in development
- Progress tracking works the same way everywhere

---

## The Vision

### Domain-Agnostic Foundation

AI-Assisted Work provides a **reusable foundation**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Your Domain Project                                │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  Domain-Specific Content                                                │   │
│   │  • Methodology                                                          │   │
│   │  • Templates                                                            │   │
│   │  • Building blocks                                                      │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│                                       │ Uses                                    │
│                                       ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  AI-Assisted Work (Submodule)                                           │   │
│   │  • Work management agents                                               │   │
│   │  • Common templates                                                     │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Domain-Agnostic** | No assumptions about the type of work |
| **Reusable** | Embed in any project via submodule |
| **Customizable** | Organizations can extend and adapt |
| **Community-Driven** | Contributions improve the foundation |
| **Tool-Neutral** | Works with Cursor, Claude Code, Copilot |

---

## What We're Building

### 1. Work Management Agents

Universal agents for managing any type of work:

| Agent | Purpose | Domain Examples |
|-------|---------|-----------------|
| **Start Work** | Initialize work items | Architecture decisions, dev tasks, research |
| **Progress Work** | Execute and track | Any multi-step work |
| **Work Status** | Report progress | Universal |
| **Pivot Work** | Rescope and replan | When requirements change |
| **Complete Work** | Finalize and close | Universal |

### 2. Common Templates

Reusable templates for work items:

| Template | Purpose |
|----------|---------|
| **scope.md** | Define work scope |
| **plan.md** | Break down into tasks |
| **progress.yaml** | Track status |

### 3. Integration Patterns

How to embed in other projects:

- Git submodule approach
- Direct copy approach
- Cursor rules integration

---

## Target Users

### Individual Contributors

- Personal projects using AI assistance
- Side projects and experiments
- Learning and exploration

### Development Teams

- Software development projects
- DevOps and infrastructure work
- Technical documentation

### Architecture Teams

- Enterprise architecture
- Solution architecture
- Platform architecture

### Organizations

- Standardize AI-assisted work practices
- Customize for organizational needs
- Contribute improvements back

---

## Success Criteria

| Metric | Target |
|--------|--------|
| **Adoption** | Multiple domain projects using as submodule |
| **Contributions** | Community improvements flowing back |
| **Reuse** | Same agents working across domains |
| **Independence** | No domain-specific assumptions |

---

## Non-Goals

What this project is **not**:

| Non-Goal | Why |
|----------|-----|
| **Domain methodology** | That's for domain-specific projects |
| **Building blocks** | Domain-specific content |
| **Full project management** | We manage work items, not projects |
| **Replacement for Jira/etc** | Complementary, not replacement |

---

## Future Direction

### Short-Term

- Complete agent suite
- Integration documentation
- Example implementations

### Medium-Term

- Additional utility agents
- Enhanced templates
- More tool integrations

### Long-Term

- Community-contributed agents
- Organizational extensions
- Plugin ecosystem

---

## Call to Action

### For Individuals

1. Try the agents on a personal project
2. Share feedback
3. Contribute improvements

### For Organizations

1. Evaluate for adoption
2. Fork and customize
3. Contribute generic improvements back

### For Domain Projects

1. Embed as submodule
2. Build on the foundation
3. Keep domain-specific content separate
