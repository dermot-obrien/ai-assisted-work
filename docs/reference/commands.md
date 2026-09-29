# Command reference

Every command AAW ships, checked against its `--help`. Skills are invoked in your agent
(`/aaw-start-work`, `/thread` and so on) and are described in [Skills](../skills/index.md);
this page covers what runs in a shell.

- [aaw](#aaw), the CLI
- [thread.mjs](#threadmjs), the script behind the `thread` skill
- [Post-install checks](#post-install-checks)
- [Repository scripts](#repository-scripts)

Exit codes follow one rule throughout: 0 success, 1 a problem was found or the operation
failed, 2 a usage or environment error.

## aaw

The CLI is one self-contained file, `bin/aaw.js`, in the AAW clone. There is no global
install; run it with Node:

```
node .ai-assisted-work/bin/aaw.js <command> [flags]
```

To type `aaw` instead, add a shell function or alias. PowerShell (`notepad $PROFILE`):

```powershell
function aaw { node ".ai-assisted-work/bin/aaw.js" @args }
```

bash or zsh (`~/.bashrc` or `~/.zshrc`):

```bash
alias aaw='node .ai-assisted-work/bin/aaw.js'
```

Both resolve the path from the current directory, so they work in any workspace with AAW
cloned at `.ai-assisted-work/`. With the npm git dependency (`npm i
github:dermot-obrien/ai-assisted-work`), use `npx aaw` instead.

`aaw --help` (also `-h`, `help`, or no command) prints the usage. `aaw <command> --help`
prints the same usage and does nothing else. `aaw --version` (also `-v`) prints the version.
Set `AAW_DEBUG=1` to see a stack trace with an error.

Every command except `install`, `init` and `check-skills` needs a workspace: the CLI walks up
from the current directory to the first folder holding `.aaw-config.yaml` or `.git`, and
reads the config there. With no config it uses `./change/work-items` and
`./change/initiatives`.

### aaw install

Set up a workspace: write `.aaw-config.yaml`, create the work items folder, install the
skills, and record the install under `modules`. Safe to run again: it keeps existing values
and rewrites nothing that has not changed.

```
aaw install [--workspace PATH] [--yes] [--tenant NAME] [--mode local-fs|cloud] [--work-items-path PATH]
aaw install --framework PATH [--workspace PATH] [--yes] [--no-python] [--seed]
```

| Flag | Default | Effect |
|------|---------|--------|
| `--workspace PATH` | the git root above the current directory, or the current directory | Install into that workspace. In a terminal without it, you are asked |
| `--yes`, `-y`, `--non-interactive` | on when there is no terminal | Ask nothing: take each value from its flag, then the existing config, then the default, and print them on one line |
| `--tenant NAME` | existing, else `local` | Sets `tenant` |
| `--mode local-fs\|cloud` | existing, else `local-fs` | Sets `mode`. Anything else exits 2 |
| `--work-items-path PATH` | existing, else `~/aaw/<tenant>/<repo>/work-items` | Sets `work_items_path`. `~`, `{tenant}` and `{repo}` are expanded when the folder is created; the config keeps what you typed |
| `--framework PATH` | AAW itself | Install another AAW-family framework from its `framework.manifest.yaml`, without the bootstrap questions |
| `--no-python` | off | With `--framework`: skip the framework's `tool_setup.python` |
| `--seed` | off | With `--framework`: run the framework's content seeder |

What it does to the workspace:

- `.agents/skills/<name>/` for every skill, read by Codex, Cursor, GitHub Copilot, VS Code
  and Gemini CLI
- `.claude/skills/<name>`, linked at the above, only when `.claude/` exists: a symlink, or a
  directory junction on Windows; a copy if the filesystem refuses both
- removes the per-tool command shims that installs before 3.0.0 wrote

Exit 0 on success. With `--framework`, exit 1 when there were warnings (a missing
dependency, a failed Python install or seeder); each is printed with `⚠`.

`aaw init` is a compatibility alias for `aaw install` without `--framework`.

### aaw check-skills

Report installed skills that no longer match the framework clone they came from.

```
aaw check-skills [--workspace PATH] [--framework PATH]
```

| Flag | Default | Effect |
|------|---------|--------|
| `--workspace PATH` | the workspace above the current directory | The workspace to check |
| `--framework PATH` | every framework under `modules` in `.aaw-config.yaml` | Check only that framework clone |

Each skill is reported `ok`, `CHANGED` (with up to ten differing files) or `MISSING`. Only
skills the framework ships are compared. Exit 1 when anything differs, or when there is
nothing to check; a framework whose recorded clone is gone is reported as skipped, not as
drift.

### aaw status

```
aaw status              every work item and initiative, grouped by initiative
aaw status WI-NNN       one work item, with its activity and task tree
aaw status IN-NNN       one initiative, with its member work items
```

Symbols: `→` in progress, `✓` done or completed, `✗` blocked, `⌛` awaiting a human, `○` anything else. A `progress.yaml` that cannot
be read is skipped with a message on stderr (see [Troubleshooting](../troubleshooting.md)).

### aaw next-task

```
aaw next-task [WI-NNN]
```

Print the next task: the first pending task in the first pending or in-progress activity
whose dependencies are all completed. With no id it looks across every work item that is not
`done` or `abandoned`. It does not check locks.
A human-only task is shown with `Actor: human (agent should mark awaiting_human)`. Prints
`No claimable task in WI-NNN.` when there is none.

### aaw claim

```
aaw claim ACTIVITY_ID [--agent ID] [--ttl SECONDS]
```

| Flag | Default | Effect |
|------|---------|--------|
| `--agent ID` | `agent-<random>` | The holder recorded in the lock |
| `--ttl SECONDS` | `3600` | How long the claim lasts |

Creates `locks/<ACTIVITY_ID>.lock` in the work item's folder with an exclusive create. An
expired lock is replaced. Exit 1 with `is held by <holder>` when a live lock exists. It does
not change the activity's status; the skills do that. Mostly for testing and for
interventions: in normal use `/aaw-progress-work` claims for itself.

### aaw release

```
aaw release ACTIVITY_ID [--reason REASON]
```

Deletes the activity's lock. Refused while the activity is `in_progress`: set a terminal
status in `progress.yaml` first. `--reason` is accepted and not yet recorded.

### aaw lint

```
aaw lint
```

Report duplicate work item or initiative numbers, status, actor and type values outside the
allowed set, dependencies on unknown activities, and dependency cycles. Prints
`aaw lint: no issues` and exits 0, or lists each issue and exits 1.

### aaw verify

```
aaw verify
```

Check the workspace root, mode and tenant, that the work items folder can be written and
read (it creates the folder if needed), and that the work items can be listed. Ends with
`All checks passed.` (exit 0) or `Verification failed.` (exit 1).

### aaw runner start

```
aaw runner start [--pool POOL] [--interval SECONDS]
```

| Flag | Default | Effect |
|------|---------|--------|
| `--pool POOL` | the tenant | The pool to poll |
| `--interval SECONDS` | `30` | Seconds between polls |

Polls for claimable activities and prints them until Ctrl-C. It claims nothing: it is the
skeleton of a headless runner.

### aaw migrate v1

```
aaw migrate v1 [--dry-run]
```

Move a version 1 layout (`change/work-items/`, `change/work-items-private/`,
`change/initiatives/`, `change/initiatives-private/`) into the configured
`work_items_path` and `initiatives_path`. Private `WIP-NNN` and `INP-NNN` items are
renumbered into the shared series, and the ids inside their files are rewritten.
`--dry-run` prints the plan and changes nothing.

## thread.mjs

The `thread` skill's script. The agent runs it for you when you type `/thread`; you can
also run it directly:

```
node .agents/skills/thread/bin/thread.mjs <command> [args] [flags]
```

| Command | Does |
|---------|------|
| `thread` or `thread status [--all]` | Open threads in this project, most recent first |
| `thread open "<text>" [--parent <id> \| --project <id\|name> \| --root] [--kind <kind>] [--tool <name>] [--ctx <name>]` | Open a thread. With no `--parent`, a root thread goes under `--project`, else `$THREAD_PROJECT` or `threads_project` |
| `thread project ["<name>" \| <id>]` | Find or start a project (a root thread of kind `project`) |
| `thread projects` | Every project. Same as `list --kind project` |
| `thread resume <id>`, or just `thread <id>` | Pick a thread back up: anchor, path and notes |
| `thread show <id>` | One thread: path, notes, branches |
| `thread done\|park\|drop <id> "<resolution>"` | Close or park a thread. The resolution is required |
| `thread note <id> "<text>"` | Add a note |
| `thread refine <id> "<Title. Description>"` | The first sentence renames, the rest describes |
| `thread rename <id> "<title>"` | Change the title; earlier titles are kept |
| `thread describe <id> "<text>"` | Set the description |
| `thread move <id> --parent <id> \| --root` | Move a thread in the tree |
| `thread kind <id> <kind>\|none` | Tag a thread (improvement, bug, project...) or clear the tag |
| `thread list [--kind <kind>] [--all] [--json]` | Every thread of that kind, across all trees |
| `thread fork <id>` | The header for handing a thread to a new chat |
| `thread tree [<id>] [--all] [--mermaid\|--json]` | Open and parked threads; `--all` (or `tree all`) adds finished and archived ones |
| `thread prune [--days <n>] [--dry-run]` | Archive closed branches into a new `archive/` file. Alias `archive` |
| `thread init [<git-url>]` | Clone or seed the store |
| `thread sync` | Push anything left unpushed |
| `thread help` (or `-h`, `--help`) | The usage |

Every command that writes also archives, once a day, the branches closed before that day
(`THREADS_AUTO_PRUNE=0` turns that off). Errors are printed as `thread: <message>` with exit
1. The store and its variables are in [Configuration](configuration.md#environment-variables).

## Post-install checks

Each skill ships `bin/check.mjs`, which tests the workspace configuration the skill depends
on. Run it from the workspace root:

```
node .agents/skills/aaw-start-work/bin/check.mjs
```

The five `aaw-*` checks are one file, copied into each skill. They check that
`.aaw-config.yaml` exists, that `work_items_path` (and `initiatives_path` where set) resolve
to folders, that a plain `deliverables_register` path exists, and that `mode` is valid.
`thread`'s check looks for git and for a store at `$THREADS_HOME`, or a remote to clone one
from. Each prints `warning:` lines, one line per problem, then `<skill>: ok` when there are
no problems. `--help` prints a one-line usage; any other argument exits 2.

`aaw install` does not run them yet. To run every skill's check the way an installer
would, from a workspace with AAW cloned at `.ai-assisted-work/`:

```
node .ai-assisted-work/scripts/validate-bundle.mjs --run-checks . .ai-assisted-work
```

## Repository scripts

These live in the AAW repository's `scripts/` and are what CI runs. They need no install
except `test-work-schema.mjs`, which needs `npm ci` first.

| Command | Checks | Exit |
|---------|--------|------|
| `node scripts/validate-skills.mjs [skillsRoot]` | Each `SKILL.md` against the Agent Skills specification: front matter, name and description limits, relative links, and body size (warnings above 500 lines or about 5,000 tokens). Default root `./skills` | 1 on any error |
| `node scripts/validate-bundle.mjs [bundleDir ...]` | `bundle.json` against `schemas/bundle.schema.json`, and against the skills it lists: names, versions, purls, requires, check files, ontology | 1 on any error |
| `node scripts/validate-bundle.mjs --run-checks <workspace> [--skills <dir>] [bundleDir]` | Runs each listed skill's post-install check in the workspace, with `SKILL_DIR` set. Skills default to `<workspace>/.agents/skills` | 1 if any check fails |
| `node scripts/validate-bundle.mjs --instance <file.json> --schema <$id\|file>[#pointer]` | Validates any JSON file against a schema | 1 on errors, 2 on usage |
| `node scripts/test-work-schema.mjs` | The `progress.yaml` templates against `schemas/work.schema.json`, and cases the schema must refuse | 1 on failure |
| `node scripts/check-protocol-schema.mjs` | `packages/protocol/src/schema.ts` agrees with the work schema | 1 on disagreement |

`validate-bundle.mjs` also takes `--schemas <dir>` in any form, to load more schemas, and
`--help`. `validate-skills.mjs` takes `--help`.

npm scripts at the repository root:

| Command | Does |
|---------|------|
| `npm run build` | Builds every package's `dist/` |
| `npm test` | The CLI's install tests, against `bin/aaw.js` |
| `npm run release` | Builds, bundles and publishes through Changesets (see [PUBLISHING.md](../../PUBLISHING.md)) |

In `packages/cli`, `npm run bundle` regenerates `bin/aaw.js`. See
[CONTRIBUTING.md](../../CONTRIBUTING.md#development-setup) for the build order.
