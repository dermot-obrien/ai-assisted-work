# Coordination through GitHub

How workers in separate checkouts share one work item: separate worktrees, clones, cloud
sessions or machines, coordinated through the git remote and GitHub. Applies when
`.aaw-config.yaml` sets `coordination: github`. With the default, `coordination: files`, every
worker shares one checkout and [concurrency.md](concurrency.md) holds instead.

## Why the lock files are not enough

A lock in `locks/` excludes another worker only because both create the file on one
filesystem. Two workers in two clones each see their own `locks/` and their own
`progress.yaml`, so both claim the same activity and neither notices until their branches
collide. The `version` check fails the same way: each copy has its own version.

Mirroring `progress.yaml` into an issue body does not restore the guarantee. An issue edit
replaces the whole body with no check of what it replaced, so two workers editing it lose one
update; assignees and labels add without refusing, so two workers can both assign themselves.

The remote offers one operation that refuses: a ref update that states the value it expects to
replace. Pushing with `--force-with-lease=<ref>:` (the ref must not exist) creates the branch
for exactly one of several racing workers. So in this mode:

**The plan lives in the repository, the claim is a branch on the remote, and the state is
what has merged.**

## The mapping

| Work | In the repository | On GitHub |
|---|---|---|
| Work item `WI-012` | `WI-012-<slug>/` with `scope.md`, `plan.md`, `progress.yaml`, on the base branch | A tracking issue, when `issues: github` |
| Activity `WI-012-A3` | Its block in `progress.yaml` | Branch `wi/WI-012-A3` (the claim), one pull request, a sub-issue when `issues: github` |
| Task `WI-012-A3-T2` | Its entry in the activity block | One or more commits `<type>(WI-012-A3-T2): …`, a checklist line in the pull request |
| Product `WI-012-D2` | Its entry in `deliverables:` | Its quality criteria as the review checklist on the pull requests that produce it |
| Human task | `actor: human` | A sub-issue assigned to a person, label `actor:human` |
| Blocker | `blockers:` entry | A comment and the `blocked` label on the activity's sub-issue or draft pull request |

`progress.yaml` stays the source of truth. Issues are a view and a place to talk; they are
written from the file and never read back into it.

## Two shapes

| Shape | Base for activity branches | Activity pull requests merge into | Use it when |
|---|---|---|---|
| Trunk (default) | `base_branch`, usually `main` | `base_branch`, each merged by a person | Each activity is safe to land alone, behind a flag where needed |
| Integration (exception) | `wi/WI-012-<slug>`, recorded in `artifacts.base` | The integration branch; then one pull request into `base_branch` | The feature must land whole and cannot be switched off, and the workspace allows it |

In the trunk shape the plan reaches `main` in its own pull request, which a person merges:
merging the plan is approving it. In the integration shape the plan is the first commit on the
integration branch, so work starts as soon as the user approves the plan in conversation.

Prefer the trunk shape. Large distributed projects (Kubernetes, Rust, Chromium) land every
change on the trunk behind a flag or gate and release with one small change that turns it on;
a long-lived branch per feature is where merge conflicts gather. GitHub also ignores closing
keywords (`Closes #n`) on a pull request into any branch but the default one, so activity pull
requests into an integration branch close no issue. Use the integration shape only when the
work cannot be switched off, and only where the workspace's own rules allow it: a workspace
playbook that forbids it wins.

Who merges follows the workspace's rules. With `integration_merge: agent`, a worker may merge
an activity's pull request into the work item's integration branch once its checks pass and a
second agent has reviewed it against the product's quality criteria. Nothing in this mode
merges into `base_branch` without a person.

## Claiming

Use `bin/claim.mjs`, run from the worker's own checkout. It reads the system clock, so no
worker reasons about expiry from a guessed time.

```
node <skill>/bin/claim.mjs claim WI-012-A3 --base <base> --worker <your-id> --checkout
```

| Exit | Meaning | Do |
|---|---|---|
| 0 | Claimed: `wi/WI-012-A3` exists with your claim commit, checked out | Work it |
| 3 | Held by another worker, or lost the race | Pick another activity. Never retry the same one |
| 1 | A problem: no remote, the base branch missing, push refused | Report it and stop |

Before claiming, pick the activity as [progress.md](progress.md) Step 2 does, reading
`progress.yaml` from the latest base (`git fetch` first) and `claim.mjs list WI-012` for what
is held. An activity is available when it is `pending` on the base, has no claim branch, every
`depends_on` is `completed` on the base, it carries no open blocker, and its actor allows you.

