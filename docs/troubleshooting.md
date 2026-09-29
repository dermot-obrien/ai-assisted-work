# Troubleshooting

Find the message you saw, then read what it means and what to do. Messages are quoted as
the tools print them; `<...>` stands for the part that varies. Search this page for a few
words of your message.

- [In the agent](#in-the-agent)
- [aaw install](#aaw-install)
- [aaw status, lint, claim and the other commands](#aaw-status-lint-claim-and-the-other-commands)
- [aaw check-skills](#aaw-check-skills)
- [Post-install checks](#post-install-checks)
- [thread](#thread)
- [Validators](#validators)

## In the agent

### A skill is not listed in the agent

Type `/`: the `aaw-*` skills and `thread` should be listed. If they are not:

1. Start a new chat, or restart the agent. Most agents read the skill list when a session
   starts.
2. Check the workspace you opened is the one you installed into: it has `.agents/skills/`
   with a folder per skill, each holding a `SKILL.md`.
3. For Claude Code, check `.claude/skills/<name>` exists. It is created only when `.claude/`
   existed at install time: run `mkdir .claude`, then install again.
4. On Windows, `.claude/skills/<name>` is a directory junction. If the installer printed
   `claude: copied <n> → .claude\skills/ (links unavailable)`, it is a copy instead; install
   again after every update.

See [Installing in each agent](integration/index.md) for where each agent looks.

### A skill is listed twice

Expected in Cursor and in VS Code with GitHub Copilot when the workspace is also set up for
Claude Code: they read both `.agents/skills/` and `.claude/skills/`, and the second is a
link to the first. Both entries are the same skill.

### The agent does not use a skill unless I type the command

Each skill's `description` says when to use it, and the agent decides. Name the job the
skill does ("start a work item for...", "what is the status of WI-004") or type the
command.

### Old `/aaw:start-work` commands still appear

Those are the per-tool command shims from before 3.0.0. Run `aaw install` again: it removes
any it wrote and prints `removed <n> legacy shim path(s) superseded by skills`.

## aaw install

### `Unsupported mode: <mode>`

Exit 2. `--mode`, or `mode` in `.aaw-config.yaml`, must be `local-fs` or `cloud`. Nothing is
written.

### `Error: --workspace requires a value`

Also `--framework requires a path argument`, and the same for `--tenant`, `--mode` and
`--work-items-path`. The flag is last, or followed by another flag. Give it a value.

### `▸ Detected tools: none`

The installer looks for `.github/`, `.cursor/` and `.claude/` in the workspace. It installs
the skills to `.agents/skills/` whatever it finds, so this matters only for Claude Code:
create `.claude/` and install again to get the `.claude/skills/` links.

### A folder named `~` appeared in my workspace

AAW 3.2.0 and earlier, run from PowerShell with `--work-items-path ~/...`: PowerShell passes `~`
through unexpanded, and the installer created the folder literally. Delete the `~` folder
and install again with a newer AAW, or write the full path.

### `! skills: <name> has no SKILL.md, skipped`

A folder in the framework's `skills/` has no `SKILL.md`. Harmless if it is not a skill;
otherwise the framework clone is incomplete: `git status` in it, or clone again.

### `⚠ depends on "<id>" which is not installed`

With `--framework`: the framework needs another one installed first. Install that one,
then this one again. The install exits 1 while any warning stands.

### `⚠ tool_setup.python.requirements not found`, `⚠ content seeder failed (exit <n>)`

With `--framework`: the framework's Python requirements or seeder did not run. Check Python
is on the PATH, or pass `--no-python` to skip it.

### `aaw install --help` installed into the current directory

AAW 3.2.0 and earlier ignored `--help` after `install`. Delete `.aaw-config.yaml`,
`.agents/skills/` and the work items folder it created (it printed `▸ Creating <path>`), or
keep them if that was the right place. Newer versions print the help and stop.

## aaw status, lint, claim and the other commands

### `No work items or initiatives in <path>`

The folder `work_items_path` resolves to holds no `WI-NNN-<slug>/progress.yaml`. Either
there is no work yet (use `/aaw-start-work`), or the path is not where your work items are:
check `work_items_path` in `.aaw-config.yaml`, and that you are running from the right
workspace. With no `.aaw-config.yaml` at all, the CLI looks in `./change/work-items`.

### `aaw: skipping <path>/progress.yaml: Map keys must be unique at line <n>`

That `progress.yaml` is not valid YAML, here because a key appears twice. Any YAML error is
reported the same way, with the line. Fix the file; the other work items are still listed.

### `Error: .aaw-config.yaml: unknown mode '<mode>'`

`mode` must be `local-fs` or `cloud`. Any `aaw` command that reads the config stops here.

### `Error: Map keys must be unique` (with no file named)

`.aaw-config.yaml` itself has a key twice, often `mode` or `work_items_path` appended by
hand. Remove the duplicate.

### `Error: Work item WI-<n> not found`

No folder in the work items folder starts with `WI-<n>-`. Check the id with `aaw status`.
Ids are zero-padded: `WI-007`, not `WI-7`.

### `aaw claim: <activity> is held by <holder>`

Exit 1. A live lock exists: another worker has the activity until the expiry in
`locks/<activity>.lock`. Pick another activity, or wait. An expired lock is replaced
automatically. Never delete a live lock to get past this.

### `aaw claim: Cannot derive work item ID from '<id>'`

The argument is not an activity id. Activity ids look like `WI-001-A1`.

### `aaw claim: Activity <id> not found`

The work item exists but has no activity with that id. `aaw status WI-NNN` lists them.

### `aaw claim: missing ACTIVITY_ID (e.g. WI-001-A1)`

Exit 2. Give the activity to claim.

### `aaw release: <activity> is in_progress: set a terminal status ... before releasing it`

A lock may be released only once the activity's state is recorded: set its `status` in
`progress.yaml` to `completed`, `blocked`, `skipped` or `abandoned`, then release. AAW 3.2.0
and earlier printed `Caller must call updateActivity to set terminal state before
releaseActivity does not hold the claim for <activity>` for the same thing.

### `aaw lint: <n> issue(s)`

Each issue names the file or field and what is wrong:

| Message | Fix |
|---------|-----|
| `duplicate ID — <n> folders share this number` | Two folders have the same `WI-NNN` (or `IN-NNN`); `WI-1-x` and `WI-001-y` count as the same. Renumber one, and the ids inside it |
| `invalid WorkItemStatus '<value>'` | Use one of the values listed in the message |
| `invalid ActivityStatus '<value>'`, `invalid TaskStatus '<value>'` | Often `done` where `completed` is meant |
| `invalid Actor '<value>'` | `agent`, `human` or `any` |
| `invalid WorkType '<value>'` | `development`, `architecture`, `consultancy`, `mixed`, `<prefix>:<value>` or `x-<value>` |
| `invalid InitiativeStatus '<value>'` | Use one of the values listed |
| `references unknown activity '<id>'` | A `depends_on` names an activity that does not exist on this work item |
| `dependency cycle: <A> → <B> → <A>` | Activities wait on each other; remove one dependency |

Wrong activity counts in `aaw status` usually have the same cause as an invalid status.

### `Verification failed.`

`aaw verify` marks the failing check with `✗` and the reason. For
`work_items_path read+write`, the folder cannot be created or written: check the path and
its permissions.

### `No claimable task in WI-<n>.`

Every pending activity waits on one that is not completed, or has no pending task. `aaw
status WI-<n>` shows which.

### `Unknown command: <command>`

Exit 2, followed by the usage. Also `aaw runner: expected subcommand 'start'` and
`aaw migrate: expected 'v1'`.

## aaw check-skills

### `CHANGED <skill> — <n> file(s) differ`

The installed copy no longer matches the framework clone. If you edited the copy on
purpose, move the change into the framework and release it; if not, run `aaw install` to
restore it. Exit 1.

### `MISSING <skill> — not installed in this workspace`

The framework ships a skill the workspace does not have. Run `aaw install`.

### `▸ <id>: skipped, no framework at <path>`

The framework clone recorded under `modules` in `.aaw-config.yaml` is not there. Clone it
back to that path, or install from where it now is. Not counted as drift.

### `No frameworks recorded in .aaw-config.yaml, and no --framework given.`

Exit 1. Nothing was installed with a recent AAW: run `aaw install`, or pass `--framework`.

## Post-install checks

The checks (`node .agents/skills/<skill>/bin/check.mjs`, or all of them through
`validate-bundle.mjs --run-checks`) print one line per problem.

| Message | Meaning |
|---------|---------|
| `.aaw-config.yaml: not found in <dir>` | Run the check from the workspace root, or run `aaw install` there |
| `work_items_path <path> resolves to <dir>, which does not exist. Create the folder, or correct work_items_path.` | Exit 1. The configured folder is missing |
| `warning: ... work_items_path (unset, so the default ./change/work-items/) ... does not exist` | No path configured and no work yet. Only a warning |
| `warning: ... initiatives_path ... does not exist. ... creates it on first use.` | Normal before the first initiative |
| `..., which is a file, not a folder. Point it at a folder.` | The path names a file |
| `deliverables_register <path> resolves to <file>, which does not exist.` | Correct the path, or remove the key to name products inline |
| `mode <mode> is not local-fs or cloud.` | Fix `mode` |
| `usage: check.mjs   (run from the workspace root; takes no arguments)` | Exit 2. The check takes no arguments |
| `Node.js <version> is too old: this check needs 18 or newer.` | Exit 2. Upgrade Node |
| `<store>: no thread store yet, and no remote to clone one from.` | `thread`: set `THREADS_REMOTE` or `threads_remote` (below) |
| `warning: <store>: no thread store yet; thread clones <url> on first use.` | `thread`: fine; the first command clones it |
| `<store>: the thread store is not a git clone.` | Move the folder aside, or point `THREADS_HOME` at a clone |
| `<store>: the thread store is a file, not a folder.` | Move the file aside, or point `THREADS_HOME` at another folder |
| `git: not found on the PATH. Install git; thread keeps its store in a git clone.` | `thread`: install git, then open a new terminal |

## thread

### `thread: no threads store at <path>, and no remote configured to clone it from.`

Create an empty private repository to hold your threads, then point at it in one of these
ways (the message lists them too): `setx THREADS_REMOTE <url>` on Windows and open a new
terminal, `export THREADS_REMOTE=<url>` in your shell profile elsewhere, `threads_remote:
<url>` in `.aaw-config.yaml`, or once with `thread init <url>`.

### `thread: could not clone <url>:`

Followed by git's own message. Usually the URL is wrong or you have no access; in a cloud
session, the session needs credentials for that repository (see
[the thread skill](skills/thread.md#cloud-sessions)). Set `THREADS_HOME` to an absolute
path: a relative one is taken from your home folder when cloning.

### `thread: NOT PUSHED — recorded locally only.`

The remote could not be reached, or you cannot push to it. The event is kept and goes up
with the next command that succeeds, or `thread sync`. In a cloud session, unpushed events
are lost when the container ends, so fix access first.

### `thread: a resolution is required: thread done <id> "..."`

`done`, `park` and `drop` need a one-line resolution: what was decided or delivered, or why
it stopped.

### `thread: no thread <id>`, `thread: which thread? pass its id, e.g. t-4k2`

The id is wrong or missing. `thread tree --all` lists every id.

### `thread: unknown command "<command>". Try: thread help`

See [Commands](reference/commands.md#threadmjs).

### Other `thread:` messages

| Message | Fix |
|---------|-----|
| `a kind is one lowercase word, such as feature or bug` | Use one lowercase word |
| `more than one project is called "<name>": <ids>; use its id` | Pass the id instead of the name |
| `no project "<name>". Start it with: thread project "<name>"` | Create the project first |
| `<id> is not a project (its kind is <kind>)` | `thread kind <id> project` makes it one |
| `can't move a thread under its own branch` | Choose a parent outside the thread's subtree |
| `move where? --parent <id> or --root` | Add one of them |
| `--days takes a number` | For example `thread prune --days 7` |
| `<id> is already called that` | Nothing to change |
| `skipping unreadable event <file>` | A file in the store is damaged; never edit the store by hand. Restore it from git in the store |

## Validators

For contributors running the repository's checks.

| Message | Fix |
|---------|-----|
| `name '<name>' must equal the directory name '<dir>'` | Rename one |
| `description is <n> chars, max 1024` | Shorten the description |
| `'<key>' is an unquoted value containing ': ', which is invalid YAML; quote it` | Quote the value in the front matter |
| `broken relative link -> <target>` | Fix the link in `SKILL.md` |
| `warn: <file>: body is about <n> tokens; the spec recommends under 5000` | Move detail to `references/` |
| `warn: '<key>' is not a spec field` | Fine if the key is meant for one client |
| `bundle.json: /skills/<i>/version: <v> is not SKILL.md's metadata.version, <v>` | Bump both together |
| `bundle.json: /skills: skills/<name> holds a SKILL.md but is not listed` | Add the skill to `bundle.json` |
| `bundle.json: /skills/<i>/purl: <purl> should be <purl>` | Use the purl the message gives |
| `bin/aaw.js is out of date` (CI) | Run `npm run bundle` in `packages/cli` and commit `bin/aaw.js` |
| `skills-ref` fails on non-ASCII characters on Windows | Set `PYTHONUTF8=1` first |
