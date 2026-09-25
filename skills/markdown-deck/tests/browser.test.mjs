// SPDX-License-Identifier: Apache-2.0
// The layout in a real browser: 16:9 at any window size, every slide fitted, navigation,
// the slide index, and the PDF. Skipped, not failed, when no browser can be launched,
// because PDF export is the only feature that needs one and it is an optional peer.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, findLocalMermaid } from '../src/index.mjs';
import { exportPdf } from '../src/pdf.mjs';

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* optional peer */ }

let browser = null;
let dir;
let deckUrl;
let thumbsUrl;
let commentsUrl;
let deckHtml;

async function launch() {
  const exe = process.env.MARKDOWN_DECK_BROWSER;
  const tries = exe ? [{ executablePath: exe }]
    : [{ channel: 'msedge' }, { channel: 'chrome' }, {}];
  for (const opts of tries) {
    try { return await chromium.launch(opts); } catch { /* next */ }
  }
  return null;
}

// Long enough that the table cannot fit a 1080px slide unscaled.
const rows = Array.from({ length: 40 }, (_, i) =>
  `| IF-${String(i + 1).padStart(2, '0')} | A provider | A consumer | What flows, in a sentence long enough to wrap |`).join('\n');

const DOC = `---
title: "Browser Deck"
---

# Browser Deck

<!-- deck:cover subtitle="Layout checks" -->

<!-- deck:slide -->
## Short

One line.

<!-- deck:slide -->
## Long table

| Interface | Provider | Consumer | Purpose |
|---|---|---|---|
${rows}

<!-- deck:slide -->
## Last

The end.
`;

// Launched at module load, not in before(): a test's skip option is evaluated when the
// test is declared, which is before any before() hook has run.
if (chromium) browser = await launch();

before(async () => {
  if (!browser) return;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-browser-'));
  const src = path.join(dir, 'doc.md');
  fs.writeFileSync(src, DOC);
  build(src, { out: path.join(dir, 'titles'), theme: 'default', onWarn: () => {} });
  build(src, { out: path.join(dir, 'thumbs'), theme: 'default', thumbnails: true, onWarn: () => {} });
  deckHtml = path.join(dir, 'titles', 'deck.html');
  deckUrl = pathToFileURL(deckHtml).href;
  thumbsUrl = pathToFileURL(path.join(dir, 'thumbs', 'deck.html')).href;
  build(src, {
    out: path.join(dir, 'comments'), theme: 'default', comments: true, deckId: 'browser-deck',
    feedbackTo: 'owner@example.com', onWarn: () => {},
  });
  commentsUrl = pathToFileURL(path.join(dir, 'comments', 'deck.html')).href;
});

after(async () => {
  if (browser) await browser.close();
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

const skip = () => (!chromium ? 'playwright is not installed' : !browser ? 'no browser could be launched' : false);

async function open(url, size = { width: 1400, height: 900 }) {
  const page = await browser.newPage({ viewport: size });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* file origin */ } });
  return page;
}

test('the canvas is exactly 16:9 at any window size, index open or closed', { skip: skip() }, async () => {
  for (const size of [{ width: 1400, height: 900 }, { width: 1000, height: 800 }, { width: 1600, height: 500 }]) {
    const page = await open(deckUrl, size);
    for (const open of [true, false]) {
      await page.evaluate((o) => {
        if (document.body.classList.contains('index-open') !== o) document.getElementById('toggle-index').click();
      }, open);
      const r = await page.evaluate(() => {
        const v = document.querySelector('.viewport').getBoundingClientRect();
        return { w: v.width, h: v.height, right: v.right, bottom: v.bottom, vw: innerWidth, vh: innerHeight };
      });
      assert.ok(Math.abs(r.w / r.h - 16 / 9) < 0.01, `ratio ${r.w}x${r.h} at ${size.width}x${size.height}`);
      assert.ok(r.right <= r.vw + 1 && r.bottom <= r.vh + 1, 'the canvas stays inside the window');
    }
    await page.close();
  }
});

test('every slide is fitted, including ones not on screen', { skip: skip() }, async () => {
  const page = await open(deckUrl);
  const fits = await page.evaluate(() => window.__deck.fits());
  const long = fits.find((f) => f.title === 'Long table');
  assert.ok(long.fit < 1, 'the long table was shrunk while slide 1 was showing');
  assert.equal(fits.find((f) => f.title === 'Short').fit, 1, 'short content is never scaled');
  await page.close();
});

