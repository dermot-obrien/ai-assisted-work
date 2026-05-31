// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw install [--framework <path>] [--no-python]` — non-interactive,
 * manifest-driven install. With no `--framework`, installs AAW itself into this
 * workspace (wire tool shims, record in the modules registry). With
 * `--framework <path>`, installs ANY AAW-family framework from its manifest —
 * this is how AAR/AAA delegate here (they ship a tiny launcher), so all three
 * install through the one shared @aaw/installer engine.
 *
 * For first-time interactive setup (tenant, mode, work_items_path) use `aaw init`.
 */

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runInstall } from "@aaw/installer";

interface InstallInput {
  args: string[];
}

/** Resolve the AAW framework root: from this bundled bin or the source dist path. */
function resolveAawRoot(): string {
  // Bundled path: <aawRoot>/bin/aaw.js. Source path: <aawRoot>/packages/cli/dist/cli.js.
  const self = fileURLToPath(import.meta.url);
  const dir = path.dirname(self);
  if (path.basename(dir) === "bin") return path.resolve(dir, "..");
  // dist/cli.js → packages/cli/dist → up 3 to repo root.
  return path.resolve(dir, "..", "..", "..");
}

/** Read `--framework <path>` if present; resolve it relative to cwd. */
function frameworkArg(args: string[]): string | undefined {
  const i = args.indexOf("--framework");
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error("--framework requires a path argument");
  }
  return path.resolve(process.cwd(), value);
}

export async function runInstallCommand(input: InstallInput): Promise<number> {
  const noPython = input.args.includes("--no-python");
  const runSeed = input.args.includes("--seed");
  const frameworkRoot = frameworkArg(input.args) ?? resolveAawRoot();
  const result = await runInstall({
    frameworkRoot,
    cwd: process.cwd(),
    runPython: noPython ? false : undefined,
    runSeed,
    log: (msg) => process.stdout.write(`${msg}\n`),
  });
  process.stdout.write(
    `\nDone. ${result.id}@${result.version} — wired: ${result.wired.join(", ") || "none"}.\n`,
  );
  if (result.warnings.length > 0) return 1;
  return 0;
}
