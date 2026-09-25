// SPDX-License-Identifier: Apache-2.0
// build(): from a tagged file on disk to deck.html, manifest.json and assets/.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, listThemes, loadTheme } from '../src/index.mjs';

let dir;
const write = (name, text) => {
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
};
const quiet = { onWarn: () => {} };

const DOC = `---
title: "Test Deck"
sidebar_label: "Test"
---

# Test Deck

<!-- deck:cover subtitle="A subtitle" -->

<!-- deck:slide label="Picture" -->
## Diagram

![A diagram](./pic.svg)

<!-- deck:slide -->
## Words

Some words.
`;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-'));
  write('pic.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"/>');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

test('writes the deck, the manifest and copies local images', () => {
  const src = write('doc.md', DOC);
  const r = build(src, { out: path.join(dir, 'dist'), ...quiet });
  const html = fs.readFileSync(path.join(dir, 'dist', 'deck.html'), 'utf8');
  assert.match(html, /<title>Test Deck<\/title>/);
  assert.match(html, /src="assets\/pic\.svg"/);
  assert.ok(fs.existsSync(path.join(dir, 'dist', 'assets', 'pic.svg')));
  assert.equal(r.manifest.cover, true);
  assert.deepEqual(r.manifest.slides.map((s) => s.label), ['Picture', 'Words']);
});

test('the eyebrow defaults to the sidebar label', () => {
  const src = write('doc.md', DOC);
  const html = build(src, { out: path.join(dir, 'dist'), ...quiet }).deckHtml;
  assert.match(html, /<div class="eyebrow">Test<\/div>/);
});

test('titles only by default; thumbnails from the option or front matter', () => {
  const src = write('doc.md', DOC);
  const titles = build(src, { out: path.join(dir, 'a'), ...quiet }).deckHtml;
  assert.doesNotMatch(titles, /<body class="index-thumbs">/);

  const byOption = build(src, { out: path.join(dir, 'b'), thumbnails: true, ...quiet }).deckHtml;
  assert.match(byOption, /<body class="index-thumbs">/);

  const fm = write('fm.md', DOC.replace('sidebar_label: "Test"', 'sidebar_label: "Test"\ndeck_thumbnails: true'));
  assert.match(build(fm, { out: path.join(dir, 'c'), ...quiet }).deckHtml, /<body class="index-thumbs">/);

  const off = build(fm, { out: path.join(dir, 'd'), thumbnails: false, ...quiet }).deckHtml;
  assert.doesNotMatch(off, /<body class="index-thumbs">/, 'the option overrides front matter');
});

test('a missing image is warned about and left as written', () => {
  const src = write('doc.md', DOC.replace('./pic.svg', './gone.svg'));
  const warnings = [];
  build(src, { out: path.join(dir, 'dist'), onWarn: (m) => warnings.push(m) });
  assert.ok(warnings.some((w) => /gone\.svg/.test(w)));
});

test('a slide left empty by deck:skip is dropped with a warning', () => {
  const src = write('doc.md', DOC.replace('Some words.', '<!-- deck:skip -->\nhidden\n<!-- /deck:skip -->'));
  const warnings = [];
  const r = build(src, { out: path.join(dir, 'dist'), onWarn: (m) => warnings.push(m) });
  assert.deepEqual(r.manifest.slides.map((s) => s.label), ['Picture']);
  assert.ok(warnings.some((w) => /empty/.test(w)));
});

test('a document with no deck tags is refused', () => {
  const src = write('plain.md', '# Plain\n\nNothing tagged.\n');
  assert.throws(() => build(src, { out: path.join(dir, 'dist'), ...quiet }), /no deck: tags/);
});

test('every built-in theme loads with the base layout', () => {
  const names = listThemes();
  assert.ok(names.includes('default'));
  for (const n of names) assert.match(loadTheme(n), /\.slide \{/, n);
  assert.throws(() => loadTheme('no-such-theme'), /no such theme/);
});

test('comments, feedback and the deck id come from options or front matter', () => {
  const fm = write('c.md', DOC.replace('sidebar_label: "Test"', [
    'sidebar_label: "Test"', 'version: "1.2"', 'deck_id: "My Deck"', 'deck_comments: true',
    'deck_feedback_to: "owner@example.com"', 'deck_feedback_subject: "Deck review"'].join('\n')));
  const r = build(fm, { out: path.join(dir, 'c'), ...quiet });
  const cfg = JSON.parse(r.deckHtml.match(/id="deck-config">([\s\S]*?)<\/script>/)[1]);
  assert.equal(cfg.id, 'my-deck', 'the id is slugged, so it is safe in a URL and a storage key');
  assert.equal(cfg.version, '1.2');
  assert.deepEqual(cfg.feedback, { to: 'owner@example.com', subject: 'Deck review', method: 'email' });
  assert.equal(r.manifest.id, 'my-deck');

  const src = write('doc.md', DOC);
  const opt = build(src, { out: path.join(dir, 'o'), comments: true, feedbackTo: 'x@y.z', deckId: 'opt', ...quiet });
  assert.match(opt.deckHtml, /"id":"opt"/);
  assert.match(opt.deckHtml, /"to":"x@y.z"/);
  assert.doesNotMatch(build(src, { out: path.join(dir, 'n'), ...quiet }).deckHtml, /id="deck-config"/);
});

test('the deck can be written as index.html, to serve at its folder URL', () => {
  const src = write('doc.md', DOC);
  const r = build(src, { out: path.join(dir, 'site'), htmlName: 'index.html', ...quiet });
  assert.ok(fs.existsSync(path.join(dir, 'site', 'index.html')));
  assert.equal(r.manifest.html, 'index.html');
});

// A minimal PNG header: signature, IHDR length and type, width, height.
function png(file, w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  fs.writeFileSync(file, b);
}

test('reference links resolve on every slide, wherever the definitions sit', () => {
  const src = write('refs.md', DOC.replace('Some words.', 'See [EPIC-1][EPIC-1] and [the epic][EPIC-1].')
    + '\n[EPIC-1]: https://jira.example.com/browse/EPIC-1\n');
  const html = build(src, { out: path.join(dir, 'r'), ...quiet }).deckHtml;
  assert.equal((html.match(/<a href="https:\/\/jira\.example\.com\/browse\/EPIC-1">/g) || []).length, 2);
  assert.doesNotMatch(html, /\]\[EPIC-1\]/);
});

