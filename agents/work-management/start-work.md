# Start Work

Create a new **work item** workspace and guide it through scoping, discovery, and planning phases.

**See also:**
- [README.md](README.md) - Core concepts, ID conventions, lifecycle for work item management
- [progress-work.md](progress-work.md) - Execution phase (after planning)
- [pivot-work.md](pivot-work.md) - Revising scope after work started
- [work-status.md](work-status.md) - Checking status

## Phases Overview

| Phase | Interaction Style | Purpose | Output |
|-------|-------------------|---------|--------|
| **Scoping** | Read-only → Write | Refine user's intent through dialogue | scope.md, scope-ai.md |
| **Discovery** | Read-only → Write | Research workspace + web sources | research.md, decisions.md |
| **Planning** | Write | Create execution plan from decisions | plan.md, progress.yaml |
| **Execution** | Write | Implement the plan | Deliverables |

**Note**: Each phase uses a read-only approach for interactive dialogue and research (gathering information, asking questions, presenting options), then transitions to write operations to create documents. Use the most appropriate tool mode for each phase of work.

### Scope Documents

The scoping phase produces scope documentation:

| Document | Audience | Purpose | Required? |
|----------|----------|---------|-----------|
| `scope.md` | Humans + AI | Stakeholder-facing specification: summary, intent, acceptance criteria, scope boundaries, context. | **Required** |
| `scope-ai.md` | AI only | Agent addendum: preserves the original instruction verbatim, clarifying Q&A, decision rationale. | Recommended |

**When to create scope-ai.md:**
- Complex work items with significant clarification dialogue
- Work items where understanding the "why" is important for future agents
- When the scoping conversation reveals nuances not captured in scope.md

**When scope-ai.md can be skipped:**
- Simple, straightforward work items
- When scope.md captures all necessary context
- Bug fixes or documentation updates with clear requirements

## Supported Work Types

| Type | Description | Example |
|------|-------------|---------|
| `development` | Software development | "Implement user authentication API" |
| `architecture` | Platform strategy and solution design | "Design event-driven architecture for orders" |
| `consultancy` | Advisory and analysis | "Assess cloud migration options and recommend approach" |
| `mixed` | Combination | "Research, design, and implement caching layer" |

## Usage

```
/start-work {brief description of what you want to work on}
```

---

## Phase 1: Scoping

**Purpose**: Capture and refine the user's intent through interactive dialogue before any research or planning.

**Interaction Style**: Start with read-only operations for interactive dialogue and intent exploration, then use write operations to create scope.md

### Step 1.1: Capture Initial Instruction

Record the user's exact words verbatim. Do NOT paraphrase.

### Step 1.1a: Determine Work Item Location

Ask the user where to create the work item:

```
Where should I create this work item?

1. **Shared** (e.g., `change/work-items/`) - Committed to repository, visible to others
2. **Private** (e.g., `change/work-items-private/`) - Gitignored, stays local
3. **Custom path** - Specify a different location

Default is shared unless you specify otherwise.
```

If the user doesn't specify or prefers the default, use the shared location (e.g., `change/work-items/` or the project's standard work items folder).

### Step 1.2: Ask Clarifying Questions

During the read-only phase, ask questions to understand:

- **What** they want to achieve (outcomes, not solutions)
- **Why** this matters (context, motivation)
- **Constraints** (time, technology, dependencies)
- **Success criteria** (how they'll know it's done)

Example questions:
- "What problem does this solve?"
- "Are there existing patterns in the workspace I should follow?"
- "What's out of scope for this work item?"
- "How will you verify this is complete?"

### Step 1.3: Confirm Understanding

Summarize what you understand and get confirmation:

```
Based on our discussion, here's what I understand:

Intent: {refined understanding}
Outcomes: {what success looks like}
Constraints: {limitations}
Out of scope: {what's excluded}

Is this accurate? Anything to add or change? Move on to creating scope document?
```

### Step 1.4: Request JIRA Ticket (Optional)

If your organization uses JIRA for tracking, offer to link the work item to a ticket:

```
Would you like to link this work item to a JIRA ticket?

If yes, please create a ticket with:
  Project: [appropriate project]
  Summary: {work item title}
  Description: {refined intent summary}

Share the JIRA ticket URL and I'll link it to the work item.
If you prefer to skip JIRA integration, we can proceed without it.
```

**Note:** JIRA integration is optional. The agent does not auto-create tickets. If skipped, `artifacts.jira` will be null in progress.yaml.

### Step 1.5: Generate Work Item ID and Create Scope Documents

