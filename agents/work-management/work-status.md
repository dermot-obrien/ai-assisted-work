# Work Status

Check the status of all work items or a specific work item.

**See also:**
- [README.md](README.md) - Core concepts, ID conventions, lifecycle for work item management.
- [start-work.md](start-work.md) - Creating work items
- [progress-work.md](progress-work.md) - Executing work items
- [pivot-work.md](pivot-work.md) - Revising scope after work started

## Usage

```
/work-status              # All active work items
/work-status WI-NNN       # Specific work item details
```

## All Work Items View

Discover work items location and scan `{work-items-path}/WI-*/progress.yaml`. Display:

```
Work Item Status Overview
=========================

Active (3):
  WI-001: User Profile API
    Status: in_progress
    Activities: 2/3 complete (A3 in progress)
    Parallel: A2 available for another agent
    Last activity: 2h ago

  WI-002: Dashboard Redesign
    Status: planning
    Activities: 0/2 complete
    Parallel: A1, A2 both available (no dependencies)
    Last activity: 1d ago

  WI-003: Search Performance
    Status: blocked
    Blocker: "Need database credentials"
    Activities: 1/4 complete

Recently Completed (2):
  WI-000: Initial Setup (done, 3d ago)

Stale (no activity > 7 days):
  (none)

Commands:
  /progress-work WI-XXX   - Continue work on a work item
  /start-work "desc"      - Create new work item
```

## Single Work Item View

For `/work-status WI-001`:

```
Work Item: WI-001 - User Profile API
====================================

Status: in_progress
Created: 2026-01-20 10:00
Updated: 2026-01-23 14:30

Intent (from scope.md):
> Implement REST API endpoints for user profile management with validation

Activity Progress:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 66% (2/3 activities)

Activity Graph:
  ✓ A1 (Backend) ──┬──> → A3 (Integration Tests)
  ✓ A2 (Frontend) ─┘

Activities:
  ✓ WI-001-A1: Backend Changes (completed by agent-abc123)
      ✓ WI-001-A1-T1: Identify affected code paths
      ✓ WI-001-A1-T2: Implement truncation helper
      ✓ WI-001-A1-T3: Update service layer

  ✓ WI-001-A2: Frontend Changes (completed by agent-def456)
      ✓ WI-001-A2-T1: Add tooltip for full title
      ✓ WI-001-A2-T2: Update CSS for overflow

  → WI-001-A3: Integration Tests (in_progress, locked by agent-ghi789)
      ✓ WI-001-A3-T1: Add backend unit tests
      → WI-001-A3-T2: Add E2E tests (in progress)
      ○ WI-001-A3-T3: Update test documentation

Lock Status:
  WI-001-A3 locked by agent-ghi789 (expires in 45 min)

Recent Changelog:
  [2026-01-23 14:30] agent-ghi789: Completed WI-001-A3-T1, starting WI-001-A3-T2
  [2026-01-23 14:00] agent-def456: Completed activity WI-001-A2
  [2026-01-23 13:30] agent-abc123: Completed activity WI-001-A1
  [2026-01-23 13:00] agent-abc123: Started implementation

Blockers: None

Files Modified:
  - src/api/controllers/user_controller.py
  - src/api/services/user_service.py
  - src/web/components/UserProfile.tsx

Use /progress-work WI-001 to continue.
```

## Parallel Work Opportunities

When showing status, highlight parallel opportunities:

```
Parallel Work Opportunities:
  WI-002: A1 and A2 have no dependencies - 2 agents can work simultaneously
  WI-004: A1 in progress, A2 available now, A3 waiting on A1
```

## Activity Status Legend

```
✓  Completed
→  In progress (locked)
○  Pending (available if dependencies met)
⊕  Available for parallel work
✗  Blocked
```

## Status Definitions

| Status | Phase | Meaning |
|--------|-------|---------|
| `scoping` | 1 | Refining intent with user |
| `discovery` | 2 | Researching and gathering options |
| `planning` | 3 | Creating execution plan |
| `in_progress` | 4 | Implementation underway |
| `blocked` | - | Waiting on external input/resolution |
| `review` | 4 | Implementation complete, verification pending |
| `abandoned` | - | Work item cancelled or superseded |
| `done` | - | Work item shipped and verified |

## Activity Status Definitions

| Status | Meaning |
|--------|---------|
| `pending` | Not started, waiting for dependencies or agent |
| `in_progress` | Claimed by an agent, tasks being worked |
| `awaiting_human` | Agent completed all agent-compatible tasks, human tasks remain |
| `completed` | All tasks finished successfully |
| `blocked` | Cannot proceed (check blockers) |
| `skipped` | Intentionally not done (with reason) |

## Stale Work Item Detection

Work items are considered stale if:
- `updated` timestamp is more than 7 days ago
- Status is not `done`, `abandoned`, or `blocked`

Recommend:
- Review if still relevant
- Either resume or close with reason

## Lock Status Summary

When displaying status, show lock information:

```
Lock Summary:
  Active locks: 3
    - WI-001-A3: agent-ghi789 (agent, expires 45 min)
    - WI-004-A1: agent-xyz000 (agent, expires 20 min)
    - WI-005-A2: john.smith (human, expires 6h)
  
  Expired locks: 1
    - WI-003-A2: agent-old123 (expired 2h ago) ⚠️ Recovery needed
```

Expired locks indicate interruptions requiring recovery.

## Worker Types

| Type | Activity Lock | Task Lock | Notes |
|------|---------------|-----------|-------|
| Human | 8 hours | 4 hours | Longer to accommodate human work patterns |
| Agent | 1 hour | 30 min | Shorter due to session volatility |

Mixed teams can work the same work item - humans and agents can claim different activities simultaneously.
