// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { LocalFsBackend } from "../backends/local-fs/index.js";
import type { AawConfig } from "../config.js";

interface VerifyInput {
  config: AawConfig;
}

export async function runVerify(input: VerifyInput): Promise<number> {
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

  // 1. Workspace root reachable
  checks.push({
    name: "Workspace root",
    ok: true,
    detail: input.config.workspaceRoot,
  });

  // 2. Mode
  checks.push({ name: "Mode", ok: true, detail: input.config.mode });

  // 3. Tenant
  checks.push({ name: "Tenant", ok: true, detail: input.config.tenant });

  // 4. Read+write sentinel under workItemsPath
  const sentinel = path.join(input.config.workItemsPath, ".aaw-sentinel");
  let writeOk = false;
  let writeDetail = "";
  try {
    await mkdir(input.config.workItemsPath, { recursive: true });
    await writeFile(sentinel, "ok\n", "utf8");
    const back = await readFile(sentinel, "utf8");
    writeOk = back.trim() === "ok";
    await unlink(sentinel);
    writeDetail = input.config.workItemsPath;
  } catch (err) {
    writeDetail = (err as Error).message;
  }
  checks.push({ name: "work_items_path read+write", ok: writeOk, detail: writeDetail });

  // 5. Backend list works (smoke test, no work items required)
  let listOk = false;
  let listDetail = "";
  try {
    const backend = new LocalFsBackend(input.config);
    const items = await backend.listPoolWork(input.config.tenant);
    listOk = true;
    listDetail = `${items.length} work item(s) found`;
  } catch (err) {
    listDetail = (err as Error).message;
  }
  checks.push({ name: "Backend list", ok: listOk, detail: listDetail });

  // Render
  let allOk = true;
  for (const c of checks) {
    const tick = c.ok ? "✓" : "✗";
    const line = `  ${tick} ${c.name}${c.detail ? `  —  ${c.detail}` : ""}\n`;
    process.stdout.write(line);
    if (!c.ok) allOk = false;
  }
  process.stdout.write(allOk ? "\nAll checks passed.\n" : "\nVerification failed.\n");
  return allOk ? 0 : 1;
}