Once intent is confirmed, **use write operations** to create files:

1. **Determine visibility** - based on user request or clarification:
   - **Shared** (default): Work item will be committed, visible to others
   - **Private**: Work item is gitignored, for personal/sensitive work

2. **Discover work items location** based on visibility:

   **For shared work items (WI-NNN)**:
   - `00-change/work-items/` (preferred)
   - `work-items/` (root)
   - `docs/3-work/work-items/` (legacy)
   - Any `**/work-items/` subfolder
   
   If none exist, create `00-change/work-items/`

   **For private work items (WIP-NNN)**:
   - `00-change/work-items-private/` (preferred)
   - `work-items-private/` (root)
   - Any `**/work-items-private/` subfolder
   
   If none exist, create `00-change/work-items-private/`

3. **Find next ID** - scan discovered location for existing folders:
   - For shared: scan for `WI-*/` folders, find highest number, increment
   - For private: scan for `WIP-*/` folders, find highest number, increment
   
   **Note**: Shared and private numbering are independent (WI-001 and WIP-001 are different work items)

4. **Work Item ID format**:
   - Shared: `WI-{NNN}` (zero-padded: 001, 002, etc.)
   - Private: `WIP-{NNN}` (zero-padded: 001, 002, etc.)

5. Create folder structure:
   ```
   {work-items-location}/{PREFIX}-{NNN}-{kebab-case-title}/
   ├── deliverables/     # Create empty folder for activity outputs
   └── locks/            # Create empty folder for activity locks
   ```
6. Create **scope document(s)**:
   - `scope.md` using template from `./_templates/scope.md` - stakeholder-facing specification (required)
   - `scope-ai.md` using template from `./_templates/scope-ai.md` - AI agent addendum (recommended for complex work items)
7. If a JIRA URL was provided, record it for later inclusion in `progress.yaml`

**Document separation guidelines:**

| Content | Goes In | Rationale |
|---------|---------|-----------|
| Summary | scope.md | Stakeholders need this |
| Intent (synthesized) | scope.md | Clean statement of what we're doing |
| Acceptance criteria | scope.md | Stakeholders need to review/approve |
| In/Out of scope | scope.md | Clear boundaries for all audiences |
| Context & references | scope.md | Helpful for all audiences |
| Original instruction (verbatim) | scope-ai.md | Preserves exact user words for AI context |
| Clarifying Q&A | scope-ai.md | Explains decision rationale |
| Decision rationale | scope-ai.md | Helps AI understand WHY |
| Agent-specific instructions | scope-ai.md | Terminology, scope boundaries, key concepts |

**Critical**: The "Original User Instruction" in scope-ai.md must be the user's exact words. The "Intent" in scope.md is a clean synthesis for stakeholders.

---

## Phase 2: Discovery

**Purpose**: Research to understand the problem space and identify options.

**Interaction Style**: Read-only for research and presenting options, then write operations to create research.md and decisions.md

### Should You Skip Discovery?

Use this decision tree to determine if Discovery is needed:

```
Is this a simple, well-understood task?
  |
  ├─ YES → Does it require research or choosing between approaches?
  |         |
  |         ├─ NO  → SKIP Discovery (go to Phase 3: Planning)
  |         └─ YES → Continue with Discovery
  |
  └─ NO  → Continue with Discovery
```

**Skip Discovery when:**
- Bug fix with clear reproduction steps and obvious solution
- Adding a field following existing patterns
- Documentation update with known information
- Task explicitly specifies the approach to use

**Do Discovery when:**
- Multiple valid approaches exist
- Problem space is unfamiliar
- Best practices need to be researched
- User needs help choosing between options

If skipping Discovery, proceed directly to Phase 3 and note in plan.md:
```markdown
## Analysis Summary

### Discovery
Skipped - {reason: simple bug fix / established pattern / user specified approach}
```

### Step 2.1: Determine Discovery Needs

Based on work type and complexity:

| Work Type | Workspace Research | Web Research |
|-----------|-------------------|--------------|
| Development | Existing code patterns, architecture docs | Libraries, techniques, best practices |
| Architecture | Current system state, existing decisions | Design patterns, industry approaches |
| Consultancy | Existing documents, prior analyses | Industry trends, methodologies |

### Step 2.2: Research Workspace

Search the workspace for relevant context:

- Related documentation
- Existing patterns or code
- Prior decisions or ADRs
- Similar work items

### Step 2.3: Research Web Sources

Search for up-to-date information:

- Current best practices
- Library/framework documentation
- Industry patterns and approaches
- Relevant case studies

