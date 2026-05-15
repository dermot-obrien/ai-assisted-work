# @aaw/cli

The AI-Assisted Work CLI. Provides `aaw init` (workspace bootstrap) and runtime commands (`aaw status`, `aaw claim`, etc.).

This package is under construction as part of the v2 redesign. See the repo root README for current status.

## Distribution

Two delivery paths:

1. **Bundled submodule** (primary, ships first): the repo is added as a git submodule; users run `node .ai-assisted-work/bin/aaw.js init`. The `bin/aaw.js` is a single self-contained file produced by `npm run build`.
2. **npm package** (follow-on): `npx @aaw/cli init`. Same code, different transport.
