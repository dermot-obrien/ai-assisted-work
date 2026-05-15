// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw claim ACTIVITY_ID [--agent ID] [--ttl SECONDS]`
 *
 * Manually claim an activity from the shell. Mostly useful for testing
 * the protocol and for emergency interventions; in normal use the
 * skills running inside the AI tool will claim activities themselves.
 */

import process from "node:process";
import { ClaimConflictError } from "@aaw/protocol";
import { LocalFsBackend } from "../backends/local-fs/index.js";
import type { AawConfig } from "../config.js";

interface ClaimInput {
  config: AawConfig;
  args: string[];
}

export async function runClaim(input: ClaimInput): Promise<number> {
  const activityId = input.args[0];
  if (!activityId) {
    process.stderr.write("aaw claim: missing ACTIVITY_ID (e.g. WI-001-A1)\n");
    return 2;
  }
  const opts = parseFlags(input.args.slice(1));
  const agentId = opts.agent ?? `agent-${randomId()}`;
  const ttlSeconds = opts.ttl ?? 3600; // 1 hour default

  const backend = new LocalFsBackend(input.config);
  try {
    const claim = await backend.claimActivity(activityId, agentId, ttlSeconds);
    process.stdout.write(
      `Claimed ${activityId} as ${agentId} until ${claim.expires}\n`,
    );
    return 0;
  } catch (err) {
    if (err instanceof ClaimConflictError) {
      process.stderr.write(
        `aaw claim: ${activityId} is held by ${err.currentHolder ?? "another worker"}\n`,
      );
      return 1;
    }
    process.stderr.write(`aaw claim: ${(err as Error).message}\n`);
    return 1;
  }
}

function parseFlags(args: string[]): { agent?: string; ttl?: number } {
  const out: { agent?: string; ttl?: number } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--agent" && i + 1 < args.length) {
      out.agent = args[++i];
    } else if (a === "--ttl" && i + 1 < args.length) {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) out.ttl = n;
    }
  }
  return out;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 8);
}
