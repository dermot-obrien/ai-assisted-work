# Deployment Guide

This guide explains how to deploy AI-Assisted Work (AAW) into your project.

## v2 model: a single install path

```bash
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
git submodule update --init
node .ai-assisted-work/bin/aaw.js init
```

That's it. The `init` command:

1. Detects git, GitHub Copilot, Cursor, and Claude Code in your workspace
2. Prompts for tenant name, mode, and the path where work items should live
3. Writes `.aaw-config.yaml` at your workspace root
4. Wires up tool shims (`.github/prompts/`, `.cursor/commands/aaw/`, `.claude/commands/aaw/`)
5. Creates the work-items directory if it doesn't exist

Requires Node.js (16 or newer). For corporate environments where npm registry access is restricted but git+GitHub access is allowed, this single command works without any other registry plumbing — `bin/aaw.js` is a self-contained bundle that ships in the submodule.

A future release will also publish `@aaw/cli` to npm for users who prefer `npx @aaw/cli init`. The behaviour is identical; the npm path simply replaces the submodule + bundle steps.

---

## What gets created

After `aaw init`:

```
your-repo/
├── .ai-assisted-work/                      # Submodule (the AAW repo)
│   ├── packages/skills/work-management/    # Skill markdown (read by AI tools)
│   ├── packages/cli/                       # CLI source
│   ├── bin/aaw.js                          # Bundled CLI entry
│   └── skills-for-agents/                  # Tool shim source
├── .aaw-config.yaml                        # Workspace config (committed)
├── .github/prompts/                        # GitHub Copilot shims (if detected)
├── .cursor/commands/aaw/                   # Cursor shims (if detected)
├── .claude/commands/aaw/                   # Claude Code shims (if detected)
└── [your existing project files]           # Untouched

~/aaw/{tenant}/{repo-name}/
└── work-items/                             # Where work items live (outside the repo)
```

The work-items directory lives **outside** your project repo by default. This keeps work-state — `progress.yaml`, lock files, scope-ai dialogues — out of your project's git history. Only the committed `.aaw-config.yaml` records that AAW is in use.

If you want a particular work item's deliverables in your repo, that's a separate, deliberate publishing step — copy a sanitised snapshot into `docs/work-items/` or write the decision as an ADR.

---

## What `.aaw-config.yaml` looks like

```yaml
tenant: dermot
mode: local-fs
work_items_path: ~/aaw/{tenant}/{repo}/work-items/
initiatives_path: ~/aaw/{tenant}/{repo}/initiatives/
```

| Field | Meaning |
|---|---|
| `tenant` | Your namespace — used to scope work items across repos and machines |
| `mode` | `local-fs` (this machine only) or `cloud` (multi-machine, requires a coordinator) |
| `work_items_path` | Where `WI-NNN-*/` folders live |
| `initiatives_path` | Where `IN-NNN-*/` folders live |

`{tenant}` and `{repo}` are expanded at runtime. `~` expands to the user's home directory. Cross-platform — same on Mac, Linux, Windows.

---

## Updating the submodule

```bash
cd .ai-assisted-work
git pull origin main
cd ..
git add .ai-assisted-work
git commit -m "Update AAW"
node .ai-assisted-work/bin/aaw.js init      # re-run if shim files changed
```

The `init` command is idempotent — re-running it on an existing workspace updates shims and config without clobbering custom edits.

---

## Removing AAW

```bash
git submodule deinit .ai-assisted-work
git rm .ai-assisted-work
rm -rf .git/modules/.ai-assisted-work
git commit -m "Remove AAW submodule"

# Optional cleanup:
rm .aaw-config.yaml
rm -rf .github/prompts/aaw-*.prompt.md
rm -rf .claude/commands/aaw
rm -rf .cursor/commands/aaw
```

Your work items at `~/aaw/{tenant}/{repo}/` are not touched. Delete them manually if you no longer want the data.

---

## Shell alias

