// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * The fixture every board test uses: two stores cloned from one local bare remote stand in for
 * two agents on two machines, and a third for a person. Needs git and nothing else.
 *
 *   import { fixture, postId } from "./fixture.mjs";
 */

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The repository these tests run in must never be touched: drop variables that would point
// git at it whatever -C says (a platform's shell may set GIT_DIR).
for (const v of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR", "GIT_NAMESPACE", "GIT_PREFIX"]) delete process.env[v];

export const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "skills", "thread", "bin", "thread.mjs");

export function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "board-test-"));
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
    // A command left running (wait), so another agent can act while it does.
    const later = (...args) => new Promise((resolve) => {
      const c = spawn(process.execPath, [SCRIPT, ...args], { cwd: ws, env });
      let out = "";
      c.stdout.on("data", (d) => (out += d));
      c.stderr.on("data", (d) => (out += d));
      c.on("close", (status) => resolve({ status, out }));
    });
    return { run, raw, later, store: env.THREADS_HOME };
  };
  const a = agent("storeA");
  a.run("init");
  const b = agent("storeB");
  const human = agent("storeH");
  return { root, remote, a, b, human, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

export const postId = (out) => /📮 (p-[0-9a-z]+)/.exec(out)[1];
