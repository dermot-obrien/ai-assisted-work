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
 * thread.mjs runs this for `thread board <command>` and hands it the store helpers, so the
 * two share one clone, one source and one push. Zero dependencies; Node 18+.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

// Leases. An agent's presence, a role and a claim each last this long unless renewed.
// A claim matches an agent's activity lock in aaw-progress-work (one hour).
const LEASE = { hello: "8h", role: "8h", claim: "1h" };
const KINDS = ["instruction", "question", "info", "ready", "standing", "answer"];
const STATES = ["seen", "accepted", "done", "declined"];
// Kinds that wait on someone: they stay in the inbox until acknowledged, and are not
// pruned until done or declined.
const PENDING = new Set(["instruction", "question", "ready"]);

let H; // helpers from thread.mjs: { STORE, HOME, SOURCE, git, tryGit, commitAndPush, pull, context, die, warn }

// ---------------------------------------------------------------- small things

const boardDir = (home = H.HOME) => path.join(home, "board");
const archiveDir = (home = H.HOME) => path.join(home, "board-archive");
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
function readMarkdown(file, rel) {
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
    id: "p-" + createHash("sha1").update(rel).digest("hex").slice(0, 6),
    ts: ts || new Date(0).toISOString(),
    host: "by-hand",
    from: head.from ? nameArg(head.from, "from:") : "user",
    to: list(head.to || "*").map((t) => nameArg(t, "to:")),
    on: head.on || null,
    ref: head.ref || null,
    kind: KINDS.includes(head.kind) ? head.kind : "instruction",
    text,
    _md: true,
  };
}

/** Every live board file, in the order git first recorded it; files not yet committed come last, by time. */
function readBoard(home = H.HOME) {
  const dir = boardDir(home);
  const out = [];
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(home, p).split(path.sep).join("/");
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".json")) {
        try {
          out.push({ ...JSON.parse(readFileSync(p, "utf8")), _file: p, _rel: rel });
        } catch {
          H.warn(`skipping unreadable board file ${rel}`);
        }
      } else if (e.name.endsWith(".md") && e.name.toLowerCase() !== "readme.md") {
        const post = readMarkdown(p, rel);
        if (post) out.push({ ...post, _file: p, _rel: rel });
      }
    }
  };
  walk(dir);
  const order = commitOrder(dir);
  const at = (e) => order.get(path.resolve(e._file)) ?? Infinity;
  return out.sort((a, b) => at(a) - at(b) || (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a._file < b._file ? -1 : 1));
}

/** Absolute path -> its place in the order the store's history first added it. */
function commitOrder(dir) {
  const order = new Map();
  const relDir = path.relative(H.STORE, dir).split(path.sep).join("/") || ".";
  const r = H.tryGit(["-c", "core.quotepath=off", "log", "--reverse", "--diff-filter=A", "--name-only", "--format=", "--", relDir]);
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

function readArchive(home = H.HOME) {
  const dir = archiveDir(home);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".jsonl")).sort()) {
    for (const line of readFileSync(path.join(dir, f), "utf8").split("\n")) {
      if (line.trim()) try { out.push(JSON.parse(line)); } catch { /* skip */ }
    }
  }
  return out;
}

// ---------------------------------------------------------------- state

/**
 * Replay the board: posts with their acknowledgements, who is present, and who holds what.
 * Claims are taken in file order (the order git recorded them), so every reader agrees.
 */