The submodule install does not put `aaw` on your PATH (npm publish ships in v2.1; until then it's a bundle inside the submodule). Either type the full path, or set up a one-line alias.

**PowerShell** — add to `$PROFILE`:

```powershell
function aaw { node ".ai-assisted-work/bin/aaw.js" @args }
```

To find your profile path: `$PROFILE`. To create + edit it:

```powershell
if (!(Test-Path $PROFILE)) { New-Item -Type File -Force $PROFILE }
notepad $PROFILE
```

Reload with `. $PROFILE` or open a new shell.

**Bash / zsh** — add to `~/.bashrc` or `~/.zshrc`:

```sh
alias aaw='node .ai-assisted-work/bin/aaw.js'
```

Reload with `source ~/.bashrc` (or open a new shell).

The function/alias resolves `.ai-assisted-work/bin/aaw.js` relative to your current directory, so `aaw status` works in any workspace where AAW is installed as a submodule.

---

## Verifying the install

```bash
node .ai-assisted-work/bin/aaw.js verify
```

(Or `aaw verify` if you've set up the alias above.)

This runs a sanity check: workspace root resolved, config readable, work-items path read+write, and the local-fs backend can list any existing work items.

```bash
node .ai-assisted-work/bin/aaw.js status
```

Lists current work items in the configured path. Empty output means no items yet — try creating one via your AI tool with `/aaw-start-work`.

---

## Tool integration

| Tool | Trigger | Shim location |
|---|---|---|
| GitHub Copilot | `/aaw-start-work`, `/aaw-progress-work`, `/aaw-work-status`, `/aaw-next-task`, `/aaw-start-initiative` | `.github/prompts/aaw-*.prompt.md` |
| Cursor | `/aaw-...` | `.cursor/commands/aaw/*.md` |
| Claude Code | `/aaw-...` | `.claude/commands/aaw/*.md` |
| OpenAI Codex | (skill discovery) | `.agents/skills/aaw-*/` (copy from `.ai-assisted-work/skills-for-agents/codex/.agents/`) |
| Gemini CLI | `/aaw-...` | (copy from `.ai-assisted-work/skills-for-agents/gemini/skills/aaw/`) |

All shims point to the canonical instructions in `.ai-assisted-work/packages/skills/work-management/`. There is one source of truth.

---

## Cloud mode (preview)

`mode: cloud` is reserved for multi-machine coordination via a Cloud Run + Firestore service. The coordinator service ships as a separate repo (`aaw-coordinator`) that consumes `@aaw/protocol`. Cloud mode is not generally available yet; track progress in CHANGELOG.md.

When cloud mode ships, switching is a one-line config change — your skills, your AI tools, and your local CLI all behave identically. Only the transport changes.

---

## Troubleshooting

**`aaw init` says "no AI tools detected"**

The init script looks for `.github/`, `.cursor/`, and `.claude/` directories at the workspace root. If your tool keeps configuration elsewhere, create the directory yourself first or pass an explicit list when prompted (e.g. `copilot,claude`).

**Skills not discoverable in my AI tool**

The shim files just point at the canonical instructions. If your tool isn't reading them, check:
- `.github/prompts/aaw-*.prompt.md` — restart Copilot Chat after first install
- `.claude/commands/aaw/*.md` — Claude Code picks these up on session start
- `.cursor/commands/aaw/*.md` — Cursor reads on workspace open

**Work items aren't showing up in `aaw status`**

Run `aaw verify` first. If it reports the config and path correctly, check that work items exist at the resolved path:

```bash
ls -la $(node .ai-assisted-work/bin/aaw.js status 2>&1 | head -1)
```

**Migrating from v1**

v1 used `change/work-items/` (committed) and optional `change/work-items-private/` (gitignored, often a symlink). v2 reads from a single configured path. Migration steps:

1. Run `aaw init` — pick a `work_items_path` that points at where you want them to live.
2. Move existing `change/work-items/WI-*/` and `change/work-items-private/WIP-*/` folders into the new path. Rename `WIP-NNN-*` to `WI-NNN-*` (use the next-available number to avoid clashes).
3. Delete the old `change/work-items*` directories.
4. The v1 `.gitignore` lines for `work-items-private/` are kept in this repo's `.gitignore` to protect any pre-migration data on contributor machines; you can remove them once migration is complete.

A migration helper is on the roadmap.

---

## See also

- [packages/skills/work-management/README.md](packages/skills/work-management/README.md) — concepts, lifecycle, ID conventions
- [packages/protocol/README.md](packages/protocol/README.md) — protocol contract used by all backends
- [docs/integration/index.md](docs/integration/index.md) — tool-specific notes
- [CHANGELOG.md](CHANGELOG.md) — version history
