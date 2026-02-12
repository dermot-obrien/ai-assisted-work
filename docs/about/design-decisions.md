# Design Decisions

Key design decisions for AI-Assisted Work.

**Author**: Dermot Canniffe  
**Date**: February 2026

---

## DD-01: Domain-Agnostic Design

### Context

Work management patterns are similar across domains but often get coupled to specific project types.

### Decision

Keep all agents and templates **completely domain-agnostic**:

- No architecture-specific terminology
- No development-specific assumptions
- No research-specific patterns

### Rationale

- Maximizes reusability
- Enables embedding in any project
- Reduces maintenance burden
- Single source of truth for work management

### Consequences

- Domain-specific extensions live in domain repositories
- Templates are generic (users add specificity)

---

## DD-02: Submodule-First Design

### Context

Need to share agents across repositories without duplication.

### Decision

Design for **Git submodule** usage as primary integration method:

```
domain-project/
├── .ai-assisted-work/          # Submodule
│   └── agents/
└── work/              # Domain work items
```

### Rationale

- Single source of truth
- Easy updates via submodule pull
- Clean separation of concerns
- Version pinning available

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Package manager | Overhead for documentation/templates |
| Copy-paste | No update path |
| Monorepo | Too coupled |

---

## DD-03: File-Based Work Tracking

### Context

Work items need tracking without requiring external tools.

### Decision

Track work in files within the repository:

```
work/WI-001/
├── scope.md           # Human-readable scope
├── plan.md            # Human-readable plan
└── progress.yaml      # Machine-readable status
```

### Rationale

- Version controlled with the work
- AI agents can read and update
- No external dependencies
- Portable across tools and organizations

### Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| Portable | No real-time collaboration |
| Version controlled | Manual sync with PM tools |
| AI-readable | Less rich than dedicated tools |

---

## DD-04: Single-Responsibility Agents

### Context

Agents need clear, predictable behavior.

### Decision

Each agent has **one clear purpose**:

| Agent | Single Purpose |
|-------|----------------|
| Start Work | Initialize work item structure |
| Progress Work | Execute tasks, update progress |
| Work Status | Report current status |
| Pivot Work | Rescope and replan |
| Complete Work | Finalize and close |

### Rationale

- Easier to test and validate
- Predictable behavior
- Composable for complex workflows
- Clear documentation

---

## DD-05: Tool-Neutral Instructions

### Context

Users have different AI tools (Cursor, Claude Code, Copilot).

### Decision

Write agent instructions that work with **any AI tool**:

- Markdown-based instructions
- No tool-specific syntax in core
- Cursor rules as optional layer

### Rationale

- Maximum compatibility
- Users choose their tools
- Future-proof as tools evolve

### Implementation

```
agents/
├── work-management/
│   ├── start-work.md      # Universal instructions
│   └── progress-work.md
└── cursor-rules/
    ├── start-work.mdc     # Cursor-specific wrapper
    └── progress-work.mdc
```

---

## DD-06: YAML for Machine-Readable State

### Context

AI agents need to read and update work status.

### Decision

Use **YAML** for machine-readable state (`progress.yaml`):

```yaml
version: 1
status: in_progress
activities:
  - id: A1
    status: completed
    tasks:
      - id: T1
        status: completed
```

### Rationale

- Human-readable
- AI-parseable
- Git-friendly diffs
- Schema-validatable

### Alternatives Considered

| Format | Rejected Because |
|--------|------------------|
| JSON | Less human-readable |
| Markdown | Harder to parse reliably |
| Database | External dependency |

---

## DD-07: Dual License (AGPL-3.0 + Commercial + CC BY 4.0)

### Context

Repository contains both code/agents and documentation. Need to balance open-source availability with ensuring compensation for commercial use.

### Decision

Dual license for code, single license for docs:

- **AGPL-3.0** for agents, scripts, templates (free for open-source use)
- **Commercial License** required for proprietary/commercial use
- **CC BY 4.0** for documentation

### Rationale

- AGPL-3.0: Ensures commercial users either open-source their code or purchase a license
- Closes SaaS loophole (network use requires source sharing)
- Commercial license: Generates revenue from proprietary use cases
- CC BY 4.0: Attribution for documentation
- Common approach for open-core/dual-licensed projects (MySQL, Qt, etc.)

---

## DD-08: Contribution Model

### Context

Need to enable community contributions while maintaining quality.

### Decision

Open contribution model with quality gates:

1. Issues for discussion
2. PRs for contributions
3. Domain-agnostic requirement
4. Maintainer review

### Rationale

- Low barrier to contribute
- Quality through review
- Community can improve foundation
- Domain-specific stays in domain repos

---

## DD-09: Image Management Separation

### Context

Image management (ASCII-to-image conversion) is useful but separate from work management.

### Decision

Keep image management agents as **separate module**:

```
agents/
├── work-management/    # Work tracking
└── image-management/   # Diagram conversion
```

### Rationale

- Not everyone needs both
- Can use independently
- Clear separation of concerns
- Different update cycles

---

## DD-10: Template Extensibility

### Context

Organizations need to customize templates.

### Decision

Base templates with clear extension points:

```markdown
---
# Core fields (don't modify)
id: "{ID}"
status: "{STATUS}"

# Extension point (add your fields)
# org_metadata:
#   your_field: ""
---
```

### Rationale

- Core structure maintained
- Organizations add fields
- Upgrades don't break extensions
- Clear boundary

---

## Decision Log

| ID | Decision | Date | Status |
|----|----------|------|--------|
| DD-01 | Domain-Agnostic Design | 2026-02 | Implemented |
| DD-02 | Submodule-First | 2026-02 | Implemented |
| DD-03 | File-Based Tracking | 2026-02 | Implemented |
| DD-04 | Single-Responsibility | 2026-02 | Implemented |
| DD-05 | Tool-Neutral | 2026-02 | Implemented |
| DD-06 | YAML for State | 2026-02 | Implemented |
| DD-07 | Dual License | 2026-02 | Implemented |
| DD-08 | Contribution Model | 2026-02 | Implemented |
| DD-09 | Image Management Separation | 2026-02 | Implemented |
| DD-10 | Template Extensibility | 2026-02 | Implemented |
