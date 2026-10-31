# Dispatch

Put a planned work item to work across several workers at once, each in its own checkout,
coordinated through the remote as [github.md](github.md) describes. This flow publishes the
plan, starts the workers and watches them; the workers run `/work progress`.

## Arguments

`/work dispatch WI-NNN [workers]`. Workers defaults to the number of activities available now,
capped at five (the scaling limit in [concurrency.md](concurrency.md)); never more than ten.

## Preconditions

Stop and say which fails:

1. `coordination: github` in `.aaw-config.yaml`. Without it, workers in separate checkouts
   cannot exclude each other; offer to set it, or run `/work progress` in one checkout.
2. `work_items_path` is inside the repository, so the plan travels with the branches.
3. The work item has `plan.md` and a `progress.yaml` whose activities each name `produces`, and
   the user approved the plan.
4. The remote is reachable and you can push to it (`git ls-remote`).

## Step 1: Choose the shape and put the plan on the remote

Ask once, recommending from the plan, then record it:

| If | Shape | Do |
|---|---|---|
| Each activity lands safely alone | Trunk | Push the planning branch `wi/WI-NNN-<slug>` and open its pull request into `base_branch`. The workers start when a person merges it |
| The feature must land whole, or the user wants no wait | Integration | Push `wi/WI-NNN-<slug>` with the plan as its first commit, set `artifacts.base` to it. Workers start now |

Set `status: in_progress` in the same commit.

## Step 2: Mirror to issues, when `issues: github`

Create the tracking issue and one sub-issue per activity, in the formats in
[github.md](github.md), with whatever GitHub access the agent has. Record the URLs in
`artifacts.issue` and each activity's `issue`, and push that commit to the plan's branch.
Update existing issues rather than duplicating them: search for the work item id first.
Assign `actor: human` sub-issues to the person the plan names, or leave them for the user.

Without GitHub access, skip this step and say so; the branches and pull requests carry the
work on their own.

## Step 3: Start the workers

Each worker is an isolated checkout of the repository with an agent in it, given one prompt:

```
Run /work progress WI-NNN with coordination: github. Your worker id is <id>.
Base: <base branch>. Claim with the work skill's bin/claim.mjs. Work activities until
none is available to you, then stop and report what you finished and what is blocked.
```

Ids are unique per worker: `agent-<work item>-<n>`, for example `agent-012-2`. Start them the
way the environment allows, in order of preference:

| Environment | How |
|---|---|
| An agent that can start sub-agents in their own worktrees | One sub-agent per worker, worktree isolation, the prompt above |
| An agent that can start other cloud or background sessions | One session per worker on the repository, the prompt above |
| A coding agent assigned from an issue | Claim the activity for it first (`claim.mjs claim … --worker <its-id>`), then assign the sub-issue and name the branch `wi/WI-NNN-AN` |
| None of these | Give the user the prompt and the commands to open each worker: `git worktree add ../WI-NNN-w<n>` and an agent in each |

Start no more workers than there are activities available; more only race and lose.

## Step 4: Watch and refill

While workers run, report with `/work status WI-NNN`. When one finishes, the merge of its pull
request may make new activities available:

- Trunk: a person merges. Say which pull requests are ready, and which activities each merge
  unblocks.
- Integration with `integration_merge: agent`: review each ready pull request as a second agent
  against the product's quality criteria, merge it into the integration branch when checks
  pass, then start workers for what became available.

Repeat until no activity is pending or every remaining one waits on a person.

## Step 5: Close

When every activity is completed on the base:

- Trunk: products are accepted as their pull requests merge. Close the tracking issue and set
  the work item `done` in a final small pull request, or `review` if a product is not accepted.
- Integration: open the pull request from `wi/WI-NNN-<slug>` into `base_branch`, its body the
  product breakdown with each product's criteria, `Closes #<tracking issue>`. Its last commit
  sets every product `accepted` and the work item `done`. A person merges it.

## Report

```
WI-012 dispatched: integration shape, base wi/WI-012-rate-limits
Issues: #140 (tracking), #141-#145
Workers: agent-012-1, agent-012-2, agent-012-3

  → WI-012-A1  agent-012-1   draft PR #146
  → WI-012-A2  agent-012-2   claimed 4 min ago
  ⊕ WI-012-A4  agent-012-3   claiming
  ○ WI-012-A3  waits on A1, A2
  ⌛ WI-012-A5  human: #145 assigned to Jo
```