test('a shrunk slide keeps its margins and spans the full width', { skip: skip() }, async () => {
  const page = await open(deckUrl);
  await page.evaluate(() => window.__deck.show(2));
  const r = await page.evaluate(() => {
    const body = document.querySelector('.slide.active .slide-body');
    const fit = body.querySelector('.fit');
    const cs = getComputedStyle(body);
    const k = parseFloat(document.querySelector('.slide.active').getAttribute('data-fit'));
    // Unscaled slide coordinates: layout sizes ignore the canvas transform.
    const availH = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const availW = body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return { usedH: fit.scrollHeight * k, availH, usedW: fit.offsetWidth * k, availW };
  });
  assert.ok(r.usedH <= r.availH + 1, `content ${r.usedH} fits ${r.availH}`);
  assert.ok(r.usedH > r.availH * 0.9, 'and is not shrunk further than it needs');
  assert.ok(Math.abs(r.usedW - r.availW) < 2, `content ${r.usedW} spans ${r.availW}`);
  await page.close();
});

test('previous and next move one slide, and stop at the ends', { skip: skip() }, async () => {
  const page = await open(deckUrl);
  const state = () => page.evaluate(() => ({
    counter: document.getElementById('counter').textContent,
    prev: document.getElementById('prev').disabled,
    next: document.getElementById('next').disabled,
  }));
  assert.deepEqual(await state(), { counter: '1 / 4', prev: true, next: false });
  await page.click('#next');
  assert.equal((await state()).counter, '2 / 4');
  await page.keyboard.press('End');
  assert.deepEqual(await state(), { counter: '4 / 4', prev: false, next: true });
  await page.click('#prev');
  assert.equal((await state()).counter, '3 / 4');
  assert.match(page.url(), /#long-table$/, 'the address is the slide id, not its number');
  await page.close();
});

test('the index lists titles by default and jumps on click', { skip: skip() }, async () => {
  const page = await open(deckUrl);
  const r = await page.evaluate(() => ({
    thumbs: document.body.classList.contains('index-thumbs'),
    clones: document.querySelectorAll('.thumb-slide').length,
    caps: Array.from(document.querySelectorAll('.thumb .cap')).map((c) => c.textContent),
  }));
  assert.equal(r.thumbs, false);
  assert.equal(r.clones, 0, 'no thumbnails are built in titles view');
  assert.deepEqual(r.caps, ['Browser Deck', 'Short', 'Long table', 'Last']);
  await page.click('.thumb[data-i="3"]');
  assert.equal(await page.textContent('#counter'), '4 / 4');
  assert.equal(await page.textContent('.thumb.current .cap'), 'Last');
  await page.close();
});

test('the view switch and T build thumbnails, and switch back', { skip: skip() }, async () => {
  const page = await open(deckUrl);
  const clones = () => page.evaluate(() => document.querySelectorAll('.thumb-slide').length);
  await page.click('#index-view');
  assert.equal(await clones(), 4);
  await page.keyboard.press('t');
  assert.equal(await clones(), 0);
  await page.close();
});

test('a deck built with thumbnails opens with them', { skip: skip() }, async () => {
  const page = await open(thumbsUrl);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.thumb-slide').length), 4);
  await page.close();
});

test('the index collapses from its header and reopens from the toolbar', { skip: skip() }, async () => {
  const page = await open(deckUrl);
  const shown = () => page.evaluate(() => getComputedStyle(document.querySelector('.index')).display !== 'none');
  assert.equal(await shown(), true);
  await page.click('#index-collapse');
  assert.equal(await shown(), false);
  await page.click('#toggle-index');
  assert.equal(await shown(), true);
  await page.keyboard.press('i');
  assert.equal(await shown(), false);
  await page.close();
});

test('the PDF has one 16:9 page per slide and names the crowded slide', { skip: skip() }, async () => {
  const pdf = path.join(dir, 'titles', 'deck.pdf');
  const logs = [];
  const r = await exportPdf(deckHtml, pdf, { onLog: (m) => logs.push(m) });
  assert.ok(r.bytes > 0);
  const raw = fs.readFileSync(pdf, 'latin1');
  assert.equal((raw.match(/\/Type\s*\/Page\b/g) || []).length, 4);
  for (const m of raw.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)) {
    assert.ok(Math.abs(Number(m[1]) / Number(m[2]) - 16 / 9) < 0.01, `page ${m[1]}x${m[2]}`);
  }
  const long = r.fits.find((f) => f.title === 'Long table');
  assert.ok(long.fit < 1, 'fitted again under the print layout');
  assert.equal(logs.some((l) => /Long table/.test(l)), long.fit < 0.6);
});

