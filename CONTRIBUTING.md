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

## Development Work Management

When working on AI-Assisted Work itself, use the `/aiaw-self-*` Cursor commands to manage your work:

| Command | Purpose |
|---------|---------|
| `/aiaw-self-start-work` | Create a new work item |
| `/aiaw-self-progress-work` | Continue work on an item |
| `/aiaw-self-work-status` | Check status of work items |
| `/aiaw-self-next-task` | Identify next task to work on |

### Why /aiaw-self-* Commands?

The standard `/aiaw-*` commands point to `.ai-assisted-work/packages/skills/...` for deployed usage. The `/aiaw-self-*` commands point to `packages/skills/...` for developing this repository directly.

### Example

```
/aiaw-self-start-work Create a work item to add validation schemas for progress.yaml
```

Work items are created in the `change/work-items/` folder.

---

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
