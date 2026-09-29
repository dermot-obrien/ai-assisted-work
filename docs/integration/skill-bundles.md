# Skill Bundles

A bundle is a repository holding one or more Agent Skills, an optional ontology module and a
`bundle.json` manifest at its root. [DD-11](../about/design-decisions.md#dd-11-skill-bundles-versioned-skill-identifiers-and-a-layered-ontology)
is the decision; this page is the reference for writing and checking one.

## bundle.json

```json
{
  "$schema": "pkg:generic/dermot-obrien/ai-assisted-work/bundle-schema@1.0.0",
  "name": "diagram-model",
  "owner": "dermot-obrien",
  "description": "Diagrams and documents as two views of one model.",
  "license": "CC-BY-4.0 AND Apache-2.0",
  "homepage": "https://github.com/dermot-obrien/diagram-model",
  "derived_from": ["https://github.com/dermot-obrien/ai-assisted-work/tree/<commit>/skills/model"],
  "skills": [
    {
      "name": "model",
      "path": "skills/model",
      "version": "0.7.0",
      "purl": "pkg:generic/dermot-obrien/diagram-model/model@0.7.0",
      "requires": [],
      "check": {
        "command": ["python", "bin/model.py", "doctor"],
        "runtime": "python",
        "description": "The workspace's bindings for model resolve"
      }
    }
  ],
  "adapters": { "claude-plugin": ".claude-plugin/marketplace.json" }
}
```

| Field | Meaning |
|---|---|
| `name`, `owner` | The bundle and its owner: the namespace of every purl the bundle issues |
| `license` | An SPDX expression for the bundle |
| `homepage` | Where a person reads about it. Never used to resolve it |
| `derived_from` | Optional lineage: the source path at the source commit it was taken from |
| `skills[].version` | Equal to `metadata.version` in the skill's `SKILL.md` |
| `skills[].purl` | `pkg:generic/<owner>/<name>/<skill>@<version>` |
| `skills[].requires` | Equal to `metadata.x-skill-requires`: each `{ "purl": <purl without version>, "range": <semver range> }` |
| `skills[].check` | The post-install check, below |
| `ontology` | Optional: `{ "id": <module purl>, "path": <schema file>, "extends": [<requirement>] }` |
| `adapters` | Optional: an agent packaging's file, generated from this manifest, keyed by adapter |

The bundle has no version of its own; each skill and the ontology module carry theirs.

## Post-install check

`skills[].check` is `{ "command": [argv...], "runtime": "python" | "node" | ..., "description": "..." }`.
Paths in `command` are relative to the installed skill's directory. When `runtime` is set,
`command[0]` names it, and an installer may substitute the interpreter it resolved, such as
`python3` or `py -3`.

An installer runs every installed skill's check straight after installing it, and on demand:

- from the workspace root, with `SKILL_DIR` set to the installed skill's directory
- exit 0: the skill and the workspace configuration it depends on are correct
- exit 1: problems, each printed as one line: what is wrong, where, and how to fix it
- exit 2: a usage or environment error, such as a missing runtime
- fast, offline and read-only; an optional tool's absence is a warning, and the exit stays 0

A bundle without checks is valid but discouraged.

`aaw install` does not run the checks yet. Until it does, run them the way an installer
would with `validate-bundle.mjs --run-checks`, below, or one at a time with
`node .agents/skills/<skill>/bin/check.mjs` from the workspace root.

## Checking a bundle

```bash
node scripts/validate-bundle.mjs .                        # the manifest, against the schema and the skills
node scripts/validate-bundle.mjs --run-checks <workspace> .   # run each skill's check as an installer would
```

The validator has no dependencies. A bundle outside AAW keeps a copy of it and of the
schema under `scripts/vendor/`, which says which AAW commit it was taken from.

## The work ontology

`schemas/work.schema.json`, `pkg:generic/dermot-obrien/ai-assisted-work/work-ontology@1.0.0`,
defines WorkItem, Activity, Task, Initiative, Deliverable, Stakeholder, Objective and the
shared primitives as `progress.yaml` holds them. It is the bottom layer. The delivery layer
(delivery-planning) and the architecture layer (AI-Assisted Architecture) reference it by
`$ref` and extend its types with `allOf`:

```json
{ "allOf": [ { "$ref": "pkg:generic/dermot-obrien/ai-assisted-work/work-ontology#/$defs/WorkItem" },
             { "properties": { "budget_points": { "type": ["number", "null"] } } } ] }
```

- A Deliverable is what a work item produces. A product, registered so consumers can use it
  and raise feature requests against it, belongs to the delivery layer.
- WorkType is open: `development`, `architecture`, `consultancy` and `mixed` stay valid, a
  layer contributes `<prefix>:<value>`, and a workspace `x-<value>`.
- From `schema_version: 3`, every activity names the deliverable it `produces`.
- Objects are open, so a higher layer's fields validate against the work layer.

`packages/protocol/src/schema.ts` is its camelCase projection, and CI fails when they
disagree.
