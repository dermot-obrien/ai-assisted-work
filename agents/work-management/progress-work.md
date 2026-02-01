---
description: Progress Work - Execute a planned work item (Phase 4) or resume after interruption
globs:
alwaysApply: false
---

# Progress Work

Execute a work item that has completed the Scoping, Discovery, and Planning phases. This is Phase 4 (Execution) of the work item lifecycle. Use this to continue implementation or resume after an interruption.

## Quick Start (Essential Path)

For most single-agent work, follow this simple flow:

```
1. READ: Load scope.md, plan.md, progress.yaml
2. FIND: Find first activity where status=pending and depends_on are all completed
3. LOCK: Create locks/{activity_id}.lock with your worker ID
4. WORK: Complete tasks in order, updating progress.yaml after each task
5. DONE: Update activity status=completed, delete lock file
6. REPEAT: Go to step 2 until all activities complete
```

**The one critical rule:** Update progress.yaml BEFORE deleting your lock file. This ensures the next agent (or your next session) sees accurate state.

**See below for:** Concurrency handling, multi-agent coordination, recovery protocols.

---

**Prerequisites**: Work item must have `scope.md`, `plan.md`, and `progress.yaml` (status: `planning` or `in_progress`). `scope-ai.md` is recommended but optional.

**Interaction Style**: Write operations (full tool access for implementation).

This process works the same for humans and AI agents across all work types (development, architecture, consultancy).

**See also:**
- [README.md](README.md) - Core concepts, ID conventions, lifecycle for work item management
- [start-work.md](start-work.md) - Creating work items (Phases 1-3)
- [pivot-work.md](pivot-work.md) - Revising scope after work started
- [work-status.md](work-status.md) - Checking status
- [limitations.md](limitations.md) - Scaling limits

## Critical Rules (Read First)

**STOP conditions** - If any of these are true, DO NOT attempt to claim an activity:

1. **Lock file was modified since you read it** - Another agent is ACTIVELY working. This is not a recoverable error.
2. **Lock expiry time is in the future** - Lock is valid, activity is claimed by another agent.
3. **You cannot verify the current timestamp** - Cannot determine if lock expired. Do not guess or assume time.

**NEVER do these:**

- NEVER overwrite a lock file with Write/Edit - use atomic create only (or delete-then-create for recovery)
- NEVER assume or fabricate the current time - use system timestamp or ask the user
- NEVER treat "file modified since read" errors as recoverable when working with locks
- NEVER claim an activity when another agent may be active
- NEVER work on tasks without first holding the activity lock
- NEVER release an activity lock without first updating progress.yaml - this corrupts state for the next agent

**When in doubt:** Check for other available activities (no locks, dependencies met) instead of forcing a claim.

**Activity Lock Guarantee:** Once you hold an activity lock, you can trust the documented state. If progress.yaml shows a task as pending, it IS pending. This guarantee depends on all agents updating progress.yaml before releasing their locks.

**See also:** [AGENTS.md](AGENTS.md) for complete boundary rules.

## Key Concepts

- **Activities**: Logical groupings of sequential tasks. A worker claims an activity, not individual tasks.
- **Tasks**: Steps within an activity. Done in sequence, no external dependencies.
- **Activity Dependencies**: Activities can depend on other activities completing first.
- **Parallel Execution**: Multiple workers can work different activities simultaneously if no dependencies.
- **Recovery**: If a worker is interrupted, another can resume from the last incomplete task.
- **Workers**: Either humans or AI agents - the process is the same.
- **Actor Assignment**: Tasks can be assigned to `agent`, `human`, or `any` (default).
- **Human/Agent Parallelism**: Agents and humans can work in parallel on different activities, unblocking each other.

## File Structure (for Concurrency)

```
WI-001-feature-name/
├── scope.md          # [REQUIRED] Stakeholder-facing specification
├── plan.md           # [REQUIRED] Activities, tasks, dependencies
├── progress.yaml     # [REQUIRED] Source of truth - versioned for conflict detection
├── deliverables/     # [REQUIRED] Concrete outputs from activities
│   ├── D01-{name}.md     # Deliverable WI-001-D01
│   └── D02-{name}.md     # Deliverable WI-001-D02
├── locks/            # [REQUIRED] Lock files per activity - atomic create/delete
│   ├── WI-001-A1.lock
│   └── WI-001-A2.lock
├── scope-ai.md       # [RECOMMENDED] AI agent addendum (intent history, rationale)
├── changes.md        # [OPTIONAL] Files changed summary - generate from progress.yaml
├── changelog.log     # [OPTIONAL] Append-only event log - for multi-agent audit
├── research.md       # [OPTIONAL] Research findings
├── decisions.md      # [OPTIONAL] Options and decisions (legacy - prefer deliverables/)
└── notes.md          # [OPTIONAL] Session logs, ad-hoc findings
```

