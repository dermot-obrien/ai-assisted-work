#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Post-install check for the thread skill (DD-11).
 *
 * Run from the workspace root, with SKILL_DIR set to the installed skill's directory.
 * Checks what thread.mjs needs before its first write: Node.js 18 or newer, git on the
 * PATH, and either a store at $THREADS_HOME (default ~/.threads) that is a git clone, or
 * a remote to clone it from ($THREADS_REMOTE, or threads_remote: in .aaw-config.yaml).
 * A source chosen by $THREAD_SOURCE or threads_source: must be a valid name (DD-12).
 *
 * Exit 0: correct (warnings may be printed). Exit 1: problems, one line each.
 * Exit 2: usage or environment error. Offline and read-only: it never clones or fetches.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const major = Number(process.versions.node.split(".")[0]);
if (major < 18) {
  console.error(`Node.js ${process.versions.node} is too old: thread needs 18 or newer.`);
  process.exit(2);
}
if (["-h", "--help"].includes(process.argv[2]) && process.argv.length === 3) {
  console.log("usage: check.mjs   (run from the workspace root, with SKILL_DIR set; exit 0 ok, 1 problems, 2 usage or environment)");
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error("usage: check.mjs   (run from the workspace root; takes no arguments)");
  process.exit(2);
}

const problems = [];
const warnings = [];

try {
  execFileSync("git", ["--version"], { stdio: "ignore" });
} catch {
  problems.push("git: not found on the PATH. Install git; thread keeps its store in a git clone.");
}

/** A top-level key from the nearest .aaw-config.yaml at or above the working directory. */
function workspaceSetting(key) {
  let dir = process.cwd();
  for (;;) {
    const f = path.join(dir, ".aaw-config.yaml");
    if (existsSync(f)) {
      const m = new RegExp(`^${key}:[ \\t]*["']?([^"'#\\s]+)`, "m").exec(readFileSync(f, "utf8"));
      return m ? m[1] : null;
    }
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}
const workspaceRemote = () => workspaceSetting("threads_remote");

const home = process.env.THREADS_HOME || path.join(homedir(), ".threads");
const remote = process.env.THREADS_REMOTE || workspaceRemote();
if (existsSync(home)) {
  if (!statSync(home).isDirectory()) {
    problems.push(`${home}: the thread store is a file, not a folder. Move it aside, or set THREADS_HOME to another folder.`);
  } else if (!existsSync(path.join(home, ".git"))) {
    problems.push(
      `${home}: the thread store is not a git clone. Move it aside and let thread clone it, or set THREADS_HOME to a clone.`,
    );
  }
} else if (!remote) {
  problems.push(
    `${home}: no thread store yet, and no remote to clone one from. Set THREADS_REMOTE to a git URL, or add threads_remote: <git-url> to .aaw-config.yaml.`,
  );
} else {
  warnings.push(`${home}: no thread store yet; thread clones ${remote} on first use.`);
}

const source = process.env.THREAD_SOURCE || workspaceSetting("threads_source");
if (source && !/^[a-z0-9][a-z0-9-]*$/.test(source)) {
  problems.push(`threads_source "${source}": a source is one lowercase word or hyphenated words, such as image-and-video.`);
}

for (const w of warnings) console.log(`warning: ${w}`);
for (const p of problems) console.log(p);
if (problems.length === 0) console.log("thread: ok");
process.exit(problems.length ? 1 : 0);