function replay(events, now = Date.now()) {
  const posts = new Map();
  const agents = new Map();
  const claims = new Map(); // key -> { who, until, since, note, lost: [] }
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
        posts.set(e.id, { ...e, acks: [] });
        break;
      case "ack": {
        const p = posts.get(e.post);
        if (p) p.acks.push(e);
        break;
      }
      case "retract":
        retracted.add(e.post);
        break;
      case "hello":
        agents.get(e.from).hello = e;
        break;
      case "bye": {
        const a = agents.get(e.from);
        a.hello = null;
        for (const [k, c] of claims) if (c.who === e.from) claims.delete(k);
        break;
      }
      case "claim": {
        const c = claims.get(e.key);
        const free = !c || Date.parse(c.until) < Date.parse(e.ts);
        if (c && c.who === e.from) Object.assign(c, { until: e.until, note: e.note ?? c.note });
        else if (free || e.take) claims.set(e.key, { key: e.key, who: e.from, until: e.until, since: e.ts, note: e.note || null, took: c && !free ? c.who : null, lost: [] });
        else c.lost.push({ who: e.from, ts: e.ts, file: e._rel });
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
  const live = (c) => Date.parse(c.until) > now;
  const holding = (who) => [...claims.values()].filter((c) => c.who === who && live(c));
  const rolesOf = (who) => holding(who).filter((c) => c.key.startsWith("role:")).map((c) => c.key.slice(5));
  const present = [...agents.values()].filter((a) => a.hello && Date.parse(a.hello.until) > now);
  return { posts, agents, claims, live, holding, rolesOf, present };
}

/** What a handle listens on: itself, its roles, everyone, its repository, and the threads it follows. */
function audience(state, who) {
  const a = state.agents.get(who);
  const hello = a?.hello;
  const names = new Set([who, "*", ...state.rolesOf(who)]);
  if (hello?.ctx) names.add(`repo:${hello.ctx}`);
  const threads = new Set(hello?.threads || []);
  for (const c of state.holding(who)) if (/^t-[0-9a-z]+$/.test(c.key)) threads.add(c.key);
  return { names, threads };
}

const ackedBy = (p, who) => p.acks.some((a) => a.from === who);
const finished = (p) => p.acks.some((a) => a.state === "done" || a.state === "declined");

/** Unread posts for a handle: addressed to it, or on a thread it follows, or replies to it; and open calls. */
function inbox(state, who) {
  const { names, threads } = audience(state, who);
  const mine = new Set([...state.posts.values()].filter((p) => p.from === who).map((p) => p.id));
  const forMe = [];
  const open = [];
  for (const p of state.posts.values()) {
    if (p.from === who || p.retracted || ackedBy(p, who)) continue;
    const addressed = p.to.some((t) => names.has(t)) || (p.on && threads.has(p.on)) || (p.reply && mine.has(p.reply));
    if (addressed) forMe.push(p);
    else if (p.to.includes("any") && !finished(p)) {
      const c = state.claims.get(p.id);
      if (!c || !state.live(c) || c.who === who) open.push(p);
    }
  }
  return { forMe, open };
}

const standing = (state) => [...state.posts.values()].filter((p) => p.kind === "standing" && !p.retracted);

// ---------------------------------------------------------------- writing

function newPostId(events) {
  const taken = new Set([...events, ...readArchive()].map((e) => e.id).filter(Boolean));
  for (;;) {
    const id = "p-" + randomBytes(3).readUIntBE(0, 3).toString(36).padStart(4, "0").slice(-4);
    if (!taken.has(id)) return id;
  }
}

function write(ev) {
  const ts = new Date().toISOString();
  const dir = path.join(boardDir(), localDay());
  mkdirSync(dir, { recursive: true });
  const full = { ts, host: host(), ...ev };
  writeFileSync(path.join(dir, `${stampOf(ts)}-${host()}-${randomBytes(3).toString("hex")}.json`), JSON.stringify(full, null, 2) + "\n");
  return full;
}

/** Write, commit and push; say so when it did not reach the remote. */
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
  bits.push(ago(p.ts));
  return `${p.id} · ${bits.join(" · ")}\n    ${p.text.replace(/\n/g, "\n    ")}`;
}

function ackLine(a) {
  return `    ↳ ${a.state} by ${a.from} ${ago(a.ts)}${a.note ? `: ${a.note}` : ""}`;
}

const toJson = (p) => {
  const { _file, _rel, _md, ...rest } = p;
  return rest;
};

function anchorOf(state, who, ctx) {
  const roles = state.rolesOf(who);
  return `📋 ${who}${roles.length ? ` · ${roles.join(", ")}` : ""} · ${ctx}`;
}

/** The briefing a new agent reads: who it is, standing orders, what is for it, what it holds, who is about. */
function brief(state, who, ctx, { hook = false } = {}) {
  const out = [];
  if (who) {
    out.push(anchorOf(state, who, ctx));
    out.push(`Keep this handle for the whole chat: pass --as ${who} to every board command (or set BOARD_AS=${who}).`);
  } else {
    out.push(`📋 board · ${ctx}`);
    out.push("Join it with `thread board start` (add --role <name> if the user named one); it gives this chat a handle.");
  }
  const orders = standing(state);
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
      out.push("", `Open to any agent (${open.length}); claim one before starting it:`);
      for (const p of open) out.push("  " + line(p));
    }
    const held = state.holding(who).filter((c) => !c.key.startsWith("role:"));
    if (held.length) out.push("", `You hold: ${held.map((c) => `${c.key} (${until(c.until)})`).join(", ")}`);
  } else {
    const loose = [...state.posts.values()].filter((p) => !p.retracted && p.kind !== "standing" && (p.to.includes("*") || p.to.includes("any") || p.to.includes(`repo:${ctx}`)) && !finished(p));
    if (loose.length) {
      out.push("", `For every agent here (${loose.length}):`);
      for (const p of loose.slice(-10)) out.push("  " + line(p));
    }
  }
  const others = state.present.filter((a) => a.handle !== who);
  if (others.length) {
    out.push("", `Around (${others.length}):`);
    for (const a of others) out.push("  " + agentLine(state, a));
  }
  if (who && !hook) {
    out.push(
      "",
      "Next: act on instructions first (ack accepted, then done with the result); answer questions;",
      "then take an open call or the next piece of work, claiming it before you start.",
    );
  }
  return out.join("\n");
}

