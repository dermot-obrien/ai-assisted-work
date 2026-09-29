# Contributing to AI-Assisted Work

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Who Can Contribute

This project welcomes contributions from:

- **Individuals** using the agents for personal projects.
- **Organizations** who have adopted the framework.
- **Developers** building AI-assisted tooling.
- **Anyone** who wants to improve AI-assisted work management.

## Ways to Contribute

### 1. Report Issues

- Bug reports for agents or templates.
- Suggestions for improvements.
- Documentation clarifications.

### 2. Improve Agents

- Enhanced agent instructions.
- New agent capabilities.
- Bug fixes in existing agents.

### 3. Add Templates

- Work item templates for specific domains.
- Improved base templates.
- Localized templates.

### 4. Improve Documentation

- Clearer explanations.
- More examples.
- Integration guides.

### 5. Share Experience

- Use cases and examples.
- Tips and best practices.
- Integration patterns.

## Development setup

AAW is an npm workspaces monorepo: `@aaw/protocol` (types), `@aaw/installer` (the shared
install engine and manifest contract) and `@aaw/cli` (the `aaw` command). The Agent Skills
are not a package: they live in `skills/` and `aaw install` places them.

Requirements: Node.js 18 or newer (20 recommended, and what CI uses) and npm. The reference
validator also needs Python 3.12.

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git
cd ai-assisted-work
npm ci

# Build in this order: the CLI bundle inlines @aaw/protocol and @aaw/installer from dist/.
npm run build --workspace @aaw/protocol
npm run build --workspace @aaw/installer
cd packages/cli && npm run bundle && cd ../..    # writes bin/aaw.js
npm test                                          # the CLI's install tests, against bin/aaw.js
```

`bin/aaw.js` is committed, because the git-only install paths run it without a build.
Rebuild and commit it whenever the CLI or the installer changes; CI fails when it is out of
date. `packages/*/dist/` and `node_modules/` are gitignored.

## Checks to run before a pull request

These are what CI runs (see `.github/workflows/ci.yml`). Every command is in the
[command reference](docs/reference/commands.md#repository-scripts).

```bash
node scripts/test-work-schema.mjs                 # progress.yaml templates match the work schema
node scripts/check-protocol-schema.mjs            # protocol types agree with the work schema
node scripts/validate-skills.mjs skills           # Agent Skills specification, links, body size
node scripts/validate-bundle.mjs .                # bundle.json against its schema and the skills
npx tsc -p packages/cli/tsconfig.json --noEmit    # after the builds above
```

The reference validator, as the "Agent Skills reference validator" job runs it:

```bash
python -m venv .venv && . .venv/bin/activate      # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install "skills-ref @ git+https://github.com/agentskills/agentskills#subdirectory=skills-ref"
for d in skills/*/; do skills-ref validate "$d"; done
```

On Windows, set `PYTHONUTF8=1` first; otherwise `skills-ref` reads `SKILL.md` in the system
code page and fails on non-ASCII characters.

## Versions

- Each skill carries its own version, in `metadata.version` in its `SKILL.md` and in
  `bundle.json` (`version` and `purl`). A change inside a skill folder bumps that skill:
  patch for a fix or wording, minor for new behaviour. Add a line to `CHANGELOG.md` under
  Unreleased naming the skill and its new version.
- The packages (`@aaw/protocol`, `@aaw/installer`, `@aaw/cli`) version together through
  Changesets: run `npx changeset` and commit the file it writes. See
  [PUBLISHING.md](PUBLISHING.md).
- Documentation outside `skills/` needs no version bump.
- Every `SKILL.md` stays under 500 lines and about 5,000 body tokens. Put longer procedure
  in the skill's `references/`, and user documentation in `docs/`.

## Working on AAW with AAW

Install this clone into itself (`node bin/aaw.js install`) and use the same `/aaw-*` skills
as any other workspace. `change/work-items/` holds a few work items published as examples.

---

## Open source, and giving improvements back

These skills are open source: documentation under CC BY 4.0 and code under Apache-2.0 (see `LICENSE`). You may use, copy and adapt them, inside an organisation or out, on the terms of those licences.

If you improve a skill and the improvement would be useful to others beyond you or your organisation, please give it back to the source repository, [ai-assisted-work](https://github.com/dermot-obrien/ai-assisted-work): open an [issue](https://github.com/dermot-obrien/ai-assisted-work/issues) describing the improvement, or a pull request with the change. An issue is enough when the change is specific to your setup, or when you cannot share the code.

This repository is the original source of its skills. Its `LICENSE`, `LICENSES/` and the licence headers in its files record that. Some skills first published here now live in repositories of their own, markdown-deck, diagram-model (the model skill) and delivery-planning (the quarter-planning skill): each of those names this repository as its origin in its `NOTICE`, with the path and commit it came from, and that notice travels with every copy.

How you give back depends on how you took the skills.

### You copied the skills into another repository or an internal skills library

A copy does not track this repository: it stays at the version you copied until you copy again.

1. Keep `LICENSE` and `LICENSES/` with every copy, including a single skill folder, and keep the copyright and licence headers in the files. Add your own attribution beside them rather than replacing them.
2. Record where the copy came from: this repository, and the tag or commit you took (for example `pattern--v0.10.1`). Release tags are named after the skill, `<skill>--v<version>`.
3. To update, copy a newer release over it, then re-apply any local changes you still need. Keep local changes small and separate, so they are easy to carry forward.
4. To give a change back, raise an issue here, or apply the change to a fork of this repository and open a pull request. A change made only in the copy is lost at the next update.

### You cloned or forked the repository and keep it in step

1. Keep this repository as a remote so you can take its releases: `git remote add upstream https://github.com/dermot-obrien/ai-assisted-work.git`, then `git fetch upstream` and merge or rebase onto its `main` or a release tag.
2. Make your changes on a branch in your fork, and open a pull request against this repository's `main` for anything useful to others. Keep organisation-specific configuration out of the skills: it belongs in your workspace's bindings, which this repository never needs to see.
3. If you publish your fork, it is a derivative work: follow Derivative Works below.

