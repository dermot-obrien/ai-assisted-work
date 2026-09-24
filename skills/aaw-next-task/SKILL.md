---
name: aaw-next-task
description: Identify and present the next task to work on inside an AAW work item, respecting activity dependencies and the product flow, and gathering the scope and plan context needed to start it. Use when asked what to do next, what the next task or next step is, what is ready to pick up, or to resume work on a WI without yet executing it.
license: CC-BY-4.0
compatibility: Reads .aaw-config.yaml at the workspace root for work_items_path. No runtime dependencies.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "2.1.0"
---

# Next Task

Find the next task and present it with enough context to start. This skill reads and reports.
It does not execute the task; `/aaw-progress-work` does that.

## Arguments

A work item ID such as `WI-017`. If none is given, infer the active work item from the git
branch name, then recent commits, then the most recent work item with `status: in_progress`.
If more than one candidate is plausible, say which you picked and why.

## Step 1: Read the work item state

1. Read `work_items_path` from `.aaw-config.yaml` at the workspace root.
2. Read `{work_items_path}/WI-{NNN}-*/progress.yaml`.
3. If it does not exist, stop and tell the user the work item does not exist. Do not create it
   and do not guess at a near match.

## Step 2: Find the next task

Walk the activities in order, respecting `depends_on`:

1. Take activities whose `status` is `pending` or `in_progress`.
2. Drop any whose `depends_on` lists an activity that is not `completed` or `skipped`.
3. Drop any already locked by another worker, unless the lock has expired. Check `locks/`.
4. Among what remains, take the first task with `status: pending`.

If nothing is eligible, say so and explain what is blocking: unmet dependencies, live locks,
or an empty plan. Name the specific activity or lock rather than reporting a bare "nothing
available".

## Step 3: Present the task

```
## Next Task: {task_id}
**Work Item:** WI-{NNN} — {title} ({work_item_level})
**Activity:** {activity_id} — {activity_title}
**Produces:** {activity.produces} — {product name} ({product state})
**Task:** {task_title}
**Actor:** {agent | human | any}

### Context
{task description or notes if available}

### Dependencies
{activities in depends_on, with their completion status}

### Remaining in this Activity
{other pending tasks in the same activity, in order}
```

Naming the product the task advances is the point of the header. A task whose activity has no
`produces` on a `schema_version` 3 work item is a planning defect: report it rather than
working around it.

## Step 4: Read the scope if the task is thin

If the task entry in `progress.yaml` carries little detail, read the work item's `scope.md` and
`plan.md` for what is expected, and `scope-ai.md` if it exists, which holds guidance written
for agents. For the product this task advances, read its `quality_criteria` from the
`deliverables:` block, because that is what the work will be judged against.

Present the relevant details alongside the task summary rather than dumping the documents.

## Related skills

- `/aaw-progress-work` executes the task this skill identifies.
- `/aaw-work-status` reports across work items rather than inside one.
- `/aaw-start-work` creates the work item in the first place.
