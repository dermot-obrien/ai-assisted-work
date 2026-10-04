# Configuration reference

Everything that configures AAW, where it is read, and what wins when two sources disagree.

AAW's skills declare no `inputs.toml` bindings. A workspace configures them in one file,
`.aaw-config.yaml` at the workspace root, plus a few environment variables for `thread`.

- [.aaw-config.yaml](#aaw-configyaml)
- [Environment variables](#environment-variables)
- [SKILL.md front matter](#skillmd-front-matter)
- [bundle.json](#bundlejson)
- [framework.manifest.yaml](#frameworkmanifestyaml)
- [progress.yaml](#progressyaml)

## .aaw-config.yaml

`aaw install` writes it. It is plain YAML, meant to be committed and edited by hand; the
installer edits it in place, keeps your comments and other keys, and leaves it untouched
when nothing changed.

```yaml
tenant: demo
mode: local-fs
work_items_path: ~/aaw/{tenant}/{repo}/work-items
initiatives_path: ~/aaw/{tenant}/{repo}/initiatives
threads_remote: https://github.com/you/threads.git
modules:
  aaw:
    name: AI-Assisted Work
    version: 3.2.0
    runtime: node
    source_root: .ai-assisted-work
```

### Where it is found

- The `aaw` CLI walks up from the current directory to the first folder holding
  `.aaw-config.yaml` or `.git`, and treats that as the workspace root.
- The `aaw-*` skills and their post-install checks read it at the workspace root.
- `thread` reads `threads_remote`, `threads_source` and `threads_project` from the nearest
  `.aaw-config.yaml` above the current directory.

### Path expansion

Every path key below is expanded the same way before use: a leading `~` becomes your home
folder, `{tenant}` becomes the `tenant` value, `{repo}` becomes the workspace folder's name,
and a relative path is taken from the workspace root. The file keeps the path as written, so
it stays portable between machines.

### Precedence during `aaw install`

For `tenant`, `mode` and `work_items_path`, the first of these that has a value wins:

1. the flag (`--tenant`, `--mode`, `--work-items-path`)
2. your answer at the prompt, in a terminal without `--yes`
3. the value already in `.aaw-config.yaml`
4. the default in the table below

Without a terminal, or with `--yes`, step 2 is skipped. `initiatives_path` has no flag: it
keeps the existing value, or defaults to an `initiatives` folder beside `work_items_path`.

### Keys

#### tenant

| | |
|---|---|
| Type | string |
| Default | `local` |
| Read by | the CLI (for `{tenant}`), the installer, the post-install checks |
| Example | `tenant: acme` |

Your namespace across repositories and machines. It appears in the default paths through
`{tenant}`.

#### mode

| | |
|---|---|
| Type | `local-fs` or `cloud` |
| Default | `local-fs` |
| Read by | the CLI, the installer, the post-install checks |
| Example | `mode: local-fs` |

`local-fs` keeps work items as files on this machine. `cloud` is reserved for a
multi-machine coordinator that is not generally available; the CLI accepts it but still
reads the local files. Any other value is an error (see
[Troubleshooting](../troubleshooting.md#aaw-status-lint-claim-and-the-other-commands)).

#### work_items_path

| | |
|---|---|
| Type | path, expanded as above |
| Default at install | `~/aaw/<tenant>/<repo>/work-items` (written out in full) |
| Default when the key is missing | `./change/work-items` (the version 1 layout) |
| Read by | every `aaw-*` skill, the CLI, the post-install checks |
| Example | `work_items_path: ~/aaw/{tenant}/{repo}/work-items` |

The folder holding `WI-NNN-<slug>/` work item folders. `aaw install` creates it.

#### initiatives_path

| | |
|---|---|
| Type | path, expanded as above |
| Default at install | an `initiatives` folder beside `work_items_path` |
| Default when the key is missing | `./change/initiatives` |
| Read by | `aaw-start-initiative`, `aaw-work-status`, `aaw-start-work`, the CLI |
| Example | `initiatives_path: ~/aaw/{tenant}/{repo}/initiatives` |

The folder holding `IN-NNN-<slug>/` initiative folders. It is created on first use by
`/aaw-start-initiative`; until then the checks print a warning, not an error.

#### deliverables_register

| | |
|---|---|
| Type | path, or a map (below) |
| Default | unset: products carry their quality criteria and approver inline |
| Read by | `aaw-start-work`, `aaw-progress-work`, the post-install checks (plain path form only) |
| Example | `deliverables_register: governance/deliverable-types.csv` |

A CSV or YAML catalogue of the kinds of product your organisation makes. A product then sets
`type` to a row's id and inherits that row's quality criteria, quality method and approver.
The plain path form expects the register's columns to carry AAW's field names. When they do
not, use the map form:

```yaml
deliverables_register:
  path: governance/deliverables/deliverable-types.csv
  id_column: id                # the column holding each row's id
  standard_only: true          # only commit to rows marked standard
  standard_column: standard_type
  standard_true: "Yes"         # the value that marks a row standard
  columns:                     # AAW field: the register's column name
    name: title
    purpose: purpose
    composition: composition
    quality_criteria: quality_criteria
    quality_tolerance: quality_tolerance
    quality_method: quality_method
    responsibilities: quality_responsibilities
    governance_forum: governance_forum
    system_of_record: system_of_record
    points: base_story_points
```

| Sub-key | Type | Meaning |
|---------|------|---------|
| `path` | path | The register file |
| `id_column` | string | Column holding the type id |
| `standard_only` | boolean | When true, a work item may commit only to standard rows |
| `standard_column` | string | Column that says whether a row is standard |
| `standard_true` | string | The value in `standard_column` that means standard |
| `columns` | map | AAW field name to register column name. AAW needs `name`, `quality_criteria`, `quality_method` and `responsibilities`; the rest are used when present. Unmapped columns are ignored |

The CLI does not read this key. AAW ships no register and no schema for one.

#### threads_remote

| | |
|---|---|
| Type | git URL |
| Default | unset |
| Read by | `thread`, and its post-install check |
| Precedence | the URL given to `thread init <url>`, then `$THREADS_REMOTE`, then this key |
| Example | `threads_remote: https://github.com/you/threads.git` |

Where `thread` clones its store from the first time it runs on a machine. Committing it in
the workspace is what lets a cloud session find the store without environment variables.

#### threads_source

| | |
|---|---|
| Type | a source name: one lowercase word or hyphenated words |
| Default | unset: the store's default source (`events/` at its root) |
| Read by | `thread` |
| Precedence | `--source` on any command, then `$THREAD_SOURCE`, then this key |
| Example | `threads_source: image-and-video` |

Which tree in the store this workspace reads and writes (DD-12). A named source lives under
`sources/<name>/` in the store and starts with its first write.

#### threads_project

| | |
|---|---|
| Type | a thread id or a project title |
| Default | unset: root threads are not grouped |
| Read by | `thread` |
| Precedence | `--project` on `thread open`, then `$THREAD_PROJECT`, then this key |
| Example | `threads_project: t-9c3` |

The project a root thread opened in this workspace goes under.

#### endpoint

| | |
|---|---|
| Type | URL |
| Default | unset |
| Read by | the CLI, for `mode: cloud` |
| Example | `endpoint: https://coordinator.example.com` |

Reserved for the cloud coordinator. Nothing uses it yet.

#### modules

| | |
|---|---|
| Type | map of framework id to `{ name, version, runtime, source_root }` |
| Written by | the installer, once per framework installed |
| Read by | `aaw check-skills`, and other frameworks' installers to find their dependencies |
| Example | see the file at the top of this page |

A registry of the frameworks installed into this workspace. `source_root` is the framework
clone, relative to the workspace, so a workspace can find the clone it was installed from.
Do not edit it by hand; run the installer again instead.

## Environment variables

| Variable | Used by | Default | Effect |
|----------|---------|---------|--------|
| `THREADS_HOME` | `thread` | `~/.threads` | Where the thread store is cloned and read |
| `THREADS_REMOTE` | `thread` | unset | Remote to clone the store from on first use. Beats `threads_remote` |
| `THREAD_PROJECT` | `thread` | unset | Default project for root threads. Beats `threads_project` |
| `THREAD_SOURCE` | `thread` | unset | The store's source this workspace uses (DD-12). Beats `threads_source` |
| `THREADS_AUTO_PRUNE` | `thread` | on | `0` turns off the daily archive of closed threads |
| `THREAD_CTX` | `thread` | the git repository's folder name | The project context recorded on a new thread. `--ctx` beats it |
| `THREAD_TOOL` | `thread` | unset | The tool recorded on a new thread. `--tool` beats it |
| `SKILL_DIR` | post-install checks | the check's own skill folder | The installed skill's folder, set by whoever runs the check |
| `AAW_DEBUG` | `aaw` | unset | Any value prints the stack trace with an error |

To set one for every new terminal: `setx THREADS_REMOTE <url>` on Windows (then open a new
terminal), or `export THREADS_REMOTE=<url>` in your shell profile on macOS and Linux. For
Claude Code in one repository, put it in `.claude/settings.json` under `"env"`.

## SKILL.md front matter

Each skill's `SKILL.md` starts with YAML front matter, as the
[Agent Skills specification](https://agentskills.io/specification) defines it. CI checks
every key below.

| Key | Type | Required | Rule | Example |
|-----|------|----------|------|---------|
| `name` | string | yes | At most 64 characters, lowercase letters, digits and single hyphens, equal to the folder name | `name: aaw-start-work` |
| `description` | string | yes | At most 1,024 characters. Says what the skill does and when to use it | |
| `license` | string | no | SPDX id | `license: CC-BY-4.0` |
| `compatibility` | string | no | At most 500 characters. What the skill needs from its environment | |
| `metadata` | map of strings | no | Values are strings, so versions are quoted | `version: "2.5.0"` |
| `allowed-tools` | string | no | Tools the skill may use without asking, where the agent supports it | |

AAW sets these `metadata` keys: `author`, `framework` (`aaw`), and `version`, which must equal
the skill's `version` in `bundle.json`. A skill that needs another sets `x-skill-requires`.
A value holding `: ` must be quoted, or strict YAML readers reject the file.

## bundle.json

The bundle manifest at the repository root lists the skills this repository ships, with a
version, a package URL and a post-install check for each, and the ontology module. Every key
is described in [Skill bundles](../integration/skill-bundles.md#bundlejson), and the schema
is `schemas/bundle.schema.json`.

## framework.manifest.yaml

What `aaw install --framework <path>` reads from a framework's root. AAW's own is small:

```yaml
id: aaw
name: AI-Assisted Work
version: 3.2.0
depends: []
runtime: node
skills: { src: skills }
config: []
data_dirs: []
```

| Key | Type | Required | Meaning |
|-----|------|----------|---------|
| `id` | string | yes | Short namespace, recorded under `modules` |
| `name` | string | yes | Shown by the installer |
| `version` | string | yes | Recorded under `modules` |
| `depends` | list of ids | no, default none | Frameworks that must be installed first. A missing one is a warning |
| `runtime` | `node` or `python` | yes | What the framework's tooling runs in |
| `skills.src` | path | no | Folder of skill folders to install. Each one with a `SKILL.md` is installed |
| `config` | list of `{ file, template }` | no | Files seeded into the workspace only if absent |
| `data_dirs` | list of paths | no | Folders created in the workspace |
| `tool_setup.python` | `{ requirements, optional }` | no | A `requirements.txt` to `pip install`; `optional: true` turns failure into a warning. `--no-python` skips it |
| `seed` | `{ driver: node, entry, args }` | no | A content seeder, run only with `--seed` |

`shims` and `source_token` from before 3.0.0 are ignored if present.

## progress.yaml

A work item's state. Its keys are defined by the work ontology, `schemas/work.schema.json`,
and every key is explained where it appears in the template,
[skills/aaw-start-work/assets/templates/progress.yaml](../../skills/aaw-start-work/assets/templates/progress.yaml).
The ones the CLI checks with `aaw lint`:

| Key | Values |
|-----|--------|
| `status` (work item) | `scoping`, `discovery`, `planning`, `in_progress`, `blocked`, `review`, `abandoned`, `done` |
| `type` | `development`, `architecture`, `consultancy`, `mixed`, a layer's `<prefix>:<value>`, or `x-<value>` |
| `activities[].status`, `tasks[].status` | `pending`, `in_progress`, `awaiting_human`, `completed`, `blocked`, `skipped`, `abandoned` |
| `status` (initiative) | `proposed`, `active`, `on_hold`, `completed`, `done`, `cancelled` |
| `activities[].actor`, `tasks[].actor` | `agent`, `human`, `any` (the default) |
| `activities[].depends_on` | ids of activities on the same work item; no cycles |

Initiatives have their own template,
[skills/aaw-start-initiative/assets/templates/initiative-progress.yaml](../../skills/aaw-start-initiative/assets/templates/initiative-progress.yaml).
