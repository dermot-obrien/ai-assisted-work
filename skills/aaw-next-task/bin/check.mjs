#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Post-install check for an AAW work-management skill (DD-11).
 *
 * Run from the workspace root, with SKILL_DIR set to the installed skill's directory.
 * Checks that .aaw-config.yaml is there and that the locations it names resolve:
 * work_items_path, initiatives_path where set, and deliverables_register where set.
 *
 * Exit 0: correct (warnings may be printed). Exit 1: problems, one line each.
 * Exit 2: usage or environment error. Offline and read-only.
 *
 * The same file ships in every aaw-* skill, so each skill is complete on its own;
 * CI checks the copies are identical.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const major = Number(process.versions.node.split(".")[0]);
if (major < 18) {
  console.error(`Node.js ${process.versions.node} is too old: this check needs 18 or newer.`);
  process.exit(2);
}
if (process.argv.length > 2 && !["-h", "--help"].includes(process.argv[2])) {
  console.error("usage: check.mjs   (run from the workspace root; takes no arguments)");
  process.exit(2);
}
if (process.argv[2]) {
  console.log("Checks .aaw-config.yaml and the paths it names. Run from the workspace root.");
  process.exit(0);
}

const skillDir = process.env.SKILL_DIR || path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const skill = path.basename(skillDir);
// These skills create the work item or initiative folder when it is missing.
const creates = new Set(["aaw-start-work", "aaw-start-initiative"]);

const root = process.cwd();
const problems = [];
const warnings = [];

/** The top-level scalar keys of a YAML file, which is all .aaw-config.yaml needs here. */
function topLevel(text) {
  const out = {};
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*?)\s*$/.exec(line);
    if (!m || m[2] === "") continue;
    let v = m[2];
    if (v[0] === '"' || v[0] === "'") {
      const end = v.indexOf(v[0], 1);
      v = end > 0 ? v.slice(1, end) : v.slice(1);
    } else v = v.replace(/\s+#.*$/, "");
    out[m[1]] = v === "null" || v === "~" ? null : v;
  }
  return out;
}

const configFile = path.join(root, ".aaw-config.yaml");
if (!existsSync(configFile)) {
  problems.push(
    `.aaw-config.yaml: not found in ${root}. Run the AAW installer in the workspace root, or create it with work_items_path: <folder for work items>.`,
  );
} else {
  const cfg = topLevel(readFileSync(configFile, "utf8"));
  const tenant = cfg.tenant || "local";
  const expand = (p) =>
    path.resolve(
      root,
      p.replace(/^~(?=\/|\\|$)/, homedir()).replace(/\{tenant\}/g, tenant).replace(/\{repo\}/g, path.basename(root)),
    );

  const checkDir = (key, fallback, required) => {
    const raw = cfg[key] || fallback;
    const p = expand(raw);
    const shown = cfg[key] ? `${key} ${raw}` : `${key} (unset, so the default ${fallback})`;
    if (existsSync(p) && !statSync(p).isDirectory()) {
      problems.push(`.aaw-config.yaml: ${shown} resolves to ${p}, which is a file, not a folder. Point it at a folder.`);
    } else if (!existsSync(p)) {
      const line = `.aaw-config.yaml: ${shown} resolves to ${p}, which does not exist.`;
      if (creates.has(skill)) warnings.push(`${line} ${skill} creates it on first use.`);
      else if (!required) warnings.push(`${line} There is nothing to read until it exists.`);
      else problems.push(`${line} Create the folder, or correct ${key}.`);
    }
  };

  // A path the workspace states and that is missing is a misconfiguration. The default
  // missing is a workspace with no work in it yet, which is only worth a warning.
  checkDir("work_items_path", "./change/work-items/", Boolean(cfg.work_items_path));
  // Initiatives are optional, so a missing folder is only worth a warning.
  if (cfg.initiatives_path || skill === "aaw-start-initiative") {
    checkDir("initiatives_path", "./change/initiatives/", false);
  }
  if (cfg.deliverables_register) {
    const p = expand(cfg.deliverables_register);
    if (!existsSync(p)) {
      problems.push(
        `.aaw-config.yaml: deliverables_register ${cfg.deliverables_register} resolves to ${p}, which does not exist. Correct it, or remove the key to name products without a register.`,
      );
    }
  }
  if (cfg.mode && !["local-fs", "cloud"].includes(cfg.mode)) {
    problems.push(`.aaw-config.yaml: mode ${cfg.mode} is not local-fs or cloud.`);
  }
}

for (const w of warnings) console.log(`warning: ${w}`);
for (const p of problems) console.log(p);
if (problems.length === 0) console.log(`${skill}: ok`);
process.exit(problems.length ? 1 : 0);
