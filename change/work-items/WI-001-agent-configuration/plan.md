# Work Item Plan: WI-001 Namespace Delta File Commands

> Auto-generated during planning phase.

**Work Type:** development

## Analysis Summary

### Problem Statement

The GitHub Copilot delta file uses non-namespaced commands (`/start-work`, `/progress-work`, etc.) while all other tool configurations use the `aiaw-*` prefix. This inconsistency creates potential conflicts when users deploy AI-Assisted Work into repositories that already have commands with these names.

### Current State

| Tool | Config Location | Command Prefix | Status |
|------|-----------------|----------------|--------|
| GitHub Copilot prompts | `.github/prompts/` | `aiaw-*` | ✅ Correct |
| Cursor rules | `.cursor/rules/` | `aiaw-*` | ✅ Correct |
| Claude Code commands | `.claude/commands/` | `aiaw-*` | ✅ Correct |
| **Copilot delta file** | `agents/github-copilot/` | None | ❌ **Needs update** |

### Proposed Approach

Simple find-and-replace in the delta file to add `aiaw-` prefix to all command names. Verify DEPLOYMENT.md references are consistent.

## Activity Dependency Graph

```
WI-001-A1 (Update Delta File)
```

**Single activity** - No dependencies, simple sequential tasks.

## Activities

### Activity WI-001-A1: Update Delta File Commands

**Depends on:** None (can start immediately)

**Outcome:** Delta file uses `aiaw-*` prefix for all commands, consistent with other tool configurations.

**Deliverable Document:** [WI-001-D01](deliverables/D01-delta-file-update.md)

| Task ID | Task | Effort | Deliverable | Status |
|---------|------|--------|-------------|--------|
| WI-001-A1-T1 | Update command names in delta file to use `aiaw-*` prefix | Low | D01 | Pending |
| WI-001-A1-T2 | Check DEPLOYMENT.md for any command name references to update | Low | D01 | Pending |
| WI-001-A1-T3 | Verify consistency across all tool configurations | Low | D01 | Pending |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing users have deployed with old command names | Low | Low | Document as additive change; old names were in delta file for manual merge, not auto-deployed |
| Missed a command reference | Low | Low | Task T3 includes verification step |

## Verification Approach

1. **Manual review**: Compare command names across all tool configurations
2. **Grep search**: Search for bare `/start-work` etc. to ensure none remain
3. **Checklist**: Use scope-ai.md verification checklist
