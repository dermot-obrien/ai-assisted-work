// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw lint` — walk the workspace and report data-quality issues that
 * the local-fs backend can detect:
 *
 *   - duplicate work item IDs (folders sharing a WI-NNN prefix)
 *   - invalid status / actor / type values (per @aaw/protocol enums)
 *   - missing required fields
 *   - dependency cycles between activities
 *   - activity dependencies that reference unknown activities
 *
 * Exit status:
 *   0  no issues
 *   1  issues found (or runtime error)
 */

import process from "node:process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { LocalFsBackend } from "../backends/local-fs/index.js";
import {
  validateInitiative,
  validateWorkItem,
  type Issue,
} from "../backends/local-fs/validate.js";
import type { AawConfig } from "../config.js";
import type { WorkItem } from "@aaw/protocol";

interface LintInput {
  config: AawConfig;
}

export async function runLint(input: LintInput): Promise<number> {
  const issues: Issue[] = [];

  // 1. Duplicate ID detection (folder names) — done by direct readdir so
  //    we don't filter through the backend's listWorkItems (which silently
  //    sorts by ID and would mask dupes if the second was unparseable).
  issues.push(...(await detectDuplicateFolders(input.config.workItemsPath, "WI")));
  issues.push(...(await detectDuplicateFolders(input.config.initiativesPath, "IN")));

  // 2. Schema validation against the protocol enums.
  const backend = new LocalFsBackend(input.config);
  const items = await backend.listPoolWork(input.config.tenant);
  for (const wi of items) {
    issues.push(...validateWorkItem(wi));
  }

  const stateResult = await backend.getState({ kind: "tenant", tenantId: input.config.tenant });
  if (stateResult.kind === "tenant") {
    for (const init of stateResult.data.initiatives) {
      issues.push(...validateInitiative(init));
    }
  }

  // 3. Cross-activity issues: missing dependencies, cycles.
  for (const wi of items) {
    issues.push(...detectActivityIssues(wi));
  }

  // Render
  if (issues.length === 0) {
    process.stdout.write("aaw lint: no issues\n");
    return 0;
  }

  process.stdout.write(`aaw lint: ${issues.length} issue(s)\n\n`);
  for (const issue of issues) {
    process.stdout.write(`  ✗ ${issue.path}\n      ${issue.message}\n\n`);
  }
  return 1;
}

async function detectDuplicateFolders(
  root: string,
  prefix: "WI" | "IN",
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const re = new RegExp(`^${prefix}-(\\d+)`);
  let entries: string[];
  try {
    const all = await readdir(root, { withFileTypes: true });
    entries = all.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return issues; // root doesn't exist; not a lint issue
  }
  const byId = new Map<string, string[]>();
  for (const entry of entries) {
    const m = entry.match(re);
    if (!m) continue;
    const id = `${prefix}-${m[1]!.padStart(3, "0")}`;
    const list = byId.get(id) ?? [];
    list.push(entry);
    byId.set(id, list);
  }
  for (const [id, folders] of byId) {
    if (folders.length > 1) {
      issues.push({
        path: id,
        message:
          `duplicate ID — ${folders.length} folders share this number:\n` +
          folders.map((f) => `        ${path.join(root, f)}`).join("\n"),
      });
    }
  }
  return issues;
}

function detectActivityIssues(wi: WorkItem): Issue[] {
  const issues: Issue[] = [];
  const ids = new Set(wi.activities.map((a) => a.id));

  // Missing dependencies
  for (const a of wi.activities) {
    for (const dep of a.dependsOn) {
      if (!ids.has(dep)) {
        issues.push({
          path: `${wi.id}/${a.id}.depends_on`,
          message: `references unknown activity '${dep}'`,
        });
      }
    }
  }

  // Cycles (DFS)
  const colour = new Map<string, "white" | "grey" | "black">();
  const adj = new Map<string, string[]>();
  for (const a of wi.activities) {
    colour.set(a.id, "white");
    adj.set(
      a.id,
      a.dependsOn.filter((d) => ids.has(d)),
    );
  }
  const cycles: string[] = [];
  const visit = (node: string, stack: string[]): void => {
    colour.set(node, "grey");
    for (const next of adj.get(node) ?? []) {
      const c = colour.get(next);
      if (c === "grey") {
        const start = stack.indexOf(next);
        const cycle = [...stack.slice(start), next].join(" → ");
        cycles.push(cycle);
      } else if (c === "white") {
        visit(next, [...stack, next]);
      }
    }
    colour.set(node, "black");
  };
  for (const a of wi.activities) {
    if (colour.get(a.id) === "white") {
      visit(a.id, [a.id]);
    }
  }
  for (const cycle of cycles) {
    issues.push({
      path: `${wi.id}.activities`,
      message: `dependency cycle: ${cycle}`,
    });
  }

  return issues;
}
