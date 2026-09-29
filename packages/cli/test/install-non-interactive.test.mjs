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

test("keeps the config's comments, and leaves it untouched when nothing changed", () => {
  const dir = workspace();
  try {
    const items = path.join(dir, "items");
    const file = path.join(dir, ".aaw-config.yaml");
    writeFileSync(
      file,
      `# Workspace settings, edited by hand.\ntenant: acme\nmode: local-fs\n` +
        `work_items_path: ${JSON.stringify(items)}\n` +
        `# The thread store, cloned to ~/.threads.\nthreads_remote: https://example.test/threads.git\n`,
    );
    let r = install(dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const first = readFileSync(file, "utf8");
    assert.match(first, /^# Workspace settings, edited by hand\.$/m);
    assert.match(first, /^# The thread store, cloned to ~\/\.threads\.$/m);
    assert.equal(config(dir).threads_remote, "https://example.test/threads.git");

    // A second install with nothing new to record must not touch the file: hooks run
    // `aaw install` every session, and a rewrite would leave the file modified each time.
    r = install(dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(readFileSync(file, "utf8"), first);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("install --help prints the help and installs nothing", () => {
  const dir = workspace();
  try {
    const r = install(dir, ["--help"]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^Usage:/m);
    assert.equal(existsSync(path.join(dir, ".aaw-config.yaml")), false);
    assert.equal(existsSync(path.join(dir, ".agents")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the work items folder is created where the config resolves it", () => {
  const dir = workspace();
  const elsewhere = mkdtempSync(path.join(tmpdir(), "aaw-cwd-"));
  try {
    const r = install(elsewhere, [
      "--yes", "--workspace", dir, "--tenant", "acme", "--work-items-path", "./items/{tenant}",
    ]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(config(dir).work_items_path, "./items/{tenant}");
    assert.ok(existsSync(path.join(dir, "items", "acme")), "created under the workspace, expanded");
    assert.equal(existsSync(path.join(elsewhere, "items")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});
