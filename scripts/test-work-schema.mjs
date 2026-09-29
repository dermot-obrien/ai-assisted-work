#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Test the skills' YAML templates against schemas/work.schema.json, and the schema
 * against a few cases it must refuse.
 *
 * A template carries placeholders where an identifier goes (WI-NNN); they are filled
 * with a sample number first, since an identifier pattern rightly refuses NNN.
 *
 * Needs the `yaml` package, which the CLI workspace installs, so it runs after
 * `npm ci`.
 *
 * Usage: node scripts/test-work-schema.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { Registry, validate } from "./validate-bundle.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = new Registry();
const WORK = registry.addFile(path.join(ROOT, "schemas/work.schema.json"));
const def = (name) => registry.resolve(`${WORK}#/$defs/${name}`, null);

const fill = (text) => text.replace(/\b(WI|IN|OBJ|KR|MS)-NNN\b/g, "$1-001");
const load = (rel) => parse(fill(readFileSync(path.join(ROOT, rel), "utf8")));

let failed = 0;
function expect(label, value, name, ok) {
  const d = def(name);
  const errors = validate(value, d.schema, registry, d.root);
  const pass = ok ? errors.length === 0 : errors.length > 0;
  console.log(`${pass ? "  ok  " : " FAIL "} ${label}`);
  if (!pass) {
    failed++;
    for (const e of ok ? errors : []) console.log(`        ${e.path}: ${e.message}`);
    if (!ok) console.log("        was accepted, and should have been refused");
  }
}

const templates = [
  ["skills/aaw-start-work/assets/templates/progress.yaml", "WorkItem"],
  ["skills/aaw-progress-work/assets/templates/progress.yaml", "WorkItem"],
  ["skills/aaw-start-initiative/assets/templates/initiative-progress.yaml", "Initiative"],
  ["skills/aaw-start-initiative/assets/templates/objective-progress.yaml", "Objective"],
];
for (const [file, name] of templates) expect(`${file} matches $defs/${name}`, load(file), name, true);

const item = load(templates[0][0]);
const clone = () => JSON.parse(JSON.stringify(item));

let x = clone();
delete x.activities[0].produces;
expect("a schema version 3 activity without produces is refused", x, "WorkItem", false);

x = clone();
x.schema_version = 2;
delete x.activities[0].produces;
delete x.work_item_level;
expect("a schema version 2 activity without produces is accepted", x, "WorkItem", true);

x = clone();
x.type = "delivery:enabler";
expect("a layer's namespaced work type is accepted", x, "WorkItem", true);

x = clone();
x.type = "x-research";
expect("a workspace's x- work type is accepted", x, "WorkItem", true);

x = clone();
x.type = "research";
expect("an unknown bare work type is refused", x, "WorkItem", false);

x = clone();
x.budget_points = 13;
x.activities[0].site_route = "/stories/ST-001/";
expect("a higher layer's fields are accepted (the types are open)", x, "WorkItem", true);

x = clone();
x.deliverables[0].state = "done";
expect("a deliverable state outside the product states is refused", x, "WorkItem", false);

console.log(failed ? `\n${failed} failure(s).` : "\nwork.schema.json: all cases pass.");
process.exit(failed ? 1 : 0);
