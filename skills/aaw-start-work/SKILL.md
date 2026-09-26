---
name: aaw-start-work
description: Classify a new piece of work and open only the workspace it earns, then scope, research and plan it. Triages a request into chore, change, intervention or inquiry, and for an intervention creates a WI-NNN work item that names the products it will leave behind and derives its activities and tasks from them. Use when asked to start work, start or scope a work item, open a WI, plan a piece of work before building it, or when a request needs classifying before any ceremony is applied.
license: CC-BY-4.0
compatibility: Reads .aaw-config.yaml at the workspace root for work_items_path, initiatives_path and the optional deliverables_register. No runtime dependencies; the optional aaw CLI used to verify the result needs Node.js 18 or newer.
metadata:
  author: dermot-obrien
  framework: aaw
  version: "2.2.0"
---

# Start Work

Classify the work first, then apply only the ceremony that class earns. Most requests are
chores and must not produce a work item.

## Phase 0: Triage (always first, never skipped)

```
Uncertain what to do?                          → INQUIRY
  no ↓
Changes observable behaviour or output?  no →  → CHORE  (enabler / cosmetic / docs / fix)
  yes ↓
Reaches beyond one unit (shared / many / safety)?
  no  → CHANGE
  yes → INTERVENTION
```

Default to the lightest answer. Ask the user only when genuinely ambiguous. For the three
axes behind this tree, the full class definitions, the class-versus-substrate distinction
and re-triage rules, read [references/work-classification.md](references/work-classification.md).

| Class | Action | Then |
|-------|--------|------|
| Chore (default) | Branch `chore/{kebab-desc}`, do the work, add a changelog line (patch). | Done. No `WI-NNN/`, no scope, plan or progress file. |
| Change | Assign `WI-NNN`. Minimal workspace: short `progress.yaml` plus a one-paragraph plan. Branch `wi/WI-NNN-…`. | Skip to Phase 3 (light), then Phase 4. |
| Intervention | Assign `WI-NNN`. Full workspace. | Continue to Phase 1. |
| Inquiry | Hand to research: invoke AAR `/start-hypothesis`. | Re-triage the outcome when research concludes, or close it as a lesson. |

Do not create a work-item folder unless the class is intervention or change.

## Work item types

| Type | Description |
|------|-------------|
| `development` | Software development |
| `architecture` | Platform strategy and solution design |
| `consultancy` | Advisory and analysis |
| `mixed` | Combination of the above |

## Two levels of work item

One entity, two granularities. Set `work_item_level` when the work item is created.

| Level | What it is | Decomposed into | Parent |
|-------|------------|-----------------|--------|
| `workstream` | A durable strand of work inside an initiative. A subject, not a schedule. It accretes scope and may be long-running or never-ending. | Epics | The initiative |
| `epic` | A bounded slice sized to land inside one planning period, three months at most. | Activities, at story granularity | A workstream, or the initiative directly |

The three-month line is the test. If the work cannot land inside one planning period, it is a
workstream and must be decomposed into epics before planning goes further. An epic that keeps
growing was a workstream all along.

An epic whose `parent_work_item_id` is null hangs directly off the initiative, which is the
normal shape where a lane's epics are sequential phases rather than parallel subjects. A
workstream never sets a parent work item.

Grain equivalence for teams working in agile terms: a work item at epic level is an epic, an
activity is a story, a task is a task.

## The intervention path

| Phase | Style | Purpose | Output |
|-------|-------|---------|--------|
| 1 Scoping | Read-only, then write | Refine the user's intent through dialogue | `scope.md`, `scope-ai.md` |
| 2 Discovery | Read-only, then write | Research the workspace and the web, choose an approach | `research.md`, `decisions.md` |
| 3 Planning | Write | Name the products, then derive the activities that produce them | `plan.md`, `progress.yaml`, `changes.md` |
| 4 Execution | Write | Implement the plan | Deliverables |

Each phase opens read-only for dialogue and research, then switches to write operations
once the user has confirmed.

### Phase 1: Scoping

1. Record the user's exact words verbatim. Do not paraphrase.
2. Ask clarifying questions covering what, why, constraints and success criteria.
3. Summarise your understanding and get explicit confirmation before writing anything.
4. Offer to link a JIRA ticket. Never auto-create one.
5. Create the work item and its scope documents (see "Creating the work item" below).