**Why this structure?**
- `progress.yaml`: **Source of truth** for all state - activities, tasks, deliverables, file changes
- `locks/`: Separate files reduce contention, atomic file operations
- `deliverables/`: Concrete outputs - every activity produces a deliverable
- `changelog.log`: Optional audit trail for multi-agent scenarios

**Scaling limits:** 2-5 workers recommended, max 10. See [limitations.md](limitations.md).

## Concurrency Protocol (Critical for Multi-Agent)

When multiple workers operate simultaneously, follow this protocol:

### Reading State

```
1. Read progress.yaml, note the `version` number
2. Read locks/*.lock to see which activities are claimed
3. Read changelog.log if needed for context
```

### Claiming an Activity (Lock Acquisition)

```
1. Check if locks/{activity_id}.lock exists
2. If exists:
   - Read its contents
   - If `expires > now`: Activity is taken, cannot claim
   - If `expires < now`: Lock is stale, delete it
3. Create locks/{activity_id}.lock atomically:
   - Use exclusive create (fails if file suddenly exists)
   - Write: holder, holder_type, acquired, expires
4. If create fails (race condition): Another worker claimed it, retry step 1
```

### Updating progress.yaml (Optimistic Locking)

```
1. Read progress.yaml, note `version` (e.g., version: 5)
2. Make your changes in memory
3. Re-read progress.yaml
4. If version changed (now version: 6):
   - CONFLICT: Another worker modified it
   - Merge their changes with yours, or abort and restart
5. If version same:
   - Increment version (version: 6)
   - Update last_modified and last_modified_by
   - Write file
```

### Appending to Changelog (Always Safe)

```
1. Format entry as single JSON line
2. Append to changelog.log
3. No need to read first - append is atomic
```

### Releasing Lock

**CRITICAL: Update progress.yaml BEFORE deleting the lock file.**

```
1. Update progress.yaml with completion status (MANDATORY)
2. Delete locks/{activity_id}.lock
```

Releasing a lock without updating progress.yaml first corrupts state for the next agent. See "ALWAYS Do" rule #7 in AGENTS.md.

## Lock Acquisition Decision Tree

Use this flowchart when attempting to claim an activity:

```
START: Want to claim activity X
  │
  ├─► Does locks/{X}.lock exist?
  │     │
  │     ├─► NO → Create lock file atomically, proceed to work
  │     │
  │     └─► YES → Read lock file, note contents
  │           │
  │           ├─► Is expires > current_time?
  │           │     │
  │           │     └─► YES → STOP. Lock valid. Find different activity.
  │           │
  │           └─► Is expires < current_time? (Lock appears expired)
  │                 │
  │                 ├─► Delete the old lock file
  │                 │     │
  │                 │     ├─► Delete succeeded → Create new lock atomically
  │                 │     │     │
  │                 │     │     ├─► Create succeeded → Proceed with recovery protocol
  │                 │     │     │
  │                 │     │     └─► Create failed → Another agent claimed it. STOP.
  │                 │     │
  │                 │     └─► Delete failed OR file changed → STOP. Agent is active.
  │                 │
  │                 └─► CRITICAL: If file changes at ANY point during this
  │                     process → STOP immediately. Another agent is working.
```

**Key principle:** Any file modification during your claim attempt means another agent is active. Back off immediately.

## Handling Concurrency Conflicts

### "File Modified Since Read" = STOP

If you receive this error when working with lock files or progress.yaml:

```
File has been modified since read
```

This means **another agent is actively working**. This is NOT a recoverable error for lock files.

**Required action:**

1. Do NOT re-read and retry the write
2. Report: "Activity {X} has an active agent. Cannot claim."
3. Check for other available activities (see below)
4. If no activities available, report status to user and wait

### Finding Alternative Work

When your target activity is unavailable:

1. List all activities from progress.yaml
2. Filter for activities where:
   - `status == "pending"` AND
   - No lock file exists in `locks/` AND
   - All `depends_on` activities have `status: completed`
3. Claim the first available activity
4. If none available, report to user:
   ```
   No activities currently available. Status:
   - {activity}: locked by {holder}
   - {activity}: blocked on {dependency}
   - {activity}: completed

   Use /work-status WI-XXX for details.
   ```

## Pre-Claim Checklist

