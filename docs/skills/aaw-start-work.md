# aaw-start-work

Classify a new piece of work and open only the workspace it earns, then scope, research and
plan it. Version 2.5.0. Source: [skills/aaw-start-work/](../../skills/aaw-start-work/SKILL.md).

## Use it when

You have a new request and want it done properly: "start a work item for the auth
migration", "scope this before we build it", or `/aaw-start-work <what you want>`.

```
/aaw-start-work add rate limiting to the public API
/aaw-start-work write a one-page guide to our release process
```

The argument is free text: the request, in your words. It is recorded verbatim.

## What it does

1. Triage, always first. It classifies the request:

   | Class | When | Result |
   |-------|------|--------|
   | Chore (the default) | No change to observable behaviour or output | Branch `chore/<desc>`, the work, a changelog line. No work item |
   | Change | Behaviour changes inside one unit | `WI-NNN` with a short `progress.yaml` and a one-paragraph plan, then straight to planning |
   | Intervention | Reaches beyond one unit: shared, many parts, or safety | `WI-NNN` with the full workspace, through every phase |
   | Inquiry | Not yet clear what to do | Handed to research, then triaged again |

2. Scoping, for an intervention. It records your exact words in `scope-ai.md`, asks what,
   why, constraints and success criteria, and writes `scope.md` only after you confirm its
   summary. It offers to link a ticket and never creates one.
3. Discovery, unless the approach is obvious. It researches the workspace and the web,
   presents two or three options with trade-offs and a recommendation, and records your
   choice (`research.md`, `decisions.md`). Every web source carries a URL and a date.
4. Planning. It confirms the level (a `workstream`, or an `epic` that lands within three
   months), names the products the work will leave behind with their quality criteria and
   approver, declares the order they must be built in, composes the definition of done from
   them, and only then derives the activities. It writes `plan.md`, `progress.yaml` and
   `changes.md` and asks you to approve the product breakdown and the activity graph.
5. It sets `status: in_progress`, claims the first available activity, and hands over to
   `/aaw-progress-work`. It does not implement the plan.

## What it writes

In `<work_items_path>/WI-NNN-<slug>/`, numbered one above the highest existing `WI-`:

| File | Chore | Change | Intervention |
|------|:-----:|:------:|:------------:|
| `progress.yaml` | | yes | yes |
| `plan.md` | | light | yes |
| `scope.md`, `scope-ai.md` | | | yes |
| `changes.md` | | optional | optional, needed for a pull request |
| `research.md`, `decisions.md` | | | when research was done or a decision made |
| `notes.md` | | optional | optional |
| `deliverables/`, `locks/` | | yes | yes |

## Configuration

`work_items_path` (where to create the work item), `initiatives_path` (to link an
initiative), and `deliverables_register` (optional: product types to inherit quality
criteria from). See [Configuration](../reference/configuration.md).

## Inside the skill

| File | Holds |
|------|-------|
| `references/work-classification.md` | The three axes behind triage, class definitions, re-triage rules |
| `references/scoping.md` | The question set, the confirmation script, what goes in `scope.md` versus `scope-ai.md` |
| `references/discovery.md` | The research matrix by work type and the option format |
| `references/planning.md` | Complexity thresholds, the product description contract, the register rules, activity design |
| `references/examples.md` | Worked examples for development, architecture and consultancy work |
| `assets/templates/` | `progress.yaml`, `plan.md`, `scope.md`, `scope-ai.md`, `research.md`, `decisions.md`, `changes.md`, `notes.md` |

## Related

- [aaw-progress-work](aaw-progress-work.md) executes the plan
- [Concepts](../concepts/index.md), sections 3 to 6
- [Work classification](../concepts/work-classification.md)
