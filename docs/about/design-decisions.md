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

## DD-02: Independent Clone, Installed In

> **Superseded 2026-09.** The original decision was submodule-first. See the revision below.

### Context

Need to share agents across repositories without duplication, in organisations where npm
registry access is often restricted but git and GitHub access are not.

### Decision

AAW is an **independent clone**, not a submodule, and installs itself into a workspace:

```
domain-project/
├── .ai-assisted-work/     # Independent clone (or elsewhere on disk)
│   ├── skills/            # Agent Skills — the maintained definitions
│   └── packages/          # CLI, installer, protocol
├── .agents/skills/        # Installed skills (generated)
└── change/work-items/     # Domain work items
```

`aaw install` copies the skills into the workspace. One clone can serve several workspaces;
each records the source path in its own `.aaw-config.yaml`.

### Rationale

- **The clone is the single source of truth**, and the installed copy is generated. Workspaces
  should gitignore the installed skills rather than track them, or the same content ends up in
  several repos and drifts.
- Submodules coupled the consuming repo's history to AAW's, needed `--init` and `--remote`
  discipline that teams routinely got wrong, and offered nothing the clone does not.
- npm git-dependency (`npm i github:dermot-obrien/ai-assisted-work`) works for teams that want
  it, without needing registry access, because `bin/aaw.js` is a committed bundle.

### Revision history

| Date | Decision |
|------|----------|
| 2026-02 | Submodule-first |
| 2026-09 | Independent clone plus `aaw install`; submodules no longer recommended |

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Git submodule | Couples consuming repo history; error-prone update ritual; no benefit over a clone |
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

Originally a canonical instruction file plus a per-tool wrapper. Since 2026-09 the wrappers are
unnecessary: the Agent Skills format is itself tool-neutral, so one definition is the artefact
every tool reads. See DD-10.

```
skills/
├── aaw-start-work/
│   ├── SKILL.md            # the definition every tool reads
│   ├── references/         # loaded on demand
│   └── assets/templates/
└── aaw-progress-work/
    └── ...
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

## DD-10: Agent Skills as the Distribution Format

### Context

AAW originally shipped each workflow as a canonical Markdown instruction file plus one thin
shim per AI tool, because every tool had its own incompatible layout and the only portable
artefact was a pointer.

Anthropic released the Agent Skills format as an open standard in December 2025. It is now
stewarded by the Agentic AI Foundation, a Linux Foundation project, and `.agents/skills/` is
read natively by OpenAI Codex, Cursor, GitHub Copilot, VS Code and Gemini CLI.

### Decision

Ship each workflow as a standalone **Agent Skill**: a directory holding a `SKILL.md` with
`name` and `description` frontmatter, plus optional `references/`, `scripts/` and `assets/`.

`aaw install` places them at `.agents/skills/<name>/` and links `.claude/skills/<name>` at the
same directory, because Claude Code reads only `.claude/skills/`.

### Rationale

- **The premise behind the shim is gone.** The portable artefact is now the skill itself.
- **Shims cost model invocation.** The Claude, Cursor and Copilot shims carried no
  `description`, so those tools could only run AAW when the user typed the slash command. A
  skill's description lets an assistant reach for it when a request matches.
- **Shims defeat progressive disclosure.** A shim points at one large instruction file read
  whole on every invocation. A skill loads its name and description at startup, its body on
  activation, and its references only when a branch needs them.
- **One definition, not five.** Twenty-five hand-maintained shim files became five skills.

### Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| One definition for every tool | Claude Code needs a link, since it does not read `.agents/skills/` |
| Model invocation, not just slash commands | Descriptions must be written carefully, since they are the whole trigger surface |
| Progressive disclosure | Long procedures must be split into `references/`, which is more authoring work |
| Self-contained and droppable | Shared templates are bundled per skill, so a few small files are duplicated |

A workspace also configured for Claude Code may list each skill twice in Cursor and Copilot,
which read both paths. Because the second is a link to the first, both entries are the same
content.

### Consequences

- The per-tool shims under `skills-for-agents/` and the instruction files under
  `packages/skills/work-management/` were removed in 3.0.0, along with the `source_token`
  rewrite machinery that existed only to keep shim pointers resolving. `aaw install` sweeps
  away shims it previously wrote, since they point at files that no longer exist.
- The reference documentation that lived alongside those instruction files — concepts,
  lifecycle, scaling limits, work-type notes, agent boundary rules — moved to `docs/concepts/`
  rather than being deleted with them.
- Skills are validated against the spec with `skills-ref validate`.

---

## Decision Log

| ID | Decision | Date | Status |
|----|----------|------|--------|
| DD-01 | Domain-Agnostic Design | 2026-02 | Implemented |
| DD-02 | Independent Clone, Installed In | 2026-09 | Implemented (supersedes the 2026-02 submodule-first model) |
| DD-03 | File-Based Tracking | 2026-02 | Implemented |
| DD-04 | Single-Responsibility | 2026-02 | Implemented |
| DD-05 | Tool-Neutral | 2026-02 | Implemented |
| DD-06 | YAML for State | 2026-02 | Implemented |
| DD-07 | Permissive Dual Licence (CC BY 4.0 + Apache-2.0) | 2026-05 | Implemented (v2.0; supersedes the v1 AGPL-3.0 + Commercial model) |
| DD-08 | Contribution Model | 2026-02 | Implemented |
| DD-09 | Template Extensibility | 2026-02 | Implemented |
| DD-10 | Agent Skills as the Distribution Format | 2026-09 | Implemented |
