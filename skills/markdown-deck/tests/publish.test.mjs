// SPDX-License-Identifier: Apache-2.0
// Publishing a workspace: decks found from front matter, built to <out>/<id>/, and
// listed as Docusaurus menu items. Nothing here knows about any particular repository.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { publishAll } from '../src/publish.mjs';

const require = createRequire(import.meta.url);
const { findPublishedDecks, menuItems } = require('../src/catalog.cjs');

let root;
const write = (rel, text) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
};
const doc = (fm, body = '<!-- deck:slide -->\n## One\n\nText.\n') =>
  `---\ntitle: "Doc"\n${fm}---\n\n# Doc\n\n${body}`;
const quiet = { onLog: () => {}, onWarn: () => {} };

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-ws-'));
  write('plans/q1.md', doc('deck_publish: true\ndeck_id: q1-plan\ndeck_menu: "Planning"\ndeck_menu_order: 5\n'));
  write('arch/ref.md', doc('deck_publish: true\ndeck_id: ref-one\ndeck_menu: "Architecture / References"\ndeck_menu_label: "Ref One"\n'));
  write('top.md', doc('deck_publish: true\ndeck_id: top-deck\n'));
  write('notes/unpublished.md', doc('deck_publish: false\ndeck_id: nope\n'));
  write('notes/plain.md', '# No front matter\n');
  write('.hidden/skipped.md', doc('deck_publish: true\ndeck_id: hidden\n'));
  write('node_modules/pkg/readme.md', doc('deck_publish: true\ndeck_id: vendored\n'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test('finds only documents that publish themselves, never hidden or vendored ones', () => {
  const { decks, problems } = findPublishedDecks(root);
  assert.deepEqual(decks.map((d) => d.id).sort(), ['q1-plan', 'ref-one', 'top-deck']);
  assert.deepEqual(problems, []);
  const ref = decks.find((d) => d.id === 'ref-one');
  assert.deepEqual(ref.menu, ['Architecture', 'References']);
  assert.equal(ref.label, 'Ref One');
  assert.equal(ref.source, 'arch/ref.md');
});

test('misconfigured decks are problems, not silent omissions', () => {
  write('bad/no-id.md', doc('deck_publish: true\n'));
  write('bad/upper.md', doc('deck_publish: true\ndeck_id: Bad_Id\n'));
  write('bad/dupe.md', doc('deck_publish: true\ndeck_id: q1-plan\n'));
  write('bad/untagged.md', doc('deck_publish: true\ndeck_id: untagged\n', 'No tags here.\n'));
  write('bad/reserved.md', doc('deck_publish: true\ndeck_id: legacy\n'));
  const { problems } = findPublishedDecks(root, { reserved: ['legacy'] });
  assert.equal(problems.length, 5);
  for (const re of [/missing or not lower-case/, /Bad_Id/, /already used by/, /no deck: tags/, /reserved/]) {
    assert.ok(problems.some((p) => re.test(p)), re.source);
  }
});

test('extra folders can be left out by name or by path', () => {
  write('site/static/copy.md', doc('deck_publish: true\ndeck_id: copy\n'));
  write('drafts/wip.md', doc('deck_publish: true\ndeck_id: wip\n'));
  const ids = findPublishedDecks(root, { skip: ['site/static', 'drafts'] }).decks.map((d) => d.id);
  assert.ok(!ids.includes('copy') && !ids.includes('wip'));
});

test('menu items: top level first, then groups as headings, ordered', () => {
  const items = menuItems(findPublishedDecks(root).decks);
  assert.deepEqual(items.map((i) => i.type === 'html' ? `[${i.value.replace(/<[^>]+>/g, '')}]` : i.label), [
    'Doc', '[Planning]', 'Doc', '[Architecture › References]', 'Ref One',
  ]);
  assert.equal(items[0].href, 'pathname:///decks/top-deck/');
  assert.equal(items[2].className, 'deck-menu-item');
});

test('menu items take a different base path and entries from elsewhere', () => {
  const items = menuItems([
    { id: 'a', label: 'A', menu: [], order: 1 },
    { id: 'b', label: 'B', menu: [], order: 2, href: 'pathname:///legacy/b/start.html' },
  ], { base: 'slides' });
  assert.deepEqual(items.map((i) => i.href), ['pathname:///slides/a/', 'pathname:///legacy/b/start.html']);
});

test('publishAll builds each deck to <out>/<id>/index.html and never searches its output', async () => {
  const out = path.join(root, 'site', 'decks-out');
  const r1 = await publishAll(root, { out, ...quiet });
  assert.deepEqual(r1.problems, []);
  for (const id of ['q1-plan', 'ref-one', 'top-deck']) {
    assert.ok(fs.existsSync(path.join(out, id, 'index.html')), id);
  }
  const r2 = await publishAll(root, { out, ...quiet });
  assert.equal(r2.decks.length, 3, 'a second run does not find decks in its own output');
});

test('publishAll --list builds nothing', async () => {
  const out = path.join(root, 'out');
  const lines = [];
  await publishAll(root, { out, list: true, onLog: (m) => lines.push(m), onWarn: () => {} });
  assert.equal(fs.existsSync(out), false);
  assert.ok(lines.some((l) => /\/decks\/q1-plan\/\s+Planning/.test(l)));
});
