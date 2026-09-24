# Integration Guide

How to integrate AI-Assisted Work into your projects, by tool.

> **New here?** [DEPLOYMENT.md](../../DEPLOYMENT.md) is the canonical install guide. This page covers tool-specific notes that go beyond a basic `aaw install`. For how skills surface across each tool, see [Command Discovery](command-discovery.md).

## The standard install

AAW is an independent clone, not a submodule. Clone it beside your workspace (or inside it,
conventionally as `.ai-assisted-work/`) and install from there:

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/aaw.js install
```

Requires Node.js 18 or newer, 20+ recommended. `aaw install` detects which AI tools you have
configured (`.github/`, `.cursor/`, `.claude/`, `.gemini/`), installs the Agent Skills, and
wires the legacy shims for the tools that still want them.

One AAW clone can serve several workspaces. Each workspace records the relative source path in
its own `.aaw-config.yaml`, so the install stays resolvable per workspace.

## Agent Skills (the primary integration)

This is what you want in almost every case, and it is the same in every tool:

```
.agents/skills/aaw-start-work/         ← read natively by Codex, Cursor,
.agents/skills/aaw-progress-work/        Copilot, VS Code and Gemini CLI
.agents/skills/aaw-work-status/
.agents/skills/aaw-next-task/
.agents/skills/aaw-start-initiative/

.claude/skills/aaw-*                   ← linked at the above, for Claude Code
```

Invoke them as `/aaw-start-work`, `/aaw-progress-work` and so on. Because each carries a
`description`, an assistant can also reach for one when a request matches without you typing
the command.

The per-tool sections below describe the **legacy shims**, which are superseded. They remain
documented for installs that have not yet moved.

## GitHub Copilot (legacy shims)

### What gets installed

`.github/prompts/aaw-*.prompt.md` — discoverable slash commands for Copilot Chat.

| File | Slash command |
|---|---|
| `.github/prompts/aaw-start-work.prompt.md` | `/aaw-start-work` |
| `.github/prompts/aaw-progress-work.prompt.md` | `/aaw-progress-work` |
| `.github/prompts/aaw-work-status.prompt.md` | `/aaw-work-status` |
| `.github/prompts/aaw-next-task.prompt.md` | `/aaw-next-task` |
| `.github/prompts/aaw-start-initiative.prompt.md` | `/aaw-start-initiative` |

Each prompt is a thin wrapper that points at the canonical instruction file in `.ai-assisted-work/packages/skills/work-management/`.

### Background context (optional)

GitHub Copilot also reads `.github/copilot-instructions.md` for global context. AAW does not write to this file — if you have one, you can manually add a paragraph telling Copilot that AAW is in use:

```markdown
## AI-Assisted Work

This project uses AAW for work management. When the user invokes /aaw-*
slash commands, follow the instructions in
.ai-assisted-work/packages/skills/work-management/.
```

## Claude Code (legacy shims)

### What gets installed

`.claude/commands/aaw/*.md` — discoverable slash commands.

| File | Slash command |
|---|---|
| `.claude/commands/aaw/start-work.md` | `/aaw:start-work` |
| `.claude/commands/aaw/progress-work.md` | `/aaw:progress-work` |
| `.claude/commands/aaw/work-status.md` | `/aaw:work-status` |
| `.claude/commands/aaw/next-task.md` | `/aaw:next-task` |
| `.claude/commands/aaw/start-initiative.md` | `/aaw:start-initiative` |

Claude Code uses the folder name as a namespace, so `aaw/start-work.md` becomes `/aaw:start-work` (not `/aaw-start-work`).

## Cursor (legacy shims)

### What gets installed

`.cursor/commands/aaw/*.md` — same files, same names as Claude Code.

Cursor reads `.cursor/commands/` for slash command definitions. The shim files reference the
canonical instructions in the AAW clone.

Some Cursor versions prefer `.mdc` over `.md` for command files. If yours does not pick up
`.md`, rename them:

```bash
cd .cursor/commands/aaw
for f in *.md; do mv "$f" "${f%.md}.mdc"; done
```

None of this applies to the skills, which Cursor reads from `.agents/skills/` directly.

## OpenAI Codex, Gemini CLI, VS Code

Nothing tool-specific to do. All three read `.agents/skills/` natively, which `aaw install`
populates. Codex walks from the working directory up to the repository root; Gemini CLI gives
`.agents/skills/` precedence over its own `.gemini/skills/`.

These previously needed a manual copy step. They no longer do.

## Shell access

The bundled CLI lives at `.ai-assisted-work/bin/aaw.js`. To use the short `aaw` command in any workspace, add an alias once.

**PowerShell (`$PROFILE`):**

```powershell
function aaw { node ".ai-assisted-work/bin/aaw.js" @args }
```

**Bash / Zsh (`~/.bashrc` or `~/.zshrc`):**

```sh
alias aaw='node .ai-assisted-work/bin/aaw.js'
```

The alias resolves the bundle path relative to your current directory, so it works in any workspace where AAW is installed.

## Where work items live

By default, work items live **outside** your project repo at the path declared in `.aaw-config.yaml`:

```yaml
tenant: dermot
mode: local-fs
work_items_path: ~/aaw/{tenant}/{repo}/work-items/
initiatives_path: ~/aaw/{tenant}/{repo}/initiatives/
```

This keeps work-state out of your project's git history. If you want a particular work item published as documentation, copy a sanitised snapshot into `docs/work-items/` as a deliberate publishing step.

## Customisation

### Custom templates

Override the standard templates by forking AAW and editing the copies bundled with each skill
under `skills/<name>/assets/templates/`. Your fork's `aaw install` then ships the customised
templates. The legacy set under `packages/skills/work-management/_templates/` feeds the shims
only; keep the two in step while both are installed.

### Custom skills

Add an Agent Skill of your own: a directory under `skills/` in your fork holding a `SKILL.md`
with `name` and `description` frontmatter, plus optional `references/` and `assets/`. The
installer picks up every directory under `skills/` that contains a `SKILL.md`, so no per-tool
file is needed. Validate it with `skills-ref validate ./skills/your-skill`.

### Custom backends

Implement the `Backend` interface from `@aaw/protocol` and ship as a separate package. The CLI's `LocalFsBackend` is the reference implementation (~250 lines of TypeScript) — it's a good starting point.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Slash command not discoverable | Restart the AI tool after first install; some tools cache command lists |
| `aaw status` shows "skipping {path}: Map keys must be unique" | Bad YAML in a `progress.yaml`; run `aaw lint` to find the offending file |
| `aaw status` shows wrong activity counts | One or more activity statuses are non-canonical (`done` instead of `completed`); `aaw lint` will flag |
| Skill not listed after install | Restart the tool; most cache the skill list at startup |
| Skill listed twice in Cursor or Copilot | Expected: both read `.agents/skills/` and `.claude/skills/`, and the second is a link to the first |
| Claude Code cannot see a skill | It does not read `.agents/skills/`. Check `.claude/skills/<name>` exists and resolves |
| Install wires shims but tool ignores them | Confirm the file is in the right place for your tool version (see tables above); restart the tool |

## See also

- [DEPLOYMENT.md](../../DEPLOYMENT.md) — full install + migration guide
- [Command Discovery](command-discovery.md) — how slash commands surface across tools
- [packages/skills/work-management/README.md](../../packages/skills/work-management/README.md) — concepts and lifecycle
- [packages/protocol/README.md](../../packages/protocol/README.md) — the contract for backends
