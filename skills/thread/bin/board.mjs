// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * board — a bulletin board for agents, in the same store as the thread tree.
 *
 * Agents in any tool, on any machine, post messages to each other and to roles, take
 * instructions from the user, claim work under a lease, and see who else is about. The
 * board lives beside the tree, under board/ in the selected source, and follows the same
 * rule: every action is one new, never-edited file, so any number of writers pull, write
 * and push without a merge conflict.
 *
 * Order matters for claims, and wall clocks on different machines disagree, so claims are
 * replayed in the order git first recorded them on main (a push rebases onto it, so that
 * order is one line for everyone). A claim counts once it is pushed.
 *
 * Sources are paths (patternode, patternode/platform), and the board reads them as one:
 * claims, roles and presence count across the whole store, so a lock never forks between
 * paths. What a chat sees is scoped: messages to its handle or roles reach it anywhere, and
 * broadcasts, open calls and thread posts reach it from its own path, the paths above it and
 * the paths below it. A chat joined at patternode sees everything under patternode.
 *
 * thread.mjs runs this for `thread board <command>` and hands it the store helpers, so the
 * two share one clone and one push. Zero dependencies; Node 18+.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

// Leases. An agent's presence, a role and a claim each last this long unless renewed.
// A claim matches an agent's activity lock in the work skill (one hour).
const LEASE = { hello: "8h", role: "8h", claim: "1h" };
const KINDS = ["instruction", "question", "info", "ready", "standing", "answer", "dump"];
// What a curator files a dump as. The first group becomes a thread of that kind.
const AS_THREAD = ["chore", "task", "bug", "feature", "improvement", "idea"];
const FILE_AS = [...AS_THREAD, "note", "reflection", "duplicate", "drop"];
const STATES = ["seen", "accepted", "done", "declined"];
// Kinds that wait on someone: they stay in the inbox until acknowledged, and are not
// pruned until done or declined.
const PENDING = new Set(["instruction", "question", "ready", "dump"]);

let H; // helpers from thread.mjs: { STORE, SCOPE, git, tryGit, commitAndPush, pull, context, die, warn, sources, sourceDir, openThreads }

// ---------------------------------------------------------------- small things

const boardDir = (source) => path.join(H.sourceDir(source), "board");
const archiveDir = (source) => path.join(H.sourceDir(source), "board-archive");

/** Where a scope writes: its own folder, or the default source for "all". */
const homeOf = (scope) => (scope === "all" ? "default" : scope);

/** True when a source is in a scope's view: the scope itself, a path above it, or one below it. */
const inScope = (scope, s) => scope === "all" || s === scope || s.startsWith(scope + "/") || scope.startsWith(s + "/");

/** The scope a chat works in: where it joined, else the workspace's. */
const scopeOf = (state, who) => (who && state.agents.get(who)?.hello?.scope) || H.SCOPE;
const host = () => hostname().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || "host";
const stampOf = (ts) => ts.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

function localDay() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ago(ts) {
  const s = Math.max(0, (Date.now() - Date.parse(ts)) / 1000);
  if (s < 90) return "just now";
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 129600) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function until(ts) {
  const s = (Date.parse(ts) - Date.now()) / 1000;
  if (s <= 0) return `expired ${ago(ts)}`;
  if (s < 5400) return `for ${Math.round(s / 60)}m`;
  return `for ${Math.round(s / 3600)}h`;
}

/** "90m", "2h", "1d" (or a bare number of minutes) to milliseconds. */
function duration(raw, fallback) {
  const v = String(raw ?? fallback).trim().toLowerCase();
  const m = /^(\d+(?:\.\d+)?)\s*(m|min|h|d)?$/.exec(v);
  if (!m) H.die(`a duration is a number and m, h or d, such as 90m or 2h (got "${raw}")`);
  const n = Number(m[1]);
  return n * { m: 60e3, min: 60e3, h: 3600e3, d: 86400e3 }[m[2] || "m"];
}

const later = (ms) => new Date(Date.now() + ms).toISOString();
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** A handle or role: lowercase, no spaces, so "master: patternode-platform" is master:patternode-platform. */
function nameArg(raw, what) {
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, "");
  if (!/^[a-z0-9*][a-z0-9:._@-]*$/.test(s)) H.die(`${what} is one lowercase word, with : . _ - allowed (got "${raw}")`);
  return s;
}

function me(flags, { required = true } = {}) {
  const raw = typeof flags.as === "string" ? flags.as : process.env.BOARD_AS;
  if (!raw) {
    if (!required) return null;
    H.die("who is posting? Pass --as <handle> (the handle `thread board start` gave this chat), or set $BOARD_AS");
  }
  return nameArg(raw, "a handle");
}

const list = (v) => (v === undefined || v === true ? [] : String(v).split(",").map((s) => s.trim()).filter(Boolean));

// ---------------------------------------------------------------- reading

/** A Markdown post written by hand (from the GitHub app, say): front matter, then the text. */
function readMarkdown(file, rel, source) {
  const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  const head = {};
  if (m) for (const line of m[1].split("\n")) {
    const kv = /^([a-z]+):\s*(.*)$/.exec(line.trim());
    if (kv) head[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  const text = (m ? m[2] : raw).trim();
  if (!text) return null;
  const stamp = /(\d{8}T\d{6}Z)/.exec(path.basename(file));
  const ts = head.ts || (stamp ? `${stamp[1].slice(0, 4)}-${stamp[1].slice(4, 6)}-${stamp[1].slice(6, 8)}T${stamp[1].slice(9, 11)}:${stamp[1].slice(11, 13)}:${stamp[1].slice(13, 15)}Z` : null);
  return {
    type: "post",
    id: "p-" + createHash("sha1").update(source === "default" ? rel : `${source}:${rel}`).digest("hex").slice(0, 6),
    ts: ts || new Date(0).toISOString(),
    host: "by-hand",
    from: head.from ? nameArg(head.from, "from:") : "user",
    // A file with only text in it is a dump, for the curator to file. With to: it is an instruction.
    to: list(head.to || (head.kind && head.kind !== "dump" ? "*" : "curator")).map((t) => nameArg(t, "to:")),
    on: head.on || null,
    ref: head.ref || null,
    kind: KINDS.includes(head.kind) ? head.kind : head.to ? "instruction" : "dump",
    text,
    _md: true,
  };
}

/** Every live board file in every source, in the order git first recorded it; files not yet committed come last, by time. */
function readBoard() {
  const out = [];
  for (const source of H.sources()) {
    const home = H.sourceDir(source);
    const dir = boardDir(source);
    if (!existsSync(dir)) continue;
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        const rel = path.relative(home, p).split(path.sep).join("/");
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".json")) {
          try {
            out.push({ ...JSON.parse(readFileSync(p, "utf8")), _file: p, _rel: rel, _source: source });
          } catch {
            H.warn(`skipping unreadable board file ${source}:${rel}`);
          }
        } else if (e.name.endsWith(".md") && e.name.toLowerCase() !== "readme.md") {
          const post = readMarkdown(p, rel, source);
          if (post) out.push({ ...post, _file: p, _rel: rel, _source: source });
        }
      }
    };
    walk(dir);
  }
  const order = commitOrder();
  const at = (e) => order.get(path.resolve(e._file)) ?? Infinity;
  return out.sort((a, b) => at(a) - at(b) || (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a._file < b._file ? -1 : 1));
}

/** Absolute path -> its place in the order the store's history first added it, for every board folder. */
function commitOrder() {
  const order = new Map();
  const r = H.tryGit(["-c", "core.quotepath=off", "log", "--reverse", "--diff-filter=A", "--name-only", "--format=", "--", "board", ":(glob)sources/**/board/**"]);
  if (!r.ok) return order;
  let i = 0;
  for (const line of r.out.split("\n")) {
    const f = line.trim();
    if (!f) continue;
    const abs = path.resolve(H.STORE, f);
    if (!order.has(abs)) order.set(abs, i++);
  }
  return order;
}

