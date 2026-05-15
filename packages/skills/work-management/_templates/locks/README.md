# Concurrency Files

This directory contains lock files for activities being worked on.

## Changelog Format (../changelog.log)

The changelog is a JSON Lines file (one JSON object per line). This format is append-only and safe for concurrent writes.

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `timestamp` | Yes | ISO-8601 timestamp |
| `worker` | Yes | Worker ID (human name or agent session ID) |
| `worker_type` | Yes | `"human"` or `"agent"` |
| `action` | Yes | What happened (see actions below) |
| `activity_id` | No | Related activity ID |
| `task_id` | No | Related task ID |
| `details` | No | Additional context |

**Common Actions:**

| Action | When Used |
|--------|-----------|
| `work_item_created` | Work item initialized |
| `claimed_activity` | Worker claimed an activity |
| `completed_task` | Task finished |
| `completed_activity` | All tasks in activity done |
| `blocked` | Blocker encountered |
| `unblocked` | Blocker resolved |
| `pivot_started` | Scope revision began |
| `pivot_completed` | Scope revision finished |
| `recovered_activity` | Resumed after interruption |

**Example:**
```json
{"timestamp":"2026-01-24T10:00:00Z","worker":"agent-abc123","worker_type":"agent","action":"claimed_activity","activity_id":"WI-001-A1","details":"Starting work"}
{"timestamp":"2026-01-24T10:30:00Z","worker":"agent-abc123","worker_type":"agent","action":"completed_task","activity_id":"WI-001-A1","task_id":"WI-001-A1-T1","details":"Implemented feature X"}
```

---

# Activity Lock Files

## Lock File Format

Each lock file is named after the activity: `{activity_id}.lock`

Example: `WI-001-A1.lock`

## Lock File Contents (JSON)

```json
{
  "holder": "agent-abc123",
  "holder_type": "agent",
  "acquired": "2026-01-24T10:00:00Z",
  "expires": "2026-01-24T11:00:00Z",
  "task_id": "WI-001-A1-T2",
  "task_acquired": "2026-01-24T10:30:00Z",
  "task_expires": "2026-01-24T11:00:00Z"
}
```

## Concurrency Protocol

### To Claim an Activity:

1. **Check for existing lock file**: `{activity_id}.lock`
2. **If exists and not expired**: Activity is taken, cannot claim
3. **If exists and expired**: Delete old lock, create new one
4. **If not exists**: Create lock file atomically

### Atomic Creation (Critical):

Use exclusive file creation to prevent race conditions. The approach depends on your available tools:

**Programming Languages:**
- Python: `open(path, 'x')` - fails if file exists
- Shell: `set -o noclobber; echo > file`

**AI Agent Tools (when true atomicity isn't available):**

If your tooling doesn't support atomic "create if not exists", use this pattern:
1. **Check existence first**: List the `locks/` directory to check if lock file exists
2. **Verify lock validity**: If exists, read and check if expired
3. **Create with immediate verification**: Write the lock file, then immediately re-read it
4. **Verify you hold the lock**: Confirm the content matches what you wrote (your worker ID)
5. **If mismatch**: Another agent won the race - back off immediately

This pattern isn't perfectly atomic but provides reasonable safety when combined with the "back off on any conflict signal" rule.

### To Release Lock:

Simply delete the lock file.

### To Check Lock Status:

Read the lock file contents. If `expires < now`, lock is stale.

## Lock Durations

| Worker Type | Activity Lock | Task Lock |
|-------------|---------------|-----------|
| Human | 8 hours | 4 hours |
| Agent | 1 hour | 30 minutes |

## Why Separate Lock Files?

1. **Reduced contention**: Claiming a lock doesn't modify progress.yaml
2. **Atomic operations**: File create/delete are atomic on most filesystems
3. **Parallel safety**: Each activity has its own lock file
4. **No lost updates**: Lock files don't contain historical data that could be lost

## Task Locks

Task locks are stored within the activity lock file (not separate files).
When a worker claims a task, they update their activity lock file.
This is safe because only one worker holds the activity lock at a time.
