// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * `aaw init` — interactive workspace bootstrap.
 * Compatibility alias for `aaw install` when installing AAW itself.
 *
 * Detects:
 *   - git repo (presence of .git)
 *   - AI tools (.github/, .cursor/, .claude/ directories)
 *
 * Prompts for:
 *   - tenant name
 *   - mode (local-fs | cloud)
 *   - work_items_path
 *
 * A value given as a flag is not asked for. Without a terminal (a hook, CI, an
 * agent), or with --yes, nothing is asked: each value comes from its flag, then
 * the existing .aaw-config.yaml, then the default shown in brackets.
 *
 * Writes:
 *   - .aaw-config.yaml at the workspace root
 *   - the work_items_path directory (if missing)
 *
 * Then hands off to the shared @aaw/installer engine to place the Agent Skills,
 * so this path and `aaw install --framework` install identically. It used to wire
 * per-tool command shims here instead, with its own copy of the copy-and-rewrite
 * machinery and its own module-registry writer; all of that is gone.
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { runInstall } from "@aaw/installer";

/** Answers supplied up front, as flags. A supplied answer is never prompted for. */
export interface InitAnswers {
  workspace?: string;
  tenant?: string;
  mode?: string;
  workItemsPath?: string;
}

interface InitInput {
  cwd: string;
  frameworkRoot: string;
  answers?: InitAnswers;
  /** Prompt for missing answers. Defaults to true only when stdin and stdout are terminals. */
  interactive?: boolean;
}

type Asker = (prompt: string, fallback: string, given: string | undefined) => Promise<string>;

interface DetectedEnvironment {
  workspaceRoot: string;
  isGitRepo: boolean;
  hasGitHub: boolean;
  hasCursor: boolean;
  hasClaude: boolean;
  /** Directory containing AAW source for this install. */
  aawSourceRoot: string;
}

const SUBMODULE_DEFAULT = ".ai-assisted-work";
const MODULE_ID = "aaw";

export async function runInit(input: InitInput): Promise<number> {
  const answers = input.answers ?? {};
  const interactive =
    input.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY);
  // No readline at all when not interactive: without a terminal it would close on
  // the first question and abort the install.
  const rl = interactive
    ? createInterface({ input: process.stdin, output: process.stdout })
    : null;
  const ask: Asker = async (prompt, fallback, given) => {
    if (given !== undefined && given !== "") return given;
    if (!rl) return fallback;
    return (await rl.question(`${prompt} [${fallback}]: `)).trim() || fallback;
  };
  try {
    const defaultWorkspaceRoot = await walkUpForGitRoot(input.cwd);
    const workspaceRoot = path.resolve(
      input.cwd,
      await ask("Install into workspace", defaultWorkspaceRoot, answers.workspace),
    );

    const env = await detect(workspaceRoot, input.frameworkRoot);
    const existingConfig = await readExistingConfig(env.workspaceRoot);

    if (existingConfig) {
      process.stdout.write("aaw install — existing workspace detected.\n\n");
    } else {
      process.stdout.write("aaw install — let's set this up.\n\n");
    }
    process.stdout.write(`▸ Workspace: ${env.workspaceRoot}\n`);
    process.stdout.write(`▸ Git repo: ${env.isGitRepo ? "yes" : "no"}\n`);
    process.stdout.write(
      `▸ Detected tools: ${[
        env.hasGitHub && "GitHub Copilot",
        env.hasCursor && "Cursor",
        env.hasClaude && "Claude Code",
      ]
        .filter(Boolean)
        .join(", ") || "none"}\n`,
    );
    if (existingConfig && rl) {
      process.stdout.write(
        `▸ Found existing .aaw-config.yaml — its values are pre-filled below.\n` +
          `  Press Enter at each prompt to keep the current value.\n`,
      );
    }
    process.stdout.write("\n");

    const tenant = await ask("Tenant name", existingConfig?.tenant ?? "local", answers.tenant);
    const mode = await ask(
      "Mode (local-fs/cloud)",
      existingConfig?.mode ?? "local-fs",
      answers.mode,
    );
    if (mode !== "local-fs" && mode !== "cloud") {
      process.stderr.write(`Unsupported mode: ${mode}\n`);
      return 2;
    }

    const repoName = path.basename(env.workspaceRoot);
    const defaultPath =
      existingConfig?.workItemsPath ??
      path.join(homedir(), "aaw", tenant, repoName, "work-items");
    const workItemsPath = await ask("work_items_path", defaultPath, answers.workItemsPath);
    const initiativesPath =
      existingConfig?.initiativesPath ??
      path.join(path.dirname(workItemsPath), "initiatives");

    if (!rl) {
      process.stdout.write(
        `▸ Non-interactive: tenant=${tenant}, mode=${mode}, work_items_path=${workItemsPath}\n`,
      );
    }

    const detectedNames = describeTools({
      copilot: env.hasGitHub,
      cursor: env.hasCursor,
      claude: env.hasClaude,
    });
    process.stdout.write(`\nAI tools detected: ${detectedNames || "none"}\n`);
    process.stdout.write(
      "Skills install to .agents/skills/, which every supported tool reads.\n" +
        "Claude Code reads only .claude/skills/, so that is linked at it when detected.\n",
    );

    await mkdir(env.workspaceRoot, { recursive: true });
    process.stdout.write("\n▸ Writing .aaw-config.yaml\n");
    await writeConfig(env.workspaceRoot, { tenant, mode, workItemsPath, initiativesPath });

    process.stdout.write(`▸ Creating ${workItemsPath}\n`);
    await mkdir(workItemsPath, { recursive: true });

    // Hand off to the shared engine, so this path and `aaw install --framework`
    // place skills identically and the module registry is written once, by the
    // code that owns that format.
    const result = await runInstall({
      frameworkRoot: env.aawSourceRoot,
      cwd: env.workspaceRoot,
      workspaceRoot: env.workspaceRoot,
      log: (msg) => process.stdout.write(`${msg}\n`),
    });

    process.stdout.write("\n▸ Verifying\n");
    process.stdout.write("    ✓ config written\n");
    process.stdout.write("    ✓ work_items_path created\n");
    process.stdout.write(`    ✓ ${result.skills.length} skill(s) installed\n`);

    const cliPath = toPortableRelativePath(
      env.workspaceRoot,
      path.join(env.aawSourceRoot, "bin", "aaw.js"),
    );

    process.stdout.write(
      "\nDone. Try this in your AI tool:\n    /aaw-start-work add a new feature\n\n" +
        `Or from the shell:\n    node ${cliPath} status\n\n` +
        "For shorter commands, set up an alias (one-time):\n" +
        `  PowerShell ($PROFILE):  function aaw { node \"${cliPath}\" @args }\n` +
        `  Bash/Zsh   (~/.bashrc): alias aaw='node ${cliPath}'\n` +
        "Then: aaw status\n",
    );
    return 0;
  } finally {
    rl?.close();
  }
}

