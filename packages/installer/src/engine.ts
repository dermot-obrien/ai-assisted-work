// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * The shared install engine.
 *
 * Given a {@link FrameworkManifest}, performs the same install steps for any
 * AAW-family framework:
 *   1. ensure depended-on frameworks are present
 *   2. wire AI-tool shims (Claude/Cursor/Copilot/Gemini)
 *   3. seed config files (idempotent)
 *   4. ensure data dirs exist
 *   5. run language tool setup (pip for python frameworks)
 *   6. run an optional content seeder (e.g. AAA foundation)
 *   7. record the install in the `.aaw-config.yaml` modules registry
 *
 * Pure orchestration over node:fs — no framework-specific logic lives here.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  type FrameworkManifest,
  type ToolName,
  TOOL_NAMES,
  loadManifest,
} from "./manifest.js";

export type Logger = (msg: string) => void;

const noopLog: Logger = () => {};

/** Which AI tools are present in a workspace (by config-dir detection). */
export interface DetectedTools {
  claude: boolean;
  cursor: boolean;
  copilot: boolean;
  gemini: boolean;
}

const TOOL_DETECT_DIR: Record<ToolName, string> = {
  claude: ".claude",
  cursor: ".cursor",
  copilot: ".github",
  gemini: ".gemini",
};

export interface InstallOptions {
  manifest: FrameworkManifest;
  /** Host repo root. */
  workspaceRoot: string;
  /** Tools to wire. Defaults to those detected in the workspace. */
  tools?: Partial<DetectedTools>;
  /** Resolve a depended-on framework id → its root dir (or undefined if absent). */
  resolveDependency?: (id: string) => string | undefined;
  /** Run `pip install` for python frameworks. Default true. */
  runPython?: boolean;
  /** Run the manifest's optional content seeder (e.g. AAA foundation). Default false (opt-in). */
  runSeed?: boolean;
  log?: Logger;
}

export interface InstallResult {
  id: string;
  version: string;
  wired: ToolName[];
  seededConfig: string[];
  dataDirs: string[];
  pythonInstalled: boolean;
  ranSeed: boolean;
  warnings: string[];
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Token rewrite applied to text shim files so self-references track the real install location. */
interface Rewrite {
  from: string;
  to: string;
}

const TEXT_SHIM_EXT = new Set([".md", ".mdc", ".txt", ".yaml", ".yml", ".json", ".prompt"]);

function isTextShim(name: string): boolean {
  // ".prompt.md" → ext ".md"; also treat ".prompt" defensively.
  return TEXT_SHIM_EXT.has(path.extname(name).toLowerCase());
}

async function copyDir(src: string, dest: string, rewrite?: Rewrite): Promise<number> {
  if (!(await pathExists(src))) return 0;
  await mkdir(dest, { recursive: true });
  let count = 0;
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += await copyDir(from, to, rewrite);
    } else if (entry.isFile()) {
      if (rewrite && isTextShim(entry.name)) {
        const text = await readFile(from, "utf8");
        await writeFile(to, text.split(rewrite.from).join(rewrite.to), "utf8");
      } else {
        await copyFile(from, to);
      }
      count += 1;
    }
  }
  return count;
}

