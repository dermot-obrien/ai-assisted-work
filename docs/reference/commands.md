# Command reference

Every command this repository ships, checked against its `--help`. Skills are invoked in your agent (`/work start`, `/work progress` and so on) and are described in [Skills](../skills/index.md); this page covers what runs in a shell.

- [skills.mjs](#skillsmjs), the installer
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

## Post-install checks

The `work` skill ships `bin/check.mjs`, which tests the workspace configuration it depends on. Run it from the workspace root:

```
node .agents/skills/work/bin/check.mjs
```

`work`'s check reads `.aaw-config.yaml` when it is there, and the defaults when it is not. It checks that `work_items_path` and `initiatives_path` resolve to folders and not to files (a missing folder is only a warning, since `work` creates it on first use), that a plain `deliverables_register` path exists, and that `mode`, when set, is valid. It prints `warning:` lines, one line per problem, then `work: ok` when there are no problems. Exit 0 with no problems, 1 with any. `--help` (or `-h`) prints one line and exits 0. Any other argument exits 2.

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
| `node --test scripts/test-skills.mjs` | The installer | 1 on failure |
| `node scripts/extract-skill.mjs <skill> <out-dir> [--owner <owner>]` | Builds one skill as a repository of its own, with its history, licences, validators, `bundle.json` and CI, and tags it. Pushes nothing. CI's extraction job runs it for each skill | 1 on failure |

`validate-bundle.mjs` also takes `--schemas <dir>` in any form, to load more schemas, and `--help`. `validate-skills.mjs` takes `--help`.

`npm test` at the repository root runs the work schema test and the installer test.
