# Work Management Agent Rules

Component-specific rules for AI agents working with the work management system.

**Read this file before using:** `start-work.md`, `progress-work.md`, `pivot-work.md`, or `work-status.md`

## Activity Ownership Model

**One agent per activity.** This is the fundamental concurrency rule.

- **Activities** are the unit of work assignment - agents claim activities, not tasks
- **Tasks** are internal steps within an activity - worked sequentially by the activity owner
- **Lock files** (`locks/{activity_id}.lock`) represent activity ownership
- Task tracking in the lock file is for recovery/observability only, not for claiming

An agent that holds an activity lock works ALL agent-compatible tasks in that activity sequentially. Human tasks are marked `awaiting_human` for the Manual Tasks Report. No other agent may work any task in that activity until the lock is released or expires.

## Actor Assignment Model

Tasks and activities can specify who can perform them using the `actor` field:

| Actor Value | Agent Behaviour |
|-------------|-----------------|
| `agent` | Agent executes the task |
| `any` | Agent executes the task (default) |
| `human` | Agent marks `awaiting_human` and skips to next compatible task |

### Activity-Level Actor Rules

- **`actor: human` on activity**: Agents MUST NOT claim this activity
- **All tasks have `actor: human`**: Agents MUST NOT claim (inferred human-only)
- **Mixed actors**: Agents can claim, execute agent/any tasks, mark human tasks for report

### Parallel Human/Agent Execution

Agents and humans can work on different activities simultaneously:

1. Agent works on Activity A (documentation)
2. Human works on Activity B (portal configuration)
3. Activity C depends on both A and B
4. Whoever finishes their dependency last sees C become available

This parallelism accelerates work completion. Agents should:
- Generate Manual Tasks Reports to show humans what's needed
- Continue with other agent-compatible activities while humans work
- Check progress.yaml periodically to detect human task completion

## Worker ID Format

Workers (humans and agents) are identified by a unique ID in lock files and changelog entries.

| Worker Type | Format | Example |
|-------------|--------|---------|
| AI Agent | `agent-{session-or-random}` | `agent-abc123`, `agent-2026012410` |
| Human | `{name-or-username}` | `john.smith`, `jsmith` |

**For AI agents:** Generate a worker ID using one of these approaches:
- Use a session identifier from your environment if available
- Generate a timestamp-based ID: `agent-{YYYYMMDDHHMM}`
- Generate a short random string: `agent-{6-char-alphanumeric}`

The ID should be consistent within a session but unique across sessions to enable audit trails.

## Activity Lock Guarantees

**Once you hold an activity lock, you can trust the documented state for that activity.**

The locking model provides these guarantees:

1. **Exclusive ownership**: No other agent is working on your activity's tasks
2. **State accuracy**: The progress.yaml state for your activity reflects reality (because the previous holder updated it before releasing)
3. **No need to verify deliverables**: If progress.yaml shows a task as pending, it IS pending

**This guarantee depends on all agents following the writeback rule below.**

## Boundaries

### NEVER Do (Hard Rules)

These rules are absolute and must not be violated:

1. **NEVER overwrite an existing lock file when claiming**
   - This rule applies when attempting to claim an activity (another agent may hold the lock)
   - Use atomic create (fails if exists) or delete-then-create pattern for stale locks
   - **Exception**: You MAY update your own lock file while you hold it (e.g., to update `task_id`)

2. **NEVER assume or fabricate the current timestamp**
   - If you don't know the current time, you cannot determine if a lock is expired
   - Ask the user or use system commands to get the actual time
   - "I think it's probably evening" is not verification

3. **NEVER ignore "file modified since read" errors on lock files**
   - This error means another agent is ACTIVELY working
   - It is proof of concurrent activity, not a technical glitch
   - Do NOT re-read and retry - back off immediately

4. **NEVER claim an activity while another agent holds a valid lock**
   - Valid = lock file exists AND expires timestamp is in the future
   - If uncertain whether lock is valid, treat it as valid

5. **NEVER work on tasks without holding the activity lock first**
   - Even "quick fixes" or "just checking" require the lock
   - The lock is what prevents conflicts

6. **NEVER force-claim by deleting a non-expired lock**
   - Expired locks can be cleaned up; valid locks cannot
   - If you need urgent access, ask the user to intervene

7. **NEVER release an activity lock without updating progress.yaml first**
   - This is the most critical rule for system integrity
   - Before deleting your lock file, you MUST update progress.yaml to reflect:
     - All completed tasks marked as `status: completed`
     - Activity marked as `status: completed` (if all tasks done)
     - Version incremented
   - Releasing a lock without writeback corrupts state for the next agent
   - If your session ends unexpectedly, the lock expiry handles this - but intentional release requires writeback

8. **NEVER claim a human-only activity**
   - If `actor: human` on activity, skip it entirely
   - If ALL tasks have `actor: human`, skip the activity
   - Generate Manual Tasks Report instead of attempting work

9. **NEVER execute a task with `actor: human`**
   - Mark as `status: awaiting_human` instead
   - Document in notes what the human needs to do
   - Add to Manual Tasks Report

### ASK User First

Escalate to the user in these situations:

- Lock appears expired but the lock file was recently modified (suggests active agent with clock skew)
- All activities are locked or blocked and user hasn't specified preference
- Recovery would discard or conflict with another agent's partial work
- You're unsure whether a lock is genuinely abandoned vs. temporarily inactive
- Multiple activities are available and priorities are unclear

