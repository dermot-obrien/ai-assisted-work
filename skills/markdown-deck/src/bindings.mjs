// SPDX-License-Identifier: Apache-2.0
/**
 * Repository defaults for markdown-deck.
 *
 * A repository sets defaults once, in `[suite.markdown-deck]` of its
 * `.agents/skill-bindings.toml`, the file that binds the whole skill suite to the host
 * repository. A deck overrides any of them in its front matter, and a command-line option
 * overrides both:
 *
 *     option  >  front matter  >  repository binding  >  built-in default
 *
 * The keys this skill accepts are declared in `inputs.toml` beside SKILL.md, so
 * `model doctor --skill markdown-deck` can check a repository's answer against them.
 *
 * Only the one section is read, with a deliberately small TOML reader: strings, booleans
 * and numbers. Node has no TOML parser built in, and a dependency for eight lines of
 * configuration is not worth its weight.
 */

import fs from 'node:fs';
import path from 'node:path';

export const SECTION = 'suite.markdown-deck';
const NAMES = [path.join('.agents', 'skill-bindings.toml'), 'skill-bindings.toml'];

/** The nearest binding file at or above `start`, or null. */
export function findBindings(start) {
  let dir = path.resolve(start);
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) dir = path.dirname(dir);
  for (;;) {
    for (const n of NAMES) {
      const p = path.join(dir, n);
      if (fs.existsSync(p)) return p;
    }
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function value(raw, where) {
  const s = raw.trim();
  if (s.startsWith('"')) {
    let out = '';
    for (let i = 1; i < s.length; i++) {
      const c = s[i];
      if (c === '\\') {
        const n = s[++i];
        out += { n: '\n', t: '\t', '"': '"', '\\': '\\' }[n] ?? n;
      } else if (c === '"') {
        return out;
      } else {
        out += c;
      }
    }
    throw new Error(`${where}: unterminated string`);
  }
  if (s.startsWith("'")) {
    const end = s.indexOf("'", 1);
    if (end < 0) throw new Error(`${where}: unterminated string`);
    return s.slice(1, end);
  }
  const bare = s.replace(/\s+#.*$/, '');
  if (bare === 'true') return true;
  if (bare === 'false') return false;
  if (/^[+-]?\d+(\.\d+)?$/.test(bare)) return Number(bare);
  throw new Error(`${where}: unsupported value ${JSON.stringify(s)}; use a quoted string, true, false or a number`);
}

/**
 * The key-value pairs of one `[section]` of a TOML file.
 *
 * A one-level sub-table, `[section.name]`, becomes a nested object on `out.name`. That
 * is what lets a repository express a palette as tokens rather than CSS:
 *
 *     [suite.markdown-deck.palette]
 *     heading = "#143a5a"
 *
 * Anything deeper is ignored, as is any other section. Still a deliberately small reader.
 */
export function readSection(text, section = SECTION, file = 'bindings') {
  const out = {};
  let target = null;
  text.split(/\r?\n/).forEach((line, k) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const h = t.match(/^\[\s*([^\]]+?)\s*\]\s*(#.*)?$/);
    if (h) {
      if (h[1] === section) {
        target = out;
      } else if (h[1].startsWith(`${section}.`)) {
        const name = h[1].slice(section.length + 1);
        target = name.includes('.') ? null : (out[name] ??= {});
      } else {
        target = null;
      }
      return;
    }
    if (!target) return;
    const m = t.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (m) target[m[1]] = value(m[2], `${file}:${k + 1}`);
  });
  return out;
}

/**
 * The workspace a document belongs to: the folder holding its binding file (the parent of
 * `.agents/`), else the nearest folder with a `.git`, else the document's own folder.
 * Used to find other decks by id, for `deck:include deck="..."`.
 */
export function workspaceRoot(start) {
  const file = findBindings(start);
  if (file) {
    const dir = path.dirname(file);
    return path.basename(dir) === '.agents' ? path.dirname(dir) : dir;
  }
  let dir = path.resolve(start);
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) dir = path.dirname(dir);
  for (let d = dir; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    if (path.dirname(d) === d) return dir;
  }
}

/**
 * Repository defaults for a document, and where they came from.
 * @returns {{file: string|null, values: object}}
 */
export function repoDefaults(start) {
  const file = findBindings(start);
  if (!file) return { file: null, values: {} };
  return { file, values: readSection(fs.readFileSync(file, 'utf8'), SECTION, file) };
}
