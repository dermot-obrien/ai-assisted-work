#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * thread — a throwaway tree of intents, shared across machines, tools and chats.
 *
 * The store is a git repo (default ~/.threads). Every action writes one new,
 * never-edited JSON file under events/, so any number of machines and agents can
 * pull, write and push without ever producing a merge conflict. The tree, and
 * every node's state, is derived by replaying the events in time order.
 *
 * Closed branches are pruned into archive/, one new JSON Lines file per prune, so the
 * live events/ folder only holds what is still in play. Archives are never edited
 * either; `tree --all` and `show` replay them alongside the live events.
 *
 * One store can hold several sources: separate trees for separate segments of work. The
 * default source is events/ and archive/ at the store's root; a named source is the same
 * pair under sources/<name>/. A command reads and writes one source, chosen by --source,
 * $THREAD_SOURCE or threads_source: in .aaw-config.yaml. Ids are unique across sources.
 *
 * Zero dependencies; Node 18+. Run `thread help` for usage.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

// STORE is the git clone. HOME is the selected source's folder inside it: the store's root
// for the default source, sources/<name>/ for a named one. It is set once, in main.
const STORE = process.env.THREADS_HOME || path.join(homedir(), ".threads");
let SOURCE = "default";
let HOME = STORE;
// Automatic prune: the first write of a new day archives every branch closed before that
// day began, so events/ holds the day's events and whatever is still in play. Days are
// the machine's local days. THREADS_AUTO_PRUNE=0 turns it off.
const AUTO_ON = process.env.THREADS_AUTO_PRUNE !== "0";
const MARK = { open: "●", parked: "‖", done: "✓", dropped: "✗" };

// ---------------------------------------------------------------- arguments

const BOOLEAN_FLAGS = new Set(["root", "all", "mermaid", "json", "help", "dry-run", "all-sources"]);

function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!BOOLEAN_FLAGS.has(key) && next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else flags[key] = true;
    } else pos.push(a);
  }
  return { pos, flags };
}

const die = (msg, code = 1) => {
  process.stderr.write(`thread: ${msg}\n`);
  process.exit(code);
};
const warn = (msg) => process.stderr.write(`thread: ${msg}\n`);

// ---------------------------------------------------------------- git

function git(args, opts = {}) {
  return execFileSync("git", args, {
    cwd: opts.cwd ?? STORE,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function tryGit(args, opts) {
  try {
    return { ok: true, out: git(args, opts) };
  } catch (e) {
    return { ok: false, out: String(e.stderr || e.message).trim() };
  }
}

const hasRemote = () => tryGit(["remote"]).out.split("\n").includes("origin");
const hasCommits = () => tryGit(["rev-parse", "--verify", "HEAD"]).ok;

/** A top-level `key:` in the nearest .aaw-config.yaml above cwd, or null. A quoted value may hold spaces. */
function workspaceSetting(key) {
  let dir = process.cwd();
  const re = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\s#]+))`, "m");
  for (;;) {
    const f = path.join(dir, ".aaw-config.yaml");
    if (existsSync(f)) {
      const m = readFileSync(f, "utf8").match(re);
      if (m) return m[1] ?? m[2] ?? m[3];
    }
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/** Find `threads_remote:` in the nearest .aaw-config.yaml above cwd. */
const remoteFromWorkspace = () => workspaceSetting("threads_remote");

/**
 * The project a root thread opened here belongs to, when none is named: $THREAD_PROJECT (set
 * it per repo in .claude/settings.json "env", or for a whole desktop project), else
 * `threads_project:` in the nearest .aaw-config.yaml. An id or a project title.
 */
const projectDefault = () => process.env.THREAD_PROJECT || workspaceSetting("threads_project");

/** A source name is one lowercase word or hyphenated words; "default" is the store's root. */
function sourceArg(raw, what = "a source") {
  const s = String(raw).trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s)) die(`${what} is one lowercase word or hyphenated words, such as image-and-video (got "${raw}")`);
  return s;
}

/**
 * The source this command reads and writes: --source, else $THREAD_SOURCE (set it per repo
 * in .claude/settings.json "env"), else threads_source: in the nearest .aaw-config.yaml,
 * else the default. "all" is only a view, for status, tree and list.
 */
function sourceChoice(flags) {
  const raw = typeof flags.source === "string" ? flags.source : process.env.THREAD_SOURCE || workspaceSetting("threads_source");
  return raw ? sourceArg(raw) : "default";
}

const sourceDir = (name) => (name === "default" ? STORE : path.join(STORE, "sources", name));

/** Every source in the store: the default first, then the named ones. */
function sources() {
  const dir = path.join(STORE, "sources");
  const named = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
    : [];
  return ["default", ...named];
}

/** Point HOME at a source. */
function useSource(name) {
  SOURCE = name;
  HOME = sourceDir(name);
}

/** Run fn with HOME pointed at another source, then point it back. */
function inSource(name, fn) {
  const was = SOURCE;
  useSource(name);
  try {
    return fn();
  } finally {
    useSource(was);
  }
}

/** The ids a source holds, live or archived, less the ones it has transferred away. */
function sourceIds(name) {
  return inSource(name, () => {
    const all = mergeEvents(readEvents());
    const moved = movedIds(all);
    return new Set(all.filter((e) => e.type === "open" && !moved.has(e.id)).map((e) => e.id));
  });
}

/** Every id taken in any source, so a new id is unique across the whole store. */
function allIds() {
  const ids = new Set();
  for (const s of sources()) {
    inSource(s, () => {
      for (const e of mergeEvents(readEvents())) if (e.id) ids.add(e.id);
    });
  }
  return ids;
}

/** Ids a source has transferred to another one: id -> the source it went to. */
function movedIds(events) {
  const moved = new Map();
  for (const e of events) if (e.type === "transfer") for (const id of e.ids ?? [e.id]) moved.set(id, e.to);
  return moved;
}

function ensureStore(remoteArg) {
  if (existsSync(path.join(STORE, ".git"))) return;
  const remote = remoteArg || process.env.THREADS_REMOTE || remoteFromWorkspace();
  if (!remote) {
    die(
      `no threads store at ${STORE}, and no remote configured to clone it from.\n` +
        "  The store is a private git repo you own (create an empty one first if you have none).\n" +
        "  Point at it in any one of these ways:\n" +
        "    • every repo on this machine:  setx THREADS_REMOTE <git-url>          (Windows; open a new terminal after)\n" +
        "                                   export THREADS_REMOTE=<git-url>        (macOS/Linux, in your shell profile)\n" +
        "    • just this workspace:         add  threads_remote: <git-url>  to .aaw-config.yaml\n" +
        "    • once, right now:             thread init <git-url>\n" +
        "  In a cloud session, the environment also needs push access to that repo.",
    );
  }
  const r = tryGit(["clone", "--quiet", remote, STORE], { cwd: homedir() });
  if (!r.ok) die(`could not clone ${remote}:\n${r.out}`);
  if (!hasCommits()) tryGit(["symbolic-ref", "HEAD", "refs/heads/main"]);
  if (!tryGit(["config", "user.email"]).ok) {
    // A bare cloud container may have no git identity; the store shouldn't care.
    git(["config", "user.name", "thread"]);
    git(["config", "user.email", "thread@localhost"]);
  }
}

/**
 * Bring the local store up to origin/main. Explicit fetch + rebase rather than
 * `git pull`, so it works the same on a fresh clone of an empty repo (no upstream
 * yet) as on an established one. Returns false when the remote was unreachable.
 */
function pull() {
  if (!hasRemote()) return true;
  const f = tryGit(["fetch", "--quiet", "origin"]);
  if (!f.ok) {
    warn(`can't reach the remote, working from the local copy (${f.out.split("\n")[0]})`);
    return false;
  }
  if (!tryGit(["rev-parse", "--verify", "origin/main"]).ok) return true; // remote still empty
  if (!hasCommits()) {
    git(["checkout", "--quiet", "-B", "main", "origin/main"]);
    return true;
  }
  const r = tryGit(["rebase", "--quiet", "origin/main"]);
  if (!r.ok) {
    tryGit(["rebase", "--abort"]);
    warn(`couldn't rebase onto origin/main (${r.out.split("\n")[0]})`);
  }
  return true;
}

/** Commit whatever was written and push it, including anything left unpushed before. */
function commitAndPush(message) {
  git(["add", "-A"]);
  if (tryGit(["diff", "--cached", "--quiet"]).ok) return true;
  git(["commit", "--quiet", "-m", message]);
  if (!hasRemote()) return true;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = tryGit(["push", "--quiet", "-u", "origin", "HEAD:main"]);
    if (r.ok) return true;
    // Someone else pushed first. Events are new files, so a rebase cannot conflict.
    if (!pull()) break;
  }
  warn("NOT PUSHED — recorded locally only. It will go up with the next successful thread command.");
  return false;
}

// ---------------------------------------------------------------- events

function context(flags) {
  if (typeof flags.ctx === "string") return flags.ctx;
  if (process.env.THREAD_CTX) return process.env.THREAD_CTX;
  const top = tryGit(["rev-parse", "--show-toplevel"], { cwd: process.cwd() });
  return path.basename(top.ok ? top.out : process.cwd());
}

function readEvents() {
  const dir = path.join(HOME, "events");
  const out = [];
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".json")) {
        try {
          out.push({ ...JSON.parse(readFileSync(p, "utf8")), _file: p });
        } catch {
          warn(`skipping unreadable event ${path.relative(HOME, p)}`);
        }
      }
    }
  };
  walk(dir);
  return sortEvents(out);
}

