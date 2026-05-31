// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * The framework manifest contract.
 *
 * Every AAW-family framework (work, architecture, research) ships a
 * `framework.manifest.yaml` at its repo root describing how it is installed:
 * which AI-tool shims to wire, which config files to seed, which data dirs to
 * create, and what language-specific tool setup it needs. The shared engine
 * (engine.ts) reads this manifest so all three frameworks install the same way.
 *
 * YAML keys are snake_case (matching `.aaw-config.yaml`); parsed into the
 * camelCase {@link FrameworkManifest} below.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export const MANIFEST_FILENAME = "framework.manifest.yaml";

/** Language the framework's tooling runs in. Drives `tool_setup`. */
export type FrameworkRuntime = "node" | "python";

/** AI tools we can wire command/prompt shims for. */
export type ToolName = "claude" | "cursor" | "copilot" | "gemini";

export const TOOL_NAMES: readonly ToolName[] = ["claude", "cursor", "copilot", "gemini"];

/** One shim wiring: copy `src` (under the framework) → `dest` (under the workspace). */
export interface ShimMapping {
  /** Source dir, relative to the framework root. */
  src: string;
  /** Destination dir, relative to the workspace root. */
  dest: string;
}

/** A config file to seed into the host workspace (idempotent — only if absent). */
export interface ConfigSeed {
  /** Destination filename, relative to the workspace root. */
  file: string;
  /** Template file, relative to the framework root. */
  template: string;
}

/** Language-specific dependency setup the engine performs at install time. */
export interface ToolSetup {
  python?: {
    /** requirements.txt path, relative to the framework root. */
    requirements: string;
    /** If true, failure to install is a warning, not an error (e.g. optional diagram tools). */
    optional?: boolean;
  };
}

/** Optional content seeder the framework ships (e.g. AAA foundation seed). */
export interface SeedSpec {
  /** Only "node" is supported — the engine runs it cross-platform via `node`. */
  driver: "node";
  /** Entry module, relative to the framework root. */
  entry: string;
  /** Extra args appended after the workspace root. */
  args?: string[];
}

export interface FrameworkManifest {
  /** Short namespace, e.g. "aaw" | "aar" | "aaa". Used for shim dest namespacing + the module registry. */
  id: string;
  name: string;
  version: string;
  /**
   * The path string the framework's shim files use to reference their own
   * source (typically the submodule dir, e.g. ".ai-assisted-work"). When shims
   * are wired, this token is rewritten to the framework's ACTUAL relative
   * location, so shims work whether the framework is a git submodule or lives
   * in node_modules. Omit if shims contain no self-references.
   */
  sourceToken?: string;
  /** Framework ids this one depends on (must be installed/present first). */
  depends: string[];
  runtime: FrameworkRuntime;
  toolSetup?: ToolSetup;
  /** Per-tool shim wiring. Only the tools present here can be wired. */
  shims: Partial<Record<ToolName, ShimMapping>>;
  /** Config files to seed (idempotent). */
  config: ConfigSeed[];
  /** Data dirs to create in the workspace (committed homes for generated artefacts). */
  dataDirs: string[];
  seed?: SeedSpec;
  /** Absolute path to the framework root the manifest was loaded from. */
  frameworkRoot: string;
}

function asString(value: unknown, where: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`manifest: ${where} must be a non-empty string`);
  }
  return value;
}

function asStringArray(value: unknown, where: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`manifest: ${where} must be a list`);
  return value.map((v, i) => asString(v, `${where}[${i}]`));
}

function parseShims(value: unknown): Partial<Record<ToolName, ShimMapping>> {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object") throw new Error("manifest: shims must be a map");
  const out: Partial<Record<ToolName, ShimMapping>> = {};
  for (const tool of TOOL_NAMES) {
    const entry = (value as Record<string, unknown>)[tool];
    if (entry === undefined) continue;
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`manifest: shims.${tool} must be a {src,dest} map`);
    }
    const rec = entry as Record<string, unknown>;
    out[tool] = {
      src: asString(rec.src, `shims.${tool}.src`),
      dest: asString(rec.dest, `shims.${tool}.dest`),
    };
  }
  return out;
}

function parseConfig(value: unknown): ConfigSeed[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("manifest: config must be a list");
  return value.map((entry, i) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`manifest: config[${i}] must be a {file,template} map`);
    }
    const rec = entry as Record<string, unknown>;
    return {
      file: asString(rec.file, `config[${i}].file`),
      template: asString(rec.template, `config[${i}].template`),
    };
  });
}

function parseToolSetup(value: unknown): ToolSetup | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") throw new Error("manifest: tool_setup must be a map");
  const py = (value as Record<string, unknown>).python;
  if (py === undefined) return {};
  if (typeof py !== "object" || py === null) {
    throw new Error("manifest: tool_setup.python must be a map");
  }
  const rec = py as Record<string, unknown>;
  return {
    python: {
      requirements: asString(rec.requirements, "tool_setup.python.requirements"),
      optional: rec.optional === true,
    },
  };
}

function parseSeed(value: unknown): SeedSpec | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") throw new Error("manifest: seed must be a map");
  const rec = value as Record<string, unknown>;
  if (rec.driver !== "node") throw new Error('manifest: seed.driver must be "node"');
  return {
    driver: "node",
    entry: asString(rec.entry, "seed.entry"),
    args: asStringArray(rec.args, "seed.args"),
  };
}

/** Parse + validate manifest YAML. `frameworkRoot` is the absolute dir it was read from. */
export function parseManifest(text: string, frameworkRoot: string): FrameworkManifest {
  const raw = parseYaml(text) as Record<string, unknown> | null;
  if (raw === null || typeof raw !== "object") {
    throw new Error("manifest: file is empty or not a map");
  }
  const runtime = asString(raw.runtime, "runtime");
  if (runtime !== "node" && runtime !== "python") {
    throw new Error(`manifest: runtime must be "node" or "python" (got "${runtime}")`);
  }
  return {
    id: asString(raw.id, "id"),
    name: asString(raw.name, "name"),
    version: asString(raw.version, "version"),
    sourceToken: typeof raw.source_token === "string" ? raw.source_token : undefined,
    depends: asStringArray(raw.depends, "depends"),
    runtime,
    toolSetup: parseToolSetup(raw.tool_setup),
    shims: parseShims(raw.shims),
    config: parseConfig(raw.config),
    dataDirs: asStringArray(raw.data_dirs, "data_dirs"),
    seed: parseSeed(raw.seed),
    frameworkRoot,
  };
}

/** Load + parse the manifest from a framework root dir. */
export async function loadManifest(frameworkRoot: string): Promise<FrameworkManifest> {
  const file = path.join(frameworkRoot, MANIFEST_FILENAME);
  const text = await readFile(file, "utf8");
  return parseManifest(text, frameworkRoot);
}
