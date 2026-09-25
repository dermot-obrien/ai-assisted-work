// SPDX-License-Identifier: Apache-2.0
// Repository defaults from [suite.markdown-deck], and the order that overrides them.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readSection, findBindings, repoDefaults } from '../src/bindings.mjs';
import { build } from '../src/index.mjs';

const ADDRESS = "pat_o'neill@example.com";
const TOML = `bindingsVersion = "1.0"

[model]
local_prefix = "XXX-"

[suite.markdown-deck]
# the repository default
theme       = "default"        # a trailing comment
comments    = true
feedbackTo  = "${ADDRESS}"
feedbackSubject = 'Deck review: "please read"'

[suite.markdown-deck.palette]
deck-bg = "#2C4A6E"

[suite.other]
theme = "wrong"
`;

let dir;
const write = (rel, text) => {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
};
const DOC = (fm = '') => `---\ntitle: "Deck"\n${fm}---\n\n# Deck\n\n<!-- deck:slide -->\n## One\n\nText.\n`;
const config = (html) => JSON.parse(html.match(/id="deck-config">([\s\S]*?)<\/script>/)[1]);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-bind-'));
  write('.agents/skill-bindings.toml', TOML);
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

test('reads only its own section, with strings, booleans and comments', () => {
  const v = readSection(TOML);
  assert.deepEqual(v, {
    theme: 'default', comments: true, feedbackTo: ADDRESS,
    feedbackSubject: 'Deck review: "please read"',
    palette: { 'deck-bg': '#2C4A6E' },
  });
});

test('an apostrophe in an address survives a double-quoted TOML string', () => {
  assert.equal(readSection(TOML).feedbackTo, ADDRESS);
});

test('escapes in basic strings are honoured, and bad values are refused', () => {
  assert.equal(readSection('[suite.markdown-deck]\nx = "a\\"b\\\\c"').x, 'a"b\\c');
  assert.throws(() => readSection('[suite.markdown-deck]\nx = [1, 2]'), /unsupported value/);
  assert.throws(() => readSection('[suite.markdown-deck]\nx = "open'), /unterminated/);
});

test('the nearest binding file above a document is found; none is not an error', () => {
  const doc = write('docs/deep/doc.md', DOC());
  assert.equal(findBindings(doc), path.join(dir, '.agents', 'skill-bindings.toml'));
  const lone = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-none-'));
  try {
    assert.deepEqual(repoDefaults(lone).values, {});
  } finally {
    fs.rmSync(lone, { recursive: true, force: true });
  }
});

test('a deck gets the repository default when it says nothing', () => {
  const r = build(write('docs/doc.md', DOC()), { out: path.join(dir, 'a'), onWarn: () => {} });
  const cfg = config(r.deckHtml);
  assert.equal(cfg.feedback.to, ADDRESS);
  assert.equal(cfg.feedback.subject, 'Deck review: "please read"');
  assert.match(r.deckHtml, /--deck-bg: #2C4A6E/, 'the bound palette');
});

test('front matter overrides the repository, and an option overrides both', () => {
  const doc = write('docs/doc.md', DOC('deck_feedback_to: "someone.else@example.com"\ndeck_comments: false\ndeck_palette:\n  deck-bg: "#123456"\n'));
  const fm = build(doc, { out: path.join(dir, 'b'), onWarn: () => {} });
  assert.doesNotMatch(fm.deckHtml, /id="deck-config"/, 'deck_comments: false wins over comments = true');
  assert.match(fm.deckHtml, /--deck-bg: #123456/, "the deck's own palette is applied");
  assert.doesNotMatch(fm.deckHtml, /--deck-bg: #2C4A6E/, 'deck_palette wins over the bound palette');

  const on = build(doc, { out: path.join(dir, 'c'), comments: true, onWarn: () => {} });
  assert.equal(config(on.deckHtml).feedback.to, 'someone.else@example.com');

  const opt = build(doc, { out: path.join(dir, 'd'), comments: true, feedbackTo: 'cli@example.com', onWarn: () => {} });
  assert.equal(config(opt.deckHtml).feedback.to, 'cli@example.com');
});

test('bindings: false ignores the repository', () => {
  const r = build(write('docs/doc.md', DOC()), { out: path.join(dir, 'e'), bindings: false, onWarn: () => {} });
  assert.doesNotMatch(r.deckHtml, /id="deck-config"/);
});

test('pdf resolves option, then deck_pdf, then the binding, else off', () => {
  const run = (fm, opts = {}) => build(write('d.md', DOC(fm)), {
    out: path.join(dir, 'out'), onWarn: () => {}, ...opts,
  }).pdf;
  assert.equal(run(''), false);
  write('.agents/skill-bindings.toml', TOML.replace('comments    = true', 'comments    = true\npdf = true'));
  assert.equal(run(''), true);
  assert.equal(run('deck_pdf: false\n'), false);
  assert.equal(run('deck_pdf: false\n', { pdf: true }), true);
  assert.equal(run('', { pdf: false }), false);
  assert.equal(run('', { bindings: false }), false);
});

test('a theme named in the binding as a .css path resolves against the binding file', () => {
  // The repository keeps its own theme outside the skill; the path must not depend on
  // where the build was run from.
  write('.agents/themes/house.css', ':root { --deck-bg: #ABCDEF; }\n');
  write('.agents/skill-bindings.toml', `bindingsVersion = "1.0"

[suite.markdown-deck]
theme = "themes/house.css"
`);
  const cwd = process.cwd();
  process.chdir(os.tmpdir());
  try {
    const r = build(write('docs/doc.md', DOC()), { out: path.join(dir, 'themed'), onWarn: () => {} });
    assert.match(r.deckHtml, /--deck-bg: #ABCDEF/, 'the repository theme was found');
  } finally {
    process.chdir(cwd);
  }
});
