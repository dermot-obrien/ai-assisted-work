# Troubleshooting

Find the message you saw, then read what it means and what to do. Messages are quoted as
the tools print them; `<...>` stands for the part that varies. Search this page for a few
words of your message.

- [In the agent](#in-the-agent)
- [skills.mjs](#skillsmjs)
- [Post-install checks](#post-install-checks)
- [Validators](#validators)

## In the agent

### A skill is not listed in the agent

Type `/`: `work` should be listed. If it is not:

1. Start a new chat, or restart the agent. Most agents read the skill list when a session
   starts.
2. Check the workspace you opened is the one you installed into: it has `.agents/skills/`
   with a folder per skill, each holding a `SKILL.md`.
3. For Claude Code, check `.claude/skills/<name>` exists. It is created only when `.claude/` existed at install time: run `mkdir .claude`, then install again.
4. On Windows, `.claude/skills/<name>` is a directory junction. With `--copy` it is a copy instead; install again after every update.

See [Installing in each agent](integration/index.md) for where each agent looks.

### A skill is listed twice

Expected in Cursor and in VS Code with GitHub Copilot when the workspace is also set up for
Claude Code: they read both `.agents/skills/` and `.claude/skills/`, and the second is a
link to the first. Both entries are the same skill.

### The agent does not use a skill unless I type the command

Each skill's `description` says when to use it, and the agent decides. Name the job the
skill does ("start a work item for...", "what is the status of WI-004") or type the
command.

### Old `/aaw:start-work` or `aaw-*` skills still appear

`/aaw:start-work` and its kind are the per-tool command shims from before 3.0.0, and the five `aaw-*` skills are the ones `work` replaced in 4.0.0. Nothing removes them now: delete `.claude/commands/aaw/`, `.cursor/commands/aaw/`, `.github/prompts/aaw-*.prompt.md`, and any `aaw-*` folder in `.agents/skills/` and `.claude/skills/`, then install `work`.

### `aaw: command not found`, or `Cannot find module '.../bin/aaw.js'`

The `aaw` command was removed in 5.0.0. Install with `bin/skills.mjs` ([Installing the skills](../DEPLOYMENT.md)), and use `/work status`, `/work next` and `/work progress` in the agent for what `aaw status`, `aaw next-task` and `aaw claim` did. A workspace that still needs the old command pins the `v4.0.0` tag of this repository.

## skills.mjs

Every error is printed as `skills: <message>`, with exit 1.

| Message | Fix |
|---------|-----|
| `no bundle at <file>. Pass --bundle <bundle.json or its folder>, or --repo <url> for one skill.` | The script is not in a clone of a bundle, or `--bundle` points elsewhere. Pass the bundle's folder |
| `no skill <name> in the bundle. skills list shows them` | The name is wrong, or the skill lives in a repository of its own: install it with `--repo`, or declare it as a `repo` source |
| `<skill>: could not fetch <url> at <ref>: ...` | Followed by git's message. Check the URL, the tag and your access. In a constrained environment copy the skill onto the machine and pass `--from <folder>`, or set `SKILLS_BASE_URL` to a mirror |
| `<skill>: not found under <folder> (looked in ...)` | With `--from`: the folder holds neither the skill folder nor a clone of its repository |
| `<skill>: no SKILL.md at <path>` | The path is not a skill. Check `--path`, or the `path` in the declaration |
| `<skill>: its SKILL.md is named <name>` | The skill's `name` differs from the name it is installed under. Use the name in its `SKILL.md` |
| `no .agents/skills.json: it lists the skills this workspace wants. See skills help.` | `sync` needs a declaration. Write one ([format](../DEPLOYMENT.md#declare-a-workspaces-skills)) |
| `.agents/skills.json: "sources" must be a list`, `sources[<i>] needs exactly one of "bundle", "repo" or "folder"` | Fix the declaration |
| `--locked: the lock has no commit for <skill>; run skills sync first` | The lock predates that source. Run `sync` without `--locked`, check, and commit the lock |
| `unknown command "<command>". Try: skills help` | See [Commands](reference/commands.md#skillsmjs) |

`check` prints one line per installed skill:

| Line | Meaning |
|------|---------|
| `✓ <skill> <version>` | The installed copy matches what was installed |
| `✗ <skill>: changed since it was installed; skills install <skill> puts it back` | Exit 1. Someone edited the installed copy. Move the change to the skill's source, then reinstall |
| `✗ <skill>: missing from .agents/skills` | Exit 1. The lock lists a skill that is no longer there. Install it again, or `remove` it |
| `nothing installed by skills here` | The workspace has no lock: nothing was installed with `skills.mjs` |
| `note: <skill> says it needs <other>, which is not installed` | After an install: the skill names a requirement. Install that one too if you use the feature it needs |

## Post-install checks

The checks (`node .agents/skills/<skill>/bin/check.mjs`, or all of them through
`validate-bundle.mjs --run-checks`) print one line per problem.

| Message | Meaning |
|---------|---------|
| `warning: .aaw-config.yaml: not found in <dir>, so the defaults apply.` | Normal without a config file. Run the check from the workspace root if the file exists |
| `warning: ... work_items_path <path> resolves to <dir>, which does not exist. work creates it on first use.` | Only a warning. Check the path is the one you meant |
| `warning: ... work_items_path (unset, so the default ./change/work-items/) ... does not exist` | No path configured and no work yet. Only a warning |
| `warning: ... initiatives_path ... does not exist. ... creates it on first use.` | Normal before the first initiative |
| `..., which is a file, not a folder. Point it at a folder.` | The path names a file |
| `deliverables_register <path> resolves to <file>, which does not exist.` | Correct the path, or remove the key to name products inline |
| `mode <mode> is not local-fs or cloud.` | Fix `mode` |
| `usage: check.mjs   (run from the workspace root; takes no arguments)` | Exit 2. The check takes no arguments |
| `Node.js <version> is too old: this check needs 18 or newer.` | Exit 2. Upgrade Node |

## Validators

For contributors running the repository's checks.

| Message | Fix |
|---------|-----|
| `name '<name>' must equal the directory name '<dir>'` | Rename one |
| `description is <n> chars, max 1024` | Shorten the description |
| `'<key>' is an unquoted value containing ': ', which is invalid YAML; quote it` | Quote the value in the front matter |
| `broken relative link -> <target>` | Fix the link in `SKILL.md` |
| `warn: <file>: body is about <n> tokens; the spec recommends under 5000` | Move detail to `references/` |
| `warn: '<key>' is not a spec field` | Fine if the key is meant for one client |
| `bundle.json: /skills/<i>/version: <v> is not SKILL.md's metadata.version, <v>` | Bump both together |
| `bundle.json: /skills: skills/<name> holds a SKILL.md but is not listed` | Add the skill to `bundle.json` |
| `bundle.json: /skills/<i>/purl: <purl> should be <purl>` | Use the purl the message gives |
| `skills-ref` fails on non-ASCII characters on Windows | Set `PYTHONUTF8=1` first |
