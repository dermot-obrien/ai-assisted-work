# Open pull requests: `/thread prs`

One table of every open pull request across the user's repositories, each with its state, its
context and a recommendation. It reports; it changes nothing until the user says which
recommendations to act on.

## 1. Scope

Cover every account and organisation the session can see:

```bash
gh auth status                       # the hosts and accounts signed in
gh api user --jq .login              # the user's own account
gh api user/orgs --jq '.[].login'    # the organisations
```

Name any account or host the session is not signed in to as not covered. A workspace rule that
forbids reading or opening pull requests in a repository still applies; leave that repository
out and say so.

## 2. Gather

List the open pull requests per owner, then read each one:

```bash
gh search prs --owner <owner> --state open --limit 100 \
  --json repository,number,title,author,createdAt,isDraft,url
gh pr view <n> -R <owner>/<repo> \
  --json mergeable,mergeStateStatus,baseRefName,headRefName,isDraft,reviewDecision,statusCheckRollup,files
```

Unresolved review conversations block a merge where a branch rule requires them resolved, and
`gh pr view` does not show them:

```bash
gh api graphql -f query='query{repository(owner:"<owner>",name:"<repo>"){pullRequest(number:<n>){
  reviewThreads(first:50){nodes{isResolved path comments(first:1){nodes{author{login} body}}}}}}}'
```

`mergeable` is `UNKNOWN` while GitHub computes it; read it again before reporting it. A check
that failed and then passed on a later run is superseded, not failing.

## 3. Context

For each pull request, find what it belongs to:

- **The thread.** Search the store for the pull request's `owner/repo#n`, its URL or its head
  branch: `node bin/thread.mjs tree --json --all`, then match descriptions, notes and outcomes.
- **Who opened it.** This chat, another chat (agent branch prefixes such as `claude/`,
  `cursor/`, `agent/`), the user, or a bot.
- **Clashes.** Two pull requests in one repository against one base that change the same file.
  Also look across repositories for an order that matters: a findings or documentation change
  that records work another pull request adds, or a change that parks work an open pull request
  is still building.
- **Recently merged or closed.** For any pull request this chat flagged that is no longer open,
  check that its files do not overwrite this chat's work, and check the current head still
  carries that work.

## 4. Recommend

Give every pull request one recommendation, in one line, with the reason:

| Recommendation | When |
|---|---|
| Merge | Mergeable, checks pass, no unresolved conversation, not a draft. Name the order when another pull request depends on it |
| Update the branch, then merge | Behind a base whose rules require it up to date. Merge the base into the branch when the branch already holds merges; a rebase replays its commits and can conflict where a merge does not |
| Fix the review comments | Unresolved conversations block it. Name each one in a phrase |
| Fix the failing checks | Name the checks, and whether they fail on the base too |
| Keep as draft, or close | A draft whose work is parked or superseded |
| Close | A stale bot update, such as one months old in an idle repository |
| Leave to its owner | Another chat's thread owns it and is active |

## 5. Report

One table, in material order: pull requests that block others first, then the rest by
repository:

```markdown
| Repository | PR | Opened | Author | State | Context | Recommendation |
|---|---|---|---|---|---|---|
| org/platform | #243 | 2 Oct | user | Behind; one unresolved review | FIBO experiment; t-abc; org/arch#73 records its findings | Fix the review comment, update the branch, then merge before org/arch#73 |
```

State is one short phrase: clean, behind, conflicting, checks failing (which), unresolved
reviews (how many), draft. After the table, list any clashes and the order they need. End with
the user's actions in the wrap table (Owner, Gate, Action, Thread, Recommendation), without the
closing line.

## 6. Act, when asked

Act only on the recommendations the user names. Merge in the stated order. Workspace rules win:
where a repository forbids merging, the action stays the user's. Before merging another chat's
pull request, check the tree's ownership notes (see [ownership.md](ownership.md)). Fix a review
comment before resolving its conversation, and reply saying what changed. Never merge a draft.
After each merge, check the next pull request in the order is still mergeable.
