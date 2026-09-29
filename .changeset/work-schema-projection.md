---
"@aaw/protocol": minor
"@aaw/cli": minor
---

The protocol types follow the work ontology, schemas/work.schema.json (DD-11). WorkItem gains workItemLevel, parentWorkItemId, planningPeriod, advancesKrIds and deliverables; Activity gains produces; Deliverable is now the schema version 3 product, and the schema version 1 and 2 shape is ArtifactDeliverable. WorkType is open: a core value, `<prefix>:<value>` or `x-<value>`. The local-fs backend reads and writes the new fields, and its validator accepts the open work types.
