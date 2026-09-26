// SPDX-License-Identifier: Apache-2.0
// Tag parsing: which sections become slides, and what survives into a slide body.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attrs, slug, collectSlides, collectCover, slideBody, rewriteImages, linkDefinitions,
  paginateTables,
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

test('a divider takes the next heading, or stands alone with a title', () => {
  const md = [
    '<!-- deck:divider subtitle="How it runs" -->',
    '## Runtime',
    '',
    'Document-only text.',
    '',
    '<!-- deck:slide -->',
    '### Pods',
    '',
    'Body.',
    '',
    '<!-- deck:divider title="Appendix" eyebrow="Part 3" -->',
  ].join('\n');
  const s = collectSlides(md);
  assert.deepEqual(s.map((x) => [x.kind, x.title]), [['divider', 'Runtime'], ['content', 'Pods'], ['divider', 'Appendix']]);
  assert.equal(s[0].subtitle, 'How it runs');
  assert.equal(s[0].body, undefined, 'a divider carries no body');
  assert.equal(s[2].eyebrow, 'Part 3');
});

test('a divider with no title and no heading after it is warned about and skipped', () => {
  const warnings = [];
  assert.deepEqual(collectSlides('text\n\n<!-- deck:divider -->\n', { onWarn: (m) => warnings.push(m) }), []);
  assert.equal(warnings.length, 1);
});

test('deck:slide table-rows is read as a number', () => {
  const [s] = collectSlides('<!-- deck:slide table-rows="20" -->\n## T\n\nx\n');
  assert.equal(s.tableRows, 20);
});

const table = (n) => ['| A | B |', '|---|---|', ...Array.from({ length: n }, (_, i) => `| a${i + 1} | b |`)].join('\n');

test('paginateTables leaves a short table, and anything with limit 0, alone', () => {
  const body = `Intro.\n\n${table(5)}\n\nAfter.`;
  assert.deepEqual(paginateTables(body, 12), [body]);
  assert.deepEqual(paginateTables(`${table(40)}`, 0), [table(40)]);
});

test('paginateTables spreads a long table evenly and repeats its header', () => {
  const pages = paginateTables(`Intro.\n\n${table(26)}\n\nAfter.`, 12);
  assert.equal(pages.length, 3);
  const rows = pages.map((p) => p.split('\n').filter((l) => /^\| a\d/.test(l)).length);
  assert.deepEqual(rows, [9, 9, 8]);
  for (const p of pages) assert.match(p, /^(Intro\.\n\n)?\| A \| B \|\n\|---\|---\|/);
  assert.match(pages[0], /^Intro\./, 'text before the table stays with its first rows');
  assert.match(pages[2], /After\.$/, 'text after the table follows its last rows');
  assert.doesNotMatch(pages[1], /Intro|After/);
});

test('paginateTables ignores pipes inside a code fence', () => {
  const body = ['```', table(30), '```'].join('\n');
  assert.deepEqual(paginateTables(body, 12), [body]);
});