test('an image slide copies its image, fills the canvas, and joins the index', () => {
  png(path.join(dir, 'hd.png'), 1920, 1080);
  const src = write('img.md', DOC.replace('<!-- deck:slide -->\n## Words',
    '<!-- deck:image src="./hd.png" title="Imported slide" -->\n\n<!-- deck:slide -->\n## Words'));
  const warnings = [];
  const r = build(src, { out: path.join(dir, 'i'), onWarn: (m) => warnings.push(m) });
  assert.ok(fs.existsSync(path.join(dir, 'i', 'assets', 'hd.png')));
  assert.match(r.deckHtml, /<section class="slide image-slide" data-slide="imported-slide" aria-label="Imported slide">/);
  assert.match(r.deckHtml, /<img class="slide-image" src="assets\/hd\.png" alt="Imported slide">/);
  assert.match(r.deckHtml, /<span class="cap">Imported slide<\/span>/);
  assert.deepEqual(r.manifest.slides.map((s) => `${s.kind}:${s.label}`),
    ['content:Picture', 'image:Imported slide', 'content:Words']);
  assert.deepEqual(warnings, [], 'a 1920x1080 PNG is exactly right');
});

test('an image slide warns when it is not 16:9, or not high definition', () => {
  png(path.join(dir, 'square.png'), 1000, 1000);
  png(path.join(dir, 'small.png'), 1280, 720);
  const src = write('warn.md', `# W\n\n<!-- deck:image src="./square.png" title="Square" -->\n\n<!-- deck:image src="./small.png" title="Small" -->\n\n<!-- deck:image src="./gone.png" title="Gone" -->\n`);
  const warnings = [];
  const r = build(src, { out: path.join(dir, 'w'), onWarn: (m) => warnings.push(m) });
  assert.ok(warnings.some((w) => /Square.*not 16:9/.test(w)));
  assert.ok(warnings.some((w) => /Small.*1280x720.*soft/.test(w)));
  assert.ok(warnings.some((w) => /Gone.*skipped/.test(w)));
  assert.deepEqual(r.manifest.slides.map((s) => s.label), ['Square', 'Small']);
});

test('header="true" puts the deck header above the image instead', () => {
  png(path.join(dir, 'hd.png'), 1920, 1080);
  const src = write('hdr.md', '# H\n\n<!-- deck:image src="./hd.png" title="With header" header="true" -->\n');
  const html = build(src, { out: path.join(dir, 'h'), ...quiet }).deckHtml;
  assert.match(html, /<h1>With header<\/h1>/);
  assert.doesNotMatch(html, /<section class="slide image-slide"/);
});

test('the eyebrow comes from deck_eyebrow, can be turned off, and a slide can override it', () => {
  const src = write('eb.md', DOC.replace('sidebar_label: "Test"', 'sidebar_label: "Test"\ndeck_eyebrow: "FY27 Q1 Resourcing"')
    .replace('<!-- deck:slide -->\n## Words', '<!-- deck:slide eyebrow="Appendix" -->\n## Words'));
  const html = build(src, { out: path.join(dir, 'eb'), ...quiet }).deckHtml;
  assert.match(html, /<div class="eyebrow">FY27 Q1 Resourcing<\/div>\s*<h1>Diagram<\/h1>/);
  assert.match(html, /<div class="eyebrow">Appendix<\/div>\s*<h1>Words<\/h1>/);
  const off = write('off.md', DOC.replace('sidebar_label: "Test"', 'sidebar_label: "Test"\ndeck_eyebrow: ""'));
  assert.doesNotMatch(build(off, { out: path.join(dir, 'off'), ...quiet }).deckHtml, /<div class="eyebrow">/);
});
