# Command reference

Every command this repository ships, checked against its `--help`. Skills are invoked in your agent (`/work start`, `/thread` and so on) and are described in [Skills](../skills/index.md); this page covers what runs in a shell.

- [skills.mjs](#skillsmjs), the installer
- [thread.mjs](#threadmjs), the script behind the `thread` skill
- [Post-install checks](#post-install-checks)
- [Repository scripts](#repository-scripts)

Exit codes follow one rule throughout: 0 success, 1 a problem was found or the operation failed, 2 a usage or environment error.

The `aaw` command (`aaw install`, `aaw status`, `aaw claim` and the rest) was removed in 5.0.0. Its work is done in the agent by the `work` skill: `/work status`, `/work next`, and `/work progress`, which claims and releases its own locks. A workspace that still needs it pins the `v4.0.0` tag.

## skills.mjs

The installer is one file with no dependencies, `bin/skills.mjs`. Run it with Node.js 18 or newer, from a clone of this repository or from a copy kept in the workspace:

```
node .ai-assisted-work/bin/skills.mjs <command> [flags]
```

| Command | Does |
|---------|------|
| `list [--bundle <file\|dir>] [--json]` | The bundle's skills, `●` for those installed in this workspace and `○` for the rest |
| `install [<name>...] [--bundle <file\|dir>]` | Install the skills named, or every skill in the bundle |
| `install --repo <url> [--ref <tag>] [--path skills/<name>] [--name <skill>]` | Install one skill from a repository of its own. `--path` defaults to `skills/<name>`, and `--name` to the repository's name |
| `sync [--locked]` | Install what `.agents/skills.json` declares, record each commit in the lock, and remove any skill it installed that the file no longer lists. `--locked` installs the commits already in the lock, as a session start should |
| `update [<name>...]` | Fetch each installed skill again, or the ones named, and reinstall it |
| `check` | `✓` or `✗` per installed skill. Exit 1 when one changed since it was installed or is missing |
| `remove <name>...` | Remove the installed copies, their `.claude/skills/` links and their lock entries |
| `help` (or `--help`) | The usage, including the format of `.agents/skills.json` |

| Flag or variable | Effect |
|------------------|--------|
| `--bundle <file\|dir>` | The bundle to read: a `bundle.json`, or the folder holding one. Default: the `bundle.json` beside the script's repository |
| `--workspace <dir>` | The workspace to install into. Default: the git root above the current directory, else the current directory |
| `--from <folder>` | Install from copies on this machine, with no network: a folder of skill folders, or of repository clones |
| `--copy` | Copy into `.claude/skills/` instead of linking |
| `--dry-run` | Say what would be installed, and change nothing |
| `SKILLS_BASE_URL` | Clone from a mirror: each repository comes from `<base>/<repository>.git` |

Skills go to `.agents/skills/<name>`, linked from `.claude/skills/<name>` when `.claude/` exists (a directory junction on Windows). The lock is `.agents/skills.lock.json`, and `.agents/.skill-sources/` holds the clones; gitignore the clones and commit the lock. The format of `.agents/skills.json` is in [Installing the skills](../../DEPLOYMENT.md#declare-a-workspaces-skills).

Errors are printed as `skills: <message>`; see [Troubleshooting](../troubleshooting.md#skillsmjs).

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
| `thread link <id> <ref>\|none` | Link a thread to the plan: an activity (`WI-012-A3`) or task (`WI-012-A3-T2`), or a reference such as `IMP-004`. A whole work item is refused (DD-16) |
| `thread fork <id>` | The header for handing a thread to a new chat |
| `thread tree [<id>] [--all] [--mermaid\|--json]` | Open and parked threads; `--all` (or `tree all`) adds finished and archived ones |
| `thread prune [--days <n>] [--dry-run]` | Archive closed branches into a new `archive/` file. Alias `archive` |
| `thread sources` | Every source in the store, with its open trees |
| `thread transfer <id> --to <source>` | Move a thread and every branch under it, archived ones included, to another source. Ids and history are kept |
| `thread init [<git-url>] [--local]` | Clone or seed the store; `--local` starts one with no remote |
| `thread sync` | Push anything left unpushed |
| `thread help` (or `-h`, `--help`) | The usage |

### thread board

The bulletin board for agents (DD-13, DD-14), in `board/` of each source. A chat's scope is the
source path it joined at; it hears its handle and roles from anywhere, and everything else from
its path, the paths above it and below it. Claims and roles hold across the whole store. Commands that speak
for a chat take `--as <handle>` or `$BOARD_AS`. `--to` takes a comma list of handles, roles,
`*` (everyone), `any` (an open call) and `repo:<name>`.

| Command | Does |
|---------|------|
| `thread board start [--as <h>] [--source <path>] [--tool <t>] [--role <r>] [--thread <id>] [--note "..."] [--take]` | Join: records presence (8h), takes the roles named, prints the briefing. A new handle unless `--as` |
| `thread board status [--source <path\|all>] [--json]` | For the user: who is working on what, merge queues, instructions not yet done, open threads nobody holds |
| `thread board dump "<text>" \| -` | Capture anything for a curator; `-` reads stdin. Without `--as` it is from `user` |
| `thread board triage [--json]` | For a curator: unfiled dumps, questions asked about them, and threads they look like |
| `thread board file <post> --is <what> [--under <thread>] [--plan <ref>] [--title "..."] [--into <thread>] [--of <id>] [--more]` | File a dump as a chore, task, bug, feature, improvement or idea thread, a note, a duplicate, a reflection, or drop it |
| `thread board ask <post> "<question>"` | Ask a post's author; the answer returns to the asker |
| `thread board tidy` | The curator's sweep: unfiled, unanswered, unlinked, orphaned and doubled |
| `thread board next [--claim] [--list] [--limit 5] [--json]` | What to do next, best first. `--claim` takes the best open thread, trying the next when another chat wins it; `--list` is the scope's view for a dispatcher (DD-15) |
| `thread board ready <owner/repo#n> "<what it changes>" [--to <role>] [--after <refs>] [--deploy "<what>"]` | Join the merge queue of `master:<repo>` or the role named. An update keeps its place |
| `thread board queue [--to <role>] [--json]` | The merge queue in order, with what waits for what and what is next |
| `thread board merging\|merged <owner/repo#n> ["<note>"]` | For the merging role: start a merge (refused while it waits on another), then record it. `merged` needs a note |
| `thread board start --hook` | The briefing without joining or writing, for a session-start hook; silent with no store |
| `thread board post "<text>" --to <...> [--on <thread>] [--ref <ref>] [--kind <k>] [--reply <post>] [--for-user]` | Post. Kinds: `instruction`, `question`, `info` (default), `ready`, `standing`, `answer` |
| `thread board reply <post> "<text>"` | Answer a post, to its sender, on its thread |
| `thread board inbox [--json]` | Unread for this chat, and open calls |
| `thread board accept\|done\|decline <post> ["<note>"]`, `thread board ack <post> [<state>] ["<note>"]` | Acknowledge. `done` and `decline` need a note |
| `thread board read [--on] [--ref] [--from] [--to] [--kind] [--days 3] [--limit 30] [--all] [--json]` | The board's posts with their acknowledgements |
| `thread board sent` | What this chat posted, and who acknowledged it |
| `thread board who [--json]` | Agents present, with tool, repository, roles and claims |
| `thread board claim <key> [--for 1h] [--note "..."] [--take]` | Claim a key under a lease. Exit 2 when another chat holds it |
| `thread board release <key> [--take]` | Release a claim |
| `thread board role [<name>] [--release] [--take] [--for 8h]` | Take a role, or list roles with no name |
| `thread board roles`, `thread board locks [--json]` | Roles and claims, with holders, leases and lost races |
| `thread board renew` | Renew presence, roles and claims due within 20 minutes |
| `thread board wait [--timeout 30m] [--every 1m]` | Block until something arrives (exit 0), or time out (exit 3) |
| `thread board retract <post>` | Withdraw a post, such as a standing order |
| `thread board bye ["<note>"]` | Leave: presence, roles and claims end |
| `thread board prune [--days 7] [--dry-run]` | Archive settled board files to `board-archive/`; also daily |

`--source <name>` on any command picks the source, a separate tree in the same store (DD-12). A
name is a path such as `patternode/platform`, and a view of `patternode` includes every source
beneath it (DD-14);
else `$THREAD_SOURCE`, else `threads_source` in `.aaw-config.yaml`, else the default. An id held by
another source is found there. `status`, `tree` and `list` take `--source all` to show every
source in turn.

Every command that writes also archives, once a day, the branches closed before that day
(`THREADS_AUTO_PRUNE=0` turns that off). Errors are printed as `thread: <message>` with exit
1. The store and its variables are in [Configuration](configuration.md#environment-variables).

## Post-install checks

Each skill ships `bin/check.mjs`, which tests the workspace configuration the skill depends on. Run it from the workspace root:

```
node .agents/skills/work/bin/check.mjs
node .agents/skills/thread/bin/check.mjs
```

`work`'s check reads `.aaw-config.yaml` when it is there, and the defaults when it is not. It checks that `work_items_path` and `initiatives_path` resolve to folders and not to files (a missing folder is only a warning, since `work` creates it on first use), that a plain `deliverables_register` path exists, and that `mode`, when set, is valid. `thread`'s check looks for git and for a store at `$THREADS_HOME`, or a remote to clone one from. Each prints `warning:` lines, one line per problem, then `<skill>: ok` when there are no problems. Exit 0 with no problems, 1 with any. `--help` (or `-h`) prints one line and exits 0. Any other argument exits 2.

`skills.mjs` does not run them. To run every skill's check the way an installer would, from a workspace with this repository cloned at `.ai-assisted-work/`:

```
node .ai-assisted-work/scripts/validate-bundle.mjs --run-checks . .ai-assisted-work
```

## Repository scripts

These live in this repository's `scripts/` and are what CI runs. They need no install except `test-work-schema.mjs`, which needs `npm ci` first.

| Command | Checks | Exit |
|---------|--------|------|
| `node scripts/validate-skills.mjs [skillsRoot]` | Each `SKILL.md` against the Agent Skills specification: front matter, name and description limits, relative links, and body size (warnings above 500 lines or about 5,000 tokens). Default root `./skills` | 1 on any error |
| `node scripts/validate-bundle.mjs [bundleDir ...]` | `bundle.json` against `schemas/bundle.schema.json`, and against the skills it lists: names, versions, purls, requires, check files, ontology | 1 on any error |
| `node scripts/validate-bundle.mjs --run-checks <workspace> [--skills <dir>] [bundleDir]` | Runs each listed skill's post-install check in the workspace, with `SKILL_DIR` set. Skills default to `<workspace>/.agents/skills` | 1 if any check fails |
| `node scripts/validate-bundle.mjs --instance <file.json> --schema <$id\|file>[#pointer]` | Validates any JSON file against a schema | 1 on errors, 2 on usage |
| `node scripts/test-work-schema.mjs` | The `progress.yaml` templates against `skills/work/assets/work.schema.json`, and cases the schema must refuse | 1 on failure |
| `node --test scripts/test-thread.mjs scripts/test-board.mjs scripts/test-skills.mjs` | The thread script, the board and the installer | 1 on failure |
| `node scripts/extract-skill.mjs <skill> <out-dir> [--owner <owner>]` | Builds one skill as a repository of its own, with its history, licences, validators, `bundle.json` and CI, and tags it. Pushes nothing. CI's extraction job runs it for each skill | 1 on failure |

`validate-bundle.mjs` also takes `--schemas <dir>` in any form, to load more schemas, and `--help`. `validate-skills.mjs` takes `--help`.

`npm test` at the repository root runs the work schema test and the three `node --test` suites.
