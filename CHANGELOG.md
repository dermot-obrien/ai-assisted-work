# Changelog

All notable changes to AI-Assisted Work.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
