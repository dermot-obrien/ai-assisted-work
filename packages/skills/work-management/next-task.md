# Next Task

Identify the next task to work on from the current work item.

## Arguments

`$ARGUMENTS` should be a work item ID (e.g., `WI-017`). If not provided, infer the active work item from the git branch name, recent commits, or the most recent in_progress work item.

## Procedure

### Step 1: Read Work Item State

Read the work item's `progress.yaml` from `.intent/change/work-items/WI-{NNN}-*/progress.yaml`.

If the file doesn't exist on disk, stop and tell the use that the work item doesn't exist and finish at this step.
### Step 2: Find the Next Task

Walk through activities in order, respecting `depends_on` constraints:

1. Find activities where `status` is `pending` or `in_progress`
2. Filter out activities whose `depends_on` lists include incomplete activities
3. Among eligible activities, find the first task with `status: pending`

### Step 3: Present the Task

Output a clear summary:

```
## Next Task: {task_id}
**Work Item:** WI-{NNN} — {title}
**Activity:** {activity_id} — {activity_title}
**Task:** {task_title}

### Context
{task description or notes if available}

### Dependencies
{list any depends_on for the activity, and their completion status}

### Remaining in this Activity
{list other pending tasks in the same activity}
```

### Step 4: Read Scope if Needed

If the task description in progress.yaml is minimal, read the work item's `scope.md` and `plan.md` for additional context about what's expected.

Also read `scope-ai.md` if it exists — it contains implementation-oriented guidance written for AI agents.

Present any relevant details from these documents alongside the task summary.
