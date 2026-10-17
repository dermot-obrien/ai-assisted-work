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

// The repository these tests run in must never be touched: drop variables that would point
// git at it whatever -C says (a platform's shell may set GIT_DIR).
for (const v of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_COMMON_DIR", "GIT_NAMESPACE", "GIT_PREFIX"]) delete process.env[v];

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

test("check ignores the packages and caches running a skill creates in its copy", () => {
  const f = fixture();
  try {
    f.ok("install", "--bundle", f.bundle);
    const work = path.join(f.ws, ".agents", "skills", "work");
    for (const d of ["node_modules/ajv", "__pycache__", "src/pkg/__pycache__", ".venv/bin"]) {
      mkdirSync(path.join(work, d), { recursive: true });
      writeFileSync(path.join(work, d, "x"), "made by running the skill\n");
    }
    assert.equal(f.run("check").status, 0, "a used skill is not a changed one");
    writeFileSync(path.join(work, "notes.md"), "a file the skill did not ship\n");
    assert.match(f.run("check").out, /✗ work: changed/);
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

/** The fixture's bundle as a repository of its own, so a workspace can declare it by URL. */
function bundleRepo(f) {
  execFileSync("git", ["init", "--quiet", "--initial-branch=main", f.bundle]);
  execFileSync("git", ["-C", f.bundle, "add", "-A"], { env: GIT_ENV });
  execFileSync("git", ["-C", f.bundle, "commit", "-qm", "bundle"], { env: GIT_ENV });
  const remote = path.join(f.root, "bundle.git");
  execFileSync("git", ["clone", "--quiet", "--bare", f.bundle, remote]);
  return remote;
}
const declare = (f, sources) => {
  mkdirSync(path.join(f.ws, ".agents"), { recursive: true });
  writeFileSync(path.join(f.ws, ".agents", "skills.json"), JSON.stringify({ sources }, null, 2));
};
const lockOf = (f) => JSON.parse(readFileSync(path.join(f.ws, ".agents", "skills.lock.json"), "utf8"));

test("sync installs what .agents/skills.json declares, from a bundle's repository and a skill's own", () => {
  const f = fixture();
  try {
    const bundle = bundleRepo(f);
    declare(f, [{ bundle, ref: "main", skills: ["work"] }, { repo: f.remote, ref: "v1.1.0", name: "thread" }]);
    const out = f.ok("sync");
    assert.match(out, /installed work 3\.0\.0/);
    assert.match(out, /installed thread 1\.1\.0/);
    const lock = lockOf(f);
    assert.equal(lock.skills.work.bundle, bundle);
    assert.match(lock.skills.work.commit, /^[0-9a-f]{40}$/);
    assert.equal(lock.skills.thread.ref, "v1.1.0");
    assert.match(f.ok("check"), /✓ thread 1\.1\.0[\s\S]*✓ work 3\.0\.0/);
  } finally {
    f.cleanup();
  }
});

test("sync removes a skill it installed once the declaration drops it, and never one it did not install", () => {
  const f = fixture();
  try {
    const bundle = bundleRepo(f);
    declare(f, [{ bundle, ref: "main" }]);
    f.ok("sync");
    mkdirSync(path.join(f.ws, ".agents", "skills", "my-own"), { recursive: true });
    writeFileSync(path.join(f.ws, ".agents", "skills", "my-own", "SKILL.md"), "x\n");
    declare(f, [{ bundle, ref: "main", skills: ["work"] }]);
    assert.match(f.ok("sync"), /removed thread: no longer in/);
    assert.ok(!existsSync(path.join(f.ws, ".agents", "skills", "thread")));
    assert.ok(!existsSync(path.join(f.ws, ".claude", "skills", "thread")));
    assert.ok(existsSync(path.join(f.ws, ".agents", "skills", "my-own", "SKILL.md")), "a skill the installer never put there is kept");
    assert.deepEqual(Object.keys(lockOf(f).skills), ["work"]);
  } finally {
    f.cleanup();
  }
});

test("sync --locked installs the locked commits after the sources have moved on", () => {
  const f = fixture();
  try {
    const bundle = bundleRepo(f);
    declare(f, [{ bundle, ref: "main", skills: ["work"] }, { repo: f.remote, ref: "main", name: "thread" }]);
    // thread's repository: main is v1.1.0 now. Lock it, then move both repositories on.
    execFileSync("git", ["-C", f.root, "clone", "--quiet", f.remote, "thread-work"]);
    const tw = path.join(f.root, "thread-work");
    execFileSync("git", ["-C", tw, "checkout", "--quiet", "-B", "main", "v1.1.0"], { env: GIT_ENV });
    execFileSync("git", ["-C", tw, "push", "--quiet", "--force", "origin", "main"], { env: GIT_ENV });
    f.ok("sync");
    const before = lockOf(f);
    skillFolder(path.join(tw, "skills", "thread"), "thread", "2.0.0");
    execFileSync("git", ["-C", tw, "commit", "-qam", "v2"], { env: GIT_ENV });
    execFileSync("git", ["-C", tw, "push", "--quiet", "origin", "main"], { env: GIT_ENV });
    skillFolder(path.join(f.bundle, "skills", "work"), "work", "4.0.0");
    execFileSync("git", ["-C", f.bundle, "commit", "-qam", "work 4"], { env: GIT_ENV });
    execFileSync("git", ["-C", f.bundle, "push", "--quiet", bundle, "main"], { env: GIT_ENV });
    rmSync(path.join(f.ws, ".agents", "skills"), { recursive: true, force: true });
    const out = f.ok("sync", "--locked");
    assert.match(out, /installed work 3\.0\.0/);
    assert.match(out, /installed thread 1\.1\.0/);
    assert.equal(lockOf(f).skills.thread.commit, before.skills.thread.commit);
    // Without --locked, sync moves to the refs' current commits.
    const moved = f.ok("sync");
    assert.match(moved, /installed work 4\.0\.0/);
    assert.match(moved, /installed thread 2\.0\.0/);
  } finally {
    f.cleanup();
  }
});

test("sync --locked with nothing locked yet stops and says to run sync", () => {
  const f = fixture();
  try {
    declare(f, [{ bundle: bundleRepo(f), ref: "main" }]);
    const r = f.run("sync", "--locked");
    assert.notEqual(r.status, 0);
    assert.match(r.out, /run skills sync first/);
  } finally {
    f.cleanup();
  }
});

test("sync --from installs a declared bundle from a folder on the machine, with no network", () => {
  const f = fixture();
  try {
    declare(f, [{ bundle: "https://example.invalid/you/bundle.git", ref: "main", skills: ["work"] }]);
    const from = path.join(f.root, "usb");
    mkdirSync(from);
    execFileSync("cp", ["-r", f.bundle, path.join(from, "bundle")]);
    assert.match(f.ok("sync", "--from", from), /installed work 3\.0\.0/);
  } finally {
    f.cleanup();
  }
});

test("sync installs a skill the workspace keeps in its own folder, also with --locked", () => {
  const f = fixture();
  try {
    skillFolder(path.join(f.ws, "skills", "briefing"), "briefing", "1.2.0");
    declare(f, [{ folder: "skills/briefing" }]);
    assert.match(f.ok("sync"), /installed briefing 1\.2\.0/);
    assert.equal(lockOf(f).skills.briefing.source, "workspace");
    assert.equal(lockOf(f).skills.briefing.commit, null, "a workspace skill records no commit, so the lock does not move with every commit");
    rmSync(path.join(f.ws, ".agents", "skills"), { recursive: true, force: true });
    assert.match(f.ok("sync", "--locked"), /installed briefing 1\.2\.0/);
    assert.match(f.ok("check"), /✓ briefing 1\.2\.0/);
  } finally {
    f.cleanup();
  }
});

test("with a mirror set, the lock records the declared repository, and sync --locked finds its pins", () => {
  const f = fixture();
  try {
    bundleRepo(f); // f.root/bundle.git is the mirror's copy of https://example.invalid/you/bundle.git
    declare(f, [{ bundle: "https://example.invalid/you/bundle.git", ref: "main", skills: ["work"] }]);
    const env = { ...GIT_ENV, SKILLS_BASE_URL: f.root };
    const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args, "--workspace", f.ws], { cwd: f.ws, env, encoding: "utf8" });
    let r = run("sync");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(lockOf(f).skills.work.bundle, "https://example.invalid/you/bundle.git");
    rmSync(path.join(f.ws, ".agents", "skills"), { recursive: true, force: true });
    r = run("sync", "--locked");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /installed work 3\.0\.0/);
  } finally {
    f.cleanup();
  }
});

test("sync --locked --from keeps the lock as it is, so the next locked sync still works", () => {
  const f = fixture();
  try {
    const bundle = bundleRepo(f);
    declare(f, [{ bundle, ref: "main", skills: ["work"] }]);
    f.ok("sync");
    const before = readFileSync(path.join(f.ws, ".agents", "skills.lock.json"), "utf8");
    const from = path.join(f.root, "usb");
    mkdirSync(from);
    execFileSync("cp", ["-r", f.bundle, path.join(from, "bundle")]);
    assert.match(f.ok("sync", "--locked", "--from", from), /keeping its locked source/);
    assert.equal(readFileSync(path.join(f.ws, ".agents", "skills.lock.json"), "utf8"), before, "the committed lock is unchanged");
    assert.match(f.ok("sync", "--locked"), /installed work 3\.0\.0/);
  } finally {
    f.cleanup();
  }
});
