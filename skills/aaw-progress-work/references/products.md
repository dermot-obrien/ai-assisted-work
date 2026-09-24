# Products during execution

Products are planned, not discovered. They were named at planning time in the top-level
`deliverables:` block of `progress.yaml`, and every activity carries a `produces` field naming
the one it advances. Execution moves named products through their states; it never invents
new ones.

## The loop

1. Read the activity's `produces` to find the product it advances. If it is missing on a
   `schema_version` 3 work item, stop and get the plan fixed. An activity that produces
   nothing is invalid: split it, fold it into another, or name the product it was really for.
2. Read that product's `quality_criteria`. That is what the work will be judged against, and
   reading it before starting is cheaper than reworking after review. Where the product has a
   `type` and `.aaw-config.yaml` sets `deliverables_register`, read the type's row: it carries
   the criteria, the quality method and the approver, and the product overrides only what it
   states explicitly.
3. As you work, advance `state`:

   | State | Means |
   |-------|-------|
   | `planned` | Named, not started |
   | `drafted` | Exists but not yet reviewed |
   | `in_review` | With its `approver` |
   | `accepted` | Passed its own `quality_criteria` |

4. Record the product's file at its `path`, and every workspace file it touched in its
   `files_changed`, each with an `action` of `created`, `modified` or `deleted`.

## Two things that are not the same

The product's `state` is distinct from the status of the activities producing it. Every
activity on a product can be `completed` while the product sits in `in_review`. Report both;
do not collapse them into one number.

The work item is done when every product is `accepted`, not when the last activity finishes.
If every activity is complete and products are still short of `accepted`, the work item status
is `review`, not `done`.

## Who accepts

`accepted` means the product's `approver` accepted it against its `quality_criteria`, by the
quality method its type names where a register is configured. That is
usually not the worker who produced it, and where the approver is a person it is a human task.
An agent may move a product to `in_review`. It should not mark one `accepted` on someone
else's behalf.

Where `approver` is null, the work item owner accepts.

## The product document

Where the product is a document, it lives at its `path`, conventionally
`deliverables/D{N}-{name}.md`, built from `assets/templates/deliverables/D01-template.md`.
Build it incrementally as tasks complete rather than all at once at the end: decision summary,
context, options considered, files created or modified, and a verification checklist against
the quality criteria.

## Older work items

A work item at `schema_version` 2 or below has no top-level `deliverables:` block and no
`produces`. Fall back to the legacy behaviour and do not retrofit:

- A completed activity should produce a deliverable, being a file created or modified, a
  decision documented in `deliverables/D{NN}-{name}.md`, or both.
- Deliverables are tracked at activity level, not per task.
- Record outputs in the `artifacts.deliverables` array.

Do not rewrite an old work item into the new schema mid-flight unless the user asks. Read any
version, write forward by adding fields rather than restructuring, and preserve existing
comments and layout.
