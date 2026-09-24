// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw install [--framework <path>] [--workspace <path>] [--no-python]` —
 * install entrypoint. With no `--framework`, installs AAW itself into this
 * workspace via the interactive bootstrap flow. With `--framework <path>`,
 * installs ANY AAW-family framework from its manifest — this is how AAR/AAA
 * delegate here (they ship a tiny launcher), so all three install through the
 * one shared @aaw/installer engine.
 */

import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { findWorkspaceRoot, runInstall } from "@aaw/installer";
import { runInit } from "./init.js";

interface InstallInput {
  args: string[];
}

/** Resolve the AAW framework root: from this bundled bin or the source dist path. */
function resolveAawRoot(): string {
  const self = fileURLToPath(import.meta.url);
  const dir = path.dirname(self);
  if (path.basename(dir) === "bin") return path.resolve(dir, "..");
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

function workspaceArg(args: string[]): string | undefined {
  const i = args.indexOf("--workspace");
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error("--workspace requires a path argument");
  }
  return path.resolve(process.cwd(), value);
}

async function resolveWorkspaceRoot(args: string[]): Promise<string> {
  const explicit = workspaceArg(args);
  if (explicit) return explicit;

  const detected = await findWorkspaceRoot(process.cwd());
  if (!process.stdin.isTTY || !process.stdout.isTTY) return detected;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`Install into workspace [${detected}]: `)).trim();
    return answer === "" ? detected : path.resolve(process.cwd(), answer);
  } finally {
    rl.close();
  }
}

export async function runInstallCommand(input: InstallInput): Promise<number> {
  if (!input.args.includes("--framework")) {
    return runInit({ cwd: process.cwd(), frameworkRoot: resolveAawRoot() });
  }

  const noPython = input.args.includes("--no-python");
  const runSeed = input.args.includes("--seed");
  const frameworkRoot = frameworkArg(input.args) ?? resolveAawRoot();
  const workspaceRoot = await resolveWorkspaceRoot(input.args);
  const result = await runInstall({
    frameworkRoot,
    cwd: process.cwd(),
    workspaceRoot,
    runPython: noPython ? false : undefined,
    runSeed,
    log: (msg) => process.stdout.write(`${msg}\n`),
  });
  const skills = result.skills.length > 0 ? `${result.skills.length} skill(s)` : "no skills";
  process.stdout.write(
    `\nDone. ${result.id}@${result.version} — ${skills}; shims wired: ${result.wired.join(", ") || "none"}.\n`,
  );
  if (result.warnings.length > 0) return 1;
  return 0;
}
