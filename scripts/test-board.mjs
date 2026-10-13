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
    assert.match(f.b.run("board", "inbox", "--as", "b1"), /Open calls/);
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

test("sources are paths: a view of patternode includes patternode/platform and patternode/business", () => {
  const f = fixture();
  try {
    const p = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "platform work", "--source", "patternode/platform"))[1];
    const b = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "business work", "--source", "patternode/business"))[1];
    const o = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "film work", "--source", "personal"))[1];
    assert.ok(existsSync(path.join(f.a.store, "sources", "patternode", "platform", "events")));
    const view = f.a.run("tree", "--source", "patternode");
    assert.match(view, new RegExp(p));
    assert.match(view, new RegExp(b));
    assert.doesNotMatch(view, new RegExp(o));
    const leaf = f.a.run("tree", "--source", "patternode/platform");
    assert.match(leaf, new RegExp(p));
    assert.doesNotMatch(leaf, new RegExp(b));
    assert.match(f.a.run("sources"), /patternode\/business/);
  } finally {
    f.cleanup();
  }
});

test("the board is scoped by path: broadcasts reach paths above and below, direct posts reach anywhere", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "plat", "--source", "patternode/platform", "--role", "master:patternode-platform");
    f.b.run("board", "start", "--as", "film", "--source", "personal");
    const top = postId(f.human.run("board", "post", "All Patternode agents: stop at 8pm", "--to", "*", "--kind", "standing", "--as", "user", "--source", "patternode"));
    const direct = postId(f.human.run("board", "post", "Merge #480", "--to", "master:patternode-platform", "--kind", "instruction", "--as", "user", "--source", "personal"));
    const platInbox = f.a.run("board", "inbox", "--as", "plat");
    assert.match(platInbox, new RegExp(top), "a broadcast from the path above reaches it");
    assert.match(platInbox, new RegExp(direct), "a post to its role reaches it from any path");
    assert.doesNotMatch(f.b.run("board", "inbox", "--as", "film"), new RegExp(top), "a sibling path does not hear it");
    // A chat joined at the top sees the agents beneath it; one in a sibling path does not.
    f.human.run("board", "start", "--as", "user", "--source", "patternode");
    assert.match(f.human.run("board", "status", "--as", "user"), /plat · .*in patternode\/platform/);
    assert.doesNotMatch(f.human.run("board", "who", "--as", "user"), /film/);
  } finally {
    f.cleanup();
  }
});

test("claims hold across paths: the same key cannot be taken twice in two sources", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1", "--source", "patternode/platform");
    f.b.run("board", "start", "--as", "b1", "--source", "patternode/business");
    f.a.run("board", "claim", "WI-070-A1", "--as", "a1");
    assert.equal(f.b.raw("board", "claim", "WI-070-A1", "--as", "b1").status, 2);
  } finally {
    f.cleanup();
  }
});

test("pick up work: the briefing lists open threads in the scope that nobody holds", () => {
  const f = fixture();
  try {
    const t = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "wire the queue", "--source", "patternode/platform"))[1];
    const out = f.b.run("board", "start", "--as", "b1", "--source", "patternode");
    assert.match(out, new RegExp(`Work nobody holds.*\\n.*${t}`));
    f.b.run("board", "claim", t, "--as", "b1");
    assert.doesNotMatch(f.a.run("board", "start", "--as", "a1", "--source", "patternode"), new RegExp(`${t} · wire`));
  } finally {
    f.cleanup();
  }
});

