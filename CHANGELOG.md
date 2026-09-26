# Changelog

All notable changes to AI-Assisted Work.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **`quarter-planning` report wording** (skill 3.1.0). Calendar periods are called periods,
  not sprints. Out-of-scope capacity is a positive figure in its own column, since it is a
  share of what a person brings rather than a deduction from it. Calendar notes are wrapped
  instead of cut at 44 characters. `--apply` accepts any id, not only `EP-NNN`, and inserts
  `budget_points` after the id line where a record has none, instead of skipping it with a
  note. It still patches text and keeps the `.bak`, because a YAML round trip drops comments.
- **AAW work items carry optional quarter-planning fields** (aaw-start-work,
  aaw-progress-work and aaw-work-status 2.2.0). `progress.yaml` gains `budget_points`,
  `planned_points`, `lane`, `flows`, `home` and an epic `approval`, and each deliverable may
  carry `owner`, `points` with `points_override_reason`, and `actual_points`. Deliverable
  approval stages are now draft, sized, validated, approved, the four `quarter-planning`
  uses. Every addition is optional and existing work items are unaffected.
- **`/thread tree` shows only unfinished threads** (thread 0.5.0). Done and dropped threads
  are hidden, and a closed thread's open or parked branches take its place; `tree --all` shows
  everything. `/thread` (status) hides closed threads the same way. `tree --json` prints the
  view as nested objects, and the skill renders it as a collapsible task tree where the tool
  can show a widget, falling back to text.
- **`quarter-planning` no longer ships a directory layout** (skill 3.0.0, breaking). The six
  path bindings are required and have no default. The defaults were the layout of the
  workspace the skill was extracted from, which made that one workspace work with no binding
  at all and every other one read nothing while appearing configured. An unbound run now names
  the keys it is waiting for and stops, and `--where` prints `NOT DECLARED` against each.
  A workspace that already declares `[suite.quarter-planning]` is unaffected.
- `model`'s documentation and tests no longer use one workspace's directory names in their
  examples of a templated binding.

### Added
- **`markdown-deck` divider slides and long-table splitting** (skill 0.5.0).
  `<!-- deck:divider -->` makes a section divider on the cover's ground, titled by the next
  heading or by `title="..."`, with its own `--divider-*` theme tokens. A table longer than
  twelve rows continues on the next slide with its header repeated instead of shrinking to
  fit; `table-rows`, `deck_table_rows`, the `tableRows` binding and `--table-rows` change the
  limit, and `0` turns it off.
- **`quarter-planning` frames epics on a definition ladder, generates cards, and closes a
  quarter** (skill 3.1.0). Four optional bindings, each opting in to one thing, so a workspace
  that declares none of them validates exactly as before. `ladder` points at a CSV of rungs;
  the new section 8 reads each epic's `lane` and `flows` and fails on a rung the ladder does
  not name or a movement down it, and warns on a missing lane or a target rung that no product
  evidences, using an optional `rung` column in the deliverable register. `cardsDir` enables
  `--cards`, which writes a card per committed epic and the stage grid from the model, with
  `--cards --check` failing when any is stale. `epicsDir` lets each card link to the epic's
  hand-written folder, and the skill now documents that split and the folder's outline in
  `references/epic-cards.md`. `workItemsDir` reads epics from AAW work items'
  `progress.yaml` alongside `work_item.yaml`, which wins on a clash. Section 5 now enforces
  the register rules itself: a product typed outside the register, a type not marked used,
  and an explicit `points` with no reason each fail the run. Recording `rung_reached` and
  `actual_points` adds section 9, the close, with a recalibration hint per register type.
  `--where` notes when `slugPattern` is left at its fiscal-year default. The skill gains its
  first tests, against a neutral fixture workspace, and CI runs them with `model`'s.
- **`/thread wrap`** (thread 0.4.0) answers "is this chat done, can I delete it?". It checks for
  anything that exists only in the chat (uncommitted or unpushed work, running tasks, open
  PRs, owned deploys, unrecorded decisions and follow-ups), moves each into the repository,
  memory or the thread tree, and says yes with a table of what went where, or not yet with
  exactly what is left. It never closes the chat's thread itself (thread 0.4.1): it proposes
  the resolution and asks, since the user may want to carry on in that chat.
