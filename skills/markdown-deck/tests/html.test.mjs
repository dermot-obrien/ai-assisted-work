// SPDX-License-Identifier: Apache-2.0
// deck:html slides and media: a designed HTML file as a whole slide, isolated in a frame,
// with its local resources copied beside the deck; and video or audio in Markdown slides.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../src/index.mjs';
import { collectSlides, rewriteResources, remoteResources } from '../src/parse.mjs';

let dir;
const write = (name, text) => {
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
};
const quiet = { onWarn: () => {} };
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const srcdoc = (html) => unescape(html.match(/srcdoc="([^"]*)"/)[1]);

const DOC = `---
title: "Html Deck"
---

# Html Deck

<!-- deck:cover -->

<!-- deck:html src="./slides/designed.html" title="Designed" -->

<!-- deck:slide -->
## Words

Some words.
`;

const SLIDE = `<!doctype html>
<html><head>
<link rel="stylesheet" href="slide.css">
<style>.hero { background: url('img/bg.png'); }</style>
</head><body>
<img src="img/logo.svg" alt="logo">
<video src="media/clip.mp4" poster="img/poster.png"></video>
<a href="other.html">a link</a>
</body></html>`;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-html-'));
  write('slides/designed.html', SLIDE);
  write('slides/slide.css', 'body { margin: 0; }');
  write('slides/img/bg.png', 'png');
  write('slides/img/logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  write('slides/img/poster.png', 'png');
  write('slides/media/clip.mp4', 'mp4');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

test('deck:html is parsed as a whole slide in document order', () => {
  const slides = collectSlides(DOC);
  assert.deepEqual(slides.map((s) => s.kind), ['html', 'content']);
  assert.deepEqual(slides[0], {
    kind: 'html', title: 'Designed', label: 'Designed', src: './slides/designed.html', header: false,
  });
});

test('deck:html takes its title from the file name, and header and eyebrow from the tag', () => {
  const [s] = collectSlides('<!-- deck:html src="./a/roadmap.html" header="true" eyebrow="Plan" -->');
  assert.equal(s.title, 'roadmap');
  assert.equal(s.header, true);
  assert.equal(s.eyebrow, 'Plan');
});

test('deck:html without src is warned about and skipped', () => {
  const warnings = [];
  assert.equal(collectSlides('<!-- deck:html title="x" -->', { onWarn: (m) => warnings.push(m) }).length, 0);
  assert.match(warnings[0], /deck:html .* no src/);
});

test('rewriteResources rewrites what a browser loads and leaves links alone', () => {
  const out = rewriteResources(SLIDE, (h) => `assets/${h.split('/').pop()}`, { css: true });
  assert.match(out, /<link rel="stylesheet" href="assets\/slide\.css">/);
  assert.match(out, /url\('assets\/bg\.png'\)/);
  assert.match(out, /<img src="assets\/logo\.svg"/);
  assert.match(out, /src="assets\/clip\.mp4" poster="assets\/poster\.png"/);
  assert.match(out, /<a href="other\.html">/, 'an ordinary link is not a resource');
});

test('rewriteResources leaves remote, absolute, data and fragment references alone', () => {
  const html = '<img src="https://x.test/a.png"><img src="//x.test/b.png"><img src="/c.png">'
    + '<img src="data:image/png;base64,AA"><use src="#d">';
  assert.equal(rewriteResources(html, () => 'nope'), html);
});

test('rewriteResources only rewrites CSS url() when asked', () => {
  const html = '<p style="background: url(bg.png)">x</p>';
  assert.equal(rewriteResources(html, () => 'assets/bg.png'), html);
  assert.match(rewriteResources(html, () => 'assets/bg.png', { css: true }), /url\(assets\/bg\.png\)/);
});

test('rewriteResources drops a query or fragment before resolving and decodes the path', () => {
  const seen = [];
  rewriteResources('<img src="my%20pic.png?v=2">', (h) => { seen.push(h); return null; });
  assert.deepEqual(seen, ['my pic.png']);
});

test('remoteResources lists what would be fetched from the network, not links', () => {
  const html = `<link href="https://fonts.test/css">
<style>@import "https://x.test/a.css"; .a { background: url(https://x.test/bg.png); }</style>
<script src="//cdn.test/lib.js"></script><img src="local.png"><a href="https://x.test/page">p</a>`;
  assert.deepEqual(remoteResources(html).sort(), [
    '//cdn.test/lib.js', 'https://fonts.test/css', 'https://x.test/a.css', 'https://x.test/bg.png',
  ]);
});

test('an html slide is framed, with its resources copied into assets', () => {
  const src = write('doc.md', DOC);
  const r = build(src, { out: path.join(dir, 'dist'), ...quiet });
  const html = r.deckHtml;
  assert.match(html, /<section class="slide html-slide"[^>]*>\s*<iframe class="slide-frame" title="Designed"/);
  const doc = srcdoc(html);
  for (const f of ['slide.css', 'bg.png', 'logo.svg', 'poster.png', 'clip.mp4']) {
    assert.match(doc, new RegExp(`assets/[^"')]*${f.replace('.', '\\.')}`), `${f} rewritten`);
  }
  const assets = fs.readdirSync(path.join(dir, 'dist', 'assets'));
  for (const f of ['slide.css', 'bg.png', 'logo.svg', 'poster.png', 'clip.mp4']) {
    assert.ok(assets.some((a) => a.endsWith(f)), `${f} copied`);
  }
  assert.deepEqual(r.manifest.slides.map((s) => s.label), ['Designed', 'Words']);
});

test('an html slide forwards keys to the deck so navigation works inside the frame', () => {
  const src = write('doc.md', DOC);
  const doc = srcdoc(build(src, { out: path.join(dir, 'dist'), ...quiet }).deckHtml);
  assert.match(doc, /keydown/);
  assert.match(doc, /parent/);
});

test('an html slide with header="true" sits under the deck header', () => {
  const src = write('doc.md', DOC.replace('title="Designed"', 'title="Designed" header="true"'));
  const html = build(src, { out: path.join(dir, 'dist'), ...quiet }).deckHtml;
  assert.match(html, /class="slide html-slide with-header"[\s\S]*?slide-header[\s\S]*?Designed[\s\S]*?frame-body/);
});

test('an html slide that loads remote resources is warned about', () => {
  write('slides/designed.html', SLIDE.replace('slide.css', 'https://fonts.test/css'));
  const warnings = [];
  build(write('doc.md', DOC), { out: path.join(dir, 'dist'), onWarn: (m) => warnings.push(m) });
  assert.ok(warnings.some((w) => /https:\/\/fonts\.test\/css/.test(w)), warnings.join('\n'));
});

test('a missing html slide is warned about and skipped, like an image slide', () => {
  const src = write('doc.md', DOC.replace('designed.html', 'gone.html'));
  const warnings = [];
  const r = build(src, { out: path.join(dir, 'dist'), onWarn: (m) => warnings.push(m) });
  assert.ok(warnings.some((w) => /html slide "Designed" skipped/.test(w)), warnings.join('\n'));
  assert.deepEqual(r.manifest.slides.map((s) => s.label), ['Words']);
});

test('an html slide is a dependency of the deck', () => {
  const src = write('doc.md', DOC);
  const r = build(src, { out: path.join(dir, 'dist'), root: dir, ...quiet });
  assert.ok(r.manifest.dependencies.documents.some((d) => d.endsWith('slides/designed.html')));
});

test('an html slide partial is the file itself, rewritten', () => {
  const src = write('doc.md', DOC);
  build(src, { out: path.join(dir, 'dist'), partials: true, ...quiet });
  const parts = fs.readdirSync(path.join(dir, 'dist', 'slides'));
  const part = parts.find((p) => /designed/.test(p));
  assert.ok(part, parts.join(', '));
  const body = fs.readFileSync(path.join(dir, 'dist', 'slides', part), 'utf8');
  assert.match(body, /<img src="assets\/[^"]*logo\.svg"/);
});

test('video in a Markdown slide is copied with its poster', () => {
  const md = DOC.replace('Some words.', '<video src="./slides/media/clip.mp4" poster="./slides/img/poster.png" controls></video>');
  const html = build(write('doc.md', md), { out: path.join(dir, 'dist'), ...quiet }).deckHtml;
  assert.match(html, /<video src="assets\/[^"]*clip\.mp4" poster="assets\/[^"]*poster\.png"/);
  const assets = fs.readdirSync(path.join(dir, 'dist', 'assets'));
  assert.ok(assets.some((a) => a.endsWith('clip.mp4')));
});

test('a missing media file is warned about as a file, not an image', () => {
  const md = DOC.replace('Some words.', '<video src="./gone.mp4"></video>');
  const warnings = [];
  build(write('doc.md', md), { out: path.join(dir, 'dist'), onWarn: (m) => warnings.push(m) });
  assert.ok(warnings.some((w) => /^file not found.*gone\.mp4/.test(w)), warnings.join('\n'));
});

test('heavy media is warned about', () => {
  write('slides/media/big.mp4', 'x'.repeat(2048));
  const md = DOC.replace('Some words.', '<video src="./slides/media/big.mp4"></video>');
  const warnings = [];
  build(write('doc.md', md), { out: path.join(dir, 'dist'), mediaWarnBytes: 1024, onWarn: (m) => warnings.push(m) });
  assert.ok(warnings.some((w) => /big\.mp4 is .* MB/.test(w)), warnings.join('\n'));
});
