#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for skills/thread/bin/thread.mjs: sources (DD-12) and the store behaviour they rely on.
 *
 * Each test runs the script against a fresh store cloned from a local bare repository, so
 * it needs git and nothing else. Zero dependencies; node scripts/test-thread.mjs.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills", "thread", "bin", "thread.mjs");

/** A bare remote, an empty store location and a workspace repo, all under one temp folder. */
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "thread-test-"));
  const remote = path.join(root, "remote.git");
  execFileSync("git", ["init", "--quiet", "--bare", "--initial-branch=main", remote]);
  const ws = path.join(root, "ws");
  mkdirSync(ws);
  execFileSync("git", ["init", "--quiet", ws]);
  const env = {
    ...process.env,
    THREADS_HOME: path.join(root, "store"),
    THREADS_REMOTE: remote,
    THREAD_SOURCE: "",
    THREAD_PROJECT: "",
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@t",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@t",
  };
  const run = (...args) => {
    const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ws, env, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`thread ${args.join(" ")} failed:\n${r.stderr}${r.stdout}`);
    return { out: r.stdout, err: r.stderr };
  };
  const fails = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ws, env, encoding: "utf8" });
  const idOf = (out) => /🧵 (t-[0-9a-z]+)/.exec(out)[1];
  run("init");
  return { root, ws, env, run, fails, idOf, store: env.THREADS_HOME, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("without sources, nothing changes: no heading, events at the root", () => {
  const f = fixture();
  try {
    const id = f.idOf(f.run("open", "plain thread").out);
    assert.ok(existsSync(path.join(f.store, "events")));
    assert.ok(!existsSync(path.join(f.store, "sources")));
    const s = f.run("status").out;
    assert.match(s, new RegExp(id));
    assert.doesNotMatch(s, /source:/);
  } finally {
    f.cleanup();
  }
});

test("a named source is a separate tree, chosen by flag, env or .aaw-config.yaml", () => {
  const f = fixture();
  try {
    const a = f.idOf(f.run("open", "default work").out);
    const opened = f.run("open", "segment work", "--source", "seg").out;
    assert.match(opened, /started source seg/);
    const b = f.idOf(opened);
    assert.notEqual(a, b);
    assert.ok(existsSync(path.join(f.store, "sources", "seg", "events")));

    const def = f.run("tree").out;
    assert.match(def, /source: default/);
    assert.match(def, new RegExp(a));
    assert.doesNotMatch(def, new RegExp(b));

    writeFileSync(path.join(f.ws, ".aaw-config.yaml"), "threads_source: seg\n");
    const seg = f.run("tree").out;
    assert.match(seg, /source: seg/);
    assert.match(seg, new RegExp(b));
    assert.doesNotMatch(seg, new RegExp(a));

    const status = f.run("status").out;
    assert.match(status, /open in other sources: default \(1\)/);

    const all = JSON.parse(f.run("tree", "--source", "all", "--json").out);
    assert.deepEqual(all.map((r) => [r.source, r.id]).sort(), [["default", a], ["seg", b]].sort());
    assert.match(f.run("sources").out, /seg .*← this workspace/);
  } finally {
    f.cleanup();
  }
});

test("an id held by another source is found there, and writes go to that source", () => {
  const f = fixture();
  try {
    const b = f.idOf(f.run("open", "segment work", "--source", "seg").out);
    const r = f.run("note", b, "from a default workspace");
    assert.match(r.err, /is in source seg/);
    assert.match(f.run("show", b, "--source", "seg").out, /from a default workspace/);
    const child = f.run("open", "child", "--parent", b);
    assert.match(child.err, /is in source seg/);
    assert.match(f.run("tree", "--source", "seg").out, /child/);
  } finally {
    f.cleanup();
  }
});

test("transfer moves a tree, archived branches included, and keeps ids and history", () => {
  const f = fixture();
  try {
    const root = f.idOf(f.run("open", "segment root").out);
    const kid = f.idOf(f.run("open", "open child", "--parent", root).out);
    const old = f.idOf(f.run("open", "finished child", "--parent", root).out);
    f.run("done", old, "finished it");
    f.run("prune");
    const other = f.idOf(f.run("open", "stays in default").out);

    const t = f.run("transfer", root, "--to", "seg").out;
    assert.match(t, /and 2 thread\(s\) under it/);

    const def = f.run("tree", "--all").out;
    assert.match(def, new RegExp(other));
    for (const id of [root, kid, old]) assert.doesNotMatch(def, new RegExp(id));

    const seg = f.run("tree", "--all", "--source", "seg").out;
    for (const id of [root, kid, old]) assert.match(seg, new RegExp(id));
    assert.match(seg, /finished it/);

    // The anchor still resolves from the default source, in the source it moved to.
    assert.match(f.run("resume", kid).err, /is in source seg/);

    // A new id is unique across sources.
    const ids = new Set([root, kid, old, other]);
    for (let i = 0; i < 5; i++) assert.ok(!ids.has(f.idOf(f.run("open", `n${i}`, "--source", "seg").out)));

    assert.notEqual(f.fails("transfer", other, "--to", "default").status, 0);
  } finally {
    f.cleanup();
  }
});

test("an event written to the old source after a transfer is forwarded to the new one", () => {
  const f = fixture();
  try {
    const root = f.idOf(f.run("open", "segment root").out);
    f.run("transfer", root, "--to", "seg");
    // Another machine that had not seen the transfer notes the thread in the default source.
    const day = path.join(f.store, "events", "2026-10-04");
    mkdirSync(day, { recursive: true });
    const ev = { ts: new Date().toISOString(), host: "elsewhere", type: "note", id: root, text: "late note" };
    writeFileSync(path.join(day, "20261004T000000Z-elsewhere-abcdef.json"), JSON.stringify(ev));
    const r = f.run("status");
    assert.match(r.err, /forwarded 1 event/);
    assert.ok(existsSync(path.join(f.store, "sources", "seg", "events", "2026-10-04", "20261004T000000Z-elsewhere-abcdef.json")));
    assert.match(f.run("show", root, "--source", "seg").out, /late note/);
  } finally {
    f.cleanup();
  }
});

test("--source all is only a view", () => {
  const f = fixture();
  try {
    f.run("open", "x");
    assert.notEqual(f.fails("open", "y", "--source", "all").status, 0);
    assert.notEqual(f.fails("open", "y", "--source", "Bad Name").status, 0);
  } finally {
    f.cleanup();
  }
});
