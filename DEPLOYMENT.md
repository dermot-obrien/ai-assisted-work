# Deployment Guide

How to install, update, remove and migrate AI-Assisted Work (AAW) in a workspace. For a
first install, the [quick start](docs/quick-start.md) is faster; for your agent's folders and
user-level installs, see [Installing in each agent](docs/integration/index.md).

## Install

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/aaw.js install
```

Requires Node.js 18 or newer (20 recommended) and git. `bin/aaw.js` is a self-contained
bundle in the clone, so no npm registry access is needed. It works the same on Windows,
macOS and Linux.

The installer asks for the workspace, tenant, mode and work items folder (or takes them from
flags, with `--yes` to ask nothing), then writes `.aaw-config.yaml`, creates the work items
folder, installs the skills to `.agents/skills/`, links `.claude/skills/` at them when
`.claude/` exists, and records itself under `modules`. Every flag is in the
[command reference](docs/reference/commands.md#aaw-install).

## What gets created

```
your-repo/
├── .ai-assisted-work/          the AAW clone: skills, CLI, docs
├── .aaw-config.yaml            workspace config (commit this)
├── .agents/skills/<name>/      installed skills (generated; gitignore them)
├── .claude/skills/<name>       links to the above, for Claude Code
└── your files                  untouched

~/aaw/<tenant>/<repo>/
├── work-items/                 WI-NNN-<slug>/ folders, outside the repository
└── initiatives/                IN-NNN-<slug>/ folders, created on first use
```

Work items live outside the repository by default, so progress state, locks and scope notes
stay out of its history. To publish one, copy a cleaned snapshot into the repository as a
deliberate step, or point `work_items_path` inside the repository. Every key in
`.aaw-config.yaml` is in the [configuration reference](docs/reference/configuration.md).

## Shell alias

The clone does not put `aaw` on your PATH. Type the path, or add an alias once.

PowerShell, in `$PROFILE` (create it with
`if (!(Test-Path $PROFILE)) { New-Item -Type File -Force $PROFILE }`, then `notepad $PROFILE`):

```powershell
function aaw { node ".ai-assisted-work/bin/aaw.js" @args }
```

bash or zsh, in `~/.bashrc` or `~/.zshrc`:

```sh
alias aaw='node .ai-assisted-work/bin/aaw.js'
```

Reload with `. $PROFILE` or `source ~/.bashrc`, or open a new shell. The path is relative to
the current directory, so `aaw status` works in any workspace with AAW cloned at
`.ai-assisted-work/`.

## Verify

```bash
node .ai-assisted-work/bin/aaw.js verify
node .ai-assisted-work/bin/aaw.js check-skills
```

`verify` checks the config and that the work items folder can be written and listed.
`check-skills` confirms the installed skills match the clone. Then type `/` in your agent:
the `aaw-*` skills and `thread` should be listed.

## Update

```bash
git -C .ai-assisted-work pull
node .ai-assisted-work/bin/aaw.js install --yes
```

The install is idempotent: it keeps your config values and comments, and replaces the
installed skills with the new versions. With one clone serving several workspaces, pull once
and install into each with `--workspace <path>`.

## Remove

```bash
rm -rf .ai-assisted-work .agents/skills/aaw-* .agents/skills/thread .claude/skills/aaw-* .claude/skills/thread
rm .aaw-config.yaml
```

PowerShell:

```powershell
Remove-Item -Recurse -Force .ai-assisted-work, .agents/skills/aaw-*, .agents/skills/thread, .claude/skills/aaw-*, .claude/skills/thread
Remove-Item .aaw-config.yaml
```

Your work items under `~/aaw/<tenant>/<repo>/` are not touched. Delete them yourself if you
no longer want them.

## Migrating from v1

v1 kept work items in the repository, in `change/work-items/` and an optional
`change/work-items-private/`, with private items numbered `WIP-NNN`. v2 reads one configured
folder. After `aaw install`:

```bash
node .ai-assisted-work/bin/aaw.js migrate v1 --dry-run   # see the plan
node .ai-assisted-work/bin/aaw.js migrate v1             # move and renumber
```

It moves every work item and initiative into the configured folders, renumbers `WIP-` and
`INP-` items into the shared series, and rewrites the ids inside their files. Review and
remove the emptied `change/` folders yourself.

## Cloud mode

`mode: cloud` is reserved for coordinating several machines through a separate coordinator
service built on `@aaw/protocol`. It is not generally available; the CLI accepts the value
but still reads local files. Watch [CHANGELOG.md](CHANGELOG.md).

## Troubleshooting

See [Troubleshooting](docs/troubleshooting.md), which is keyed to the messages the tools
print.
