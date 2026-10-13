# Installing in each agent

The skills follow the [Agent Skills](https://agentskills.io) format, so one copy works in every agent that reads it. What differs between agents is only the folder each one reads.

- [Workspace install](#workspace-install): the usual way, with `bin/skills.mjs`
- [Where each agent looks](#where-each-agent-looks)
- [User-level install](#user-level-install): skills available in every workspace
- [Scripts, hooks and CI](#scripts-hooks-and-ci)
- [One clone, many workspaces](#one-clone-many-workspaces)
- [Customising](#customising)

## Workspace install

Requires Node.js 18 or newer and git. No npm registry access is needed.

```
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/skills.mjs install work
```

The installer:

- copies each skill to `.agents/skills/<name>/`
- links `.claude/skills/<name>` at each one, when `.claude/` exists, for Claude Code (`--copy` writes copies instead)
- records the source, commit and a hash of each skill in `.agents/skills.lock.json`

It writes no configuration. The `work` skill reads `.aaw-config.yaml` when the workspace has one, and its defaults when it does not ([Configuration](../reference/configuration.md)).

Run it again at any time. Do not commit the installed skills unless the workspace needs them committed, such as a repository used by cloud sessions whose setup runs outside it. Instead, commit a declaration of them, `.agents/skills.json`, and its lock, and let each session install them; [Installing the skills](../../DEPLOYMENT.md) has the format and the commands.

## Where each agent looks

| Agent | Workspace folder | User folder | Notes |
|-------|------------------|-------------|-------|
| VS Code with GitHub Copilot | `.agents/skills/`, also `.github/skills/` and `.claude/skills/` | `~/.copilot/skills/` | Lists a skill twice when both `.agents/` and `.claude/` hold it |
| Cursor | `.agents/skills/`, also `.cursor/skills/` and `.claude/skills/` | `~/.cursor/skills/` | Same duplicate listing as Copilot |
| Claude Code | `.claude/skills/` only | `~/.claude/skills/` | Run `mkdir .claude` before installing so the links are made |
| OpenAI Codex | `.agents/skills/`, from the working directory up to the repository root | `~/.agents/skills/` | |
| Gemini CLI | `.agents/skills/`, which takes precedence over `.gemini/skills/` | `~/.gemini/skills/` | |

Agents change these paths from time to time; check your agent's documentation if a skill
does not appear. After installing, start a new chat and type `/`: `work` should
be listed. See [Command discovery](command-discovery.md) for how each agent
invokes them.

On Windows the `.claude/skills/<name>` links are directory junctions, which need neither
administrator rights nor developer mode. If the filesystem refuses both a symlink and a
junction, pass `--copy` to install copies instead.

## User-level install

A skill in your user folder is available in every workspace. `work` works from there; each workspace that wants its work items somewhere other than `./change/work-items/` says so in its own `.aaw-config.yaml`.

`skills.mjs install --workspace ~` installs into `~/.agents/skills/`, which Codex reads, and links `~/.claude/skills/` when `~/.claude/` exists, for Claude Code. For the other agents, copy the skill folders from a clone into the user folder from the table above. For Claude Code by hand:

PowerShell:

```powershell
git clone https://github.com/dermot-obrien/ai-assisted-work.git "$HOME\.ai-assisted-work"
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force "$HOME\.ai-assisted-work\skills\work" "$HOME\.claude\skills\"
```

bash:

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git ~/.ai-assisted-work
mkdir -p ~/.claude/skills
cp -R ~/.ai-assisted-work/skills/work ~/.claude/skills/
```

Replace `.claude` with `.copilot`, `.cursor`, `.agents` or `.gemini` for the other agents. To update, `git pull` in the clone and copy again. `skills.mjs check` does not cover copies made by hand.

## Scripts, hooks and CI

`skills.mjs` never prompts, so it runs the same in a terminal, a session-start hook or CI. In a workspace that declares its skills, the hook is one line:

```
node scripts/skills.mjs sync --locked --copy
```

`--locked` installs exactly the commits in the committed lock, so every session gets the same skills; `--copy` writes `.claude/skills/` entries as copies, which suits a repository that commits some of them. Keep a copy of `bin/skills.mjs` in the workspace (here `scripts/skills.mjs`) so the hook needs no clone of this repository.

To fail a build when an installed skill has been edited in place:

```
node scripts/skills.mjs check
```

## One clone, many workspaces

Keep one clone anywhere and install from it into several workspaces with `--workspace`:

```
node ~/src/ai-assisted-work/bin/skills.mjs install --workspace ~/src/project-a
node ~/src/ai-assisted-work/bin/skills.mjs install --workspace ~/src/project-b
```

Each workspace's lock records what was installed, so `check` works in each of them.

## Other bundles

AI-Assisted Architecture, AI-Assisted Research and the skills that live in repositories of their own install the same way: as a `bundle` source, or a single skill's `repo` source, in `.agents/skills.json`. No skill needs another installed first; where a skill names a requirement, the installer reports a missing one rather than pulling it in.

## Customising

- Templates: fork this repository and edit the copies under `skills/work/assets/templates/`. Your fork's install then ships them. Bump the skill's version when you do.
- Your own skills: add a folder holding a `SKILL.md` with `name` and `description`, and declare it as a `folder` source, or list it in your fork's `bundle.json`. Validate it with `node scripts/validate-skills.mjs <folder of skills>`.
- Adopting in an organisation: see [Organisation adoption](../about/organization-adoption.md).

## See also

- [Quick start](../quick-start.md)
- [Installing the skills](../../DEPLOYMENT.md): declarations, updates, removal and constrained environments
- [Command discovery](command-discovery.md)
- [Skill bundles](skill-bundles.md)