Before claiming any activity, verify ALL of the following:

- [ ] I have read progress.yaml and noted the `version` number
- [ ] I have checked the `locks/` directory for existing lock files
- [ ] For my target activity: no valid lock exists OR lock is definitively expired (verified timestamp, not assumed)
- [ ] I can verify the current timestamp from the system (not guessing or fabricating)
- [ ] The activity's `depends_on` list contains only activities with `status: completed`
- [ ] I will use atomic file creation (not overwrite) for the lock file
- [ ] I understand: if I detect ANY file modifications during this process, I will STOP immediately

## Usage

```
/progress-work {WI-NNN}
```

Or without argument to list active work items and work on the most recent:

```
/progress-work
```

## Actor Assignment Model

Tasks and activities can specify who can perform them using the `actor` field:

| Actor Value | Who Can Perform | Examples |
|-------------|-----------------|----------|
| `agent` | AI agents only | Write documentation, analyse code, create diagrams |
| `human` | Humans only | Portal configuration, meetings, approvals, external system access |
| `any` | Either (default) | Review document, update file, research |

### Activity-Level Actor Inference

If an activity has `actor: human`, only humans can claim it. This is inferred automatically:

- **All tasks are `human`**: Activity is implicitly `human` - agents skip this activity
- **Any task is `agent` or `any`**: Agents can claim, but must handle human tasks specially
- **Explicit `actor` on activity**: Overrides inference

### Mixed Activities (Agent + Human Tasks)

When an agent claims an activity with mixed actor types:

1. **Agent tasks**: Execute normally
2. **Human tasks**: Mark as `status: awaiting_human` and continue to next task if possible
3. **Blocked by human task**: If a human task blocks subsequent agent tasks (sequential dependency), the agent marks itself blocked and reports

**Example workflow:**
```
Activity A1:
  T1: Write analysis (agent) → Agent completes
  T2: Schedule stakeholder meeting (human) → Agent marks "awaiting_human"
  T3: Document meeting outcomes (human) → Agent marks "awaiting_human"
  T4: Update documentation with findings (agent) → Agent marks "blocked" (depends on T3)
```

The agent completes T1, marks T2 and T3 as `awaiting_human`, notes that T4 is blocked on T3, and generates the manual tasks report.

### Human Tasks Unblocking Agents

When a human completes their tasks:
1. Human marks task as `completed` in progress.yaml
2. Agent can detect this on next progress check
3. Agent resumes from the next incomplete task it can perform

This enables **parallel human/agent execution** where humans and agents work on different activities simultaneously, each unblocking the other.

## Manual Tasks Report

When human tasks exist, generate a simple report listing what humans need to do.

### When to Generate

- When first loading a work item with human tasks
- When you complete work but human tasks remain
- When explicitly requested

### Simple Format

```
Human Tasks Needed for WI-002:

Available now:
- WI-002-A4-T3: Configure production environment variables
- WI-002-A4-T4: Set up monitoring dashboard

Blocked (waiting on other work):
- WI-002-A8-T1: Execute load test scenarios (needs A4 complete)
- WI-002-A7-T2: Conduct stakeholder review (needs A6, A8 complete)

Next: Complete environment configuration to unblock validation.
```

Keep it brief. The goal is to tell humans what they can do now and what's blocking other work.

## Process

### Step 0: First-Time Setup (if status is `planning`)

If this is the first time executing the work item (status is `planning`), complete setup before claiming activities:

**0a. Check JIRA ticket (optional)**

Check if `artifacts.jira` in progress.yaml contains a JIRA URL:
- If JIRA integration is required by your organization, ask user to create a ticket manually
- Record the JIRA URL in `artifacts.jira` if provided
- JIRA integration is optional - proceed without a ticket if the user prefers to skip it

**0b. Create work item branch**

If `artifacts.branch` is null:

```bash
git checkout -b wi/WI-{NNN}-{kebab-name}
```

Update `artifacts.branch` in progress.yaml with the branch name.

**0c. Initialize changes.md**

Create `changes.md` from template if it doesn't exist. This file tracks all workspace changes for the release changelog.

**0d. Update status to `in_progress`**

Update work item status from `planning` to `in_progress` in progress.yaml.

---

### Step 1: Load Work Item Context

1. **Discover work item location** - search for `WI-{NNN}-*/` in:
   - `00-change/work-items/` (preferred)
   - `work-items/` (root)
   - `docs/3-work/work-items/` (legacy)
   - Any `**/work-items/` subfolder
