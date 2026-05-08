# Start Initiative

Create a new **initiative** — a strategic container that groups related Work Items toward a shared goal.

**See also:**
- [README.md](README.md) - Core concepts, ID conventions, lifecycle for work item management.
- [start-work.md](start-work.md) - Creating work items within an initiative.
- [work-status.md](work-status.md) - Checking initiative and work item status.

## Phases Overview

| Phase | Interaction Style | Purpose | Output |
|-------|-------------------|---------|--------|
| **Scoping** | Read-only → Write | Capture the strategic goal through dialogue | scope.md |
| **Creation** | Write | Create initiative workspace with progress tracking | progress.yaml |

**Note**: Initiatives are lightweight — no plan.md, deliverables/, or locks/. Planning, deliverables, and concurrency control happen at the Work Item level.

## Usage

```
/start-initiative {brief description of the strategic goal}
```

---

## Phase 1: Scoping

**Purpose**: Capture and refine the user's strategic goal through interactive dialogue.

**Interaction Style**: Start with read-only operations for dialogue, then write to create files.

### Step 1.1: Capture Strategic Goal

Record the user's exact words verbatim. Do NOT paraphrase.

### Step 1.2: Ask Clarifying Questions

During the read-only phase, ask questions to understand:

- **Goal**: What strategic outcome should this initiative achieve?
- **Time Horizon**: What's the target timeframe? (Quarters, e.g., 2026-Q1 to 2026-Q3)
- **Success Criteria**: How will you know the initiative succeeded? (Measurable outcomes)
- **Scope**: What's in scope and out of scope?
- **Work Items**: Are there existing work items that belong to this initiative, or will they be created later?

Example questions:
- "What problem does this initiative solve at a strategic level?"
- "What's the target timeframe for completion?"
- "How many work items do you expect this will involve?"
- "Are there existing work items that should be grouped under this initiative?"

### Step 1.3: Determine Visibility

Ask the user about initiative visibility:

```
Where should I create this initiative?

1. **Shared** (e.g., `change/initiatives/`) - Committed to repository, visible to others
2. **Private** (e.g., `change/initiatives-private/`) - Gitignored, stays local

Default is shared unless you specify otherwise.
```

### Step 1.4: Confirm Understanding

Summarize and get confirmation:

```
Based on our discussion, here's what I understand:

Goal: {strategic goal}
Time Horizon: {target start} – {target end}
Success Criteria:
  - {criterion 1}
  - {criterion 2}
Work Items: {existing WIs to include, or "to be created"}

Is this accurate? Anything to add or change?
```

---

## Phase 2: Creation

**Purpose**: Create the initiative workspace with scope and progress tracking.

**Interaction Style**: Write operations (creates folder, scope.md, progress.yaml)

### Step 2.1: Discover Initiatives Location

Locate the initiatives directory (must include symlinks):

1. **Locate initiative roots** at any level in the workspace:
   - Every `initiatives/` directory (real directory or symlink target).
   - Every `initiatives-private/` directory (real directory or symlink target).
2. **Explicitly follow symlinks:** `initiatives` and `initiatives-private` may be symlinks (Unix) or junctions (Windows). Normal directory recursion may skip them. You MUST discover and scan symlinked/junctioned paths as well as real directories.
3. **Choose root:**
   - For shared (IN-NNN): use a discovered `initiatives/` path.
   - For private (INP-NNN): use a discovered `initiatives-private/` path.
   - If none exist, create `change/initiatives/` (shared) or `change/initiatives-private/` (private).

### Step 2.2: Generate Initiative ID

1. **Find next ID** — scan the discovered location for existing initiative folders:
   - For shared: scan for `IN-*/` folders, find highest number, increment
   - For private: scan for `INP-*/` folders, find highest number, increment
2. **ID format**:
   - Shared: `IN-{NNN}` (zero-padded: 001, 002, etc.)
   - Private: **MUST use `INP-{NNN}`** (zero-padded: 001, 002, etc.) — never use `IN-` prefix for private initiatives