function writeEvent(ev) {
  const ts = new Date().toISOString();
  const host = hostname().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || "host";
  const stamp = ts.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dir = path.join(HOME, "events", localDay());
  mkdirSync(dir, { recursive: true });
  const full = { ts, host, ...ev };
  writeFileSync(
    path.join(dir, `${stamp}-${host}-${randomBytes(3).toString("hex")}.json`),
    JSON.stringify(full, null, 2) + "\n",
  );
  return full;
}

// ---------------------------------------------------------------- archive

/** Midnight at the start of today, local time, as epoch ms. */
const startOfToday = () => new Date().setHours(0, 0, 0, 0);

/** Today's local date, YYYY-MM-DD: the folder a new event goes in. */
function localDay() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const ARCHIVE = () => path.join(HOME, "archive");
const rel = (p) => path.relative(HOME, p).split(path.sep).join("/");

/** Every archived event, each with `_file` set to where it lived in events/. */
function readArchive() {
  const dir = ARCHIVE();
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort()) {
    const lines = readFileSync(path.join(dir, name), "utf8").split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const { src, ...ev } = JSON.parse(line);
        out.push({ ...ev, _file: path.join(HOME, src) });
      } catch {
        warn(`skipping unreadable line in archive/${name}`);
      }
    }
  }
  return out;
}

/**
 * Live and archived events together. An event can be in both (restored after a prune,
 * or archived by two machines at once), so they are de-duplicated by original file.
 */
