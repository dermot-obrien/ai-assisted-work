# Discovery (Phase 2)

Research to understand the problem space and identify options. Read-only for research and
presenting options, then write operations for `research.md` and `decisions.md`.

## Should you skip Discovery?

```
Is this a simple, well-understood task?
  |
  ├─ YES → Does it require research or choosing between approaches?
  |         |
  |         ├─ NO  → SKIP Discovery, go to Planning
  |         └─ YES → Continue with Discovery
  |
  └─ NO  → Continue with Discovery
```

Skip when:

- Bug fix with clear reproduction steps and an obvious solution
- Adding a field that follows an existing pattern
- Documentation update with known information
- The user has already specified the approach

Do Discovery when:

- Multiple valid approaches exist
- The problem space is unfamiliar
- Best practices need researching
- The user needs help choosing

If skipping, note it in `plan.md`:

```markdown
## Analysis Summary

### Discovery
Skipped - {reason: simple bug fix / established pattern / user specified approach}
```

## Step 2.1: Determine what to research

| Work type | Workspace research | Web research |
|-----------|--------------------|--------------|
| Development | Existing code patterns, architecture docs | Libraries, techniques, best practices |
| Architecture | Current system state, existing decisions | Design patterns, industry approaches |
| Consultancy | Existing documents, prior analyses | Industry trends, methodologies |

## Step 2.2: Research the workspace

Look for related documentation, existing patterns or code, prior decisions and ADRs, and
similar work items.

## Step 2.3: Research the web

Look for current best practices, library and framework documentation, industry patterns and
relevant case studies. Document every source with a URL and a retrieval date.

## Step 2.4: Write research.md (if needed)

For non-trivial work items, write `research.md` from `assets/templates/research.md`:
all sources both web and workspace, key findings, and the implications for this work item.
Skip it when no research was needed.

## Step 2.5: Identify options and trade-offs

Typically two or three approaches, each with its trade-offs, plus a recommendation and the
reasoning behind it.

## Step 2.6: Present the options

```
Based on my research, here are the options:

## Option A: {Name}
{Description}
- Pros: {advantages}
- Cons: {disadvantages}
- Effort: {Low/Medium/High}

## Option B: {Name}
{Description}
- Pros: {advantages}
- Cons: {disadvantages}
- Effort: {Low/Medium/High}

**My Recommendation**: Option {X} because {rationale}.

Which approach would you like to take?
```

## Step 2.7: Record the decision

Once the user decides, write `decisions.md` from `assets/templates/decisions.md`: options
considered, the chosen approach and its rationale, and any decision deferred to later. Skip
it when no significant decision was made.
