# Roadmap

Development roadmap for AI-Assisted Work.

## Current State (v2.0)

v2.0 is the working baseline: a TypeScript monorepo with `@aaw/protocol`, `@aaw/cli`, and a `local-fs` backend. One install command, cross-platform, no symlinks. See [CHANGELOG.md](../../CHANGELOG.md) for the full v2.0 entry.

### Shipped in v2.0

- [x] `@aaw/protocol` — schema types and Backend interface
- [x] `@aaw/cli` — Node CLI with `init`, `status`, `verify`
- [x] LocalFsBackend — protocol against the filesystem
- [x] `bin/aaw.js` — self-contained ESM bundle for the submodule install path
- [x] `.aaw-config.yaml` — single source of truth for workspace config
- [x] Single `WI-NNN` and `IN-NNN` ID series (public/private split removed)

---

## Short-term (v2.x)

### v2.1 — npm publish lane

- [ ] Publish `@aaw/cli`, `@aaw/protocol`, `@aaw/skills` to npm under the `@aaw` org
- [ ] `npx @aaw/cli init` works as an alternative to the submodule path
- [ ] Document corporate artifactory proxy patterns in DEPLOYMENT.md

### v2.2 — More CLI commands

- [ ] `aaw claim WI-001-A1` — manual activity claim from the shell
- [ ] `aaw release WI-001-A1` — explicit release after writeback
- [ ] `aaw next-task [WI-NNN]` — what's the next claimable thing
- [ ] `aaw runner start --pool default` — long-lived headless agent runner

### v2.3 — Migration tooling

- [ ] `aaw migrate v1` — move v1's `WI-`/`WIP-` folders into the v2 single-path layout, renumber clashes, update `.gitignore`

---

## Medium-term (v3.x)

### v3.0 — Cloud mode

- [ ] `aaw-coordinator` repo: Cloud Run + Firestore backend implementing `@aaw/protocol`
- [ ] CloudBackend in `@aaw/cli` — `mode: cloud` in `.aaw-config.yaml` flips transport
- [ ] Multi-tenant from day one: tenant IDs, pools, slot budgets
- [ ] Server-side concurrency enforcement via Firestore transactions
- [ ] Cloud Scheduler-driven lock sweeper

### v3.1 — Web console

- [ ] Static SPA on Firebase Hosting; reads via Firestore SDK with security rules
- [ ] Browse state, watch live progress, manage pools and agents

### v3.2 — Headless runner

- [ ] Long-lived Node process subscribing to a cloud pool
- [ ] Containerised image suitable for Cloud Run Jobs, GitHub Actions, homelab
- [ ] Concurrency / token budget reporting via `appendEvent`

---

## Long-term (v4+)

- [ ] GitHubProjectsBackend — protocol against GitHub Issues + Projects
- [ ] Optional Temporal-backed substrate for organisations that already run Temporal
- [ ] Protobuf migration of `@aaw/protocol` once a non-Node consumer arrives
- [ ] First-class budget-aware scheduler (concurrency caps + optional token budgeting)

---

## How to influence

- File issues at <https://github.com/dermot-obrien/ai-assisted-work/issues>
- See [CONTRIBUTING.md](../../CONTRIBUTING.md)
- The `change/work-items/` folder shows live, in-flight items against this roadmap
