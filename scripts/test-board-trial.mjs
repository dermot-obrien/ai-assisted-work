#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

// Grade evidence from real board commands against an isolated local git remote.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The repository these tests run in must never be touched: drop variables that would point
// git at it whatever -C says (a platform's shell may set GIT_DIR).
for (const v of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR", "GIT_NAMESPACE", "GIT_PREFIX"]) delete process.env[v];

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills", "thread", "bin", "thread.mjs");

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "board-trial-test-"));
  const remote = path.join(root, "remote.git");
  execFileSync("git", ["init", "--quiet", "--bare", "--initial-branch=main", remote]);
  const ws = path.join(root, "platform");
  mkdirSync(ws);
  execFileSync("git", ["init", "--quiet", ws]);
  const base = {
    ...process.env,
    THREADS_REMOTE: remote,
    THREAD_SOURCE: "",
    THREAD_PROJECT: "",
    BOARD_AS: "",
    THREADS_AUTO_PRUNE: "0",
    BOARD_AUTO_PRUNE: "0",
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@t",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@t",
  };
  const agent = (store) => {
    const env = { ...base, THREADS_HOME: path.join(root, store) };
    const raw = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ws, env, encoding: "utf8" });
    const run = (...args) => {
      const r = raw(...args);
      if (r.status !== 0) throw new Error(`thread ${args.join(" ")} exited ${r.status}:\n${r.stderr}${r.stdout}`);
      return r.stdout;
    };
    return { run, raw, store: env.THREADS_HOME };
  };
  const a = agent("storeA");
  a.run("init");
  const b = agent("storeB");
  const human = agent("storeH");
  return { root, remote, a, b, human, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const postId = (out) => /📮 (p-[0-9a-z]+)/.exec(out)[1];

const GRADER = fileURLToPath(new URL("./board-trial.mjs", import.meta.url));

test("trial grader reports the winner and loser of an open-call race and the winner's ready PR", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1", "--tool", "codex", "--source", "trial");
    f.b.run("board", "start", "--as", "b1", "--tool", "copilot", "--source", "trial");
    const call = f.human.run("board", "post", "Write the trial fact sheet", "--to", "any", "--kind", "info", "--as", "user", "--source", "trial");
    const post = postId(call);
    const task = /task (t-[0-9a-z]+)/.exec(call)[1];
    f.b.run("board", "inbox", "--as", "b1");

    // B claims first locally while disconnected. A's later claim reaches the remote
    // first, so B loses once it syncs: no scheduler timing or sleeps are needed.
    execFileSync("git", ["-C", f.b.store, "remote", "set-url", "origin", path.join(f.root, "nowhere.git")]);
    assert.match(f.b.run("board", "claim", post, "--as", "b1"), /NOT PUSHED/);
    execFileSync("git", ["-C", f.b.store, "remote", "set-url", "origin", f.remote]);
    assert.match(f.a.run("board", "claim", post, "--as", "a1"), /a1 holds/);
    f.b.run("board", "ack", post, "--as", "b1");
    assert.match(f.b.run("board", "locks", "--as", "b1"), /b1 lost the race/);
    assert.equal(f.b.raw("board", "claim", post, "--as", "b1").status, 2);

    const ref = "dermot-obrien/ai-assisted-work#70";
    f.a.run("board", "ready", ref, "adds the fact sheet", "--to", "master:board-trial", "--as", "a1");
    f.a.run("note", task, `Fact sheet delivered in ${ref}`);
    f.a.run("done", task, `Fact sheet ready in ${ref}`);
    f.a.run("board", "bye", "--as", "a1");
    f.b.run("board", "bye", "--as", "b1");

    const result = spawnSync(process.execPath, [GRADER, "check", "--json", "--store", f.a.store], { cwd: f.root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.source, "trial");
    assert.equal(report.agents.length, 2);
    const winner = report.agents.find((a) => a.handle === "a1");
    const loser = report.agents.find((a) => a.handle === "b1");
    assert.equal(winner.tool, "codex");
    assert.equal(loser.tool, "copilot");
    assert.deepEqual(winner.tasks, [task]);
    assert.deepEqual(loser.tasks, []);
    assert.deepEqual(winner.detail.won, [task]);
    assert.deepEqual(loser.detail.lost, [task]);
    assert.deepEqual(winner.detail.doubled, []);
    assert.deepEqual(loser.detail.doubled, []);
    assert.equal(winner.checks["5 threads"], "pass");
    assert.equal(winner.checks["7 no double claim"], "pass");
    assert.equal(loser.checks["7 no double claim"], "pass");
    assert.equal(winner.checks["8 ready, not merged"], "pass");
    assert.equal(loser.checks["8 ready, not merged"], "n/a");
    assert.deepEqual(winner.detail.ready, [ref]);
    assert.deepEqual(loser.detail.ready, []);
    for (const agent of report.agents) {
      assert.equal(agent.checks["2 node and git"], "pass");
      assert.equal(agent.checks["3 store pushed"], "pass");
      assert.equal(agent.detail.left, true);
      for (const check of ["1 skill found", "4 pointer enough", "9 waiting"]) assert.equal(agent.checks[check], "by hand");
    }
  } finally {
    f.cleanup();
  }
});

test("trial grader still fails duplicate work and leaves agents that never claimed as n/a", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1", "--tool", "codex", "--source", "trial");
    f.b.run("board", "start", "--as", "b1", "--tool", "copilot", "--source", "trial");
    f.human.run("board", "start", "--as", "observer", "--tool", "cursor", "--source", "trial");
    const call = f.human.run("board", "post", "One task", "--to", "any", "--as", "observer");
    const post = postId(call);
    const task = /task (t-[0-9a-z]+)/.exec(call)[1];
    f.a.run("board", "claim", post, "--as", "a1");
    // Releasing unfinished work and claiming it again records two winners.
    f.a.run("board", "release", task, "--as", "a1");
    f.b.run("board", "claim", post, "--as", "b1");
    const result = spawnSync(process.execPath, [GRADER, "check", "--json", "--store", f.a.store], { cwd: f.root, encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr + result.stdout);
    const report = JSON.parse(result.stdout);
    for (const handle of ["a1", "b1"]) {
      const agent = report.agents.find((a) => a.handle === handle);
      assert.equal(agent.checks["7 no double claim"], "FAIL");
      assert.equal(agent.detail.doubled.length, 1);
    }
    const observer = report.agents.find((a) => a.handle === "observer");
    assert.equal(observer.checks["7 no double claim"], "n/a");
    assert.deepEqual(observer.tasks, []);
  } finally {
    f.cleanup();
  }
});