### ALWAYS Do

1. **Produce a deliverable for every completed activity**
   - Every activity should produce: a file created/modified, a decision documented, or both
   - Create deliverable documents in `deliverables/D{NN}-{name}.md`
   - Track file changes in the deliverable's `files_changed` array in progress.yaml
   - **For multi-task activities**: The deliverable captures the activity's outcome, not each individual task
   - **For analysis/review activities**: Document findings in the deliverable document

2. **Update progress.yaml immediately when completing work**
   - Mark each task `status: completed` as soon as it's done (don't batch)
   - Mark activity `status: completed` when all tasks are done
   - Reference deliverable in task's `deliverables` array
   - Update BEFORE releasing your activity lock
   - This is what makes the lock guarantee work for the next agent

3. **Read progress.yaml version before any modifications**
   - Note the version number
   - Re-read before writing to detect conflicts

4. **Verify lock expiry against actual current timestamp**
   - System time, not assumed time
   - When uncertain, treat lock as valid

5. **Use delete-then-atomic-create pattern for stale lock recovery**
   - Delete the expired lock file first
   - Then create your new lock
   - If create fails, another agent beat you - back off

6. **Log to changelog.log when multi-agent coordination is needed**
   - Changelog.log is optional but recommended for multi-agent scenarios
   - Append-only log is safe for concurrent writes
   - If changelog.log exists, append activity claim/release events

7. **Release locks promptly when blocked or finished**
   - Don't hold locks while waiting for user input
   - Don't hold locks while investigating blockers
   - Release and re-claim when ready to continue
   - **But always update progress.yaml before releasing**

8. **Check for alternative activities when blocked**
   - Multiple activities may have no dependencies
   - Parallel work is encouraged when possible

9. **Generate Manual Tasks Report when human tasks exist**
   - List tasks with `actor: human` or `status: awaiting_human`
   - Show what's available now vs blocked
   - Keep it brief - just tell humans what they can do

10. **Continue working while human tasks are pending**
    - Don't wait for human tasks if other agent-compatible work exists
    - Check for newly-unblocked activities after human completes tasks
    - Parallelism between humans and agents accelerates delivery

## Timestamp Verification

Before comparing timestamps to determine lock validity:

1. **Get current time from system** - not assumed, not fabricated
   - On Windows: `date /t` and `time /t` or PowerShell `Get-Date`
   - On Unix: `date -u +"%Y-%m-%dT%H:%M:%SZ"`
   - Or ask the user directly

2. **Parse lock expiry time** - ISO 8601 format in UTC

3. **Compare with appropriate margin**
   - Locks are typically UTC
   - Account for reasonable clock skew (few seconds, not hours)

4. **If uncertain, treat lock as valid** - false positives are safer than conflicts

## Recovery Protocol

Recovery (claiming an activity from an interrupted agent) applies ONLY when ALL of these conditions are met:

1. Lock file exists
2. Lock expiry timestamp is definitively in the past (verified, not assumed)
3. No file modifications detected during your verification
4. You successfully delete the old lock file
5. You successfully create a new lock file atomically

If ANY of these steps fail, another agent is likely active. **Back off immediately.**

### Recovery Steps

When legitimately recovering an abandoned activity:

1. **Verify completed work** - check that tasks marked complete actually produced outputs
2. **Identify resume point** - first task where `status != completed`
3. **Add recovery changelog entry** - document the recovery for audit trail
4. **Resume from incomplete task** - don't redo completed work unless verification failed

## Conflict Resolution

### When You Detect Concurrent Activity

If at any point you detect another agent is working (file modified, lock valid, etc.):

1. **STOP** your current claim attempt immediately
2. **Do NOT** re-read and retry
3. **Report** the conflict: "Activity X is being worked by another agent"
4. **Find alternatives** - check for unlocked activities with met dependencies
5. **If no alternatives**, report status to user and wait

### When Progress.yaml Version Conflicts

If version changed between your read and write:

1. Re-read progress.yaml
2. Check if your activity lock is still valid
3. If your lock is intact: merge changes carefully, increment version, retry write
4. If your lock was taken: back off, find alternative activity
5. If unclear: report to user

## Common Mistakes to Avoid

1. **Rushing to "help" by claiming work** - verify first, claim second
2. **Treating recovery as the default path** - recovery is exceptional, not normal
3. **Assuming clocks are synchronized** - they often aren't
4. **Ignoring concurrency signals** - "file modified" errors are information, not obstacles
5. **Holding locks during investigation** - release if you're not actively producing work
6. **Working tasks without activity lock** - even read-heavy tasks need the lock
7. **Releasing locks without updating progress.yaml** - this corrupts state for the next agent and breaks the lock guarantee
8. **Batching status updates** - update progress.yaml after EACH task completion, not at the end
9. **Attempting human tasks** - mark as `awaiting_human` and skip, don't try to do portal configuration or schedule meetings
10. **Waiting for humans instead of continuing** - if other agent work exists, keep working; parallelism helps
11. **Forgetting to generate Manual Tasks Report** - humans need to know what's waiting for them
12. **Claiming human-only activities** - check `actor` field before claiming; skip if all tasks are human

## See Also

- [progress-work.md](progress-work.md) - Full execution protocol
- [start-work.md](start-work.md) - Creating work items
- [limitations.md](limitations.md) - Scaling limits and constraints
- [README.md](README.md) - Core concepts and lifecycle
