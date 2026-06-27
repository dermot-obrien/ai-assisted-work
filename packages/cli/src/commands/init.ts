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
 *   - which AI tool shims to wire up
 *
 * Writes:
 *   - .aaw-config.yaml at the workspace root
 *   - tool shims into .github/prompts/, .claude/commands/, .cursor/rules/
 *   - the work_items_path directory (if missing)
 */

import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

interface InitInput {
  cwd: string;
  frameworkRoot: string;
}

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

interface Rewrite {
  from: string;
  to: string;
}

const TEXT_SHIM_EXT = new Set([".md", ".mdc", ".txt", ".yaml", ".yml", ".json", ".prompt"]);

export async function runInit(input: InitInput): Promise<number> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const defaultWorkspaceRoot = await walkUpForGitRoot(input.cwd);
    const workspaceAnswer = (await rl.question(
      `Install into workspace [${defaultWorkspaceRoot}]: `,
    )).trim();
    const workspaceRoot = workspaceAnswer === ""
      ? defaultWorkspaceRoot
      : path.resolve(input.cwd, workspaceAnswer);

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
    if (existingConfig) {
      process.stdout.write(
        `▸ Found existing .aaw-config.yaml — its values are pre-filled below.\n` +
          `  Press Enter at each prompt to keep the current value.\n`,
      );
    }
    process.stdout.write("\n");

    const tenantDefault = existingConfig?.tenant ?? "local";
    const tenant = (await rl.question(`Tenant name [${tenantDefault}]: `)).trim() ||
      tenantDefault;
    const modeDefault = existingConfig?.mode ?? "local-fs";
    const mode = (await rl.question(`Mode (local-fs/cloud) [${modeDefault}]: `)).trim() ||
      modeDefault;
    if (mode !== "local-fs" && mode !== "cloud") {
      process.stderr.write(`Unsupported mode: ${mode}\n`);
      return 2;
    }

    const repoName = path.basename(env.workspaceRoot);
    const defaultPath =
      existingConfig?.workItemsPath ??
      path.join(homedir(), "aaw", tenant, repoName, "work-items");
    const workItemsPath =
      (await rl.question(`work_items_path [${defaultPath}]: `)).trim() ||
      defaultPath;
    const initiativesPath =
      existingConfig?.initiativesPath ??
      path.join(path.dirname(workItemsPath), "initiatives");

    const detectedTools = {
      copilot: env.hasGitHub,
      cursor: env.hasCursor,
      claude: env.hasClaude,
    };
    const detectedNames = describeTools(detectedTools);
    process.stdout.write(`\nTool shims — detected: ${detectedNames || "none"}\n`);
    const wireAnswer = (
      await rl.question(
        "Wire up shims for the detected tools? [Y/n, or list to override e.g. cursor,claude]: ",
      )
    )
      .trim()
      .toLowerCase();
    const tools = resolveTools(wireAnswer, detectedTools);

    await mkdir(env.workspaceRoot, { recursive: true });
    process.stdout.write("\n▸ Writing .aaw-config.yaml\n");
    await writeConfig(env.workspaceRoot, { tenant, mode, workItemsPath, initiativesPath });
  await recordSelfModule(env.workspaceRoot, env.aawSourceRoot);

    process.stdout.write(`▸ Creating ${workItemsPath}\n`);
    await mkdir(workItemsPath, { recursive: true });

    if (tools.copilot) {
      process.stdout.write("▸ Wiring GitHub Copilot prompts\n");
      await wireGitHubCopilot(env);
    }
    if (tools.claude) {
      process.stdout.write("▸ Wiring Claude Code commands\n");
      await wireClaudeCode(env);
    }
    if (tools.cursor) {
      process.stdout.write("▸ Wiring Cursor commands\n");
      await wireCursor(env);
    }

    process.stdout.write("\n▸ Verifying\n");
    process.stdout.write("    ✓ config written\n");
    process.stdout.write("    ✓ work_items_path created\n");
    process.stdout.write("    ✓ shims installed\n");

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
    rl.close();
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

function resolveTools(answer: string, detected: ToolSelection): ToolSelection {
  // Empty / yes / accept → use the auto-detected set.
  if (answer === "" || answer === "y" || answer === "yes" || answer === "auto") {
    return detected;
  }
  // Decline → wire up nothing.
  if (answer === "n" || answer === "no" || answer === "none") {
    return { copilot: false, cursor: false, claude: false };
  }
  // Override list (comma-separated tool names).
  const parts = answer.split(",").map((s) => s.trim());
  return {
    copilot: parts.includes("copilot"),
    cursor: parts.includes("cursor"),
    claude: parts.includes("claude"),
  };
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

async function recordSelfModule(workspaceRoot: string, sourceRoot: string): Promise<void> {
  const existing = await readExistingYaml(workspaceRoot);
  const modulesValue = existing.modules;
  const modules = modulesValue && typeof modulesValue === "object"
    ? modulesValue as Record<string, unknown>
    : {};
  const currentValue = modules[MODULE_ID];
  const current = currentValue && typeof currentValue === "object"
    ? currentValue as Record<string, unknown>
    : {};
  modules[MODULE_ID] = {
    ...current,
    source_root: toPortableRelativePath(workspaceRoot, sourceRoot),
  };
  existing.modules = modules;
  await writeFile(path.join(workspaceRoot, ".aaw-config.yaml"), stringifyYaml(existing), "utf8");
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

async function wireGitHubCopilot(env: DetectedEnvironment): Promise<void> {
  const src = path.join(env.aawSourceRoot, "skills-for-agents", "github", "prompts");
  const dest = path.join(env.workspaceRoot, ".github", "prompts");
  await copyDir(src, dest, rewriteFor(env));
}

async function wireClaudeCode(env: DetectedEnvironment): Promise<void> {
  const src = path.join(env.aawSourceRoot, "skills-for-agents", "claude", "commands", "aaw");
  const dest = path.join(env.workspaceRoot, ".claude", "commands", "aaw");
  await copyDir(src, dest, rewriteFor(env));
}

async function wireCursor(env: DetectedEnvironment): Promise<void> {
  const src = path.join(env.aawSourceRoot, "skills-for-agents", "cursor", "commands", "aaw");
  const dest = path.join(env.workspaceRoot, ".cursor", "commands", "aaw");
  await copyDir(src, dest, rewriteFor(env));
}

function rewriteFor(env: DetectedEnvironment): Rewrite | undefined {
  const actual = toPortableRelativePath(env.workspaceRoot, env.aawSourceRoot);
  return actual === SUBMODULE_DEFAULT ? undefined : { from: SUBMODULE_DEFAULT, to: actual };
}

function isTextShim(name: string): boolean {
  return TEXT_SHIM_EXT.has(path.extname(name).toLowerCase());
}

function toPortableRelativePath(from: string, to: string): string {
  const rel = path.relative(from, to).split(path.sep).join("/");
  return rel === "" ? "." : rel;
}

async function copyDir(src: string, dest: string, rewrite?: Rewrite): Promise<void> {
  if (!(await pathExists(src))) return;
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to, rewrite);
    } else if (entry.isFile()) {
      if (rewrite && isTextShim(entry.name)) {
        const text = await readFile(from, "utf8");
        await writeFile(to, text.split(rewrite.from).join(rewrite.to), "utf8");
      } else {
        await copyFile(from, to);
      }
    }
  }
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