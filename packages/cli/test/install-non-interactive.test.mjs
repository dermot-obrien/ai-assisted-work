// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

// `aaw install` for AAW itself, run the way hooks, CI and agents run it: through the
// bundled bin/aaw.js with stdin piped, so there is no terminal. It must never prompt.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const here = path.dirname(fileURLToPath(import.meta.url));
const bin = path.resolve(here, "..", "..", "..", "bin", "aaw.js");

function workspace() {
  const dir = mkdtempSync(path.join(tmpdir(), "aaw-install-"));
  mkdirSync(path.join(dir, ".git"));
  return dir;
}

function install(cwd, args = []) {
  return spawnSync(process.execPath, [bin, "install", ...args], {
    cwd,
    input: "", // stdin is a pipe that closes at once: no terminal, and no answers
    encoding: "utf8",
  });
}

const config = (dir) => parse(readFileSync(path.join(dir, ".aaw-config.yaml"), "utf8"));

test("keeps an existing config's values without a terminal", () => {
  const dir = workspace();
  try {
    const items = path.join(dir, "items");
    writeFileSync(
      path.join(dir, ".aaw-config.yaml"),
      `tenant: acme\nmode: local-fs\nwork_items_path: ${JSON.stringify(items)}\nthreads_remote: https://example.test/threads.git\n`,
    );
    const r = install(dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /Non-interactive: tenant=acme, mode=local-fs/);
    assert.doesNotMatch(r.stdout + r.stderr, /readline was closed|Press Enter/);
    const c = config(dir);
    assert.equal(c.tenant, "acme");
    assert.equal(c.work_items_path, items);
    assert.equal(c.threads_remote, "https://example.test/threads.git"); // other keys survive
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("flags answer the questions on a fresh workspace", () => {
  const dir = workspace();
  try {
    const items = path.join(dir, "work", "items");
    const r = install(dir, ["--yes", "--tenant", "beta", "--mode", "cloud", "--work-items-path", items]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const c = config(dir);
    assert.equal(c.tenant, "beta");
    assert.equal(c.mode, "cloud");
    assert.equal(c.work_items_path, items);
    assert.ok(existsSync(items), "work_items_path is created");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--workspace installs into another folder without asking", () => {
  const from = workspace();
  const target = workspace();
  try {
    const items = path.join(target, "items");
    const r = install(from, ["--workspace", target, "--work-items-path", items]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(existsSync(path.join(target, ".aaw-config.yaml")));
    assert.ok(!existsSync(path.join(from, ".aaw-config.yaml")));
  } finally {
    rmSync(from, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  }
});

test("an invalid mode exits 2 and writes nothing", () => {
  const dir = workspace();
  try {
    const r = install(dir, ["--mode", "sideways", "--work-items-path", path.join(dir, "items")]);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /Unsupported mode: sideways/);
    assert.ok(!existsSync(path.join(dir, ".aaw-config.yaml")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
