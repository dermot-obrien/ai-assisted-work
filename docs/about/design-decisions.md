# Design Decisions

Key design decisions for AI-Assisted Work.

## DD-01: Domain-Agnostic Design

### Context

Work management patterns are similar across domains but often get coupled to specific project types.

### Decision

Keep all agents and templates **completely domain-agnostic**:

- No architecture-specific terminology
- No development-specific assumptions
- No research-specific patterns

### Rationale

- Maximizes reusability
- Enables embedding in any project
- Reduces maintenance burden
- Single source of truth for work management

### Consequences

- Domain-specific extensions live in domain repositories
- Templates are generic (users add specificity)

---

## DD-02: Independent Clone, Installed In

> **Superseded 2026-09.** The original decision was submodule-first. See the revision below.

### Context

Need to share agents across repositories without duplication, in organisations where npm
registry access is often restricted but git and GitHub access are not.

### Decision

AAW is an **independent clone**, not a submodule, and installs itself into a workspace:

```
domain-project/
├── .ai-assisted-work/     # Independent clone (or elsewhere on disk)
│   ├── skills/            # Agent Skills — the maintained definitions
│   └── packages/          # CLI, installer, protocol
├── .agents/skills/        # Installed skills (generated)
└── change/work-items/     # Domain work items
```

`aaw install` copies the skills into the workspace. One clone can serve several workspaces;
each records the source path in its own `.aaw-config.yaml`.

### Rationale

- **The clone is the single source of truth**, and the installed copy is generated. Workspaces
  should gitignore the installed skills rather than track them, or the same content ends up in
  several repos and drifts.
- Submodules coupled the consuming repo's history to AAW's, needed `--init` and `--remote`
  discipline that teams routinely got wrong, and offered nothing the clone does not.
- npm git-dependency (`npm i github:dermot-obrien/ai-assisted-work`) works for teams that want
  it, without needing registry access, because `bin/aaw.js` is a committed bundle.

### Revision history

| Date | Decision |
|------|----------|
| 2026-02 | Submodule-first |
| 2026-09 | Independent clone plus `aaw install`; submodules no longer recommended |

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Git submodule | Couples consuming repo history; error-prone update ritual; no benefit over a clone |
| Copy-paste | No update path |
| Monorepo | Too coupled |

---

## DD-03: File-Based Work Tracking

### Context

Work items need tracking without requiring external tools.

### Decision

Track work in files within the repository:

```
work/WI-001/
├── scope.md           # Human-readable scope
├── plan.md            # Human-readable plan
└── progress.yaml      # Machine-readable status
```

### Rationale

- Version controlled with the work
- AI agents can read and update
- No external dependencies
- Portable across tools and organizations

### Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| Portable | No real-time collaboration |
| Version controlled | Manual sync with PM tools |
| AI-readable | Less rich than dedicated tools |

---

## DD-04: Single-Responsibility Agents

### Context

Agents need clear, predictable behavior.

### Decision

Each agent has **one clear purpose**:

| Agent | Single Purpose |
|-------|----------------|
| Start Work | Initialize work item structure |
| Progress Work | Execute tasks, update progress |
| Work Status | Report current status |
| Next Task | Identify the next task to work on |

### Rationale

- Easier to test and validate
- Predictable behavior
- Composable for complex workflows
- Clear documentation

---

## DD-05: Tool-Neutral Instructions

### Context

Users have different AI tools (Cursor, Claude Code, Copilot).

### Decision

Write agent instructions that work with **any AI tool**:

- Markdown-based instructions
- No tool-specific syntax in core
- Cursor rules as optional layer

### Rationale

- Maximum compatibility
- Users choose their tools
- Future-proof as tools evolve

### Implementation

Originally a canonical instruction file plus a per-tool wrapper. Since 2026-09 the wrappers are
unnecessary: the Agent Skills format is itself tool-neutral, so one definition is the artefact
every tool reads. See DD-10.

```
skills/
├── aaw-start-work/
│   ├── SKILL.md            # the definition every tool reads
│   ├── references/         # loaded on demand
│   └── assets/templates/
└── aaw-progress-work/
    └── ...
```

---

## DD-06: YAML for Machine-Readable State

### Context

AI agents need to read and update work status.

### Decision

Use **YAML** for machine-readable state (`progress.yaml`):

```yaml
version: 1
status: in_progress
activities:
  - id: A1
    status: completed
    tasks:
      - id: T1
        status: completed
```

### Rationale

