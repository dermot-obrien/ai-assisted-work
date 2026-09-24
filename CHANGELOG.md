# Changelog

All notable changes to AI-Assisted Work.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
