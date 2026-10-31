#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for skills/work/bin/claim.mjs, activity claims held as branches on a shared remote.
 * Each test builds a bare remote and separate clones under a temp folder, the way workers in
 * separate worktrees or cloud sessions see one repository. Needs git.
 * node --test scripts/test-claim.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

for (const v of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR", "GIT_NAMESPACE", "GIT_PREFIX"]) delete process.env[v];

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills", "work", "bin", "claim.mjs");
const ENV = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t", WORK_WORKER_ID: "" };

function fixture(clones = 2) {
  const root = mkdtempSync(path.join(tmpdir(), "claim-test-"));
  const remote = path.join(root, "remote.git");
  execFileSync("git", ["init", "--quiet", "--bare", "--initial-branch=main", remote]);
  const seed = path.join(root, "seed");
  execFileSync("git", ["clone", "--quiet", remote, seed], { stdio: "ignore" });
  writeFileSync(path.join(seed, "README.md"), "workspace\n");
  execFileSync("git", ["-C", seed, "add", "-A"], { env: ENV });
  execFileSync("git", ["-C", seed, "commit", "-qm", "init"], { env: ENV });
  execFileSync("git", ["-C", seed, "push", "--quiet", "origin", "HEAD:main"], { env: ENV, stdio: "ignore" });
  const dirs = [];
  for (let i = 0; i < clones; i++) {
    const d = path.join(root, `worker${i}`);
    execFileSync("git", ["clone", "--quiet", remote, d], { stdio: "ignore" });
    dirs.push(d);
  }
  const run = (dir, ...args) => {
    const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, env: ENV, encoding: "utf8" });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  const json = (dir, ...args) => {
    const r = run(dir, ...args, "--json");
    return { status: r.status, data: JSON.parse(r.out.slice(r.out.indexOf("{"))) };
  };
  return { root, remote, dirs, run, json, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("a claim creates the branch, and a second worker in another clone is refused", () => {
  const f = fixture();
  try {
    const a = f.json(f.dirs[0], "claim", "WI-012-A1", "--worker", "agent-a");
    assert.equal(a.status, 0, JSON.stringify(a.data));
    assert.equal(a.data.branch, "wi/WI-012-A1");
    assert.equal(a.data.base, "main");
    const b = f.json(f.dirs[1], "claim", "WI-012-A1", "--worker", "agent-b");
    assert.equal(b.status, 3);
    assert.equal(b.data.holder, "agent-a");
    assert.equal(b.data.expired, false);
    assert.equal(f.run(f.dirs[1], "claim", "WI-012-A2", "--worker", "agent-b").status, 0, "a different activity is free");
  } finally {
    f.done();
  }
});

test("of several workers racing for one activity, exactly one wins", async () => {
  const f = fixture(6);
  try {
    const results = await Promise.all(
      f.dirs.map(
        (dir, i) =>
          new Promise((resolve) => {
            const p = spawn(process.execPath, [SCRIPT, "claim", "WI-007-A3", "--worker", `agent-${i}`], { cwd: dir, env: ENV });
            p.on("close", (code) => resolve(code));
          }),
      ),
    );
    assert.equal(results.filter((c) => c === 0).length, 1, `exit codes: ${results}`);
    assert.equal(results.filter((c) => c === 3).length, f.dirs.length - 1, `exit codes: ${results}`);
  } finally {
    f.done();
  }
});

test("list reports each claim with its holder and lease", () => {
  const f = fixture();
  try {
    f.run(f.dirs[0], "claim", "WI-012-A1", "--worker", "agent-a");
    f.run(f.dirs[1], "claim", "WI-012-A2", "--worker", "jo", "--human");
    f.run(f.dirs[1], "claim", "WI-013-A1", "--worker", "agent-b");
    const l = f.json(f.dirs[0], "list", "WI-012");
    assert.equal(l.status, 0);
    assert.deepEqual(l.data.claims.map((c) => [c.activity, c.holder, c.holder_type, c.lease_minutes]), [
      ["WI-012-A1", "agent-a", "agent", 60],
      ["WI-012-A2", "jo", "human", 480],
    ]);
    assert.equal(f.json(f.dirs[0], "list").data.claims.length, 3);
  } finally {
    f.done();
  }
});

test("takeover is refused while the lease is live, and keeps the old commits once it has expired", () => {
  const f = fixture();
  try {
    f.run(f.dirs[0], "claim", "WI-012-A1", "--worker", "agent-a", "--checkout");
    assert.equal(f.run(f.dirs[1], "takeover", "WI-012-A1", "--worker", "agent-b").status, 3);

    f.run(f.dirs[1], "claim", "WI-012-A2", "--worker", "agent-a", "--lease", "0", "--checkout");
    // The first worker commits a task, then dies.
    writeFileSync(path.join(f.dirs[1], "task.txt"), "T1 done\n");
    execFileSync("git", ["-C", f.dirs[1], "add", "-A"], { env: ENV });
    execFileSync("git", ["-C", f.dirs[1], "commit", "-qm", "feat(WI-012-A2-T1): first task"], { env: ENV });
    execFileSync("git", ["-C", f.dirs[1], "push", "--quiet", "origin", "wi/WI-012-A2"], { env: ENV, stdio: "ignore" });
    const t1 = execFileSync("git", ["-C", f.dirs[1], "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

    const t = f.json(f.dirs[0], "takeover", "WI-012-A2", "--worker", "agent-b", "--checkout");
    assert.equal(t.status, 0, JSON.stringify(t.data));
    assert.equal(t.data.previous.holder, "agent-a");
    const parent = execFileSync("git", ["-C", f.dirs[0], "rev-parse", "HEAD^"], { encoding: "utf8" }).trim();
    assert.equal(parent, t1, "the takeover commit sits on the dead worker's last commit");
    assert.equal(f.json(f.dirs[0], "list", "WI-012").data.claims.find((c) => c.activity === "WI-012-A2").holder, "agent-b");
  } finally {
    f.done();
  }
});

test("only the holder releases a live claim, and release deletes the branch", () => {
  const f = fixture();
  try {
    f.run(f.dirs[0], "claim", "WI-012-A1", "--worker", "agent-a");
    assert.equal(f.run(f.dirs[1], "release", "WI-012-A1", "--worker", "agent-b").status, 3);
    assert.equal(f.run(f.dirs[0], "release", "WI-012-A1", "--worker", "agent-a").status, 0);
    assert.equal(f.json(f.dirs[1], "list", "WI-012").data.claims.length, 0);
    assert.equal(f.run(f.dirs[1], "claim", "WI-012-A1", "--worker", "agent-b").status, 0, "released work can be claimed again");
  } finally {
    f.done();
  }
});

test("a claim from an integration branch, and usage errors", () => {
  const f = fixture();
  try {
    execFileSync("git", ["-C", f.dirs[0], "push", "--quiet", "origin", "HEAD:refs/heads/wi/WI-012-rate-limits"], { env: ENV, stdio: "ignore" });
    const a = f.json(f.dirs[1], "claim", "WI-012-A1", "--base", "wi/WI-012-rate-limits", "--worker", "agent-a");
    assert.equal(a.status, 0);
    assert.equal(a.data.base, "wi/WI-012-rate-limits");
    assert.equal(f.run(f.dirs[1], "claim", "WI-012-A9", "--base", "no-such-branch").status, 1);
    assert.equal(f.run(f.dirs[1], "claim", "A1").status, 2);
    assert.equal(f.run(f.dirs[1], "frobnicate").status, 2);
  } finally {
    f.done();
  }
});