- Human-readable
- AI-parseable
- Git-friendly diffs
- Schema-validatable

### Alternatives Considered

| Format | Rejected Because |
|--------|------------------|
| JSON | Less human-readable |
| Markdown | Harder to parse reliably |
| Database | External dependency |

---

## DD-07: Permissive Dual Licence (CC BY 4.0 + Apache-2.0) via REUSE 3.3

### Context

Repository contains both code (TypeScript / JavaScript / build scripts) and content (Markdown skill definitions, YAML templates, agent shims). Each kind needs a licence that fits its medium and that contributors can apply mechanically.

The previous v1 model used AGPL-3.0 + Commercial + CC BY 4.0 — a copyleft-with-paid-escape-hatch arrangement intended to monetise commercial use. In practice this:

- Discouraged adoption: many organisations refuse AGPL outright, regardless of how the framework is used.
- Created friction for the framework's actual use case (instructions consumed by an AI agent), where AGPL's "network use as distribution" clause has unclear application.
- Burdened the maintainer with licence-grant correspondence for legitimate commercial use cases.
- Was inconsistent with the framework's own goal (broad reuse).

### Decision

Permissive dual licence, governed by SPDX identifiers and REUSE 3.3:

- **CC BY 4.0** for content — documentation, skill definitions, agent shims, templates, examples, diagrams (Markdown, YAML, JSON, CSV, images).
- **Apache-2.0** for code — TypeScript, JavaScript, build scripts under `packages/`, `bin/`, and root build files.

Per-file licensing is declared via:

- Inline SPDX headers in source code files (`SPDX-FileCopyrightText`, `SPDX-License-Identifier`).
- Bulk `REUSE.toml` rules at the repository root for content where inline headers are impractical.

A `LICENSE` file at the root explains the model in plain language; full licence texts live in `LICENSES/`.

### Rationale

- **Permissive removes the largest adoption barrier.** AGPL was the single most-cited reason organisations declined to evaluate the framework. CC BY 4.0 and Apache-2.0 are universally accepted in corporate, academic, and government contexts.
- **Two licences, one file each, machine-checkable.** REUSE 3.3 was designed for repositories with mixed asset types. SPDX headers make licensing decisions visible at the file level and verifiable by tooling.
- **Apache-2.0 carries an explicit patent grant** — important for code that ships in commercial products.
- **CC BY 4.0 is the correct fit for the content half.** Skill definitions and templates are creative works, not source code; CC BY 4.0 was designed for them.
- **Attribution-only model preserves the recognition the maintainer cares about** without the enforcement burden of copyleft.
- **Trademark protection is handled separately** in the LICENSE file — names and logos are not part of the licence grant, so forks can use the framework freely without diluting the brand.

### Trade-offs

| Benefit | Trade-off |
|---|---|
| Maximum adoption | No copyleft "give back" requirement |
| No commercial-licence sales pipeline | No revenue from commercial use |
| Simpler contribution process | Contributors should add SPDX headers to new code |
| Standard tooling (REUSE) catches violations early | Light upfront effort to set up `REUSE.toml` |

The maintainer's intent for v2 is broad framework adoption, not licence-fee revenue. The trade-off is consistent with that goal.

### Consequences

- Existing v1 forks that rely on AGPL retain that licence in their own copies; the v2 licence change applies forward, not retroactively to past releases.
- A migration note in CHANGELOG.md captures the change for users tracking the project.
- New contributions must include SPDX headers on new code files (covered in CONTRIBUTING.md).

---

## DD-08: Contribution Model

### Context

Need to enable community contributions while maintaining quality.

### Decision

Open contribution model with quality gates:

1. Issues for discussion
2. PRs for contributions
3. Domain-agnostic requirement
4. Maintainer review

### Rationale

- Low barrier to contribute
- Quality through review
- Community can improve foundation
- Domain-specific stays in domain repos

---

## DD-09: Template Extensibility

### Context

Organizations need to customize templates.

### Decision

Base templates with clear extension points:

```markdown
---
# Core fields (don't modify)
id: "{ID}"
status: "{STATUS}"

# Extension point (add your fields)
# org_metadata:
#   your_field: ""
---
```

### Rationale

- Core structure maintained
- Organizations add fields
- Upgrades don't break extensions
- Clear boundary

---

## DD-10: Agent Skills as the Distribution Format

### Context

AAW originally shipped each workflow as a canonical Markdown instruction file plus one thin
shim per AI tool, because every tool had its own incompatible layout and the only portable
artefact was a pointer.

