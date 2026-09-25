// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw check-skills [--framework <path>] [--workspace <path>]` — report whether the
 * skills installed in a workspace still match the frameworks that own them.
 *
 * With no `--framework`, every framework in the workspace's `.aaw-config.yaml` modules
 * registry is checked, each against the `source_root` recorded when it was installed.
 * A framework whose source_root is no longer present is reported and skipped, because
 * an absent checkout is not evidence of drift.
 *
 * Exits non-zero when anything differs, so it can be wired into a check script or CI
 * beside the other integrity checks.
 */

import path from "node:path";
import process from "node:process";
import {
  type CheckResult,
  checkSkills,
  findWorkspaceRoot,
  installedModules,
} from "@aaw/installer";

interface CheckInput {
  args: string[];
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} requires a path argument`);
  }
  return path.resolve(process.cwd(), value);
}

/** How many differing files to name before saying how many more there are. */
const SHOWN = 10;

function report(result: CheckResult, workspaceRoot: string): void {
  const out = (msg: string) => process.stdout.write(`${msg}\n`);
  out(`▸ ${result.id}@${result.version}`);
  for (const skill of result.skills) {
    if (skill.status === "ok") {
      out(`  ok       ${skill.name}`);
      continue;
    }
    if (skill.status === "missing") {
      out(`  MISSING  ${skill.name} — not installed in this workspace`);
      continue;
    }
    out(`  CHANGED  ${skill.name} — ${skill.files.length} file(s) differ`);
    for (const file of skill.files.slice(0, SHOWN)) out(`             ${file}`);
    if (skill.files.length > SHOWN) {
      out(`             ... and ${skill.files.length - SHOWN} more`);
    }
  }
  if (!result.clean) {
    const rel = path.relative(workspaceRoot, result.frameworkRoot) || result.frameworkRoot;
    out("");
    out(`  The installed copy is not what ${rel} holds. An edit made in the workspace`);
    out("  belongs upstream, so move it to the framework and release it; an edit nobody");
    out("  meant is undone by installing again.");
  }
}

export async function runCheckSkillsCommand(input: CheckInput): Promise<number> {
  const workspaceRoot =
    flag(input.args, "--workspace") ?? (await findWorkspaceRoot(process.cwd()));
  const explicit = flag(input.args, "--framework");

  const frameworks = explicit
    ? [{ id: "", sourceRoot: explicit }]
    : await installedModules(workspaceRoot);

  if (frameworks.length === 0) {
    process.stdout.write(
      "No frameworks recorded in .aaw-config.yaml, and no --framework given.\n",
    );
    return 1;
  }

  let clean = true;
  for (const framework of frameworks) {
    let result: CheckResult;
    try {
      result = await checkSkills({
        frameworkRoot: framework.sourceRoot,
        workspaceRoot,
      });
    } catch {
      const rel = path.relative(workspaceRoot, framework.sourceRoot) || framework.sourceRoot;
      process.stdout.write(
        `▸ ${framework.id}: skipped, no framework at ${rel}\n`,
      );
      continue;
    }
    report(result, workspaceRoot);
    if (!result.clean) clean = false;
  }

  process.stdout.write(
    clean
      ? "\nEvery installed skill matches the framework that owns it.\n"
      : "\nInstalled skills have drifted from their frameworks.\n",
  );
  return clean ? 0 : 1;
}
