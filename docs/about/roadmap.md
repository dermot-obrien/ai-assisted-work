# Roadmap

Development roadmap for AI-Assisted Work.

## Current state (6.0.0)

The repository holds one standalone Agent Skill, `work`, and `bin/skills.mjs`, a zero-dependency installer for standalone skills from any bundle. The framework that came before it (the `aaw` command, the install engine, the protocol and CLI packages) was removed in 5.0.0; its last commit is tagged `v4.0.0`. See [CHANGELOG.md](../../CHANGELOG.md).

### Shipped, and still here

- [x] Agent Skills: every workflow a standalone `SKILL.md` directory (DD-10)
- [x] `work_item_level` (workstream / epic) and product-based planning (`schema_version` 3)
- [x] Optional `deliverables_register` config key for a deliverable type catalogue
- [x] `.aaw-config.yaml` as the one workspace file, now optional
- [x] Single `WI-NNN` and `IN-NNN` ID series (public/private split removed)
- [x] The work ontology, now inside the work skill (`skills/work/assets/work.schema.json`)

### Shipped in the framework, removed in 5.0.0

- `@aaw/protocol`, `@aaw/installer` and `@aaw/cli`, with the `local-fs` backend and `bin/aaw.js`
- `aaw install`, including its sweep of the per-tool shims removed in 3.0.0
- `aaw status`, `aaw lint`, `aaw verify`, `aaw claim`, `aaw release`, `aaw next-task`, `aaw runner start` and `aaw migrate v1`

### Withdrawn in 5.0.0

These were planned for the framework and will not be built in this form:

- Publishing the packages to npm, and `npx @aaw/cli install`
- Cloud mode: a coordinator on Cloud Run and Firestore, a web console, a headless runner, and backends for GitHub Projects and Temporal

---

## Next: the plan outside the code repository

The work plane (work items, activities, tasks) is separate from the architecture plane
(repositories, modules, domains), so a work item should not live inside one code repository.

- [ ] Pull requests labelled with their work item, activity and task, and an activity done
  only when every pull request against it has merged
- [ ] A standing activity per area for issues and suggestions not yet planned

## Skills extracted, AI-Assisted Work as a bundle (WI-004, WI-005)

- [x] The five work-item skills merged into one `work` skill, with no dependency between skills (4.0.0)
- [x] One installer for bundles and single skills, from a repository, a mirror or a local folder, with a lock file (`bin/skills.mjs`)
- [x] This repository as a bundle: README, `bundle.json` pointing at the skill repositories, the installer (4.0.0)
- [x] Framework scaffolding removed: `bin/aaw.js`, `packages/`, `framework.manifest.yaml`, the npm workspace, changesets and the release workflow; `bundle.json` lists only the skills held here (5.0.0, WI-005 step 3)
- [ ] Rename the repository or move the skills out, and decide where `skills.mjs` lives (WI-005 step 4, undecided)

## Long-term

- [ ] First-class budget-aware scheduler (concurrency caps + optional token budgeting)

---

## How to influence

- File issues at <https://github.com/dermot-obrien/ai-assisted-work/issues>
- See [CONTRIBUTING.md](../../CONTRIBUTING.md)
- The `change/work-items/` folder shows live, in-flight items against this roadmap