Anthropic released the Agent Skills format as an open standard in December 2025. It is now
stewarded by the Agentic AI Foundation, a Linux Foundation project, and `.agents/skills/` is
read natively by OpenAI Codex, Cursor, GitHub Copilot, VS Code and Gemini CLI.

### Decision

Ship each workflow as a standalone **Agent Skill**: a directory holding a `SKILL.md` with
`name` and `description` frontmatter, plus optional `references/`, `scripts/` and `assets/`.

`aaw install` places them at `.agents/skills/<name>/` and links `.claude/skills/<name>` at the
same directory, because Claude Code reads only `.claude/skills/`.

### Rationale

- **The premise behind the shim is gone.** The portable artefact is now the skill itself.
- **Shims cost model invocation.** The Claude, Cursor and Copilot shims carried no
  `description`, so those tools could only run AAW when the user typed the slash command. A
  skill's description lets an assistant reach for it when a request matches.
- **Shims defeat progressive disclosure.** A shim points at one large instruction file read
  whole on every invocation. A skill loads its name and description at startup, its body on
  activation, and its references only when a branch needs them.
- **One definition, not five.** Twenty-five hand-maintained shim files became five skills.

### Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| One definition for every tool | Claude Code needs a link, since it does not read `.agents/skills/` |
| Model invocation, not just slash commands | Descriptions must be written carefully, since they are the whole trigger surface |
| Progressive disclosure | Long procedures must be split into `references/`, which is more authoring work |
| Self-contained and droppable | Shared templates are bundled per skill, so a few small files are duplicated |

A workspace also configured for Claude Code may list each skill twice in Cursor and Copilot,
which read both paths. Because the second is a link to the first, both entries are the same
content.

### Consequences

- The per-tool shims under `skills-for-agents/` and the instruction files under
  `packages/skills/work-management/` were removed in 3.0.0, and the shim machinery itself in
  3.1.0 once AI-Assisted Architecture and AI-Assisted Research had both migrated and nothing
  declared `shims` any more. Gone with it: the `shims` and `source_token` manifest keys, the
  `source_token` rewrite that existed only to keep shim pointers resolving, and a second copy
  of the same copy-and-rewrite machinery in the interactive bootstrap.
- What remains is the install-time sweep that removes shims a framework previously wrote.
  That is a migration aid rather than shim support, and it can go once no workspace predates
  the migration. `aaw install` sweeps
  away shims it previously wrote, since they point at files that no longer exist.
- The reference documentation that lived alongside those instruction files — concepts,
  lifecycle, scaling limits, work-type notes, agent boundary rules — moved to `docs/concepts/`
  rather than being deleted with them.
- Skills are validated against the spec with `skills-ref validate`.

## DD-11: Skill Bundles, Versioned Skill Identifiers and a Layered Ontology

### Context

DD-10 made each workflow an Agent Skill. Since then, general-purpose skills have left the
frameworks for repositories of their own: `markdown-deck` and `model` left AAW, and `pattern`
left AI-Assisted Architecture (AAA), for the markdown-deck, diagram-model and
architecture-pattern repositories. Quarter planning is following, into a delivery-planning
repository. Doing that exposed seven things the frameworks had left implicit:

1. A skill declared what it needed by name alone (`x-skill-requires: "model@^0.6.0"`), with
   no owner or repository, so two repositories shipping a skill of the same name were
   indistinguishable.
2. Where an identifier did name a repository, it named the hosting service too
   (`github.com/<owner>/<repo>`), so moving to another host or an internal mirror would have
   changed every identifier.
3. Versions and release tags belonged to the repository (`diagram-model--v0.6.0`), not to
   the skill it held, and the only packaging that resolved dependencies was one agent's
   plugin system, which treated the whole repository as one package.
4. The Agent Skills specification has no namespace. A skill installs at
   `.agents/skills/<name>`, so two skills with the same name cannot be installed side by
   side, whatever repository each came from.
5. The concepts AAW originated were defined elsewhere. WorkItem and Activity were defined in
   each workspace's own schema, Initiative in AAA's base ontology, and AAW itself held only
   TypeScript types (`packages/protocol/src/schema.ts`) that had fallen behind its own
   skills: they carry no `work_item_level` and no `produces`.
6. Delivery-planning concepts (programmes, milestones, gates, commitments) sat in AAA's base
   ontology, so the architecture framework defined the delivery vocabulary that architecture
   work depends on, which is the dependency inverted.
