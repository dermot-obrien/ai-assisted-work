# Getting Started

Quick start guide for AI-Assisted Work.

## What is AAW?

A domain-agnostic framework for managing work with AI agents. Initiative → Work Item → Activity → Task hierarchy. One CLI, one protocol, multiple AI tools, file-based or cloud transport.

## Install

```bash
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
git submodule update --init
node .ai-assisted-work/bin/aaw.js init
```

That's it. Requires Node 16+. The `init` command:

- Detects which AI tools you have (GitHub Copilot, Cursor, Claude Code)
- Prompts for tenant name, mode (local-fs / cloud), and where work items should live
- Wires up tool shims and writes `.aaw-config.yaml`
- Creates the work-items directory

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for the long form.

## First work item

In your AI tool, run the slash command for new work:

```
/aaw-start-work Research best practices for [topic]
```

The agent will:

1. Ask clarifying questions about scope and intent
2. Optionally do discovery (research workspace + web sources)
3. Create a plan with activities and tasks
4. Create the work item folder under your configured `work_items_path`

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
├── deliverables/     # Activity outputs
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

- [Work Management Concepts](../../packages/skills/work-management/README.md) — hierarchy, lifecycle, concurrency model
- [Protocol Reference](../../packages/protocol/README.md) — the contract every backend implements
- [Integration Guide](../integration/index.md) — tool-specific notes
- [DEPLOYMENT.md](../../DEPLOYMENT.md) — full install + migration guide