**Important**: Document all sources with URLs and retrieval dates.

### Step 2.4: Create research.md (if needed)

For non-trivial work items, **use write operations** to create `research.md` using template from `./_templates/research.md`:

- Document all sources (web and workspace)
- Summarize key findings
- Note implications for the work item

**Skip if**: Simple work item with no research needed.

### Step 2.5: Identify Options and Trade-offs

Based on research, identify:

- Possible approaches (2-3 options typically)
- Trade-offs for each option
- Recommendations with rationale

### Step 2.6: Present Options to User

Present options clearly with trade-offs:

```
Based on my research, here are the options:

## Option A: {Name}
{Description}
- Pros: {advantages}
- Cons: {disadvantages}
- Effort: {Low/Medium/High}

## Option B: {Name}
{Description}
- Pros: {advantages}
- Cons: {disadvantages}
- Effort: {Low/Medium/High}

**My Recommendation**: Option {X} because {rationale}.

Which approach would you like to take?
```

### Step 2.7: Record Decisions

Once user decides, **use write operations** to create `decisions.md` using template from `./_templates/decisions.md`:

- Document options considered
- Record chosen approach and rationale
- Note any deferred decisions

**Skip if**: Simple work item with no significant decisions.

---

## Phase 3: Planning

**Purpose**: Create a detailed execution plan based on refined scope and decisions.

**Interaction Style**: Write operations (creates plan.md and progress.yaml)

### Step 3.1: Determine Work Type and Complexity

**Work Type:**

| If the work involves... | Type |
|-------------------------|------|
| Code, tests, deployments | `development` |
| Diagrams, specifications, decisions | `architecture` |
| Research, analysis, recommendations | `consultancy` |
| Multiple of the above | `mixed` |

**Complexity:**

| Complexity | Indicators | Approach |
|------------|------------|----------|
| **Simple** | 1-3 deliverables, clear scope | Single activity |
| **Medium** | 4-10 deliverables, some unknowns | Multiple activities |
| **Complex** | 10+ deliverables, significant unknowns | BMAD method |

### Step 3.2: Design Activities

Group work into activities (units of assignment):

- Tasks within an activity are sequential
- Activities can depend on other activities
- Independent activities enable parallel work

**Activity Design Guidelines:**
- Group sequential tasks into the same activity
- Separate independent work into different activities
- Minimize cross-activity dependencies for parallelism
- Each activity should have a clear "done" state

### Step 3.3: Create plan.md

Using template from `./_templates/plan.md`:

1. Problem statement (from refined scope)
2. Approach (from decisions)
3. Activities with tasks
4. Activity dependencies
5. Risks and mitigations
6. Verification approach

### Step 3.4: Initialize progress.yaml

Using template from `./_templates/progress.yaml`:

1. Set `work_item_id`, `title`, and `type`
2. Set `status: planning`
3. Populate `activities` array from plan.md
4. Set `artifacts.jira` to the JIRA URL from Step 1.4 (or null if skipped)
5. Initialize `deliverables` array (empty initially, populated as tasks complete)

### Step 3.5: Initialize changes.md

Create `changes.md` using template from `./_templates/changes.md`:

1. Set work item ID and title
2. Create Deliverables Index table (initially empty)
3. Create activity sections (initially pending)
4. Set `artifacts.changes` to `"./changes.md"` in progress.yaml

This document will be updated during execution to track all workspace files modified or created.

### Step 3.6: Present Plan for Approval

Show the user:

```
Work Item: WI-003 - {Title}
Type: {development/architecture/consultancy/mixed}
Location: 00-change/work-items/WI-003-{name}/
JIRA: {URL or "Not linked"}
Branch: wi/WI-003-{name} (will be created at execution start)

Summary: {From scope.md}

Activity Graph:
  WI-003-A1 (Discovery) ──┬──> WI-003-A3 (Synthesis)
  WI-003-A2 (Analysis)  ──┘

Activities:
  WI-003-A1: {Title} ({N} tasks, {effort})
      → Can start immediately
      → Deliverables: {list}
  WI-003-A2: {Title} ({N} tasks, {effort})
      → Can run parallel with A1
      → Deliverables: {list}
  WI-003-A3: {Title} ({N} tasks, {effort})
      → Requires A1 and A2 complete
      → Deliverables: {list}

Documents Created:
  ✓ scope.md (required - stakeholder specification)
  ✓ scope-ai.md (required - AI agent addendum)
  ✓ research.md (has research findings)
  ✓ decisions.md (has decision record)
  ✓ plan.md (required)
  ✓ progress.yaml (required)
  ✓ changes.md (required - for release changelog)

Ready to begin execution?
```