7. Two installers existed: `aaw install` for the frameworks and a per-workspace script for
   the standalone repositories.

### Decision

Nothing below depends on a particular agent or a particular hosting service. Where an agent
or host has its own packaging, that packaging is an adapter generated from what is decided
here, never the source of it.

**Bundles.** A bundle is one version-controlled repository holding one or more skills under
`skills/<name>/`, an optional ontology module under `ontology/`, and a bundle manifest,
`bundle.json`, at its root. The manifest names the bundle, lists each skill with its version
and its requirements, names each ontology module with its version, and states the bundle's
licence and lineage. It is the only source of that information: an agent's plugin or
marketplace file, where an agent has one, is generated from it. A bundle declares its
dependencies on other bundles' skills and ontology modules, never on a framework being
installed. The frameworks are bundles too: AAW, AAA and AI-Assisted Research (AAR) are
bundles that happen to hold several skills.

**Identifiers are URIs, and say nothing about where a skill is hosted.** A skill is
identified by a Package URL (purl, ECMA-427) of the `generic` type, with the owner and the
bundle as its namespace and the skill as its name:

```
pkg:generic/<owner>/<bundle>/<skill>@<version>
pkg:generic/dermot-obrien/diagram-model/model@0.6.0
```

The `generic` type names no registry and no host. The same skill keeps the same identifier
whether its bundle lives on GitHub, another Git host, an internal mirror or an archive. Where
a bundle is fetched from is resolution, not identity: an installer maps an owner, or an
owner and bundle, to a base location through a source map the workspace configures, and a
default entry covers the public source. Moving host or adding a mirror changes one source
map entry and no identifier.

A requirement is an identifier without its version, followed by a Semantic Versioning range,
comma separated in `metadata.x-skill-requires`:

```
x-skill-requires: "pkg:generic/dermot-obrien/diagram-model/model ^0.6.0, pkg:generic/dermot-obrien/markdown-deck/markdown-deck ^0.6.0"
```

Ranges use the familiar `^`, `~` and comparison forms of Semantic Versioning. When the
Version Range Specifier (VERS) completes standardisation beside purl, ranges may also be
written in its `vers:semver/...` form, which states the same constraint. A bare skill name
is allowed only for a skill in the same bundle.

**Versions.** Each skill is versioned with Semantic Versioning in `metadata.version` and in
the bundle manifest, and the two must agree. The bundle has no version of its own: two
version streams for one release would drift. A framework that also ships code, such as
AAW's installer and protocol packages, versions that code separately, as it does today. A
release of a skill is tagged `<skill>--v<version>` in its repository, so a bundle holding
several skills releases each independently. Where an agent's packaging versions packages,
its adapter packages each skill separately, so the agent sees the skill's version.

What is a breaking change is stated, not assumed. A major version, or a minor version before
1.0.0, is required for any of:

- renaming the skill
- removing or renaming a binding in `inputs.toml`, or making an optional one required
- removing or renaming a field, file or identifier shape the skill reads (its data contract)
- removing or changing the meaning of a command-line option or command
- changing the shape or location of a file the skill writes
- a new major version of an ontology module the skill depends on

A requirement states a range. An installation pins an exact commit, so a build is
reproducible and moves only when someone moves the pin.

**Skill names.** An identifier distinguishes skills; it does not let two skills of one name
be installed together, because the install path is the name. Skill names are unique across
the bundles a workspace installs. Families use a prefix (`aaw-`, `aaa-`); a standalone skill
takes a distinctive name. Generic names already published (`model`, `pattern`) are debt,
renamed at their next major version with the old name kept as an alias for one release.

**Ontology layering.** Each bundle that defines domain concepts publishes them as a JSON
Schema module. A module's `$id` is a purl in the same form, naming the module as a component
of its bundle, such as `pkg:generic/dermot-obrien/ai-assisted-work/work-ontology@1.0.0`. It
identifies the module and is resolved from the installed bundle, never fetched from a host.
Modules reference each other by `$ref` and never copy a definition. The layers, each
depending only on those beneath it:

| Layer | Bundle | Holds |
|---|---|---|
| Work | AAW | WorkItem, Activity, Task, Initiative, Deliverable, Stakeholder, and the shared primitives (external references, notes) |
| Delivery | delivery-planning | Epic and story as profiles of WorkItem and Activity, the work plan, capacity and resourcing, deliverable types, products and feature requests, programmes, milestones, gates, commitments and slips |
| Architecture | AAA | Capabilities, platforms, building blocks, interfaces and integrations, patterns, decisions, risks, controls, standards, views |