The claim commit is empty and carries trailers (`Work-Claim`, `Work-Holder`,
`Work-Holder-Type`, `Work-Lease-Minutes`). The lease is an hour for an agent and eight for a
person, counted from the newest commit on the branch, so every push renews it. An open pull
request is live whatever its age: it waits on review, not on its worker.

Never write `locks/` or `changelog.log` in this mode. The branch is the lock, and the commits
and pull request timeline are the log.

## Working an activity

1. Open a draft pull request after the first task commit: title
   `<type>(WI-012-A3): <activity title>`, base the shape's base, body from the template below.
   Record its URL in the activity's `pr` field.
2. Commit each task as it completes. In the same commit, update only your own activity's block
   in `progress.yaml`: the task's `status`, `completed_by`, `completed_at`, `notes`. Push.
3. Leave the header alone (`version`, `last_modified`, `last_modified_by`, `updated`). Git
   versions the file here; bumping the header would make every pull request conflict.
4. When the last task is done, set the activity `completed` in the same final commit, set the
   product's `state` (below), mark the pull request ready, and request review from the
   product's approver.
5. Rebase on the base before review if it has moved. A conflict in `progress.yaml` is two
   activities' blocks touching; keep both.

The file on a branch states what will be true when the branch merges. Until then the base
says `pending`, the branch says otherwise, and readers combine the two (below).

## Products and acceptance

| Shape | The pull request's last commit sets the product to | Accepted when |
|---|---|---|
| Trunk | `accepted` if, after rebasing, every other activity producing it is `completed` on the base; otherwise `drafted` | The approver approves and the pull request merges |
| Integration | `in_review` | The final pull request into `base_branch` merges; its last commit sets every product `accepted` and the work item `done` |

A merge is the acceptance because nothing reaches the base without it. If review rejects the
product, the branch changes; the base never claimed acceptance.

## Reading the state

For `/work status` and `/work next`, combine three sources:

| Base `progress.yaml` | Claim branch | Pull request | Reported as |
|---|---|---|---|
| `pending` | none | none | Available, or waiting on dependencies |
| `pending` | live | none or draft | In progress, with holder |
| `pending` | expired | none | Stale: can be taken over |
| `pending` | any | ready for review | In review |
| `completed` | gone or merged | merged | Completed |

`claim.mjs list WI-012 --json` gives the branches, holders and leases. Pull requests and issues
come from whatever GitHub access the agent has (an MCP server, `gh`, or the user).

## Recovery

A worker that finds an expired claim with no open pull request runs
`claim.mjs takeover WI-012-A3 --worker <id> --checkout`. It succeeds only if the branch has not
moved since it looked, and builds on the dead worker's commits, so nothing is lost. Then follow
[recovery.md](recovery.md): verify the tasks the branch marks completed before resuming.

`claim.mjs release WI-012-A3` deletes a claim branch you hold, to give the activity back
before any pull request exists. Once a pull request is open, close it instead and say why.

## Issues, when `issues: github`

Written by `/work dispatch` from `progress.yaml`, with the URLs recorded in `artifacts.issue`
and each activity's `issue`:

- Tracking issue, titled `WI-012: <title>`: the intent from `scope.md`, the product breakdown
  as a table, a link to `plan.md` on the base, the definition of done.
- Sub-issue per activity, titled `WI-012-A3: <activity title>`: produces, depends on, the
  tasks as a checklist, the product's quality criteria, the branch name, label `actor:human`
  for a human activity. The activity's pull request says `Closes #<sub-issue>`.

A comment on the sub-issue is the place for a claim notice and for blockers. It is never the
claim.

## Pull request body

```markdown
WI-012-A3: <activity title>. Produces WI-012-D2, <product name>.
Closes #<sub-issue>   (when issues are mirrored)

## Tasks
- [x] WI-012-A3-T1 <title>
- [ ] WI-012-A3-T2 <title>

## Quality criteria for WI-012-D2
<from deliverables:, as a checklist the reviewer ticks>

Plan: <link to plan.md on the base>. Worker: <your-id>.
```

## Rules for this mode

1. Claim with `claim.mjs`, never by assigning yourself, labelling or editing an issue.
2. Exit 3 means someone else has it. Choose other work; do not retry or take over a live claim.
3. Change only your own activity's block in `progress.yaml`; never the header.
4. Push after every task, so the lease is renewed and the work survives the session.
5. One activity, one branch, one pull request. Never stack an activity on another's unmerged
   branch: wait for the dependency to merge.
6. Merge only where the workspace allows, and never into `base_branch` yourself.
