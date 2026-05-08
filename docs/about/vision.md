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

AAW is a thin, opinionated framework for **work coordination**, designed so the same skills, schema, and protocol work regardless of which AI tool runs the agent or where state is stored.

### Two ideas

**1. Decouple the work model from the transport.**

There's a small set of operations every agent needs against a shared work store: list claimable work, claim an activity, update a task, release. AAW packages these as a versioned **protocol** (`@aaw/protocol`) that any backend can implement: filesystem (today), Cloud Run + Firestore (next), GitHub Projects (later), Temporal (eventually).

A skill that knows the protocol can run against any backend without modification.

**2. Decouple the schema from any specific work-management methodology.**

The hierarchy — Initiative → Work Item → Activity → Task — is structural, not methodological. Agile maps onto it (Initiative = Initiative, Work Item = Epic, Activity = Story, Task = Sub-task), but so do research workflows, architecture reviews, consultancy engagements, household projects, and anything else with hierarchy and dependencies.

### Key principles

| Principle | Description |
|-----------|-------------|
| **Domain-agnostic** | Initiative/Work Item/Activity/Task is structure, not method |
| **Tool-neutral** | The same skills run in Copilot, Cursor, Claude Code, Codex, Gemini |
| **Transport-pluggable** | One protocol, multiple backends |
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
- A CLI for shell-driven and headless use
- A protocol that bridges filesystem and cloud transports

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
| **Short-term** | Cloud mode (Cloud Run + Firestore) and the npm publish lane |
| **Medium-term** | A web console for human-readable views; headless agent runners on cloud workers |
| **Long-term** | Backends for GitHub Projects and Temporal; a budget-aware scheduler that maximises parallel work within a fixed subscription cap |

See [roadmap.md](roadmap.md) for the version-by-version plan.

## How to participate

- Try the agents on a real project, file issues at github.com/dermot-obrien/ai-assisted-work
- Fork and customise for your organisation; contribute generic improvements back
- Build a backend (e.g. for your team's PM tool) — the protocol is small enough to implement in a weekend
