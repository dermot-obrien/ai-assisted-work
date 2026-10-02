# @aaw/cli

## 3.3.0

### Minor Changes

- 1df8103: The protocol types follow the work ontology, schemas/work.schema.json (DD-11). WorkItem gains workItemLevel, parentWorkItemId, planningPeriod, advancesKrIds and deliverables; Activity gains produces; Deliverable is now the schema version 3 product, and the schema version 1 and 2 shape is ArtifactDeliverable. WorkType is open: a core value, `<prefix>:<value>` or `x-<value>`. The local-fs backend reads and writes the new fields, and its validator accepts the open work types.

### Patch Changes

- adae6fa: `aaw <command> --help` prints the help and does nothing else; `aaw install --help` used to run a real install in the current directory. The help now lists `--no-python`, `--seed`, `-y` and the `check-skills` flags. `aaw install` creates the work items folder where the config resolves it: `~`, `{tenant}` and `{repo}` expanded and a relative path taken from the workspace, so `--work-items-path ~/aaw/...` from PowerShell no longer creates a folder named `~` in the current directory. `aaw release` on an activity still `in_progress` now says what to do, instead of `Caller must call updateActivity ... does not hold the claim`.
- Updated dependencies [1df8103]
  - @aaw/protocol@3.3.0
  - @aaw/installer@3.3.0