A higher layer extends a lower one's types with `allOf`, adding its fields, rather than
redefining them. An epic is a WorkItem whose `work_item_level` is `epic`, with the planning
fields added; a story is an Activity with its page route and request references added. A
workspace composes the modules it uses into its active schema and adds its own extensions.

A bundle depends on another bundle's ontology module, not on that framework being installed.
A skill reads data through its own documented data contract, so it runs in a workspace that
produces the data some other way.

**One installer.** A single installer reads bundle manifests, resolves identifiers through
the workspace's source map at their pinned commits, installs into `.agents/skills`, links
the directory each configured agent reads (`.claude/skills` for Claude Code, for example),
and reports drift. It knows agents only as a list of directories to link. It replaces both
the skills wiring in `aaw install` and the per-workspace script.

#### The manifest

`bundle.json` is defined by `schemas/bundle.schema.json` in AAW, whose `$id` is
`pkg:generic/dermot-obrien/ai-assisted-work/bundle-schema@1.0.0`. It holds the bundle's
`name`, `owner`, `description`, `license` (an SPDX expression), `homepage` and optional
`derived_from`; each skill's `name`, `path`, `version`, `purl`, `requires` (each a purl
without its version, and a `range`) and optional `check`; an optional `ontology` module
(`id`, `path`, and the modules it `extends`, each a purl and a range); and optional
`adapters`, each an agent packaging's file, such as `claude-plugin` for a Claude Code
marketplace. `scripts/validate-bundle.mjs` checks a manifest against the schema and against
the skills: versions and requirements equal each `SKILL.md`'s, purls are formed from the
fields, every skill directory is listed, the ontology module's `$ref`s resolve to modules it
declares, and adapters list each skill at its version. A module references another by its
purl without a version (`pkg:generic/dermot-obrien/ai-assisted-work/work-ontology#/$defs/WorkItem`),
and `extends` states the range, so a minor release of the lower layer changes no reference.

#### Post-install check

Every skill should declare a `check` in the manifest: a command, as an argument vector
relative to the installed skill's directory, with the `runtime` it needs. An installer runs
each installed skill's check straight after installing it, and on demand, such as from a
skills check command. The contract:

- It runs from the workspace root, the repository the skills are installed into, with
  `SKILL_DIR` set to the installed skill's directory.
- Exit 0: the skill and the workspace configuration it depends on are correct. Exit 1:
  problems, each printed as one line saying what is wrong, where, and how to fix it. Exit 2:
  a usage or environment error, such as a missing runtime.
- It is fast, offline and read-only. It never requires an optional tool: an optional tool's
  absence is a warning, and the exit stays 0.

A bundle without checks is valid, but discouraged: a skill whose configuration is wrong
otherwise fails the first time someone uses it, far from the install that caused it.

### Rationale

- **An identifier should outlive its host.** A purl of the `generic` type names an owner, a
  bundle, a skill and a version, and nothing about where the bytes live, so a repository can
  move, or be mirrored inside an organisation, without a single reference changing.
- **A standard beats a convention.** Purl is an Ecma standard (ECMA-427) already used by
  software bills of materials (CycloneDX, SPDX) and vulnerability databases, so skills
  identified this way fit the tooling organisations use to inventory what they run.
- **No agent is the source of truth.** Agent Skills is read by many agents, and each packages
  plugins differently, if at all. A neutral manifest, with generated adapters, keeps every
  agent equal and lets a new one be supported by writing an adapter.
- **A repository is a unit of release and ownership, not of meaning.** Planning skills for a
  sprint, an increment and a year share one data model and travel together, so they belong
  in one bundle, yet each has consumers of its own and a version of its own.
- **Per-skill versions keep a dependency honest.** A requirement on `model ^0.6.0` should not
  move because an unrelated skill in the same repository shipped a breaking change.
- **Concepts belong where they originate.** Work items, activities, tasks and initiatives are
  general work management, AAW's domain (DD-01). Delivery planning specialises them for
  delivering technology; architecture work builds on both. Defining each once, where it
  began, ends parallel definitions drifting apart.
- **Depending on a schema rather than a framework keeps skills portable.** A team can use the
  delivery-planning skills without adopting AAW's workflow, as long as its data meets the
  contract.

### Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| Identifiers survive a move of host or a mirror | A purl is longer than a bare name, and an installer needs a source map to resolve it |
| One standard format, understood by inventory tooling | `generic` purls are not resolved by any public registry; the source map does that job |
| No agent or host is privileged | Each agent's packaging needs an adapter, generated from the manifest |
| Skills version and release independently | More tags, and one agent package per skill rather than per repository |
| Breaking changes are defined | Every skill must keep its data contract and bindings documented |
| Concepts are defined once, where they originate | AAW must publish and maintain a real schema, and AAA's base loses types its consumers use today |
| Skills do not require a framework | A bundle's ontology module is a second artefact to version beside its skills |

### Alternatives considered

- **Hosting URLs as identifiers** (`github.com/<owner>/<repo>/skills/<skill>`): the form
  existing installers accept, but it ties identity to one host.
- **A purl of a host-specific type** (`pkg:github/...`): standard, but still names the host.
- **A domain the owner controls, redirecting to the current host**, as Go's vanity import
  paths do: host-independent, but it needs a domain and a redirect service kept running, and
  an identifier that fails to resolve when that service is down.
- **`tag:` URIs (RFC 4151)**: stable and host-independent, but not recognised by any
  inventory tooling.

### Prerequisites and open points

- AAW's ontology module must exist before anything references it. It becomes the source of
  truth for the work layer, `packages/protocol/src/schema.ts` is generated from it or
  checked against it, and the `progress.yaml` templates are tested against it. Done:
  `schemas/work.schema.json`, `work-ontology@1.0.0`; `scripts/check-protocol-schema.mjs`
  compares `schema.ts` with it and `scripts/test-work-schema.mjs` tests the templates, both
  in CI.
- "Deliverable" and "product" must be disambiguated before the modules split. AAW's
  Deliverable is what a work item produces. Delivery's typed, sized deliverable extends it.
  A registered product that consumers use and raise feature requests against is a delivery
  concept, not AAW's. Settled so: the work module defines Deliverable and has no product.
- AAW's `WorkType` enumerates domains (development, architecture, consultancy), against
  DD-01. It becomes open, with each bundle contributing its values. Done, without breaking
  anything: the four values stay valid, and a layer adds `<prefix>:<value>` (such as
  `delivery:enabler`) or a workspace `x-<value>`.
- AAA's base ontology moves Initiative to the work layer and the programme and delivery types
  to the delivery layer. That is a breaking change to AAA's schema and ships as a major
  version with a migration note.
- The `bundle.json` schema is defined, with AAW as its first user, before other bundles adopt
  it. Done: `schemas/bundle.schema.json`, and AAW's own `bundle.json`.

### Consequences

- The standalone bundles gain `bundle.json`, their `x-skill-requires` moves to purl
  requirements, and their tags to `<skill>--v<version>`, at each skill's next release. Their
  existing agent packaging is regenerated from the manifest.
- The delivery-planning bundle ships the `quarter-planning` skill with a documented data
  contract first, and its ontology module once AAW's work module exists.
- `aaw install` keeps working until the single installer replaces its skills wiring.
- A workspace that mirrors bundles configures one source map entry; no identifier changes.
- Each extraction records its lineage in the new bundle's `NOTICE`, in its manifest, and in
  each `SKILL.md` as `metadata.x-derived-from`, the source path at the source commit.

---

## Decision Log

| ID | Decision | Date | Status |
|----|----------|------|--------|
| DD-01 | Domain-Agnostic Design | 2026-02 | Implemented |
| DD-02 | Independent Clone, Installed In | 2026-09 | Implemented (supersedes the 2026-02 submodule-first model) |
| DD-03 | File-Based Tracking | 2026-02 | Implemented |
| DD-04 | Single-Responsibility | 2026-02 | Implemented |
| DD-05 | Tool-Neutral | 2026-02 | Implemented |
| DD-06 | YAML for State | 2026-02 | Implemented |
| DD-07 | Permissive Dual Licence (CC BY 4.0 + Apache-2.0) | 2026-05 | Implemented (v2.0; supersedes the v1 AGPL-3.0 + Commercial model) |
| DD-08 | Contribution Model | 2026-02 | Implemented |
| DD-09 | Template Extensibility | 2026-02 | Implemented |
| DD-10 | Agent Skills as the Distribution Format | 2026-09 | Implemented |
| DD-11 | Skill Bundles, Versioned Skill Identifiers and a Layered Ontology | 2026-09 | Accepted; manifest, checks and work module implemented |