function readArchive() {
  const out = [];
  for (const source of H.sources()) {
    const dir = archiveDir(source);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".jsonl")).sort()) {
      for (const line of readFileSync(path.join(dir, f), "utf8").split("\n")) {
        if (line.trim()) try { out.push({ ...JSON.parse(line), _source: source }); } catch { /* skip */ }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- state

/**
 * Replay the board: posts with their acknowledgements, who is present, and who holds what.
 * Claims are taken in file order (the order git recorded them), so every reader agrees.
 * Every source is replayed together: a key or a role is one key or role in the whole store.
 */
function replay(events, now = Date.now()) {
  const posts = new Map();
  const agents = new Map();
  const claims = new Map(); // key -> { key, who, until, since, note, took, lost: [], _source }
  const retracted = new Set();
  for (const e of events) {
    const seen = (who) => {
      if (!who) return;
      const a = agents.get(who) || { handle: who, last: e.ts, hello: null };
      if (e.ts > a.last) a.last = e.ts;
      agents.set(who, a);
    };
    seen(e.from);
    switch (e.type) {
      case "post":
        posts.set(e.id, { ...e, after: e.after || [], acks: [], filed: [] });
        break;
      case "ack": {
        const p = posts.get(e.post);
        if (p) p.acks.push(e);
        break;
      }
      case "retract":
        retracted.add(e.post);
        break;
      case "file": {
        const p = posts.get(e.post);
        if (p) p.filed.push(e);
        break;
      }
      case "hello":
        // A hello written before paths existed works in the source it was filed in.
        agents.get(e.from).hello = { ...e, scope: e.scope || e._source };
        break;
      case "bye": {
        agents.get(e.from).hello = null;
        for (const [k, c] of claims) if (c.who === e.from) claims.delete(k);
        break;
      }
      case "claim": {
        const c = claims.get(e.key);
        const free = !c || Date.parse(c.until) < Date.parse(e.ts);
        if (c && c.who === e.from) Object.assign(c, { until: e.until, note: e.note ?? c.note });
        else if (free || e.take) claims.set(e.key, { key: e.key, who: e.from, until: e.until, since: e.ts, note: e.note || null, took: c && !free ? c.who : null, lost: [], _source: e._source });
        else c.lost.push({ who: e.from, ts: e.ts });
        break;
      }
      case "release": {
        const c = claims.get(e.key);
        if (c && (c.who === e.from || e.take)) claims.delete(e.key);
        break;
      }
    }
  }
  for (const p of posts.values()) p.retracted = retracted.has(p.id);
  // A ready note followed by another for the same pull request is superseded by it.
  const lastReady = new Map();
  for (const p of posts.values()) {
    if (p.kind !== "ready" || !p.ref) continue;
    const prev = lastReady.get(p.ref);
    if (prev && !closed(prev)) prev.superseded = p.id;
    lastReady.set(p.ref, p);
  }
  const live = (c) => Date.parse(c.until) > now;
  const holding = (who) => [...claims.values()].filter((c) => c.who === who && live(c));
  const rolesOf = (who) => holding(who).filter((c) => c.key.startsWith("role:")).map((c) => c.key.slice(5));
  const present = [...agents.values()].filter((a) => a.hello && Date.parse(a.hello.until) > now);
  return { posts, agents, claims, live, holding, rolesOf, present };
}

/** What a handle listens on: itself and its roles anywhere; everyone, its repository and its threads within its scope. */
function audience(state, who) {
  const hello = state.agents.get(who)?.hello;
  const direct = new Set([who, ...state.rolesOf(who)]);
  const broad = new Set(["*"]);
  if (hello?.ctx) broad.add(`repo:${hello.ctx}`);
  const threads = new Set(hello?.threads || []);
  for (const c of state.holding(who)) if (/^t-[0-9a-z]+$/.test(c.key)) threads.add(c.key);
  return { direct, broad, threads, scope: scopeOf(state, who) };
}

const ackedBy = (p, who) => p.acks.some((a) => a.from === who);
const closed = (p) => p.acks.some((a) => a.state === "done" || a.state === "declined");
// A dump is settled once a curator has filed it (a filing marked --more leaves it open for more).
const settled = (p) => p.kind === "dump" && p.filed.some((f) => !f.more);
const finished = (p) => closed(p) || Boolean(p.superseded) || settled(p);
const curates = (state, who) => state.rolesOf(who).some((r) => r === "curator" || r.startsWith("curator:"));

/** Unread posts for a handle: to it or its roles, or to everyone, its repo or its threads in its scope, or replies to it; and open calls in its scope. */
function inbox(state, who) {
  const { direct, broad, threads, scope } = audience(state, who);
  const curator = curates(state, who);
  const mine = new Set([...state.posts.values()].filter((p) => p.from === who).map((p) => p.id));
  const forMe = [];
  const open = [];
  for (const p of state.posts.values()) {
    if (p.from === who || p.retracted || p.superseded || ackedBy(p, who) || settled(p)) continue;
    const near = inScope(scope, p._source);
    if (p.kind === "dump" && !(curator && near) && !p.to.some((t) => direct.has(t))) continue;
    const addressed = (p.kind === "dump" && curator && near) || p.to.some((t) => direct.has(t)) || (p.reply && mine.has(p.reply)) || (near && (p.to.some((t) => broad.has(t)) || (p.on && threads.has(p.on))));
    if (addressed) forMe.push(p);
    else if (near && p.to.includes("any") && !finished(p) && !taskClosed(p)) {
      const c = state.claims.get(p.task || p.id);
      if (!c || !state.live(c) || c.who === who) open.push(p);
    }
  }
  return { forMe, open };
}

/** The key a post is claimed under: its task thread when it has one. */
const keyOf = (p) => p.task || p.id;

// Thread statuses, read once per command: an open call whose task thread was closed is finished.
let STATUSES = null;
const taskClosed = (p) => {
  if (!p.task) return false;
  STATUSES ??= H.threadStatuses();
  const st = STATUSES.get(p.task);
  return st === "done" || st === "dropped";
};

// What to pick up first among open threads: tasks, then bugs, then plain threads, then the rest.
const KIND_RANK = { task: 0, bug: 1, activity: 1, "": 2, feature: 3, improvement: 4, idea: 5 };
const rank = (t) => KIND_RANK[t.kind || ""] ?? 3;

const standing = (state, scope) => [...state.posts.values()].filter((p) => p.kind === "standing" && !p.retracted && inScope(scope, p._source));

/**
 * The merge queue: one entry per pull request with a ready note not yet done or declined, in
 * the order its first ready note reached the store. A later ready note for the same pull request
 * updates the entry and keeps its place. An entry waits for every `after` pull request still in
 * a queue. Returns entries for every role; filter by `to`.
 */
function queue(state) {
  const byRef = new Map();
  const entries = [];
  for (const p of state.posts.values()) {
    if (p.kind !== "ready" || !p.ref || p.retracted) continue;
    let e = byRef.get(p.ref);
    if (!e || e.posts.some(closed)) {
      e = { ref: p.ref, posts: [], first: p };
      byRef.set(p.ref, e);
      entries.push(e);
    }
    e.posts.push(p);
    e.latest = p;
  }
  const waiting = entries.filter((e) => !e.posts.some(closed));
  const queued = new Set(waiting.map((e) => e.ref));
  const known = new Set(entries.map((e) => e.ref));
  for (const e of waiting) {
    const after = [...new Set(e.posts.flatMap((p) => p.after))];
    e.after = after;
    e.blockedBy = after.filter((r) => queued.has(r));
    e.unknown = after.filter((r) => !known.has(r));
    const acc = e.posts.flatMap((p) => p.acks).filter((a) => a.state === "accepted").pop();
    e.merging = acc ? acc.from : null;
    e.to = e.latest.to;
  }
  return waiting;
}

function queueLines(state, entries) {
  const out = [];
  let next = null;
  entries.forEach((e, i) => {
    const p = e.latest;
    let st = e.merging ? `merging (${e.merging})` : e.blockedBy.length ? `waits for ${e.blockedBy.join(", ")}` : "ready";
    if (!e.merging && !e.blockedBy.length && !next) {
      next = e;
      st = "ready, next";
    }
    out.push(`  ${i + 1}. ${e.ref} · ${st} · from ${p.from}, ${ago(e.first.ts)} · ${p.id}`);
    out.push(`     ${p.text.split("\n")[0]}${p.deploy ? ` · deploy: ${p.deploy}` : ""}`);
    if (e.unknown.length) out.push(`     after ${e.unknown.join(", ")}, not on the board: check it has merged`);
  });
  return { out, next };
}

/** Dumps in a scope that no curator has filed yet, oldest first. */
const unfiled = (state, scope) => [...state.posts.values()].filter((p) => p.kind === "dump" && !p.retracted && !settled(p) && inScope(scope, p._source));

/** The posts that answer or follow up a post, depth first: questions asked about it and the replies to them. */
function conversation(state, root) {
  const out = [];
  const walk = (id, depth) => {
    for (const p of state.posts.values()) {
      if (p.reply !== id) continue;
      out.push({ p, depth });
      walk(p.id, depth + 1);
    }
  };
  walk(root.id, 1);
  return out;
}

const words = (t) => new Set(String(t).toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || []);
function similarity(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both);
}

/** Open threads in a scope that look like a piece of text, best first: where a dump might belong. */
function lookalikes(text, scope, threads, limit = 3) {
  return [...threads.values()]
    .filter((t) => (t.status === "open" || t.status === "parked") && inScope(scope, t.source))
    .map((t) => [t, similarity(text, t.text)])
    .filter(([, sc]) => sc >= 0.15)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t);
}

