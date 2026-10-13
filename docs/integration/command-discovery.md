# Command Discovery Across AI Assistants

How the `work` skill surfaces in each AI assistant, and why it works the same way in all of them.

## The short version

The workflows are standalone [Agent Skills](https://agentskills.io). `bin/skills.mjs` puts them in `.agents/skills/<name>/` and links `.claude/skills/<name>` at the same directory. Every supported tool then discovers them natively, with no per-tool file to maintain.

| Skill | Invoke |
|-------|--------|
| `work` | `/work start`, `/work progress`, `/work status`, `/work next`, `/work initiative` |

## Where each tool looks

`.agents/skills/` is the interoperability path, read natively by most tools. Claude Code is the
exception: it reads only `.claude/skills/`, which is why the installer links that at the same
directory rather than copying twice.

| Tool | Reads `.agents/skills/` | Also reads |
|------|:-----------------------:|------------|
| OpenAI Codex | yes, from the working directory up to the repo root | `~/.agents/skills` |
| Cursor | yes | `.cursor/skills/`, plus `.claude/skills/` and `.codex/skills/` for back-compat |
| GitHub Copilot, VS Code | yes | `.github/skills/`, `.claude/skills/` |
| Gemini CLI | yes, and it takes precedence | `.gemini/skills/` |
| Claude Code | **no** | `.claude/skills/` only, plus its personal, plugin and enterprise tiers |

One consequence worth knowing: Cursor and Copilot read both `.agents/skills/` and
`.claude/skills/`. In a workspace also set up for Claude Code they may list each skill twice.
Because the second path is a link to the first, both entries are the same content.

## What you get beyond a slash command

A skill carries a `description`, so an assistant can invoke it when a request matches rather
than only when you type the command. Ask an assistant to "start a work item for the auth
migration" and it can reach for `/work start` on its own.

A skill also loads progressively. At startup the assistant sees only each skill's name and
description, roughly 100 tokens. The `SKILL.md` body loads when the skill activates, and the
files under `references/` load only when a branch of the workflow reaches them. That is why
`/work progress` can hold a full concurrency protocol, an actor model and a recovery
procedure without costing anything until it is used.

## Naming

The Agent Skills format has no namespacing of its own, so a skill's name is its folder's name, and two skills of the same name in one workspace collide. Until 4.0.0 the work-item skills carried an `aaw-` prefix to avoid that; the single `work` skill that replaced them is named for what it does, and still answers to the old names.

If a tool namespaces skills itself, follow the tool. Claude Code, for example, namespaces plugin-supplied skills as `/plugin-name:skill-name`, but skills installed into `.claude/skills/` are invoked by their directory name, so `/work start` is correct.

## Verifying an install

Type `/` in your assistant. `work` should appear. If it does not:

1. Restart the assistant. Several tools cache the skill list at startup.
2. Check `.agents/skills/` exists and holds a directory per skill, each with a `SKILL.md`.
3. For Claude Code, check `.claude/skills/<name>` exists and resolves. On Windows it is a directory junction; where links are refused, install with `--copy`.
4. Confirm the `SKILL.md` frontmatter parses: `name` must match the directory name exactly, and both `name` and `description` are required.

## Legacy command shims

Before the Agent Skills format existed, AAW shipped a small per-tool file for each command,
pointing at instructions elsewhere in the framework:

| Tool | Legacy location |
|------|-----------------|
| Claude Code | `.claude/commands/aaw/*.md`, invoked as `/aaw:start-work` |
| Cursor | `.cursor/commands/aaw/*.md` |
| GitHub Copilot | `.github/prompts/aaw-*.prompt.md` |
| Gemini CLI | `.gemini/skills/aaw/` |

They were removed in 3.0.0, because they point at instruction files that no longer exist. Until 5.0.0 `aaw install` deleted any an earlier install wrote; nothing does now, so if you still see `/aaw:start-work`, delete those files by hand.

## See also

- [Installing in each agent](index.md): per-tool notes and shell access
- [Installing the skills](../../DEPLOYMENT.md): the full install and migration guide
- [Agent Skills specification](https://agentskills.io/specification)