function agentLine(state, a) {
  const h = a.hello || {};
  const roles = state.rolesOf(a.handle);
  const held = state.holding(a.handle).filter((c) => !c.key.startsWith("role:")).map((c) => c.key);
  const bits = [a.handle];
  if (h.tool) bits.push(h.tool);
  if (h.ctx) bits.push(h.ctx);
  if (roles.length) bits.push(`roles ${roles.join(", ")}`);
  if (held.length) bits.push(`holds ${held.join(", ")}`);
  bits.push(`seen ${ago(a.last)}`);
  return bits.join(" · ") + (h.note ? `\n    ${h.note}` : "");
}

// ---------------------------------------------------------------- claims

/** Claim a key and push, then read back who holds it. A claim counts only once it is pushed. */
function claim(key, who, flags, defaultLease) {
  const before = replay(readBoard());
  const c = before.claims.get(key);
  if (c && before.live(c) && c.who !== who && !flags.take) {
    return { held: false, holder: c };
  }
  write({ type: "claim", from: who, key, until: later(duration(flags.for, defaultLease)), take: flags.take ? true : undefined, note: typeof flags.note === "string" ? flags.note : undefined });
  const pushed = save(`${who} claims ${key}`);
  const after = replay(readBoard());
  const now = after.claims.get(key);
  return { held: now?.who === who, holder: now, pushed };
}

function renewAll(state, who) {
  const soon = Date.now() + 20 * 60e3;
  let n = 0;
  for (const c of state.holding(who)) {
    if (Date.parse(c.until) > soon) continue;
    write({ type: "claim", from: who, key: c.key, until: later(duration(null, c.key.startsWith("role:") ? LEASE.role : LEASE.claim)) });
    n++;
  }
  const a = state.agents.get(who);
  if (a?.hello && Date.parse(a.hello.until) <= soon) {
    const { ts, host: _h, ...hello } = strip(a.hello);
    write({ ...hello, until: later(duration(null, LEASE.hello)) });
    n++;
  }
  return n;
}

const strip = (e) => {
  const { _file, _rel, ...rest } = e;
  return rest;
};

// ---------------------------------------------------------------- prune

/**
 * Move old, settled board files to board-archive/, one new JSON Lines file per prune.
 * Kept: anything newer than the cutoff, standing orders not retracted, posts still waiting
 * on someone (with everything said about them), live presence, and every file for a claim
 * that is still held.
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
      case "ack": case "retract": return keepPost.has(e.post) || (e.ts >= cutoff && !state.posts.has(e.post));
      case "hello": return lastHello.get(e.from) === e && (Date.parse(e.until) > Date.now() || e.ts >= cutoff);
      case "claim": case "release": return liveKeys.has(e.key) || e.ts >= cutoff;
      default: return e.ts >= cutoff;
    }
  };
  const moving = events.filter((e) => !keep(e));
  if (!moving.length || dry) return { moved: moving.length, file: null };
  const ts = new Date().toISOString();
  mkdirSync(archiveDir(), { recursive: true });
  const name = `${stampOf(ts)}-${host()}-${randomBytes(3).toString("hex")}.jsonl`;
  writeFileSync(path.join(archiveDir(), name), moving.map((e) => JSON.stringify({ src: e._rel, ...toJson(e) })).join("\n") + "\n");
  for (const e of moving) rmSync(e._file, { force: true });
  return { moved: moving.length, file: `board-archive/${name}` };
}

/** Prune by itself at the first board write of a day, keeping a week. BOARD_AUTO_PRUNE=0 turns it off. */
function autoPrune() {
  if (process.env.BOARD_AUTO_PRUNE === "0" || process.env.THREADS_AUTO_PRUNE === "0") return;
  const dir = archiveDir();
  const names = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort() : [];
  const m = names.length && /^(\d{4})(\d{2})(\d{2})T/.exec(names[names.length - 1]);
  const today = localDay().replace(/-/g, "");
  if (m && `${m[1]}${m[2]}${m[3]}` >= today) return;
  const r = prune(readBoard(), 7, false);
  if (r.file) {
    save(`prune ${r.moved} settled file(s) to ${r.file}`);
    console.log(`(board: archived ${r.moved} settled file(s) older than a week to ${r.file})`);
  }
}