/** The text of a command: its words, or stdin when it is "-" or nothing was given and input is piped. */
function textArg(pos) {
  const t = pos.join(" ").trim();
  if (t === "-" || (!t && !process.stdin.isTTY)) {
    try {
      return readFileSync(0, "utf8").trim();
    } catch {
      return "";
    }
  }
  return t;
}

// ---------------------------------------------------------------- writing

function newPostId(events) {
  const taken = new Set([...events, ...readArchive()].map((e) => e.id).filter(Boolean));
  for (;;) {
    const id = "p-" + randomBytes(3).readUIntBE(0, 3).toString(36).padStart(4, "0").slice(-4);
    if (!taken.has(id)) return id;
  }
}

/** Write one board file into a source's board/ folder. */
// Strictly increasing within one run, so two files written in the same millisecond keep their order.
let LAST_TS = 0;
function write(ev, source) {
  LAST_TS = Math.max(Date.now(), LAST_TS + 1);
  const ts = new Date(LAST_TS).toISOString();
  const dir = path.join(boardDir(source), localDay());
  mkdirSync(dir, { recursive: true });
  const full = { ts, host: host(), ...ev };
  writeFileSync(path.join(dir, `${stampOf(ts)}-${host()}-${randomBytes(3).toString("hex")}.json`), JSON.stringify(full, null, 2) + "\n");
  return full;
}

/** Where a chat's own writes go: --source when given, else where it joined. */
function homeFor(state, who, flags) {
  return homeOf(typeof flags.source === "string" ? H.SCOPE : scopeOf(state, who));
}

/** Commit and push; say so when it did not reach the remote. */
function save(message) {
  const ok = H.commitAndPush(`board: ${message}`);
  if (!ok) console.log("(not pushed: other agents won't see this until a later board command pushes it)");
  return ok;
}

// ---------------------------------------------------------------- showing

function line(p, { to = true } = {}) {
  const via = p.relayed ? ` (from the user, via ${p.from})` : "";
  const who = p.relayed ? "user" : p.from;
  const bits = [p.kind, `from ${who}${via}`];
  if (to) bits.push(`→ ${p.to.join(", ")}`);
  if (p.on) bits.push(`on ${p.on}`);
  if (p.ref) bits.push(`re ${p.ref}`);
  if (p.reply) bits.push(`reply to ${p.reply}`);
  if (p._source && p._source !== "default") bits.push(`in ${p._source}`);
  bits.push(ago(p.ts));
  return `${p.id} · ${bits.join(" · ")}\n    ${p.text.replace(/\n/g, "\n    ")}`;
}

const fileLine = (f) => `    ↳ filed by ${f.from} ${ago(f.ts)} as ${f.is}${f.thread ? ` ${f.thread}` : ""}${f.of ? ` of ${f.of}` : ""}${f.plan ? ` → ${f.plan}` : ""}${f.note ? `: ${f.note}` : ""}`;
const ackLine = (a) => `    ↳ ${a.state} by ${a.from} ${ago(a.ts)}${a.note ? `: ${a.note}` : ""}`;

const toJson = (p) => {
  const { _file, _rel, _md, ...rest } = p;
  return rest;
};

function anchorOf(state, who, ctx) {
  const roles = state.rolesOf(who);
  const scope = scopeOf(state, who);
  return `📋 ${who}${roles.length ? ` · ${roles.join(", ")}` : ""} · ${ctx}${scope !== "default" ? ` · in ${scope}` : ""}`;
}

function agentLine(state, a) {
  const h = a.hello || {};
  const roles = state.rolesOf(a.handle);
  const held = state.holding(a.handle).filter((c) => !c.key.startsWith("role:")).map((c) => (c.note ? `${c.key} (${c.note})` : c.key));
  const bits = [a.handle];
  if (h.tool) bits.push(h.tool);
  if (h.ctx) bits.push(h.ctx);
  if (h.scope && h.scope !== "default") bits.push(`in ${h.scope}`);
  if (roles.length) bits.push(`roles ${roles.join(", ")}`);
  bits.push(held.length ? `on ${held.join(", ")}` : "holds nothing");
  bits.push(`seen ${ago(a.last)}`);
  return bits.join(" · ") + (h.note ? `\n    ${h.note}` : "");
}