async function detect(workspaceRoot: string, frameworkRoot: string): Promise<DetectedEnvironment> {
  const isGitRepo = await pathExists(path.join(workspaceRoot, ".git"));
  const hasGitHub = await pathExists(path.join(workspaceRoot, ".github"));
  const hasCursor = await pathExists(path.join(workspaceRoot, ".cursor"));
  const hasClaude = await pathExists(path.join(workspaceRoot, ".claude"));

  const localClone = path.join(workspaceRoot, SUBMODULE_DEFAULT);
  let aawSourceRoot = frameworkRoot;
  if (aawSourceRoot.length === 0 && (await pathExists(localClone))) {
    aawSourceRoot = localClone;
  }
  if (aawSourceRoot.length === 0) {
    aawSourceRoot = workspaceRoot;
  }

  return {
    workspaceRoot,
    isGitRepo,
    hasGitHub,
    hasCursor,
    hasClaude,
    aawSourceRoot,
  };
}

interface ExistingConfig {
  tenant?: string;
  mode?: "local-fs" | "cloud";
  workItemsPath?: string;
  initiativesPath?: string;
}

async function readExistingConfig(workspaceRoot: string): Promise<ExistingConfig | null> {
  const configPath = path.join(workspaceRoot, ".aaw-config.yaml");
  try {
    const text = await readFile(configPath, "utf8");
    const parsed = parseYaml(text) as Record<string, unknown>;
    const mode = parsed.mode === "local-fs" || parsed.mode === "cloud"
      ? parsed.mode
      : undefined;
    return {
      tenant: typeof parsed.tenant === "string" ? parsed.tenant : undefined,
      mode,
      workItemsPath:
        typeof parsed.work_items_path === "string" ? parsed.work_items_path : undefined,
      initiativesPath:
        typeof parsed.initiatives_path === "string"
          ? parsed.initiatives_path
          : undefined,
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    return null; // any other error: treat as no existing config
  }
}

interface ToolSelection {
  copilot: boolean;
  cursor: boolean;
  claude: boolean;
}


function describeTools(t: ToolSelection): string {
  const names: string[] = [];
  if (t.copilot) names.push("GitHub Copilot");
  if (t.cursor) names.push("Cursor");
  if (t.claude) names.push("Claude Code");
  return names.join(", ");
}

async function writeConfig(
  root: string,
  cfg: {
    tenant: string;
    mode: "local-fs" | "cloud";
    workItemsPath: string;
    initiativesPath: string;
  },
): Promise<void> {
  const existing = await readExistingYaml(root);
  const yaml = stringifyYaml({
    ...existing,
    tenant: cfg.tenant,
    mode: cfg.mode,
    work_items_path: cfg.workItemsPath,
    initiatives_path: cfg.initiativesPath,
  });
  await writeFile(path.join(root, ".aaw-config.yaml"), yaml, "utf8");
}


async function readExistingYaml(workspaceRoot: string): Promise<Record<string, unknown>> {
  const configPath = path.join(workspaceRoot, ".aaw-config.yaml");
  try {
    const text = await readFile(configPath, "utf8");
    const parsed = parseYaml(text) as Record<string, unknown> | null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}




function toPortableRelativePath(from: string, to: string): string {
  const rel = path.relative(from, to).split(path.sep).join("/");
  return rel === "" ? "." : rel;
}


async function walkUpForGitRoot(start: string): Promise<string> {
  let dir = path.resolve(start);
  while (true) {
    if (await pathExists(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}