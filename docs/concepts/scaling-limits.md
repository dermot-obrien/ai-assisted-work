# Work Management Limitations

This document describes the scaling limits and constraints of the file-based work management system.

**See also:**
- [README.md](README.md) - Core concepts and workflow
- [progress-work.md](progress-work.md) - Execution details including concurrency protocol

## Scaling Limits

**Recommended: 2-5 workers per work item, maximum 10**

Two constraints limit parallelism on a single work item:

### 1. Structural Limit (Activities)

Only one worker can claim each activity. Maximum useful workers = number of independent activities that can run in parallel.

```
Example:
  WI-001-A1 ──┬──> WI-001-A4
              │
  WI-001-A2 ──┘
  
  WI-001-A3 (independent)

Max parallel: 3 (A1, A2, A3 can run simultaneously)
```

Most real work items have 2-7 activities with some dependencies, which naturally limits useful parallelism to 2-5 workers.

### 2. Technical Limit (File Conflicts)

The system uses optimistic locking on `progress.yaml`. Conflict rates increase as concurrent writers increase:

| Concurrent Writers | Conflict Rate | Status |
|-------------------|---------------|--------|
| 2-3 | ~5% | Excellent |
| 5-7 | ~15% | Good |
| 8-10 | ~30% | Acceptable |
| 15+ | ~60%+ | Degraded |
| 20+ | ~80%+ | Broken |

At high conflict rates, workers spend more time retrying than working.

## Recommended Operating Range

| Scenario | Recommended Workers |
|----------|---------------------|
| Simple work item (1-2 activities) | 1-2 |
| Typical work item (3-5 activities) | 2-4 |
| Complex work item (6+ activities) | 3-5 |
| Maximum (exceptional cases) | 8-10 |

## Scaling Strategy

For higher parallelism, split work across multiple work items rather than many workers on one work item:

```
Instead of: 1 work item with 10 agents
Do:         5 work items with 2 agents each
```

Each work item folder is independent, so this scales horizontally without contention.

## Why Not More?

This system is designed for file-based coordination on a single filesystem. For 100+ concurrent workers:

- Use a database with proper transactions
- Use a distributed task queue (e.g., Celery, Redis Queue)
- Use a coordination service (e.g., etcd, ZooKeeper)

The file-based approach is chosen for simplicity and works well within its design limits.

## Work Item ID Race Condition

When multiple agents create work items concurrently, they may scan for the next available ID at the same time and pick the same number.

### The Race

1. Agent A scans `work-items/` and finds WI-031 is the highest → picks WI-032
2. Agent B scans `work-items/` simultaneously and also finds WI-031 → picks WI-032
3. Both agents create `WI-032-{name}/` folders — collision

### Mitigation

After creating the work item folder, verify no other folder with the same `WI-NNN` prefix exists:

1. Create the folder (e.g., `WI-032-my-feature/`)
2. Scan for all `WI-032-*/` folders
3. If more than one exists, delete yours and retry with the next available ID
4. Repeat until no collision

### Practical Impact

This race is rare in practice (single-digit concurrent agents creating work items at the exact same moment). The mitigation is a best-effort check, not a guarantee — true atomic ID generation would require a coordination service, which is out of scope for a file-based system.

## File-Specific Characteristics

| File | Concurrency Model | Limit |
|------|-------------------|-------|
| `progress.yaml` | Optimistic locking (version field) | ~10 concurrent writers |
| `changelog.log` | Append-only (JSON Lines) | Unlimited appends |
| `locks/*.lock` | Atomic create/delete | 1 holder per lock file |

The `changelog.log` and lock files scale well; `progress.yaml` is the bottleneck.
