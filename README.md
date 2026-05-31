# AI Assisted Work

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](CHANGELOG.md)
[![Licence: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-blue.svg)](LICENSES/CC-BY-4.0.txt)
[![Licence: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSES/Apache-2.0.txt)
[![REUSE 3.3](https://img.shields.io/badge/REUSE-3.3-lightgrey.svg)](https://reuse.software/spec-3.3/)

**Domain-agnostic, reusable AI agents for work management.**

This AI Assisted Work (AAW) method is not opinionated about any specific work management method and uses a simple `Work Item` → `Activity`→ `Task` hierarchy (which can map to `Epic`, `Story` and `Task` in an Agile workflow). Inspired by the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) which is better if you want to specifically align to Agile methods. 

AI Assisted Work provides structured agents that help AI assistants (Cursor, GitHub Copilot, Claude Code) manage complex work items through their lifecycle. It is designed to be included in your projects via Git submodule or copy-paste.

## Key Features

| Category | Agents | Purpose |
|----------|--------|---------|
| **Work Management** | Start, Progress, Status | Manage work items with scope, planning, and progress tracking. Enable multiple agents to work on the same work item without conflict. Support agents continuing to work on a work item after unexpected failures and pick up where the last agent got to. |

## Install

AAW is the **base** framework — [AI-Assisted Architecture](https://github.com/dermot-obrien/ai-assisted-architecture)
and [AI-Assisted Research](https://github.com/dermot-obrien/ai-assisted-research)
install through its engine. Both consumption models below work **without
npm-registry access** (git is enough).

### Option A — npm git-dependency (recommended)

```bash
npm i github:dermot-obrien/ai-assisted-work
npx aaw init          # interactive: tenant, mode, work_items_path, wire tool shims
# or non-interactive (just wire shims for detected tools):
npx aaw install
```

`bin/aaw.js` is a committed, self-contained bundle, so `npm i` pulls **no** registry
packages and needs no build. No submodules to manage.

### Option B — git submodule

```bash
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
git submodule update --init
node .ai-assisted-work/bin/aaw.js init
```

Requires **Node.js 18+** (20+ recommended). Works in corporate environments where the
npm registry is restricted but git+GitHub access is allowed — the bundled CLI ships in
the package/submodule. Cross-platform on macOS, Linux, and Windows. See
[DEPLOYMENT.md](DEPLOYMENT.md).

### `aaw init` vs `aaw install`

- `aaw init` — interactive first-time setup: writes `.aaw-config.yaml` (tenant, mode,
  work-items path) **and** wires shims.
- `aaw install` — non-interactive, manifest-driven shim wiring (reads
  `framework.manifest.yaml`). Re-runnable any time; also the entry AAA/AAR delegate to
  via `aaw install --framework <path>`.

## Available Commands

Once installed, these commands are available in your AI assistant:

| Command | Purpose |
|---------|---------|
| `/aaw-start-work` | Initialize new work items. |
| `/aaw-progress-work` | Continue work on items. |
| `/aaw-work-status` | Report work status. |
| `/aaw-next-task` | Identify the next task to work on. |
| `/aaw-start-initiative` | Create a strategic initiative grouping work items. |

And from the shell (the v2 submodule install does not put `aaw` on your PATH; either type the bundle path, or set up a shell alias — see [DEPLOYMENT.md](DEPLOYMENT.md#shell-alias)):

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
shared install engine + manifest contract), `@aaw/cli` (the `aaw` command), and
`@aaw/skills` (markdown skill definitions).

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

`bin/aaw.js` **is committed** (it ships for the git-only / submodule install paths) —
rebuild and commit it whenever the CLI or installer changes. `packages/*/dist/` and
`node_modules/` are gitignored.

The install behaviour is driven by `framework.manifest.yaml` (see `@aaw/installer`'s
`manifest.ts` for the schema): `shims` (per-tool source→dest), `config` (files seeded
idempotently), `data_dirs`, `tool_setup.python` (pip), `seed` (optional Node seeder),
and `source_token` (rewritten to the real install location so shims resolve whether
the framework is a submodule or in `node_modules`).

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
