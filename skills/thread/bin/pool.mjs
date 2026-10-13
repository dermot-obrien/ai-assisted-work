// SPDX-FileCopyrightText: 2026 Dermot O'Brien
// SPDX-License-Identifier: Apache-2.0

/**
 * pool — how the board starts agents on each platform (WI-003 A7).
 *
 * A starter turns one platform's entry in pool.json into a running agent with the pointer
 * prompt, and says what it started. Four kinds:
 *
 *   command   runs a program (no shell): "run" is its argv with {prompt}, {repo}, {branch},
 *             {source} and {env} filled in, such as gh agent-task create for Copilot
 *   cursor    Cursor's cloud agents API, with the key named in "key" ($CURSOR_API_KEY)
 *   jules     the Jules API, with the key named in "key" ($JULES_API_KEY); asks Jules to open
 *             the pull request itself
 *   ask       nothing a script can start: the dispatcher session starts it with its own tools
 *             (a Claude Code session with create_session, Copilot through the GitHub tools)
 *
 * Keys are read from the environment, never from pool.json. Zero dependencies; Node 18+.
 */

import { spawnSync } from "node:child_process";

export const STARTERS = ["command", "cursor", "jules", "ask"];

const DEFAULT_PROMPT = "Go pick up work in {source}. Work from branch {branch} and open your pull request into it. Take one task only.";

/** Fill {name} placeholders from vars; unknown ones are left as they are. */
const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));

/** The values a platform's templates see: the pool's repo, branch and source, the platform's env, and the prompt. */
export function varsFor(pool, platform, source) {
  const base = { repo: platform.repo || pool.repo, branch: platform.branch || pool.branch, source, env: platform.env || "" };
  return { ...base, prompt: fill(platform.prompt || pool.prompt || DEFAULT_PROMPT, base) };
}

/** Problems with a pool.json, as sentences; empty when it can be used. */
export function checkPool(pool) {
  const out = [];
  if (!pool || !Array.isArray(pool.platforms) || !pool.platforms.length) return ["pool.json needs a platforms list"];
  const names = new Set();
  for (const p of pool.platforms) {
    if (!p.name) out.push("every platform needs a name");
    else if (names.has(p.name)) out.push(`platform ${p.name} is listed twice`);
    names.add(p.name);
    if (!STARTERS.includes(p.starter)) out.push(`${p.name}: starter is one of ${STARTERS.join(", ")}`);
    if (p.starter === "command" && !Array.isArray(p.run)) out.push(`${p.name}: a command starter needs run, the program and its arguments as a list`);
    if ((p.starter === "cursor" || p.starter === "jules") && !p.key) out.push(`${p.name}: name the environment variable holding its API key in key`);
    if (!(p.repo || pool.repo) || !(p.branch || pool.branch)) out.push(`${p.name}: needs a repo and a branch, on the platform or the pool`);
  }
  return out;
}

async function post(url, headers, body) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  return json || {};
}

/**
 * Start one agent. Resolves to { ok, id?, url?, asked?, error? }; never throws, so a failed
 * start is recorded like any other.
 */
export async function startAgent(pool, platform, source, env = process.env) {
  const v = varsFor(pool, platform, source);
  try {
    switch (platform.starter) {
      case "ask":
        return { ok: true, asked: true };
      case "command": {
        const [cmd, ...args] = platform.run.map((a) => fill(a, v));
        const r = spawnSync(cmd, args, { encoding: "utf8", env });
        if (r.error) return { ok: false, error: r.error.message };
        if (r.status !== 0) return { ok: false, error: `${cmd} exited ${r.status}: ${(r.stderr || r.stdout || "").trim().slice(0, 300)}` };
        const out = (r.stdout || "").trim();
        return { ok: true, url: /https?:\/\/\S+/.exec(out)?.[0], id: out.split("\n").pop()?.slice(0, 120) || undefined };
      }
      case "cursor": {
        const key = env[platform.key];
        if (!key) return { ok: false, error: `$${platform.key} is not set` };
        const r = await post(platform.url || "https://api.cursor.com/v0/agents", { authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` }, {
          prompt: { text: v.prompt },
          source: { repository: `https://github.com/${v.repo}`, ref: v.branch },
          ...(platform.model ? { model: platform.model } : {}),
        });
        return { ok: true, id: r.id, url: r.target?.url || r.url };
      }
      case "jules": {
        const key = env[platform.key];
        if (!key) return { ok: false, error: `$${platform.key} is not set` };
        const r = await post(platform.url || "https://jules.googleapis.com/v1alpha/sessions", { "x-goog-api-key": key }, {
          prompt: v.prompt,
          title: `board: ${source}`,
          sourceContext: { source: `sources/github/${v.repo}`, githubRepoContext: { startingBranch: v.branch } },
          automationMode: "AUTO_CREATE_PR",
        });
        return { ok: true, id: r.id || r.name, url: r.url };
      }
    }
    return { ok: false, error: `unknown starter ${platform.starter}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
