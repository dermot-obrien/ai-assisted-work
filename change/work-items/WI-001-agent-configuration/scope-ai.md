# WI-001 Namespace Delta File Commands - AI Agent Addendum

> **Document Type**: AI Agent Addendum  
> **Parent Document**: [`scope.md`](scope.md)  
> **Audience**: AI Agents only (not for stakeholder distribution)  
> **Purpose**: Preserves intent-forming interactions, decision rationale, and agent instructions that supplement the published scope document.

---

## About This Document

The published scope document (`scope.md`) is the stakeholder-facing specification for this work item. This addendum provides AI agents with:

1. **Intent Formation History** - The original user instruction and how it evolved through dialogue
2. **Decision Rationale** - Why specific choices were made during scoping
3. **Agent Instructions** - Guidance for AI agents working on this work item

AI agents should read both documents together to fully understand the work item context.

---

## Intent Formation History

### Original User Instruction

The verbatim instruction that initiated this work item:

> Just a feature to add. I want to ensure that the common agent definitions are made available to common AI agents specifically supporting Cursor, Claude Code and GitHub Copilot. So I want to make sure that the current configuration supports all three, and the deployment instructions are clear and won't interrupt or override existing repositories when deployed either via GitHub, a Git submodule, or via copying into an existing repository. And make sure the deployment instructions are clear and that the agents will work across Cursor, Copilot Studio, and Claude, regardless of deployment mechanism.

### Challenges Identified During Scoping

The agent performed analysis and identified 7 challenges. The user was asked to confirm which to address:

#### Challenge 1: Inconsistent Command Naming Across Tools 🔴 HIGH PRIORITY

| Tool | Current Command Names | Issue |
|------|----------------------|-------|
| GitHub Copilot (`.github/prompts/`) | `aiaw-start-work`, `aiaw-self-start-work` | ✅ Namespaced |
| Cursor (`.cursor/rules/`) | `aiaw-start-work`, `aiaw-self-start-work` | ✅ Namespaced |
| Claude Code (`.claude/commands/`) | `aiaw-start-work`, `aiaw-self-start-work` | ✅ Namespaced |
| Copilot delta file (`agents/github-copilot/`) | `/start-work`, `/progress-work` | ❌ **NOT namespaced** |

**Problem:** The delta file for `copilot-instructions.md` uses `/start-work` without the `aiaw-` prefix. This will **conflict** with any project that has its own `/start-work` command.

**Resolution:** ✅ **SELECTED FOR THIS WORK ITEM** - Update delta file to use `aiaw-*` prefix.

#### Challenge 2: GitHub Copilot Has Two Deployment Mechanisms 🟡 MEDIUM PRIORITY

Two mechanisms exist:
1. `.github/prompts/*.prompt.md` - Auto-discoverable via `/` (2026 modern approach)
2. `.github/copilot-instructions.md` - Legacy manual reference approach

**Problem:** Maintaining both creates confusion and maintenance burden.

**Resolution:** ❌ **DEFERRED** - Deprecating the delta file is a breaking change for existing users. Some organizations may prefer the single-file approach. Consider deprecation notice in v2.0 with migration guide.

#### Challenge 3: GitHub Prompts Are NOT in `.ai-assisted-work/` 🟡 MEDIUM PRIORITY

Prompt files live in `.github/prompts/` at the repo root, not inside `.ai-assisted-work/`.

**Problem:** When users deploy as a submodule, `.ai-assisted-work/.github/prompts/` exists but isn't read by VS Code. VS Code only reads `<repo-root>/.github/prompts/`.

**Resolution:** ❌ **DEFERRED** - Already documented in DEPLOYMENT.md. The principle is that external integration files MUST be copied to tool-specific locations. Current documentation explains this. Could enhance with architecture diagram in future.

#### Challenge 4: No Verification Mechanism 🟡 MEDIUM PRIORITY

After deployment, users have no way to verify agents are working, paths are correct, or configuration is valid.

**Resolution:** ❌ **DEFERRED** - Would be valuable but adds scope. Recommend as separate work item for verification script.

#### Challenge 5: Missing `.gitignore` Guidance for Copy-Paste 🟢 LOW PRIORITY

When users copy-paste, should `.ai-assisted-work/` be committed or gitignored?

**Resolution:** ❌ **DEFERRED** - Typically should be committed so team benefits. Add guidance to DEPLOYMENT.md in future update.

