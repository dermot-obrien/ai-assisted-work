// SPDX-License-Identifier: Apache-2.0
// deck:include: a section of another document, rendered live in this deck.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../src/index.mjs';
import { collectSlides } from '../src/parse.mjs';

let root;
const write = (rel, text) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
};
const quiet = { onWarn: () => {} };

// A methodology document that is not a deck at all, and a published deck that is.
const PLAYBOOK = `---
title: "Quarter Planning Playbook"
sidebar_label: "Planning Playbook"
---

# Quarter Planning Playbook

## The Two Planning Stages

Stage 1 allocates a budget. Stage 2 sizes the products. See [the register][REG].

![stages](./img/stages.png)

### Stage detail

Detail beneath stays with its section.

## Something Else

Not included.

[REG]: https://example.org/register
`;

const PUBLISHED = `---
title: "Published Deck"
deck_publish: true
deck_id: published-deck
---

# Published Deck

<!-- deck:slide label="Key point" -->
## The key point

Published content.
`;

const HOST = (tags) => `---
title: "Host"
---

# Host

<!-- deck:slide -->
## Own slide

Own content.

${tags}
`;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-inc-'));
  fs.mkdirSync(path.join(root, '.git'));                   // the workspace root
  write('method/playbook.md', PLAYBOOK);
  write('method/img/stages.png', 'png');
  write('decks/published.md', PUBLISHED);
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test('the tag is parsed in document order', () => {
  const s = collectSlides(HOST('<!-- deck:include src="./x.md" section="S" title="T" -->'));
  assert.deepEqual(s.map((x) => x.kind), ['content', 'include']);
  assert.equal(s[1].src, './x.md');
  assert.equal(s[1].section, 'S');
  assert.equal(s[1].title, 'T');
});

test('a section of any document, by heading, with its subsections, links and images', () => {
  const host = write('plans/q1.md', HOST('<!-- deck:include src="../method/playbook.md" section="the two planning stages" -->'));
  const r = build(host, { out: path.join(root, 'out'), ...quiet });
  assert.deepEqual(r.manifest.slides.map((s) => s.title), ['Own slide', 'The Two Planning Stages']);
  assert.equal(r.manifest.slides[1].source, '../method/playbook.md');
  assert.match(r.deckHtml, /<div class="eyebrow">From Planning Playbook<\/div>/);
  assert.match(r.deckHtml, /Stage 1 allocates a budget/);
  assert.match(r.deckHtml, /Detail beneath stays with its section/);
  assert.doesNotMatch(r.deckHtml, /Not included/);
  assert.match(r.deckHtml, /<a href="https:\/\/example\.org\/register">the register<\/a>/, 'links resolve from the source');
  assert.ok(fs.existsSync(path.join(root, 'out', 'assets', 'stages.png')), 'images resolve from the source');
});

test('a published deck by its id, and one of its slides by id', () => {
  const host = write('plans/q1.md', HOST('<!-- deck:include deck="published-deck" slide="key-point" title="Borrowed" -->'));
  const r = build(host, { out: path.join(root, 'out'), ...quiet });
  assert.equal(r.manifest.slides[1].title, 'Borrowed');
  assert.match(r.deckHtml, /Published content/);
  assert.match(r.deckHtml, /From Published Deck/);
});

test('moving the source does not break an include by deck id', () => {
  fs.renameSync(path.join(root, 'decks'), path.join(root, 'moved-elsewhere'));
  const host = write('plans/q1.md', HOST('<!-- deck:include deck="published-deck" section="The key point" -->'));
  assert.match(build(host, { out: path.join(root, 'out'), ...quiet }).deckHtml, /Published content/);
});

test('anything that cannot be found fails the build and says what exists', () => {
  const cases = [
    ['<!-- deck:include src="../method/gone.md" section="X" -->', /no such file/],
    ['<!-- deck:include src="../method/playbook.md" section="No Such Heading" -->', /no section headed "No Such Heading"/],
    ['<!-- deck:include deck="no-such-deck" section="X" -->', /no published deck has that id.*published-deck/],
    ['<!-- deck:include deck="published-deck" slide="nope" -->', /no slide "nope".*key-point/],
    ['<!-- deck:include src="./q1.md" section="Own slide" -->', /includes itself/],
  ];
  for (const [tag, re] of cases) {
    const host = write('plans/q1.md', HOST(tag));
    assert.throws(() => build(host, { out: path.join(root, 'out'), ...quiet }), re, tag);
  }
});

test('an include tag missing its target is warned about and skipped', () => {
  const warnings = [];
  const host = write('plans/q1.md', HOST('<!-- deck:include section="X" -->'));
  const r = build(host, { out: path.join(root, 'out'), onWarn: (m) => warnings.push(m) });
  assert.equal(r.manifest.slides.length, 1);
  assert.ok(warnings.some((w) => /needs src or deck/.test(w)));
});

test('an included section that is only an image fills the slide, with a source tag', () => {
  write('decks/pic.md', `---\ntitle: "Pictures"\ndeck_publish: true\ndeck_id: pictures\n---\n\n# Pictures\n\n<!-- deck:slide label="The view" -->\n## Diagram\n\n![view](./view.svg)\n\n<!-- deck:skip -->\nA note that stays in the document.\n<!-- /deck:skip -->\n`);
  write('decks/view.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"/>');
  const host = write('plans/q1.md', HOST('<!-- deck:include deck="pictures" slide="the-view" title="The view, large" -->'));
  const r = build(host, { out: path.join(root, 'out'), ...quiet });
  assert.equal(r.manifest.slides[1].kind, 'image');
  assert.match(r.deckHtml, /<section class="slide image-slide" data-slide="the-view-large" aria-label="The view, large">/);
  assert.match(r.deckHtml, /<img class="slide-image" src="assets\/view\.svg"/);
  assert.match(r.deckHtml, /<span class="image-caption">From Pictures<\/span>/);
  assert.ok(fs.existsSync(path.join(root, 'out', 'assets', 'view.svg')));

  const kept = write('plans/q2.md', HOST('<!-- deck:include deck="pictures" slide="the-view" header="true" -->'));
  const k = build(kept, { out: path.join(root, 'out2'), ...quiet });
  assert.equal(k.manifest.slides[1].kind, 'content', 'header="true" keeps the header layout');
  assert.match(k.deckHtml, /From Pictures<\/div>/);
});

test('an included slide names its source by the source eyebrow, unless the tag overrides it', () => {
  write('method/named.md', PLAYBOOK.replace('sidebar_label: "Planning Playbook"', 'sidebar_label: "Planning Playbook"\ndeck_eyebrow: "Planning method"'));
  const a = build(write('plans/a.md', HOST('<!-- deck:include src="../method/named.md" section="The Two Planning Stages" -->')), { out: path.join(root, 'a'), ...quiet });
  assert.match(a.deckHtml, /<div class="eyebrow">From Planning method<\/div>/);
  const b = build(write('plans/b.md', HOST('<!-- deck:include src="../method/named.md" section="The Two Planning Stages" eyebrow="Method" -->')), { out: path.join(root, 'b'), ...quiet });
  assert.match(b.deckHtml, /<div class="eyebrow">Method<\/div>/);
});
