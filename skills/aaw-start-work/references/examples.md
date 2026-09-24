# Worked examples

Three interventions, one per work type, showing which phases ran and which documents each
produced. A chore would have produced none of these.

## Development

```
User: "Fix the bug where task titles overflow the sidebar"

Phase 0 (Triage):
- Changes observable output? Yes. Beyond one unit? No.
- → CHANGE, not an intervention. Shown here as an intervention for illustration only.

Phase 1 (Scoping):
- Clarify: What's "too long"? Where does it display badly?
- Refined: Truncate task titles to 80 chars with ellipsis in the sidebar

Phase 2 (Discovery):
- Workspace: Find task creation code, display components
- Web: None needed (simple fix)
- Decision: Truncate at creation or at display? → At creation

Phase 3 (Planning):
- 1 activity, 3 tasks: locate, fix, test

Documents: scope.md, scope-ai.md, plan.md, progress.yaml, changes.md
Folders: deliverables/, locks/
(research.md and decisions.md skipped, simple work item)
```

## Architecture

```
User: "Design event-driven architecture for order processing"

Phase 0 (Triage):
- Reaches beyond one unit, shared and safety-relevant → INTERVENTION

Phase 1 (Scoping):
- Clarify: What triggers events? What consumes them? Scale requirements?
- Refined: Design async order pipeline with Pub/Sub

Phase 2 (Discovery):
- Workspace: Current order flow, existing event patterns
- Web: Event sourcing patterns, Pub/Sub best practices
- Decisions: Pub/Sub or Kafka? Event schema format?

Phase 3 (Planning):
- 4 activities: Document current, Design target, Create specs, Review

Documents: scope.md, scope-ai.md, research.md, decisions.md, plan.md, progress.yaml, changes.md
Folders: deliverables/, locks/
```

## Consultancy

```
User: "Assess cloud readiness and recommend migration strategy"

Phase 0 (Triage):
- Reaches across many units → INTERVENTION

Phase 1 (Scoping):
- Clarify: Timeline? Budget constraints? Compliance requirements?
- Refined: 6-month migration assessment for regulated workloads

Phase 2 (Discovery):
- Workspace: Infrastructure docs, compliance requirements
- Web: Cloud migration frameworks, regulatory guidance
- Decisions: Lift-and-shift or refactor? Single cloud or multi?

Phase 3 (Planning):
- 3 activities: Discovery interviews, Analysis, Recommendations

Documents: scope.md, scope-ai.md, research.md, decisions.md, plan.md, progress.yaml, changes.md
Folders: deliverables/, locks/
```

## A chore, for contrast

```
User: "The README badge points at the old version number"

Phase 0 (Triage):
- Changes observable behaviour or output? No, documentation only. → CHORE

Action: branch chore/readme-version-badge, edit, changelog line (patch), done.

Documents: none. No WI-NNN folder, no scope.md, no plan.md, no progress.yaml.
```

This last case is the one most often got wrong. A chore that produces a work item has cost
more ceremony than it earned.
