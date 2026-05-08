// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * AAW CLI entry point.
 *
 * Commands:
 *   aaw init               Bootstrap a workspace (interactive)
 *   aaw status [WI-NNN]    Show pool status, or one work item
 *   aaw verify             Sanity-check the local-fs backend can read+write
 *
 * The CLI is bundled with esbuild into a single bin/aaw.js for the
 * submodule deployment path; npm-published builds use dist/cli.js.
 */

import process from "node:process";
import { findWorkspaceRoot, loadConfig } from "./config.js";
import { runClaim } from "./commands/claim.js";
import { runInit } from "./commands/init.js";
import { runLint } from "./commands/lint.js";
import { runNextTask } from "./commands/next-task.js";
import { runRelease } from "./commands/release.js";
import { runStatus } from "./commands/status.js";
import { runVerify } from "./commands/verify.js";

const HELP = `aaw — AI-Assisted Work CLI

Usage:
  aaw init                            Bootstrap this workspace (interactive)
  aaw status [WI-NNN | IN-NNN]        List work items, or show one
  aaw next-task [WI-NNN]              Show the next claimable task
  aaw claim ACTIVITY_ID [--agent ID] [--ttl SECONDS]
                                      Atomically claim an activity
  aaw release ACTIVITY_ID [--reason REASON]
                                      Release an activity (must be terminal first)
  aaw lint                            Report duplicate IDs, invalid statuses, cycles
  aaw verify                          Sanity-check the local-fs backend
  aaw --version                       Print CLI version
  aaw --help                          Show this help

Workspace config lives at .aaw-config.yaml (created by 'aaw init').
`;

const VERSION = "0.0.0";

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
    return runInit({ cwd: process.cwd() });
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