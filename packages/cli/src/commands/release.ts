// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw release ACTIVITY_ID [--reason REASON]`
 *
 * Release an activity claim. The protocol requires the activity to be in a
 * terminal state (completed, blocked, skipped, abandoned) before release —
 * surfacing that clearly is most of this command's value.
 */

import process from "node:process";
import { LocalFsBackend } from "../backends/local-fs/index.js";
import type { AawConfig } from "../config.js";

interface ReleaseInput {
  config: AawConfig;
  args: string[];
}

export async function runRelease(input: ReleaseInput): Promise<number> {
  const activityId = input.args[0];
  if (!activityId) {
    process.stderr.write("aaw release: missing ACTIVITY_ID\n");
    return 2;
  }
  const opts = parseFlags(input.args.slice(1));
  const backend = new LocalFsBackend(input.config);
  try {
    await backend.releaseActivity(activityId, opts.reason);
    process.stdout.write(`Released ${activityId}\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`aaw release: ${(err as Error).message}\n`);
    return 1;
  }
}

function parseFlags(args: string[]): { reason?: string } {
  const out: { reason?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--reason" && i + 1 < args.length) {
      out.reason = args[++i];
    }
  }
  return out;
}