2. Read `{work-item-path}/progress.yaml` to see current state (source of truth)
3. Read `{work-item-path}/scope.md` to understand the stakeholder-facing requirements
4. Read `{work-item-path}/scope-ai.md` to understand intent formation, decision rationale, and agent instructions
5. Read `{work-item-path}/plan.md` to understand the approach and activities
6. Read `{work-item-path}/notes.md` if it exists (for session history and findings)
7. Read `{work-item-path}/changes.md` if it exists (to see what's already been changed)
7. Check if there's an `agents.md` file for work-item-specific guidance

**Important**: Both `scope.md` AND `scope-ai.md` should be read. The AI addendum contains critical context about WHY decisions were made and specific instructions for agents working on this item.

### Step 2: Find Available Activity

1. Read `progress.yaml` and note the `version` number
2. Check `locks/` directory for existing lock files
3. Find an activity where:
   - **Not locked**: No `locks/{activity_id}.lock` exists, OR lock file exists but `expires < now`
   - **Status is claimable**: `status == "pending"` in progress.yaml
   - **Dependencies met**: All activities in `depends_on` have `status == "completed"`
   - **Not blocked**: Activity not in `blockers` array (or blocker resolved)
   - **Actor compatible**: Activity `actor != "human"` (agents skip human-only activities)

**Actor filtering for agents:**
- Skip activities where `actor: human`
- Skip activities where ALL tasks have `actor: human` (inferred human activity)
- Claim activities with `actor: agent`, `actor: any`, or mixed agent/human tasks

If no activities are available:
- If all activities are `completed`, the work item may be done
- If activities are blocked on dependencies, report status and wait
- If activities are locked by other workers, report and let user decide
- If remaining activities are `human`-only, generate Manual Tasks Report and notify user

### Step 3: Claim the Activity

**Step 3a: Create lock file (atomic)**

Create `locks/{activity_id}.lock` with exclusive create:

```json
{
  "holder": "{your-id}",
  "holder_type": "agent",
  "acquired": "2026-01-24T10:00:00Z",
  "expires": "2026-01-24T11:00:00Z",
  "task_id": null,
  "task_acquired": null,
  "task_expires": null
}
```

If file creation fails (another worker claimed it), go back to Step 2.

**Step 3b: Update progress.yaml (with version check)**

1. Re-read progress.yaml, verify version hasn't changed
2. If version changed: Re-evaluate, your chosen activity may no longer be available
3. If version same:

```yaml
version: 2  # Increment from 1
last_modified: "2026-01-24T10:00:00Z"
last_modified_by: "{your-id}"

activities:
  - id: WI-001-A1
    status: in_progress  # Changed from pending
    # ... rest unchanged
```

**Step 3c: Append to changelog.log**

```
{"timestamp":"2026-01-24T10:00:00Z","worker":"{your-id}","worker_type":"agent","action":"claimed_activity","activity_id":"WI-001-A1","details":"Starting work"}
```

Update work item `status: in_progress` if it was `planning`.

### Step 4: Work Through Tasks Sequentially

For each task in the activity (in order):

**Step 4a: Check task actor**

Before starting a task, check its `actor` field:

| Task Actor | Agent Action |
|------------|--------------|
| `agent` | Execute the task normally |
| `any` | Execute the task normally |
| `human` | Mark as `awaiting_human` and handle (see below) |

**Handling human tasks:**

1. Mark the task `status: awaiting_human` in progress.yaml
2. Add note: "Awaiting human action - see Manual Tasks Report"
3. Check if next task can proceed:
   - If next task is `agent` or `any` AND doesn't depend on human task output: Continue
   - If next task depends on human task output: Mark activity as `blocked`, generate report, release lock
4. Append to changelog: `{"action":"awaiting_human","task_id":"..."}`

**Step 4b: Update lock file with current task**
   
Update `locks/{activity_id}.lock`:
```json
{
  "holder": "{your-id}",
  "holder_type": "agent",
  "acquired": "2026-01-24T10:00:00Z",
  "expires": "2026-01-24T11:00:00Z",
  "task_id": "WI-001-A1-T1",
  "task_acquired": "2026-01-24T10:15:00Z",
  "task_expires": "2026-01-24T10:45:00Z"
}
```

**Step 4c: Do the work**
- Read task details from plan.md
- Check the deliverable document referenced in plan.md (if exists)
- Check agents.md for component-specific instructions (if applicable)
- Complete the work appropriate to the task type
- **Produce a deliverable** (see Deliverables Rule below)

**Deliverables Rule: Every completed activity should produce a deliverable:**

1. **A file created or modified** - tracked in progress.yaml deliverables section
2. **A decision documented** - in deliverables/D{NN}-{name}.md
3. **Both**

Deliverables are tracked at the activity level, not individual tasks. Update the activity's deliverable document as you complete tasks.

**Step 4d: Update deliverable document** (if creating/updating a deliverable)

Create or update `deliverables/D{NN}-{name}.md`:
- Include decision summary, context, options considered
- List files created/modified
- Add verification checklist

**Step 4e: Update deliverable document** (as you complete tasks)

Update the activity's deliverable document with progress:
- Add findings, decisions, or outputs as you complete tasks
- Track files created/modified in the deliverable's verification section
- This builds the deliverable incrementally rather than all at once

**Step 4f: Mark task complete in progress.yaml** (with version check)

```
1. Re-read progress.yaml, check version
2. If version changed: Verify your activity lock is still valid
3. Increment version and update task:
```

```yaml
version: 3  # Increment
last_modified: "2026-01-24T10:30:00Z"
last_modified_by: "{your-id}"

tasks:
  - id: WI-001-A1-T1
    status: completed
    actor: agent
    completed_by: "{your-id}"
    completed_at: "2026-01-24T10:30:00Z"
    notes: "Brief description of what was done"
    deliverables: ["deliverables/D01-{name}.md"]  # Reference to deliverable
```

**Step 4g: Append to changelog.log**
```
{"timestamp":"2026-01-24T10:30:00Z","worker":"{your-id}","worker_type":"agent","action":"completed_task","activity_id":"WI-001-A1","task_id":"WI-001-A1-T1","details":"Implemented feature X","deliverable":"WI-001-D01"}
```

**Step 4h: Continue to next task**

### Step 5: Complete the Activity

After all tasks in the activity are done:

**CRITICAL: The order of these steps matters. You MUST update progress.yaml BEFORE releasing the lock.**

**Step 5a: Update progress.yaml** (with version check) - **MANDATORY BEFORE LOCK RELEASE**:

```yaml
version: 4  # Increment
last_modified: "2026-01-24T11:00:00Z"
last_modified_by: "{your-id}"

activities:
  - id: WI-001-A1
    status: completed
    completed_by: "{your-id}"
    completed_at: "2026-01-24T11:00:00Z"
```

**Why this must happen before Step 5b:**
- The lock guarantees exclusive access to this activity
- Updating progress.yaml while holding the lock ensures the next agent sees accurate state
- If you release the lock first, another agent may claim the activity and find stale state
- Skipping this step corrupts the system for subsequent agents

**Step 5b: Delete lock file** (only after 5a succeeds):

Delete `locks/WI-001-A1.lock` to release the activity.

**Step 5c: Append to changelog.log**:

```
{"timestamp":"2026-01-24T11:00:00Z","worker":"{your-id}","worker_type":"agent","action":"completed_activity","activity_id":"WI-001-A1","details":"All tasks complete"}
```

Check if other activities are now unblocked (their dependencies are now met).

### Step 6: Continue or Finish

- If more activities are available (dependencies met, not locked), claim the next one
- If all activities are complete, update work item `status: review`
- If remaining activities are blocked on dependencies being worked by other workers, you're done for now

## Reporting Status

Before starting work, present a summary:

```
Work Item: WI-003 - System Architecture Review
Type: architecture
Status: in_progress

Activities:
  ✓ WI-003-A1: Document Current State (completed)
  → WI-003-A2: Evaluate Options (in_progress, 2/4 tasks done) [YOU]
  ○ WI-003-A3: Create Diagrams (pending, depends on WI-003-A2)
  ○ WI-003-A4: Write Recommendations (pending, depends on WI-003-A2, WI-003-A3)
  ⊕ WI-003-A5: Stakeholder Presentation (pending, no dependencies) [AVAILABLE]

Your Progress in WI-003-A2:
  ✓ WI-003-A2-T1: Research cloud providers
  ✓ WI-003-A2-T2: Compare pricing models
  → WI-003-A2-T3: Assess technical fit
  ○ WI-003-A2-T4: Document trade-offs

Ready to continue with WI-003-A2-T3?
```

Legend: ✓ completed, → in progress, ○ pending, ⊕ available for parallel work, ⌛ awaiting human

When human tasks are pending, include the Manual Tasks Report (see above).

## Listing Active Work Items

If run without argument:

1. Discover work items location and scan `{work-items-path}/WI-*/progress.yaml`
2. Filter for `status` not equal to "done"
3. Display list with activity status:

```
Active Work Items:
  WI-001: API Implementation (development)
    Status: in_progress
    Activities: 2/3 complete, 1 in progress
    
  WI-002: Architecture Review (architecture)
    Status: planning
    Activities: 0/2 complete, 2 available
    
  WI-003: Gap Analysis (consultancy)
    Status: blocked
    Activities: 1/4 complete, blocked on B1

Use /progress-work WI-XXX to continue work.
```

## Resuming After Human Task Completion

When a human completes their tasks (marked `awaiting_human` → `completed`):

1. **Detect the change**: Read progress.yaml and check for completed human tasks
2. **Find unblocked work**: Tasks that were waiting on human tasks may now be available
3. **Reclaim the activity**: If the activity lock expired, acquire a new lock
4. **Resume from next incomplete task**: Continue the task sequence from where you left off

**Example flow:**
```
1. Agent claims A1, completes T1 (agent), marks T2 (human) as awaiting_human
2. Agent cannot proceed (T3 depends on T2 output), releases lock, generates report
3. Human completes T2, marks it completed in progress.yaml
4. Agent detects T2 completed, claims A1 lock, resumes from T3
```

**Periodic check recommendation:** If human tasks are blocking your work, check progress.yaml periodically (or ask user to notify you) to detect when humans complete their tasks.

## Recovery After Interruption

If you're resuming work where a previous worker was interrupted:

1. **Find the abandoned activity**: Look for `status: in_progress` with `lock.expires < now`

2. **Review what was done**:
   - Check completed tasks (don't redo them)
   - Check task with `status: in_progress` - may need verification
   - Read changelog for context
   - Check deliverables list for outputs already produced

3. **Claim the activity**: Set new lock with your ID

4. **Verify completed work**: Quick sanity check that completed tasks actually produced valid outputs

5. **Resume from incomplete task**: First task where `status != completed`

6. **Add recovery changelog entry**:
   ```yaml
   - timestamp: "{ISO-timestamp}"
     worker: "{your-id}"
     action: "Resumed activity WI-003-A2 after interruption"
     details: "Previous lock expired. WI-003-A2-T1 and WI-003-A2-T2 verified complete. Resuming from WI-003-A2-T3."
   ```

## Activity States

- **pending**: Not started, waiting for dependencies or available agent
- **in_progress**: Claimed by an agent, tasks being worked
- **awaiting_human**: Agent completed all agent-compatible tasks, but human tasks remain
- **completed**: All tasks finished successfully
- **blocked**: Cannot proceed (check blockers array)
- **skipped**: Intentionally not done (with reason in notes)

## Task States

- **pending**: Not started yet
- **in_progress**: Currently being worked (locked)
- **completed**: Finished successfully
- **blocked**: Cannot proceed within this activity
- **skipped**: Intentionally not done (with reason)
- **awaiting_human**: Task requires human action (agent has flagged it for the Manual Tasks Report)

## Handling Blockers

If you encounter a blocker:

1. Update task and activity status to `blocked`
2. Add entry to `blockers` array:
   ```yaml
   blockers:
     - id: WI-003-B1  # Format: {work_item_id}-B{N}
       activity_id: WI-003-A2
       task_id: WI-003-A2-T3
       description: "Need database credentials for integration test"
       raised_at: "{ISO-timestamp}"
       raised_by: "{your-id}"
       resolved_at: null
       resolution: null
   ```
3. Release your lock (other activities may be workable)
4. Add changelog entry
5. Report to user

## Parallel Execution

When a plan has independent activities (no dependencies between them):

```yaml
activities:
  - id: WI-005-A1
    title: "Research Phase"
    depends_on: []      # No dependencies
    
  - id: WI-005-A2
    title: "Stakeholder Interviews"
    depends_on: []      # No dependencies
    
  - id: WI-005-A3
    title: "Synthesis and Recommendations"
    depends_on: ["WI-005-A1", "WI-005-A2"]  # Needs both complete
```

- Worker 1 (human or agent) can claim WI-005-A1
- Worker 2 (human or agent) can claim WI-005-A2 simultaneously
- WI-005-A3 waits until both WI-005-A1 and WI-005-A2 complete
- Any worker that finishes first can claim WI-005-A3

## Work Type Specifics

### Development Work
- Git branch: `wi/WI-{NNN}-{kebab-name}` (created in Step 0)
- Update `artifacts.branch` in progress.yaml
- Commit after each task or logical group
- Use conventional commits: `feat(WI-001): {activity}.{task} - {description}`
- Update `artifacts.pr` when PR is created
- Update changes.md with all file changes

### Architecture Work
- Store diagrams in `artifacts.diagrams`
- Record decisions in decisions.md or ADRs
- Link specifications to tasks
- Update changes.md with all document changes

### Consultancy Work
- Track research in `artifacts.research`
- List final deliverables in `artifacts.deliverables`
- Note interview findings in notes.md
- Update changes.md with all document changes

---

## Workflow-Specific Activities

Some activities have specialized workflows with their own instructions and state tracking. These workflows are initiated by dedicated commands but **always resumed via `/progress-work`**.

### Detecting Workflow Activities

Check for `workflow` and `workflow_state` fields on the activity:

```yaml
- id: WI-006-A18
  title: "ASCII Diagram Replacement"
  status: in_progress
  workflow: "image-management/replace-ascii-diagrams"   # Workflow reference
  workflow_state: "diagram-progress.yaml"               # Per-item state file
  actor: any
  depends_on: []
```

### Loading Workflow Instructions

When an activity has a `workflow` field:

1. **Load workflow agent rules**: Read `.agents/{workflow-path}/AGENTS.md`
2. **Load workflow documentation**: Read `.agents/{workflow-path}.md` (the workflow doc)
3. **Load workflow state**: Read `{work-item-path}/{workflow_state}` for detailed progress
4. **Follow workflow-specific resume protocol** defined in the workflow documentation

### Workflow Resume Protocol

When resuming a workflow-specific activity:

```
1. Read progress.yaml → Find activity with workflow field
2. Read .agents/{workflow}/AGENTS.md → Load agent rules
3. Read {workflow_state} file → Get per-item progress (e.g., per-diagram status)
4. Verify outputs exist → Check files referenced in state
5. Resume from next incomplete item → As defined by workflow state
```

### Supported Workflows

| Workflow | State File | Resume Logic | Start Command |
|----------|------------|--------------|---------------|
| `image-management/replace-ascii-diagrams` | `diagram-progress.yaml` | Resume from first diagram not at target phase status | `/replace-ascii-diagrams` |

### Workflow vs Standard Activities

| Aspect | Standard Activity | Workflow Activity |
|--------|-------------------|-------------------|
| State tracking | `progress.yaml` tasks only | `progress.yaml` + workflow state file |
| Resume granularity | Task level | Sub-task level (e.g., per-diagram) |
| Instructions | Generic progress-work | Workflow-specific AGENTS.md |
| Start command | `/start-work` or manual | Dedicated command (e.g., `/replace-ascii-diagrams`) |
| Resume command | `/progress-work` | `/progress-work` (same!) |

### Example: Diagram Replacement Workflow

When `/progress-work WI-006` encounters activity A18 with `workflow: "image-management/replace-ascii-diagrams"`:

1. **Load agent rules**: Read `.agents/image-management/AGENTS.md`
2. **Load workflow doc**: Read `.agents/image-management/replace-ascii-diagrams.md`
3. **Load state**: Read `diagram-progress.yaml` from work item folder
4. **Find resume point**: First diagram where `status` doesn't match current task's target
5. **Execute**: Follow workflow's phase-specific instructions

```yaml
# diagram-progress.yaml example
metadata:
  activity_id: WI-006-A18
  total_diagrams: 26
  completed: 12

diagrams:
  - id: D001
    status: replaced       # Done
  - id: D012
    status: png_generated  # Current task is T3 (verification), this is ready
  - id: D013
    status: png_pending    # Resume from here if task is T2 (generation)
```

### Creating Workflow Activities

Workflow activities are created by their dedicated start commands, NOT manually:

- `/replace-ascii-diagrams` → Creates activity with `workflow: "image-management/replace-ascii-diagrams"`
- Future workflows follow same pattern

The start command:
1. Performs workflow-specific discovery/setup
2. Creates activity with `workflow` and `workflow_state` fields
3. Creates the workflow state file (e.g., `diagram-progress.yaml`)
4. Begins execution (which can later be resumed via `/progress-work`)

---

## Important Rules

1. **Claim activity before working** - Never work tasks without holding the activity lock
2. **Update progress.yaml BEFORE releasing locks** - This is critical for system integrity; the next agent trusts the state you leave behind
3. **Update progress immediately** - Mark each task complete as you go, don't batch updates to the end
4. **Track task progress in lock file** - Update `task_id` in your lock so recovery knows where you stopped
5. **Respect existing locks** - Don't override unless expired
6. **Check dependencies** - Never start activity until all prerequisites complete
7. **Verify on recovery** - When resuming, verify completed work still valid
8. **Release locks on blockers** - Don't hold activity if you can't progress
9. **Track deliverables** - Record outputs in progress.yaml deliverables section

## Lock Durations

| Worker Type | Activity Lock | Task Lock |
|-------------|---------------|-----------|
| Human | 8 hours | 4 hours |
| AI Agent | 1 hour | 30 minutes |

Shorter agent locks account for session volatility. Longer human locks accommodate human work patterns.

## Scaling Limits

**Recommended: 2-5 workers per work item, maximum 10.** See [limitations.md](limitations.md) for details.

## Notes

- progress.yaml is the source of truth for all state
- Activities are the unit of work assignment; tasks are internal steps
- Multiple workers (human and/or agent) can work a work item if activities are independent
- Plan creator is responsible for structuring activities to enable parallelism
- Always read full context (scope, plan, progress) before starting
- The same process works regardless of work type or worker type

## Error Handling

### Missing Required Files

| Missing File | Action |
|--------------|--------|
| `progress.yaml` | Stop. Run `/start-work` to create work item properly. |
| `scope.md` | Stop. Work item incomplete - scoping phase not finished. |
| `scope-ai.md` | Proceed normally. This file is optional. Rely on `scope.md` for requirements. Ask user if anything is unclear. |
| `plan.md` | Stop. Work item in discovery phase - complete planning first. |

Report to user:
```
Cannot proceed with WI-XXX: Missing required file {filename}.
Work item appears to be incomplete. Run /start-work to create properly.
```

### Malformed progress.yaml

If YAML parsing fails:

1. Report the parse error to user
2. Suggest checking for syntax issues (indentation, quotes, colons)
3. If user approves, attempt to reconstruct from `plan.md`

### Older Work Items (Backward Compatibility)

Work items created before schema updates may have different formats. Apply these defaults:

| Missing Field | Default Value | Notes |
|---------------|---------------|-------|
| `activity.actor` | `any` | Assume any worker can do it |
| `task.actor` | `any` | Same |
| `deliverable.id` | Generate from position | e.g., `D01` for first deliverable |
| `deliverable.files_changed` | `[]` | Old format didn't track this |
| `artifacts.scope_ai` | `null` | Now optional |
| `artifacts.changes` | `null` | Now optional |
| `schema_version` | `1` | Implicit v1 if missing |

**Compatibility Principles:**

1. **Read Anywhere**: Accept any version of progress.yaml - use defaults for missing fields
2. **Write Forward**: When updating, add new fields but preserve existing structure
3. **Don't Force Migration**: Don't rewrite entire file to new schema unless explicitly requested
4. **Preserve Comments**: Keep existing comments and structure when possible

**Example - Loading WI-001 (older format):**
```yaml
# Old format - no actor field
tasks:
  - id: WI-001-A1-T1
    title: "Review existing capabilities"
    status: completed
    completed_by: "claude-opus-agent"
    # No 'actor' field - default to 'any'
```

When you read this, treat `actor` as `any`. When updating, you may add `actor: any` explicitly but don't restructure the entire file.

### Lock Acquisition Failure

If lock file creation fails (another worker claimed it):

```
Activity WI-001-A2 was just claimed by another worker.
Checking for other available activities...

[If found]: Claiming WI-001-A3 instead.
[If none]:  No activities currently available. All are either:
            - Locked by other workers
            - Blocked on dependencies
            Use /work-status WI-001 for details.
```

### Version Conflict During Update

If version changed between read and write:

1. Re-read `progress.yaml`
2. Check if your activity is still valid (not claimed by another)
3. If compatible: merge changes, increment version, retry
4. If conflicting: report to user

```
Version conflict detected in progress.yaml.
Another worker modified the file. Re-reading and retrying...
[Success]: Changes merged, continuing.
[Failure]: Conflicting changes detected. Please review:
           - Your change: {description}
           - Their change: {description}
```

### Stale Lock Recovery

When encountering an expired lock:

```
Found expired lock on WI-001-A2:
  Holder: agent-xyz123
  Expired: 2 hours ago
  Last task: WI-001-A2-T3 (in_progress)

Claiming activity for recovery...
Verifying completed tasks...
  WI-001-A2-T1: verified complete
  WI-001-A2-T2: verified complete
  WI-001-A2-T3: incomplete - resuming from here
```

### Activity Blocked

If all available activities are blocked:

```
WI-001 Status: Blocked

All remaining activities have unresolved blockers:
  WI-001-A3: Blocked by WI-001-B1 - "Need API credentials"
  WI-001-A4: Depends on WI-001-A3 (blocked)

Blockers require user action. Use /work-status WI-001 for details.
```
