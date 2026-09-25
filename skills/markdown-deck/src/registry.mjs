// SPDX-License-Identifier: Apache-2.0
/**
 * The published-deck registry: a committed record of every deck URL a workspace has ever
 * published, so a link someone was given cannot break without the build saying so.
 *
 * A deck's URL is /decks/<deck_id>/, and deck_id is stable only by convention. Editing
 * it, deleting the document or turning deck_publish off would all remove a URL with a
 * green build. The registry remembers, and `reconcile` compares:
 *
 *   a new deck                    is added (update mode) or is a problem (check mode)
 *   a published deck that is gone is a problem, until marked retired or redirected
 *   a redirected deck             gets a redirect page at its old URL, see writeRedirects
 *   a slide id that disappears    is a warning: links to it now open the first slide
 *
 * Update mode is for an author's machine, where the change is then committed. Check mode
 * is for CI, where an unregistered deck means the registry was not committed.
 *
 *   {
 *     "decks": {
 *       "fy27-plan": { "status": "published", "source": "plans/fy27.md",
 *                      "since": "2026-09-25", "slides": ["cover", "the-commitment"] },
 *       "old-plan":  { "status": "redirected", "redirect": "fy27-plan", ... },
 *       "gone-deck": { "status": "retired", ... }
 *     }
 *   }
 */

import fs from 'node:fs';
import path from 'node:path';

const STATUSES = ['published', 'retired', 'redirected'];

export function loadRegistry(file) {
  if (!fs.existsSync(file)) return { decks: {} };
  const reg = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!reg || typeof reg.decks !== 'object') throw new Error(`${file}: no "decks" object`);
  return reg;
}

export function saveRegistry(file, reg) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sorted = Object.fromEntries(Object.keys(reg.decks).sort().map((k) => [k, reg.decks[k]]));
  const out = {
    $comment: 'Every deck URL this workspace has published. Maintained by markdown-deck publish; '
      + 'commit it. To take a deck down, set its status to "retired", or to "redirected" with '
      + '"redirect": "<another deck_id>" so its old URL keeps working.',
    decks: sorted,
  };
  fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
}

/**
 * Compare what is published now with what has ever been published.
 *
 * @param {{decks: object}} reg          the registry, updated in place
 * @param {{id: string, source: string, slides?: string[]}[]} current
 *                                        every deck present now, from any source
 * @param {{mode?: 'update'|'check', today?: string, file?: string}} [opts]
 * @returns {{problems: string[], warnings: string[], notes: string[], changed: boolean}}
 */
export function reconcile(reg, current, opts = {}) {
  const mode = opts.mode || 'update';
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const where = opts.file ? ` in ${opts.file}` : '';
  const problems = [];
  const warnings = [];
  const notes = [];
  let changed = false;
  const now = new Map(current.map((d) => [d.id, d]));

  for (const [id, e] of Object.entries(reg.decks)) {
    if (!STATUSES.includes(e.status)) {
      problems.push(`registry entry "${id}" has status "${e.status}"; use ${STATUSES.join(', ')}`);
    }
  }

  for (const d of current) {
    const e = reg.decks[d.id];
    if (!e) {
      if (mode === 'check') {
        problems.push(`/decks/${d.id}/ (${d.source}) is not in the published-deck registry. `
          + 'Run the publish step locally and commit the registry.');
        continue;
      }
      reg.decks[d.id] = { status: 'published', source: d.source, since: today, ...(d.slides ? { slides: d.slides } : {}) };
      notes.push(`registered /decks/${d.id}/ from ${d.source}; commit the registry`);
      changed = true;
      continue;
    }
    if (e.status !== 'published') {
      notes.push(`/decks/${d.id}/ is published again; its ${e.status} status is lifted`);
      e.status = 'published';
      delete e.redirect;
      changed = true;
    }
    if (e.source !== d.source) {
      notes.push(`/decks/${d.id}/ now comes from ${d.source} (was ${e.source}); the URL is unchanged`);
      e.source = d.source;
      changed = true;
    }
    if (d.slides) {
      const removed = (e.slides || []).filter((s) => !d.slides.includes(s));
      for (const s of removed) {
        warnings.push(`/decks/${d.id}/#${s} no longer exists; a link to that slide now opens the deck at its start`);
      }
      if (JSON.stringify(e.slides || []) !== JSON.stringify(d.slides)) {
        e.slides = d.slides;
        changed = true;
      }
    }
  }

  for (const [id, e] of Object.entries(reg.decks)) {
    if (now.has(id)) continue;
    if (e.status === 'published') {
      problems.push(`/decks/${id}/ was published from ${e.source} and no longer is, so links to it would break. `
        + `Restore it, or set its status to "retired", or to "redirected" with "redirect": "<deck_id>"${where}.`);
    } else if (e.status === 'redirected') {
      if (!e.redirect) problems.push(`registry entry "${id}" is redirected but names no "redirect"`);
      else if (!now.has(e.redirect)) problems.push(`registry entry "${id}" redirects to "${e.redirect}", which is not published`);
    }
  }

  if (mode === 'check' && changed) {
    problems.push(`the published-deck registry is out of date${where}. Run the publish step locally and commit it.`);
  }
  return { problems, warnings, notes, changed: mode === 'update' && changed };
}

/**
 * A redirect page at each redirected deck's old URL, so a shared link still lands. The
 * target is a sibling folder, so the page works under any base path, and the slide
 * address after `#` is carried across.
 */
export function writeRedirects(out, reg, presentIds) {
  const written = [];
  for (const [id, e] of Object.entries(reg.decks)) {
    if (e.status !== 'redirected' || !e.redirect || presentIds.has(id)) continue;
    const target = `../${encodeURIComponent(e.redirect)}/`;
    const dir = path.join(out, id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved</title>
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.hash);</script>
</head>
<body><p>This deck has moved to <a href="${target}">${e.redirect}</a>.</p></body>
</html>
`);
    written.push(id);
  }
  return written;
}