/** Walk up from `start` for a .git or .aaw-config.yaml; return that dir or `start`. */
export async function findWorkspaceRoot(start: string): Promise<string> {
  let dir = path.resolve(start);
  for (;;) {
    for (const sentinel of [".aaw-config.yaml", ".git"]) {
      if (await pathExists(path.join(dir, sentinel))) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

export async function detectTools(workspaceRoot: string): Promise<DetectedTools> {
  const out: DetectedTools = { claude: false, cursor: false, copilot: false, gemini: false };
  for (const tool of TOOL_NAMES) {
    out[tool] = await pathExists(path.join(workspaceRoot, TOOL_DETECT_DIR[tool]));
  }
  return out;
}

/** Copy each tool's shim dir into the workspace. Returns the tools actually wired. */
export async function wireShims(
  opts: InstallOptions,
  selection: DetectedTools,
): Promise<ToolName[]> {
  const { manifest, workspaceRoot } = opts;
  const log = opts.log ?? noopLog;
  const wired: ToolName[] = [];
  // Rewrite the framework's self-reference token to its actual relative location,
  // so shims resolve whether it's a submodule (".ai-assisted-work") or in node_modules.
  let rewrite: Rewrite | undefined;
  if (manifest.sourceToken) {
    const rel = path.relative(workspaceRoot, manifest.frameworkRoot).split(path.sep).join("/");
    if (rel.length > 0 && rel !== manifest.sourceToken) {
      rewrite = { from: manifest.sourceToken, to: rel };
      log(`  ▸ shim paths: rewriting "${manifest.sourceToken}" → "${rel}"`);
    }
  }
  for (const tool of TOOL_NAMES) {
    const mapping = manifest.shims[tool];
    if (!mapping || !selection[tool]) continue;
    const src = path.join(manifest.frameworkRoot, mapping.src);
    const dest = path.join(workspaceRoot, mapping.dest);
    // Make install authoritative: clear the framework-owned dest first so shims for
    // upstream-renamed/removed commands don't linger, and so a submodule→npm move
    // leaves no stale paths. Guarded to id-namespaced dirs (we own `<tool>/…/<id>`).
    if (path.basename(dest) === manifest.id && (await pathExists(dest))) {
      await rm(dest, { recursive: true, force: true });
    }
    const n = await copyDir(src, dest, rewrite);
    if (n > 0) {
      log(`  ▸ ${tool}: wired ${n} shim file(s) → ${mapping.dest}`);
      wired.push(tool);
    } else {
      log(`  ! ${tool}: shim source missing or empty (${mapping.src})`);
    }
  }
  return wired;
}

/** Seed config files into the workspace root, only if they don't already exist. */
export async function seedConfig(opts: InstallOptions): Promise<string[]> {
  const { manifest, workspaceRoot } = opts;
  const log = opts.log ?? noopLog;
  const seeded: string[] = [];
  for (const cfg of manifest.config) {
    const dest = path.join(workspaceRoot, cfg.file);
    if (await pathExists(dest)) {
      log(`  = ${cfg.file}: already present, left unchanged`);
      continue;
    }
    const template = path.join(manifest.frameworkRoot, cfg.template);
    if (!(await pathExists(template))) {
      log(`  ! ${cfg.file}: template missing (${cfg.template}), skipped`);
      continue;
    }
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(template, dest);
    log(`  ▸ seeded ${cfg.file}`);
    seeded.push(cfg.file);
  }
  return seeded;
}

export async function ensureDataDirs(opts: InstallOptions): Promise<string[]> {
  const { manifest, workspaceRoot } = opts;
  const log = opts.log ?? noopLog;
  const made: string[] = [];
  for (const dir of manifest.dataDirs) {
    const abs = path.join(workspaceRoot, dir);
    await mkdir(abs, { recursive: true });
    made.push(dir);
    log(`  ▸ data dir ${dir}`);
  }
  return made;
}

function findPython(): string | undefined {
  for (const cmd of ["python", "python3"]) {
    const r = spawnSync(cmd, ["--version"], { stdio: "ignore" });
    if (r.status === 0) return cmd;
  }
  return undefined;
}

/** Run language tool setup. Currently: pip for python frameworks. Returns true if pip ran ok. */
export async function runToolSetup(opts: InstallOptions, warnings: string[]): Promise<boolean> {
  const { manifest } = opts;
  const log = opts.log ?? noopLog;
  const py = manifest.toolSetup?.python;
  if (!py) return false;
  if (opts.runPython === false) {
    log("  = python deps: skipped (runPython=false)");
    return false;
  }
  const reqAbs = path.join(manifest.frameworkRoot, py.requirements);
  if (!(await pathExists(reqAbs))) {
    warnings.push(`tool_setup.python.requirements not found: ${py.requirements}`);
    return false;
  }
  const python = findPython();
  if (!python) {
    const msg =
      "python not found on PATH — skipped dependency install. " +
      `Install it later with:  python -m pip install -r ${path.relative(opts.workspaceRoot, reqAbs)}`;
    if (py.optional) log(`  = ${msg}`);
    else warnings.push(msg);
    return false;
  }
  log(`  ▸ ${python} -m pip install -r ${py.requirements}`);
  const r = spawnSync(python, ["-m", "pip", "install", "-r", reqAbs], { stdio: "inherit" });
  if (r.status !== 0) {
    const msg = `pip install failed (exit ${r.status ?? "?"}) for ${py.requirements}`;
    if (py.optional) {
      warnings.push(`${msg} (optional — diagram/extra tooling may be unavailable)`);
    } else {
      warnings.push(msg);
    }
    return false;
  }
  return true;
}

/** Run the framework's optional Node content seeder, passing the workspace root. */
export async function runSeed(opts: InstallOptions, warnings: string[]): Promise<boolean> {
  const { manifest, workspaceRoot } = opts;
  const log = opts.log ?? noopLog;
  if (!manifest.seed) return false;
  const entry = path.join(manifest.frameworkRoot, manifest.seed.entry);
  if (!(await pathExists(entry))) {
    warnings.push(`seed.entry not found: ${manifest.seed.entry}`);
    return false;
  }
  const args = [entry, "--workspace", workspaceRoot, ...(manifest.seed.args ?? [])];
  log(`  ▸ seeding content via node ${manifest.seed.entry}`);
  const r = spawnSync("node", args, { stdio: "inherit" });
  if (r.status !== 0) {
    warnings.push(`content seeder failed (exit ${r.status ?? "?"})`);
    return false;
  }
  return true;
}

/** Record this framework into the `.aaw-config.yaml` modules registry (create-or-update). */
export async function recordModule(opts: InstallOptions): Promise<void> {
  const { manifest, workspaceRoot } = opts;
  const configPath = path.join(workspaceRoot, ".aaw-config.yaml");
  let raw: Record<string, unknown> = {};
  if (await pathExists(configPath)) {
    const parsed = parseYaml(await readFile(configPath, "utf8")) as Record<string, unknown> | null;
    if (parsed && typeof parsed === "object") raw = parsed;
  }
  const modulesValue = raw.modules;
  const modules: Record<string, unknown> =
    modulesValue && typeof modulesValue === "object"
      ? (modulesValue as Record<string, unknown>)
      : {};
  modules[manifest.id] = {
    name: manifest.name,
    version: manifest.version,
    runtime: manifest.runtime,
  };
  raw.modules = modules;
  await writeFile(configPath, stringifyYaml(raw), "utf8");
}

/** Check that depended-on frameworks are present (resolvable or already recorded). */
async function checkDependencies(opts: InstallOptions, warnings: string[]): Promise<void> {
  const { manifest, workspaceRoot } = opts;
  if (manifest.depends.length === 0) return;
  // Read recorded modules (so a previously-installed dependency counts).
  let recorded: Record<string, unknown> = {};
  const configPath = path.join(workspaceRoot, ".aaw-config.yaml");
  if (await pathExists(configPath)) {
    const parsed = parseYaml(await readFile(configPath, "utf8")) as Record<string, unknown> | null;
    const mods = parsed?.modules;
    if (mods && typeof mods === "object") recorded = mods as Record<string, unknown>;
  }
  for (const dep of manifest.depends) {
    const resolved = opts.resolveDependency?.(dep);
    const present = (resolved !== undefined && resolved.length > 0) || dep in recorded;
    if (!present) {
      warnings.push(
        `depends on "${dep}" which is not installed — install it first (e.g. \`${dep} install\`).`,
      );
    }
  }
}

/** Conventional submodule dir for each known framework id (for dependency resolution). */
export const CONVENTIONAL_FRAMEWORK_DIRS: Record<string, string> = {
  aaw: ".ai-assisted-work",
  aar: ".ai-assisted-research",
  aaa: ".ai-assisted-architecture",
};

/** A dependency resolver that looks for the conventional submodule dir under the workspace. */
export function defaultDependencyResolver(
  workspaceRoot: string,
): (id: string) => string | undefined {
  return (id: string): string | undefined => {
    const dir = CONVENTIONAL_FRAMEWORK_DIRS[id];
    if (dir === undefined) return undefined;
    const abs = path.join(workspaceRoot, dir);
    return existsSync(abs) ? abs : undefined;
  };
}

export interface RunInstallOptions {
  /** Root of the framework being installed (where framework.manifest.yaml lives). */
  frameworkRoot: string;
  /** Where install was invoked from (used to find the workspace root). */
  cwd: string;
  tools?: Partial<DetectedTools>;
  runPython?: boolean;
  runSeed?: boolean;
  log?: Logger;
}

/**
 * High-level entry used by each framework's `bin`: load the manifest, locate the
 * host workspace, resolve dependencies by convention, and run the install.
 */
export async function runInstall(opts: RunInstallOptions): Promise<InstallResult> {
  const manifest = await loadManifest(opts.frameworkRoot);
  const workspaceRoot = await findWorkspaceRoot(opts.cwd);
  return installFramework({
    manifest,
    workspaceRoot,
    tools: opts.tools,
    runPython: opts.runPython,
    runSeed: opts.runSeed,
    resolveDependency: defaultDependencyResolver(workspaceRoot),
    log: opts.log,
  });
}

/** Run the full install for one framework. */
export async function installFramework(opts: InstallOptions): Promise<InstallResult> {
  const { manifest, workspaceRoot } = opts;
  const log = opts.log ?? noopLog;
  const warnings: string[] = [];

  log(`\n▸ Installing ${manifest.name} (${manifest.id}@${manifest.version})`);

  await checkDependencies(opts, warnings);

  const selection: DetectedTools = {
    ...(await detectTools(workspaceRoot)),
    ...(opts.tools ?? {}),
  };

  const wired = await wireShims(opts, selection);
  const seededConfig = await seedConfig(opts);
  const dataDirs = await ensureDataDirs(opts);
  const pythonInstalled = await runToolSetup(opts, warnings);
  let ranSeed = false;
  if (manifest.seed) {
    if (opts.runSeed === true) {
      ranSeed = await runSeed(opts, warnings);
    } else {
      log(`  = content seed available — re-run with --seed to scaffold (${manifest.seed.entry})`);
    }
  }
  await recordModule(opts);

  for (const w of warnings) log(`  ⚠ ${w}`);

  return {
    id: manifest.id,
    version: manifest.version,
    wired,
    seededConfig,
    dataDirs,
    pythonInstalled,
    ranSeed,
    warnings,
  };
}
