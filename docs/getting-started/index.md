# Getting Started

Quick start guide for AI-Assisted Work.

## What is AAW?

A domain-agnostic framework for managing work with AI agents. Initiative → Work Item →
Activity → Task, where a work item sits at one of two levels: a `workstream` that accretes
scope and may never end, or an `epic` that lands inside one planning period, three months at
most. One CLI, one protocol, multiple AI tools, file-based or cloud transport.

Planning is product-based: a work item names the products it will leave behind, then derives
the activities that produce them.

## Install

AAW is an independent clone, not a submodule:

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/aaw.js install
```

That's it. Requires Node 18+, 20+ recommended. The `install` command:

- Detects which AI tools you have (Claude Code, Cursor, GitHub Copilot, Gemini CLI)
- Prompts for tenant name, mode (local-fs / cloud), and where work items should live
- Installs the Agent Skills into `.agents/skills/`, linking `.claude/skills/` at them
- Wires the legacy tool shims and writes `.aaw-config.yaml`
- Creates the work-items directory

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for the long form.

## First work item

In your AI tool, run the slash command for new work:

```
/aaw-start-work Research best practices for [topic]
```

The agent will:

1. Triage the request. Most work is a chore and gets a branch and a changelog line, not a work
   item. Only an intervention earns the full workspace
2. Ask clarifying questions about scope and intent
3. Optionally do discovery (research workspace + web sources)
4. Name the products the work will leave behind, then derive activities from them
5. Create the work item folder under your configured `work_items_path`

## Continue / check progress

```
/aaw-progress-work WI-001     # claim and execute the next available activity
/aaw-work-status              # list all work items
/aaw-next-task WI-001         # what's next inside one work item
```

From the shell (the bundled CLI is at `.ai-assisted-work/bin/aaw.js`; see [DEPLOYMENT.md](../../DEPLOYMENT.md#shell-alias) to add an `aaw` alias):

```bash
node .ai-assisted-work/bin/aaw.js status            # list work items
node .ai-assisted-work/bin/aaw.js status WI-001     # show one with activity/task tree
node .ai-assisted-work/bin/aaw.js verify            # sanity-check the install
```

## Work item structure

Each work item folder contains:

```
WI-001-add-auth-flow/
├── scope.md          # What's in/out of scope (stakeholder-facing)
├── scope-ai.md       # AI agent addendum (intent history, rationale)
├── plan.md           # Activities and tasks
├── progress.yaml     # Source of truth (versioned for concurrency)
├── deliverables/     # The products named up front in progress.yaml
└── locks/            # Activity claim records
```

Work items live at `work_items_path` from your `.aaw-config.yaml` — outside the artefact repo by default.

## Workflow

```
Scoping → Discovery → Planning → Execution → Done
                                     │
                                     └── one or more agents claim activities,
                                         work tasks, write back state, release
```

## Next steps

- [Command Discovery](../integration/command-discovery.md) — how the skills surface in each tool
- [Work Management Concepts](../../packages/skills/work-management/README.md) — hierarchy, lifecycle, concurrency model
- [Protocol Reference](../../packages/protocol/README.md) — the contract every backend implements
- [Integration Guide](../integration/index.md) — tool-specific notes
- [DEPLOYMENT.md](../../DEPLOYMENT.md) — full install + migration guide
