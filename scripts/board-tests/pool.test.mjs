#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

// thread board pool: agents started from pool.json when tasks are free, within each platform's room.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fixture } from "./fixture.mjs";

const GIT_ENV = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };

/** Put pool.json at the root of the store and push it, as a person would. */
function setPool(f, pool) {
  writeFileSync(path.join(f.a.store, "pool.json"), JSON.stringify(pool, null, 2));
  execFileSync("git", ["-C", f.a.store, "add", "pool.json"]);
  execFileSync("git", ["-C", f.a.store, "commit", "-qm", "pool"], { env: GIT_ENV });
  execFileSync("git", ["-C", f.a.store, "push", "-q", "origin", "HEAD:main"]);
}

/** A command starter that records each prompt it is given in a file, one per line. */
const recorder = (file, fail = false) => [process.execPath, "-e", `require('fs').appendFileSync(${JSON.stringify(file)}, process.argv[1] + '\\n'); process.exit(${fail ? 1 : 0})`, "{prompt} @ {repo} {branch}"];
const lines = (file) => (existsSync(file) ? readFileSync(file, "utf8").trim().split("\n").filter(Boolean) : []);

function tasks(f, n) {
  for (let i = 0; i < n; i++) f.human.run("board", "post", `Task ${i + 1}`, "--to", "any", "--kind", "instruction", "--as", "user");
}

test("tick starts one agent per free task, in platform order, up to each platform's max", () => {
  const f = fixture();
  try {
    const one = path.join(f.root, "one.log");
    const two = path.join(f.root, "two.log");
    setPool(f, { repo: "o/r", branch: "sandbox", platforms: [
      { name: "first", starter: "command", max: 2, run: recorder(one) },
      { name: "second", starter: "command", max: 5, run: recorder(two) },
    ] });
    tasks(f, 3);
    f.a.run("board", "start", "--as", "disp");
    const out = f.a.run("board", "pool", "tick", "--as", "disp");
    assert.match(out, /▶ first started/);
    assert.equal(lines(one).length, 2);
    assert.equal(lines(two).length, 1);
    assert.match(lines(one)[0], /^Go pick up work in default\. Work from branch sandbox .* @ o\/r sandbox$/);
    // Those three are starting: a second tick starts nobody for the same tasks.
    assert.match(f.a.run("board", "pool", "tick", "--as", "disp"), /Nothing to start: 3 free task\(s\), 3 agent\(s\) starting/);
    const status = JSON.parse(f.b.run("board", "pool", "--json"));
    assert.deepEqual(status.platforms.map((p) => [p.name, p.pending, p.room]), [["first", 2, 0], ["second", 1, 4]]);
  } finally {
    f.cleanup();
  }
});

test("an agent that joins counts as its platform's start, and one holding a task counts as working", () => {
  const f = fixture();
  try {
    const log = path.join(f.root, "p.log");
    setPool(f, { repo: "o/r", branch: "b", platforms: [{ name: "cursor", starter: "command", max: 1, run: recorder(log) }] });
    tasks(f, 2);
    f.a.run("board", "start", "--as", "disp");
    f.a.run("board", "pool", "tick", "--as", "disp");
    f.b.run("board", "start", "--as", "cursor-1", "--tool", "cursor");
    f.b.run("board", "next", "--claim", "--as", "cursor-1");
    const [p] = JSON.parse(f.a.run("board", "pool", "--json")).platforms;
    assert.equal(p.pending, 0);
    assert.equal(p.working, 1);
    assert.equal(p.room, 0);
    // One task is still free, but the only platform is full.
    assert.match(f.a.run("board", "pool", "tick", "--as", "disp"), /1 task\(s\) still waiting: no platform has room/);
    assert.equal(lines(log).length, 1);
  } finally {
    f.cleanup();
  }
});

