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

## DD-11: Skill Bundles, Versioned Skill References and a Layered Ontology

### Context

DD-10 made each workflow an Agent Skill. Since then, general-purpose skills have left the
frameworks for repositories of their own: `markdown-deck` and `model` left AAW, and `pattern`
left AI-Assisted Architecture (AAA), for the markdown-deck, diagram-model and
architecture-pattern repositories. Quarter planning is following, into a delivery-planning
repository. Doing that exposed six things the frameworks had left implicit:

1. A skill declared what it needed by name alone (`x-skill-requires: "model@^0.6.0"`), with
   no repository, so two repositories shipping a skill of the same name were
   indistinguishable.
2. Versions and release tags belonged to the repository (`diagram-model--v0.6.0`), not to
   the skill it held, and a Claude Code plugin was the whole repository.
3. The Agent Skills specification has no namespace. A skill installs at
   `.agents/skills/<name>`, so two skills with the same name cannot be installed side by
   side, whatever repository each came from.
4. The concepts AAW originated were defined elsewhere. WorkItem and Activity were defined in
   each workspace's own schema, Initiative in AAA's base ontology, and AAW itself held only
   TypeScript types (`packages/protocol/src/schema.ts`) that had fallen behind its own
   skills: they carry no `work_item_level` and no `produces`.
5. Delivery-planning concepts (programmes, milestones, gates, commitments) sat in AAA's base
   ontology, so the architecture framework defined the delivery vocabulary that architecture
   work depends on, which is the dependency inverted.
6. Two installers existed: `aaw install` for the frameworks and a per-workspace script for
   the standalone repositories.

### Decision

**Bundles.** A bundle is one repository holding one or more skills under
`skills/<name>/`, an optional ontology module under `ontology/`, and a manifest. A bundle
declares its dependencies on other bundles' skills and ontology modules, never on a
framework being installed. The frameworks are bundles too: AAW, AAA and AI-Assisted Research
(AAR) are bundles that happen to hold several skills.

**Skill references.** A skill is identified by its bundle and its name, as a path:

```
<host>/<owner>/<repo>/skills/<skill>@<range>
github.com/dermot-obrien/diagram-model/skills/model@^0.6.0
```

It is the path `npx skills add`, `gh skill install` and a repository browser already use.
`metadata.x-skill-requires` in `SKILL.md` carries full references, comma separated. A bare
name is allowed only for a skill in the same bundle. A mirror replaces `<host>/<owner>`, so
a reference survives a move to an internal host.

**Versions.** Each skill is versioned with Semantic Versioning in `metadata.version`. The
bundle has no version of its own: two version streams for one release would drift. A
framework that also ships code, such as AAW's installer and protocol packages, versions that
code separately, as it does today. A release of a skill is tagged `<skill>--v<version>`, so
a bundle holding several skills tags each independently. Each skill is its own Claude Code
plugin, named after the skill, in one marketplace per bundle, so a plugin's version and tag
are the skill's.

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

**Skill names.** A reference identifies a skill; it does not let two skills of one name be
installed together. Skill names are unique across the bundles a workspace installs.
Families use a prefix (`aaw-`, `aaa-`); a standalone skill takes a distinctive name. Generic
names already published (`model`, `pattern`) are debt, renamed at their next major version
with the old name kept as an alias for one release.

**Ontology layering.** Each bundle that defines domain concepts publishes them as a JSON
Schema module with its own `$id` and Semantic Version. Modules reference each other by
`$ref` and never copy a definition. The layers, each depending only on those beneath it:

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

**One installer.** A single installer reads bundle manifests, resolves skill references at
their pinned commits, honours a configured mirror, installs into `.agents/skills` with
`.claude/skills` linked, and reports drift. It replaces both the skills wiring in
`aaw install` and the per-workspace script.

### Rationale

- **A repository is a unit of release and ownership, not of meaning.** Planning skills for a
  sprint, an increment and a year share one data model and travel together, so they belong
  in one bundle, yet each has consumers of its own and a version of its own.
- **A path reference is the form the tools already use,** so it costs no new convention and
  maps directly onto a clone URL and a mirror.
- **Per-skill versions keep a dependency honest.** A requirement on `model@^0.6.0` should not
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
| A skill is unambiguous across bundles and mirrors | References are longer than bare names |
| Skills version and release independently | More tags, and one plugin per skill rather than per repository |
| Breaking changes are defined | Every skill must keep its data contract and bindings documented |
| Concepts are defined once, where they originate | AAW must publish and maintain a real schema, and AAA's base loses types its consumers use today |
| Skills do not require a framework | A bundle's ontology module is a second artefact to version beside its skills |

### Prerequisites and open points

- AAW's ontology module must exist before anything references it. It becomes the source of
  truth for the work layer, `packages/protocol/src/schema.ts` is generated from it or
  checked against it, and the `progress.yaml` templates are tested against it.
- "Deliverable" and "product" must be disambiguated before the modules split. AAW's
  Deliverable is what a work item produces. Delivery's typed, sized deliverable extends it.
  A registered product that consumers use and raise feature requests against is a delivery
  concept, not AAW's.
- AAW's `WorkType` enumerates domains (development, architecture, consultancy), against
  DD-01. It becomes open, with each bundle contributing its values.
- AAA's base ontology moves Initiative to the work layer and the programme and delivery types
  to the delivery layer. That is a breaking change to AAA's schema and ships as a major
  version with a migration note.

### Consequences

- `x-skill-requires` in the standalone bundles moves to full references, and their tags to
  `<skill>--v<version>`, at each skill's next release.
- The delivery-planning bundle ships the `quarter-planning` skill with a documented data
  contract first, and its ontology module once AAW's work module exists.
- `aaw install` keeps working until the single installer replaces its skills wiring.
- Each extraction records its lineage in the new bundle's `NOTICE` and in each `SKILL.md`
  as `metadata.x-derived-from`, the source path at the source commit.

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
| DD-11 | Skill Bundles, Versioned Skill References and a Layered Ontology | 2026-09 | Accepted; not yet implemented |
