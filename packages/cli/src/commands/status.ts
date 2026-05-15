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
    if (target.startsWith("IN-")) {
      return showInitiative(backend, target);
    }
    return showWorkItem(backend, target);
  }

  // Bare `aaw status`: initiatives at top, then work items grouped by initiative.
  const tenantState = await backend.getState({
    kind: "tenant",
    tenantId: input.config.tenant,
  });
  if (tenantState.kind !== "tenant") return 1;
  const { initiatives, workItems } = tenantState.data;

  if (initiatives.length === 0 && workItems.length === 0) {
    process.stdout.write(
      `No work items or initiatives in ${input.config.workItemsPath}\n` +
        `(run 'aaw init' if this workspace is not yet configured)\n`,
    );
    return 0;
  }

  if (initiatives.length > 0) {
    process.stdout.write(`Initiatives in ${input.config.initiativesPath}:\n`);
    for (const init of initiatives) {
      const tick = symbol(init.status);
      const wiCount = workItems.filter((w) => w.initiativeId === init.id).length;
      process.stdout.write(
        `  ${tick} ${init.id} — ${init.title} (${init.status}, ${wiCount} WI${wiCount === 1 ? "" : "s"})\n`,
      );
    }
    process.stdout.write("\n");
  }

  if (workItems.length === 0) return 0;

  // Group work items by initiative_id (or "Standalone").
  const byInit = new Map<string, typeof workItems>();
  for (const wi of workItems) {
    const key = wi.initiativeId ?? "__standalone";
    const list = byInit.get(key) ?? [];
    list.push(wi);
    byInit.set(key, list);
  }

  if (initiatives.length > 0) {
    process.stdout.write(`Work items in ${input.config.workItemsPath}:\n`);
    // Render in initiative order (defined by initiative listing), then standalone.
    for (const init of initiatives) {
      const list = byInit.get(init.id);
      if (!list || list.length === 0) continue;
      process.stdout.write(`\n  ${init.id}:\n`);
      for (const wi of list) {
        renderWorkItemLine(wi, "    ");
      }
    }
    const standalone = byInit.get("__standalone");
    if (standalone && standalone.length > 0) {
      process.stdout.write(`\n  Standalone:\n`);
      for (const wi of standalone) {
        renderWorkItemLine(wi, "    ");
      }
    }
  } else {
    process.stdout.write(`Work items in ${input.config.workItemsPath}:\n`);
    for (const wi of workItems) {
      renderWorkItemLine(wi, "  ");
    }
  }

  return 0;
}

async function showWorkItem(
  backend: LocalFsBackend,
  workItemId: string,
): Promise<number> {
  const result = await backend.getState({ kind: "workItem", workItemId });
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

async function showInitiative(
  backend: LocalFsBackend,
  initiativeId: string,
): Promise<number> {
  const result = await backend.getState({ kind: "initiative", initiativeId });
  if (result.kind !== "initiative") return 1;
  const init = result.data;
  process.stdout.write(`${init.id} — ${init.title}\n`);
  process.stdout.write(`  status: ${init.status}\n`);
  process.stdout.write(
    `  time horizon: ${init.targetStart ?? "?"} – ${init.targetEnd ?? "?"}\n`,
  );
  process.stdout.write(`  owner: ${init.owner ?? "none"}\n`);
  if (init.rootWorkItem) {
    process.stdout.write(`  root work item: ${init.rootWorkItem}\n`);
  }
  process.stdout.write("\n");

  // Work items linked to this initiative — read from the cached array.
  if (init.workItems.length === 0) {
    process.stdout.write(
      `  (No work items registered. They link via 'initiative_id' in their progress.yaml.)\n`,
    );
    return 0;
  }
  process.stdout.write(`  Work items:\n`);
  for (const ref of init.workItems) {
    const tick = symbol(ref.status);
    process.stdout.write(`    ${tick} ${ref.id} — ${ref.title} (${ref.status})\n`);
  }
  return 0;
}

function renderWorkItemLine(
  wi: { id: string; title: string; status: string; activities: Array<{ status: string }> },
  indent: string,
): void {
  const tick = symbol(wi.status);
  const counts = activityCounts(wi);
  process.stdout.write(
    `${indent}${tick} ${wi.id} — ${wi.title} (${wi.status}, ${counts})\n`,
  );
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