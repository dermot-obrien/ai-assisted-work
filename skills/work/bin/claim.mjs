#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * Activity claims held as branches on a shared git remote, for workers in separate checkouts
 * (coordination: github in .aaw-config.yaml). See references/github.md.
 *
 * A lock file in locks/ only excludes workers that share one filesystem. Workers in separate
 * clones, worktrees or cloud sessions share only the remote, and the one atomic operation it
 * offers is a ref update that states the value it expects to replace. So a claim is the
 * creation of the branch wi/<activity-id> with a commit nobody else could have made, pushed
 * with --force-with-lease=<ref>: (the ref must not exist). Exactly one of several racing
 * workers succeeds; the server refuses the rest.
 *
 *   claim.mjs claim    <WI-NNN-AN> [--base <branch>] [--worker <id>] [--human] [--lease <min>] [--checkout]
 *   claim.mjs list     [<WI-NNN>]
 *   claim.mjs takeover <WI-NNN-AN> [--worker <id>] [--checkout]     an expired claim only
 *   claim.mjs release  <WI-NNN-AN> [--worker <id>]                  deletes the claim branch
 *
 * Common options: --remote <name> (default coordination_remote, then origin), --json.
 * Exit 0: done. Exit 3: held by another worker, still live, or lost a race; pick other work.
 * Exit 1: a problem (no remote, git failed). Exit 2: usage. Needs git and Node.js 18+.
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const USAGE = `usage:
  claim.mjs claim    <WI-NNN-AN> [--base <branch>] [--worker <id>] [--human] [--lease <minutes>] [--checkout]
  claim.mjs list     [<WI-NNN>]
  claim.mjs takeover <WI-NNN-AN> [--worker <id>] [--checkout]
  claim.mjs release  <WI-NNN-AN> [--worker <id>]
options: --remote <name>  --json`;

const PREFIX = "wi/";
const ACTIVITY = /^WI-\d{3,}-A\d+$/;
const WORK_ITEM = /^WI-\d{3,}$/;

function fail(code, message) {
  if (message) console.error(message);
  process.exit(code);
}

// ---------- arguments ----------

const argv = process.argv.slice(2);
if (argv.length === 0 || ["-h", "--help"].includes(argv[0])) {
  console.log(USAGE);
  process.exit(argv.length === 0 ? 2 : 0);
}
const command = argv[0];
const opts = { flags: new Set(), values: {}, positional: [] };
const VALUED = new Set(["--base", "--worker", "--lease", "--remote"]);
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (VALUED.has(a)) {
    if (i + 1 >= argv.length) fail(2, `${a} needs a value\n${USAGE}`);
    opts.values[a.slice(2)] = argv[++i];
  } else if (a.startsWith("--")) opts.flags.add(a.slice(2));
  else opts.positional.push(a);
}
const json = opts.flags.has("json");
if (!["claim", "list", "takeover", "release"].includes(command)) fail(2, `unknown command ${command}\n${USAGE}`);

// ---------- configuration ----------

function topLevel(text) {
  const out = {};
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*?)\s*$/.exec(line);
    if (!m || m[2] === "") continue;
    let v = m[2];
    if (v[0] === '"' || v[0] === "'") {
      const end = v.indexOf(v[0], 1);
      v = end > 0 ? v.slice(1, end) : v.slice(1);
    } else v = v.replace(/\s+#.*$/, "");
    out[m[1]] = v === "null" || v === "~" ? null : v;
  }
  return out;
}

