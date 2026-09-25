// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * AAW CLI entry point.
 *
 * Commands:
 *   aaw install            Bootstrap/install a workspace
 *   aaw status [WI-NNN]    Show pool status, or one work item
 *   aaw verify             Sanity-check the local-fs backend can read+write
 *
 * The CLI is bundled with esbuild into a single bin/aaw.js for the
 * submodule deployment path; npm-published builds use dist/cli.js.
 */

import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findWorkspaceRoot, loadConfig } from "./config.js";
import { runClaim } from "./commands/claim.js";
import { runInit } from "./commands/init.js";
import { runInstallCommand } from "./commands/install.js";
import { runLint } from "./commands/lint.js";
import { runMigrate } from "./commands/migrate.js";
import { runNextTask } from "./commands/next-task.js";
import { runRelease } from "./commands/release.js";
import { runRunner } from "./commands/runner.js";
import { runStatus } from "./commands/status.js";
import { runVerify } from "./commands/verify.js";

const HELP = `aaw — AI-Assisted Work CLI

Usage:
  aaw install                         Bootstrap/install this workspace
  aaw install --workspace PATH        Bootstrap/install another workspace
  aaw install --framework PATH        Install another AAW-family framework
  aaw status [WI-NNN | IN-NNN]        List work items, or show one
  aaw next-task [WI-NNN]              Show the next claimable task
  aaw claim ACTIVITY_ID [--agent ID] [--ttl SECONDS]
                                      Atomically claim an activity
  aaw release ACTIVITY_ID [--reason REASON]
                                      Release an activity (must be terminal first)
  aaw runner start [--pool POOL] [--interval SECONDS]
                                      Long-lived poller; reports claimable work
  aaw lint                            Report duplicate IDs, invalid statuses, cycles
  aaw migrate v1 [--dry-run]          Move v1 layout to v2 (renumber WIP→WI etc.)
  aaw verify                          Sanity-check the local-fs backend
  aaw --version                       Print CLI version
  aaw --help                          Show this help

Workspace config lives at .aaw-config.yaml (created by 'aaw install').
'aaw init' is kept as a compatibility alias for 'aaw install'.
`;

/**
 * Replaced at bundle time by build.mjs with the version from package.json.
 * The fallback is what you see when running from source rather than the bundle.
 */
declare const __AAW_VERSION__: string | undefined;
const VERSION = typeof __AAW_VERSION__ === "string" ? __AAW_VERSION__ : "0.0.0-dev";

function resolveAawRoot(): string {
  const self = fileURLToPath(import.meta.url);
  const dir = path.dirname(self);
  if (path.basename(dir) === "bin") return path.resolve(dir, "..");
  return path.resolve(dir, "..", "..", "..");
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h" || command === "help") {
    process.stdout.write(HELP);
    return 0;
  }
  if (command === "--version" || command === "-v") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  // Commands that don't need an existing config:
  if (command === "init") {
    return runInit({ cwd: process.cwd(), frameworkRoot: resolveAawRoot() });
  }
  if (command === "install") {
    return runInstallCommand({ args: rest });
  }

  // Commands that need a workspace + config:
  const workspaceRoot = await findWorkspaceRoot(process.cwd());
  const config = await loadConfig(workspaceRoot);

  switch (command) {
    case "status":
      return runStatus({ config, args: rest });
    case "verify":
      return runVerify({ config });
    case "lint":
      return runLint({ config });
    case "claim":
      return runClaim({ config, args: rest });
    case "release":
      return runRelease({ config, args: rest });
    case "next-task":
      return runNextTask({ config, args: rest });
    case "runner":
      return runRunner({ config, args: rest });
    case "migrate":
      return runMigrate({ config, args: rest });
    default:
      process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
      return 2;
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    if (process.env.AAW_DEBUG) {
      process.stderr.write(`${(err as Error).stack ?? ""}\n`);
    }
    process.exit(1);
  },
);