**Note**: Shared and private numbering are independent (IN-001 and INP-001 are different initiatives).

### Step 2.3: Create Initiative Workspace

Create folder structure:

```
{initiatives-location}/{PREFIX}-{NNN}-{kebab-case-title}/
├── scope.md          # [REQUIRED] Goals, success criteria, work item list
└── progress.yaml     # [REQUIRED] Tracks work items and overall status
```

No `plan.md`, `deliverables/`, or `locks/` — these belong at the Work Item level.

### Step 2.4: Create scope.md

Using template from `./_templates/initiative-scope.md`:

- Initiative title and ID
- Strategic goal (1-2 sentences)
- Success criteria (measurable checklist)
- Time horizon (target quarters)
- Work items table (initially empty or pre-populated if user specified existing WIs)
- Context (why this initiative exists)
- Scope boundaries (in/out of scope)

### Step 2.5: Create progress.yaml

Using template from `./_templates/initiative-progress.yaml`:

1. Set `initiative_id`, `title`, and `status: proposed`
2. Set `owner` if specified
3. Set `created` and `updated` timestamps (ISO-8601 UTC)
4. Set `target_start` and `target_end` quarters
5. Populate `work_items` array (empty initially, or with existing WI references)
6. Set `root_work_item` if the user designates one (null otherwise)

### Step 2.6: Register Existing Work Items (Optional)

If the user specified existing work items to include:

1. For each work item, add its `initiative_id` field in the work item's own `progress.yaml`
2. Add the work item reference to the initiative's `progress.yaml` work_items array
3. The work item's `initiative_id` back-pointer is the **source of truth** for membership

### Step 2.7: Present Initiative for Confirmation

Show the user:

```
Initiative: {IN-NNN} - {Title}
Location: {path}/IN-NNN-{name}/
Visibility: Shared / Private
Status: proposed

Goal: {From scope.md}

Time Horizon: {target_start} – {target_end}

Success Criteria:
  - {criterion 1}
  - {criterion 2}

Work Items: {count} registered ({list IDs or "none yet"})

Documents Created:
  ✓ scope.md
  ✓ progress.yaml

Ready to start creating work items? Use /start-work to create work items
and set initiative_id: {IN-NNN} in their progress.yaml.
```

---

## Important Rules

1. **Initiatives are lightweight**: No plan.md, deliverables, or locks
2. **Back-pointer is source of truth**: The `initiative_id` field in a work item's progress.yaml is the canonical indicator of initiative membership
3. **Initiative work_items array is a convenience cache**: Maintained by periodic sync or housekeeper conventions
4. **No initiative-level locking**: Concurrency control happens at the Work Item level
5. **Confirm before creating**: Get user approval before writing files
6. **Preserve user's words**: Record the strategic goal verbatim

---

## Examples

### Research Initiative

```
User: "Create an initiative to group all GIFS research work"

Phase 1 (Scoping):
- Goal: Group and track all research work items for the GIFS framework
- Time Horizon: 2025-Q3 – 2026-Q2
- Success Criteria: All research strands tracked, cross-RPM AUROC > 0.99
- Existing WIs: WI-028, WI-030, WI-031

Phase 2 (Creation):
- ID: IN-001
- Location: change/initiatives/IN-001-gifs-research/
- scope.md + progress.yaml created
- WI-028, WI-030, WI-031 linked via initiative_id
```

### Platform Initiative

```
User: "Start an initiative for the authentication overhaul"

Phase 1 (Scoping):
- Goal: Migrate from session-based to JWT authentication across all services
- Time Horizon: 2026-Q1 – 2026-Q2
- Success Criteria: All services migrated, zero auth-related incidents
- Existing WIs: none yet

Phase 2 (Creation):
- ID: IN-002
- Location: change/initiatives/IN-002-auth-overhaul/
- scope.md + progress.yaml created
- No WIs linked yet
```
