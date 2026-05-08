// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

import process from "node:process";
import { LocalFsBackend } from "../backends/local-fs/index.js";
import type { AawConfig } from "../config.js";

interface StatusInput {
  config: AawConfig;
  args: string[];
}

export async function runStatus(input: StatusInput): Promise<number> {
  const backend = new LocalFsBackend(input.config);
  const target = input.args[0];

  if (target) {
    const result = await backend.getState({ kind: "workItem", workItemId: target });
    if (result.kind !== "workItem") return 1;
    const wi = result.data;
    process.stdout.write(`${wi.id} — ${wi.title}\n`);
    process.stdout.write(`  type: ${wi.type}, status: ${wi.status}\n`);
    process.stdout.write(`  initiative: ${wi.initiativeId ?? "none"}\n`);
    process.stdout.write(`  version: ${wi.version}\n\n`);
    for (const a of wi.activities) {
      const tick = symbol(a.status);
      process.stdout.write(`  ${tick} ${a.id} — ${a.title} (${a.status})\n`);
      for (const t of a.tasks) {
        const ttick = symbol(t.status);
        process.stdout.write(`      ${ttick} ${t.id} — ${t.title}\n`);
      }
    }
    return 0;
  }

  const items = await backend.listPoolWork(input.config.tenant);
  if (items.length === 0) {
    process.stdout.write(
      `No work items in ${input.config.workItemsPath}\n` +
        `(run 'aaw init' if this workspace is not yet configured)\n`,
    );
    return 0;
  }
  process.stdout.write(`Work items in ${input.config.workItemsPath}:\n`);
  for (const wi of items) {
    const tick = symbol(wi.status);
    const counts = activityCounts(wi);
    process.stdout.write(
      `  ${tick} ${wi.id} — ${wi.title} (${wi.status}, ${counts})\n`,
    );
  }
  return 0;
}

function activityCounts(wi: {
  activities: Array<{ status: string }>;
}): string {
  const total = wi.activities.length;
  const done = wi.activities.filter((a) => a.status === "completed").length;
  return `${done}/${total} activities done`;
}

function symbol(status: string): string {
  switch (status) {
    case "completed":
    case "done":
      return "✓";
    case "in_progress":
      return "→";
    case "blocked":
      return "✗";
    case "awaiting_human":
      return "⌛";
    default:
      return "○";
  }
}