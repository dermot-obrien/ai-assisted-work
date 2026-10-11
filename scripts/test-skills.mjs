#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for bin/skills.mjs, the standalone skill installer. Each test builds a skill
 * repository, a bundle and a workspace under a temp folder. Needs git. node --test scripts/test-skills.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "bin", "skills.mjs");
const GIT_ENV = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t", SKILLS_BASE_URL: "" };

function skillFolder(dir, name, version, extra = "") {
  mkdirSync(path.join(dir, "bin"), { recursive: true });
  writeFileSync(path.join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: "A test skill."\nmetadata:\n  version: "${version}"\n${extra}---\n\n# ${name}\n`);
  writeFileSync(path.join(dir, "bin", "run.mjs"), `console.log("${name} ${version}")\n`);
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "skills-test-"));
  // A skill in a repository of its own, tagged v1.0.0 and then moved on to v1.1.0.
  const work = path.join(root, "src-thread");
  mkdirSync(work);
  execFileSync("git", ["init", "--quiet", "--initial-branch=main", work]);
  skillFolder(path.join(work, "skills", "thread"), "thread", "1.0.0");
  execFileSync("git", ["-C", work, "add", "-A"], { env: GIT_ENV });
  execFileSync("git", ["-C", work, "commit", "-qm", "v1"], { env: GIT_ENV });
  execFileSync("git", ["-C", work, "tag", "v1.0.0"], { env: GIT_ENV });
  skillFolder(path.join(work, "skills", "thread"), "thread", "1.1.0");
  execFileSync("git", ["-C", work, "commit", "-qam", "v1.1"], { env: GIT_ENV });
  execFileSync("git", ["-C", work, "tag", "v1.1.0"], { env: GIT_ENV });
  const remote = path.join(root, "thread.git");
  execFileSync("git", ["clone", "--quiet", "--bare", work, remote]);
  // A bundle: one skill sourced from that repository at v1.0.0, one kept in the bundle's own folder.
  const bundle = path.join(root, "bundle");
  skillFolder(path.join(bundle, "skills", "work"), "work", "3.0.0");
  writeFileSync(
    path.join(bundle, "bundle.json"),
    JSON.stringify({ name: "test-bundle", skills: [
      { name: "thread", path: "skills/thread", version: "1.0.0", source: { repo: remote, ref: "v1.0.0" } },
      { name: "work", path: "skills/work", version: "3.0.0" },
    ] }, null, 2),
  );
  const ws = path.join(root, "ws");
  mkdirSync(path.join(ws, ".claude"), { recursive: true });
  execFileSync("git", ["init", "--quiet", ws]);
  const run = (...args) => {
    const r = spawnSync(process.execPath, [SCRIPT, ...args, "--workspace", ws], { cwd: ws, env: GIT_ENV, encoding: "utf8" });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  const ok = (...args) => {
    const r = run(...args);
    if (r.status !== 0) throw new Error(`skills ${args.join(" ")} exited ${r.status}:\n${r.out}`);
    return r.out;
  };
  return { root, remote, bundle, ws, run, ok, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("installs a bundle: a sourced skill at its ref and a skill from the bundle's folder, with a lock file", () => {
  const f = fixture();
  try {
    const out = f.ok("install", "--bundle", f.bundle);
    assert.match(out, /installed thread 1\.0\.0/);
    assert.match(out, /installed work 3\.0\.0/);
    assert.match(readFileSync(path.join(f.ws, ".agents", "skills", "thread", "SKILL.md"), "utf8"), /version: "1\.0\.0"/);
    assert.ok(lstatSync(path.join(f.ws, ".claude", "skills", "thread")).isSymbolicLink());
    const lock = JSON.parse(readFileSync(path.join(f.ws, ".agents", "skills.lock.json"), "utf8"));
    assert.equal(lock.skills.thread.ref, "v1.0.0");
    assert.match(lock.skills.thread.commit, /^[0-9a-f]{40}$/);
    assert.equal(lock.skills.work.source, "bundle");
    assert.match(f.ok("check"), /✓ thread 1\.0\.0[\s\S]*✓ work 3\.0\.0/);
  } finally {
    f.cleanup();
  }
});

test("installs one skill at a time, and only the ones named", () => {
  const f = fixture();
  try {
    f.ok("install", "work", "--bundle", f.bundle);
    assert.ok(existsSync(path.join(f.ws, ".agents", "skills", "work")));
    assert.ok(!existsSync(path.join(f.ws, ".agents", "skills", "thread")));
    f.ok("install", "--repo", f.remote, "--ref", "v1.1.0", "--name", "thread");
    assert.match(readFileSync(path.join(f.ws, ".agents", "skills", "thread", "SKILL.md"), "utf8"), /1\.1\.0/);
  } finally {
    f.cleanup();
  }
});

test("check notices a changed or missing skill, and install puts it back", () => {
  const f = fixture();
  try {
    f.ok("install", "--bundle", f.bundle);
    writeFileSync(path.join(f.ws, ".agents", "skills", "work", "SKILL.md"), "edited by hand\n");
    rmSync(path.join(f.ws, ".agents", "skills", "thread"), { recursive: true });
    const r = f.run("check");
    assert.equal(r.status, 1);
    assert.match(r.out, /✗ thread: missing/);
    assert.match(r.out, /✗ work: changed/);
    f.ok("install", "--bundle", f.bundle);
    assert.equal(f.run("check").status, 0);
  } finally {
    f.cleanup();
  }
});

test("a constrained environment: --from installs from copies on the machine with no network", () => {
  const f = fixture();
  try {
    const offline = path.join(f.root, "usb");
    execFileSync("git", ["clone", "--quiet", "--branch", "v1.0.0", f.remote, path.join(offline, "thread")]);
    cpSync(path.join(f.bundle, "skills", "work"), path.join(offline, "work"), { recursive: true });
    rmSync(f.remote, { recursive: true, force: true }); // the source is gone: nothing may reach for it
    const out = f.ok("install", "--bundle", f.bundle, "--from", offline);
    assert.match(out, /installed thread 1\.0\.0 from folder/);
    assert.match(out, /installed work 3\.0\.0 from folder/);
    assert.ok(!existsSync(path.join(f.ws, ".agents", "skills", "thread", ".git")));
  } finally {
    f.cleanup();
  }
});

test("SKILLS_BASE_URL sends clones to a mirror", () => {
  const f = fixture();
  try {
    const mirror = path.join(f.root, "mirror");
    mkdirSync(mirror);
    execFileSync("git", ["clone", "--quiet", "--bare", f.remote, path.join(mirror, "thread.git")]);
    const bundleFile = path.join(f.bundle, "bundle.json");
    const b = JSON.parse(readFileSync(bundleFile, "utf8"));
    b.skills[0].source.repo = "https://github.com/someone/thread.git";
    writeFileSync(bundleFile, JSON.stringify(b));
    const r = spawnSync(process.execPath, [SCRIPT, "install", "thread", "--bundle", f.bundle, "--workspace", f.ws], { env: { ...GIT_ENV, SKILLS_BASE_URL: mirror }, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /installed thread 1\.0\.0/);
  } finally {
    f.cleanup();
  }
});

test("a skill that still names a requirement is reported, never pulled in", () => {
  const f = fixture();
  try {
    skillFolder(path.join(f.bundle, "skills", "work"), "work", "3.0.0", '  x-skill-requires: "thread"\n');
    const out = f.ok("install", "work", "--bundle", f.bundle);
    assert.match(out, /note: work says it needs thread, which is not installed/);
    assert.ok(!existsSync(path.join(f.ws, ".agents", "skills", "thread")));
  } finally {
    f.cleanup();
  }
});

test("requirements in purl form are read by skill name: met ones are quiet, missing ones reported", () => {
  const f = fixture();
  try {
    skillFolder(path.join(f.bundle, "skills", "work"), "work", "3.0.0", '  x-skill-requires: "pkg:generic/someone/thread-repo/thread ^1.0.0, pkg:generic/someone/x/absent ^2.0.0"\n');
    const out = f.ok("install", "--bundle", f.bundle);
    assert.match(out, /note: work says it needs absent, which is not installed/);
    assert.doesNotMatch(out, /needs thread/);
  } finally {
    f.cleanup();
  }
});

test("remove takes a skill out of both folders and the lock", () => {
  const f = fixture();
  try {
    f.ok("install", "--bundle", f.bundle);
    f.ok("remove", "thread");
    assert.ok(!existsSync(path.join(f.ws, ".agents", "skills", "thread")));
    assert.ok(!existsSync(path.join(f.ws, ".claude", "skills", "thread")));
    assert.ok(!JSON.parse(readFileSync(path.join(f.ws, ".agents", "skills.lock.json"), "utf8")).skills.thread);
  } finally {
    f.cleanup();
  }
});
