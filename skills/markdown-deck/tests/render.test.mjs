// SPDX-License-Identifier: Apache-2.0
// The deck's HTML shape: index panel, toolbar, slides, and the thumbnails switch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDeck, renderPartial, makeMarked, esc } from '../src/render.mjs';

const deck = (extra = {}) => renderDeck({
  title: 'Deck <One>',
  eyebrow: 'Eyebrow',
  css: '/* css */',
  cover: { subtitle: 'Sub' },
  slides: [
    { title: 'Alpha', bodyHtml: '<p>a</p>', notes: [] },
    { title: 'Beta & Gamma', bodyHtml: '<p>b</p>', notes: ['n'] },
  ],
  ...extra,
});

const count = (html, re) => (html.match(re) || []).length;

test('esc escapes markup', () => {
  assert.equal(esc('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});

test('one slide per section, cover first', () => {
  const html = deck();
  assert.equal(count(html, /<section class="slide/g), 3);
  assert.match(html, /<section class="slide cover"/);
});

test('the index lists every slide by title, cover included, escaped', () => {
  const html = deck();
  assert.equal(count(html, /class="thumb"/g), 3);
  assert.match(html, /<span class="cap">Deck &lt;One&gt;<\/span>/);
  assert.match(html, /<span class="cap">Beta &amp; Gamma<\/span>/);
  assert.match(html, /3 slides/);
});

test('the index has a collapse button and a titles or thumbnails switch', () => {
  const html = deck();
  assert.match(html, /id="index-collapse"/);
  assert.match(html, /id="index-view"/);
});

test('titles only is the default; thumbnails are opt in', () => {
  assert.doesNotMatch(deck(), /<body class="index-thumbs">/);
  assert.match(deck({ thumbnails: true }), /<body class="index-thumbs">/);
});

test('the toolbar carries previous, next, a counter, the index toggle and full screen', () => {
  const html = deck();
  for (const id of ['prev', 'next', 'counter', 'toggle-index', 'fullscreen']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
});

test('presenter notes are carried but never shown', () => {
  assert.match(deck(), /<aside class="notes">n<\/aside>/);
});

test('mermaid is loaded only when a slide needs it', () => {
  assert.doesNotMatch(deck({ mermaidSrc: 'm.js' }), /m\.js/);
  const html = deck({
    mermaidSrc: 'm.js',
    slides: [{ title: 'M', bodyHtml: '<pre class="mermaid">graph TD</pre>', notes: [] }],
  });
  assert.match(html, /<script src="m\.js">/);
});

test('mermaid fences keep their raw text; other code is escaped', () => {
  const md = makeMarked();
  assert.match(md.parse('```mermaid\na->>b: x\n```'), /<pre class="mermaid">\na->>b: x\n<\/pre>/);
  assert.match(md.parse('```js\n<b>\n```'), /&lt;b&gt;/);
});

test('a partial is one slide, always visible, with no chrome', () => {
  const html = renderPartial({ title: 'P', bodyHtml: '<p>p</p>', notes: [] }, { css: '', eyebrow: '' });
  assert.match(html, /class="deck single"/);
  assert.doesNotMatch(html, /class="index"|class="toolbar"/);
});

test('slides carry stable ids, the cover as "cover"', () => {
  const html = renderDeck({
    title: 'T', css: '', cover: {},
    slides: [{ file: 'alpha', title: 'Alpha', bodyHtml: '', notes: [] }],
  });
  assert.match(html, /<section class="slide cover" data-slide="cover">/);
  assert.match(html, /<section class="slide" data-slide="alpha">/);
});

test('comments are off by default and add no panel, button or config', () => {
  const html = deck();
  assert.doesNotMatch(html, /class="comments"|id="toggle-comments"|id="deck-config"/);
});

test('comments on: panel, toolbar button, index badges and an escaped config', () => {
  const html = renderDeck({
    title: 'Deck </script>', css: '', comments: true, id: 'd1', version: '0.3',
    feedback: { to: 'a@b.c', subject: 'Hi' },
    slides: [{ file: 'alpha', title: 'Alpha', bodyHtml: '', notes: [] }],
  });
  assert.match(html, /<body class="has-comments">/);
  assert.match(html, /<aside class="comments"/);
  assert.match(html, /id="toggle-comments"/);
  assert.match(html, /<span class="badge" hidden><\/span>/);
  const cfg = JSON.parse(html.match(/<script type="application\/json" id="deck-config">([\s\S]*?)<\/script>/)[1]);
  assert.equal(cfg.id, 'd1');
  assert.equal(cfg.version, '0.3');
  assert.deepEqual(cfg.feedback, { to: 'a@b.c', subject: 'Hi', method: 'email' });
  assert.deepEqual(cfg.slides, [{ id: 'alpha', n: 1, title: 'Alpha' }]);
  assert.equal(cfg.title, 'Deck </script>');
  assert.doesNotMatch(html.split('id="deck-config">')[1].split('</script>')[0], /<\//,
    'a closing tag inside the config would end the script early');
});
