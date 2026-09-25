// SPDX-License-Identifier: Apache-2.0
// The published-deck registry: a published URL cannot disappear without the build saying so.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { reconcile, loadRegistry, saveRegistry, writeRedirects } from '../src/registry.mjs';
import { publishAll } from '../src/publish.mjs';

const deck = (id, source = `${id}.md`, slides) => ({ id, source, ...(slides ? { slides } : {}) });

test('a new deck is recorded in update mode', () => {
  const reg = { decks: {} };
  const r = reconcile(reg, [deck('a', 'a.md', ['cover', 'one'])], { today: '2026-09-25' });
  assert.deepEqual(r.problems, []);
  assert.equal(r.changed, true);
  assert.deepEqual(reg.decks.a, { status: 'published', source: 'a.md', since: '2026-09-25', slides: ['cover', 'one'] });
});

test('a new deck is a problem in check mode, and nothing is changed', () => {
  const reg = { decks: {} };
  const r = reconcile(reg, [deck('a')], { mode: 'check' });
  assert.match(r.problems[0], /not in the published-deck registry/);
  assert.equal(r.changed, false);
  assert.deepEqual(reg.decks, {});
});

test('a published deck that disappears is a problem', () => {
  const reg = { decks: { gone: { status: 'published', source: 'gone.md', since: '2026-01-01' } } };
  const r = reconcile(reg, [], { file: 'reg.json' });
  assert.match(r.problems[0], /\/decks\/gone\/ was published from gone\.md and no longer is.*retired.*reg\.json/);
});

test('retired and redirected decks may disappear', () => {
  const reg = { decks: {
    old: { status: 'retired', source: 'old.md' },
    moved: { status: 'redirected', redirect: 'new', source: 'moved.md' },
    new: { status: 'published', source: 'new.md' },
  } };
  assert.deepEqual(reconcile(reg, [deck('new', 'new.md')]).problems, []);
});

test('a redirect must name a deck that is published', () => {
  const reg = { decks: {
    a: { status: 'redirected', source: 'a.md' },
    b: { status: 'redirected', redirect: 'nowhere', source: 'b.md' },
  } };
  const p = reconcile(reg, []).problems.join('\n');
  assert.match(p, /"a" is redirected but names no "redirect"/);
  assert.match(p, /"b" redirects to "nowhere", which is not published/);
});

test('a moved source keeps its URL and is noted; a republished deck is lifted', () => {
  const reg = { decks: {
    a: { status: 'published', source: 'old/a.md' },
    b: { status: 'retired', source: 'b.md' },
  } };
  const r = reconcile(reg, [deck('a', 'new/a.md'), deck('b', 'b.md')]);
  assert.equal(reg.decks.a.source, 'new/a.md');
  assert.equal(reg.decks.b.status, 'published');
  assert.equal(r.notes.length, 2);
});

test('a removed slide is a warning, not a failure', () => {
  const reg = { decks: { a: { status: 'published', source: 'a.md', slides: ['cover', 'one', 'two'] } } };
  const r = reconcile(reg, [deck('a', 'a.md', ['cover', 'one'])]);
  assert.deepEqual(r.problems, []);
  assert.match(r.warnings[0], /\/decks\/a\/#two no longer exists/);
  assert.deepEqual(reg.decks.a.slides, ['cover', 'one']);
});

test('an unknown status is a problem', () => {
  assert.match(reconcile({ decks: { a: { status: 'archived' } } }, [deck('a')]).problems[0], /status "archived"/);
});

let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-reg-')); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

test('redirect pages go to the sibling deck and carry the slide address', () => {
  const reg = { decks: { old: { status: 'redirected', redirect: 'new' }, new: { status: 'published' } } };
  assert.deepEqual(writeRedirects(dir, reg, new Set(['new'])), ['old']);
  const html = fs.readFileSync(path.join(dir, 'old', 'index.html'), 'utf8');
  assert.match(html, /url=\.\.\/new\//);
  assert.match(html, /location\.replace\("\.\.\/new\/" \+ location\.hash\)/);
});

test('the registry file round-trips, sorted, with its instructions', () => {
  const file = path.join(dir, 'reg.json');
  saveRegistry(file, { decks: { b: { status: 'published' }, a: { status: 'retired' } } });
  const back = loadRegistry(file);
  assert.deepEqual(Object.keys(back.decks), ['a', 'b']);
  assert.match(back.$comment, /retired/);
  assert.deepEqual(loadRegistry(path.join(dir, 'missing.json')), { decks: {} });
});

const DOC = (id) => `---\ntitle: "${id}"\ndeck_publish: true\ndeck_id: ${id}\n---\n\n# ${id}\n\n<!-- deck:slide -->\n## One\n\nText.\n`;
const quiet = { onLog: () => {}, onWarn: () => {} };

test('publishAll records decks, fails when one disappears, and serves redirects', async () => {
  fs.writeFileSync(path.join(dir, 'a.md'), DOC('deck-a'));
  fs.writeFileSync(path.join(dir, 'b.md'), DOC('deck-b'));
  const registry = path.join(dir, 'registry.json');
  const out = path.join(dir, 'site');

  const first = await publishAll(dir, { out, registry, registryMode: 'update', ...quiet });
  assert.deepEqual(first.problems, []);
  assert.deepEqual(Object.keys(loadRegistry(registry).decks), ['deck-a', 'deck-b']);
  assert.deepEqual(loadRegistry(registry).decks['deck-a'].slides, ['one']);

  fs.rmSync(path.join(dir, 'b.md'));
  const second = await publishAll(dir, { out, registry, registryMode: 'update', ...quiet });
  assert.ok(second.problems.some((p) => /\/decks\/deck-b\/ was published/.test(p)));

  const reg = loadRegistry(registry);
  reg.decks['deck-b'] = { ...reg.decks['deck-b'], status: 'redirected', redirect: 'deck-a' };
  saveRegistry(registry, reg);
  const third = await publishAll(dir, { out, registry, registryMode: 'update', ...quiet });
  assert.deepEqual(third.problems, []);
  assert.match(fs.readFileSync(path.join(out, 'deck-b', 'index.html'), 'utf8'), /url=\.\.\/deck-a\//);
});

test('decks published some other way are protected too', async () => {
  const registry = path.join(dir, 'registry.json');
  const out = path.join(dir, 'site');
  const external = [{ id: 'hand-built', source: 'site/decks/hand-built/manifest.json' }];
  await publishAll(dir, { out, registry, registryMode: 'update', external, ...quiet });
  assert.equal(loadRegistry(registry).decks['hand-built'].status, 'published');
  const r = await publishAll(dir, { out, registry, registryMode: 'update', external: [], ...quiet });
  assert.ok(r.problems.some((p) => /hand-built/.test(p)));
});

test('an include that breaks fails the run without stopping the other decks', async () => {
  fs.writeFileSync(path.join(dir, 'a.md'), DOC('deck-a'));
  fs.writeFileSync(path.join(dir, 'b.md'), DOC('deck-b').replace('Text.', 'Text.\n\n<!-- deck:include src="./gone.md" section="X" -->'));
  const r = await publishAll(dir, { out: path.join(dir, 'site'), registry: false, ...quiet });
  assert.ok(r.problems.some((p) => /b\.md: deck:include.*no such file/.test(p)));
  assert.ok(fs.existsSync(path.join(dir, 'site', 'deck-a', 'index.html')));
});
