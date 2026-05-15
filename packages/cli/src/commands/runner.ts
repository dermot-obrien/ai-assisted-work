// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw runner start [--pool POOL] [--interval SECONDS]`
 *
 * Long-lived process that polls for claimable activities and prints them.
 * The skeleton of a headless agent runner: in a future version it will
 * actually invoke an LLM to do the work, but for now it's the polling
 * loop and "what would I claim next?" reporting that's useful for
 * watching pool activity.
 *
 * SIGINT (Ctrl-C) and SIGTERM exit cleanly.
 */

import process from "node:process";
import { LocalFsBackend } from "../backends/local-fs/index.js";
import type { AawConfig } from "../config.js";

interface RunnerInput {
  config: AawConfig;
  args: string[];
}

const DEFAULT_INTERVAL_SECONDS = 30;

export async function runRunner(input: RunnerInput): Promise<number> {
  const sub = input.args[0];
  if (sub !== "start") {
    process.stderr.write(
      "aaw runner: expected subcommand 'start' (e.g. `aaw runner start --pool default`)\n",
    );
    return 2;
  }

  const opts = parseFlags(input.args.slice(1));
  const pool = opts.pool ?? input.config.tenant;
  const intervalSeconds = opts.interval ?? DEFAULT_INTERVAL_SECONDS;

  const backend = new LocalFsBackend(input.config);

  process.stdout.write(
    `aaw runner: polling pool='${pool}' every ${intervalSeconds}s.\n` +
      `Workspace: ${input.config.workspaceRoot}\n` +
      `Press Ctrl-C to stop.\n\n`,
  );

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    process.stdout.write("\naaw runner: stopping.\n");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (!stopped) {
    try {
      const items = await backend.listPoolWork(pool, { claimableOnly: true });
      const claimable = items.flatMap(findClaimableActivities);
      const ts = new Date().toISOString();
      if (claimable.length === 0) {
        process.stdout.write(`[${ts}] no claimable activities\n`);
      } else {
        process.stdout.write(`[${ts}] ${claimable.length} claimable:\n`);
        for (const c of claimable.slice(0, 10)) {
          process.stdout.write(
            `   ${c.workItemId}/${c.activityId} (${c.actor}) — ${c.title}\n`,
          );
        }
        if (claimable.length > 10) {
          process.stdout.write(`   …and ${claimable.length - 10} more\n`);
        }
      }
    } catch (err) {
      const ts = new Date().toISOString();
      process.stderr.write(`[${ts}] poll error: ${(err as Error).message}\n`);
    }

    if (stopped) break;
    await sleep(intervalSeconds * 1000, () => stopped);
  }
  return 0;
}

interface ClaimableSummary {
  workItemId: string;
  activityId: string;
  title: string;
  actor: string;
}

function findClaimableActivities(wi: {
  id: string;
  activities: Array<{
    id: string;
    title: string;
    status: string;
    actor: string;
    dependsOn: string[];
  }>;
}): ClaimableSummary[] {
  return wi.activities
    .filter(
      (a) =>
        a.status === "pending" &&
        a.dependsOn.every(
          (id) => wi.activities.find((x) => x.id === id)?.status === "completed",
        ) &&
        a.actor !== "human",
    )
    .map((a) => ({
      workItemId: wi.id,
      activityId: a.id,
      title: a.title,
      actor: a.actor,
    }));
}

function parseFlags(args: string[]): { pool?: string; interval?: number } {
  const out: { pool?: string; interval?: number } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pool" && i + 1 < args.length) {
      out.pool = args[++i];
    } else if (args[i] === "--interval" && i + 1 < args.length) {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) out.interval = n;
    }
  }
  return out;
}

/** Sleep with cancellation: re-checks `stopped()` every 250ms. */
async function sleep(ms: number, stopped: () => boolean): Promise<void> {
  const step = 250;
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    if (stopped()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, Math.min(step, ms - elapsed)));
  }
}
