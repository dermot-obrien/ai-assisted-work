# Contributing to AI-Assisted Work

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Who Can Contribute

This project welcomes contributions from:

- **Individuals** using the agents for personal projects
- **Organizations** who have adopted the framework
- **Developers** building AI-assisted tooling
- **Anyone** who wants to improve AI-assisted work management

## Ways to Contribute

### 1. Report Issues

- Bug reports for agents or templates
- Suggestions for improvements
- Documentation clarifications

### 2. Improve Agents

- Enhanced agent instructions
- New agent capabilities
- Bug fixes in existing agents

### 3. Add Templates

- Work item templates for specific domains
- Improved base templates
- Localized templates

### 4. Improve Documentation

- Clearer explanations
- More examples
- Integration guides

### 5. Share Experience

- Use cases and examples
- Tips and best practices
- Integration patterns

## Development Work Management

When working on AI-Assisted Work itself, use the `/aiaw-self-*` Cursor commands to manage your work:

| Command | Purpose |
|---------|---------|
| `/aiaw-self-start-work` | Create a new work item |
| `/aiaw-self-progress-work` | Continue work on an item |
| `/aiaw-self-work-status` | Check status of work items |
| `/aiaw-self-pivot-work` | Rescope when requirements change |

### Why /aiaw-self-* Commands?

The standard `/start-work` commands point to `.ai-assisted-work/agents/...` for deployed usage. The `/aiaw-self-*` commands point to `agents/...` for developing this repository directly.

### Example

```
/aiaw-self-start-work Create a work item to add validation schemas for progress.yaml
```

Work items are created in the `change/work-items/` folder.

---

## Contribution Process

### For Minor Changes

1. Fork the repository
2. Make your changes
3. Submit a pull request

### For Significant Changes

1. **Open an Issue** describing what you want to contribute
2. **Discuss** with maintainers
3. **Fork and develop**
4. **Submit PR** referencing the issue

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
