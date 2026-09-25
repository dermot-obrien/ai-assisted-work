// SPDX-License-Identifier: Apache-2.0
/**
 * The decks a workspace publishes, found from each document's own front matter.
 *
 * A document opts in and places itself. Nothing is registered anywhere else:
 *
 *   deck_publish: true            publish it
 *   deck_id: fy27-plan            permanent URL /decks/<id>/. Required, so renaming or
 *                                 moving the document never breaks a link
 *   deck_menu: "Planning / FY27"  where it sits in a site menu; omitted = top level
 *   deck_menu_label: "..."        optional; defaults to the title
 *   deck_menu_order: 10           optional; lower first within its group
 *
 * `findPublishedDecks` reads a workspace; `menuItems` turns the result into Docusaurus
 * navbar dropdown items. Both are CommonJS so a docusaurus.config.js can require them
 * synchronously. `markdown-deck publish` builds the decks themselves.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Never searched: dependency and build output, and any hidden folder, which covers
// .git, .agents, .claude and editor state in any workspace.
const DEFAULT_SKIP = ['node_modules', 'build', 'dist', '.docusaurus'];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function walk(dir, root, skipNames, skipPaths, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (e.name.startsWith('.') || skipNames.has(e.name) || skipPaths.has(rel)) continue;
      walk(full, root, skipNames, skipPaths, out);
    } else if (/\.mdx?$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Every document under `root` that asks to be published, and what is wrong with those
 * that cannot be. Problems are returned, not thrown, so a caller decides whether a
 * misconfigured deck fails its build.
 *
 * @param {string} root
 * @param {{skip?: string[], reserved?: string[]}} [opts]
 *   skip      extra folders to leave out, as names (`drafts`) or root-relative paths
 *             (`site/static`)
 *   reserved  ids already taken by something else that owns /decks/<id>/
 * @returns {{decks: object[], problems: string[]}}
 */
function findPublishedDecks(root, opts = {}) {
  const extra = opts.skip || [];
  const skipNames = new Set([...DEFAULT_SKIP, ...extra.filter((s) => !s.includes('/'))]);
  const skipPaths = new Set(extra.filter((s) => s.includes('/')).map((s) => s.replace(/^\/+|\/+$/g, '')));
  const reserved = new Set(opts.reserved || []);
  const decks = [];
  const problems = [];
  const seen = new Map();
  for (const file of walk(root, root, skipNames, skipPaths, [])) {
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.includes('deck_publish')) continue;          // cheap filter before parsing
    const rel = path.relative(root, file).split(path.sep).join('/');
    let data;
    try {
      data = matter(raw).data;
    } catch (e) {
      problems.push(`${rel}: front matter does not parse: ${e.message}`);
      continue;
    }
    if (data.deck_publish !== true) continue;
    const id = String(data.deck_id || '');
    if (!ID_RE.test(id)) {
      problems.push(`${rel}: deck_publish is set but deck_id "${id}" is missing or not lower-case-hyphenated`);
      continue;
    }
    if (seen.has(id)) {
      problems.push(`${rel}: deck_id "${id}" is already used by ${seen.get(id)}`);
      continue;
    }
    if (reserved.has(id)) {
      problems.push(`${rel}: deck_id "${id}" is reserved by something else at /decks/${id}/`);
      continue;
    }
    if (!raw.includes('<!-- deck:')) {
      problems.push(`${rel}: deck_publish is set but the document has no deck: tags`);
      continue;
    }
    seen.set(id, rel);
    decks.push({
      id,
      source: rel,
      title: String(data.title || data.sidebar_label || id),
      label: String(data.deck_menu_label || data.title || data.sidebar_label || id),
      menu: String(data.deck_menu || '').split('/').map((s) => s.trim()).filter(Boolean),
      order: Number.isFinite(Number(data.deck_menu_order)) ? Number(data.deck_menu_order) : 1000,
    });
  }
  return { decks, problems };
}

function byOrder(a, b) {
  return a.order - b.order || a.label.localeCompare(b.label);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Docusaurus navbar dropdown items for a set of decks. A dropdown cannot nest, so a menu
 * path becomes one group heading, "A › B" for a deeper path, with its decks beneath.
 * Top-level decks come first, then groups ordered by their lowest deck_menu_order.
 *
 * Any object with id, label, menu (array) and order can be passed, so decks from another
 * source can be merged in; `href` on an entry overrides its URL.
 *
 * @param {object[]} decks
 * @param {{base?: string, groupClass?: string, itemClass?: string}} [opts]
 *   base  the URL prefix decks are served under, default /decks/
 */
function menuItems(decks, opts = {}) {
  const base = `/${String(opts.base || '/decks/').replace(/^\/+|\/+$/g, '')}/`;
  const groupClass = opts.groupClass || 'deck-menu-group';
  const itemClass = opts.itemClass || 'deck-menu-item';
  const hrefOf = (d) => d.href || `pathname://${base}${d.id}/`;
  const items = [];
  for (const d of decks.filter((x) => !x.menu.length).sort(byOrder)) {
    items.push({ href: hrefOf(d), label: d.label });
  }
  const groups = new Map();
  for (const d of decks.filter((x) => x.menu.length)) {
    const key = d.menu.join(' › ');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  }
  const ordered = [...groups.entries()].sort((a, b) =>
    Math.min(...a[1].map((d) => d.order)) - Math.min(...b[1].map((d) => d.order)) || a[0].localeCompare(b[0]));
  for (const [heading, list] of ordered) {
    items.push({ type: 'html', value: `<span class="${groupClass}">${escapeHtml(heading)}</span>` });
    for (const d of list.sort(byOrder)) items.push({ href: hrefOf(d), label: d.label, className: itemClass });
  }
  return items;
}

module.exports = { findPublishedDecks, menuItems, ID_RE };