- **`aaw install` runs without a terminal.** Installing AAW itself used to open a prompt
  unconditionally, so a SessionStart hook, CI job or agent failed at the first question
  ("readline was closed") before writing anything. It now prompts only on a terminal. Without
  one, or with `--yes` (`-y`, `--non-interactive`), each answer comes from its flag, then the
  existing `.aaw-config.yaml`, then the default, and one line reports the values used. New
  flags `--tenant`, `--mode` and `--work-items-path` answer the bootstrap questions, and
  `--workspace`, which the help already listed, now works for AAW itself too. `aaw init`
  takes the same flags. An invalid `--mode` still exits 2 without writing. The CLI gains its
  first tests, run against the bundled `bin/aaw.js` with no terminal attached.
- **`thread`**, a general tooling skill for keeping thought processes untangled when working
  across many chats, projects, IDEs and machines at once. Each chat is tied to one node in a
  tree of intents: `/thread <text>` records or branches it, `/thread done|park|drop` closes it
  and points back to the parent, and `/thread` or `/thread tree` shows what's open. The store is a
  git repo the user owns (`threads_remote:` in `.aaw-config.yaml` or `$THREADS_REMOTE`, cloned to
  `~/.threads`). Every action writes one new, never-edited event file, so any number of machines
  and cloud agents can push to it without conflicts. Zero-dependency Node script,
  `skills/thread/bin/thread.mjs`, also usable directly from a terminal.
- **Approval stages in `quarter-planning`** (skill 2.1.0). The validator gains a seventh
  section reporting how far the quarterly WorkPlan, each committed epic and each of its products
  have been approved, read from an `approval` field on each model record. Stages default to
  draft, sized, validated, approved, least advanced first, and a workspace can rename them with
  `approvalStages`; the last is read as approval, and approval is commitment. It fails the run
  on an approval the records beneath it do not support: an epic further on than its least
  advanced product, an epic approved before the quarter's budget and resourcing are, or an epic
  past draft with nothing named. It also flags an approved plan whose budget no longer follows
  from its registers.
- **`aaw check-skills`**, which reports installed skills that no longer match the framework
  that owns them. A skill is mastered in its framework repository and copied into a workspace
  by install, and the copy is writable, so an edit made there is lost by the next install
  without ever having been reviewed. With no `--framework` it checks every framework in the
  workspace's `.aaw-config.yaml` modules registry, each against the `source_root` recorded
  when it was installed, and exits non-zero on any difference so it can sit beside a
  workspace's other integrity checks. It reports rather than repairs: an edit to an installed
  copy either belongs upstream or was an accident, and nothing here can tell which.
- **Two general tooling skills**, domain-agnostic and usable outside any AAW workspace:
  `markdown-deck` (Markdown to HTML slides and PDF, the Markdown staying the only source) and
  `model` (a diagram and a document as two views of one model of boxes and lines). They are
  not work management, but they are the kind of thing every project needs and nothing about
  them is specific to one, which is what makes AAW rather than a domain framework their home.
- **A configurable palette for `markdown-deck`.** An organisation sets colour tokens in
  `[suite.markdown-deck.palette]` of its own `.agents/skill-bindings.toml`, overriding
  whichever theme is chosen, so the skill ships brand-free and the layout stays with the skill
  while the brand stays with the organisation. A deck overrides the repository palette with
  `deck_palette`. An unknown token fails the build rather than being silently ignored, because
  a typo in a colour is otherwise invisible. The binding reader gained one level of sub-table
  to express it.


### Fixed
- `npm ci` could not resolve the workspace packages. `packages/cli` pinned `@aaw/installer`
  and `@aaw/protocol` at an exact `2.0.0`, so any version bump sent npm to the public registry
  for packages that only exist in this repo, and CI died at its first step. Both are now `*`,
  which always resolves the local workspace and cannot break on the next bump. The lockfile was
  regenerated and no longer carries the removed `packages/skills`.
- REUSE compliance checked nothing. `fsfe/reuse-action@v3` bundles a `reuse` predating
  `REUSE.toml` support, so it saw only the inline SPDX headers: 26 of 110 files covered and
  CC-BY-4.0 reported as an unused licence. Pinned to `@v6`, which honours the file. `reuse 6.2`
  now reports 109 of 109 covered and compliant with specification 3.3. `.changeset/` was the
  one path genuinely uncovered and is now annotated.

  Both failures predate this branch: CI has been red on `main` since at least 2026-06-09.

