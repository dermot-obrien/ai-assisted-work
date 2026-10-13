#!/usr/bin/env node
/**
 * board-trial — run the cross-platform board trial (WI-002) from evidence in the store.
 *
 *   node scripts/board-trial.mjs check [--source trial] [--store <dir>] [--json]
 *
 * Grades the checklist in change/work-items/WI-002-cross-platform-agent-trial/scope.md for
 * every agent that joined the trial's scope, from the board and tree files alone, so a result
 * is what the agent left in the store and never what it says about itself. Checks that the
 * store cannot show (1 and 4, the skill found and the pointer enough; 9, waiting; 12, cost)
 * are left to the person running the trial and printed as such.
 *
 * Zero dependencies; Node 18+. Reads a clone of the store ($THREADS_HOME or ~/.threads, or
 * --store), pulling it first.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 ? fallback : argv[i + 1];
};
const cmd = argv[0];
if (cmd !== "check") {
  console.log("usage: node scripts/board-trial.mjs check [--source trial] [--store <dir>] [--json]");
  process.exit(cmd ? 1 : 0);
}

const SOURCE = flag("source", "trial");
const STORE = flag("store", process.env.THREADS_HOME || path.join(homedir(), ".threads"));
const ROOT = path.join(STORE, "sources", ...SOURCE.split("/"));
if (!existsSync(ROOT)) {
  console.error(`board-trial: no source ${SOURCE} in ${STORE}`);
  process.exit(1);
}
try {
  execFileSync("git", ["-C", STORE, "pull", "-q", "--rebase"], { stdio: "ignore" });
} catch {
  console.error("board-trial: could not pull the store; grading what is here");
}

/** Every JSON file under a folder, in the order git first recorded it (uncommitted last). */
function readAll(folder) {
  const dir = path.join(ROOT, folder);
  if (!existsSync(dir)) return [];
  const rel = path.relative(STORE, dir).split(path.sep).join("/");
  const order = new Map();
  const log = execFileSync("git", ["-C", STORE, "-c", "core.quotepath=off", "log", "--reverse", "--diff-filter=A", "--name-only", "--format=", "--", rel], { encoding: "utf8" });
  log.split("\n").filter(Boolean).forEach((f, i) => order.has(f) || order.set(f, i));
  const out = [];
  for (const day of readdirSync(dir)) {
    const d = path.join(dir, day);
    for (const f of readdirSync(d)) {
      if (!f.endsWith(".json")) continue;
      const r = `${rel}/${day}/${f}`;
      out.push({ ...JSON.parse(readFileSync(path.join(d, f), "utf8")), _order: order.get(r) ?? Infinity });
    }
  }
  return out.sort((a, b) => a._order - b._order || a.ts.localeCompare(b.ts));
}

const board = readAll("board");
const events = readAll("events").sort((a, b) => a.ts.localeCompare(b.ts));

// The tree, enough of it: each thread's kind, status and resolution.
const threads = new Map();
for (const e of events) {
  if (e.type === "open") threads.set(e.id, { id: e.id, text: e.text, kind: e.kind, parent: e.parent, status: "open", notes: [] });
  const t = threads.get(e.id);
  if (!t) continue;
  if (e.type === "close") Object.assign(t, { status: e.status, resolution: e.note });
  if (e.type === "note") t.notes.push(e.text);
  if (e.type === "kind") t.kind = e.kind;
}

const posts = new Map(board.filter((r) => r.type === "post").map((p) => [p.id, p]));
const agents = new Map();
const agent = (h) => agents.get(h) || agents.set(h, { handle: h, tool: null, claims: [], won: [], lost: [], acks: [], posts: [], bye: false }).get(h);

// Claims in store order: a key is won by the first live claim; a later claim by another agent,
// while the first is live and not released, is a race lost.
const holder = new Map();
for (const r of board) {
  if (r.type === "hello") agent(r.from).tool ||= r.tool;
  if (r.type === "bye") {
    agent(r.from).bye = true;
    for (const [k, h] of holder) if (h.from === r.from) holder.delete(k);
  }
  if (r.type === "post") agent(r.from).posts.push(r);
  if (r.type === "ack") agent(r.from).acks.push(r);
  if (r.type === "release") holder.delete(r.key);
  if (r.type === "claim" && !r.key.startsWith("role:")) {
    const a = agent(r.from);
    a.claims.push(r.key);
    const h = holder.get(r.key);
    const live = h && Date.parse(h.until) > Date.parse(r.ts);
    if (live && h.from !== r.from) a.lost.push(r.key);
    else {
      if (!a.won.includes(r.key)) a.won.push(r.key);
      holder.set(r.key, r);
    }
  }
}

