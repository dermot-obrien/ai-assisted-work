# WI-004 Extract the skills: each one standalone, AI-Assisted Work becomes a bundle

## Summary

Move every skill out of AI-Assisted Work into a repository of its own, each installable on its own with no dependency on any other skill, and turn this repository into a bundle: a README, a manifest of the skills it offers and a small installer that picks them up. A skill can then be brought into a constrained environment, such as a work laptop with no access to personal repositories, by itself.

Status: in progress, started 11 October 2026 with the recommended decisions (one `work` skill; repositories `thread` and `work`; each skill versioned on its own; AAA and AAR to follow; the bundle keeps its name). The local threads store this needs (`threads_home:` and `threads_remote: local`) is already built, in thread 0.14.0.

## Intent

From the user, 11 October 2026: "have individual skills that I can bring into my work environment, so I'll probably deprecate AI-Assisted Work and have that just become a bundle, and then skills within it will be individually installable"; "do an inventory of skills and make them ideally standalone, but they can't have dependencies between skills, and have an install mechanism that will pick that up"; "there's already skills around quarterly planning etc., there's a repo for that".

The pattern already exists: `markdown-deck`, `model`, `pattern` and `quarter-planning` left AAW and AAA for repositories of their own (each with a `NOTICE` naming the commit it came from), and patternode-business installs them with `tools/scripts/standalone-skills.mjs`. This work finishes the job for what is left.

## Inventory

| Skill | Lives in | Ties to other skills | Target |
|---|---|---|---|
| `thread` (with the board) | AAW `skills/thread` | Reads `threads_*` keys from `.aaw-config.yaml`; `ownership.md` mentions work item locks | Own repository, `thread`. Already self-contained: two scripts, no packages |
| `aaw-start-work` | AAW | Shares the work item format, `.aaw-config.yaml`, the lock and `progress.yaml` rules with the four below; hands off to them by name; one copy of `bin/check.mjs` each | One `work` skill (decision 1) |
| `aaw-progress-work` | AAW | As above | One `work` skill |
| `aaw-work-status` | AAW | As above | One `work` skill |
| `aaw-next-task` | AAW | As above | One `work` skill |
| `aaw-start-initiative` | AAW | As above | One `work` skill |
| `markdown-deck` | Own repository | None | Done |
| `model` | `diagram-model` | None | Done |
| `pattern` | `architecture-pattern` | None | Done |
| `quarter-planning` | `delivery-planning` | Reads AAW work items where a workspace binds `workItemsDir`; needs nothing else | Done; keep the binding optional |
| `aaa-*` (9 skills) | AI-Assisted Architecture | Install through AAW's engine (`depends: [aaw]`); share AAA's standards and ontology | Follow-on (decision 4) |
| `aar-*`, `literature-discovery`, `research-dag` (12 skills) | AI-Assisted Research | Install through AAW's engine; Python tools | Follow-on (decision 4) |
| `cross-reference` | Used by patternode-architecture; source repository to be found | To check | Check in A1 |
| `briefing-film` | patternode-business, private | None | Stays where it is |

Besides skills, AAW holds packages that only its own skills and installers use: `@aaw/protocol`, `@aaw/cli` (`bin/aaw.js`: `install`, `init`, `status`, `verify`), `@aaw/installer` (the shared install engine for AAW, AAA and AAR), `schemas/work.schema.json` and `bundle.json` (DD-11).

## How the dependencies go

1. **The five work skills become one.** They are one method over one set of files, and each is useless without the format the others write, so splitting them would mean copying the format five times and keeping it in step. One skill, `work`, with each of today's five as a section and a reference file (start, progress, status, next, initiative), keeps the method whole and depends on nothing. Its scripts carry the schema and the check, so the protocol and CLI packages retire or move inside it.
2. **Mentions become optional.** Where a skill names another ("see `quarter-planning`", "work item locks"), the text says what to do with or without it installed, so no skill fails because another is missing.
3. **Configuration stays one file, read by keys.** `.aaw-config.yaml` is a workspace file, not a skill. Each skill documents only the keys it reads and works with defaults when the file is absent: `thread` reads `threads_*`, `work` reads `work_items_path` and its other keys, `quarter-planning` reads its binding. The file keeps its name so existing workspaces keep working; a later rename (for example to `.skills.yaml`) is a separate choice.
4. **One installer, not one per framework.** A single script with no dependencies, generalised from patternode-business's `standalone-skills.mjs`: it reads a bundle manifest or a single repository, clones each skill at a tag (or copies it from a local folder or archive), puts it in `.agents/skills/<name>` with `.claude/skills/<name>` linked to it (a junction on Windows), and records source and commit in a lock file so `check` and `update` know what is installed. Every skill can still be installed by copying its folder, with no installer at all.
5. **The bundle.** This repository keeps its name and becomes: a README saying it is a bundle, `bundle.json` listing each skill by repository, path and version (the DD-11 format already does this), the installer, and the design decisions as history. Its skills folders go, each replaced by a pointer in the README.

## Working in a constrained environment

| Constraint | Answer |
|---|---|
| No access to personal repositories | Install from a mirror (`STANDALONE_SKILLS_BASE_URL`, as patternode-business already supports) or from a copied folder or archive with `--from <dir>` |
| No npm registry | Nothing needs one: the installer and every skill's scripts are plain Node with no packages |
| No shared threads store | A local store: `threads_home: <folder>` and `threads_remote: local` in `.aaw-config.yaml`, or `thread init --local`. Built in this change; a remote can be added later with one git command |
| No symbolic links (Windows without developer mode) | Junctions, as the installers already use, or a plain copy |
| Nothing may leave the machine | No skill calls out except git to the remotes the workspace names |

## Moving the workspaces over

