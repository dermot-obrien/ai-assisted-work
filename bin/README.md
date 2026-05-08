# bin/

Bundled CLI entry point lives here once `packages/cli` is built. The submodule install path runs `node bin/aaw.js init` from the repo root after `git submodule add`.

This directory is currently empty — the bundle is produced by `npm run build` in `packages/cli/`.