### Changed
- Merged the optional OKR layer from `main` (Objectives, Key Results, Cadence) into the skills
  rather than losing it with the retired `packages/skills/` tree. `objective-progress.yaml` and
  `cadence.yaml` now ship with `/aaw-start-initiative`, because an Objective is a strategic
  container like an Initiative, and the skill documents the layer. The work item templates
  carry `advances_kr_ids`, which is the source of truth for the link; the Objective's
  `advanced_by_work_item_ids` is a cache, like the initiative's `work_items` array.


## [3.1.0] - 2026-09-25

Deletes the shim machinery. 3.0.0 removed the shims themselves but kept the code that
installed them, because AI-Assisted Research had not migrated. It has now, so nothing declares
`shims`, and the machinery goes.

### Removed

- `wireShims`, `ShimMapping`, the `shims` and `source_token` manifest keys, and the
  `source_token` path rewrite. The rewrite existed to point a shim at wherever the framework
  actually lived; a skill is self-contained and holds no such pointer, so `copyDir` no longer
  takes a rewrite argument and no longer special-cases text files.
- A second, duplicate copy of the same copy-and-rewrite machinery inside the interactive
  bootstrap (`init.ts`), along with its own module-registry writer.
- `InstallResult.wired`. `InstallResult.removedLegacyShims` replaces it, reporting what the
  sweep cleaned rather than what was installed.

A manifest that still declares `shims` or `source_token` installs fine; the keys are ignored.

### Fixed

- **The interactive bootstrap installed no skills at all.** `aaw install` with no
  `--framework`, which is the documented first-run command, still wired shims from
  `skills-for-agents/` — deleted in 3.0.0 — and reported "shims installed" regardless, because
  its copy helper returned silently when the source was missing. A fresh bootstrap produced a
  config and a work-items directory and nothing else. It now delegates to the shared installer
  engine, so the bootstrap and `aaw install --framework` place skills identically.
- The bootstrap's `recordSelfModule` round-tripped `.aaw-config.yaml` through parse and
  stringify, discarding every comment, the same defect fixed in the engine's `recordModule` in
  2.1.0. Delegating to the engine removes the duplicate rather than fixing it twice.

### Known limitation

The bootstrap cannot be driven from a pipe: its readline consumes the whole stream and closes,
so the second prompt throws. That is why the broken shim path above survived — every automated
test used `--framework`, which takes a different route. Worth restructuring so the first-run
path is testable.


## [3.0.0] - 2026-09-25

Retires the per-tool command shims. Agent Skills, added in 2.1.0, are now the only
integration.

### Removed

- **BREAKING: `skills-for-agents/` and `packages/skills/`.** The per-tool command shims and the
  instruction files they pointed at are gone. A workspace that still invokes `/aaw:start-work`
  from `.claude/commands/aaw/` will find nothing behind it; use `/aaw-start-work` instead.
- **BREAKING: the `@aaw/skills` workspace package**, which held only those instruction files.
  Removed from `packages/*` and from the changeset fixed group.
- **BREAKING: the `shims` and `source_token` manifest keys are no longer set by AAW.** Both
  existed only for the shims: `source_token` rewrote a shim's pointer to wherever the framework
  actually lived. A skill is self-contained and holds no path back into the framework, so
  nothing needs rewriting at install time. The installer still *understands* both keys, so an
  AAW-family framework that has not migrated keeps working; it now logs a deprecation notice
  when it sees them.

### Added

- `aaw install` removes shims it previously wrote, once the framework has stopped declaring
  any. Covers the `aaw`, `aaa` and `aar` namespaces. Without this an upgraded workspace keeps `.claude/commands/aaw/` and friends pointing at
  deleted files, so the command fails only when someone types it. Scoped to id-namespaced paths
  the installer created and owns: an unrelated `.github/prompts/*.prompt.md` is never touched.

### Changed

- The reference documentation that lived beside the retired instruction files moved to
  `docs/concepts/` rather than being deleted with them: work-management concepts and lifecycle,
  work classification, scaling limits, architecture and development work notes, and the agent
  boundary rules.
- Templates that no skill had yet bundled (`agents.md`, `changelog.log`, the locks README) moved
  into `skills/aaw-progress-work/assets/`, so every template now ships with the skill that uses
  it.
