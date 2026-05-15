# Organisation Adoption

How organisations can adopt, customise, and contribute to AI-Assisted Work.

## The simplest path

If you're trying AAW for the first time on a single project, the v2 install path is one command:

```bash
git submodule add https://github.com/dermot-obrien/ai-assisted-work.git .ai-assisted-work
git submodule update --init
node .ai-assisted-work/bin/aaw.js init
```

Requires Node.js (16+) and git. Works in environments where npm registry access is restricted but git+GitHub access is allowed — the CLI is bundled in the submodule. Cross-platform on Mac, Linux, and Windows.

For details, see [DEPLOYMENT.md](../../DEPLOYMENT.md).

## Adoption options

### Option 1: Direct use (submodule)

Each project adds the upstream AAW repo as a Git submodule. Updates via `git submodule update --remote`. Best for teams that want minimal customisation and stay current.

### Option 2: Fork and customise

Fork the AAW repo. Each project uses the fork as its submodule URL. Customisations live on a long-lived branch in the fork; sync from upstream when you want updates.

Best for organisations that need:
- Custom tool shims (e.g. a non-Anthropic AI assistant)
- Org-specific skill content (procurement workflow, compliance steps)
- Branded variants of the standard templates

### Option 3: Permissive copy

Permitted by the licence. Copy the relevant pieces into your own repo and own them. Loses the upgrade path but maximises control. Best for one-off use.

## Customisation pattern: the org overlay

Don't fork by editing files in place. Use the **overlay pattern**:

```
your-org-aaw-fork/
├── packages/skills/work-management/   # Upstream — sync with main, don't edit
├── packages/skills/your-org/          # Your additions, pure markdown
│   ├── compliance-review.md
│   ├── procurement-workflow.md
│   └── _templates/
└── overlay/                           # Your overrides
    └── tool-shims/                    # Custom shims for org-internal tools
```

When you `aaw init` from this fork, the init script copies both the upstream skills AND your overlays, so your additions ship to every adopting project.

## Templates and conventions

### Extending the base templates

Add organisation-specific fields without breaking the core schema. The work item `progress.yaml` template supports an `org_metadata` extension point:

```yaml
# packages/skills/work-management/_templates/progress.yaml (your fork)
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

Add new markdown skills under `packages/skills/your-org/`. Reference them from your tool shims (`.github/prompts/yourorg-*.prompt.md`, `.claude/commands/yourorg/*.md`, etc).

The shim pattern is identical to the standard ones — a thin wrapper that reads the canonical instruction file from the submodule.

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
| Tool shims for new AI tools | ✅ if the tool is publicly available |
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

### Pattern 1: One submodule per project

Each project adds AAW (or your fork) as its own submodule. Simple but each project needs to be updated independently.

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

- ❌ Modify upstream files directly in the submodule — your changes get lost on the next pull
- ❌ Include org-specific content in upstream contributions
- ❌ Auto-sync without review — there's no replacement for reading the changelog before bumping

## Resources

- [DEPLOYMENT.md](../../DEPLOYMENT.md) — install, config, troubleshooting
- [Integration Guide](../integration/index.md) — tool-specific setup
- [Design Decisions](design-decisions.md) — why the framework is the way it is
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — contribution guidelines
- [LICENSE](../../LICENSE) — permissive dual licence (CC BY 4.0 + Apache-2.0)