test("the merge queue keeps order, holds a pull request until the ones it follows merge, and keeps its place on update", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "m1", "--role", "master:patternode-platform");
    f.b.run("board", "start", "--as", "w1");
    f.b.run("board", "ready", "patternode/patternode-platform#10", "adds the API", "--as", "w1");
    f.b.run("board", "ready", "patternode/patternode-platform#11", "uses the API", "--after", "patternode/patternode-platform#10", "--as", "w1");
    f.b.run("board", "ready", "patternode/patternode-platform#12", "docs", "--as", "w1");
    // #10 is updated after review: it keeps first place.
    f.b.run("board", "ready", "patternode/patternode-platform#10", "adds the API, review fixed", "--as", "w1");
    let q = f.a.run("board", "queue", "--as", "m1");
    assert.match(q, /1\. patternode\/patternode-platform#10 · ready, next[\s\S]*review fixed/);
    assert.match(q, /2\. patternode\/patternode-platform#11 · waits for patternode\/patternode-platform#10/);
    assert.match(q, /3\. patternode\/patternode-platform#12 · ready/);
    assert.notEqual(f.a.raw("board", "merging", "patternode/patternode-platform#11", "--as", "m1").status, 0, "cannot merge ahead of what it follows");
    f.a.run("board", "merging", "patternode/patternode-platform#10", "--as", "m1");
    f.a.run("board", "merged", "patternode/patternode-platform#10", "squash abc123, nothing deployed", "--as", "m1");
    q = f.a.run("board", "queue", "--as", "m1");
    assert.match(q, /1\. patternode\/patternode-platform#11 · ready, next/);
    assert.doesNotMatch(f.a.run("board", "inbox", "--as", "m1"), /#10/, "the superseded note left the inbox");
    assert.match(f.b.run("board", "sent", "--as", "w1"), /superseded by p-[0-9a-z]+[\s\S]*done by m1 just now: squash abc123/);
  } finally {
    f.cleanup();
  }
});

test("an open call is a task in the tree: claimed as the thread, shown with its holder, closed when done", () => {
  const f = fixture();
  try {
    const parent = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "release 0.14"))[1];
    f.a.run("board", "start", "--as", "a1");
    const out = f.human.run("board", "post", "Fix the flaky test", "--to", "any", "--on", parent, "--kind", "instruction", "--as", "user");
    const id = postId(out);
    const task = /task (t-[0-9a-z]+) in the tree/.exec(out)[1];
    assert.match(f.a.run("tree"), new RegExp(`${task} Fix the flaky test \\[task\\]`));
    assert.match(f.a.run("board", "claim", id, "--as", "a1"), new RegExp(`a1 holds ${task}`));
    assert.match(f.a.run("tree"), new RegExp(`${task} Fix the flaky test \\[task\\] ⚑ a1`));
    f.a.run("board", "done", id, "fixed in #13", "--as", "a1");
    assert.match(f.a.run("show", task), /done.*fixed in #13/);
    assert.match(f.a.run("board", "locks"), /Nothing is claimed/);
  } finally {
    f.cleanup();
  }
});

test("an open call whose task thread is closed is finished: it leaves the board's status and prune archives it", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    const out = f.human.run("board", "post", "Tidy the README", "--to", "any", "--kind", "instruction", "--as", "user");
    const task = /task (t-[0-9a-z]+) in the tree/.exec(out)[1];
    assert.match(f.a.run("board", "status"), /Tidy the README/);
    f.a.run("done", task, "tidied by hand");
    assert.doesNotMatch(f.a.run("board", "status"), /Tidy the README/);
    assert.doesNotMatch(f.a.run("board", "next", "--list", "--as", "a1"), /Tidy the README/);
    assert.match(f.a.run("board", "prune", "--days", "0", "--dry-run"), /[1-9]\d* /);
  } finally {
    f.cleanup();
  }
});

test("closing a thread frees its claim", () => {
  const f = fixture();
  try {
    const t = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "wire it"))[1];
    f.a.run("board", "start", "--as", "a1");
    f.a.run("board", "claim", t, "--as", "a1");
    f.a.run("done", t, "wired in #20");
    assert.doesNotMatch(f.a.run("board", "locks"), /🔒/);
  } finally {
    f.cleanup();
  }
});

test("next ranks instructions, then tasks, then ideas; --claim takes the best task and the next agent gets the next one", () => {
  const f = fixture();
  try {
    const idea = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "maybe try X", "--kind", "idea"))[1];
    const plain = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "tidy the docs"))[1];
    f.a.run("board", "start", "--as", "a1");
    f.b.run("board", "start", "--as", "b1");
    const task = /task (t-[0-9a-z]+)/.exec(f.human.run("board", "post", "Ship the queue", "--to", "any", "--kind", "instruction", "--as", "user"))[1];
    const list = f.human.run("board", "next", "--list");
    assert.ok(list.indexOf(task) < list.indexOf(plain) && list.indexOf(plain) < list.indexOf(idea), list);
    const direct = postId(f.human.run("board", "post", "Answer me first", "--to", "a1", "--kind", "instruction", "--as", "user"));
    assert.match(f.a.run("board", "next", "--claim", "--as", "a1"), new RegExp(`First, the instruction for you: ${direct}`));
    f.a.run("board", "accept", direct, "--as", "a1");
    assert.match(f.a.run("board", "next", "--claim", "--as", "a1"), new RegExp(`a1 took ${task}`));
    assert.match(f.b.run("board", "next", "--claim", "--as", "b1"), new RegExp(`b1 took ${plain}`));
  } finally {
    f.cleanup();
  }
});