- `DEPLOYMENT.md`, `CONTRIBUTING.md` and the integration docs updated: there is no longer a
  deployed-versus-self split, since a skill is the same artefact in both cases.

### Migration

1. Pull, then re-run `aaw install` in each workspace. It installs the skills and removes the
   old shims in one pass.
2. Change any muscle memory or scripts from `/aaw:start-work` to `/aaw-start-work`.
3. If you forked AAW to customise templates, they now live at
   `skills/<name>/assets/templates/` rather than `packages/skills/work-management/_templates/`.


## [2.1.0] - 2026-09-25

### Added
- **Agent Skills as the distribution format** (DD-10). All five workflows now ship as standalone [Agent Skills](https://agentskills.io) under `skills/`: a directory holding a `SKILL.md` with `name` and `description` frontmatter, plus `references/` and `assets/`. One definition works in every skills-compatible tool. Bodies run 71 to 208 lines against the spec's 500-line guidance, with detail in `references/` that loads only when a branch of the workflow reaches it.
- **Installer support for skills.** `skills` is a new manifest key (`skills: { src: skills }`). `wireSkills()` copies each skill to `.agents/skills/<name>` — read natively by Codex, Cursor, GitHub Copilot, VS Code and Gemini CLI — and links `.claude/skills/<name>` at it for Claude Code, which reads only its own path. A directory junction is used on Windows so no elevation or developer mode is needed, falling back to a copy where the filesystem refuses both. No `source_token` rewrite runs over skills, since a skill holds no path back into the framework.
- **Two work item levels.** `work_item_level` of `workstream` or `epic` on one entity, with `parent_work_item_id`. A workstream is a durable strand inside an initiative that accretes scope and may never end; an epic is a bounded slice landing in one planning period, three months at most. Anything longer is a workstream and is decomposed first.
- **Product-based planning**, after PRINCE2. A work item names the products it will leave behind in a top-level `deliverables` block (the product breakdown), each with `why_needed`, `quality_criteria`, `approver`, and `state` and `approval` tracked separately. `depends_on` between them is the product flow. The definition of done is composed from the products rather than authored separately, so the two cannot drift.
- **`produces` on every activity**, naming the product it advances. An activity that produces nothing is invalid: effort with nothing left behind is motion, not work. This, rather than renaming Activity to a product noun, is what makes the tier product-focused; renaming would re-merge what the model deliberately separates.
- **Optional deliverable type register.** A `deliverables_register` key in `.aaw-config.yaml`, null after a fresh install, may point at a catalogue of deliverable types. A product then sets `type` and inherits the type's quality criteria, quality method and approver, overriding only what differs. AAW ships no register and no schema for one: the catalogue is the organisation's and the config key is the only coupling. The CLI does not read the key; the skills parse `.aaw-config.yaml` directly.
- `scripts/validate-skills.mjs` — zero-dependency validator for the agentskills.io spec, wired into CI along with an install smoke test in a scratch workspace.

### Changed
- `progress.yaml` is at `schema_version: 3`. Reads of older work items are unchanged: `progress-work` branches on the version and keeps the discovered-deliverable behaviour for v2 and below, and does not retrofit them.
- **DD-02 revised from submodule-first to independent clone.** A submodule coupled the consuming repo's history to AAW's and needed `--init` and `--remote` discipline, for no benefit a clone does not give. Documentation across `docs/` updated accordingly.
- Integration and command-discovery docs rewritten around skills. The Codex and Gemini CLI sections previously described a manual copy step; both now read `.agents/skills/` natively, which the installer populates.

### Deprecated
- The per-tool command shims under `skills-for-agents/` and the instruction files under `packages/skills/work-management/`, each now carrying a superseded header. They remain installed for setups that have not moved. A shim carries no `description`, so an assistant can only run it when the user types the command, and it points at one large instruction file read whole on every invocation. Retiring them will allow the `source_token` rewrite machinery to be deleted outright, and is a breaking change warranting a major version.

### Fixed
- `packages/cli/src/cli.ts` had unescaped backticks inside the `HELP` template literal, which broke the esbuild bundle outright (`ERROR: Expected ";" but found "aaw"`). `bin/aaw.js` could not be rebuilt from source; the committed bundle predated the break.

### Also in this release
- **Work Classification & Ceremony standard** (`packages/skills/work-management/work-classification.md`): a domain- and substrate-agnostic model for classifying any unit of work by three axes (certainty × impact × kind) into four classes — **chore · change · intervention · inquiry** — with the ceremony (AAW artifacts/phases) and version impact each class earns. Inverts the default to *minimum ceremony, escalate by class*; demotes the `WI-NNN/` workspace to "the intervention substrate." Defines class-vs-substrate orthogonality (routing by `class × tenant`), the inquiry→AAR and decision→AAA seams, promotion/re-triage, and an explicit consumer-entity mapping (e.g. task/commitment/idea/decision) so downstream capture/extraction platforms apply one shared vocabulary. Referenced from the work-management README lifecycle.
- **Inverted the work-item default to class-driven ceremony.** `start-work` now opens with **Phase 0: Triage** (classify, default to `chore`, route by class) — only an `intervention` creates a `WI-NNN/` workspace and walks the full Scoping → Discovery → Planning → Execution pipeline; a `chore` is a branch + a changelog line with no folder; a `change` runs a light Planning → Execution; an `inquiry` hands off to AAR. README "Required Documents" is reframed as **required *by class***, the status set notes the lightweight path, and `progress-work` is scoped to change/intervention items. The previous "heavy by default, skip on exception" model becomes "minimum ceremony, escalate by class."

## [2.0.0] - 2026-05-08

Major redesign. AAW is now a TypeScript monorepo with a defined protocol, a CLI, and a single install path that works in corporate / work-restricted environments.

### Added
- `@aaw/protocol`: language-neutral schema types and Backend interface (`packages/protocol/`). Six core operations: `listPoolWork`, `claimActivity`, `updateTask`, `updateActivity`, `releaseActivity`, `appendEvent`. Plus `getState` and an optional `subscribe`.
- `@aaw/cli` (`packages/cli/`): Node-based CLI with `init`, `status`, and `verify` commands. Implements the protocol against the local filesystem (LocalFsBackend).
- `bin/aaw.js`: self-contained ESM bundle (~284 KB) produced by esbuild. Drives the submodule install path on machines with no npm registry access.
- `.aaw-config.yaml`: workspace config — `tenant`, `mode`, `work_items_path`, `initiatives_path`. Single source of truth for where work-state lives.
- Schema versioning policy and `PROTOCOL_VERSION` constant for compatibility checks against future cloud backends.

### Changed
- **Repo layout**: `skill-definitions/` moved to `packages/skills/`; root `package.json` with npm workspaces; new `packages/cli/`, `packages/protocol/`, `bin/`.
- **One install command**: `node .ai-assisted-work/bin/aaw.js init`. Replaces the previous submodule + manual copy steps. Idempotent.
- **Work item location**: lives at the configured `work_items_path` (default outside the repo at `~/aaw/{tenant}/{repo}/work-items/`), not inside the artefact repo. Work-state no longer pollutes the artefact repo's history.
- **Discovery**: skills no longer scan for `work-items/` and `work-items-private/` folders or follow OS-specific symlinks/junctions. They read `work_items_path` from `.aaw-config.yaml`.
- **DEPLOYMENT.md**: rewritten for the v2 single-path model. The previous git-submodule + copy-paste split is gone; submodule is the only documented path.

### Removed
- **Public/private work item distinction**: `WIP-NNN` and `INP-NNN` ID series are gone. One series for each level: `WI-NNN`, `IN-NNN`. The "publish a work item as documentation" use case is now a deliberate manual snapshot into `docs/work-items/`, not a side effect of the folder location.
- **Symlink/junction discovery rules** from all skills (`start-work`, `progress-work`, `work-status`, `start-initiative`, `next-task`). Cross-platform now works via plain config rather than filesystem features.
- **Visibility prompts** in `start-work` and `start-initiative`. The user is no longer asked "shared or private"; there's just one location.
- **Stale Gemini wrappers** for the long-removed `pivot-work` and `replace-ascii-diagrams` skills.
- **Hardcoded `.intent/change/...` path** in `next-task.md`; now reads from config like every other skill.

### Fixed
- All AI-tool wrappers (Claude, Cursor, GitHub, Codex, Gemini) point at `packages/skills/work-management/` consistently. Old `skill-definitions/` references are kept only in CHANGELOG.md and historical work-item documents where they record what was true at the time.

### Licensing (breaking)
- Switched from **AGPL-3.0 + Commercial Licence + CC BY 4.0** to **CC BY 4.0 + Apache-2.0** (permissive dual licence) governed by REUSE Specification 3.3.
- Content (Markdown, YAML, skill definitions, templates, agent shims) is now CC BY 4.0.
- Code (TypeScript / JavaScript / build scripts) is now Apache-2.0 with an explicit patent grant.
- New `LICENSES/CC-BY-4.0.txt` and `LICENSES/Apache-2.0.txt`. New `REUSE.toml` at root. New SPDX headers on all source files.
- Removed `LICENSE-AGPL-3.0.txt` and `LICENSE-COMMERCIAL.txt`.
- Trademark on the project name is preserved separately in `LICENSE` (nominative use welcome; rebrand forks).
- Rationale captured in `docs/about/design-decisions.md` DD-07.
- The change applies forward; existing v1 releases keep their AGPL+Commercial terms.

### Migration
Existing repos using v1 layout (`change/work-items/` + `change/work-items-private/`) keep working — when no `.aaw-config.yaml` is present, the local-fs backend falls back to `./change/work-items/` as the legacy default. To migrate cleanly:

1. Run `node .ai-assisted-work/bin/aaw.js init` to write a config.
2. Move existing `WI-*/` and `WIP-*/` folders into the new `work_items_path`.
3. Renumber any `WIP-NNN` clashes when merging into the single `WI-NNN` series.

The v1 `.gitignore` entries for `work-items-private/` are intentionally kept to protect any pre-migration data on contributor machines.

## [1.2.2] - 2026-02-28

### Added

- Fill out initiative support.

## [1.2.1] - 2026-02-27

### Added

- Gemini skills.

## [1.2.0] - 2026-02-21

### Added
- Codex integration instructions in DEPLOYMENT.md (Step 5 submodule, Step 6 copy-paste)
- Codex verification section in DEPLOYMENT.md
- `/aiaw-next-task` command documented across all user-facing docs

### Changed
- Fixed documentation consistency across all user-facing docs
- Updated all structure diagrams and tables to include Codex/`.agents/` references
- Fixed stale `agents/` paths to `skill-definitions/` and `skills-for-agents/` in organization-adoption.md
- Fixed command naming inconsistency (bare `/progress-work` → `/aiaw-progress-work`)
- Renamed GitHub Copilot prompt file to `.prompt.md` extension for discovery consistency

### Removed
- Image management skills (`skill-definitions/image-management/`, all `replace-ascii-diagrams` wrappers)
- All image management references from documentation
- Stale `/aiaw-pivot-work` references from documentation (skill was removed in v1.1.0)
- Image management archive preserved on `archive/image-management-skills` branch

## [1.1.0] - 2026-02-15

### Added
- Skill definitions directory (`skill-definitions/`) — canonical source for all agent instructions
- Skills-for-agents directory (`skills-for-agents/`) — tool-specific command stubs for Claude, Cursor, and GitHub Copilot
- Initiative concept as fourth hierarchy level (Work Item → Activity → Task, grouped by Initiative)
- Initiative templates (scope, progress tracking)
- Architect cognitive load documentation (`docs/concepts/architect-cognitive-load.md`)
- AGPL-3.0 + Commercial dual licensing with CC BY 4.0 for documentation
- WIP prefix convention for private work items

### Changed
- Simplified work item discovery — removed pivot-work skill
- Consolidated agent instructions from scattered locations into `skill-definitions/`
- Streamlined README, DEPLOYMENT, and integration docs
- Updated license references for consistency (name, email, license type)
- Refined start-work, progress-work, and work-status skill definitions
- Updated version badge to v1.1.0

### Removed
- Inline `.claude/`, `.github/`, and agent-specific command files (replaced by `skills-for-agents/`)
- CLAUDE.md, STRUCTURE.md (consolidated into other docs)
- GitHub Copilot delta file and integration docs (replaced by skill-definitions approach)
- Pivot-work skill

## [1.0.0] - 2026-02-01

### Added
- Initial public release
- Complete work management agent suite
- Image management agents
- Cursor IDE integration
- Submodule integration support
- Documentation and examples
