# Organisation Adoption

How organisations can adopt, customise, and contribute to AI-Assisted Work.

## The simplest path

If you're trying AAW for the first time on a single project, the v2 install path is one command:

```bash
git clone https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
node .ai-assisted-work/bin/aaw.js install
node .ai-assisted-work/bin/aaw.js init
```

Requires Node.js 18+ (20+ recommended) and git. Works in environments where npm registry access is restricted but git and GitHub access are allowed, because `bin/aaw.js` is a committed bundle. Cross-platform on Mac, Linux, and Windows.

For details, see [DEPLOYMENT.md](../../DEPLOYMENT.md).

## Adoption options

### Option 1: Direct use (independent clone)

Clone the upstream AAW repo and run `aaw install` into each workspace. Update with `git pull`
in the clone, then re-run `aaw install`. Best for teams that want minimal customisation and
stay current.

AAW is deliberately **not** a submodule: a submodule couples the consuming repo's history to
AAW's and needs `--init` and `--remote` discipline, for no benefit a clone does not give. See
DD-02.

### Option 2: Fork and customise

Fork the AAW repo and clone the fork. Customisations live on a long-lived branch in the fork; sync from upstream when you want updates.

Best for organisations that need:
- Custom skills for org-internal workflows
- Org-specific skill content (procurement workflow, compliance steps)
- Branded variants of the standard templates

### Option 3: Permissive copy

Permitted by the licence. Copy the relevant pieces into your own repo and own them. Loses the upgrade path but maximises control. Best for one-off use.

## Customisation pattern: the org overlay

Don't fork by editing files in place. Use the **overlay pattern**:

```
your-org-aaw-fork/
├── skills/aaw-*/                      # Upstream — sync with main, don't edit
├── skills/yourorg-*/                  # Your additions, same Agent Skills format
│   ├── compliance-review.md
│   ├── procurement-workflow.md
│   └── _templates/
└── overlay/                           # Your overrides
    └── templates/                     # Org template overrides
```

When you `aaw init` from this fork, the init script copies both the upstream skills AND your overlays, so your additions ship to every adopting project.

## Templates and conventions

### Extending the base templates

Add organisation-specific fields without breaking the core schema. The work item `progress.yaml` template supports an `org_metadata` extension point:

```yaml
# skills/aaw-start-work/assets/templates/progress.yaml (your fork)
work_item_id: WI-NNN
title: "{title}"
type: development
status: scoping

# Extension — your fork adds these
org_metadata:
  cost_center: ""
  compliance_level: ""
  jira_epic: ""

activities: []
```

The protocol's TypeScript types in `@aaw/protocol` ignore unknown fields (additive-only schema policy), so org_metadata flows through without breaking anything in the framework.

### Custom skill files

Add a directory under `skills/` holding a `SKILL.md` with `name` and `description` frontmatter,
plus optional `references/` and `assets/`. Prefix the name so it will not collide, for example
`yourorg-release-review`.

No per-tool file is needed. The installer picks up every directory under `skills/` that
contains a `SKILL.md`, and every supported tool reads the result. Validate with
`skills-ref validate ./skills/yourorg-release-review`.

## Syncing with upstream

```bash
# Fetch upstream
git remote add upstream https://github.com/dermot-obrien/ai-assisted-work.git
git fetch upstream

# Review changes
git log HEAD..upstream/main --oneline

# Merge — your overlays should be on a different path so conflicts are rare
git merge upstream/main
```

For stability, pin to a release tag rather than tracking `main`:

```bash
cd .ai-assisted-work
git checkout v2.0.0      # or whichever tag
cd ..
git add .ai-assisted-work
git commit -m "Pin AAW to v2.0.0"
```

## Contributing back

| Contribution | Accepted |
|--------------|----------|
| Bug fixes | ✅ Yes |
| Skill clarifications and additions to the standard set | ✅ if generic |
| Support for new AI tools | ✅ if the tool is publicly available |
| New backends (e.g. GitHub Projects, Temporal) | ✅ Strongly desired |
| Org-specific content | ❌ Keep in your fork |

### Contribution process

1. Fork or branch from `main`.
2. Make changes; add a Changeset entry (`npx changeset`).
3. Open a PR. CI runs typecheck, bundle freshness, REUSE compliance.
4. On merge, Changesets opens a release PR.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

## Multi-project deployments

Three patterns scale across an organisation:

### Pattern 1: One clone per project

Each project clones AAW (or your fork) into `.ai-assisted-work/` and installs from it. Simple,
but each project updates independently.

A shared alternative: keep one clone outside your repos and run `aaw install` from it into each
workspace. Each workspace records the source path in its own `.aaw-config.yaml`, so one pull
updates the source for all of them.

### Pattern 2: Shared private intent repo

A single private repo (e.g. `your-org-intent`) holds work items for all projects in `change/work-items/`. Each project's `.aaw-config.yaml` points at this shared path. One sync point for all your private work-state.

### Pattern 3: Cloud mode (when v3.0 lands)

Once the cloud coordinator ships, individual projects flip `mode: cloud` and the work store becomes a hosted multi-tenant service. Per-pool concurrency caps, real-time event subscription, and a web console come along.

## Best practices

### Do

- ✅ Pin to release tags for stability
- ✅ Keep org overlays in their own folder so upstream merges stay clean
- ✅ Contribute generic improvements back
- ✅ Use one shared intent repo across projects to avoid fragmentation

### Don't

- ❌ Modify upstream files directly in the clone — your changes get lost on the next pull
- ❌ Commit the installed `.agents/skills/aaw-*` into the consuming repo — it is generated output and will drift from the clone; gitignore it and re-run `aaw install`
- ❌ Include org-specific content in upstream contributions
- ❌ Auto-sync without review — there's no replacement for reading the changelog before bumping

## Resources

- [DEPLOYMENT.md](../../DEPLOYMENT.md) — install, config, troubleshooting
- [Integration Guide](../integration/index.md) — tool-specific setup
- [Design Decisions](design-decisions.md) — why the framework is the way it is
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — contribution guidelines
- [LICENSE](../../LICENSE) — permissive dual licence (CC BY 4.0 + Apache-2.0)
