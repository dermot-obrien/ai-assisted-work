# Research: GitHub Spec Kit Analysis and Lessons for AI-Assisted Work

**Date**: 2026-02-17
**Type**: Research / Competitive Analysis
**Subject**: [github/spec-kit](https://github.com/github/spec-kit) (v0.0.95, MIT license, ~70k stars)

---

## 1. Executive Summary

GitHub Spec Kit is an open-source toolkit for **Spec-Driven Development (SDD)** — a methodology where specifications become the primary artifact and code becomes "its expression." Released September 2025, it provides a CLI (`specify`), Markdown templates, and slash commands that guide AI agents through a structured specify-then-plan-then-implement workflow.

This analysis examines Spec Kit's design, compares it with AAW's approach, and identifies specific ideas worth adopting, adapting, or deliberately avoiding.

**Key finding**: The two frameworks are more complementary than competing. Spec Kit focuses on the *specification-to-implementation pipeline* (greenfield bias), while AAW focuses on *work management and execution coordination* (ongoing work bias). The most valuable takeaways are in Spec Kit's specification quality mechanisms, not its execution model.

---

## 2. What Spec Kit Is

### Core Philosophy

Spec Kit inverts the traditional relationship between specs and code:

> "Specifications don't serve code — code serves specifications. The PRD becomes the source that *generates* implementation rather than guiding it."

It treats the specification as a living, regenerable source of truth. Debugging means fixing specs that generate wrong code, not patching code directly.

### The Four-Document System

| Document | Purpose | Created By |
|----------|---------|------------|
| `constitution.md` | Non-negotiable project principles (tech stack, testing philosophy, design rules) | Human + AI |
| `spec.md` | What you're building — features, user stories, acceptance criteria | `/speckit.specify` |
| `plan.md` | How you'll build it — architecture, components, dependencies, data models | `/speckit.plan` |
| `tasks.md` | Itemized work breakdown for AI agent execution | `/speckit.tasks` |

### Command Workflow (Strict Sequence)

| Step | Command | Purpose |
|------|---------|---------|
| 0 | `/speckit.constitution` | Establish governing principles (one-time per project) |
| 1 | `/speckit.specify` | Define what to build (what + why, no tech stack) |
| 1.5 | `/speckit.clarify` | Surface ambiguities via structured Q&A (optional) |
| 2 | `/speckit.plan` | Add tech stack + architecture decisions |
| 3 | `/speckit.tasks` | Break into executable task list |
| 3.5 | `/speckit.analyze` | Cross-artifact consistency check (optional) |
| 4 | `/speckit.implement` | Execute all tasks |

### Key Design Choices

- **Feature-branch-aware**: Each spec creates a numbered feature branch (`001-photo-albums`)
- **Artifact accumulation**: Specs live in `specs/{branch-name}/` with PRD, plan, data contracts, quickstart, tasks
- **CLI scaffolding**: `specify init` bootstraps project structure for any of 18+ AI agents
- **Cross-agent**: Generates prompt files under `.github/` for Copilot, Claude, Cursor, Gemini, and many others
- **Template-driven**: Templates constrain LLM behavior toward higher-quality outputs
- **Experimental**: Explicitly labeled as an experiment, not production tooling

---

## 3. Head-to-Head Comparison

### 3.1 Scope and Focus

| Dimension | Spec Kit | AAW |
|-----------|----------|-----|
| **Primary focus** | Specification quality -> code generation | Work coordination -> execution tracking |
| **Sweet spot** | Greenfield features, new projects | Any work type (dev, arch, consultancy, mixed) |
| **Lifecycle coverage** | Specify -> Plan -> Tasks -> Implement | Scoping -> Discovery -> Planning -> Execution |
| **Concurrency model** | Single-agent (sequential task execution) | Multi-agent (file-based locking, parallel activities) |
| **Spec evolution** | Per-feature specs (known gap - see Discussion #152) | Living scope.md, pivot-work for mid-flight changes |
| **Domain stance** | Software-focused (code generation target) | Domain-agnostic (architecture, consultancy, dev) |
| **Integration model** | CLI scaffolding (`specify init`) | Git submodule |
| **Maturity** | Experimental (v0.0.95) | v1.1.0, production-oriented |

### 3.2 Document Comparison

| Concept | Spec Kit | AAW Equivalent | Notes |
|---------|----------|----------------|-------|
| `constitution.md` | Project principles, immutable rules | **No equivalent** | Significant gap in AAW |
| `spec.md` | Feature requirements, user stories | `scope.md` | Similar purpose; Spec Kit's is more structured |
| `plan.md` | Architecture, data models, API contracts | `plan.md` | AAW's is leaner; Spec Kit's generates richer artifacts |
| `tasks.md` | Flat task list with `[P]` parallel markers | `plan.md` activities + `progress.yaml` | AAW's is more sophisticated (dependencies, locking, state) |
| Clarifications | `/speckit.clarify` output section in spec | `scope-ai.md` | Different approach to same problem |
| Consistency check | `/speckit.analyze` | No equivalent | Gap in AAW |
| Quality checklist | `/speckit.checklist` | Verification section in `plan.md` | Spec Kit's is more systematic |
| Research artifacts | `research.md`, `data-model.md`, `contracts/` | `research.md`, `decisions.md`, deliverables | Comparable |

### 3.3 Strengths Comparison

**Where Spec Kit is stronger:**

1. **Specification quality mechanisms** — Seven template-driven constraints (preventing premature implementation, forcing uncertainty markers, constitutional compliance gates, test-first thinking, anti-speculation). AAW templates don't enforce these behaviors.

2. **Constitution concept** — Immutable project principles that every generated artifact must respect. Nine Articles covering library-first, test-first, simplicity, anti-abstraction. Provides consistency across time, across LLMs, and across team members.

3. **Phase gates** — Simplicity Gate, Anti-Abstraction Gate, Integration-First Gate that force LLMs to explicitly justify complexity before proceeding.

4. **Cross-artifact validation** — `/speckit.analyze` checks coherence across spec, plan, tasks, and constitution before implementation begins.

5. **Separation of "what" from "how"** — `/speckit.specify` explicitly prohibits tech-stack decisions. This keeps specs stable even as implementation technologies change.

6. **CLI onboarding** — `specify init` creates a ready-to-go project in one command, lowering the barrier to adoption.

7. **Community momentum** — ~70k GitHub stars, 18+ supported AI agents, active community, GitHub organizational backing.

**Where AAW is stronger:**

1. **Multi-agent concurrency** — File-based locking, version-checked progress.yaml, activity-level ownership, lock expiry, recovery protocols. Spec Kit has no concurrency model at all.

2. **Execution coordination** — progress.yaml as machine-readable state, changelog.log for audit trails, deliverable tracking. Spec Kit's execution is "hand tasks to agent, hope for the best."

3. **Domain agnosticism** — Architecture, consultancy, and mixed work types with type-specific guidance. Spec Kit assumes software development.

4. **Mid-flight changes** — `/pivot-work` for revising scope after work has started. Spec Kit's Discussion #152 reveals this as an open problem: "What happens when I have a change request?"

5. **Work item lifecycle** — Full state machine (scoping -> discovery -> planning -> in_progress -> blocked -> review -> done -> abandoned). Spec Kit has no concept of work item state.

6. **Parallel human-agent work** — Actor assignment model (`agent`, `human`, `any`), manual task reports, parallel execution. Spec Kit is agent-only.

7. **Private work items** — WIP prefix convention with gitignore support for sensitive/experimental work.

8. **Resumability** — Any agent session can pick up where another left off via progress.yaml state.

### 3.4 Shared Weaknesses

| Weakness | Impact |
|----------|--------|
| **No automated spec-drift detection** | Both rely on humans to notice when implementation diverges from spec |
| **Overhead for small tasks** | Both add ceremony that's overkill for trivial changes |
| **LLM output variability** | Both depend on LLMs following instructions consistently |
| **No integrated testing** | Neither verifies that generated code actually works |

---

## 4. Key Ideas Worth Adopting

### 4.1 Constitution Document (HIGH VALUE)

**What it is**: A `constitution.md` file establishing immutable project principles — tech stack mandates, testing philosophy, architectural constraints, simplicity rules.

**Why it matters**: Provides consistency across time (same principles regardless of when code is generated), across LLMs (different models produce architecturally compatible code), and across team members (shared constraints without meetings).

**Recommendation for AAW**: Add an optional `constitution.md` template to the work item workspace or as a project-level document that all work items reference. This is distinct from scope.md (which is per-work-item) — it's per-project or per-organization.

**Implementation sketch**:
- New template: `_templates/constitution.md`
- Referenced in `scope.md` context section: "Constitution: `{path/to/constitution.md}`"
- Agents instructed to check constitutional compliance during planning phase
- Not mandatory — projects without one simply skip the check

### 4.2 Forced Uncertainty Markers (HIGH VALUE)

**What it is**: Templates mandate `[NEEDS CLARIFICATION]` markers instead of letting LLMs guess. Example: Rather than guessing "login uses email/password," the LLM must write `[NEEDS CLARIFICATION: auth method not specified — email/password, SSO, OAuth?]`

**Why it matters**: Prevents the most dangerous LLM behavior — confidently fabricating requirements the user never specified. Makes gaps visible and actionable.

**Recommendation for AAW**: Add an instruction to the `scope.md` template and the `start-work.md` agent instructions requiring explicit uncertainty markers. During scoping, any assumed requirement should be flagged with `[NEEDS CLARIFICATION: ...]` and resolved through dialogue before planning begins.

### 4.3 Phase Gates / Complexity Justification (MEDIUM VALUE)

**What it is**: Before proceeding from plan to tasks, the agent must pass gates:
- Simplicity Gate: Can this be done with fewer moving parts?
- Anti-Abstraction Gate: Are we using frameworks directly or wrapping them unnecessarily?
- Integration-First Gate: Are contracts defined? Contract tests written?

**Why it matters**: Counters the LLM tendency to over-engineer. Forces explicit justification for complexity.

**Recommendation for AAW**: Add an optional "Complexity Check" section to the `plan.md` template that agents fill out before proceeding to execution. Keep it lightweight — 3 questions, not a bureaucratic gate.

Suggested questions:
1. "Could this be simpler? If not, why?"
2. "Are we building abstractions we don't need yet?"
3. "What's the minimum viable approach?"

### 4.4 Cross-Artifact Consistency Check (MEDIUM VALUE)

**What it is**: `/speckit.analyze` reads all documents (spec, plan, tasks, constitution) and validates they're coherent — no contradictions, no gaps, no drift.

**Why it matters**: Catches misalignments before they become code-level problems. Especially valuable when scope.md and plan.md are edited independently.

**Recommendation for AAW**: Consider a lightweight `/validate-work` command that reads scope.md, plan.md, and progress.yaml for a work item and flags inconsistencies. Could be a future agent (v1.2+) rather than an immediate priority.

### 4.5 Explicit What/How Separation (MEDIUM VALUE)

**What it is**: `/speckit.specify` explicitly prohibits tech-stack decisions. The spec captures *what* and *why* only. *How* is deferred to `/speckit.plan`.

**Why it matters**: Keeps specifications stable across technology changes. A spec for "real-time notifications" shouldn't mention WebSockets — that's a planning decision.

**Recommendation for AAW**: AAW already partially does this (scope.md = what, plan.md = how), but the separation isn't enforced in templates or agent instructions. Add a brief instruction to the `start-work.md` agent: "During scoping, focus on outcomes and constraints. Defer technology choices to the planning phase."

### 4.6 Structured Clarification Protocol (LOW-MEDIUM VALUE)

**What it is**: `/speckit.clarify` runs a sequential, coverage-based questioning workflow that records answers in a structured Clarifications section. Covers UX, security, accessibility, error handling, edge cases.

**Why it matters**: Systematic rather than ad-hoc questioning. Ensures consistent coverage of common blind spots.

**Recommendation for AAW**: The existing `scope-ai.md` template already captures clarifying Q&A. Enhance the start-work agent instructions to include a brief checklist of common clarification domains (error handling, edge cases, security, accessibility) that agents should consider asking about during scoping. No new artifact needed.

---

## 5. Ideas to Deliberately Avoid

### 5.1 Code-as-Disposable-Output Philosophy

Spec Kit's strongest philosophical claim — "code is the compiled specification" and can be regenerated from specs — is aspirational but dangerous for production systems. In practice:
- Legacy code has undocumented behaviors that no spec captures
- Regenerating breaks git history, code review context, and institutional knowledge
- The "just regenerate" mindset discourages investing in code quality

**AAW's approach is better here**: Treat code as a first-class artifact with its own lifecycle. Specs inform code; they don't replace it.

### 5.2 Single-Agent Execution Model

Spec Kit's `/speckit.implement` hands a flat task list to one agent. No locking, no parallel workers, no recovery from interrupted sessions.

**AAW already solves this problem well** with activity-based locking, version-checked progress.yaml, and multi-agent coordination.

### 5.3 Feature-Branch-Per-Spec Architecture

Spec Kit creates a new spec directory per feature branch, leading to the "evolving specs" problem (Discussion #152): after implementing feature 001 and feature 002, the system's current state is scattered across multiple spec directories. There's no single source of truth for "what does the system do now?"

**AAW's work-item model is more flexible**: scope.md captures a bounded unit of work, not the system's total specification. The system's truth lives in the code + docs, not in accumulated spec directories.

### 5.4 CLI-First Distribution

Spec Kit requires Python 3.11+, `uv` package manager, and a `specify init` CLI step. This adds friction and dependencies.

**AAW's submodule/copy approach is simpler**: No CLI, no runtime dependencies, just Markdown files. Keep it this way.

### 5.5 Rigid Command Sequence

Spec Kit enforces a strict specify -> plan -> tasks -> implement sequence. Helper scripts verify you're on the right branch and have completed prior phases.

**AAW's phase flexibility is more practical**: The discovery-skip decision tree, the ability to pivot mid-flight, and the option to skip phases for simple work items all reflect real-world messiness better.

---

## 6. Broader Lessons for AI-Assisted Work

### 6.1 Templates Are the Most Powerful Steering Mechanism

Spec Kit's deepest insight is that **templates constrain LLM behavior more effectively than instructions alone**. Seven specific mechanisms:

1. Preventing premature implementation details
2. Forcing explicit uncertainty markers
3. Structured thinking through checklists
4. Constitutional compliance through gates
5. Hierarchical detail management
6. Test-first thinking
7. Preventing speculative features

**Lesson for AAW**: Invest more in template design. Current AAW templates are good structural scaffolds but don't actively constrain LLM behavior. Adding behavioral instructions *within* templates (not just in agent instructions) makes them more effective because agents re-read templates during execution.

### 6.2 Organizational Principles Need a Home

The constitution concept addresses a real gap: where do project-wide, cross-work-item principles live? In AAW, each work item has its own scope.md, but there's no mechanism for "every work item in this project must use TypeScript, prefer composition over inheritance, and write tests first."

**Lesson for AAW**: This is worth solving, possibly at the Initiative level (initiative-level constitution) or as a project-level `.ai-assisted-work/constitution.md`.

### 6.3 Specification Quality is a Separate Problem from Execution Quality

Spec Kit excels at specification quality but has no execution model. AAW excels at execution coordination but has lighter specification quality mechanisms. These are genuinely different problems.

**Lesson for AAW**: Don't try to become Spec Kit. Instead, ensure AAW's scoping phase produces specifications good enough to drive execution. The uncertainty markers and complexity checks above are targeted improvements that don't require rearchitecting.

### 6.4 The "Vibe Coding" Problem is Real

Spec Kit's central argument — that throwing prompts at an AI and iterating on whatever emerges is fundamentally wasteful — aligns with AAW's structured approach. Both frameworks exist because unstructured AI interaction produces inconsistent, unmaintainable results.

**Lesson for AAW**: This is validation that AAW is solving a real problem. The market signal (70k stars in 5 months) confirms demand for structured AI-assisted work.

### 6.5 Cross-Agent Compatibility is Table Stakes

Spec Kit supports 18+ AI agents. AAW supports 3 (Claude Code, Cursor, Copilot).

**Lesson for AAW**: The `skill-definitions/` + `skills-for-agents/` architecture (DD-05) is well-designed for this expansion. Adding wrappers for Gemini, Windsurf, and others would increase reach with minimal effort since the canonical instructions are tool-neutral.

---

## 7. Prioritized Recommendations

| # | Recommendation | Value | Effort | Priority |
|---|---------------|-------|--------|----------|
| 1 | Add `[NEEDS CLARIFICATION]` markers to scoping instructions | High | Low | **Do Now** |
| 2 | Create optional `constitution.md` template | High | Medium | **Next** |
| 3 | Add complexity-check questions to `plan.md` template | Medium | Low | **Next** |
| 4 | Enhance start-work with clarification domain checklist | Medium | Low | **Next** |
| 5 | Add behavioral constraints to templates (not just structure) | Medium | Medium | **Planned** |
| 6 | Add what/how separation instruction to start-work agent | Medium | Low | **Planned** |
| 7 | Explore `/validate-work` consistency-check agent | Medium | High | **Future (v1.2+)** |
| 8 | Expand agent wrappers to Gemini, Windsurf, others | Low-Medium | Low each | **Future** |

---

## 8. Sources

- [github/spec-kit Repository](https://github.com/github/spec-kit)
- [Spec-Driven Development Methodology (spec-driven.md)](https://github.com/github/spec-kit/blob/main/spec-driven.md)
- [Diving Into Spec-Driven Development With GitHub Spec Kit - Microsoft Developer Blog](https://developer.microsoft.com/blog/spec-driven-development-spec-kit)
- [What's The Deal With GitHub Spec Kit - Den Delimarsky](https://den.dev/blog/github-spec-kit/)
- [Exploring spec-driven development with GitHub Spec Kit - LogRocket Blog](https://blog.logrocket.com/github-spec-kit/)
- [A look at Spec Kit - tessl.io](https://tessl.io/blog/a-look-at-spec-kit-githubs-spec-driven-software-development-toolkit/)
- [Evolving specs Discussion #152](https://github.com/github/spec-kit/discussions/152)
- [speckit.org](https://speckit.org/)