function mergeEvents(live) {
  const seen = new Set(live.map((e) => rel(e._file)));
  const extra = readArchive().filter((e) => {
    const k = rel(e._file);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return sortEvents([...live, ...extra]);
}

/** Put archived threads (and their branches) back in events/, so they can be worked again. */
function restore(ids, live) {
  const all = mergeEvents(live);
  const full = buildTree(all);
  const want = new Set();
  const collect = (n) => {
    want.add(n.id);
    n.children.forEach(collect);
  };
  for (const id of ids) {
    if (!full.has(id)) continue;
    collect(full.get(id));
    // Its ancestors come back too, without their other branches, so the path stays whole.
    for (let p = full.get(id).parent; p && full.has(p); p = full.get(p).parent) want.add(p);
  }
  let n = 0;
  for (const ev of all) {
    if (!want.has(ev.id) || existsSync(ev._file)) continue;
    const { _file, ...body } = ev;
    mkdirSync(path.dirname(_file), { recursive: true });
    writeFileSync(_file, JSON.stringify(body, null, 2) + "\n");
    n++;
  }
  return n;
}

/**
 * Closed branches: a thread that is done or dropped, with every thread under it done or
 * dropped too, whose parent is still in play (or which is a root). Only whole branches
 * go, so nothing unfinished ever leaves the live store.
 */
function closedBranches(nodes, cutoff) {
  return [...nodes.values()].filter((n) => {
    if (isLive(n) || Date.parse(n.lastDeep) > cutoff) return false;
    const p = n.parent ? nodes.get(n.parent) : null;
    return !p || isLive(p);
  });
}

/** Move the given branches' events into one new archive file. Returns what moved. */
function archiveBranches(branches, events) {
  const ids = new Set();
  const collect = (n) => {
    ids.add(n.id);
    n.children.forEach(collect);
  };
  branches.forEach(collect);
  const moving = events.filter((e) => ids.has(e.id));
  if (!moving.length) return null;
  const ts = new Date().toISOString();
  const host = hostname().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || "host";
  const stamp = ts.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  mkdirSync(ARCHIVE(), { recursive: true });
  const name = `${stamp}-${host}-${randomBytes(3).toString("hex")}.jsonl`;
  const body = moving.map(({ _file, ...ev }) => JSON.stringify({ src: rel(_file), ...ev })).join("\n") + "\n";
  writeFileSync(path.join(ARCHIVE(), name), body);
  for (const e of moving) rmSync(e._file, { force: true });
  const readme = path.join(STORE, "README.md");
  if (!existsSync(readme) || readFileSync(readme, "utf8") !== README) writeFileSync(readme, README);
  return { file: `archive/${name}`, threads: ids.size, events: moving.length };
}

/** When the last prune ran, from the newest archive file's name; null if never. A transfer's archive file does not count. */
function lastPrune() {
  if (!existsSync(ARCHIVE())) return null;
  const names = readdirSync(ARCHIVE()).filter((f) => /^\d{8}T\d{6}Z.*\.jsonl$/.test(f)).sort();
  const m = names.length && /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(names[names.length - 1]);
  return m ? Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`) : null;
}

/** Prune on its own at the first write of a new day. */
function autoPrune() {
  if (!AUTO_ON) return;
  const today = startOfToday();
  const last = lastPrune();
  if (last !== null && last >= today) return;
  const events = readEvents();
  const branches = closedBranches(buildTree(events), today);
  if (!branches.length) return;
  const r = archiveBranches(branches, events);
  if (!r) return;
  commitAndPush(`prune: archive ${r.threads} closed thread(s) to ${r.file}`);
  console.log(`(archived ${r.threads} closed thread(s) to ${r.file}; thread tree --all still shows them)`);
}

const sortEvents = (evs) =>
  evs.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a._file < b._file ? -1 : 1));

/** Replay events into nodes: { id, parent, text, titles[], description, kind, status, ctx, tool, opened, last, notes[], outcome, children[] }. */
function buildTree(events) {
  const nodes = new Map();
  for (const ev of events) {
    const n = nodes.get(ev.id);
    switch (ev.type) {
      case "open":
        nodes.set(ev.id, {
          id: ev.id,
          parent: ev.parent ?? null,
          text: ev.text,
          titles: [],
          description: null,
          kind: ev.kind ?? null,
          status: "open",
          ctx: ev.ctx,
          tool: ev.tool,
          opened: ev.ts,
          last: ev.ts,
          notes: [],
          outcome: null,
          children: [],
        });
        break;
      case "close":
        if (n) Object.assign(n, { status: ev.status, outcome: ev.note ?? null, last: ev.ts });
        break;
      case "resume":
        if (n) Object.assign(n, { status: "open", outcome: null, last: ev.ts });
        break;
      case "note":
        if (n) {
          n.notes.push({ ts: ev.ts, text: ev.text });
          n.last = ev.ts;
        }
        break;
      case "move":
        if (n) Object.assign(n, { parent: ev.parent ?? null, last: ev.ts });
        break;
      case "rename":
        // Earlier titles are kept, so a clarified thread still shows what it was called.
        if (n && ev.text && ev.text !== n.text) {
          n.titles.push({ ts: ev.ts, text: n.text });
          Object.assign(n, { text: ev.text, last: ev.ts });
        }
        break;
      case "describe":
        if (n) Object.assign(n, { description: ev.text || null, last: ev.ts });
        break;
      case "kind":
        if (n) Object.assign(n, { kind: ev.kind || null, last: ev.ts });
        break;
      case "transfer":
        // The thread and its branches now live in another source; this one forgets them.
        for (const id of ev.ids ?? [ev.id]) nodes.delete(id);
        break;
    }
  }
  for (const n of nodes.values()) {
    if (n.parent && !nodes.has(n.parent)) n.parent = null; // parent pruned away
    if (n.parent) nodes.get(n.parent).children.push(n);
  }
  // Activity bubbles up, so a root sorts by the most recent thing done anywhere under it.
  const lastOf = (n) => n.children.reduce((m, c) => (lastOf(c) > m ? lastOf(c) : m), n.last);
  for (const n of nodes.values()) n.lastDeep = lastOf(n);
  for (const n of nodes.values()) n.children.sort((a, b) => (a.opened < b.opened ? -1 : 1));
  nodes.moved = movedIds(events);
  return nodes;
}

function newId(nodes) {
  for (;;) {
    const id = "t-" + randomBytes(2).readUInt16BE(0).toString(36).padStart(3, "0").slice(-3);
    if (!nodes.has(id)) return id;
  }
}

/**
 * A project: a thread of kind project, found by id or by title (ignoring case). An unfinished
 * one wins over a finished one with the same title; two unfinished ones are ambiguous.
 */
function findProject(nodes, ref) {
  if (/^t-[0-9a-z]+$/.test(ref)) {
    const n = nodes.get(ref);
    if (n && n.kind !== "project") die(`${ref} is not a project (its kind is ${n.kind ?? "none"}); thread kind ${ref} project makes it one`);
    return n ?? null;
  }
  const want = ref.trim().toLowerCase();
  const hits = [...nodes.values()].filter((n) => n.kind === "project" && n.text.toLowerCase() === want);
  const live = hits.filter(isUnfinished);
  if (live.length > 1) die(`more than one project is called "${ref}": ${live.map((n) => n.id).join(", ")}; use its id`);
  return live[0] ?? hits[0] ?? null;
}

function need(nodes, id) {
  if (!id) die("which thread? pass its id, e.g. t-4k2");
  const n = nodes.get(id);
  if (!n && nodes.moved?.has(id)) die(`${id} was transferred to source ${nodes.moved.get(id)}: pass --source ${nodes.moved.get(id)}`);
  if (!n) die(`no thread ${id}${SOURCE === "default" ? "" : ` in source ${SOURCE}`}`);
  return n;
}

// ---------------------------------------------------------------- rendering

function ago(ts) {
  const s = (Date.now() - Date.parse(ts)) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const anchor = (n) => `🧵 ${n.id} · ${n.text} · ${n.ctx}`;
const tag = (n) => (n.kind ? ` [${n.kind}]` : "");

/** A kind is one lowercase word, such as feature, bug or question. "none" clears it. */
function kindArg(raw) {
  if (raw === undefined || raw === true) return undefined;
  const k = String(raw).trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(k)) die(`a kind is one lowercase word, such as feature or bug (got "${raw}")`);
  return k;
}

function pathTo(nodes, n) {
  const chain = [];
  for (let c = n; c; c = c.parent ? nodes.get(c.parent) : null) chain.unshift(c);
  return chain;
}

const isLive = (n) => n.status === "open" || n.status === "parked" || n.children.some(isLive);

const isUnfinished = (n) => n.status === "open" || n.status === "parked";

/**
 * What a tree shows: { n, kids } view nodes. By default only unfinished threads (open or
 * parked); a done or dropped thread is hidden and its unfinished descendants take its
 * place. `all` shows every thread.
 */
function view(roots, { all } = {}) {
  const keep = (n) => ({ n, kids: all ? n.children.map(keep) : n.children.flatMap(lift) });
  const lift = (n) => (isUnfinished(n) ? [keep(n)] : n.children.flatMap(lift));
  const out = all ? roots.map(keep) : roots.flatMap(lift);
  return out.sort((a, b) => byRecent(a.n, b.n));
}

function renderForest(views, { focus } = {}) {
  const lines = [];
  const line = (n, prefix, branch) => {
    const tail = [n.ctx, ago(n.lastDeep)].filter(Boolean).join(" · ");
    const outcome = n.outcome ? ` — ${n.outcome}` : "";
    const here = focus && n.id === focus ? "   ← here" : "";
    lines.push(`${prefix}${branch}${MARK[n.status]} ${n.id} ${n.text}${tag(n)}${outcome}   ${tail}${here}`);
  };
  const walk = ({ n, kids }, prefix, branch, childPrefix) => {
    line(n, prefix, branch);
    kids.forEach((c, i) => {
      const last = i === kids.length - 1;
      walk(c, prefix + childPrefix, last ? "└─ " : "├─ ", last ? "   " : "│  ");
    });
  };
  for (const v of views) walk(v, "", "", "");
  return lines.join("\n");
}

function renderMermaid(views) {
  const out = ["```mermaid", "graph TD"];
  const esc = (s) => s.replace(/"/g, "'");
  const key = (n) => n.id.replace("-", "_");
  const walk = ({ n, kids }) => {
    out.push(`  ${key(n)}["${MARK[n.status]} ${esc(n.text)}"]:::${n.status}`);
    for (const c of kids) {
      out.push(`  ${key(n)} --> ${key(c.n)}`);
      walk(c);
    }
  };
  views.forEach(walk);
  out.push(
    "  classDef open fill:#dbeafe,stroke:#2563eb",
    "  classDef parked fill:#fef3c7,stroke:#d97706",
    "  classDef done fill:#dcfce7,stroke:#16a34a",
    "  classDef dropped fill:#f3f4f6,stroke:#9ca3af,color:#6b7280",
    "```",
  );
  return out.join("\n");
}

/** The same view as nested objects, for an agent to render as a widget. With a source, each root names it. */
function renderJson(views, source) {
  const walk = ({ n, kids }) => ({
    id: n.id,
    title: n.text,
    status: n.status,
    kind: n.kind,
    ctx: n.ctx,
    description: n.description,
    outcome: n.outcome,
    notes: n.notes.map((x) => x.text),
    opened: n.opened,
    last: n.lastDeep,
    ago: ago(n.lastDeep),
    children: kids.map(walk),
  });
  return views.map((v) => (source ? { source, ...walk(v) } : walk(v)));
}

/** Say which source a view shows, once the store has more than one. */
function sourceHeading(flags) {
  if (flags.json || flags._each) return;
  if (SOURCE !== "default" || sources().length > 1) console.log(`source: ${SOURCE}`);
}

const byRecent = (a, b) => (a.lastDeep < b.lastDeep ? 1 : -1);

// ---------------------------------------------------------------- commands

const README = `# threads

A throwaway tree of what I'm doing and why, shared across machines, tools and chats.
Written by the \`thread\` skill (AI-Assisted Work, \`skills/thread\`); nothing here is edited by hand.

## Format (for an agent without the skill)

Each action is one new JSON file, \`events/YYYY-MM-DD/<utc-stamp>-<host>-<6 hex>.json\`. Never edit an
existing event: write a new one, commit, \`git pull --rebase\`, push.

\`archive/<utc-stamp>-<host>-<6 hex>.jsonl\` holds closed threads pruned out of \`events/\`, one file
per prune, one event per line with \`src\` (the path it had under \`events/\`). Archives are never
edited either. The full tree is \`events/\` and every archive replayed together, de-duplicated by
\`src\`. A new id must not be used in either. An event in \`events/\` for a thread that was archived
brings that thread back: copy its archived events back to their \`src\` paths.

## Sources

The store can hold several sources, separate trees for separate segments of work. The default
source is \`events/\` and \`archive/\` at the root; a named source is the same pair under
\`sources/<name>/\`, with \`src\` paths relative to that folder. Each source is replayed on its
own. Ids are unique across every source. A \`transfer\` event moves a thread and its branches to
another source: their events are copied there with the same paths, removed from this source's
\`events/\`, and this source then ignores those ids, including in its archive.

| type | fields |
|---|---|
| \`open\` | \`id\` (\`t-\` + 3 base-36 chars, unused), \`parent\` (id or null), \`text\`, \`ctx\` (repo), \`tool\`, optional \`kind\` |
| \`close\` | \`id\`, \`status\` (\`done\` \\| \`parked\` \\| \`dropped\`), \`note\` |
| \`resume\` | \`id\`, \`ctx\` |
| \`note\` | \`id\`, \`text\` |
| \`move\` | \`id\`, \`parent\` (id or null) |
| \`rename\` | \`id\`, \`text\` (the new title; earlier ones stay in the history) |
| \`describe\` | \`id\`, \`text\` (a longer description; the latest one wins) |
| \`kind\` | \`id\`, \`kind\` (one lowercase word such as \`feature\`, or null to clear; the latest one wins) |
| \`transfer\` | \`id\`, \`to\` (the source), \`ids\` (the thread and every branch under it that moved) |

Every event also carries \`ts\` (ISO-8601 UTC) and \`host\`. The tree is the events replayed in \`ts\` order.
`;

/**
 * The refine convention: the first sentence is the title and the rest is the description.
 * A sentence ends at a full stop followed by a space or the end of the text, so "v3.2.0"
 * does not split. Text with no such full stop is only a title.
 */
function splitRefinement(raw) {
  const text = raw.trim();
  const m = /^(.*?)\.(?:\s+([\s\S]*))?$/.exec(text);
  if (!m) return { title: text, description: null };
  return { title: m[1].trim(), description: (m[2] || "").trim() || null };
}

const commands = {
  init(pos) {
    ensureStore(pos[0]);
    pull();
    if (!existsSync(path.join(HOME, "README.md"))) {
      writeFileSync(path.join(HOME, "README.md"), README);
      mkdirSync(path.join(HOME, "events"), { recursive: true });
      writeFileSync(path.join(HOME, "events", ".gitkeep"), "");
      commitAndPush("Initialise threads store");
    }
    console.log(`threads store ready at ${HOME}`);
  },

  open(pos, flags, nodes) {
    const text = pos.join(" ").trim();
    if (!text) die('what are you doing? e.g. thread open "fix ingestion retry bug"');
    let parent = null;
    if (typeof flags.parent === "string") parent = need(nodes, flags.parent).id;
    else if (!flags.root) {
      // A root thread goes under this chat's project, or the workspace's default one.
      const ref = typeof flags.project === "string" ? flags.project : projectDefault();
      if (ref) {
        const p = findProject(nodes, ref);
        if (!p) die(`no project "${ref}". Start it with: thread project "${ref}"`);
        parent = p.id;
      }
    }
    // An archived id is still taken: the full tree replays the archive too.
    const kind = kindArg(flags.kind);
    if (kind === "none") die("--kind none only makes sense on thread kind; leave --kind off instead");
    const id = newId(allIds());
    writeEvent({ type: "open", id, parent, text, ctx: context(flags), tool: flags.tool || process.env.THREAD_TOOL, ...(kind ? { kind } : {}) });
    commitAndPush(`open ${id}: ${text}`);
    const tree = buildTree(readEvents());
    const n = tree.get(id);
    console.log(anchor(n) + tag(n));
    if (parent) console.log(`   under: ${pathTo(tree, n).slice(0, -1).map((p) => `${p.id} ${p.text}`).join(" › ")}`);
  },

  project(pos, flags, nodes) {
    // Find a project, or start one: a root thread of kind project that other threads go under.
    const ref = pos.join(" ").trim() || projectDefault();
    if (!ref) {
      return console.log(
        "no project here. thread project \"<name>\" finds or starts one; set a default with\n" +
          "THREAD_PROJECT, or threads_project: in .aaw-config.yaml.",
      );
    }
    let p = findProject(nodes, ref);
    if (!p) {
      if (/^t-[0-9a-z]+$/.test(ref)) die(`no thread ${ref}`);
      const id = newId(allIds());
      writeEvent({ type: "open", id, parent: null, text: ref, ctx: context(flags), tool: flags.tool || process.env.THREAD_TOOL, kind: "project" });
      commitAndPush(`open ${id}: ${ref} (project)`);
      p = buildTree(readEvents()).get(id);
      console.log(`started project ${p.id}`);
    }
    console.log(anchor(p) + tag(p));
    const open = p.children.filter(isLive).length;
    console.log(`   ${open} open thread(s) under it. Root threads opened with --project ${p.id} go under it.`);
  },

  resume(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    writeEvent({ type: "resume", id: n.id, ctx: context(flags) });
    commitAndPush(`resume ${n.id}`);
    commands.show([n.id], flags, buildTree(readEvents()));
  },

  show(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    console.log(anchor(n));
    if (n.description) console.log(`   ${n.description}`);
    for (const t of n.titles) console.log(`   was: ${t.text}  (until ${ago(t.ts)})`);
    const chain = pathTo(nodes, n);
    if (chain.length > 1) console.log(`   path: ${chain.map((p) => `${p.id} ${p.text}`).join(" › ")}`);
    console.log(`   ${n.kind ? `${n.kind}, ` : ""}${n.status}, opened ${ago(n.opened)}${n.outcome ? ` — ${n.outcome}` : ""}`);
    for (const note of n.notes) console.log(`   · ${note.text}  (${ago(note.ts)})`);
    if (n.children.length) {
      console.log("   branches:");
      for (const c of n.children) console.log(`     ${MARK[c.status]} ${c.id} ${c.text}${tag(c)}${c.outcome ? ` — ${c.outcome}` : ""}`);
    }
  },

  close(pos, flags, nodes, status) {
    const n = need(nodes, pos[0]);
    const note = pos.slice(1).join(" ").trim() || undefined;
    // Every close carries a one-line resolution, so the tree says how each thread ended.
    if (!note) die(`a resolution is required: thread ${{ done: "done", parked: "park", dropped: "drop" }[status]} ${n.id} "<what was decided, delivered, or why it stopped>"`);
    writeEvent({ type: "close", id: n.id, status, note });
    commitAndPush(`${status} ${n.id}${note ? `: ${note}` : ""}`);
    const tree = buildTree(readEvents());
    console.log(`${MARK[status]} ${n.id} ${n.text} — ${status}${note ? `: ${note}` : ""}`);
    // Point back up at the nearest ancestor still open.
    let up = n.parent ? tree.get(n.parent) : null;
    while (up && up.status !== "open") up = up.parent ? tree.get(up.parent) : null;
    if (up) {
      console.log(`back to: ${anchor(up)}`);
      const rest = up.children.filter((c) => c.status === "open" || c.status === "parked");
      if (rest.length) console.log(`   still under it: ${rest.map((c) => `${MARK[c.status]} ${c.id} ${c.text}`).join(" · ")}`);
    } else console.log("that was a root — nothing above it is open.");
  },

  refine(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    const { title, description } = splitRefinement(pos.slice(1).join(" "));
    if (!title) die(`refine it how? e.g. thread refine ${n.id} "Fix the EDGAR retry bug. Daily ingest only; the backfill is t-xyz."`);
    const renamed = title !== n.text;
    if (!renamed && !description) die(`${n.id} is already called that`);
    if (renamed) writeEvent({ type: "rename", id: n.id, text: title });
    if (description) writeEvent({ type: "describe", id: n.id, text: description });
    commitAndPush(`refine ${n.id}: ${title}`);
    commands.show([n.id], flags, buildTree(readEvents()));
  },

  rename(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    const text = pos.slice(1).join(" ").trim();
    if (!text) die(`the new title? e.g. thread rename ${n.id} "fix ingestion retry bug in the EDGAR crawler"`);
    if (text === n.text) die(`${n.id} is already called that`);
    writeEvent({ type: "rename", id: n.id, text });
    commitAndPush(`rename ${n.id}: ${text}`);
    console.log(anchor(buildTree(readEvents()).get(n.id)));
    console.log(`   was: ${n.text}`);
  },

  describe(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    const text = pos.slice(1).join(" ").trim();
    if (!text) die(`describe it how? e.g. thread describe ${n.id} "what this covers, and what it does not"`);
    writeEvent({ type: "describe", id: n.id, text });
    commitAndPush(`describe ${n.id}`);
    console.log(`described ${n.id}`);
  },

  note(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    const text = pos.slice(1).join(" ").trim();
    if (!text) die("note what?");
    writeEvent({ type: "note", id: n.id, text });
    commitAndPush(`note ${n.id}`);
    console.log(`noted on ${n.id}`);
  },

  kind(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    const k = kindArg(pos[1]);
    if (!k) die(`which kind? e.g. thread kind ${n.id} feature (or none to clear)`);
    const kind = k === "none" ? null : k;
    if (kind === n.kind) die(kind ? `${n.id} is already a ${kind}` : `${n.id} has no kind`);
    writeEvent({ type: "kind", id: n.id, kind });
    commitAndPush(`kind ${n.id}: ${kind ?? "none"}`);
    console.log(kind ? `${n.id} is now a ${kind}` : `${n.id} no longer has a kind`);
  },

  list(pos, flags, nodes) {
    // A flat list across every tree and project: the threads of one kind, wherever they sit.
    const kind = kindArg(flags.kind ?? pos[0]);
    const hits = [...nodes.values()]
      .filter((n) => (kind ? n.kind === kind : n.kind) && (flags.all || isUnfinished(n)))
      .sort(byRecent);
    const up = (n) => pathTo(nodes, n).slice(0, -1);
    if (flags.json) {
      const row = (n) => ({
        id: n.id,
        title: n.text,
        kind: n.kind,
        status: n.status,
        ctx: n.ctx,
        description: n.description,
        outcome: n.outcome,
        notes: n.notes.map((x) => x.text),
        path: up(n).map((p) => ({ id: p.id, title: p.text })),
        opened: n.opened,
        last: n.lastDeep,
        ago: ago(n.lastDeep),
      });
      if (flags._each) return hits.map((n) => ({ source: SOURCE, ...row(n) }));
      return console.log(JSON.stringify(hits.map(row), null, 2));
    }
    sourceHeading(flags);
    const what = kind ? `${kind} threads` : "threads with a kind";
    if (!hits.length) return console.log(flags.all ? `no ${what}.` : `no open ${what}. (--all shows finished ones)`);
    for (const n of hits) {
      const outcome = n.outcome ? ` — ${n.outcome}` : "";
      console.log(`${MARK[n.status]} ${n.id} ${n.text}${kind ? "" : tag(n)}${outcome}   ${n.ctx} · ${ago(n.lastDeep)}`);
      if (up(n).length) console.log(`     under: ${up(n).map((p) => `${p.id} ${p.text}`).join(" › ")}`);
    }
  },

  move(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    let parent = null;
    if (typeof flags.parent === "string") {
      parent = need(nodes, flags.parent).id;
      for (let c = nodes.get(parent); c; c = c.parent ? nodes.get(c.parent) : null) {
        if (c.id === n.id) die("can't move a thread under its own branch");
      }
    } else if (!flags.root) die("move where? --parent <id> or --root");
    writeEvent({ type: "move", id: n.id, parent });
    commitAndPush(`move ${n.id} under ${parent ?? "root"}`);
    console.log(`${n.id} now under ${parent ?? "(root)"}`);
  },

  transfer(pos, flags, nodes, _status, events) {
    // Move a thread and every branch under it, archived ones included, to another source.
    // Ids and event files keep their names, so anchors and history carry over unchanged.
    const n = need(nodes, pos[0]);
    if (typeof flags.to !== "string") die(`transfer it where? thread transfer ${n.id} --to <source>`);
    const to = sourceArg(flags.to);
    if (to === "all") die('"all" is a view, not a source');
    if (to === SOURCE) die(`${n.id} is already in source ${to}`);
    const full = buildTree(mergeEvents(events));
    const ids = new Set();
    const collect = (x) => {
      ids.add(x.id);
      x.children.forEach(collect);
    };
    collect(full.get(n.id));
    const clash = [...sourceIds(to)].filter((id) => ids.has(id));
    if (clash.length) die(`source ${to} already holds ${clash.join(", ")}`);
    const live = events.filter((e) => ids.has(e.id));
    const liveFiles = new Set(live.map((e) => rel(e._file)));
    const archived = readArchive().filter((e) => ids.has(e.id) && !liveFiles.has(rel(e._file)));
    const target = sourceDir(to);
    for (const { _file, ...body } of live) {
      const dest = path.join(target, rel(_file));
      mkdirSync(path.dirname(dest), { recursive: true });
      writeFileSync(dest, JSON.stringify(body, null, 2) + "\n");
    }
    if (archived.length) {
      // Kept archived in the new source. Named apart from prune files so the daily prune there still runs.
      const host = hostname().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || "host";
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
      mkdirSync(path.join(target, "archive"), { recursive: true });
      const body = archived.map(({ _file, ...ev }) => JSON.stringify({ src: rel(_file), ...ev })).join("\n") + "\n";
      writeFileSync(path.join(target, "archive", `transfer-${stamp}-${host}-${randomBytes(3).toString("hex")}.jsonl`), body);
    }
    for (const e of live) rmSync(e._file, { force: true });
    writeEvent({ type: "transfer", id: n.id, to, ids: [...ids] });
    commitAndPush(`transfer ${n.id} and ${ids.size - 1} branch(es) from source ${SOURCE} to ${to}`);
    console.log(`transferred ${n.id} ${n.text} and ${ids.size - 1} thread(s) under it (${live.length + archived.length} events) from source ${SOURCE} to ${to}.`);
    if (n.parent) console.log(`   it was under ${n.parent}, which stays in ${SOURCE}; in ${to} it is a root.`);
    console.log(`   ids are unchanged; commands find it in ${to} from anywhere.`);
  },

  sources(pos, flags) {
    // Every source in the store, with its open and parked root counts.
    for (const s of sources()) {
      const roots = inSource(s, () => [...buildTree(readEvents()).values()].filter((n) => !n.parent && isLive(n)));
      const here = s === SOURCE ? "   ← this workspace" : "";
      console.log(`${s.padEnd(20)} ${String(roots.length).padStart(3)} open tree(s)  ${s === "default" ? "events/" : `sources/${s}/`}${here}`);
    }
  },

  fork(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    const chain = pathTo(nodes, n);
    console.log(anchor(n));
    console.log(`Thread path: ${chain.map((p) => `${p.id} ${p.text}`).join(" › ")}`);
    for (const note of n.notes) console.log(`Note: ${note.text}`);
  },

  status(pos, flags, nodes) {
    // This project's threads first. With a project (named, or the workspace default) that is
    // its tree; otherwise a tree counts as here if any node in it was opened in this repo.
    const ctx = context(flags);
    const ref = typeof flags.project === "string" ? flags.project : projectDefault();
    const project = ref ? findProject(nodes, ref) : null;
    const touchesHere = project ? (n) => n.id === project.id : (n) => n.ctx === ctx || n.children.some(touchesHere);
    const live = [...nodes.values()].filter((n) => !n.parent && isLive(n)).sort(byRecent);
    const here = flags.all ? live : live.filter(touchesHere);
    const elsewhere = live.filter((n) => !here.includes(n));
    sourceHeading(flags);
    if (!live.length) console.log("no open threads.");
    else if (here.length) console.log(renderForest(view(here), { focus: flags.here }));
    else console.log(`no open threads in ${project ? `project ${project.id} ${project.text}` : ctx}.`);
    if (elsewhere.length) {
      const where = [...new Set(elsewhere.map((n) => n.ctx))].join(", ");
      console.log(`
+ ${elsewhere.length} open elsewhere (${where}) — thread tree to see them all`);
    }
    if (flags._each) return; // --source all lists every source in turn
    const others = sources()
      .filter((s) => s !== SOURCE)
      .map((s) => [s, inSource(s, () => [...buildTree(readEvents()).values()].filter((n) => !n.parent && isLive(n)).length)])
      .filter(([, k]) => k);
    if (others.length) {
      console.log(`+ open in other sources: ${others.map(([s, k]) => `${s} (${k})`).join(", ")} — thread status --source all`);
    }
  },

  tree(pos, flags, nodes) {
    // Unfinished threads only, unless --all; a closed thread's open branches take its place.
    let roots = [...nodes.values()].filter((n) => !n.parent);
    if (pos[0]) roots = [pathTo(nodes, need(nodes, pos[0]))[0]];
    const views = view(roots, { all: flags.all });
    if (flags.json) {
      const out = renderJson(views, flags._each ? SOURCE : undefined);
      return flags._each ? out : console.log(JSON.stringify(out, null, 2));
    }
    sourceHeading(flags);
    if (!views.length) return console.log(flags.all ? "no threads." : "no open threads. (thread tree --all shows finished ones)");
    const render = flags.mermaid ? renderMermaid : renderForest;
    console.log(render(views, { focus: flags.here }));
  },

  prune(pos, flags, nodes, _status, events) {
    // Every closed branch by default; --days keeps the ones closed more recently than that.
    const days = typeof flags.days === "string" ? Number(flags.days) : 0;
    if (Number.isNaN(days)) die("--days takes a number");
    const branches = closedBranches(nodes, Date.now() - days * 86400_000);
    if (!branches.length) return console.log(days ? `nothing closed more than ${days} day(s) ago.` : "nothing closed to archive.");
    if (flags["dry-run"]) {
      console.log("would archive:");
      console.log(renderForest(view(branches, { all: true })));
      return;
    }
    const r = archiveBranches(branches, events);
    commitAndPush(`prune: archive ${r.threads} closed thread(s) to ${r.file}`);
    console.log(`archived ${r.threads} closed thread(s) (${r.events} events) to ${r.file}.`);
    console.log("thread tree --all still shows them, and resuming one brings it back.");
  },

  sync() {
    commitAndPush("sync");
    console.log("synced.");
  },

  help() {
    console.log(`thread — a throwaway tree of intents, shared across machines, tools and chats

  thread [--all]                  open threads in this project, most recent first (alias: status)
  thread open "<text>" [--parent <id> | --project <id|name> | --root] [--kind <kind>] [--tool <name>] [--ctx <name>]
                                  with no --parent, a root thread goes under --project, else under
                                  $THREAD_PROJECT or threads_project: in .aaw-config.yaml, if set
  thread project ["<name>"|<id>]  find or start a project (a root thread of kind project)
  thread projects                 every project (alias: list --kind project)
  thread resume <id>              pick a thread back up in this chat
  thread show <id>                one thread: path, notes, branches
  thread done|park|drop <id> "<resolution>"
  thread note <id> "<text>"
  thread refine <id> "<Title. Description>"  first sentence renames, the rest describes
  thread rename <id> "<title>"    clarify a title; earlier titles are kept
  thread describe <id> "<text>"   a longer description, shown by show and resume
  thread move <id> --parent <id> | --root
  thread kind <id> <kind>|none    mark a thread as an improvement, bug, project… (one lowercase word)
  thread list [--kind <kind>] [--all] [--json]  every thread of that kind, across all trees
  thread fork <id>                header for a handoff to a new chat
  thread tree [<id>] [--all] [--mermaid|--json]  open and parked threads; --all (or: tree all)
                                  adds finished ones, archived ones included
  thread prune [--days <n>] [--dry-run]   archive closed branches to a new archive/ file (alias: archive)
                                  runs by itself on the first write of a new day, archiving what
                                  closed before today; THREADS_AUTO_PRUNE=0 turns that off
  thread sources                  every source in the store, with its open trees
  thread transfer <id> --to <source>   move a thread and its branches to another source
  thread init [<git-url>]         clone/seed the store at ${STORE}
  thread sync                     push anything left unpushed

  --source <name> on any command picks the source (a separate tree in the same store); else
  $THREAD_SOURCE, else threads_source: in .aaw-config.yaml, else the default. An id held by
  another source is found there. status, tree and list take --source all to show every source.

  Store: $THREADS_HOME or ~/.threads. Remote for first use: argument, $THREADS_REMOTE,
  or threads_remote: in .aaw-config.yaml.`);
  },
};

// ---------------------------------------------------------------- main

const { pos, flags } = parseArgs(process.argv.slice(2));
let cmd = pos.shift() ?? "status";
if (["help", "-h"].includes(cmd) || flags.help) {
  commands.help();
  process.exit(0);
}
if (cmd === "init") {
  commands.init(pos);
  process.exit(0);
}
if (/^t-[0-9a-z]+$/.test(cmd)) {
  pos.unshift(cmd);
  cmd = "resume";
}
if (cmd === "archive") cmd = "prune";
if (cmd === "projects") {
  cmd = "list";
  flags.kind = "project";
}
if (cmd === "tree" && pos[0] === "all") {
  pos.shift();
  flags.all = true;
}
const statuses = { done: "done", park: "parked", drop: "dropped" };
if (!statuses[cmd] && !commands[cmd]) die(`unknown command "${cmd}". Try: thread help`);
const READ_ONLY = new Set(["status", "show", "fork", "tree", "list", "prune", "sync", "sources"]);

ensureStore();
pull();

const isId = (x) => typeof x === "string" && /^t-[0-9a-z]+$/.test(x);
const choice = flags["all-sources"] ? "all" : sourceChoice(flags);
if (choice === "all") {
  // A view across every source, one after another; JSON views come back as one array.
  if (!["status", "tree", "list"].includes(cmd)) die("--source all is only a view: use it with status, tree or list");
  const out = [];
  sources().forEach((s, i) => {
    useSource(s);
    let evs = readEvents();
    if ((cmd === "tree" && flags.all) || (cmd === "list" && flags.all)) evs = mergeEvents(evs);
    const nodes = buildTree(evs);
    if (cmd === "tree" && pos[0] && !nodes.has(pos[0])) return;
    if (!flags.json) console.log(`${i ? "\n" : ""}── source: ${s} ──`);
    const r = commands[cmd](pos, { ...flags, _each: true, all: cmd === "status" ? true : flags.all }, nodes);
    if (Array.isArray(r)) out.push(...r);
  });
  if (flags.json) console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}
useSource(choice);

// An id this source does not hold is looked up in the others, so an anchor resolves from any
// workspace: the command then runs in the source that holds it.
const named = [cmd === "open" || cmd === "project" ? null : pos[0], flags.parent, isId(flags.project) ? flags.project : null].filter(isId);
if (named.length && !["sources", "sync", "prune"].includes(cmd)) {
  const here = sourceIds(SOURCE);
  const homes = new Set();
  for (const id of named) {
    if (here.has(id)) {
      homes.add(SOURCE);
      continue;
    }
    const other = sources().find((s) => s !== SOURCE && sourceIds(s).has(id));
    if (other) homes.add(other);
  }
  if (homes.size > 1) die(`${named.join(" and ")} are in different sources (${[...homes].join(", ")}); thread transfer moves a whole tree between them`);
  const [home] = homes;
  if (home && home !== SOURCE) {
    warn(`${named.join(", ")} ${named.length > 1 ? "are" : "is"} in source ${home}; using it`);
    useSource(home);
  }
}

let events = readEvents();

// Events written to this source for threads it has transferred away (by a machine that had
// not yet seen the transfer) are forwarded to the source the threads went to.
const moved = movedIds(events);
const strays = events.filter((e) => e.type !== "transfer" && moved.has(e.id));
if (strays.length) {
  for (const { _file, ...body } of strays) {
    const dest = path.join(sourceDir(moved.get(body.id)), rel(_file));
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, JSON.stringify(body, null, 2) + "\n");
    rmSync(_file, { force: true });
  }
  commitAndPush(`forward ${strays.length} event(s) for transferred threads`);
  warn(`forwarded ${strays.length} event(s) for transferred threads to their new source`);
  events = readEvents();
}

// Bring archived threads back into events/ when they are in play again: an event here for
// a thread with no open event here (another machine wrote to it while this one archived
// it), or a thread this command is about to change. Transferred threads stay where they went.
const opened = new Set(events.filter((e) => e.type === "open").map((e) => e.id));
const wanted = new Set(events.filter((e) => e.type !== "transfer" && !opened.has(e.id)).map((e) => e.id));
if (!READ_ONLY.has(cmd)) {
  for (const id of [cmd === "open" ? null : pos[0], flags.parent]) {
    if (typeof id === "string" && /^t-[0-9a-z]+$/.test(id) && !opened.has(id)) wanted.add(id);
  }
}
if (wanted.size && restore(wanted, events)) {
  commitAndPush(`restore ${[...wanted].join(" ")} from the archive`);
  events = readEvents();
}

let nodes = buildTree(events);
// Views that read history replay the archive too.
if (["show", "fork"].includes(cmd) || (cmd === "list" && flags.all) || (cmd === "tree" && (flags.all || (pos[0] && !nodes.has(pos[0]))))) {
  nodes = buildTree(mergeEvents(events));
}
const fresh = !existsSync(HOME);
if (statuses[cmd]) commands.close(pos, flags, nodes, statuses[cmd]);
else commands[cmd](pos, flags, nodes, undefined, events);
// A named source starts with its first write; say so, in case the name was a typo.
if (fresh && existsSync(HOME)) console.log(`(started source ${SOURCE} at sources/${SOURCE}/ in the store)`);
if (!READ_ONLY.has(cmd)) autoPrune();
