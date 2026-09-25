# Actors, mixed activities and manual tasks

## The actor model

| Actor | Who can perform it | Examples |
|-------|--------------------|----------|
| `agent` | AI agents only | Write documentation, analyse code, create diagrams |
| `human` | Humans only | Portal configuration, meetings, approvals, external system access |
| `any` | Either. The default | Review a document, update a file, research |

## Activity-level inference

- Every task `human`: the activity is implicitly human-only. Agents skip it.
- Any task `agent` or `any`: agents can claim it, and must handle the human tasks specially.
- An explicit `actor` on the activity overrides the inference.

## Mixed activities

When an agent claims an activity holding both kinds of task:

1. Execute the agent and any tasks normally.
2. Mark each human task `status: awaiting_human`, note "Awaiting human action, see Manual
   Tasks Report", and append `{"action":"awaiting_human","task_id":"..."}` to the changelog.
3. Decide whether to continue: if the next task is `agent` or `any` and does not depend on the
   human task's output, carry on. If it does depend on it, mark the activity `blocked`,
   generate the report, and release the lock.

```
Activity A1:
  T1: Write analysis (agent)                  → completed
  T2: Schedule stakeholder meeting (human)    → awaiting_human
  T3: Document meeting outcomes (human)       → awaiting_human
  T4: Update documentation with findings (agent) → blocked, depends on T3
```

Release the lock rather than holding it while blocked. Another worker may be able to progress
a different activity.

## Manual Tasks Report

Generate it when you first load a work item with human tasks, when you finish your work but
human tasks remain, or when asked.

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

Keep it short. Its only job is to tell a human what they can do now and what their doing it
will unblock.

## Resuming after a human completes their tasks

1. Read `progress.yaml` and look for tasks that moved from `awaiting_human` to `completed`.
2. Work out what is now unblocked.
3. If the activity lock expired, acquire a new one.
4. Resume from the first incomplete task.

```
1. Agent claims A1, completes T1, marks T2 awaiting_human
2. Agent cannot proceed (T3 needs T2's output), releases the lock, generates the report
3. Human completes T2 and marks it completed
4. Agent detects the change, reclaims A1, resumes from T3
```

If human tasks are blocking you, check `progress.yaml` periodically or ask the user to tell
you when they are done. Do not sit holding a lock waiting.

## Acceptance is usually a human task

A product reaching `accepted` means its `approver` accepted it against its `quality_criteria`.
Where the approver is a person, that acceptance is a human task even when every activity
producing the product was agent work. An agent may move a product to `in_review`; it should
not move one to `accepted` on the approver's behalf.
