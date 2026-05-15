// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw next-task [WI-NNN]`
 *
 * Identify the next claimable task in a work item, respecting activity
 * dependencies and current task progression. Mirrors the next-task skill
 * but runs from the shell.
 *
 * Without an argument, scans all work items and returns the first
 * claimable task across the workspace (lowest WI ID, lowest activity ID,
 * lowest task ID).
 */

import process from "node:process";
import { LocalFsBackend } from "../backends/local-fs/index.js";
import type { AawConfig } from "../config.js";
import type { Activity, Task, WorkItem } from "@aaw/protocol";

interface NextTaskInput {
  config: AawConfig;
  args: string[];
}

interface Candidate {
  workItem: WorkItem;
  activity: Activity;
  task: Task;
}

export async function runNextTask(input: NextTaskInput): Promise<number> {
  const target = input.args[0];
  const backend = new LocalFsBackend(input.config);
  const items = await backend.listPoolWork(input.config.tenant);

  const candidates = items
    .filter((wi) => (target ? wi.id === target : wi.status !== "done" && wi.status !== "abandoned"))
    .flatMap(findNextTaskInWorkItem);

  if (candidates.length === 0) {
    if (target) {
      process.stdout.write(`No claimable task in ${target}.\n`);
    } else {
      process.stdout.write("No claimable task across the workspace.\n");
    }
    return 0;
  }

  // Pick the first by ID order if scanning all; if a specific WI was asked,
  // use the one inside it.
  const c = candidates[0]!;
  process.stdout.write(`Next: ${c.task.id}\n`);
  process.stdout.write(`  Work item: ${c.workItem.id} — ${c.workItem.title}\n`);
  process.stdout.write(`  Activity:  ${c.activity.id} — ${c.activity.title}\n`);
  process.stdout.write(`  Task:      ${c.task.title}\n`);
  if (c.activity.dependsOn.length > 0) {
    process.stdout.write(`  Activity depends on: ${c.activity.dependsOn.join(", ")}\n`);
  }
  if (c.task.actor === "human") {
    process.stdout.write(`  Actor:     human (agent should mark awaiting_human)\n`);
  } else {
    process.stdout.write(`  Actor:     ${c.task.actor}\n`);
  }
  return 0;
}

function findNextTaskInWorkItem(wi: WorkItem): Candidate[] {
  // Eligible activities: pending/in_progress AND all depends_on are completed.
  const eligible = wi.activities.filter((a) => {
    if (a.status !== "pending" && a.status !== "in_progress") return false;
    return a.dependsOn.every(
      (id) => wi.activities.find((x) => x.id === id)?.status === "completed",
    );
  });

  for (const activity of eligible) {
    const task = activity.tasks.find((t) => t.status === "pending");
    if (task) return [{ workItem: wi, activity, task }];
  }
  return [];
}
