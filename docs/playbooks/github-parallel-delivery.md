# Playbook: parallel delivery through GitHub

How to go from "implement this feature" to merged code with several agents working at once,
using work items, activities and tasks together with the ordinary GitHub flow of branches,
pull requests and issues. The design behind it is
[DD-18](../about/design-decisions.md#dd-18-coordination-through-github-plan-in-the-repository-claims-as-branches).

## In one paragraph

The work skill plans the feature as a work item: the products it will leave behind, and the
activities that produce them. The plan is committed to the repository. Each activity becomes a
branch, `wi/WI-012-A3`, and one pull request; creating that branch on the remote is how a worker
claims the activity, and git guarantees only one worker can. Each task is a commit. Issues
mirror the plan for people. Several agents, each in its own checkout, claim and work activities
in parallel, and the work item is done when every activity's pull request has merged.

## How the pieces map

| Work skill | Git and GitHub | Who writes it |
|---|---|---|
| Work item `WI-012` | A folder in the repository; a tracking issue | The planner |
| Plan approval | Merging the planning pull request (trunk), or the user's yes in conversation (integration) | A person |
| Activity `WI-012-A3` | Branch `wi/WI-012-A3`, one pull request, a sub-issue | The worker that claimed it |
| Claim | Creating that branch on the remote | `claim.mjs`, for the worker |
| Task `WI-012-A3-T2` | A commit `feat(WI-012-A3-T2): …`; a ticked line in the pull request | The worker |
| Product `WI-012-D2` and its quality criteria | The review checklist on the pull requests that produce it | The planner; ticked by the reviewer |
| Product accepted | The pull request that completes it, approved and merged | The approver, then whoever merges |
| Human task | A sub-issue assigned to a person, label `actor:human` | The dispatcher |
| Blocker | `blockers:` in `progress.yaml`, a comment and `blocked` label on GitHub | The worker |

## Is the isolation the same?

Not if you only move the files. Lock files exclude workers only on one filesystem; two agents
in two worktrees each see their own `locks/` and both claim the same activity. Putting the YAML
plan in an issue body does not help either: GitHub replaces an issue body without checking what
it replaced, so two agents updating it lose one update, and two agents can both assign
themselves to an issue.

The same isolation comes from a branch. A push with `--force-with-lease=refs/heads/wi/WI-012-A3:`
tells the server to create the branch only if it does not exist, and the server enforces that
atomically. Of any number of agents racing for one activity, exactly one succeeds; the rest get
exit code 3 from `claim.mjs` and pick something else. The repository's tests race six clones for
one activity to prove it.

So the plan stays in the repository, where it is reviewed and versioned with the code. Issues
are a view of it for people, never the place agents coordinate.

## Set up once

1. Install the work skill (version 3.2.0 or later) into the repository: see
   [Installing the skills](../../DEPLOYMENT.md).
2. Add to `.aaw-config.yaml` at the repository root, and commit it:

   ```yaml
   work_items_path: ./change/work-items/   # must be inside the repository
   coordination: github
   base_branch: main
   issues: github                          # or none, to skip the issue mirror
   integration_merge: human                # or agent, to let agents merge into a work item's own branch
   ```

3. Check it:

   ```bash
   node .agents/skills/work/bin/check.mjs
   ```

4. Make sure workers can create branches matching `wi/*`: no ruleset or branch protection may
   forbid it. Protect `main` as usual, with required checks and reviews.
5. Give the agent GitHub access if you want issues: a GitHub MCP server or the `gh` command.
   Without it, everything works except the issue mirror.
6. Optional: create the labels `actor:human` and `blocked`.

## The flow, end to end

```
 you:  "/work start add rate limiting to the public API, and run it in parallel"
   │
   ├─ 1. Triage, scope, discovery, plan          (one agent, in conversation with you)
   │       products → product flow → activities, written to WI-012-…/
   │
   ├─ 2. You approve the plan
   │
   ├─ 3. /work dispatch WI-012
   │       push the plan (planning PR, or integration branch)
   │       tracking issue #140, sub-issues #141…#145
   │       start N workers, each in its own checkout
   │
   ├─ 4. Each worker, in a loop                    (in parallel)
   │       read progress.yaml from the base
   │       claim.mjs claim WI-012-A2  ── exit 3? pick another
   │       commit per task, push, draft PR "Closes #142"
   │       last commit: activity completed, product state set; PR ready
   │
   ├─ 5. Review and merge                          (people; or agents into an integration branch)
   │       each merge may unblock the next activities → dispatch refills workers
   │
   └─ 6. Close
           trunk: last PR merged, tracking issue closed
           integration: one PR wi/WI-012-… → main, merged by you
```

### 1. Plan

Say what you want. `/work start` triages it; a feature is usually a change or an intervention.
It scopes it with you, researches options where the approach is open, and plans it products
first: what will exist at the end, then the activities that produce each. See
[the start flow](../skills/work.md#start-work-start).

For parallel work, push on the plan before approving it:

- **Activities that touch different files.** Two activities editing the same lines meet as a
  merge conflict. Split by module, layer or file where you can.
- **Contracts first.** If two activities meet at an interface, make the interface its own small
  activity that both depend on, so both build against something merged.
- **Few dependencies.** Each `depends_on` is a wait for a merge. The plan's activity graph shows
  how many workers can start at once.
- **Sized for a pull request.** An activity is one reviewable pull request: one to five tasks,
  a few hundred lines of change at most.

### 2. Approve

Read the product breakdown and the activity graph. The questions that matter: is every product
something a reviewer can check, and do the quality criteria say how? Those criteria become the
review checklist on every pull request.

### 3. Dispatch

`/work dispatch WI-012` asks which shape, recommending one:

| Shape | Choose it when | What you merge |
|---|---|---|
| Trunk | Each activity can land on `main` alone, behind a feature flag if needed | The planning pull request, then every activity pull request |
| Integration | The feature must land whole, or you want no wait before work starts | One pull request at the end, plus activity pull requests if `integration_merge: human` |

It then creates the issues (when configured) and starts workers, as many as there are
activities ready, five at most. How it starts them depends on the tool it runs in:

| You run | Workers are |
|---|---|
| An agent that starts sub-agents in isolated worktrees (Claude Code, for one) | One sub-agent per worker, each in its own worktree |
| An agent that can start other cloud or background sessions | One session per worker on the repository |
| A coding agent you assign to issues (GitHub Copilot's, for one) | The dispatcher claims the activity for it, then assigns the sub-issue and names the branch |
| Anything else | You open them: `git worktree add ../WI-012-w2`, then an agent in each with the prompt dispatch gives you |

Every worker gets the same prompt: run `/work progress WI-012` with `coordination: github`,
its worker id and the base branch.

### 4. Workers

Each worker loops until nothing is left for it:

```bash
git fetch origin
node .agents/skills/work/bin/claim.mjs list WI-012            # what is held
# choose a pending activity whose dependencies are completed on the base
node .agents/skills/work/bin/claim.mjs claim WI-012-A2 \
  --base main --worker agent-012-2 --checkout                 # exit 3: choose another
# per task: change, update only WI-012-A2's block in progress.yaml, commit, push
# after the first task: open a draft pull request, "Closes #142"
# last task: activity completed, product state set, pull request ready for review
```

Workers never touch `locks/`, `changelog.log` or the header of `progress.yaml` (`version`,
`last_modified`). Each pushes after every task, which renews its claim: a claim expires an
hour after the branch's newest commit for an agent, eight hours for a person, and an open pull
request never expires.

### 5. Review and merge

Review each pull request against the product's quality criteria in its body. Then:

- Trunk: merge it. The merge is the product's acceptance when it completes the product.
- Integration, `integration_merge: human`: merge it into the work item's branch.
- Integration, `integration_merge: agent`: a second agent reviews and merges into the work
  item's branch once checks pass. You review the whole at the end.

Each merge may make new activities available. `/work status WI-012` says which pull requests
unblock what; the dispatcher starts workers for them.

### 6. Close

When every activity is completed on the base:

- Trunk: a last small pull request sets the work item `done` (or `review`, if a product still
  awaits acceptance) and closes the tracking issue.
- Integration: dispatch opens the pull request from `wi/WI-012-<slug>` into `main`, with the
  product breakdown and `Closes #140`. Its last commit marks the products accepted and the work
  item done. You merge it.

## People in the loop

| Moment | What a person does | Can an agent do it |
|---|---|---|
| Approving the plan | Reads products, criteria, activity graph | No |
| Human tasks (`actor: human`) | Does the task, ticks it on the sub-issue, tells the agent | No; agents mark it awaiting a person |
| Reviewing an activity | Checks the pull request against the quality criteria | A second agent, in the integration shape with `integration_merge: agent` |
| Merging into `main` | Merges | Never |
| Resolving a blocker | Answers the comment, removes `blocked` | Only if it needs no decision |

## When something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| `claim.mjs` exits 3 | Another worker holds it, or won the race | Nothing: the worker picks another activity |
| A claim branch with old commits, no pull request | The worker died | Any worker runs `claim.mjs takeover WI-012-A2`; it keeps the dead worker's commits and verifies them before resuming |
| A conflict in `progress.yaml` on rebase | Two activities' blocks were close together | Keep both sides; each activity owns only its block |
| A conflict in code | Two activities touched the same lines | Resolve in the later pull request; next time, plan the split along file boundaries |
| A pull request rejected | The product does not meet its criteria | The worker fixes it on the same branch; the base never claimed acceptance |
| An activity no longer needed | Plans change | Close its pull request with a reason, `claim.mjs release` if none is open, and mark the activity `skipped` in the next merged change |
| Workers idle while activities are pending | Waiting on merges | Merge the ready pull requests; `/work status` lists them |

## Without GitHub, or without issues

The claim is a git branch, so it works on any git host: GitLab, Bitbucket, Gitea or a bare
repository on a shared server. Only the issue mirror and the pull request steps need the host's
own features; set `issues: none` and open merge requests by hand or with the host's tools.

## Checklist

- [ ] `coordination: github` and work items inside the repository; `check.mjs` passes
- [ ] Workers can create `wi/*` branches; `main` is protected
- [ ] The plan's activities split along file boundaries, with contracts first
- [ ] Shape chosen: trunk or integration
- [ ] Every worker has its own checkout and its own worker id
- [ ] Every pull request names the product it produces and carries its quality criteria
- [ ] Only people merge into `main`
