// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Bundle bin/aaw.js for the git-clone deployment path.
 *
 * Produces a single self-contained JS file with a Node shebang, runnable as
 * `node .ai-assisted-work/bin/aaw.js install` from a workspace that has AAW
 * cloned into it.
 *
 * The CLI's VERSION constant is a placeholder in source and is replaced here
 * with the real version from package.json, so `aaw --version` cannot drift
 * from the released package.
 */
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const { version } = JSON.parse(readFileSync(path.join(here, "package.json"), "utf8"));

await build({
  entryPoints: [path.join(here, "src", "cli.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(repoRoot, "bin", "aaw.js"),
  define: { __AAW_VERSION__: JSON.stringify(version) },
  banner: {
    js:
      "#!/usr/bin/env node\n" +
      "// AAW CLI bundle. Generated; do not edit.\n" +
      "import { createRequire as __aawCreateRequire } from 'module';\n" +
      "const require = __aawCreateRequire(import.meta.url);\n",
  },
  logLevel: "info",
});