test("a dump waits for a curator, who files it as a chore linked to an activity; the author sees where it went", () => {
  const f = fixture();
  try {
    const parent = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "trading ops"))[1];
    f.a.run("board", "start", "--as", "cur", "--role", "curator:patternode");
    const id = /📥 (p-[0-9a-z]+)/.exec(f.human.run("board", "dump", "the dashboard times out after the deploy, look at it sometime"))[1];
    assert.match(f.a.run("board", "inbox", "--as", "cur"), new RegExp(id));
    assert.match(f.a.run("board", "triage", "--as", "cur"), new RegExp(`${id}[\\s\\S]*1 to file`));
    // An epic on its own cannot hold a chore.
    assert.notEqual(f.a.raw("board", "file", id, "--is", "chore", "--plan", "WI-012", "--as", "cur").status, 0);
    const out = f.a.run("board", "file", id, "--is", "chore", "--under", parent, "--plan", "WI-012-A3", "--title", "Dashboard times out after deploy", "--as", "cur");
    const chore = /→ chore (t-[0-9a-z]+)/.exec(out)[1];
    assert.match(f.a.run("tree"), new RegExp(`${chore} Dashboard times out after deploy \\[chore\\] → WI-012-A3`));
    assert.match(f.a.run("show", chore), new RegExp(`From board ${id}, user`));
    assert.match(f.a.run("board", "triage", "--as", "cur"), /Nothing to file/);
    assert.match(f.human.run("board", "sent", "--as", "user"), new RegExp(`filed by cur .* as chore ${chore} → WI-012-A3`));
  } finally {
    f.cleanup();
  }
});

test("the curator asks the author when a dump is unclear, and the answer comes back to it", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "cur", "--role", "curator");
    f.b.run("board", "start", "--as", "w1");
    const id = /📥 (p-[0-9a-z]+)/.exec(f.b.run("board", "dump", "fix the thing from yesterday", "--as", "w1"))[1];
    f.a.run("board", "ask", id, "Which thing: the retry bug or the timeout?", "--as", "cur");
    const q = /(p-[0-9a-z]+) · question/.exec(f.b.run("board", "inbox", "--as", "w1"))[1];
    f.b.run("board", "reply", q, "The timeout.", "--as", "w1");
    assert.match(f.a.run("board", "inbox", "--as", "cur"), /The timeout/);
    assert.match(f.a.run("board", "triage", "--as", "cur"), /↳ question from cur[\s\S]*↳ answer from w1 .*The timeout/);
  } finally {
    f.cleanup();
  }
});

test("a dump can be piped in, and a bare Markdown file is a dump", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "cur", "--role", "curator");
    const r = spawnSync(process.execPath, [SCRIPT, "board", "dump", "-"], { cwd: f.root, env: { ...process.env, THREADS_HOME: f.human.store, THREADS_REMOTE: f.remote, BOARD_AS: "", GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" }, input: "line one of a long paste\nline two\n", encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    const dir = path.join(f.human.store, "board", "by-hand");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "20261011T090000Z-note.md"), "Book the flights before Friday.\n");
    execFileSync("git", ["-C", f.human.store, "add", "-A"]);
    execFileSync("git", ["-C", f.human.store, "commit", "-qm", "by hand"], { env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
    execFileSync("git", ["-C", f.human.store, "push", "-q", "origin", "HEAD:main"]);
    const t = f.a.run("board", "triage", "--as", "cur");
    assert.match(t, /line one of a long paste\n\s+line two/);
    assert.match(t, /Book the flights before Friday/);
  } finally {
    f.cleanup();
  }
});

test("tidy lists unlinked chores and work held by agents that have gone", () => {
  const f = fixture();
  try {
    const chore = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "rotate the logs", "--kind", "chore"))[1];
    const linked = /🧵 (t-[0-9a-z]+)/.exec(f.a.run("open", "rename the job", "--kind", "chore", "--link", "WI-012-A3-T1"))[1];
    // A claim from an agent whose session was lost: it never said hello, so it is not on the board.
    const dir = path.join(f.a.store, "board", "2026-10-11");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "20261011T100000Z-x-aaaaaa.json"), JSON.stringify({ ts: new Date().toISOString(), host: "x", type: "claim", from: "ghost", key: linked, until: new Date(Date.now() + 3600e3).toISOString() }));
    execFileSync("git", ["-C", f.a.store, "add", "-A"]);
    execFileSync("git", ["-C", f.a.store, "commit", "-qm", "ghost"], { env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
    const tidy = f.a.run("board", "tidy");
    assert.match(tidy, new RegExp(`not linked to the plan \\(1\\):\\n  ${chore}`));
    assert.match(tidy, new RegExp(`no longer on the board \\(1\\):\\n  ${linked} · ghost`));
  } finally {
    f.cleanup();
  }
});

test("--role given more than once takes every role named, as a comma list does", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "m1", "--role", "master:board-trial", "--role", "curator:trial", "--role", "dispatcher:trial");
    const roles = f.a.run("board", "roles");
    for (const r of ["master:board-trial", "curator:trial", "dispatcher:trial"]) assert.match(roles, new RegExp(`${r} · m1`));
  } finally {
    f.cleanup();
  }
});

