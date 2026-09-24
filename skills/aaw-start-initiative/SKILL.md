---
name: aaw-start-initiative
description: Create an AAW initiative, the strategic container that groups related work items toward a shared goal, capturing the goal, time horizon and success criteria and registering any existing work items into it. Use when asked to start or create an initiative, group work items under a shared goal or programme, open an IN-NNN, or set up a container for work that will be planned as several work items.
license: CC-BY-4.0
compatibility: Reads .aaw-config.yaml at the workspace root for initiatives_path and work_items_path. No runtime dependencies.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "2.1.0"
---

# Start Initiative

An initiative is a strategic container grouping related work items toward a shared goal. It is
deliberately lightweight: no `plan.md`, no `deliverables/`, no `locks/`. Planning, products and
concurrency control all live at the work item level.

| Phase | Style | Purpose | Output |
|-------|-------|---------|--------|
| 1 Scoping | Read-only, then write | Capture the strategic goal through dialogue | `scope.md` |
| 2 Creation | Write | Create the workspace and register members | `progress.yaml` |

## What belongs under an initiative

An initiative holds work items at either level:

- A `workstream` work item is a durable strand inside the initiative, a subject rather than a
  schedule, which accretes scope and may never end.
- An `epic` work item is a bounded slice landing in one planning period, three months at most.
  It may hang off a workstream or directly off the initiative.

If the thing being asked for is itself bounded and quarter-sized, it is an epic, not an
initiative. Say so rather than creating a container with one member in it.

## Phase 1: Scoping

1. Record the user's exact words verbatim. Do not paraphrase.
2. Ask, read-only, until you can answer:
   - Goal: what strategic outcome should this achieve?
   - Time horizon: what target timeframe, in whatever calendar the organisation uses?
   - Success criteria: how will they know it succeeded, measurably?
   - Scope: what is in and what is out?
   - Members: do existing work items belong here, or will they be created later?

   Useful openings: "What problem does this solve at a strategic level?", "How many work items
   do you expect?", "Are there existing work items that should be grouped under this?"

3. Summarise and get explicit confirmation before writing anything:

```
Based on our discussion, here's what I understand:

Goal: {strategic goal}
Time Horizon: {target start} – {target end}
Success Criteria:
  - {criterion 1}
  - {criterion 2}
Work Items: {existing WIs to include, or "to be created"}

Is this accurate? Anything to add or change?
```

## Phase 2: Creation

1. **Resolve the location.** Read `initiatives_path` from `.aaw-config.yaml` at the workspace
   root. If the config is missing, fall back to `./change/initiatives/`. Create the directory
   if it does not exist.

2. **Generate the ID.** Scan for existing `IN-*/` folders, take the highest number, increment.
   Format `IN-{NNN}`, zero-padded, one series with no separate prefix for private initiatives.

3. **Create the workspace:**

   ```
   {initiatives_path}/IN-{NNN}-{kebab-case-title}/
   ├── scope.md          # goals, success criteria, work item list
   └── progress.yaml     # members and overall status
   ```

4. **Write `scope.md`** from `assets/templates/initiative-scope.md`: title and ID, the goal in
   one or two sentences, measurable success criteria, time horizon, the work items table, why
   this initiative exists, and the scope boundaries.

5. **Write `progress.yaml`** from `assets/templates/initiative-progress.yaml`: set
   `initiative_id`, `title`, `status: proposed`, `owner` if given, `created` and `updated` as
   ISO-8601 UTC, `target_start` and `target_end`, the `work_items` array, and
   `root_work_item` if the user designates one.

6. **Register existing work items**, if any were named. For each one, set `initiative_id` in
   that work item's own `progress.yaml`, then add it to the initiative's `work_items` array.
   The work item's back-pointer is the source of truth for membership; the initiative's array
   is a convenience cache.

7. **Present for confirmation:**

```
Initiative: {IN-NNN} - {Title}
Location: {initiatives_path}/IN-NNN-{name}/
Status: proposed

Goal: {From scope.md}
Time Horizon: {target_start} – {target_end}

Success Criteria:
  - {criterion 1}
  - {criterion 2}

Work Items: {count} registered ({list IDs or "none yet"})

Documents Created:
  ✓ scope.md
  ✓ progress.yaml

Ready to create work items? Use /aaw-start-work, which will set
initiative_id: {IN-NNN} on what it creates.
```

## Rules

1. Initiatives are lightweight. No plan, no products, no locks at this level.
2. The `initiative_id` in a work item's `progress.yaml` is the canonical record of membership.
   The initiative's `work_items` array is a cache and may drift; where they disagree, the
   back-pointer wins.
3. No initiative-level locking. Concurrency control is a work item concern.
4. Confirm before creating. Get approval before writing files.
5. Record the strategic goal verbatim.
6. Success criteria are measurable or they are not criteria. "Improve reliability" is not one;
   "zero auth-related incidents for a quarter" is.

Worked examples are in [references/examples.md](references/examples.md).

## Related skills

- `/aaw-start-work` creates the work items that go inside this initiative.
- `/aaw-work-status IN-NNN` reports the initiative and its members.
