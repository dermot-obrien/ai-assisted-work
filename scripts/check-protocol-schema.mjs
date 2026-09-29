#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Check that packages/protocol/src/schema.ts agrees with schemas/work.schema.json.
 *
 * The JSON Schema is the work layer's source of truth (DD-11); the TypeScript types are
 * its camelCase projection. This fails when:
 *   - a string-literal union in schema.ts and the enum of the same name differ
 *   - an entity has a field in one and not the other, reading camelCase as snake_case
 *
 * Fields the protocol adds at runtime (the tenant) and the two identifiers the files
 * name after their entity (work_item_id, initiative_id for id) are declared below.
 * Tenant, Pool, Claim and Event have no on-disk form and are not compared.
 *
 * Zero dependencies: schema.ts is read with regular expressions, which is enough for
 * its flat interfaces and unions, and fails loudly if it stops being enough.
 *
 * Usage: node scripts/check-protocol-schema.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ts = readFileSync(path.join(ROOT, "packages/protocol/src/schema.ts"), "utf8").replace(/\r\n/g, "\n");
const defs = JSON.parse(readFileSync(path.join(ROOT, "schemas/work.schema.json"), "utf8")).$defs;

const ENUMS = [
  "WorkItemStatus",
  "ActivityStatus",
  "TaskStatus",
  "InitiativeStatus",
  "DeliverableState",
  "DeliverableStatus",
  "Actor",
  "FileChangeAction",
  "WorkItemLevel",
  "CoreWorkType",
];

const ENTITIES = {
  WorkItem: { rename: { id: "work_item_id" }, runtime: ["tenantId"] },
  Initiative: { rename: { id: "initiative_id" }, runtime: ["tenantId"] },
  Activity: {},
  Task: {},
  Blocker: {},
  Deliverable: {},
  ArtifactDeliverable: {},
  FileChange: {},
  WorkItemArtifacts: {},
  WorkItemRef: {},
  InitiativeArtifacts: {},
};

const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const errors = [];

function union(name) {
  const m = new RegExp(`export type ${name} =([^;]+);`).exec(ts);
  if (!m) return null;
  const values = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  const rest = m[1].replace(/"[^"]*"/g, "").replace(/[|\s]/g, "");
  if (rest) errors.push(`schema.ts: ${name} is not a plain union of string literals`);
  return values;
}

function fields(name) {
  const m = new RegExp(`export interface ${name} \\{\\n([\\s\\S]*?)\\n\\}`).exec(ts);
  if (!m) return null;
  return [...m[1].matchAll(/^ {2}(\w+)\??:/gm)].map((x) => x[1]);
}

for (const name of ENUMS) {
  const t = union(name);
  const j = defs[name]?.enum;
  if (!t) errors.push(`schema.ts: no string-literal union ${name}`);
  if (!j) errors.push(`work.schema.json: no enum $defs/${name}`);
  if (!t || !j) continue;
  for (const v of t) if (!j.includes(v)) errors.push(`${name}: "${v}" is in schema.ts but not work.schema.json`);
  for (const v of j) if (!t.includes(v)) errors.push(`${name}: "${v}" is in work.schema.json but not schema.ts`);
}

const workType = /export type WorkType =([^;]+);/.exec(ts)?.[1] ?? "";
if (!/\bCoreWorkType\b/.test(workType) || !workType.includes("`${string}:${string}`") || !workType.includes("`x-${string}`")) {
  errors.push("schema.ts: WorkType must be CoreWorkType | `${string}:${string}` | `x-${string}`, as work.schema.json's WorkType is open");
}

for (const [name, { rename = {}, runtime = [] }] of Object.entries(ENTITIES)) {
  const t = fields(name);
  const props = defs[name]?.properties;
  if (!t) errors.push(`schema.ts: no interface ${name}`);
  if (!props) errors.push(`work.schema.json: no object $defs/${name}`);
  if (!t || !props) continue;
  const mapped = new Map(t.filter((f) => !runtime.includes(f)).map((f) => [rename[f] ?? snake(f), f]));
  for (const [k, f] of mapped) if (!(k in props)) errors.push(`${name}.${f}: schema.ts has it, work.schema.json has no ${k}`);
  for (const k of Object.keys(props)) if (!mapped.has(k)) errors.push(`${name}: work.schema.json has ${k}, schema.ts has no field for it`);
}

for (const e of errors) console.log(`error: ${e}`);
console.log(
  errors.length
    ? `\n${errors.length} disagreement(s) between schema.ts and work.schema.json.`
    : `schema.ts agrees with work.schema.json (${ENUMS.length} enums, ${Object.keys(ENTITIES).length} entities).`,
);
process.exit(errors.length ? 1 : 0);
