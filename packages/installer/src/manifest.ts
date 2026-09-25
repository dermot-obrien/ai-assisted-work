// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * The framework manifest contract.
 *
 * Every AAW-family framework (work, architecture, research) ships a
 * `framework.manifest.yaml` at its repo root describing how it is installed:
 * which Agent Skills to install, which config files to seed, which data dirs to
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

/** AI tools we detect in a workspace, to decide what an install needs to place. */
export type ToolName = "claude" | "cursor" | "copilot" | "gemini";

export const TOOL_NAMES: readonly ToolName[] = ["claude", "cursor", "copilot", "gemini"];

/**
 * Standalone Agent Skills the framework ships (agentskills.io format).
 *
 * A skill is self-contained: a directory with a SKILL.md plus its own references/
 * and assets/. It carries no pointer back into the framework, which is why the
 * installer has no path-rewriting step.
 *
 * The destination is fixed by convention, not by the manifest:
 *   - `.agents/skills/<name>/` — read natively by Codex, Cursor, Copilot, VS Code
 *     and Gemini CLI.
 *   - `.claude/skills/<name>/` — linked at the above, because Claude Code does not
 *     read `.agents/skills/`.
 */
export interface SkillsMapping {
  /** Directory of skill folders, relative to the framework root. */
  src: string;
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
  /** Short namespace, e.g. "aaw" | "aar" | "aaa". Used for the module registry and the legacy-shim sweep. */
  id: string;
  name: string;
  version: string;
  /** Framework ids this one depends on (must be installed/present first). */
  depends: string[];
  runtime: FrameworkRuntime;
  toolSetup?: ToolSetup;
  /** Standalone Agent Skills to install. */
  skills?: SkillsMapping;
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

function parseSkills(value: unknown): SkillsMapping | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") throw new Error("manifest: skills must be a map");
  const rec = value as Record<string, unknown>;
  return { src: asString(rec.src, "skills.src") };
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
    depends: asStringArray(raw.depends, "depends"),
    runtime,
    toolSetup: parseToolSetup(raw.tool_setup),
    skills: parseSkills(raw.skills),
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