---

## Phase 4: Execution

**Purpose**: Implement the plan.

**Interaction Style**: Write operations (continues from Planning phase)

### Step 4.1: Claim First Activity

1. Update `status: in_progress` in progress.yaml
2. Find an available activity (no dependencies, not locked)
3. Create lock file in `locks/` directory
4. Begin working on first task

### Step 4.2: Hand Off to Progress Work

For continued implementation, use `/progress-work WI-NNN` or the progress-work agent.

---

## Document Structure

### Required Documents

| Document | Created In | Purpose | Audience |
|----------|------------|---------|----------|
| `scope.md` | Scoping Phase | Stakeholder-facing specification | Humans + AI |
| `scope-ai.md` | Scoping Phase | Intent history, rationale, agent instructions | AI only |
| `plan.md` | Planning Phase | Activities, tasks, dependencies (lean - refs deliverables) | Humans + AI |
| `progress.yaml` | Planning Phase | Machine-readable state, deliverables list | Humans + AI |
| `changes.md` | Planning Phase | Files changed + decisions (for PR/changelog) | Humans + AI |
| `deliverables/` | Execution Phase | Concrete outputs from activities | Humans + AI |

### Optional Documents

| Document | Created In | When Needed |
|----------|------------|-------------|
| `research.md` | Discovery Phase | When research was conducted |
| `decisions.md` | Discovery Phase | When significant decisions were made |
| `notes.md` | Any Phase | For session logs, ad-hoc findings |

---

## Examples by Work Type

### Development Example

```
User: "Fix the bug where task titles overflow the sidebar"

Phase 1 (Scoping):
- Clarify: What's "too long"? Where does it display badly?
- Refined: Truncate task titles to 80 chars with ellipsis in sidebar

Phase 2 (Discovery):
- Workspace: Find task creation code, display components
- Web: None needed (simple fix)
- Decision: Truncate at creation vs display? → At creation

Phase 3 (Planning):
- 1 activity, 3 tasks: locate, fix, test

Documents: scope.md, scope-ai.md, plan.md, progress.yaml, changes.md
Folders: deliverables/, locks/
(research.md and decisions.md skipped - simple work item)
```

### Architecture Example

```
User: "Design event-driven architecture for order processing"

Phase 1 (Scoping):
- Clarify: What triggers events? What consumes them? Scale requirements?
- Refined: Design async order pipeline with Pub/Sub

Phase 2 (Discovery):
- Workspace: Current order flow, existing event patterns
- Web: Event sourcing patterns, GCP Pub/Sub best practices
- Decisions: Pub/Sub vs Kafka? Event schema format?

Phase 3 (Planning):
- 4 activities: Document current, Design target, Create specs, Review

Documents: scope.md, scope-ai.md, research.md, decisions.md, plan.md, progress.yaml, changes.md
Folders: deliverables/, locks/
```

### Consultancy Example

```
User: "Assess cloud readiness and recommend migration strategy"

Phase 1 (Scoping):
- Clarify: Timeline? Budget constraints? Compliance requirements?
- Refined: 6-month migration assessment for regulated workloads

Phase 2 (Discovery):
- Workspace: Infrastructure docs, compliance requirements
- Web: Cloud migration frameworks, regulatory guidance
- Decisions: Lift-and-shift vs refactor? Single cloud vs multi?

Phase 3 (Planning):
- 3 activities: Discovery interviews, Analysis, Recommendations

Documents: scope.md, scope-ai.md, research.md, decisions.md, plan.md, progress.yaml, changes.md
Folders: deliverables/, locks/
```

---

## Important Rules

1. **Use read-only approach for dialogue**: Interactive refinement and research happens before writing files
2. **Write only after user confirms**: Create files only after user confirms requirements
3. **Preserve user's words**: Original Instruction must be verbatim
4. **Research before deciding**: Don't skip discovery for non-trivial work
5. **Document sources**: All web research must have URLs and dates
6. **Get user decisions**: Don't assume - present options and get confirmation
7. **Structure for parallelism**: Design activities to enable multiple workers
8. **Be specific**: Tasks should be atomic and clearly defined

---

## For Complex Work Items

If analysis reveals this needs BMAD (10+ deliverables, significant unknowns):

1. Complete scoping phase to create scope.md
2. Tell the user: "This work item is complex enough to benefit from BMAD. Run `/bmad:bmm:workflows:create-tech-spec` or `/bmad:bmm:workflows:create-prd`"
3. The work item folder becomes the container for BMAD artifacts