function git(args, { allowFail = false, env } = {}) {
  const r = spawnSync("git", args, { encoding: "utf8", env: env ? { ...process.env, ...env } : process.env });
  if (r.error) fail(1, `git could not be run: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) fail(1, `git ${args.join(" ")} failed:\n${(r.stderr || r.stdout).trim()}`);
  return { status: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

const top = git(["rev-parse", "--show-toplevel"], { allowFail: true });
if (top.status !== 0) fail(1, "not inside a git repository: run from a checkout of the workspace");
const cfgFile = path.join(process.cwd(), ".aaw-config.yaml");
const cfgFallback = path.join(top.out, ".aaw-config.yaml");
const cfgPath = existsSync(cfgFile) ? cfgFile : existsSync(cfgFallback) ? cfgFallback : null;
const cfg = cfgPath ? topLevel(readFileSync(cfgPath, "utf8")) : {};
const remote = opts.values.remote || cfg.coordination_remote || "origin";
if (git(["remote", "get-url", remote], { allowFail: true }).status !== 0) {
  fail(1, `no git remote named ${remote}: claims live on the shared remote. Set coordination_remote or pass --remote.`);
}

// ---------- helpers ----------

const now = () => Date.now();
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const minutes = (ms) => Math.round(ms / 60000);

function remoteSha(ref) {
  const r = git(["ls-remote", remote, `refs/heads/${ref}`]);
  const line = r.out.split("\n").find((l) => l.endsWith(`\trefs/heads/${ref}`));
  return line ? line.split("\t")[0] : null;
}

function defaultBase() {
  if (cfg.base_branch) return cfg.base_branch;
  const r = git(["ls-remote", "--symref", remote, "HEAD"], { allowFail: true });
  const m = /^ref: refs\/heads\/(\S+)\s+HEAD/m.exec(r.out);
  return m ? m[1] : "main";
}

function fetchRef(ref) {
  git(["fetch", "--quiet", "--no-tags", remote, `+refs/heads/${ref}:refs/remotes/${remote}/${ref}`]);
}

function trailers(body) {
  const t = {};
  for (const line of body.split("\n")) {
    const m = /^(Work-[A-Za-z-]+):\s*(.*)$/.exec(line.trim());
    if (m) t[m[1]] = m[2];
  }
  return t;
}

/** What a claim branch says about its holder, read from its commits. */
function readClaim(activity, sha) {
  const log = git(["log", "-n", "500", "--format=%H%x1f%ct%x1f%B%x1e", sha]).out;
  const commits = log.split("\x1e").map((s) => s.trim()).filter(Boolean).map((s) => {
    const [h, ct, body] = s.split("\x1f");
    return { sha: h, time: Number(ct) * 1000, trailers: trailers(body || "") };
  });
  const head = commits[0];
  const claim = commits.find((c) => c.trailers["Work-Claim"] === activity);
  const type = claim?.trailers["Work-Holder-Type"] || "agent";
  const lease = Number(claim?.trailers["Work-Lease-Minutes"] ?? (type === "human" ? 480 : 60));
  const lastActivity = head.time;
  const expires = lastActivity + lease * 60000;
  return {
    activity,
    branch: PREFIX + activity,
    sha,
    holder: claim?.trailers["Work-Holder"] || null,
    holder_type: type,
    acquired: claim ? iso(claim.time) : null,
    last_commit: iso(lastActivity),
    lease_minutes: lease,
    expires: iso(expires),
    expired: expires <= now(),
  };
}

function identityEnv(worker) {
  const email = git(["config", "user.email"], { allowFail: true }).out;
  const name = git(["config", "user.name"], { allowFail: true }).out;
  if (email && name) return undefined;
  return {
    GIT_AUTHOR_NAME: name || worker,
    GIT_AUTHOR_EMAIL: email || `${worker}@work.invalid`,
    GIT_COMMITTER_NAME: name || worker,
    GIT_COMMITTER_EMAIL: email || `${worker}@work.invalid`,
  };
}

/** A commit only this worker could have made: unique even when two workers start from one tip. */
function claimCommit(activity, parent, worker, type, lease, extra = []) {
  const message = [
    `chore(${activity}): claim`,
    "",
    `Work-Claim: ${activity}`,
    `Work-Holder: ${worker}`,
    `Work-Holder-Type: ${type}`,
    `Work-Lease-Minutes: ${lease}`,
    `Work-Nonce: ${randomBytes(8).toString("hex")}`,
    ...extra,
  ].join("\n");
  return git(["commit-tree", `${parent}^{tree}`, "-p", parent, "-m", message], { env: identityEnv(worker) }).out;
}

/** Push newSha to the branch only if the remote still holds `expected` (null: must not exist). */
function pushLeased(branch, newSha, expected) {
  const ref = `refs/heads/${branch}`;
  const spec = newSha ? `${newSha}:${ref}` : `:${ref}`;
  const r = git(["push", "--porcelain", `--force-with-lease=${ref}:${expected || ""}`, remote, spec], { allowFail: true });
  const line = r.out.split("\n").find((l) => l.includes(ref)) || "";
  // "=" is up to date: the remote already held exactly this commit. Only ours if we made it.
  const ok = r.status === 0 && !line.startsWith("!") && (!line.startsWith("=") || newSha === remoteSha(branch));
  return { ok, detail: (line || r.err || r.out).trim() };
}

function worker() {
  return opts.values.worker || process.env.WORK_WORKER_ID || `agent-${randomBytes(3).toString("hex")}`;
}

function checkout(branch, sha) {
  git(["update-ref", `refs/remotes/${remote}/${branch}`, sha]);
  git(["switch", "--quiet", "-C", branch, sha]);
  git(["branch", "--quiet", `--set-upstream-to=${remote}/${branch}`, branch]);
}

function report(result, text, code = 0) {
  if (json) console.log(JSON.stringify(result, null, 2));
  else console.log(text);
  process.exit(code);
}

function describeHeld(c) {
  const age = minutes(now() - Date.parse(c.last_commit));
  return `${c.activity} is held by ${c.holder || "an unknown worker"} (${c.holder_type}) on ${c.branch}: claimed ${c.acquired || "at an unknown time"}, last commit ${age} min ago, lease ${c.lease_minutes} min, ${c.expired ? "EXPIRED" : `live until ${c.expires}`}`;
}

function needActivity() {
  const id = opts.positional[0];
  if (!id || !ACTIVITY.test(id)) fail(2, `an activity id such as WI-012-A3 is needed\n${USAGE}`);
  return id;
}

// ---------- commands ----------

if (command === "claim") {
  const activity = needActivity();
  const branch = PREFIX + activity;
  const who = worker();
  const type = opts.flags.has("human") ? "human" : "agent";
  const lease = Number(opts.values.lease ?? (type === "human" ? 480 : 60));
  if (!Number.isFinite(lease) || lease < 0) fail(2, "--lease is a number of minutes");
  const base = opts.values.base || defaultBase();

  const existing = remoteSha(branch);
  if (existing) {
    fetchRef(branch);
    const c = readClaim(activity, existing);
    report({ claimed: false, reason: "held", ...c }, `not claimed: ${describeHeld(c)}`, 3);
  }
  const baseSha = remoteSha(base);
  if (!baseSha) fail(1, `the base branch ${base} is not on ${remote}. Push it first, or pass --base.`);
  fetchRef(base);
  const sha = claimCommit(activity, baseSha, who, type, lease, [`Work-Base: ${base}`]);
  const pushed = pushLeased(branch, sha, null);
  if (!pushed.ok) {
    const now2 = remoteSha(branch);
    if (now2) {
      fetchRef(branch);
      const c = readClaim(activity, now2);
      report({ claimed: false, reason: "lost_race", ...c }, `not claimed, another worker won the race: ${describeHeld(c)}`, 3);
    }
    fail(1, `the push to ${remote} failed: ${pushed.detail}`);
  }
  if (opts.flags.has("checkout")) checkout(branch, sha);
  const result = { claimed: true, activity, branch, sha, base, holder: who, holder_type: type, lease_minutes: lease, acquired: iso(now()) };
  report(result, `claimed ${activity} on ${branch} (${sha.slice(0, 7)}) from ${base} for ${who}, lease ${lease} min, renewed by every commit you push${opts.flags.has("checkout") ? `\nchecked out ${branch}` : `\nnext: git fetch ${remote} ${branch} && git switch ${branch}`}`);
}

if (command === "list") {
  const wi = opts.positional[0];
  if (wi && !WORK_ITEM.test(wi)) fail(2, `a work item id such as WI-012 is expected\n${USAGE}`);
  const pattern = `refs/heads/${PREFIX}${wi ? `${wi}-A*` : "WI-*-A*"}`;
  const lines = git(["ls-remote", remote, pattern]).out.split("\n").filter(Boolean);
  const claims = [];
  for (const line of lines) {
    const [sha, ref] = line.split("\t");
    const branch = ref.replace(/^refs\/heads\//, "");
    const activity = branch.slice(PREFIX.length);
    if (!ACTIVITY.test(activity)) continue;
    fetchRef(branch);
    claims.push(readClaim(activity, sha));
  }
  claims.sort((a, b) => a.activity.localeCompare(b.activity, "en", { numeric: true }));
  if (json) report({ remote, now: iso(now()), claims }, "");
  if (claims.length === 0) report({}, `no claims${wi ? ` on ${wi}` : ""} on ${remote}`);
  report({}, [`claims on ${remote} at ${iso(now())}:`, ...claims.map((c) => `  ${describeHeld(c)}`)].join("\n"));
}

if (command === "takeover") {
  const activity = needActivity();
  const branch = PREFIX + activity;
  const who = worker();
  const observed = remoteSha(branch);
  if (!observed) fail(3, `${activity} has no claim on ${remote}: claim it instead of taking it over`);
  fetchRef(branch);
  const c = readClaim(activity, observed);
  if (!c.expired) report({ taken_over: false, reason: "live", ...c }, `not taken over: ${describeHeld(c)}`, 3);
  const type = opts.flags.has("human") ? "human" : "agent";
  const lease = Number(opts.values.lease ?? (type === "human" ? 480 : 60));
  // Built on the observed head, so the previous worker's commits are kept for the recovery.
  const sha = claimCommit(activity, observed, who, type, lease, [`Work-Takeover-From: ${c.holder || "unknown"}`]);
  const pushed = pushLeased(branch, sha, observed);
  if (!pushed.ok) {
    report({ taken_over: false, reason: "changed", activity }, `not taken over: ${branch} changed while you looked, so its worker is active. Pick other work.`, 3);
  }
  if (opts.flags.has("checkout")) checkout(branch, sha);
  report(
    { taken_over: true, activity, branch, sha, holder: who, previous: c },
    `took over ${activity} on ${branch} (${sha.slice(0, 7)}) from ${c.holder || "an unknown worker"}, whose lease expired ${c.expires}. Follow the recovery protocol: verify the completed tasks before resuming.`,
  );
}

if (command === "release") {
  const activity = needActivity();
  const branch = PREFIX + activity;
  const who = worker();
  const observed = remoteSha(branch);
  if (!observed) report({ released: false, reason: "absent", activity }, `${activity} has no claim on ${remote}; nothing to release`);
  fetchRef(branch);
  const c = readClaim(activity, observed);
  if (c.holder !== who && !c.expired) {
    report({ released: false, reason: "not_holder", ...c }, `not released: ${describeHeld(c)}. Only the holder releases a live claim.`, 3);
  }
  const pushed = pushLeased(branch, null, observed);
  if (!pushed.ok) report({ released: false, reason: "changed", activity }, `not released: ${branch} changed while you looked.`, 3);
  report({ released: true, activity, branch, sha: observed }, `released ${activity}: deleted ${branch} from ${remote} (it was at ${observed.slice(0, 7)})`);
}