/** Open threads under a scope that nobody has claimed: work a chat can pick up. */
function unclaimedThreads(state, scope) {
  const free = H.openThreads(scope).filter((t) => {
    const c = state.claims.get(t.id);
    return !c || !state.live(c);
  });
  // Stable: within a rank the newest stays first.
  return free.map((t, i) => [t, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([t]) => t);
}

/**
 * The next things a chat could do, best first: instructions and questions to it, the head of
 * any merge queue it holds the role for, then open threads nobody holds in its scope (tasks
 * first, ideas last). With no handle, the list a dispatcher hands out: queue heads and tasks.
 */
function nextUp(state, who) {
  const out = [];
  if (who) {
    for (const p of inbox(state, who).forMe) {
      if (p.kind === "instruction" || p.kind === "question") out.push({ what: p.kind, id: p.id, text: p.text, post: p });
    }
    if (curates(state, who)) for (const p of unfiled(state, scopeOf(state, who))) out.push({ what: "dump", id: p.id, text: p.text, post: p });
  }
  const roles = who ? state.rolesOf(who) : [...new Set(queue(state).flatMap((e) => e.to))];
  for (const role of roles) {
    const { next } = queueLines(state, queue(state).filter((e) => e.to.includes(role)));
    if (next) out.push({ what: "merge", id: next.ref, text: `${role}: merge ${next.ref}, ${next.latest.text.split("\n")[0]}`, role });
  }
  for (const t of unclaimedThreads(state, scopeOf(state, who))) out.push({ what: t.kind === "task" ? "task" : "thread", id: t.id, text: t.text, thread: t });
  return out;
}

/** The briefing a new agent reads: who it is, standing orders, what is for it, work it could take, who is about. */
function brief(state, who, ctx, { hook = false } = {}) {
  const scope = scopeOf(state, who);
  const out = [];
  if (who) {
    out.push(anchorOf(state, who, ctx));
    out.push(`Keep this handle for the whole chat: pass --as ${who} to every board command (or set BOARD_AS=${who}).`);
  } else {
    out.push(`📋 board · ${ctx}${scope !== "default" ? ` · in ${scope}` : ""}`);
    out.push("Join it with `thread board start` (add --role <name> or --source <path> if the user named one); it gives this chat a handle.");
  }
  const orders = standing(state, scope);
  if (orders.length) {
    out.push("", `Standing orders (${orders.length}), which hold until retracted:`);
    for (const p of orders) out.push("  " + line(p));
  }
  if (who) {
    const { forMe, open } = inbox(state, who);
    const fresh = forMe.filter((p) => p.kind !== "standing");
    out.push("", fresh.length ? `For you (${fresh.length} unread):` : "For you: nothing unread.");
    for (const p of fresh) out.push("  " + line(p));
    if (open.length) {
      out.push("", `Open calls (${open.length}); claim one before starting it:`);
      for (const p of open) out.push("  " + line(p));
    }
    const roles = state.rolesOf(who);
    for (const role of roles) {
      const entries = queue(state).filter((e) => e.to.includes(role));
      if (!entries.length) continue;
      const { out: q } = queueLines(state, entries);
      out.push("", `Merge queue for ${role} (${entries.length}), merge in this order:`, ...q);
    }
    const held = state.holding(who).filter((c) => !c.key.startsWith("role:"));
    if (held.length) out.push("", `You hold: ${held.map((c) => `${c.key} (${until(c.until)})`).join(", ")}`);
  } else {
    const loose = [...state.posts.values()].filter((p) => !p.retracted && p.kind !== "standing" && inScope(scope, p._source) && (p.to.includes("*") || p.to.includes("any") || p.to.includes(`repo:${ctx}`)) && !finished(p));
    if (loose.length) {
      out.push("", `For every agent here (${loose.length}):`);
      for (const p of loose.slice(-10)) out.push("  " + line(p));
    }
  }
  const threads = unclaimedThreads(state, scope);
  if (threads.length) {
    out.push("", `Work nobody holds, tasks first${scope !== "default" ? ` in ${scope}` : ""} (${threads.length}${threads.length > 8 ? ", the latest 8" : ""}):`);
    for (const t of threads.slice(0, 8)) out.push(`  ${t.id} · ${t.text}${t.kind ? ` [${t.kind}]` : ""} · ${t.ctx}${t.source !== "default" ? ` · in ${t.source}` : ""} · ${ago(t.last)}`);
  }
  const others = state.present.filter((a) => a.handle !== who && inScope(scope, a.hello.scope));
  if (others.length) {
    out.push("", `Working now (${others.length}):`);
    for (const a of others) out.push("  " + agentLine(state, a));
  }
  if (who && !hook) {
    out.push(
      "",
      "Next: act on instructions first (accept, then done with the result); answer questions; merge in",
      "queue order if you hold a merging role; then `thread board next --claim` takes the best open task.",
    );
  }
  return out.join("\n");
}

// ---------------------------------------------------------------- claims

/** Claim a key and push, then read back who holds it. A claim counts only once it is pushed. */
function claim(key, who, flags, defaultLease) {
  const before = replay(readBoard());
  const c = before.claims.get(key);
  if (c && before.live(c) && c.who !== who && !flags.take) return { held: false, holder: c };
  write({ type: "claim", from: who, key, until: later(duration(flags.for, defaultLease)), take: flags.take ? true : undefined, note: typeof flags.note === "string" ? flags.note : undefined }, homeFor(before, who, flags));
  const pushed = save(`${who} claims ${key}`);
  const now = replay(readBoard()).claims.get(key);
  return { held: now?.who === who, holder: now, pushed };
}

function renewAll(state, who) {
  const soon = Date.now() + 20 * 60e3;
  const home = homeOf(scopeOf(state, who));
  let n = 0;
  for (const c of state.holding(who)) {
    if (Date.parse(c.until) > soon) continue;
    write({ type: "claim", from: who, key: c.key, until: later(duration(null, c.key.startsWith("role:") ? LEASE.role : LEASE.claim)) }, home);
    n++;
  }
  const a = state.agents.get(who);
  if (a?.hello && Date.parse(a.hello.until) <= soon) {
    const { ts, host: _h, _file, _rel, _source, ...hello } = a.hello;
    write({ ...hello, until: later(duration(null, LEASE.hello)) }, home);
    n++;
  }
  return n;
}

const strip = (e) => {
  const { _file, _rel, _source, ...rest } = e;
  return rest;
};

// ---------------------------------------------------------------- prune

/**
 * Move old, settled board files to each source's board-archive/, one new JSON Lines file per
 * source per prune. Kept: anything newer than the cutoff, standing orders not retracted, posts
 * still waiting on someone (with everything said about them), live presence, and every file for
 * a claim that is still held.
 */
function prune(events, days, dry) {
  const cutoff = new Date(Date.now() - days * 86400e3).toISOString();
  const state = replay(events);
  const keepPost = new Set();
  for (const p of state.posts.values()) {
    const late = p.ts >= cutoff || p.acks.some((a) => a.ts >= cutoff);
    const waiting = PENDING.has(p.kind) && !p.to.includes("*") && !finished(p) && !p.retracted;
    if (late || waiting || (p.kind === "standing" && !p.retracted)) keepPost.add(p.id);
  }
  const liveKeys = new Set([...state.claims.values()].filter(state.live).map((c) => c.key));
  const lastHello = new Map();
  for (const e of events) if (e.type === "hello") lastHello.set(e.from, e);
  const keep = (e) => {
    if (e._md) return true; // written by hand; left for its author to remove
    switch (e.type) {
      case "post": return keepPost.has(e.id);
      case "ack": case "retract": case "file": return keepPost.has(e.post) || (e.ts >= cutoff && !state.posts.has(e.post));
      case "hello": return lastHello.get(e.from) === e && (Date.parse(e.until) > Date.now() || e.ts >= cutoff);
      case "claim": case "release": return liveKeys.has(e.key) || e.ts >= cutoff;
      default: return e.ts >= cutoff;
    }
  };
  const moving = events.filter((e) => !keep(e));
  if (!moving.length || dry) return { moved: moving.length, files: [] };
  const ts = new Date().toISOString();
  const files = [];
  for (const source of new Set(moving.map((e) => e._source))) {
    const mine = moving.filter((e) => e._source === source);
    mkdirSync(archiveDir(source), { recursive: true });
    const name = `${stampOf(ts)}-${host()}-${randomBytes(3).toString("hex")}.jsonl`;
    writeFileSync(path.join(archiveDir(source), name), mine.map((e) => JSON.stringify({ src: e._rel, ...toJson(strip(e)) })).join("\n") + "\n");
    for (const e of mine) rmSync(e._file, { force: true });
    files.push(source === "default" ? `board-archive/${name}` : `sources/${source}/board-archive/${name}`);
  }
  return { moved: moving.length, files };
}

/** Prune by itself at the first board write of a day, keeping a week. BOARD_AUTO_PRUNE=0 turns it off. */
function autoPrune() {
  if (process.env.BOARD_AUTO_PRUNE === "0" || process.env.THREADS_AUTO_PRUNE === "0") return;
  const names = H.sources().flatMap((s) => (existsSync(archiveDir(s)) ? readdirSync(archiveDir(s)).filter((f) => f.endsWith(".jsonl")) : [])).sort();
  const m = names.length && /^(\d{4})(\d{2})(\d{2})T/.exec(names[names.length - 1]);
  if (m && `${m[1]}${m[2]}${m[3]}` >= localDay().replace(/-/g, "")) return;
  const r = prune(readBoard(), 7, false);
  if (r.files.length) {
    save(`prune ${r.moved} settled file(s)`);
    console.log(`(board: archived ${r.moved} settled file(s) older than a week to ${r.files.join(", ")})`);
  }
}

// ---------------------------------------------------------------- commands

const WRITES = new Set(["dump", "file", "ask", "next", "start", "post", "reply", "ready", "ack", "accept", "done", "decline", "merging", "merged", "claim", "release", "role", "retract", "renew", "bye"]);

/** The latest queue entry for a pull request, for merging and merged. */
function entryFor(state, ref) {
  const e = queue(state).find((x) => x.ref === ref);
  if (!e) H.die(`${ref} is not in a merge queue. thread board queue shows what is`);
  return e;
}

/** The scope a read-only view shows: the chat's own when --as is given, else the workspace's. */
const viewScope = (state, flags) => (typeof flags.source === "string" ? H.SCOPE : scopeOf(state, me(flags, { required: false })));

const commands = {
  start(pos, flags) {
    const ctx = H.context(flags);
    let state = replay(readBoard());
    if (flags.hook) {
      // Read-only, for a session-start hook: the board as an agent that has not joined sees it.
      console.log(brief(state, me(flags, { required: false }), ctx, { hook: true }));
      return;
    }
    let who = me(flags, { required: false });
    if (!who) {
      const tool = nameArg(typeof flags.tool === "string" ? flags.tool : "agent", "a tool");
      const taken = new Set(state.agents.keys());
      do who = `${tool.split(/[-:]/)[0]}-${randomBytes(2).readUInt16BE(0).toString(36).padStart(3, "0").slice(-3)}`;
      while (taken.has(who));
    }
    // A chat that comes back keeps the scope it joined with, unless told another.
    const prior = state.agents.get(who)?.hello?.scope;
    const scope = typeof flags.source === "string" || !prior ? H.SCOPE : prior;
    write(
      {
        type: "hello",
        from: who,
        tool: typeof flags.tool === "string" ? flags.tool : undefined,
        ctx,
        scope,
        threads: list(flags.thread),
        note: typeof flags.note === "string" ? flags.note : undefined,
        until: later(duration(null, LEASE.hello)),
      },
      homeOf(scope),
    );
    save(`${who} joins ${scope === "default" ? "" : `${scope} `}from ${ctx}`);
    for (const r of list(flags.role)) {
      const role = nameArg(r, "a role");
      const got = claim(`role:${role}`, who, { ...flags, for: flags.for ?? LEASE.role, note: undefined, source: undefined }, LEASE.role);
      if (!got.held) console.log(`(role ${role} is held by ${got.holder.who} ${until(got.holder.until)}; not taken. If ${got.holder.who} is gone, rerun with --take)`);
    }
    state = replay(readBoard());
    console.log(brief(state, who, ctx));
  },

  status(pos, flags) {
    // The user's overview: who is working on what, the merge queues, what waits, and work nobody holds.
    const state = replay(readBoard());
    const scope = viewScope(state, flags);
    const ctx = H.context(flags);
    if (flags.json) {
      return console.log(JSON.stringify({
        scope,
        agents: state.present.filter((a) => inScope(scope, a.hello.scope)).map((a) => ({ handle: a.handle, ...strip(a.hello), roles: state.rolesOf(a.handle), holds: state.holding(a.handle).map((c) => c.key) })),
        queue: queue(state).map((e) => ({ ref: e.ref, to: e.to, post: e.latest.id, from: e.latest.from, text: e.latest.text, after: e.after, blockedBy: e.blockedBy, merging: e.merging })),
        waiting: [...state.posts.values()].filter((p) => PENDING.has(p.kind) && p.kind !== "ready" && !finished(p) && !p.retracted && inScope(scope, p._source)).map(toJson),
        threads: unclaimedThreads(state, scope),
      }, null, 2));
    }
    console.log(`📋 board · ${scope === "all" ? "every source" : scope === "default" ? ctx : scope}`);
    const agents = state.present.filter((a) => inScope(scope, a.hello.scope));
    console.log("", agents.length ? `Working now (${agents.length}):` : "No agent is on the board now.");
    for (const a of agents) console.log("  " + agentLine(state, a));
    const roles = new Map();
    for (const e of queue(state)) for (const r of e.to) roles.set(r, [...(roles.get(r) || []), e]);
    for (const [role, entries] of roles) {
      const holder = state.claims.get(`role:${role}`);
      console.log("", `Merge queue for ${role} (${entries.length}; ${holder && state.live(holder) ? `held by ${holder.who}` : "nobody holds the role"}):`);
      console.log(queueLines(state, entries).out.join("\n"));
    }
    const waiting = [...state.posts.values()].filter((p) => PENDING.has(p.kind) && p.kind !== "ready" && !finished(p) && !p.retracted && inScope(scope, p._source));
    if (waiting.length) {
      console.log("", `Waiting on someone (${waiting.length}):`);
      for (const p of waiting) {
        console.log("  " + line(p));
        const last = p.acks[p.acks.length - 1];
        console.log(last ? ackLine(last) : "    ↳ not yet picked up");
      }
    }
    const loose = unfiled(state, scope);
    if (loose.length) {
      const curator = [...state.claims.values()].find((c) => c.key.startsWith("role:curator") && state.live(c));
      console.log("", `Dumps not yet filed: ${loose.length}, the oldest ${ago(loose[0].ts)} (${curator ? `${curator.who} curates` : "no curator on the board"}).`);
    }
    const threads = unclaimedThreads(state, scope);
    if (threads.length) {
      console.log("", `Open threads nobody holds (${threads.length}${threads.length > 15 ? ", the latest 15" : ""}):`);
      for (const t of threads.slice(0, 15)) console.log(`  ${t.id} · ${t.text} · ${t.ctx}${t.source !== "default" ? ` · in ${t.source}` : ""} · ${ago(t.last)}`);
    }
  },

  post(pos, flags) {
    const who = me(flags);
    const text = pos.join(" ").trim();
    if (!text) H.die('what is the message? thread board post "<text>" --to <handle|role|*|any|repo:name>');
    const to = list(flags.to).map((t) => nameArg(t, "--to"));
    if (!to.length && !flags.on) H.die("who is it for? --to <handle|role|*|any|repo:name>, or --on <thread id>");
    const kind = typeof flags.kind === "string" ? flags.kind : "info";
    if (!KINDS.includes(kind)) H.die(`--kind is one of ${KINDS.join(", ")}`);
    const events = readBoard();
    const state = replay(events);
    const home = homeFor(state, who, flags);
    // An open call is work: it becomes a task in the tree, under the thread it is on, and is
    // claimed, held and closed as that thread.
    let task;
    if (to.includes("any") && (kind === "instruction" || kind === "info")) {
      const title = text.split("\n")[0].slice(0, 120);
      task = H.openThread({ source: home, text: title, parent: typeof flags.on === "string" ? flags.on : null, kind: "task", ctx: H.context(flags), tool: typeof flags.tool === "string" ? flags.tool : undefined });
    }
    const p = write(
      {
        type: "post",
        id: newPostId(events),
        from: who,
        to,
        on: typeof flags.on === "string" ? flags.on : null,
        ref: typeof flags.ref === "string" ? flags.ref : null,
        kind,
        reply: typeof flags.reply === "string" ? flags.reply : null,
        after: list(flags.after).length ? list(flags.after) : undefined,
        deploy: typeof flags.deploy === "string" ? flags.deploy : undefined,
        relayed: flags["for-user"] ? true : undefined,
        task,
        text,
      },
      home,
    );
    save(`${who} posts ${p.id} (${kind}) to ${to.join(", ") || p.on}`);
    console.log(`📮 ${p.id} · ${kind} → ${[...to, ...(p.on ? [`on ${p.on}`] : [])].join(", ")}${home !== "default" ? ` · in ${home}` : ""}${task ? ` · task ${task} in the tree` : ""}`);
    return p;
  },

  reply(pos, flags) {
    const who = me(flags);
    const orig = replay(readBoard()).posts.get(pos[0]);
    if (!orig) H.die(`no post ${pos[0]} on the board`);
    commands.post(pos.slice(1), { ...flags, as: who, to: orig.relayed ? "user" : orig.from, on: orig.on ?? undefined, ref: orig.ref ?? undefined, reply: orig.id, kind: flags.kind ?? "answer" });
  },

  dump(pos, flags) {
    // Capture, no ceremony: anything, by anyone, for a curator to file. Text may be piped in.
    const who = me(flags, { required: false }) || "user";
    const text = textArg(pos);
    if (!text) H.die('dump what? thread board dump "<anything>", or pipe text in with thread board dump -');
    const events = readBoard();
    const state = replay(events);
    const home = homeFor(state, who, flags);
    const p = write({ type: "post", id: newPostId(events), from: who, to: ["curator"], on: typeof flags.on === "string" ? flags.on : null, ref: typeof flags.ref === "string" ? flags.ref : null, kind: "dump", reply: null, relayed: flags["for-user"] ? true : undefined, text }, home);
    save(`${who} dumps ${p.id}`);
    const curator = [...state.claims.values()].find((c) => c.key.startsWith("role:curator") && state.live(c));
    console.log(`📥 ${p.id} · dump${home !== "default" ? ` · in ${home}` : ""} · ${curator ? `${curator.who} curates` : "no curator on the board now; it waits for one"}`);
  },

  triage(pos, flags) {
    // The curator's worklist: every unfiled dump in scope, what was asked about it, and where it might go.
    const state = replay(readBoard());
    const scope = viewScope(state, flags);
    const rows = unfiled(state, scope);
    if (flags.json) return console.log(JSON.stringify(rows.map(toJson), null, 2));
    if (!rows.length) return console.log("Nothing to file.");
    const threads = H.threadInfo();
    for (const p of rows) {
      console.log(line(p, { to: false }));
      for (const { p: q, depth } of conversation(state, p)) console.log(`${"    ".repeat(depth)}↳ ${q.kind} from ${q.relayed ? "user" : q.from} ${ago(q.ts)}: ${q.text.split("\n")[0]}`);
      for (const f of p.filed) console.log(fileLine(f));
      const like = lookalikes(p.text, scopeOf(state, p.from) === "default" ? scope : scope, threads);
      if (like.length) console.log(`    looks like: ${like.map((t) => `${t.id} ${t.text.slice(0, 60)}${t.link ? ` → ${t.link}` : ""}`).join(" · ")}`);
      const author = state.agents.get(p.from);
      if (p.from !== "user" && !(author?.hello && Date.parse(author.hello.until) > Date.now())) console.log(`    (${p.from} is not on the board now: a question to it may wait; ask the user instead)`);
    }
    console.log(`\n${rows.length} to file. thread board file <post> --is <${FILE_AS.join("|")}> [--under <thread>] [--plan <activity or task>] [--into <thread>]; thread board ask <post> "<question>" when it is unclear.`);
  },

  file(pos, flags) {
    const who = me(flags);
    const state = replay(readBoard());
    const p = state.posts.get(pos[0]);
    if (!p) H.die(`no post ${pos[0]} on the board`);
    const is = typeof flags.is === "string" ? flags.is.toLowerCase() : null;
    if (!FILE_AS.includes(is)) H.die(`file it as what? --is ${FILE_AS.join(" | ")}`);
    const author = p.relayed ? "user" : p.from;
    const from = `board ${p.id}, ${author}, ${p.ts.slice(0, 10)}`;
    const ev = { type: "file", from: who, post: p.id, is, note: typeof flags.note === "string" ? flags.note : undefined, more: flags.more ? true : undefined };
    if (AS_THREAD.includes(is)) {
      const title = (typeof flags.title === "string" ? flags.title : p.text.split("\n")[0]).slice(0, 140);
      const description = `${p.text}\n\nFrom ${from}.`;
      ev.thread = H.openThread({ source: p._source, text: title, parent: typeof flags.under === "string" ? flags.under : p.on, kind: is, ctx: H.context(flags), description, link: typeof flags.plan === "string" ? flags.plan : null });
      ev.plan = typeof flags.plan === "string" ? flags.plan : undefined;
    } else if (is === "note") {
      const into = typeof flags.into === "string" ? flags.into : p.on;
      if (!into) H.die("a note goes into a thread: --into <thread>");
      if (!H.noteThread(into, `${p.text.replace(/\s+/g, " ").slice(0, 600)} (from ${from})`)) H.die(`no thread ${into}`);
      if (typeof flags.plan === "string") H.linkThread(into, flags.plan);
      ev.thread = into;
      ev.plan = typeof flags.plan === "string" ? flags.plan : undefined;
    } else if (is === "duplicate") {
      const of = typeof flags.of === "string" ? flags.of : null;
      if (!of) H.die("a duplicate of what? --of <thread or post>");
      if (/^t-[0-9a-z]+$/.test(of)) H.noteThread(of, `raised again in ${from}`);
      ev.of = of;
    }
    write(ev, p._source);
    save(`${who} files ${p.id} as ${is}${ev.thread ? ` ${ev.thread}` : ""}`);
    console.log(`🗂 ${p.id} → ${is}${ev.thread ? ` ${ev.thread}` : ""}${ev.of ? ` of ${ev.of}` : ""}${ev.plan ? ` → ${ev.plan}` : ""}${flags.more ? " (still open for more)" : ""}`);
    if (AS_THREAD.includes(is) && !ev.plan && is !== "idea") console.log(`   not linked to the plan yet: thread link ${ev.thread} <activity or task> when you know where it belongs`);
  },

  ask(pos, flags) {
    // A curator's question goes back to whoever said it, so ambiguity is settled at the source.
    const who = me(flags);
    const state = replay(readBoard());
    const p = state.posts.get(pos[0]);
    if (!p) H.die(`no post ${pos[0]} on the board`);
    const q = pos.slice(1).join(" ").trim();
    if (!q) H.die(`ask what? thread board ask ${p.id} "<question>"`);
    const author = p.relayed ? "user" : p.from;
    commands.post([q], { ...flags, as: who, to: author, on: p.on ?? undefined, reply: p.id, kind: "question" });
    write({ type: "ack", from: who, post: p.id, state: "seen", note: "asked its author" }, p._source);
    save(`${who} asks ${author} about ${p.id}`);
    const a = state.agents.get(author);
    if (author !== "user" && !(a?.hello && Date.parse(a.hello.until) > Date.now())) console.log(`(${author} is not on the board now; it will see this when it comes back. If it matters sooner, ask the user.)`);
  },

  tidy(pos, flags) {
    // The curator's sweep: what is loose, unlinked, orphaned or doubled, with the command for each.
    const state = replay(readBoard());
    const scope = viewScope(state, flags);
    const threads = H.threadInfo();
    const day = 86400e3;
    const now = Date.now();
    const out = [];
    const section = (title, rows) => {
      if (!rows.length) return;
      out.push("", `${title} (${rows.length}${rows.length > 10 ? ", the first 10" : ""}):`, ...rows.slice(0, 10).map((r) => "  " + r));
    };
    const loose = unfiled(state, scope);
    section("Dumps not yet filed", loose.map((p) => `${p.id} · ${p.from} · ${ago(p.ts)} · ${p.text.split("\n")[0].slice(0, 80)}  → thread board triage`));
    const qs = [...state.posts.values()].filter((p) => p.kind === "question" && !p.retracted && inScope(scope, p._source) && now - Date.parse(p.ts) > day && ![...state.posts.values()].some((r) => r.reply === p.id));
    section("Questions unanswered for a day", qs.map((p) => `${p.id} · to ${p.to.join(", ")} · ${ago(p.ts)} · ${p.text.split("\n")[0].slice(0, 80)}  → ask the user`));
    const unlinked = [...threads.values()].filter((t) => t.status === "open" && inScope(scope, t.source) && ["chore", "task", "bug"].includes(t.kind) && !t.link);
    section("Chores, tasks and bugs not linked to the plan", unlinked.map((t) => `${t.id} · ${t.kind} · ${t.text.slice(0, 80)}  → thread link ${t.id} <activity or task>`));
    const orphans = [...state.claims.values()].filter((c) => state.live(c) && !c.key.startsWith("role:") && inScope(scope, c._source) && !state.present.some((a) => a.handle === c.who));
    section("Held by an agent no longer on the board", orphans.map((c) => `${c.key} · ${c.who} · ${until(c.until)}  → it frees itself; ask ${c.who} or the user before --take`));
    const stale = [...state.posts.values()].filter((p) => p.kind === "instruction" && !p.retracted && !finished(p) && inScope(scope, p._source) && !p.acks.length && now - Date.parse(p.ts) > day);
    section("Instructions nobody has picked up for a day", stale.map((p) => `${p.id} · → ${p.to.join(", ")} · ${ago(p.ts)} · ${p.text.split("\n")[0].slice(0, 80)}`));
    const open = [...threads.values()].filter((t) => t.status === "open" && t.leaf && t.kind !== "project" && inScope(scope, t.source));
    const pairs = [];
    for (let i = 0; i < open.length && pairs.length < 20; i++) {
      for (let j = i + 1; j < open.length; j++) if (similarity(open[i].text, open[j].text) >= 0.6) pairs.push(`${open[i].id} and ${open[j].id} · ${open[i].text.slice(0, 60)}  → keep one, drop the other with where it went`);
    }
    section("Open threads that look the same", pairs);
    if (!out.length) return console.log("The board is tidy.");
    console.log(`🧹 board${scope !== "default" ? ` · ${scope}` : ""}${out.join("\n")}`);
  },

  next(pos, flags) {
    // One ranked list of what to do next. --claim takes the best open task, racing safely:
    // when another chat wins it, the next one is tried. --list is the dispatcher's view.
    const who = flags.list ? me(flags, { required: false }) : me(flags);
    const limit = Number(flags.limit ?? (flags.list ? 20 : 5));
    let state = replay(readBoard());
    const items = nextUp(state, flags.list ? null : who);
    if (flags.json) return console.log(JSON.stringify(items.slice(0, limit).map(({ post, ...i }) => i), null, 2));
    if (!flags.claim) {
      if (!items.length) return console.log("Nothing to pick up here. thread board wait waits for something to arrive.");
      items.slice(0, limit).forEach((i, n) => console.log(`${n + 1}. ${i.what} · ${i.id} · ${i.text.split("\n")[0]}${i.thread ? ` · ${i.thread.ctx}${i.thread.source !== "default" ? ` · in ${i.thread.source}` : ""}` : ""}`));
      if (items.length > limit) console.log(`+ ${items.length - limit} more`);
      return;
    }
    const first = items[0];
    if (first && first.what === "dump") {
      console.log(`First, ${items.filter((i) => i.what === "dump").length} dump(s) to file: thread board triage --as ${who}.`);
      return;
    }
    if (first && (first.what === "instruction" || first.what === "question")) {
      console.log(`First, the ${first.what} for you: ${first.id}. Accept it, act on it, then done or reply:\n  ${line(first.post)}`);
      return;
    }
    if (first && first.what === "merge") {
      console.log(`First, the merge queue: ${first.text}. thread board queue --as ${who} has the order.`);
      return;
    }
    for (const i of items.filter((x) => x.thread)) {
      const r = claim(i.id, who, { for: flags.for, note: typeof flags.note === "string" ? flags.note : undefined }, LEASE.claim);
      if (r.held && r.pushed !== false) {
        console.log(`🔒 ${who} took ${i.id} · ${i.text}${i.thread.source !== "default" ? ` · in ${i.thread.source}` : ""}`);
        console.log(`Pick it up with: thread resume ${i.id}. Close it with thread done ${i.id} "<result>" when finished; that frees the claim.`);
        return;
      }
      if (r.held) {
        console.log(`(claimed ${i.id} but NOT PUSHED: not yours until a later command pushes it)`);
        return;
      }
      state = replay(readBoard());
    }
    console.log("Nothing left to take: every open task here is held. thread board wait waits for something new.");
    process.exitCode = 3;
  },

  ready(pos, flags) {
    // A ready-to-merge note: joins the merge queue of the role that merges that repository.
    const who = me(flags);
    const ref = pos[0];
    const m = /^([\w.-]+)\/([\w.-]+)#(\d+)$/.exec(ref || "");
    if (!m) H.die('which pull request? thread board ready <owner/repo#n> "<what it changes>" [--after <owner/repo#n,...>] [--deploy "<what>"]');
    const text = pos.slice(1).join(" ").trim();
    if (!text) H.die(`say in one line what ${ref} changes`);
    const to = typeof flags.to === "string" ? flags.to : `master:${m[2].toLowerCase()}`;
    const p = commands.post([text], { ...flags, as: who, to, ref, kind: "ready", deploy: typeof flags.deploy === "string" ? flags.deploy : "nothing" });
    const state = replay(readBoard());
    const entries = queue(state).filter((e) => e.to.includes(nameArg(to, "--to")));
    const at = entries.findIndex((e) => e.ref === ref);
    const holder = state.claims.get(`role:${nameArg(to, "--to")}`);
    console.log(`${ref} is ${at + 1} of ${entries.length} in ${to}'s merge queue${entries[at]?.blockedBy.length ? `, after ${entries[at].blockedBy.join(", ")}` : ""}.${holder && state.live(holder) ? ` ${holder.who} holds ${to}.` : ` Nobody holds ${to} now; it will see this when a chat takes the role.`}`);
    return p;
  },

  queue(pos, flags) {
    const state = replay(readBoard());
    const who = me(flags, { required: false });
    let roles = typeof flags.to === "string" ? [nameArg(flags.to, "--to")] : who ? state.rolesOf(who) : [];
    const all = queue(state);
    if (!roles.length) roles = [...new Set(all.flatMap((e) => e.to))];
    if (flags.json) return console.log(JSON.stringify(all.filter((e) => e.to.some((r) => roles.includes(r))).map((e) => ({ ref: e.ref, to: e.to, post: e.latest.id, from: e.latest.from, text: e.latest.text, deploy: e.latest.deploy, after: e.after, blockedBy: e.blockedBy, merging: e.merging })), null, 2));
    if (!roles.length) return console.log("No merge queue: nothing is waiting to merge.");
    for (const role of roles) {
      const entries = all.filter((e) => e.to.includes(role));
      if (!entries.length) {
        console.log(`${role}: nothing waiting to merge.`);
        continue;
      }
      const { out, next } = queueLines(state, entries);
      console.log(`Merge queue for ${role} (${entries.length}):`, "\n" + out.join("\n"));
      if (next) console.log(`Next: ${next.ref}. thread board merging ${next.ref}, merge it, bring the base into the next one, then thread board merged ${next.ref} "<what merged and deployed>".`);
    }
  },

  merging(pos, flags) {
    const e = entryFor(replay(readBoard()), pos[0]);
    if (e.blockedBy.length) H.die(`${e.ref} waits for ${e.blockedBy.join(", ")}: merge ${e.blockedBy.length > 1 ? "those" : "that"} first`);
    return commands.ack([e.latest.id, "accepted", ...pos.slice(1)], flags);
  },

  merged(pos, flags) {
    const e = entryFor(replay(readBoard()), pos[0]);
    if (!pos.slice(1).join(" ").trim()) H.die(`say what merged and what was deployed: thread board merged ${e.ref} "<squash commit, deployed X>"`);
    return commands.ack([e.latest.id, "done", ...pos.slice(1)], flags);
  },

  ack(pos, flags) {
    const who = me(flags);
    const [id, maybeState, ...rest] = pos;
    const state = STATES.includes(maybeState) ? maybeState : "seen";
    const note = (STATES.includes(maybeState) ? rest : [maybeState, ...rest]).filter(Boolean).join(" ").trim() || undefined;
    const s = replay(readBoard());
    const p = s.posts.get(id);
    if (!p) H.die(`no post ${id} on the board`);
    if ((state === "done" || state === "declined") && !note) H.die(`say what happened: thread board ${state === "done" ? "done" : "decline"} ${id} "<result or why>"`);
    // An acknowledgement goes beside its post, so everyone who reads the post reads it.
    write({ type: "ack", from: who, post: id, state, note }, p._source);
    // Finishing an open call lets its claim go, and done closes its task in the tree. A decline
    // by the agent that took it only lets it go, so another agent can take it.
    const c = s.claims.get(keyOf(p));
    if ((state === "done" || state === "declined") && c && c.who === who) write({ type: "release", from: who, key: keyOf(p) }, p._source);
    if (state === "done" && p.task) H.closeThread(p.task, "done", note);
    save(`${who} ${state} ${id}`);
    console.log(`${id} ${state}${note ? `: ${note}` : ""}`);
  },

  accept: (pos, flags) => commands.ack([pos[0], "accepted", ...pos.slice(1)], flags),
  done: (pos, flags) => commands.ack([pos[0], "done", ...pos.slice(1)], flags),
  decline: (pos, flags) => commands.ack([pos[0], "declined", ...pos.slice(1)], flags),

  inbox(pos, flags) {
    const who = me(flags);
    const state = replay(readBoard());
    const { forMe, open } = inbox(state, who);
    if (flags.json) return console.log(JSON.stringify({ for: forMe.map(toJson), open: open.map(toJson) }, null, 2));
    if (!forMe.length && !open.length) return console.log(`${who}: nothing unread.`);
    if (forMe.length) console.log(`For ${who} (${forMe.length}):`);
    for (const p of forMe) console.log("  " + line(p));
    if (open.length) console.log(`Open calls (${open.length}):`);
    for (const p of open) console.log("  " + line(p));
  },

  read(pos, flags) {
    let events = readBoard();
    if (flags.all) events = [...readArchive().map((e) => ({ ...e, _rel: e.src })), ...events];
    const state = replay(events);
    const scope = viewScope(state, flags);
    const days = flags.all ? Infinity : Number(flags.days ?? 3);
    const since = Date.now() - days * 86400e3;
    let rows = [...state.posts.values()].filter((p) => inScope(scope, p._source) && (Date.parse(p.ts) >= since || p.acks.some((a) => Date.parse(a.ts) >= since)));
    if (typeof flags.on === "string") rows = rows.filter((p) => p.on === flags.on);
    if (typeof flags.ref === "string") rows = rows.filter((p) => p.ref === flags.ref);
    if (typeof flags.from === "string") rows = rows.filter((p) => p.from === nameArg(flags.from, "--from"));
    if (typeof flags.to === "string") rows = rows.filter((p) => p.to.includes(nameArg(flags.to, "--to")));
    if (typeof flags.kind === "string") rows = rows.filter((p) => p.kind === flags.kind);
    rows = rows.slice(-Number(flags.limit ?? 30));
    if (flags.json) return console.log(JSON.stringify(rows.map(toJson), null, 2));
    if (!rows.length) return console.log("Nothing on the board for that.");
    for (const p of rows) {
      console.log(line(p) + (p.retracted ? "\n    (retracted)" : ""));
      for (const a of p.acks) console.log(ackLine(a));
      for (const f of p.filed) console.log(fileLine(f));
    }
  },

  sent(pos, flags) {
    const who = me(flags);
    const state = replay(readBoard());
    const rows = [...state.posts.values()].filter((p) => p.from === who || (who === "user" && p.relayed));
    if (!rows.length) return console.log(`${who} has posted nothing still on the board.`);
    for (const p of rows.slice(-Number(flags.limit ?? 30))) {
      console.log(line(p));
      if (p.superseded) console.log(`    ↳ superseded by ${p.superseded}`);
      else if (!p.acks.length && !p.filed.length) console.log(p.kind === "dump" ? "    ↳ not yet filed" : "    ↳ not yet acknowledged");
      for (const a of p.acks) console.log(ackLine(a));
      for (const f of p.filed) console.log(fileLine(f));
    }
  },

  who(pos, flags) {
    const state = replay(readBoard());
    const scope = viewScope(state, flags);
    const agents = state.present.filter((a) => inScope(scope, a.hello.scope));
    if (flags.json) return console.log(JSON.stringify(agents.map((a) => ({ handle: a.handle, ...strip(a.hello), roles: state.rolesOf(a.handle), holds: state.holding(a.handle).map((c) => c.key), last: a.last })), null, 2));
    if (!agents.length) return console.log("No agent is on the board now.");
    for (const a of agents) console.log(agentLine(state, a));
  },

  claim(pos, flags) {
    const who = me(flags);
    let key = pos[0];
    if (!key) H.die("claim what? thread board claim <activity, thread, post or any key> --as <handle>");
    const post = replay(readBoard()).posts.get(pos[0]);
    if (post?.task) key = post.task;
    const r = claim(key, who, flags, LEASE.claim);
    if (r.held) console.log(`🔒 ${who} holds ${key} ${until(r.holder.until)}${r.pushed === false ? " (NOT PUSHED: not yours until it is)" : ""}`);
    else {
      console.log(`✋ ${key} is held by ${r.holder.who} ${until(r.holder.until)}${r.holder.note ? ` (${r.holder.note})` : ""}. Leave it, or ask: thread board post --to ${r.holder.who} ...`);
      process.exitCode = 2;
    }
  },

  release(pos, flags) {
    const who = me(flags);
    const key = pos[0];
    if (!key) H.die("release what? thread board release <key> --as <handle>");
    const state = replay(readBoard());
    const c = state.claims.get(key);
    if (!c) return console.log(`${key} is not held.`);
    if (c.who !== who && !flags.take) H.die(`${key} is held by ${c.who}, not ${who}; --take releases it anyway`);
    write({ type: "release", from: who, key, take: c.who !== who ? true : undefined, note: typeof flags.note === "string" ? flags.note : undefined }, homeFor(state, who, flags));
    save(`${who} releases ${key}`);
    console.log(`🔓 ${key} released`);
  },

  role(pos, flags) {
    const who = me(flags);
    if (!pos[0]) return commands.roles(pos, flags);
    const role = nameArg(pos.join(""), "a role");
    if (flags.release) return commands.release([`role:${role}`], flags);
    const r = claim(`role:${role}`, who, { ...flags, for: flags.for ?? LEASE.role }, LEASE.role);
    if (r.held) console.log(`🎖 ${who} is ${role} ${until(r.holder.until)}. Messages to ${role} now reach this chat.`);
    else {
      console.log(`✋ ${role} is held by ${r.holder.who} ${until(r.holder.until)}. If ${r.holder.who} is gone and the user agrees, rerun with --take.`);
      process.exitCode = 2;
    }
  },

  roles() {
    const state = replay(readBoard());
    const rows = [...state.claims.values()].filter((c) => c.key.startsWith("role:"));
    if (!rows.length) return console.log("No roles held.");
    for (const c of rows) console.log(`${c.key.slice(5)} · ${c.who} · ${state.live(c) ? until(c.until) : `free (${until(c.until)})`}`);
  },

  locks(pos, flags) {
    const state = replay(readBoard());
    const rows = [...state.claims.values()].filter((c) => !c.key.startsWith("role:"));
    if (flags.json) return console.log(JSON.stringify(rows.map((c) => ({ ...c, live: state.live(c) })), null, 2));
    if (!rows.length) return console.log("Nothing is claimed.");
    for (const c of rows) {
      console.log(`${state.live(c) ? "🔒" : "·"} ${c.key} · ${c.who} · ${state.live(c) ? until(c.until) : `stale, ${until(c.until)}`}${c.note ? ` · ${c.note}` : ""}${c.took ? ` · taken from ${c.took}` : ""}`);
      for (const l of c.lost) console.log(`    ✋ ${l.who} lost the race ${ago(l.ts)}`);
    }
  },

  retract(pos, flags) {
    const who = me(flags);
    const p = replay(readBoard()).posts.get(pos[0]);
    if (!p) H.die(`no post ${pos[0]} on the board`);
    write({ type: "retract", from: who, post: p.id }, p._source);
    save(`${who} retracts ${p.id}`);
    console.log(`${p.id} retracted`);
  },

  renew(pos, flags) {
    const who = me(flags);
    const n = renewAll(replay(readBoard()), who);
    if (n) save(`${who} renews ${n} lease(s)`);
    console.log(n ? `renewed ${n} lease(s) for ${who}` : `${who}: nothing due for renewal`);
  },

  bye(pos, flags) {
    const who = me(flags);
    write({ type: "bye", from: who, note: pos.join(" ").trim() || undefined }, homeOf(scopeOf(replay(readBoard()), who)));
    save(`${who} leaves`);
    console.log(`${who} has left the board; its roles and claims are free.`);
  },

  wait(pos, flags) {
    const who = me(flags);
    const timeout = duration(flags.timeout, "30m");
    const every = duration(flags.every, "1m");
    const end = Date.now() + timeout;
    for (;;) {
      const state = replay(readBoard());
      const { forMe, open } = inbox(state, who);
      if (forMe.length || open.length) return commands.inbox(pos, { ...flags, as: who });
      if (renewAll(state, who)) save(`${who} renews its leases while waiting`);
      if (Date.now() + every > end) break;
      sleep(every);
      H.pull();
    }
    console.log(`${who}: nothing new in ${Math.round(timeout / 60e3)}m.`);
    process.exitCode = 3;
  },

  prune(pos, flags) {
    const r = prune(readBoard(), Number(flags.days ?? 7), flags["dry-run"]);
    if (flags["dry-run"]) return console.log(`would archive ${r.moved} settled board file(s)`);
    if (!r.files.length) return console.log("Nothing settled to archive.");
    save(`prune ${r.moved} settled file(s)`);
    console.log(`archived ${r.moved} settled board file(s) to ${r.files.join(", ")}`);
  },

  help() {
    console.log(`thread board — messages, instructions, roles, claims and merge order between agents, in the threads store

  thread board start [--as <h>] [--source <path>] [--role <r>] [--tool <t>] [--thread <id>] [--note "..."]
                                     join (a new handle unless --as), take roles, print the briefing
  thread board start --hook          the briefing without joining or writing (for a session-start hook)
  thread board status [--source <path|all>]   who is working on what, merge queues, what waits, open threads
  thread board post "<text>" --to <h|role|*|any|repo:name> [--on <thread>] [--ref <ref>]
                         [--kind instruction|question|info|ready|standing|answer] [--for-user]
  thread board reply <post> "<text>"
  thread board inbox                 unread for this handle and its roles, and what reaches its scope
  thread board accept|done|decline <post> ["<note>"]   (ack <post> <state> also works)
  thread board dump "<anything>" | -  capture for the curator to file (stdin with -); --as optional, default user
  thread board triage                the curator's list: unfiled dumps, what was asked, where each might go
  thread board file <post> --is <chore|task|bug|feature|improvement|idea|note|reflection|duplicate|drop>
                         [--under <thread>] [--plan <activity or task>] [--title "..."] [--into <thread>] [--of <id>] [--more]
  thread board ask <post> "<question>"   ask the post's author, when it is unclear
  thread board tidy                  the curator's sweep: unfiled, unanswered, unlinked, orphaned, doubled
  thread board next [--claim] [--list] [--limit 5]   what to do next, best first; --claim takes the best
                                     open task (racing safely); --list is the dispatcher's view of the scope
  thread board ready <owner/repo#n> "<what it changes>" [--to <role>] [--after <refs>] [--deploy "<what>"]
                                     join the merge queue (default role master:<repo>)
  thread board queue [--to <role>]   the merge queue, in order, with what waits for what
  thread board merging|merged <owner/repo#n> ["<note>"]          for the role that merges
  thread board read [--on <id>] [--ref <ref>] [--from <h>] [--to <x>] [--kind <k>] [--days 3] [--all]
  thread board sent                  what this handle posted, and who acknowledged it
  thread board who                   agents working now in this scope, their roles and claims
  thread board claim <key> [--for 1h] [--note "..."] [--take]    exit 2 when someone else holds it
  thread board release <key>
  thread board role [<name>] [--release] [--take]               roles, or take one (8h, renewable)
  thread board locks | roles
  thread board renew                 renew this handle's presence, roles and claims due within 20m
  thread board wait [--timeout 30m] [--every 1m]                block until something arrives (exit 3 if not)
  thread board retract <post>        withdraw a post, such as a standing order
  thread board bye                   leave: presence, roles and claims end
  thread board prune [--days 7] [--dry-run]

  Every command that speaks for an agent takes --as <handle>, or $BOARD_AS. --to takes a comma list.
  A scope is a source path: patternode sees patternode/platform and patternode/business too. Claims
  and roles hold across the whole store; posts by hand are .md files with front matter.`);
  },
};

// ---------------------------------------------------------------- entry points

/** Run `thread board <command>`; helpers come from thread.mjs. */
export function runBoard(pos, flags, helpers) {
  H = helpers;
  const cmd = pos.shift() ?? "start";
  if (["help", "-h"].includes(cmd) || flags.help) return commands.help();
  if (!commands[cmd]) H.die(`unknown board command "${cmd}". Try: thread board help`);
  commands[cmd](pos, flags);
  if (WRITES.has(cmd) && !flags.hook) autoPrune();
}

/** Live claims on threads, for the tree: thread id -> handle. */
export function holders(helpers) {
  H = helpers;
  const state = replay(readBoard());
  return new Map([...state.claims.values()].filter((c) => state.live(c) && /^t-[0-9a-z]+$/.test(c.key)).map((c) => [c.key, c.who]));
}

/** When a thread closes, its claim ends: a release written beside the thread, committed with the close. */
export function releaseOnClose(helpers, id) {
  H = helpers;
  const state = replay(readBoard());
  const c = state.claims.get(id);
  if (!c || !state.live(c)) return;
  write({ type: "release", from: c.who, key: id, take: true, note: "thread closed" }, homeOf(H.SCOPE));
}

/** Posts on a thread, oldest first, for `thread show`: [{ id, kind, from, to, text, ts, acks }]. */
export function postsOn(helpers, id) {
  H = helpers;
  return [...replay(readBoard()).posts.values()].filter((p) => p.on === id && !p.retracted);
}
