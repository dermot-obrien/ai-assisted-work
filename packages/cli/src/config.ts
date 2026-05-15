// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * Workspace configuration read from .aaw-config.yaml at the project root.
 * Resolves all paths to absolute, expands ~ and {tenant}/{repo} placeholders.
 */
export interface AawConfig {
  tenant: string;
  mode: "local-fs" | "cloud";
  workItemsPath: string;
  initiativesPath: string;
  /** Absolute path to the workspace root (where .aaw-config.yaml lives). */
  workspaceRoot: string;
  /** Optional cloud endpoint (mode === "cloud"). */
  endpoint?: string;
}

const LEGACY_WORK_ITEMS_PATH = "change/work-items";
const LEGACY_INITIATIVES_PATH = "change/initiatives";

/**
 * Load .aaw-config.yaml from `workspaceRoot`. Falls back to a legacy
 * default that points at ./change/work-items inside the repo.
 */
export async function loadConfig(workspaceRoot: string): Promise<AawConfig> {
  const configPath = path.join(workspaceRoot, ".aaw-config.yaml");
  let raw: Record<string, unknown> | null = null;
  try {
    const text = await readFile(configPath, "utf8");
    raw = parseYaml(text) as Record<string, unknown>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // Missing config — apply legacy default.
    return legacyConfig(workspaceRoot);
  }

  const tenant = stringField(raw, "tenant", "local");
  const mode = stringField(raw, "mode", "local-fs") as AawConfig["mode"];
  if (mode !== "local-fs" && mode !== "cloud") {
    throw new Error(`.aaw-config.yaml: unknown mode '${mode}'`);
  }

  const repoName = path.basename(workspaceRoot);
  const expand = (p: string) =>
    p
      .replace(/^~(?=\/|\\|$)/, homedir())
      .replace(/\{tenant\}/g, tenant)
      .replace(/\{repo\}/g, repoName);

  const workItemsPath = path.resolve(
    workspaceRoot,
    expand(stringField(raw, "work_items_path", LEGACY_WORK_ITEMS_PATH)),
  );
  const initiativesPath = path.resolve(
    workspaceRoot,
    expand(stringField(raw, "initiatives_path", LEGACY_INITIATIVES_PATH)),
  );
  const endpoint = (raw as { endpoint?: string }).endpoint;

  return { tenant, mode, workItemsPath, initiativesPath, workspaceRoot, endpoint };
}

function legacyConfig(workspaceRoot: string): AawConfig {
  return {
    tenant: "local",
    mode: "local-fs",
    workItemsPath: path.resolve(workspaceRoot, LEGACY_WORK_ITEMS_PATH),
    initiativesPath: path.resolve(workspaceRoot, LEGACY_INITIATIVES_PATH),
    workspaceRoot,
  };
}

function stringField(
  raw: Record<string, unknown> | null,
  key: string,
  fallback: string,
): string {
  const v = raw?.[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/**
 * Find the workspace root by walking up from `start`, looking for either
 * .aaw-config.yaml or a .git directory. Returns `start` if neither found.
 */
export async function findWorkspaceRoot(start: string): Promise<string> {
  const { stat } = await import("node:fs/promises");
  let dir = path.resolve(start);
  while (true) {
    for (const sentinel of [".aaw-config.yaml", ".git"]) {
      try {
        await stat(path.join(dir, sentinel));
        return dir;
      } catch {
        // not found, try next sentinel
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}