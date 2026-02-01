# Activity Locks

This folder contains lock files for activities currently being worked on.

## Lock File Format

Lock files are named `{activity_id}.lock` (e.g., `WI-001-A1.lock`) and contain:

```json
{
  "holder": "agent-session-id",
  "holder_type": "agent",
  "acquired": "2026-02-01T12:00:00Z",
  "expires": "2026-02-01T13:00:00Z",
  "task_id": "WI-001-A1-T1",
  "task_acquired": "2026-02-01T12:00:00Z",
  "task_expires": "2026-02-01T12:30:00Z"
}
```

## Lock Durations

| Worker Type | Activity Lock | Task Lock |
|-------------|---------------|-----------|
| Agent | 1 hour | 30 minutes |
| Human | 8 hours | 4 hours |

## Protocol

1. **Claim**: Create lock file atomically (fails if exists)
2. **Work**: Complete tasks, update progress.yaml after each
3. **Release**: Delete lock file after updating progress.yaml

See `agents/work-management/AGENTS.md` for full protocol.
