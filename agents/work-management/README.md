# Work Items

A **work item** is a bounded unit of work with a clear outcome or deliverable. It sits above the granularity of a simple task but below the level of a project or initiative. A work item has the following characteristics:

> **AI Agents:** Read [AGENTS.md](AGENTS.md) before working with work items. It contains critical rules about concurrency, lock handling, and boundaries that must not be violated.

## Quick Start

**Creating a new work item:**
```
/start-work "Add user authentication to the API"
```

**Continuing work on an existing item:**
```
/progress-work WI-001
```

**Checking status:**
```
/work-status
```

See [Commands](#commands) for full list.

## Invoking Commands

Commands can be invoked using slash notation:

| Command | Purpose |
|---------|---------|
| `/start-work` | Create new work item (Scoping → Discovery → Planning) |
| `/progress-work [WI-NNN]` | Execute work item (Implementation phase) |
| `/pivot-work [WI-NNN]` | Revise scope/plan after work started |
| `/work-status [WI-NNN]` | Check status of work items |

**Note**: These commands map to skills in the `work-management` namespace. The skill names may differ from the slash commands (e.g., `work-management:start-feature` invokes `/start-work`).

---

## External Integration

Work items integrate with external systems for tracking and isolation:

### JIRA Ticket

Before starting a work item, create a JIRA ticket manually:

1. Create a JIRA ticket in the appropriate project
2. Use the JIRA ticket ID as the work item reference (e.g., `WI-001` maps to `PROJ-123`)
3. Record the JIRA URL in `progress.yaml` under `artifacts.jira`
4. Update JIRA status as the work item progresses

**Note:** JIRA ticket creation is a manual step. The work management system does not auto-create tickets.

### Git Branch

Each work item is developed on an isolated branch:

1. **Branch naming**: `wi/{WI-NNN}-{kebab-case-name}` (e.g., `wi/WI-001-user-profile-api`)
2. **Create branch** before starting execution (Phase 4)
3. **All changes** for the work item go on this branch
4. **Record branch** in `progress.yaml` under `artifacts.branch`
5. **Create PR** when work is complete for review

This isolation ensures:
- Work items don't interfere with each other
- Changes can be reviewed as a cohesive unit
- Rollback is straightforward if needed

### Work Item Location

Work items are created in a designated folder. The location depends on your project structure and visibility requirements.

#### Visibility Options

| Location Pattern | Visibility | ID Prefix | Use Case |
|------------------|------------|-----------|----------|
| `work-items/` or `change/work-items/` | **Shared** (committed) | `WI-NNN` | Work others can see, reference, learn from |
| `work-items-private/` or `change/work-items-private/` | **Private** (gitignored) | `WIP-NNN` | Personal rationale, experiments, sensitive decisions |

**ID Prefix Convention**:
- **WI-NNN** = Work Item (shared, committed)
- **WIP-NNN** = Work Item Private (gitignored)

This allows independent numbering - `WI-001` and `WIP-001` are different work items in different locations. When you see an ID, you immediately know where to find it.

#### Choosing Visibility

**Use shared (committed) when:**
- The work item demonstrates patterns others can follow
- You want collaborators to see the full decision history
- The work item serves as documentation

**Use private (gitignored) when:**
- The rationale contains sensitive information
- It's exploratory/experimental work
- You don't want to clutter the commit history

#### Configuration

To enable private work items, add to your `.gitignore`:

```gitignore
# Private work items
change/work-items-private/
**/work-items-private/
```

#### Note

The deliverables and outputs from a private work item can still update public files elsewhere in the repository. Only the work item folder itself (scope, plan, progress tracking) remains private.

---

## Core Concepts

A work item has the following characteristics:

- Has a defined scope and completion criteria.
- Contains multiple **activities**, each with sequential **tasks**.
- Supports parallel work when activities have no dependencies.
- Works the same way regardless of who (human or agent) does the work.

## Supported Work Types

| Type | Description | Example Activities |
|------|-------------|-------------------|
| **Development** | Software development work | Implement API, Write tests, Deploy service. |
| **Architecture** | Platform strategy and solution design | Document current state, Evaluate options, Create diagrams. |
| **Consultancy** | Advisory and analysis work | Stakeholder interviews, Gap analysis, Write recommendations. |
| **Mixed** | Combination of the above | Research + Design + Implementation. |

## Worker Types

Work items can be progressed in parallel by assigning, locking and progressing activities via:

- **Humans** - Longer assignment lock durations (8h activity, 4h task)
- **AI Agents** - Shorter lock durations (1h activity, 30m task)
- **Mixed teams** - Humans and agents working different activities in parallel

## Key Concepts

### Activities

An **activity** is the unit of work assignment. A worker claims and locks an activity and works through its tasks sequentially.

- Tasks within an activity are done in order
- Tasks have no dependencies outside their activity
- Multiple workers can work different activities in parallel

**ID Convention (hierarchical, globally unique):**

| Entity | Format | Example |
|--------|--------|---------|
| Work Item (shared) | `WI-{NNN}` | `WI-001`, `WI-042` |
| Work Item (private) | `WIP-{NNN}` | `WIP-001`, `WIP-042` |
| Activity | `{work_item_id}-A{N}` | `WI-001-A1`, `WIP-001-A2` |
| Task | `{activity_id}-T{N}` | `WI-001-A1-T1`, `WIP-001-A1-T2` |
| Deliverable | `{work_item_id}-D{NN}` | `WI-001-D01`, `WIP-001-D02` |
| Blocker | `{work_item_id}-B{N}` | `WI-001-B1`, `WIP-001-B2` |

**Note**: The `WI-` vs `WIP-` prefix indicates visibility. Numbering is independent per location.

### Activity Dependencies

Activities can depend on other activities completing first:

```
WI-001-A1 (Backend) ──┬──> WI-001-A3 (Integration Tests)
                      │
WI-001-A2 (Frontend) ─┘

WI-001-A4 (Documentation) - no dependencies, can run in parallel with all
```

This enables:
- **Parallelism**: WI-001-A1 and WI-001-A2 can be worked simultaneously
- **Ordering**: WI-001-A3 waits for both A1 and A2
- **Independence**: WI-001-A4 can be done anytime

### Locks and Recovery

**One agent per activity.** This is the fundamental concurrency rule.

- **Activity locks** are stored as separate files in `locks/` directory
- **Lock files** are created atomically when claiming, deleted when releasing
- **Locks expire** automatically (1 hour for agents, 8 hours for humans)
- **Expired locks** can be claimed by any worker for recovery
- **Task state** is tracked within the activity lock file (for observability, not claiming)

**Critical:** Agents claim activities, not tasks. An agent holding an activity lock works ALL tasks in that activity. No other agent may work any task in that activity until the lock is released or expires. See [AGENTS.md](AGENTS.md) for detailed rules.

**Writeback Requirement:** Before releasing a lock, agents MUST update `progress.yaml` to reflect completed work. This ensures the next agent can trust the documented state. Releasing a lock without updating progress.yaml corrupts the system for subsequent agents.

### Concurrency Safety

The system uses file-based coordination:

| File | Access Pattern | Safety Mechanism |
|------|---------------|------------------|
| `progress.yaml` | Read-modify-write | Version field (optimistic locking) |
| `changelog.log` | Append-only | Atomic line appends |
| `locks/*.lock` | Create/delete | Atomic file operations |

**Version Check Protocol:**
1. Read progress.yaml, note `version`
2. Do work
3. Re-read progress.yaml before writing
4. If version changed: conflict detected, merge or retry
5. If same: increment version and write

### Scaling Limits

**Recommended: 2-5 workers per work item, maximum 10.**

See [limitations.md](limitations.md) for detailed analysis of structural and technical constraints.

## Work Item Workspace

Each work item gets its own folder as a work item-specific workspace:

```
WI-{NNN}-{descriptive-name}/
├── scope.md         # [REQUIRED] Stakeholder-facing specification (summary, intent, acceptance criteria)
├── plan.md          # [REQUIRED] Activities, tasks, dependencies (lean - references deliverables)
├── progress.yaml    # [REQUIRED] Source of truth for state tracking (versioned)
├── deliverables/    # [REQUIRED] Concrete outputs from activities
│   ├── D01-{name}.md    # Deliverable with ID WI-NNN-D01
│   ├── D02-{name}.md    # Deliverable with ID WI-NNN-D02
│   └── ...
├── locks/           # [REQUIRED] Activity lock files (atomic create/delete)
│   ├── WI-001-A1.lock
│   └── WI-001-A2.lock
├── scope-ai.md      # [RECOMMENDED] AI agent addendum (intent history, rationale)
├── changes.md       # [OPTIONAL] Files changed summary - can be generated from progress.yaml
├── changelog.log    # [OPTIONAL] Append-only event log (for multi-agent audit trail)
├── research.md      # [OPTIONAL] Web + workspace research findings
├── decisions.md     # [OPTIONAL] Options considered, decisions made (legacy - prefer deliverables/)
├── notes.md         # [OPTIONAL] Ad-hoc narrative and findings
└── agents.md        # [OPTIONAL] Work-specific agent instructions
```

### Document Categories

**Required Documents** (every work item):

| Document | Purpose | Audience | Created In |
|----------|---------|----------|------------|
| `scope.md` | Stakeholder-facing specification: summary, intent, acceptance criteria, scope boundaries, context. | Humans + AI | Scoping Phase |
| `plan.md` | Activities, tasks, dependencies. References deliverables, avoids detailed design content. | Humans + AI | Planning Phase |
| `progress.yaml` | **Source of truth** for all state tracking. Includes activities, tasks, deliverables, artifacts. | Humans + AI | Planning Phase |
| `deliverables/` | Concrete outputs from activities (decision docs, specifications, guides). | Humans + AI | Execution Phase |

**Recommended Documents** (create when beneficial):

| Document | Purpose | When to Create |
|----------|---------|----------------|
| `scope-ai.md` | AI agent addendum: intent formation history, clarifying Q&A, decision rationale. | Complex work items where intent rationale aids future agents |
| `changes.md` | Files modified/created + decision summaries. Can be generated from progress.yaml. | When preparing PR or release changelog |
| `changelog.log` | Append-only event log (JSON Lines) for audit trail. | Multi-agent scenarios or when audit trail is required |

**Why have scope-ai.md?**

- **`scope.md`** is distributed to stakeholders - it should be clean, professional, and focused on WHAT is being delivered
- **`scope-ai.md`** (optional but recommended) preserves the dialogue and reasoning that led to the scope - this helps AI agents understand WHY certain decisions were made
- For complex work items, creating scope-ai.md improves continuity across agent sessions
- For simple work items, scope.md alone is sufficient

### Deliverables

**Every completed activity should produce a deliverable.** A deliverable is:

1. **A file created or modified** (tracked in progress.yaml deliverables section)
2. **A decision documented** (captured in deliverable document)
3. **Both**

Even a "decision to do nothing" is a deliverable - document the analysis and rationale. Deliverables are tracked at the activity level, not individual tasks.

**Deliverable ID Convention:**

| Entity | Format | Example |
|--------|--------|---------|
| Deliverable | `D{NN}` | `D01`, `D02`, `D03` |
| Full ID | `{work_item_id}-D{NN}` | `WI-001-D01`, `WI-008-D03` |

**Note:** Either the short ID (`D01`) or full ID (`WI-001-D01`) can be used when referencing deliverables. The short ID is a shorthand for the full ID within the work item context.

**Deliverable Document Structure:**

```markdown
# D01: {Deliverable Name}

**Deliverable ID**: WI-NNN-D01  
**Activity**: WI-NNN-A1 (Activity Name)  
**Tasks**: T1, T2, T3  
**Status**: Complete | Draft  
**Date**: YYYY-MM-DD

---

## Decision

{One-line summary of what was decided}

## {Content sections as appropriate}

## Files Created/Modified

| File | Type | Purpose |
|------|------|---------|
| `path/to/file` | Created/Modified | Description |

## Verification

- [x] Criteria 1
- [ ] Criteria 2
```

**Deliverables vs Changes:**

| Document | Purpose | Scope |
|----------|---------|-------|
| `deliverables/D01-*.md` | **What was decided** - detailed analysis, rationale, specifications | Activity-level outputs |
| `changes.md` | **What files changed** - quick reference for PR review, links to deliverables | All file changes across work item |

**Keep `plan.md` lean:** The plan should list tasks and reference deliverables, not contain detailed design content. Move detailed proposals, options analysis, and specifications into deliverable documents.

**Optional Documents** (created when needed):

| Document | Purpose | Created In |
|----------|---------|------------|
| `research.md` | Web sources, workspace findings. | Discovery Phase |
| `decisions.md` | Options, trade-offs, chosen approach. | Discovery Phase |
| `notes.md` | Notes, blockers, ad-hoc findings. | Any Phase |
| `agents.md` | Work-specific agent instructions | Any Phase |

### Changes Document (Optional)

The `changes.md` file is **optional** and can be generated from `progress.yaml` when preparing a PR or release changelog. It provides a human-readable summary of:

- Files modified/created per activity
- Decision summaries
- Deliverables produced

**When to create changes.md:**
- When preparing a PR for review
- When creating release notes
- When handing off to stakeholders

**Generating from progress.yaml:**

Since `progress.yaml` is the source of truth and tracks all tasks, deliverables, and file changes, you can generate `changes.md` by:
1. Reading the deliverables list from progress.yaml
2. Reading task notes and completed_at timestamps
3. Reading the artifacts section for file references

This avoids maintaining two places during active work.

### Why This Structure?

- **Separation of concerns**: Research and decisions don't clutter the execution plan.
- **Concurrency**: `progress.yaml` uses optimistic locking, changelog.log is append-only.
- **Flexibility**: Simple work items skip research/decisions; complex ones have full trail.

## Work Item Lifecycle

Work items progress through four phases. Each phase has a recommended interaction style:

- **Read-only phases** (Scoping, Discovery): Focus on dialogue, research, and analysis before making changes. Use read-only tool modes where available.
- **Write phases** (Planning, Execution): Create and modify files. Use full tool access.

| Phase | Interaction Style | Purpose |
|-------|-------------------|---------|
| 1. Scoping | Read-only → Write | Refine intent, create scope.md |
| 2. Discovery | Read-only → Write | Research, create research.md & decisions.md |
| 3. Planning | Write | Create plan.md & progress.yaml |
| 4. Execution | Write | Implement the plan |

**Note:** The "Read-only → Write" pattern means: gather information and confirm with the user before creating files. Use the most appropriate tool mode for each phase of work.

### Phase 1: Scoping

**Purpose**: Refine user's intent through interactive dialogue.

1. Capture user's initial instruction verbatim (read-only)
2. Ask clarifying questions about outcomes, constraints, success criteria (read-only)
3. Confirm understanding with user (read-only)
4. Create `scope.md` with original + refined instruction (write)

### Phase 2: Discovery

**Purpose**: Research to understand problem space and identify options.

1. Research workspace (documents, code, existing patterns) (read-only)
2. Research web sources (best practices, libraries, industry approaches) (read-only)
3. Identify options and trade-offs (read-only)
4. Present options to user for decision (read-only)
5. Create `research.md` and `decisions.md` (write, if non-trivial)

**Note**: For simple work items, this phase may be skipped or minimal.

### Phase 3: Planning

**Purpose**: Create execution plan from refined scope and decisions.

1. Design activities (units of work assignment)
2. Define tasks within each activity
3. Establish activity dependencies
4. Create `plan.md` and `progress.yaml`
5. Present plan for user approval

### Phase 4: Execution

**Purpose**: Implement the plan.

1. Claim available activities
2. Work through tasks
3. Update progress.yaml as work completes

### Status Values

| Status | Phase | Description |
|--------|-------|-------------|
| `scoping` | 1 | Refining intent with user. |
| `discovery` | 2 | Researching and gathering options. |
| `planning` | 3 | Creating execution plan. |
| `in_progress` | 4 | Execution underway. |
| `blocked` | - | Waiting on external input/resolution. |
| `review` | 4 | Work complete, awaiting verification. |
| `abandoned` | - | Work is abandoned. |
| `done` | - | Outcome achieved and verified. |

## Commands

| Command | Interaction Style | Purpose |
|---------|-------------------|---------|
| `/start-work` | Read-only → Write | Scoping → Discovery → Planning phases. |
| `/progress-work [WI-NNN]` | Write | Execution phase (implement the plan). |
| `/pivot-work` | Read-only → Write | Revise scope and plan after work started. |
| `/work-status` | Read-only | Check status of all active work items. |

### Progress Work Agent

The `/progress-work` command (or agent) is designed to continue implementation after planning is complete. It:

1. **Reads Work Item Context**: Loads scope.md, plan.md, and progress.yaml
2. **Assesses State**: Checks current status, locks, activity dependencies
3. **Finds Available Activity**: Identifies activities with no dependencies or all dependencies met
4. **Claims Activity**: Locks the activity to prevent conflicts
5. **Works Tasks Sequentially**: Completes each task in order within the activity
6. **Updates Progress**: Marks tasks and activities complete as it goes
7. **Verifies**: Ensures all acceptance criteria are met before marking complete

**Key Features**:

- **Parallel-Ready**: Multiple agents can work different activities simultaneously
- **Resumable**: Any agent session can pick up where another left off
- **Lock-based**: Activity and task locks prevent conflicts
- **Progress Tracking**: progress.yaml is the source of truth
- **Dependency Aware**: Respects activity dependencies from plan.md

**Usage**:
```
/progress-work WI-001
```

or simply:

```
/progress-work
```

(Will find the most recent work item automatically)

## Handling Interruptions and Agent Failures

If an agent session ends unexpectedly:

1. Run `/progress-work WI-XXX`
2. Agent reads progress.yaml to see current state
3. Finds activity with expired lock (**must verify expiry, not assume**)
4. Claims the activity (new lock via delete-then-create)
5. Reviews completed tasks (doesn't redo them)
6. Continues from last incomplete task
7. Updates changelog with recovery action

**Critical:** Recovery only applies when a lock is genuinely expired. If the lock file is being modified by another agent, that agent is still active - do not attempt recovery. See [AGENTS.md](AGENTS.md) for the recovery protocol.

## Parallel Work

Multiple agents can work on the same work item when:

1. **Independent Activities**: Activities with no dependencies between them
2. **All Dependencies Met**: Activities whose prerequisites are complete
3. **Not Locked**: Activities not currently held by another agent

Example scenario with 3 workers:
```
Worker 1: Claims WI-001-A1, working through tasks
Worker 2: Claims WI-001-A2 (no dependency on A1)
Worker 3: Waits - WI-001-A3 depends on A1 and A2

Worker 1: Completes WI-001-A1
Worker 3: Still waiting - WI-001-A2 not done

Worker 2: Completes WI-001-A2
Worker 3: Claims WI-001-A3 (both dependencies met)
```

## Planning for Parallelism

When creating plan.md, structure activities to maximize parallel work:

**Good**: Independent activities that can run in parallel
```
WI-001-A1: Backend API      depends_on: []
WI-001-A2: Frontend UI      depends_on: []
WI-001-A3: Integration      depends_on: [WI-001-A1, WI-001-A2]
```

**Less Optimal**: Linear chain that forces sequential work
```
WI-001-A1: Backend API      depends_on: []
WI-001-A2: Frontend UI      depends_on: [WI-001-A1]
WI-001-A3: Integration      depends_on: [WI-001-A2]
```

## Work Type Specifics

**All work types** share these requirements:

- **Git branch**: `wi/WI-{NNN}-{kebab-name}` - isolates work from other work items
- **JIRA ticket**: Created manually before starting, linked in `progress.yaml`
- **Changes document**: `changes.md` updated as files are modified/created
- **PR created**: When work is complete, for review before merging

### Development Work

- Commits after each task or logical group
- Conventional commits: `feat(WI-001): {activity}.{task} - {description}`
- Artifacts: documents, code, tests, deployment configs

### Architecture Work

- **See [architecture-work.md](architecture-work.md)** for comprehensive guidance
- Standard deliverables: capabilities, ABBs, operating model, ADRs, roadmap, cost-benefit, executive deck, diagrams
- Diagrams: Conceptual architecture (ABB-level), context/integration, with companion guide
- Decision records (ADRs) captured in `05-governance/decisions/`
- Review checkpoints at key milestones
- Artifacts: documents, diagrams, specifications, decision records

### Consultancy Work

- Research findings in `research.md`
- Interview notes and analysis in `notes.md`
- Final deliverables tracked in `progress.yaml` (`artifacts.deliverables`)
- Artifacts: working documents, reports, recommendations, presentations

## Templates

See `./_templates/` ([link](./_templates/)) for starter files:

**Required:**

- `scope.md` - Stakeholder-facing specification (summary, intent, acceptance criteria, scope, context)
- `plan.md` - Implementation plan with activities
- `progress.yaml` - Source of truth for state tracking (versioned for concurrency)

**Recommended:**

- `scope-ai.md` - AI agent addendum (intent history, decision rationale) - for complex work items

**Optional:**

- `changes.md` - Files modified summary - can be generated from progress.yaml when preparing PR
- `changelog.log` - Append-only event log - for multi-agent scenarios
- `research.md` - Web and workspace research findings
- `decisions.md` - Options, trade-offs, decisions
- `notes.md` - Session logs and ad-hoc findings
- `agents.md` - Work-specific agent instructions

**Concurrency:**

- `locks/` - Activity lock file examples

## Error Handling

### Missing Required Files

If required files are missing when running `/progress-work`:

| Missing File | Action |
|--------------|--------|
| `progress.yaml` | Cannot proceed. Run `/start-work` to create work item properly. |
| `scope.md` | Cannot proceed. Work item incomplete. Check if scoping phase finished. |
| `scope-ai.md` | Proceed with caution. Agent may lack context on intent formation and rationale. |
| `plan.md` | Cannot proceed. Work item in discovery phase. Complete planning first. |

### Malformed progress.yaml

If `progress.yaml` cannot be parsed:

1. Check for YAML syntax errors (indentation, colons, quotes)
2. Validate against the template structure
3. If unrecoverable, restore from git history or recreate from `plan.md`

### Lock Conflicts

If lock acquisition fails:

1. **If lock file was modified since you read it**: STOP. Another agent is actively working. Find a different activity.
2. **If lock exists and is not expired**: STOP. Lock is valid. Find a different activity.
3. **If lock exists and is expired**: Use delete-then-create pattern (not overwrite). If create fails, another agent claimed it first.
4. **Never forcefully delete non-expired locks** without user approval.
5. **Never overwrite lock files** - use atomic create operations only.

See [AGENTS.md](AGENTS.md) for the lock acquisition decision tree.

### Version Conflicts

If version conflict detected in `progress.yaml`:

1. Re-read the file to see what changed
2. If changes are compatible: merge and retry with incremented version
3. If changes conflict: report to user for resolution
4. Never overwrite without version check

### Work Items Location Discovery

Work items are located using a **discovery approach** rather than a hardcoded path.

**For shared work items** (WI-NNN), search in this order:
1. `00-change/work-items/` (preferred location)
2. `work-items/` (legacy location at root)
3. `docs/3-work/work-items/` (legacy nested location)
4. Any `**/work-items/` subfolder in the workspace

**For private work items** (WIP-NNN), search in this order:
1. `00-change/work-items-private/` (preferred location)
2. `work-items-private/` (legacy location at root)
3. Any `**/work-items-private/` subfolder in the workspace

**When creating new work items**:
- **Shared**: Use the first `work-items/` location that exists. If none exist, create `00-change/work-items/`.
- **Private**: Use the first `work-items-private/` location that exists. If none exist, create `00-change/work-items-private/`.

**Work Item ID format**:
- Shared: `WI-{NNN}` (zero-padded: 001, 002, etc.)
- Private: `WIP-{NNN}` (zero-padded: 001, 002, etc.)

**Folder naming**:
- Shared: `WI-{NNN}-{kebab-case-title}/`
- Private: `WIP-{NNN}-{kebab-case-title}/`

**Finding the next available ID**: Scan the appropriate location for existing work item folders and increment the highest number found. Shared and private numbering are independent.

## Decision Trees

### When to Skip Discovery Phase

```
START: Is this a simple, well-understood task?
  |
  ├─ YES: Does it require research?
  |   |
  |   ├─ NO: Does it require choosing between approaches?
  |   |   |
  |   |   ├─ NO: → SKIP Discovery (go directly to Planning)
  |   |   |
  |   |   └─ YES: → DO Discovery (need decisions.md)
  |   |
  |   └─ YES: → DO Discovery (need research.md)
  |
  └─ NO: Is the problem space well-documented in workspace?
      |
      ├─ YES: Are best practices already established?
      |   |
      |   ├─ YES: → SKIP Discovery (use existing patterns)
      |   |
      |   └─ NO: → DO Discovery (need to research options)
      |
      └─ NO: → DO Discovery (need to understand problem)
```

**Examples of skipping Discovery:**
- Bug fix with clear reproduction steps
- Adding a field to an existing API following established patterns
- Updating documentation with known information

**Examples requiring Discovery:**
- Implementing new feature with multiple possible approaches
- Performance optimization (need to profile first)
- Integration with unfamiliar external system

### When to Use Pivot vs New Work Item

```
START: How much completed work is affected?
  |
  ├─ NONE: → Use /pivot-work (minimal pivot)
  |
  ├─ SOME (<50%): → Use /pivot-work (moderate pivot)
  |
  └─ MOST (>50%): Is the original intent still valid?
      |
      ├─ YES: → Use /pivot-work (major pivot, reset activities)
      |
      └─ NO: → Abandon and create new work item
```

## Reference

- [AGENTS.md](AGENTS.md) - **Critical rules for AI agents** (read first)
- [limitations.md](limitations.md) - Scaling limits and system constraints
- [start-work.md](start-work.md) - Creating work items (Scoping → Discovery → Planning)
- [progress-work.md](progress-work.md) - Executing work items (Implementation phase)
- [pivot-work.md](pivot-work.md) - Revising scope and plan after work started
- [work-status.md](work-status.md) - Checking work item status
- [architecture-work.md](architecture-work.md) - **Architecture work type guidance** (deliverables, diagrams, ADRs)
- [_templates/](./_templates/) - Template files for all documents
