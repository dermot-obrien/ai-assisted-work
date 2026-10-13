# Configuration reference

Everything that configures the `work` skill, where it is read, and what wins when two sources disagree.

The skill declares no `inputs.toml` bindings. A workspace configures it in one optional file, `.aaw-config.yaml` at the workspace root. The installer, `bin/skills.mjs`, has its own flags and files, described in [Commands](commands.md#skillsmjs) and [Installing the skills](../../DEPLOYMENT.md).

- [.aaw-config.yaml](#aaw-configyaml)
- [Environment variables](#environment-variables)
- [SKILL.md front matter](#skillmd-front-matter)
- [bundle.json](#bundlejson)
- [progress.yaml](#progressyaml)

## .aaw-config.yaml

Plain YAML, written by hand and meant to be committed. Nothing writes it: until 4.0.0 `aaw install` did, and since 5.0.0 the file is optional. Without it every key takes its default, and the `work` skill keeps its work items in `./change/work-items/`.

```yaml
tenant: demo
work_items_path: ~/aaw/{tenant}/{repo}/work-items
initiatives_path: ~/aaw/{tenant}/{repo}/initiatives
```

### Where it is found

The `work` skill and its post-install check read it at the workspace root.

### Path expansion

Every path key below is expanded the same way before use: a leading `~` becomes your home
folder, `{tenant}` becomes the `tenant` value, `{repo}` becomes the workspace folder's name,
and a relative path is taken from the workspace root. The file keeps the path as written, so
it stays portable between machines.

### Keys

#### tenant

| | |
|---|---|
| Type | string |
| Default | `local` |
| Read by | `work` and its post-install check, for `{tenant}` |
| Example | `tenant: acme` |

Your namespace across repositories and machines. It appears in the default paths through
`{tenant}`.

#### mode

| | |
|---|---|
| Type | `local-fs` or `cloud` |
| Default | `local-fs` |
| Read by | `work`'s post-install check |
| Example | `mode: local-fs` |

Work items are files, so `local-fs` is the only mode in use. `cloud` was reserved for a multi-machine coordinator that was never built, and is accepted for older files. The check refuses any other value. The key can be left out.

#### work_items_path

| | |
|---|---|
| Type | path, expanded as above |
| Default | `./change/work-items` |
| Read by | every `work` flow, the post-install check |
| Example | `work_items_path: ~/aaw/{tenant}/{repo}/work-items` |

The folder holding `WI-NNN-<slug>/` work item folders. `work` creates it on first use. A path outside the repository, such as the example, keeps scope notes, progress state and locks out of its history.

#### initiatives_path

| | |
|---|---|
| Type | path, expanded as above |
| Default | `./change/initiatives` |
| Read by | `/work initiative`, `/work status`, `/work start`, the post-install check |
| Example | `initiatives_path: ~/aaw/{tenant}/{repo}/initiatives` |

The folder holding `IN-NNN-<slug>/` initiative folders. It is created on first use by `/work initiative`; until then the check prints a warning, not an error.

#### deliverables_register

| | |
|---|---|
| Type | path, or a map (below) |
| Default | unset: products carry their quality criteria and approver inline |
| Read by | `/work start`, `/work progress`, the post-install checks (plain path form only) |
| Example | `deliverables_register: governance/deliverable-types.csv` |

A CSV or YAML catalogue of the kinds of product your organisation makes. A product then sets
`type` to a row's id and inherits that row's quality criteria, quality method and approver.
The plain path form expects the register's columns to carry the skill's field names. When they do
not, use the map form:

```yaml
deliverables_register:
  path: governance/deliverables/deliverable-types.csv
  id_column: id                # the column holding each row's id
  standard_only: true          # only commit to rows marked standard
  standard_column: standard_type
  standard_true: "Yes"         # the value that marks a row standard
  columns:                     # the skill's field: the register's column name
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
| `columns` | map | The skill's field name to the register's column name. The skill needs `name`, `quality_criteria`, `quality_method` and `responsibilities`; the rest are used when present. Unmapped columns are ignored |

The skill ships no register and no schema for one.

#### modules and endpoint

`aaw install` wrote a `modules` section, a registry of the frameworks it installed, up to 4.0.0; `endpoint` was reserved for the cloud coordinator. Nothing reads either now, and both can be deleted. `bin/skills.mjs` records what it installed in `.agents/skills.lock.json` instead.

## Environment variables

| Variable | Used by | Default | Effect |
|----------|---------|---------|--------|
| `SKILL_DIR` | post-install checks | the check's own skill folder | The installed skill's folder, set by whoever runs the check |

## SKILL.md front matter

Each skill's `SKILL.md` starts with YAML front matter, as the
[Agent Skills specification](https://agentskills.io/specification) defines it. CI checks
every key below.

| Key | Type | Required | Rule | Example |
|-----|------|----------|------|---------|
| `name` | string | yes | At most 64 characters, lowercase letters, digits and single hyphens, equal to the folder name | `name: work` |
| `description` | string | yes | At most 1,024 characters. Says what the skill does and when to use it | |
| `license` | string | no | SPDX id | `license: CC-BY-4.0` |
| `compatibility` | string | no | At most 500 characters. What the skill needs from its environment | |
| `metadata` | map of strings | no | Values are strings, so versions are quoted | `version: "2.5.0"` |
| `allowed-tools` | string | no | Tools the skill may use without asking, where the agent supports it | |

This repository's skill sets these `metadata` keys: `author`, and `version`, which must equal the skill's `version` in `bundle.json`. A `framework` key, left from before 5.0.0, is not read. A skill that needs another sets `x-skill-requires`. A value holding `: ` must be quoted, or strict YAML readers reject the file.

## bundle.json

The bundle manifest at the repository root lists the skills this repository ships (now only `work`), with a
version, a package URL and a post-install check for each, and the ontology module. Every key
is described in [Skill bundles](../integration/skill-bundles.md#bundlejson), and the schema
is `schemas/bundle.schema.json`.

## progress.yaml

A work item's state. Its keys are defined by the work ontology, [`skills/work/assets/work.schema.json`](../../skills/work/assets/work.schema.json), and every key is explained where it appears in the template, [skills/work/assets/templates/progress.yaml](../../skills/work/assets/templates/progress.yaml). The values the skill accepts for the keys it checks most often:

| Key | Values |
|-----|--------|
| `status` (work item) | `scoping`, `discovery`, `planning`, `in_progress`, `blocked`, `review`, `abandoned`, `done` |
| `type` | `development`, `architecture`, `consultancy`, `mixed`, a layer's `<prefix>:<value>`, or `x-<value>` |
| `activities[].status`, `tasks[].status` | `pending`, `in_progress`, `awaiting_human`, `completed`, `blocked`, `skipped`, `abandoned` |
| `status` (initiative) | `proposed`, `active`, `on_hold`, `completed`, `done`, `cancelled` |
| `activities[].actor`, `tasks[].actor` | `agent`, `human`, `any` (the default) |
| `activities[].depends_on` | ids of activities on the same work item; no cycles |

Initiatives have their own template, [skills/work/assets/templates/initiative-progress.yaml](../../skills/work/assets/templates/initiative-progress.yaml).
