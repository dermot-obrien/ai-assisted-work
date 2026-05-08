# Design Decisions

Key design decisions for AI-Assisted Work.

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
│   ├── packages/skills/      # Full instructions
│   └── skills-for-agents/      # Command wrappers
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
| Next Task | Identify the next task to work on |

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
packages/skills/
└── work-management/       # Universal instructions
    ├── start-work.md
    └── progress-work.md
skills-for-agents/
├── cursor/commands/aaw/   # Cursor wrappers
├── claude/commands/aaw/   # Claude wrappers
└── github/skills/aaw/     # GitHub Copilot wrappers
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

## DD-07: Permissive Dual Licence (CC BY 4.0 + Apache-2.0) via REUSE 3.3

### Context

Repository contains both code (TypeScript / JavaScript / build scripts) and content (Markdown skill definitions, YAML templates, agent shims). Each kind needs a licence that fits its medium and that contributors can apply mechanically.

The previous v1 model used AGPL-3.0 + Commercial + CC BY 4.0 — a copyleft-with-paid-escape-hatch arrangement intended to monetise commercial use. In practice this:

- Discouraged adoption: many organisations refuse AGPL outright, regardless of how the framework is used.
- Created friction for the framework's actual use case (instructions consumed by an AI agent), where AGPL's "network use as distribution" clause has unclear application.
- Burdened the maintainer with licence-grant correspondence for legitimate commercial use cases.
- Was inconsistent with the framework's own goal (broad reuse).

### Decision

Permissive dual licence, governed by SPDX identifiers and REUSE 3.3:

- **CC BY 4.0** for content — documentation, skill definitions, agent shims, templates, examples, diagrams (Markdown, YAML, JSON, CSV, images).
- **Apache-2.0** for code — TypeScript, JavaScript, build scripts under `packages/`, `bin/`, and root build files.

Per-file licensing is declared via:

- Inline SPDX headers in source code files (`SPDX-FileCopyrightText`, `SPDX-License-Identifier`).
- Bulk `REUSE.toml` rules at the repository root for content where inline headers are impractical.

A `LICENSE` file at the root explains the model in plain language; full licence texts live in `LICENSES/`.

### Rationale

- **Permissive removes the largest adoption barrier.** AGPL was the single most-cited reason organisations declined to evaluate the framework. CC BY 4.0 and Apache-2.0 are universally accepted in corporate, academic, and government contexts.
- **Two licences, one file each, machine-checkable.** REUSE 3.3 was designed for repositories with mixed asset types. SPDX headers make licensing decisions visible at the file level and verifiable by tooling.
- **Apache-2.0 carries an explicit patent grant** — important for code that ships in commercial products.
- **CC BY 4.0 is the correct fit for the content half.** Skill definitions and templates are creative works, not source code; CC BY 4.0 was designed for them.
- **Attribution-only model preserves the recognition the maintainer cares about** without the enforcement burden of copyleft.
- **Trademark protection is handled separately** in the LICENSE file — names and logos are not part of the licence grant, so forks can use the framework freely without diluting the brand.

### Trade-offs

| Benefit | Trade-off |
|---|---|
| Maximum adoption | No copyleft "give back" requirement |
| No commercial-licence sales pipeline | No revenue from commercial use |
| Simpler contribution process | Contributors should add SPDX headers to new code |
| Standard tooling (REUSE) catches violations early | Light upfront effort to set up `REUSE.toml` |

The maintainer's intent for v2 is broad framework adoption, not licence-fee revenue. The trade-off is consistent with that goal.

### Consequences

- Existing v1 forks that rely on AGPL retain that licence in their own copies; the v2 licence change applies forward, not retroactively to past releases.
- A migration note in CHANGELOG.md captures the change for users tracking the project.
- New contributions must include SPDX headers on new code files (covered in CONTRIBUTING.md).

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

## DD-09: Template Extensibility

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
| DD-07 | Permissive Dual Licence (CC BY 4.0 + Apache-2.0) | 2026-05 | Implemented (v2.0; supersedes the v1 AGPL-3.0 + Commercial model) |
| DD-08 | Contribution Model | 2026-02 | Implemented |
| DD-09 | Template Extensibility | 2026-02 | Implemented |
