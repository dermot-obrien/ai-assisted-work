#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for the bulletin board (skills/thread/bin/board.mjs, run as `thread board ...`).
 *
 * Two stores cloned from one local bare remote stand in for two agents on two machines.
 * Needs git and nothing else. Zero dependencies; node --test scripts/test-board.mjs.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills", "thread", "bin", "thread.mjs");

function fixture() {
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
    return { run, raw, store: env.THREADS_HOME };
  };
  const a = agent("storeA");
  a.run("init");
  const b = agent("storeB");
  const human = agent("storeH");
  return { root, remote, a, b, human, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const postId = (out) => /📮 (p-[0-9a-z]+)/.exec(out)[1];

test("start gives a handle, and a role routes instructions to whoever holds it", () => {
  const f = fixture();
  try {
    const out = f.a.run("board", "start", "--tool", "claude-code", "--role", "master: patternode-platform");
    const handle = /📋 (claude-[0-9a-z]{3})/.exec(out)[1];
    assert.match(out, /master:patternode-platform/);
    const id = postId(f.human.run("board", "post", "Merge #480 once CI is green", "--to", "master:patternode-platform", "--kind", "instruction", "--as", "dermot"));
    const inbox = f.a.run("board", "inbox", "--as", handle);
    assert.match(inbox, new RegExp(id));
    assert.match(inbox, /Merge #480/);
    // A second agent does not see it, and cannot take the role while it is held.
    f.b.run("board", "start", "--as", "codex-1", "--tool", "codex");
    assert.match(f.b.run("board", "inbox", "--as", "codex-1"), /nothing unread/);
    assert.equal(f.b.raw("board", "role", "master:patternode-platform", "--as", "codex-1").status, 2);
  } finally {
    f.cleanup();
  }
});

test("acknowledging clears the inbox, and the sender sees the outcome", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    const id = postId(f.human.run("board", "post", "Rename the job", "--to", "a1", "--kind", "instruction", "--as", "dermot"));
    f.a.run("board", "accept", id, "--as", "a1");
    assert.match(f.a.run("board", "inbox", "--as", "a1"), /nothing unread/);
    assert.notEqual(f.a.raw("board", "done", id, "--as", "a1").status, 0, "done needs a result");
    f.a.run("board", "done", id, "renamed in #12", "--as", "a1");
    const sent = f.human.run("board", "sent", "--as", "dermot");
    assert.match(sent, /accepted by a1/);
    assert.match(sent, /done by a1.*renamed in #12/);
  } finally {
    f.cleanup();
  }
});

test("an open call goes to the first agent to claim it, and leaves everyone else's inbox", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    f.b.run("board", "start", "--as", "b1");
    const id = postId(f.human.run("board", "post", "Fix the flaky test", "--to", "any", "--kind", "instruction", "--as", "dermot"));
    assert.match(f.b.run("board", "inbox", "--as", "b1"), /Open to any agent/);
    assert.match(f.a.run("board", "claim", id, "--as", "a1"), /a1 holds/);
    assert.equal(f.b.raw("board", "claim", id, "--as", "b1").status, 2);
    assert.match(f.b.run("board", "inbox", "--as", "b1"), /nothing unread/);
    f.a.run("board", "done", id, "fixed in #13", "--as", "a1");
    assert.match(f.a.run("board", "locks"), /Nothing is claimed/);
  } finally {
    f.cleanup();
  }
});

test("two claims in a race: the first one pushed wins, whatever the clocks say", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    f.b.run("board", "start", "--as", "b1");
    // B claims first by the clock but cannot reach the remote, so its claim stays local.
    const good = execFileSync("git", ["-C", f.b.store, "remote", "get-url", "origin"], { encoding: "utf8" }).trim();
    execFileSync("git", ["-C", f.b.store, "remote", "set-url", "origin", path.join(f.root, "nowhere.git")]);
    const early = f.b.run("board", "claim", "WI-012-A3", "--as", "b1");
    assert.match(early, /NOT PUSHED/);
    execFileSync("git", ["-C", f.b.store, "remote", "set-url", "origin", good]);
    // A claims later by the clock, and pushes.
    assert.match(f.a.run("board", "claim", "WI-012-A3", "--as", "a1"), /a1 holds/);
    // B's next command pushes its claim on top of A's, and reads back that it lost.
    const locks = f.b.run("board", "locks");
    assert.match(locks, /WI-012-A3 · a1/);
    assert.match(locks, /b1 lost the race/);
    assert.equal(f.b.raw("board", "claim", "WI-012-A3", "--as", "b1").status, 2);
  } finally {
    f.cleanup();
  }
});

