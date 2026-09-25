// SPDX-License-Identifier: Apache-2.0
/**
 * Build every deck a workspace publishes into `<out>/<deck_id>/index.html`.
 *
 * The decks are found from front matter by catalog.cjs, so a site needs only to run this
 * before its own build and serve `<out>` as static files. Each deck resolves its settings
 * as `build()` always does: its front matter, then the workspace's [suite.markdown-deck]
 * binding, then the built-in defaults.
 *
 * When the workspace keeps a published-deck registry (`registry` in the binding, or the
 * `registry` option), every published URL is checked against it: see registry.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from './index.mjs';
import { exportPdf } from './pdf.mjs';
import { repoDefaults } from './bindings.mjs';
import { loadRegistry, saveRegistry, reconcile, writeRedirects } from './registry.mjs';

const require = createRequire(import.meta.url);
const { findPublishedDecks } = require('./catalog.cjs');

/** The registry file: an explicit path, `false` for none, or the workspace binding. */
function registryFile(root, opt) {
  if (opt === false) return null;
  if (opt) return path.resolve(opt);
  const { file, values } = repoDefaults(root);
  return file && values.registry ? path.resolve(path.dirname(file), String(values.registry)) : null;
}

/**
 * @param {string} root   the workspace to search
 * @param {{out: string, skip?: string[], reserved?: string[], list?: boolean, pdf?: boolean,
 *          registry?: string|false, registryMode?: 'update'|'check',
 *          external?: {id: string, source: string}[],
 *          onLog?: Function, onWarn?: Function}} opts
 *   external       decks published some other way that the registry should also protect
 *   registryMode   'update' records new decks; 'check' fails on them. Defaults to 'check'
 *                  when the CI environment variable is set, as it is in most CI systems
 * @returns {Promise<{decks: object[], problems: string[], warnings: string[], graph: object[]}>}
 *   graph          per built deck, the documents and images it was built from; see
 *                  formatGraph
 */
export async function publishAll(root, opts) {
  const onLog = opts.onLog || ((m) => console.log(m));
  const onWarn = opts.onWarn || ((m) => console.error(`  ! ${m}`));
  const out = path.resolve(opts.out);
  // Never search the output: a previous run's decks are not sources.
  const rel = path.relative(path.resolve(root), out).split(path.sep).join('/');
  const skip = [...(opts.skip || []), ...(rel && !rel.startsWith('..') ? [rel] : [])];
  const { decks, problems } = findPublishedDecks(root, { skip, reserved: opts.reserved });
  const warnings = [];
  const current = [];
  const graph = [];

  for (const d of decks) {
    if (opts.list) {
      onLog(`  /decks/${d.id}/  ${d.menu.join(' / ') || '(top level)'}  ${d.label}  <- ${d.source}`);
      current.push({ id: d.id, source: d.source });
      continue;
    }
    const dir = path.join(out, d.id);
    fs.rmSync(dir, { recursive: true, force: true });
    let r;
    try {
      r = build(path.join(root, d.source), {
        out: dir, deckId: d.id, htmlName: 'index.html', root,
        onWarn: (m) => onWarn(`${d.source}: ${m}`),
      });
    } catch (e) {
      // One broken deck, such as an include whose target moved, fails the run but does
      // not stop the others being built and reported.
      problems.push(`${d.source}: ${e.message}`);
      current.push({ id: d.id, source: d.source });
      continue;
    }
    onLog(`  /decks/${d.id}/  ${r.manifest.slides.length} slide(s) <- ${d.source}`);
    graph.push({ id: d.id, source: d.source, ...r.manifest.dependencies });
    current.push({
      id: d.id, source: d.source,
      slides: [...(r.manifest.cover ? ['cover'] : []), ...r.manifest.slides.map((s) => s.file)],
    });
    if (opts.pdf) await exportPdf(path.join(dir, 'index.html'), path.join(dir, `${d.id}.pdf`), { onLog });
  }

  const file = registryFile(root, opts.registry);
  if (file) {
    const reg = loadRegistry(file);
    const mode = opts.registryMode || (process.env.CI ? 'check' : 'update');
    const r = reconcile(reg, [...current, ...(opts.external || [])], {
      mode, file: path.relative(root, file).split(path.sep).join('/'),
    });
    problems.push(...r.problems);
    warnings.push(...r.warnings);
    for (const n of r.notes) onLog(`  ${n}`);
    if (r.changed && !opts.list) saveRegistry(file, reg);
    if (!opts.list) {
      const present = new Set([...current, ...(opts.external || [])].map((d) => d.id));
      for (const id of writeRedirects(out, reg, present)) onLog(`  /decks/${id}/  redirect to /decks/${reg.decks[id].redirect}/`);
    }
  }

  for (const w of warnings) onWarn(w);
  for (const p of problems) onWarn(p);
  return { decks, problems, warnings, graph };
}

/**
 * The dependency graph as text: each deck with what it draws on, then every document or
 * diagram that more than one deck draws on, which is where a change travels furthest.
 */
export function formatGraph(graph) {
  const lines = [];
  const users = new Map();
  const use = (key, id) => users.set(key, [...(users.get(key) || []), id]);
  for (const g of graph) {
    lines.push(`  ${g.id}  <- ${g.source}`);
    for (const doc of (g.documents || []).filter((x) => x !== g.source)) {
      lines.push(`    includes  ${doc}`);
      use(doc, g.id);
    }
    use(g.source, g.id);
    for (const img of g.images || []) {
      if (!img.source) continue;
      lines.push(`    image     ${img.path}  <- ${img.source}${img.stale ? '  STALE' : ''}`);
      use(img.source, g.id);
    }
  }
  const shared = [...users].filter(([, ids]) => new Set(ids).size > 1);
  if (shared.length) {
    lines.push('', '  Used by more than one deck:');
    for (const [key, ids] of shared) lines.push(`    ${key}  -> ${[...new Set(ids)].join(', ')}`);
  }
  return lines.join('\n');
}