test("a limited platform is skipped until its limit ends, and a failed start moves on to the next platform", () => {
  const f = fixture();
  try {
    const bad = path.join(f.root, "bad.log");
    const good = path.join(f.root, "good.log");
    setPool(f, { repo: "o/r", branch: "b", platforms: [
      { name: "limited", starter: "command", max: 3, run: recorder(path.join(f.root, "never.log")) },
      { name: "broken", starter: "command", max: 3, run: recorder(bad, true) },
      { name: "good", starter: "command", max: 3, run: recorder(good) },
    ] });
    tasks(f, 2);
    f.a.run("board", "start", "--as", "disp");
    assert.match(f.a.run("board", "pool", "limit", "limited", "--for", "2h", "quota", "--as", "disp"), /no starts/);
    const out = f.a.run("board", "pool", "tick", "--as", "disp");
    assert.match(out, /✗ broken: .* exited 1/);
    assert.equal(lines(path.join(f.root, "never.log")).length, 0);
    assert.equal(lines(bad).length, 1);
    assert.equal(lines(good).length, 2);
    const status = JSON.parse(f.b.run("board", "pool", "--json")).platforms;
    assert.ok(status.find((p) => p.name === "limited").limitedUntil);
    assert.equal(status.find((p) => p.name === "broken").pending, 0); // a failed start is not waited for
  } finally {
    f.cleanup();
  }
});

test("an ask platform tells the dispatcher what to start, and dry-run starts nothing", () => {
  const f = fixture();
  try {
    setPool(f, { repo: "o/r", branch: "b", prompt: "Go pick up work in {source} on {branch}.", platforms: [{ name: "claude", starter: "ask", max: 1 }] });
    tasks(f, 1);
    f.a.run("board", "start", "--as", "disp");
    assert.match(f.a.run("board", "pool", "tick", "--dry-run", "--as", "disp"), /would start claude \(ask\) on o\/r@b: Go pick up work in default on b\./);
    assert.equal(JSON.parse(f.a.run("board", "pool", "--json")).platforms[0].pending, 0);
    assert.match(f.a.run("board", "pool", "tick", "--as", "disp"), /➜ claude: start it with your own tools, on o\/r branch b/);
    assert.equal(JSON.parse(f.a.run("board", "pool", "--json")).platforms[0].pending, 1);
  } finally {
    f.cleanup();
  }
});

test("a pool.json with a mistake is refused with what is wrong", () => {
  const f = fixture();
  try {
    setPool(f, { repo: "o/r", branch: "b", platforms: [{ name: "x", starter: "cursor" }, { name: "y", starter: "teleport" }] });
    const r = f.a.raw("board", "pool");
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /x: name the environment variable holding its API key/);
    assert.match(r.stderr + r.stdout, /y: starter is one of/);
  } finally {
    f.cleanup();
  }
});

test("the cursor and jules starters send the prompt, repository and branch with the key from the environment", async () => {
  // The fixture copies the environment when it is made, so the keys go in first.
  process.env.T_CURSOR = "ck";
  process.env.T_JULES = "jk";
  const f = fixture();
  const seen = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      seen.push({ url: req.url, headers: req.headers, body: JSON.parse(body) });
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(req.url === "/cursor" ? { id: "bc-1", target: { url: "https://cursor.example/bc-1" } } : { name: "sessions/9", id: "9" }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    setPool(f, { repo: "o/r", branch: "b", platforms: [
      { name: "cursor", starter: "cursor", max: 1, key: "T_CURSOR", url: `${base}/cursor` },
      { name: "jules", starter: "jules", max: 1, key: "T_JULES", url: `${base}/jules` },
    ] });
    tasks(f, 2);
    f.a.run("board", "start", "--as", "disp");
    // The server runs in this process, so the command runs alongside it rather than blocking it.
    const r = await f.a.later("board", "pool", "tick", "--as", "disp");
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /▶ cursor started · bc-1 · https:\/\/cursor\.example\/bc-1/);
    assert.match(r.out, /▶ jules started · 9/);
    const c = seen.find((s) => s.url === "/cursor");
    assert.equal(c.headers.authorization, `Basic ${Buffer.from("ck:").toString("base64")}`);
    assert.deepEqual(c.body.source, { repository: "https://github.com/o/r", ref: "b" });
    assert.match(c.body.prompt.text, /Go pick up work in default/);
    const j = seen.find((s) => s.url === "/jules");
    assert.equal(j.headers["x-goog-api-key"], "jk");
    assert.deepEqual(j.body.sourceContext, { source: "sources/github/o/r", githubRepoContext: { startingBranch: "b" } });
    assert.equal(j.body.automationMode, "AUTO_CREATE_PR");
  } finally {
    delete process.env.T_CURSOR;
    delete process.env.T_JULES;
    server.close();
    f.cleanup();
  }
});
