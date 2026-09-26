# AI Assisted Work

[![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)](CHANGELOG.md)
[![Licence: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-blue.svg)](LICENSES/CC-BY-4.0.txt)
[![Licence: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSES/Apache-2.0.txt)
[![REUSE 3.3](https://img.shields.io/badge/REUSE-3.3-lightgrey.svg)](https://reuse.software/spec-3.3/)

**Domain-agnostic, reusable AI agents for work management.**

This AI Assisted Work (AAW) method is not opinionated about any specific work management
method. It uses an `Initiative` → `Work Item` → `Activity` → `Task` hierarchy, where a work
item sits at one of two levels:

| Tier | Level | Grain | Agile equivalent |
|------|-------|-------|------------------|
| Initiative | — | A funded body of work | Initiative |
| Work Item | `workstream` | A durable strand inside an initiative. A subject, not a schedule; accretes scope, may never end | — |
| Work Item | `epic` | A bounded slice that lands in one planning period, three months at most | Epic |
| Activity | — | One product advanced to done | Story |
| Task | — | One step inside an activity | Task |

Planning is **product-based**, after PRINCE2: a work item names the products it will leave
behind, declares the order they must be built in, composes its definition of done from them,
and only then derives the activities that produce them. Every activity names the product it
advances. An activity that produces nothing is invalid, because effort with nothing left
behind is motion rather than work.

Inspired by the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) which is better if
you want to specifically align to Agile methods.


AI Assisted Work provides structured agents that help AI assistants (Cursor, GitHub Copilot, Claude Code) manage complex work items through their lifecycle. It is designed to be included in your projects via a local git clone or copy-paste.

## Key Features

| Category | Agents | Purpose |
|----------|--------|---------|
| **Work Management** | Start, Progress, Status | Manage work items with scope, planning, and progress tracking. Enable multiple agents to work on the same work item without conflict. Support agents continuing to work on a work item after unexpected failures and pick up where the last agent got to. |

## Install

AAW is the **base** framework for [AI-Assisted Architecture](https://github.com/dermot-obrien/ai-assisted-architecture)
and [AI-Assisted Research](https://github.com/dermot-obrien/ai-assisted-research)
install through its engine. Both consumption models below work **without
npm-registry access** (git is enough).

### Option A — npm git-dependency (recommended)

```bash
npm i github:dermot-obrien/ai-assisted-work
npx aaw install       # interactive bootstrap: workspace, tenant, mode, work_items_path; then installs the skills
```

`bin/aaw.js` is a committed, self-contained bundle, so `npm i` pulls **no** registry
packages and needs no build. No submodules to manage.

### Option B — local git clone

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/aaw.js install
```

Requires **Node.js 18+** (20+ recommended). Works in corporate environments where the
npm registry is restricted but git+GitHub access is allowed — the bundled CLI ships in
the repository. Cross-platform on macOS, Linux, and Windows. See
[DEPLOYMENT.md](DEPLOYMENT.md).

`aaw install` asks which workspace to install into and defaults to the current workspace.
You can keep one local AAW clone outside your repos and install it into multiple
workspaces; each workspace stores the relative source path in `.aaw-config.yaml` so the
generated shims keep resolving back to the correct AAW clone.

`aaw install` is the canonical setup command. For AAW itself, it runs the full interactive
bootstrap and writes `.aaw-config.yaml` plus shims. For other AAW-family frameworks,
the same command is reused as the shared installer entrypoint via
`aaw install --framework <path>`. `aaw init` is kept as a compatibility alias.

## Agent Skills

AAW ships its workflows as standalone [Agent Skills](https://agentskills.io): a directory
holding a `SKILL.md` (YAML frontmatter plus instructions) alongside its `references/` and
`assets/`. One definition works in every skills-compatible tool.

**Work management**, the framework's own workflows:

| Skill | Location |
|-------|----------|
| `/aaw-start-work` | `skills/aaw-start-work/` |
| `/aaw-progress-work` | `skills/aaw-progress-work/` |
| `/aaw-work-status` | `skills/aaw-work-status/` |
| `/aaw-next-task` | `skills/aaw-next-task/` |
| `/aaw-start-initiative` | `skills/aaw-start-initiative/` |
| `/quarter-planning` | `skills/quarter-planning/` |

**General tooling**, domain-agnostic and useful on their own. They are not work management,
but they are the kind of thing every project needs and nothing about them is specific to one:

| Skill | Does |
|-------|------|
| `markdown-deck` | Renders tagged sections of a Markdown document into HTML slides and a PDF, keeping the Markdown as the only source |
| `model` | Treats a diagram and a document as two views of one model of boxes and lines: extract, emit, validate one against the other, render |
| `thread` | Keeps thought processes untangled across chats, projects, IDEs and machines: a throwaway tree of intents in a git repo you own, which every tool reads and writes |

Neither carries any organisation's branding. `markdown-deck` ships one brand-free theme and
takes an organisation's colours as a **palette** in its binding, so the layout stays with the
skill and the brand stays with the organisation. Both read their repository specifics from
`.agents/skill-bindings.toml` rather than assuming a layout.

Each carries a `description`, so an assistant can invoke it on its own when a request matches
rather than only when you type the slash command. The long-form procedure sits in
`references/` and loads only when that branch is reached.

The per-tool command shims that preceded these were removed in 3.0.0. `aaw install` sweeps
away any it previously wrote, because they point at instruction files that no longer exist.
The reference documentation that lived beside them moved to
[docs/concepts/](docs/concepts/work-management.md).

### Installing

`aaw install` wires the skills. There is nothing else to do:

```bash
node .ai-assisted-work/bin/aaw.js install
```

Skills land in `.agents/skills/<name>/`, which Codex, Cursor, GitHub Copilot, VS Code and
Gemini CLI read natively. Claude Code reads only `.claude/skills/`, so the installer links
`.claude/skills/<name>` at the same directory rather than copying twice: a symlink, or a
directory junction on Windows, which needs neither elevation nor developer mode. Where the
filesystem refuses both it falls back to a copy and says so.

### Keeping the copy honest

The installed copy is writable, so it can be edited in place, and an edit there is lost by
the next install without ever having been reviewed. `check-skills` reports that while the
edit still exists:

```bash
node .ai-assisted-work/bin/aaw.js check-skills
```

With no `--framework` it checks every framework in the workspace's `.aaw-config.yaml`
modules registry, each against the `source_root` recorded when it was installed, and exits
non-zero on any difference, so a workspace can run it beside its own integrity checks. It
reports rather than repairs: an edit to an installed copy either belongs upstream, in which
case move it to the framework and release it, or was an accident, in which case installing
again undoes it.

A skill the workspace itself owns, or one installed by another framework, is left alone.
Only the skills this framework ships are compared.

Verify by typing `/` in your assistant: the five `/aaw-*` skills should appear.

Do not commit the installed skills into a consuming repository. They are generated from this
clone, so gitignore `.agents/skills/aaw-*` and re-run the installer instead.

One caveat worth knowing: Cursor and Copilot read both `.agents/skills/` and `.claude/skills/`,
so a workspace also set up for Claude Code may list a skill twice in those tools. The link
means both entries are the same content.

Validate a skill against the spec with:

```bash
node .ai-assisted-work/scripts/validate-skills.mjs skills
```

### Optional: a deliverables type register

Planning is product-based, so each work item names the products it will leave behind with
their quality criteria and approver. By default those are written inline on each work item,
and a fresh install ships no register.

An organisation that already maintains a catalogue of the things it produces can point AAW at
it, so a type's quality criteria are argued once rather than re-argued per work item. Add to
`.aaw-config.yaml`, either as a plain path:

```yaml
deliverables_register: governance/deliverables/deliverable-types.csv
```

or, when the register's column names differ from AAW's field names, as a map. This is the
usual case: a real register keeps its own shape and should not have to migrate.

```yaml
deliverables_register:
  path: governance/deliverables/architecture-deliverables.csv
  id_column: id
  standard_only: true          # only commit to agreed types
  standard_column: standard_type
  standard_true: "Yes"
  columns:
    name: title
    purpose: purpose
    composition: composition
    quality_criteria: quality_criteria
    quality_tolerance: quality_tolerance
    quality_method: quality_method
    responsibilities: quality_responsibilities
    governance_forum: governance_forum
    system_of_record: system_of_record
    points: base_story_points
```

A product then sets `type` to a register id and inherits the rest, overriding only what
genuinely differs and saying why. Where `standard_only` is set, work items may commit only to
rows the register marks as standard.

The register is a CSV or YAML file. AAW reads `name`, `quality_criteria`, `quality_method` and
`responsibilities` at minimum; the remaining mappings are optional and are surfaced when
present. Unmapped columns are ignored, so a register with more columns than AAW knows about
works unchanged.

AAW ships no register and no schema for one: the catalogue belongs to the organisation and the
config key is the only coupling. The `aaw` CLI does not read this key; the skills parse
`.aaw-config.yaml` directly.

## Available Commands

Once installed, these commands are available in your AI assistant:

| Command | Purpose |
|---------|---------|
| `/aaw-start-work` | Triage a request and, when it earns one, initialize a work item. Agent Skill. |
| `/aaw-progress-work` | Continue work on items. |
| `/aaw-work-status` | Report work status. |
| `/aaw-next-task` | Identify the next task to work on. |
| `/aaw-start-initiative` | Create a strategic initiative grouping work items. |
| `/quarter-planning` | Derive a quarter's budget from the calendar and the resourcing register, allocate it to epics, and keep the plan honest. |

And from the shell (the git-clone install does not put `aaw` on your PATH; either type the bundle path, or set up a shell alias — see [DEPLOYMENT.md](DEPLOYMENT.md#shell-alias)):

```bash
node .ai-assisted-work/bin/aaw.js status            # list work items in this workspace
node .ai-assisted-work/bin/aaw.js status WI-001     # show one with activity/task tree
node .ai-assisted-work/bin/aaw.js verify            # sanity-check the install
```

Once aliased: `aaw status`, `aaw status WI-001`, `aaw verify`.

## Documentation

| Document | Description |
|----------|-------------|
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Step-by-step deployment instructions |
| [Getting Started](docs/getting-started/index.md) | First steps and core concepts |
| [Integration Guide](docs/integration/index.md) | Cursor, Copilot, and Claude Code setup |
| [Command Discovery](docs/integration/command-discovery.md) | How commands work across AI assistants |

## Customization

Fork this repository to customize for your organization. See [Organization Adoption](docs/about/organization-adoption.md) for guidance.

## Development (building from source)

AAW is an npm workspaces monorepo: `@aaw/protocol` (types), `@aaw/installer` (the
shared install engine + manifest contract) and `@aaw/cli` (the `aaw` command). The
Agent Skills are not a package: they live in `skills/` and are placed by `aaw install`.

**Requirements:** Node.js 18+ (20+ recommended) and npm. No other system deps.

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git
cd ai-assisted-work
npm install                                   # install workspace dev deps

# Regenerate the committed bundle (bin/aaw.js). Build order matters — esbuild
# bundles the CLI and inlines @aaw/protocol + @aaw/installer from their dist/:
npm run build --workspace @aaw/protocol
npm run build --workspace @aaw/installer
(cd packages/cli && node build.mjs)           # → bin/aaw.js (commit this)
```

`bin/aaw.js` **is committed** (it ships for the git-only install paths) —
rebuild and commit it whenever the CLI or installer changes. `packages/*/dist/` and
`node_modules/` are gitignored.

The install behaviour is driven by `framework.manifest.yaml` (see `@aaw/installer`'s
`manifest.ts` for the schema): `skills` (the Agent Skills directory), `config` (files
seeded idempotently), `data_dirs`, `tool_setup.python` (pip), and `seed` (an optional
Node seeder). Installed modules record their `source_root` in `.aaw-config.yaml`, so
other frameworks can resolve back to the correct local clone for that workspace.

The `shims` and `source_token` keys are gone. A manifest that still declares them
installs fine; they are simply ignored.

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Licence

This framework is permissively licensed to encourage the widest possible adoption — private, public, academic, and commercial. Attribution is the primary expectation.

- **Documentation, skill definitions, agent shims, templates, examples** ([`CC BY 4.0`](LICENSES/CC-BY-4.0.txt)) — use, share, modify, and redistribute, including commercially, with attribution.
- **Executable code** (`packages/cli/`, `packages/protocol/`, `bin/`, build scripts) ([`Apache-2.0`](LICENSES/Apache-2.0.txt)) — same permissions, with an explicit patent grant.

Per-file licensing is declared via SPDX identifiers and the [`REUSE.toml`](REUSE.toml) manifest, following the [REUSE Specification 3.3](https://reuse.software/spec-3.3/). See [`LICENSE`](LICENSE) for the full overview.

### Trademark

"AI-Assisted Work" and any associated logos are trademarks of Dermot O'Brien. The licences above grant rights to the **content and code** only; they do not grant rights to use these marks. Nominative use ("based on AI-Assisted Work") is welcome; please use a different name for forks or derivative offerings.

## Attribution

Created by **Dermot O'Brien** ([@dermot-obrien](https://github.com/dermot-obrien)).

If you use AI-Assisted Work, attribution is appreciated:

> Built with [AI-Assisted Work](https://github.com/dermot-obrien/ai-assisted-work) by Dermot O'Brien

---

*AI-Assisted Work - Domain-agnostic AI agents for productivity*.
