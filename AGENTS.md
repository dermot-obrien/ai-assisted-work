# Agents: how work is run here

These instructions are for any agent, in any tool. This repository holds the `work` skill (`skills/work/`: work items, activities, tasks and initiatives in plain files) and `bin/skills.mjs`, the installer for standalone skills from any bundle or repository. Both run with Node 18+; the installer also needs git.

| Read | For |
|---|---|
| `skills/work/SKILL.md` | The work skill and its flows (start, progress, status, next, initiative) |
| `docs/` | Concepts, the installer, configuration and design decisions |
| `CONTRIBUTING.md` | How changes are made here |

## Making a change

1. Work on your own branch from `main` and keep the change to what was asked.
2. Run `npm ci` once, then `npm test`, `node scripts/validate-skills.mjs skills` and `node scripts/validate-bundle.mjs .`. All pass before a pull request.
3. Open a pull request into `main`, with Conventional Commit subjects. Never merge it: Dermot merges in this repository.

## Writing style

No em dashes as sentence punctuation, no bold inside a sentence, British spelling.
