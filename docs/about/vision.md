# Vision

The strategic vision for AI-Assisted Work.

## The problem

Every team that uses AI agents to help with substantive work runs into the same coordination questions:

- Where do work items, plans, and progress live so multiple agents (and humans) can see and update them?
- How do agents claim work without stepping on each other?
- How do you keep "the work" decoupled from any one AI tool, repo, or vendor?
- How do you scale from "one agent on one project" to "many agents across many projects"?

Most existing answers are partial: project-management tools (Jira, Linear) for humans don't expose claim semantics to agents; multi-agent LLM frameworks (CrewAI, AutoGen) are mostly in-process and tool-specific; durable workflow engines (Temporal) work but require committing to one substrate.

## The vision

AI-Assisted Work is a thin, opinionated set of skills for work coordination, designed so the same skills and schema work regardless of which AI tool runs the agent or where state is stored.

### Two ideas

**1. Decouple the work model from the transport.**

There's a small set of operations every agent needs against a shared work store: list claimable work, claim an activity, update a task, release. The `work` skill does them over plain files, and their shape is one schema, the work ontology (`skills/work/assets/work.schema.json`), that any tool can read.

Up to 4.0.0 the operations were also a TypeScript protocol package with a filesystem backend and plans for cloud ones. That package was removed in 5.0.0, because the skills never used it.

**2. Decouple the schema from any specific work-management methodology.**

The hierarchy — Initiative → Work Item → Activity → Task — is structural, not methodological. Agile maps onto it (Initiative = Initiative, Work Item = Epic, Activity = Story, Task = Sub-task), but so do research workflows, architecture reviews, consultancy engagements, household projects, and anything else with hierarchy and dependencies.

### Key principles

| Principle | Description |
|-----------|-------------|
| **Domain-agnostic** | Initiative/Work Item/Activity/Task is structure, not method |
| **Tool-neutral** | The same skills run in Copilot, Cursor, Claude Code, Codex, Gemini |
| **Store-neutral** | One schema over plain files, in any folder or repository |
| **Permissive by default** | CC BY 4.0 + Apache-2.0; no copyleft; trademark on the name only |
| **Cross-platform** | Mac, Linux, Windows; no symlink/junction tricks |

## Target users

- **Individual contributors** running multiple agents on personal projects
- **Architecture and consulting teams** managing decisions and deliverables across long engagements
- **Software engineering teams** coordinating AI-driven work on a codebase
- **Anyone** with a hierarchical body of work who wants agents to help drive it

## What's in scope

- Work coordination: claim, update, release, audit
- Skill definitions consumed by AI tools
- An installer for standalone skills, `bin/skills.mjs`
- A schema for the work model, which other layers extend

## What's not in scope

| Non-goal | Why |
|----------|-----|
| Methodology (Scrum, SAFe, BMAD) | Methodology is a layer above coordination |
| Issue tracking UI | That's what Jira / Linear / GitHub Issues are for |
| LLM tool selection | AAW doesn't pick which AI tool you use |
| Replacement for project management tools | AAW complements them; doesn't replace them |

## Where this is going

| Horizon | Direction |
|---------|-----------|
| **Short-term** | Deciding where the remaining skills and the installer live (WI-005) |
| **Long-term** | A budget-aware scheduler that maximises parallel work within a fixed subscription cap |

See [roadmap.md](roadmap.md) for the version-by-version plan.

## How to participate

- Try the agents on a real project, file issues at github.com/dermot-obrien/ai-assisted-work
- Fork and customise for your organisation; contribute generic improvements back
