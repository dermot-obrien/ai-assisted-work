# Command Discovery Across AI Assistants

How AI-Assisted Work surfaces in each AI assistant, and why it now works the same way in all
of them.

## The short version

AAW ships its workflows as standalone [Agent Skills](https://agentskills.io). `aaw install`
puts them in `.agents/skills/<name>/` and links `.claude/skills/<name>` at the same directory.
Every supported tool then discovers them natively, with no per-tool file to maintain.

| Skill | Invoke |
|-------|--------|
| `aaw-start-work` | `/aaw-start-work` |
| `aaw-progress-work` | `/aaw-progress-work` |
| `aaw-work-status` | `/aaw-work-status` |
| `aaw-next-task` | `/aaw-next-task` |
| `aaw-start-initiative` | `/aaw-start-initiative` |
| `quarter-planning` | `/quarter-planning` |

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
migration" and it can reach for `aaw-start-work` on its own.

A skill also loads progressively. At startup the assistant sees only each skill's name and
description, roughly 100 tokens. The `SKILL.md` body loads when the skill activates, and the
files under `references/` load only when a branch of the workflow reaches them. That is why
`aaw-progress-work` can hold a full concurrency protocol, an actor model and a recovery
procedure without costing anything until it is used.

## Naming

Skills are named `aaw-*`, and the Agent Skills format has no namespacing of its own. The prefix
is what keeps them from colliding with other skills in a workspace.

If a tool namespaces skills itself, follow the tool. Claude Code, for example, namespaces
plugin-supplied skills as `/plugin-name:skill-name`, but skills installed into
`.claude/skills/` are invoked by their directory name, so `/aaw-start-work` is correct.

## Verifying an install

Type `/` in your assistant. The five `/aaw-*` skills should appear. If they do not:

1. Restart the assistant. Several tools cache the skill list at startup.
2. Check `.agents/skills/` exists and holds a directory per skill, each with a `SKILL.md`.
3. For Claude Code, check `.claude/skills/<name>` exists and resolves. On Windows it is a
   directory junction; if the filesystem refused both a symlink and a junction, the installer
   falls back to a copy and says so in its output.
4. Confirm the `SKILL.md` frontmatter parses: `name` must match the directory name exactly, and
   both `name` and `description` are required.

## Legacy command shims

Before the Agent Skills format existed, every tool had its own incompatible layout, so AAW
shipped a per-tool shim: a small file whose only content was a pointer to the real instructions
elsewhere in the framework. Those shims are still installed for setups that have not moved.

| Tool | Legacy location |
|------|-----------------|
| Claude Code | `.claude/commands/aaw/*.md` → `/aaw:start-work` |
| Cursor | `.cursor/commands/aaw/*.md` |
| GitHub Copilot | `.github/prompts/aaw-*.prompt.md` |
| Gemini CLI | `.gemini/skills/aaw/` |

They are superseded and will be removed. Two reasons they are worth leaving behind rather than
maintaining: a shim carries no `description`, so the assistant can only run it when you type
the command; and a shim points at one large instruction file that is read whole on every
invocation, which is the opposite of progressive disclosure.

Prefer the skills. If you have both installed, the skills and the shims will both appear, and
the skill is the maintained definition.

## See also

- [Integration Guide](index.md) — per-tool notes and shell access
- [DEPLOYMENT.md](../../DEPLOYMENT.md) — full install and migration guide
- [Agent Skills specification](https://agentskills.io/specification)
