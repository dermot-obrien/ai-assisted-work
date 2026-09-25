---
name: aaw-work-status
description: Report the status of AAW work items and initiatives, showing activity progress, product states, the activity graph, lock and recovery state, parallel work opportunities and stale items. Use when asked for work status, what is in flight, how a WI or initiative is tracking, what is blocked or stale, what can be worked in parallel, or for a progress summary across work items.
license: CC-BY-4.0
compatibility: Reads .aaw-config.yaml at the workspace root for work_items_path and initiatives_path. No runtime dependencies.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "2.1.0"
---

# Work Status

Read-only. This skill reports; it never writes to `progress.yaml`, never claims an activity
and never clears a lock.

## Arguments

| Argument | View |
|----------|------|
| none | All active work items, optionally grouped by initiative |
| `WI-NNN` | One work item in detail |
| `IN-NNN` | One initiative with its member work items |

## All work items

1. Read `work_items_path` from `.aaw-config.yaml` at the workspace root.
2. Scan for `WI-*/progress.yaml`.
3. Group by `initiative_id` where present; work items without one appear under Standalone.
   Where a work item has a `parent_work_item_id`, nest it under its workstream.

```
Initiatives
===========
  → IN-001: GIFS Research (active, 5 WIs)

Work Items
==========
  IN-001:
    → WI-027: Benchmark Programme (workstream)
        ✓ WI-028: GIFS Blog & ArXiv (epic, done)
        → WI-030: Python Hazard Benchmarks (epic, in_progress)

  Standalone:
    → WI-015: Platform Auth Overhaul (epic, in_progress)
```

Legend: `→` active, `✓` complete, `○` pending, `✗` blocked.

## One work item

```
Work Item: WI-001 - User Profile API
====================================

Level:   epic (parent: WI-027 Benchmark Programme)
Status:  in_progress
Period:  Q1-FY27
Created: 2026-01-20 10:00
Updated: 2026-01-23 14:30

Intent (from scope.md):
> Implement REST API endpoints for user profile management with validation

Products:
  ✓ WI-001-D1: Profile API specification      accepted
  → WI-001-D2: Running endpoints              in_review    (needs D1)
  ○ WI-001-D3: Integration test suite         planned      (needs D2)

Definition of done: every product accepted. 1 of 3 accepted.

Activity Progress:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 66% (2/3 activities)

Activity Graph:
  ✓ A1 (Backend) ──┬──> → A3 (Integration Tests)
  ✓ A2 (Frontend) ─┘

Activities:
  ✓ WI-001-A1: Backend Changes → D2 (completed by agent-abc123)
      ✓ WI-001-A1-T1: Identify affected code paths
      ✓ WI-001-A1-T2: Implement truncation helper

  → WI-001-A3: Integration Tests → D3 (in_progress, locked by agent-ghi789)
      ✓ WI-001-A3-T1: Add backend unit tests
      → WI-001-A3-T2: Add E2E tests (in progress)
      ○ WI-001-A3-T3: Update test documentation

Use /aaw-progress-work WI-001 to continue.
```

Report product state and activity progress as two separate lines, because they mean different
things. Every activity can be `completed` while a product sits in `in_review`. A work item is
done when every product is `accepted`, not when the last activity finishes. If the two
disagree, say so plainly rather than picking the flattering number.

On a `schema_version` 2 or lower work item there is no `deliverables:` block. Omit the Products
section rather than inventing one, and note the schema version in the header.

## One initiative

1. Read `initiatives_path` from `.aaw-config.yaml`, scan for `IN-*/progress.yaml`.
2. Membership comes from each work item's own `initiative_id` back-pointer, which is the source
   of truth. The initiative's `work_items` array is a convenience cache and may be stale; where
   the two disagree, trust the back-pointer and report the drift.

```
Initiative: IN-001 - GIFS Research
==================================

Status: active
Goal: Group and track all GIFS framework research
Time Horizon: 2025-Q3 – 2026-Q2
Root Work Item: WI-032

Work Items:
  ✓ WI-028: GIFS Blog & ArXiv (done)
  → WI-030: Python Hazard Benchmarks (in_progress)
  ○ WI-033: Research H-200 Forecasting (planning)

Progress: 1/5 work items done (20%)
```

## What to surface without being asked

- **Parallel opportunities.** Activities with no unmet dependencies and no live lock, which
  could be picked up now by another worker.
- **Lock state.** Active locks with time remaining, and expired locks, which indicate an
  interrupted worker and need recovery via `/aaw-progress-work`.
- **Stale work items.** `updated` older than 7 days while status is not `done`, `abandoned` or
  `blocked`. Recommend resuming or closing with a reason; do not close anything yourself.
- **Blocked items.** Name the blocker from the `blockers:` array, not just the status.

Status values, activity states, the symbol legend and lock durations are in
[references/status-reference.md](references/status-reference.md).

## Related skills

- `/aaw-next-task` picks the next task inside one work item.
- `/aaw-progress-work` executes work and clears expired locks.
- `/aaw-start-initiative` creates the initiative this view groups by.