test("status shows only the merge queues whose ready notes were posted in its scope", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "m1", "--source", "trial", "--role", "master:board-trial");
    f.b.run("board", "start", "--as", "w1", "--source", "personal");
    f.b.run("board", "ready", "dermot-obrien/me#7", "a draft email", "--to", "master:me", "--as", "w1");
    f.a.run("board", "ready", "dermot-obrien/ai-assisted-work#70", "a fact sheet", "--to", "master:board-trial", "--as", "m1");
    const trial = f.a.run("board", "status", "--source", "trial");
    assert.match(trial, /Merge queue for master:board-trial/);
    assert.doesNotMatch(trial, /master:me/, "a queue from personal stays out of trial");
    const json = JSON.parse(f.a.run("board", "status", "--source", "trial", "--json"));
    assert.deepEqual(json.queue.map((e) => e.ref), ["dermot-obrien/ai-assisted-work#70"]);
    assert.match(f.a.run("board", "status", "--source", "all"), /master:me/, "every source shows every queue");
  } finally {
    f.cleanup();
  }
});

test("open calls are taken in the order they were posted", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    const first = /task (t-[0-9a-z]+)/.exec(f.human.run("board", "post", "First job", "--to", "any", "--as", "user"))[1];
    const second = /task (t-[0-9a-z]+)/.exec(f.human.run("board", "post", "Second job", "--to", "any", "--as", "user"))[1];
    const list = f.human.run("board", "next", "--list");
    assert.ok(list.indexOf(first) < list.indexOf(second), list);
    assert.match(f.a.run("board", "next", "--claim", "--as", "a1"), new RegExp(`a1 took ${first}`));
  } finally {
    f.cleanup();
  }
});

test("done takes the task thread of an open call as well as the post", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    const out = f.human.run("board", "post", "Write the sheet", "--to", "any", "--as", "user");
    const task = /task (t-[0-9a-z]+)/.exec(out)[1];
    f.a.run("board", "next", "--claim", "--as", "a1");
    assert.match(f.a.run("board", "done", task, "sheet written", "--as", "a1"), new RegExp(`${postId(out)} done: sheet written`));
    assert.match(f.a.run("show", task), /done/);
    assert.match(f.a.raw("board", "done", "t-zzz", "x", "--as", "a1").stderr, /no open call made that thread/);
  } finally {
    f.cleanup();
  }
});

test("a standing order is acknowledged, never accepted or done", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    const order = postId(f.human.run("board", "post", "Titles start with trial:", "--to", "*", "--kind", "standing", "--as", "user"));
    const r = f.a.raw("board", "done", order, "ok", "--as", "a1");
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /standing order/);
    f.a.run("board", "ack", order, "--as", "a1");
    assert.doesNotMatch(f.a.run("board", "inbox", "--as", "a1"), new RegExp(order));
  } finally {
    f.cleanup();
  }
});

test("replying to a question answers it: it leaves the inbox and stops waiting", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "a1");
    const q = postId(f.human.run("board", "post", "Does it read AGENTS.md?", "--to", "a1", "--kind", "question", "--as", "user"));
    f.a.run("board", "reply", q, "Yes, at the root", "--as", "a1");
    assert.doesNotMatch(f.a.run("board", "inbox", "--as", "a1"), new RegExp(q));
    assert.doesNotMatch(f.human.run("board", "status"), new RegExp(`${q} · question`));
  } finally {
    f.cleanup();
  }
});

test("start says when this workspace already has a handle on the board", () => {
  const f = fixture();
  try {
    const first = /📋 ([a-z]+-[0-9a-z]{3})/.exec(f.a.run("board", "start", "--tool", "claude-code"))[1];
    const again = f.a.run("board", "start", "--tool", "claude-code");
    assert.match(again, new RegExp(`Already on the board from this workspace: ${first}`));
    assert.doesNotMatch(f.a.run("board", "start", "--as", first, "--tool", "claude-code"), /Already on the board/, "coming back with --as is not a twin");
  } finally {
    f.cleanup();
  }
});

test("work an agent left (its claim lapsed) is taken before fresh work, with its notes", () => {
  const f = fixture();
  try {
    f.a.run("board", "start", "--as", "dead");
    f.b.run("board", "start", "--as", "next1");
    const first = /task (t-[0-9a-z]+)/.exec(f.human.run("board", "post", "Fresh job", "--to", "any", "--as", "user"))[1];
    const second = /task (t-[0-9a-z]+)/.exec(f.human.run("board", "post", "Job that will be left", "--to", "any", "--as", "user"))[1];
    f.a.run("board", "claim", second, "--for", "0.001m", "--as", "dead");
    f.a.run("note", second, "STOPPED HERE: two sections written");
    assert.match(f.b.run("board", "next", "--claim", "--as", "next1"), new RegExp(`next1 took ${second}`));
    assert.match(f.b.run("show", second), /STOPPED HERE/);
    assert.ok(first);
  } finally {
    f.cleanup();
  }
});
