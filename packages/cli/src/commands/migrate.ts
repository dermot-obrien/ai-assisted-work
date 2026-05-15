// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw migrate v1 [--dry-run]`
 *
 * Move v1-shaped workspaces into the v2 layout:
 *
 *   change/work-items/WI-NNN-{slug}          → {work_items_path}/WI-NNN-{slug}
 *   change/work-items-private/WIP-NNN-{slug} → {work_items_path}/WI-MMM-{slug}    (renumbered)
 *   change/initiatives/IN-NNN-{slug}         → {initiatives_path}/IN-NNN-{slug}
 *   change/initiatives-private/INP-NNN-{slug} → {initiatives_path}/IN-MMM-{slug}  (renumbered)
 *
 * Also rewrites IDs inside each migrated work item:
 *   WIP-NNN → WI-MMM in folder names, work_item_id, activity / task IDs,
 *   and inside scope.md / plan.md / progress.yaml / changelog.log and
 *   deliverables.
 *
 * --dry-run prints what would happen without touching anything.
 */

import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { AawConfig } from "../config.js";

interface MigrateInput {
  config: AawConfig;
  args: string[];
}

interface PlannedMove {
  oldId: string;
  newId: string;
  fromDir: string;
  toDir: string;
  rewrites: Map<string, string>; // oldId → newId for content sed
}

export async function runMigrate(input: MigrateInput): Promise<number> {
  const sub = input.args[0];
  if (sub !== "v1") {
    process.stderr.write(
      "aaw migrate: expected 'v1' (e.g. `aaw migrate v1` or `aaw migrate v1 --dry-run`)\n",
    );
    return 2;
  }
  const dryRun = input.args.includes("--dry-run");

  const root = input.config.workspaceRoot;
  const v1Shared = path.join(root, "change", "work-items");
  const v1Private = path.join(root, "change", "work-items-private");
  const v1SharedInit = path.join(root, "change", "initiatives");
  const v1PrivateInit = path.join(root, "change", "initiatives-private");

  // Check whether any v1 source directory exists.
  const haveSources = await Promise.all(
    [v1Shared, v1Private, v1SharedInit, v1PrivateInit].map(pathExists),
  );
  if (!haveSources.some(Boolean)) {
    process.stdout.write(
      `aaw migrate v1: no v1 directories found under ${path.join(root, "change")}.\n` +
        `Nothing to do.\n`,
    );
    return 0;
  }

  // Plan moves.
  const wiPlan = await planWorkItemMoves(
    v1Shared,
    v1Private,
    input.config.workItemsPath,
  );
  const initPlan = await planInitiativeMoves(
    v1SharedInit,
    v1PrivateInit,
    input.config.initiativesPath,
  );

  if (wiPlan.length === 0 && initPlan.length === 0) {
    process.stdout.write("aaw migrate v1: no work items or initiatives to migrate.\n");
    return 0;
  }

  // Print plan.
  process.stdout.write(
    dryRun
      ? "aaw migrate v1 (dry run) — would do:\n\n"
      : "aaw migrate v1 — moving:\n\n",
  );
  for (const p of [...wiPlan, ...initPlan]) {
    if (p.oldId === p.newId) {
      process.stdout.write(`  ${p.oldId}: ${p.fromDir} → ${p.toDir}\n`);
    } else {
      process.stdout.write(`  ${p.oldId} → ${p.newId}: ${p.fromDir} → ${p.toDir}\n`);
    }
  }
  process.stdout.write("\n");

  if (dryRun) {
    process.stdout.write(
      "Dry run complete. Re-run without --dry-run to apply.\n" +
        "Note: the move uses rename + content rewrite; combine with `git status`\n" +
        "in the parent repo afterward to commit the result.\n",
    );
    return 0;
  }

  // Execute moves.
  for (const p of [...wiPlan, ...initPlan]) {
    await mkdir(path.dirname(p.toDir), { recursive: true });
    await renameOrCopyAndRemove(p.fromDir, p.toDir);
    if (p.rewrites.size > 0) {
      await rewriteContentInPlace(p.toDir, p.rewrites);
    }
  }

  process.stdout.write(
    `Migrated ${wiPlan.length} work item(s) and ${initPlan.length} initiative(s).\n` +
      `Old paths under change/ may be left empty — review and remove manually.\n`,
  );
  return 0;
}

async function planWorkItemMoves(
  v1Shared: string,
  v1Private: string,
  v2Path: string,
): Promise<PlannedMove[]> {
  const plan: PlannedMove[] = [];
  const usedIds = new Set<number>();
  const sharedSameAsDest = path.resolve(v1Shared) === path.resolve(v2Path);

  // Existing v2 IDs we should not collide with.
  for (const id of await scanIds(v2Path, /^WI-(\d+)/)) usedIds.add(id);
  // v1 shared WIs migrate keeping their number unless it collides — but if
  // the source and destination are the same path (legacy fallback, no config),
  // there's nothing to move.
  if (!sharedSameAsDest) {
    for (const folder of await listFolders(v1Shared, /^WI-(\d+)-/)) {
      const oldNum = numberFrom(folder);
      if (oldNum === null) continue;
      const newNum = nextFreeId(usedIds, oldNum);
      usedIds.add(newNum);
      plan.push(makeMove("WI", oldNum, newNum, path.join(v1Shared, folder), v2Path));
    }
  }
  // v1 private WIPs always renumber to WI; pick fresh numbers above all used.
  let nextFresh = 1;
  for (const folder of await listFolders(v1Private, /^WIP-(\d+)-/)) {
    const oldNum = numberFrom(folder);
    if (oldNum === null) continue;
    while (usedIds.has(nextFresh)) nextFresh++;
    usedIds.add(nextFresh);
    plan.push({
      oldId: formatId("WIP", oldNum),
      newId: formatId("WI", nextFresh),
      fromDir: path.join(v1Private, folder),
      toDir: path.join(v2Path, folder.replace(/^WIP-(\d+)/, formatId("WI", nextFresh))),
      rewrites: new Map([[formatId("WIP", oldNum), formatId("WI", nextFresh)]]),
    });
    nextFresh++;
  }
  return plan;
}