Full question set, the confirmation script, the JIRA prompt and the rules for splitting
content between `scope.md` and `scope-ai.md` are in [references/scoping.md](references/scoping.md).

### Phase 2: Discovery

Skip Discovery when the task is simple and well understood with no choice of approach:
a bug fix with a clear reproduction, a field added to an existing pattern, a documentation
update, or work where the user has already specified the approach. Record the skip in
`plan.md` under an Analysis Summary heading and move to Phase 3.

Otherwise research the workspace and the web, present two or three options with trade-offs
and a recommendation, and record the user's choice. Document every web source with a URL
and a retrieval date. Procedure, the research matrix by work type and the option-presentation
format are in [references/discovery.md](references/discovery.md).

### Phase 3: Planning

Plan the products first, then derive the work. In order:

1. Confirm the level. If the work cannot land in one planning period, it is a workstream;
   decompose it into epics and plan those.
2. Name the products this work item will leave behind, with why each is needed, its quality
   criteria and who accepts it. This is the product breakdown. Where `.aaw-config.yaml` sets
   `deliverables_register`, pick each product's type from that register and inherit its
   criteria and approver rather than restating them.
3. Declare the product flow: which products cannot start before which others exist.
4. Compose the definition of done from those products rather than authoring it separately.
5. Derive the activities. For each product, ask what has to happen for it to exist. Every
   activity declares the product it advances.
6. Write `plan.md`, `progress.yaml` and `changes.md` from the bundled templates, and present
   the product breakdown, the product flow and the activity graph for approval.

Never start from a list of things to do and look for products afterwards. Complexity
thresholds, the product description contract, activity design rules and the approval script
are in [references/planning.md](references/planning.md).

### Phase 4: Execution

1. Set `status: in_progress` in `progress.yaml`.
2. Claim an activity with no unmet dependencies by creating a lock file in `locks/`.
3. Hand off: invoke `/aaw-progress-work WI-NNN` for the implementation loop.

This skill stops at the first claimed activity. It does not implement the plan.

## Creating the work item

1. Resolve the work items root from `.aaw-config.yaml` at the workspace root. Read
   `work_items_path`. If the config is missing, ask the user for a path or fall back to
   `./change/work-items/`. Create the directory if it does not exist.
2. Scan that root for existing `WI-*/` folders, take the highest number and increment.
   IDs are `WI-{NNN}`, zero-padded, one series with no separate prefix for private items.
3. Create the folder:

   ```
   {work_items_path}/WI-{NNN}-{kebab-case-title}/
   ├── deliverables/     # activity outputs
   └── locks/            # activity locks
   ```

4. Write the documents this class earns, from `assets/templates/`:

   | Document | Phase | Chore | Change | Intervention |
   |----------|-------|:-----:|:------:|:------------:|
   | branch plus changelog line | — | yes | yes | yes |
   | `progress.yaml` | Planning | — | yes | yes |
   | `plan.md` | Planning | — | light | yes |
   | `scope.md` | Scoping | — | — | yes |
   | `scope-ai.md` | Scoping | — | — | recommended |
   | `changes.md` | Planning | — | optional | optional, needed for a PR |
   | `research.md` | Discovery | — | — | when research was done |
   | `decisions.md` | Discovery | — | — | when a decision was made |
   | `notes.md` | any | — | optional | optional |

Worked examples for development, architecture and consultancy work are in
[references/examples.md](references/examples.md).

## Rules

1. Triage before anything else, and default to the lightest class.
2. Dialogue and research happen read-only. Write files only after the user confirms.
3. The original instruction in `scope-ai.md` is verbatim. The intent in `scope.md` is a
   clean synthesis for stakeholders.
4. Present options and get a decision. Do not assume one.
5. Every web source carries a URL and a retrieval date.
6. Products before activities, always. Every activity names the product it advances; an
   activity that produces nothing is invalid. Effort with nothing left behind is motion, not
   work.
7. A product is tangible and verifiable by someone other than its author. An outcome counts
   when it is measurable, because then it can be checked.
8. Design activities for parallelism: sequential tasks in one activity, independent work
   in separate activities, cross-activity dependencies minimised. The activity graph is
   derived from the product flow; where they disagree, the product flow is right.
9. Tasks are atomic and specific.

## Related skills

- `/aaw-progress-work` executes the plan this skill produces.
- `/aaw-work-status` reports on work items already open.
- `/aaw-next-task` picks the next task within an open work item.
- `/aaw-start-initiative` groups several work items under one initiative.
