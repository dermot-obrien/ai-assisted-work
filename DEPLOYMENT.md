# Installing the skills

How to install, declare, update, check and remove the `work` and `thread` skills, and skills from other repositories, with [`bin/skills.mjs`](bin/skills.mjs). For a first install the [quick start](docs/quick-start.md) is faster; for the folder each agent reads and user-level installs, see [Installing in each agent](docs/integration/index.md). `node bin/skills.mjs --help` lists every command and flag, and [Commands](docs/reference/commands.md#skillsmjs) explains them.

`skills.mjs` is one file with no dependencies. It needs Node.js 18 or newer, and git for anything it clones. It works the same on Windows, macOS and Linux.

## Install from a clone

```
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/skills.mjs install work thread
node .ai-assisted-work/bin/skills.mjs check
```

With no names, `install` installs every skill in the bundle. It reads the `bundle.json` beside the script unless `--bundle <bundle.json or its folder>` names another, and installs into the git root above the current directory unless `--workspace <dir>` names another. One clone can therefore serve several workspaces.

One skill from a repository of its own:

```
node .ai-assisted-work/bin/skills.mjs install --repo https://github.com/dermot-obrien/diagram-model.git --ref model--v0.8.2 --path skills/model --name model
```

## What gets created

```
your-repo/
├── .agents/skills/<name>/      the installed skills
├── .agents/skills.lock.json    where each came from: source, ref, commit and a hash of what was installed
├── .agents/.skill-sources/     clones made by skills.mjs (gitignore it)
├── .claude/skills/<name>       links to .agents/skills/<name>, only when .claude/ exists
└── your files                  untouched
```

On Windows the `.claude/skills/<name>` links are directory junctions. Pass `--copy` to write copies instead, which suits a repository that commits `.claude/skills/` or a filesystem that refuses links.

The installer writes no configuration. The `work` skill reads `.aaw-config.yaml` at the workspace root when it is there and uses its defaults when it is not (work items in `./change/work-items/`, initiatives in `./change/initiatives/`); `thread` reads its store settings from the same file or from environment variables. See the [configuration reference](docs/reference/configuration.md).

## Declare a workspace's skills

A workspace that wants the same skills on every machine and in every session commits `.agents/skills.json`. Each source is a `bundle`, a single skill's `repo`, or a `folder` in the workspace:

```json
{
  "sources": [
    { "bundle": "https://github.com/dermot-obrien/ai-assisted-work.git", "ref": "main", "skills": ["work", "thread"] },
    { "repo": "https://github.com/dermot-obrien/architecture-pattern.git", "ref": "pattern--v0.10.3", "name": "pattern", "path": "skills/pattern" },
    { "folder": "skills/my-own-skill" }
  ]
}
```

A skill that lives in its own repository is declared with `{ "repo": "https://github.com/dermot-obrien/<repo>.git", "ref": "<skill>--v<version>", "name": "<skill>", "path": "skills/<skill>" }`:

| Skill | Repository |
|-------|------------|
| `markdown-deck` | `dermot-obrien/markdown-deck` |
| `model` | `dermot-obrien/diagram-model` |
| `pattern`, `use-case`, `cross-reference` | `dermot-obrien/architecture-pattern` |
| `quarter-planning` | `dermot-obrien/delivery-planning` |

Then:

```
node bin/skills.mjs sync              # install what the file declares, record each commit in the lock
node bin/skills.mjs sync --locked     # install exactly the commits in the lock
```

`sync` also removes any skill it installed that the file no longer lists. Commit both `.agents/skills.json` and `.agents/skills.lock.json`. A session-start hook runs `sync --locked` (with `--copy` where links are unwelcome), so every session gets the same commits; to move to newer ones, run `sync` without `--locked`, check the result, and commit the new lock.

A workspace usually keeps a copy of `skills.mjs` (for example as `scripts/skills.mjs`) so its hook needs no clone of this repository. Copy `bin/skills.mjs` over it to update it.

## Constrained environments

| Where you are | How |
|---|---|
| No access to GitHub, or no access to personal repositories | Copy the skill folders (or clones) onto the machine and pass `--from <folder>`; nothing is fetched |
| A mirror of the repositories | Set `SKILLS_BASE_URL=<base>`; each clone comes from `<base>/<repository>.git` |
| No shared thread store | `threads_remote: local` and `threads_home: <folder>` in `.aaw-config.yaml` ([thread setup](skills/thread/references/setup.md#a-local-store-with-no-remote)) |
| Without any installer | Copy `skills/<name>/` to `.agents/skills/<name>/` (and `.claude/skills/<name>/`) |

`--dry-run` on any command says what would be installed and changes nothing.

## Check and update

```
node bin/skills.mjs check             # ✓ or ✗ per installed skill; exit 1 when one changed or is missing
node bin/skills.mjs update            # fetch each installed skill again and reinstall it
node bin/skills.mjs update work       # just that one
```

`check` compares each installed skill with the hash in the lock, so an edit made to an installed copy is caught. An edit made there is lost at the next install: change the skill at its source instead. Each skill also ships a post-install check, `bin/check.mjs`, for the configuration it depends on; see [Commands](docs/reference/commands.md#post-install-checks).

## Remove

```
node bin/skills.mjs remove work thread
```

This removes the installed copies, their `.claude/skills/` links and their lock entries. Your work items and your thread store are not touched.

## Coming from `aaw install`

Versions up to 4.0.0 installed with `node .ai-assisted-work/bin/aaw.js install`, which wrote `.aaw-config.yaml` with a `modules` section and installed the skills. To move to `skills.mjs`:

1. Keep `.aaw-config.yaml`: the skills still read `work_items_path`, `initiatives_path`, `deliverables_register` and the `threads_*` keys. The `modules` section is no longer read and can be deleted.
2. Remove the old installed skills, including any `aaw-*` ones from before `work` replaced them, from `.agents/skills/` and `.claude/skills/`.
3. Install with `skills.mjs install work thread`, or declare them in `.agents/skills.json` and run `sync`.

AI-Assisted Architecture and AI-Assisted Research are plain bundles of skills too, and install the same way. A workspace that still needs the old installer, or the `aaw status`, `aaw lint` and `aaw claim` commands, pins the `v4.0.0` tag of this repository.

## Troubleshooting

See [Troubleshooting](docs/troubleshooting.md), which is keyed to the messages the tools print.