async function planInitiativeMoves(
  v1Shared: string,
  v1Private: string,
  v2Path: string,
): Promise<PlannedMove[]> {
  const plan: PlannedMove[] = [];
  const usedIds = new Set<number>();
  const sharedSameAsDest = path.resolve(v1Shared) === path.resolve(v2Path);
  for (const id of await scanIds(v2Path, /^IN-(\d+)/)) usedIds.add(id);

  if (!sharedSameAsDest) {
    for (const folder of await listFolders(v1Shared, /^IN-(\d+)-/)) {
      const oldNum = numberFrom(folder);
      if (oldNum === null) continue;
      const newNum = nextFreeId(usedIds, oldNum);
      usedIds.add(newNum);
      plan.push(makeMove("IN", oldNum, newNum, path.join(v1Shared, folder), v2Path));
    }
  }
  let nextFresh = 1;
  for (const folder of await listFolders(v1Private, /^INP-(\d+)-/)) {
    const oldNum = numberFrom(folder);
    if (oldNum === null) continue;
    while (usedIds.has(nextFresh)) nextFresh++;
    usedIds.add(nextFresh);
    plan.push({
      oldId: formatId("INP", oldNum),
      newId: formatId("IN", nextFresh),
      fromDir: path.join(v1Private, folder),
      toDir: path.join(v2Path, folder.replace(/^INP-(\d+)/, formatId("IN", nextFresh))),
      rewrites: new Map([[formatId("INP", oldNum), formatId("IN", nextFresh)]]),
    });
    nextFresh++;
  }
  return plan;
}

function makeMove(
  prefix: "WI" | "IN",
  oldNum: number,
  newNum: number,
  fromDir: string,
  v2Path: string,
): PlannedMove {
  const oldId = formatId(prefix, oldNum);
  const newId = formatId(prefix, newNum);
  const folderName = path.basename(fromDir);
  const newFolderName = oldNum === newNum
    ? folderName
    : folderName.replace(new RegExp(`^${prefix}-(\\d+)`), newId);
  const rewrites = new Map<string, string>();
  if (oldNum !== newNum) rewrites.set(oldId, newId);
  return {
    oldId,
    newId,
    fromDir,
    toDir: path.join(v2Path, newFolderName),
    rewrites,
  };
}

function nextFreeId(used: Set<number>, preferred: number): number {
  if (!used.has(preferred)) return preferred;
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

async function scanIds(dir: string, re: RegExp): Promise<number[]> {
  return (await listFolders(dir, re))
    .map(numberFrom)
    .filter((n): n is number => n !== null);
}

async function listFolders(dir: string, re: RegExp): Promise<string[]> {
  try {
    const all = await readdir(dir, { withFileTypes: true });
    return all.filter((d) => d.isDirectory() && re.test(d.name)).map((d) => d.name);
  } catch {
    return [];
  }
}

function numberFrom(folder: string): number | null {
  const m = folder.match(/^[A-Z]+-(\d+)/);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) ? n : null;
}

function formatId(prefix: string, n: number): string {
  return `${prefix}-${n.toString().padStart(3, "0")}`;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function renameOrCopyAndRemove(from: string, to: string): Promise<void> {
  try {
    await rename(from, to);
  } catch (err) {
    // Cross-device rename fails on Windows when source and destination are
    // on different filesystems. Fall back to recursive copy + remove.
    if ((err as NodeJS.ErrnoException).code !== "EXDEV") throw err;
    await copyDirRecursive(from, to);
    await rm(from, { recursive: true, force: true });
  }
}

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(s, d);
    } else if (entry.isFile()) {
      await copyFile(s, d);
    }
  }
}

async function rewriteContentInPlace(
  dir: string,
  rewrites: Map<string, string>,
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await rewriteContentInPlace(p, rewrites);
    } else if (entry.isFile() && isTextFile(entry.name)) {
      let text: string;
      try {
        text = await readFile(p, "utf8");
      } catch {
        continue;
      }
      let changed = false;
      for (const [oldId, newId] of rewrites) {
        if (text.includes(oldId)) {
          text = text.replaceAll(oldId, newId);
          changed = true;
        }
      }
      if (changed) await writeFile(p, text, "utf8");
    }
  }
}

function isTextFile(name: string): boolean {
  return /\.(md|yaml|yml|json|log|txt)$/i.test(name);
}
