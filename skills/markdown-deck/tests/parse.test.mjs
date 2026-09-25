// SPDX-License-Identifier: Apache-2.0
// Tag parsing: which sections become slides, and what survives into a slide body.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attrs, slug, collectSlides, collectCover, slideBody, rewriteImages, linkDefinitions,
} from '../src/parse.mjs';

test('attrs reads quoted key-value pairs', () => {
  assert.deepEqual(attrs(' label="Intro" order="2" '), { label: 'Intro', order: '2' });
  assert.deepEqual(attrs(''), {});
});

test('slug is lower-case and hyphenated, never empty', () => {
  assert.equal(slug('S1 Grounded answer!'), 's1-grounded-answer');
  assert.equal(slug('***'), 'slide');
});

test('a slide tag attaches to the next heading and runs to its next sibling', () => {
  const md = [
    '# Doc', '',
    '<!-- deck:slide label="First" -->', '## One', 'body one', '### Sub', 'sub text', '',
    '## Two', 'not a slide', '',
    '<!-- deck:slide -->', '## Three', 'body three',
  ].join('\n');
  const s = collectSlides(md);
  assert.equal(s.length, 2);
  assert.equal(s[0].label, 'First');
  assert.equal(s[0].title, 'One');
  assert.match(s[0].body, /body one/);
  assert.match(s[0].body, /sub text/, 'a deeper heading stays inside the slide');
  assert.doesNotMatch(s[0].body, /not a slide/);
  assert.equal(s[1].label, 'Three');
});

test('a heading inside a code fence does not end a slide', () => {
  const md = ['<!-- deck:slide -->', '## Setup', '```bash', '# not a heading', 'run', '```', 'after'].join('\n');
  const [s] = collectSlides(md);
  assert.match(s.body, /after/);
});

test('a slide tag with no heading after it is warned about, not invented', () => {
  const warnings = [];
  const s = collectSlides('text\n<!-- deck:slide -->\nno heading', { onWarn: (m) => warnings.push(m) });
  assert.equal(s.length, 0);
  assert.equal(warnings.length, 1);
});

test('cover attributes are read, and absence is null', () => {
  assert.deepEqual(collectCover('<!-- deck:cover subtitle="Sub" date="Today" -->'),
    { subtitle: 'Sub', date: 'Today' });
  assert.equal(collectCover('# No cover'), null);
});

test('slideBody drops skip blocks and comments, and lifts notes out', () => {
  const { body, notes } = slideBody([
    'keep', '<!-- deck:skip -->', 'document only', '<!-- /deck:skip -->',
    '<!-- deck:note -->', 'say this', '<!-- /deck:note -->',
    '<!-- guidance -->', 'also keep',
  ].join('\n'));
  assert.match(body, /keep/);
  assert.match(body, /also keep/);
  assert.doesNotMatch(body, /document only|guidance|say this/);
  assert.deepEqual(notes, ['say this']);
});

test('rewriteImages rewrites local images only', () => {
  const out = rewriteImages('![a](./x.svg) ![b](https://h/y.png) ![c](missing.png)',
    (href) => (href.endsWith('x.svg') ? 'assets/x.svg' : null));
  assert.equal(out, '![a](assets/x.svg) ![b](https://h/y.png) ![c](missing.png)');
});

test('an image tag is a slide of its own, in document order, with a title', () => {
  const md = [
    '<!-- deck:slide -->', '## First', 'text', '',
    '<!-- deck:image src="./img/roadmap.png" title="Roadmap" -->', '',
    '<!-- deck:image src="./img/other-deck-slide.png" -->', '',
    '<!-- deck:slide -->', '## Last', 'text',
  ].join('\n');
  const s = collectSlides(md);
  assert.deepEqual(s.map((x) => `${x.kind}:${x.title}`),
    ['content:First', 'image:Roadmap', 'image:other-deck-slide', 'content:Last']);
  assert.equal(s[1].src, './img/roadmap.png');
  assert.equal(s[1].header, false);
});

test('an image tag without a src is warned about and skipped', () => {
  const warnings = [];
  assert.equal(collectSlides('<!-- deck:image title="x" -->', { onWarn: (m) => warnings.push(m) }).length, 0);
  assert.equal(warnings.length, 1);
});

test('link definitions are collected from anywhere, not from code fences', () => {
  const md = 'See [A][A].\n\n[A]: https://h/a\n  [b c]: ./b.md "title"\n```\n[C]: https://not\n```\n';
  assert.equal(linkDefinitions(md), '[A]: https://h/a\n[b c]: ./b.md "title"');
});