// ---------------------------------------------------------------- commands

const WRITES = new Set(["start", "post", "reply", "ack", "accept", "done", "decline", "claim", "release", "role", "retract", "renew", "bye"]);

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
    write({
      type: "hello",
      from: who,
      tool: typeof flags.tool === "string" ? flags.tool : undefined,
      ctx,
      threads: list(flags.thread),
      note: typeof flags.note === "string" ? flags.note : undefined,
      until: later(duration(null, LEASE.hello)),
    });
    save(`${who} joins from ${ctx}`);
    for (const r of list(flags.role)) {
      const role = nameArg(r, "a role");
      const got = claim(`role:${role}`, who, { ...flags, for: flags.for ?? LEASE.role, note: undefined }, LEASE.role);
      if (!got.held) console.log(`(role ${role} is held by ${got.holder.who} ${until(got.holder.until)}; not taken. If ${got.holder.who} is gone, rerun with --take)`);
    }
    state = replay(readBoard());
    console.log(brief(state, who, ctx));
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
    const p = write({
      type: "post",
      id: newPostId(events),
      from: who,
      to,
      on: typeof flags.on === "string" ? flags.on : null,
      ref: typeof flags.ref === "string" ? flags.ref : null,
      kind,
      reply: typeof flags.reply === "string" ? flags.reply : null,
      relayed: flags["for-user"] ? true : undefined,
      text,
    });
    save(`${who} posts ${p.id} (${kind}) to ${to.join(", ") || p.on}`);
    console.log(`📮 ${p.id} · ${kind} → ${[...to, ...(p.on ? [`on ${p.on}`] : [])].join(", ")}`);
  },

  reply(pos, flags) {
    const who = me(flags);
    const state = replay(readBoard());
    const orig = state.posts.get(pos[0]);
    if (!orig) H.die(`no post ${pos[0]} on the board`);
    const answerTo = orig.relayed ? "user" : orig.from;
    commands.post(pos.slice(1), { ...flags, as: who, to: answerTo, on: orig.on ?? undefined, ref: orig.ref ?? undefined, reply: orig.id, kind: flags.kind ?? "answer" });
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
    write({ type: "ack", from: who, post: id, state, note });
    save(`${who} ${state} ${id}`);
    // Finishing an open call lets its claim go.
    if (state === "done" || state === "declined") {
      const c = s.claims.get(id);
      if (c && c.who === who) {
        write({ type: "release", from: who, key: id });
        save(`${who} releases ${id}`);
      }
    }
    console.log(`${id} ${state}${note ? `: ${note}` : ""}`);
  },

  accept: (pos, flags) => commands.ack([pos[0], "accepted", ...pos.slice(1)], flags),
  done: (pos, flags) => commands.ack([pos[0], "done", ...pos.slice(1)], flags),
  decline: (pos, flags) => commands.ack([pos[0], "declined", ...pos.slice(1)], flags),

  inbox(pos, flags) {
    const who = me(flags);
    const state = replay(readBoard());
    const { forMe, open } = inbox(state, who);
    if (flags.json) {
      console.log(JSON.stringify({ for: forMe.map(toJson), open: open.map(toJson) }, null, 2));
      return;
    }
    if (!forMe.length && !open.length) {
      console.log(`${who}: nothing unread.`);
      return;
    }
    if (forMe.length) console.log(`For ${who} (${forMe.length}):`);
    for (const p of forMe) console.log("  " + line(p));
    if (open.length) console.log(`Open to any agent (${open.length}):`);
    for (const p of open) console.log("  " + line(p));
  },

  read(pos, flags) {
    let events = readBoard();
    if (flags.all) events = [...readArchive().map((e) => ({ ...e, _rel: e.src })), ...events];
    const state = replay(events);
    const days = flags.all ? Infinity : Number(flags.days ?? 3);
    const since = Date.now() - days * 86400e3;
    let rows = [...state.posts.values()].filter((p) => Date.parse(p.ts) >= since || p.acks.some((a) => Date.parse(a.ts) >= since));
    if (typeof flags.on === "string") rows = rows.filter((p) => p.on === flags.on);
    if (typeof flags.ref === "string") rows = rows.filter((p) => p.ref === flags.ref);
    if (typeof flags.from === "string") rows = rows.filter((p) => p.from === nameArg(flags.from, "--from"));
    if (typeof flags.to === "string") rows = rows.filter((p) => p.to.includes(nameArg(flags.to, "--to")));
    if (typeof flags.kind === "string") rows = rows.filter((p) => p.kind === flags.kind);
    rows = rows.slice(-Number(flags.limit ?? 30));
    if (flags.json) {
      console.log(JSON.stringify(rows.map(toJson), null, 2));
      return;
    }
    if (!rows.length) {
      console.log("Nothing on the board for that.");
      return;
    }
    for (const p of rows) {
      console.log(line(p) + (p.retracted ? "\n    (retracted)" : ""));
      for (const a of p.acks) console.log(ackLine(a));
    }
  },

  sent(pos, flags) {
    const who = me(flags);
    const state = replay(readBoard());
    const rows = [...state.posts.values()].filter((p) => p.from === who || (who === "user" && p.relayed));
    if (!rows.length) {
      console.log(`${who} has posted nothing still on the board.`);
      return;
    }
    for (const p of rows.slice(-Number(flags.limit ?? 30))) {
      console.log(line(p));
      if (!p.acks.length) console.log("    ↳ not yet acknowledged");
      for (const a of p.acks) console.log(ackLine(a));
    }
  },

  who(pos, flags) {
    const state = replay(readBoard());
    if (flags.json) {
      console.log(JSON.stringify(state.present.map((a) => ({ handle: a.handle, ...strip(a.hello), roles: state.rolesOf(a.handle), holds: state.holding(a.handle).map((c) => c.key), last: a.last })), null, 2));
      return;
    }
    if (!state.present.length) {
      console.log("No agent is on the board now.");
      return;
    }
    for (const a of state.present) console.log(agentLine(state, a));
  },

  claim(pos, flags) {
    const who = me(flags);
    const key = pos[0];
    if (!key) H.die("claim what? thread board claim <activity, thread, post or any key> --as <handle>");
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
    const c = replay(readBoard()).claims.get(key);
    if (!c) return console.log(`${key} is not held.`);
    if (c.who !== who && !flags.take) H.die(`${key} is held by ${c.who}, not ${who}; --take releases it anyway`);
    write({ type: "release", from: who, key, take: c.who !== who ? true : undefined, note: typeof flags.note === "string" ? flags.note : undefined });
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

  roles(pos, flags) {
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
    write({ type: "retract", from: who, post: p.id });
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
    write({ type: "bye", from: who, note: pos.join(" ").trim() || undefined });
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
      if (forMe.length || open.length) {
        commands.inbox(pos, { ...flags, as: who });
        return;
      }
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
    if (!r.file) return console.log("Nothing settled to archive.");
    save(`prune ${r.moved} settled file(s) to ${r.file}`);
    console.log(`archived ${r.moved} settled board file(s) to ${r.file}`);
  },

  help() {
    console.log(`thread board — messages, instructions, roles and claims between agents, in the threads store

  thread board start [--as <h>] [--role <r>] [--tool <t>] [--thread <id>] [--note "..."]
                                     join (a new handle unless --as), take roles, print the briefing
  thread board start --hook          the briefing without joining or writing (for a session-start hook)
  thread board post "<text>" --to <h|role|*|any|repo:name> [--on <thread>] [--ref <WI-..>]
                         [--kind instruction|question|info|ready|standing|answer] [--for-user]
  thread board reply <post> "<text>"
  thread board inbox                 unread posts for this handle, its roles, its repo and threads
  thread board accept|done|decline <post> ["<note>"]   (ack <post> <state> also works)
  thread board read [--on <id>] [--ref <ref>] [--from <h>] [--to <x>] [--kind <k>] [--days 3] [--all]
  thread board sent                  what this handle posted, and who acknowledged it
  thread board who                   agents on the board now, their roles and claims
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
  The board lives in board/ of the selected source; posts by hand are .md files with front matter.`);
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

/** Posts on a thread, newest last, for `thread show`: [{ id, kind, from, text, ts, acks }]. */
export function postsOn(helpers, id) {
  H = helpers;
  if (!existsSync(boardDir())) return [];
  return [...replay(readBoard()).posts.values()].filter((p) => p.on === id && !p.retracted);
}