## Contribution Process

### For Minor Changes

1. Fork the repository.
2. Make your changes.
3. Submit a pull request.

### For Significant Changes

1. **Open an Issue** describing what you want to contribute.
2. **Discuss** with maintainers.
3. **Fork and develop**.
4. **Submit PR** referencing the issue.

## Pull Request Guidelines

### PR Title Format

```
[TYPE] Brief description

Types:
- [AGENT] Agent improvements
- [TEMPLATE] Template changes
- [DOCS] Documentation
- [FIX] Bug fixes
- [FEATURE] New features
```

### PR Description

```markdown
## Summary
What this PR does

## Type
- [ ] Agent improvement
- [ ] Template change
- [ ] Documentation
- [ ] Bug fix
- [ ] New feature

## Testing
How you tested the changes

## Checklist
- [ ] Domain-agnostic (no project-specific content)
- [ ] Follows existing patterns
- [ ] Documentation updated
```

## Content Guidelines

### Domain-Agnostic

All contributions must be:

- **Generic**: No domain-specific assumptions
- **Reusable**: Works for any type of work
- **Adaptable**: Easy to customize

### Agent Instructions

When contributing agents:

- Clear, step-by-step instructions
- Defined inputs and outputs
- Error handling guidance
- Examples of usage

### Templates

When contributing templates:

- Clear placeholder markers
- Sensible defaults
- Documentation of fields
- Example filled-in versions

## Attribution

### Acknowledging the Original

AI-Assisted Work was created by **Dermot O'Brien**. When you:

- **Write** about the framework (blog posts, articles)
- **Present** the framework (talks, demos)
- **Teach** the framework (workshops, courses)
- **Fork** or create derivatives

Please consider crediting the original project and linking to this repository. This helps others find the source and supports the community.

### Derivative Works

If you create a derivative or fork:

1. Keep the original `LICENSE`, `LICENSES/`, and `REUSE.toml` files intact.
2. Preserve `SPDX-FileCopyrightText` and `SPDX-License-Identifier` headers in the files you carry over.
3. Mention "Based on AI-Assisted Work by Dermot O'Brien" in your README, and link to the original repository.
4. Indicate any changes you have made (required by both CC BY 4.0 and Apache-2.0).
5. Choose a different name for forks distributed as a distinct product — "AI-Assisted Work" is a trademark.

## Licensing of Contributions

This repository is dual-licensed:

- **Content** (Markdown, YAML, JSON, agent shims, skill definitions, templates): [CC BY 4.0](LICENSES/CC-BY-4.0.txt)
- **Code** (`packages/cli/**.ts`, `packages/protocol/**.ts`, `packages/cli/build.mjs`, `bin/**.js`): [Apache-2.0](LICENSES/Apache-2.0.txt)

By submitting a contribution (pull request, patch, issue with code), you agree that your contribution is licensed under the same terms as the file you are modifying. New code files must include an SPDX header:

```typescript
// SPDX-FileCopyrightText: <year> <your name or organisation>
// SPDX-License-Identifier: Apache-2.0
```

New content files are covered by the bulk rules in `REUSE.toml` and do not need per-file headers, but you may add one if you wish.

The project follows the [REUSE Specification 3.3](https://reuse.software/spec-3.3/) for machine-checkable licensing metadata.

---

## Code of Conduct

### Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive feedback
- Focus on improvement

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insults
- Publishing private information
- Unprofessional conduct

## Recognition

Contributors are recognized in:

- CONTRIBUTORS.md
- Release notes
- Documentation credits

## Questions?

- Open a [Discussion](https://github.com/dermot-obrien/ai-assisted-work/discussions)
- Create an [Issue](https://github.com/dermot-obrien/ai-assisted-work/issues)

---

Thank you for helping improve AI-Assisted Work!
