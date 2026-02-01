# WI-001 Namespace Delta File Commands

## Summary

Update the GitHub Copilot delta file to use `aiaw-*` namespaced command prefixes instead of bare `/start-work` etc., ensuring consistency across all tools and avoiding conflicts with existing user commands.

## Intent

The AI-Assisted Work agents are deployed across three AI tools: Cursor, Claude Code, and GitHub Copilot. Currently, the GitHub Copilot delta file (`agents/github-copilot/copilot-instructions-ai-assisted-work.md`) uses non-namespaced commands like `/start-work`, while all other tool configurations use the `aiaw-*` prefix. This inconsistency creates potential conflicts when users deploy AI-Assisted Work into repositories that have their own `/start-work` commands.

This work item updates the delta file to use the `aiaw-*` prefix consistently, matching the pattern already established in:
- `.github/prompts/aiaw-*.prompt.md`
- `.cursor/rules/aiaw-*.mdc`
- `.claude/commands/aiaw-*.md`

> **AI Agents**: See [`scope-ai.md`](scope-ai.md) for intent formation history, decision rationale, and agent-specific instructions.

## Acceptance Criteria

- [x] Delta file uses `aiaw-*` prefix for all commands (e.g., `/aiaw-start-work` not `/start-work`)
- [x] Command names are consistent across all three tools (Cursor, Claude Code, GitHub Copilot)
- [x] DEPLOYMENT.md references are updated if needed
- [x] No breaking changes for existing deployments (additive change only)

## Scope

### In Scope

- Update `agents/github-copilot/copilot-instructions-ai-assisted-work.md` command names to use `aiaw-*` prefix
- Verify consistency with `.github/prompts/` file naming
- Update any DEPLOYMENT.md references to command names

### Out of Scope

- Deprecating the delta file approach (documented for future consideration)
- Clarifying external copy requirements (current docs are adequate)
- Separating self commands from deployment (significant restructure, future work)
- Adding deployment verification scripts
- Adding `.gitignore` guidance
- Adding GitHub prompt frontmatter

## Context

### Related Documentation

- `DEPLOYMENT.md` - Deployment instructions that reference command names
- `agents/github-copilot/copilot-instructions-ai-assisted-work.md` - The delta file to update

### Related Work Items

- None (first work item in the system)

### Related Code

- `.github/prompts/aiaw-*.prompt.md` - Already using correct naming pattern
- `.cursor/rules/aiaw-*.mdc` - Already using correct naming pattern
- `.claude/commands/aiaw-*.md` - Already using correct naming pattern

## Notes

This is the first work item created in the AI-Assisted Work repository, serving as an example of the work management system in action. The work item demonstrates:

1. Scoping with clarifying questions
2. Challenge and recommendations process
3. Scope refinement through dialogue
4. Complete documentation including scope-ai.md for agent context
