# Publishing AAW to npm

The Changesets-driven release workflow at `.github/workflows/release.yml` is wired up but stops short of actually publishing because two manual steps must happen first. This document walks through them.

## One-time setup

### 1. Decide which packages to publish

The three workspace packages are currently `"private": true` in their `package.json` files:

```
packages/protocol/package.json     "private": true
packages/cli/package.json          "private": true
packages/skills/package.json       "private": true
```

This guards against accidental publication. To enable publishing, remove the `"private": true` line from each.

You can do this for all three, or for a subset (e.g. publish `@aaw/cli` and `@aaw/protocol` but keep `@aaw/skills` private if you want to ship skill content via the submodule only).

### 2. Create the npm organisation and token

1. Create the `@aaw` org at npmjs.com (if not already done): https://www.npmjs.com/org/create
2. Generate an automation token: https://www.npmjs.com/settings/{user}/tokens — choose **Automation** type so MFA doesn't block CI.
3. Restrict the token's scope to the `@aaw` org if your account has multiple orgs.

### 3. Add the token to GitHub

Repo → Settings → Secrets and variables → Actions → New repository secret:

- **Name:** `NPM_TOKEN`
- **Value:** the token from step 2

### 4. Verify GitHub permissions

The workflow needs `contents: write` and `pull-requests: write` on `GITHUB_TOKEN`. These are declared in `release.yml`'s `permissions` block — no further action needed unless your org has Actions permissions locked down further.

## How the workflow runs

On every push to `main`:

1. Build packages (typecheck, bundle).
2. Verify `bin/aaw.js` is up to date with source.
3. Invoke `changesets/action`:
   - **If pending changesets exist** → opens or updates a "chore: version packages" PR that bumps versions across the three packages and updates `CHANGELOG.md`.
   - **If a version PR was just merged** → publishes the bumped packages to npm (using `NPM_TOKEN`) and creates a GitHub Release.

## Day-to-day contributor flow

```bash
# After making changes...
npx changeset
# Pick which packages bump (or follow `fixed` rule, all three together).
# Pick semver type (patch / minor / major).
# Write a one-line changelog entry.
git add .changeset/*.md
git commit -m "Add changeset for {description}"
```

The next push to `main` opens a version PR. Merge it → release publishes.

## First publish checklist

- [ ] `private: true` removed from package(s) you want to publish
- [ ] `@aaw` npm org exists and your account is owner
- [ ] `NPM_TOKEN` secret added to repo
- [ ] At least one changeset file present (`npx changeset` to create)
- [ ] `bin/aaw.js` is committed and matches source
- [ ] Push to `main` → version PR appears → merge → publish runs

## Rollback

If a release goes out wrong, npm allows unpublishing within 72 hours (`npm unpublish @aaw/cli@2.0.0`). Beyond that, deprecate (`npm deprecate @aaw/cli@2.0.0 "broken, use 2.0.1"`) and ship a fix as a patch bump.
