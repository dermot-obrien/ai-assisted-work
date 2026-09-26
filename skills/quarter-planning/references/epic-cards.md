<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Epic cards and epic folders

An epic has two faces. Its folder is written by hand and lives for the epic's whole life, across as many quarters as it takes. Its card is generated from the planning model for one quarter and is never edited. This page says what each holds, so that nothing is written in both and nothing falls between them.

## The split

| | Epic folder | Epic card |
|---|---|---|
| Where | `<epicsDir>/<home>/`, where `home` is the folder's name on the epic's model record | `<cardsDir>/<id>.md`, with `cardsDir` usually carrying `{quarter}` |
| Written by | Hand | `quarter.py --quarter <slug> --cards` |
| Lifetime | The epic's whole life | One quarter |
| Holds | Framing, starting evidence, scope decisions, dependencies, what was left out, and discovery | Every figure about the epic: rung movement, products, points, states, approvals, budget against planned |
| Links to | Each quarter's card | The folder's `index.md`, or `README.md` where that is what exists |

The test for where something belongs: if a script can compute it or read it from the model, it goes on the card, and if it is an argument somebody made, it goes in the folder. A figure typed into the folder will drift from the model. An argument written on the card is overwritten by the next regeneration.

## What a card holds

Each committed epic gets one card, `<id>.md`, in this order.

| Part | Holds |
|---|---|
| Frontmatter | `title`, `sidebar_label`, `sidebar_position` and `status: Generated`, followed by an HTML comment saying the file is generated and naming the command that regenerates it |
| Opening line | The epic's title, a relative link to its folder, or a plain statement that no home is recorded, or that one is recorded but cannot be found |
| Fields | Quarter, capability area (`lane`), approval, threads, and the criteria it advances |
| Movement | One row per flow: what it does, the rung it starts on and the rung it is committed to reach. A column for the rung reached appears once any is recorded |
| Products | One row per product: its type, the rung that type evidences from the register's `rung` column, its points, its state and its approval |
| Capacity | Budget, planned, and the difference, then one sentence: within budget, over by a stated amount, or deferred because no budget was given |

The budget on a card is the one the resourcing register distributes, taken from the same arithmetic the validation uses, so the card and the report cannot disagree. Where the model records a different budget, the card says so and points at the validation.

Points are shown to two decimals, trimmed to one where the second is zero: 0.25, 2.0, 9.25.

The cards folder also gets a `README.md` holding the quarter's stage grid, which is every flow in scope with its starting and committed rungs and a link to its card, and an epics table with budget, planned, the difference and approval for each epic.

## Recommended outline of an epic folder's index page

The folder's `index.md` is the epic's home page. The outline below keeps the argument in one predictable order, and leaves every figure to the card.

| Section | Says |
|---|---|
| Header | Quarters, each linking to that quarter's card, the capability area, the owner, any threads, and where the model record is |
| The movement | The capability area and its flows, in prose. The rungs themselves are in the model and on the card |
| Why now | The demand or criterion the movement serves, or the assumption standing in for one |
| Where it starts | The evidence that already exists, and which rung each piece would count toward |
| End of quarter | What will be true that is not true now, stated so that it can be checked |
| Products | Which part of the work each product belongs to, and what is produced elsewhere. The products themselves, with their sizes, are on the card |
| Dependencies | What must happen elsewhere, and who owns it |
| Scope decisions | Each decision to defer or cut, with its reason and its date |
| Not this quarter | What was considered and left out, and what would bring it in |
| Discovery | The discovery pages in the folder, one line each |

Discovery belongs in the folder: options explored, spikes, findings from evidence, anything that has to be understood before the epic can commit or while it runs. Each discovery page sits beside `index.md` and is listed under Discovery.

## An example

A workspace binds:

```toml
[suite.quarter-planning]
epicsDir = "../change/epics"
cardsDir = "../change/planning/{quarter}/cards"
```

The epic `EP-001 Example capability increment` records `home: EP-001-example-capability`. Its folder is `change/epics/EP-001-example-capability/index.md`, written by hand. Running `--cards` for `2027-q1` writes `change/planning/2027-q1/cards/EP-001.md`, which links back to that folder, and `change/planning/2027-q1/cards/README.md`, which holds the stage grid. In the next quarter the same folder gains a second card, and its header links to both.