test("an expired claim is free, and a holder renews its own", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    f.b.run("board", "start", "--as", "b1");
    f.a.run("board", "claim", "t-abc", "--for", "0.001m", "--as", "a1");
    assert.match(f.b.run("board", "claim", "t-abc", "--as", "b1"), /b1 holds/);
    assert.match(f.b.run("board", "claim", "t-abc", "--for", "2h", "--as", "b1"), /b1 holds t-abc for 2h/);
  } finally {
    f.cleanup();
  }
});

test("posts on a thread reach the agents following it, and show with the thread", () => {
  const f = fixture();
  try {
    const t = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "earnings lab"))[1];
    f.a.run("board", "start", "--as", "a1", "--thread", t);
    f.human.run("board", "post", "Use the new price", "--on", t, "--kind", "instruction", "--as", "dermot");
    assert.match(f.a.run("board", "inbox", "--as", "a1"), /Use the new price/);
    const shown = f.a.run("show", t);
    assert.match(shown, /board: 1 post/);
    assert.match(shown, /Use the new price/);
  } finally {
    f.cleanup();
  }
});

test("a Markdown post written by hand counts, from the user, to the agents it names", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1", "--role", "master:patternode-business");
    const dir = path.join(f.human.store, "board", "by-hand");
    f.human.run("board", "read"); // clones the store
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "20261011T080000Z-flights.md"), "---\nto: master:patternode-business\nkind: instruction\n---\nPark the briefing work until Monday.\n");
    execFileSync("git", ["-C", f.human.store, "add", "-A"]);
    execFileSync("git", ["-C", f.human.store, "commit", "-qm", "by hand"], { env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
    execFileSync("git", ["-C", f.human.store, "push", "-q", "origin", "HEAD:main"]);
    const inbox = f.a.run("board", "inbox", "--as", "a1");
    assert.match(inbox, /instruction · from user/);
    assert.match(inbox, /Park the briefing work/);
  } finally {
    f.cleanup();
  }
});

test("standing orders show in every briefing until retracted", () => {
  const f = fixture();
  try {
    const id = postId(f.human.run("board", "post", "Never merge: ready notes go to the master session", "--to", "*", "--kind", "standing", "--as", "dermot"));
    assert.match(f.a.run("board", "start", "--as", "a1"), /Standing orders \(1\)/);
    assert.match(f.b.run("board", "start", "--hook"), /Never merge/);
    f.human.run("board", "retract", id, "--as", "dermot");
    assert.doesNotMatch(f.b.run("board", "start", "--as", "b1"), /Standing orders/);
  } finally {
    f.cleanup();
  }
});

test("wait returns as soon as something arrives, and times out otherwise", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    const idle = f.a.raw("board", "wait", "--as", "a1", "--timeout", "0.02m", "--every", "0.01m");
    assert.equal(idle.status, 3);
    f.human.run("board", "post", "Pick up WI-012-A4", "--to", "a1", "--kind", "instruction", "--as", "dermot");
    assert.match(f.a.run("board", "wait", "--as", "a1", "--timeout", "1m"), /Pick up WI-012-A4/);
  } finally {
    f.cleanup();
  }
});

test("prune archives settled posts and keeps what still waits", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    const done = postId(f.human.run("board", "post", "Done soon", "--to", "a1", "--kind", "instruction", "--as", "dermot"));
    const waiting = postId(f.human.run("board", "post", "Still to do", "--to", "a1", "--kind", "instruction", "--as", "dermot"));
    f.a.run("board", "done", done, "did it", "--as", "a1");
    const out = f.a.run("board", "prune", "--days", "0");
    assert.match(out, /archived \d+ settled board file/);
    const inbox = f.a.run("board", "inbox", "--as", "a1");
    assert.match(inbox, new RegExp(waiting));
    assert.doesNotMatch(f.a.run("board", "read"), new RegExp(done));
    assert.match(f.a.run("board", "read", "--all"), new RegExp(done));
    assert.ok(existsSync(path.join(f.a.store, "board-archive")));
  } finally {
    f.cleanup();
  }
});

test("a session-start hook with no store configured prints nothing and succeeds", () => {
  const root = mkdtempSync(path.join(tmpdir(), "board-hook-"));
  try {
    const r = spawnSync(process.execPath, [SCRIPT, "board", "start", "--hook"], {
      cwd: root,
      env: { ...process.env, THREADS_HOME: path.join(root, "none"), THREADS_REMOTE: "" },
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
