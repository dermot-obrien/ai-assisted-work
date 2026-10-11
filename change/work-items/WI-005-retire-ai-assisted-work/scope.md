# WI-005 Retire AI-Assisted Work as a framework

## Summary

Retire AI-Assisted Work as a framework once nothing installs through it. AI-Assisted Architecture and AI-Assisted Research first become standalone skills that install with `bin/skills.mjs` and refer only to other skills, never to a framework. Then the `aaw` command, its install engine and the framework manifest are removed, which leaves this repository holding two skills (`thread` and `work`) and a bundle manifest. Last, those two skills get their permanent home and the old name is archived.

Status: planned, 11 October 2026. Follows [WI-004](../WI-004-skills-extracted-aaw-a-bundle/scope.md), which made `thread` and `work` standalone and turned this repository into a bundle.

## Intent

From the user, 11 October 2026: "I want to retire AI-assisted work as a legacy concept and put those two skills in a relevant bundle"; "we've made breaking changes, and I want to make sure first that AI-assisted architecture and AI research still work"; "once we have the AI-assisted architecture and AI-assisted research decomposed into skills and only referring to skills, then we could deprecate AI-assisted work"; "we're going to eventually blow away the AI-assisted work completely".

The user also settled where `thread` and `work` belong: in one bundle, because they will mostly be used together, and in source repositories named for their subject, not suffixed `-skills`. Until this work item reaches step 4 they stay where they are.

## Where things stand

Tested on 11 October 2026 by reproducing patternode-platform's session setup in a scratch workspace: `npm ci` from its lock, then `aaw install`, `aar install` and `aaa install`.

| Framework | Version | Result |
|---|---|---|
| AI-Assisted Work | 4.0.0 | Installs `thread` and `work`; both checks pass |
| AI-Assisted Research | 1.2.0 | Installs 12 skills. Six named the retired `aaw-start-work`, `aaw-progress-work` and `aaw-start-initiative` as handoffs and declared requirements. Fixed on its branch `claude/agent-bulletin-board-9xglra` (step 1), not yet pushed |
| AI-Assisted Architecture | 0.3.0 | Installs 9 skills and names no retired skill. Seven of its checks fail in a workspace with no `.agents/skill-bindings.toml`, whatever the AI-Assisted Work version, so that is not a 4.0.0 breakage |

This repository's default branch on GitHub is `develop`, which is still at 3.2.0 while `main` carries 4.0.0. Anything that installs from the default branch (an npm dependency with no ref, a plain clone, AI-Assisted Research's CI) gets 3.2.0 until `develop` is brought up to `main`. patternode-platform locks the 4.0.0 commit on `main` directly.

Both frameworks still install through this repository's engine (`framework.manifest.yaml` `depends: [aaw]`), and patternode-platform's session-start hook runs `npx aaw install`, `npx aar install` and `npx aaa install`. Removing the engine before they move would stop both installing.

## Steps

| Step | Product | Where | Depends on |
|---|---|---|---|
| 1 Fix AI-Assisted Research's handoffs | Its research skills hand off to `/work start`, `/work progress` and `/work initiative` and require `ai-assisted-work/work ^3.0.0` | AI-Assisted Research | |
| 2a AI-Assisted Architecture as standalone skills | Each skill carries the standards it reads in its own `references/`, or one `aaa-standards` skill that the others name as optional; the ontology validator moves into the skill that runs it; the skills install with `bin/skills.mjs` from its `bundle.json`; `depends: [aaw]` goes | AI-Assisted Architecture | |
| 2b AI-Assisted Research as standalone skills | The research-graph scripts (`research-dag/bin/*.py`, `aar-reconcile/scripts/reconcile.py`) move into the skills that run them, or the skills sharing the graph merge into one skill, as the five work skills did; each skill states its Python packages in its `compatibility` and its check; the skills install with `bin/skills.mjs`; `depends: [aaw]` goes | AI-Assisted Research | 1 |
| 2c Workspaces install skills, not frameworks | patternode-platform's `scripts/setup-deps.sh` and npm dependencies, patternode-business's clones and patternode-architecture's install move to `bin/skills.mjs` with a lock file | Each workspace, through its own pull request and master session | 2a, 2b |
| 3 Remove the framework scaffolding | `bin/aaw.js`, `packages/` (`@aaw/cli`, `@aaw/installer`, `@aaw/protocol`), `framework.manifest.yaml` and the npm workspace go; the work item schema moves inside the `work` skill; CI keeps the skills, bundle and installer tests | This repository | 2c |
| 4 The two skills' permanent home | Either rename this repository (history and links carry over, as GitHub redirects the old name) or move `thread` and `work` into subject-named repositories with `scripts/extract-skill.mjs`; the bundle manifest goes with them; the old name is archived with a README pointing at the new home | This repository | 3 |

AAR's step 1 is small and closes the only breakage found. Steps 2a and 2b are each a work item in their own repository.

## Decisions for the user

1. Step 4: rename this repository, or move the skills out and archive it. Recommendation: rename, because nothing then needs extracting again and every existing link keeps working. The new name follows the skills' subject (intents, threads and work), not the word "skills".
2. Step 2a, decided 11 October 2026: a copy of each standard in each skill. A workspace copy still wins, so the organisation keeps governing them, and CI checks each copy against the framework's `standards/`.
3. Step 2b, decided 11 October 2026: merge the research skills that share the graph into one, `research`.
4. Where `bin/skills.mjs` lives after step 4. It installs any skill from any bundle, so it may deserve a repository of its own rather than travelling with `thread` and `work`.

## Progress

| Step | State |
|---|---|
| 1 | Done, merged 11 October 2026 as dermot-obrien/ai-assisted-research#12: the research skills hand off to `/work start`, `/work progress` and `/work initiative` and require `work ^3.0.0` |
| 2a | Done, merged 11 October 2026 as dermot-obrien/ai-assisted-architecture#27 (decided: a copy of each standard in each skill). Each skill holds the standards in its discovery table under `references/standards/`, a workspace copy still wins, and `scripts/sync-skill-standards.mjs --check` in CI keeps the copies equal to `standards/`. Every architecture skill still runs the `model` skill's doctor to find its artefact locations, the one tie left between skills |
| 2b | Done, merged 11 October 2026 as dermot-obrien/ai-assisted-research#12 (decided: merge). Ten research skills and `research-dag` are one skill, `research` 3.0.0, with eleven flows; `literature-discovery` stays separate; AI-Assisted Research 2.0.0. Its manifest lists the eleven old names in `retired_skills`, which this repository's engine honours since #59 |
| 2c | Done for three workspaces, 11 October 2026. `skills.mjs sync` (#60, with the lock fixes for mirrors and `--from` in #61) installs a committed `.agents/skills.json` and pins it in `.agents/skills.lock.json`. patternode-business (#91, #92) and patternode-architecture (#133, #136) use it, the architecture site's deploy running `sync --locked`; patternode-platform's session start switches in #476, which keeps `ai-assisted-architecture` as an npm library for `graphVerification`. Life Guide is left: it needs a session that can reach `patternode/life-guide-internal` |
| 3 to 4 | Not started |
