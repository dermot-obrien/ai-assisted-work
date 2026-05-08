# Integration Guide

How to integrate AI-Assisted Work into your projects, by tool.

> **New here?** [DEPLOYMENT.md](../../DEPLOYMENT.md) is the canonical install guide. This page covers tool-specific notes that go beyond the basic `aaw init`. For how slash commands work across each tool, see [Command Discovery](command-discovery.md).

## The standard install

```bash
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
git submodule update --init
node .ai-assisted-work/bin/aaw.js init
```

`aaw init` detects which AI tools you have configured (`.github/`, `.cursor/`, `.claude/`) and wires up the appropriate shim files. The sections below cover what those shims do.

## GitHub Copilot

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

## Claude Code

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

## Cursor

### What gets installed

`.cursor/commands/aaw/*.md` — same files, same names as Claude Code.

Cursor reads `.cursor/commands/` for slash command definitions. The shim files reference the canonical instructions in the submodule.

### `.mdc` extension

Some Cursor versions prefer `.mdc` instead of `.md` for command files. If your version doesn't pick up `.md` files, rename:

```bash
cd .cursor/commands/aaw
for f in *.md; do mv "$f" "${f%.md}.mdc"; done
```

## OpenAI Codex

### What gets installed (optional)

Codex's skill discovery reads `.agents/skills/`. AAW provides templates at `.ai-assisted-work/skills-for-agents/codex/.agents/`:

```bash
cp -r .ai-assisted-work/skills-for-agents/codex/.agents .agents
```

This step is not currently automated by `aaw init`; it's documented here for completeness. Future versions will add it.

## Gemini CLI

### What gets installed (optional)

Templates at `.ai-assisted-work/skills-for-agents/gemini/skills/aaw/`:

```bash
mkdir -p ~/.gemini/skills
cp -r .ai-assisted-work/skills-for-agents/gemini/skills/aaw ~/.gemini/skills/
```

Like Codex, Gemini integration is not currently automated by `aaw init`.

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

The alias resolves the bundle path relative to your current directory, so it works in any workspace where AAW is installed as a submodule.

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

Override the standard templates by forking AAW and editing `packages/skills/work-management/_templates/*`. Your fork's `aaw init` then ships the customised templates.

### Custom skills

Add new markdown skills under `packages/skills/your-org/` in your fork; create matching shim files for the AI tools you use.

### Custom backends

Implement the `Backend` interface from `@aaw/protocol` and ship as a separate package. The CLI's `LocalFsBackend` is the reference implementation (~250 lines of TypeScript) — it's a good starting point.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Slash command not discoverable | Restart the AI tool after first install; some tools cache command lists |
| `aaw status` shows "skipping {path}: Map keys must be unique" | Bad YAML in a `progress.yaml`; run `aaw lint` to find the offending file |
| `aaw status` shows wrong activity counts | One or more activity statuses are non-canonical (`done` instead of `completed`); `aaw lint` will flag |
| Init wires shims but tool ignores them | Confirm the file is in the right place for your tool version (see tables above); restart the tool |

## See also

- [DEPLOYMENT.md](../../DEPLOYMENT.md) — full install + migration guide
- [Command Discovery](command-discovery.md) — how slash commands surface across tools
- [packages/skills/work-management/README.md](../../packages/skills/work-management/README.md) — concepts and lifecycle
- [packages/protocol/README.md](../../packages/protocol/README.md) — the contract for backends
