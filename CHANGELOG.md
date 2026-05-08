# Changelog

All notable changes to AI-Assisted Work.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
