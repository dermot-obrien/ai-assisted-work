# Examples

Where to find worked examples and the templates the skills fill in.

## Start small

The [quick start](quick-start.md) builds a two-activity work item, `WI-001 Onboarding
checklist`, by hand in step 5. It is the smallest `progress.yaml` the CLI and the skills
accept at `schema_version: 3`: one product, one agent activity, and one human activity that
waits on it.

## A real work item

[change/work-items/WI-001-agent-configuration/](../change/work-items/WI-001-agent-configuration/)
is a finished work item from this repository's own history, with every document an
intervention produces: `scope.md`, `scope-ai.md`, `plan.md`, `progress.yaml`, `changes.md`,
and a deliverable under `deliverables/`. It predates product-based planning, so its
`progress.yaml` is `schema_version: 2`, with no `produces` on its activity.

[change/work-items/WI-research-speckit-analysis.md](../change/work-items/WI-research-speckit-analysis.md)
is a research write-up of the kind discovery produces.

## Worked examples in the skills

| File | Shows |
|------|-------|
| [aaw-start-work: references/examples.md](../skills/aaw-start-work/references/examples.md) | A development, an architecture and a consultancy intervention, which phases ran and what each left behind, and a chore for contrast |
| [aaw-start-initiative: references/examples.md](../skills/aaw-start-initiative/references/examples.md) | A research, a platform and an enabler initiative, and when not to create one |
| [aaw-progress-work: assets/locks/](../skills/aaw-progress-work/assets/locks/README.md) | A lock file and the lock format |

## Templates

Every field is explained in a comment where it appears.

| Template | Used for |
|----------|----------|
| [progress.yaml](../skills/aaw-start-work/assets/templates/progress.yaml) | A work item's state: deliverables, activities, tasks, blockers |
| [scope.md](../skills/aaw-start-work/assets/templates/scope.md), [scope-ai.md](../skills/aaw-start-work/assets/templates/scope-ai.md) | Scope for people, and the verbatim request and reasoning for agents |
| [plan.md](../skills/aaw-start-work/assets/templates/plan.md) | The product breakdown, product flow and activities |
| [research.md](../skills/aaw-start-work/assets/templates/research.md), [decisions.md](../skills/aaw-start-work/assets/templates/decisions.md) | Discovery |
| [changes.md](../skills/aaw-start-work/assets/templates/changes.md), [notes.md](../skills/aaw-start-work/assets/templates/notes.md) | A pull request summary; session notes |
| [D01-template.md](../skills/aaw-progress-work/assets/templates/deliverables/D01-template.md) | A deliverable |
| [initiative-progress.yaml](../skills/aaw-start-initiative/assets/templates/initiative-progress.yaml), [initiative-scope.md](../skills/aaw-start-initiative/assets/templates/initiative-scope.md) | An initiative |
| [objective-progress.yaml](../skills/aaw-start-initiative/assets/templates/objective-progress.yaml), [cadence.yaml](../skills/aaw-start-initiative/assets/templates/cadence.yaml) | The optional OKR layer |

## Configuration examples

- A `.aaw-config.yaml` with every key: [Configuration](reference/configuration.md#aaw-configyaml)
- A deliverables register mapping: [Configuration](reference/configuration.md#deliverables_register)
- A `bundle.json`: [Skill bundles](integration/skill-bundles.md#bundlejson), and this
  repository's own [bundle.json](../bundle.json)