#### Challenge 6: Cursor Rules Have Frontmatter, Others Don't 🟢 LOW PRIORITY

| Tool | Has Frontmatter | Fields |
|------|-----------------|--------|
| Cursor `.mdc` | ✅ Yes | `name`, `description`, `type` |
| Claude `.md` | ❌ No | Just markdown header |
| GitHub `.prompt.md` | ❌ No | Optional YAML frontmatter supported |

**Resolution:** ❌ **DEFERRED** - Not a problem, each tool has its own format. GitHub prompts could benefit from optional `description` frontmatter for better `/` menu UX. Consider in future update.

#### Challenge 7: Self vs Standard Commands - Deployment Confusion 🔴 HIGH PRIORITY

The repo contains BOTH:
- `aiaw-*` commands (point to `.ai-assisted-work/agents/`)
- `aiaw-self-*` commands (point to `agents/`)

**Problem:** When deploying to another repo, `aiaw-self-*` commands should NOT be copied (they're for developing AIAW itself). Current DEPLOYMENT.md doesn't explicitly filter out `self` commands.

**Resolution:** ❌ **DEFERRED** - Significant restructure. Options include: (a) Update copy commands to exclude `self` pattern, (b) Put `self` commands in separate folder. Consider for v2.0.

### Clarifying Questions & Answers

These questions were asked during scoping to refine requirements:

| # | Question | Answer | Rationale |
|---|----------|--------|-----------|
| 1 | Where should work item be created? | A1: Shared (`change/work-items/`) | User wants this to be an example of the system |
| 2 | Which recommendations to include? | B1 only (namespace delta file) | Focused scope, others deferred |
| 3 | Confirm out-of-scope items? | Confirmed challenges 2,3,4,5,6,7 deferred | Documented for future consideration |
| 4 | Link to JIRA ticket? | Not requested | No external tracking needed |

### Synthesized Intent

The final refined instruction that combines all inputs:

> Update the GitHub Copilot delta file (`agents/github-copilot/copilot-instructions-ai-assisted-work.md`) to use `aiaw-*` namespaced command prefixes instead of bare `/start-work`, ensuring consistency across all three supported AI tools (Cursor, Claude Code, GitHub Copilot) and avoiding conflicts with existing user commands in target repositories.

---

## AI Agent Instructions

### Working with This Work Item

1. **Read both documents**: Always read `scope.md` first for the formal specification, then this addendum for context and rationale.

2. **Respect decision rationale**: Challenges 2-7 were explicitly deferred. Don't propose addressing them as part of this work item.

3. **Terminology consistency**: Use these terms consistently:
   - "delta file" (not "merge file" or "template")
   - "namespace" or "prefix" (not "slug")
   - `aiaw-*` (not `ai-assisted-work-*` or `aaw-*`)

4. **Scope boundaries**: Strictly exclude:
   - Deprecating the delta file approach
   - Restructuring self commands
   - Adding verification scripts
   - Adding frontmatter to GitHub prompts
   - Modifying `.gitignore` guidance

5. **Command naming pattern**: 
   - Standard commands: `aiaw-start-work`, `aiaw-progress-work`, `aiaw-pivot-work`, `aiaw-work-status`, `aiaw-replace-ascii-diagrams`
   - Self commands: `aiaw-self-start-work`, `aiaw-self-progress-work`, `aiaw-self-pivot-work`, `aiaw-self-work-status`, `aiaw-self-replace-ascii-diagrams`

### Key Concepts to Understand

| Concept | Definition | Key Point |
|---------|------------|-----------|
| Delta file | A file containing AIAW-specific instructions for manual merge into user's copilot-instructions.md | Users copy content, not the file itself |
| Namespace prefix | The `aiaw-` prefix on command names | Prevents conflicts with user's existing commands |
| Self commands | Commands for developing AIAW itself | Point to `agents/` not `.ai-assisted-work/agents/` |

### Files to Modify

| File | Change |
|------|--------|
| `agents/github-copilot/copilot-instructions-ai-assisted-work.md` | Change `/start-work` → `/aiaw-start-work` (and all other commands) |
| `DEPLOYMENT.md` | Check if any references to command names need updating |

### Verification Checklist

After making changes, verify:
- [x] All commands in delta file use `aiaw-*` prefix
- [x] No bare `/start-work` etc. remain in delta file
- [x] DEPLOYMENT.md command references are consistent
- [x] Changes match the pattern in `.github/prompts/` file names