test('slide addresses are ids, and a numbered address still works', { skip: skip() }, async () => {
  const page = await open(deckUrl);
  await page.click('#next');
  assert.match(page.url(), /#short$/);
  await page.goto(deckUrl.split('#')[0] + '#long-table');
  await page.reload();
  assert.equal(await page.textContent('#counter'), '3 / 4');
  await page.goto(deckUrl.split('#')[0] + '#4');
  await page.reload();
  assert.equal(await page.textContent('#counter'), '4 / 4');
  await page.close();
});

async function comment(page, text) {
  await page.fill('#comment-text', text);
  await page.click('#comment-form button[type="submit"]');
}

test('comments attach to the slide, show in the index, and survive a reload', { skip: skip() }, async () => {
  const page = await open(commentsUrl);
  await page.click('#toggle-comments');
  assert.equal(await page.isVisible('.comments'), true);
  await page.click('.thumb[data-i="2"]');
  assert.equal(await page.textContent('#comments-slide'), 'Slide 3: Long table');
  await comment(page, 'Too many rows for one slide');
  await comment(page, 'Split by provider?');
  await page.click('.thumb[data-i="3"]');
  await comment(page, 'Good ending');

  const counts = await page.evaluate(() => Array.from(document.querySelectorAll('.thumb .badge'))
    .map((b) => (b.hidden ? '' : b.textContent)));
  assert.deepEqual(counts, ['', '', '2', '1']);
  assert.equal(await page.textContent('#comment-count'), '3');

  await page.reload();
  await page.click('#toggle-comments');
  await page.click('.thumb[data-i="2"]');
  const texts = await page.$$eval('.comment-text', (els) => els.map((e) => e.textContent));
  assert.deepEqual(texts, ['Too many rows for one slide', 'Split by provider?']);
  await page.close();
});

test('send review appears only once there are comments, and sends through one dialog', { skip: skip() }, async () => {
  const page = await open(commentsUrl);
  await page.evaluate(() => {
    window.__opened = [];
    HTMLAnchorElement.prototype.click = function () { window.__opened.push(this.href); };
  });
  await page.click('#toggle-comments');
  assert.equal(await page.isVisible('#send-review'), false, 'nothing to send yet');
  assert.equal(await page.isVisible('#clear-review'), false);
  assert.match(await page.textContent('#review-total'), /When you are done, send them as one review/);

  await page.click('.thumb[data-i="1"]');
  await comment(page, 'first');
  await page.click('.thumb[data-i="3"]');
  await comment(page, 'second');
  assert.equal(await page.textContent('#send-review'), 'Send review (2)');
  assert.match(await page.textContent('#review-total'), /2 comments on 2 slides, not yet sent/);

  await page.click('#send-review');
  assert.equal(await page.isVisible('#review-dialog'), true);
  assert.equal(await page.textContent('#review-summary'), '2 comments on 2 slides of Browser Deck.');
  assert.equal(await page.textContent('#review-submit'), 'Send by email', 'the label comes from the sender');
  await page.fill('#review-name', 'Pat Reviewer');
  await page.click('#review-submit');
  await page.waitForFunction(() => window.__opened.length > 0);
  assert.match(await page.evaluate(() => window.__opened[0]), /^mailto:owner@example\.com\?/);
  assert.match(decodeURIComponent(await page.evaluate(() => window.__opened[0])), /Reviewer: Pat Reviewer/);
  assert.equal(await page.isVisible('#review-done'), true);
  assert.equal(await page.textContent('#review-clear-sent'), 'Clear the 2 comments');

  await page.click('#review-clear-sent');
  assert.equal(await page.isVisible('#review-dialog'), false);
  assert.equal(await page.isVisible('#send-review'), false);
  assert.equal(await page.evaluate(() => window.__deckReview.state().comments.length), 0);
  assert.equal(await page.evaluate(() => window.__deckReview.state().reviewer), 'Pat Reviewer', 'the name is remembered');
  await page.close();
});

test('keeping comments after sending leaves them in place', { skip: skip() }, async () => {
  const page = await open(commentsUrl);
  await page.evaluate(() => { HTMLAnchorElement.prototype.click = function () {}; });
  await page.click('#toggle-comments');
  await comment(page, 'still here');
  await page.click('#send-review');
  await page.click('#review-submit');
  await page.waitForSelector('#review-done:not([hidden])');
  await page.click('#review-keep');
  assert.equal(await page.evaluate(() => window.__deckReview.state().comments.length), 1);
  assert.equal(await page.isVisible('#send-review'), true);
  await page.close();
});

test('a comment can be edited and deleted', { skip: skip() }, async () => {
  const page = await open(commentsUrl);
  await page.click('#toggle-comments');
  await page.click('.thumb[data-i="1"]');
  await comment(page, 'first draft');
  await page.click('.comment-edit');
  await page.fill('.comment-edit-box', 'second draft');
  await page.click('.comment button:has-text("Save")');
  assert.equal(await page.textContent('.comment-text'), 'second draft');
  page.once('dialog', (d) => d.accept());
  await page.click('.comment-delete');
  assert.equal(await page.textContent('.comment-empty'), 'No comments on this slide yet.');
  await page.close();
});

test('the review groups comments by slide, in deck order, with links', { skip: skip() }, async () => {
  const page = await open(commentsUrl);
  const r = await page.evaluate(() => {
    const s = window.__deckReview.state();
    s.reviewer = 'Pat';
    s.comments = [
      { id: 'b', slide: 'last', slideNo: 4, slideTitle: 'Last', text: 'end note', created: '2026-01-01T00:00:00Z' },
      { id: 'a', slide: 'short', slideNo: 2, slideTitle: 'Short', text: 'line one\nline two', created: '2026-01-01T00:00:00Z' },
    ];
    return { text: window.__deckReview.text(false), json: window.__deckReview.json() };
  });
  const iShort = r.text.indexOf('Slide 2: Short');
  const iLast = r.text.indexOf('Slide 4: Last');
  assert.ok(iShort > 0 && iLast > iShort, 'deck order, not the order comments were made');
  assert.match(r.text, /Reviewer: Pat/);
  assert.match(r.text, /#short\n- line one\n  line two/);
  assert.equal(r.json.deck.id, 'browser-deck');
  assert.equal(r.json.comments.length, 2);
  await page.close();
});

test('email goes to the configured address, and a long review is not truncated', { skip: skip() }, async () => {
  const page = await open(commentsUrl);
  const r = await page.evaluate(() => {
    const short = window.__deckReview.mailto('hello');
    return { short };
  });
  assert.match(r.short, /^mailto:owner@example\.com\?subject=Review%3A%20Browser%20Deck&body=hello$/);

  // A long review must not be squeezed into the mail link. Capture where the page sends
  // the reviewer instead of letting it open a mail client.
  await page.evaluate(() => {
    window.__opened = [];
    HTMLAnchorElement.prototype.click = function () { window.__opened.push(this.href); };
    const s = window.__deckReview.state();
    s.comments = Array.from({ length: 40 }, (_, k) => ({
      id: 'c' + k, slide: 'short', slideNo: 2, slideTitle: 'Short',
      text: 'A comment long enough to push the review past the mail link limit, number ' + k,
      created: '2026-01-01T00:00:00Z' }));
  });
  await page.click('#toggle-comments');
  await page.evaluate(() => window.dispatchEvent(new Event('deck:slide')));
  await page.click('#send-review');
  await page.click('#review-submit');
  await page.waitForFunction(() => window.__opened.length > 0);
  const opened = await page.evaluate(() => window.__opened);
  const mail = opened.find((h) => h.startsWith('mailto:'));
  assert.ok(mail.length < 1900, `mail link ${mail.length} characters`);
  assert.match(decodeURIComponent(mail), /too long to send in the body/);
  await page.close();
});

test('an apostrophe in the review address reaches the mail link intact', { skip: skip() }, async () => {
  const src = path.join(dir, 'doc.md');
  build(src, {
    out: path.join(dir, 'apostrophe'), comments: true, deckId: 'apostrophe',
    feedbackTo: "pat_o'neill@example.com", onWarn: () => {},
  });
  const page = await open(pathToFileURL(path.join(dir, 'apostrophe', 'deck.html')).href);
  const href = await page.evaluate(() => window.__deckReview.mailto('hi'));
  assert.ok(href.startsWith("mailto:pat_o'neill@example.com?"), href);
  const a = await page.evaluate((h) => { const x = document.createElement('a'); x.href = h; return x.href; }, href);
  assert.match(decodeURIComponent(a), /^mailto:pat_o'neill@example\.com\?/, 'the browser keeps it as one address');
  await page.close();
});

test('download saves the whole review as one file', { skip: skip() }, async () => {
  const page = await open(commentsUrl);
  await page.click('#toggle-comments');
  await comment(page, 'downloaded comment');
  await page.click('#send-review');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#review-download')]);
  assert.match(dl.suggestedFilename(), /^review-browser-deck-\d{4}-\d{2}-\d{2}\.md$/);
  const text = fs.readFileSync(await dl.path(), 'utf8');
  assert.match(text, /downloaded comment/);
  assert.match(text, /```json/);
  await page.close();
});

test('comment chrome never reaches the PDF', { skip: skip() }, async () => {
  const page = await open(commentsUrl);
  await page.emulateMedia({ media: 'print' });
  const shown = await page.evaluate(() => ['.comments', '.toolbar', '.index']
    .map((q) => getComputedStyle(document.querySelector(q)).display));
  assert.deepEqual(shown, ['none', 'none', 'none']);
  await page.close();
});

test('an html slide renders from disk, keeps navigation, and reaches the PDF', { skip: skip() }, async () => {
  const hdir = path.join(dir, 'html');
  fs.mkdirSync(path.join(hdir, 'art'), { recursive: true });
  fs.writeFileSync(path.join(hdir, 'art', 'dot.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20"/></svg>');
  fs.writeFileSync(path.join(hdir, 'designed.html'), `<!doctype html><html><head>
<style>html,body{margin:0;width:1920px;height:1080px} h2{font:64px sans-serif}</style></head>
<body><h2 id="made">Designed by hand</h2><img id="dot" src="art/dot.svg"></body></html>`);
  const src = path.join(hdir, 'doc.md');
  fs.writeFileSync(src, `---
title: "Html"
---

# Html

<!-- deck:cover -->

<!-- deck:html src="./designed.html" title="Designed" -->

<!-- deck:slide -->
## After

The end.
`);
  build(src, { out: path.join(hdir, 'dist'), theme: 'default', onWarn: () => {} });
  const deck = path.join(hdir, 'dist', 'deck.html');
  const page = await open(pathToFileURL(deck).href);
  await page.evaluate(() => window.__deck.show(1));
  const frame = page.frameLocator('.slide.active iframe.slide-frame');
  assert.equal(await frame.locator('#made').textContent(), 'Designed by hand');
  const width = await frame.locator('#dot').evaluate((img) =>
    img.complete ? img.naturalWidth : new Promise((r) => { img.onload = () => r(img.naturalWidth); }));
  assert.equal(width, 40, 'the copied image loads from disk, with no server');

  await frame.locator('body').click();
  await frame.locator('body').press('ArrowRight');
  assert.equal(await page.evaluate(() => document.getElementById('counter').textContent), '3 / 3',
    'a key pressed inside the frame still moves the deck');
  await page.close();

  const r = await exportPdf(deck, path.join(hdir, 'dist', 'deck.pdf'), { onLog: () => {} });
  const raw = fs.readFileSync(path.join(hdir, 'dist', 'deck.pdf'), 'latin1');
  assert.ok(r.bytes > 0);
  assert.equal((raw.match(/\/Type\s*\/Page\b/g) || []).length, 3);
});

const mermaidFile = findLocalMermaid(process.cwd());
test('a diagram on a slide not yet shown is drawn at its real size', {
  skip: skip() || (!mermaidFile && 'no mermaid installed nearby'),
}, async () => {
  const mdir = path.join(dir, 'mermaid');
  fs.mkdirSync(mdir, { recursive: true });
  const src = path.join(mdir, 'doc.md');
  fs.writeFileSync(src, `---
title: "Diagrams"
---

# Diagrams

<!-- deck:slide -->
## First

Nothing to draw.

<!-- deck:slide -->
## Later

\`\`\`mermaid
sequenceDiagram
  participant A as Client
  participant B as Gateway
  A->>B: Request
  Note over B: Validate the audience claim against this gateway
\`\`\`
`);
  build(src, { out: path.join(mdir, 'dist'), theme: 'default', mermaidSrc: mermaidFile, onWarn: () => {} });
  const page = await open(pathToFileURL(path.join(mdir, 'dist', 'deck.html')).href);
  await page.waitForFunction(() => document.querySelector('svg .noteText'), null, { timeout: 15000 });
  await page.evaluate(() => window.__deck.show(1));
  const r = await page.evaluate(() => {
    const t = document.querySelector('svg .noteText').getBBox();
    const b = document.querySelector('svg rect.note').getBBox();
    return { text: { x: t.x, y: t.y, width: t.width, height: t.height }, box: { x: b.x, y: b.y, width: b.width, height: b.height } };
  });
  assert.ok(r.text.width > 100, `note text measured ${r.text.width}px wide`);
  const bottom = (o) => o.y + o.height;
  assert.ok(bottom(r.text) <= bottom(r.box) + 1, `note text ends at ${bottom(r.text)}, below its box at ${bottom(r.box)}`);
  assert.ok(r.box.width + 2 >= r.text.width, `note box ${r.box.width} wide holds text ${r.text.width}`);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.diagram-measuring').length), 0);
  await page.close();
});
