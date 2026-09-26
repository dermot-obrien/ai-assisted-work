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
 * Zero dependencies; Node 18+. Run `thread help` for usage.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

const HOME = process.env.THREADS_HOME || path.join(homedir(), ".threads");
const PRUNE_DAYS = 30;
const MARK = { open: "●", parked: "‖", done: "✓", dropped: "✗" };

// ---------------------------------------------------------------- arguments

const BOOLEAN_FLAGS = new Set(["root", "all", "mermaid", "help"]);

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
    cwd: opts.cwd ?? HOME,
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

/** Find `threads_remote:` in the nearest .aaw-config.yaml above cwd. */
function remoteFromWorkspace() {
  let dir = process.cwd();
  for (;;) {
    const f = path.join(dir, ".aaw-config.yaml");
    if (existsSync(f)) {
      const m = readFileSync(f, "utf8").match(/^threads_remote:\s*["']?([^"'\s#]+)/m);
      if (m) return m[1];
    }
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function ensureStore(remoteArg) {
  if (existsSync(path.join(HOME, ".git"))) return;
  const remote = remoteArg || process.env.THREADS_REMOTE || remoteFromWorkspace();
  if (!remote) {
    die(
      `no threads store at ${HOME}, and no remote configured to clone it from.\n` +
        "  The store is a private git repo you own (create an empty one first if you have none).\n" +
        "  Point at it in any one of these ways:\n" +
        "    • every repo on this machine:  setx THREADS_REMOTE <git-url>          (Windows; open a new terminal after)\n" +
        "                                   export THREADS_REMOTE=<git-url>        (macOS/Linux, in your shell profile)\n" +
        "    • just this workspace:         add  threads_remote: <git-url>  to .aaw-config.yaml\n" +
        "    • once, right now:             thread init <git-url>\n" +
        "  In a cloud session, the environment also needs push access to that repo.",
    );
  }
  const r = tryGit(["clone", "--quiet", remote, HOME], { cwd: homedir() });
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
  return out.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a._file < b._file ? -1 : 1));
}

function writeEvent(ev) {
  const ts = new Date().toISOString();
  const host = hostname().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || "host";
  const stamp = ts.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dir = path.join(HOME, "events", ts.slice(0, 7));
  mkdirSync(dir, { recursive: true });
  const full = { ts, host, ...ev };
  writeFileSync(
    path.join(dir, `${stamp}-${host}-${randomBytes(3).toString("hex")}.json`),
    JSON.stringify(full, null, 2) + "\n",
  );
  return full;
}

/** Replay events into nodes: { id, parent, text, status, ctx, tool, opened, last, notes[], outcome, children[] }. */
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
  return nodes;
}

function newId(nodes) {
  for (;;) {
    const id = "t-" + randomBytes(2).readUInt16BE(0).toString(36).padStart(3, "0").slice(-3);
    if (!nodes.has(id)) return id;
  }
}

function need(nodes, id) {
  if (!id) die("which thread? pass its id, e.g. t-4k2");
  const n = nodes.get(id);
  if (!n) die(`no thread ${id}`);
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

function pathTo(nodes, n) {
  const chain = [];
  for (let c = n; c; c = c.parent ? nodes.get(c.parent) : null) chain.unshift(c);
  return chain;
}

const isLive = (n) => n.status === "open" || n.status === "parked" || n.children.some(isLive);

function renderForest(roots, { all, focus } = {}) {
  const lines = [];
  const line = (n, prefix, branch) => {
    const tail = [n.ctx, ago(n.lastDeep)].filter(Boolean).join(" · ");
    const outcome = n.outcome ? ` — ${n.outcome}` : "";
    const here = focus && n.id === focus ? "   ← here" : "";
    lines.push(`${prefix}${branch}${MARK[n.status]} ${n.id} ${n.text}${outcome}   ${tail}${here}`);
  };
  const walk = (n, prefix, branch, childPrefix) => {
    line(n, prefix, branch);
    const kids = all ? n.children : n.children.filter(isLive);
    kids.forEach((c, i) => {
      const last = i === kids.length - 1;
      walk(c, prefix + childPrefix, last ? "└─ " : "├─ ", last ? "   " : "│  ");
    });
  };
  for (const r of roots) walk(r, "", "", "");
  return lines.join("\n");
}

function renderMermaid(roots) {
  const out = ["```mermaid", "graph TD"];
  const esc = (s) => s.replace(/"/g, "'");
  const walk = (n) => {
    out.push(`  ${n.id.replace("-", "_")}["${MARK[n.status]} ${esc(n.text)}"]:::${n.status}`);
    for (const c of n.children) {
      out.push(`  ${n.id.replace("-", "_")} --> ${c.id.replace("-", "_")}`);
      walk(c);
    }
  };
  roots.forEach(walk);
  out.push(
    "  classDef open fill:#dbeafe,stroke:#2563eb",
    "  classDef parked fill:#fef3c7,stroke:#d97706",
    "  classDef done fill:#dcfce7,stroke:#16a34a",
    "  classDef dropped fill:#f3f4f6,stroke:#9ca3af,color:#6b7280",
    "```",
  );
  return out.join("\n");
}

const byRecent = (a, b) => (a.lastDeep < b.lastDeep ? 1 : -1);

// ---------------------------------------------------------------- commands

const README = `# threads

A throwaway tree of what I'm doing and why, shared across machines, tools and chats.
Written by the \`thread\` skill (AI-Assisted Work, \`skills/thread\`); nothing here is edited by hand.

## Format (for an agent without the skill)

Each action is one new JSON file, \`events/YYYY-MM/<utc-stamp>-<host>-<6 hex>.json\`. Never edit or
delete an existing event — write a new one, commit, \`git pull --rebase\`, push.

| type | fields |
|---|---|
| \`open\` | \`id\` (\`t-\` + 3 base-36 chars, unused), \`parent\` (id or null), \`text\`, \`ctx\` (repo), \`tool\` |
| \`close\` | \`id\`, \`status\` (\`done\` \\| \`parked\` \\| \`dropped\`), \`note\` |
| \`resume\` | \`id\`, \`ctx\` |
| \`note\` | \`id\`, \`text\` |
| \`move\` | \`id\`, \`parent\` (id or null) |

Every event also carries \`ts\` (ISO-8601 UTC) and \`host\`. The tree is the events replayed in \`ts\` order.
`;

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
    const id = newId(nodes);
    writeEvent({ type: "open", id, parent, text, ctx: context(flags), tool: flags.tool || process.env.THREAD_TOOL });
    commitAndPush(`open ${id}: ${text}`);
    const tree = buildTree(readEvents());
    const n = tree.get(id);
    console.log(anchor(n));
    if (parent) console.log(`   under: ${pathTo(tree, n).slice(0, -1).map((p) => `${p.id} ${p.text}`).join(" › ")}`);
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
    const chain = pathTo(nodes, n);
    if (chain.length > 1) console.log(`   path: ${chain.map((p) => `${p.id} ${p.text}`).join(" › ")}`);
    console.log(`   ${n.status}, opened ${ago(n.opened)}${n.outcome ? ` — ${n.outcome}` : ""}`);
    for (const note of n.notes) console.log(`   · ${note.text}  (${ago(note.ts)})`);
    if (n.children.length) {
      console.log("   branches:");
      for (const c of n.children) console.log(`     ${MARK[c.status]} ${c.id} ${c.text}${c.outcome ? ` — ${c.outcome}` : ""}`);
    }
  },

  close(pos, flags, nodes, status) {
    const n = need(nodes, pos[0]);
    const note = pos.slice(1).join(" ").trim() || undefined;
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

  note(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    const text = pos.slice(1).join(" ").trim();
    if (!text) die("note what?");
    writeEvent({ type: "note", id: n.id, text });
    commitAndPush(`note ${n.id}`);
    console.log(`noted on ${n.id}`);
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

  fork(pos, flags, nodes) {
    const n = need(nodes, pos[0]);
    const chain = pathTo(nodes, n);
    console.log(anchor(n));
    console.log(`Thread path: ${chain.map((p) => `${p.id} ${p.text}`).join(" › ")}`);
    for (const note of n.notes) console.log(`Note: ${note.text}`);
  },

  status(pos, flags, nodes) {
    // This project's threads first: a tree counts as here if any node in it was opened here.
    const ctx = context(flags);
    const touchesHere = (n) => n.ctx === ctx || n.children.some(touchesHere);
    const live = [...nodes.values()].filter((n) => !n.parent && isLive(n)).sort(byRecent);
    const here = flags.all ? live : live.filter(touchesHere);
    const elsewhere = live.filter((n) => !here.includes(n));
    if (!live.length) return console.log("no open threads.");
    if (here.length) console.log(renderForest(here, { focus: flags.here }));
    else console.log(`no open threads in ${ctx}.`);
    if (elsewhere.length) {
      const where = [...new Set(elsewhere.map((n) => n.ctx))].join(", ");
      console.log(`
+ ${elsewhere.length} open elsewhere (${where}) — thread tree to see them all`);
    }
  },

  tree(pos, flags, nodes) {
    let roots = [...nodes.values()].filter((n) => !n.parent);
    if (pos[0]) roots = [pathTo(nodes, need(nodes, pos[0]))[0]];
    else if (!flags.all) roots = roots.filter(isLive);
    roots.sort(byRecent);
    if (!roots.length) return console.log("no threads.");
    console.log(flags.mermaid ? renderMermaid(roots) : renderForest(roots, { all: true, focus: flags.here }));
  },

  prune(pos, flags, nodes, _status, events) {
    const days = typeof flags.days === "string" ? Number(flags.days) : PRUNE_DAYS;
    const cutoff = Date.now() - days * 86400_000;
    const gone = new Set();
    const collect = (n) => {
      gone.add(n.id);
      n.children.forEach(collect);
    };
    for (const r of nodes.values()) {
      if (!r.parent && !isLive(r) && Date.parse(r.lastDeep) < cutoff) collect(r);
    }
    if (!gone.size) return console.log(`nothing finished more than ${days} days ago.`);
    const files = events.filter((e) => gone.has(e.id)).map((e) => path.relative(HOME, e._file));
    git(["rm", "--quiet", ...files]);
    commitAndPush(`prune ${gone.size} finished thread(s) older than ${days}d`);
    console.log(`pruned ${gone.size} thread(s) (still in git history).`);
  },

  sync() {
    commitAndPush("sync");
    console.log("synced.");
  },

  help() {
    console.log(`thread — a throwaway tree of intents, shared across machines, tools and chats

  thread [--all]                  open threads in this project, most recent first (alias: status)
  thread open "<text>" [--parent <id>] [--tool <name>] [--ctx <name>]
  thread resume <id>              pick a thread back up in this chat
  thread show <id>                one thread: path, notes, branches
  thread done|park|drop <id> ["<outcome>"]
  thread note <id> "<text>"
  thread move <id> --parent <id> | --root
  thread fork <id>                header for a handoff to a new chat
  thread tree [<id>] [--all] [--mermaid]
  thread prune [--days ${PRUNE_DAYS}]      remove finished trees (kept in git history)
  thread init [<git-url>]         clone/seed the store at ${HOME}
  thread sync                     push anything left unpushed

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
ensureStore();
pull();
const events = readEvents();
const nodes = buildTree(events);
const statuses = { done: "done", park: "parked", drop: "dropped" };
if (statuses[cmd]) commands.close(pos, flags, nodes, statuses[cmd]);
else if (commands[cmd]) commands[cmd](pos, flags, nodes, undefined, events);
else die(`unknown command "${cmd}". Try: thread help`);
