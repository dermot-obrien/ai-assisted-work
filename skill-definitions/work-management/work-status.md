# Work Status

Check the status of all work items or a specific work item.

**See also:**
- [README.md](README.md) - Core concepts, ID conventions, lifecycle for work item management.
- [start-work.md](start-work.md) - Creating work items
- [progress-work.md](progress-work.md) - Executing work items

## Usage

```
/work-status              # All active work items (optionally grouped by initiative)
/work-status WI-NNN       # Specific work item details
/work-status IN-NNN       # Initiative-level view with all member work items
```

## All Work Items View

**Discovery (must include symlinks):**

1. **Locate work item roots** at any level in the workspace:
   - Every `work-items/` directory (real directory or symlink target).
   - Every `work-items-private/` directory (real directory or symlink target).
2. **Explicitly follow symlinks:** `work-items` and `work-items-private` are often symlinks (Unix) or junctions (Windows). Normal directory recursion may skip them. You MUST discover and scan symlinked / junctioned paths as well as real directories—e.g. list reparse points (Windows) or resolve symlinks (Unix) when enumerating roots, then scan inside those paths for `WI-*/progress.yaml` and `WIP-*/progress.yaml`.
3. **Scan** each discovered root for `WI-*/progress.yaml` and `WIP-*/progress.yaml`.
4. **Group by initiative** (optional): Work items with an `initiative_id` field in their progress.yaml can be shown under their initiative heading. Standalone work items (no `initiative_id`) appear ungrouped.
5. **Display** a simple list with status indicators:

```
Work Items
==========
  ✓ WI-000: Initial Setup (done)
  → WI-001: User Profile API (in_progress)
  → WI-002: Dashboard Redesign (planning)
  → WI-003: Search Performance (blocked)
  
```

Legend: `→` active, `✓` complete.

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

## Initiative View

For `/work-status IN-001`:

**Discovery:**

1. **Locate initiative roots** at any level in the workspace:
   - Every `initiatives/` directory (real directory or symlink target).
   - Every `initiatives-private/` directory (real directory or symlink target).
2. **Explicitly follow symlinks:** Same rules as work item discovery.
3. **Scan** each discovered root for `IN-*/progress.yaml` and `INP-*/progress.yaml`.

**Display:**

```
Initiative: IN-001 - GIFS Research
====================================

Status: active
Goal: Group and track all GIFS framework research
Time Horizon: 2025-Q3 – 2026-Q2
Root Work Item: WI-032

Work Items:
  ✓ WI-028: GIFS Blog & ArXiv (done)
  → WI-030: Python Hazard Benchmarks (in_progress)
  → WI-031: Transformer Markov Integration (in_progress)
  → WI-032: Research Root - GIFS (in_progress)
  ○ WI-033: Research H-200 Forecasting (planning)

Progress: 1/5 work items done (20%)
```

**All initiatives view** (no argument): When displaying all work items, optionally show a summary of active initiatives at the top:

```
Initiatives
===========
  → IN-001: GIFS Research (active, 5 WIs)

Work Items
==========
  IN-001:
    ✓ WI-028: GIFS Blog & ArXiv (done)
    → WI-030: Python Hazard Benchmarks (in_progress)

  Standalone:
    → WI-015: Platform Auth Overhaul (in_progress)
```