| Workspace | Installs today | After |
|---|---|---|
| patternode-platform | npm git dependencies, `npx aaw install && npx aar install && npx aaa install`, a SessionStart hook; committed `.claude/skills/thread` | The installer with a lock file; the committed copy refreshed from the `thread` repository |
| patternode-business | Framework clones and `standalone-skills.mjs` | The installer replaces `standalone-skills.mjs` |
| patternode-architecture | Framework installs | The installer |
| Life Guide | Submodules (declared, not checked out) and a committed `thread` | The installer |

Each workspace's change goes through that repository's own pull request rules and master session.

## Decisions for the user

1. **One `work` skill, or five.** Recommendation: one, for the reasons above. The five names can stay as trigger phrases in its description so "start work" and "progress work" still find it.
2. **Repository names.** Recommendation: `thread` (with the board) and `work`, under the same account as the others.
3. **Versioning.** Recommendation: each skill versions on its own, tagged in its repository; the bundle pins versions.
4. **AAA and AAR.** Recommendation: the same treatment next, once the installer replaces AAW's engine; until then they keep installing through a copy of the engine.
5. **The bundle's name.** Keep `ai-assisted-work` as the bundle's name, so links keep working, with the README saying what it now is.

## Activities (starting point for planning)

| Activity | Product | Depends on |
|---|---|---|
| A1 Complete the inventory: every skill, script, package and reference that crosses a skill's folder; find `cross-reference`'s source | Inventory with every crossing listed | |
| A2 The installer: bundle manifest and single repository, tag or local folder, lock file, `install`, `update`, `check` | Installer with tests on Windows and Linux | |
| A3 `thread` to its own repository, with history, `NOTICE`, licences, CI and its tests | `thread` repository, tagged | A1 |
| A4 The five work skills merged into `work`, with its scripts, schema and check, and its own repository | `work` repository, tagged | A1, decision 1 |
| A5 Optional mentions: every cross-skill reference rewritten | Updated skills | A3, A4 |
| A6 This repository as a bundle: README, `bundle.json` pointing at the repositories, the installer, skills removed | The bundle release | A2 to A5 |
| A7 Move each workspace over (platform, business, architecture, Life Guide), through its own pull request | One pull request per workspace | A6 |
| A8 Try it in a constrained environment: install from a folder, local threads store, no network beyond git | A short record of what was tried | A6 |
| A9 Follow-on: AAA and AAR on the same installer | Their own work items | A6, decision 4 |

## Progress

| Activity | State |
|---|---|
| A1 Inventory | Done. `cross-reference` lives in architecture-pattern. `pattern` and `use-case` there still declare requirements on `model` and `markdown-deck` |
| A2 Installer | Done: `bin/skills.mjs`, tested, and run against the real bundle (all eight skills install and check) |
| A3 `thread` repository | `scripts/extract-skill.mjs thread <dir>` builds it with its history, docs, tests (31 pass there) and CI, tagged `v0.14.0`; CI rebuilds it on every run. Waiting for the empty `dermot-obrien/thread` repository, which this session's GitHub access cannot create |
| A4 `work` | Done: one skill, five flows, every reference and template kept. `scripts/extract-skill.mjs work <dir>` builds its own repository the same way; waiting for `dermot-obrien/work` to be created. `aaw install` removes the five retired copies from upgraded workspaces |
| A5 Optional mentions | Done for `thread` and `work` |
| A6 The bundle | Done: README, `bundle.json` with sources, version 4.0.0. `thread` switches to its repository when that exists |
| A7 Workspaces | Not started |
| A8 Constrained trial | Done, 11 October 2026: [trial-constrained.sh](trial-constrained.sh), eight steps on a machine whose git may use only local files, with an empty home and no threads remote. All pass. It found one flaw, fixed: a fetch that failed left an empty clone cache behind |
| A9 AAA and AAR | Inventoried, 11 October 2026 (below). Both bundles install and check with `bin/skills.mjs` today (9 and 12 skills); making them standalone is work in their own repositories |

## A9 findings: AI-Assisted Architecture and AI-Assisted Research

Both bundles install with `bin/skills.mjs install --bundle <clone>` and pass `check` (9 and 12 skills). What still ties them:

| Framework | Tie | What standalone needs |
|---|---|---|
| AAA | Skills read standards from the framework's clone: `.ai-assisted-architecture/standards/` (8 references), `standards/capabilities/standard-definition-ladder.md`, `standards/aaw-work-seam.md`, and run `ontology/validate.cjs` | Carry what each skill needs in its own `references/` (or a single `aaa-standards` skill that the others mention as optional), and the validator in the skill that runs it |
| AAA | `framework.manifest.yaml` `depends: [aaw]`, for the install engine only | List its skills in a bundle and install with `bin/skills.mjs`; drop the dependency |
| AAR | Seven skills run another skill's scripts: `<skills>/research-dag/bin/dag_store.py`, `dag_update.py`, `validate_dag_references.py`, `generate_dashboard.py`, `generate_node_index.py`, `branch_manager.py`, and `<skills>/aar-reconcile/scripts/reconcile.py` | Fold the DAG tools into the skills that use them, or merge the research skills that share the DAG into one skill, as the work skills were |
| AAR | `aar-start-hypothesis`, `aar-start-research`, `aar-sync-research-result` and `aar-progress-research` declare or name `aaw-start-work` and `aaw-start-initiative`, retired in 4.0.0 | Name `work` (`/work start`, `/work initiative`) and make the handoff optional, as `work` now does for research |
| AAR | Python packages (`requirements.txt`) | State them per skill in its `compatibility`, and in its check |

These changes belong to the AAA and AAR repositories, through their own pull requests; this bundle lists their skills once they stand alone.
