# Organisation Adoption

How organisations can adopt, customise, and contribute to AI-Assisted Work.

## The simplest path

To try the skills on a single project:

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/skills.mjs install work thread
```

Requires Node.js 18 or newer and git. It works where npm registry access is restricted, because the installer is one file with no dependencies, and where GitHub is out of reach too: copy the skill folders onto the machine and install with `--from <folder>`, or point `SKILLS_BASE_URL` at a mirror. Cross-platform on Mac, Linux, and Windows.

For details, see [Installing the skills](../../DEPLOYMENT.md).

## Adoption options

### Option 1: Direct use (a declaration, or an independent clone)

Declare the skills in each workspace's committed `.agents/skills.json`, pinned to a tag or a branch, and run `skills.mjs sync --locked` at session start; to take newer versions, run `sync`, review, and commit the new lock. Or clone this repository and install from the clone into each workspace, updating with `git pull` and `skills.mjs update`. Best for teams that want minimal customisation and stay current.

It is deliberately not a submodule: a submodule couples the consuming repo's history to this one's and needs `--init` and `--remote` discipline, for no benefit a clone does not give. See DD-02.

### Option 2: Fork and customise

Fork the repo and install from the fork. Customisations live on a long-lived branch in the fork; sync from upstream when you want updates.

Best for organisations that need:
- Custom skills for org-internal workflows
- Org-specific skill content (procurement workflow, compliance steps)
- Branded variants of the standard templates

### Option 3: Permissive copy

Permitted by the licence. Copy the relevant pieces into your own repo and own them. Loses the upgrade path but maximises control. Best for one-off use.

## Customisation pattern: your own skills beside the upstream ones

Don't fork by editing upstream skills in place. Keep your own skills in folders of their own:

```
your-org-skills/
├── bundle.json                        # Lists your skills
└── skills/
    ├── yourorg-compliance-review/     # Same Agent Skills format
    │   ├── SKILL.md
    │   └── references/
    └── yourorg-procurement-workflow/
        └── SKILL.md
```

A workspace then declares both: the upstream bundle, and yours (as a `bundle` source in its own repository, or a `folder` source inside the workspace). `skills.mjs sync` installs them together, so your additions ship to every adopting project without touching the upstream skills.

## Templates and conventions

### Extending the base templates

Add organisation-specific fields without breaking the core schema. The work item `progress.yaml` template supports an `org_metadata` extension point:

```yaml
# skills/work/assets/templates/progress.yaml (your fork)
work_item_id: WI-NNN
title: "{title}"
type: development
status: scoping

# Extension: your fork adds these
org_metadata:
  cost_center: ""
  compliance_level: ""
  jira_epic: ""

activities: []
```

The work ontology, `skills/work/assets/work.schema.json`, keeps its objects open (additive-only schema policy), so `org_metadata` validates without breaking anything.

### Custom skill files

Add a directory holding a `SKILL.md` with `name` and `description` frontmatter, plus optional `references/` and `assets/`. Prefix the name so it will not collide, for example `yourorg-release-review`.

No per-tool file is needed: the installer places the folder in `.agents/skills/` and `.claude/skills/`, and every supported tool reads the result. Validate with `skills-ref validate ./skills/yourorg-release-review`.

## Syncing with upstream

```bash
# Fetch upstream
git remote add upstream https://github.com/dermot-obrien/ai-assisted-work.git
git fetch upstream

# Review changes
git log HEAD..upstream/main --oneline

# Merge: your own skills are on a different path, so conflicts are rare
git merge upstream/main
```

For stability, pin to a release tag rather than tracking `main`. In a declaration, set the bundle's `ref` to the tag and commit the lock that `sync` writes. With a clone:

```bash
git -C .ai-assisted-work checkout v5.0.0      # or whichever tag
node .ai-assisted-work/bin/skills.mjs update
```

## Contributing back

| Contribution | Accepted |
|--------------|----------|
| Bug fixes | ✅ Yes |
| Skill clarifications and additions to the standard set | ✅ if generic |
| Support for new AI tools | ✅ if the tool is publicly available |
| Org-specific content | ❌ Keep in your fork |

### Contribution process

1. Fork or branch from `main`.
2. Make changes; bump the version of any skill you changed, and add a line to `CHANGELOG.md`.
3. Open a PR. CI validates the skills and the bundle, runs the tests, and checks REUSE compliance.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

## Multi-project deployments

Two patterns scale across an organisation:

### Pattern 1: One declaration per project

Each project commits `.agents/skills.json` and its lock, and installs at session start. Each project updates when it chooses, by running `sync` and committing the new lock. A shared alternative is one clone outside your repos, installed into each workspace with `--workspace`, so one pull updates the source for all of them.

### Pattern 2: Shared private intent repo

A single private repo (e.g. `your-org-intent`) holds work items for all projects in `change/work-items/`. Each project's `.aaw-config.yaml` points at this shared path. One sync point for all your private work-state.

## Best practices

### Do

- ✅ Pin to release tags, or commit the lock, for stability
- ✅ Keep your own skills in their own folders so upstream merges stay clean
- ✅ Contribute generic improvements back
- ✅ Use one shared intent repo across projects to avoid fragmentation

### Don't

- ❌ Modify upstream files directly in the clone: your changes get lost on the next pull
- ❌ Edit the installed copies in `.agents/skills/`: `skills.mjs check` flags them, and the next install overwrites them
- ❌ Include org-specific content in upstream contributions
- ❌ Auto-sync without review: there's no replacement for reading the changelog before bumping

## Resources

- [Installing the skills](../../DEPLOYMENT.md): install, declarations, constrained environments
- [Installing in each agent](../integration/index.md): tool-specific setup
- [Design Decisions](design-decisions.md): why it is built the way it is
- [CONTRIBUTING.md](../../CONTRIBUTING.md): contribution guidelines
- [LICENSE](../../LICENSE): permissive dual licence (CC BY 4.0 + Apache-2.0)
