# Open pull requests: `/thread prs`

One table of every open pull request across the user's repositories, each with its state, its
context and a recommendation. It reports; it changes nothing until the user says which
recommendations to act on.

## 1. Scope

Cover every host and every account signed in, and every organisation each account belongs to.
`gh` uses only the active account on the default host unless told otherwise, so go through them
one by one:

```bash
gh auth status                                         # every host, and every account on it
GH_TOKEN=$(gh auth token --hostname <host> --user <account>) \
  gh api --hostname <host> user --jq .login            # that account
GH_TOKEN=... gh api --hostname <host> user/orgs --jq '.[].login'   # its organisations
```

Run every later command for each host and account the same way: `GH_TOKEN` set to that
account's token, and `--hostname <host>` on `gh api`, or the host in `GH_HOST` for `gh search`
and `gh pr`. Name any host or account that cannot be read as not covered. A workspace rule that
forbids reading or opening pull requests in a repository still applies; leave that repository
out and say so.

## 2. Gather

List the open pull requests per owner, then read each one:

```bash
gh search prs --owner <owner> --state open --limit 1000 \
  --json repository,number,title,author,createdAt,isDraft,url
gh pr view <n> -R <owner>/<repo> \
  --json mergeable,mergeStateStatus,baseRefName,headRefName,isDraft,reviewDecision,statusCheckRollup,files
```

Search returns at most 1,000 results. If an owner returns exactly that many, list it repository
by repository with `gh pr list -R <owner>/<repo> --state open --limit 1000` instead, so nothing
is dropped silently.

Unresolved review conversations block a merge where a branch rule requires them resolved, and
`gh pr view` does not show them. Page through all of them:

```bash
gh api graphql --paginate -f query='query($endCursor:String){repository(owner:"<owner>",name:"<repo>"){
  pullRequest(number:<n>){reviewThreads(first:100,after:$endCursor){
    pageInfo{hasNextPage endCursor}
    nodes{isResolved path comments(first:1){nodes{author{login} body}}}}}}}'
```

`mergeable` is `UNKNOWN` while GitHub computes it; read it again before reporting it. A check
that failed and then passed on a later run is superseded, not failing. `reviewDecision` is
`APPROVED`, `CHANGES_REQUESTED`, `REVIEW_REQUIRED`, or empty where no review is required.

## 3. Context

For each pull request, find what it belongs to:

- **The thread.** Search the store for the pull request's `owner/repo#n`, its URL or its head
  branch: `node <this skill's directory>/bin/thread.mjs tree --json --all`, the same script the
  rest of this skill runs, then match descriptions, notes and outcomes.
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
| Merge | Mergeable, checks pass, no unresolved conversation, not a draft, and `reviewDecision` is `APPROVED` or empty. Name the order when another pull request depends on it |
| Get the review | `reviewDecision` is `REVIEW_REQUIRED`, or `CHANGES_REQUESTED` and the changes are not yet made. Name the reviewer where one is requested |
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
reviews (how many), review required or changes requested, draft. After the table, list any
clashes and the order they need. End with the user's actions in the wrap table (Owner, Gate,
Action, Thread, Recommendation), without the closing line.

## 6. Act, when asked

Act only on the recommendations the user names. Merge in the stated order, and only a pull
request whose review decision allows it. Workspace rules win: where a repository forbids
merging, the action stays the user's. Only the master merges (see [ownership.md](ownership.md)),
unless the workspace sets `threads_merges: own`: check the tree's owner note first, and in a
worker hand the ready pull requests to the master instead of merging them. Fix a review comment before resolving
its conversation, and reply saying what changed. Never merge a draft. After each merge, check
the next pull request in the order is still mergeable.
