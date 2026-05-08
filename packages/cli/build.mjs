/**
 * Bundle bin/aaw.js for the submodule deployment path.
 *
 * Produces a single self-contained JS file with a Node shebang, runnable as
 * `node .ai-assisted-work/bin/aaw.js init` from a parent project that has
 * AAW added as a git submodule.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

await build({
  entryPoints: [path.join(here, "src", "cli.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(repoRoot, "bin", "aaw.js"),
  banner: {
    js:
      "#!/usr/bin/env node\n" +
      "// AAW CLI bundle. Generated; do not edit.\n" +
      "import { createRequire as __aawCreateRequire } from 'module';\n" +
      "const require = __aawCreateRequire(import.meta.url);\n",
  },
  logLevel: "info",
});