/** The task thread behind a claimed key: a thread id, or an open call's task. */
const taskOf = (key) => (threads.has(key) ? key : posts.get(key)?.task || null);

// Check 7 across agents: a task is taken twice when two agents won it while both were live.
const winners = new Map();
for (const a of agents.values()) for (const k of a.won) {
  const t = taskOf(k) || k;
  winners.set(t, [...(winners.get(t) || []), a.handle]);
}

const PASS = "pass", FAIL = "FAIL", NA = "n/a", MANUAL = "by hand", WORKING = "working";
const NOW = Date.now();
const rows = [];
for (const a of agents.values()) {
  if (!a.tool) continue;
  const tasks = [...new Set(a.won.map(taskOf).filter(Boolean))];
  const closed = tasks.filter((t) => threads.get(t)?.status === "done" && threads.get(t)?.resolution);
  const toMe = [...posts.values()].filter((p) => p.from !== a.handle && (p.to || []).includes(a.handle) && ["instruction", "question"].includes(p.kind));
  const answered = toMe.filter((p) => p.kind === "question" ? [...posts.values()].some((r) => r.reply === p.id && r.from === a.handle) : a.acks.some((k) => k.post === p.id && k.state === "done"));
  const ready = a.posts.filter((p) => p.kind === "ready");
  // Still at it: on the board, not gone, and holding a claim on an open task.
  const working = !a.bye && tasks.some((t) => threads.get(t)?.status === "open" && [...holder.values()].some((h) => h.from === a.handle && Date.parse(h.until) > NOW && taskOf(h.key) === t));
  const doubled = tasks.filter((t) => (winners.get(t) || []).length > 1);
  const handedOver = tasks.filter((t) => {
    const key = [...posts.values()].find((p) => p.task === t)?.id;
    return board.some((r) => r.type === "claim" && (r.key === t || r.key === key) && r.from !== a.handle && r._order < Math.min(...board.filter((x) => x.type === "claim" && x.from === a.handle && (x.key === t || x.key === key)).map((x) => x._order)));
  });
  rows.push({
    handle: a.handle,
    tool: a.tool,
    tasks,
    checks: {
      "1 skill found": MANUAL,
      "2 node and git": a.tool ? PASS : FAIL,
      "3 store pushed": PASS,
      "4 pointer enough": MANUAL,
      "5 threads": tasks.length ? (closed.length === tasks.length ? PASS : working ? WORKING : FAIL) : NA,
      "6 messages": toMe.length ? (answered.length === toMe.length ? PASS : working ? WORKING : FAIL) : NA,
      "7 no double claim": doubled.length ? FAIL : tasks.length ? PASS : NA,
      "8 ready, not merged": ready.length ? PASS : working ? WORKING : tasks.length ? FAIL : NA,
      "9 waiting": MANUAL,
      "11 handoff": handedOver.length ? PASS : NA,
    },
    detail: { won: a.won, lost: a.lost, ready: ready.map((p) => p.ref || p.text.slice(0, 60)), doubled, left: a.bye },
  });
}

if (argv.includes("--json")) {
  console.log(JSON.stringify({ source: SOURCE, agents: rows }, null, 2));
} else {
  console.log(`board trial · source ${SOURCE} · ${rows.length} agent(s)\n`);
  for (const r of rows) {
    console.log(`${r.handle} · ${r.tool} · tasks ${r.tasks.join(", ") || "none"}${r.detail.left ? " · left" : ""}`);
    for (const [k, v] of Object.entries(r.checks)) console.log(`  ${v === FAIL ? "✗" : v === PASS ? "✓" : "·"} ${k}: ${v}`);
    if (r.detail.lost.length) console.log(`  races lost (fine): ${r.detail.lost.join(", ")}`);
    if (r.detail.ready.length) console.log(`  ready: ${r.detail.ready.join("; ")}`);
    console.log();
  }
  console.log("Check 8 also needs GitHub: the pull requests must be merged by the merging role, not their authors.");
}
process.exit(rows.some((r) => Object.values(r.checks).includes(FAIL)) ? 2 : 0);
