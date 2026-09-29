# Installing in each agent

AAW's skills follow the [Agent Skills](https://agentskills.io) format, so one copy works in
every agent that reads it. What differs between agents is only the folder each one reads.

- [Workspace install](#workspace-install): the usual way, with `aaw install`
- [Where each agent looks](#where-each-agent-looks)
- [User-level install](#user-level-install): skills available in every workspace
- [Scripts, hooks and CI](#scripts-hooks-and-ci)
- [One clone, many workspaces](#one-clone-many-workspaces)
- [Customising](#customising)

## Workspace install

Requires Node.js 18 or newer (20 recommended) and git. No npm registry access is needed.

Clone AAW into the workspace and run its installer:

```
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/aaw.js install
```

Or add it as an npm git dependency, which pulls no registry packages because the CLI is a
committed, self-contained bundle:

```
npm i github:dermot-obrien/ai-assisted-work
npx aaw install
```

In a terminal the installer asks four things: the workspace (default: the git root), the
tenant, the mode, and the work items folder. It then:

- writes `.aaw-config.yaml` at the workspace root
- creates the work items folder
- copies every skill to `.agents/skills/<name>/`
- links `.claude/skills/<name>` at each one, when `.claude/` exists, for Claude Code
- removes command shims written by installs before 3.0.0
- records itself under `modules` in `.aaw-config.yaml`

Run it again at any time: it keeps your answers and changes only what is out of date.

Commit `.aaw-config.yaml`. Do not commit the installed skills: add `.agents/skills/aaw-*`,
`.agents/skills/thread` and the matching `.claude/skills/` entries to `.gitignore`, and
install again after updating the clone. The exception is a repository used by cloud
sessions, which must commit what those sessions need (see
[the thread skill](../skills/thread.md#cloud-sessions)).

## Where each agent looks

| Agent | Workspace folder | User folder | Notes |
|-------|------------------|-------------|-------|
| VS Code with GitHub Copilot | `.agents/skills/`, also `.github/skills/` and `.claude/skills/` | `~/.copilot/skills/` | Lists a skill twice when both `.agents/` and `.claude/` hold it |
| Cursor | `.agents/skills/`, also `.cursor/skills/` and `.claude/skills/` | `~/.cursor/skills/` | Same duplicate listing as Copilot |
| Claude Code | `.claude/skills/` only | `~/.claude/skills/` | Run `mkdir .claude` before `aaw install` so the links are made |
| OpenAI Codex | `.agents/skills/`, from the working directory up to the repository root | `~/.agents/skills/` | |
| Gemini CLI | `.agents/skills/`, which takes precedence over `.gemini/skills/` | `~/.gemini/skills/` | |

Agents change these paths from time to time; check your agent's documentation if a skill
does not appear. After installing, start a new chat and type `/`: the `aaw-*` skills and
`thread` should be listed. See [Command discovery](command-discovery.md) for how each agent
invokes them.

On Windows the `.claude/skills/<name>` links are directory junctions, which need neither
administrator rights nor developer mode. If the filesystem refuses both a symlink and a
junction, the installer copies instead and says `(links unavailable)`.

## User-level install

A skill in your user folder is available in every workspace. This suits `thread` best. The
`aaw-*` skills also work from there, but each workspace still needs its own
`.aaw-config.yaml` to say where its work lives (run `aaw install` in it, or write the file;
without one they use `./change/work-items/`).

Copy the skill folders from an AAW clone into the user folder from the table above. For
Claude Code:

PowerShell:

```powershell
git clone https://github.com/dermot-obrien/ai-assisted-work.git "$HOME\.ai-assisted-work"
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force "$HOME\.ai-assisted-work\skills\thread" "$HOME\.claude\skills\"
```

bash:

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git ~/.ai-assisted-work
mkdir -p ~/.claude/skills
cp -R ~/.ai-assisted-work/skills/thread ~/.claude/skills/
```

Replace `.claude` with `.copilot`, `.cursor`, `.agents` or `.gemini` for the other agents,
and `thread` with any other skill, or copy them all (`skills\*` or `skills/*`). To update,
`git pull` in the clone and copy again. `aaw check-skills` does not cover user folders.

## Scripts, hooks and CI

`aaw install` prompts only in a terminal. Without one, or with `--yes`, it asks nothing:
each answer comes from its flag, then the existing `.aaw-config.yaml`, then the default,
and it prints the values it used on one line.

```
node .ai-assisted-work/bin/aaw.js install --yes
node .ai-assisted-work/bin/aaw.js install --yes --tenant acme --mode local-fs --work-items-path ~/aaw/acme/repo/work-items
```

Use `--yes` in a session-start hook or setup script, so it never depends on whether a
terminal is attached. Pass an absolute path, or one starting `~`, `{tenant}` or `{repo}`,
rather than one relative to wherever the hook runs.

To fail a build when an installed skill has been edited in place:

```
node .ai-assisted-work/bin/aaw.js check-skills
```

## One clone, many workspaces

Keep one AAW clone anywhere and install it into several workspaces with `--workspace`:

```
node ~/src/ai-assisted-work/bin/aaw.js install --workspace ~/src/project-a
node ~/src/ai-assisted-work/bin/aaw.js install --workspace ~/src/project-b
```

Each workspace records the clone's location, relative to itself, under `modules.aaw.source_root`
in its `.aaw-config.yaml`, so `check-skills` and other frameworks can find it.

## Other AAW-family frameworks

Frameworks built on AAW install through the same engine:

```
node .ai-assisted-work/bin/aaw.js install --framework ../other-framework
```

See [Commands](../reference/commands.md#aaw-install) for `--no-python` and `--seed`.

## Customising

- Templates: fork AAW and edit the copies under `skills/<name>/assets/templates/`. Your fork's
  install then ships them. Bump the skill's version when you do.
- Your own skills: add a folder under `skills/` holding a `SKILL.md` with `name` and
  `description`; the installer places every folder that has one. Validate it with
  `node scripts/validate-skills.mjs skills`.
- Backends: implement the `Backend` interface from `@aaw/protocol`. The CLI's local-fs
  backend is the reference implementation. See the [protocol](../../packages/protocol/README.md).
- Adopting in an organisation: see [Organisation adoption](../about/organization-adoption.md).

## See also

- [Quick start](../quick-start.md)
- [Command discovery](command-discovery.md)
- [Skill bundles](skill-bundles.md)
- [DEPLOYMENT.md](../../DEPLOYMENT.md) for updating, removing and migrating
